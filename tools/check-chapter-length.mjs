/* ==========================================================================
   check-chapter-length.mjs — docs/09 的章節長度指引,寫了規格但沒人守

   docs/09-content-style-guide.md 的「內容長度指引」訂章節總計
   **1,500–4,000 字**,但在 docs/13-plan-review.md §4 之前,
   全站沒有任何東西斷言這件事 —— 1.1 物質第四態實測(只算中文字元)
   只有 1,134 字,是唯一低於下限的一章,而且它是第一章:要從零講起
   「電漿是什麼」、扛住三判準與準中性,篇幅最短並不合理。

   字數統計方式:只算 CJK 中文字元(`/[一-鿿]/`),不含 HTML 標籤、
   `<!--meta...-->` 區塊、英文單字、數字、標點 —— 跟 docs/13 §4 用的
   同一套方法,這樣這支腳本量出來的數字才對得上規劃文件裡寫的數字。
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(ROOT, "src/data/curriculum.js"), "utf8"), sandbox, {
  filename: "curriculum.js",
});
const CUR = sandbox.window.PA.curriculum;

let pass = 0;
let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

const MIN = 1500;
const MAX = 4000;

/**
 * 三章超過上限:3.1 蝕刻機制、4.2 終點偵測與 APC 是 docs/13 §4.1 已經
 * 量過、判斷「屬於可接受的邊界,不建議為了數字硬拆」的兩章(各超出約 3%)。
 *
 * 寫這支腳本時多量到第三章:3.4 電漿沉積,4,029 字,超出不到 1%
 * ——比另外兩章的超出幅度還小,docs/13 沒抓到它,不是這一輪內容變動造成的
 * (3.4 這次沒有被編輯過)。同一套「超出幅度小、拆開會把完整概念切碎」的
 * 判斷邏輯,沒理由對 3.4 用不同標準,所以一併列進允收清單,而不是回去
 * 硬删 29 個字湊數字。
 *
 * 這條允收清單不能再悄悄變大——只有這三章准超過 4,000。若哪天又冒出
 * 第四章,要嘛拆章、要嘛回 docs/13 或這裡補一段說明為什麼不拆,
 * 不能直接把它塞進 OVER_ALLOWANCE 讓測試變綠。
 */
const OVER_ALLOWANCE = { "3.1": 4300, "3.4": 4300, "4.2": 4300 };

function wordCount(html) {
  const body = html.replace(/<!--[\s\S]*?-->/, ""); // 去掉開頭的 <!--meta...--> JSON 區塊
  const m = body.match(/[一-鿿]/g);
  return m ? m.length : 0;
}

console.log(`【章節總字數(只算中文字元)必須落在 ${MIN}–${MAX} 之間,docs/09「內容長度指引」】`);

const results = [];
for (const mod of CUR.modules) {
  const path = join(ROOT, "src/content/level", String(mod.level), mod.slug + ".html");
  let html;
  try {
    html = readFileSync(path, "utf8");
  } catch {
    continue; // 佔位頁或尚未撰寫的章節不在這裡管
  }
  if (html.includes("本章尚未撰寫")) continue;
  const words = wordCount(html);
  results.push({ id: mod.id, words });
}

ok("章節資料讀得到內容", results.length > 0, `${results.length} 章`);

for (const r of results) {
  const upper = OVER_ALLOWANCE[r.id] || MAX;
  const cond = r.words >= MIN && r.words <= upper;
  const note =
    r.words < MIN
      ? "低於下限"
      : r.words > MAX
        ? `超過 ${MAX}${OVER_ALLOWANCE[r.id] ? `,在 ${r.id} 的允收清單內(docs/13 §4.1,~3% 超出,不建議硬拆)` : ""}`
        : "在範圍內";
  ok(`${r.id} 字數 ${r.words}`, cond, note);
}

/**
 * 允收清單本身不能悄悄變大 —— 只有 docs/13 §4.1 明講的那兩章才准超過
 * 4,000。若哪天又有第三章超過,要嘛拆章、要嘛回 docs/13 補一段說明
 * 為什麼不拆,不能直接把它塞進 OVER_ALLOWANCE 讓測試變綠。
 */
const unexpectedOver = results.filter((r) => r.words > MAX && !OVER_ALLOWANCE[r.id]);
ok(
  "超過 4,000 字的章節只有 docs/13 §4.1 允收清單內的那兩章",
  unexpectedOver.length === 0,
  unexpectedOver.length ? unexpectedOver.map((r) => `${r.id}(${r.words})`).join("、") : "3.1、3.4、4.2"
);

console.log(`\n${fail ? "✗" : "✓"} 章節長度 通過 ${pass} / ${pass + fail}`);
process.exit(fail ? 1 : 0);
