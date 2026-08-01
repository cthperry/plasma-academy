export const pulseControlRanges = {
  frequencyKhz: { min: 0.1, max: 10 },
  dutyCycle: { min: 0.1, max: 0.9 },
  phaseDegrees: { min: 0, max: 360 }
};

export function createPulseState(input = {}) {
  const mode = ["source", "bias", "synchronized"].includes(input.mode) ? input.mode : "synchronized";
  return {
    frequencyKhz: clamp(input.frequencyKhz, 0.1, 10, 1),
    dutyCycle: clamp(input.dutyCycle, 0.1, 0.9, 0.5),
    mode,
    phaseDegrees: clamp(input.phaseDegrees, 0, 360, 0),
    electronegative: input.electronegative === true,
    sourcePowerW: clamp(input.sourcePowerW, 100, 3000, 1000),
    biasPowerW: clamp(input.biasPowerW, 0, 1000, 250),
    samples: Math.round(clamp(input.samples, 200, 1000, 300))
  };
}

export function generatePulseWaveforms(input = {}) {
  const state = createPulseState(input);
  return simulatePulse(state, false);
}

function simulatePulse(state, continuous) {
  const periodUs = 1000 / state.frequencyKhz;
  const dtUs = periodUs / state.samples;
  const timeConstantsUs = {
    electronTemperature: 20,
    electronDensity: 250,
    chargeNeutralization: 60
  };
  const points = [];
  const sourceScale = Math.sqrt(state.sourcePowerW / 1000);
  const biasScale = Math.sqrt(Math.max(state.biasPowerW, 1) / 250);
  const sourceTargets = {
    electronDensityNormalized: 0.15 + 0.85 * sourceScale,
    electronTemperatureEv: 0.55 + 3.45 * (state.sourcePowerW / 1000) ** 0.2
  };
  let electronDensityNormalized = sourceTargets.electronDensityNormalized;
  let electronTemperatureEv = sourceTargets.electronTemperatureEv;
  let negativeIonDensityNormalized = 0.04;
  let bottomCharge = 0;
  let overlapSamples = 0;

  for (let index = 0; index < state.samples; index += 1) {
    const timeUs = index * dtUs;
    const phase = (timeUs / periodUs) % 1;
    const sourceOn = continuous || state.mode === "bias" ? true : phase < state.dutyCycle;
    const biasPhase = (phase - state.phaseDegrees / 360 + 1) % 1;
    const biasOn = continuous || state.mode === "source" ? true : biasPhase < state.dutyCycle;
    if (sourceOn && biasOn) overlapSamples += 1;

    if (index > 0) {
      electronTemperatureEv = relax(electronTemperatureEv, sourceOn ? sourceTargets.electronTemperatureEv : 0.55, dtUs, sourceOn ? timeConstantsUs.electronTemperature * 0.5 : timeConstantsUs.electronTemperature);
      electronDensityNormalized = relax(electronDensityNormalized, sourceOn ? sourceTargets.electronDensityNormalized : 0.12, dtUs, sourceOn ? timeConstantsUs.electronDensity * 0.35 : timeConstantsUs.electronDensity);
      const negativeTarget = state.electronegative && !sourceOn ? 0.75 : 0.04;
      negativeIonDensityNormalized = relax(negativeIonDensityNormalized, negativeTarget, dtUs, 90);
      if (biasOn) bottomCharge += dtUs / periodUs * biasScale * (0.45 + 0.55 * electronDensityNormalized);
      if (!biasOn) {
        const neutralizationBoost = (state.electronegative ? 1.8 : 1) * (1 + negativeIonDensityNormalized);
        bottomCharge *= Math.exp(-dtUs / timeConstantsUs.chargeNeutralization * neutralizationBoost);
      }
    }

    points.push({
      timeUs,
      sourceOn,
      biasOn,
      sourcePower: sourceOn ? state.sourcePowerW : 0,
      biasPower: biasOn ? state.biasPowerW : 0,
      electronDensityNormalized,
      electronTemperatureEv,
      sheathPotentialNormalized: biasOn ? Math.min(2, biasScale) : sourceOn ? 0.35 : 0.05,
      negativeIonDensityNormalized,
      bottomCharge
    });
  }

  return {
    state,
    periodUs,
    points,
    overlapFraction: overlapSamples / state.samples,
    timeConstantsUs,
    peakCharge: Math.max(...points.map((point) => point.bottomCharge)),
    terminalCharge: points.at(-1).bottomCharge,
    units: {
      timeUs: "µs",
      sourcePower: "W",
      biasPower: "W",
      electronDensityNormalized: "relative",
      electronTemperatureEv: "eV",
      sheathPotentialNormalized: "relative",
      negativeIonDensityNormalized: "relative",
      bottomCharge: "relative"
    }
  };
}

export function comparePulseCharging(input = {}) {
  const state = createPulseState(input);
  const pulsed = simulatePulse(state, false);
  const continuous = simulatePulse(state, true);
  return {
    pulsed: { peakCharge: pulsed.peakCharge, terminalCharge: pulsed.terminalCharge },
    continuous: { peakCharge: continuous.peakCharge, terminalCharge: continuous.terminalCharge }
  };
}

function relax(value, target, dt, tau) {
  return target + (value - target) * Math.exp(-dt / tau);
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
