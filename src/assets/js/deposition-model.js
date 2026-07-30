export function evaluatePealdCycle(input = {}) {
  const mode = input.mode === "pecvd" ? "pecvd" : "peald";
  const cycles = clamp(input.cycles ?? 100, 1, 500);
  const pulseSeconds = clamp(input.pulseSeconds ?? 8, 0.1, 20);
  const purgeSeconds = clamp(input.purgeSeconds ?? 6, 0, 20);
  const aspectRatio = clamp(input.aspectRatio ?? 6, 1, 20);

  if (mode === "pecvd") {
    const topGrowthNm = cycles * 0.10;
    const sideCoverage = clamp(Math.exp(-0.12 * aspectRatio) * 100, 8, 82);
    const bottomCoverage = clamp(Math.exp(-0.18 * aspectRatio) * 100, 4, 68);
    return {
      mode,
      cycles,
      topThicknessNm: topGrowthNm,
      sideThicknessNm: topGrowthNm * sideCoverage / 100,
      bottomThicknessNm: topGrowthNm * bottomCoverage / 100,
      stepCoveragePercent: bottomCoverage,
      growthPerCycleNm: 0.10,
      saturationPercent: 0,
      purgeEfficiencyPercent: 0,
      cvdFractionPercent: 100,
      classification: bottomCoverage < 50 ? "PECVD 非保形沉積" : "PECVD 有限覆蓋"
    };
  }

  const topSaturation = 1 - Math.exp(-pulseSeconds / 0.9);
  const bottomSaturation = 1 - Math.exp(-pulseSeconds / (0.7 + 0.16 * aspectRatio));
  const purgeEfficiency = 1 - Math.exp(-purgeSeconds / (0.75 + 0.045 * aspectRatio));
  const cvdFraction = Math.pow(1 - purgeEfficiency, 1.25);
  const selfLimitedGpc = 0.08 * topSaturation;
  const parasiticTopGpc = 0.12 * cvdFraction;
  const topGpc = selfLimitedGpc + parasiticTopGpc;
  const transportCoverage = bottomSaturation / Math.max(topSaturation, 0.001);
  const bottomGpc = 0.08 * bottomSaturation + parasiticTopGpc * Math.exp(-0.22 * aspectRatio);
  const sideGpc = 0.08 * Math.sqrt(topSaturation * bottomSaturation) + parasiticTopGpc * Math.exp(-0.11 * aspectRatio);
  const stepCoveragePercent = clamp(bottomGpc / topGpc * 100, 0, 100);
  return {
    mode,
    cycles,
    topThicknessNm: topGpc * cycles,
    sideThicknessNm: sideGpc * cycles,
    bottomThicknessNm: bottomGpc * cycles,
    stepCoveragePercent,
    growthPerCycleNm: topGpc,
    saturationPercent: topSaturation * 100,
    bottomSaturationPercent: bottomSaturation * 100,
    purgeEfficiencyPercent: purgeEfficiency * 100,
    cvdFractionPercent: cvdFraction * 100,
    transportCoveragePercent: transportCoverage * 100,
    classification: cvdFraction > 0.18 ? "Purge 不足：寄生 CVD" : stepCoveragePercent >= 95 ? "PEALD 保形窗口" : "前驅物脈衝不足"
  };
}

export function evaluateGapFill(input = {}) {
  const aspectRatio = clamp(input.aspectRatio ?? 4, 1, 10);
  const dsRatio = clamp(input.dsRatio ?? 5, 1, 20);
  const timePercent = clamp(input.timePercent ?? 70, 0, 100);
  const progress = timePercent / 100;
  const pecvdCoverage = clamp(86 - aspectRatio * 13, 8, 78);
  const pecvdCusp = clamp(progress * aspectRatio * 11.5, 0, 95);
  const pecvdVoid = aspectRatio > 3 && pecvdCusp > 30;

  const sputterShare = 1 / dsRatio;
  const netDeposition = clamp(1 - sputterShare * 1.45, -0.3, 1);
  const cuspRemoval = clamp(sputterShare * 5.2, 0, 1.25);
  const hdpCusp = clamp(progress * aspectRatio * 9 * (1 - cuspRemoval), 0, 96);
  const hdpWindow = aspectRatio <= 6 && dsRatio >= 2.3 && dsRatio <= 8.5;
  const hdpVoid = !hdpWindow && progress > 0.55 && (aspectRatio > 6 || dsRatio > 8.5);
  const hdpFillPercent = clamp(progress * 118 * Math.max(0, netDeposition) * (hdpWindow ? 1 : 0.64), 0, 100);
  const hdpClassification = netDeposition <= 0 ? "濺鍍過強：無淨填充" : hdpVoid ? "HDP 夾 void" : hdpWindow ? "HDP 填溝窗口" : "HDP 邊界條件";

  return {
    aspectRatio,
    dsRatio,
    timePercent,
    pecvd: {
      stepCoveragePercent: pecvdCoverage,
      cuspPercent: pecvdCusp,
      fillPercent: clamp(progress * (92 - aspectRatio * 5), 0, 100),
      void: pecvdVoid,
      classification: pecvdVoid ? "PECVD 夾 void" : "PECVD 尚未封口"
    },
    hdp: {
      stepCoveragePercent: clamp(pecvdCoverage + cuspRemoval * 58, 20, 100),
      cuspPercent: hdpCusp,
      fillPercent: hdpFillPercent,
      void: hdpVoid,
      netDeposition,
      classification: hdpClassification
    }
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
