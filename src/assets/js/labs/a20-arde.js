import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createSegmentedControl, createSlider, createToggle, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { ardeMechanisms, evaluateArdeProcess } from "../arde-model.js";

export function init(container) {
  const originalCanvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const visual = document.createElement("div");
  visual.className = "arde-visual";
  visual.innerHTML = `<canvas width="720" height="390" aria-label="五種 CD 溝槽同步蝕刻動畫"></canvas><svg viewBox="0 0 720 260" role="img" aria-label="蝕刻深度對深寬比曲線"></svg>`;
  originalCanvas.replaceWith(visual);
  container.querySelector(".lab-stage").classList.add("lab-stage--arde");
  const canvas = visual.querySelector("canvas");
  const svg = visual.querySelector("svg");
  const ctx = canvas.getContext("2d");
  const state = {
    pressureMtorr: 30, angleSpreadDeg: 5, sticking: 0.2, timeSeconds: 240, inverse: false,
    mechanisms: Object.fromEntries(ardeMechanisms.map(({ key }) => [key, true])),
    elapsed: 0, lastTime: 0, theme: readCanvasTheme()
  };
  const panel = createValuePanel([["模式", "—"], ["窄溝深度", "—"], ["寬溝深度", "—"], ["RIE lag", "—"], ["速率差", "—"], ["窄／寬孔底鈍化", "—"]]);

  const instance = {
    update(time = 0) {
      const delta = Math.min(50, time - state.lastTime || 16);
      state.lastTime = time;
      state.elapsed += delta;
    },
    render() {
      const result = evaluateArdeProcess(state);
      drawTrenches(ctx, state, result);
      drawCurve(svg, result);
      updatePanel(panel, result);
      const direction = result.lagPercent < 0 ? `窄溝比寬溝深 ${Math.abs(result.lagPercent).toFixed(1)}%` : `窄溝比寬溝淺 ${result.lagPercent.toFixed(1)}%`;
      const polymerNote = state.inverse ? `孔底聚合物覆蓋 ${result.trenches[0].bottomPolymerCoverage.toFixed(2)}／${result.trenches.at(-1).bottomPolymerCoverage.toFixed(2)}。` : "";
      status.textContent = `${result.classification}；${direction}。${polymerNote}此模型用於比較機制方向，不能直接換算量產 recipe。`;
    },
    reset() {},
    applyTheme(theme) { state.theme = theme; this.render(); },
    destroy() { unwatch(); }
  };
  const component = createLifecycle(instance);
  const unwatch = watchTheme(component);
  const change = (key, value) => { state[key] = value; component.render(); };

  controls.replaceChildren(
    createSegmentedControl({
      label: "效應模式",
      options: [{ value: "normal", label: "一般 ARDE" }, { value: "inverse", label: "反向 ARDE" }],
      value: "normal",
      onChange: (value) => change("inverse", value === "inverse")
    }),
    createSlider({ label: "壓力", min: 5, max: 200, value: state.pressureMtorr, step: 5, unit: "mTorr", onInput: (value) => change("pressureMtorr", value) }),
    createSlider({ label: "離子角度發散", min: 0, max: 15, value: state.angleSpreadDeg, step: 1, unit: "°", onInput: (value) => change("angleSpreadDeg", value) }),
    createSlider({ label: "自由基／前驅物黏著係數", min: 0.01, max: 1, value: state.sticking, step: 0.01, formatValue: (value) => value.toFixed(2), onInput: (value) => change("sticking", value) }),
    createSlider({ label: "蝕刻時間", min: 30, max: 900, value: state.timeSeconds, step: 10, unit: "s", onInput: (value) => change("timeSeconds", value) }),
    ...ardeMechanisms.map(({ key, label }) => createToggle({
      label, checked: true, onChange: (checked) => { state.mechanisms[key] = checked; component.render(); }
    })),
    panel
  );
  component.render();
  return component;
}

function drawTrenches(ctx, state, result) {
  const { theme } = state;
  ctx.clearRect(0, 0, 720, 390);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, 720, 390);
  ctx.fillStyle = "#7f8da3";
  ctx.fillRect(18, 68, 684, 280);
  ctx.fillStyle = "#52657d";
  ctx.fillRect(18, 348, 684, 24);
  const centers = [85, 220, 360, 505, 650];
  result.trenches.forEach((item, index) => {
    const width = 26 + item.cdUm / 2 * 68;
    const depth = Math.min(260, item.depthUm / 5.2 * 260);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(centers[index] - width / 2, 68, width, depth);
    const polymer = item.bottomPolymerCoverage;
    ctx.fillStyle = theme.electron;
    ctx.globalAlpha = 0.18 + polymer * 0.55;
    ctx.fillRect(centers[index] - width / 2, 68, Math.max(2, width * 0.08), depth);
    ctx.fillRect(centers[index] + width / 2 - Math.max(2, width * 0.08), 68, Math.max(2, width * 0.08), depth);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#d5b34b";
    ctx.fillRect(centers[index] - 58, 46, 58 - width / 2, 25);
    ctx.fillRect(centers[index] + width / 2, 46, 58 - width / 2, 25);
    ctx.fillStyle = theme.text;
    ctx.font = "700 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`CD ${item.cdUm.toFixed(1)} µm`, centers[index], 24);
    ctx.fillText(`${item.depthUm.toFixed(2)} µm`, centers[index], 386);
  });
  const y = 54 + state.elapsed / 18 % 250;
  ctx.strokeStyle = theme.ion;
  ctx.globalAlpha = 0.65;
  for (const center of centers) {
    ctx.beginPath(); ctx.moveTo(center, Math.min(330, y)); ctx.lineTo(center + state.angleSpreadDeg * 0.18, Math.min(344, y + 14)); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "start";
}

function drawCurve(svg, result) {
  const values = result.trenches.map((item) => ({ x: item.aspectRatio, y: item.depthUm }));
  const maxX = Math.max(...values.map((item) => item.x), 1);
  const maxY = Math.max(...values.map((item) => item.y), 1);
  const points = values.map((item) => `${66 + item.x / maxX * 612},${220 - item.y / maxY * 172}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((value) => `<line class="arde-grid" x1="66" y1="${220 - value * 172}" x2="678" y2="${220 - value * 172}"></line><text class="arde-label" x="58" y="${224 - value * 172}" text-anchor="end">${(maxY * value).toFixed(1)}</text>`).join("");
  const dots = values.map((item) => `<circle class="arde-point" cx="${66 + item.x / maxX * 612}" cy="${220 - item.y / maxY * 172}" r="5"></circle>`).join("");
  svg.innerHTML = `${ticks}<line class="arde-axis" x1="66" y1="220" x2="686" y2="220"></line><line class="arde-axis" x1="66" y1="40" x2="66" y2="220"></line><polyline class="arde-line" points="${points}"></polyline>${dots}<text class="arde-label" x="360" y="250" text-anchor="middle">最終深寬比</text><text class="arde-label" x="14" y="26">深度 µm</text>`;
}

function updatePanel(panel, result) {
  const values = {
    "模式": result.classification,
    "窄溝深度": `${result.trenches[0].depthUm.toFixed(2)} µm`,
    "寬溝深度": `${result.trenches.at(-1).depthUm.toFixed(2)} µm`,
    "RIE lag": `${result.lagPercent.toFixed(1)}%`,
    "速率差": `${result.spreadPercent.toFixed(1)}%`,
    "窄／寬孔底鈍化": `${result.trenches[0].bottomPolymerCoverage.toFixed(2)} / ${result.trenches.at(-1).bottomPolymerCoverage.toFixed(2)}`
  };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}
