import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createButton, createSelect, createSlider, createToggle, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { ionAngularFwhmDeg, meanFreePathCm } from "../plasma-model.js";

const WIDTH = 720;
const HEIGHT = 360;
const CHAMBER = { left: 28, right: 500, top: 58, bottom: 314 };
const GAS_LABELS = { He: "He 氦", Ar: "Ar 氬", Xe: "Xe 氙" };

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const ctx = canvas.getContext("2d");
  const state = {
    pressureLog: 0,
    gas: "Ar",
    pathLengthCm: 5,
    showScale: true,
    elapsed: 0,
    lastTime: 0,
    theme: readCanvasTheme(),
    paths: [],
    angles: []
  };
  const panel = createValuePanel([
    ["平均自由徑 λ", "—"],
    ["平均碰撞次數", "—"],
    ["入射角 FWHM", "—"],
    ["方向性", "—"]
  ]);

  const instance = {
    update(time = 0) {
      const deltaMs = Math.min(50, time - state.lastTime || 16);
      state.lastTime = time;
      state.elapsed += deltaMs;
    },
    render() {
      const metrics = computeMetrics(state);
      drawScene(ctx, state, metrics);
      updatePanel(panel, metrics);
      status.textContent = `${GAS_LABELS[state.gas]} · ${metrics.pressureText}：λ=${metrics.lambdaText}，平均 ${metrics.expectedCollisions.toFixed(1)} 次碰撞；${metrics.message}`;
    },
    reset() {
      state.pressureLog = 0;
      state.gas = "Ar";
      state.pathLengthCm = 5;
      state.showScale = true;
      state.elapsed = 0;
      rebuildSimulation(state);
      renderControls(controls, panel, state, component);
    },
    applyTheme(theme) {
      state.theme = theme;
      this.render();
    },
    destroy() {
      unwatch();
    }
  };
  const component = createLifecycle(instance);
  const unwatch = watchTheme(component);
  rebuildSimulation(state);
  renderControls(controls, panel, state, component);
  component.render();
  return component;
}

function renderControls(controls, panel, state, component) {
  controls.replaceChildren();
  controls.append(
    createSelect({
      label: "氣體種類",
      value: state.gas,
      options: Object.entries(GAS_LABELS).map(([value, label]) => ({ value, label })),
      onChange: (next) => {
        state.gas = next;
        rebuildSimulation(state);
        component.render();
      }
    }),
    createSlider({
      label: "壓力 p",
      min: 0,
      max: Math.log10(200),
      value: state.pressureLog,
      step: 0.01,
      formatValue: (next) => `${formatPressure(10 ** next)} mTorr`,
      onInput: (next) => {
        state.pressureLog = next;
        rebuildSimulation(state);
        component.render();
      }
    }),
    createSlider({
      label: "穿越距離",
      min: 1,
      max: 10,
      value: state.pathLengthCm,
      step: 0.5,
      unit: "cm",
      onInput: (next) => {
        state.pathLengthCm = next;
        rebuildSimulation(state);
        component.render();
      }
    }),
    createToggle({
      label: "顯示 λ 標尺",
      checked: state.showScale,
      onChange: (next) => {
        state.showScale = next;
        component.render();
      }
    }),
    createButton("重設", () => component.reset()),
    panel
  );
}

function computeMetrics(state) {
  const pressureMtorr = 10 ** state.pressureLog;
  const lambdaCm = meanFreePathCm(pressureMtorr, state.gas);
  const expectedCollisions = state.pathLengthCm / lambdaCm;
  const fwhmDeg = ionAngularFwhmDeg({ pressureMtorr, gas: state.gas, pathLengthCm: state.pathLengthCm });
  const message = fwhmDeg < 12
    ? "入射角分佈很窄，離子保持方向性。"
    : fwhmDeg < 35
      ? "散射開始展寬，profile 方向性下降。"
      : "頻繁碰撞使入射角明顯散開。";
  return {
    pressureMtorr,
    pressureText: `${formatPressure(pressureMtorr)} mTorr`,
    lambdaCm,
    lambdaText: formatLength(lambdaCm),
    expectedCollisions,
    fwhmDeg,
    message
  };
}

function rebuildSimulation(state) {
  const metrics = computeMetrics(state);
  state.paths = Array.from({ length: 34 }, (_, index) => createPath(index, metrics));
  state.angles = Array.from({ length: 160 }, (_, index) => gaussian(index + 1) * (metrics.fwhmDeg / 2.355));
}

function createPath(index, metrics) {
  const expected = metrics.expectedCollisions;
  const collisionCount = Math.min(11, Math.floor(expected * (0.18 + seeded(index * 29 + 5) * 0.94)));
  const points = [{ x: CHAMBER.left + 42 + (index % 17) * 24, y: CHAMBER.top + 14 }];
  let angle = 0;
  for (let collision = 0; collision < collisionCount; collision++) {
    const progress = (collision + 1) / (collisionCount + 1);
    const y = CHAMBER.top + 14 + progress * (CHAMBER.bottom - CHAMBER.top - 32);
    const kick = gaussian(index * 41 + collision * 7 + 3) * Math.min(0.45, metrics.fwhmDeg / 180);
    angle = Math.max(-0.75, Math.min(0.75, angle + kick));
    const previous = points.at(-1);
    const x = Math.max(CHAMBER.left + 12, Math.min(CHAMBER.right - 12, previous.x + Math.tan(angle) * (y - previous.y)));
    points.push({ x, y, collision: true });
  }
  const previous = points.at(-1);
  const finalY = CHAMBER.bottom - 12;
  const finalX = Math.max(CHAMBER.left + 10, Math.min(CHAMBER.right - 10, previous.x + Math.tan(angle) * (finalY - previous.y)));
  points.push({ x: finalX, y: finalY });
  return { points, phase: seeded(index * 19 + 9), angleDeg: angle * 180 / Math.PI };
}

function drawScene(ctx, state, metrics) {
  const theme = state.theme;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawChamber(ctx, state, metrics);
  drawHistogram(ctx, state, metrics);
}

function drawChamber(ctx, state, metrics) {
  const theme = state.theme;
  ctx.fillStyle = theme.text;
  ctx.font = "700 17px system-ui";
  ctx.fillText("離子穿越低壓區", CHAMBER.left, 30);
  ctx.font = "12px system-ui";
  ctx.fillStyle = theme.muted;
  ctx.fillText(`${GAS_LABELS[state.gas]} · p=${metrics.pressureText} · gap=${state.pathLengthCm.toFixed(1)} cm`, CHAMBER.left, 48);
  ctx.strokeStyle = theme.border;
  ctx.strokeRect(CHAMBER.left, CHAMBER.top, CHAMBER.right - CHAMBER.left, CHAMBER.bottom - CHAMBER.top);
  ctx.fillStyle = withAlpha(theme.primary, 0.1);
  ctx.fillRect(CHAMBER.left + 1, CHAMBER.top + 1, CHAMBER.right - CHAMBER.left - 2, 26);
  ctx.fillStyle = theme.primary;
  ctx.font = "700 11px system-ui";
  ctx.fillText("鞘層邊界：離子平行射出", CHAMBER.left + 10, CHAMBER.top + 18);

  for (const path of state.paths) drawPath(ctx, path, state);
  if (state.showScale) drawLambdaScale(ctx, state, metrics);

  ctx.fillStyle = theme.neutral;
  ctx.fillRect(CHAMBER.left, CHAMBER.bottom - 12, CHAMBER.right - CHAMBER.left, 12);
  ctx.fillStyle = theme.text;
  ctx.font = "700 11px system-ui";
  ctx.fillText("晶圓表面", CHAMBER.right - 64, CHAMBER.bottom - 17);
}

function drawPath(ctx, path, state) {
  const theme = state.theme;
  ctx.strokeStyle = withAlpha(theme.ion, 0.23);
  ctx.lineWidth = 1;
  ctx.beginPath();
  path.points.forEach((point, index) => index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
  ctx.stroke();
  for (const point of path.points) {
    if (!point.collision) continue;
    ctx.fillStyle = withAlpha("#f2a51a", 0.76);
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.3, 0, Math.PI * 2);
    ctx.fill();
  }

  const progress = (state.elapsed * 0.00018 + path.phase) % 1;
  const position = pointAlong(path.points, progress);
  ctx.fillStyle = theme.ion;
  ctx.beginPath();
  ctx.arc(position.x, position.y, 3.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawLambdaScale(ctx, state, metrics) {
  const theme = state.theme;
  const chamberHeight = CHAMBER.bottom - CHAMBER.top - 44;
  const scalePx = Math.max(12, Math.min(chamberHeight, chamberHeight * metrics.lambdaCm / state.pathLengthCm));
  const x = CHAMBER.left + 16;
  const y = CHAMBER.top + 44;
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + scalePx);
  ctx.moveTo(x - 5, y);
  ctx.lineTo(x + 5, y);
  ctx.moveTo(x - 5, y + scalePx);
  ctx.lineTo(x + 5, y + scalePx);
  ctx.stroke();
  ctx.fillStyle = theme.primary;
  ctx.font = "700 11px system-ui";
  ctx.fillText(`λ ${metrics.lambdaText}`, x + 9, y + Math.min(scalePx / 2, 18));
}

function drawHistogram(ctx, state, metrics) {
  const theme = state.theme;
  const plot = { x: 532, y: 92, width: 160, height: 210 };
  ctx.fillStyle = theme.text;
  ctx.font = "700 15px system-ui";
  ctx.fillText("入射角分佈", plot.x, 30);
  ctx.font = "12px system-ui";
  ctx.fillStyle = theme.muted;
  ctx.fillText(`FWHM ${metrics.fwhmDeg.toFixed(1)}°`, plot.x, 50);
  ctx.strokeStyle = theme.border;
  ctx.strokeRect(plot.x, plot.y, plot.width, plot.height);

  const bins = histogram(state.angles, 15, -75, 75);
  const max = Math.max(...bins, 1);
  const barWidth = plot.width / bins.length;
  bins.forEach((count, index) => {
    const height = (count / max) * (plot.height - 28);
    ctx.fillStyle = withAlpha(theme.ion, 0.72);
    ctx.fillRect(plot.x + index * barWidth + 1, plot.y + plot.height - height - 18, Math.max(2, barWidth - 2), height);
  });
  ctx.fillStyle = theme.muted;
  ctx.font = "10px system-ui";
  ctx.fillText("−75°", plot.x, plot.y + plot.height - 4);
  ctx.fillText("0°", plot.x + plot.width / 2 - 6, plot.y + plot.height - 4);
  ctx.fillText("+75°", plot.x + plot.width - 24, plot.y + plot.height - 4);
  ctx.strokeStyle = theme.primary;
  ctx.beginPath();
  ctx.moveTo(plot.x + plot.width / 2, plot.y);
  ctx.lineTo(plot.x + plot.width / 2, plot.y + plot.height - 18);
  ctx.stroke();
}

function updatePanel(panel, metrics) {
  const values = {
    "平均自由徑 λ": metrics.lambdaText,
    "平均碰撞次數": `${metrics.expectedCollisions.toFixed(1)} 次`,
    "入射角 FWHM": `${metrics.fwhmDeg.toFixed(1)}°`,
    "方向性": metrics.fwhmDeg < 12 ? "高" : metrics.fwhmDeg < 35 ? "中" : "低"
  };
  for (const [key, value] of Object.entries(values)) {
    const node = panel.querySelector(`[data-value-key="${key}"]`);
    if (node) node.textContent = value;
  }
}

function pointAlong(points, progress) {
  const scaled = progress * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(scaled));
  const local = scaled - index;
  const start = points[index];
  const end = points[index + 1];
  return { x: start.x + (end.x - start.x) * local, y: start.y + (end.y - start.y) * local };
}

function histogram(values, count, min, max) {
  const bins = Array(count).fill(0);
  for (const value of values) {
    const clamped = Math.max(min, Math.min(max - Number.EPSILON, value));
    const index = Math.floor(((clamped - min) / (max - min)) * count);
    bins[index]++;
  }
  return bins;
}

function formatPressure(value) {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function formatLength(value) {
  if (value >= 1) return `${value.toFixed(2)} cm`;
  if (value >= 0.1) return `${(value * 10).toFixed(2)} mm`;
  return `${(value * 10).toFixed(3)} mm`;
}

function gaussian(seed) {
  const u1 = Math.max(1e-6, seeded(seed * 2 + 1));
  const u2 = seeded(seed * 2 + 2);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function seeded(value) {
  const next = Math.sin(value * 12.9898) * 43758.5453;
  return next - Math.floor(next);
}

function withAlpha(color, alpha) {
  if (!color.startsWith("#")) return color;
  const hex = color.slice(1);
  const normalized = hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex;
  const value = Number.parseInt(normalized, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}
