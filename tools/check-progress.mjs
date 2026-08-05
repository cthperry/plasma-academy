/* ==========================================================================
   check-progress.mjs — 驗證 src/js/core/progress.js 的徽章邏輯與 /progress/ 頁面

   docs/08-assessment.md §認證·徽章 是唯一來源:四階個別徽章(通過對應
   結業測驗)+「全程完訓」(四階全通過 **且** 所有章節完成)。這支測試
   直接模擬 localStorage 狀態,確認 badges() 算出來的結果跟規格table一致 ——
   尤其是「全程完訓」那個 AND 條件,不能只看四階測驗就發。
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0;
let fail = 0;
function ok(label, cond, detail) {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
}

/**
 * badges() 邏輯放在按需載入的 progress-ui.js(不放進每頁都載的
 * progress.js,見該檔開頭的說明),所以這裡連它一起載進沙盒。
 * progress-ui.js 定義時不會碰 DOM(只有 scan() 才會),沒有
 * document 全域一樣載得起來。
 */
function freshSandbox() {
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(ROOT, "src/data/curriculum.js"), "utf8"), sandbox, {
    filename: "curriculum.js",
  });
  vm.runInContext(readFileSync(join(ROOT, "src/js/core/progress.js"), "utf8"), sandbox, {
    filename: "progress.js",
  });
  vm.runInContext(readFileSync(join(ROOT, "src/js/core/progress-ui.js"), "utf8"), sandbox, {
    filename: "progress-ui.js",
  });
  sandbox.window.PA.progress.reset();
  return sandbox.window.PA;
}

console.log("\n【與 docs/08-assessment.md 的徽章表對等】");

const specMd = readFileSync(join(ROOT, "docs/08-assessment.md"), "utf8");
const tableMatch = specMd.match(/### 徽章\n\n[\s\S]*?\n\n((?:\|.*\n)+)/);
const specRows = tableMatch
  ? tableMatch[1]
      .trim()
      .split("\n")
      .slice(2) // 跳過表頭與分隔線
      .map((r) => r.split("|").map((c) => c.trim()).filter(Boolean)[0].replace(/\*\*/g, ""))
  : [];
ok("docs/08 的徽章表解析成功(5 條)", specRows.length === 5, specRows.join("、"));

let P = freshSandbox();
const names = P.progressUI.badges().map((b) => b.name);
ok(
  "badges() 回傳的名稱與順序跟 docs/08 表格完全一致",
  JSON.stringify(names) === JSON.stringify(specRows),
  `docs/08: ${specRows.join("、")} / 程式: ${names.join("、")}`
);

console.log("\n【徽章條件邏輯】");

P = freshSandbox();
let b = P.progressUI.badges();
ok("初始狀態(什麼都沒做)五個徽章全部未取得", b.every((x) => !x.earned));

P = freshSandbox();
P.progress.recordQuiz("level-1", { score: 0.9, passed: true });
b = P.progressUI.badges();
ok(
  "只通過 L1 → 只有「電漿入門」取得,其餘(含全程完訓)都沒有",
  b.find((x) => x.id === "level-1").earned &&
    !b.find((x) => x.id === "level-2").earned &&
    !b.find((x) => x.id === "all").earned
);

P = freshSandbox();
["level-1", "level-2", "level-3", "level-4"].forEach((k) =>
  P.progress.recordQuiz(k, { score: 0.9, passed: true })
);
b = P.progressUI.badges();
ok(
  "四階都通過測驗,但章節都沒完成 → 四個階段徽章拿到,但「全程完訓」不給",
  b.slice(0, 4).every((x) => x.earned) && !b.find((x) => x.id === "all").earned,
  "這是「全程完訓」AND 條件是否真的在檢查章節完成度的關鍵測試"
);

P = freshSandbox();
["level-1", "level-2", "level-3", "level-4"].forEach((k) =>
  P.progress.recordQuiz(k, { score: 0.9, passed: true })
);
P.curriculum.modules.forEach((m) => {
  P.progress.visit(m.id);
  for (let i = 0; i < 6; i++) P.progress.setObjective(m.id, i, true);
});
b = P.progressUI.badges();
ok("四階通過 + 全部章節完成 → 「全程完訓」才會給", b.find((x) => x.id === "all").earned);

P = freshSandbox();
P.progress.recordQuiz("level-1", { score: 0.5, passed: false });
b = P.progressUI.badges();
ok("測驗分數不夠、passed=false → 該階徽章不給", !b.find((x) => x.id === "level-1").earned);

console.log("\n【與 quiz/engine.js 的呼叫介面一致】");

const engineCode = readFileSync(join(ROOT, "src/js/quiz/engine.js"), "utf8");
ok(
  "quiz 引擎呼叫的是 PA.progress.recordQuiz(不是舊名 setQuiz)",
  /PA\.progress\.recordQuiz\(/.test(engineCode)
);
ok(
  "progress.js 沒有留下呼叫不到的舊名 setQuiz",
  !/setQuiz\s*:/.test(readFileSync(join(ROOT, "src/js/core/progress.js"), "utf8"))
);

console.log("\n【/progress/ 頁面內容】");

const pageHtml = readFileSync(join(ROOT, "src/content/progress.html"), "utf8");
ok("頁面有 [data-progress] 掛載點", /data-progress/.test(pageHtml));
ok(
  "頁面上就寫明了 docs/08 要求的免責聲明(不是只有 JS 產生的證書裡才有)",
  pageHtml.indexOf("本站的徽章與證書由學習者本機產生,供內部訓練紀錄參考,並非第三方認證") !== -1 ||
    pageHtml.indexOf("並非第三方認證") !== -1
);

const uiCode = readFileSync(join(ROOT, "src/js/core/progress-ui.js"), "utf8");
ok(
  "證書內文含 docs/08 規定的免責聲明逐字稿",
  uiCode.indexOf("本證書由學習者本機產生,供內部訓練紀錄參考,非第三方認證。") !== -1
);
ok("證書含姓名輸入欄", /cert-name/.test(uiCode));
ok("證書含涵蓋模組清單渲染", /pa-cert__mods/.test(uiCode));

console.log("\n【build.mjs 不再把 progress/ 當佔位頁】");
const buildCode = readFileSync(join(ROOT, "build/build.mjs"), "utf8");
ok(
  "HUBS 佔位清單裡沒有 progress/ 了(它現在是真頁面)",
  !/\["progress\/"/.test(buildCode)
);

console.log(`\n${fail === 0 ? "✓" : "✗"} 進度追蹤與徽章 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
