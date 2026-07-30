import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createSegmentedControl, createSlider, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { coburnWintersRate } from "../etch-profile-model.js";

export function init(container) {
  const originalCanvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const visual = document.createElement("div");
  visual.className = "coburn-visual";
  visual.innerHTML = `<svg viewBox="0 0 720 330" role="img" aria-label="Coburn-Winters 化學、物理與協同蝕刻率長條圖"></svg><canvas width="720" height="300" aria-label="自由基與方向性離子作用於矽表面或溝槽的動畫"></canvas>`;
  originalCanvas.replaceWith(visual);
  const svg = visual.querySelector("svg");
  const canvas = visual.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const state = { gas: 1, ion: 1, view: "surface", elapsed: 0, lastTime: 0, theme: readCanvasTheme() };
  const panel = createValuePanel([
    ["純化學項", "—"], ["純物理項", "—"], ["協同項", "—"], ["總蝕刻率", "—"], ["高於相加", "—"]
  ]);

  const instance = {
    update(time = 0) {
      const delta = Math.min(50, time - state.lastTime || 16);
      state.lastTime = time;
      state.elapsed += delta;
    },
    render() {
      const rate = coburnWintersRate(state.gas, state.ion);
      drawBars(svg, rate);
      drawMechanism(ctx, state, rate);
      updatePanel(panel, rate);
      const location = state.view === "trench" ? "溝底同時接收離子與自由基，側壁主要只有自由基。" : "離子打開鍵結與脫附瓶頸，自由基提供主要化學移除。";
      status.textContent = `總速率 ${rate.total.toFixed(1)}，其中協同項 ${rate.synergy.toFixed(1)}；${location}`;
    },
    reset() {},
    applyTheme(theme) { state.theme = theme; this.render(); },
    destroy() { unwatch(); }
  };
  const component = createLifecycle(instance);
  const unwatch = watchTheme(component);
  const change = (key, value) => { state[key] = value; component.render(); };
  controls.replaceChildren(
    createSegmentedControl({ label: "視角", options: [{ value: "surface", label: "分子表面" }, { value: "trench", label: "溝槽剖面" }], value: state.view, onChange: (value) => change("view", value) }),
    createSlider({ label: "XeF₂ 自由基通量", min: 0, max: 1, value: state.gas, step: 0.05, formatValue: (value) => `${Math.round(value * 100)}%`, onInput: (value) => change("gas", value) }),
    createSlider({ label: "Ar⁺ 離子通量", min: 0, max: 1, value: state.ion, step: 0.05, formatValue: (value) => `${Math.round(value * 100)}%`, onInput: (value) => change("ion", value) }),
    panel
  );
  component.render();
  return component;
}

function drawBars(svg, rate) {
  const values = [
    { label: "純化學", value: rate.chemical, className: "coburn-chemical" },
    { label: "純物理", value: rate.physical, className: "coburn-physical" },
    { label: "簡單相加", value: rate.additive, className: "coburn-additive" },
    { label: "實際協同", value: rate.total, className: "coburn-total" }
  ];
  const baseline = 268;
  const heightScale = 3.9;
  svg.replaceChildren();
  svg.insertAdjacentHTML("beforeend", `<line x1="58" y1="${baseline}" x2="690" y2="${baseline}" class="plot-axis"></line><text x="24" y="28" class="plot-label">相對蝕刻率</text>`);
  for (let tick = 0; tick <= 60; tick += 10) {
    const y = baseline - tick * heightScale;
    svg.insertAdjacentHTML("beforeend", `<line x1="52" y1="${y}" x2="690" y2="${y}" class="plot-grid"></line><text x="44" y="${y + 4}" text-anchor="end" class="plot-label">${tick}</text>`);
  }
  values.forEach((item, index) => {
    const x = 90 + index * 150;
    const h = Math.max(1, item.value * heightScale);
    svg.insertAdjacentHTML("beforeend", `<rect x="${x}" y="${baseline - h}" width="92" height="${h}" rx="3" class="${item.className}"></rect><text x="${x + 46}" y="${baseline - h - 10}" text-anchor="middle" class="coburn-value">${item.value.toFixed(1)}</text><text x="${x + 46}" y="${baseline + 24}" text-anchor="middle" class="plot-label">${item.label}</text>`);
  });
  const additiveY = baseline - rate.additive * heightScale;
  svg.insertAdjacentHTML("beforeend", `<line x1="62" y1="${additiveY}" x2="690" y2="${additiveY}" class="coburn-additive-line"></line>`);
}

function drawMechanism(ctx, state, rate) {
  const { theme } = state;
  ctx.clearRect(0, 0, 720, 300);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, 720, 300);
  if (state.view === "trench") drawTrench(ctx, state, rate);
  else drawSurface(ctx, state, rate);
}

function drawSurface(ctx, state, rate) {
  const { theme } = state;
  const floor = 218;
  ctx.fillStyle = "#7f8da3";
  ctx.fillRect(0, floor, 720, 82);
  if (state.gas > 0) {
    ctx.fillStyle = withAlpha(theme.primary, 0.32 + state.gas * 0.35);
    ctx.fillRect(0, floor - 13, 720, 13);
  }
  const offset = (state.elapsed / 10) % 88;
  for (let index = 0; index < 18; index += 1) {
    const x = 28 + index * 39;
    if (index % 2 === 0 && state.ion > 0) {
      ctx.fillStyle = theme.ion;
      ctx.beginPath(); ctx.arc(x, 20 + (offset + index * 11) % 175, 4, 0, Math.PI * 2); ctx.fill();
    } else if (state.gas > 0) {
      ctx.fillStyle = theme.primary;
      ctx.beginPath(); ctx.arc(x + Math.sin(index) * 12, 28 + (offset * 0.72 + index * 17) % 165, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.fillStyle = theme.text;
  ctx.font = "700 15px system-ui";
  ctx.fillText("SiFₓ 反應層", 18, floor - 22);
  ctx.fillText(`Si 移除速率 ${rate.total.toFixed(1)}`, 535, 282);
  if (rate.synergy > 2) {
    ctx.fillStyle = theme.primary;
    for (let index = 0; index < 5; index += 1) ctx.fillText("SiF₄ ↑", 120 + index * 112, 82 + Math.sin(state.elapsed / 240 + index) * 10);
  }
}

function drawTrench(ctx, state, rate) {
  const { theme } = state;
  ctx.fillStyle = "#7f8da3";
  ctx.fillRect(0, 72, 720, 228);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(265, 72, 190, 180);
  ctx.fillStyle = "#d5b34b";
  ctx.fillRect(0, 56, 265, 26);
  ctx.fillRect(455, 56, 265, 26);
  ctx.strokeStyle = theme.ion;
  ctx.lineWidth = 2;
  for (let x = 292; x <= 428; x += 34) {
    ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, 240); ctx.stroke();
  }
  const bottom = coburnWintersRate(state.gas, state.ion).total;
  const wall = coburnWintersRate(state.gas, 0).total;
  ctx.fillStyle = theme.text;
  ctx.font = "700 14px system-ui";
  ctx.fillText(`溝底：自由基 + 離子 = ${bottom.toFixed(1)}`, 250, 278);
  ctx.fillText(`側壁：主要自由基 = ${wall.toFixed(1)}`, 18, 156);
  ctx.fillStyle = theme.muted;
  ctx.font = "13px system-ui";
  ctx.fillText(`底／側速率比 ${wall > 0 ? (bottom / wall).toFixed(1) : "—"}×`, 525, 156);
}

function updatePanel(panel, rate) {
  const values = {
    "純化學項": rate.chemical.toFixed(1),
    "純物理項": rate.physical.toFixed(1),
    "協同項": rate.synergy.toFixed(1),
    "總蝕刻率": rate.total.toFixed(1),
    "高於相加": rate.additive > 0 ? `${(rate.total / rate.additive).toFixed(1)}×` : "—"
  };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}

function withAlpha(color, alpha) {
  if (/^#[0-9a-f]{6}$/i.test(color)) return `${color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
  return color;
}
