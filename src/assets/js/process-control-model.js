export const endpointControlRanges = {
  openAreaPercent: { min: 0.01, max: 50 },
  noisePercent: { min: 0, max: 20 },
  filmThicknessNm: { min: 50, max: 3000 },
  etchRateNmMin: { min: 10, max: 2000 },
  windowTransmission: { min: 0.1, max: 1 }
};

export function createEndpointState(input = {}) {
  return {
    openAreaPercent: clamp(input.openAreaPercent, endpointControlRanges.openAreaPercent.min, endpointControlRanges.openAreaPercent.max, 10),
    noisePercent: clamp(input.noisePercent, endpointControlRanges.noisePercent.min, endpointControlRanges.noisePercent.max, 3),
    filmThicknessNm: clamp(input.filmThicknessNm, endpointControlRanges.filmThicknessNm.min, endpointControlRanges.filmThicknessNm.max, 600),
    etchRateNmMin: clamp(input.etchRateNmMin, endpointControlRanges.etchRateNmMin.min, endpointControlRanges.etchRateNmMin.max, 300),
    wavelengthNm: positive(input.wavelengthNm, 633),
    refractiveIndex: positive(input.refractiveIndex, 1.46),
    windowTransmission: clamp(input.windowTransmission, endpointControlRanges.windowTransmission.min, endpointControlRanges.windowTransmission.max, 1),
    sampleIntervalSeconds: clamp(input.sampleIntervalSeconds, 0.1, 10, 1),
    seed: Math.trunc(positive(input.seed, 12345)) >>> 0
  };
}

export function calculateInterferenceFringe(input = {}) {
  const wavelengthNm = positive(input.wavelengthNm, 633);
  const refractiveIndex = positive(input.refractiveIndex, 1.46);
  const etchRateNmMin = positive(input.etchRateNmMin, 300);
  const thicknessPerFringeNm = wavelengthNm / (2 * refractiveIndex);
  return {
    thicknessPerFringeNm,
    periodSeconds: thicknessPerFringeNm / etchRateNmMin * 60
  };
}

export function generateEndpointSeries(input = {}) {
  const state = createEndpointState(input);
  const trueEndpointSeconds = state.filmThicknessNm / state.etchRateNmMin * 60;
  const durationSeconds = trueEndpointSeconds * 1.35;
  const random = seededRandom(state.seed);
  const productAmplitude = state.openAreaPercent * 5;
  const background = 2;
  const noiseSigma = state.noisePercent / 100 * 5;
  const referenceLevel = 10;
  const { thicknessPerFringeNm, periodSeconds } = calculateInterferenceFringe(state);
  const rawPoints = [];

  for (let timeSeconds = 0; timeSeconds <= durationSeconds + state.sampleIntervalSeconds / 2; timeSeconds += state.sampleIntervalSeconds) {
    const transition = 1 / (1 + Math.exp((timeSeconds - trueEndpointSeconds) / 1.5));
    const commonNoise = gaussian(random);
    const raw = state.windowTransmission * (background + productAmplitude * transition) + noiseSigma * commonNoise;
    const reference = state.windowTransmission * referenceLevel + noiseSigma * 0.12 * gaussian(random);
    const removedThicknessNm = Math.min(state.filmThicknessNm, state.etchRateNmMin * timeSeconds / 60);
    const interference = 0.5 + 0.43 * Math.cos(2 * Math.PI * removedThicknessNm / thicknessPerFringeNm) + 0.012 * gaussian(random);
    rawPoints.push({ timeSeconds, raw, normalized: raw / reference, interference });
  }

  const movingValues = movingAverage(rawPoints.map((point) => point.raw), 7);
  const points = rawPoints.map((point, index) => ({
    ...point,
    movingAverage: movingValues[index],
    firstDerivative: index === 0
      ? 0
      : (movingValues[index] - movingValues[index - 1]) / state.sampleIntervalSeconds
  }));

  return {
    state,
    points,
    trueEndpointSeconds,
    fringeThicknessNm: thicknessPerFringeNm,
    fringePeriodSeconds: periodSeconds,
    signalToNoise: productAmplitude * state.windowTransmission / Math.max(noiseSigma, 1e-9)
  };
}

export function analyzeEndpointSeries(series, options = {}) {
  if (!series?.points?.length) throw new TypeError("終點訊號序列不得為空。 ");
  const algorithm = ["raw", "movingAverage", "firstDerivative", "normalized"].includes(options.algorithm)
    ? options.algorithm
    : "movingAverage";
  const points = series.points;
  const detectedIndex = findSteepestDrop(points, algorithm);
  const detectedSeconds = points[detectedIndex].timeSeconds;
  const openAreaPercent = series.state.openAreaPercent;
  const errorSeconds = Math.abs(detectedSeconds - series.trueEndpointSeconds);
  const toleranceSeconds = Math.max(5, series.state.sampleIntervalSeconds * 4);
  const signalReliable = openAreaPercent >= 0.1 && series.signalToNoise >= 3;
  const reliable = signalReliable && errorSeconds <= toleranceSeconds;
  const signalReason = openAreaPercent < 0.1
    ? "開口率低於 0.1%，OES 產物訊號通常不足以支持可靠終點判讀。"
    : openAreaPercent < 1
      ? "開口率介於 0.1% 與 1%，需搭配濾波、正規化或其他量測。"
      : openAreaPercent < 10
        ? "開口率介於 1% 與 10%，演算法可用但必須監控訊雜比。"
        : "開口率大於 10%，OES 產物訊號通常清楚。";
  const reason = signalReliable && !reliable
    ? `${signalReason} 所選演算法的觸發誤差 ${errorSeconds.toFixed(1)} 秒超過 ${toleranceSeconds.toFixed(1)} 秒容許值，本次判定不可靠。`
    : signalReason;
  const interference = detectInterferenceEndpoint(series);

  return {
    algorithm,
    trueEndpointSeconds: series.trueEndpointSeconds,
    oes: {
      detectedSeconds,
      errorSeconds,
      reliable,
      signalReliable,
      toleranceSeconds,
      signalToNoise: series.signalToNoise,
      reason
    },
    interference: {
      ...interference,
      errorSeconds: Number.isFinite(interference.detectedSeconds)
        ? Math.abs(interference.detectedSeconds - series.trueEndpointSeconds)
        : Number.NaN,
      method: "比較條紋停止前後的振盪活動量，判定膜厚移除完成；不使用 OES 開口面積。"
    }
  };
}

function detectInterferenceEndpoint(series) {
  const values = series.points.map((point) => point.interference);
  if (values.length < 12 || values.some((value) => !Number.isFinite(value))) {
    return { detectedSeconds: Number.NaN, reliable: false, activityRatio: Number.NaN };
  }
  const interval = series.state.sampleIntervalSeconds;
  const windowSamples = Math.max(4, Math.round(series.fringePeriodSeconds / interval * 0.75));
  if (values.length < windowSamples * 2 + 1) {
    return { detectedSeconds: Number.NaN, reliable: false, activityRatio: Number.NaN };
  }

  let best = null;
  for (let index = windowSamples; index < values.length - windowSamples; index += 1) {
    const beforeActivity = standardDeviation(values.slice(index - windowSamples, index + 1));
    const afterActivity = standardDeviation(values.slice(index, index + windowSamples + 1));
    const activityRatio = afterActivity / Math.max(beforeActivity, 1e-9);
    if (!best || activityRatio < best.activityRatio) {
      best = { index, beforeActivity, afterActivity, activityRatio };
    }
  }
  const reliable = best.beforeActivity > 0.08 && best.activityRatio < 0.35;
  return {
    detectedSeconds: reliable ? series.points[best.index].timeSeconds : Number.NaN,
    reliable,
    activityRatio: best.activityRatio
  };
}

function standardDeviation(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length);
}

function findSteepestDrop(points, algorithm) {
  if (algorithm === "firstDerivative") {
    return indexOfMinimum(points.map((point) => point.firstDerivative));
  }
  const values = points.map((point) => point[algorithm]);
  const derivatives = values.map((value, index) => index === 0 ? 0 : value - values[index - 1]);
  return indexOfMinimum(derivatives);
}

function movingAverage(values, windowSize) {
  return values.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const window = values.slice(start, index + 1);
    return window.reduce((sum, value) => sum + value, 0) / window.length;
  });
}

function indexOfMinimum(values) {
  let bestIndex = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] < values[bestIndex]) bestIndex = index;
  }
  return bestIndex;
}

function seededRandom(seed) {
  let state = seed || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function gaussian(random) {
  const first = Math.max(random(), 1e-12);
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * random());
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
