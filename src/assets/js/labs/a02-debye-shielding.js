import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createButton, createSegmentedControl, createSlider, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { clearSvg, createSvg, drawAxes, drawLine, linearScale } from "../plot.js";
import { debyeLengthMm } from "../plasma-model.js";

const WIDTH = 720;
const HEIGHT = 360;
const PARTICLE_COUNT = 170;

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const ctx = canvas.getContext("2d");
  const overlay = ensureOverlay(canvas);
  const particles = createParticles(PARTICLE_COUNT);
  const state = {
    values: {
      densityLog: 10,
      electronTemperatureEv: 3,
      polarity: "positive"
    },
    charge: { x: WIDTH * 0.44, y: HEIGHT * 0.48 },
    particles,
    theme: readCanvasTheme(),
    dragging: false,
    lastTime: 0
  };

  const panel = createValuePanel([
    ["λD", "—"],
    ["CCP 對照", "0.129 mm"],
    ["ICP 對照", "0.013 mm"],
    ["遮蔽關係", "—"]
  ]);

  const instance = {
    update(time = 0) {
      const delta = Math.min(32, time - state.lastTime || 16) / 16;
      state.lastTime = time;
      updateParticles(state, delta);
    },
    render() {
      const metrics = computeMetrics(state.values);
      drawScene(ctx, canvas, state, metrics);
      drawPotentialPlot(overlay, state, metrics);
      updatePanel(panel, metrics);
      status.textContent = `λD = ${metrics.lambdaText}；${metrics.relationship} 可拖曳中央測試電荷觀察遮蔽雲跟隨。`;
    },
    reset() {
      state.values = { densityLog: 10, electronTemperatureEv: 3, polarity: "positive" };
      state.charge = { x: WIDTH * 0.44, y: HEIGHT * 0.48 };
      state.particles = createParticles(PARTICLE_COUNT);
      resetControls(controls, panel, component, state);
    },
    applyTheme(theme) {
      state.theme = theme;
      this.render();
    },
    destroy() {
      unwatch();
      removePointerHandlers();
    }
  };
  const component = createLifecycle(instance);
  const unwatch = watchTheme(component);
  const removePointerHandlers = attachDragHandlers(canvas, state, component);

  resetControls(controls, panel, component, state);
  component.render();
  return component;
}

function resetControls(controls, panel, component, state) {
  controls.replaceChildren();
  controls.append(
    createSlider({
      label: "電子密度 log10(n_e / cm⁻³)",
      min: 9,
      max: 12,
      value: state.values.densityLog,
      step: 0.1,
      onInput: (next) => {
        state.values.densityLog = next;
        component.render();
      }
    }),
    createSlider({
      label: "電子溫度 T_e",
      min: 1,
      max: 10,
      value: state.values.electronTemperatureEv,
      step: 0.1,
      unit: "eV",
      onInput: (next) => {
        state.values.electronTemperatureEv = next;
        component.render();
      }
    }),
    createSegmentedControl({
      label: "測試電荷極性",
      value: state.values.polarity,
      options: [
        { label: "正電荷", value: "positive" },
        { label: "負電荷", value: "negative" }
      ],
      onChange: (next) => {
        state.values.polarity = next;
        component.render();
      }
    }),
    createButton("重設", () => component.reset()),
    panel
  );
}

function ensureOverlay(canvas) {
  let visual = canvas.closest(".lab-visual");
  if (!visual) {
    visual = document.createElement("div");
    visual.className = "lab-visual lab-visual--overlay";
    canvas.before(visual);
    visual.append(canvas);
  }
  let svg = visual.querySelector("svg");
  if (!svg) {
    svg = createSvg("svg", {
      class: "lab-plot-overlay",
      viewBox: "0 0 300 150",
      role: "img",
      "aria-label": "電位對距離曲線"
    });
    visual.append(svg);
  }
  return svg;
}

function createParticles(count) {
  return Array.from({ length: count }, (_, index) => ({
    kind: index % 3 === 0 ? "ion" : "electron",
    x: 48 + Math.random() * (WIDTH - 96),
    y: 58 + Math.random() * (HEIGHT - 116),
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35
  }));
}

function computeMetrics(values) {
  const electronDensityCm3 = 10 ** values.densityLog;
  const lambdaMm = debyeLengthMm({
    electronDensityCm3,
    electronTemperatureEv: values.electronTemperatureEv
  });
  const lambdaPx = linearScale(Math.log10(0.007), Math.log10(0.75), 34, 150)(Math.log10(lambdaMm));
  const clampedLambdaPx = Math.max(28, Math.min(156, lambdaPx));
  const densityText = `10^${values.densityLog.toFixed(1)} cm⁻³`;
  const lambdaText = `${lambdaMm.toFixed(3)} mm`;
  const relationship = values.densityLog >= 11.5 ? "高密度使遮蔽圈明顯縮小。" : "提高密度十倍時，λD 約縮小 √10 倍。";
  return { electronDensityCm3, densityText, lambdaMm, lambdaText, lambdaPx: clampedLambdaPx, relationship };
}

function updateParticles(state, delta) {
  const sign = state.values.polarity === "positive" ? 1 : -1;
  for (const particle of state.particles) {
    const dx = state.charge.x - particle.x;
    const dy = state.charge.y - particle.y;
    const distanceSq = Math.max(240, dx * dx + dy * dy);
    const distance = Math.sqrt(distanceSq);
    const attracts = (particle.kind === "electron" && sign > 0) || (particle.kind === "ion" && sign < 0);
    const force = (attracts ? 38 : -18) / distanceSq;
    particle.vx += (dx / distance) * force * delta;
    particle.vy += (dy / distance) * force * delta;
    particle.vx *= 0.985;
    particle.vy *= 0.985;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    if (particle.x < 34 || particle.x > WIDTH - 34) particle.vx *= -0.7;
    if (particle.y < 48 || particle.y > HEIGHT - 48) particle.vy *= -0.7;
    particle.x = Math.max(34, Math.min(WIDTH - 34, particle.x));
    particle.y = Math.max(48, Math.min(HEIGHT - 48, particle.y));
  }
}

function drawScene(ctx, canvas, state, metrics) {
  const theme = state.theme;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = theme.border;
  ctx.strokeRect(28, 28, WIDTH - 56, HEIGHT - 56);

  ctx.fillStyle = theme.text;
  ctx.font = "700 18px system-ui";
  ctx.fillText("A02 Debye 遮蔽互動", 44, 62);
  ctx.font = "13px system-ui";
  ctx.fillStyle = theme.muted;
  ctx.fillText(`n_e = ${metrics.densityText} · T_e = ${state.values.electronTemperatureEv.toFixed(1)} eV`, 44, 84);

  drawDebyeCircle(ctx, state, metrics);
  drawParticles(ctx, state);
  drawCharge(ctx, state);
  drawScaleNote(ctx, state, metrics);
}

function drawDebyeCircle(ctx, state, metrics) {
  const theme = state.theme;
  ctx.save();
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.arc(state.charge.x, state.charge.y, metrics.lambdaPx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = theme.primary;
  ctx.font = "700 12px system-ui";
  ctx.fillText("λD", state.charge.x + metrics.lambdaPx + 8, state.charge.y - 8);
  ctx.restore();
}

function drawParticles(ctx, state) {
  const theme = state.theme;
  for (const particle of state.particles) {
    ctx.fillStyle = particle.kind === "electron" ? theme.electron : theme.ion;
    ctx.globalAlpha = particle.kind === "electron" ? 0.82 : 0.64;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.kind === "electron" ? 2.4 : 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCharge(ctx, state) {
  const theme = state.theme;
  const sign = state.values.polarity === "positive" ? "+" : "−";
  ctx.fillStyle = state.values.polarity === "positive" ? theme.ion : theme.electron;
  ctx.beginPath();
  ctx.arc(state.charge.x, state.charge.y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 22px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(sign, state.charge.x, state.charge.y - 1);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function drawScaleNote(ctx, state, metrics) {
  ctx.fillStyle = state.theme.muted;
  ctx.font = "12px system-ui";
  ctx.fillText(`虛線圈為對數視覺縮放；真實 λD = ${metrics.lambdaText}`, 44, HEIGHT - 36);
}

function drawPotentialPlot(svg, state, metrics) {
  clearSvg(svg);
  const x = 40;
  const y = 24;
  const width = 230;
  const height = 82;
  const xScale = linearScale(0, 6, x, x + width);
  const yScale = linearScale(-1, 1, y + height, y);
  const sign = state.values.polarity === "positive" ? 1 : -1;
  const points = [];
  for (let i = 0; i <= 80; i++) {
    const r = 0.12 + (i / 80) * 5.88;
    const potential = sign * Math.exp(-r) / r;
    points.push([xScale(r), yScale(Math.max(-1, Math.min(1, potential)))]);
  }
  drawAxes(svg, {
    x,
    y,
    width,
    height,
    xLabel: "r / λD",
    yLabel: "φ(r)",
    xTicks: [
      { x: xScale(1), label: "1" },
      { x: xScale(3), label: "3" },
      { x: xScale(6), label: "6" }
    ],
    yTicks: [
      { y: yScale(1), label: "+" },
      { y: yScale(0), label: "0" },
      { y: yScale(-1), label: "−" }
    ]
  });
  drawLine(svg, { points, className: "plot-line" });
  svg.append(createSvg("line", { x1: xScale(1), y1: y, x2: xScale(1), y2: y + height, class: "plot-line-muted" }));
  const label = createSvg("text", { x: 12, y: 138, class: "plot-caption" });
  label.textContent = `exp(−r/λD)，目前 ${metrics.lambdaText}`;
  svg.append(label);
}

function attachDragHandlers(canvas, state, component) {
  const toCanvasPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT
    };
  };
  const isNearCharge = (point) => {
    const dx = point.x - state.charge.x;
    const dy = point.y - state.charge.y;
    return dx * dx + dy * dy < 36 * 36;
  };
  const onPointerDown = (event) => {
    const point = toCanvasPoint(event);
    if (!isNearCharge(point)) return;
    state.dragging = true;
    canvas.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event) => {
    if (!state.dragging) return;
    const point = toCanvasPoint(event);
    state.charge.x = Math.max(70, Math.min(WIDTH - 70, point.x));
    state.charge.y = Math.max(82, Math.min(HEIGHT - 62, point.y));
    component.render();
  };
  const onPointerUp = (event) => {
    state.dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerUp);
  };
}

function updatePanel(panel, metrics) {
  const values = {
    "λD": metrics.lambdaText,
    "CCP 對照": "10¹⁰ cm⁻³, 3 eV → 0.129 mm",
    "ICP 對照": "10¹² cm⁻³, 3 eV → 0.013 mm",
    "遮蔽關係": metrics.relationship
  };
  for (const [key, value] of Object.entries(values)) {
    const node = panel.querySelector(`[data-value-key="${key}"]`);
    if (node) node.textContent = value;
  }
}
