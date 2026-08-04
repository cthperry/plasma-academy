/* ==========================================================================
   check-faults.mjs — 驗證 4.6 的五個故障情境與 PFC 資料

   4.6 沒有互動元件,所以沒有物理模型可以驗。但它有另一種正確性可以守:
   **交叉引用**。每個情境都引用了前面章節的結論(FDC 該監控哪五個訊號、
   天線比、first wafer effect、鞘層 ∝ T_e……)。這支檔案驗那些引用真的
   指得到東西 —— 課文改了、章節搬了、FDC 清單變了,測試會立刻抓到。

   這是「單一資料來源」原則在**純內容章節**上的應用:
   數字與交叉引用一樣要被自動化守住,不能只靠人眼。
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ["src/data/curriculum.js", "src/data/faults.js"]) {
  vm.runInContext(readFileSync(join(ROOT, f), "utf8"), sandbox, { filename: f });
}
const F = sandbox.window.PA.faults;
const CUR = sandbox.window.PA.curriculum;

const chapterHtml = readFileSync(join(ROOT, "src/content/level/4/4-6-production.html"), "utf8");

let pass = 0;
let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

/* ============ 五個情境的結構 ============ */
console.log("\n【五個故障情境:結構完整性】");
ok(
  "剛好五個情境(docs/04 §4.6.6 指定)",
  F.FAULTS.length === 5,
  F.FAULTS.map((x) => x.title.slice(0, 12)).join("、")
);
ok(
  "每個情境的九個欄位都齊備",
  F.FAULTS.every(
    (x) =>
      x.id && x.title && x.symptom && Array.isArray(x.data) && x.data.length >= 3 &&
      Array.isArray(x.hypotheses) && x.hypotheses.length >= 3 &&
      x.rootCause && x.why && x.fix && x.prevent &&
      Array.isArray(x.signals) && Array.isArray(x.ch)
  ),
  "symptom / data / hypotheses / rootCause / why / fix / prevent / signals / ch"
);
ok(
  "**每個假設都附了怎麼驗**(研討的重點不是猜對,是知道怎麼排除)",
  F.FAULTS.every((x) => x.hypotheses.every((h) => h.h && h.test && h.test.length > 8)),
  `共 ${F.FAULTS.reduce((a, x) => a + x.hypotheses.length, 0)} 條假設,每條都有驗證方法`
);
ok(
  "id 不重覆",
  new Set(F.FAULTS.map((x) => x.id)).size === F.FAULTS.length,
  F.FAULTS.map((x) => x.id).join("、")
);
ok(
  "每個情境的 why 都解釋了**線索為什麼指向這個根因**,而不只是複述根因",
  F.FAULTS.every((x) => x.why.length > 80 && x.why !== x.rootCause),
  `最短的 why 有 ${Math.min(...F.FAULTS.map((x) => x.why.length))} 字`
);

/* ============ 交叉引用 ============ */
console.log("\n【交叉引用:引用的東西必須真的存在】");
const sigKeys = Object.keys(F.FDC_SIGNALS);
ok(
  "FDC 訊號剛好是 4.2.7 點名的五個",
  sigKeys.length === 5,
  Object.values(F.FDC_SIGNALS).map((s) => s.label).join("、")
);
ok(
  "每個 FDC 訊號都說明了「為什麼是它」",
  Object.values(F.FDC_SIGNALS).every((s) => s.label && s.why && s.why.length > 10),
  "節流閥那條:壓力讀值永遠是你設的數字,說話的是閥開了多少"
);
ok(
  "**所有情境引用的 FDC 訊號都存在**",
  F.FAULTS.every((x) => x.signals.every((k) => sigKeys.indexOf(k) >= 0)),
  F.FAULTS.map((x) => `${x.id}:${x.signals.length} 個`).join("、")
);
ok(
  "五個 FDC 訊號**每一個都至少被一個情境用到**(沒有列了卻用不上的)",
  sigKeys.every((k) => F.FAULTS.some((x) => x.signals.indexOf(k) >= 0)),
  sigKeys.map((k) => `${F.FDC_SIGNALS[k].label} ×${F.FAULTS.filter((x) => x.signals.indexOf(k) >= 0).length}`).join("、")
);

const modIds = CUR.modules.map((m) => m.id);
ok(
  "**所有情境引用的章節都在課綱裡**",
  F.FAULTS.every((x) => x.ch.every((c) => modIds.indexOf(c) >= 0)),
  [...new Set(F.FAULTS.flatMap((x) => x.ch))].sort().join("、")
);
ok(
  "五個情境涵蓋了 L3 與 L4 兩階(不是全部擠在同一章)",
  (() => {
    const chs = [...new Set(F.FAULTS.flatMap((x) => x.ch))];
    return chs.some((c) => c.startsWith("3.")) && chs.some((c) => c.startsWith("4."));
  })(),
  "跨 3.6 / 4.2 / 4.3 / 4.4 / 4.6"
);

/* ============ 章節頁與資料一致 ============ */
console.log("\n【章節頁必須真的用到這份資料】");
for (const f of F.FAULTS) {
  ok(
    `情境「${f.title.slice(0, 14)}」的根因出現在章節頁`,
    chapterHtml.includes(f.rootCause.slice(0, 10)),
    f.rootCause
  );
}

/* ============ PFC / GWP ============ */
console.log("\n【PFC 溫室氣體資料】");
ok(
  "GWP 表有五筆,且以 CO₂ = 1 為基準",
  F.GWP.length === 5 && F.GWP[0].gas === "CO₂" && F.GWP[0].gwp === 1,
  F.GWP.map((g) => `${g.gas} ${g.gwp}`).join("、")
);
ok(
  "GWP 依數值遞增排列(讀者一眼看得出量級)",
  F.GWP.every((g, i) => i === 0 || g.gwp > F.GWP[i - 1].gwp),
  `${F.GWP[0].gwp} → ${F.GWP[F.GWP.length - 1].gwp}`
);
ok(
  "**SF₆ 的 GWP 最高、NF₃ 次之** —— 與 docs/04 §4.6.5 的表一致",
  F.GWP[F.GWP.length - 1].gas === "SF₆" && F.GWP[F.GWP.length - 2].gas === "NF₃",
  `SF₆ ${F.GWP[F.GWP.length - 1].gwp}、NF₃ ${F.GWP[F.GWP.length - 2].gwp}`
);
ok(
  "**NF₃ 的註記必須提到分解率** —— 否則「C₂F₆ → NF₃」這個替代策略看起來是反的",
  F.GWP.find((g) => g.gas === "NF₃").note.includes("分解率"),
  F.GWP.find((g) => g.gas === "NF₃").note.replace(/\*\*/g, "")
);
ok(
  "章節頁的 GWP 數字與資料一致",
  F.GWP.every((g) => chapterHtml.includes(String(g.gwp))),
  F.GWP.map((g) => g.gwp).join("、")
);

console.log(`\n${fail === 0 ? "✓" : "✗"} 量產故障情境與 PFC 資料通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
