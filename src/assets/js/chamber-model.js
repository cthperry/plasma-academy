export const waferMapPresets = [
  ["center-fast", "中心快"], ["edge-fast", "邊緣快"], ["w-shape", "W 形"],
  ["skew", "單邊偏斜"], ["rings", "同心環"], ["edge-roll", "Edge roll"]
];

export function evaluateMagnetron(input = {}) {
  const magneticFieldGauss = clamp(input.magneticFieldGauss ?? 300, 0, 500);
  const pressureMtorr = clamp(input.pressureMtorr ?? 4, 1, 20);
  const powerKw = clamp(input.powerKw ?? 8, 1, 20);
  const hours = clamp(input.hours ?? 350, 0, 1200);
  const confinement = 0.08 + 0.92 * (1 - Math.exp(-magneticFieldGauss / 85));
  const pressureCollision = 1 - Math.exp(-pressureMtorr / 3.2);
  const pathLengthM = 0.18 * (1 + magneticFieldGauss / 42) / (1 + pressureMtorr / 18);
  const ionizationEfficiency = clamp(confinement * pressureCollision * 100, 1, 100);
  const targetUtilizationPercent = clamp(40 - magneticFieldGauss * 0.036, 20, 40);
  const erosionDepthMm = hours / 1200 * powerKw / 8 * confinement * 14;
  const rateDriftPercent = clamp(erosionDepthMm * 1.15, 0, 28);
  const sustainable = ionizationEfficiency >= 18;
  return {
    magneticFieldGauss, pressureMtorr, powerKw, hours, confinement,
    pathLengthM, ionizationEfficiency, targetUtilizationPercent, erosionDepthMm, rateDriftPercent,
    classification: sustainable ? magneticFieldGauss > 120 ? "磁控穩定區" : "弱磁場：需較高壓維持" : "游離效率不足"
  };
}

export function evaluateWaferMap(input = {}) {
  const preset = waferMapPresets.some(([id]) => id === input.preset) ? input.preset : "center-fast";
  const gapCm = clamp(input.gapCm ?? 3, 1, 5);
  const pressureMtorr = clamp(input.pressureMtorr ?? 30, 5, 150);
  const centerGasPercent = clamp(input.centerGasPercent ?? 50, 0, 100);
  const centerTempC = clamp(input.centerTempC ?? 20, 0, 80);
  const edgeTempC = clamp(input.edgeTempC ?? 20, 0, 80);
  const focusRingWearPercent = clamp(input.focusRingWearPercent ?? (preset === "edge-roll" ? 100 : 0), 0, 100);
  const pumpAngleDeg = clamp(input.pumpAngleDeg ?? 0, 0, 360);
  const values = [];
  const size = 61;
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const x = (column / (size - 1) * 2) - 1;
      const y = (row / (size - 1) * 2) - 1;
      const radius = Math.hypot(x, y);
      if (radius > 1) continue;
      values.push({ x, y, radius, value: mapValue(preset, x, y, radius, { gapCm, pressureMtorr, centerGasPercent, centerTempC, edgeTempC, focusRingWearPercent, pumpAngleDeg }) });
    }
  }
  const rates = values.map((item) => item.value);
  const mean = rates.reduce((sum, value) => sum + value, 0) / rates.length;
  const min = Math.min(...rates), max = Math.max(...rates);
  const sigma = Math.sqrt(rates.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / rates.length);
  return {
    preset,
    values,
    mean,
    min,
    max,
    halfRangePercent: (max - min) / (max + min) * 100,
    oneSigmaPercent: sigma / mean * 100,
    classification: classifyMap(values),
    inputs: { gapCm, pressureMtorr, centerGasPercent, centerTempC, edgeTempC, focusRingWearPercent, pumpAngleDeg }
  };
}

function mapValue(preset, x, y, radius, input) {
  const smoothing = 1 / (0.72 + input.gapCm * 0.08 + input.pressureMtorr / 500);
  const gasRadial = (input.centerGasPercent - 50) / 50 * (1 - radius * radius) * 5;
  const temperature = ((input.centerTempC - input.edgeTempC) / 60) * (1 - radius) * 4;
  const theta = input.pumpAngleDeg * Math.PI / 180;
  const pump = (Math.cos(theta) * x + Math.sin(theta) * y) * 2.2;
  const wear = input.focusRingWearPercent / 100 * Math.pow(Math.max(0, radius - 0.73) / 0.27, 2) * -12;
  let shape = 0;
  if (preset === "center-fast") shape = 10 * (1 - radius * radius);
  if (preset === "edge-fast") shape = 10 * radius * radius;
  if (preset === "w-shape") shape = 8 * Math.cos(radius * Math.PI * 2.15);
  if (preset === "skew") shape = 11 * x;
  if (preset === "rings") shape = 7 * Math.cos(radius * Math.PI * 5.2);
  if (preset === "edge-roll") shape = -13 * Math.pow(Math.max(0, radius - 0.68) / 0.32, 2);
  return 100 + shape * smoothing + gasRadial + temperature + (preset === "skew" ? pump : pump * 0.15) + wear;
}

function classifyMap(values) {
  const average = (items) => items.reduce((sum, item) => sum + item.value, 0) / Math.max(1, items.length);
  const center = average(values.filter((item) => item.radius < 0.22));
  const middle = average(values.filter((item) => item.radius > 0.42 && item.radius < 0.62));
  const edge = average(values.filter((item) => item.radius > 0.84));
  const left = average(values.filter((item) => item.x < -0.45));
  const right = average(values.filter((item) => item.x > 0.45));
  const radialSwings = radialSwingCount(values);
  if (middle - edge > Math.max(6, Math.abs(center - middle) * 2.2)) return "Edge roll";
  if (Math.abs(left - right) > 7) return "單邊偏斜";
  if (radialSwings >= 3) return "同心環";
  if (center > middle + 4 && edge > middle + 4) return "W 形";
  if (center > edge + 5) return "中心快";
  if (edge > center + 5) return "邊緣快";
  return "近均勻";
}

function radialSwingCount(values) {
  const bins = Array.from({ length: 12 }, () => []);
  values.forEach((item) => bins[Math.min(11, Math.floor(item.radius * 12))].push(item.value));
  const means = bins.map((bin) => bin.reduce((sum, value) => sum + value, 0) / Math.max(1, bin.length));
  let swings = 0, previous = 0;
  for (let index = 1; index < means.length; index += 1) {
    const direction = Math.sign(means[index] - means[index - 1]);
    if (previous && direction && direction !== previous) swings += 1;
    if (direction) previous = direction;
  }
  return swings;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
