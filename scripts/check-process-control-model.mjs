import {
  createEndpointState,
  calculateInterferenceFringe,
  generateEndpointSeries,
  analyzeEndpointSeries
} from "../src/assets/js/process-control-model.js";
import {
  calculateAntennaRatio,
  createDamageState,
  simulateCharging
} from "../src/assets/js/damage-model.js";

const failures = [];
let checks = 0;

function assert(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `：${detail}` : ""}`);
}

function relativeError(actual, expected) {
  return Math.abs(actual / expected - 1);
}

function standardDeviation(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length);
}

const endpointState = createEndpointState({
  openAreaPercent: 20,
  filmThicknessNm: 600,
  etchRateNmMin: 300,
  noisePercent: 2,
  seed: 24680
});
const endpointSeries = generateEndpointSeries(endpointState);
const repeatedSeries = generateEndpointSeries(endpointState);
assert("A28 固定種子應產生可重現序列", JSON.stringify(endpointSeries.points) === JSON.stringify(repeatedSeries.points));
assert("A28 真實終點應由膜厚與蝕刻速率決定", endpointSeries.trueEndpointSeconds === 120, `${endpointSeries.trueEndpointSeconds} 秒`);
assert("A28 序列應同時包含四種 OES 演算法與干涉訊號", endpointSeries.points.every((point) => ["raw", "movingAverage", "firstDerivative", "normalized", "interference"].every((key) => Number.isFinite(point[key]))));

const clearResult = analyzeEndpointSeries(generateEndpointSeries({ ...endpointState, openAreaPercent: 20 }));
const moderateRaw = analyzeEndpointSeries(generateEndpointSeries({ ...endpointState, openAreaPercent: 2, noisePercent: 5 }), { algorithm: "raw" });
const moderateSeries = generateEndpointSeries({ ...endpointState, openAreaPercent: 2, noisePercent: 5 });
const moderateAverage = analyzeEndpointSeries(moderateSeries, { algorithm: "movingAverage" });
const tinyResult = analyzeEndpointSeries(generateEndpointSeries({ ...endpointState, openAreaPercent: 0.05 }));
assert("A28 開口率大於 10% 時 OES 應可靠", clearResult.oes.reliable === true);
assert("A28 清楚訊號的 OES 終點誤差應小於 5 秒", Math.abs(clearResult.oes.detectedSeconds - clearResult.trueEndpointSeconds) < 5, `${clearResult.oes.detectedSeconds} 秒`);
assert("A28 開口率低於 0.1% 時 OES 應明確標示不可靠", tinyResult.oes.reliable === false && tinyResult.oes.reason.includes("0.1%"));
assert("A28 OES 訊雜比應隨開口率大幅下降", clearResult.oes.signalToNoise > tinyResult.oes.signalToNoise * 100, `${clearResult.oes.signalToNoise.toFixed(2)} vs ${tinyResult.oes.signalToNoise.toFixed(2)}`);
const moderateBaseline = moderateSeries.points.filter((point) => point.timeSeconds < moderateSeries.trueEndpointSeconds * 0.65);
assert("A28 移動平均應降低中等訊雜比的基線雜訊", standardDeviation(moderateBaseline.map((point) => point.movingAverage)) < standardDeviation(moderateBaseline.map((point) => point.raw)) * 0.6);
assert("A28 移動平均的因果延遲後終點誤差仍應小於 5 秒", moderateAverage.oes.errorSeconds < 5 && moderateRaw.oes.errorSeconds < 5);
const misleadingRaw = analyzeEndpointSeries(generateEndpointSeries({ ...endpointState, openAreaPercent: 1, noisePercent: 20 }), { algorithm: "raw" });
assert("A28 訊號門檻通過但演算法誤觸發時仍應判不可靠", misleadingRaw.oes.signalReliable === true && misleadingRaw.oes.errorSeconds > misleadingRaw.oes.toleranceSeconds && misleadingRaw.oes.reliable === false);

const fringe = calculateInterferenceFringe({ wavelengthNm: 633, refractiveIndex: 1.46, etchRateNmMin: 300 });
assert("A28 干涉條紋厚度應為 lambda/(2n)", relativeError(fringe.thicknessPerFringeNm, 633 / (2 * 1.46)) < 1e-12);
assert("A28 干涉條紋時間週期應納入蝕刻速率", relativeError(fringe.periodSeconds, 633 / (2 * 1.46) / 300 * 60) < 1e-12);
const interferenceClear = analyzeEndpointSeries(generateEndpointSeries({ ...endpointState, openAreaPercent: 30 })).interference;
const interferenceTiny = analyzeEndpointSeries(generateEndpointSeries({ ...endpointState, openAreaPercent: 0.01 })).interference;
assert("A28 干涉式終點應不受開口率影響", interferenceClear.detectedSeconds === interferenceTiny.detectedSeconds && interferenceClear.reliable && interferenceTiny.reliable);
assert("A28 干涉式終點應由訊號判讀而非直接回傳真值", Math.abs(interferenceClear.detectedSeconds - endpointSeries.trueEndpointSeconds) < fringe.periodSeconds * 0.25);
const slowInterferenceSeries = generateEndpointSeries({ ...endpointState, etchRateNmMin: 10, seed: 86420 });
const slowInterference = analyzeEndpointSeries(slowInterferenceSeries).interference;
assert("A28 慢速蝕刻仍應以條紋活動停止判讀終點", slowInterference.reliable && Math.abs(slowInterference.detectedSeconds - slowInterferenceSeries.trueEndpointSeconds) < slowInterferenceSeries.fringePeriodSeconds * 0.25);
const corruptInterference = generateEndpointSeries(endpointState);
corruptInterference.points.forEach((point) => { point.interference = Number.NaN; });
const corruptInterferenceResult = analyzeEndpointSeries(corruptInterference).interference;
assert("A28 干涉訊號損壞時不得回報可靠終點", corruptInterferenceResult.reliable === false && Number.isNaN(corruptInterferenceResult.detectedSeconds));

const cleanWindow = generateEndpointSeries({ ...endpointState, noisePercent: 0, windowTransmission: 1 });
const dirtyWindow = generateEndpointSeries({ ...endpointState, noisePercent: 0, windowTransmission: 0.3 });
const sampleIndex = Math.floor(cleanWindow.points.length * 0.25);
const absoluteChange = Math.abs(dirtyWindow.points[sampleIndex].raw / cleanWindow.points[sampleIndex].raw - 1);
const normalizedChange = Math.abs(dirtyWindow.points[sampleIndex].normalized / cleanWindow.points[sampleIndex].normalized - 1);
assert("A28 視窗污染應降低 OES 絕對強度", absoluteChange > 0.6);
assert("A28 正規化應顯著減輕視窗污染影響", normalizedChange < absoluteChange * 0.05, `${normalizedChange.toFixed(4)} vs ${absoluteChange.toFixed(4)}`);
const contaminatedSeries = generateEndpointSeries({ ...endpointState, openAreaPercent: 1, noisePercent: 20, windowTransmission: 0.1 });
const contaminatedResult = analyzeEndpointSeries(contaminatedSeries);
assert("A28 視窗污染應降低有效 SNR 並使極弱訊號降級", contaminatedSeries.signalToNoise < 1 && contaminatedResult.oes.reliable === false, contaminatedSeries.signalToNoise.toFixed(2));
assert("A28 無效開口率應回復預設值而非偽裝成最低開口率", createEndpointState({ openAreaPercent: "無效" }).openAreaPercent === 10);
assert("A28 空白、null 與陣列數值不得被轉成控制下限", ["", "   ", null, []].every((value) => createEndpointState({ openAreaPercent: value }).openAreaPercent === 10));
const strictEndpointNumbers = createEndpointState({ wavelengthNm: true, refractiveIndex: [2], seed: true });
assert("A28 波長、折射率與種子也必須使用嚴格數值解析", strictEndpointNumbers.wavelengthNm === 633 && strictEndpointNumbers.refractiveIndex === 1.46 && strictEndpointNumbers.seed === 12345);

assert("A29 天線比應為天線面積除以閘極面積", calculateAntennaRatio({ antennaAreaUm2: 5000, gateAreaUm2: 5 }) === 1000);
const continuous = simulateCharging(createDamageState({ antennaAreaUm2: 500, gateAreaUm2: 5, durationUs: 100, pulsed: false }));
assert("A29 連續電漿充電應單調累積", continuous.trace.every((point, index, points) => index === 0 || point.gatePotentialV >= points[index - 1].gatePotentialV));

const ratio100 = simulateCharging(createDamageState({ antennaAreaUm2: 500, gateAreaUm2: 5, durationUs: 50, pulsed: false }));
const ratio1000 = simulateCharging(createDamageState({ antennaAreaUm2: 5000, gateAreaUm2: 5, durationUs: 50, pulsed: false }));
assert("A29 未鉗位時天線比 100 到 1000 的閘極電位應近似線性", ratio1000.terminalGatePotentialV / ratio100.terminalGatePotentialV > 8 && ratio1000.terminalGatePotentialV / ratio100.terminalGatePotentialV < 12, `${ratio100.terminalGatePotentialV.toFixed(2)} vs ${ratio1000.terminalGatePotentialV.toFixed(2)} V`);

const lowAspect = simulateCharging(createDamageState({ aspectRatio: 1, durationUs: 100 }));
const highAspect = simulateCharging(createDamageState({ aspectRatio: 20, durationUs: 100 }));
assert("A29 高深寬比應提高電子遮蔽與充電風險", highAspect.electronShading > lowAspect.electronShading && highAspect.riskScore > lowAspect.riskScore);

const pulsed = simulateCharging(createDamageState({ antennaAreaUm2: 2500, gateAreaUm2: 5, durationUs: 100, pulsed: true, dutyCycle: 0.5 }));
const sameContinuous = simulateCharging(createDamageState({ antennaAreaUm2: 2500, gateAreaUm2: 5, durationUs: 100, pulsed: false }));
assert("A29 脈衝 off phase 應使電位軌跡非單調", pulsed.trace.some((point, index, points) => index > 0 && point.gatePotentialV < points[index - 1].gatePotentialV));
assert("A29 脈衝模式應降低峰值與終端電位", pulsed.peakGatePotentialV < sameContinuous.peakGatePotentialV && pulsed.terminalGatePotentialV < sameContinuous.terminalGatePotentialV);
const coarsePulsed = simulateCharging(createDamageState({ antennaAreaUm2: 2500, gateAreaUm2: 5, durationUs: 100, pulsed: true, dutyCycle: 0.5, pulsePeriodUs: 10, timeStepUs: 10 }));
assert("A29 粗時間步長仍必須取樣到脈衝 off phase", coarsePulsed.trace.some((point) => point.plasmaOn === false) && coarsePulsed.trace.some((point, index, points) => index > 0 && point.gatePotentialV < points[index - 1].gatePotentialV));

const noDiode = simulateCharging(createDamageState({ antennaAreaUm2: 10000, gateAreaUm2: 5, durationUs: 200, antennaDiode: false }));
const diode = simulateCharging(createDamageState({ antennaAreaUm2: 10000, gateAreaUm2: 5, durationUs: 200, antennaDiode: true }));
assert("A29 天線二極體應鉗制閘極電位與氧化層電場", diode.peakGatePotentialV < noDiode.peakGatePotentialV && diode.oxideFieldMvCm < noDiode.oxideFieldMvCm);
assert("A29 天線二極體不應降低 UV/VUV 劑量", diode.damageModes.uvVuvDose === noDiode.damageModes.uvVuvDose);
const strictBooleans = createDamageState({ pulsed: "false", antennaDiode: "false" });
assert("A29 字串 false 不得被誤判為啟用開關", strictBooleans.pulsed === false && strictBooleans.antennaDiode === false);
assert("A29 無效面積應回復預設值而非偽裝成下限", createDamageState({ antennaAreaUm2: "無效" }).antennaAreaUm2 === 500);
assert("A29 空白、null、陣列與布林數值不得被轉成控制下限", ["", "   ", null, [], false].every((value) => createDamageState({ antennaAreaUm2: value }).antennaAreaUm2 === 500));
assert("A29 天線比公開函式不得寬鬆轉型布林或陣列", calculateAntennaRatio({ antennaAreaUm2: true, gateAreaUm2: [5] }) === 100);

const thickOxide = simulateCharging(createDamageState({ oxideThicknessNm: 10 }));
const thinOxide = simulateCharging(createDamageState({ oxideThicknessNm: 2 }));
assert("A29 較薄閘極氧化層應具有較高電場與風險", thinOxide.oxideFieldMvCm > thickOxide.oxideFieldMvCm && thinOxide.riskScore > thickOxide.riskScore);
assert("A29 應輸出五類電漿損傷模式", ["charging", "uvVuvDose", "ionBombardment", "contamination", "arcing"].every((key) => Number.isFinite(noDiode.damageModes[key])));
assert("A29 應由閘極電容與電位輸出累積電荷", noDiode.terminalChargePc > 0 && Math.abs(noDiode.terminalChargePc / (noDiode.gateCapacitanceF * noDiode.terminalGatePotentialV * 1e12) - 1) < 1e-12);
const breakdown = simulateCharging(createDamageState({ antennaAreaUm2: 20000, gateAreaUm2: 1, oxideThicknessNm: 1, durationUs: 200 }));
assert("A29 超過教學崩潰場時不得輸出壽命預測", breakdown.breakdownExceeded === true && breakdown.riskScore === 100 && breakdown.estimatedLifetimeIndex === null);

if (failures.length) {
  console.error(`A28/A29 製程控制與損傷模型檢查失敗（${failures.length}/${checks}）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`A28/A29 製程控制與損傷模型檢查通過：${checks}/${checks}。`);
