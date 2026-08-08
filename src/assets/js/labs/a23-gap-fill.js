import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createSlider, createValuePanel } from "../controls.js";
import { evaluateGapFill } from "../deposition-model.js";
import { createLifecycle } from "../lifecycle.js";

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  canvas.width = 720; canvas.height = 400;
  canvas.setAttribute("aria-label", "PECVD 與 HDP-CVD 高深寬比填溝對照");
  const ctx = canvas.getContext("2d");
  const state = { aspectRatio: 4, dsRatio: 5, timePercent: 70, theme: readCanvasTheme() };
  const panel = createValuePanel([["PECVD 判定", "—"], ["PECVD 覆蓋率", "—"], ["HDP 判定", "—"], ["HDP 覆蓋率", "—"], ["孔底 LOS", "—"], ["HDP 淨沉積", "—"]]);
  const instance = {
    render() { const result = evaluateGapFill(state); drawGapFill(ctx, state, result); updatePanel(panel, result); status.textContent = `PECVD：${result.pecvd.classification}；HDP：${result.hdp.classification}。D/S ${state.dsRatio.toFixed(1)}、AR ${state.aspectRatio.toFixed(1)}、孔底視線到達率 ${(result.transport.bottomArrivalFraction * 100).toFixed(1)}%。模型只比較填溝機制方向。`; },
    reset() {}, applyTheme(theme) { state.theme = theme; this.render(); }, destroy() { unwatch(); }
  };
  const component = createLifecycle(instance); const unwatch = watchTheme(component);
  const change = (key, value) => { state[key] = value; component.render(); };
  controls.replaceChildren(
    createSlider({ label: "D/S 比", min: 1, max: 20, value: state.dsRatio, step: 0.5, onInput: (value) => change("dsRatio", value) }),
    createSlider({ label: "深寬比", min: 1, max: 10, value: state.aspectRatio, step: 0.5, onInput: (value) => change("aspectRatio", value) }),
    createSlider({ label: "沉積進度", min: 0, max: 100, value: state.timePercent, step: 1, unit: "%", onInput: (value) => change("timePercent", value) }),
    panel
  );
  component.render(); return component;
}

function drawGapFill(ctx, state, result) {
  const { theme } = state;
  ctx.clearRect(0, 0, 720, 400); ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, 720, 400);
  drawCell(ctx, 32, 336, "PECVD", result.pecvd, state, theme, false);
  drawCell(ctx, 384, 688, "HDP-CVD", result.hdp, state, theme, true);
}

function drawCell(ctx, left, right, label, metrics, state, theme, hdp) {
  const center = (left + right) / 2, top = 68, bottom = 348;
  const opening = 116 / Math.sqrt(state.aspectRatio / 2);
  ctx.fillStyle = "#7f8da3"; ctx.fillRect(left, top, right - left, bottom - top);
  ctx.fillStyle = theme.bg; ctx.fillRect(center - opening / 2, top, opening, bottom - top);
  const deposited = Math.min(62, state.timePercent * 0.54);
  const cusp = metrics.cuspPercent * 0.46;
  ctx.fillStyle = theme.electron;
  ctx.fillRect(left, top, center - opening / 2 - left, deposited * 0.45);
  ctx.fillRect(center + opening / 2, top, right - center - opening / 2, deposited * 0.45);
  ctx.beginPath(); ctx.moveTo(center - opening / 2, top); ctx.lineTo(center - opening / 2 + cusp, top + cusp); ctx.lineTo(center - opening / 2, top + deposited); ctx.fill();
  ctx.beginPath(); ctx.moveTo(center + opening / 2, top); ctx.lineTo(center + opening / 2 - cusp, top + cusp); ctx.lineTo(center + opening / 2, top + deposited); ctx.fill();
  const bottomFill = (bottom - top) * metrics.fillPercent / 100 * 0.72;
  ctx.fillRect(center - opening / 2, bottom - bottomFill, opening, bottomFill);
  if (metrics.void) {
    ctx.fillStyle = theme.bg; ctx.beginPath(); ctx.ellipse(center, top + 138, Math.max(8, opening * 0.23), 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#c63434"; ctx.lineWidth = 2; ctx.stroke();
  }
  if (hdp) {
    metrics.profile.forEach((cell, index) => {
      if (index % 2 !== 0) return;
      const y = top + cell.depth * (bottom - top);
      const thickness = Math.max(1, cell.leftThickness * 12);
      ctx.strokeStyle = theme.electron; ctx.lineWidth = thickness; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(center - opening / 2, y); ctx.lineTo(center - opening / 2 + thickness, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(center + opening / 2, y); ctx.lineTo(center + opening / 2 - thickness, y); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.ion; ctx.lineWidth = 2;
    for (const dir of [-1, 1]) { ctx.beginPath(); ctx.moveTo(center + dir * 88, top - 25); ctx.lineTo(center + dir * (opening / 2 + 12), top + 28); ctx.stroke(); }
    ctx.fillStyle = theme.muted; ctx.font = "12px system-ui"; ctx.textAlign = "center"; ctx.fillText("45° 肩部濺鍍", center, top - 8);
  }
  ctx.fillStyle = theme.text; ctx.font = "800 16px system-ui"; ctx.textAlign = "center"; ctx.fillText(label, center, 28);
  ctx.font = "700 12px system-ui"; ctx.fillText(metrics.classification, center, 382);
}

function updatePanel(panel, result) {
  const values = { "PECVD 判定": result.pecvd.classification, "PECVD 覆蓋率": `${result.pecvd.stepCoveragePercent.toFixed(1)}%`, "HDP 判定": result.hdp.classification, "HDP 覆蓋率": `${result.hdp.stepCoveragePercent.toFixed(1)}%`, "孔底 LOS": `${(result.transport.bottomArrivalFraction * 100).toFixed(1)}%`, "HDP 淨沉積": result.hdp.netDeposition.toFixed(2) };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}
