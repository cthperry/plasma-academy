/* ==========================================================================
   check-model.mjs — 驗證 plasma-model.js 的輸出與 docs 課文數值一致
   這是 docs/05-animation-spec.md 各元件驗收條件的共同基礎
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(
  readFileSync(join(ROOT, "src/js/lab/plasma-model.js"), "utf8"),
  sandbox,
  { filename: "plasma-model.js" }
);
const M = sandbox.window.PA.model;

let pass = 0;
let fail = 0;

/** 相對誤差檢查 */
function near(label, actual, expected, tolPct, unit) {
  const err = Math.abs(actual - expected) / Math.abs(expected);
  const ok = err <= tolPct / 100;
  const fmt = (v) =>
    Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-2 && v !== 0)
      ? v.toExponential(3)
      : v.toFixed(4).replace(/\.?0+$/, "");
  console.log(
    `${ok ? "  ✓" : "  ✗"} ${label}: ${fmt(actual)}${unit || ""} ` +
      `(課文 ${fmt(expected)}${unit || ""}, 誤差 ${(err * 100).toFixed(1)}%, 容差 ${tolPct}%)`
  );
  ok ? pass++ : fail++;
}

function assert(label, cond, detail) {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
}

console.log("\n【1.2 電漿基本參數】");
near("Debye 長度 CCP (n=1e10, Te=3)", M.debyeLength(1e10, 3), 0.13, 15, " mm");
near("Debye 長度 ICP (n=1e12, Te=3)", M.debyeLength(1e12, 3), 0.013, 15, " mm");
near("電漿頻率 (n=1e10)", M.plasmaFrequency(1e10) / 1e6, 900, 5, " MHz");
near("1 eV 換算", M.eVtoK(1), 11605, 1, " K");

console.log("\n【1.3 碰撞與平均自由徑】");
near("λ @ 1 mTorr (Ar)", M.meanFreePath(1, "Ar"), 5, 25, " cm");
near("λ @ 10 mTorr (Ar)", M.meanFreePath(10, "Ar"), 0.5, 25, " cm");
near("λ @ 100 mTorr (Ar)", M.meanFreePath(100, "Ar"), 0.05, 25, " cm");

console.log("\n【1.4 Paschen】");
for (const [key, label] of [
  ["Ar", "Ar"],
  ["He", "He"],
  ["N2", "N₂"],
  ["Air", "Air"],
  ["O2", "O₂"],
]) {
  const min = M.paschenMinimum(key);
  near(`${label} 崩潰電壓 @ pd=${min.pd}`, M.breakdownVoltage(min.pd, key), min.V, 10, " V");
}
assert(
  "極低 pd 無法崩潰",
  !isFinite(M.breakdownVoltage(0.001, "Ar")) || M.breakdownVoltage(0.001, "Ar") > 1000,
  "左支行為正確"
);

console.log("\n【1.5 鞘層入門】");
near("V_p − V_f (Ar, Te=3)", M.floatingPotentialDrop(3, 39.95), 4.7 * 3, 10, " V");

// 1.5.2 的倍數表 —— 課文寫幾倍,這裡就驗幾倍
for (const [label, amu, mult] of [
  ["H₂", 2.016, 3.2],
  ["N₂", 28.01, 4.5],
  ["Ar", 39.95, 4.7],
  ["Cl₂", 70.9, 5.0],
  ["Xe", 131.3, 5.3],
]) {
  near(`${label} 的 (V_p−V_f)/T_e`, M.floatingPotentialDrop(1, amu), mult, 3, " ×T_e");
}
assert(
  "V_p − V_f 正比於 T_e:3→6 eV 剛好加倍(且不含 n_e)",
  Math.abs(M.floatingPotentialDrop(6, 39.95) / M.floatingPotentialDrop(3, 39.95) - 2) < 1e-9
);

// A06 的兩條驗收條件(docs/05)
{
  const drop = (Te) => M.floatingPotentialDrop(Te, 39.95);
  const sheathFloat = (ne, Te) => M.sheathThickness(ne, Te, drop(Te));
  near("A06 浮接鞘層厚度 (n=1e10, Te=3)", sheathFloat(1e10, 3), 0.33, 15, " mm");
  assert(
    "A06 鞘層隨 n_e 上升而變薄:10¹⁰→10¹² 薄約 10 倍",
    Math.abs(sheathFloat(1e10, 3) / sheathFloat(1e12, 3) - 10) < 0.2,
    `實得 ${(sheathFloat(1e10, 3) / sheathFloat(1e12, 3)).toFixed(2)} 倍`
  );
  assert(
    "A06 全參數範圍的鞘層都落在 2 mm 視窗內",
    sheathFloat(1e9, 8) < 2 && sheathFloat(1e12, 1) > 0.005,
    `最厚 ${sheathFloat(1e9, 8).toFixed(2)} mm、最薄 ${sheathFloat(1e12, 1).toFixed(3)} mm`
  );
}

console.log("\n【2.1 真空與滯留時間】");
near("n_gas @ 10 mTorr", M.gasDensity(10), 3.2e14, 10, " cm⁻³");
near("τ (30 L, 20 mTorr, 200 sccm)", M.residenceTime(20, 30, 200), 0.24, 5, " s");
near("τ (40 L, 30 mTorr, 300 sccm)", M.residenceTime(30, 40, 300), 0.316, 5, " s");

console.log("\n【2.4 鞘層物理】");
near("Bohm 速度 (Ar, Te=3)", M.bohmVelocity(3, 39.95), 2.69e3, 5, " m/s");
near("Bohm 通量 CCP (n=1e10, Te=3, Ar)", M.bohmFlux(1e10, 3, 39.95), 1.6e15, 15, " cm⁻²s⁻¹");
near("Bohm 通量 ICP (n=1e12, Te=3, Ar)", M.bohmFlux(1e12, 3, 39.95), 1.6e17, 15, " cm⁻²s⁻¹");
assert(
  "CCP 每秒約 2 個離子/表面原子",
  Math.abs(M.bohmFlux(1e10, 3, 39.95) / 7e14 - 2.3) < 0.5,
  `實得 ${(M.bohmFlux(1e10, 3, 39.95) / 7e14).toFixed(1)}`
);
near("鞘層厚度 (n=1e10, Te=3, V=500)", M.sheathThickness(1e10, 3, 500), 4.8, 20, " mm");
assert(
  "s ∝ V^(3/4):V 加倍 → 厚 1.68 倍",
  Math.abs(M.sheathThickness(1e10, 3, 1000) / M.sheathThickness(1e10, 3, 500) - Math.pow(2, 0.75)) < 0.02
);
assert(
  "s ∝ n^(−1/2):n 加倍 → 薄 0.707 倍",
  Math.abs(M.sheathThickness(2e10, 3, 500) / M.sheathThickness(1e10, 3, 500) - Math.SQRT1_2) < 0.02
);
assert(
  "ICP 鞘層比 CCP 薄約一個數量級",
  M.sheathThickness(1e10, 3, 500) / M.sheathThickness(1e12, 3, 100) > 8
);

console.log("\n【2.3 EEDF 與速率係數】");
const k2 = M.rateCoefficient(2, 15.76, "maxwellian");
const k3 = M.rateCoefficient(3, 15.76, "maxwellian");
assert(
  "T_e 2→3 eV 游離率上升 > 5 倍(高能尾巴的指數敏感性)",
  k3 / k2 > 5,
  `實得 ${(k3 / k2).toFixed(1)} 倍`
);
const kMax = M.rateCoefficient(3, 15.76, "maxwellian");
const kDru = M.rateCoefficient(3, 15.76, "druyvesteyn");
assert(
  "同 T_e 下 Druyvesteyn 游離率低於 Maxwellian",
  kDru < kMax,
  `比值 ${(kDru / kMax).toFixed(3)}`
);

console.log("\n【4.5 / 2.6 0-D 全域模型的兩個教學結論】");
const base = { gas: "Ar", pressure_mTorr: 20, radius_cm: 15, height_cm: 3 };
const p400 = M.globalModel({ ...base, power_W: 400 });
const p1600 = M.globalModel({ ...base, power_W: 1600 });
const TeDrift = Math.abs(p1600.Te - p400.Te) / p400.Te;
assert(
  "T_e 與功率無關(400→1600 W 變化 < 10%)",
  TeDrift < 0.1,
  `實得 ${(TeDrift * 100).toFixed(2)}%`
);
const neRatio = p1600.ne / p400.ne;
assert(
  "n_e 正比於功率(功率 ×4 → 密度 ×4,容差 10%)",
  Math.abs(neRatio - 4) / 4 < 0.1,
  `實得 ×${neRatio.toFixed(2)}`
);
const lowP = M.globalModel({ ...base, pressure_mTorr: 5, power_W: 800 });
const highP = M.globalModel({ ...base, pressure_mTorr: 80, power_W: 800 });
assert("T_e 隨壓力上升而下降(由 p·L 決定)", highP.Te < lowP.Te,
  `${lowP.Te.toFixed(2)} → ${highP.Te.toFixed(2)} eV`);
const small = M.globalModel({ ...base, radius_cm: 7, power_W: 800 });
const large = M.globalModel({ ...base, radius_cm: 25, power_W: 800 });
assert("腔體越小 T_e 越高(損失面積相對變大)", small.Te > large.Te,
  `${small.Te.toFixed(2)} vs ${large.Te.toFixed(2)} eV`);
assert(
  "T_e 落在製程電漿的合理範圍 1–8 eV",
  p400.Te > 1 && p400.Te < 8,
  `${p400.Te.toFixed(2)} eV`
);
assert(
  "n_e 落在 CCP/ICP 的合理範圍 1e9–1e13",
  p400.ne > 1e9 && p400.ne < 1e13,
  `${p400.ne.toExponential(2)} cm⁻³`
);

console.log("\n【3.1.5 濺鍍產額角度依賴】");
const yields = [0, 15, 30, 45, 60, 75, 85].map((d) => ({
  deg: d,
  y: M.angularYield((d * Math.PI) / 180),
}));
const peak = yields.reduce((a, b) => (b.y > a.y ? b : a));
assert(
  "濺鍍產額峰值落在 45–70°(非垂直入射)",
  peak.deg >= 45 && peak.deg <= 70,
  `峰值 @ ${peak.deg}°`
);
assert("垂直入射不是最大值", M.angularYield(0) < peak.y);
assert("接近掠射時產額趨近 0", M.angularYield((88 * Math.PI) / 180) < M.angularYield(0));

console.log("\n【3.1 蝕刻率:離子輔助協同】");
const chemOnly = M.etchRate({ radicalFlux: 1, ionFlux: 0, ionEnergy: 0 });
const ionOnly = M.etchRate({ radicalFlux: 0, ionFlux: 1, ionEnergy: 300 });
const both = M.etchRate({ radicalFlux: 1, ionFlux: 1, ionEnergy: 300 });
assert(
  "協同效應:兩者同時 > 各自之和(Coburn–Winters)",
  both > chemOnly + ionOnly,
  `${chemOnly.toFixed(2)} + ${ionOnly.toFixed(2)} = ${(chemOnly + ionOnly).toFixed(2)} < ${both.toFixed(2)}`
);
assert(
  "低於濺鍍閾值時無離子輔助貢獻",
  M.etchRate({ radicalFlux: 1, ionFlux: 1, ionEnergy: 10, threshold: 25 }) === chemOnly
);

console.log(`\n${fail === 0 ? "✓" : "✗"} 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
