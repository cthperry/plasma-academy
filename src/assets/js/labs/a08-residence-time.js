import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createButton, createSlider, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { effectivePumpingSpeedLps, neutralGasDensityCm3, residenceTimeSeconds } from "../plasma-model.js";

const WIDTH = 720;
const HEIGHT = 360;
const CHAMBER = { left: 54, top: 52, right: 570, bottom: 304 };

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const ctx = canvas.getContext("2d");
  const state = {
    flowSccm: 200,
    pressureMtorr: 20,
    volumeL: 30,
    elapsed: 0,
    lastTime: 0,
    theme: readCanvasTheme(),
    particles: Array.from({ length: 72 }, (_, index) => ({
      phase: seeded(index * 17 + 3),
      lane: seeded(index * 29 + 11),
      wobble: seeded(index * 43 + 7)
    }))
  };
  const panel = createValuePanel([
    ["滯留時間 τ", "—"],
    ["中性密度 n", "—"],
    ["有效抽速 S", "—"],
    ["節流閥估算", "—"]
  ]);

  const instance = {
    update(time = 0) {
      const deltaMs = Math.min(50, time - state.lastTime || 16);
      state.lastTime = time;
      state.elapsed += deltaMs;
    },
    render() {
      const metrics = calculate(state);
      draw(ctx, state, metrics);
      updatePanel(panel, metrics);
      status.textContent = `${state.volumeL} L、${state.pressureMtorr} mTorr、${state.flowSccm} sccm：τ=${metrics.residence.toFixed(3)} s。壓力固定時，流量改變的是換氣速度，不是由壓力決定的中性密度。`;
    },
    reset() {
      state.flowSccm = 200;
      state.pressureMtorr = 20;
      state.volumeL = 30;
      state.elapsed = 0;
      renderControls();
    },
    applyTheme(theme) {
      state.theme = theme;
      this.render();
    },
    destroy() { unwatch(); }
  };
  const component = createLifecycle(instance);
  const unwatch = watchTheme(component);

  function renderControls() {
    controls.replaceChildren(
      createSlider({ label: "總流量 Q", min: 10, max: 1000, value: state.flowSccm, step: 10, unit: "sccm", onInput: (value) => { state.flowSccm = value; component.render(); } }),
      createSlider({ label: "目標壓力 P", min: 1, max: 1000, value: state.pressureMtorr, step: 1, unit: "mTorr", onInput: (value) => { state.pressureMtorr = value; component.render(); } }),
      createSlider({ label: "腔體體積 V", min: 5, max: 100, value: state.volumeL, step: 1, unit: "L", onInput: (value) => { state.volumeL = value; component.render(); } }),
      createButton("重設", () => component.reset()),
      panel
    );
  }

  renderControls();
  component.render();
  return component;
}

function calculate(state) {
  const residence = residenceTimeSeconds(state);
  const density = neutralGasDensityCm3(state.pressureMtorr, 300);
  const pumpingSpeed = effectivePumpingSpeedLps(state);
  const valvePercent = Math.min(100, Math.max(2, pumpingSpeed / 3));
  return { residence, density, pumpingSpeed, valvePercent };
}

function updatePanel(panel, metrics) {
  const values = {
    "滯留時間 τ": `${metrics.residence.toFixed(3)} s`,
    "中性密度 n": `${metrics.density.toExponential(2)} cm⁻³`,
    "有效抽速 S": `${metrics.pumpingSpeed.toFixed(1)} L/s`,
    "節流閥估算": `${metrics.valvePercent.toFixed(0)}%`
  };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}

function draw(ctx, state, metrics) {
  const { theme } = state;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 3;
  roundRect(ctx, CHAMBER.left, CHAMBER.top, CHAMBER.right - CHAMBER.left, CHAMBER.bottom - CHAMBER.top, 18);
  ctx.stroke();
  ctx.fillStyle = theme.text;
  ctx.font = "700 15px system-ui";
  ctx.fillText("Showerhead", CHAMBER.left + 18, CHAMBER.top - 16);
  ctx.fillText("Pump", 616, 220);

  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 2;
  for (let x = CHAMBER.left + 28; x < CHAMBER.right - 20; x += 34) {
    ctx.beginPath();
    ctx.moveTo(x, CHAMBER.top + 1);
    ctx.lineTo(x, CHAMBER.top + 12);
    ctx.stroke();
  }

  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(CHAMBER.right, 235);
  ctx.lineTo(675, 235);
  ctx.stroke();
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 4;
  const valveX = 594;
  ctx.beginPath();
  ctx.moveTo(valveX - 12, 220);
  ctx.lineTo(valveX + 12, 250);
  ctx.moveTo(valveX + 12, 220);
  ctx.lineTo(valveX - 12, 250);
  ctx.stroke();

  const cycleMs = Math.max(800, Math.min(8500, metrics.residence * 5000));
  for (const particle of state.particles) {
    const progress = (particle.phase + state.elapsed / cycleMs) % 1;
    const point = flowPoint(progress, particle);
    ctx.fillStyle = progress > 0.68 ? theme.ion : progress > 0.34 ? theme.primary : theme.electron;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = theme.muted;
  ctx.font = "13px system-ui";
  ctx.fillText("新進氣體", CHAMBER.left + 16, CHAMBER.top + 32);
  ctx.fillText("停留較久", CHAMBER.right - 92, CHAMBER.bottom - 18);
  ctx.fillText(`τ ${metrics.residence.toFixed(3)} s`, 608, 286);
}

function flowPoint(progress, particle) {
  const xStart = CHAMBER.left + 30 + particle.lane * (CHAMBER.right - CHAMBER.left - 90);
  if (progress < 0.72) {
    const local = progress / 0.72;
    return {
      x: xStart + Math.sin((local * 3 + particle.wobble) * Math.PI * 2) * 34 * local,
      y: CHAMBER.top + 18 + local * (CHAMBER.bottom - CHAMBER.top - 42)
    };
  }
  const local = (progress - 0.72) / 0.28;
  const startY = CHAMBER.bottom - 28;
  return {
    x: xStart + (665 - xStart) * local,
    y: startY + (235 - startY) * local
  };
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function seeded(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}
