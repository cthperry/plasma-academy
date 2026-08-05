/* ==========================================================================
   gen-formulas.mjs — 從 25 章內文的 .pa-formula 區塊產生 src/data/formulas.js

   公式手冊(/formulas/)規劃已久卻一直是空頁,但公式本身早就存在 ——
   每一章寫到公式時都用了同一個 `.pa-formula` 元件(pa-formula__eq +
   pa-formula__name + 可展開的符號表/推導)。這支腳本掃全部章節頁,
   把已經寫好的公式抽出來,而不是另外重打一份。

   單一資料來源:改公式要改章節內文,重新產生用
     node tools/gen-formulas.mjs
   ========================================================================== */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, posix } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LEVEL_DIR = join(ROOT, "src/content/level");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

/** 從 pos 開始(指向 '<div') 找到與它配對的 </div>,回傳配對結束後的位置與內容 */
function matchDiv(html, pos) {
  const openTag = /^<div\b[^>]*>/.exec(html.slice(pos));
  if (!openTag) return null;
  let depth = 1;
  let i = pos + openTag[0].length;
  const re = /<div\b[^>]*>|<\/div>/g;
  re.lastIndex = i;
  let m;
  while ((m = re.exec(html))) {
    if (m[0] === "</div>") {
      depth--;
      if (depth === 0) {
        return { inner: html.slice(pos + openTag[0].length, m.index), end: re.lastIndex };
      }
    } else {
      depth++;
    }
  }
  return null;
}

function extractTag(html, cls) {
  const re = new RegExp(`<div class="${cls}[^"]*">([\\s\\S]*?)<\\/div>`);
  const m = re.exec(html);
  return m ? m[1].trim() : null;
}

function extractBody(html) {
  const idx = html.indexOf('<div class="pa-formula__body"');
  if (idx === -1) return null;
  const m = matchDiv(html, idx);
  return m ? m.inner.trim() : null;
}

function slugify(name, eq, fallback) {
  const base = (name || fallback)
    .replace(/[（(].*?[）)]/g, "")
    .replace(/[^a-zA-Z0-9一-鿿]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return base || fallback;
}

/**
 * 公式的推導內文常有連回其他章節的連結,而且是相對於「原章節頁自己的深度」寫的
 * (例如 1.3 頁裡寫 `../../3/3-6-uniformity/`)。公式手冊把這段 HTML 原封不動搬到
 * `/formulas/`(深度不同)時,同一個相對路徑就會指錯地方 —— 這裡把它們解回
 * 根目錄相對路徑,建置時再套用該頁自己的 {{base}} 前綴。
 */
function rewriteRelativeLinks(html, sourceUrl) {
  return html.replace(/href="([^"#][^"]*)"/g, (m, href) => {
    if (/^([a-z]+:)?\/\//i.test(href) || href.startsWith("/")) return m;
    const resolved = posix.normalize(posix.join(sourceUrl, href));
    return `href="{{base}}${resolved}"`;
  });
}

const formulas = [];
const files = walk(LEVEL_DIR).sort();

for (const file of files) {
  const html = readFileSync(file, "utf8");
  const rel = file.slice(ROOT.length + 1);

  // 最近一個 <h2 id="..."> 或 <h3 id="..."> 作為公式的章節上下文
  const headings = [];
  const hRe = /<h([23]) id="([^"]+)">([^<]*)<\/h\1>/g;
  let hm;
  while ((hm = hRe.exec(html))) {
    headings.push({ pos: hm.index, id: hm[2], text: hm[3].trim() });
  }
  function headingFor(pos) {
    let last = null;
    for (const h of headings) {
      if (h.pos < pos) last = h;
      else break;
    }
    return last;
  }

  let searchFrom = 0;
  let seq = 0;
  while (true) {
    const idx = html.indexOf('<div class="pa-formula"', searchFrom);
    if (idx === -1) break;
    const block = matchDiv(html, idx);
    if (!block) break;
    searchFrom = block.end;
    seq += 1;

    // 兩種寫法並存:正式公式(eq + name + 可展開符號表)與
    // 關鍵關係式重點框(main + note,例如 4.2 的「SNR ∝ 開口率」)
    let eq = extractTag(block.inner, "pa-formula__eq");
    let name = extractTag(block.inner, "pa-formula__name");
    let body = extractBody(block.inner);
    if (!eq) {
      eq = extractTag(block.inner, "pa-formula__main");
      body = body || extractTag(block.inner, "pa-formula__note");
    }
    if (!eq) {
      // 第三種寫法:body 裡直接放一串反應式(例如 2.3 的 CF4 解離鏈),
      // 沒有單一的「這是哪條公式」標籤 —— 把整串反應接起來當 eq
      const reactions = [...block.inner.matchAll(/<div class="pa-eq">([\s\S]*?)<\/div>/g)].map((m) =>
        m[1].trim()
      );
      if (reactions.length) eq = reactions.join(" ； ");
    }
    if (!eq) continue;

    const h = headingFor(idx);
    const chMatch = h ? /^(\d+\.\d+(?:\.\d+)?)/.exec(h.text) : null;
    const ch = chMatch ? chMatch[1] : null;
    const heading = h ? h.text.replace(/^\d+\.\d+(?:\.\d+)?\s*/, "") : null;

    const id = `${rel.match(/(\d-\d[^/]*)\.html$/)?.[1] || rel}-f${seq}`;
    const url = rel.replace(/^src\/content\//, "").replace(/\.html$/, "/");
    if (body) body = rewriteRelativeLinks(body, url);

    formulas.push({
      id: slugify(name, eq, id),
      eq,
      name: name || null,
      ch,
      heading,
      body: body || null,
      url,
      anchor: h ? h.id : null,
    });
  }
}

// id 去重(同名公式在不同章節出現時,補章節號)
const seen = new Map();
for (const f of formulas) {
  if (seen.has(f.id)) {
    const n = seen.get(f.id) + 1;
    seen.set(f.id, n);
    f.id = `${f.id}-${n}`;
  } else {
    seen.set(f.id, 1);
  }
}

function esc(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
}

function jsField(v) {
  return v == null ? "null" : `'${esc(v)}'`;
}

const lines = formulas.map(
  (f) =>
    `  { id: ${jsField(f.id)}, eq: ${jsField(f.eq)}, name: ${jsField(f.name)}, ch: ${jsField(
      f.ch
    )}, heading: ${jsField(f.heading)}, body: ${jsField(f.body)}, url: ${jsField(
      f.url
    )}, anchor: ${jsField(f.anchor)} }`
);

const out = `/* ==========================================================================
   formulas.js — 全站公式手冊資料
   ⚠️ 自動產生,請勿手改。來源:src/content/level/ 底下各章節 html 的 .pa-formula 區塊
      重新產生:node tools/gen-formulas.mjs
   共 ${formulas.length} 條
   ========================================================================== */

(function (PA) {
  "use strict";

  var FORMULAS = [
${lines.join(",\n")}
  ];

  function byId(id) {
    for (var i = 0; i < FORMULAS.length; i++) {
      if (FORMULAS[i].id === id) return FORMULAS[i];
    }
    return null;
  }

  function byChapter(ch) {
    return FORMULAS.filter(function (f) {
      return f.ch && f.ch.indexOf(ch) === 0;
    });
  }

  PA.formulas = {
    all: FORMULAS,
    byId: byId,
    byChapter: byChapter,
    count: FORMULAS.length
  };
})((window.PA = window.PA || {}));
`;

writeFileSync(join(ROOT, "src/data/formulas.js"), out, "utf8");
console.log(`✓ 產生 ${formulas.length} 條公式 → src/data/formulas.js`);
