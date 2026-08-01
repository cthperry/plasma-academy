const ELEMENTARY_CHARGE_C = 1.602176634e-19;
const ELECTRON_MASS_KG = 9.1093837015e-31;
const ATOMIC_MASS_KG = 1.66053906660e-27;
const DEFAULT_PROBE_AREA_M2 = Math.PI * 0.15e-3 * 10e-3;
const RF_PHASE_COUNT = 96;

export const probeGases = {
  Ar: { label: "Ar", ionMassAmu: 39.948 },
  O2: { label: "O₂⁺", ionMassAmu: 31.998 },
  CF4: { label: "CF₃⁺", ionMassAmu: 69.01 },
  Cl2: { label: "Cl₂⁺", ionMassAmu: 70.906 }
};

export const probeControlRanges = {
  voltageV: { min: -100, max: 50, step: 0.5 },
  electronTemperatureEv: { min: 1, max: 8, step: 0.1 },
  electronDensityCm3: { min: 1e9, max: 5e11 },
  rfAmplitudeV: { min: 0, max: 60, step: 2 },
  coatingPercent: { min: 0, max: 100, step: 5 }
};

export function bohmVelocity(electronTemperatureEv, gas = "Ar") {
  const ionMassAmu = typeof gas === "number" ? gas : (probeGases[gas] ?? probeGases.Ar).ionMassAmu;
  return Math.sqrt((positive(electronTemperatureEv, 3) * ELEMENTARY_CHARGE_C) / (ionMassAmu * ATOMIC_MASS_KG));
}

export function ionSaturationCurrent(state = {}) {
  const densityM3 = positive(state.electronDensityCm3, 1e10) * 1e6;
  const areaM2 = positive(state.probeAreaM2, DEFAULT_PROBE_AREA_M2);
  return -0.61 * densityM3 * ELEMENTARY_CHARGE_C * bohmVelocity(state.electronTemperatureEv, state.gas) * areaM2;
}

export function electronSaturationCurrent(state = {}) {
  const densityM3 = positive(state.electronDensityCm3, 1e10) * 1e6;
  const areaM2 = positive(state.probeAreaM2, DEFAULT_PROBE_AREA_M2);
  const thermalFluxVelocity = Math.sqrt((positive(state.electronTemperatureEv, 3) * ELEMENTARY_CHARGE_C) / (2 * Math.PI * ELECTRON_MASS_KG));
  return densityM3 * ELEMENTARY_CHARGE_C * thermalFluxVelocity * areaM2;
}

export function createProbeState(input = {}) {
  const gas = Object.hasOwn(probeGases, input.gas) ? input.gas : "Ar";
  return {
    gas,
    electronTemperatureEv: clamp(input.electronTemperatureEv ?? 3, probeControlRanges.electronTemperatureEv.min, probeControlRanges.electronTemperatureEv.max),
    electronDensityCm3: clamp(input.electronDensityCm3 ?? 1e10, probeControlRanges.electronDensityCm3.min, probeControlRanges.electronDensityCm3.max),
    plasmaPotentialV: clamp(input.plasmaPotentialV ?? 20, -10, 30),
    rfAmplitudeV: clamp(input.rfAmplitudeV ?? 0, probeControlRanges.rfAmplitudeV.min, probeControlRanges.rfAmplitudeV.max),
    coatingPercent: clamp(input.coatingPercent ?? 0, probeControlRanges.coatingPercent.min, probeControlRanges.coatingPercent.max),
    probeAreaM2: positive(input.probeAreaM2, DEFAULT_PROBE_AREA_M2)
  };
}

export function generateProbeSweep(input = {}) {
  const state = createProbeState(input);
  const points = [];
  const { min, max, step } = probeControlRanges.voltageV;
  const coatingTransmission = 1 - state.coatingPercent / 100 * 0.78;

  for (let voltageV = min; voltageV <= max + step / 2; voltageV += step) {
    let phaseCurrentSumA = 0;
    for (let phaseIndex = 0; phaseIndex < RF_PHASE_COUNT; phaseIndex += 1) {
      const phase = 2 * Math.PI * phaseIndex / RF_PHASE_COUNT;
      const instantaneousVoltageV = voltageV - state.rfAmplitudeV * Math.sin(phase);
      phaseCurrentSumA += instantaneousProbeCurrent(instantaneousVoltageV, state);
    }
    points.push({ voltageV, currentA: phaseCurrentSumA / RF_PHASE_COUNT * coatingTransmission });
  }

  return {
    points,
    gas: state.gas,
    probeAreaM2: state.probeAreaM2,
    rfAmplitudeV: state.rfAmplitudeV,
    coatingPercent: state.coatingPercent,
    rfPhaseCount: RF_PHASE_COUNT
  };
}

export function analyzeProbeSweep(sweep) {
  const points = sweep?.points ?? [];
  if (points.length < 8) throw new TypeError("Langmuir I-V 掃描至少需要 8 個資料點。");

  const edgeCount = Math.max(4, Math.floor(points.length * 0.08));
  const ionBaselineA = average(points.slice(0, edgeCount).map((point) => point.currentA));
  const electronPlateauNetA = average(points.slice(-edgeCount).map((point) => point.currentA));
  const electronSaturationA = electronPlateauNetA - ionBaselineA;
  const plasmaPotentialV = findPlasmaPotential(points);
  const floatingPotentialV = findZeroCrossing(points);
  const fitPoints = points.filter((point) => {
    const electronCurrentA = point.currentA - ionBaselineA;
    const fraction = electronCurrentA / electronSaturationA;
    return fraction >= 0.003 && fraction <= 0.03;
  });
  const slope = linearSlope(fitPoints.map((point) => ({ x: point.voltageV, y: Math.log(point.currentA - ionBaselineA) })));
  const electronTemperatureEv = 1 / slope;
  const gas = Object.hasOwn(probeGases, sweep.gas) ? sweep.gas : "Ar";
  const electronDensityCm3 = Math.abs(ionBaselineA) /
    (0.61 * ELEMENTARY_CHARGE_C * bohmVelocity(electronTemperatureEv, gas) * positive(sweep.probeAreaM2, DEFAULT_PROBE_AREA_M2)) / 1e6;

  return {
    floatingPotentialV,
    electronTemperatureEv,
    plasmaPotentialV,
    electronDensityCm3,
    ionSaturationCurrentA: ionBaselineA,
    electronSaturationCurrentA: electronSaturationA,
    limitations: [
      "純指數電子過渡區的 RF 週期平均只會平移曲線，不能支持 Te 高估兩倍的主張。",
      "此教學模型未納入探針鞘層膨脹、非 Maxwellian EEDF、雜散電容與 RF 補償電路。"
    ]
  };
}

function instantaneousProbeCurrent(voltageV, state) {
  const electronFraction = voltageV < state.plasmaPotentialV
    ? Math.exp((voltageV - state.plasmaPotentialV) / state.electronTemperatureEv)
    : 1;
  return ionSaturationCurrent(state) + electronSaturationCurrent(state) * electronFraction;
}

export function deriveEedf(sweep) {
  const points = sweep?.points ?? [];
  const plasmaPotentialV = findPlasmaPotential(points);
  const derived = [];
  for (let index = 1; index < points.length - 1; index += 1) {
    if (points[index].voltageV >= plasmaPotentialV) continue;
    const left = points[index - 1];
    const center = points[index];
    const right = points[index + 1];
    const stepV = right.voltageV - center.voltageV;
    const secondDerivative = (right.currentA - 2 * center.currentA + left.currentA) / (stepV * stepV);
    derived.push({
      energyEv: plasmaPotentialV - center.voltageV,
      value: Math.max(0, secondDerivative) * Math.sqrt(Math.max(0, plasmaPotentialV - center.voltageV))
    });
  }
  const peak = Math.max(...derived.map((point) => point.value), 0);
  return {
    method: "d2I/dV2",
    points: derived.map((point) => ({ ...point, value: peak > 0 ? point.value / peak : 0 }))
  };
}

function findPlasmaPotential(points) {
  let bestSlope = -Infinity;
  let bestVoltage = Number.NaN;
  for (let index = 1; index < points.length; index += 1) {
    const slope = (points[index].currentA - points[index - 1].currentA) /
      (points[index].voltageV - points[index - 1].voltageV);
    if (slope > bestSlope) {
      bestSlope = slope;
      bestVoltage = points[index].voltageV;
    }
  }
  return bestVoltage;
}

function findZeroCrossing(points) {
  for (let index = 1; index < points.length; index += 1) {
    const left = points[index - 1];
    const right = points[index];
    if (left.currentA <= 0 && right.currentA >= 0) {
      const fraction = -left.currentA / (right.currentA - left.currentA);
      return left.voltageV + fraction * (right.voltageV - left.voltageV);
    }
  }
  return Number.NaN;
}

function linearSlope(points) {
  if (points.length < 3) return Number.NaN;
  const xMean = average(points.map((point) => point.x));
  const yMean = average(points.map((point) => point.y));
  const numerator = points.reduce((sum, point) => sum + (point.x - xMean) * (point.y - yMean), 0);
  const denominator = points.reduce((sum, point) => sum + Math.pow(point.x - xMean, 2), 0);
  return numerator / denominator;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function clamp(value, min, max) {
  const number = Number(value);
  return Math.max(min, Math.min(max, Number.isFinite(number) ? number : min));
}
