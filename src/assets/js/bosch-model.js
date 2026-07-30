export function evaluateBoschProcess(options = {}) {
  const depositionSeconds = clamp(options.depositionSeconds ?? 3, 0, 10);
  const etchSeconds = clamp(options.etchSeconds ?? 7, 1, 15);
  const biasW = clamp(options.biasW ?? 220, 0, 500);
  const cycles = Math.round(clamp(options.cycles ?? 40, 1, 120));
  const purgeSeconds = 0.8;
  const passivation = 1 - Math.exp(-depositionSeconds / 2.4);
  const bottomClear = clamp((biasW - 35) / 240, 0, 1.4);
  const transportPenalty = 1 / (1 + cycles * etchSeconds * 0.0009);
  const etchPerCycleUm = etchSeconds * 0.115 * Math.sqrt(Math.max(0, biasW - 20) / 200) * Math.min(1, bottomClear) * transportPenalty;
  const sideEtchPerCycleUm = depositionSeconds === 0
    ? etchSeconds * 0.095
    : etchSeconds * 0.048 * Math.pow(1 - passivation, 1.35) * (1 + Math.max(0, 120 - biasW) / 260);
  const scallopDepthUm = depositionSeconds === 0 ? sideEtchPerCycleUm : sideEtchPerCycleUm * (0.85 + etchSeconds / 18);
  const totalDepthUm = etchPerCycleUm * cycles;
  const totalSeconds = cycles * (depositionSeconds + etchSeconds + purgeSeconds);
  const effectiveRateUmMin = totalDepthUm / totalSeconds * 60;
  const isotropic = depositionSeconds < 0.25;
  const regime = isotropic ? "isotropic" : bottomClear < 0.45 ? "bottom-stop" : passivation < 0.35 ? "undercut" : "bosch-window";
  const sidewallAngleDeg = isotropic
    ? 68
    : clamp(90 - sideEtchPerCycleUm / Math.max(0.02, etchPerCycleUm) * 15, 72, 90);
  return {
    depositionSeconds,
    etchSeconds,
    biasW,
    cycles,
    passivation,
    bottomClear,
    etchPerCycleUm,
    sideEtchPerCycleUm,
    scallopDepthUm,
    totalDepthUm,
    totalSeconds,
    effectiveRateUmMin,
    sidewallAngleDeg,
    regime
  };
}

export function boschCycleAt(elapsedSeconds, options = {}) {
  const depositionSeconds = clamp(options.depositionSeconds ?? 3, 0, 10);
  const etchSeconds = clamp(options.etchSeconds ?? 7, 1, 15);
  const purgeSeconds = 0.8;
  const cycleSeconds = depositionSeconds + etchSeconds + purgeSeconds;
  const local = ((elapsedSeconds % cycleSeconds) + cycleSeconds) % cycleSeconds;
  if (depositionSeconds > 0 && local < depositionSeconds) return { phase: "passivation", progress: local / depositionSeconds };
  if (local < depositionSeconds + purgeSeconds) return { phase: "purge", progress: (local - depositionSeconds) / purgeSeconds };
  return { phase: "etch", progress: (local - depositionSeconds - purgeSeconds) / etchSeconds };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
