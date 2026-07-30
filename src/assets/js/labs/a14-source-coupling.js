import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createButton, createSegmentedControl, createSelect, createSlider, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { createSvg, clearSvg, drawAxes, drawLine, linearScale, logScale } from "../plot.js";
import { sourceCouplingModel } from "../plasma-model.js";

export function init(container) {
  const originalCanvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const visual = document.createElement("div");
  visual.className = "source-coupling-visual";
  visual.innerHTML = `<canvas width="720" height="300" data-lab-canvas aria-label="CCP 與 ICP 功率耦合腔體"></canvas><svg viewBox="0 0 720 260" role="img" aria-label="ICP 密度與功率遲滯曲線"></svg>`;
  originalCanvas.replaceWith(visual);
  const canvas = visual.querySelector("canvas");
  const svg = visual.querySelector("svg");
  const ctx = canvas.getContext("2d");
  const state = { powerW: 500, pressureMtorr: 20, gas: "Ar", mode: "E", direction: "up", mechanism: "all", elapsed: 0, lastTime: 0, sweep: null, dirty: true, theme: readCanvasTheme(), model: null };
  const panel = createValuePanel([["ICP 模式", "—"], ["ICP nₑ", "—"], ["電子溫度", "—"], ["跳變門檻", "—"]]);
  let powerInput;
  let powerOutput;

  const instance = {
    update(time = 0) {
      const delta = Math.min(50, time - state.lastTime || 16);
      state.lastTime = time;
      state.elapsed += delta;
      if (state.sweep) {
        const previous = state.powerW;
        state.powerW += (state.sweep === "up" ? 1 : -1) * delta * 0.42;
        state.powerW = Math.max(100, Math.min(2000, state.powerW));
        state.direction = state.powerW >= previous ? "up" : "down";
        powerInput.value = String(Math.round(state.powerW));
        powerOutput.value = `${Math.round(state.powerW)} W`;
        state.dirty = true;
        if (state.powerW === 100 || state.powerW === 2000) state.sweep = null;
      }
    },
    render() {
      if (state.dirty || !state.model) {
        state.model = sourceCouplingModel({ source: "ICP", powerW: state.powerW, pressureMtorr: state.pressureMtorr, gas: state.gas, previousMode: state.mode, direction: state.direction });
        state.mode = state.model.mode;
        drawHysteresis(svg, state);
        updatePanel(panel, state.model);
        updateStatus(status, state.model, state.direction);
        state.dirty = false;
      }
      drawSources(ctx, state, state.model);
    },
    reset() {},
    applyTheme(theme) { state.theme = theme; state.dirty = true; this.render(); },
    destroy() { unwatch(); }
  };
  const component = createLifecycle(instance);
  const unwatch = watchTheme(component);
  const change = (key, value) => { state[key] = value; state.dirty = true; component.render(); };
  const powerControl = createSlider({ label: "Source power", min: 100, max: 2000, value: state.powerW, step: 10, unit: "W", onInput: (value) => { state.direction = value >= state.powerW ? "up" : "down"; change("powerW", value); } });
  powerInput = powerControl.querySelector("input");
  powerOutput = powerControl.querySelector("output");
  controls.replaceChildren(
    powerControl,
    createSlider({ label: "壓力", min: 1, max: 100, value: state.pressureMtorr, step: 1, unit: "mTorr", onInput: (value) => change("pressureMtorr", value) }),
    createSelect({ label: "氣體", options: [{ value: "Ar", label: "Ar" }, { value: "O2", label: "O₂" }, { value: "CF4", label: "CF₄" }], value: state.gas, onChange: (value) => change("gas", value) }),
    createSegmentedControl({ label: "加熱視圖", options: [{ value: "all", label: "並排" }, { value: "sheath", label: "鞘層拍打" }, { value: "inductive", label: "感應圈" }], value: state.mechanism, onChange: (value) => change("mechanism", value) }),
    createButton("向上掃描", () => { state.direction = "up"; state.sweep = "up"; }),
    createButton("向下掃描", () => { state.direction = "down"; state.sweep = "down"; }),
    panel
  );
  component.render();
  return component;
}

function drawSources(ctx, state, model) {
  const { theme } = state;
  ctx.clearRect(0, 0, 720, 300);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, 720, 300);
  drawChamber(ctx, { x: 34, title: "CCP", glow: 0.36, theme, state, type: "ccp" });
  drawChamber(ctx, { x: 374, title: `ICP ${model.mode}-mode`, glow: model.mode === "H" ? 1 : 0.18, theme, state, type: "icp" });
  ctx.strokeStyle = theme.border;
  ctx.beginPath(); ctx.moveTo(360, 18); ctx.lineTo(360, 278); ctx.stroke();
}

function drawChamber(ctx, { x, title, glow, theme, state, type }) {
  const y = 54;
  const width = 300;
  const height = 198;
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = theme.text;
  ctx.font = "700 15px system-ui";
  ctx.fillText(title, x + 8, 28);
  const gradient = ctx.createRadialGradient(x + width / 2, y + height / 2, 12, x + width / 2, y + height / 2, width / 2);
  gradient.addColorStop(0, colorAlpha(theme.electron, 0.55 * glow));
  gradient.addColorStop(1, colorAlpha(theme.primary, 0.02));
  ctx.fillStyle = gradient;
  ctx.fillRect(x + 2, y + 2, width - 4, height - 4);
  if (type === "ccp") {
    ctx.fillStyle = theme.border;
    ctx.fillRect(x + 28, y + 22, width - 56, 12);
    ctx.fillRect(x + 28, y + height - 34, width - 56, 12);
    if (state.mechanism !== "inductive") {
      const offset = Math.sin(state.elapsed / 130) * 8;
      ctx.strokeStyle = theme.warning ?? theme.ion;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x + 44, y + 55 + offset); ctx.lineTo(x + width - 44, y + 55 + offset); ctx.stroke();
    }
  } else {
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 4;
    for (let turn = 0; turn < 4; turn += 1) {
      ctx.beginPath(); ctx.arc(x + width / 2, y + 8, 40 + turn * 16, Math.PI, 0); ctx.stroke();
    }
    if (state.mechanism !== "sheath") {
      ctx.strokeStyle = theme.ion;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x + width / 2, y + 100, 95, 36, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x + width / 2, y + 100, 65, 24, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  const particles = type === "icp" && state.mode === "H" ? 42 : 16;
  for (let index = 0; index < particles; index += 1) {
    const px = x + 18 + seeded(index * 17 + 3) * (width - 36);
    const py = y + 42 + seeded(index * 31 + 5) * (height - 70);
    const energy = seeded(index * 47 + Math.floor(state.elapsed / 250));
    ctx.fillStyle = energy > 0.72 ? theme.electron : theme.primary;
    ctx.globalAlpha = 0.55 + energy * 0.4;
    ctx.beginPath(); ctx.arc(px, py, 2.2 + energy * 1.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHysteresis(svg, state) {
  clearSvg(svg);
  const plot = { x: 58, y: 28, width: 620, height: 172 };
  const xScale = linearScale(100, 2000, plot.x, plot.x + plot.width);
  const yScale = logScale(5e8, 3e11, plot.y + plot.height, plot.y);
  drawAxes(svg, { ...plot, xLabel: "Source power (W)", yLabel: "nₑ (cm⁻³, log)", xTicks: [100, 600, 1000, 1500, 2000].map((value) => ({ x: xScale(value), label: String(value) })), yTicks: [1e9, 1e10, 1e11].map((value) => ({ y: yScale(value), label: value.toExponential(0) })) });
  const upward = [];
  let upMode = "E";
  for (let powerW = 100; powerW <= 2000; powerW += 25) {
    const model = sourceCouplingModel({ source: "ICP", powerW, pressureMtorr: state.pressureMtorr, gas: state.gas, previousMode: upMode, direction: "up" });
    upMode = model.mode;
    upward.push([xScale(powerW), yScale(model.densityCm3)]);
  }
  const downward = [];
  let downMode = "H";
  for (let powerW = 2000; powerW >= 100; powerW -= 25) {
    const model = sourceCouplingModel({ source: "ICP", powerW, pressureMtorr: state.pressureMtorr, gas: state.gas, previousMode: downMode, direction: "down" });
    downMode = model.mode;
    downward.push([xScale(powerW), yScale(model.densityCm3)]);
  }
  drawLine(svg, { points: upward, className: "plot-line source-up" });
  drawLine(svg, { points: downward, className: "plot-line source-down" });
  svg.append(createSvg("circle", { cx: xScale(state.powerW), cy: yScale(state.model?.densityCm3 ?? 1e9), r: 6, class: "source-current" }));
  const label = createSvg("text", { x: 520, y: 230, class: "source-legend" });
  label.textContent = "藍：向上掃描　紅：向下掃描";
  svg.append(label);
}

function updatePanel(panel, model) {
  const values = { "ICP 模式": `${model.mode}-mode`, "ICP nₑ": `${model.densityCm3.toExponential(2)} cm⁻³`, "電子溫度": `${model.electronTemperatureEv.toFixed(2)} eV`, "跳變門檻": `↑${Math.round(model.upThresholdW)} / ↓${Math.round(model.downThresholdW)} W` };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}

function updateStatus(status, model, direction) {
  const warning = model.powerW > model.downThresholdW && model.powerW < model.upThresholdW ? "目前位於遲滯區，同一功率可依歷史落在 E 或 H 模式。" : "目前離開遲滯重疊區。";
  status.textContent = `${model.mode}-mode，${direction === "up" ? "向上" : "向下"}掃描；${warning}`;
}

function seeded(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function colorAlpha(color, alpha) {
  if (/^#[0-9a-f]{6}$/i.test(color)) return `${color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
  return color;
}
