import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createButton, createSegmentedControl, createSlider, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { createGlobalState, globalModelGases, scanGlobalModel, solveGlobalModel } from "../global-model.js";

const defaults = Object.freeze({ gas: "Ar", pressureMtorr: 20, radiusCm: 20, heightCm: 10, absorbedPowerW: 500, flowSccm: 100 });

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const ctx = canvas.getContext("2d");
  const state = { ...defaults, theme: readCanvasTheme() };
  let component;
  let resizeObserver;
  let observedWidth = 0;
  let unwatch = () => {};

  canvas.width = 720;
  canvas.height = 430;
  canvas.setAttribute("aria-label", "0-D 全域模型的粒子平衡、電子溫度交點與功率密度掃描");

  const panel = createValuePanel([
    ["電子溫度 Tₑ", "—"], ["電子密度 nₑ", "—"], ["離子通量 Γᵢ", "—"],
    ["自由基密度", "—"], ["滯留時間 τ", "—"], ["V/A 特徵長度", "—"]
  ]);

  const instance = {
    render() {
      const modelState = createGlobalState(state);
      const solution = solveGlobalModel(modelState);
      const powerValues = [...new Set([50, 100, 250, 500, state.absorbedPowerW, 1000, 2000, 3000])].sort((left, right) => left - right);
      const powerScan = scanGlobalModel(modelState, "absorbedPowerW", powerValues);
      drawGlobalModel(ctx, state, solution, powerScan);
      updatePanel(panel, solution);
      const intersection = solution.balanceCurves.reduce((closest, point) => Math.abs(point.residual) < Math.abs(closest.residual) ? point : closest);
      canvas.dataset.renderState = "complete";
      canvas.dataset.intersectionError = Math.abs(intersection.residual).toExponential(2);
      canvas.dataset.electronTemperature = solution.electronTemperatureEv.toFixed(4);
      canvas.dataset.density = solution.electronDensityCm3.toExponential(4);
      canvas.dataset.numericSignature = [solution.electronTemperatureEv, solution.electronDensityCm3, solution.ionFluxCm2s, solution.residenceTimeS].map((value) => Number(value).toPrecision(7)).join("|");
      canvas.dataset.themeBg = state.theme.bg;
      status.textContent = `${globalModelGases[solution.state.gas].label}、${solution.state.pressureMtorr.toFixed(1)} mTorr：Tₑ ${solution.electronTemperatureEv.toFixed(2)} eV；吸收功率掃描使 nₑ 近似線性變化。0-D 輸出只供趨勢教學，不可用於 recipe 或產品保證。`;
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
    reset.setAttribute("aria-label", "重設 A32 0-D 全域模型參數");
    controls.replaceChildren(
      createSegmentedControl({
        label: "氣體",
        options: Object.entries(globalModelGases).map(([value, gas]) => ({ value, label: gas.label })),
        value: state.gas,
        onChange: (value) => change("gas", value)
      }),
      createSlider({ label: "壓力", min: 2, max: 100, step: 1, value: state.pressureMtorr, unit: "mTorr", onInput: (value) => change("pressureMtorr", value) }),
      createSlider({ label: "腔體半徑", min: 5, max: 50, step: 1, value: state.radiusCm, unit: "cm", onInput: (value) => change("radiusCm", value) }),
      createSlider({ label: "腔體高度", min: 3, max: 50, step: 1, value: state.heightCm, unit: "cm", onInput: (value) => change("heightCm", value) }),
      createSlider({ label: "吸收功率", min: 50, max: 3000, step: 50, value: state.absorbedPowerW, unit: "W", onInput: (value) => change("absorbedPowerW", value) }),
      createSlider({ label: "流量", min: 5, max: 1000, step: 5, value: state.flowSccm, unit: "sccm", onInput: (value) => change("flowSccm", value) }),
      reset,
      panel
    );
  }

  mountControls();
  component.render();
  observedWidth = canvas.getBoundingClientRect().width;
  resizeObserver = new ResizeObserver(([entry]) => {
    if (Math.abs(entry.contentRect.width - observedWidth) < 0.5) return;
    observedWidth = entry.contentRect.width;
    component.render();
  });
  resizeObserver.observe(canvas);
  return component;
}

function drawGlobalModel(ctx, state, solution, powerScan) {
  const metrics = syncCanvasResolution(ctx.canvas);
  const { width, height, px, isMobile } = metrics;
  const theme = state.theme;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  const left = px(isMobile ? 38 : 50);
  const right = width - px(16);
  const balancePlot = { left, right, top: px(30), bottom: px(220) };
  const powerPlot = { left, right, top: px(278), bottom: height - px(32) };
  drawBalancePlot(ctx, metrics, theme, balancePlot, solution);
  drawPowerPlot(ctx, metrics, theme, powerPlot, solution, powerScan);

  if (!isMobile) {
    ctx.fillStyle = theme.muted;
    setFont(ctx, metrics, 10, 500);
    ctx.fillText("0-D 平均趨勢，不解析空間分布或表面反應網路", left, height - px(10));
  }
}

function drawBalancePlot(ctx, metrics, theme, plot, solution) {
  const { px, isMobile } = metrics;
  const points = solution.balanceCurves;
  const xMin = points[0].temperatureEv;
  const xMax = points.at(-1).temperatureEv;
  const yMax = Math.max(...points.map((point) => point.particleProductionNormalized), points[0].particleLossNormalized) * 1.15;
  const x = (value) => plot.left + (value - xMin) / (xMax - xMin) * (plot.right - plot.left);
  const y = (value) => plot.bottom - value / yMax * (plot.bottom - plot.top);

  drawFrame(ctx, metrics, theme, plot, isMobile ? "粒子平衡" : "粒子平衡（歸一化）");
  drawCurve(ctx, metrics, points, (point) => x(point.temperatureEv), (point) => y(point.particleProductionNormalized), theme.electron);
  ctx.strokeStyle = theme.ion;
  ctx.lineWidth = px(1.5);
  ctx.setLineDash([px(5), px(3)]);
  ctx.beginPath();
  ctx.moveTo(plot.left, y(points[0].particleLossNormalized));
  ctx.lineTo(plot.right, y(points[0].particleLossNormalized));
  ctx.stroke();
  ctx.setLineDash([]);

  const crossX = x(solution.electronTemperatureEv);
  const crossY = y(points[0].particleLossNormalized);
  ctx.fillStyle = theme.warning;
  ctx.beginPath();
  ctx.arc(crossX, crossY, px(4), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.text;
  setFont(ctx, metrics, isMobile ? 8 : 10, 700);
  ctx.fillText(`${isMobile ? "Tₑ" : "交點 Tₑ"} ${solution.electronTemperatureEv.toFixed(2)} eV`, Math.min(crossX + px(7), plot.right - px(isMobile ? 72 : 136)), crossY - px(8));
  if (!isMobile) {
    ctx.fillStyle = theme.electron;
    setFont(ctx, metrics, 10, 600);
    ctx.fillText("產生", plot.right - px(28), y(points.at(-1).particleProductionNormalized) - px(5));
    ctx.fillStyle = theme.ion;
    ctx.fillText("損失", plot.right - px(28), y(points[0].particleLossNormalized) - px(5));
  }
  drawAxes(ctx, metrics, theme, plot, `${xMin.toFixed(0)} eV`, `${xMax.toFixed(0)} eV`, "Tₑ");
}

function drawPowerPlot(ctx, metrics, theme, plot, solution, powerScan) {
  const { px, isMobile } = metrics;
  const xMin = powerScan[0].inputValue;
  const xMax = powerScan.at(-1).inputValue;
  const yMax = Math.max(...powerScan.map((point) => point.electronDensityCm3)) * 1.12;
  const x = (value) => plot.left + (value - xMin) / (xMax - xMin) * (plot.right - plot.left);
  const y = (value) => plot.bottom - value / yMax * (plot.bottom - plot.top);

  drawFrame(ctx, metrics, theme, plot, isMobile ? "功率 vs nₑ" : "吸收功率掃描：nₑ 近似線性");
  drawCurve(ctx, metrics, powerScan, (point) => x(point.inputValue), (point) => y(point.electronDensityCm3), theme.primary);
  for (const point of powerScan) {
    ctx.fillStyle = theme.primary;
    ctx.beginPath();
    ctx.arc(x(point.inputValue), y(point.electronDensityCm3), px(2.7), 0, Math.PI * 2);
    ctx.fill();
  }
  const current = powerScan.reduce((closest, point) => Math.abs(point.inputValue - solution.state.absorbedPowerW) < Math.abs(closest.inputValue - solution.state.absorbedPowerW) ? point : closest);
  ctx.fillStyle = theme.warning;
  ctx.beginPath();
  ctx.arc(x(current.inputValue), y(current.electronDensityCm3), px(4), 0, Math.PI * 2);
  ctx.fill();
  if (!isMobile) {
    ctx.fillStyle = theme.muted;
    setFont(ctx, metrics, 9, 500);
    ctx.fillText(`${(yMax / 1e10).toFixed(1)}e10 cm⁻³`, plot.left + px(3), plot.top + px(11));
  }
  drawAxes(ctx, metrics, theme, plot, `${xMin} W`, `${xMax} W`, "功率");
}

function drawFrame(ctx, metrics, theme, plot, title) {
  const { px, isMobile } = metrics;
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = px(1);
  ctx.strokeRect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top);
  ctx.fillStyle = theme.text;
  setFont(ctx, metrics, isMobile ? 9 : 11, 700);
  ctx.fillText(title, plot.left, plot.top - px(8));
}

function drawCurve(ctx, metrics, points, getX, getY, color) {
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = getX(point);
    const y = getY(point);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = metrics.px(1.8);
  ctx.stroke();
}

function drawAxes(ctx, metrics, theme, plot, start, end, label) {
  const { px, isMobile } = metrics;
  if (isMobile) return;
  ctx.fillStyle = theme.muted;
  setFont(ctx, metrics, 9, 500);
  ctx.fillText(start, plot.left, plot.bottom + px(13));
  ctx.fillText(end, plot.right - px(37), plot.bottom + px(13));
  ctx.fillText(label, plot.right - px(15), plot.bottom + px(25));
}

function updatePanel(panel, solution) {
  const set = (key, value) => { panel.querySelector(`[data-value-key="${key}"]`).textContent = value; };
  set("電子溫度 Tₑ", `${solution.electronTemperatureEv.toFixed(2)} eV`);
  set("電子密度 nₑ", `${solution.electronDensityCm3.toExponential(2)} cm⁻³`);
  set("離子通量 Γᵢ", `${solution.ionFluxCm2s.toExponential(2)} cm⁻² s⁻¹`);
  set("自由基密度", `${solution.radicalDensityCm3.toExponential(2)} cm⁻³`);
  set("滯留時間 τ", `${solution.residenceTimeS.toFixed(3)} s`);
  set("V/A 特徵長度", `${solution.effectiveLengthCm.toFixed(2)} cm`);
}

function syncCanvasResolution(canvas) {
  const cssWidth = Math.max(280, canvas.getBoundingClientRect().width || 720);
  const cssHeight = cssWidth / (720 / 430);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(cssWidth * dpr);
  const height = Math.round(cssHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  canvas.dataset.minFontCssPx = "11";
  canvas.dataset.labelLayout = cssWidth < 520 ? "compact" : "full";
  return { width, height, dpr, isMobile: cssWidth < 520, px: (value) => value * width / 720 };
}

function setFont(ctx, metrics, cssPx, weight) {
  const canvasPixels = Math.max(metrics.px(cssPx), 11 * metrics.dpr);
  ctx.font = `${weight} ${canvasPixels}px system-ui, sans-serif`;
}
