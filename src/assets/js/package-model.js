export const WATER_SURFACE_TENSION = 72.8;

export const packageGases = [
  { id: "ar", label: "Ar", name: "氬", activation: 0.55, etch: 0.35, redox: 0, saturation: 58, note: "物理移除弱層與部分氧化物，不引入反應性殘留。" },
  { id: "o2", label: "O₂", name: "氧", activation: 1, etch: 1, redox: 1, saturation: 72, note: "去有機與活化效率最高，但會氧化金屬並加速有機基材損傷。" },
  { id: "h2ar", label: "H₂/Ar", name: "氫氬混合", activation: 0.45, etch: 0.3, redox: -1, saturation: 52, note: "用還原性物種處理 Cu/Ag 氧化物，仍須確認實際混氣與防爆規範。" },
  { id: "n2", label: "N₂", name: "氮", activation: 0.65, etch: 0.5, redox: 0, saturation: 62, note: "適合 inline 活化，去有機能力低於 O₂。" }
];

export const packageMaterials = [
  { id: "emc", label: "封膠料 EMC", initialEnergy: 34, toughness: 1, recoveryHours: 30, permanentFraction: 0.45, metal: false, note: "模封與黏著界面的主要有機基材。" },
  { id: "pi", label: "聚醯亞胺 PI", initialEnergy: 38, toughness: 1.4, recoveryHours: 60, permanentFraction: 0.55, metal: false, note: "RDL 常見介電材料，耐受度與回復速度仍依配方而異。" },
  { id: "sm", label: "綠漆 Solder mask", initialEnergy: 32, toughness: 0.7, recoveryHours: 20, permanentFraction: 0.35, metal: false, note: "製程窗較窄，過量劑量可能粉化或變色。" },
  { id: "cu", label: "Cu pad", initialEnergy: 42, toughness: 3, recoveryHours: 200, permanentFraction: 0.9, metal: true, note: "判定重點是氧化狀態、殘留與接合強度，不是接觸角。" }
];

export function packageGasById(id) {
  return packageGases.find((item) => item.id === id) ?? packageGases[0];
}

export function packageMaterialById(id) {
  return packageMaterials.find((item) => item.id === id) ?? packageMaterials[0];
}

export function radicalFlux(powerW, pressureTorr, mode = "lp") {
  const powerFactor = Math.max(0, powerW) / 300;
  const pressureFactor = Math.pow(Math.max(0.02, pressureTorr) / 0.4, 0.45);
  return powerFactor * pressureFactor * (mode === "atm" ? 0.55 : 1);
}

export function thermalLoad(powerW, timeSeconds, mode = "lp") {
  const modeFactor = mode === "atm" ? 2.2 : 0.7;
  return Math.max(0, powerW) / 300 * (Math.max(0, timeSeconds) / 60) * modeFactor;
}

export function surfaceEnergy(gas, material, powerW, pressureTorr, timeSeconds, mode = "lp") {
  const flux = radicalFlux(powerW, pressureTorr, mode);
  const saturation = Math.min(WATER_SURFACE_TENSION - 0.5, gas.saturation);
  const rate = gas.activation * flux / (material.toughness * 22);
  const activatedFraction = 1 - Math.exp(-rate * Math.max(0, timeSeconds));
  return material.initialEnergy + (saturation - material.initialEnergy) * activatedFraction;
}

export function substrateDamage(gas, material, powerW, pressureTorr, timeSeconds, mode = "lp") {
  const dose = gas.etch * radicalFlux(powerW, pressureTorr, mode) * Math.max(0, timeSeconds);
  const threshold = material.toughness * 55;
  if (dose <= threshold) return 0;
  return Math.min(1, Math.pow((dose - threshold) / threshold, 1.35) * 0.5);
}

export function contactAngle(surfaceEnergyValue) {
  const cosine = Math.max(-1, Math.min(1, 2 * Math.sqrt(Math.max(0, surfaceEnergyValue) / WATER_SURFACE_TENSION) - 1));
  return Math.acos(cosine) * 180 / Math.PI;
}

export function adhesionIndex(surfaceEnergyValue, damage, material, oxide) {
  const work = 2 * Math.sqrt(Math.max(0, surfaceEnergyValue) * WATER_SURFACE_TENSION);
  const untreatedWork = 2 * Math.sqrt(material.initialEnergy * WATER_SURFACE_TENSION);
  const damagePenalty = 1 - 0.85 * damage;
  const oxidePenalty = material.metal ? 1 - 0.55 * oxide : 1;
  return Math.max(0, work / untreatedWork * damagePenalty * oxidePenalty);
}

export function oxideState(gas, powerW, pressureTorr, timeSeconds, mode = "lp") {
  const initial = 0.6;
  const dose = radicalFlux(powerW, pressureTorr, mode) * Math.max(0, timeSeconds);
  if (gas.redox > 0) return Math.min(1, initial + (1 - initial) * (1 - Math.exp(-dose / 90)));
  if (gas.redox < 0) return Math.max(0, initial * Math.exp(-dose / 45));
  return Math.max(0.08, initial * Math.exp(-dose / 110));
}

export function recoveredSurfaceEnergy(peakEnergy, material, waitHours) {
  const permanent = material.initialEnergy + (peakEnergy - material.initialEnergy) * material.permanentFraction;
  const decaying = (peakEnergy - permanent) * Math.exp(-Math.max(0, waitHours) / material.recoveryHours);
  return permanent + decaying;
}

export function queueTimeHours(peakEnergy, material, targetAngle = 30) {
  const permanent = material.initialEnergy + (peakEnergy - material.initialEnergy) * material.permanentFraction;
  if (contactAngle(permanent) <= targetAngle) return Infinity;
  if (contactAngle(peakEnergy) > targetAngle) return 0;
  let low = 0;
  let high = 2000;
  for (let index = 0; index < 60; index += 1) {
    const middle = (low + high) / 2;
    if (contactAngle(recoveredSurfaceEnergy(peakEnergy, material, middle)) > targetAngle) high = middle;
    else low = middle;
  }
  return (low + high) / 2;
}

export function packageVerdict({ angle, damage, oxide, heat, material }) {
  if (heat > 3.2) return "熱負荷過高：料條或有機材料可能變形。";
  if (damage > 0.35) return "處理過頭：降解弱層使接著力反而下降。";
  if (material.metal) {
    if (oxide > 0.7) return "表面氧化過重：打線或迴銲可能不沾（NSOP）。";
    if (oxide > 0.45) return "氧化層仍偏厚：需驗證還原 chemistry 或受控物理移除。";
    if (oxide > 0.2) return "氧化層已大幅去除，仍須用接合測試驗證。";
    return "金屬表面氧化物已降至低值，仍須用接合測試驗證。";
  }
  if (angle > 45) return "活化不足：表面仍偏疏水。";
  if (angle > 30) return "尚未達到常見的 30° 教學判準。";
  if (damage > 0.12) return "接觸角達標，但已開始累積基材損傷。";
  return "接觸角達標且模型損傷仍低，需再以接著力與可靠度驗證。";
}

export function evaluatePackageTreatment(options) {
  const gas = packageGasById(options.gas);
  const material = packageMaterialById(options.material);
  const mode = options.mode ?? "lp";
  const pressure = mode === "atm" ? 760 : options.pressure;
  const gammaPeak = surfaceEnergy(gas, material, options.power, pressure, options.time, mode);
  const damage = substrateDamage(gas, material, options.power, pressure, options.time, mode);
  const oxide = material.metal ? oxideState(gas, options.power, pressure, options.time, mode) : 0;
  const heat = thermalLoad(options.power, options.time, mode);
  const waitHours = Math.max(0, options.wait ?? 0);
  const gammaCurrent = recoveredSurfaceEnergy(gammaPeak, material, waitHours);
  const angle = contactAngle(gammaCurrent);
  const adhesion = adhesionIndex(gammaCurrent, damage, material, oxide);
  const result = {
    gas,
    material,
    mode,
    gammaPeak,
    gamma: gammaCurrent,
    angle,
    damage,
    oxide,
    adhesion,
    thermal: heat,
    queueHours: queueTimeHours(gammaPeak, material, 30)
  };
  result.verdict = packageVerdict({ ...result, heat });
  return result;
}
