import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createButton, createSegmentedControl, createSlider, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { analyzeEndpointSeries, generateEndpointSeries } from "../process-control-model.js";

const defaults = Object.freeze({
  openAreaExponent: 1,
  noisePercent: 3,
  algorithm: "movingAverage",
  filmThicknessNm: 600,
  etchRateNmMin: 300,
  windowTransmission: 1
});

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const ctx = canvas.getContext("2d");
  const state = { ...defaults, theme: readCanvasTheme() };
  let component;
  let playButton;
  let unwatch = () => {};
  let resizeObserver;
  let observedWidth = 0;

  canvas.width = 720;
  canvas.height = 430;
  canvas.setAttribute("aria-label", "OES 與干涉式終點訊號、演算法與觸發點比較");

  const panel = createValuePanel([
    ["OES SNR", "—"], ["OES 終點", "—"], ["OES 誤差", "—"], ["OES 判定", "—"],
    ["IEP 終點", "—"], ["條紋數", "—"], ["每條紋厚度", "—"], ["真實終點", "—"]
  ]);

  const instance = {
    reduceMotion() {
      state.playing = false;
      state.playheadSeconds = Number.POSITIVE_INFINITY;
      state.lastFrameTime = null;
      if (playButton) playButton.textContent = "播放";
    },
    update(time) {
      if (!state.playing) return false;
      if (state.lastFrameTime == null) {
        state.lastFrameTime = time;
        return true;
      }
      const deltaSeconds = Math.min(0.1, (time - state.lastFrameTime) / 1000);
      state.lastFrameTime = time;
      state.playheadSeconds += deltaSeconds * state.durationSeconds / 8;
      if (state.playheadSeconds >= state.durationSeconds) {
        state.playheadSeconds = state.durationSeconds;
        state.playing = false;
        playButton.textContent = "播放";
      }
      return true;
    },
    render() {
      const openAreaPercent = 10 ** state.openAreaExponent;
      const series = generateEndpointSeries({ ...state, openAreaPercent, seed: 24680 });
      const analysis = analyzeEndpointSeries(series, { algorithm: state.algorithm });
      state.durationSeconds = series.points.at(-1).timeSeconds;
      const playheadSeconds = Number.isFinite(state.playheadSeconds) ? state.playheadSeconds : state.durationSeconds;
      drawEndpoint(ctx, state, series, analysis, playheadSeconds);
      updatePanel(panel, series, analysis);
      canvas.dataset.renderState = "complete";
      canvas.dataset.algorithm = state.algorithm;
      canvas.dataset.oesReliable = String(analysis.oes.reliable);
      canvas.dataset.interferenceReliable = String(analysis.interference.reliable);
      canvas.dataset.playhead = playheadSeconds.toFixed(2);
      canvas.dataset.curveSignature = curveSignature(series.points, state.algorithm);
      canvas.dataset.themeBg = state.theme.bg;
      status.dataset.reliability = analysis.oes.reliable ? "reliable" : "unreliable";
      status.textContent = `${state.playing ? `播放至 ${playheadSeconds.toFixed(1)} 秒；` : ""}開口率 ${formatPercent(openAreaPercent)}，OES SNR ${series.signalToNoise.toFixed(1)}：${analysis.oes.reason} 干涉式終點${analysis.interference.reliable ? "維持可用" : "因條紋不足或訊號損壞而不可用"}。`;
    },
    reset() {
      Object.assign(state, defaults);
      state.playing = false;
      state.playheadSeconds = Number.POSITIVE_INFINITY;
      state.lastFrameTime = null;
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
    state.playheadSeconds = Number.POSITIVE_INFINITY;
    state.lastFrameTime = null;
    if (playButton) playButton.textContent = "播放";
    component.render();
  }

  function mountControls() {
    playButton = createButton("播放", () => {
      state.playing = !state.playing;
      if (state.playing) {
        if (!Number.isFinite(state.playheadSeconds) || state.playheadSeconds >= state.durationSeconds) state.playheadSeconds = 0;
        state.lastFrameTime = null;
        playButton.textContent = "暫停";
        component.start();
      } else {
        playButton.textContent = "播放";
        component.stop();
        component.render();
      }
    });
    playButton.setAttribute("aria-label", "播放或暫停 A28 終點訊號時間動畫");
    const reset = createButton("重設", () => component.reset());
    reset.setAttribute("aria-label", "重設 A28 終點偵測參數");
    controls.replaceChildren(
      createSegmentedControl({
        label: "終點演算法",
        options: [
          { value: "raw", label: "原始" },
          { value: "movingAverage", label: "移動平均" },
          { value: "firstDerivative", label: "一階微分" },
          { value: "normalized", label: "歸一化" }
        ],
        value: state.algorithm,
        onChange: (value) => change("algorithm", value)
      }),
      createSlider({ label: "開口率（對數）", min: -2, max: Math.log10(50), step: 0.05, value: state.openAreaExponent, formatValue: (value) => formatPercent(10 ** value), onInput: (value) => change("openAreaExponent", value) }),
      createSlider({ label: "雜訊", min: 0, max: 20, step: 1, value: state.noisePercent, unit: "%", onInput: (value) => change("noisePercent", value) }),
      createSlider({ label: "觀測窗透光率", min: 0.1, max: 1, step: 0.05, value: state.windowTransmission, formatValue: (value) => `${Math.round(value * 100)}%`, onInput: (value) => change("windowTransmission", value) }),
      createSlider({ label: "膜厚", min: 300, max: 1500, step: 50, value: state.filmThicknessNm, unit: "nm", onInput: (value) => change("filmThicknessNm", value) }),
      createSlider({ label: "蝕刻率", min: 50, max: 800, step: 25, value: state.etchRateNmMin, unit: "nm/min", onInput: (value) => change("etchRateNmMin", value) }),
      playButton,
      reset,
      panel
    );
  }

  mountControls();
  state.playing = false;
  state.playheadSeconds = Number.POSITIVE_INFINITY;
  state.lastFrameTime = null;
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

function drawEndpoint(ctx, state, series, analysis, playheadSeconds) {
  const metrics = syncCanvasResolution(ctx.canvas);
  const { width, height, px, isMobile } = metrics;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = state.theme.bg;
  ctx.fillRect(0, 0, width, height);

  const gap = px(isMobile ? 8 : 14);
  const margin = px(isMobile ? 34 : 48);
  const top = px(isMobile ? 24 : 28);
  const middle = px(isMobile ? 238 : 232);
  const halfWidth = (width - margin - px(12) - gap) / 2;
  const leftPlot = { left: margin, right: margin + halfWidth, top, bottom: middle - gap };
  const rightPlot = { left: leftPlot.right + gap, right: width - px(12), top, bottom: middle - gap };
  const bottomPlot = { left: margin, right: width - px(12), top: middle + px(22), bottom: height - px(34) };

  drawPlot(ctx, state.theme, metrics, leftPlot, series.points, "raw", "OES 產物訊號", analysis.oes.detectedSeconds, state.theme.primary, playheadSeconds);
  drawPlot(ctx, state.theme, metrics, rightPlot, series.points, "interference", "干涉反射率", analysis.interference.detectedSeconds, state.theme.electron, playheadSeconds);
  drawPlot(ctx, state.theme, metrics, bottomPlot, series.points, state.algorithm, algorithmLabel(state.algorithm), analysis.oes.detectedSeconds, state.theme.warning, playheadSeconds);

  ctx.fillStyle = state.theme.muted;
  setFont(ctx, metrics, isMobile ? 9 : 11, 500);
  ctx.fillText("時間 (s)", bottomPlot.right - px(44), height - px(10));
}

function drawPlot(ctx, theme, metrics, plot, points, key, title, triggerSeconds, color, playheadSeconds) {
  const { px, isMobile } = metrics;
  const values = points.map((point) => point[key]);
  const finite = values.filter(Number.isFinite);
  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (max === min) max = min + 1;
  const xMax = points.at(-1).timeSeconds;

  ctx.strokeStyle = theme.border;
  ctx.lineWidth = px(1);
  ctx.strokeRect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top);
  ctx.fillStyle = theme.text;
  setFont(ctx, metrics, isMobile ? 9 : 12, 700);
  ctx.fillText(title, plot.left, plot.top - px(7));

  const visiblePoints = points.filter((point) => point.timeSeconds <= playheadSeconds);
  ctx.beginPath();
  visiblePoints.forEach((point, index) => {
    const x = plot.left + point.timeSeconds / xMax * (plot.right - plot.left);
    const y = plot.bottom - (point[key] - min) / (max - min) * (plot.bottom - plot.top);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = px(isMobile ? 1.25 : 1.6);
  ctx.stroke();

  if (Number.isFinite(triggerSeconds) && triggerSeconds <= playheadSeconds) {
    const triggerX = plot.left + triggerSeconds / xMax * (plot.right - plot.left);
    ctx.save();
    ctx.setLineDash([px(4), px(3)]);
    ctx.strokeStyle = theme.danger;
    ctx.beginPath();
    ctx.moveTo(triggerX, plot.top);
    ctx.lineTo(triggerX, plot.bottom);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = theme.danger;
    setFont(ctx, metrics, isMobile ? 8 : 10, 700);
    ctx.fillText("觸發", Math.min(triggerX + px(3), plot.right - px(27)), plot.top + px(12));
  }
}

function updatePanel(panel, series, analysis) {
  const set = (key, value) => { panel.querySelector(`[data-value-key="${key}"]`).textContent = value; };
  set("OES SNR", series.signalToNoise.toFixed(1));
  set("OES 終點", Number.isFinite(analysis.oes.detectedSeconds) ? `${analysis.oes.detectedSeconds.toFixed(1)} s` : "未偵測");
  set("OES 誤差", `${analysis.oes.errorSeconds.toFixed(1)} s`);
  set("OES 判定", analysis.oes.reliable ? "可靠" : "不可靠");
  set("IEP 終點", Number.isFinite(analysis.interference.detectedSeconds) ? `${analysis.interference.detectedSeconds.toFixed(1)} s` : "條紋不足");
  set("條紋數", (series.state.filmThicknessNm / series.fringeThicknessNm).toFixed(2));
  set("每條紋厚度", `${series.fringeThicknessNm.toFixed(1)} nm`);
  set("真實終點", `${series.trueEndpointSeconds.toFixed(1)} s`);
}

function algorithmLabel(value) {
  return ({ raw: "原始訊號", movingAverage: "移動平均", firstDerivative: "一階微分", normalized: "歸一化訊號" })[value];
}

function curveSignature(points, key) {
  const stride = Math.max(1, Math.floor(points.length / 12));
  return points.filter((_, index) => index % stride === 0).map((point) => point[key].toFixed(5)).join("|");
}

function formatPercent(value) {
  return `${value < 0.1 ? value.toFixed(2) : value < 1 ? value.toFixed(2) : value.toFixed(1)}%`;
}

function syncCanvasResolution(canvas) {
  const cssWidth = Math.max(280, canvas.getBoundingClientRect().width || 720);
  const ratio = 720 / 430;
  const cssHeight = cssWidth / ratio;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(cssWidth * dpr);
  const height = Math.round(cssHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  canvas.dataset.minFontCssPx = "11";
  canvas.dataset.labelLayout = cssWidth < 520 ? "compact" : "full";
  return { width, height, dpr, isMobile: cssWidth < 520, scale: width / 720, px: (value) => value * width / 720 };
}

function setFont(ctx, metrics, cssPx, weight) {
  const canvasPixels = Math.max(metrics.px(cssPx), 11 * metrics.dpr);
  ctx.font = `${weight} ${canvasPixels}px system-ui, sans-serif`;
}
