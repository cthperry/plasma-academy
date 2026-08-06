/* ==========================================================================
   check-pcb.mjs — 驗證 PCB 除膠渣/回蝕模型(3.8 / A34)

   3.8 最反直覺的一句話:3.7.2 說「封裝端幾乎不用氟系」,
   PCB 的 desmear 卻**非加 CF₄ 不可** —— 因為 FR-4 裡有玻纖(SiO₂),
   而 O₂ 對 SiO₂ 完全無效。這支檔案守住那個結論,以及它的三個推論:

     · 純 O₂ 必然留下玻纖突出(不是「效果差一點」,是玻纖移除量恆為 0)
     · 齊平度存在一個最佳 CF₄ 比例,落在現場常用的 10–25 %
     · 加過頭**兩件事同時變糟** —— 玻纖被咬凹,而且樹脂速率也掉下來

   自由基通量與 3.7 共用 package-model.js 的 radicalFlux(),所以這裡
   照 A34 的 deps 順序把兩支都載進沙箱 —— 順序反了就會 undefined,
   那本身就是一條隱含的斷言。
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ["src/js/lab/package-model.js", "src/js/lab/pcb-model.js"]) {
  vm.runInContext(readFileSync(join(ROOT, f), "utf8"), sandbox, { filename: f });
}
const M = sandbox.window.PA.pcbModel;

let pass = 0;
let fail = 0;
function ok(label, cond, detail) {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
}

console.log("\n【模型載得起來,而且共用 3.7 的自由基通量】");
ok(
  "pcb-model.js 依賴 package-model.js 先載入(通量只有一份來源)",
  typeof sandbox.window.PA.packageModel.radicalFlux === "function" && !!M,
  "A34 的 deps 與這裡的載入順序一致"
);
ok(
  "功率與壓力真的會改變移除量(不是寫死的常數)",
  M.desmear({ cf4: 0.2, time_min: 15, power_W: 600 }).resin >
    M.desmear({ cf4: 0.2, time_min: 15, power_W: 300 }).resin,
  `300 W ${M.desmear({ cf4: 0.2, time_min: 15, power_W: 300 }).resin.toFixed(1)} µm → ` +
    `600 W ${M.desmear({ cf4: 0.2, time_min: 15, power_W: 600 }).resin.toFixed(1)} µm`
);

console.log("\n【PCB desmear:為什麼這裡反而非用氟不可】");
{
  const at = (cf4, extra) => M.desmear({ cf4, time_min: 15, ...(extra || {}) });
  const scan = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5, 0.8];
  console.log(
    "    " +
      scan
        .map((c) => `${(c * 100).toFixed(0)}%:突出${at(c).protrusion.toFixed(1)}µm`)
        .join("  ")
  );

  ok(
    "**純 O₂ 完全去不掉玻纖** —— 這就是封裝端的結論在 PCB 不成立的原因",
    at(0).glass === 0 && at(0).protrusion > 3,
    `玻纖移除 ${at(0).glass.toFixed(2)} µm、玻纖突出 ${at(0).protrusion.toFixed(1)} µm`
  );
  ok(
    "純 O₂ 的判定會明講玻纖沒退(不是只給一個數字)",
    /玻纖/.test(at(0).verdict),
    at(0).verdict
  );
  ok(
    "加了 CF₄ 玻纖才開始退,且移除量隨 CF₄ 比例單調上升",
    scan.every((c, i) => i === 0 || at(c).glass > at(scan[i - 1]).glass),
    scan.map((c) => at(c).glass.toFixed(1)).join(" < ")
  );

  /* 樹脂速率先升後降 —— 與 3.7 A33 的接著力曲線是同一個形狀、同一個教訓 */
  const rates = scan.map((c) => M.resinRate(c, 1));
  const peakIdx = rates.indexOf(Math.max(...rates));
  ok(
    "**樹脂移除速率先升後降**(少量 F 幫忙打開高分子鏈,加太多把 O 稀釋掉)",
    peakIdx > 0 && peakIdx < rates.length - 1,
    `峰值在 CF₄ ${(scan[peakIdx] * 100).toFixed(0)} %`
  );
  ok(
    "樹脂速率的峰值落在現場常用的 10–25 % 區間",
    scan[peakIdx] >= 0.1 && scan[peakIdx] <= 0.25,
    `${(scan[peakIdx] * 100).toFixed(0)} %`
  );

  const best = M.bestCF4({ time_min: 15 });
  ok(
    "**齊平度存在一個最佳 CF₄ 比例**,而且落在 10–25 %",
    best.cf4 >= 0.1 && best.cf4 <= 0.25,
    `最佳 ${(best.cf4 * 100).toFixed(0)} %,玻纖突出 ${best.r.protrusion.toFixed(2)} µm`
  );
  ok(
    "CF₄ 過量時玻纖反過來被過度咬蝕(突出變負)",
    at(0.5).protrusion < -1.5,
    `50 % 時 ${at(0.5).protrusion.toFixed(1)} µm`
  );
  ok(
    "CF₄ 過量時樹脂速率也確實掉下來(兩件事同時變糟)",
    M.resinRate(0.8, 1) < M.resinRate(0.2, 1),
    `80 % ${M.resinRate(0.8, 1).toFixed(3)} < 20 % ${M.resinRate(0.2, 1).toFixed(3)} µm/min`
  );

  /**
   * 最佳點是「齊平」而不是「樹脂最快」—— 這兩個目標剛好都落在 20 %
   * 是模型參數的選擇(a = 5/3),不是巧合,但也不是同一件事。
   * 這條斷言把「為什麼挑這個比例」講清楚:挑的是齊平。
   */
  ok(
    "最佳 CF₄ 是以齊平度挑出來的,該點的玻纖突出接近零",
    Math.abs(best.r.protrusion) < 0.5,
    `突出 ${best.r.protrusion.toFixed(2)} µm(容忍界線 ±${M.FLUSH_TOL} µm)`
  );

  /* desmear 與 etchback 是不同的目標深度,不是同一件事 */
  const d = M.desmear({ cf4: 0.2, time_min: 15, target: "desmear" });
  const e = M.desmear({ cf4: 0.2, time_min: 15, target: "etchback" });
  ok(
    "desmear 與 etchback 的目標深度窗不同(後者要刻意讓樹脂退更多)",
    e.window[0] > d.window[1],
    `desmear ${d.window.join("–")} µm、etchback ${e.window.join("–")} µm`
  );
  ok(
    "同樣 15 min 達得到 desmear 的窗,但還不到 etchback 的窗",
    d.okDepth && !e.okDepth,
    `樹脂退 ${d.resin.toFixed(1)} µm`
  );
  const eLong = M.desmear({ cf4: 0.2, time_min: 50, target: "etchback" });
  ok(
    "拉長到 50 min 才進得了 etchback 的窗",
    eLong.okDepth,
    `樹脂退 ${eLong.resin.toFixed(1)} µm — ${eLong.verdict}`
  );

  /**
   * 齊平度與深度是**兩個獨立的判準**,可以一個過一個不過。
   * 現場最容易誤判的就是「深度到了就收工」,而玻纖突出仍在。
   */
  const deepButProtruding = M.desmear({ cf4: 0.05, time_min: 15 });
  ok(
    "深度達標不代表齊平度達標(兩個判準要分開看)",
    deepButProtruding.okDepth && !deepButProtruding.okFlush,
    `CF₄ 5 %:樹脂退 ${deepButProtruding.resin.toFixed(1)} µm(深度✓)、` +
      `突出 ${deepButProtruding.protrusion.toFixed(1)} µm(齊平✗)`
  );
}

console.log("\n【課文引用的數字都算得出來(3.8 的表格)】");
{
  const row = (cf4) => M.desmear({ cf4, time_min: 15 });
  const cases = [
    [0, 4.5, 0.0],
    [0.1, 4.7, 2.4],
    [0.2, 4.8, 4.8],
    [0.3, 4.7, 7.2],
    [0.5, 4.1, 12.0],
  ];
  for (const [cf4, resin, glass] of cases) {
    const r = row(cf4);
    ok(
      `CF₄ ${(cf4 * 100).toFixed(0)} %:樹脂 ${resin} µm、玻纖 ${glass} µm`,
      Math.abs(r.resin - resin) < 0.1 && Math.abs(r.glass - glass) < 0.1,
      `實算 ${r.resin.toFixed(1)} / ${r.glass.toFixed(1)}`
    );
  }
  const eb = M.desmear({ cf4: 0.2, time_min: 50, target: "etchback" });
  ok(
    "課文的「約 50 分鐘進 etchback 窗、退 16.0 µm」算得出來",
    Math.abs(eb.resin - 16.0) < 0.1,
    `${eb.resin.toFixed(1)} µm`
  );
}

console.log(`\n${fail === 0 ? "✓" : "✗"} PCB 除膠渣模型 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
