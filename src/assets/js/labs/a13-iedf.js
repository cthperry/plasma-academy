import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createSegmentedControl, createSelect, createSlider, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { createSvg, clearSvg, drawAxes, linearScale } from "../plot.js";
import { iedfIons, simulateIedf } from "../plasma-model.js";

const WIDTH = 720;
const HEIGHT = 250;

export function init(container) {
  const originalCanvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const visual = document.createElement("div");
  visual.className = "iedf-visual";
  visual.innerHTML = `<canvas width="720" height="250" data-lab-canvas aria-label="RF 鞘層與離子軌跡"></canvas><svg viewBox="0 0 720 250" role="img" aria-label="離子能量分佈直方圖"></svg>`;
  originalCanvas.replaceWith(visual);
  const canvas = visual.querySelector("canvas");
  const svg = visual.querySelector("svg");
  const ctx = canvas.getContext("2d");
  const state = { frequencyMhz: 13.56, biasV: 300, pressureMtorr: 1, ion: "Ar", elapsed: 0, lastTime: 0, theme: readCanvasTheme(), dirty: true, model: null };
  const panel = createValuePanel([["平均能量", "—"], ["峰間距 ΔE", "—"], ["低能尾巴", "—"], ["平均自由徑", "—"]]);

  const instance = {
    update(time = 0) {
      const delta = Math.min(50, time - state.lastTime || 16);
      state.lastTime = time;
      state.elapsed += delta;
    },
    render() {
      if (state.dirty || !state.model) {
        state.model = simulateIedf(state);
        drawHistogram(svg, state.model);
        updatePanel(panel, state.model);
        updateStatus(status, state.model);
        state.dirty = false;
      }
      drawSheath(ctx, state, state.model);
    },
    reset() {},
    applyTheme(theme) { state.theme = theme; state.dirty = true; this.render(); },
    destroy() { unwatch(); }
  };
  const component = createLifecycle(instance);
  const unwatch = watchTheme(component);
  const change = (key, value) => { state[key] = value; state.dirty = true; component.render(); };
  controls.replaceChildren(
    createSegmentedControl({ label: "RF 頻率", options: [0.4, 2, 13.56, 60].map((value) => ({ value: String(value), label: `${value} MHz` })), value: String(state.frequencyMhz), onChange: (value) => change("frequencyMhz", Number(value)) }),
    createSlider({ label: "偏壓振幅", min: 50, max: 1000, value: state.biasV, step: 10, unit: "V", onInput: (value) => change("biasV", value) }),
    createSlider({ label: "壓力", min: 1, max: 100, value: state.pressureMtorr, step: 1, unit: "mTorr", onInput: (value) => change("pressureMtorr", value) }),
    createSelect({ label: "離子", options: Object.entries(iedfIons).map(([value, item]) => ({ value, label: item.label })), value: state.ion, onChange: (value) => change("ion", value) }),
    panel
  );
  component.render();
  return component;
}

function drawSheath(ctx, state, model) {
  const theme = state.theme;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const phase = state.elapsed / 1000 * state.frequencyMhz * Math.PI * 2;
  const normalizedVoltage = 0.72 + 0.28 * Math.sin(phase);
  const sheathTop = 48 + (1 - normalizedVoltage) * 34;
  ctx.fillStyle = colorWithAlpha(theme.primary, 0.12);
  ctx.fillRect(48, sheathTop, 624, 178 - sheathTop);
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(48, sheathTop);
  ctx.lineTo(672, sheathTop);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = theme.border;
  ctx.fillRect(48, 178, 624, 24);
  ctx.fillStyle = theme.text;
  ctx.font = "700 13px system-ui";
  ctx.fillText(`RF 鞘層 ${Math.round(state.biasV * normalizedVoltage)} V`, 58, 28);
  ctx.fillText("晶圓電極", 602, 224);

  const ions = 26;
  for (let index = 0; index < ions; index += 1) {
    const progress = (state.elapsed / (850 + 30 * index) + index / ions) % 1;
    const x = 72 + ((index * 97) % 570);
    const curved = Math.sin(index * 1.7 + progress * Math.PI) * (model.lowEnergyFraction * 30);
    const y = sheathTop + progress ** 1.5 * (178 - sheathTop);
    ctx.fillStyle = progress > 0.75 ? theme.ion : theme.primary;
    ctx.globalAlpha = 0.55 + progress * 0.4;
    ctx.beginPath();
    ctx.arc(x + curved, y, 2.8 + progress, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.muted;
  ctx.font = "12px system-ui";
  ctx.fillText(`λcx ≈ ${model.meanFreePathMm.toFixed(2)} mm`, 58, 224);
  ctx.fillText(state.pressureMtorr >= 40 ? "電荷交換：低能離子增加" : "低碰撞：保留 RF 相位資訊", 250, 224);
}

function drawHistogram(svg, model) {
  clearSvg(svg);
  const plot = { x: 58, y: 30, width: 620, height: 160 };
  const maxEnergy = Math.max(...model.histogram.map((item) => item.energyEv));
  const maxCount = Math.max(...model.histogram.map((item) => item.count), 1);
  const xScale = linearScale(0, maxEnergy, plot.x, plot.x + plot.width);
  const yScale = linearScale(0, maxCount, plot.y + plot.height, plot.y);
  drawAxes(svg, {
    ...plot,
    xLabel: "離子能量 (eV)",
    yLabel: "計數",
    xTicks: [0, 0.25, 0.5, 0.75, 1].map((fraction) => ({ x: xScale(maxEnergy * fraction), label: Math.round(maxEnergy * fraction).toString() })),
    yTicks: []
  });
  const barWidth = plot.width / model.histogram.length - 1;
  for (const item of model.histogram) {
    const height = plot.y + plot.height - yScale(item.count);
    svg.append(createSvg("rect", { x: xScale(item.energyEv) - barWidth / 2, y: yScale(item.count), width: Math.max(1, barWidth), height, class: item.energyEv < model.meanEnergyEv * 0.55 ? "iedf-bar tail" : "iedf-bar" }));
  }
  const meanX = xScale(model.meanEnergyEv);
  svg.append(createSvg("line", { x1: meanX, y1: plot.y, x2: meanX, y2: plot.y + plot.height, class: "iedf-mean" }));
  const label = createSvg("text", { x: meanX + 5, y: plot.y + 14, class: "iedf-label" });
  label.textContent = `平均 ${model.meanEnergyEv.toFixed(0)} eV`;
  svg.append(label);
}

function updatePanel(panel, model) {
  const values = {
    "平均能量": `${model.meanEnergyEv.toFixed(1)} eV`,
    "峰間距 ΔE": `${model.peakSeparationEv.toFixed(1)} eV`,
    "低能尾巴": `${(model.lowEnergyFraction * 100).toFixed(0)}%`,
    "平均自由徑": `${model.meanFreePathMm.toFixed(2)} mm`
  };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}

function updateStatus(status, model) {
  const frequencyState = model.frequencyMhz <= 2 ? "低頻：離子保留進入相位，形成寬雙峰" : model.frequencyMhz >= 60 ? "高頻：離子平均多個 RF 週期，接近窄單峰" : "中頻：仍可看見有限峰間距";
  const collisionState = model.lowEnergyFraction >= 0.2 ? "；鞘層內電荷交換形成明顯低能尾巴" : "；鞘層碰撞較少";
  status.textContent = `${iedfIons[model.ion].label}：${frequencyState}${collisionState}。平均能量相同不代表分佈形狀相同。`;
}

function colorWithAlpha(color, alpha) {
  if (/^#([0-9a-f]{6})$/i.test(color)) return `${color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
  return color;
}
