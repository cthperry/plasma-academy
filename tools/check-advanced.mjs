/* ==========================================================================
   check-advanced.mjs — 驗證先進技術模型(4.4 / A30 ALE、A31 脈衝電漿)

   docs/05 的驗收條件:
     A30 · 窗內時 EPC 與能量無關(變化 < 5 %)      → 達成(**但「窗」要定義對**)
     A30 · 協同度計算可得出 > 90 % 的理想值          → 達成
     A31 · off 期 T_e 衰減時間常數顯著小於 n_e       → 達成
     A31 · 連續與脈衝的孔底電荷累積行為明顯不同      → 達成

   ⚠️ A30 第一條有一個陷阱,而且第一版就踩進去了:
   照兩個閾值取窗(18–55 eV)去掃 EPC,變異高達 **239 %**。
   原因不是模型壞掉 —— **閾值只說移除「開始」,沒說移除「來得及完成」**。
   剛過閾值時產額極小(20 eV 時 Y_mod 只有 0.067),移除步的離子劑量
   根本清不完改質層,自限制沒發生。所以可用窗的下緣不是 E_th,
   而是「t_clear ≤ 移除步時間」的那一點,**它會隨移除步時間移動**。
   本檔因此驗的是 effectiveWindow(),並額外釘住「窗寬隨移除步時間變化」。

   ⚠️ A31 的孔底充電也被實作修正過兩次,兩次都是填錯數字造成的假象:
   1. 孔底電容隨手填 2e-8 F/m² → 電位瞬間跟著 T_e 的天花板跑,
      脈衝反而讓尖峰變高(因為點火瞬間 T_e 過衝)。改用「剩餘 100 nm SiO₂」
      導出的 3.45e-4 F/m² 之後,孔底才是在積分淨電流。
   2. 表面高於電漿電位時仍套用幾何遮蔽 → 後輝光每週期只放電 0.2 V,
      模型宣稱「脈衝對孔底充電幾乎沒用」。加上**吸引態收集**
      (電位比電漿正時電子被漏斗進洞裡)之後才對。
      該項在 4.3 的所有情形下都是關閉的,check-charging 仍 31/31。
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of [
  "src/js/lab/ale-model.js",
  "src/js/lab/charging-model.js",
  "src/js/lab/pulse-model.js",
]) {
  vm.runInContext(readFileSync(join(ROOT, f), "utf8"), sandbox, { filename: f });
}
const A = sandbox.window.PA.ale;
const P = sandbox.window.PA.pulse;

let pass = 0;
let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

/* ==================== A30 ALE ==================== */
const BASE = { energy: 40, tMod: 2, tPurge: 1.5, tRemove: 1, cycles: 20 };
const ale = (over) => Object.assign({}, BASE, over);

console.log("\n【A30:兩個自限制】");
ok(
  "吸附飽和(第一個自限制):時間拉長,覆蓋率收斂到 1",
  A.coverage(5) > 0.99 && A.coverage(0.2) < 0.4 && A.coverage(10) < 1.0001,
  `0.2 s → ${(A.coverage(0.2) * 100).toFixed(0)} %、2 s → ${(A.coverage(2) * 100).toFixed(1)} %、5 s → ${(A.coverage(5) * 100).toFixed(1)} %`
);
ok(
  "能量窗(第二個自限制):改質層閾值遠低於原始材料閾值",
  A.E_TH_MOD < A.E_TH_SUB && A.window().width > 20,
  `${A.E_TH_MOD} eV(改質層) → ${A.E_TH_SUB} eV(原始 Si),窗寬 ${A.window().width} eV`
);
ok(
  "窗內移除步是自限制的:清完改質層就停",
  A.cycle(ale({}), 0).selfLimited === true,
  `清乾淨只要 ${A.cycle(ale({}), 0).tClear.toFixed(3)} s,而移除步給了 ${BASE.tRemove} s`
);

console.log("\n【A30 驗收 1:窗內 EPC 與能量無關】");
const ew = A.effectiveWindow(BASE);
console.log(`    教科書窗 ${A.window().lo}–${A.window().hi} eV(寬 ${A.window().width}) / 實際可用窗 ${ew.lo}–${ew.hi} eV(寬 ${ew.width})`);
const inWin = [];
for (let E = ew.lo; E <= ew.hi; E += 1) inWin.push(A.epcSteady(ale({ energy: E })));
const spread = (Math.max(...inWin) - Math.min(...inWin)) / Math.min(...inWin);
console.log(`    窗內 ${inWin.length} 個能量點的 EPC:${Math.min(...inWin).toFixed(5)} ~ ${Math.max(...inWin).toFixed(5)} ML`);
ok(
  "**可用窗內 EPC 與能量無關(變化 < 5 %)**",
  spread < 0.05,
  `變異 ${(spread * 100).toFixed(3)} %`
);
ok(
  "⚠️ 但用教科書的閾值窗去驗會失敗 —— 剛過閾值時劑量清不完改質層",
  (() => {
    const all = [];
    for (let E = A.window().lo + 2; E <= A.window().hi; E += 1) all.push(A.epcSteady(ale({ energy: E })));
    return (Math.max(...all) - Math.min(...all)) / Math.min(...all) > 0.5;
  })(),
  "閾值窗內變異 > 50 %,所以「窗」必須用可用窗定義"
);
ok(
  "**可用窗的下緣隨移除步時間移動** —— 窗寬不是材料常數,是配方決定的",
  (() => {
    const a = A.effectiveWindow(ale({ tRemove: 0.3 }));
    const b = A.effectiveWindow(ale({ tRemove: 3 }));
    return b.width > a.width * 2 && b.lo < a.lo;
  })(),
  `移除步 0.3 s → 窗 ${A.effectiveWindow(ale({ tRemove: 0.3 })).width.toFixed(1)} eV 寬;3 s → ${A.effectiveWindow(ale({ tRemove: 3 })).width.toFixed(1)} eV 寬`
);

console.log("\n【A30:三種失效模式都要跑得出來】");
ok(
  "① 能量過低 → 移不掉,EPC 趨近 0(只剩自發蝕刻背景)",
  A.epcSteady(ale({ energy: 12 })) < 0.02 && A.regime(ale({ energy: 12 })).key === "low",
  `12 eV → EPC ${A.epcSteady(ale({ energy: 12 })).toFixed(4)} ML(窗內是 ${A.epcSteady(ale({})).toFixed(3)})`
);
ok(
  "② 能量過高 → **EPC 隨能量持續上升,自限制消失**",
  (() => {
    const es = [60, 80, 100, 120, 150].map((E) => A.epcSteady(ale({ energy: E })));
    return es.every((v, i) => i === 0 || v > es[i - 1]) && es[4] > es[0] * 2;
  })(),
  [60, 90, 120, 150].map((E) => `${E} eV→${A.epcSteady(ale({ energy: E })).toFixed(3)}`).join("、")
);
ok(
  "③ 改質時間不足 → EPC 跟著時間跑,不再是常數",
  (() => {
    const a = A.epcSteady(ale({ tMod: 0.2 }));
    const b = A.epcSteady(ale({ tMod: 0.5 }));
    const c = A.epcSteady(ale({ tMod: 2 }));
    const d = A.epcSteady(ale({ tMod: 3 }));
    return b > a * 1.5 && Math.abs(d / c - 1) < 0.05;
  })(),
  `t_mod 0.2→0.5 s:EPC ${A.epcSteady(ale({ tMod: 0.2 })).toFixed(3)}→${A.epcSteady(ale({ tMod: 0.5 })).toFixed(3)}(飽和後 2→3 s 只差 ${((A.epcSteady(ale({ tMod: 3 })) / A.epcSteady(ale({ tMod: 2 })) - 1) * 100).toFixed(1)} %)`
);
ok(
  "④(額外)Purge 不足 → EPC 要好幾個循環才穩,而且偏高",
  (() => {
    const r = A.run(ale({ tPurge: 0.3 }));
    const g = A.run(ale({ tPurge: 3 }));
    return r[19].epc / r[0].epc > 1.3 && Math.abs(g[19].epc / g[0].epc - 1) < 0.02;
  })(),
  `purge 0.3 s:第 1 → 第 20 循環 EPC 漲 ${((A.run(ale({ tPurge: 0.3 }))[19].epc / A.run(ale({ tPurge: 0.3 }))[0].epc - 1) * 100).toFixed(0)} %;purge 3 s 幾乎不變`
);

console.log("\n【A30 驗收 2:協同度】");
const syn = A.synergy(ale({}));
console.log(`    窗內:EPC ${syn.epc.toFixed(4)} ML、α ${syn.alpha.toFixed(4)}、β ${syn.beta.toFixed(4)} → S = ${(syn.S * 100).toFixed(1)} %`);
ok(
  "**理想 ALE 的協同度 > 90 %**",
  syn.S > 0.9,
  `S = ${(syn.S * 100).toFixed(1)} %`
);
ok(
  "窗內 β = 0(離子單獨打不動原始材料)—— 這正是協同度高的原因",
  syn.beta === 0 && A.yieldSub(BASE.energy) === 0,
  `${BASE.energy} eV 時 Y_sub = ${A.yieldSub(BASE.energy)}`
);
ok(
  "能量拉出窗外,協同度隨之崩壞",
  (() => {
    const s = [60, 80, 120].map((E) => A.synergy(ale({ energy: E })).S);
    return s.every((v, i) => i === 0 || v < s[i - 1]) && s[2] < 0.6;
  })(),
  [60, 80, 120].map((E) => `${E} eV→${(A.synergy(ale({ energy: E })).S * 100).toFixed(0)} %`).join("、")
);
ok(
  "深度正比於循環數(自限制的最終驗證)",
  (() => {
    const r = A.run(ale({ cycles: 40, tPurge: 3 }));
    const slope = (r[39].depth - r[19].depth) / 20;
    const early = (r[19].depth - r[9].depth) / 10;
    return Math.abs(slope / early - 1) < 0.02;
  })(),
  `第 10–20 與第 20–40 循環的斜率一致到 2 % 以內`
);
ok(
  "EPC 的量級與現場相符(0.05–0.2 nm/循環)",
  A.epcSteady(ale({})) * A.ML_NM > 0.05 && A.epcSteady(ale({})) * A.ML_NM < 0.2,
  `${(A.epcSteady(ale({})) * A.ML_NM).toFixed(4)} nm/循環`
);

/* ==================== A31 脈衝電漿 ==================== */
console.log("\n【A31 驗收 1:off 期 T_e 衰減遠快於 n_e】");
const pulsed = P.simulate({ pulse: true, freq: 2000, duty: 0.5, cycles: 4, arFeature: 8 });
const ps = P.stats(pulsed);
console.log(`    τ(T_e) = ${(ps.tauTe * 1e6).toFixed(2)} µs、τ(n_e) = ${(ps.tauNe * 1e6).toFixed(2)} µs`);
ok(
  "**τ(n_e) 至少是 τ(T_e) 的 5 倍**",
  ps.tauNe / ps.tauTe > 5,
  `比值 ${(ps.tauNe / ps.tauTe).toFixed(1)}`
);
ok(
  "這是「高密度低溫後輝光」的來源:off 期 T_e 掉一個數量級,n_e 只掉不到一半",
  ps.teMax / ps.teMin > 10 && ps.neMax / ps.neMin < 20,
  `T_e ${ps.teMin.toFixed(2)}–${ps.teMax.toFixed(2)} eV(×${(ps.teMax / ps.teMin).toFixed(0)})、n_e ×${(ps.neMax / ps.neMin).toFixed(1)}`
);
ok(
  "衰減時間常數是**量出來的**,不是模型參數 —— T_e 的衰減不是單一指數",
  isFinite(ps.tauTe) && ps.tauTe > 0 && isFinite(ps.tauNe),
  "ν_iz ∝ exp(−E_iz/T_e) 一關掉,衰減就換了機制"
);
ok(
  "鞘層電位 ∝ T_e,所以 off 期鞘層跟著塌陷",
  (() => {
    const s = pulsed.series;
    const on = s.filter((x) => x.on), off = s.filter((x) => !x.on);
    const mOn = on.reduce((a, x) => a + x.sheath, 0) / on.length;
    const mOff = off.reduce((a, x) => a + x.sheath, 0) / off.length;
    return mOff < mOn * 0.25;
  })(),
  "off 期平均鞘層不到 on 期的四分之一"
);

console.log("\n【A31 驗收 2:CW 與脈衝的孔底充電行為明顯不同】");
const cwSim = P.simulate({ pulse: false, cycles: 2, arFeature: 8 });
const cs = P.stats(cwSim);
console.log(`    CW    孔底最大 ${cs.vBottomMax.toFixed(2)} V、平均 ${cs.vBottomMean.toFixed(2)} V、最大回落 ${(cs.drawdown * 100).toFixed(1)} %`);
console.log(`    脈衝  孔底最大 ${ps.vBottomMax.toFixed(2)} V、平均 ${ps.vBottomMean.toFixed(2)} V、最大回落 ${(ps.drawdown * 100).toFixed(1)} %`);
ok(
  "CW 是單調累積:充到天花板就停在那裡(回落 < 1 %)",
  cs.drawdown < 0.01,
  `回落 ${(cs.drawdown * 100).toFixed(2)} %`
);
ok(
  "**脈衝每個週期把孔底清掉(回落 > 90 %)**",
  ps.drawdown > 0.9,
  `回落 ${(ps.drawdown * 100).toFixed(1)} %`
);
ok(
  "脈衝的時間平均孔底電位掉到 CW 的四分之一以下",
  ps.vBottomMean < cs.vBottomMean * 0.25,
  `${cs.vBottomMean.toFixed(2)} V → ${ps.vBottomMean.toFixed(2)} V(×${(ps.vBottomMean / cs.vBottomMean).toFixed(3)})`
);
ok(
  "深寬比越高,脈衝的相對效益越大",
  (() => {
    const r = [2, 8, 20].map((ar) => {
      const c = P.stats(P.simulate({ pulse: false, cycles: 2, arFeature: ar }));
      const p = P.stats(P.simulate({ pulse: true, freq: 2000, duty: 0.5, cycles: 4, arFeature: ar }));
      return p.vBottomMean / c.vBottomMean;
    });
    return r[2] < r[0];
  })(),
  [2, 8, 20].map((ar) => {
    const c = P.stats(P.simulate({ pulse: false, cycles: 2, arFeature: ar }));
    const p = P.stats(P.simulate({ pulse: true, freq: 2000, duty: 0.5, cycles: 4, arFeature: ar }));
    return `AR ${ar}→×${(p.vBottomMean / c.vBottomMean).toFixed(2)}`;
  }).join("、")
);

console.log("\n【A31:脈衝頻率的上下限是模型跑出來的,不是抄來的】");
const scan = [100, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000].map((f) => {
  const st = P.stats(P.simulate({ pulse: true, freq: f, duty: 0.5, cycles: 4, arFeature: 8 }));
  return { f, st, dead: st.neMin < cs.neMean * 0.01 };
});
for (const r of scan) {
  console.log(
    `    ${String(r.f).padStart(6)} Hz  off 期 ${((0.5 / r.f) * 1e6).toFixed(0).padStart(6)} µs  孔底平均 ${r.st.vBottomMean.toFixed(2).padStart(6)} V  ` +
      `回落 ${(r.st.drawdown * 100).toFixed(0).padStart(3)} %  n_e 最低 ${r.st.neMin.toExponential(1)}  ${r.dead ? "⚠ 電漿熄滅" : ""}`
  );
}
ok(
  "**下限:頻率太低,off 期太長 → 電漿熄滅**",
  scan.filter((r) => r.f <= 1000).every((r) => r.dead) && !scan.find((r) => r.f === 5000).dead,
  `≤ 1 kHz 時 n_e 掉到 CW 的 1 % 以下`
);
ok(
  "**上限:頻率太高,off 期太短 → 孔底來不及放電**",
  scan.find((r) => r.f === 100000).st.drawdown < 0.2 && scan.find((r) => r.f === 5000).st.drawdown > 0.8,
  `5 kHz 回落 ${(scan.find((r) => r.f === 5000).st.drawdown * 100).toFixed(0)} % → 100 kHz 只剩 ${(scan.find((r) => r.f === 100000).st.drawdown * 100).toFixed(0)} %`
);
ok(
  "所以可用區間落在數 kHz —— 與現場「0.1–10 kHz」的經驗值同一個量級",
  (() => {
    const good = scan.filter((r) => !r.dead && r.st.drawdown > 0.8);
    return good.length >= 2 && good[0].f >= 1000 && good[good.length - 1].f <= 20000;
  })(),
  "兩個限制夾出來的窗:" + scan.filter((r) => !r.dead && r.st.drawdown > 0.8).map((r) => r.f + " Hz").join("、")
);

console.log("\n【A31:三種脈衝模式各自解決不同的問題】");
const modes = ["source", "bias", "sync"].map((m) => ({
  m, st: P.stats(P.simulate({ pulse: true, freq: 2000, duty: 0.5, mode: m, cycles: 4, arFeature: 8 })),
}));
for (const x of modes) {
  console.log(
    `    ${x.m.padEnd(7)} n_e ${x.st.neMean.toExponential(2)}  T_e ${x.st.teMean.toFixed(3)} eV  ` +
      `離子能量平均 ${x.st.ionEnergyMean.toFixed(1)} eV  孔底最大 ${x.st.vBottomMax.toFixed(2)} V`
  );
}
ok(
  "只脈衝 bias:n_e 與 T_e 幾乎不動(與 CW 相同)",
  Math.abs(modes[1].st.neMean / cs.neMean - 1) < 0.02 && Math.abs(modes[1].st.teMean / cs.teMean - 1) < 0.02,
  `n_e ×${(modes[1].st.neMean / cs.neMean).toFixed(3)}、T_e ×${(modes[1].st.teMean / cs.teMean).toFixed(3)}`
);
ok(
  "只脈衝 bias:降得了離子能量,但**降不了孔底充電**(T_e 沒動,天花板就沒動)",
  modes[1].st.ionEnergyMean < cs.ionEnergyMean * 0.7 &&
    Math.abs(modes[1].st.vBottomMax / cs.vBottomMax - 1) < 0.02,
  `離子能量 ${cs.ionEnergyMean.toFixed(0)}→${modes[1].st.ionEnergyMean.toFixed(0)} eV,但孔底仍是 ${modes[1].st.vBottomMax.toFixed(2)} V`
);
ok(
  "只脈衝 source:n_e 與 T_e 都降,孔底跟著降",
  modes[0].st.teMean < cs.teMean * 0.7 && modes[0].st.vBottomMax < cs.vBottomMax * 0.8,
  `T_e ${cs.teMean.toFixed(2)}→${modes[0].st.teMean.toFixed(2)} eV,孔底 ${cs.vBottomMax.toFixed(2)}→${modes[0].st.vBottomMax.toFixed(2)} V`
);
ok(
  "同步脈衝拿到兩邊的好處:低 T_e + 低離子能量",
  modes[2].st.teMean < cs.teMean * 0.7 && modes[2].st.ionEnergyMean < cs.ionEnergyMean * 0.7,
  `T_e ×${(modes[2].st.teMean / cs.teMean).toFixed(2)}、離子能量 ×${(modes[2].st.ionEnergyMean / cs.ionEnergyMean).toFixed(2)}`
);

console.log("\n【A31:相位差改的是離子能量「落在哪裡」,不是「多少」】");
const phases = [0, 0.2, 0.5].map((ph) => ({
  ph, st: P.stats(P.simulate({ pulse: true, freq: 2000, duty: 0.5, mode: "sync", phase: ph, cycles: 4, arFeature: 8 })),
}));
for (const x of phases) {
  console.log(`    相位 ${x.ph.toFixed(2)}  平均離子能量 ${x.st.ionEnergyMean.toFixed(1)} eV  落在後輝光的劑量比例 ${(x.st.afterglowDose * 100).toFixed(1)} %`);
}
ok(
  "**相位差不改變平均離子能量**(偏壓開多久就是多久)",
  Math.abs(phases[2].st.ionEnergyMean / phases[0].st.ionEnergyMean - 1) < 0.01,
  `相位 0 與 0.5 的平均離子能量都是 ${phases[0].st.ionEnergyMean.toFixed(1)} eV`
);
ok(
  "**但它把離子能量整批搬進後輝光** —— 這才是同步脈衝相位差的用途",
  phases[0].st.afterglowDose < 0.1 && phases[2].st.afterglowDose > 0.8,
  `相位 0 → ${(phases[0].st.afterglowDose * 100).toFixed(1)} %;相位 0.5 → ${(phases[2].st.afterglowDose * 100).toFixed(1)} %`
);

console.log("\n【A31:電負性氣體與後輝光的離子-離子電漿】");
const eneg = [0, 0.5, 1].map((e) => {
  const sim = P.simulate({ pulse: true, freq: 2000, duty: 0.5, eneg: e, cycles: 4, arFeature: 8 });
  const on = sim.series.filter((x) => x.on);
  const off = sim.series.filter((x) => !x.on);
  return {
    e,
    aOn: on.reduce((a, x) => a + x.alpha, 0) / on.length,
    aOff: off.reduce((a, x) => a + x.alpha, 0) / off.length,
    st: P.stats(sim),
  };
});
for (const x of eneg) {
  console.log(`    電負性 ${x.e.toFixed(1)}  α(on) ${x.aOn.toFixed(2)}  α(off) ${x.aOff.toFixed(2)}  孔底平均 ${x.st.vBottomMean.toFixed(2)} V`);
}
ok(
  "**後輝光的電負度遠高於輝光期** —— 電子跑得比負離子快,剩下離子-離子電漿",
  eneg[2].aOff > eneg[2].aOn * 3,
  `電負性 1.0:α 從 ${eneg[2].aOn.toFixed(2)}(on)升到 ${eneg[2].aOff.toFixed(2)}(off)`
);
ok(
  "電負度隨氣體電負性單調上升",
  eneg[1].aOff > eneg[0].aOff && eneg[2].aOff > eneg[1].aOff,
  eneg.map((x) => `${x.e}→${x.aOff.toFixed(2)}`).join("、")
);
ok(
  "負離子讓孔底再降一點,但它不是主角(電子已經把大部分中和掉了)",
  eneg[2].st.vBottomMean < eneg[0].st.vBottomMean &&
    eneg[2].st.vBottomMean > eneg[0].st.vBottomMean * 0.8,
  `${eneg[0].st.vBottomMean.toFixed(2)} → ${eneg[2].st.vBottomMean.toFixed(2)} V(只差 ${((1 - eneg[2].st.vBottomMean / eneg[0].st.vBottomMean) * 100).toFixed(0)} %)`
);

console.log("\n【控制項】");
ok(
  "A30 五個滑桿都有標籤與合法範圍",
  Object.values(A.RANGES).every((r) => r.label && r.min < r.max && r.step > 0),
  Object.keys(A.RANGES).join("、")
);
ok(
  "A30 的能量滑桿要能拉到窗外(規格明確要求)",
  A.RANGES.energy.min < A.E_TH_MOD && A.RANGES.energy.max > A.E_TH_SUB * 2,
  `${A.RANGES.energy.min}–${A.RANGES.energy.max} eV,窗是 ${A.E_TH_MOD}–${A.E_TH_SUB}`
);
ok(
  "A31 七個滑桿與三種模式都有標籤與合法範圍",
  Object.values(P.RANGES).every((r) => r.label && r.min < r.max && r.step > 0) &&
    Object.values(P.MODES).every((m) => m.label && m.note),
  Object.keys(P.RANGES).join("、")
);
ok(
  "A31 的頻率滑桿涵蓋現場的 0.1–10 kHz",
  Math.pow(10, P.RANGES.freqLog.min) <= 100 && Math.pow(10, P.RANGES.freqLog.max) >= 10000,
  `10^${P.RANGES.freqLog.min}–10^${P.RANGES.freqLog.max} Hz`
);

console.log(`\n${fail === 0 ? "✓" : "✗"} 先進技術(ALE + 脈衝電漿)通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
