export const damageControlRanges = {
  antennaAreaUm2: { min: 10, max: 50000 },
  gateAreaUm2: { min: 0.5, max: 100 },
  aspectRatio: { min: 0.5, max: 50 },
  oxideThicknessNm: { min: 1, max: 20 },
  dutyCycle: { min: 0.1, max: 0.9 }
};

const VACUUM_PERMITTIVITY_FM = 8.8541878128e-12;
const OXIDE_RELATIVE_PERMITTIVITY = 3.9;
const TEACHING_BREAKDOWN_FIELD_MV_CM = 12;

export function calculateAntennaRatio(input = {}) {
  return positive(input.antennaAreaUm2, 500) / positive(input.gateAreaUm2, 5);
}

export function createDamageState(input = {}) {
  const dutyCycle = clamp(input.dutyCycle, damageControlRanges.dutyCycle.min, damageControlRanges.dutyCycle.max, 0.5);
  const pulsePeriodUs = clamp(input.pulsePeriodUs, 2, 100, 10);
  const requestedTimeStepUs = clamp(input.timeStepUs, 0.1, 10, 1);
  const state = {
    antennaAreaUm2: clamp(input.antennaAreaUm2, damageControlRanges.antennaAreaUm2.min, damageControlRanges.antennaAreaUm2.max, 500),
    gateAreaUm2: clamp(input.gateAreaUm2, damageControlRanges.gateAreaUm2.min, damageControlRanges.gateAreaUm2.max, 5),
    aspectRatio: clamp(input.aspectRatio, damageControlRanges.aspectRatio.min, damageControlRanges.aspectRatio.max, 5),
    oxideThicknessNm: clamp(input.oxideThicknessNm, damageControlRanges.oxideThicknessNm.min, damageControlRanges.oxideThicknessNm.max, 5),
    durationUs: clamp(input.durationUs, 1, 1000, 100),
    requestedTimeStepUs,
    timeStepUs: input.pulsed === true
      ? Math.min(requestedTimeStepUs, pulsePeriodUs * Math.min(dutyCycle, 1 - dutyCycle) / 2)
      : requestedTimeStepUs,
    pulsed: input.pulsed === true,
    dutyCycle,
    pulsePeriodUs,
    antennaDiode: input.antennaDiode === true,
    plasmaPowerW: clamp(input.plasmaPowerW, 100, 3000, 800),
    ionEnergyEv: clamp(input.ionEnergyEv, 5, 500, 80),
    contaminationLevel: clamp(input.contaminationLevel, 0, 1, 0.15)
  };
  return { ...state, antennaRatio: calculateAntennaRatio(state) };
}

export function simulateCharging(input = {}) {
  const state = createDamageState(input);
  const electronShading = 1 - Math.exp(-state.aspectRatio / 8);
  const chargingRateVUs = 0.00008 * state.antennaRatio * (0.3 + electronShading);
  const diodeClampV = 12;
  const trace = [];
  let gatePotentialV = 0;
  let peakGatePotentialV = 0;

  for (let timeUs = 0; timeUs <= state.durationUs + state.timeStepUs / 2; timeUs += state.timeStepUs) {
    const phaseUs = timeUs % state.pulsePeriodUs;
    const plasmaOn = !state.pulsed || phaseUs < state.pulsePeriodUs * state.dutyCycle;
    if (timeUs > 0) {
      if (plasmaOn) {
        gatePotentialV += chargingRateVUs * state.timeStepUs;
      } else {
        gatePotentialV *= Math.exp(-0.35 * state.timeStepUs);
      }
      if (state.antennaDiode) gatePotentialV = Math.min(gatePotentialV, diodeClampV);
    }
    peakGatePotentialV = Math.max(peakGatePotentialV, gatePotentialV);
    trace.push({ timeUs, plasmaOn, gatePotentialV });
  }

  const oxideFieldMvCm = peakGatePotentialV / state.oxideThicknessNm * 10;
  const gateCapacitanceF = OXIDE_RELATIVE_PERMITTIVITY * VACUUM_PERMITTIVITY_FM * state.gateAreaUm2 * 1e-12 / (state.oxideThicknessNm * 1e-9);
  trace.forEach((point) => { point.accumulatedChargePc = gateCapacitanceF * point.gatePotentialV * 1e12; });
  const terminalChargePc = gateCapacitanceF * gatePotentialV * 1e12;
  const peakChargePc = gateCapacitanceF * peakGatePotentialV * 1e12;
  const breakdownExceeded = oxideFieldMvCm >= TEACHING_BREAKDOWN_FIELD_MV_CM;
  const charging = clamp01(oxideFieldMvCm / 12);
  const uvVuvDose = state.plasmaPowerW * state.durationUs / 1e5;
  const ionBombardment = state.ionEnergyEv / 500 * (state.pulsed ? state.dutyCycle : 1);
  const contamination = state.contaminationLevel;
  const arcing = clamp01((peakGatePotentialV - 18) / 45 + state.antennaRatio / 10000 * 0.25);
  const riskScore = breakdownExceeded ? 100 : Math.min(100, 100 * (
    0.46 * charging +
    0.16 * clamp01(uvVuvDose / 20) +
    0.14 * clamp01(ionBombardment) +
    0.1 * contamination +
    0.14 * arcing
  ));

  return {
    state,
    trace,
    electronShading,
    terminalGatePotentialV: gatePotentialV,
    peakGatePotentialV,
    terminalChargePc,
    peakChargePc,
    gateCapacitanceF,
    oxideFieldMvCm,
    breakdownExceeded,
    riskScore,
    estimatedLifetimeIndex: breakdownExceeded ? null : Math.max(0, 100 - riskScore),
    damageModes: { charging, uvVuvDose, ionBombardment, contamination, arcing },
    limitations: [
      "天線二極體只鉗制電氣充電，不能阻擋 UV/VUV 光子造成的氧化層與介面損傷。",
      "此教學模型呈現相對趨勢，不取代產品級天線規則、TCAD 或可靠度壽命模型。"
    ]
  };
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function positive(value, fallback) {
  const number = parseFiniteNumber(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function clamp(value, min, max, fallback = min) {
  const number = parseFiniteNumber(value);
  return Math.max(min, Math.min(max, Number.isFinite(number) ? number : fallback));
}

function parseFiniteNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}
