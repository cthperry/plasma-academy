import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createButton, createSelect, createSlider, createToggle, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { clearSvg, createSvg, drawAxes, drawLegend, drawLine, logScale } from "../plot.js";
import { paschenGases, paschenMargin, paschenVoltage } from "../plasma-model.js";

const SVG_WIDTH = 560;
const SVG_HEIGHT = 360;
const CANVAS_WIDTH = 220;
const CANVAS_HEIGHT = 360;
const GAS_ORDER = ["Ar", "He", "N2", "Air", "O2"];

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const { svg } = ensureStage(canvas);
  const ctx = canvas.getContext("2d");
  const state = {
    gas: "Ar",
    pressureLog: 0,
    gapLog: 0,
    voltage: 220,
    showAll: true,
    theme: readCanvasTheme()
  };
  const panel = createValuePanel([
    ["p·d", "—"],
    ["Vb", "—"],
    ["V", "—"],
    ["餘裕", "—"],
    ["谷底", "—"]
  ]);

  const instance = {
    update() {},
    render() {
      const metrics = computeMetrics(state);
      drawPlot(svg, state, metrics);
      drawChamber(ctx, state, metrics);
      updatePanel(panel, state, metrics);
      status.textContent = `${paschenGases[state.gas].label}: ${metrics.ignites ? "點火" : "不點火"}；${metrics.branchText}`;
    },
    reset() {
      state.gas = "Ar";
      state.pressureLog = 0;
      state.gapLog = 0;
      state.voltage = 220;
      state.showAll = true;
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
  renderControls(controls, panel, state, component);
  component.render();
  return component;
}

function ensureStage(canvas) {
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  let stage = canvas.closest(".lab-paschen-stage");
  if (!stage) {
    stage = document.createElement("div");
    stage.className = "lab-paschen-stage";
    canvas.before(stage);
    const svg = createSvg("svg", {
      viewBox: `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`,
      role: "img",
      "aria-label": "Paschen 曲線圖"
    });
    stage.append(svg, canvas);
  }
  return { stage, svg: stage.querySelector("svg") };
}

function renderControls(controls, panel, state, component) {
  controls.replaceChildren();
  controls.append(
    createSelect({
      label: "氣體",
      value: state.gas,
      options: GAS_ORDER.map((key) => ({ value: key, label: paschenGases[key].label })),
      onChange: (next) => {
        state.gas = next;
        component.render();
      }
    }),
    createSlider({
      label: "壓力 p",
      min: -2,
      max: 2,
      value: state.pressureLog,
      step: 0.01,
      formatValue: (next) => `${formatNumber(10 ** next)} Torr`,
      onInput: (next) => {
        state.pressureLog = next;
        component.render();
      }
    }),
    createSlider({
      label: "間距 d",
      min: -1,
      max: 1,
      value: state.gapLog,
      step: 0.01,
      formatValue: (next) => `${formatNumber(10 ** next)} cm`,
      onInput: (next) => {
        state.gapLog = next;
        component.render();
      }
    }),
    createSlider({
      label: "施加電壓 V",
      min: 50,
      max: 5000,
      value: state.voltage,
      step: 10,
      unit: "V",
      onInput: (next) => {
        state.voltage = next;
        component.render();
      }
    }),
    createToggle({
      label: "顯示所有氣體曲線",
      checked: state.showAll,
      onChange: (next) => {
        state.showAll = next;
        component.render();
      }
    }),
    createButton("重設", () => component.reset()),
    panel
  );
}

function computeMetrics(state) {
  const pressureTorr = 10 ** state.pressureLog;
  const gapCm = 10 ** state.gapLog;
  const pdTorrCm = pressureTorr * gapCm;
  const { breakdownVoltage, margin, ignites } = paschenMargin({ pdTorrCm, voltage: state.voltage, gas: state.gas });
  const gas = paschenGases[state.gas];
  const branchText = pdTorrCm < gas.pdMinTorrCm * 0.65
    ? "左支：電子還沒撞到足夠分子就到陽極。"
    : pdTorrCm > gas.pdMinTorrCm * 1.8
      ? "右支：碰撞太頻繁，兩次碰撞間能量不足。"
      : "接近谷底：最容易崩潰，也最容易形成寄生放電。";
  return { pressureTorr, gapCm, pdTorrCm, breakdownVoltage, margin, ignites, branchText };
}

function drawPlot(svg, state, metrics) {
  clearSvg(svg);
  const plot = { x: 62, y: 34, width: 430, height: 250 };
  const xScale = logScale(0.005, 1000, plot.x, plot.x + plot.width);
  const yScale = logScale(50, 5000, plot.y + plot.height, plot.y);
  drawGrid(svg, plot, xScale, yScale);
  drawAxes(svg, {
    ...plot,
    xLabel: "p·d (Torr·cm)",
    yLabel: "Vb (V)",
    xTicks: [0.01, 0.1, 1, 10, 100, 1000].map((value) => ({ x: xScale(value), label: formatTick(value) })),
    yTicks: [50, 100, 200, 500, 1000, 5000].map((value) => ({ y: yScale(value), label: `${value}` }))
  });

  const gases = state.showAll ? GAS_ORDER : [state.gas];
  gases.forEach((gasKey, index) => {
    const points = paschenPoints(gasKey, xScale, yScale);
    drawLine(svg, { points, className: `plot-line plot-line-gas-${GAS_ORDER.indexOf(gasKey)}` });
    drawMinimum(svg, gasKey, xScale, yScale);
    if (!state.showAll && index === 0) drawBranchLabels(svg, plot);
  });

  const pointX = xScale(metrics.pdTorrCm);
  const pointY = yScale(Math.max(50, Math.min(5000, state.voltage)));
  svg.append(createSvg("line", { x1: pointX, y1: plot.y, x2: pointX, y2: plot.y + plot.height, class: "plot-line-muted" }));
  svg.append(createSvg("line", { x1: plot.x, y1: pointY, x2: plot.x + plot.width, y2: pointY, class: "plot-line-muted" }));
  svg.append(createSvg("circle", { cx: pointX, cy: pointY, r: 7, class: `plot-point${metrics.ignites ? " ignites" : ""}` }));

  const result = createSvg("text", { x: plot.x + 10, y: plot.y + 22, class: "plot-region-label" });
  result.textContent = metrics.ignites ? "點火" : "不點火";
  svg.append(result);

  drawLegend(svg, GAS_ORDER.map((key) => ({
    label: `${paschenGases[key].label} ${paschenGases[key].vMin} V`,
    className: `plot-line plot-line-gas-${GAS_ORDER.indexOf(key)}`
  })), { x: 365, y: 310 });
}

function drawGrid(svg, plot, xScale, yScale) {
  const group = createSvg("g", { class: "plot-grid" });
  for (const value of [0.01, 0.1, 1, 10, 100, 1000]) {
    const x = xScale(value);
    group.append(createSvg("line", { x1: x, y1: plot.y, x2: x, y2: plot.y + plot.height }));
  }
  for (const value of [50, 100, 200, 500, 1000, 5000]) {
    const y = yScale(value);
    group.append(createSvg("line", { x1: plot.x, y1: y, x2: plot.x + plot.width, y2: y }));
  }
  svg.append(group);
}

function paschenPoints(gasKey, xScale, yScale) {
  const points = [];
  for (let index = 0; index <= 220; index++) {
    const pd = 10 ** (-2.3 + (index / 220) * 5.3);
    const voltage = paschenVoltage(pd, gasKey);
    if (!Number.isFinite(voltage) || voltage > 9000) continue;
    points.push([xScale(pd), yScale(Math.max(50, Math.min(5000, voltage)))]);
  }
  return points;
}

function drawMinimum(svg, gasKey, xScale, yScale) {
  const gas = paschenGases[gasKey];
  const x = xScale(gas.pdMinTorrCm);
  const y = yScale(gas.vMin);
  svg.append(createSvg("circle", { cx: x, cy: y, r: 3.5, class: `plot-minimum plot-line-gas-${GAS_ORDER.indexOf(gasKey)}` }));
}

function drawBranchLabels(svg, plot) {
  const left = createSvg("text", { x: plot.x + 20, y: plot.y + plot.height - 18, class: "plot-region-label" });
  left.textContent = "左支：碰撞太少";
  const right = createSvg("text", { x: plot.x + plot.width - 118, y: plot.y + plot.height - 18, class: "plot-region-label" });
  right.textContent = "右支：能量不足";
  svg.append(left, right);
}

function drawChamber(ctx, state, metrics) {
  const theme = state.theme;
  const gas = paschenGases[state.gas];
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = theme.text;
  ctx.font = "700 16px system-ui";
  ctx.fillText("放電腔", 22, 34);
  ctx.font = "12px system-ui";
  ctx.fillStyle = theme.muted;
  ctx.fillText(`${gas.label} · p=${formatNumber(metrics.pressureTorr)} Torr`, 22, 56);
  ctx.fillText(`d=${formatNumber(metrics.gapCm)} cm`, 22, 74);

  const top = 116;
  const gapPixels = Math.max(46, Math.min(160, 42 + metrics.gapCm * 15));
  const bottom = top + gapPixels;
  ctx.fillStyle = theme.border;
  ctx.fillRect(36, top - 8, 148, 12);
  ctx.fillRect(36, bottom, 148, 12);
  ctx.strokeStyle = theme.border;
  ctx.strokeRect(52, top + 4, 116, gapPixels - 8);

  if (metrics.ignites) {
    const glow = ctx.createRadialGradient(110, top + gapPixels / 2, 10, 110, top + gapPixels / 2, 82);
    glow.addColorStop(0, gas.glow);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(44, top + 4, 132, gapPixels - 8);
    for (let i = 0; i < 38; i++) {
      dot(ctx, i % 3 === 0 ? theme.ion : theme.electron, 58 + Math.random() * 104, top + 12 + Math.random() * Math.max(8, gapPixels - 26), i % 3 === 0 ? 2.7 : 2);
    }
  }

  ctx.fillStyle = metrics.ignites ? theme.primary : theme.muted;
  ctx.font = "800 24px system-ui";
  ctx.fillText(metrics.ignites ? "點火" : "不點火", 22, 306);
  ctx.font = "12px system-ui";
  ctx.fillStyle = theme.muted;
  wrapText(ctx, metrics.branchText, 22, 328, 176, 16);
}

function updatePanel(panel, state, metrics) {
  const gas = paschenGases[state.gas];
  const values = {
    "p·d": `${formatNumber(metrics.pdTorrCm)} Torr·cm`,
    "Vb": `${formatVoltage(metrics.breakdownVoltage)} V`,
    "V": `${Math.round(state.voltage)} V`,
    "餘裕": `${metrics.margin >= 0 ? "+" : ""}${formatVoltage(metrics.margin)} V`,
    "谷底": `${formatMinPd(gas.pdMinTorrCm)} Torr·cm / ${gas.vMin} V`
  };
  for (const [key, value] of Object.entries(values)) {
    const node = panel.querySelector(`[data-value-key="${key}"]`);
    if (node) node.textContent = value;
  }
}

function formatTick(value) {
  return value < 1 ? value.toString() : `${value}`;
}

function formatNumber(value) {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  if (value >= 1) return value.toFixed(2);
  return value.toPrecision(2);
}

function formatVoltage(value) {
  if (!Number.isFinite(value)) return ">5000";
  return `${Math.round(value)}`;
}

function formatMinPd(value) {
  return value >= 1 ? value.toFixed(1) : value.toFixed(2);
}

function dot(ctx, color, x, y, radius) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  let line = "";
  for (const char of text) {
    const next = line + char;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = char;
      y += lineHeight;
    } else {
      line = next;
    }
  }
  if (line) ctx.fillText(line, x, y);
}
