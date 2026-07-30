import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createButton, createSlider, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { townsendDischarge } from "../plasma-model.js";

const WIDTH = 720;
const HEIGHT = 360;
const CHAMBER = { left: 48, right: 508, top: 66, bottom: 314 };
const PLOT = { left: 548, right: 692, top: 100, bottom: 300 };

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const ctx = canvas.getContext("2d");
  const state = {
    reducedField: 120,
    gamma: 0.04,
    gapCm: 1,
    speed: 1,
    playing: true,
    elapsed: 0,
    lastTime: 0,
    theme: readCanvasTheme()
  };
  const panel = createValuePanel([
    ["第一 Townsend 係數 α", "—"],
    ["電子增益 e^(αd)", "—"],
    ["回授 γ(G−1)", "—"],
    ["臨界 γ", "—"],
    ["放電狀態", "—"]
  ]);

  const instance = {
    update(time = 0) {
      const deltaMs = Math.min(50, time - state.lastTime || 16);
      state.lastTime = time;
      if (state.playing) state.elapsed += deltaMs * state.speed;
    },
    render() {
      const metrics = computeMetrics(state);
      drawScene(ctx, state, metrics);
      updatePanel(panel, metrics);
      status.textContent = metrics.status;
    },
    reset() {
      state.reducedField = 120;
      state.gamma = 0.04;
      state.gapCm = 1;
      state.speed = 1;
      state.playing = true;
      state.elapsed = 0;
      renderControls(controls, panel, state, component);
    },
    applyTheme(theme) {
      state.theme = theme;
      this.render();
    },
    destroy() {
      unwatch();
    }
  };
  const component = createLifecycle(instance);
  const unwatch = watchTheme(component);
  renderControls(controls, panel, state, component);
  component.render();
  return component;
}

function renderControls(controls, panel, state, component) {
  controls.replaceChildren();
  controls.append(
    createSlider({
      label: "電場 E/p",
      min: 40,
      max: 180,
      value: state.reducedField,
      step: 1,
      unit: "V/(cm·Torr)",
      onInput: (next) => {
        state.reducedField = next;
        component.render();
      }
    }),
    createSlider({
      label: "二次電子係數 γ",
      min: 0,
      max: 0.2,
      value: state.gamma,
      step: 0.001,
      formatValue: (next) => next.toFixed(3),
      onInput: (next) => {
        state.gamma = next;
        component.render();
      }
    }),
    createSlider({
      label: "電極間距 d",
      min: 0.2,
      max: 2,
      value: state.gapCm,
      step: 0.1,
      unit: "cm",
      onInput: (next) => {
        state.gapCm = next;
        component.render();
      }
    }),
    createSlider({
      label: "播放速度",
      min: 0.25,
      max: 2,
      value: state.speed,
      step: 0.25,
      formatValue: (next) => `${next.toFixed(2)}×`,
      onInput: (next) => {
        state.speed = next;
      }
    }),
    createButton(state.playing ? "暫停" : "播放", () => {
      state.playing = !state.playing;
      renderControls(controls, panel, state, component);
      component.render();
    }),
    createButton("重新播種", () => {
      state.elapsed = 0;
      state.playing = true;
      renderControls(controls, panel, state, component);
      component.render();
    }),
    createButton("重設", () => component.reset()),
    panel
  );
}

function computeMetrics(state) {
  const discharge = townsendDischarge({
    reducedFieldVPerCmTorr: state.reducedField,
    gamma: state.gamma,
    gapCm: state.gapCm
  });
  let regime;
  let status;
  if (state.gamma === 0) {
    regime = "熄滅";
    status = "γ=0：雪崩抵達陽極後熄滅，沒有二次電子，放電無法自持。";
  } else if (Math.abs(discharge.feedback - 1) <= 0.05) {
    regime = "臨界穩態";
    status = `臨界穩態：γ(e^(αd)−1)=${discharge.feedback.toFixed(2)}，二次電子剛好補回種子。`;
  } else if (discharge.selfSustaining) {
    regime = "可自持";
    status = `可自持放電：表面回授=${discharge.feedback.toFixed(2)} > 1，離子撞擊陰極可補回下一代種子。`;
  } else {
    regime = "次臨界";
    status = `次臨界：表面回授=${discharge.feedback.toFixed(2)} < 1，雪崩會逐代衰減。`;
  }
  return { ...discharge, regime, status };
}

function drawScene(ctx, state, metrics) {
  const theme = state.theme;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawChamber(ctx, state, metrics);
  drawLogPlot(ctx, state, metrics);
}

function drawChamber(ctx, state, metrics) {
  const theme = state.theme;
  ctx.fillStyle = theme.text;
  ctx.font = "700 17px system-ui";
  ctx.fillText("Townsend 電子雪崩", CHAMBER.left, 30);
  ctx.font = "12px system-ui";
  ctx.fillStyle = theme.muted;
  ctx.fillText(`E/p=${state.reducedField.toFixed(0)} V/(cm·Torr) · γ=${state.gamma.toFixed(3)} · d=${state.gapCm.toFixed(1)} cm`, CHAMBER.left, 49);
  ctx.strokeStyle = theme.border;
  ctx.strokeRect(CHAMBER.left, CHAMBER.top, CHAMBER.right - CHAMBER.left, CHAMBER.bottom - CHAMBER.top);

  ctx.fillStyle = theme.neutral;
  ctx.fillRect(CHAMBER.left, CHAMBER.top, 12, CHAMBER.bottom - CHAMBER.top);
  ctx.fillRect(CHAMBER.right - 12, CHAMBER.top, 12, CHAMBER.bottom - CHAMBER.top);
  ctx.fillStyle = theme.text;
  ctx.font = "700 11px system-ui";
  ctx.fillText("陰極", CHAMBER.left, CHAMBER.bottom + 18);
  ctx.fillText("陽極", CHAMBER.right - 28, CHAMBER.bottom + 18);

  const cycle = (state.elapsed / 2600) % 1.25;
  const front = Math.min(1, cycle / 0.88);
  drawField(ctx, theme);
  drawElectrons(ctx, state, metrics, front, cycle);
  drawIons(ctx, state, metrics, front, cycle);
  drawSecondaryElectrons(ctx, state, metrics, cycle);

  ctx.fillStyle = metrics.regime === "可自持" ? theme.primary : metrics.regime === "臨界穩態" ? "#a66b00" : theme.muted;
  ctx.font = "800 15px system-ui";
  ctx.fillText(metrics.regime, CHAMBER.left + 20, CHAMBER.top + 28);
}

function drawField(ctx, theme) {
  ctx.strokeStyle = withAlpha(theme.primary, 0.22);
  ctx.lineWidth = 1;
  for (let y = CHAMBER.top + 50; y < CHAMBER.bottom - 18; y += 42) {
    ctx.beginPath();
    ctx.moveTo(CHAMBER.left + 34, y);
    ctx.lineTo(CHAMBER.right - 34, y);
    ctx.stroke();
    ctx.fillStyle = withAlpha(theme.primary, 0.45);
    ctx.beginPath();
    ctx.moveTo(CHAMBER.right - 38, y - 4);
    ctx.lineTo(CHAMBER.right - 30, y);
    ctx.lineTo(CHAMBER.right - 38, y + 4);
    ctx.fill();
  }
}

function drawElectrons(ctx, state, metrics, front, cycle) {
  const theme = state.theme;
  const availableWidth = CHAMBER.right - CHAMBER.left - 54;
  const slices = 22;
  for (let slice = 0; slice <= slices; slice++) {
    const normalizedX = slice / slices;
    if (normalizedX > front) continue;
    const localGain = Math.exp(Math.min(5, metrics.alphaPerCm * state.gapCm * normalizedX));
    const count = Math.min(12, Math.max(1, Math.round(localGain * 0.34)));
    const x = CHAMBER.left + 27 + normalizedX * availableWidth;
    for (let index = 0; index < count; index++) {
      const y = CHAMBER.top + 58 + seeded(slice * 71 + index * 13 + 5) * (CHAMBER.bottom - CHAMBER.top - 86);
      dot(ctx, theme.electron, x + (seeded(index * 17 + slice) - 0.5) * 9, y, 2.2);
    }
    if (slice > 0 && count > 1) {
      ctx.fillStyle = withAlpha("#f2a51a", 0.75);
      ctx.beginPath();
      ctx.arc(x, CHAMBER.top + 48 + seeded(slice * 23) * 155, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (cycle < 0.08) dot(ctx, "#f2a51a", CHAMBER.left + 25, CHAMBER.top + 124, 4.2);
}

function drawIons(ctx, state, metrics, front, cycle) {
  const theme = state.theme;
  const count = Math.min(42, Math.round((metrics.gain - 1) * 0.7));
  const drift = Math.max(0, Math.min(1, cycle - 0.38));
  for (let index = 0; index < count; index++) {
    const originX = CHAMBER.left + 70 + seeded(index * 31 + 4) * (CHAMBER.right - CHAMBER.left - 110) * front;
    const x = originX - (originX - CHAMBER.left - 18) * drift * 0.54;
    const y = CHAMBER.top + 58 + seeded(index * 19 + 11) * (CHAMBER.bottom - CHAMBER.top - 88);
    dot(ctx, theme.ion, x, y, 3.1);
  }
}

function drawSecondaryElectrons(ctx, state, metrics, cycle) {
  if (state.gamma <= 0 || cycle < 0.78) return;
  const theme = state.theme;
  const count = Math.min(8, Math.max(1, Math.round(metrics.feedback * 3)));
  ctx.fillStyle = "#f2a51a";
  ctx.font = "700 10px system-ui";
  ctx.fillText("二次電子 γ", CHAMBER.left + 20, CHAMBER.top + 48);
  for (let index = 0; index < count; index++) {
    const x = CHAMBER.left + 20 + ((cycle - 0.78) * 72 + index * 4) % 56;
    const y = CHAMBER.top + 74 + index * 19;
    dot(ctx, "#f2a51a", x, y, 3.2);
  }
  ctx.strokeStyle = withAlpha(theme.ion, 0.5);
  ctx.beginPath();
  ctx.moveTo(CHAMBER.left + 10, CHAMBER.top + 92);
  ctx.lineTo(CHAMBER.left + 24, CHAMBER.top + 92);
  ctx.stroke();
}

function drawLogPlot(ctx, state, metrics) {
  const theme = state.theme;
  ctx.fillStyle = theme.text;
  ctx.font = "700 15px system-ui";
  ctx.fillText("log N(x)", PLOT.left, 30);
  ctx.font = "11px system-ui";
  ctx.fillStyle = theme.muted;
  ctx.fillText("指數成長", PLOT.left, 48);
  ctx.strokeStyle = theme.border;
  ctx.strokeRect(PLOT.left, PLOT.top, PLOT.right - PLOT.left, PLOT.bottom - PLOT.top);
  ctx.strokeStyle = theme.border;
  for (let row = 1; row < 4; row++) {
    const y = PLOT.top + row * (PLOT.bottom - PLOT.top) / 4;
    ctx.beginPath();
    ctx.moveTo(PLOT.left, y);
    ctx.lineTo(PLOT.right, y);
    ctx.stroke();
  }
  const maxLog = Math.max(1, Math.log10(Math.max(metrics.gain, 10)));
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let index = 0; index <= 70; index++) {
    const xNorm = index / 70;
    const logN = (metrics.alphaPerCm * state.gapCm * xNorm) / Math.log(10);
    const x = PLOT.left + xNorm * (PLOT.right - PLOT.left);
    const y = PLOT.bottom - 20 - (logN / maxLog) * (PLOT.bottom - PLOT.top - 36);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = theme.muted;
  ctx.font = "10px system-ui";
  ctx.fillText("0", PLOT.left, PLOT.bottom + 14);
  ctx.fillText("d", PLOT.right - 5, PLOT.bottom + 14);
  ctx.fillText("N₀", PLOT.left + 4, PLOT.bottom - 25);
  ctx.fillText(`G=${formatGain(metrics.gain)}`, PLOT.left + 10, PLOT.top + 18);
}

function updatePanel(panel, metrics) {
  const values = {
    "第一 Townsend 係數 α": `${metrics.alphaPerCm.toFixed(2)} cm⁻¹`,
    "電子增益 e^(αd)": formatGain(metrics.gain),
    "回授 γ(G−1)": metrics.feedback.toFixed(2),
    "臨界 γ": Number.isFinite(metrics.criticalGamma) ? metrics.criticalGamma.toFixed(3) : "—",
    "放電狀態": metrics.regime
  };
  for (const [key, value] of Object.entries(values)) {
    const node = panel.querySelector(`[data-value-key="${key}"]`);
    if (node) node.textContent = value;
  }
}

function formatGain(value) {
  return value >= 1000 ? value.toExponential(1) : value.toFixed(1);
}

function dot(ctx, color, x, y, radius) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function seeded(value) {
  const next = Math.sin(value * 12.9898) * 43758.5453;
  return next - Math.floor(next);
}

function withAlpha(color, alpha) {
  if (!color.startsWith("#")) return color;
  const hex = color.slice(1);
  const normalized = hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex;
  const value = Number.parseInt(normalized, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}
