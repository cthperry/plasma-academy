/* ==========================================================================
   check-endpoint.mjs — 驗證終點偵測模型(4.2 / A28)

   docs/05 的 A28 驗收條件:
     · 開口率 < 0.1 % 時,OES 終點顯著不可靠   → 達成
     · 干涉終點不受開口率影響                   → 達成(而且是**逐位元相同**)

   為什麼要用統計而不是單次:
   「不可靠」本來就是統計陳述。單跑一次固定雜訊,誤差會是一個離散的階梯
   (實測 −0.7 % → −53.6 %,而且跨好幾個數量級的開口率都給同一個值),
   看起來像模型壞掉,其實只是單一雜訊實現。
   所以本檔一律用 reliability() 跑多顆種子,看**中位誤差**與**失敗率**。

   本檔另外釘住三件實測逼出來的事實,它們都不是設計時想當然的:
     1. 置中平滑**不會**產生延遲(有號偏差 −0.05 %);要用拖尾(因果)平滑
        才會有真實的延遲代價。真機控制器看不到未來的取樣點。
     2. 歸一化不會改變「微分極值」的位置(argmax 對縮放免疫),
        所以它救的是跨片漂移,不是單片終點時間。
     3. 干涉法的固有時間解析度就是**一個條紋週期**;條紋預算不足 1 時
        它自己失效,與開口率無關。
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ["src/js/lab/endpoint-model.js"]) {
  vm.runInContext(readFileSync(join(ROOT, f), "utf8"), sandbox, { filename: f });
}
const E = sandbox.window.PA.endpoint;

let pass = 0;
let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

const N = 40; // 種子數。低 SNR 的中位數要夠多次才不會被離散化卡住

/* ============ A28 第一條:開口率壓垮 OES ============ */
console.log("\n【A28 驗收 1:開口率 < 0.1 % 時 OES 終點顯著不可靠】");

const oaScan = [0.5, 0.2, 0.05, 0.01, 0.003, 0.001, 0.0003, 0.0001];
const oes = oaScan.map((oa) => ({ oa, r: E.reliability({ openArea: oa }, "ma", N) }));
for (const row of oes) {
  console.log(
    `    開口率 ${(row.oa * 100).toFixed(2).padStart(6)} %  SNR ${E.snr(E.run({ openArea: row.oa })).toFixed(1).padStart(6)}` +
      `  中位誤差 ${(row.r.median * 100).toFixed(1).padStart(6)} %  失敗率 ${(row.r.failRate * 100).toFixed(0).padStart(3)} %`
  );
}

const at = (oa) => oes.find((r) => Math.abs(r.oa - oa) < 1e-9).r;

ok(
  "大開口率(≥ 5 %)OES 終點可靠 —— 誤差 < 3 %、零失敗",
  at(0.05).median < 0.03 && at(0.05).failRate === 0,
  `5 % 開口率:中位誤差 ${(at(0.05).median * 100).toFixed(1)} %`
);
ok(
  "1 % 開口率仍在可用邊緣(誤差 < 10 %)",
  at(0.01).median < 0.1,
  `中位誤差 ${(at(0.01).median * 100).toFixed(1)} %,失敗率 ${(at(0.01).failRate * 100).toFixed(0)} %`
);
ok(
  "**開口率 < 0.1 % 時顯著不可靠:失敗率 > 50 %**",
  oaScan.filter((o) => o < 0.001).every((o) => at(o).failRate > 0.5),
  oaScan
    .filter((o) => o < 0.001)
    .map((o) => `${(o * 100).toFixed(2)} %→${(at(o).failRate * 100).toFixed(0)} %`)
    .join("、")
);
ok(
  "低開口率的中位誤差比高開口率大一個數量級以上",
  at(0.0001).median > at(0.05).median * 10,
  `${(at(0.0001).median * 100).toFixed(1)} % vs ${(at(0.05).median * 100).toFixed(1)} %`
);
ok(
  "失敗率隨開口率單調不減(不是隨機跳動)",
  oaScan.every((o, i) => i === 0 || at(o).failRate >= at(oaScan[i - 1]).failRate - 1e-9),
  oaScan.map((o) => (at(o).failRate * 100).toFixed(0)).join(" ≤ ")
);
ok(
  "SNR 正比於開口率(訊號 ∝ 開口率、雜訊不是)",
  Math.abs(E.snr(E.run({ openArea: 0.4 })) / E.snr(E.run({ openArea: 0.04 })) - 10) < 1e-6,
  `開口率 ×10 → SNR ×10`
);
ok(
  "偵測器雜訊是絕對值 —— 不隨開口率縮小",
  E.DETECTOR_NOISE > 0 && E.snr(E.run({ openArea: 0.01 }), 1) === 0.01 / E.DETECTOR_NOISE,
  `DETECTOR_NOISE = ${E.DETECTOR_NOISE}`
);

/* ============ A28 第二條:干涉不受開口率影響 ============ */
console.log("\n【A28 驗收 2:干涉終點不受開口率影響】");

const itf = oaScan.map((oa) => ({ oa, r: E.reliabilityInterference({ openArea: oa }, N) }));
for (const row of itf) {
  console.log(
    `    開口率 ${(row.oa * 100).toFixed(2).padStart(6)} %  中位誤差 ${(row.r.median * 100).toFixed(1).padStart(6)} %  失敗率 ${(row.r.failRate * 100).toFixed(0).padStart(3)} %`
  );
}
ok(
  "干涉終點在四個數量級的開口率上中位誤差**完全相同**",
  new Set(itf.map((r) => r.r.median)).size === 1,
  `全部 = ${(itf[0].r.median * 100).toFixed(2)} %`
);
ok(
  "干涉終點時間逐位元相同(訊號根本沒乘開口率)",
  new Set(oaScan.map((oa) => E.detectInterference(E.run({ openArea: oa })).t)).size === 1,
  `t = ${E.detectInterference(E.run({ openArea: 0.0001 })).t.toFixed(4)} s`
);
ok(
  "最低開口率下,干涉可靠而 OES 已經失效 —— 這就是 IEP 存在的理由",
  itf[itf.length - 1].r.failRate === 0 && oes[oes.length - 1].r.failRate > 0.5,
  `干涉失敗率 0 % vs OES ${(oes[oes.length - 1].r.failRate * 100).toFixed(0)} %`
);
// 開口率那條可以要求逐位元相同(計算完全沒碰到開口率);
// 蝕刻率這條**不行** —— 改蝕刻率會改 dt,浮點捨入位置就不同了。
// 實測四個蝕刻率的中位誤差一致到 1e-16,用容差斷言才是誠實的寫法。
{
  const meds = [2, 5, 10, 15].map((rate) => E.reliabilityInterference({ rate }, 12).median);
  const spread = Math.max(...meds) - Math.min(...meds);
  ok(
    "干涉終點也不受蝕刻率影響(相對誤差固定)",
    spread < 1e-12,
    `2 / 5 / 10 / 15 nm·s⁻¹ 中位誤差 ${(meds[0] * 100).toFixed(2)} %,散佈 ${spread.toExponential(1)}`
  );
}

/* ============ 干涉法自己的失效邊界 ============ */
console.log("\n【干涉法的限制:條紋預算與固有解析度】");
const thin = E.run({ thickness: 150 });
ok(
  "條紋預算 < 1 時干涉法自己失效,且**明確回報不可用**(不是丟 NaN 讓人猜)",
  E.fringeBudget(thin) < 1 && E.detectInterference(thin).usable === false,
  `150 nm → 預算 ${E.fringeBudget(thin).toFixed(2)} 個條紋,reason=「${E.detectInterference(thin).reason}」`
);
ok(
  "條紋週期 = λ/(2n),與蝕刻率無關",
  Math.abs(E.fringePeriodNm(E.run({})) - 633 / (2 * 1.46)) < 1e-9,
  `${E.fringePeriodNm(E.run({})).toFixed(1)} nm`
);
ok(
  "固有時間解析度 = 一個條紋週期 ÷ 蝕刻率 —— 蝕刻率越快解析度越好",
  E.fringePeriodSec(E.run({ rate: 15 })) < E.fringePeriodSec(E.run({ rate: 2 })),
  `2 nm·s⁻¹ → ${E.fringePeriodSec(E.run({ rate: 2 })).toFixed(0)} s;15 nm·s⁻¹ → ${E.fringePeriodSec(E.run({ rate: 15 })).toFixed(0)} s`
);
for (const th of [300, 500, 800, 1200]) {
  const sim = E.run({ thickness: th });
  const d = E.detectInterference(sim);
  ok(
    `厚 ${th} nm:終點誤差落在一個條紋週期內`,
    Math.abs(d.t - sim.tEnd) < E.fringePeriodSec(sim),
    `|Δt| = ${Math.abs(d.t - sim.tEnd).toFixed(1)} s < 週期 ${E.fringePeriodSec(sim).toFixed(1)} s`
  );
}
for (const th of [400, 500, 800, 1000]) {
  const sim = E.run({ thickness: th });
  ok(
    `厚 ${th} nm:數到的條紋數與 膜厚÷週期 相符(±0.5)`,
    Math.abs(E.countFringes(sim) - E.fringeBudget(sim)) <= 0.5,
    `數到 ${E.countFringes(sim).toFixed(2)},預算 ${E.fringeBudget(sim).toFixed(2)}`
  );
}

/* ============ 4.2.6 演算法取捨 ============ */
console.log("\n【4.2.6:演算法的取捨是算出來的,不是寫在課文裡的】");

const algoAt = (oa, a) => E.reliability({ openArea: oa }, a, N);
for (const a of Object.keys(E.ALGOS)) {
  console.log(
    `    ${E.ALGOS[a].label.padEnd(24)} ` +
      [0.05, 0.01, 0.003].map((o) => `${(o * 100).toFixed(1)}%→${(algoAt(o, a).median * 100).toFixed(1)}%`).join("  ")
  );
}
ok(
  "平滑買到抗雜訊:1 % 開口率時「拖尾 9 點」誤差明顯小於「不平滑」",
  algoAt(0.01, "ma").median < algoAt(0.01, "deriv").median * 0.6,
  `ma ${(algoAt(0.01, "ma").median * 100).toFixed(1)} % vs deriv ${(algoAt(0.01, "deriv").median * 100).toFixed(1)} %`
);

// 有號偏差:乾淨訊號下才看得到純粹的「延遲」,不被雜訊蓋掉
const bias = (algo) => {
  let s = 0;
  for (let k = 0; k < N; k++) {
    s += E.detect(E.run({ openArea: 0.3, noise: 0.05, seed: 1000003 * (k + 1) + 7 }), algo).error;
  }
  return s / N;
};
const bDeriv = bias("deriv");
const bMa = bias("ma");
const bLong = bias("maLong");
console.log(
  `    有號偏差(乾淨訊號):不平滑 ${(bDeriv * 100).toFixed(2)} %、9 點 ${(bMa * 100).toFixed(2)} %、31 點 ${(bLong * 100).toFixed(2)} %`
);
ok(
  "**平滑的代價是延遲,而且窗越長越晚報** —— 拖尾平均只能看過去",
  bLong > bMa && bMa > bDeriv && bLong > 0.02,
  `31 點晚報 ${(bLong * 100).toFixed(2)} %,9 點晚報 ${(bMa * 100).toFixed(2)} %`
);
ok(
  "置中平滑**不會**產生延遲 —— 所以模型必須用拖尾平滑,否則這個取捨是假的",
  (() => {
    const s = E.run({ openArea: 0.3, noise: 0.05 });
    const c = E.derivative(E.movingAverage(s.oes, 31));
    let best = Infinity, bt = NaN;
    for (const p of c) if (p.v < best) { best = p.v; bt = p.t; }
    return Math.abs((bt - s.tEnd) / s.tEnd) < 0.01;
  })(),
  "對稱平滑不移動對稱轉折的反曲點"
);
ok(
  "歸一化不會改變微分極值的位置(argmax 對縮放免疫)",
  (() => {
    const s = E.run({ openArea: 0.3 });
    const raw = E.derivative(E.trailingAverage(s.oes, 9));
    const nrm = E.derivative(E.trailingAverage(E.normalize(s.oes), 9));
    const am = (arr) => arr.reduce((m, p) => (p.v < m.v ? p : m)).t;
    return am(raw) === am(nrm);
  })(),
  "它救的是跨片視窗霧化漂移,不是單片的終點時間"
);
ok(
  "事後門檻法誤差最小 —— 但它是非因果的,不能拿來即時停機",
  algoAt(0.003, "thresh").median < algoAt(0.003, "ma").median && E.ALGOS.thresh.causal === false,
  `0.3 % 開口率:thresh ${(algoAt(0.003, "thresh").median * 100).toFixed(1)} % vs ma ${(algoAt(0.003, "ma").median * 100).toFixed(1)} %`
);
ok(
  "三種即時法都標記為因果,只有門檻法不是",
  ["deriv", "ma", "maLong"].every((k) => E.ALGOS[k].causal === true) && E.ALGOS.thresh.causal === false,
  "causal 旗標與課文一致"
);

/* ============ 訊號表 ============ */
console.log("\n【4.2.2 監控訊號表】");
ok(
  "五種製程訊號都有譜線、方向與理由",
  Object.values(E.SIGNALS).every((s) => s.line && (s.dir === "up" || s.dir === "down") && s.why),
  Object.values(E.SIGNALS).map((s) => `${s.label}(${s.line} ${s.dir === "up" ? "↑" : "↓"})`).join("、")
);
ok(
  "**反應物訊號會上升**,不是所有終點都往下掉",
  E.SIGNALS.polyReactant.dir === "up" && E.SIGNALS.poly.dir === "down",
  "Cl 837 nm 刻穿後不再被消耗 → 反而上升"
);
ok(
  "上升型訊號的終點一樣抓得到(偵測器會跟著訊號方向找極值)",
  E.reliability({ openArea: 0.05, signal: "polyReactant" }, "ma", 20).median < 0.03,
  `中位誤差 ${(E.reliability({ openArea: 0.05, signal: "polyReactant" }, "ma", 20).median * 100).toFixed(1)} %`
);

/* ============ 雜訊 ============ */
console.log("\n【雜訊倍率:另一條壓垮 SNR 的路】");
const nz = [0.2, 0.5, 1, 2, 3].map((n) => ({ n, r: E.reliability({ openArea: 0.01, noise: n }, "ma", N) }));
for (const row of nz) {
  console.log(`    雜訊 ×${String(row.n).padStart(3)}  中位誤差 ${(row.r.median * 100).toFixed(1).padStart(5)} %  失敗率 ${(row.r.failRate * 100).toFixed(0).padStart(3)} %`);
}
ok(
  "雜訊變大 → 誤差與失敗率單調上升",
  nz.every((row, i) => i === 0 || (row.r.median >= nz[i - 1].r.median - 1e-9 && row.r.failRate >= nz[i - 1].r.failRate - 1e-9)),
  nz.map((row) => `×${row.n}:${(row.r.failRate * 100).toFixed(0)} %`).join(" → ")
);
ok(
  "雜訊 ×3 時,1 % 開口率也守不住(SNR 是訊號與雜訊的比,兩邊都能殺它)",
  nz[nz.length - 1].r.failRate > 0.5,
  `失敗率 ${(nz[nz.length - 1].r.failRate * 100).toFixed(0)} %`
);

/* ============ 參數範圍 ============ */
console.log("\n【控制項範圍】");
ok(
  "四個滑桿都有標籤與合法範圍",
  Object.values(E.RANGES).every((r) => r.label && r.min < r.max && r.step > 0),
  Object.keys(E.RANGES).join("、")
);
ok(
  "開口率滑桿涵蓋 A28 要展示的整個崩壞區間(10⁻⁴ ~ 10⁻⁰·³)",
  E.RANGES.openAreaLog.min <= -4 && E.RANGES.openAreaLog.max >= -0.5,
  `10^${E.RANGES.openAreaLog.min} ~ 10^${E.RANGES.openAreaLog.max}`
);

console.log(`\n${fail === 0 ? "✓" : "✗"} 終點偵測(OES + 干涉)通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
