/* ==========================================================================
   check-glossary-coverage.mjs — 術語 tooltip 到底掛得出來幾條

   docs/09 的術語規則寫著:「同一章內第二次出現後可只用中文,
   **但全站的 tooltip 永遠可查**」。docs/06 也把 tooltip 列為貫穿全站的
   內容元件之一。

   docs/12 掃描時發現 242 條術語裡有 75 條從未出現在課文,於是判斷缺口是
   「課文沒提到」。實際量下去,真正的缺口比那個大得多也不一樣:
   **課文有提到的術語,絕大多數根本沒有被 `.pa-term` 標記起來**。
   標記前全站只有 52 處標記、涵蓋 35 條術語 —— 242 條裡只有 14 % 真的
   掛得出 tooltip。tooltip.js 對查不到的名稱是靜默 return,
   對沒有標記的文字更是完全不知情,所以這個落差一直沒有任何東西會叫。

   這支檔案把 docs/09 那句話變成可量測的數字,並用棘輪守住:
   覆蓋率只能往上,不能往下。

   ⚠️ 覆蓋率不會、也不該是 100 %:
   有些術語(如「毫托」對 mTorr、「巨負載」對 Macroloading)課文用的是
   英文或縮寫寫法,有些(如 Pirani 真空計、釋氣)課文真的沒展開。
   下面第 4、5 條會把這兩類分開列出來,讓接手的人知道各自該補什麼 ——
   前者補的是寫法或別名,後者補的是課文。
   ========================================================================== */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
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

let pass = 0;
let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

/* ---------- 收集章節 HTML ---------- */
const files = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".html")) files.push(p);
  }
})(join(ROOT, "src/content"));

const HTML = files.map((f) => readFileSync(f, "utf8")).join("\n");
/** 課文純文字(去標籤)—— 用來判斷「課文有沒有提到這個詞」 */
const PROSE = HTML.replace(/<[^>]+>/g, " ");

/* ---------- 抽出全部 .pa-term 標記 ---------- */
const TERM_RE = /<(\w+)([^>]*\bclass="[^"]*\bpa-term\b[^"]*"[^>]*)>([\s\S]*?)<\/\1>/g;
const marks = [];
for (let m; (m = TERM_RE.exec(HTML)); ) {
  const dt = /data-term="([^"]*)"/.exec(m[2]);
  marks.push(dt ? dt[1] : m[3].replace(/<[^>]+>/g, "").trim());
}
const markNames = [...new Set(marks)];

console.log("\n【標記本身要是對的】");

/**
 * 這是本檔最重要的一條:tooltip.js 查不到定義時是**靜默 return**,
 * 不會顯示、也不會報錯(只有 window.PA_DEBUG 時才 console.warn)。
 * 也就是說一個打錯字的 data-term 在瀏覽器上看起來就只是「這個詞沒有 tooltip」,
 * 跟「這個詞本來就沒標記」長得一模一樣 —— 沒有這條斷言就永遠不會被發現。
 */
const broken = markNames.filter((n) => !G.lookup(n));
ok(
  "**每一個 .pa-term 標記都查得到定義** —— tooltip 查不到時是靜默失效,不標記與標記錯了看起來一樣",
  broken.length === 0,
  broken.length ? broken.map((b) => JSON.stringify(b)).join("、") : `${marks.length} 處標記、${markNames.length} 個相異名稱全部查得到`
);

ok(
  "標記沒有巢狀(術語包在術語裡面)",
  !/pa-term[^>]*>[^<]*<span class="pa-term/.test(HTML),
  "巢狀會讓 tooltip 的觸發區域互相吃掉"
);

const chIds = new Set(CUR.modules.map((m) => m.id));
const badCh = G.terms.filter((t) => !chIds.has(t.ch));
ok(
  "術語的 ch 欄位都指得到真的章節",
  badCh.length === 0,
  badCh.length ? badCh.map((t) => `${t.zh}→${t.ch}`).join("、") : `${G.count} 條術語的章節編號都在課綱裡`
);

/* ---------- 覆蓋率 ---------- */
console.log("\n【覆蓋率:docs/09 說「全站的 tooltip 永遠可查」】");

const reachable = new Set();
for (const n of markNames) {
  const t = G.lookup(n);
  if (t) reachable.add(t.id);
}
const rate = reachable.size / G.count;

/**
 * 棘輪基線。
 *
 * 標記前是 35 / 242 = 14 %。這一輪把每章「首次出現」的術語補上標記
 * (docs/09 明文的規則),覆蓋率到 115 / 242 = 48 %。
 * 基線設在 45 %,留一點餘裕給日後課文改寫;
 * ⚠️ 要調的話只能往上調,不要為了讓測試變綠而調低。
 */
const BASELINE = 0.45;
ok(
  `**tooltip 可達的術語比例不得低於 ${(BASELINE * 100).toFixed(0)} %**(棘輪,只能往上)`,
  rate >= BASELINE,
  `${reachable.size} / ${G.count} = ${(rate * 100).toFixed(0)} %`
);

/* ---------- 把還沒覆蓋的分成兩類 ---------- */
const unreachable = G.terms.filter((t) => !reachable.has(t.id));
const aliasType = [];
const missingProse = [];
for (const t of unreachable) {
  const inProse = PROSE.includes(t.zh);
  const enOnly = !inProse && ((t.en && PROSE.includes(t.en)) || (t.abbr && PROSE.includes(t.abbr)));
  if (enOnly) aliasType.push(t);
  else if (!inProse) missingProse.push(t);
}
const unmarked = unreachable.length - aliasType.length - missingProse.length;

console.log("\n【還沒覆蓋的三類,補法各不相同】");
console.log(`    (a) 課文有中文但沒標記      ${unmarked} 條  → 補標記`);
console.log(`    (b) 課文只用英文/縮寫寫法    ${aliasType.length} 條  → 補別名或改寫法`);
console.log(`    (c) 課文真的沒提到          ${missingProse.length} 條  → 補課文`);
if (aliasType.length) {
  console.log("\n    (b) 例:" + aliasType.slice(0, 8).map((t) => `${t.zh}/${t.abbr || t.en}`).join("、"));
}
if (missingProse.length) {
  const byCh = {};
  for (const t of missingProse) (byCh[t.ch] = byCh[t.ch] || []).push(t.zh);
  console.log("\n    (c) 依章節:");
  for (const ch of Object.keys(byCh).sort()) console.log(`      ${ch}  (${byCh[ch].length})  ${byCh[ch].join("、")}`);
}

/**
 * (c) 類的棘輪。
 *
 * 這一類是真正的內容缺口:術語表收了、課文卻沒講。
 * 它不必是 0 —— 有些術語本來就是「查得到就好」的參考條目。
 * 但它**不該變多**:新增術語卻不寫進課文,等於把術語表變成孤島。
 */
const MISSING_MAX = 40;
ok(
  `課文完全沒提到的術語不得超過 ${MISSING_MAX} 條(棘輪,只能往下)`,
  missingProse.length <= MISSING_MAX,
  `目前 ${missingProse.length} 條`
);

ok(
  "每一章都至少有一處術語標記(沒有整章都掛不出 tooltip 的章節)",
  (() => {
    // ⚠️ 不要用 [1-7] 之類的範圍寫死小節上限 —— 3.8 上線時就是被這個
    // 漏掉的(顯示「25 章」而課綱有 26 章)。章節檔名一律用 \d-\d- 判斷。
    const chapters = files.filter((f) => /[1-4]-\d-/.test(f));
    return chapters.every((f) => /class="[^"]*pa-term/.test(readFileSync(f, "utf8")));
  })(),
  `${files.filter((f) => /[1-4]-\d-/.test(f)).length} 章`
);

console.log(`\n${fail ? "✗" : "✓"} 術語 tooltip 覆蓋 通過 ${pass} / ${pass + fail}`);
process.exit(fail ? 1 : 0);
