export const aleControlRanges = {
  ionEnergyEv: { min: 0, max: 150 },
  modificationTimeS: { min: 0.02, max: 3 },
  purgeTimeS: { min: 0.02, max: 3 },
  cycles: { min: 1, max: 100 }
};

export function createAleState(input = {}) {
  return {
    ionEnergyEv: clamp(input.ionEnergyEv, 0, 150, 40),
    modificationTimeS: clamp(input.modificationTimeS, 0.02, 3, 1.2),
    purgeTimeS: clamp(input.purgeTimeS, 0.02, 3, 1),
    cycles: Math.round(clamp(input.cycles, 1, 100, 20)),
    removalThresholdEv: clamp(input.removalThresholdEv, 10, 40, 20),
    sputterThresholdEv: clamp(input.sputterThresholdEv, 45, 100, 60),
    saturatedEpcNm: clamp(input.saturatedEpcNm, 0.03, 0.3, 0.12)
  };
}

export function calculateAleCycle(input = {}) {
  const state = createAleState(input);
  const coverage = 1 - Math.exp(-state.modificationTimeS / 0.35);
  const purgeCompleteness = 1 - Math.exp(-state.purgeTimeS / 0.25);
  const chemicalOnlyNm = 0.0025 * coverage;
  let coupledEpcNm = 0;
  let sputterContributionNm = 0;
  let regime = "below-window";

  if (state.ionEnergyEv >= state.removalThresholdEv && state.ionEnergyEv < state.removalThresholdEv + 5) {
    const ramp = (state.ionEnergyEv - state.removalThresholdEv) / 5;
    coupledEpcNm = state.saturatedEpcNm * coverage * purgeCompleteness * ramp;
    regime = "threshold-ramp";
  } else if (state.ionEnergyEv >= state.removalThresholdEv + 5 && state.ionEnergyEv <= state.sputterThresholdEv) {
    coupledEpcNm = state.saturatedEpcNm * coverage * purgeCompleteness;
    regime = "ale-window";
  } else if (state.ionEnergyEv > state.sputterThresholdEv) {
    coupledEpcNm = state.saturatedEpcNm * coverage * purgeCompleteness;
    sputterContributionNm = 0.002 * (state.ionEnergyEv - state.sputterThresholdEv);
    regime = "continuous-sputter";
  }

  // β 必須包含未經表面改質也會發生的直接濺鍍，否則高能區會產生虛假的高協同度。
  const ionOnlyNm = sputterContributionNm;

  return {
    state,
    coverage,
    purgeCompleteness,
    chemicalOnlyNm,
    ionOnlyNm,
    coupledEpcNm,
    sputterContributionNm,
    epcNm: coupledEpcNm + sputterContributionNm,
    regime,
    selfLimited: regime === "ale-window"
  };
}

export function generateAleRun(input = {}) {
  const state = createAleState(input);
  const cycle = calculateAleCycle(state);
  const residualFraction = Math.exp(-state.purgeTimeS / 0.1);
  const modificationDeficit = Math.exp(-state.modificationTimeS / 0.18);
  const cycles = Array.from({ length: state.cycles }, (_, index) => {
    const progress = state.cycles === 1 ? 0 : index / (state.cycles - 1);
    const memoryLoss = residualFraction * 0.28 * progress;
    const incompleteLayerVariation = modificationDeficit * 0.42 * Math.sin((index + 1) * 2.17);
    return {
      cycle: index + 1,
      epcNm: Math.max(0, cycle.epcNm * (1 - memoryLoss) * (1 + incompleteLayerVariation)),
      cumulativeEtchNm: 0
    };
  });
  let cumulative = 0;
  for (const item of cycles) {
    cumulative += item.epcNm;
    item.cumulativeEtchNm = cumulative;
  }
  return {
    state,
    steps: ["modify", "purge-1", "remove", "purge-2"],
    cycles,
    cycle,
    totalEtchNm: cumulative
  };
}

export function calculateAleSynergy(input = {}) {
  const cycle = calculateAleCycle(input);
  const epcNm = cycle.epcNm;
  const alphaNm = cycle.chemicalOnlyNm;
  const betaNm = cycle.ionOnlyNm;
  return {
    epcNm,
    alphaNm,
    betaNm,
    synergyPercent: epcNm > 0 ? (epcNm - alphaNm - betaNm) / epcNm * 100 : 0
  };
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
