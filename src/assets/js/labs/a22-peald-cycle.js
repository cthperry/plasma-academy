import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createSegmentedControl, createSlider, createValuePanel } from "../controls.js";
import { evaluatePealdCycle } from "../deposition-model.js";
import { createLifecycle } from "../lifecycle.js";

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  canvas.width = 720; canvas.height = 430;
  canvas.setAttribute("aria-label", "PEALD 四步循環與高深寬比階梯覆蓋率動畫");
  const ctx = canvas.getContext("2d");
  const state = { mode: "peald", cycles: 100, pulseSeconds: 8, purgeSeconds: 6, aspectRatio: 6, elapsed: 0, lastTime: 0, theme: readCanvasTheme() };
  const panel = createValuePanel([["製程判定", "—"], ["頂部厚度", "—"], ["側壁厚度", "—"], ["底部厚度", "—"], ["階梯覆蓋率", "—"], ["GPC", "—"]]);
  const instance = {
    update(time = 0) { const delta = Math.min(50, time - state.lastTime || 16); state.lastTime = time; state.elapsed += delta; },
    render() {
      const result = evaluatePealdCycle(state);
      drawPeald(ctx, state, result);
      updatePanel(panel, result);
      status.textContent = `${result.classification}；覆蓋率 ${result.stepCoveragePercent.toFixed(1)}%，GPC ${result.growthPerCycleNm.toFixed(3)} nm/cycle。模型比較自限制與傳輸趨勢，不代表特定前驅物 recipe。`;
    },
    reset() {},
    applyTheme(theme) { state.theme = theme; this.render(); },
    destroy() { unwatch(); }
  };
  const component = createLifecycle(instance);
  const unwatch = watchTheme(component);
  const change = (key, value) => { state[key] = value; component.render(); };
  controls.replaceChildren(
    createSegmentedControl({ label: "沉積模式", options: [{ value: "peald", label: "PEALD" }, { value: "pecvd", label: "PECVD 對照" }], value: state.mode, onChange: (value) => change("mode", value) }),
    createSlider({ label: "循環數", min: 1, max: 500, value: state.cycles, step: 1, unit: "cycles", onInput: (value) => change("cycles", value) }),
    createSlider({ label: "前驅物脈衝", min: 0.1, max: 20, value: state.pulseSeconds, step: 0.1, unit: "s", onInput: (value) => change("pulseSeconds", value) }),
    createSlider({ label: "Purge 時間", min: 0, max: 20, value: state.purgeSeconds, step: 0.1, unit: "s", onInput: (value) => change("purgeSeconds", value) }),
    createSlider({ label: "深寬比", min: 1, max: 20, value: state.aspectRatio, step: 1, onInput: (value) => change("aspectRatio", value) }),
    panel
  );
  component.render();
  return component;
}

function drawPeald(ctx, state, result) {
  const { theme } = state;
  ctx.clearRect(0, 0, 720, 430); ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, 720, 430);
  const phase = state.mode === "pecvd" ? 0 : Math.floor(state.elapsed / 950) % 4;
  const labels = ["1 前驅物吸附", "2 Purge", "3 電漿反應", "4 Purge"];
  labels.forEach((label, index) => {
    ctx.fillStyle = index === phase ? theme.primary : theme.muted;
    ctx.fillRect(20 + index * 170, 22, 152, 30);
    ctx.fillStyle = index === phase ? theme.bg : theme.text;
    ctx.font = "700 12px system-ui"; ctx.textAlign = "center"; ctx.fillText(label, 96 + index * 170, 42);
  });
  const left = 250, right = 470, top = 92, bottom = 386;
  ctx.fillStyle = "#7f8da3"; ctx.fillRect(40, top, 640, bottom - top);
  ctx.fillStyle = theme.bg; ctx.fillRect(left, top, right - left, bottom - top);
  const topThickness = Math.min(26, result.topThicknessNm * 1.4);
  const sideThickness = Math.min(24, result.sideThicknessNm * 1.4);
  const bottomThickness = Math.min(25, result.bottomThicknessNm * 1.4);
  ctx.fillStyle = theme.electron;
  ctx.fillRect(40, top, left - 40, topThickness); ctx.fillRect(right, top, 680 - right, topThickness);
  ctx.fillRect(left, top, sideThickness, bottom - top); ctx.fillRect(right - sideThickness, top, sideThickness, bottom - top);
  ctx.fillRect(left, bottom - bottomThickness, right - left, bottomThickness);
  if (result.cvdFractionPercent > 18 || state.mode === "pecvd") {
    ctx.fillStyle = theme.warning || "#c57d00";
    const cusp = Math.min(76, (100 - result.stepCoveragePercent) * 0.7);
    ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left + cusp, top + cusp); ctx.lineTo(left, top + cusp); ctx.fill();
    ctx.beginPath(); ctx.moveTo(right, top); ctx.lineTo(right - cusp, top + cusp); ctx.lineTo(right, top + cusp); ctx.fill();
  }
  drawSpecies(ctx, state, phase, left, right, top, theme);
  ctx.fillStyle = theme.text; ctx.font = "700 14px system-ui"; ctx.textAlign = "left";
  ctx.fillText(result.classification, 42, 414);
}

function drawSpecies(ctx, state, phase, left, right, top, theme) {
  const offset = state.elapsed / 12 % 75;
  for (let index = 0; index < 11; index += 1) {
    const x = left + 18 + index * (right - left - 36) / 10;
    const y = 60 + (offset + index * 17) % 170;
    ctx.fillStyle = phase === 2 ? theme.ion : theme.primary;
    ctx.beginPath(); ctx.arc(x, Math.max(top - 24, y), phase === 2 ? 4 : 3, 0, Math.PI * 2); ctx.fill();
  }
}

function updatePanel(panel, result) {
  const values = { "製程判定": result.classification, "頂部厚度": `${result.topThicknessNm.toFixed(2)} nm`, "側壁厚度": `${result.sideThicknessNm.toFixed(2)} nm`, "底部厚度": `${result.bottomThicknessNm.toFixed(2)} nm`, "階梯覆蓋率": `${result.stepCoveragePercent.toFixed(1)}%`, "GPC": `${result.growthPerCycleNm.toFixed(3)} nm` };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}
