import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createButton, createSlider, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { virtualToolModel } from "../plasma-model.js";

const PROFILE_LABELS = { vertical: "垂直", undercut: "Undercut", taper: "Taper", "etch-stop": "Etch stop" };

export function init(container) {
  const stage = container.querySelector(".lab-stage");
  const originalCanvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  controls.className = "a16-hmi";
  controls.setAttribute("aria-label", "機台控制面板");
  const visual = document.createElement("section");
  visual.className = "a16-visual";
  visual.innerHTML = `<canvas width="720" height="420" data-lab-canvas aria-label="電漿腔體、鞘層與晶圓輪廓即時狀態"></canvas><div class="a16-chain" data-a16-chain aria-label="參數因果鏈"></div>`;
  const outputs = document.createElement("aside");
  outputs.className = "a16-outputs";
  outputs.setAttribute("aria-label", "機台輸出儀表");
  originalCanvas.remove();
  stage.replaceChildren(controls, visual, outputs);
  stage.classList.add("a16-workbench");
  container.classList.add("a16-lab");

  const canvas = visual.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const chain = visual.querySelector("[data-a16-chain]");
  const state = {
    pressureMtorr: 30,
    sourcePowerW: 900,
    biasPowerW: 180,
    gasMix: { CF4: 45, O2: 10, Ar: 45 },
    chuckTemperatureC: 25,
    gapCm: 3,
    challengeActive: false,
    attempts: 0,
    lastInput: "初始配方",
    theme: readCanvasTheme(),
    elapsed: 0,
    lastTime: 0,
    previous: null,
    model: null
  };
  state.model = virtualToolModel(state);
  state.previous = state.model;

  const panel = createValuePanel([
    ["電子密度 nₑ", "—"], ["電子溫度 Tₑ", "—"], ["離子能量", "—"], ["離子通量", "—"],
    ["自由基密度", "—"], ["蝕刻率", "—"], ["選擇比", "—"], ["Profile", "—"]
  ]);
  const challenge = document.createElement("section");
  challenge.className = "a16-challenge";
  challenge.innerHTML = `<strong>製程窗挑戰</strong><p>Rate ≥ 100 nm/min · 選擇比 ≥ 20 · 異向性 ≥ 0.74 · 垂直輪廓</p><output data-a16-challenge-status>尚未開始</output>`;
  const challengeButton = createButton("開始挑戰", () => {
    state.challengeActive = !state.challengeActive;
    state.attempts = 0;
    challengeButton.textContent = state.challengeActive ? "退出挑戰" : "開始挑戰";
    renderAll();
  });
  challengeButton.dataset.a16Challenge = "";

  const instance = {
    update(time = 0) {
      const delta = Math.min(50, time - state.lastTime || 16);
      state.lastTime = time;
      state.elapsed += delta;
    },
    render() { drawMachine(ctx, state); },
    reset() {},
    applyTheme(theme) { state.theme = theme; drawMachine(ctx, state); },
    destroy() { unwatch(); }
  };
  const component = createLifecycle(instance);
  const unwatch = watchTheme(component);

  const change = (label, mutate) => {
    const before = state.model;
    mutate();
    const after = virtualToolModel(state);
    if (sameInputs(before.inputs, after.inputs)) return;
    state.previous = before;
    state.model = after;
    state.lastInput = label;
    if (state.challengeActive) state.attempts += 1;
    renderAll();
  };

  controls.replaceChildren(
    heading("HMI 控制"),
    createSlider({ label: "壓力", min: 5, max: 100, value: state.pressureMtorr, step: 1, unit: "mTorr", onInput: (value) => change("壓力", () => { state.pressureMtorr = value; }) }),
    createSlider({ label: "Source power", min: 200, max: 2000, value: state.sourcePowerW, step: 20, unit: "W", onInput: (value) => change("Source power", () => { state.sourcePowerW = value; }) }),
    createSlider({ label: "Bias power", min: 0, max: 500, value: state.biasPowerW, step: 10, unit: "W", onInput: (value) => change("Bias power", () => { state.biasPowerW = value; }) }),
    heading("氣體配比"),
    ...Object.entries({ CF4: "CF₄", O2: "O₂", Ar: "Ar" }).map(([key, label]) => createSlider({
      label,
      min: 0,
      max: 100,
      value: state.gasMix[key],
      step: 1,
      unit: "sccm",
      onInput: (value) => change(`${label} 配比`, () => { state.gasMix[key] = value; })
    })),
    createSlider({ label: "晶座溫度", min: 0, max: 80, value: state.chuckTemperatureC, step: 1, unit: "°C", onInput: (value) => change("晶座溫度", () => { state.chuckTemperatureC = value; }) }),
    createSlider({ label: "Gap", min: 1, max: 5, value: state.gapCm, step: 0.1, unit: "cm", onInput: (value) => change("Gap", () => { state.gapCm = value; }) })
  );
  outputs.replaceChildren(heading("輸出儀表"), panel, challengeButton, challenge);
  renderAll();
  return component;

  function renderAll() {
    updatePanel(panel, state.model);
    renderChain(chain, state.previous, state.model, state.lastInput);
    updateChallenge(challenge, state);
    drawMachine(ctx, state);
    updateStatus(status, state);
  }
}

function heading(text) {
  const title = document.createElement("h3");
  title.textContent = text;
  return title;
}

function updatePanel(panel, model) {
  const values = {
    "電子密度 nₑ": `${model.electronDensityCm3.toExponential(2)} cm⁻³`,
    "電子溫度 Tₑ": `${model.electronTemperatureEv.toFixed(2)} eV`,
    "離子能量": `${model.ionEnergyEv.toFixed(0)} eV`,
    "離子通量": `${model.ionFluxCm2s.toExponential(2)} cm⁻²s⁻¹`,
    "自由基密度": `${model.radicalDensityCm3.toExponential(2)} cm⁻³`,
    "蝕刻率": `${model.etchRateNmMin.toFixed(0)} nm/min`,
    "選擇比": `${model.selectivity.toFixed(1)} : 1`,
    "Profile": PROFILE_LABELS[model.profile]
  };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}

function renderChain(element, previous, current, inputLabel) {
  const nodes = [
    [inputLabel, null, "input"],
    ["平均自由徑 λ", current.meanFreePathCm, "meanFreePathCm"],
    ["電子密度 nₑ", current.electronDensityCm3, "electronDensityCm3"],
    ["電子溫度 Tₑ", current.electronTemperatureEv, "electronTemperatureEv"],
    ["離子能量", current.ionEnergyEv, "ionEnergyEv"],
    ["自由基密度", current.radicalDensityCm3, "radicalDensityCm3"],
    ["蝕刻率", current.etchRateNmMin, "etchRateNmMin"],
    ["異向性", current.anisotropy, "anisotropy"]
  ];
  element.innerHTML = nodes.map(([label, value, key], index) => {
    const delta = key === "input" ? null : percentChange(previous?.[key], value);
    const changed = delta !== null && Math.abs(delta) >= 1;
    const deltaText = delta === null ? "操作" : Math.abs(delta) < 1 ? "幾乎不變" : `${delta > 0 ? "+" : ""}${delta.toFixed(0)}%`;
    return `${index ? '<span class="a16-arrow" aria-hidden="true">→</span>' : ""}<div class="a16-chain-node ${changed ? "changed" : ""}" data-cause-key="${key}"><span>${label}</span><strong>${deltaText}</strong></div>`;
  }).join("");
}

function updateChallenge(element, state) {
  const output = element.querySelector("[data-a16-challenge-status]");
  element.classList.toggle("active", state.challengeActive);
  element.classList.toggle("passed", state.challengeActive && state.model.challenge.passed);
  output.textContent = !state.challengeActive
    ? "尚未開始"
    : state.model.challenge.passed
      ? `達成，使用 ${state.attempts} 次有效調整。`
      : `第 ${state.attempts} 次：尚有條件未達標。`;
}

function updateStatus(status, state) {
  const model = state.model;
  const mix = model.inputs.gasMix;
  status.textContent = `${state.lastInput}：CF₄/O₂/Ar = ${Math.round(mix.CF4 * 100)}/${Math.round(mix.O2 * 100)}/${Math.round(mix.Ar * 100)}%；${PROFILE_LABELS[model.profile]}，rate ${model.etchRateNmMin.toFixed(0)} nm/min，選擇比 ${model.selectivity.toFixed(1)}，異向性 ${model.anisotropy.toFixed(2)}。`;
}

function drawMachine(ctx, state) {
  const { theme, model } = state;
  ctx.clearRect(0, 0, 720, 420);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, 720, 420);
  ctx.fillStyle = theme.text;
  ctx.font = "700 15px system-ui";
  ctx.fillText("ICP chamber state", 30, 27);
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 2;
  roundRect(ctx, 28, 44, 430, 300, 12);
  ctx.stroke();
  ctx.fillStyle = theme.border;
  ctx.fillRect(75, 72, 335, 12);
  for (let turn = 0; turn < 4; turn += 1) {
    ctx.strokeStyle = theme.primary;
    ctx.beginPath();
    ctx.arc(242, 67, 46 + turn * 17, Math.PI, 0);
    ctx.stroke();
  }
  const glow = ctx.createRadialGradient(242, 190, 12, 242, 190, 190);
  glow.addColorStop(0, alpha(theme.electron, Math.min(0.55, 0.18 + model.electronDensityCm3 / 6e11)));
  glow.addColorStop(1, alpha(theme.primary, 0.015));
  ctx.fillStyle = glow;
  ctx.fillRect(42, 86, 400, 218);
  const count = Math.round(18 + Math.min(55, model.electronDensityCm3 / 7e9));
  for (let index = 0; index < count; index += 1) {
    const x = 52 + seeded(index * 19 + 7) * 380;
    const y = 102 + seeded(index * 31 + Math.floor(state.elapsed / 220)) * 160;
    ctx.fillStyle = index % 4 ? theme.primary : theme.electron;
    ctx.globalAlpha = 0.45 + seeded(index * 13) * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, 2 + seeded(index * 23) * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const sheathPx = Math.min(42, 5 + model.sheathThicknessMm * 52);
  ctx.fillStyle = alpha(theme.ion, 0.22);
  ctx.fillRect(72, 286 - sheathPx, 340, sheathPx);
  ctx.fillStyle = theme.border;
  ctx.fillRect(72, 286, 340, 14);
  ctx.fillStyle = theme.text;
  ctx.font = "12px system-ui";
  ctx.fillText(`sheath ${model.sheathThicknessMm.toFixed(2)} mm`, 82, 278 - sheathPx);
  ctx.fillText(`λ ${model.meanFreePathCm.toFixed(3)} cm · angle ${model.angularFwhmDeg.toFixed(1)}°`, 82, 327);
  drawProfile(ctx, model, theme);
  ctx.fillStyle = theme.muted;
  ctx.font = "12px system-ui";
  ctx.fillText("模型為教學用相對趨勢；實機需以 VI、OES 與晶圓量測校正。", 28, 396);
}

function drawProfile(ctx, model, theme) {
  const x = 492;
  const y = 58;
  const width = 195;
  const height = 286;
  ctx.strokeStyle = theme.border;
  roundRect(ctx, x, y, width, height, 10);
  ctx.stroke();
  ctx.fillStyle = theme.text;
  ctx.font = "700 14px system-ui";
  ctx.fillText(PROFILE_LABELS[model.profile], x + 14, y + 25);
  ctx.fillStyle = "#7f8da3";
  ctx.fillRect(x + 20, y + 74, width - 40, 178);
  ctx.fillStyle = "#d5b34b";
  ctx.fillRect(x + 20, y + 54, 48, 24);
  ctx.fillRect(x + width - 68, y + 54, 48, 24);
  const center = x + width / 2;
  const top = y + 76;
  const depth = model.profile === "etch-stop" ? 36 : 154;
  let topHalf = 29;
  let bottomHalf = 28;
  if (model.profile === "undercut") { topHalf = 43; bottomHalf = 30; }
  if (model.profile === "taper") { topHalf = 31; bottomHalf = 18; }
  ctx.fillStyle = theme.bg;
  ctx.beginPath();
  ctx.moveTo(center - topHalf, top);
  ctx.lineTo(center - bottomHalf, top + depth);
  ctx.lineTo(center + bottomHalf, top + depth);
  ctx.lineTo(center + topHalf, top);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = theme.muted;
  ctx.font = "12px system-ui";
  ctx.fillText(`異向性 ${model.anisotropy.toFixed(2)}`, x + 14, y + 274);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function percentChange(before, after) {
  if (!Number.isFinite(before) || !Number.isFinite(after)) return null;
  return (after - before) / Math.max(Math.abs(before), 1e-12) * 100;
}

function sameInputs(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function seeded(seed) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function alpha(color, opacity) {
  if (!color?.startsWith("#")) return color;
  const hex = color.slice(1);
  const normalized = hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex;
  const value = Number.parseInt(normalized, 16);
  return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${opacity})`;
}
