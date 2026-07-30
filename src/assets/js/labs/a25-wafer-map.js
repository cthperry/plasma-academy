import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { evaluateWaferMap, waferMapPresets } from "../chamber-model.js";
import { createButton, createSegmentedControl, createSlider, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]"); const controls = container.querySelector("[data-lab-controls]"); const status = container.querySelector("[data-lab-status]");
  canvas.width = 720; canvas.height = 430; canvas.setAttribute("aria-label", "晶圓速率熱圖與徑向剖面曲線");
  const ctx = canvas.getContext("2d");
  const state = { preset: "center-fast", gapCm: 3, pressureMtorr: 30, centerGasPercent: 50, centerTempC: 20, edgeTempC: 20, focusRingWearPercent: 0, pumpAngleDeg: 0, challenge: false, revealed: true, dirty: true, theme: readCanvasTheme() };
  const panel = createValuePanel([["Map 判定", "—"], ["平均速率", "—"], ["半幅不均勻度", "—"], ["1σ 不均勻度", "—"]]);
  const instance = {
    render() { if (!state.dirty) return; const result = evaluateWaferMap(state); drawWaferMap(ctx, state, result); updatePanel(panel, result, state); status.textContent = state.challenge && !state.revealed ? "反向練習：先依 map 形狀判斷，再按揭曉。" : `${result.classification}；半幅 ${result.halfRangePercent.toFixed(2)}%，1σ ${result.oneSigmaPercent.toFixed(2)}%。兩種定義不可混用。`; state.dirty = false; },
    reset() {}, applyTheme(theme) { state.theme = theme; state.dirty = true; this.render(); }, destroy() { unwatch(); }
  };
  const component = createLifecycle(instance); const unwatch = watchTheme(component);
  const change = (key, value) => { state[key] = value; state.challenge = false; state.revealed = true; state.dirty = true; component.render(); };
  const challenge = createButton("隨機出題", () => { const options = waferMapPresets.map(([id]) => id); state.preset = options[Math.floor(Math.random() * options.length)]; resetChallengeInputs(controls, state); state.challenge = true; state.revealed = false; state.dirty = true; clearPresetSelection(controls); component.render(); });
  const reveal = createButton("揭曉", () => { state.revealed = true; state.dirty = true; component.render(); });
  controls.replaceChildren(
    createSegmentedControl({ label: "Map 預設", options: waferMapPresets.map(([value, label]) => ({ value, label })), value: state.preset, onChange: (value) => change("preset", value) }),
    createSlider({ label: "Gap", min: 1, max: 5, value: state.gapCm, step: 0.1, unit: "cm", onInput: (value) => change("gapCm", value) }),
    createSlider({ label: "壓力", min: 5, max: 150, value: state.pressureMtorr, step: 5, unit: "mTorr", onInput: (value) => change("pressureMtorr", value) }),
    createSlider({ label: "中心氣體比例", min: 0, max: 100, value: state.centerGasPercent, step: 1, unit: "%", onInput: (value) => change("centerGasPercent", value) }),
    createSlider({ label: "中心溫度", min: 0, max: 80, value: state.centerTempC, step: 1, unit: "°C", onInput: (value) => change("centerTempC", value) }),
    createSlider({ label: "邊緣溫度", min: 0, max: 80, value: state.edgeTempC, step: 1, unit: "°C", onInput: (value) => change("edgeTempC", value) }),
    createSlider({ label: "聚焦環耗損", min: 0, max: 100, value: state.focusRingWearPercent, step: 1, unit: "%", onInput: (value) => change("focusRingWearPercent", value) }),
    createSlider({ label: "泵口角度", min: 0, max: 360, value: state.pumpAngleDeg, step: 5, unit: "°", onInput: (value) => change("pumpAngleDeg", value) }),
    actionRow(challenge, reveal), panel
  ); component.render(); return component;
}

function actionRow(...buttons) { const row = document.createElement("div"); row.className = "wafer-map-actions"; row.append(...buttons); return row; }

function clearPresetSelection(controls) {
  for (const button of controls.querySelectorAll('[role="radiogroup"] [role="radio"]')) {
    button.classList.remove("active");
    button.setAttribute("aria-checked", "false");
  }
}

function resetChallengeInputs(controls, state) {
  const defaults = [
    ["gapCm", 3, "3 cm"], ["pressureMtorr", 30, "30 mTorr"], ["centerGasPercent", 50, "50 %"],
    ["centerTempC", 20, "20 °C"], ["edgeTempC", 20, "20 °C"], ["focusRingWearPercent", 0, "0 %"], ["pumpAngleDeg", 0, "0 °"]
  ];
  const ranges = controls.querySelectorAll('input[type="range"]');
  defaults.forEach(([key, value, display], index) => {
    state[key] = value;
    ranges[index].value = value;
    ranges[index].closest(".control").querySelector("output").value = display;
  });
}

function drawWaferMap(ctx, state, result) {
  const { theme } = state; ctx.clearRect(0, 0, 720, 430); ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, 720, 430);
  const cx = 210, cy = 214, radius = 172; const min = result.min, span = Math.max(0.001, result.max - min);
  for (const item of result.values) { const normalized = (item.value - min) / span; ctx.fillStyle = heatColor(normalized); ctx.fillRect(cx + item.x * radius - 3, cy + item.y * radius - 3, 7, 7); }
  ctx.strokeStyle = theme.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = theme.text; ctx.font = "700 14px system-ui"; ctx.fillText("晶圓速率 map", 150, 24);
  const bins = Array.from({ length: 30 }, () => []); result.values.forEach((item) => bins[Math.min(29, Math.floor(item.radius * 30))].push(item.value));
  const radial = bins.map((bin) => bin.reduce((sum, value) => sum + value, 0) / Math.max(1, bin.length)); const rMin = Math.min(...radial), rMax = Math.max(...radial);
  ctx.strokeStyle = theme.primary; ctx.lineWidth = 3; ctx.beginPath(); radial.forEach((value, index) => { const x = 430 + index / 29 * 250; const y = 330 - (value - rMin) / Math.max(0.01, rMax - rMin) * 220; if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke();
  ctx.strokeStyle = theme.border; ctx.lineWidth = 1; ctx.strokeRect(430, 105, 250, 225); ctx.fillStyle = theme.text; ctx.fillText("徑向剖面", 510, 80);
  if (state.challenge && !state.revealed) { ctx.fillStyle = theme.bg; ctx.fillRect(430, 345, 250, 42); ctx.fillStyle = theme.muted; ctx.fillText("判定已隱藏", 510, 372); }
  else { ctx.fillStyle = theme.text; ctx.fillText(result.classification, 520, 372); }
}

function heatColor(value) { const hue = 220 - value * 210; return `hsl(${hue} 72% ${44 + value * 8}%)`; }

function updatePanel(panel, result, state) {
  const values = { "Map 判定": state.challenge && !state.revealed ? "待揭曉" : result.classification, "平均速率": result.mean.toFixed(2), "半幅不均勻度": `${result.halfRangePercent.toFixed(2)}%`, "1σ 不均勻度": `${result.oneSigmaPercent.toFixed(2)}%` };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}
