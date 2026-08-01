import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createButton, createSlider, createToggle, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { createDamageState, simulateCharging } from "../damage-model.js";

const defaults = Object.freeze({ antennaExponent: 2.7, gateAreaUm2: 5, aspectRatio: 5, oxideThicknessNm: 5, pulsed: false, antennaDiode: false });

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
  canvas.setAttribute("aria-label", "天線效應剖面、電子遮蔽、閘極充電與電位軌跡");

  const panel = createValuePanel([
    ["天線比", "—"], ["電子遮蔽", "—"], ["累積電荷", "—"], ["峰值電位", "—"], ["終端電位", "—"],
    ["氧化層電場", "—"], ["風險分數", "—"], ["相對壽命指標", "—"], ["UV/VUV 劑量", "—"]
  ]);

  const instance = {
    reduceMotion() {
      state.playing = false;
      state.playheadUs = Number.POSITIVE_INFINITY;
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
      state.playheadUs += deltaSeconds * state.durationUs / 8;
      if (state.playheadUs >= state.durationUs) {
        state.playheadUs = state.durationUs;
        state.playing = false;
        playButton.textContent = "播放";
      }
      return true;
    },
    render() {
      const modelState = createDamageState({
        antennaAreaUm2: 10 ** state.antennaExponent,
        gateAreaUm2: state.gateAreaUm2,
        aspectRatio: state.aspectRatio,
        oxideThicknessNm: state.oxideThicknessNm,
        pulsed: state.pulsed,
        antennaDiode: state.antennaDiode,
        durationUs: 100
      });
      const result = simulateCharging(modelState);
      state.durationUs = result.state.durationUs;
      const playheadUs = Number.isFinite(state.playheadUs) ? state.playheadUs : state.durationUs;
      const viewResult = resultAtTime(result, playheadUs);
      drawCharging(ctx, state, viewResult, result.state.durationUs);
      updatePanel(panel, viewResult);
      canvas.dataset.renderState = "complete";
      canvas.dataset.pulsed = String(state.pulsed);
      canvas.dataset.diode = String(state.antennaDiode);
      canvas.dataset.risk = viewResult.riskScore.toFixed(1);
      canvas.dataset.playhead = playheadUs.toFixed(2);
      canvas.dataset.numericSignature = [viewResult.state.antennaRatio, viewResult.peakGatePotentialV, viewResult.terminalChargePc, viewResult.damageModes.uvVuvDose].map((value) => Number(value).toFixed(5)).join("|");
      canvas.dataset.themeBg = state.theme.bg;
      status.dataset.risk = viewResult.riskScore >= 60 ? "high" : viewResult.riskScore >= 30 ? "medium" : "low";
      const domainNote = viewResult.breakdownExceeded ? "氧化層電場已進入教學崩潰區，停止輸出壽命指標；" : "相對壽命指標只供本站趨勢比較，不是產品壽命預測；";
      status.textContent = `${state.playing ? `播放至 ${playheadUs.toFixed(1)} µs；` : ""}${state.pulsed ? "脈衝 off phase 會中和電荷" : "連續電漿使電位單調累積"}；${state.antennaDiode ? "天線二極體已鉗位電氣充電，但 UV/VUV 劑量不變" : "未加天線二極體"}。${domainNote}風險分數 ${viewResult.riskScore.toFixed(1)}。`;
    },
    reset() {
      Object.assign(state, defaults);
      state.playing = false;
      state.playheadUs = Number.POSITIVE_INFINITY;
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
    state.playheadUs = Number.POSITIVE_INFINITY;
    state.lastFrameTime = null;
    if (playButton) playButton.textContent = "播放";
    component.render();
  }

  function mountControls() {
    playButton = createButton("播放", () => {
      state.playing = !state.playing;
      if (state.playing) {
        if (!Number.isFinite(state.playheadUs) || state.playheadUs >= state.durationUs) state.playheadUs = 0;
        state.lastFrameTime = null;
        playButton.textContent = "暫停";
        component.start();
      } else {
        playButton.textContent = "播放";
        component.stop();
        component.render();
      }
    });
    playButton.setAttribute("aria-label", "播放或暫停 A29 天線充電時間動畫");
    const reset = createButton("重設", () => component.reset());
    reset.setAttribute("aria-label", "重設 A29 天線充電參數");
    controls.replaceChildren(
      createSlider({ label: "天線面積（對數）", min: 1.7, max: 4.3, step: 0.05, value: state.antennaExponent, formatValue: (value) => `${Math.round(10 ** value).toLocaleString()} µm²`, onInput: (value) => change("antennaExponent", value) }),
      createSlider({ label: "閘極面積", min: 1, max: 20, step: 1, value: state.gateAreaUm2, unit: "µm²", onInput: (value) => change("gateAreaUm2", value) }),
      createSlider({ label: "結構深寬比", min: 0.5, max: 30, step: 0.5, value: state.aspectRatio, onInput: (value) => change("aspectRatio", value) }),
      createSlider({ label: "氧化層厚度", min: 1, max: 10, step: 0.5, value: state.oxideThicknessNm, unit: "nm", onInput: (value) => change("oxideThicknessNm", value) }),
      createToggle({ label: "脈衝電漿", checked: state.pulsed, onChange: (value) => change("pulsed", value) }),
      createToggle({ label: "天線二極體", checked: state.antennaDiode, onChange: (value) => change("antennaDiode", value) }),
      playButton,
      reset,
      panel
    );
  }

  mountControls();
  state.playing = false;
  state.playheadUs = Number.POSITIVE_INFINITY;
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

function drawCharging(ctx, state, result, fullDurationUs) {
  const metrics = syncCanvasResolution(ctx.canvas);
  const { width, height, px, isMobile } = metrics;
  const theme = state.theme;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  const top = px(26);
  const substrateY = px(210);
  const traceTop = px(274);
  const left = px(isMobile ? 38 : 52);
  const right = width - px(16);

  ctx.fillStyle = theme.surface;
  ctx.fillRect(left, substrateY, right - left, px(45));
  ctx.strokeStyle = theme.border;
  ctx.strokeRect(left, substrateY, right - left, px(45));
  if (!isMobile) {
    ctx.fillStyle = theme.muted;
    setFont(ctx, metrics, 11, 600);
    ctx.fillText("Si 基板", left + px(8), substrateY + px(28));
  }

  const gateX = right - px(150);
  ctx.fillStyle = theme.warning;
  ctx.fillRect(gateX, substrateY - px(9), px(90), px(9));
  ctx.fillStyle = theme.primary;
  ctx.fillRect(gateX + px(10), substrateY - px(28), px(70), px(19));
  ctx.fillStyle = theme.text;
  setFont(ctx, metrics, isMobile ? 8 : 10, 600);
  if (!isMobile) {
    ctx.fillText("閘極", gateX + px(25), substrateY - px(14));
    ctx.fillText("氧化層", gateX + px(17), substrateY + px(13));
  }

  const antennaX = left + px(30);
  const antennaWidth = Math.min(px(245), px(90 + Math.log10(result.state.antennaRatio + 1) * 52));
  ctx.fillStyle = theme.neutral;
  ctx.fillRect(antennaX, px(126), antennaWidth, px(24));
  ctx.fillRect(antennaX + antennaWidth - px(8), px(126), px(8), substrateY - px(126));
  ctx.fillRect(antennaX + antennaWidth - px(8), substrateY - px(32), gateX - (antennaX + antennaWidth) + px(8), px(8));
  ctx.fillStyle = theme.text;
  setFont(ctx, metrics, isMobile ? 8 : 10, 700);
  ctx.fillText(`${isMobile ? "天線" : "金屬天線"} AR ${result.state.antennaRatio.toFixed(0)}`, antennaX, px(119));

  const trenchX = gateX - px(70);
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = px(5);
  ctx.beginPath();
  ctx.moveTo(trenchX, px(78));
  ctx.lineTo(trenchX, substrateY - px(35));
  ctx.lineTo(trenchX + px(38), substrateY - px(35));
  ctx.lineTo(trenchX + px(38), px(78));
  ctx.stroke();
  ctx.fillStyle = theme.muted;
  setFont(ctx, metrics, isMobile ? 8 : 10, 600);
  if (!isMobile) ctx.fillText("高 AR 結構", trenchX - px(8), px(68));

  drawParticles(ctx, metrics, theme, trenchX, substrateY, result.electronShading, isMobile);
  drawCharge(ctx, metrics, theme, antennaX, antennaWidth, result.peakGatePotentialV);
  if (state.antennaDiode) drawDiode(ctx, metrics, theme, gateX + px(96), substrateY - px(30));

  drawTrace(ctx, metrics, theme, result.trace, { left, right, top: traceTop, bottom: height - px(34) }, state.pulsed, isMobile, fullDurationUs);
  if (!isMobile) {
    ctx.fillStyle = theme.text;
    setFont(ctx, metrics, 12, 700);
    ctx.fillText("閘極電位軌跡", left, traceTop - px(9));
  }
}

function drawParticles(ctx, metrics, theme, trenchX, substrateY, shading, isMobile) {
  const { px } = metrics;
  ctx.fillStyle = theme.danger;
  for (let index = 0; index < 6; index += 1) {
    ctx.beginPath();
    ctx.arc(trenchX + px(7 + index * 5), px(35 + index * 18), px(3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = theme.primary;
  const electronCount = Math.max(1, Math.round(7 * (1 - shading)));
  for (let index = 0; index < electronCount; index += 1) {
    ctx.beginPath();
    ctx.arc(trenchX + px(8 + index * 7), px(45 + index * 16), px(2.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = theme.muted;
  setFont(ctx, metrics, 10, 600);
  ctx.fillText(`${isMobile ? "遮蔽" : "電子遮蔽"} ${(shading * 100).toFixed(0)}%`, trenchX + px(48), substrateY - px(52));
}

function drawCharge(ctx, metrics, theme, x, width, potential) {
  const { px } = metrics;
  const count = Math.min(14, Math.max(2, Math.round(potential / 2)));
  ctx.fillStyle = theme.danger;
  setFont(ctx, metrics, 11, 800);
  for (let index = 0; index < count; index += 1) {
    ctx.fillText("+", x + px(8) + (index % 10) * Math.max(px(11), width / 11), px(143) - Math.floor(index / 10) * px(15));
  }
}

function drawDiode(ctx, metrics, theme, x, y) {
  const { px } = metrics;
  ctx.strokeStyle = theme.success;
  ctx.lineWidth = px(2);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + px(34));
  ctx.moveTo(x - px(9), y + px(15));
  ctx.lineTo(x + px(9), y + px(15));
  ctx.moveTo(x - px(9), y + px(21));
  ctx.lineTo(x + px(9), y + px(21));
  ctx.stroke();
  ctx.fillStyle = theme.success;
  setFont(ctx, metrics, 9, 700);
  ctx.fillText("二極體鉗位", x - px(24), y - px(6));
}

function drawTrace(ctx, metrics, theme, trace, plot, pulsed, isMobile, fullDurationUs) {
  const { px } = metrics;
  const maxV = Math.max(...trace.map((point) => point.gatePotentialV), 1);
  const maxT = fullDurationUs;
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = px(1);
  ctx.strokeRect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top);
  ctx.beginPath();
  trace.forEach((point, index) => {
    const x = plot.left + point.timeUs / maxT * (plot.right - plot.left);
    const y = plot.bottom - point.gatePotentialV / maxV * (plot.bottom - plot.top);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = pulsed ? theme.success : theme.danger;
  ctx.lineWidth = px(1.8);
  ctx.stroke();
  ctx.fillStyle = theme.muted;
  setFont(ctx, metrics, 9, 500);
  ctx.fillText("0", isMobile ? plot.left + px(3) : plot.left - px(14), plot.bottom - (isMobile ? px(3) : 0));
  ctx.fillText(`${maxV.toFixed(1)} V`, isMobile ? plot.left + px(3) : plot.left - px(35), plot.top + px(10));
  ctx.fillText(`${maxT.toFixed(0)} µs`, plot.right - px(isMobile ? 48 : 35), plot.bottom - (isMobile ? px(3) : -px(16)));
}

function updatePanel(panel, result) {
  const set = (key, value) => { panel.querySelector(`[data-value-key="${key}"]`).textContent = value; };
  set("天線比", result.state.antennaRatio.toFixed(0));
  set("電子遮蔽", `${(result.electronShading * 100).toFixed(0)}%`);
  set("累積電荷", `${result.terminalChargePc.toFixed(3)} pC`);
  set("峰值電位", `${result.peakGatePotentialV.toFixed(2)} V`);
  set("終端電位", `${result.terminalGatePotentialV.toFixed(2)} V`);
  set("氧化層電場", `${result.oxideFieldMvCm.toFixed(2)} MV/cm`);
  set("風險分數", result.riskScore.toFixed(1));
  set("相對壽命指標", result.estimatedLifetimeIndex == null ? "超出模型（崩潰區）" : result.estimatedLifetimeIndex.toFixed(1));
  set("UV/VUV 劑量", result.damageModes.uvVuvDose.toFixed(2));
}

function resultAtTime(result, playheadUs) {
  const trace = result.trace.filter((point) => point.timeUs <= playheadUs);
  const visibleTrace = trace.length ? trace : [result.trace[0]];
  const terminal = visibleTrace.at(-1);
  const peakGatePotentialV = Math.max(...visibleTrace.map((point) => point.gatePotentialV));
  const peakChargePc = Math.max(...visibleTrace.map((point) => point.accumulatedChargePc));
  const oxideFieldMvCm = peakGatePotentialV / result.state.oxideThicknessNm * 10;
  const breakdownExceeded = oxideFieldMvCm >= 12;
  const progress = Math.max(0, Math.min(1, terminal.timeUs / result.state.durationUs));
  const riskScore = breakdownExceeded ? 100 : result.riskScore * progress;
  return {
    ...result,
    trace: visibleTrace,
    terminalGatePotentialV: terminal.gatePotentialV,
    peakGatePotentialV,
    terminalChargePc: terminal.accumulatedChargePc,
    peakChargePc,
    oxideFieldMvCm,
    breakdownExceeded,
    riskScore,
    estimatedLifetimeIndex: breakdownExceeded ? null : Math.max(0, 100 - riskScore),
    damageModes: {
      ...result.damageModes,
      uvVuvDose: result.damageModes.uvVuvDose * progress
    }
  };
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
