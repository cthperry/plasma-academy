import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { evaluateMagnetron } from "../chamber-model.js";
import { createSlider, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]"); const controls = container.querySelector("[data-lab-controls]"); const status = container.querySelector("[data-lab-status]");
  canvas.width = 720; canvas.height = 400; canvas.setAttribute("aria-label", "磁控濺鍍電子 E×B 漂移、離子轟擊與 racetrack 侵蝕動畫");
  const ctx = canvas.getContext("2d");
  const state = { magneticFieldGauss: 300, pressureMtorr: 4, powerKw: 8, hours: 350, elapsed: 0, lastTime: 0, theme: readCanvasTheme() };
  const panel = createValuePanel([["電子路徑", "—"], ["游離效率", "—"], ["靶材利用率", "—"], ["Racetrack 深度", "—"], ["速率漂移", "—"]]);
  const instance = {
    update(time = 0) { const delta = Math.min(50, time - state.lastTime || 16); state.lastTime = time; state.elapsed += delta; },
    render() { const result = evaluateMagnetron(state); drawMagnetron(ctx, state, result); updatePanel(panel, result); status.textContent = `${result.classification}；相對游離效率 ${result.ionizationEfficiency.toFixed(1)}%，靶材利用率 ${result.targetUtilizationPercent.toFixed(1)}%。模型用於比較磁場與耗材趨勢。`; },
    reset() {}, applyTheme(theme) { state.theme = theme; this.render(); }, destroy() { unwatch(); }
  };
  const component = createLifecycle(instance); const unwatch = watchTheme(component); const change = (key, value) => { state[key] = value; component.render(); };
  controls.replaceChildren(
    createSlider({ label: "磁場強度", min: 0, max: 500, value: state.magneticFieldGauss, step: 10, unit: "G", onInput: (value) => change("magneticFieldGauss", value) }),
    createSlider({ label: "壓力", min: 1, max: 20, value: state.pressureMtorr, step: 0.5, unit: "mTorr", onInput: (value) => change("pressureMtorr", value) }),
    createSlider({ label: "功率", min: 1, max: 20, value: state.powerKw, step: 0.5, unit: "kW", onInput: (value) => change("powerKw", value) }),
    createSlider({ label: "累積使用", min: 0, max: 1200, value: state.hours, step: 10, unit: "h", onInput: (value) => change("hours", value) }), panel
  ); component.render(); return component;
}

function drawMagnetron(ctx, state, result) {
  const { theme } = state; ctx.clearRect(0, 0, 720, 400); ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, 720, 400);
  ctx.fillStyle = "#9aa6b5"; ctx.fillRect(60, 80, 600, 58);
  const depth = Math.min(40, result.erosionDepthMm * 2.4);
  ctx.fillStyle = theme.bg; ctx.beginPath(); ctx.ellipse(360, 80, 190, depth, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = "#52657d"; ctx.fillRect(60, 138, 600, 36);
  ctx.strokeStyle = theme.primary; ctx.globalAlpha = 0.55; ctx.lineWidth = 2;
  const loops = Math.max(1, Math.round(state.magneticFieldGauss / 70));
  for (let index = 0; index < loops; index += 1) { ctx.beginPath(); ctx.ellipse(360, 106, 80 + index * 27, 80 + index * 11, 0, Math.PI, Math.PI * 2); ctx.stroke(); }
  ctx.globalAlpha = 1;
  const motion = state.elapsed / 6;
  ctx.fillStyle = theme.electron;
  const count = Math.max(4, Math.round(5 + state.magneticFieldGauss / 35));
  for (let index = 0; index < count; index += 1) { const angle = (motion + index * 37) * Math.PI / 180; const radius = 55 + index % 6 * 24; const x = 360 + Math.cos(angle * 1.8) * radius; const y = 218 + Math.sin(angle) * 68; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = theme.ion;
  for (let index = 0; index < 16; index += 1) { const x = 160 + index * 27; ctx.beginPath(); ctx.moveTo(x, 250); ctx.lineTo(360 + (x - 360) * 0.72, 140); ctx.strokeStyle = theme.ion; ctx.stroke(); }
  ctx.fillStyle = "#aab4c0"; ctx.beginPath(); ctx.ellipse(360, 365, 270, 20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = theme.text; ctx.font = "700 13px system-ui"; ctx.fillText("靶材與 racetrack", 72, 58); ctx.fillText("晶圓", 342, 370);
}

function updatePanel(panel, result) {
  const values = { "電子路徑": `${result.pathLengthM.toFixed(2)} m`, "游離效率": `${result.ionizationEfficiency.toFixed(1)}%`, "靶材利用率": `${result.targetUtilizationPercent.toFixed(1)}%`, "Racetrack 深度": `${result.erosionDepthMm.toFixed(2)} mm`, "速率漂移": `${result.rateDriftPercent.toFixed(1)}%` };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}
