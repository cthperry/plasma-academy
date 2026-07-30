import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createButton, createSegmentedControl, createSlider, createToggle, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { clearSvg, createSvg, drawLine, linearScale } from "../plot.js";
import { childLangmuirSheathMm, floatingPotentialDropEv } from "../plasma-model.js";

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 300;
const SVG_WIDTH = 720;
const SVG_HEIGHT = 250;
const SURFACE_Y = 262;
const STAGES = [
  { label: "1 均勻準中性", short: "均勻", note: "電子與離子均勻分布，表面尚未充電。" },
  { label: "2 電子先流失", short: "電子流失", note: "高速電子先抵達表面，使表面開始帶負電。" },
  { label: "3 鞘層形成", short: "鞘層形成", note: "負表面排斥電子，靠近表面的離子過剩區擴張。" },
  { label: "4 穩態離子轟擊", short: "穩態", note: "電子與離子流量平衡，離子沿垂直電場加速入射。" }
];

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const { svg } = ensureStage(canvas);
  const ctx = canvas.getContext("2d");
  const state = {
    timeline: 0,
    densityLog: 10,
    electronTemperatureEv: 3,
    showField: true,
    playing: false,
    elapsed: 0,
    lastTime: 0,
    theme: readCanvasTheme(),
    particles: createParticles(156),
    timelineInput: null,
    timelineOutput: null
  };
  const panel = createValuePanel([
    ["Vp", "—"],
    ["Vf", "—"],
    ["Vp − Vf", "—"],
    ["鞘層厚度 s", "—"],
    ["離子入射能量", "—"]
  ]);

  const instance = {
    update(time = 0) {
      const deltaMs = Math.min(50, time - state.lastTime || 16);
      state.lastTime = time;
      state.elapsed += deltaMs;
      if (!state.playing) return;
      state.timeline = Math.min(3, state.timeline + deltaMs / 1700);
      syncTimelineControl(state);
      if (state.timeline >= 3) {
        state.playing = false;
        renderControls(controls, panel, state, component);
      }
    },
    render() {
      const metrics = computeMetrics(state);
      drawChamber(ctx, state, metrics);
      drawProfiles(svg, state, metrics);
      updatePanel(panel, metrics);
      const stage = STAGES[metrics.stageIndex];
      status.textContent = `${stage.label}：${stage.note} ${metrics.stageIndex === 3 ? `穩態 Vp − Vf = ${metrics.dropV.toFixed(1)} V，約為 4.7 × Te。` : ""}`;
    },
    reset() {
      state.timeline = 0;
      state.densityLog = 10;
      state.electronTemperatureEv = 3;
      state.showField = true;
      state.playing = false;
      state.elapsed = 0;
      state.particles = createParticles(156);
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

function ensureStage(canvas) {
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  let stage = canvas.closest(".lab-sheath-stage");
  if (!stage) {
    stage = document.createElement("div");
    stage.className = "lab-sheath-stage";
    canvas.before(stage);
    const svg = createSvg("svg", {
      viewBox: `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`,
      role: "img",
      "aria-label": "鞘層電位、電子密度與離子密度同步曲線"
    });
    stage.append(canvas, svg);
  }
  return { stage, svg: stage.querySelector("svg") };
}

function renderControls(controls, panel, state, component) {
  controls.replaceChildren();
  const timeline = createSlider({
    label: "形成時間軸",
    min: 0,
    max: 3,
    value: state.timeline,
    step: 0.01,
    formatValue: stageName,
    onInput: (next) => {
      state.timeline = next;
      state.playing = false;
      component.render();
    }
  });
  state.timelineInput = timeline.querySelector("input");
  state.timelineOutput = timeline.querySelector("output");

  controls.append(
    timeline,
    createSegmentedControl({
      label: "單步階段",
      value: String(Math.round(state.timeline)),
      options: STAGES.map((stage, index) => ({ label: stage.short, value: String(index) })),
      onChange: (next) => {
        state.timeline = Number(next);
        state.playing = false;
        renderControls(controls, panel, state, component);
        component.render();
      }
    }),
    createSlider({
      label: "電子密度 log10(n_e / cm⁻³)",
      min: 9,
      max: 12,
      value: state.densityLog,
      step: 0.1,
      formatValue: (next) => `10^${next.toFixed(1)} cm⁻³`,
      onInput: (next) => {
        state.densityLog = next;
        component.render();
      }
    }),
    createSlider({
      label: "電子溫度 T_e",
      min: 1,
      max: 8,
      value: state.electronTemperatureEv,
      step: 0.1,
      unit: "eV",
      onInput: (next) => {
        state.electronTemperatureEv = next;
        component.render();
      }
    }),
    createToggle({
      label: "顯示電場向量",
      checked: state.showField,
      onChange: (next) => {
        state.showField = next;
        component.render();
      }
    }),
    createButton(state.playing ? "暫停" : "播放形成過程", () => {
      if (state.timeline >= 3) state.timeline = 0;
      state.playing = !state.playing;
      renderControls(controls, panel, state, component);
      component.render();
    }),
    createButton("重設", () => component.reset()),
    panel
  );
}

function computeMetrics(state) {
  const electronDensityCm3 = 10 ** state.densityLog;
  const dropV = floatingPotentialDropEv(state.electronTemperatureEv);
  const plasmaPotentialV = Math.min(30, 10 + state.electronTemperatureEv * 3.3);
  const floatingPotentialV = plasmaPotentialV - dropV;
  const sheathMm = childLangmuirSheathMm({
    electronDensityCm3,
    electronTemperatureEv: state.electronTemperatureEv,
    potentialDropV: dropV
  });
  const stageIndex = Math.max(0, Math.min(3, Math.round(state.timeline)));
  const formation = smoothstep(Math.max(0, (state.timeline - 0.65) / 2.35));
  const sheathPx = Math.max(48, Math.min(142, 36 + Math.log10(Math.max(sheathMm, 0.01) / 0.01) * 42));
  return {
    electronDensityCm3,
    dropV,
    plasmaPotentialV,
    floatingPotentialV,
    sheathMm,
    stageIndex,
    formation,
    sheathPx
  };
}

function createParticles(count) {
  return Array.from({ length: count }, (_, index) => ({
    kind: index % 3 === 0 ? "ion" : "electron",
    x: 44 + seeded(index * 17 + 3) * 632,
    y: 52 + seeded(index * 31 + 11) * 192,
    phase: seeded(index * 47 + 19) * Math.PI * 2,
    speed: 0.6 + seeded(index * 13 + 7) * 0.8
  }));
}

function drawChamber(ctx, state, metrics) {
  const theme = state.theme;
  const sheathTop = SURFACE_Y - metrics.sheathPx * metrics.formation;
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = theme.text;
  ctx.font = "700 17px system-ui";
  ctx.fillText("腔體剖面", 28, 30);
  ctx.font = "12px system-ui";
  ctx.fillStyle = theme.muted;
  ctx.fillText(`${STAGES[metrics.stageIndex].label} · n_e=10^${state.densityLog.toFixed(1)} cm⁻³ · T_e=${state.electronTemperatureEv.toFixed(1)} eV`, 28, 49);

  ctx.strokeStyle = theme.border;
  ctx.strokeRect(24, 58, 672, 216);
  if (metrics.formation > 0.02) {
    ctx.fillStyle = withAlpha(theme.primary, 0.08 + metrics.formation * 0.1);
    ctx.fillRect(25, sheathTop, 670, SURFACE_Y - sheathTop);
    ctx.fillStyle = theme.primary;
    ctx.font = "700 12px system-ui";
    ctx.fillText("非中性鞘層", 36, sheathTop + 18);
  }

  for (const particle of state.particles) drawParticle(ctx, particle, state, metrics, sheathTop);
  if (state.showField && metrics.formation > 0.1) drawFieldVectors(ctx, state, metrics, sheathTop);

  ctx.fillStyle = theme.neutral;
  ctx.fillRect(24, SURFACE_Y, 672, 13);
  ctx.fillStyle = theme.text;
  ctx.font = "700 12px system-ui";
  ctx.fillText("晶圓 / 浮動表面", 548, 257);
  if (state.timeline >= 0.7) {
    ctx.fillStyle = theme.electron;
    ctx.font = "700 15px system-ui";
    for (let x = 62; x < 670; x += 42) ctx.fillText("−", x, 286);
  }
}

function drawParticle(ctx, particle, state, metrics, sheathTop) {
  const theme = state.theme;
  const time = state.elapsed * 0.001 * particle.speed;
  let x = particle.x + Math.sin(time + particle.phase) * (particle.kind === "electron" ? 7 : 2.5);
  let y = particle.y + Math.cos(time * 1.3 + particle.phase) * (particle.kind === "electron" ? 6 : 2);
  let alpha = particle.kind === "electron" ? 0.78 : 0.7;

  if (particle.kind === "electron") {
    const electronBoundary = sheathTop + metrics.sheathPx * (1 - metrics.formation) * 0.12;
    if (state.timeline > 0.45 && y > electronBoundary) {
      y = electronBoundary - ((y - electronBoundary) * metrics.formation);
      alpha *= 1 - metrics.formation * 0.78;
    }
    if (state.timeline > 0.55 && particle.phase < 1.2) {
      y = SURFACE_Y - ((state.timeline - 0.55) * 92 + particle.phase * 15) % 190;
      alpha *= Math.max(0, 1.2 - state.timeline * 0.25);
    }
  } else if (metrics.formation > 0.3 && y > sheathTop - 18) {
    const transit = (time * 46 + particle.phase * 21) % Math.max(40, SURFACE_Y - sheathTop);
    y = sheathTop + transit;
    x += Math.sin(particle.phase) * (1 - metrics.formation) * 12;
  }

  ctx.globalAlpha = Math.max(0.08, alpha);
  ctx.fillStyle = particle.kind === "electron" ? theme.electron : theme.ion;
  ctx.beginPath();
  ctx.arc(x, Math.min(SURFACE_Y - 4, y), particle.kind === "electron" ? 2.4 : 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawFieldVectors(ctx, state, metrics, sheathTop) {
  const theme = state.theme;
  ctx.strokeStyle = theme.primary;
  ctx.fillStyle = theme.primary;
  ctx.lineWidth = 1.5;
  const length = Math.max(22, Math.min(58, (SURFACE_Y - sheathTop) * 0.45));
  for (let x = 90; x <= 640; x += 92) {
    const top = Math.max(sheathTop + 20, SURFACE_Y - length - 12);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, SURFACE_Y - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 5, SURFACE_Y - 17);
    ctx.lineTo(x, SURFACE_Y - 10);
    ctx.lineTo(x + 5, SURFACE_Y - 17);
    ctx.fill();
  }
}

function drawProfiles(svg, state, metrics) {
  clearSvg(svg);
  const plot = { x: 86, width: 580, rowHeight: 48, gap: 18, top: 28 };
  const labels = [
    { symbol: "φ(x)", className: "plot-line plot-line-phi" },
    { symbol: "nₑ(x)", className: "plot-line plot-line-ne" },
    { symbol: "nᵢ(x)", className: "plot-line plot-line-ni" }
  ];
  const sheathFraction = Math.max(0.06, Math.min(0.38, metrics.sheathPx / 370)) * metrics.formation;
  const xScale = linearScale(0, 1, plot.x, plot.x + plot.width);
  const boundaryX = xScale(sheathFraction);

  svg.append(createSvg("rect", {
    x: plot.x,
    y: 14,
    width: Math.max(0, boundaryX - plot.x),
    height: 190,
    class: "sheath-plot-band"
  }));
  svg.append(createSvg("line", { x1: boundaryX, y1: 14, x2: boundaryX, y2: 204, class: "sheath-plot-guide" }));
  const boundaryLabel = createSvg("text", { x: Math.max(plot.x + 4, boundaryX + 5), y: 22, class: "sheath-plot-label" });
  boundaryLabel.textContent = metrics.formation > 0.08 ? "鞘層邊界" : "尚未形成鞘層";
  svg.append(boundaryLabel);

  labels.forEach((item, row) => {
    const yTop = plot.top + row * (plot.rowHeight + plot.gap);
    const yBottom = yTop + plot.rowHeight;
    svg.append(createSvg("line", { x1: plot.x, y1: yBottom, x2: plot.x + plot.width, y2: yBottom, class: "plot-axes" }));
    const label = createSvg("text", { x: 18, y: yTop + 28, class: "sheath-stage-label" });
    label.textContent = item.symbol;
    svg.append(label);
    drawLine(svg, { points: profilePoints(row, state, metrics, xScale, yTop, yBottom), className: item.className });
  });

  const surface = createSvg("text", { x: plot.x, y: 232, class: "sheath-plot-label", "text-anchor": "start" });
  surface.textContent = "表面 x=0";
  const bulk = createSvg("text", { x: plot.x + plot.width, y: 232, class: "sheath-plot-label", "text-anchor": "end" });
  bulk.textContent = "電漿 bulk";
  svg.append(surface, bulk);
}

function profilePoints(row, state, metrics, xScale, yTop, yBottom) {
  const points = [];
  const edge = Math.max(0.03, Math.min(0.38, metrics.sheathPx / 370));
  for (let index = 0; index <= 90; index++) {
    const x = index / 90;
    const normalized = Math.min(1, x / edge);
    const transition = smoothstep(normalized);
    let value;
    if (row === 0) value = 1 - metrics.formation + metrics.formation * transition;
    else if (row === 1) value = 1 - metrics.formation * (1 - transition) * 0.96;
    else value = 1 + metrics.formation * (1 - transition) * 0.36;
    const scale = row === 2 ? linearScale(0.9, 1.4, yBottom, yTop) : linearScale(0, 1.05, yBottom, yTop);
    points.push([xScale(x), scale(value)]);
  }
  return points;
}

function updatePanel(panel, metrics) {
  const values = {
    "Vp": `${metrics.plasmaPotentialV.toFixed(1)} V`,
    "Vf": `${metrics.floatingPotentialV.toFixed(1)} V`,
    "Vp − Vf": `${metrics.dropV.toFixed(1)} V`,
    "鞘層厚度 s": `${metrics.sheathMm.toFixed(3)} mm`,
    "離子入射能量": `${metrics.dropV.toFixed(1)} eV`
  };
  for (const [key, value] of Object.entries(values)) {
    const node = panel.querySelector(`[data-value-key="${key}"]`);
    if (node) node.textContent = value;
  }
}

function syncTimelineControl(state) {
  if (state.timelineInput) state.timelineInput.value = String(state.timeline);
  if (state.timelineOutput) state.timelineOutput.value = stageName(state.timeline);
}

function stageName(value) {
  return STAGES[Math.max(0, Math.min(3, Math.round(value)))].short;
}

function smoothstep(value) {
  const x = Math.max(0, Math.min(1, value));
  return x * x * (3 - 2 * x);
}

function seeded(value) {
  const next = Math.sin(value * 12.9898) * 43758.5453;
  return next - Math.floor(next);
}

function withAlpha(color, alpha) {
  if (!color.startsWith("#")) return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
  const hex = color.slice(1);
  const normalized = hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex;
  const value = Number.parseInt(normalized, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}
