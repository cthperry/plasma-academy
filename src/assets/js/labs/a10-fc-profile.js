import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createSegmentedControl, createSelect, createSlider, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { fluorocarbonGases, fluorocarbonProfile } from "../plasma-model.js";

const WIDTH = 720;
const HEIGHT = 360;

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const ctx = canvas.getContext("2d");
  const state = { gas: "C4F8", oxygenPercent: 8, hydrogenPercent: 0, biasW: 250, substrate: "SiO2", elapsed: 0, lastTime: 0, theme: readCanvasTheme() };
  const panel = createValuePanel([["有效 F/C", "—"], ["溝底淨速率", "—"], ["側壁聚合", "—"], ["對遮罩選擇比", "—"]]);
  const scale = document.createElement("div");
  scale.className = "fc-lab-axis";

  const instance = {
    update(time = 0) {
      const delta = Math.min(50, time - state.lastTime || 16);
      state.lastTime = time;
      state.elapsed += delta;
    },
    render() {
      const metrics = fluorocarbonProfile(state);
      draw(ctx, state, metrics);
      renderScale(scale, metrics.effectiveFc);
      updatePanel(panel, metrics);
      const labels = { isotropic: "高 F/C：等向蝕刻與 undercut", "process-window": "中 F/C：垂直側壁製程窗", "etch-stop": "低 F/C／低 bias：聚合物淨沉積，etch stop" };
      status.textContent = `${labels[metrics.regime]}。${state.substrate === "Si" ? "Si 表面缺少氧輔助，淨速率明顯較低。" : "SiO2 的表面氧與離子轟擊共同清除溝底聚合物。"}`;
    },
    reset() {},
    applyTheme(theme) { state.theme = theme; this.render(); },
    destroy() { unwatch(); }
  };
  const component = createLifecycle(instance);
  const unwatch = watchTheme(component);
  controls.replaceChildren(
    scale,
    createSelect({ label: "主氣體", options: Object.entries(fluorocarbonGases).map(([value, item]) => ({ value, label: `${item.label} (F/C ${item.fcRatio})` })), value: state.gas, onChange: (value) => { state.gas = value; component.render(); } }),
    createSegmentedControl({ label: "下層材料", options: [{ value: "SiO2", label: "SiO₂" }, { value: "Si", label: "Si" }], value: state.substrate, onChange: (value) => { state.substrate = value; component.render(); } }),
    createSlider({ label: "O₂ 添加量", min: 0, max: 20, value: state.oxygenPercent, step: 1, unit: "%", onInput: (value) => { state.oxygenPercent = value; component.render(); } }),
    createSlider({ label: "H₂ 添加量", min: 0, max: 20, value: state.hydrogenPercent, step: 1, unit: "%", onInput: (value) => { state.hydrogenPercent = value; component.render(); } }),
    createSlider({ label: "Bias 功率", min: 0, max: 500, value: state.biasW, step: 10, unit: "W", onInput: (value) => { state.biasW = value; component.render(); } }),
    panel
  );
  component.render();
  return component;
}

function updatePanel(panel, metrics) {
  const values = {
    "有效 F/C": metrics.effectiveFc.toFixed(2),
    "溝底淨速率": `${metrics.bottomNetRate.toFixed(0)} a.u.`,
    "側壁聚合": `${metrics.sidewallPolymer.toFixed(0)} a.u.`,
    "對遮罩選擇比": `${metrics.selectivityToMask.toFixed(1)} : 1`
  };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}

function renderScale(element, effectiveFc) {
  const gases = Object.values(fluorocarbonGases).sort((a, b) => a.fcRatio - b.fcRatio);
  element.innerHTML = `<strong>F/C 標尺</strong><div class="fc-lab-track"><i style="left:${((effectiveFc - 0.5) / 4) * 100}%" title="有效 F/C ${effectiveFc.toFixed(2)}"></i>${gases.map((gas) => `<span style="left:${((gas.fcRatio - 0.5) / 4) * 100}%"><b>${gas.label}</b><small>${gas.fcRatio}</small></span>`).join("")}</div>`;
}

function draw(ctx, state, metrics) {
  const { theme } = state;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawIncoming(ctx, state, theme);

  const top = 92;
  ctx.fillStyle = "#7f8da3";
  ctx.fillRect(70, top, 580, 230);
  ctx.fillStyle = "#d5b34b";
  ctx.fillRect(70, top - 20, 190, 28);
  ctx.fillRect(460, top - 20, 190, 28);

  const depth = metrics.regime === "etch-stop" ? 34 : Math.min(185, 55 + metrics.bottomNetRate * 0.85);
  let topHalf = 100;
  let bottomHalf = 94;
  if (metrics.regime === "isotropic") { topHalf = 125; bottomHalf = 92; }
  if (metrics.regime === "etch-stop") { topHalf = 92; bottomHalf = 88; }
  const center = 360;
  ctx.fillStyle = theme.bg;
  ctx.beginPath();
  ctx.moveTo(center - topHalf, top + 7);
  ctx.lineTo(center - bottomHalf, top + depth);
  ctx.lineTo(center + bottomHalf, top + depth);
  ctx.lineTo(center + topHalf, top + 7);
  ctx.closePath();
  ctx.fill();

  const polymer = Math.min(16, 3 + metrics.sidewallPolymer * 0.16);
  ctx.strokeStyle = theme.electron;
  ctx.lineWidth = polymer;
  ctx.globalAlpha = 0.72;
  ctx.beginPath();
  ctx.moveTo(center - topHalf + 4, top + 10);
  ctx.lineTo(center - bottomHalf + 4, top + depth - 3);
  ctx.moveTo(center + topHalf - 4, top + 10);
  ctx.lineTo(center + bottomHalf - 4, top + depth - 3);
  ctx.stroke();
  if (metrics.regime === "etch-stop") {
    ctx.lineWidth = Math.max(6, polymer);
    ctx.beginPath();
    ctx.moveTo(center - bottomHalf, top + depth - 4);
    ctx.lineTo(center + bottomHalf, top + depth - 4);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  label(ctx, theme, 275, 52, `溝底 ${metrics.bottomNetRate.toFixed(0)} a.u.`);
  label(ctx, theme, 84, 218, `側壁聚合 ${metrics.sidewallPolymer.toFixed(0)}`);
  label(ctx, theme, 486, 52, `遮罩消耗 ${metrics.maskRate.toFixed(0)}`);
  ctx.fillStyle = theme.muted;
  ctx.font = "13px system-ui";
  ctx.fillText(state.substrate === "SiO2" ? "SiO₂ 下層" : "Si 下層", 78, 346);
  ctx.fillText(metrics.regime === "isotropic" ? "undercut" : metrics.regime === "etch-stop" ? "etch stop" : "垂直製程窗", 570, 346);
}

function drawIncoming(ctx, state, theme) {
  const motion = (state.elapsed / 18) % 40;
  for (let index = 0; index < 15; index += 1) {
    const x = 115 + index * 34;
    const y = 15 + (index * 17 + motion) % 54;
    ctx.fillStyle = index % 3 === 0 ? theme.ion : theme.primary;
    ctx.beginPath();
    ctx.arc(x, y, index % 3 === 0 ? 3.2 : 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function label(ctx, theme, x, y, text) {
  ctx.fillStyle = theme.text;
  ctx.font = "700 13px system-ui";
  ctx.fillText(text, x, y);
}
