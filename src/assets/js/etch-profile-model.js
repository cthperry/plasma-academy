export const profileRanges = {
  ion: { label: "離子能量", min: 0, max: 600, step: 10, unit: "eV" },
  spread: { label: "離子角度發散", min: 0, max: 15, step: 1, unit: "°" },
  passivation: { label: "鈍化強度", min: 0, max: 100, step: 1, unit: "%" },
  radicals: { label: "自由基通量", min: 0, max: 100, step: 1, unit: "%" },
  reflection: { label: "離子反射", min: 0, max: 100, step: 1, unit: "%" },
  overetch: { label: "過蝕刻", min: 0, max: 30, step: 1, unit: "%" }
};

export const profilePresets = [
  { id: "vertical", label: "垂直", expected: "垂直", why: "離子方向性與側壁鈍化位於製程窗中央。", ion: 350, spread: 3, passivation: 32, radicals: 55, reflection: 8, overetch: 10 },
  { id: "undercut", label: "Undercut", expected: "Undercut", why: "鈍化不足且自由基通量高，遮罩下方先被側蝕。", ion: 250, spread: 7, passivation: 5, radicals: 90, reflection: 5, overetch: 10 },
  { id: "taper", label: "Taper", expected: "Taper", why: "鈍化偏強，沿深度累積後使下方開口縮小。", ion: 350, spread: 2, passivation: 65, radicals: 65, reflection: 5, overetch: 15 },
  { id: "bowing", label: "Bowing", expected: "Bowing", why: "角度發散與反射把離子送到側壁中段，形成局部外鼓。", ion: 360, spread: 13, passivation: 50, radicals: 62, reflection: 82, overetch: 12 },
  { id: "microtrench", label: "Microtrench", expected: "Microtrench", why: "高能離子在底角反射聚焦，使溝底兩側刻得比中央深。", ion: 480, spread: 5, passivation: 25, radicals: 58, reflection: 96, overetch: 18 },
  { id: "footing", label: "Footing", expected: "Footing", why: "接近下層界面時鈍化收支轉正，底部形成縮頸。", ion: 400, spread: 3, passivation: 70, radicals: 58, reflection: 18, overetch: 30 },
  { id: "faceting", label: "Faceting", expected: "Faceting", why: "高離子能量與低遮罩保護使斜角肩部優先濺鍍。", ion: 600, spread: 8, passivation: 4, radicals: 46, reflection: 12, overetch: 18 },
  { id: "etch-stop", label: "Etch stop", expected: "Etch stop", why: "溝底聚合物沉積超過離子清膜能力，深度提前停止。", ion: 150, spread: 3, passivation: 96, radicals: 42, reflection: 0, overetch: 5 }
];

const linkedProfilePresets = [
  { id: "arde", label: "ARDE", expected: "ARDE", why: "多 CD 視圖比較同時間內不同開口的局部傳輸與覆蓋率。", ion: 350, spread: 5, passivation: 30, radicals: 55, reflection: 12, overetch: 10, multi: true }
];

export function profilePresetById(id) {
  return [...profilePresets, ...linkedProfilePresets].find((item) => item.id === id) ?? profilePresets[0];
}

export function evaluateEtchProfile(input) {
  const ion = clamp(input.ion, 0, 600);
  const spread = clamp(input.spread, 0, 15);
  const passivation = clamp(input.passivation, 0, 100);
  const radicals = clamp(input.radicals, 0, 100);
  const reflection = clamp(input.reflection, 0, 100);
  const overetch = clamp(input.overetch, 0, 30);
  const ionNorm = Math.sqrt(Math.max(0, ion - 25) / 325);
  const radicalNorm = radicals / 55;
  const passNorm = passivation / 100;
  const spreadNorm = spread / 15;
  const reflectionNorm = reflection / 100;

  const chemicalCoverage = radicalNorm / (0.55 + radicalNorm);
  const bottomRemoval = ionNorm * chemicalCoverage;
  const polymerBalance = passNorm * (0.85 + radicalNorm * 0.25) - ionNorm * (0.42 + spreadNorm * 0.08);
  const transport = clamp(1 - spreadNorm * 0.18 - passNorm * 0.22, 0.35, 1);
  const depthPercent = clamp((bottomRemoval * transport * 154) + overetch * 0.45 - Math.max(0, polymerBalance) * 128, 0, 112);

  const lateralDrive = radicalNorm * (1 - passNorm) * (0.45 + spreadNorm * 0.65);
  const undercut = clamp((lateralDrive - 0.47) * 88, 0, 82);
  const taper = clamp((passNorm - ionNorm * 0.22 - 0.28) * 92, 0, 48);
  const bowing = clamp(reflectionNorm * spreadNorm * passNorm * 74, 0, 42);
  const microtrench = clamp(reflectionNorm * ionNorm * (1 - passNorm) * Math.max(0, overetch - 8) * 1.9, 0, 32);
  const footing = clamp((passNorm - 0.48) * Math.max(0, overetch - 12) * 3.4, 0, 38);
  const faceting = clamp(Math.max(0, ion - 410) / 190 * (1 - passNorm) * (0.6 + spreadNorm) * 34, 0, 42);

  const maskOpening = 100 + faceting * 0.62;
  const topWidth = 100 + undercut + faceting * 0.2;
  const middleWidth = 100 + undercut * 0.46 + bowing - taper * 0.25;
  const bottomWidth = clamp(100 + undercut * 0.16 - taper - footing * 0.72, 35, 160);
  const ardeDepths = [0.58, 0.78, 1].map((factor, index) => clamp(depthPercent * factor * (1 - spreadNorm * index * 0.03), 0, 112));

  const metrics = {
    depthPercent,
    maskOpening,
    topWidth,
    middleWidth,
    bottomWidth,
    undercut,
    taper,
    bowing,
    microtrench,
    footing,
    faceting,
    polymerBalance,
    bottomRemoval,
    ardeDepths
  };
  metrics.shape = classifyEtchProfile(metrics);
  if (input.wallFlux) {
    metrics.spatialModel = "wall-flux-2d-v1";
    metrics.wallFlux = evaluateWallFlux({ ionNorm, spreadNorm, reflectionNorm, passNorm });
    metrics.profileBoundary = buildProfileBoundary(metrics, metrics.wallFlux.depthBins);
  }
  return metrics;
}

function evaluateWallFlux({ ionNorm, spreadNorm, reflectionNorm, passNorm }) {
  const depthBins = Array.from({ length: 32 }, (_, index) => index / 31);
  const side = depthBins.map((depth) => {
    const direct = ionNorm * (0.08 + spreadNorm * 0.28) * Math.exp(-depth * (1.5 + passNorm));
    const middleFocus = Math.exp(-Math.pow((depth - 0.5) / 0.2, 2));
    const bottomFocus = Math.exp(-Math.pow((depth - 0.88) / 0.12, 2));
    const reflected = reflectionNorm * ionNorm * (0.12 + spreadNorm * 0.72) * (middleFocus + bottomFocus * 0.38);
    return {
      depth,
      direct,
      reflected,
      total: direct + reflected
    };
  });
  const clone = (cell) => ({ ...cell });
  const integrated = side.reduce((sum, cell) => sum + cell.total, 0) / side.length;
  return {
    depthBins,
    left: side.map(clone),
    right: side.map(clone),
    integrated
  };
}

function buildProfileBoundary(metrics, depthBins) {
  return depthBins.map((depth) => {
    const width = depth <= 0.5
      ? lerp(metrics.topWidth, metrics.middleWidth, smoothstep(depth * 2))
      : lerp(metrics.middleWidth, metrics.bottomWidth, smoothstep((depth - 0.5) * 2));
    return {
      depth,
      width,
      left: -width / 2,
      right: width / 2
    };
  });
}

export function classifyEtchProfile(metrics) {
  if (metrics.depthPercent < 42) return "Etch stop";
  if (metrics.microtrench >= 13) return "Microtrench";
  if (metrics.faceting >= 13 && metrics.maskOpening >= 108) return "Faceting";
  if (metrics.footing >= 12 && metrics.bottomWidth < metrics.middleWidth - 13) return "Footing";
  if (metrics.bowing >= 12 && metrics.middleWidth > metrics.topWidth + 7) return "Bowing";
  if (metrics.taper >= 12 && metrics.bottomWidth < metrics.topWidth - 12) return "Taper";
  if (metrics.undercut >= 14 && metrics.topWidth > 114) return "Undercut";
  return "垂直";
}

export function coburnWintersRate(gasFraction, ionFraction) {
  const gas = clamp(gasFraction, 0, 1);
  const ion = clamp(ionFraction, 0, 1);
  return {
    chemical: 5 * gas,
    physical: 2 * ion,
    synergy: 48 * gas * ion,
    total: 5 * gas + 2 * ion + 48 * gas * ion,
    additive: 5 * gas + 2 * ion
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function smoothstep(value) {
  const amount = clamp(value, 0, 1);
  return amount * amount * (3 - 2 * amount);
}
