import { radicalFlux } from "./package-model.js";

export const pcbTargets = {
  desmear: { label: "Desmear 除膠渣", min: 3, max: 8 },
  etchback: { label: "Etchback 咬蝕", min: 12, max: 25 }
};

const resinReferenceRates = [
  [0, 0.3],
  [10, 4.7 / 15],
  [20, 4.8 / 15],
  [30, 4.7 / 15],
  [50, 4.1 / 15],
  [80, 0.21]
];

export function pcbFlux(powerW, pressureTorr) {
  return radicalFlux(powerW, pressureTorr, "lp");
}

export function resinRemovalRate(cf4Percent, powerW = 300, pressureTorr = 0.4) {
  return interpolateResinRate(clamp(cf4Percent, 0, 80)) * pcbFlux(powerW, pressureTorr);
}

export function glassRemovalRate(cf4Percent, powerW = 300, pressureTorr = 0.4) {
  return 0.016 * clamp(cf4Percent, 0, 80) * pcbFlux(powerW, pressureTorr);
}

export function evaluatePcbProcess({ cf4Percent = 20, powerW = 300, pressureTorr = 0.4, timeMinutes = 15, targetMode = "desmear" } = {}) {
  const target = pcbTargets[targetMode] ?? pcbTargets.desmear;
  const safeTime = Math.max(0, timeMinutes);
  const resinRateUmPerMin = resinRemovalRate(cf4Percent, powerW, pressureTorr);
  const glassRateUmPerMin = glassRemovalRate(cf4Percent, powerW, pressureTorr);
  const resinDepthUm = resinRateUmPerMin * safeTime;
  const glassDepthUm = glassRateUmPerMin * safeTime;
  const flushnessUm = resinDepthUm - glassDepthUm;
  const depthPass = resinDepthUm >= target.min && resinDepthUm <= target.max;
  const flushnessPass = Math.abs(flushnessUm) <= 0.5;
  const result = {
    cf4Percent: clamp(cf4Percent, 0, 80),
    powerW,
    pressureTorr,
    timeMinutes: safeTime,
    targetMode,
    target,
    depthWindow: { min: target.min, max: target.max },
    flux: pcbFlux(powerW, pressureTorr),
    resinRateUmPerMin,
    glassRateUmPerMin,
    resinDepthUm,
    glassDepthUm,
    flushnessUm,
    depthPass,
    flushnessPass
  };
  result.verdict = pcbVerdict(result);
  return result;
}

export function bestCf4Fraction(options = {}) {
  let best = null;
  for (let cf4Percent = 0; cf4Percent <= 50; cf4Percent += 1) {
    const result = evaluatePcbProcess({ ...options, cf4Percent });
    if (!best || Math.abs(result.flushnessUm) < Math.abs(best.flushnessUm)) best = result;
  }
  return best;
}

export function pcbVerdict({ depthPass, flushnessPass, flushnessUm, target }) {
  const flushness = flushnessUm > 0.5
    ? `玻纖突出 ${flushnessUm.toFixed(1)} um，flushness 不合格。`
    : flushnessUm < -0.5
      ? `玻纖凹陷 ${Math.abs(flushnessUm).toFixed(1)} um，flushness 不合格。`
      : "玻纖與樹脂接近平齊。";
  if (depthPass && flushnessPass) return `${target.label}：深度與 flushness 均通過教學判準。`;
  if (depthPass) return `${target.label}：深度通過，但 ${flushness}`;
  return `${target.label}：深度不在 ${target.min}-${target.max} um 窗內；${flushness}`;
}

function interpolateResinRate(cf4Percent) {
  for (let index = 1; index < resinReferenceRates.length; index += 1) {
    const [upperCf4, upperRate] = resinReferenceRates[index];
    const [lowerCf4, lowerRate] = resinReferenceRates[index - 1];
    if (cf4Percent <= upperCf4) {
      const fraction = (cf4Percent - lowerCf4) / (upperCf4 - lowerCf4);
      return lowerRate + (upperRate - lowerRate) * fraction;
    }
  }
  return resinReferenceRates.at(-1)[1];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}
