import {
  bestCf4Fraction,
  evaluatePcbProcess,
  glassRemovalRate,
  resinRemovalRate
} from "../src/assets/js/pcb-model.js";
import { buildPcbVisualizationLayout, pcbDepthMessage } from "../src/assets/js/labs/a34-pcb-desmear.js";

const failures = [];
let checks = 0;

function assert(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `：${detail}` : ""}`);
}

function approximately(actual, expected, tolerance = 0.06) {
  return Math.abs(actual - expected) <= tolerance;
}

const reference = { powerW: 300, pressureTorr: 0.4, timeMinutes: 15, targetMode: "desmear" };
const rows = [
  [0, 4.5, 0.0],
  [10, 4.7, 2.4],
  [20, 4.8, 4.8],
  [30, 4.7, 7.2],
  [50, 4.1, 12.0]
];

assert("純 O2 的玻璃去除必須為零", glassRemovalRate(0, 300, 0.4) === 0);
assert("功率必須影響樹脂去除", resinRemovalRate(20, 450, 0.4) > resinRemovalRate(20, 150, 0.4));
assert("壓力必須影響玻璃去除", glassRemovalRate(20, 300, 0.8) > glassRemovalRate(20, 300, 0.2));

const resinRates = Array.from({ length: 81 }, (_, cf4Percent) => resinRemovalRate(cf4Percent, 300, 0.4));
const peakCf4 = resinRates.indexOf(Math.max(...resinRates));
assert("樹脂速率峰值必須在 10-25% CF4", peakCf4 >= 10 && peakCf4 <= 25, `目前 ${peakCf4}%`);
assert("80% CF4 的樹脂速率必須低於 20%", resinRemovalRate(80, 300, 0.4) < resinRemovalRate(20, 300, 0.4));

for (const [cf4Percent, resinDepthUm, glassDepthUm] of rows) {
  const result = evaluatePcbProcess({ ...reference, cf4Percent });
  assert(`${cf4Percent}% CF4 樹脂深度`, approximately(result.resinDepthUm, resinDepthUm), `${result.resinDepthUm}`);
  assert(`${cf4Percent}% CF4 玻璃深度`, approximately(result.glassDepthUm, glassDepthUm), `${result.glassDepthUm}`);
}

const optimum = bestCf4Fraction(reference);
assert("最佳 flushness 必須在 10-25% CF4", optimum.cf4Percent >= 10 && optimum.cf4Percent <= 25, `目前 ${optimum.cf4Percent}%`);
assert("最佳 flushness 必須接近零 protrusion", Math.abs(optimum.flushnessUm) <= 0.5, `${optimum.flushnessUm}`);

const fifty = evaluatePcbProcess({ ...reference, cf4Percent: 50 });
assert("50% CF4 必須造成超規玻纖 recess", fifty.flushnessUm < -1 && !fifty.flushnessPass, `${fifty.flushnessUm}`);

const desmear = evaluatePcbProcess({ ...reference, cf4Percent: 5, targetMode: "desmear" });
assert("desmear 深度窗必須是 3-8 um", desmear.depthWindow.min === 3 && desmear.depthWindow.max === 8);
assert("5% CF4 必須深度通過但 flushness 失敗", desmear.depthPass && !desmear.flushnessPass, JSON.stringify(desmear));

const etchback = evaluatePcbProcess({ ...reference, cf4Percent: 20, timeMinutes: 50, targetMode: "etchback" });
assert("etchback 深度窗必須是 12-25 um", etchback.depthWindow.min === 12 && etchback.depthWindow.max === 25);
assert("20% CF4 50 分鐘樹脂去除約 16 um 並進入 etchback 窗", approximately(etchback.resinDepthUm, 16, 0.1) && etchback.depthPass, `${etchback.resinDepthUm}`);

const belowWindow = evaluatePcbProcess({ cf4Percent: 0, powerW: 100, pressureTorr: 0.1, timeMinutes: 5, targetMode: "desmear" });
const aboveWindow = evaluatePcbProcess({ cf4Percent: 80, powerW: 600, pressureTorr: 1, timeMinutes: 60, targetMode: "desmear" });
assert("低於深度窗必須顯示低於下限", pcbDepthMessage(belowWindow).includes("低於") && pcbDepthMessage(belowWindow).includes("下限"), pcbDepthMessage(belowWindow));
assert("高於深度窗必須顯示高於上限", pcbDepthMessage(aboveWindow).includes("高於") && pcbDepthMessage(aboveWindow).includes("上限"), pcbDepthMessage(aboveWindow));
for (const [width, height] of [[720, 360], [343, 580]]) {
  const layout = buildPcbVisualizationLayout({ width, height, state: { cf4Percent: 80, powerW: 600, pressureTorr: 1 }, result: aboveWindow });
  assert(`${width}px 極限條件視覺座標必須受限`, layout.bounded, JSON.stringify(layout.bounds));
  assert(`${width}px 極限條件深度與速率尺度必須涵蓋資料`, layout.depthMax >= Math.max(aboveWindow.resinDepthUm, aboveWindow.glassDepthUm) && layout.rateMax >= Math.max(...layout.rates), JSON.stringify({ depthMax: layout.depthMax, rateMax: layout.rateMax }));
}

if (failures.length) {
  console.error(`PCB 模型檢查失敗（${failures.length} 項）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`PCB 模型檢查通過：${checks}/${checks}。`);
