import { createAleState, calculateAleCycle, calculateAleSynergy, generateAleRun } from "../src/assets/js/ale-model.js";
import { createPulseState, generatePulseWaveforms, comparePulseCharging } from "../src/assets/js/pulse-model.js";
import { createGlobalState, solveGlobalModel, scanGlobalModel } from "../src/assets/js/global-model.js";

const failures = [];
let checks = 0;
function assert(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `：${detail}` : ""}`);
}
function relativeSpread(values) {
  return (Math.max(...values) - Math.min(...values)) / (values.reduce((sum, value) => sum + value, 0) / values.length);
}

const idealAle = createAleState({ ionEnergyEv: 40, modificationTimeS: 1.5, purgeTimeS: 1.2, cycles: 20 });
const windowEpc = [30, 40, 50].map((ionEnergyEv) => calculateAleCycle({ ...idealAle, ionEnergyEv }).epcNm);
assert("A30 能量窗內 EPC 變化應小於 5%", relativeSpread(windowEpc) < 0.05, windowEpc.map((value) => value.toFixed(4)).join(", "));
const lowEnergy = calculateAleCycle({ ...idealAle, ionEnergyEv: 5 });
const highEnergy = calculateAleCycle({ ...idealAle, ionEnergyEv: 110 });
const higherEnergy = calculateAleCycle({ ...idealAle, ionEnergyEv: 140 });
assert("A30 能量過低時 EPC 應接近零", lowEnergy.epcNm < windowEpc[1] * 0.05);
assert("A30 能量過高應退化為連續濺鍍且隨能量增加", highEnergy.regime === "continuous-sputter" && higherEnergy.epcNm > highEnergy.epcNm * 1.2);
const shortModification = calculateAleCycle({ ...idealAle, modificationTimeS: 0.08 });
assert("A30 改質時間不足應顯著降低 EPC", shortModification.epcNm < windowEpc[1] * 0.45);
const idealRun = generateAleRun(idealAle);
const shortModificationRun = generateAleRun({ ...idealAle, modificationTimeS: 0.08 });
const poorPurgeRun = generateAleRun({ ...idealAle, purgeTimeS: 0.03 });
assert("A30 應輸出四步循環與指定循環數", idealRun.steps.join(",") === "modify,purge-1,remove,purge-2" && idealRun.cycles.length === 20);
assert("A30 purge 不足應造成 EPC 跨循環漂移", relativeSpread(poorPurgeRun.cycles.map((item) => item.epcNm)) > relativeSpread(idealRun.cycles.map((item) => item.epcNm)) * 3);
assert("A30 改質不足應造成 EPC 跨循環不穩", relativeSpread(shortModificationRun.cycles.map((item) => item.epcNm)) > 0.2);
const synergy = calculateAleSynergy(idealAle);
assert("A30 理想協同度應大於 90%", synergy.synergyPercent > 90 && synergy.alphaNm > 0 && synergy.betaNm === 0, synergy.synergyPercent.toFixed(1));
assert("A30 ion-only β 應從基材濺鍍閾值才出現", calculateAleSynergy({ ...idealAle, ionEnergyEv: 59 }).betaNm === 0 && calculateAleSynergy({ ...idealAle, ionEnergyEv: 61 }).betaNm > 0);
const highEnergySynergy = [70, 100, 130, 150].map((ionEnergyEv) => calculateAleSynergy({ ...idealAle, ionEnergyEv }).synergyPercent);
assert("A30 高能直接濺鍍應使協同度單調下降", highEnergySynergy.every((value, index) => index === 0 || value < highEnergySynergy[index - 1]), highEnergySynergy.map((value) => value.toFixed(1)).join(", "));
assert("A30 協同公式應保留負值以揭示非協同條件", calculateAleSynergy({ ...idealAle, ionEnergyEv: 20.1 }).synergyPercent < 0);

const pulse = createPulseState({ frequencyKhz: 1, dutyCycle: 0.5, mode: "synchronized", electronegative: true });
const waveforms = generatePulseWaveforms(pulse);
assert("A31 所有時序通道必須共用時間軸", waveforms.points.length >= 200 && waveforms.points.every((point) => ["sourcePower", "biasPower", "electronDensityNormalized", "electronTemperatureEv", "sheathPotentialNormalized", "negativeIonDensityNormalized", "bottomCharge"].every((key) => Number.isFinite(point[key]))));
assert("A31 輸出應明示物理或正規化單位", waveforms.units.electronTemperatureEv === "eV" && waveforms.units.electronDensityNormalized === "relative" && waveforms.units.bottomCharge === "relative");
assert("A31 Te 衰減時間常數應顯著小於 ne", waveforms.timeConstantsUs.electronTemperature < waveforms.timeConstantsUs.electronDensity * 0.2);
const offPoints = waveforms.points.filter((point) => !point.sourceOn && !point.biasOn);
assert("A31 off 期 Te 應比 ne 正規化衰減更快", offPoints.at(-1).electronTemperatureEv / offPoints[0].electronTemperatureEv < offPoints.at(-1).electronDensityNormalized / offPoints[0].electronDensityNormalized);
assert("A31 電負性氣體 off 期負離子應增加", offPoints.at(-1).negativeIonDensityNormalized > offPoints[0].negativeIonDensityNormalized);
const charging = comparePulseCharging(pulse);
assert("A31 脈衝應降低孔底峰值與終端電荷", charging.pulsed.peakCharge < charging.continuous.peakCharge && charging.pulsed.terminalCharge < charging.continuous.terminalCharge);
const sourceMode = generatePulseWaveforms({ ...pulse, mode: "source" });
const biasMode = generatePulseWaveforms({ ...pulse, mode: "bias" });
const phased = generatePulseWaveforms({ ...pulse, mode: "synchronized", phaseDegrees: 180 });
assert("A31 source 模式只脈衝 source", sourceMode.points.some((point) => !point.sourceOn && point.biasOn));
assert("A31 bias 模式只脈衝 bias", biasMode.points.some((point) => point.sourceOn && !point.biasOn));
const biasOffStart = biasMode.points.findIndex((point, index) => index > 0 && !point.biasOn && biasMode.points[index - 1].biasOn);
assert("A31 bias off 期應中和孔底電荷", biasOffStart > 0 && biasMode.points.slice(biasOffStart + 1).some((point, index) => !point.biasOn && point.bottomCharge < biasMode.points[biasOffStart + index].bottomCharge));
assert("A31 synchronized 相位差應改變重疊比例", phased.overlapFraction < waveforms.overlapFraction * 0.2);
const lowSourcePower = generatePulseWaveforms({ ...pulse, sourcePowerW: 100 });
const highSourcePower = generatePulseWaveforms({ ...pulse, sourcePowerW: 3000 });
assert("A31 source 功率應改變 ne 與 Te", Math.max(...highSourcePower.points.map((point) => point.electronDensityNormalized)) > Math.max(...lowSourcePower.points.map((point) => point.electronDensityNormalized)) * 2 && Math.max(...highSourcePower.points.map((point) => point.electronTemperatureEv)) > Math.max(...lowSourcePower.points.map((point) => point.electronTemperatureEv)));
const lowBiasPower = generatePulseWaveforms({ ...pulse, biasPowerW: 25 });
const highBiasPower = generatePulseWaveforms({ ...pulse, biasPowerW: 1000 });
assert("A31 bias 功率應改變鞘層與充電", highBiasPower.peakCharge > lowBiasPower.peakCharge * 2 && Math.max(...highBiasPower.points.map((point) => point.sheathPotentialNormalized)) > Math.max(...lowBiasPower.points.map((point) => point.sheathPotentialNormalized)));
assert("A31 週期取樣不得重複不一致端點", waveforms.points.at(-1).timeUs < waveforms.periodUs && waveforms.points[0].sourceOn === (0 < pulse.dutyCycle));
const slowPulse = generatePulseWaveforms({ ...pulse, frequencyKhz: 0.1 });
const fastPulse = generatePulseWaveforms({ ...pulse, frequencyKhz: 10 });
const slowOff = slowPulse.points.filter((point) => !point.sourceOn && !point.biasOn);
const fastOff = fastPulse.points.filter((point) => !point.sourceOn && !point.biasOn);
assert("A31 頻率應改變 off 期衰減與電荷中和", slowOff.at(-1).electronDensityNormalized < fastOff.at(-1).electronDensityNormalized * 0.5 && slowPulse.terminalCharge < fastPulse.terminalCharge * 0.5);

const globalState = createGlobalState({ gas: "Ar", pressureMtorr: 20, radiusCm: 20, heightCm: 10, absorbedPowerW: 500, flowSccm: 100 });
const solution = solveGlobalModel(globalState);
assert("A32 應輸出有限正值與平衡曲線", [solution.electronTemperatureEv, solution.electronDensityCm3, solution.ionFluxCm2s, solution.radicalDensityCm3, solution.residenceTimeS].every((value) => Number.isFinite(value) && value > 0) && solution.balanceCurves.length >= 40);
const closestBalancePoint = solution.balanceCurves.reduce((closest, point) => Math.abs(point.residual) < Math.abs(closest.residual) ? point : closest);
assert("A32 平衡曲線交點應等於求解 Te", Math.abs(closestBalancePoint.temperatureEv - solution.electronTemperatureEv) < 1e-8 && Math.abs(closestBalancePoint.residual) < 1e-10);
const powerScan = scanGlobalModel(globalState, "absorbedPowerW", [200, 400, 800, 1200]);
assert("A32 功率掃描 Te 變化應小於 10%", relativeSpread(powerScan.map((point) => point.electronTemperatureEv)) < 0.1);
const densityPerWatt = powerScan.map((point) => point.electronDensityCm3 / point.inputValue);
assert("A32 ne 應與吸收功率近似線性", relativeSpread(densityPerWatt) < 0.03);
const pressureScan = scanGlobalModel(globalState, "pressureMtorr", [2, 3, 5, 10, 20, 40, 80, 100]);
assert("A32 壓力上升時 Te 應單調下降", pressureScan.every((point, index) => index === 0 || point.electronTemperatureEv < pressureScan[index - 1].electronTemperatureEv));
const smallChamber = solveGlobalModel({ ...globalState, radiusCm: 8, heightCm: 5 });
const largeChamber = solveGlobalModel({ ...globalState, radiusCm: 30, heightCm: 20 });
assert("A32 縮小腔體尺寸應提高 Te", smallChamber.electronTemperatureEv > largeChamber.electronTemperatureEv);
const lowFlow = solveGlobalModel({ ...globalState, flowSccm: 30 });
const highFlow = solveGlobalModel({ ...globalState, flowSccm: 300 });
assert("A32 流量應改變滯留時間與自由基密度", lowFlow.residenceTimeS > highFlow.residenceTimeS && lowFlow.radicalDensityCm3 !== highFlow.radicalDensityCm3);
const gasFluxes = ["Ar", "O2", "CF4"].map((gas) => solveGlobalModel({ ...globalState, gas }).ionFluxCm2s);
assert("A32 氣體離子質量應影響 Bohm 通量", new Set(gasFluxes.map((value) => value.toPrecision(8))).size === 3);
assert("A32 應明示只供趨勢教學", solution.limitations.some((item) => item.includes("趨勢") && item.includes("絕對值")));
assert("A32 畸形輸入應回預設而非控制下限", createGlobalState({ pressureMtorr: null, radiusCm: [], absorbedPowerW: true }).pressureMtorr === 20 && createGlobalState({ radiusCm: [] }).radiusCm === 20 && createGlobalState({ absorbedPowerW: true }).absorbedPowerW === 500);

if (failures.length) {
  console.error(`A30–A32 先進模型檢查失敗（${failures.length}/${checks}）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`A30–A32 先進模型檢查通過：${checks}/${checks}。`);
