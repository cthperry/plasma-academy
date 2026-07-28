/* ==========================================================================
   gen-glossary.mjs — 由 docs/10-glossary.md 產生 src/data/glossary.js
   單一來源原則:術語只在 markdown 裡維護一次
   用法:node tools/gen-glossary.mjs
   ========================================================================== */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "docs", "10-glossary.md");
const OUT = join(ROOT, "src", "data", "glossary.js");

const md = readFileSync(SRC, "utf8");
const lines = md.split("\n");

/** 產生穩定的 id:優先用英文,退回中文拼音式雜湊 */
function slugify(en, zh) {
  const base = (en || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (base) return base;
  // 沒有英文名時用中文做穩定雜湊
  let h = 0;
  for (const ch of zh) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return "t" + h.toString(36);
}

/** 從 "Mean Free Path (MFP)" 拆出 name 與 abbr */
function splitAbbr(en) {
  const m = en.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!m) return { name: en.trim(), abbr: null };
  const inner = m[2].trim();
  // 括號內若是全大寫縮寫或含縮寫,視為 abbr;否則併回名稱
  if (/^[A-Za-z0-9‑\-/ ]{2,}$/.test(inner) && inner === inner.toUpperCase()) {
    return { name: m[1].trim(), abbr: inner };
  }
  return { name: en.trim(), abbr: null };
}

const entries = [];
const seen = new Map();
let category = null;
let categoryName = null;

for (const raw of lines) {
  const line = raw.trim();

  const cat = line.match(/^##\s+([A-I])\.\s+(.+?)(?:(（|\().*)?$/);
  if (cat) {
    category = cat[1];
    categoryName = cat[2].trim();
    continue;
  }
  // 「統計」與「資料格式」之後不再有術語表
  if (/^##\s+(統計|資料格式)/.test(line)) {
    category = null;
    continue;
  }
  if (!category) continue;
  if (!line.startsWith("|")) continue;

  const cells = line
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());
  if (cells.length !== 4) continue;
  if (cells[0] === "中文" || /^-+$/.test(cells[0])) continue;

  const [zh, enRaw, definition, chapter] = cells;
  if (!zh || !definition) continue;

  const { name: en, abbr } = splitAbbr(enRaw);
  let id = slugify(en, zh);

  // id 去重(不同術語偶爾會 slug 撞號)
  if (seen.has(id)) {
    const n = seen.get(id) + 1;
    seen.set(id, n);
    id = `${id}-${n}`;
  } else {
    seen.set(id, 1);
  }

  entries.push({
    id,
    zh,
    en,
    abbr,
    category,
    categoryName,
    definition,
    chapter: chapter && chapter !== "—" ? chapter : null,
  });
}

if (entries.length < 200) {
  console.error(`✗ 只解析到 ${entries.length} 條術語,預期 200+。請檢查 10-glossary.md 表格格式。`);
  process.exit(1);
}

const body = entries
  .map((e) => {
    const j = (v) => (v === null ? "null" : JSON.stringify(v));
    return `  { id: ${j(e.id)}, zh: ${j(e.zh)}, en: ${j(e.en)}, abbr: ${j(
      e.abbr
    )}, cat: ${j(e.category)}, ch: ${j(e.chapter)}, def: ${j(e.definition)} }`;
  })
  .join(",\n");

const cats = [...new Set(entries.map((e) => e.category))]
  .map((c) => {
    const name = entries.find((e) => e.category === c).categoryName;
    return `  { key: ${JSON.stringify(c)}, name: ${JSON.stringify(name)} }`;
  })
  .join(",\n");

const out = `/* ==========================================================================
   glossary.js — 術語表資料
   ⚠️ 自動產生,請勿手改。來源:docs/10-glossary.md
      重新產生:node tools/gen-glossary.mjs
   共 ${entries.length} 條
   ========================================================================== */

(function (PA) {
  "use strict";

  var CATEGORIES = [
${cats}
  ];

  var TERMS = [
${body}
  ];

  var byId = {};
  var byZh = {};
  TERMS.forEach(function (t) {
    byId[t.id] = t;
    byZh[t.zh] = t;
  });

  /** 依中文名或英文名查詢(全站 tooltip 用) */
  function lookup(name) {
    if (byZh[name]) return byZh[name];
    var lower = String(name).toLowerCase();
    for (var i = 0; i < TERMS.length; i++) {
      if (TERMS[i].en.toLowerCase() === lower) return TERMS[i];
      if (TERMS[i].abbr && TERMS[i].abbr.toLowerCase() === lower) return TERMS[i];
    }
    return null;
  }

  function search(q) {
    if (!q) return [];
    var s = String(q).toLowerCase();
    return TERMS.filter(function (t) {
      return (
        t.zh.indexOf(q) !== -1 ||
        t.en.toLowerCase().indexOf(s) !== -1 ||
        (t.abbr && t.abbr.toLowerCase().indexOf(s) !== -1) ||
        t.def.indexOf(q) !== -1
      );
    });
  }

  PA.glossary = {
    categories: CATEGORIES,
    terms: TERMS,
    byId: byId,
    lookup: lookup,
    search: search,
    count: TERMS.length
  };
})((window.PA = window.PA || {}));
`;

writeFileSync(OUT, out, "utf8");
console.log(`✓ glossary.js 產生完成:${entries.length} 條術語,${new Set(entries.map((e) => e.category)).size} 個分類`);
