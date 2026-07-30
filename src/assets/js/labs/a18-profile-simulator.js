import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createSegmentedControl, createSlider, createToggle, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { evaluateEtchProfile, profilePresetById, profilePresets, profileRanges } from "../etch-profile-model.js";

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  canvas.width = 720;
  canvas.height = 430;
  canvas.setAttribute("aria-label", "八種蝕刻輪廓與多 CD 深寬比效應模擬");
  container.querySelector(".lab-stage").classList.add("lab-stage--profile");
  const ctx = canvas.getContext("2d");
  const requestedPreset = new URLSearchParams(window.location.search).get("profile");
  const initial = profilePresetById(requestedPreset || "vertical");
  const state = { ...initial, preset: initial.id, multi: false, elapsed: 0, lastTime: 0, theme: readCanvasTheme() };
  const panel = createValuePanel([
    ["判定形狀", "—"], ["蝕刻深度", "—"], ["頂／中／底寬", "—"], ["遮罩開口", "—"], ["底角深溝", "—"], ["聚合物收支", "—"]
  ]);

  const instance = {
    update(time = 0) {
      const delta = Math.min(50, time - state.lastTime || 16);
      state.lastTime = time;
      state.elapsed += delta;
    },
    render() {
      const metrics = evaluateEtchProfile(state);
      drawProfile(ctx, state, metrics);
      updatePanel(panel, metrics);
      const preset = profilePresetById(state.preset);
      const context = state.preset === "custom" ? "自訂參數：請以量測讀值判斷，不以預設名稱判定。" : preset.why;
      status.textContent = `${metrics.shape}；深度 ${metrics.depthPercent.toFixed(0)}%，頂／中／底寬 ${metrics.topWidth.toFixed(0)}／${metrics.middleWidth.toFixed(0)}／${metrics.bottomWidth.toFixed(0)}%。${context} 教材模型只比較機制方向，不可直接換算設備 recipe。`;
    },
    reset() { applyPreset("vertical"); },
    applyTheme(theme) { state.theme = theme; this.render(); },
    destroy() { unwatch(); }
  };
  const component = createLifecycle(instance);
  const unwatch = watchTheme(component);

  function applyPreset(id) {
    const preset = profilePresetById(id);
    Object.assign(state, preset, { preset: preset.id });
    renderControls();
    component.render();
  }

  function setState(key, value) {
    state[key] = value;
    state.preset = "custom";
    const presetGroup = controls.querySelector(".profile-preset-control .segmented-group");
    for (const button of presetGroup?.querySelectorAll("button") ?? []) {
      button.classList.remove("active");
      button.setAttribute("aria-checked", "false");
    }
    component.render();
  }

  function renderControls() {
    const presetControl = createSegmentedControl({
      label: "八種 profile 預設",
      options: profilePresets.map((item) => ({ value: item.id, label: item.label })),
      value: state.preset,
      onChange: applyPreset
    });
    presetControl.classList.add("profile-preset-control");
    const sliders = Object.entries(profileRanges).map(([key, range]) => createSlider({
      label: range.label,
      min: range.min,
      max: range.max,
      value: state[key],
      step: range.step,
      unit: range.unit,
      onInput: (value) => setState(key, value)
    }));
    controls.replaceChildren(
      presetControl,
      ...sliders,
      createToggle({ label: "多 CD 視圖（ARDE）", checked: state.multi, onChange: (value) => { state.multi = value; component.render(); } }),
      panel
    );
  }

  renderControls();
  component.render();
  return component;
}

function drawProfile(ctx, state, metrics) {
  const { theme } = state;
  ctx.clearRect(0, 0, 720, 430);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, 720, 430);
  if (state.multi) drawMultiCd(ctx, state, metrics);
  else drawSingleProfile(ctx, state, metrics);
}

function drawSingleProfile(ctx, state, metrics) {
  const center = 360;
  const maskY = 76;
  const filmBottom = 362;
  const openHalf = 86 * metrics.maskOpening / 100;
  const topHalf = 86 * metrics.topWidth / 100;
  const middleHalf = 86 * metrics.middleWidth / 100;
  const bottomHalf = 86 * metrics.bottomWidth / 100;
  const depth = Math.min(270, metrics.depthPercent / 112 * 270);
  const etchBottom = maskY + depth;

  ctx.fillStyle = "#7f8da3";
  ctx.fillRect(36, maskY, 648, filmBottom - maskY);
  ctx.fillStyle = "#52657d";
  ctx.fillRect(36, filmBottom, 648, 42);
  ctx.fillStyle = "#d5b34b";
  ctx.fillRect(36, maskY - 27, center - openHalf - 36, 31);
  ctx.fillRect(center + openHalf, maskY - 27, 684 - center - openHalf, 31);

  ctx.fillStyle = state.theme.bg;
  ctx.beginPath();
  ctx.moveTo(center - topHalf, maskY);
  ctx.bezierCurveTo(center - topHalf, maskY + depth * 0.18, center - middleHalf, maskY + depth * 0.38, center - middleHalf, maskY + depth * 0.56);
  ctx.bezierCurveTo(center - middleHalf, maskY + depth * 0.75, center - bottomHalf, etchBottom - 20, center - bottomHalf, etchBottom);
  if (metrics.microtrench >= 13) {
    const trench = Math.min(26, metrics.microtrench * 0.8);
    ctx.lineTo(center - bottomHalf + 18, etchBottom + trench);
    ctx.lineTo(center - 18, etchBottom);
    ctx.lineTo(center + 18, etchBottom);
    ctx.lineTo(center + bottomHalf - 18, etchBottom + trench);
  }
  ctx.lineTo(center + bottomHalf, etchBottom);
  ctx.bezierCurveTo(center + bottomHalf, etchBottom - 20, center + middleHalf, maskY + depth * 0.75, center + middleHalf, maskY + depth * 0.56);
  ctx.bezierCurveTo(center + middleHalf, maskY + depth * 0.38, center + topHalf, maskY + depth * 0.18, center + topHalf, maskY);
  ctx.closePath();
  ctx.fill();

  drawPassivation(ctx, state, metrics, center, topHalf, middleHalf, bottomHalf, maskY, depth);
  drawIons(ctx, state, center, openHalf, maskY, etchBottom);
  drawProfileLabels(ctx, state, metrics);
}

function drawPassivation(ctx, state, metrics, center, topHalf, middleHalf, bottomHalf, y, depth) {
  const thickness = Math.max(1, state.passivation / 12);
  ctx.strokeStyle = state.theme.electron;
  ctx.globalAlpha = 0.68;
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.moveTo(center - topHalf + 3, y + 5);
  ctx.bezierCurveTo(center - topHalf + 3, y + depth * 0.2, center - middleHalf + 3, y + depth * 0.38, center - middleHalf + 3, y + depth * 0.56);
  ctx.lineTo(center - bottomHalf + 3, y + depth - 4);
  ctx.moveTo(center + topHalf - 3, y + 5);
  ctx.bezierCurveTo(center + topHalf - 3, y + depth * 0.2, center + middleHalf - 3, y + depth * 0.38, center + middleHalf - 3, y + depth * 0.56);
  ctx.lineTo(center + bottomHalf - 3, y + depth - 4);
  ctx.stroke();
  if (metrics.shape === "Etch stop") {
    ctx.beginPath(); ctx.moveTo(center - bottomHalf, y + depth - 5); ctx.lineTo(center + bottomHalf, y + depth - 5); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawIons(ctx, state, center, openHalf, top, bottom) {
  const motion = (state.elapsed / 11) % 76;
  ctx.strokeStyle = state.theme.ion;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.7;
  for (let index = 0; index < 7; index += 1) {
    const x = center - openHalf * 0.7 + index * openHalf * 1.4 / 6;
    const y = 8 + (motion + index * 19) % Math.max(60, bottom - 28);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(index) * state.spread * 0.35, Math.min(bottom - 4, y + 22)); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawProfileLabels(ctx, state, metrics) {
  ctx.fillStyle = state.theme.text;
  ctx.font = "700 15px system-ui";
  ctx.fillText(metrics.shape, 42, 28);
  ctx.font = "12px system-ui";
  ctx.fillStyle = state.theme.muted;
  ctx.fillText("遮罩", 48, 66);
  ctx.fillText("SiO₂ 目標膜", 48, 110);
  ctx.fillText("Si 下層", 48, 390);
  ctx.fillStyle = state.theme.electron;
  ctx.fillText("鈍化層", 610, 28);
}

function drawMultiCd(ctx, state, metrics) {
  const widths = [52, 82, 118];
  const centers = [145, 360, 575];
  ctx.fillStyle = "#7f8da3";
  ctx.fillRect(24, 70, 672, 300);
  ctx.fillStyle = "#52657d";
  ctx.fillRect(24, 370, 672, 36);
  centers.forEach((center, index) => {
    const half = widths[index] / 2;
    const depth = metrics.ardeDepths[index] / 112 * 270;
    ctx.fillStyle = "#d5b34b";
    ctx.fillRect(center - 84, 45, 84 - half, 29);
    ctx.fillRect(center + half, 45, 84 - half, 29);
    ctx.fillStyle = state.theme.bg;
    ctx.fillRect(center - half, 70, widths[index], depth);
    ctx.fillStyle = state.theme.text;
    ctx.font = "700 13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`CD ${widths[index]} · 深 ${metrics.ardeDepths[index].toFixed(0)}%`, center, 425);
  });
  ctx.textAlign = "start";
  ctx.fillStyle = state.theme.muted;
  ctx.font = "13px system-ui";
  ctx.fillText("窄溝的自由基立體角與局部覆蓋率較低，因此同時間內較淺。", 30, 24);
}

function updatePanel(panel, metrics) {
  const values = {
    "判定形狀": metrics.shape,
    "蝕刻深度": `${metrics.depthPercent.toFixed(0)}%`,
    "頂／中／底寬": `${metrics.topWidth.toFixed(0)} / ${metrics.middleWidth.toFixed(0)} / ${metrics.bottomWidth.toFixed(0)}%`,
    "遮罩開口": `${metrics.maskOpening.toFixed(2)}×`,
    "底角深溝": `${metrics.microtrench.toFixed(1)} a.u.`,
    "聚合物收支": `${metrics.polymerBalance >= 0 ? "+" : ""}${metrics.polymerBalance.toFixed(2)}`
  };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}
