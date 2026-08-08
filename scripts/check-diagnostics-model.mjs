import { spectra } from "../src/data/spectra.js";
import {
  probeGases,
  probeControlRanges,
  createProbeState,
  bohmVelocity,
  electronSaturationCurrent,
  ionSaturationCurrent,
  generateProbeSweep,
  analyzeProbeSweep,
  deriveEedf
} from "../src/assets/js/probe-model.js";
import {
  oesProcesses,
  oesControlRanges,
  createOesState,
  lineIntensity,
  generateSpectrum,
  calculateActinometry,
  evaluateOesSensitivity
} from "../src/assets/js/oes-model.js";

const failures = [];
let checks = 0;

function assert(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `：${detail}` : ""}`);
}

function relativeError(actual, expected) {
  return Math.abs(actual / expected - 1);
}

assert("A27 譜線資料應恰有 22 線", spectra.length === 22, `${spectra.length} 線`);
assert("A27 譜線 ID 必須唯一", new Set(spectra.map((line) => line.id)).size === spectra.length);
const requiredDiagnosticLines = [["F", 703.7469], ["Ar", 750.3869], ["O", 777.417], ["CO", 483.5], ["Si", 251.6112], ["CN", 387.1], ["C2", 516.5], ["H", 656.28518], ["Cl", 837.594], ["Br", 470.492], ["N2", 336], ["OH", 306]];
for (const [species, wavelengthNm] of requiredDiagnosticLines) {
  assert(`A27 應包含 ${species} ${wavelengthNm} nm`, spectra.some((line) => line.species === species && Math.abs(line.wavelengthNm - wavelengthNm) < 0.06));
}
assert("Ar 750.3869/811.5311 應標示為 actinometry 內標", [750.3869, 811.5311].every((wavelength) => spectra.some((line) => line.species === "Ar" && line.wavelengthNm === wavelength && line.actinometryReference)));
assert("相對強度應明示為教學權重", spectra.every((line) => line.intensityType === "pedagogical-weight"));
assert("分子帶不得偽裝成 NIST 已核實", spectra.filter((line) => ["CO", "CN", "C2", "N2", "OH"].includes(line.species)).every((line) => line.sourceType === "pedagogical-molecular-band" && line.verificationStatus === "pending-source-review"));
assert("每條譜線都應有來源類型與核實狀態", spectra.every((line) => line.sourceType && line.verificationStatus));
assert("13 條原子線應為逐線 NIST 核實", spectra.filter((line) => !["CO", "CN", "C2", "N2", "OH"].includes(line.species)).every((line) => line.sourceType === "official-database-line-record" && line.verificationStatus === "nist-line-verified"));
assert("Br 470/478 nm 必須是 Br II", spectra.filter((line) => line.species === "Br").every((line) => line.spectrumStage === "II" && line.transition === "Br II atomic emission"));

const truth = createProbeState({ gas: "Ar", electronTemperatureEv: 3.2, electronDensityCm3: 2.4e10, plasmaPotentialV: 18, rfAmplitudeV: 0, coatingPercent: 0 });
const cleanSweep = generateProbeSweep(truth);
const cleanAnalysis = analyzeProbeSweep(cleanSweep);
assert("A26 無 RF 時 Te 誤差應小於 10%", relativeError(cleanAnalysis.electronTemperatureEv, truth.electronTemperatureEv) < 0.1, `${cleanAnalysis.electronTemperatureEv.toFixed(2)} eV`);
assert("A26 無 RF 時 ne 誤差應小於 10%", relativeError(cleanAnalysis.electronDensityCm3, truth.electronDensityCm3) < 0.1, cleanAnalysis.electronDensityCm3.toExponential(2));
assert("A26 無 RF 時 Vp 誤差應小於 10%", relativeError(cleanAnalysis.plasmaPotentialV, truth.plasmaPotentialV) < 0.1, `${cleanAnalysis.plasmaPotentialV.toFixed(2)} V`);
assert("A26 I-V 掃描應跨越控制範圍", cleanSweep.points[0].voltageV === probeControlRanges.voltageV.min && cleanSweep.points.at(-1).voltageV === probeControlRanges.voltageV.max);
assert("A26 浮動電位應位於電漿電位下方", cleanAnalysis.floatingPotentialV < cleanAnalysis.plasmaPotentialV);

const boundaryTruth = createProbeState({ gas: "Ar", electronTemperatureEv: 8, electronDensityCm3: 2e10, plasmaPotentialV: -10, rfAmplitudeV: 0, coatingPercent: 0 });
const boundaryAnalysis = analyzeProbeSweep(generateProbeSweep(boundaryTruth));
assert("A26 無 RF 邊界 Te=8 eV、Vp=-10 V 時 Te 誤差應小於 10%", relativeError(boundaryAnalysis.electronTemperatureEv, boundaryTruth.electronTemperatureEv) < 0.1, `${boundaryAnalysis.electronTemperatureEv.toFixed(2)} eV`);
assert("A26 無 RF 邊界 Te=8 eV、Vp=-10 V 時 ne 應合理回復", relativeError(boundaryAnalysis.electronDensityCm3, boundaryTruth.electronDensityCm3) < 0.15, boundaryAnalysis.electronDensityCm3.toExponential(2));

const gasVelocities = Object.entries(probeGases).map(([gas, definition]) => ({ gas, mass: definition.ionMassAmu, velocity: bohmVelocity(3, gas) }));
assert("A26 應提供四種氣體", gasVelocities.length === 4);
assert("A26 四種氣體質量應進入 Bohm 速度", gasVelocities.every((item, index, all) => index === 0 || item.velocity !== all[index - 1].velocity));
assert("Bohm 速度應符合 sqrt(kTe/mi)", relativeError(bohmVelocity(3, "Ar"), Math.sqrt(3 * 1.602176634e-19 / (39.948 * 1.66053906660e-27))) < 1e-9);
assert("電子飽和電流應大於離子飽和電流", electronSaturationCurrent(truth) > Math.abs(ionSaturationCurrent(truth)) * 10);

const teSweep = [1, 2, 4, 8].map((electronTemperatureEv) => analyzeProbeSweep(generateProbeSweep(createProbeState({ electronTemperatureEv }))));
assert("A26 Te 掃描分析應單調增加", teSweep.every((item, index) => index === 0 || item.electronTemperatureEv > teSweep[index - 1].electronTemperatureEv));
assert("A26 Te 掃描各點誤差應小於 10%", teSweep.every((item, index) => relativeError(item.electronTemperatureEv, [1, 2, 4, 8][index]) < 0.1));

const rfTruth = createProbeState({ electronTemperatureEv: 3, electronDensityCm3: 2e10, plasmaPotentialV: 18, rfAmplitudeV: 30 });
const rfSweep = generateProbeSweep(rfTruth);
const rfAnalysis = analyzeProbeSweep(rfSweep);
const noRfAnalysis = analyzeProbeSweep(generateProbeSweep(createProbeState({ ...rfTruth, rfAmplitudeV: 0 })));
const rfSample = rfSweep.points.find((point) => point.voltageV === -20);
const rfExpectedCurrentA = Array.from({ length: 96 }, (_, index) => {
  const phase = 2 * Math.PI * index / 96;
  const instantaneousVoltageV = rfSample.voltageV - rfTruth.rfAmplitudeV * Math.sin(phase);
  const electronFraction = instantaneousVoltageV < rfTruth.plasmaPotentialV
    ? Math.exp((instantaneousVoltageV - rfTruth.plasmaPotentialV) / rfTruth.electronTemperatureEv)
    : 1;
  return ionSaturationCurrent(rfTruth) + electronSaturationCurrent(rfTruth) * electronFraction;
}).reduce((sum, currentA) => sum + currentA, 0) / 96;
const hardcodedShiftCurrentA = ionSaturationCurrent(rfTruth) + electronSaturationCurrent(rfTruth) *
  Math.exp((rfSample.voltageV - (rfTruth.plasmaPotentialV + 0.85 * rfTruth.rfAmplitudeV)) / rfTruth.electronTemperatureEv);
assert("RF 掃描應記錄固定 96 相位平均", rfSweep.rfPhaseCount === 96);
assert("RF 電流應符合 I(V - A sin phase) 的 96 相位數值平均", relativeError(rfSample.currentA, rfExpectedCurrentA) < 1e-10, `${rfSample.currentA.toExponential(3)} vs ${rfExpectedCurrentA.toExponential(3)}`);
assert("RF 數值平均不可退化為 0.85A 硬編碼位移", relativeError(rfSample.currentA, hardcodedShiftCurrentA) > 0.5);
assert("30 V RF 應使 Vp 或 Vf 偏移超過 20 V", Math.max(Math.abs(rfAnalysis.plasmaPotentialV - noRfAnalysis.plasmaPotentialV), Math.abs(rfAnalysis.floatingPotentialV - noRfAnalysis.floatingPotentialV)) > 20);
assert("簡化 RF 模型仍應近似回復 Te", relativeError(rfAnalysis.electronTemperatureEv, rfTruth.electronTemperatureEv) < 0.2, `${rfAnalysis.electronTemperatureEv.toFixed(2)} eV`);
assert("RF 限制應明確揭露純指數模型不支援 Te 兩倍假象", rfAnalysis.limitations.some((note) => note.includes("不能") && note.includes("兩倍")));

const coatedAnalysis = analyzeProbeSweep(generateProbeSweep(createProbeState({ electronDensityCm3: 2e10, coatingPercent: 80 })));
assert("探針鍍膜應使 ne 顯著低估", coatedAnalysis.electronDensityCm3 < 1.2e10, coatedAnalysis.electronDensityCm3.toExponential(2));
const eedf = deriveEedf(cleanSweep);
assert("EEDF 應由二次微分產生", eedf.method === "d2I/dV2" && eedf.points.length > 20);
assert("EEDF 應含有限非負值", eedf.points.every((point) => Number.isFinite(point.value) && point.value >= 0));
const eedfNonZero = eedf.points.filter((point) => point.value > 0);
assert("EEDF 應有多個非零資料點", eedfNonZero.length > 5, `${eedfNonZero.length} 點`);
assert("EEDF 非零峰值應歸一為 1", Math.abs(Math.max(...eedf.points.map((point) => point.value)) - 1) < 1e-12);

assert("A27 應有五種製程", Object.keys(oesProcesses).sort().join(",") === "ash,clean,leak,oxide,poly");
assert("A27 控制範圍應包含功率與視窗透光率", oesControlRanges.powerW.min < oesControlRanges.powerW.max && oesControlRanges.windowTransmission.min < oesControlRanges.windowTransmission.max);
const processSpectrum = (process) => [...generateSpectrum(createOesState({ process })).lines].sort((left, right) => right.intensity - left.intensity);
const oxideTop = processSpectrum("oxide");
const polyTop = processSpectrum("poly");
const ashTop = processSpectrum("ash");
const cleanTop = processSpectrum("clean");
const leakTop = processSpectrum("leak");
assert("oxide 製程應以 CO 為最強訊號", oxideTop[0].species === "CO", oxideTop.slice(0, 3).map((line) => line.species).join(", "));
assert("poly 製程應以 Si 為最強訊號", polyTop[0].species === "Si", polyTop.slice(0, 4).map((line) => line.species).join(", "));
assert("poly 製程 Cl 應進入前四訊號", polyTop.slice(0, 4).some((line) => line.species === "Cl"));
assert("ash 製程 O 與 CO 應同在前三訊號", ["O", "CO"].every((species) => ashTop.slice(0, 3).some((line) => line.species === species)), ashTop.slice(0, 3).map((line) => line.species).join(", "));
assert("clean 製程應以 Si 作為清潔進度關鍵訊號", oesProcesses.clean.progressSpecies === "Si" && cleanTop[0].species === "Si");
assert("leak 製程 OH 應進入前三訊號", leakTop.slice(0, 3).some((line) => line.species === "OH"), leakTop.slice(0, 3).map((line) => line.species).join(", "));
const oxideState = createOesState({ process: "oxide" });
const leakState = createOesState({ process: "leak" });
assert("leak 的 OH 與 N2 應比 oxide 增加超過十倍", lineIntensity("oh-306.0", leakState) / lineIntensity("oh-306.0", oxideState) > 10 && lineIntensity("n2-336.0", leakState) / lineIntensity("n2-336.0", oxideState) > 10);

const oxideLowPower = createOesState({ process: "oxide", powerW: 300 });
const oxideHighPower = createOesState({ process: "oxide", powerW: 1200 });
const absolutePowerChange = lineIntensity("f-703.7", oxideHighPower) / lineIntensity("f-703.7", oxideLowPower);
const ratioLowPower = calculateActinometry(oxideLowPower, "f-703.7", "ar-750.4").ratio;
const ratioHighPower = calculateActinometry(oxideHighPower, "f-703.7", "ar-750.4").ratio;
const ratioPowerChange = Math.max(ratioLowPower, ratioHighPower) / Math.min(ratioLowPower, ratioHighPower);
assert("功率提高應使 Te 小幅變化", oxideHighPower.electronTemperatureEv > oxideLowPower.electronTemperatureEv && relativeError(oxideHighPower.electronTemperatureEv, oxideLowPower.electronTemperatureEv) < 0.15);
assert("功率對絕對強度影響應比正確比值大至少一個數量級", (absolutePowerChange - 1) > (ratioPowerChange - 1) * 10, `${absolutePowerChange.toFixed(2)} vs ${ratioPowerChange.toFixed(3)}`);
const badRatioLowPower = lineIntensity("f-703.7", oxideLowPower) / lineIntensity("si-251.6", oxideLowPower);
const badRatioHighPower = lineIntensity("f-703.7", oxideHighPower) / lineIntensity("si-251.6", oxideHighPower);
const badRatioPowerSensitivity = Math.abs(badRatioHighPower / badRatioLowPower - 1);
const validRatioPowerSensitivity = Math.abs(ratioHighPower / ratioLowPower - 1);
assert("F/Si 錯誤比值應明顯重新依賴功率", badRatioPowerSensitivity > 0.1 && badRatioPowerSensitivity > validRatioPowerSensitivity * 5, `${badRatioPowerSensitivity.toFixed(3)} vs ${validRatioPowerSensitivity.toFixed(3)}`);

const dirtyWindow = createOesState({ process: "oxide", windowTransmission: 0.35 });
const cleanWindow = createOesState({ process: "oxide", windowTransmission: 0.95 });
const dirtyRatio = calculateActinometry(dirtyWindow, "f-703.7", "ar-750.4").ratio;
const cleanRatio = calculateActinometry(cleanWindow, "f-703.7", "ar-750.4").ratio;
assert("視窗透光率應被同波段比值抵消", relativeError(dirtyRatio, cleanRatio) < 0.01);

const validReference = calculateActinometry(createOesState({ process: "oxide" }), "f-703.7", "ar-750.4");
const invalidReference = calculateActinometry(createOesState({ process: "oxide" }), "f-703.7", "si-251.6");
assert("激發閾值相近的參考線應有效", validReference.valid === true);
assert("激發閾值差距過大的參考線應失效", invalidReference.valid === false && invalidReference.reason.includes("閾值"));

const sensitivity = evaluateOesSensitivity({ process: "oxide", analyteId: "f-703.7", referenceId: "ar-750.4" });
assert("A27 敏感度分析應涵蓋功率與視窗", sensitivity.power.absoluteChange > sensitivity.power.ratioChange * 10 && sensitivity.window.ratioChange < 0.01);

if (failures.length) {
  console.error(`A26/A27 診斷模型檢查失敗（${failures.length}/${checks}）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`A26/A27 診斷模型檢查通過：${checks}/${checks}。`);
