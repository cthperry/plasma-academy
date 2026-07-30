import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createSlider, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { boschCycleAt, evaluateBoschProcess } from "../bosch-model.js";

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const ctx = canvas.getContext("2d");
  const state = { depositionSeconds: 3, etchSeconds: 7, biasW: 220, cycles: 40, elapsed: 0, lastTime: 0, theme: readCanvasTheme() };
  const panel = createValuePanel([
    ["總深度", "—"], ["Scallop 深度", "—"], ["有效蝕刻率", "—"], ["側壁角", "—"], ["循環狀態", "—"]
  ]);

  const instance = {
    update(time = 0) {
      const delta = Math.min(50, time - state.lastTime || 16);
      state.lastTime = time;
      state.elapsed += delta / 1000;
    },
    render() {
      const result = evaluateBoschProcess(state);
      const phase = boschCycleAt(state.elapsed, state);
      drawBosch(ctx, state, result, phase);
      updatePanel(panel, result, phase);
      const messages = {
        "bosch-window": "沉積保護側壁、bias 清底、SF₆ 向下推進；每循環留下一個 scallop。",
        isotropic: "沉積步已關閉：SF₆ 同時側蝕，輪廓轉成等向。",
        "bottom-stop": "Bias 太低：溝底聚合物清不開，蝕刻趨近停止。",
        undercut: "側壁鈍化不足：SF₆ 化學側蝕開始主導。"
      };
      status.textContent = `${messages[result.regime]} Scallop ${result.scallopDepthUm.toFixed(3)} µm，有效速率 ${result.effectiveRateUmMin.toFixed(2)} µm/min。`;
    },
    reset() {},
    applyTheme(theme) { state.theme = theme; this.render(); },
    destroy() { unwatch(); }
  };
  const component = createLifecycle(instance);
  const unwatch = watchTheme(component);
  const change = (key, value) => { state[key] = value; component.render(); };
  controls.replaceChildren(
    createSlider({ label: "C₄F₈ 沉積時間", min: 0, max: 10, value: state.depositionSeconds, step: 0.5, unit: "s", onInput: (value) => change("depositionSeconds", value) }),
    createSlider({ label: "SF₆ 蝕刻時間", min: 1, max: 15, value: state.etchSeconds, step: 0.5, unit: "s", onInput: (value) => change("etchSeconds", value) }),
    createSlider({ label: "清底 Bias", min: 0, max: 500, value: state.biasW, step: 10, unit: "W", onInput: (value) => change("biasW", value) }),
    createSlider({ label: "循環數", min: 1, max: 120, value: state.cycles, step: 1, unit: "cycles", onInput: (value) => change("cycles", value) }),
    panel
  );
  component.render();
  return component;
}

function drawBosch(ctx, state, result, phase) {
  const { theme } = state;
  ctx.clearRect(0, 0, 720, 360);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, 720, 360);
  drawTimeline(ctx, theme, state, phase);

  const center = 360;
  const top = 76;
  const maxDepth = 245;
  const depth = Math.max(16, Math.min(maxDepth, result.totalDepthUm / 45 * maxDepth));
  const opening = 152;
  ctx.fillStyle = "#7f8da3";
  ctx.fillRect(58, top, 604, 260);
  ctx.fillStyle = "#d5b34b";
  ctx.fillRect(58, top - 20, 226, 24);
  ctx.fillRect(436, top - 20, 226, 24);

  ctx.fillStyle = theme.bg;
  ctx.beginPath();
  ctx.moveTo(center - opening / 2, top);
  if (result.regime === "isotropic") {
    const spread = Math.min(78, depth * 0.32);
    ctx.bezierCurveTo(center - opening / 2 - spread, top + depth * 0.25, center - opening / 2 - spread * 0.65, top + depth * 0.7, center - opening / 2 - 16, top + depth);
  } else {
    drawScallopedSide(ctx, center - opening / 2, top, depth, -1, result);
  }
  ctx.lineTo(center + opening / 2 + (result.regime === "isotropic" ? 16 : 0), top + depth);
  if (result.regime === "isotropic") {
    const spread = Math.min(78, depth * 0.32);
    ctx.bezierCurveTo(center + opening / 2 + spread * 0.65, top + depth * 0.7, center + opening / 2 + spread, top + depth * 0.25, center + opening / 2, top);
  } else {
    drawScallopedSide(ctx, center + opening / 2, top + depth, depth, 1, result, true);
  }
  ctx.closePath();
  ctx.fill();

  if (state.depositionSeconds > 0) {
    ctx.strokeStyle = theme.electron;
    ctx.lineWidth = 3 + result.passivation * 7;
    ctx.globalAlpha = phase.phase === "passivation" ? 0.95 : 0.55;
    ctx.beginPath(); ctx.moveTo(center - opening / 2 + 4, top + 4); ctx.lineTo(center - opening / 2 + 4, top + depth - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(center + opening / 2 - 4, top + 4); ctx.lineTo(center + opening / 2 - 4, top + depth - 4); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  drawSpecies(ctx, state, phase, center, opening, top, depth);
  ctx.fillStyle = theme.text;
  ctx.font = "700 14px system-ui";
  ctx.fillText(`${result.cycles} cycles · ${result.totalDepthUm.toFixed(1)} µm`, 62, 344);
  ctx.textAlign = "right";
  ctx.fillText(result.regime === "isotropic" ? "等向側蝕" : `Scallop ${result.scallopDepthUm.toFixed(3)} µm`, 658, 344);
  ctx.textAlign = "start";
}

function drawScallopedSide(ctx, x, top, depth, direction, result, reverse = false) {
  const count = Math.max(4, Math.min(18, Math.round(result.cycles / 5)));
  const amplitude = Math.min(18, 2 + result.scallopDepthUm * 85);
  if (!reverse) {
    for (let index = 1; index <= count; index += 1) {
      const y = top + depth * index / count;
      ctx.quadraticCurveTo(x + direction * amplitude, y - depth / count / 2, x, y);
    }
    return;
  }
  for (let index = count - 1; index >= 0; index -= 1) {
    const y = top + depth * index / count;
    ctx.quadraticCurveTo(x + direction * amplitude, y + depth / count / 2, x, y);
  }
}

function drawTimeline(ctx, theme, state, phase) {
  const items = [
    ["passivation", "1 C₄F₈ 沉積", state.depositionSeconds],
    ["purge", "2 Purge", 0.8],
    ["etch", "3 SF₆ 蝕刻", state.etchSeconds]
  ];
  let x = 60;
  const total = items.reduce((sum, item) => sum + item[2], 0) || 1;
  for (const [key, label, duration] of items) {
    const width = Math.max(64, 590 * duration / total);
    ctx.fillStyle = phase.phase === key ? theme.primary : theme.border;
    ctx.fillRect(x, 16, width - 5, 28);
    ctx.fillStyle = phase.phase === key ? theme.bg : theme.text;
    ctx.font = "700 11px system-ui";
    ctx.fillText(label, x + 7, 35);
    x += width;
  }
}

function drawSpecies(ctx, state, phase, center, opening, top, depth) {
  const color = phase.phase === "passivation" ? state.theme.electron : phase.phase === "etch" ? state.theme.primary : state.theme.muted;
  const offset = (state.elapsed * 32) % 58;
  ctx.fillStyle = color;
  for (let index = 0; index < 11; index += 1) {
    const x = center - opening * 0.42 + index * opening * 0.084;
    const y = 52 + (offset + index * 13) % Math.max(30, depth - 8);
    ctx.beginPath(); ctx.arc(x, Math.min(top + depth - 6, y), phase.phase === "purge" ? 2 : 3, 0, Math.PI * 2); ctx.fill();
  }
}

function updatePanel(panel, result, phase) {
  const phaseLabels = { passivation: "C₄F₈ 沉積", purge: "Purge", etch: "SF₆ 蝕刻" };
  const values = {
    "總深度": `${result.totalDepthUm.toFixed(1)} µm`,
    "Scallop 深度": `${result.scallopDepthUm.toFixed(3)} µm`,
    "有效蝕刻率": `${result.effectiveRateUmMin.toFixed(2)} µm/min`,
    "側壁角": `${result.sidewallAngleDeg.toFixed(1)}°`,
    "循環狀態": phaseLabels[phase.phase]
  };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}
