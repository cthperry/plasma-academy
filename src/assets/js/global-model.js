const BOLTZMANN_JK = 1.380649e-23;
const ELEMENTARY_CHARGE_C = 1.602176634e-19;
const REFERENCE_PRESSURE_LENGTH = 66.67;
const REFERENCE_IONIZATION = Math.sqrt(3.2) * Math.exp(-15 / 3.2);

export const globalModelGases = {
  Ar: { label: "Ar", activationEv: 15, rateFactor: 1, energyCostEv: 38, radicalYield: 0.12, ionMassKg: 6.6335209e-26 },
  O2: { label: "O₂", activationEv: 13.2, rateFactor: 0.78, energyCostEv: 52, radicalYield: 0.7, ionMassKg: 5.3134e-26 },
  CF4: { label: "CF₄", activationEv: 17.5, rateFactor: 0.86, energyCostEv: 68, radicalYield: 0.9, ionMassKg: 1.4615e-25 }
};

export function createGlobalState(input = {}) {
  return {
    gas: Object.hasOwn(globalModelGases, input.gas) ? input.gas : "Ar",
    pressureMtorr: clamp(input.pressureMtorr, 2, 100, 20),
    radiusCm: clamp(input.radiusCm, 5, 50, 20),
    heightCm: clamp(input.heightCm, 3, 50, 10),
    absorbedPowerW: clamp(input.absorbedPowerW, 50, 3000, 500),
    flowSccm: clamp(input.flowSccm, 5, 1000, 100),
    gasTemperatureK: clamp(input.gasTemperatureK, 250, 800, 350)
  };
}

export function solveGlobalModel(input = {}) {
  const state = createGlobalState(input);
  const gas = globalModelGases[state.gas];
  const volumeCm3 = Math.PI * state.radiusCm ** 2 * state.heightCm;
  const wallAreaCm2 = 2 * Math.PI * state.radiusCm * state.heightCm + 2 * Math.PI * state.radiusCm ** 2;
  const effectiveLengthCm = volumeCm3 / wallAreaCm2;
  const pressureLength = state.pressureMtorr * effectiveLengthCm;
  const particleLossNormalized = REFERENCE_IONIZATION;
  const particleProduction = (temperatureEv) => pressureLength / REFERENCE_PRESSURE_LENGTH
    * gas.rateFactor * Math.sqrt(temperatureEv) * Math.exp(-gas.activationEv / temperatureEv);
  const electronTemperatureEv = solveIntersection(particleProduction, particleLossNormalized, 0.8, 20);
  const bohmVelocityMS = Math.sqrt(electronTemperatureEv * ELEMENTARY_CHARGE_C / gas.ionMassKg);
  const lossFrequencyS = 0.61 * bohmVelocityMS / (effectiveLengthCm / 100);
  const energyLossJ = (gas.energyCostEv + 2.5 * electronTemperatureEv) * ELEMENTARY_CHARGE_C;
  const volumeM3 = volumeCm3 * 1e-6;
  const electronDensityM3 = state.absorbedPowerW / (volumeM3 * lossFrequencyS * energyLossJ);
  const electronDensityCm3 = electronDensityM3 / 1e6;
  const ionFluxCm2s = 0.61 * electronDensityCm3 * bohmVelocityMS * 100;
  const volumeL = volumeCm3 / 1000;
  const residenceTimeS = 79 * (state.pressureMtorr / 1000) * volumeL / state.flowSccm;
  const radicalDensityCm3 = electronDensityCm3 * gas.radicalYield * (1 - Math.exp(-residenceTimeS / 0.12));
  const neutralDensityCm3 = state.pressureMtorr * 0.133322368 / (BOLTZMANN_JK * state.gasTemperatureK) / 1e6;
  const temperatures = Array.from({ length: 97 }, (_, index) => 0.8 + index * 0.2);
  temperatures.push(electronTemperatureEv);
  temperatures.sort((a, b) => a - b);
  const balanceCurves = temperatures.map((temperatureEv) => ({
    temperatureEv,
    particleProductionNormalized: particleProduction(temperatureEv),
    particleLossNormalized,
    residual: particleProduction(temperatureEv) - particleLossNormalized
  }));

  return {
    state,
    volumeCm3,
    wallAreaCm2,
    effectiveLengthCm,
    pressureLength,
    neutralDensityCm3,
    electronTemperatureEv,
    electronDensityCm3,
    ionFluxCm2s,
    radicalDensityCm3,
    residenceTimeS,
    balanceCurves,
    balanceUnits: { temperatureEv: "eV", particleProductionNormalized: "relative", particleLossNormalized: "relative", residual: "relative" },
    limitations: [
      "0-D 模型只提供腔體平均趨勢，不解析空間不均勻、EEDF、鞘層或表面反應網路。",
      "本站係數只用於教學趨勢，不可把輸出絕對值用作設備規格、recipe 放行或產品保證。"
    ]
  };
}

export function scanGlobalModel(input, parameter, values) {
  if (!["absorbedPowerW", "pressureMtorr", "radiusCm", "heightCm", "flowSccm"].includes(parameter)) throw new RangeError(`不支援的 0-D 掃描參數：${parameter}`);
  return values.map((inputValue) => ({ inputValue, ...solveGlobalModel({ ...input, [parameter]: inputValue }) }));
}

function solveIntersection(production, loss, lower, upper) {
  let low = lower;
  let high = upper;
  if (production(low) >= loss) return low;
  if (production(high) <= loss) return high;
  for (let index = 0; index < 80; index += 1) {
    const middle = (low + high) / 2;
    if (production(middle) < loss) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

function clamp(value, min, max, fallback) {
  const number = parseFiniteNumber(value);
  return Math.max(min, Math.min(max, Number.isFinite(number) ? number : fallback));
}

function parseFiniteNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}
