import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createButton, createSegmentedControl, createSelect, createSlider, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { analyzeProbeSweep, createProbeState, deriveEedf, generateProbeSweep, probeGases } from "../probe-model.js";

const defaults = Object.freeze({
  gas: "Ar",
  electronTemperatureEv: 3,
  densityExponent: 10,
  plasmaPotentialV: 20,
  rfAmplitudeV: 0,
  coatingPercent: 0,
  view: "linear"
});

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const ctx = canvas.getContext("2d");
  const state = { ...defaults, theme: readCanvasTheme() };
  let component;
  let unwatch = () => {};
  let resizeObserver;
  let observedWidth = 0;

  canvas.width = 720;
  canvas.height = 430;
  canvas.setAttribute("aria-label", "Langmuir 探針 I-V、半對數與 EEDF 分析圖");

  const panel = createValuePanel([
    ["分析 Vf", "—"], ["分析 Te", "—"], ["分析 Vp", "—"], ["分析 ne", "—"],
    ["Vf 誤差", "—"], ["Te 誤差", "—"], ["Vp 誤差", "—"], ["ne 誤差", "—"]
  ]);

  const instance = {
    render() {
      const truth = createProbeState({
        gas: state.gas,
        electronTemperatureEv: state.electronTemperatureEv,
        electronDensityCm3: 10 ** state.densityExponent,
        plasmaPotentialV: state.plasmaPotentialV,
        rfAmplitudeV: state.rfAmplitudeV,
        coatingPercent: state.coatingPercent
      });
      const sweep = generateProbeSweep(truth);
      const analysis = analyzeProbeSweep(sweep);
      const referenceSweep = generateProbeSweep({ ...truth, rfAmplitudeV: 0, coatingPercent: 0 });
      const referenceAnalysis = analyzeProbeSweep(referenceSweep);
      const eedf = deriveEedf(sweep);
      drawProbe(ctx, state, sweep, analysis, eedf);
      updatePanel(panel, truth, analysis, referenceAnalysis);
      canvas.dataset.renderState = "complete";
      canvas.dataset.view = state.view;
      status.dataset.rfRisk = state.rfAmplitudeV > 0 ? "high" : "controlled";
      status.textContent = state.rfAmplitudeV > 0
        ? `RF 未補償：Vp/Vf 可能嚴重偏移。本站純指數模型不支持 Te 高估兩倍；目前分析 Te ${format(analysis.electronTemperatureEv, 2)} eV。`
        : `RF 振幅為 0 V；分析完成。純指數模型限制仍適用，Te ${format(analysis.electronTemperatureEv, 2)} eV。`;
    },
    reset() {
      Object.assign(state, defaults);
      mountControls();
    },
    applyTheme(theme) {
      state.theme = theme;
      this.render();
    },
    destroy() {
      unwatch();
      resizeObserver?.disconnect();
    }
  };

  component = createLifecycle(instance);
  unwatch = watchTheme(component);

  function change(key, value) {
    state[key] = value;
    component.render();
  }

  function mountControls() {
    const reset = createButton("重設", () => component.reset());
    reset.setAttribute("aria-label", "重設 A26 Langmuir 探針參數");
    controls.replaceChildren(
      createSegmentedControl({
        label: "曲線視圖",
        options: [
          { value: "linear", label: "線性 I-V" },
          { value: "semilog", label: "半對數" },
          { value: "eedf", label: "EEDF" }
        ],
        value: state.view,
        onChange: (value) => change("view", value)
      }),
      createSelect({
        label: "氣體",
        options: Object.entries(probeGases).map(([value, gas]) => ({ value, label: gas.label })),
        value: state.gas,
        onChange: (value) => change("gas", value)
      }),
      createSlider({ label: "電子溫度 Te", min: 1, max: 8, step: 0.1, value: state.electronTemperatureEv, unit: "eV", onInput: (value) => change("electronTemperatureEv", value) }),
      createSlider({ label: "電子密度 ne", min: 9, max: 11.7, step: 0.1, value: state.densityExponent, formatValue: (value) => `10^${value.toFixed(1)} cm⁻³`, onInput: (value) => change("densityExponent", value) }),
      createSlider({ label: "真值 Vp", min: -10, max: 30, step: 1, value: state.plasmaPotentialV, unit: "V", onInput: (value) => change("plasmaPotentialV", value) }),
      createSlider({ label: "RF 振幅", min: 0, max: 60, step: 2, value: state.rfAmplitudeV, unit: "V", onInput: (value) => change("rfAmplitudeV", value) }),
      createSlider({ label: "探針鍍膜", min: 0, max: 100, step: 5, value: state.coatingPercent, unit: "%", onInput: (value) => change("coatingPercent", value) }),
      reset,
      panel
    );
  }

  mountControls();
  component.render();
  observedWidth = canvas.getBoundingClientRect().width;
  resizeObserver = new ResizeObserver(([entry]) => {
    const nextWidth = entry.contentRect.width;
    if (Math.abs(nextWidth - observedWidth) < 0.5) return;
    observedWidth = nextWidth;
    component.render();
  });
  resizeObserver.observe(canvas);
  return component;
}

function drawProbe(ctx, state, sweep, analysis, eedf) {
  const { theme } = state;
  const metrics = syncCanvasResolution(ctx.canvas);
  const { width, height, isMobile, px } = metrics;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  const plot = {
    left: px(isMobile ? 44 : 62),
    right: width - px(isMobile ? 10 : 24),
    top: px(isMobile ? 32 : 40),
    bottom: height - px(isMobile ? 44 : 58)
  };
  drawAxes(ctx, theme, metrics, plot, state.view === "eedf" ? "電子能量 E (eV)" : "探針電壓 V (V)", state.view === "linear" ? "電流 I (A)" : state.view === "semilog" ? "ln 電子電流" : "正規化 EEDF");

  let points;
  if (state.view === "eedf") {
    points = eedf.points.map((point) => ({ x: point.energyEv, y: point.value }));
  } else if (state.view === "semilog") {
    points = sweep.points
      .map((point) => ({ x: point.voltageV, y: Math.log(Math.max(1e-14, point.currentA - analysis.ionSaturationCurrentA)) }))
      .filter((point) => Number.isFinite(point.y));
  } else {
    points = sweep.points.map((point) => ({ x: point.voltageV, y: point.currentA }));
  }

  drawCurve(ctx, theme, metrics, plot, points);
  ctx.fillStyle = theme.text;
  setCanvasFont(ctx, metrics, isMobile ? 11 : 14, 700);
  ctx.fillText(state.view === "linear" ? "線性 I-V" : state.view === "semilog" ? "半對數電子電流" : "Druyvesteyn EEDF", plot.left, px(isMobile ? 19 : 24));
  if (state.view !== "eedf") {
    drawMarker(ctx, theme, metrics, plot, points, analysis.floatingPotentialV, "Vf");
    drawMarker(ctx, theme, metrics, plot, points, analysis.plasmaPotentialV, "Vp");
  }
}

function drawAxes(ctx, theme, metrics, plot, xLabel, yLabel) {
  const { height, isMobile, px } = metrics;
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = px(1);
  ctx.strokeRect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top);
  ctx.fillStyle = theme.muted;
  setCanvasFont(ctx, metrics, isMobile ? 10 : 12);
  ctx.textAlign = "center";
  ctx.fillText(xLabel, (plot.left + plot.right) / 2, height - px(isMobile ? 10 : 18));
  ctx.save();
  ctx.translate(px(isMobile ? 11 : 17), (plot.top + plot.bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
  ctx.textAlign = "left";
}

function drawCurve(ctx, theme, metrics, plot, points) {
  if (!points.length) return;
  const { isMobile, px } = metrics;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const mapX = (value) => plot.left + (value - xMin) / Math.max(1e-12, xMax - xMin) * (plot.right - plot.left);
  const mapY = (value) => plot.bottom - (value - yMin) / Math.max(1e-12, yMax - yMin) * (plot.bottom - plot.top);
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = px(isMobile ? 2 : 3);
  ctx.beginPath();
  points.forEach((point, index) => index ? ctx.lineTo(mapX(point.x), mapY(point.y)) : ctx.moveTo(mapX(point.x), mapY(point.y)));
  ctx.stroke();
  ctx.fillStyle = theme.muted;
  setCanvasFont(ctx, metrics, isMobile ? 10 : 11);
  ctx.fillText(format(xMin, 1), plot.left, plot.bottom + px(isMobile ? 13 : 18));
  ctx.textAlign = "right";
  ctx.fillText(format(xMax, 1), plot.right, plot.bottom + px(isMobile ? 13 : 18));
  ctx.textAlign = "left";
  ctx.fillText(format(yMax, 2), plot.left + px(4), plot.top + px(isMobile ? 11 : 14));
}

function drawMarker(ctx, theme, metrics, plot, points, voltage, label) {
  const { isMobile, px } = metrics;
  const xMin = Math.min(...points.map((point) => point.x));
  const xMax = Math.max(...points.map((point) => point.x));
  const x = plot.left + (voltage - xMin) / Math.max(1e-12, xMax - xMin) * (plot.right - plot.left);
  ctx.save();
  ctx.setLineDash([px(5), px(4)]);
  ctx.lineWidth = px(1);
  ctx.strokeStyle = theme.ion;
  ctx.beginPath();
  ctx.moveTo(x, plot.top);
  ctx.lineTo(x, plot.bottom);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = theme.text;
  setCanvasFont(ctx, metrics, isMobile ? 10 : 11, 700);
  ctx.fillText(`${label} ${format(voltage, 1)} V`, Math.min(x + px(4), plot.right - px(isMobile ? 64 : 70)), plot.top + px(label === "Vf" ? (isMobile ? 13 : 20) : (isMobile ? 26 : 38)));
}

function updatePanel(panel, truth, analysis, referenceAnalysis) {
  const values = {
    "分析 Vf": `${format(analysis.floatingPotentialV, 2)} V`,
    "分析 Te": `${format(analysis.electronTemperatureEv, 2)} eV`,
    "分析 Vp": `${format(analysis.plasmaPotentialV, 2)} V`,
    "分析 ne": `${analysis.electronDensityCm3.toExponential(2)} cm⁻³`,
    "Vf 誤差": `${format(analysis.floatingPotentialV - referenceAnalysis.floatingPotentialV, 2)} V`,
    "Te 誤差": `${format((analysis.electronTemperatureEv / truth.electronTemperatureEv - 1) * 100, 1)}%`,
    "Vp 誤差": `${format(analysis.plasmaPotentialV - truth.plasmaPotentialV, 2)} V`,
    "ne 誤差": `${format((analysis.electronDensityCm3 / truth.electronDensityCm3 - 1) * 100, 1)}%`
  };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}

function format(value, digits) {
  return Number.isFinite(value) ? normalizeNearZero(value, digits).toFixed(digits) : "—";
}

function normalizeNearZero(value, digits) {
  return Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value;
}

function syncCanvasResolution(canvas) {
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Number.isFinite(rect.width) && rect.width > 0 ? rect.width : canvas.width;
  const cssHeight = Number.isFinite(rect.height) && rect.height > 0 ? rect.height : canvas.height;
  const scale = Math.max(canvas.width / cssWidth, canvas.height / cssHeight);
  const minEffectiveFontCssPx = 10;
  canvas.dataset.minFontCssPx = String(minEffectiveFontCssPx);
  canvas.dataset.cssWidth = cssWidth.toFixed(1);
  return {
    width: canvas.width,
    height: canvas.height,
    isMobile: cssWidth < 500,
    minEffectiveFontCssPx,
    px: (cssPixels) => cssPixels * scale
  };
}

function setCanvasFont(ctx, metrics, cssPixels, weight = 400) {
  const fontSize = Math.max(metrics.minEffectiveFontCssPx, cssPixels);
  ctx.font = `${weight} ${metrics.px(fontSize)}px system-ui`;
}
