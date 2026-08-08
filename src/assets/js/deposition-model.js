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
  const transport = traceBallisticTransport(aspectRatio);

  const sputterShare = 1 / dsRatio;
  const netDeposition = clamp(1 - sputterShare * 1.45, -0.3, 1);
  const cuspRemoval = clamp(sputterShare * 5.2, 0, 1.25);
  const hdpCusp = clamp(progress * aspectRatio * 9 * (1 - cuspRemoval), 0, 96);
  const transportWindow = transport.bottomArrivalFraction >= 0.085;
  const hdpWindow = transportWindow && dsRatio >= 2.3 && dsRatio <= 8.5;
  const hdpVoid = !hdpWindow && progress > 0.55 && (!transportWindow || dsRatio > 8.5);
  const hdpFillPercent = clamp(progress * 118 * Math.max(0, netDeposition) * (hdpWindow ? 1 : 0.64), 0, 100);
  const hdpClassification = netDeposition <= 0 ? "濺鍍過強：無淨填充" : hdpVoid ? "HDP 夾 void" : hdpWindow ? "HDP 填溝窗口" : "HDP 邊界條件";
  const hdpProfile = buildGapProfile({ transport, progress, dsRatio, fillPercent: hdpFillPercent });

  return {
    aspectRatio,
    dsRatio,
    timePercent,
    spatialModel: "ballistic-los-2d-v1",
    transport,
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
      profile: hdpProfile,
      classification: hdpClassification
    }
  };
}

function traceBallisticTransport(aspectRatio) {
  const depth = aspectRatio;
  const halfWidth = 0.5;
  const rays = Array.from({ length: 61 }, (_, index) => {
    const angleDeg = -70 + index * (140 / 60);
    const angleRad = angleDeg * Math.PI / 180;
    const lateralAtBottom = Math.tan(angleRad) * depth;
    const reachesBottom = Math.abs(lateralAtBottom) <= halfWidth;
    const hitDepth = reachesBottom ? depth : halfWidth / Math.max(0.0001, Math.abs(Math.tan(angleRad)));
    const depositionWeight = Math.pow(Math.max(0, Math.cos(angleRad)), 2);
    const sputterWeight = Math.pow(Math.max(0, Math.cos(angleRad)), 10);
    return {
      angleDeg,
      weight: depositionWeight,
      sputterWeight,
      target: reachesBottom ? "bottom" : angleDeg < 0 ? "left-wall" : "right-wall",
      normalizedHitDepth: clamp(hitDepth / depth, 0, 1)
    };
  });
  const totalWeight = rays.reduce((sum, ray) => sum + ray.weight, 0);
  const bottomWeight = rays.filter((ray) => ray.target === "bottom").reduce((sum, ray) => sum + ray.weight, 0);
  const bottomArrivalFraction = bottomWeight / totalWeight;
  return {
    rays,
    bottomArrivalFraction,
    sidewallCaptureFraction: 1 - bottomArrivalFraction
  };
}

function buildGapProfile({ transport, progress, dsRatio, fillPercent }) {
  const depositionShare = dsRatio / (dsRatio + 1);
  const sputterShare = 1 / (dsRatio + 1);
  return Array.from({ length: 32 }, (_, index) => {
    const depth = index / 31;
    const nearby = transport.rays.filter((ray) => ray.target !== "bottom" && Math.abs(ray.normalizedHitDepth - depth) < 0.08);
    const sideArrival = nearby.reduce((sum, ray) => sum + ray.weight, 0) / Math.max(1, transport.rays.length);
    const shoulderSputter = Math.exp(-depth * 5) * sputterShare;
    const sideThickness = clamp(progress * (0.12 * depositionShare + sideArrival * 2.8 - shoulderSputter * 0.75), 0, 1);
    return {
      depth,
      leftThickness: sideThickness,
      rightThickness: sideThickness,
      bottomThickness: depth === 1 ? fillPercent / 100 * transport.bottomArrivalFraction : 0
    };
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
