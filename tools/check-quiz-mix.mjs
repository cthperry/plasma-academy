/* ==========================================================================
   check-quiz-mix.mjs — 結業測驗「實際抽到的題型」有沒有落在規格附近

   docs/13-plan-review.md 的核心發現:docs/08 §140 那張題型分佈表
   (例如 L3「單選 12 / 多選 5 / 圖形 12 / 情境 11」)只是題庫設計時的
   **參考表**,`engine.js` 的抽題邏輯是 `shuffle(pool, rng(seed)).slice(0, draw)`
   ——從整層題庫裡**均勻隨機**抽,完全不管題型。也就是說,題庫裡的題型比例
   才是真正決定「學員這次抽到的考卷長什麼樣子」的唯一因素,那張表能不能
   兌現,要看題庫比例夠不夠接近它,而不是看那張表本身寫了什麼。

   `check-quiz.mjs` 驗證的是題庫本身的品質(有沒有 why、會不會洩漏答案…);
   這支檔案驗證的是下一層——把題庫丟進**真正的抽題演算法**跑很多次
   結業測驗,量「平均會抽到幾題某個題型」,拿去對規格表。兩者都要跑,
   因為題庫比例正確不代表抽樣結果正確(理論上兩者期望值相等,但只有
   真的跑一次抽題演算法,才會連 `rng`/`shuffle` 本身的實作錯誤一起測到)。

   2026-08 這一輪(docs/13 §8 第一項)修的是三個具體缺口:
     L2  情境 5→13、多選 3→7 題(純增補,78→90 題,見 docs/11)
     L3  單選 86→65、情境 9→30 題(改寫,題庫規模不變,116 題打平)
     L4  圖形判讀 0→8 題(改寫,題庫規模不變,90 題打平)
   下面的斷言只鎖住**這三項**改善不倒退,附上規格表的完整比較讓下一個
   人知道還差多少——不要因為某一項已經達標,就誤以為整張表都達標了。

   ⚠️ L1(完全沒動)、L3 圖形判讀與多選、L4 多選,離規格表都還有明顯差距,
   這是已知的、故意先不做的範圍(docs/13 §8:優先修 L2/L3/L4 的最大缺口,
   L1 與 L3/L4 的次要題型留給下一輪)。不要為了讓下面的斷言好看,
   偷偷把這幾項也塞進 ratchet——那樣下一個人會誤以為它們也修好了。
   ========================================================================== */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(ROOT, "src/data/curriculum.js"), "utf8"), sandbox, {
  filename: "curriculum.js",
});
const QUIZ_DIR = join(ROOT, "src/data/quiz");
for (const f of readdirSync(QUIZ_DIR).sort()) {
  if (!f.endsWith(".js")) continue;
  vm.runInContext(readFileSync(join(QUIZ_DIR, f), "utf8"), sandbox, { filename: "quiz/" + f });
}
vm.runInContext(readFileSync(join(ROOT, "src/js/quiz/engine.js"), "utf8"), sandbox, {
  filename: "engine.js",
});

const BANK = sandbox.window.PA.quizBank;
const Q = sandbox.window.PA.quiz;
const { STAGES, allOf, rng, shuffle } = Q;

let pass = 0;
let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

/* ---------- docs/08 §140 的題型分佈表(單位:每份考卷的題數) ---------- */
const TARGET = {
  "1": { single: 12, multi: 3, numeric: 3, scenario: 2 },
  "2": { single: 14, multi: 5, numeric: 5, scenario: 6 },
  "3": { single: 12, multi: 5, image: 12, scenario: 11 },
  "4": { single: 8, multi: 4, numeric: 3, image: 5, scenario: 10 },
};

const RUNS = 500;

/** 模擬 RUNS 次結業測驗抽題,回傳 { avgByType, total, drawn } */
function simulate(level) {
  const st = STAGES[level];
  const pool = allOf(level);
  const totals = {};
  let totalDrawn = 0;
  const seenIdSets = [];
  for (let i = 0; i < RUNS; i++) {
    // 用跟正式測驗一樣的演算法,種子換著跑,模擬「每次重測」抽到不同題。
    const seed = i * 2654435761 + 1;
    const drawn = shuffle(pool, rng(seed)).slice(0, Math.min(st.draw, pool.length));
    totalDrawn += drawn.length;
    const ids = new Set();
    for (const q of drawn) {
      totals[q.type] = (totals[q.type] || 0) + 1;
      ids.add(q.id);
    }
    seenIdSets.push(ids);
  }
  const avgByType = {};
  for (const t of Object.keys(totals)) avgByType[t] = totals[t] / RUNS;
  return { avgByType, avgDrawn: totalDrawn / RUNS, target: st.draw, seenIdSets };
}

console.log(`【結業測驗抽題模擬】每階跑 ${RUNS} 次,量「平均每份考卷會抽到幾題某個題型」`);

const results = {};
for (const level of Object.keys(STAGES)) {
  results[level] = simulate(level);
  const st = STAGES[level];
  console.log(`\n  L${level}(出題 ${st.draw}):`);
  ok(
    `每次都抽出 min(出題數, 題庫題數) 題,沒有抽不滿或抽超過`,
    Math.abs(results[level].avgDrawn - Math.min(st.draw, allOf(level).length)) < 1e-9
  );
  ok(
    `500 次裡沒有同一份考卷出現重複的題目`,
    results[level].seenIdSets.every((ids, i) => {
      const drawnCount = Math.min(st.draw, allOf(level).length);
      return ids.size === drawnCount;
    })
  );
  const t = TARGET[level];
  const a = results[level].avgByType;
  for (const type of Object.keys(t)) {
    const got = (a[type] || 0).toFixed(2);
    const pct = ((100 * (a[type] || 0)) / t[type]).toFixed(0);
    console.log(`      ${type.padEnd(8)} 規格 ${String(t[type]).padStart(2)} 題 / 平均抽到 ${got} 題(${pct} %)`);
  }
}

/* ---------- Ratchet:只鎖這一輪動過的三項,只能往上、不能退回 ---------- */
console.log("\n【這一輪鎖住的三項改善(ratchet,只能往上調)】");

ok(
  "L2 結業測驗平均抽到的情境題不得少於 4.0 題(這一輪 5→13 題補上來的,基準見 docs/11)",
  results["2"].avgByType.scenario >= 4.0,
  `目前 ${results["2"].avgByType.scenario.toFixed(2)} 題(規格 6 題,題庫規模上限只夠打到這裡)`
);
ok(
  "L2 結業測驗平均抽到的多選題不得少於 2.0 題(這一輪 3→7 題補上來的)",
  results["2"].avgByType.multi >= 2.0,
  `目前 ${results["2"].avgByType.multi.toFixed(2)} 題(規格 5 題)`
);
ok(
  "L3 結業測驗平均抽到的情境題不得少於 9.5 題(這一輪把 21 題單選改寫成情境題換來的)",
  results["3"].avgByType.scenario >= 9.5,
  `目前 ${results["3"].avgByType.scenario.toFixed(2)} 題(規格 11 題,已經接近打平)`
);
ok(
  "L4 結業測驗平均抽到的圖形判讀題不得少於 2.0 題(這一輪從 0 題補上來的)",
  (results["4"].avgByType.image || 0) >= 2.0,
  `目前 ${(results["4"].avgByType.image || 0).toFixed(2)} 題(規格 5 題,題庫已用滿 19 種缺陷剖面中的 8 種)`
);
ok(
  "L4 結業測驗平均抽到的情境+圖形判讀合計不得少於出題數的一半(docs/08:這是 80% 通過門檻的論證前提)",
  (results["4"].avgByType.scenario || 0) + (results["4"].avgByType.image || 0) >= STAGES["4"].draw / 2,
  `目前 ${((results["4"].avgByType.scenario || 0) + (results["4"].avgByType.image || 0)).toFixed(2)} / ${STAGES["4"].draw} 題`
);

console.log("\n【還沒動的已知缺口(只回報,不斷言 —— 留給下一輪)】");
console.log(
  `    L1 情境題:平均抽到 ${(results["1"].avgByType.scenario || 0).toFixed(2)} 題 / 規格 ${TARGET["1"].scenario} 題(這一輪完全沒動 L1)`
);
console.log(
  `    L3 圖形判讀:平均抽到 ${(results["3"].avgByType.image || 0).toFixed(2)} 題 / 規格 ${TARGET["3"].image} 題(題庫只有 14 題圖形判讀,離規格的密度還有距離)`
);
console.log(
  `    L3 多選:平均抽到 ${(results["3"].avgByType.multi || 0).toFixed(2)} 題 / 規格 ${TARGET["3"].multi} 題(題庫全部只有 1 題多選)`
);
console.log(
  `    L4 多選:平均抽到 ${(results["4"].avgByType.multi || 0).toFixed(2)} 題 / 規格 ${TARGET["4"].multi} 題(題庫全部只有 2 題多選)`
);

console.log(`\n${fail ? "✗" : "✓"} 結業測驗抽題型分佈 通過 ${pass} / ${pass + fail}`);
process.exit(fail ? 1 : 0);
