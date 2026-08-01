import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createButton, createSegmentedControl, createSlider, createToggle, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { comparePulseCharging, createPulseState, generatePulseWaveforms } from "../pulse-model.js";

const defaults = Object.freeze({
  frequencyKhz: 1,
  dutyCycle: 0.5,
  mode: "synchronized",
  phaseDegrees: 0,
  electronegative: false,
  sourcePowerW: 1000,
  biasPowerW: 250
});

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const ctx = canvas.getContext("2d");
  const state = { ...defaults, theme: readCanvasTheme(), playing: false, playhead: 1, lastFrameTime: null };
  let component;
  let playButton;
  let unwatch = () => {};
  let resizeObserver;
  let observedWidth = 0;

  canvas.width = 720;
  canvas.height = 430;
  canvas.setAttribute("aria-label", "A31 脈衝時序的 source 與 bias 功率、電漿狀態、鞘層、負離子和底部電荷對照圖");

  const panel = createValuePanel([
    ["週期", "—"], ["重疊", "—"], ["脈衝末端電荷", "—"],
    ["continuous 電荷", "—"], ["脈衝峰值電荷", "—"], ["負離子", "—"]
  ]);

  const instance = {
    reduceMotion() {
      state.playing = false;
      state.playhead = 1;
      state.lastFrameTime = null;
      if (playButton) playButton.textContent = "播放";
    },
    update(time) {
      if (!state.playing) return false;
      if (state.lastFrameTime == null) {
        state.lastFrameTime = time;
        return true;
      }
      state.playhead = Math.min(1, state.playhead + Math.min(0.1, (time - state.lastFrameTime) / 1000) / 4);
      state.lastFrameTime = time;
      if (state.playhead >= 1) {
        state.playing = false;
        playButton.textContent = "播放";
      }
      return true;
    },
    render() {
      const waveforms = generatePulseWaveforms(state);
      const comparison = comparePulseCharging(state);
      drawPulseTiming(ctx, state, waveforms, comparison, state.playhead);
      updatePanel(panel, waveforms, comparison);
      const terminalCharge = waveforms.terminalCharge;
      const continuousCharge = comparison.continuous.terminalCharge;
      canvas.dataset.renderState = "complete";
      canvas.dataset.playhead = state.playhead.toFixed(3);
      canvas.dataset.mode = state.mode;
      canvas.dataset.terminalCharge = terminalCharge.toFixed(5);
      canvas.dataset.continuousCharge = continuousCharge.toFixed(5);
      canvas.dataset.numericSignature = numericSignature(waveforms, comparison);
      canvas.dataset.themeBg = state.theme.bg;
      status.textContent = `${modeLabel(state.mode)}脈衝：週期 ${waveforms.periodUs.toFixed(1)} µs、duty ${Math.round(state.dutyCycle * 100)}%；脈衝末端電荷 ${terminalCharge.toFixed(2)} relative，continuous 同方程比較為 ${continuousCharge.toFixed(2)} relative。${state.electronegative ? " 負電性模式會在 source off 時累積負離子並加速電荷中和。" : ""}`;
    },
    reset() {
      Object.assign(state, defaults, { playing: false, playhead: 1, lastFrameTime: null });
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
    state.playhead = 1;
    state.lastFrameTime = null;
    if (playButton) playButton.textContent = "播放";
    component.stop();
    component.render();
  }

  function mountControls() {
    playButton = createButton("播放", () => {
      state.playing = !state.playing;
      if (state.playing) {
        if (state.playhead >= 1) state.playhead = 0;
        state.lastFrameTime = null;
        playButton.textContent = "暫停";
        component.start();
      } else {
        playButton.textContent = "播放";
        component.stop();
        component.render();
      }
    });
    playButton.setAttribute("aria-label", "播放或暫停 A31 脈衝時序動畫");
    const resetButton = createButton("重設", () => component.reset());
    resetButton.setAttribute("aria-label", "重設 A31 脈衝時序參數");
    controls.replaceChildren(
      createSlider({ label: "頻率", min: 0.1, max: 10, step: 0.1, value: state.frequencyKhz, formatValue: (value) => `${value.toFixed(1)} kHz`, onInput: (value) => change("frequencyKhz", value) }),
      createSlider({ label: "duty", min: 0.1, max: 0.9, step: 0.05, value: state.dutyCycle, formatValue: (value) => `${Math.round(value * 100)}%`, onInput: (value) => change("dutyCycle", value) }),
      createSegmentedControl({
        label: "脈衝模式",
        options: [{ value: "source", label: "Source" }, { value: "bias", label: "Bias" }, { value: "synchronized", label: "同步" }],
        value: state.mode,
        onChange: (value) => change("mode", value)
      }),
      createSlider({ label: "相位", min: 0, max: 360, step: 5, value: state.phaseDegrees, formatValue: (value) => `${Math.round(value)}°`, onInput: (value) => change("phaseDegrees", value) }),
      createToggle({ label: "負電性氣體", checked: state.electronegative, onChange: (value) => change("electronegative", value) }),
      createSlider({ label: "Source power", min: 100, max: 3000, step: 100, value: state.sourcePowerW, unit: "W", onInput: (value) => change("sourcePowerW", value) }),
      createSlider({ label: "Bias power", min: 0, max: 1000, step: 50, value: state.biasPowerW, unit: "W", onInput: (value) => change("biasPowerW", value) }),
      playButton,
      resetButton,
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

function drawPulseTiming(ctx, state, waveforms, comparison, playhead) {
  const metrics = syncCanvasResolution(ctx.canvas);
  const { width, height, px, isMobile } = metrics;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = state.theme.bg;
  ctx.fillRect(0, 0, width, height);

  const left = px(isMobile ? 94 : 116);
  const right = width - px(18);
  const top = px(32);
  const bottom = height - px(31);
  const gap = px(7);
  const rowHeight = (bottom - top - gap * 5) / 6;
  const rows = [
    { label: "Source / Bias (W)", keys: ["sourcePower", "biasPower"], colors: [state.theme.primary, state.theme.ion], range: [0, Math.max(state.sourcePowerW, state.biasPowerW, 100)] },
    { label: "ne (relative)", keys: ["electronDensityNormalized"], colors: [state.theme.electron], range: [0, 1.2] },
    { label: "Te (eV)", keys: ["electronTemperatureEv"], colors: [state.theme.warning], range: [0, 5] },
    { label: "Sheath (relative)", keys: ["sheathPotentialNormalized"], colors: [state.theme.ion], range: [0, 2] },
    { label: "負離子 (relative)", keys: ["negativeIonDensityNormalized"], colors: [state.theme.success], range: [0, 0.9] },
    { label: "底部電荷 (relative)", keys: ["bottomCharge"], colors: [state.theme.danger], range: [0, Math.max(1, comparison.continuous.terminalCharge * 1.08, waveforms.peakCharge * 1.08)], continuous: comparison.continuous.terminalCharge }
  ];

  if (!isMobile) {
    ctx.fillStyle = state.theme.text;
    setFont(ctx, metrics, 12, 700);
    ctx.fillText("A31 脈衝時序：同一時間軸、relative 量皆為歸一化比較", left, px(17));
  }
  rows.forEach((row, index) => drawRow(ctx, state.theme, metrics, {
    left,
    right,
    top: top + index * (rowHeight + gap),
    bottom: top + index * (rowHeight + gap) + rowHeight
  }, row, waveforms, playhead));
  if (!isMobile) {
    ctx.fillStyle = state.theme.muted;
    setFont(ctx, metrics, 11, 500);
    ctx.fillText("時間（µs）", right - px(60), height - px(10));
  }
}

function drawRow(ctx, theme, metrics, plot, row, waveforms, playhead) {
  const { px, isMobile } = metrics;
  const [min, max] = row.range;
  const visibleCount = Math.max(1, Math.ceil(waveforms.points.length * playhead));
  const points = waveforms.points.slice(0, visibleCount);
  ctx.fillStyle = theme.muted;
  setFont(ctx, metrics, isMobile ? 11 : 12, 600);
  ctx.fillText(row.label, px(8), plot.top + (plot.bottom - plot.top) / 2 + px(4));
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = px(1);
  ctx.strokeRect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top);
  ctx.strokeStyle = theme.border;
  ctx.setLineDash([px(3), px(3)]);
  ctx.beginPath();
  ctx.moveTo(plot.left, (plot.top + plot.bottom) / 2);
  ctx.lineTo(plot.right, (plot.top + plot.bottom) / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  if (Number.isFinite(row.continuous)) {
    const y = valueY(row.continuous, min, max, plot);
    ctx.save();
    ctx.strokeStyle = theme.muted;
    ctx.setLineDash([px(5), px(3)]);
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.right, y);
    ctx.stroke();
    ctx.restore();
    if (!isMobile) {
      ctx.fillStyle = theme.muted;
      setFont(ctx, metrics, 11, 600);
      ctx.fillText("continuous", plot.right - px(67), Math.max(plot.top + px(11), y - px(3)));
    }
  }

  row.keys.forEach((key, index) => {
    ctx.beginPath();
    points.forEach((point, pointIndex) => {
      const x = plot.left + point.timeUs / waveforms.periodUs * (plot.right - plot.left);
      const y = valueY(point[key], min, max, plot);
      if (pointIndex === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = row.colors[index];
    ctx.lineWidth = px(isMobile ? 1.4 : 1.7);
    ctx.stroke();
  });

  if (row.keys.length === 2 && !isMobile) {
    ctx.fillStyle = row.colors[0];
    setFont(ctx, metrics, 11, 600);
    ctx.fillText("Source", plot.left + px(5), plot.top + px(12));
    ctx.fillStyle = row.colors[1];
    ctx.fillText("Bias", plot.left + px(52), plot.top + px(12));
  }
}

function valueY(value, min, max, plot) {
  return plot.bottom - (value - min) / (max - min) * (plot.bottom - plot.top);
}

function updatePanel(panel, waveforms, comparison) {
  const set = (key, value) => { panel.querySelector(`[data-value-key="${key}"]`).textContent = value; };
  set("週期", `${waveforms.periodUs.toFixed(1)} µs`);
  set("重疊", `${Math.round(waveforms.overlapFraction * 100)}%`);
  set("脈衝末端電荷", `${waveforms.terminalCharge.toFixed(2)} relative`);
  set("continuous 電荷", `${comparison.continuous.terminalCharge.toFixed(2)} relative`);
  set("脈衝峰值電荷", `${waveforms.peakCharge.toFixed(2)} relative`);
  set("負離子", `${waveforms.points.at(-1).negativeIonDensityNormalized.toFixed(2)} relative`);
}

function numericSignature(waveforms, comparison) {
  const stride = Math.max(1, Math.floor(waveforms.points.length / 8));
  const samples = waveforms.points.filter((_, index) => index % stride === 0)
    .map((point) => `${point.electronDensityNormalized.toFixed(3)},${point.electronTemperatureEv.toFixed(3)},${point.bottomCharge.toFixed(3)}`);
  return `${samples.join("|")};${comparison.continuous.terminalCharge.toFixed(3)}`;
}

function modeLabel(mode) {
  return ({ source: "Source", bias: "Bias", synchronized: "同步" })[mode];
}

function syncCanvasResolution(canvas) {
  const cssWidth = Math.max(280, canvas.getBoundingClientRect().width || 720);
  const cssHeight = cssWidth * 430 / 720;
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
