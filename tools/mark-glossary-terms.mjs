/* ==========================================================================
   mark-glossary-terms.mjs — 把「課文有中文但沒標記」的術語自動掛上 .pa-term

   docs/13-plan-review.md §5(a):247 條術語裡有 59 條課文其實有提到,
   只是沒有被 `.pa-term` 包起來,所以 tooltip 查不到 —— 這是純機械的落差,
   不需要改寫課文,只要把已經存在的中文字包上標記即可。

   做法:
     1. 用跟 `check-glossary-coverage.mjs` 完全一樣的邏輯,重新算一次
        「課文有中文但沒標記」的術語清單(不能複製一份數字出來,
        兩邊算出來的名單要是同一份,否則這支腳本補的跟稽核腳本認的會對不上)。
     2. 術語 zh 長的先處理、短的後處理——例如「電漿參數」要先包起來,
        「電漿」才不會把它從中間咬開,包出巢狀或錯位的標記。
     3. 每個術語只標第一次出現:優先在它的主章節(`t.ch`)裡找,
        找不到才退而求其次、在全站第一個出現的地方標。
     4. 只在「純文字節點」裡做替換——用 `<[^>]+>` 切開 tag 與文字,
        並跳過 `<script>`/`<style>` 區塊與已經在 `.pa-term` 裡面的文字,
        避免咬進屬性字串或造成巢狀標記。

   用法:node tools/mark-glossary-terms.mjs [--dry-run]
   跑完務必再跑一次 `node tools/check-glossary-coverage.mjs` 確認覆蓋率真的上升、
   且「巢狀標記」與「查不到定義」兩條斷言仍然全綠。
   ========================================================================== */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY_RUN = process.argv.includes("--dry-run");

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(ROOT, "src/data/glossary.js"), "utf8"), sandbox, {
  filename: "glossary.js",
});
vm.runInContext(readFileSync(join(ROOT, "src/data/curriculum.js"), "utf8"), sandbox, {
  filename: "curriculum.js",
});
const G = sandbox.window.PA.glossary;
const CUR = sandbox.window.PA.curriculum;

const files = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".html")) files.push(p);
  }
})(join(ROOT, "src/content"));

// 章節 id -> 對應的檔案路徑(用 curriculum 的 url 反推,跟 build.mjs 的規則一致)
const chapterFile = {};
for (const m of CUR.modules) {
  const f = files.find((p) => p.endsWith("/" + m.slug + ".html") || p.includes("/" + m.slug + "/"));
  if (f) chapterFile[m.id] = f;
}

const rawContent = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const stripTags = (html) => html.replace(/<[^>]+>/g, " ");

/* ---------- 重算「課文有中文但沒標記」清單(邏輯必須跟 check-glossary-coverage.mjs 一致) ---------- */
const TERM_RE = /<(\w+)([^>]*\bclass="[^"]*\bpa-term\b[^"]*"[^>]*)>([\s\S]*?)<\/\1>/g;
function currentMarks() {
  const marks = [];
  for (const html of rawContent.values()) {
    let m;
    const re = new RegExp(TERM_RE);
    while ((m = re.exec(html))) {
      const dt = /data-term="([^"]*)"/.exec(m[2]);
      marks.push(dt ? dt[1] : m[3].replace(/<[^>]+>/g, "").trim());
    }
  }
  return [...new Set(marks)];
}

function unmarkedInProseTerms() {
  const marks = currentMarks();
  const reachable = new Set();
  for (const n of marks) {
    const t = G.lookup(n);
    if (t) reachable.add(t.id);
  }
  const PROSE = [...rawContent.values()].map(stripTags).join("\n");
  const unreachable = G.terms.filter((t) => !reachable.has(t.id));
  return unreachable.filter((t) => {
    const inProse = PROSE.includes(t.zh);
    const enOnly = !inProse && ((t.en && PROSE.includes(t.en)) || (t.abbr && PROSE.includes(t.abbr)));
    return inProse && !enOnly;
  });
}

const targets = unmarkedInProseTerms().sort((a, b) => b.zh.length - a.zh.length);
console.log(`待補標記:${targets.length} 條(依 zh 長度由長至短處理,避免短術語咬開長術語)`);

/* ---------- 在單一檔案的純文字節點裡標第一次出現 ----------
 *
 * ⚠️ 只能動「一般敘述文字」的文字節點。標題(h1–h6)與 `.pa-formula` 區塊
 * 的名稱/公式本文,是 `gen-formulas.mjs`、`check-links.mjs` 這類工具靠
 * 純文字比對章節錨點與公式名稱的依據 —— 在裡面插一個 <span> 會讓那些
 * 依賴「這裡是乾淨文字」的比對失準(踩過一次:插進 `.pa-formula__name`
 * 讓某條公式的錨點被誤配到別的小節)。用真正的標籤堆疊追蹤巢狀範圍,
 * 而不是只認「下一個 </tag>」——不然 `.pa-formula` 裡面的巢狀 <div>
 * 一样會把 skip 提早關掉。
 */
const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);
const SKIP_TRIGGER = /^(h[1-6]|script|style|code|a)$/i;

function tagName(tag) {
  const m = /^<\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/.exec(tag);
  return m ? m[1].toLowerCase() : "";
}

function triggersSkip(tag, name) {
  if (SKIP_TRIGGER.test(name)) return true;
  const cls = /\bclass="([^"]*)"/.exec(tag);
  return !!(cls && /\bpa-(formula|term)\b/.test(cls[1]));
}

function markFirstOccurrence(html, zh) {
  const parts = html.split(/(<[^>]+>)/);
  const stack = []; // 真正的開放標籤(排除 void/self-closing)
  let skipStartDepth = null; // 進入 skip 區塊時的 stack 深度(push 之後)

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (i % 2 === 1) {
      const isClosing = p.startsWith("</");
      const isSelfClosing = /\/>\s*$/.test(p);
      const name = tagName(p);
      if (isClosing) {
        // 由頂端往下找同名標籤(容錯:HTML 不一定完美配對)
        const idx = stack.lastIndexOf(name);
        if (idx !== -1) stack.length = idx;
        if (skipStartDepth !== null && stack.length < skipStartDepth) skipStartDepth = null;
        continue;
      }
      const isVoid = VOID_TAGS.has(name) || isSelfClosing;
      if (!isVoid) stack.push(name);
      if (skipStartDepth === null && triggersSkip(p, name)) {
        skipStartDepth = isVoid ? stack.length : stack.length; // push 之後的深度
      }
      continue;
    }
    if (skipStartDepth !== null) continue;
    const idx = p.indexOf(zh);
    if (idx === -1) continue;
    parts[i] =
      p.slice(0, idx) +
      `<span class="pa-term" data-term="${zh}">${zh}</span>` +
      p.slice(idx + zh.length);
    return { html: parts.join(""), marked: true };
  }
  return { html, marked: false };
}

let markedCount = 0;
const stillMissing = [];

for (const t of targets) {
  const homeFile = chapterFile[t.ch];
  const tryOrder = homeFile ? [homeFile, ...files.filter((f) => f !== homeFile)] : files;
  let done = false;
  for (const f of tryOrder) {
    const html = rawContent.get(f);
    const { html: next, marked } = markFirstOccurrence(html, t.zh);
    if (marked) {
      rawContent.set(f, next);
      markedCount++;
      done = true;
      break;
    }
  }
  if (!done) stillMissing.push(t.zh);
}

console.log(`成功標記:${markedCount} / ${targets.length}`);
if (stillMissing.length) {
  console.log(`⚠️ 沒找到可標記位置(可能 PROSE 判斷用的是跨檔合併字串,單一檔案裡找不到完整子字串):`);
  console.log("  " + stillMissing.join("、"));
}

if (DRY_RUN) {
  console.log("\n--dry-run:不寫檔。");
} else {
  for (const [f, html] of rawContent) {
    if (readFileSync(f, "utf8") !== html) writeFileSync(f, html);
  }
  console.log("\n已寫回檔案。請跑 node tools/check-glossary-coverage.mjs 確認覆蓋率與巢狀/查得到定義兩條斷言。");
}
