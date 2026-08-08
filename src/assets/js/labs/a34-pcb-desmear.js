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
      drawPcbWall(ctx, canvas, state, result);
      updatePanel(panel, result);
      status.textContent = `${result.verdict} 教學模型的絕對數值不可作為量產 recipe；正式導入需完成 DOE、截面量測、abatement、材料相容與 EHS 核准。`;
    },
    update() { return false; },
    applyTheme(theme) { state.theme = theme; this.render(); }
  });
  const stopWatchingTheme = watchTheme(component);

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
  component.destroy = () => { stopWatchingTheme(); destroy(); };
  component.render();
  return component;
}

function updatePanel(panel, result) {
  const values = {
    "樹脂深度": `${result.resinDepthUm.toFixed(1)} um`,
    "玻纖深度": `${result.glassDepthUm.toFixed(1)} um`,
    "突出／凹陷": result.flushnessUm >= 0 ? `突出 ${result.flushnessUm.toFixed(1)} um` : `凹陷 ${Math.abs(result.flushnessUm).toFixed(1)} um`,
    "深度判定": result.depthPass ? "通過" : `未達 ${result.depthWindow.min}-${result.depthWindow.max} um`,
    "Flushness": result.flushnessPass ? "通過" : "不通過",
    "總結": result.depthPass && result.flushnessPass ? "可進入下一步驗證" : "不可只以深度放行"
  };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}

function drawPcbWall(ctx, canvas, state, result) {
  const { width, height } = canvas;
  const theme = state.theme;
  ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = theme.text; ctx.font = "600 16px system-ui";
  ctx.fillText("鑽孔 via wall：樹脂與玻纖的相對幾何", 28, 30);
  ctx.fillText("CF4 比例與材料去除速率", 400, 30);
  const wall = { x: 42, y: 58, w: 292, h: 250 };
  ctx.strokeStyle = theme.border; ctx.lineWidth = 2; ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
  ctx.fillStyle = theme.surface; ctx.fillRect(wall.x + 14, wall.y + 18, wall.w - 28, wall.h - 36);
  const copperY = wall.y + 80;
  ctx.fillStyle = theme.warning; ctx.fillRect(wall.x + 36, copperY, wall.w - 72, 16);
  ctx.fillStyle = theme.text; ctx.font = "13px system-ui"; ctx.fillText("內層銅", wall.x + 42, copperY - 8);
  const surfaceY = wall.y + 160;
  ctx.strokeStyle = theme.muted; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(wall.x + 26, surfaceY); ctx.lineTo(wall.x + wall.w - 26, surfaceY); ctx.stroke(); ctx.setLineDash([]);
  const scale = 11;
  const resinY = surfaceY - result.resinDepthUm * scale;
  const glassY = surfaceY - result.glassDepthUm * scale;
  ctx.fillStyle = theme.primary; ctx.fillRect(wall.x + 62, resinY, 92, surfaceY - resinY);
  ctx.fillStyle = theme.neutral; ctx.fillRect(wall.x + 180, glassY, 42, surfaceY - glassY);
  ctx.fillStyle = theme.text; ctx.fillText("樹脂", wall.x + 77, surfaceY + 24); ctx.fillText("玻纖", wall.x + 177, surfaceY + 24);
  ctx.strokeStyle = result.flushnessPass ? theme.success : theme.danger; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(wall.x + 252, resinY); ctx.lineTo(wall.x + 252, glassY); ctx.stroke();
  ctx.fillStyle = result.flushnessPass ? theme.success : theme.danger; ctx.fillText(result.flushnessPass ? "平齊" : result.flushnessUm > 0 ? "突出" : "凹陷", wall.x + 232, wall.y + 220);

  const plot = { x: 402, y: 58, w: 286, h: 250 };
  ctx.strokeStyle = theme.border; ctx.lineWidth = 1.5; ctx.strokeRect(plot.x, plot.y, plot.w, plot.h);
  ctx.fillStyle = theme.muted; ctx.font = "12px system-ui"; ctx.fillText("CF4 (%)", plot.x + plot.w - 45, plot.y + plot.h + 22); ctx.fillText("um/min", plot.x + 4, plot.y + 15);
  const x = (cf4) => plot.x + (cf4 / 80) * plot.w;
  const y = (rate) => plot.y + plot.h - (rate / 1.3) * plot.h;
  drawCurve(ctx, theme.primary, Array.from({ length: 81 }, (_, cf4) => [x(cf4), y(resinRemovalRate(cf4, state.powerW, state.pressureTorr))]));
  drawCurve(ctx, theme.neutral, Array.from({ length: 81 }, (_, cf4) => [x(cf4), y(glassRemovalRate(cf4, state.powerW, state.pressureTorr))]));
  ctx.fillStyle = theme.text; ctx.fillText("樹脂", plot.x + 12, plot.y + 38); ctx.fillText("玻纖", plot.x + 12, plot.y + 56);
  ctx.fillStyle = result.flushnessPass ? theme.success : theme.danger; ctx.beginPath(); ctx.arc(x(state.cf4Percent), y(result.resinRateUmPerMin), 5, 0, Math.PI * 2); ctx.fill();
}

function drawCurve(ctx, color, points) {
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
}
