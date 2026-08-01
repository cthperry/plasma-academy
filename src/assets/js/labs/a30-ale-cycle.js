import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createButton, createSlider, createValuePanel } from "../controls.js";
import { calculateAleSynergy, generateAleRun, aleControlRanges } from "../ale-model.js";
import { createLifecycle } from "../lifecycle.js";

const animationDurationSeconds = 4;
const defaults = Object.freeze({
  ionEnergyEv: 40,
  modificationTimeS: 1.2,
  purgeTimeS: 1,
  cycles: 20
});

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const ctx = canvas.getContext("2d");
  const state = { ...defaults, playing: false, playheadSeconds: animationDurationSeconds, lastFrameTime: null, theme: readCanvasTheme() };
  let component;
  let playButton;
  let unwatch = () => {};
  let resizeObserver;
  let observedWidth = 0;

  canvas.width = 720;
  canvas.height = 430;
  canvas.setAttribute("aria-label", "原子層蝕刻四步循環、離子能量窗、每循環蝕刻量與累積蝕刻深度");

  const panel = createValuePanel([
    ["製程區域", "—"], ["EPC", "—"], ["累積移除", "—"], ["改質覆蓋", "—"],
    ["Purge 完整度", "—"], ["α 化學貢獻", "—"], ["β 離子貢獻", "—"], ["協同度", "—"]
  ]);

  const instance = {
    reduceMotion() {
      state.playing = false;
      state.playheadSeconds = animationDurationSeconds;
      state.lastFrameTime = null;
      if (playButton) playButton.textContent = "播放";
    },
    update(time) {
      if (!state.playing) return false;
      if (state.lastFrameTime == null) {
        state.lastFrameTime = time;
        return true;
      }
      state.playheadSeconds += Math.min(0.1, (time - state.lastFrameTime) / 1000);
      state.lastFrameTime = time;
      if (state.playheadSeconds >= animationDurationSeconds) {
        state.playheadSeconds = animationDurationSeconds;
        state.playing = false;
        playButton.textContent = "播放";
        component.render();
        return false;
      }
      return true;
    },
    render() {
      const run = generateAleRun(state);
      const synergy = calculateAleSynergy(state);
      const playhead = Number.isFinite(state.playheadSeconds) ? state.playheadSeconds : animationDurationSeconds;
      drawAleCycle(ctx, state, run, synergy, playhead);
      updatePanel(panel, run, synergy);
      const regime = regimeInfo(run.cycle.regime);
      canvas.dataset.renderState = "complete";
      canvas.dataset.playhead = playhead.toFixed(2);
      canvas.dataset.regime = run.cycle.regime;
      canvas.dataset.synergy = synergy.synergyPercent.toFixed(2);
      canvas.dataset.numericSignature = [state.ionEnergyEv, run.cycle.epcNm, run.totalEtchNm, synergy.synergyPercent].map((value) => Number(value).toFixed(5)).join("|");
      canvas.dataset.themeBg = state.theme.bg;
      status.dataset.regime = run.cycle.regime;
      status.textContent = `${state.playing ? `播放至第 ${phaseIndex(playhead) + 1} 步；` : ""}${regime.message}${stabilityMessage(run)}。教學邊界：低能 EPC 近零；高能進入 continuous sputter；短改質使 EPC 不穩定；短 Purge 會形成記憶效應。EPC 與累積移除量僅顯示本教學模型的相對趨勢，不代表特定材料、腔體或核准 recipe。`;
    },
    reset() {
      Object.assign(state, defaults, { playing: false, playheadSeconds: animationDurationSeconds, lastFrameTime: null });
      mountControls();
    },
    applyTheme(theme) {
      state.theme = theme;
      this.render();
    },
    destroy() {
      unwatch();
      resizeObserver?.disconnect();
    }
  };

  component = createLifecycle(instance);
  unwatch = watchTheme(component);

  function change(key, value) {
    state[key] = value;
    state.playing = false;
    state.playheadSeconds = animationDurationSeconds;
    state.lastFrameTime = null;
    if (playButton) playButton.textContent = "播放";
    component.render();
  }

  function mountControls() {
    playButton = createButton("播放", () => {
      state.playing = !state.playing;
      if (state.playing) {
        if (state.playheadSeconds >= animationDurationSeconds) state.playheadSeconds = 0;
        state.lastFrameTime = null;
        playButton.textContent = "暫停";
        component.start();
      } else {
        playButton.textContent = "播放";
        component.stop();
        component.render();
      }
    });
    playButton.setAttribute("aria-label", "播放或暫停 A30 原子層蝕刻循環動畫");
    const reset = createButton("重設", () => component.reset());
    reset.setAttribute("aria-label", "重設 A30 原子層蝕刻參數");
    controls.replaceChildren(
      createSlider({ label: "離子能量", ...aleControlRanges.ionEnergyEv, step: 1, value: state.ionEnergyEv, unit: "eV", onInput: (value) => change("ionEnergyEv", value) }),
      createSlider({ label: "改質時間", ...aleControlRanges.modificationTimeS, step: 0.02, value: state.modificationTimeS, unit: "s", onInput: (value) => change("modificationTimeS", value) }),
      createSlider({ label: "Purge 時間", ...aleControlRanges.purgeTimeS, step: 0.02, value: state.purgeTimeS, unit: "s", onInput: (value) => change("purgeTimeS", value) }),
      createSlider({ label: "循環數", ...aleControlRanges.cycles, step: 1, value: state.cycles, unit: "cycles", onInput: (value) => change("cycles", value) }),
      playButton,
      reset,
      panel
    );
  }

  mountControls();
  component.render();
  observedWidth = canvas.getBoundingClientRect().width;
  resizeObserver = new ResizeObserver(([entry]) => {
    if (Math.abs(entry.contentRect.width - observedWidth) < 0.5) return;
    observedWidth = entry.contentRect.width;
    component.render();
  });
  resizeObserver.observe(canvas);
  return component;
}

function drawAleCycle(ctx, state, run, synergy, playhead) {
  const metrics = syncCanvasResolution(ctx.canvas);
  const { width, height, px, isMobile } = metrics;
  const theme = state.theme;
  const phase = phaseIndex(playhead);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  drawPhaseRail(ctx, metrics, theme, phase);
  drawSurface(ctx, metrics, theme, run, phase);
  drawEnergyWindow(ctx, metrics, theme, state.ionEnergyEv, run.cycle, isMobile);
  drawSynergy(ctx, metrics, theme, synergy, isMobile);
  drawEpcChart(ctx, metrics, theme, run, isMobile);
  drawCumulativeChart(ctx, metrics, theme, run, isMobile);
}

function drawPhaseRail(ctx, metrics, theme, phase) {
  const { px, isMobile } = metrics;
  const labels = isMobile ? ["改質", "Purge", "移除", "Purge"] : ["1 改質", "2 Purge", "3 離子移除", "4 Purge"];
  const left = px(18);
  const gap = px(6);
  const width = (ctx.canvas.width - left - px(18) - gap * 3) / 4;
  labels.forEach((label, index) => {
    const x = left + index * (width + gap);
    ctx.fillStyle = index === phase ? theme.primary : theme.surface;
    ctx.fillRect(x, px(18), width, px(32));
    ctx.strokeStyle = index === phase ? theme.primary : theme.border;
    ctx.strokeRect(x, px(18), width, px(32));
    ctx.fillStyle = index === phase ? theme.bg : theme.text;
    setFont(ctx, metrics, isMobile ? 10 : 11, 700);
    ctx.textAlign = "center";
    ctx.fillText(label, x + width / 2, px(39));
  });
  ctx.textAlign = "left";
}

function drawSurface(ctx, metrics, theme, run, phase) {
  const { px, isMobile } = metrics;
  const left = px(24);
  const right = px(344);
  const surfaceY = px(206);
  const modifiedHeight = px(9 + run.cycle.coverage * 17);
  const chamberTop = px(72);
  ctx.strokeStyle = theme.border;
  ctx.strokeRect(left, chamberTop, right - left, px(176));
  ctx.fillStyle = theme.text;
  setFont(ctx, metrics, isMobile ? 10 : 12, 700);
  ctx.fillText("ALE 反應面", left, px(68));

  ctx.fillStyle = theme.neutral;
  ctx.fillRect(left + px(12), surfaceY, right - left - px(24), px(30));
  if (!isMobile) {
    ctx.fillStyle = theme.muted;
    setFont(ctx, metrics, 10, 600);
    ctx.fillText("基板", left + px(20), surfaceY + px(20));
  }
  if (phase !== 3) {
    ctx.fillStyle = phase === 2 ? theme.warning : theme.primary;
    ctx.fillRect(left + px(12), surfaceY - modifiedHeight, right - left - px(24), modifiedHeight);
  }

  const count = phase === 1 || phase === 3 ? Math.max(1, Math.round((1 - run.cycle.purgeCompleteness) * 12)) : 11;
  for (let index = 0; index < count; index += 1) {
    const x = left + px(26 + (index * 37) % 268);
    const y = chamberTop + px(22 + (index * 31) % 92);
    if (phase === 2) {
      ctx.strokeStyle = theme.ion;
      ctx.lineWidth = px(1.5);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, surfaceY - modifiedHeight - px(4));
      ctx.stroke();
      ctx.fillStyle = theme.ion;
      ctx.beginPath();
      ctx.arc(x, y, px(3.5), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = phase === 0 ? theme.primary : theme.muted;
      ctx.beginPath();
      ctx.arc(x, y, px(3), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (!isMobile) {
    ctx.fillStyle = theme.muted;
    setFont(ctx, metrics, 10, 600);
    ctx.fillText(phase === 0 ? "表面改質與飽和" : phase === 1 ? "清除殘留反應物" : phase === 2 ? "受限離子移除" : "完成 purge，準備下一循環", left + px(12), px(242));
  }
}

function drawEnergyWindow(ctx, metrics, theme, energyEv, cycle, isMobile) {
  const { px } = metrics;
  const left = px(374);
  const right = ctx.canvas.width - px(18);
  const top = px(76);
  const barY = px(118);
  const barWidth = right - left;
  const x = (value) => left + value / 150 * barWidth;
  ctx.fillStyle = theme.text;
  setFont(ctx, metrics, isMobile ? 10 : 12, 700);
  ctx.fillText("離子能量窗", left, px(68));
  ctx.fillStyle = theme.surface;
  ctx.fillRect(left, barY, barWidth, px(22));
  ctx.fillStyle = theme.success;
  ctx.fillRect(x(cycle.state.removalThresholdEv + 5), barY, x(cycle.state.sputterThresholdEv) - x(cycle.state.removalThresholdEv + 5), px(22));
  ctx.fillStyle = theme.warning;
  ctx.fillRect(x(cycle.state.sputterThresholdEv), barY, right - x(cycle.state.sputterThresholdEv), px(22));
  ctx.strokeStyle = theme.border;
  ctx.strokeRect(left, barY, barWidth, px(22));
  ctx.strokeStyle = theme.danger;
  ctx.lineWidth = px(2);
  ctx.beginPath();
  ctx.moveTo(x(energyEv), barY - px(7));
  ctx.lineTo(x(energyEv), barY + px(30));
  ctx.stroke();
  ctx.fillStyle = theme.text;
  setFont(ctx, metrics, isMobile ? 9 : 10, 700);
  ctx.fillText(`${energyEv.toFixed(0)} eV`, Math.min(x(energyEv) + px(4), right - px(42)), barY - px(10));
  if (!isMobile) {
    ctx.fillStyle = theme.muted;
    setFont(ctx, metrics, 9, 600);
    ctx.fillText("0", left, barY + px(39));
    ctx.fillText(`${cycle.state.removalThresholdEv.toFixed(0)} eV 門檻`, x(cycle.state.removalThresholdEv) - px(18), barY + px(54));
    ctx.fillText("ALE 自限制窗", x(cycle.state.removalThresholdEv + 8), barY + px(39));
    ctx.fillText("連續濺鍍", x(cycle.state.sputterThresholdEv) + px(4), barY + px(39));
    ctx.fillText("150 eV", right - px(31), barY + px(54));
  }
}

function drawSynergy(ctx, metrics, theme, synergy, isMobile) {
  const { px } = metrics;
  const left = px(374);
  const right = ctx.canvas.width - px(18);
  const top = px(184);
  const width = right - left;
  const total = Math.max(synergy.epcNm, 0.001);
  const alphaWidth = width * Math.min(1, synergy.alphaNm / total);
  const betaWidth = width * Math.min(1, synergy.betaNm / total);
  const coupledWidth = Math.max(0, width - alphaWidth - betaWidth);
  ctx.fillStyle = theme.text;
  setFont(ctx, metrics, isMobile ? 10 : 12, 700);
  ctx.fillText("α/β 協同判讀", left, top - px(9));
  ctx.fillStyle = theme.primary;
  ctx.fillRect(left, top, alphaWidth, px(18));
  ctx.fillStyle = theme.ion;
  ctx.fillRect(left + alphaWidth, top, betaWidth, px(18));
  ctx.fillStyle = theme.success;
  ctx.fillRect(left + alphaWidth + betaWidth, top, coupledWidth, px(18));
  ctx.strokeStyle = theme.border;
  ctx.strokeRect(left, top, width, px(18));
  if (!isMobile) {
    ctx.fillStyle = theme.muted;
    setFont(ctx, metrics, 9, 600);
    ctx.fillText(`α 化學 ${synergy.alphaNm.toFixed(3)} nm/cycle`, left, top + px(35));
    ctx.fillText(`β 離子 ${synergy.betaNm.toFixed(3)} nm/cycle`, left, top + px(49));
  }
  ctx.fillStyle = theme.text;
  setFont(ctx, metrics, isMobile ? 9 : 10, 700);
  ctx.fillText(`協同 ${synergy.synergyPercent.toFixed(1)}%`, isMobile ? left : right - px(58), top + px(isMobile ? 42 : 49));
}

function drawEpcChart(ctx, metrics, theme, run, isMobile) {
  const { px } = metrics;
  const plot = { left: px(24), right: px(344), top: px(286), bottom: ctx.canvas.height - px(30) };
  const max = Math.max(...run.cycles.map((item) => item.epcNm), 0.005);
  drawChartFrame(ctx, metrics, theme, plot, "EPC / cycle", "nm/cycle", isMobile);
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = px(1.7);
  ctx.beginPath();
  run.cycles.forEach((item, index) => {
    const x = plot.left + index / Math.max(1, run.cycles.length - 1) * (plot.right - plot.left);
    const y = plot.bottom - item.epcNm / max * (plot.bottom - plot.top - px(8));
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  if (!isMobile) {
    ctx.fillStyle = theme.muted;
    setFont(ctx, metrics, 9, 600);
    ctx.fillText(`峰值 ${max.toFixed(3)} nm/cycle`, plot.left + px(4), plot.top + px(13));
  }
}

function drawCumulativeChart(ctx, metrics, theme, run, isMobile) {
  const { px } = metrics;
  const plot = { left: px(374), right: ctx.canvas.width - px(18), top: px(286), bottom: ctx.canvas.height - px(30) };
  const max = Math.max(run.totalEtchNm, 0.005);
  drawChartFrame(ctx, metrics, theme, plot, "累積移除", "nm", isMobile);
  ctx.strokeStyle = theme.electron;
  ctx.lineWidth = px(1.7);
  ctx.beginPath();
  run.cycles.forEach((item, index) => {
    const x = plot.left + index / Math.max(1, run.cycles.length - 1) * (plot.right - plot.left);
    const y = plot.bottom - item.cumulativeEtchNm / max * (plot.bottom - plot.top - px(8));
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  if (!isMobile) {
    ctx.fillStyle = theme.muted;
    setFont(ctx, metrics, 9, 600);
    ctx.fillText(`${run.totalEtchNm.toFixed(3)} nm / ${run.state.cycles} cycles`, plot.left + px(4), plot.top + px(13));
  }
}

function drawChartFrame(ctx, metrics, theme, plot, title, unit, isMobile) {
  const { px } = metrics;
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = px(1);
  ctx.strokeRect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top);
  ctx.fillStyle = theme.text;
  setFont(ctx, metrics, isMobile ? 9 : 10, 700);
  ctx.fillText(title, plot.left, plot.top - px(7));
  if (!isMobile) {
    ctx.fillStyle = theme.muted;
    setFont(ctx, metrics, 8, 600);
    ctx.fillText(unit, plot.right - px(34), plot.bottom + px(15));
  }
}

function updatePanel(panel, run, synergy) {
  const set = (key, value) => { panel.querySelector(`[data-value-key="${key}"]`).textContent = value; };
  set("製程區域", regimeInfo(run.cycle.regime).label);
  set("EPC", `${run.cycle.epcNm.toFixed(3)} nm/cycle`);
  set("累積移除", `${run.totalEtchNm.toFixed(3)} nm`);
  set("改質覆蓋", `${(run.cycle.coverage * 100).toFixed(1)}%`);
  set("Purge 完整度", `${(run.cycle.purgeCompleteness * 100).toFixed(1)}%`);
  set("α 化學貢獻", `${synergy.alphaNm.toFixed(3)} nm/cycle`);
  set("β 離子貢獻", `${synergy.betaNm.toFixed(3)} nm/cycle`);
  set("協同度", `${synergy.synergyPercent.toFixed(1)}%`);
}

function phaseIndex(playhead) {
  return Math.min(3, Math.max(0, Math.floor(playhead / (animationDurationSeconds / 4))));
}

function regimeInfo(regime) {
  return {
    "below-window": { label: "低能，EPC 近零", message: "低能量未跨越移除門檻，EPC 接近零" },
    "threshold-ramp": { label: "臨界爬升", message: "能量位於移除臨界區，EPC 對能量變動敏感" },
    "ale-window": { label: "ALE 自限制窗", message: "能量位於自限制 ALE 窗，移除以已改質層為主" },
    "continuous-sputter": { label: "高能連續濺鍍", message: "高能量已進入 continuous sputter，β 離子貢獻會持續增加" }
  }[regime];
}

function stabilityMessage(run) {
  const notes = [];
  if (run.state.modificationTimeS < 0.35) notes.push("短改質使表面覆蓋不足，週期間 EPC 不穩定");
  if (run.state.purgeTimeS < 0.25) notes.push("短 Purge 留下殘留物，會形成記憶效應");
  return notes.length ? notes.join("；") : "改質與 Purge 時間已接近模型飽和區";
}

function syncCanvasResolution(canvas) {
  const cssWidth = Math.max(280, canvas.getBoundingClientRect().width || 720);
  const cssHeight = cssWidth / (720 / 430);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(cssWidth * dpr);
  const height = Math.round(cssHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  canvas.dataset.minFontCssPx = "11";
  canvas.dataset.labelLayout = cssWidth < 520 ? "compact" : "full";
  return { width, height, dpr, isMobile: cssWidth < 520, px: (value) => value * width / 720 };
}

function setFont(ctx, metrics, cssPx, weight) {
  const canvasPixels = Math.max(metrics.px(cssPx), 11 * metrics.dpr);
  ctx.font = `${weight} ${canvasPixels}px system-ui, sans-serif`;
}
