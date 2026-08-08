import { createSegmentedControl, createSlider, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { evaluatePcbProcess, pcbTargets, resinRemovalRate, glassRemovalRate } from "../pcb-model.js";
import { readCanvasTheme, watchTheme } from "../canvas-theme.js";

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const ctx = canvas.getContext("2d");
  const state = { targetMode: "desmear", cf4Percent: 20, powerW: 300, pressureTorr: 0.4, timeMinutes: 15, theme: readCanvasTheme() };
  const panel = createValuePanel([["樹脂深度", "—"], ["玻纖深度", "—"], ["突出／凹陷", "—"], ["深度判定", "—"], ["Flushness", "—"], ["總結", "—"]]);

  const component = createLifecycle({
    render() {
      const result = evaluatePcbProcess(state);
      const size = prepareCanvas(canvas, ctx);
      drawPcbWall(ctx, size, state, result);
      updatePanel(panel, result);
      status.textContent = `${result.verdict} 教學模型的絕對數值不可作為量產 recipe；正式導入需完成 DOE、截面量測、abatement、材料相容與 EHS 核准。`;
    },
    update() { return false; },
    applyTheme(theme) { state.theme = theme; this.render(); }
  });
  const stopWatchingTheme = watchTheme(component);
  const handleResize = () => component.render();
  window.addEventListener("resize", handleResize);

  function change(key, value) {
    state[key] = value;
    component.render();
  }

  controls.replaceChildren(
    createSegmentedControl({ label: "目標模式", options: Object.entries(pcbTargets).map(([value, item]) => ({ value, label: item.label })), value: state.targetMode, onChange: (value) => change("targetMode", value) }),
    createSlider({ label: "CF4 比例", min: 0, max: 80, value: state.cf4Percent, step: 1, unit: "%", onInput: (value) => change("cf4Percent", value) }),
    createSlider({ label: "功率", min: 100, max: 600, value: state.powerW, step: 10, unit: "W", onInput: (value) => change("powerW", value) }),
    createSlider({ label: "壓力", min: 0.1, max: 1, value: state.pressureTorr, step: 0.05, unit: "Torr", onInput: (value) => change("pressureTorr", value) }),
    createSlider({ label: "處理時間", min: 5, max: 60, value: state.timeMinutes, step: 1, unit: "min", onInput: (value) => change("timeMinutes", value) }),
    panel
  );
  const destroy = component.destroy.bind(component);
  component.destroy = () => {
    stopWatchingTheme();
    window.removeEventListener("resize", handleResize);
    destroy();
  };
  component.render();
  return component;
}

function updatePanel(panel, result) {
  const values = {
    "樹脂深度": `${result.resinDepthUm.toFixed(1)} um`,
    "玻纖深度": `${result.glassDepthUm.toFixed(1)} um`,
    "突出／凹陷": result.flushnessUm >= 0 ? `突出 ${result.flushnessUm.toFixed(1)} um` : `凹陷 ${Math.abs(result.flushnessUm).toFixed(1)} um`,
    "深度判定": pcbDepthMessage(result),
    "Flushness": result.flushnessPass ? "通過" : "不通過",
    "總結": result.depthPass && result.flushnessPass ? "可進入下一步驗證" : "不可只以深度放行"
  };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}

export function pcbDepthMessage(result) {
  if (result.depthPass) return "通過";
  if (result.resinDepthUm < result.depthWindow.min) return `低於下限 ${result.depthWindow.min} um`;
  return `高於上限 ${result.depthWindow.max} um`;
}

export function buildPcbVisualizationLayout({ width, height, state, result }) {
  const compact = width < 620;
  const margin = compact ? 18 : 28;
  const wall = compact
    ? { x: margin, y: 56, w: width - margin * 2, h: Math.round(height * 0.38) }
    : { x: margin, y: 58, w: Math.round(width * 0.4), h: height - 92 };
  const plot = compact
    ? { x: margin, y: wall.y + wall.h + 50, w: width - margin * 2, h: height - (wall.y + wall.h + 72) }
    : { x: wall.x + wall.w + 54, y: 58, w: width - (wall.x + wall.w + 82), h: height - 92 };
  const depthMax = niceCeiling(Math.max(result.depthWindow.max, result.resinDepthUm, result.glassDepthUm) * 1.12);
  const surfaceY = wall.y + wall.h - 42;
  const depthTop = wall.y + 44;
  const depthScale = (surfaceY - depthTop) / depthMax;
  const resinY = surfaceY - result.resinDepthUm * depthScale;
  const glassY = surfaceY - result.glassDepthUm * depthScale;
  const rates = Array.from({ length: 81 }, (_, cf4) => Math.max(
    resinRemovalRate(cf4, state.powerW, state.pressureTorr),
    glassRemovalRate(cf4, state.powerW, state.pressureTorr)
  ));
  const rateMax = niceCeiling(Math.max(...rates) * 1.12);
  const plotTop = plot.y + 30;
  const plotBottom = plot.y + plot.h - 30;
  const x = (cf4) => plot.x + 10 + (cf4 / 80) * (plot.w - 20);
  const y = (rate) => plotBottom - (rate / rateMax) * (plotBottom - plotTop);
  const resinPoints = Array.from({ length: 81 }, (_, cf4) => [x(cf4), y(resinRemovalRate(cf4, state.powerW, state.pressureTorr))]);
  const glassPoints = Array.from({ length: 81 }, (_, cf4) => [x(cf4), y(glassRemovalRate(cf4, state.powerW, state.pressureTorr))]);
  const allPoints = [...resinPoints, ...glassPoints];
  const bounded = [resinY, glassY].every((value) => value >= depthTop - 0.01 && value <= surfaceY + 0.01)
    && allPoints.every(([px, py]) => px >= plot.x && px <= plot.x + plot.w && py >= plotTop - 0.01 && py <= plotBottom + 0.01);
  return {
    compact,
    wall,
    plot,
    depthMax,
    rateMax,
    rates,
    resinY,
    glassY,
    surfaceY,
    depthTop,
    plotTop,
    plotBottom,
    resinPoints,
    glassPoints,
    x,
    y,
    bounded,
    bounds: { width, height, wall, plot, resinY, glassY, plotTop, plotBottom }
  };
}

function prepareCanvas(canvas, ctx) {
  const cssWidth = Math.max(280, Math.round(canvas.getBoundingClientRect().width || 720));
  const compact = cssWidth < 620;
  const cssHeight = compact ? Math.round(Math.min(560, Math.max(480, cssWidth * 1.45))) : Math.round(cssWidth * 0.5);
  const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
  const pixelWidth = Math.round(cssWidth * pixelRatio);
  const pixelHeight = Math.round(cssHeight * pixelRatio);
  canvas.style.aspectRatio = `${cssWidth} / ${cssHeight}`;
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return { width: cssWidth, height: cssHeight };
}

function drawPcbWall(ctx, size, state, result) {
  const { width, height } = size;
  const theme = state.theme;
  ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, width, height);
  const layout = buildPcbVisualizationLayout({ width, height, state, result });
  const { wall, plot, resinY, glassY, surfaceY } = layout;
  ctx.fillStyle = theme.text; ctx.font = "600 15px system-ui";
  ctx.fillText("鑽孔 via wall：樹脂與玻纖", wall.x, 28);
  ctx.fillText("CF4 比例與材料去除速率", plot.x, layout.compact ? plot.y - 18 : 28);
  ctx.fillStyle = theme.muted; ctx.font = "12px system-ui";
  ctx.fillText(`深度尺度 0-${layout.depthMax} um`, Math.max(wall.x, wall.x + wall.w - 138), wall.y - 8);
  ctx.strokeStyle = theme.border; ctx.lineWidth = 2; ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
  ctx.fillStyle = theme.surface; ctx.fillRect(wall.x + 12, wall.y + 12, wall.w - 24, wall.h - 24);
  const copperY = wall.y + 28;
  ctx.fillStyle = theme.warning; ctx.fillRect(wall.x + 30, copperY, wall.w - 60, 12);
  ctx.fillStyle = theme.text; ctx.font = "13px system-ui"; ctx.fillText("內層銅", wall.x + 34, copperY - 6);
  ctx.strokeStyle = theme.muted; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(wall.x + 26, surfaceY); ctx.lineTo(wall.x + wall.w - 26, surfaceY); ctx.stroke(); ctx.setLineDash([]);
  const resinX = wall.x + wall.w * 0.18;
  const glassX = wall.x + wall.w * 0.62;
  ctx.fillStyle = theme.primary; ctx.fillRect(resinX, resinY, wall.w * 0.28, surfaceY - resinY);
  ctx.fillStyle = theme.neutral; ctx.fillRect(glassX, glassY, wall.w * 0.14, surfaceY - glassY);
  ctx.fillStyle = theme.text; ctx.fillText("樹脂", resinX, surfaceY + 22); ctx.fillText("玻纖", glassX, surfaceY + 22);
  ctx.strokeStyle = result.flushnessPass ? theme.success : theme.danger; ctx.lineWidth = 3;
  const compareX = wall.x + wall.w - 42;
  ctx.beginPath(); ctx.moveTo(compareX, resinY); ctx.lineTo(compareX, glassY); ctx.stroke();
  ctx.fillStyle = result.flushnessPass ? theme.success : theme.danger;
  ctx.fillText(result.flushnessPass ? "平齊" : result.flushnessUm > 0 ? "突出" : "凹陷", wall.x + wall.w - 70, wall.y + wall.h - 14);

  ctx.strokeStyle = theme.border; ctx.lineWidth = 1.5; ctx.strokeRect(plot.x, plot.y, plot.w, plot.h);
  ctx.fillStyle = theme.muted; ctx.font = "12px system-ui";
  ctx.fillText("CF4 (%)", plot.x + plot.w - 50, plot.y + plot.h - 8);
  ctx.fillText(`0-${layout.rateMax} um/min`, plot.x + 8, plot.y + 17);
  drawCurve(ctx, theme.primary, layout.resinPoints);
  drawCurve(ctx, theme.neutral, layout.glassPoints);
  ctx.fillStyle = theme.text; ctx.fillText("樹脂", plot.x + 12, plot.y + 42); ctx.fillText("玻纖", plot.x + 62, plot.y + 42);
  ctx.fillStyle = result.flushnessPass ? theme.success : theme.danger;
  ctx.beginPath(); ctx.arc(layout.x(state.cf4Percent), layout.y(result.resinRateUmPerMin), 5, 0, Math.PI * 2); ctx.fill();
}

function drawCurve(ctx, color, points) {
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
}

function niceCeiling(value) {
  if (value <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}
