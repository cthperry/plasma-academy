import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createButton, createSelect, createSlider, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { createSvg, clearSvg } from "../plot.js";
import { findAutoMatch, matchingNetwork } from "../plasma-model.js";

export function init(container) {
  const originalCanvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const visual = document.createElement("div");
  visual.className = "matching-visual";
  visual.innerHTML = `<svg viewBox="0 0 720 430" role="img" aria-label="Smith 圖與 L 型匹配網路"></svg><canvas width="720" height="150" data-lab-canvas aria-label="前向、反射與實際輸入功率"></canvas>`;
  originalCanvas.replaceWith(visual);
  const svg = visual.querySelector("svg");
  const canvas = visual.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const state = { tunePf: 260, loadPf: 470, pressureMtorr: 20, powerW: 800, gas: "Ar", target: null, lastTime: 0, dirty: true, theme: readCanvasTheme(), result: null };
  const panel = createValuePanel([["輸入阻抗", "—"], ["反射功率", "—"], ["實際輸入", "—"], ["電容指紋", "—"]]);
  let tuneInput;
  let tuneOutput;
  let loadInput;
  let loadOutput;

  const instance = {
    update(time = 0) {
      const delta = Math.min(50, time - state.lastTime || 16);
      state.lastTime = time;
      if (!state.target) return;
      state.tunePf = approach(state.tunePf, state.target.tunePf, delta * 1.2);
      state.loadPf = approach(state.loadPf, state.target.loadPf, delta * 1.2);
      syncCapacitorInputs();
      state.dirty = true;
      if (state.tunePf === state.target.tunePf && state.loadPf === state.target.loadPf) state.target = null;
    },
    render() {
      if (state.dirty || !state.result) {
        state.result = matchingNetwork({ ...state, forwardPowerW: state.powerW });
        drawSmith(svg, state.result, state);
        updatePanel(panel, state.result, state);
        updateStatus(status, state.result, state.target);
        state.dirty = false;
      }
      drawPowerMeters(ctx, state.result, state.theme);
    },
    reset() {},
    applyTheme(theme) { state.theme = theme; state.dirty = true; this.render(); },
    destroy() { unwatch(); }
  };
  const component = createLifecycle(instance);
  const unwatch = watchTheme(component);
  const change = (key, value) => { state[key] = value; state.target = null; state.dirty = true; component.render(); };
  const tuneControl = createSlider({ label: "C_tune", min: 40, max: 1600, value: state.tunePf, step: 10, unit: "pF", onInput: (value) => change("tunePf", value) });
  const loadControl = createSlider({ label: "C_load", min: 40, max: 1600, value: state.loadPf, step: 10, unit: "pF", onInput: (value) => change("loadPf", value) });
  tuneInput = tuneControl.querySelector("input");
  tuneOutput = tuneControl.querySelector("output");
  loadInput = loadControl.querySelector("input");
  loadOutput = loadControl.querySelector("output");
  controls.replaceChildren(
    tuneControl,
    loadControl,
    createSlider({ label: "壓力", min: 1, max: 100, value: state.pressureMtorr, step: 1, unit: "mTorr", onInput: (value) => change("pressureMtorr", value) }),
    createSlider({ label: "Forward power", min: 200, max: 2000, value: state.powerW, step: 20, unit: "W", onInput: (value) => change("powerW", value) }),
    createSelect({ label: "氣體", options: [{ value: "Ar", label: "Ar" }, { value: "O2", label: "O₂" }, { value: "CF4", label: "CF₄" }], value: state.gas, onChange: (value) => change("gas", value) }),
    createButton("自動匹配", () => { state.target = findAutoMatch(state); state.dirty = true; }),
    panel
  );
  component.render();
  return component;

  function syncCapacitorInputs() {
    tuneInput.value = String(Math.round(state.tunePf));
    tuneOutput.value = `${Math.round(state.tunePf)} pF`;
    loadInput.value = String(Math.round(state.loadPf));
    loadOutput.value = `${Math.round(state.loadPf)} pF`;
  }
}

function drawSmith(svg, result, state) {
  clearSvg(svg);
  const center = { x: 220, y: 205 };
  const radius = 165;
  svg.append(createSvg("circle", { cx: center.x, cy: center.y, r: radius, class: "smith-boundary" }));
  svg.append(createSvg("line", { x1: center.x - radius, y1: center.y, x2: center.x + radius, y2: center.y, class: "smith-grid" }));
  for (const fraction of [0.25, 0.5, 0.75]) {
    svg.append(createSvg("circle", { cx: center.x + radius * fraction, cy: center.y, r: radius * (1 - fraction), class: "smith-grid" }));
    svg.append(createSvg("path", { d: `M${center.x - radius},${center.y} Q${center.x},${center.y - radius * fraction * 1.2} ${center.x + radius},${center.y}`, class: "smith-grid" }));
    svg.append(createSvg("path", { d: `M${center.x - radius},${center.y} Q${center.x},${center.y + radius * fraction * 1.2} ${center.x + radius},${center.y}`, class: "smith-grid" }));
  }
  const impedances = [result.plasma, result.afterTune, result.input];
  const labels = ["電漿 Zp", "C_tune 後", "輸入 Zin"];
  const points = impedances.map((impedance) => gammaPoint(impedance, center, radius));
  svg.append(createSvg("path", { d: points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" "), class: "match-trajectory" }));
  points.forEach((point, index) => {
    svg.append(createSvg("circle", { cx: point.x, cy: point.y, r: index === 2 ? 7 : 5, class: `match-point step-${index}` }));
    const label = createSvg("text", { x: point.x + 8, y: point.y - 8, class: "match-label" });
    label.textContent = labels[index];
    svg.append(label);
  });
  svg.append(createSvg("circle", { cx: center.x, cy: center.y, r: 8, class: "smith-target" }));
  const title = createSvg("text", { x: 55, y: 28, class: "match-title" });
  title.textContent = "反射係數平面（圓心 = 50 Ω）";
  svg.append(title);
  drawCircuit(svg, state, result);
}

function drawCircuit(svg, state, result) {
  const x = 430;
  const y = 92;
  const path = `M${x},${y} H${x + 52} l8,-12 l16,24 l16,-24 l16,24 l8,-12 H${x + 174} V${y + 92} H${x + 230}`;
  svg.append(createSvg("path", { d: path, class: "match-circuit" }));
  svg.append(createSvg("line", { x1: x + 174, y1: y, x2: x + 174, y2: y + 55, class: "match-circuit" }));
  svg.append(createSvg("line", { x1: x + 160, y1: y + 55, x2: x + 188, y2: y + 55, class: "match-capacitor" }));
  svg.append(createSvg("line", { x1: x + 160, y1: y + 67, x2: x + 188, y2: y + 67, class: "match-capacitor" }));
  svg.append(createSvg("line", { x1: x + 174, y1: y + 67, x2: x + 174, y2: y + 110, class: "match-circuit" }));
  for (const [text, tx, ty] of [["50 Ω generator", x, y - 20], [`C_tune ${Math.round(state.tunePf)} pF`, x + 45, y + 43], [`C_load ${Math.round(state.loadPf)} pF`, x + 128, y + 92], [`Zp ${result.plasma.re.toFixed(1)} ${signed(result.plasma.im)}j Ω`, x, y + 145]]) {
    const label = createSvg("text", { x: tx, y: ty, class: "match-circuit-label" });
    label.textContent = text;
    svg.append(label);
  }
  const fingerprint = createSvg("text", { x, y: y + 190, class: "match-fingerprint" });
  fingerprint.textContent = `條件指紋：${state.gas} / ${state.pressureMtorr} mTorr / ${state.powerW} W`;
  svg.append(fingerprint);
}

function drawPowerMeters(ctx, result, theme) {
  ctx.clearRect(0, 0, 720, 150);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, 720, 150);
  const meters = [["Forward", result.reflectedPowerW + result.deliveredPowerW, theme.primary], ["Reflected", result.reflectedPowerW, theme.ion], ["Delivered", result.deliveredPowerW, theme.electron]];
  meters.forEach(([label, value, color], index) => {
    const x = 28 + index * 232;
    ctx.fillStyle = theme.text;
    ctx.font = "700 13px system-ui";
    ctx.fillText(label, x, 28);
    ctx.fillStyle = theme.border;
    ctx.fillRect(x, 46, 188, 14);
    ctx.fillStyle = color;
    ctx.fillRect(x, 46, Math.max(2, Math.min(188, value / Math.max(result.reflectedPowerW + result.deliveredPowerW, 1) * 188)), 14);
    ctx.fillStyle = theme.text;
    ctx.font = "700 18px system-ui";
    ctx.fillText(`${value.toFixed(1)} W`, x, 92);
  });
}

function updatePanel(panel, result, state) {
  const values = { "輸入阻抗": `${result.input.re.toFixed(1)} ${signed(result.input.im)}j Ω`, "反射功率": `${(result.reflectedFraction * 100).toFixed(2)}%`, "實際輸入": `${result.deliveredPowerW.toFixed(1)} W`, "電容指紋": `${Math.round(state.tunePf)} / ${Math.round(state.loadPf)} pF` };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}

function updateStatus(status, result, target) {
  const matched = result.reflectedFraction < 0.01;
  status.textContent = target ? "自動匹配中：沿阻抗軌跡移向 50 Ω 圓心。" : matched ? `匹配成功：反射 ${(result.reflectedFraction * 100).toFixed(2)}%，電容位置可作為 chamber fingerprint。` : `未匹配：反射 ${(result.reflectedFraction * 100).toFixed(1)}%。改變條件後需重新尋找 C_tune / C_load。`;
}

function gammaPoint(impedance, center, radius) {
  const numerator = { re: impedance.re - 50, im: impedance.im };
  const denominator = { re: impedance.re + 50, im: impedance.im };
  const d = denominator.re ** 2 + denominator.im ** 2;
  const gamma = { re: (numerator.re * denominator.re + numerator.im * denominator.im) / d, im: (numerator.im * denominator.re - numerator.re * denominator.im) / d };
  return { x: center.x + gamma.re * radius, y: center.y - gamma.im * radius };
}

function approach(value, target, step) {
  if (Math.abs(target - value) <= step) return target;
  return value + Math.sign(target - value) * step;
}

function signed(value) {
  return value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}
