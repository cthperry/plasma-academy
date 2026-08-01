import { spectra } from "../../data/spectra.js";

export const oesProcesses = {
  oxide: { label: "SiO₂ 蝕刻", electronTemperatureEv: 3.2, species: { CO: 30, F: 8, O: 1, C2: 0.8, OH: 0.15, N2: 0.1, Ar: 1 } },
  poly: { label: "Poly-Si 蝕刻", electronTemperatureEv: 3.4, species: { Si: 35, Cl: 9, Br: 7, F: 3, Ar: 1 } },
  ash: { label: "光阻灰化", electronTemperatureEv: 3, species: { O: 30, CO: 16, H: 3, OH: 2, Ar: 1 } },
  clean: { label: "NF₃ 腔體清潔", electronTemperatureEv: 3.3, progressSpecies: "Si", species: { Si: 40, F: 6, N2: 2, Ar: 1 } },
  leak: { label: "洩漏監測", electronTemperatureEv: 3, species: { OH: 35, N2: 30, O: 4, H: 2, Ar: 1 } }
};

export const oesControlRanges = {
  powerW: { min: 200, max: 1500, step: 25 },
  pressureMtorr: { min: 5, max: 80, step: 1 },
  windowTransmission: { min: 0.2, max: 1, step: 0.05 },
  argonFraction: { min: 0.005, max: 0.1, step: 0.005 }
};

export function createOesState(input = {}) {
  const process = Object.hasOwn(oesProcesses, input.process) ? input.process : "oxide";
  const powerW = clamp(input.powerW ?? 500, oesControlRanges.powerW.min, oesControlRanges.powerW.max);
  const pressureMtorr = clamp(input.pressureMtorr ?? 20, oesControlRanges.pressureMtorr.min, oesControlRanges.pressureMtorr.max);
  const baseElectronTemperatureEv = oesProcesses[process].electronTemperatureEv;
  return {
    process,
    powerW,
    pressureMtorr,
    electronTemperatureEv: baseElectronTemperatureEv * Math.pow(powerW / 500, 0.05) * Math.pow(20 / pressureMtorr, 0.08),
    windowTransmission: clamp(input.windowTransmission ?? 1, oesControlRanges.windowTransmission.min, oesControlRanges.windowTransmission.max),
    argonFraction: clamp(input.argonFraction ?? 0.03, oesControlRanges.argonFraction.min, oesControlRanges.argonFraction.max)
  };
}

export function lineIntensity(lineId, input = {}) {
  const state = createOesState(input);
  const line = spectra.find((item) => item.id === lineId);
  if (!line) throw new RangeError(`找不到 OES 譜線：${lineId}`);
  const process = oesProcesses[state.process];
  const abundance = line.species === "Ar" ? state.argonFraction * 100 : (process.species[line.species] ?? 0.02);
  const powerFactor = Math.pow(state.powerW / 500, 0.95);
  const pressureFactor = Math.pow(20 / state.pressureMtorr, 0.08);
  const excitationFactor = Math.exp(-line.excitationThresholdEv / state.electronTemperatureEv);
  return abundance * line.relativeIntensity * powerFactor * pressureFactor * excitationFactor * state.windowTransmission;
}

export function generateSpectrum(input = {}) {
  const state = createOesState(input);
  return {
    state,
    lines: spectra.map((line) => ({
      id: line.id,
      species: line.species,
      wavelengthNm: line.wavelengthNm,
      intensity: lineIntensity(line.id, state),
      actinometryReference: Boolean(line.actinometryReference)
    }))
  };
}

export function calculateActinometry(input = {}, analyteId = "f-703.7", referenceId = "ar-750.4") {
  const state = createOesState(input);
  const analyte = spectra.find((line) => line.id === analyteId);
  const reference = spectra.find((line) => line.id === referenceId);
  if (!analyte || !reference) throw new RangeError("Actinometry 譜線 ID 無效。");
  const thresholdDifferenceEv = Math.abs(analyte.excitationThresholdEv - reference.excitationThresholdEv);
  const valid = Boolean(reference.actinometryReference) && thresholdDifferenceEv <= 1.5;
  return {
    analyteId,
    referenceId,
    ratio: lineIntensity(analyteId, state) / lineIntensity(referenceId, state),
    thresholdDifferenceEv,
    valid,
    reason: valid ? "激發閾值相近且參考線已標示為內標。" : "激發閾值差距過大，或參考線未標示為 actinometry 內標。"
  };
}

export function evaluateOesSensitivity(input = {}) {
  const process = Object.hasOwn(oesProcesses, input.process) ? input.process : "oxide";
  const analyteId = input.analyteId ?? "f-703.7";
  const referenceId = input.referenceId ?? "ar-750.4";
  const powerLow = createOesState({ process, powerW: 300 });
  const powerHigh = createOesState({ process, powerW: 1200 });
  const windowLow = createOesState({ process, windowTransmission: 0.35 });
  const windowHigh = createOesState({ process, windowTransmission: 0.95 });
  return {
    power: compareStates(powerLow, powerHigh, analyteId, referenceId),
    window: compareStates(windowLow, windowHigh, analyteId, referenceId)
  };
}

function compareStates(low, high, analyteId, referenceId) {
  const absoluteLow = lineIntensity(analyteId, low);
  const absoluteHigh = lineIntensity(analyteId, high);
  const ratioLow = calculateActinometry(low, analyteId, referenceId).ratio;
  const ratioHigh = calculateActinometry(high, analyteId, referenceId).ratio;
  return {
    absoluteChange: Math.abs(absoluteHigh / absoluteLow - 1),
    ratioChange: Math.abs(ratioHigh / ratioLow - 1)
  };
}

function clamp(value, min, max) {
  const number = Number(value);
  return Math.max(min, Math.min(max, Number.isFinite(number) ? number : min));
}
