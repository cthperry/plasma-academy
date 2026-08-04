/* ==========================================================================
   check-charging.mjs — 驗證電漿誘發充電損傷模型(4.3 / A29)

   docs/05 的 A29 驗收條件:
     · 脈衝模式下閘極電位不再單調累積        → 達成
     · 天線比與閘極電位近似線性關係          → **不成立,而且原規格說反了**

   ⚠️ 第二條是實作推翻掉的,不是做不到 —— 是**線性關係掛錯了對象**。
   實測 log-log 斜率(天線比 10 → 3000,跨 2.5 個數量級):

       閘極電位 V      斜率 0.078   ← 幾乎是平的
       注入電荷 q      斜率 0.979   ← **這才是線性的那一個**
       到崩潰時間 t_bd 斜率 −0.979

   物理上必然如此:電位由電子遮蔽的**電位天花板**(T_e 與結構深寬比)決定,
   而氧化層導通對電壓是指數的,所以分壓器把電位鎖在一個很窄的範圍裡;
   天線比改變的是**單位閘極面積要吞多少電流**,那是劑量,不是電位。

   這件事不是學術細節。它直接推翻現場一個很常見的推理:
   「天線比翻十倍,量到的閘極電位只多了 10 %,應該還好吧?」——
   電位確實只多 10 %,但**損傷劑量剛好翻十倍**。所以設計規則
   才會寫成面積比的上限,而不是寫成電位的上限。

   本檔因此**照實驗證正確的那條關係**,並把原規格的錯誤釘成一條反向斷言:
   若哪天模型真的跑出「電位與天線比線性」,這支測試會亮紅燈。
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ["src/js/lab/charging-model.js"]) {
  vm.runInContext(readFileSync(join(ROOT, f), "utf8"), sandbox, { filename: f });
}
const M = sandbox.window.PA.charging;

let pass = 0;
let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

const BASE = { arFeature: 5, shaded: 1, te: 3, tox: 3, stepTime: 60, ne: 1e17 };
const at = (over) => M.damage(Object.assign({}, BASE, over));

/* ============ 電子遮蔽:整條因果鏈的起點 ============ */
console.log("\n【電子遮蔽:離子直、電子散,所以孔底收不到電子】");

ok(
  "幾何穿透率 = 1/(1+AR²) —— 深寬比 5 的孔底只收得到 3.8 % 的電子",
  Math.abs(M.transmission(5) - 1 / 26) < 1e-12,
  `AR 1 → ${(M.transmission(1) * 100).toFixed(1)} %、AR 5 → ${(M.transmission(5) * 100).toFixed(2)} %、AR 10 → ${(M.transmission(10) * 100).toFixed(2)} %`
);
ok(
  "穿透率隨深寬比單調下降",
  [1, 2, 3, 5, 8, 10, 15, 20].every((a, i, arr) => i === 0 || M.transmission(a) < M.transmission(arr[i - 1])),
  "AR ↑ → 電子越進不去"
);

const cel = (over) => M.ceiling(Object.assign({}, BASE, over));
console.log("\n【充電電位上限 V_ceiling = −T_e · ln(有效電子收集係數)】");
for (const ar of [1, 2, 3, 5, 8, 10, 12, 15]) {
  const c = cel({ arFeature: ar });
  console.log(`    AR ${String(ar).padStart(3)}  上限 ${c.unbounded ? "無上限(電漿補不回離子)" : c.v.toFixed(2) + " V"}`);
}
ok(
  "上限隨結構深寬比單調上升",
  [1, 2, 3, 5, 8, 10].every((a, i, arr) => i === 0 || cel({ arFeature: a }).v > cel({ arFeature: arr[i - 1] }).v),
  `AR 1 → ${cel({ arFeature: 1 }).v.toFixed(2)} V,AR 10 → ${cel({ arFeature: 10 }).v.toFixed(2)} V`
);
ok(
  "**上限正比於 T_e** —— 這是「低 T_e 電漿源」能減損傷的原因",
  (() => {
    const a = cel({ te: 2 }).v, b = cel({ te: 4 }).v;
    return Math.abs(b / a - 2) < 1e-9;
  })(),
  `T_e 2 eV → ${cel({ te: 2 }).v.toFixed(2)} V,4 eV → ${cel({ te: 4 }).v.toFixed(2)} V(剛好兩倍)`
);
ok(
  "深寬比夠高時電漿端**沒有**上限 —— 充到電漿電位電子仍補不回離子",
  cel({ arFeature: 10 }).unbounded === false && cel({ arFeature: 15 }).unbounded === true,
  `轉折在 AR ≈ 11(全遮蔽、eff < J_i/J_e,sat ≈ 1/${(1 / cel({}).ratio).toFixed(0)})`
);
ok(
  "只有部分面積被遮蔽時,沒被遮的部分會把電位拉回去",
  cel({ shaded: 0.2 }).v < cel({ shaded: 1 }).v / 5,
  `遮蔽 100 % → ${cel({ shaded: 1 }).v.toFixed(2)} V,遮蔽 20 % → ${cel({ shaded: 0.2 }).v.toFixed(2)} V`
);

/* ============ A29 驗收 1:脈衝 ============ */
console.log("\n【A29 驗收 1:脈衝模式下閘極電位不再單調累積】");

const cw = at({ antennaRatio: 300 });
const pulses = [0.2, 0.5, 0.8].map((duty) => ({
  duty,
  d: at({ antennaRatio: 300, pulse: true, duty, freq: 5000 }),
}));
console.log(`    CW           最大回落 ${(M.drawdown(cw.steady.series) * 100).toFixed(1)} %  V_max ${cw.steady.vMax.toFixed(3)}  V_mean ${cw.steady.vMean.toFixed(3)}`);
for (const p of pulses) {
  console.log(
    `    脈衝 duty ${String(Math.round(p.duty * 100)).padStart(2)} %  最大回落 ${(M.drawdown(p.d.steady.series) * 100).toFixed(1)} %  ` +
      `V_max ${p.d.steady.vMax.toFixed(3)}  V_mean ${p.d.steady.vMean.toFixed(3)}`
  );
}
ok(
  "CW 是單調累積型:衝到天花板就一直待在那裡(最大回落 < 1 %)",
  M.drawdown(cw.steady.series) < 0.01,
  `最大回落 ${(M.drawdown(cw.steady.series) * 100).toFixed(2)} %`
);
ok(
  "**脈衝模式下電位每個週期都被打下來(最大回落 > 50 %)**",
  pulses.every((p) => M.drawdown(p.d.steady.series) > 0.5),
  pulses.map((p) => `duty ${Math.round(p.duty * 100)} %→${(M.drawdown(p.d.steady.series) * 100).toFixed(0)} %`).join("、")
);
ok(
  "脈衝的時間平均電位顯著低於 CW,且隨 duty 上升",
  pulses.every((p) => p.d.steady.vMean < cw.steady.vMean) &&
    pulses[0].d.steady.vMean < pulses[1].d.steady.vMean &&
    pulses[1].d.steady.vMean < pulses[2].d.steady.vMean,
  `CW ${cw.steady.vMean.toFixed(2)} V → duty 20 % 只剩 ${pulses[0].d.steady.vMean.toFixed(2)} V`
);
ok(
  "**損傷劑量幾乎正比於 duty** —— off 期完全不貢獻",
  [0.1, 0.3, 0.5, 0.7, 0.9].every((duty) => {
    const r = at({ antennaRatio: 300, pulse: true, duty, freq: 5000 }).margin / cw.margin;
    return Math.abs(r - duty) < 0.03;
  }),
  [0.1, 0.5, 0.9]
    .map((duty) => `duty ${duty}→${(at({ antennaRatio: 300, pulse: true, duty, freq: 5000 }).margin / cw.margin).toFixed(3)}`)
    .join("、")
);
ok(
  "⚠️ 但脈衝**不會降低尖峰電位** —— 硬崩潰是場強判準,脈衝救不了",
  pulses.every((p) => Math.abs(p.d.steady.vMax / cw.steady.vMax - 1) < 0.01),
  `CW ${cw.steady.vMax.toFixed(3)} V,三種 duty 的 V_max 都在 1 % 以內(${pulses.map((p) => p.d.steady.vMax.toFixed(3)).join("、")})`
);

/* ============ A29 驗收 2:天線比 ============ */
console.log("\n【A29 驗收 2(原規格說「天線比與閘極電位近似線性」)】");

const ratios = [10, 30, 100, 300, 1000, 3000];
const sweep = ratios.map((r) => ({ r, d: at({ antennaRatio: r }) }));
console.log("    天線比      V (V)     E MV/cm    注入電荷 C/cm²   劑量 q/Q_bd    到崩潰 s");
for (const x of sweep) {
  console.log(
    `    ${String(x.r).padStart(5)}  ${x.d.steady.vMax.toFixed(3).padStart(9)}  ${x.d.eMaxMVcm.toFixed(2).padStart(9)}  ` +
      `${x.d.qInj.toExponential(3).padStart(15)}  ${x.d.margin.toExponential(2).padStart(11)}  ${(isFinite(x.d.tBd) ? x.d.tBd.toExponential(2) : "∞").padStart(10)}`
  );
}

const span = Math.log(3000 / 10);
const slopeV = Math.log(sweep[5].d.steady.vMax / sweep[0].d.steady.vMax) / span;
const slopeQ = Math.log(sweep[5].d.qInj / sweep[0].d.qInj) / span;
const slopeT = Math.log(sweep[5].d.tBd / sweep[0].d.tBd) / span;
console.log(`    log-log 斜率:電位 ${slopeV.toFixed(3)}、注入電荷 ${slopeQ.toFixed(3)}、到崩潰 ${slopeT.toFixed(3)}`);

ok(
  "**注入電荷正比於天線比**(log-log 斜率 ≈ 1)",
  Math.abs(slopeQ - 1) < 0.05,
  `斜率 ${slopeQ.toFixed(3)}:天線比 ×300 → 劑量 ×${(sweep[5].d.qInj / sweep[0].d.qInj).toFixed(0)}`
);
ok(
  "**到崩潰時間反比於天線比**(斜率 ≈ −1)—— 設計規則寫成面積比上限的理由",
  Math.abs(slopeT + 1) < 0.05,
  `斜率 ${slopeT.toFixed(3)}`
);
ok(
  "**原規格的「天線比 ↔ 閘極電位近似線性」不成立**:電位的斜率只有 0.08,比劑量小一個數量級",
  slopeV < 0.15 && slopeQ / slopeV > 8,
  `電位斜率 ${slopeV.toFixed(3)} vs 劑量斜率 ${slopeQ.toFixed(3)}(差 ${(slopeQ / slopeV).toFixed(0)} 倍)`
);
ok(
  "具體地說:天線比 ×10,電位只多約 10 %,劑量剛好 ×10",
  (() => {
    const a = at({ antennaRatio: 100 });
    const b = at({ antennaRatio: 1000 });
    return b.steady.vMax / a.steady.vMax < 1.3 && Math.abs(b.qInj / a.qInj - 10) < 1.5;
  })(),
  `100→1000:電位 ×${(at({ antennaRatio: 1000 }).steady.vMax / at({ antennaRatio: 100 }).steady.vMax).toFixed(3)}、劑量 ×${(at({ antennaRatio: 1000 }).qInj / at({ antennaRatio: 100 }).qInj).toFixed(2)}`
);
ok(
  "電位仍隨天線比單調上升(分壓器方向正確,只是很鈍)",
  sweep.every((x, i) => i === 0 || x.d.steady.vMax > sweep[i - 1].d.steady.vMax),
  sweep.map((x) => x.d.steady.vMax.toFixed(2)).join(" < ")
);

/* ============ 分壓器機制本身 ============ */
console.log("\n【分壓器:天線比之所以能生效,靠的是氧化層自己的漏電】");
ok(
  "氧化層漏電擬合公開的 t_ox 標度(1 V 下每 nm 約四個數量級)",
  (() => {
    const j = (t) => M.dtCurrent(1, t);
    return Math.abs(Math.log10(j(2) / j(3)) - 4) < 0.1 && Math.abs(Math.log10(j(1.5) / j(2.5)) - 4) < 0.1;
  })(),
  [1.5, 2, 2.5, 3].map((t) => `${t} nm→${M.dtCurrent(1, t).toExponential(0)}`).join("、") + " A/cm²"
);
ok(
  "厚氧化層改由 FN 主導(漏電項在那裡已經完全可忽略)",
  M.fnCurrent(14, 10) > M.dtCurrent(14, 10) && M.dtCurrent(1, 3) > M.fnCurrent(1, 3),
  "薄/低壓 → 直接穿隧;厚/高場 → FN"
);
ok(
  "**沒有漏電就沒有天線效應**:把氧化層電流歸零,電位完全由電漿釘住",
  (() => {
    // 直接檢驗機制:電漿導納 ∝ 天線面積,驅動也 ∝ 天線面積,兩邊對消
    const g = (V, r) => M.plasmaCurrent(V, Object.assign({}, BASE), 3) * r;
    const v = cel({}).v;
    return Math.abs(g(v, 10)) < 1e-9 && Math.abs(g(v, 3000)) < 1e-9;
  })(),
  "在電位天花板上,任何天線比的淨電漿電流都是 0"
);

/* ============ 氧化層厚度:非單調的脆弱區 ============ */
console.log("\n【氧化層厚度:最危險的**不是**最薄的那一個】");
const toxScan = [1.5, 2, 2.5, 3, 4, 5, 7, 10].map((t) => ({ t, d: at({ tox: t, antennaRatio: 300 }) }));
for (const x of toxScan) {
  console.log(
    `    t_ox ${String(x.t).padStart(4)} nm  V ${x.d.steady.vMax.toFixed(3).padStart(7)}  E ${x.d.eMaxMVcm.toFixed(2).padStart(6)} MV/cm  ` +
      `Q_bd ${x.d.qBd.toExponential(0).padStart(8)}  劑量 ${x.d.margin.toExponential(2).padStart(10)}  ` +
      `${x.d.hardBreak ? "硬崩潰" : x.d.wearOut ? "磨耗失效" : "存活"}`
  );
}
ok(
  "薄氧化層(1.5 nm)的電位被自己的漏電壓住 —— 場強遠低於天花板換算值",
  at({ tox: 1.5, antennaRatio: 300 }).eMaxMVcm < 6,
  `V 只有 ${at({ tox: 1.5, antennaRatio: 300 }).steady.vMax.toFixed(2)} V,而天花板是 ${cel({}).v.toFixed(2)} V`
);
ok(
  "厚氧化層(10 nm)吃下整個天花板電位,但除以厚度之後場強反而安全",
  Math.abs(at({ tox: 10, antennaRatio: 300 }).steady.vMax - cel({}).v) < 0.05 &&
    at({ tox: 10, antennaRatio: 300 }).eMaxMVcm < 10,
  `V ${at({ tox: 10, antennaRatio: 300 }).steady.vMax.toFixed(2)} V = 天花板,但 E 只有 ${at({ tox: 10, antennaRatio: 300 }).eMaxMVcm.toFixed(2)} MV/cm`
);
ok(
  "**最脆弱的是中間厚度(4–5 nm)** —— 電位夠高、厚度又不夠稀釋,兩頭都不討好",
  toxScan.filter((x) => x.d.hardBreak).every((x) => x.t >= 4 && x.t <= 5) &&
    toxScan.some((x) => x.d.hardBreak),
  "硬崩潰只發生在 " + toxScan.filter((x) => x.d.hardBreak).map((x) => x.t + " nm").join("、")
);
ok(
  "Q_bd 隨 t_ox 變薄而急遽上升(每薄 0.5 nm 約一個數量級)—— 少了這一項會得到與現場相反的結論",
  Math.abs(Math.log10(M.qBd(2) / M.qBd(3)) - 2) < 1e-9 && M.qBd(5) === M.qBd(10),
  `1.5 nm ${M.qBd(1.5).toExponential(0)}、3 nm ${M.qBd(3).toExponential(0)}、≥4 nm ${M.qBd(10).toExponential(0)} C/cm²`
);

/* ============ 對策 ============ */
console.log("\n【對策比較:同一組條件下,誰真的有效】");
const guard = [
  ["無對策 CW", {}],
  ["脈衝 duty 20 %", { pulse: true, duty: 0.2, freq: 5000 }],
  ["低 T_e 電漿(1.5 eV)", { te: 1.5 }],
  ["天線二極體", { diode: true }],
  ["把遮蔽比例降到 20 %", { shaded: 0.2 }],
];
const doses = guard.map(([name, over]) => {
  const d = at(Object.assign({ antennaRatio: 300 }, over));
  console.log(
    `    ${name.padEnd(22)} V_max ${d.steady.vMax.toFixed(3).padStart(7)}  E ${d.eMaxMVcm.toFixed(2).padStart(6)} MV/cm  劑量 ${d.margin.toExponential(2).padStart(10)}`
  );
  return { name, d };
});
const cwDose = doses[0].d.margin;
ok(
  "五種對策全部有效(劑量都低於無對策)",
  doses.slice(1).every((x) => x.d.margin < cwDose),
  doses.slice(1).map((x) => `${x.name} ×${(x.d.margin / cwDose).toExponential(1)}`).join("、")
);
ok(
  "**天線二極體最有效** —— 它把電位直接箝在二極體導通電壓,劑量掉將近六個數量級",
  doses[3].d.margin < cwDose * 1e-5 && doses[3].d.steady.vMax < 1 &&
    doses.every((x) => x.d.margin >= doses[3].d.margin),
  `V 被箝在 ${doses[3].d.steady.vMax.toFixed(2)} V,劑量 ×${(doses[3].d.margin / cwDose).toExponential(1)}`
);
ok(
  "降低被遮蔽面積比例同樣強效 —— 因為它動的是**天花板本身**,不是下游",
  doses[4].d.margin < cwDose * 1e-5,
  `劑量 ×${(doses[4].d.margin / cwDose).toExponential(1)}`
);
ok(
  "脈衝的效果比二極體弱得多,但它是**製程端唯一不用改版圖的手段**",
  doses[1].d.margin > doses[3].d.margin && doses[1].d.margin < cwDose * 0.3,
  `脈衝 ×${(doses[1].d.margin / cwDose).toFixed(2)} vs 二極體 ×${(doses[3].d.margin / cwDose).toExponential(1)}`
);
ok(
  "低 T_e 有效,但只有 T_e 的一次方效果(上限 ∝ T_e)",
  doses[2].d.margin < cwDose && doses[2].d.margin > cwDose * 0.05,
  `T_e 3→1.5 eV:劑量 ×${(doses[2].d.margin / cwDose).toFixed(3)}`
);

/* ============ 控制項 ============ */
console.log("\n【控制項與資料表】");
ok(
  "七個滑桿都有標籤與合法範圍",
  Object.values(M.RANGES).every((r) => r.label && r.min < r.max && r.step > 0),
  Object.keys(M.RANGES).join("、")
);
ok(
  "天線比滑桿涵蓋業界設計規則的整個範圍(10⁰·⁵ ~ 10³·⁵)",
  M.RANGES.antennaRatioLog.min <= 0.5 && M.RANGES.antennaRatioLog.max >= 3,
  `10^${M.RANGES.antennaRatioLog.min} ~ 10^${M.RANGES.antennaRatioLog.max}`
);
ok(
  "兩種電漿模式都有說明",
  Object.values(M.MODES).every((m) => m.label && m.note),
  Object.values(M.MODES).map((m) => m.label).join("、")
);

console.log(`\n${fail === 0 ? "✓" : "✗"} 充電損傷(電子遮蔽 + 天線效應)通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
