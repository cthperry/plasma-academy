import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createButton, createSegmentedControl, createSelect, createSlider, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { calculateActinometry, createOesState, generateSpectrum, lineIntensity, oesProcesses } from "../oes-model.js";

const defaults = Object.freeze({ process: "oxide", powerW: 500, pressureMtorr: 20, argonFraction: 0.03, windowTransmission: 1, ratioMode: "correct" });

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const ctx = canvas.getContext("2d");
  const state = { ...defaults, theme: readCanvasTheme() };
  let component;
  let unwatch = () => {};
  let resizeObserver;
  let observedWidth = 0;

  canvas.width = 720;
  canvas.height = 430;
  canvas.setAttribute("aria-label", "22 線 OES stick spectrum 與 actinometry 比值比較");

  const panel = createValuePanel([
    ["譜線數", "—"], ["F 703.7 絕對強度", "—"], ["Actinometry 比值", "—"],
    ["電子溫度 Te", "—"], ["比值判定", "—"], ["來源狀態", "—"]
  ]);

  const instance = {
    render() {
      const modelState = createOesState(state);
      const spectrum = generateSpectrum(modelState);
      const referenceId = state.ratioMode === "correct" ? "ar-750.4" : "si-251.6";
      const ratio = calculateActinometry(modelState, "f-703.7", referenceId);
      const absoluteF = lineIntensity("f-703.7", modelState);
      drawSpectrum(ctx, state, spectrum.lines, referenceId);
      updatePanel(panel, spectrum.lines.length, absoluteF, ratio, modelState.electronTemperatureEv);
      canvas.dataset.renderState = "complete";
      canvas.dataset.lineCount = String(spectrum.lines.length);
      canvas.dataset.ratioMode = state.ratioMode;
      status.textContent = `${oesProcesses[state.process].label}，功率 ${state.powerW} W；${state.ratioMode === "correct" ? "正確 F / Ar" : "錯誤 F / Si"} 比值 ${ratio.ratio.toFixed(3)}。${ratio.reason} 原子線逐線 NIST 核實；分子帶待來源核對。`;
    },
    reset() {
      Object.assign(state, defaults);
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
    component.render();
  }

  function mountControls() {
    const reset = createButton("重設", () => component.reset());
    reset.setAttribute("aria-label", "重設 A27 OES 參數");
    controls.replaceChildren(
      createSegmentedControl({
        label: "Actinometry 模式",
        options: [{ value: "correct", label: "正確 F / Ar" }, { value: "wrong", label: "錯誤 F / Si" }],
        value: state.ratioMode,
        onChange: (value) => change("ratioMode", value)
      }),
      createSelect({
        label: "製程",
        options: Object.entries(oesProcesses).map(([value, process]) => ({ value, label: process.label })),
        value: state.process,
        onChange: (value) => change("process", value)
      }),
      createSlider({ label: "功率", min: 200, max: 1500, step: 25, value: state.powerW, unit: "W", onInput: (value) => change("powerW", value) }),
      createSlider({ label: "壓力", min: 5, max: 80, step: 1, value: state.pressureMtorr, unit: "mTorr", onInput: (value) => change("pressureMtorr", value) }),
      createSlider({ label: "Ar 內標比例", min: 0.005, max: 0.1, step: 0.005, value: state.argonFraction, formatValue: (value) => `${(value * 100).toFixed(1)}%`, onInput: (value) => change("argonFraction", value) }),
      createSlider({ label: "觀測窗透光率", min: 0.2, max: 1, step: 0.05, value: state.windowTransmission, formatValue: (value) => `${(value * 100).toFixed(0)}%`, onInput: (value) => change("windowTransmission", value) }),
      reset,
      panel
    );
  }

  mountControls();
  component.render();
  observedWidth = canvas.getBoundingClientRect().width;
  resizeObserver = new ResizeObserver(([entry]) => {
    const nextWidth = entry.contentRect.width;
    if (Math.abs(nextWidth - observedWidth) < 0.5) return;
    observedWidth = nextWidth;
    component.render();
  });
  resizeObserver.observe(canvas);
  return component;
}

function drawSpectrum(ctx, state, lines, referenceId) {
  const { theme } = state;
  const metrics = syncCanvasResolution(ctx.canvas);
  const { width, height, isMobile, px } = metrics;
  const plot = {
    left: px(isMobile ? 44 : 58),
    right: width - px(isMobile ? 10 : 22),
    top: px(isMobile ? 32 : 40),
    bottom: height - px(isMobile ? 44 : 58)
  };
  const minWavelength = 200;
  const maxWavelength = 900;
  const maxIntensity = Math.max(...lines.map((line) => line.intensity), 1e-12);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = px(1);
  ctx.strokeRect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top);

  const tickStep = isMobile ? 200 : 100;
  for (let wavelength = 200; wavelength <= 900; wavelength += tickStep) {
    const x = map(wavelength, minWavelength, maxWavelength, plot.left, plot.right);
    ctx.strokeStyle = theme.border;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.muted;
    setCanvasFont(ctx, metrics, isMobile ? 10 : 11);
    ctx.textAlign = "center";
    ctx.fillText(String(wavelength), x, plot.bottom + px(isMobile ? 13 : 18));
  }

  const annotationLimit = isMobile ? 4 : 6;
  const rankedLines = [...lines].sort((a, b) => b.intensity - a.intensity);
  const topIds = new Set(["f-703.7", referenceId]);
  for (const line of rankedLines) {
    if (topIds.size >= annotationLimit) break;
    topIds.add(line.id);
  }
  ctx.canvas.dataset.annotationCount = String(topIds.size);
  let annotationIndex = 0;
  for (const line of lines) {
    const x = map(line.wavelengthNm, minWavelength, maxWavelength, plot.left, plot.right);
    const y = map(line.intensity, 0, maxIntensity, plot.bottom, plot.top + 8);
    const isReference = line.id === referenceId;
    ctx.strokeStyle = isReference ? theme.ion : speciesColor(line.species, theme);
    ctx.lineWidth = px(isReference ? (isMobile ? 3 : 4) : 2);
    ctx.beginPath();
    ctx.moveTo(x, plot.bottom);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (topIds.has(line.id)) {
      ctx.fillStyle = ctx.strokeStyle;
      setCanvasFont(ctx, metrics, 10, 700);
      let labelX = x;
      ctx.textAlign = "center";
      if (isMobile && line.id === "f-703.7") {
        ctx.textAlign = "right";
        labelX -= px(3);
      } else if (isMobile && line.id === referenceId) {
        ctx.textAlign = "left";
        labelX += px(3);
      }
      const laneOffset = isMobile ? (annotationIndex % 2) * 11 : 0;
      ctx.fillText(`${line.species} ${line.wavelengthNm}`, labelX, Math.max(plot.top + px(11 + laneOffset), y - px(5)));
      annotationIndex += 1;
    }
  }

  ctx.textAlign = "left";
  ctx.fillStyle = theme.text;
  setCanvasFont(ctx, metrics, isMobile ? 11 : 14, 700);
  ctx.fillText(`22 線 OES stick spectrum · ${state.ratioMode === "correct" ? "F / Ar" : "F / Si"}`, plot.left, px(isMobile ? 19 : 24));
  ctx.fillStyle = theme.muted;
  setCanvasFont(ctx, metrics, isMobile ? 10 : 12);
  ctx.textAlign = "center";
  ctx.fillText("波長 (nm)", (plot.left + plot.right) / 2, height - px(isMobile ? 10 : 18));
  ctx.textAlign = "left";
}

function updatePanel(panel, lineCount, absoluteF, ratio, electronTemperatureEv) {
  const values = {
    "譜線數": String(lineCount),
    "F 703.7 絕對強度": absoluteF.toExponential(2),
    "Actinometry 比值": ratio.ratio.toFixed(3),
    "電子溫度 Te": `${electronTemperatureEv.toFixed(2)} eV`,
    "比值判定": ratio.valid ? "適用於教學比較" : "錯誤參考線",
    "來源狀態": "原子線逐線 NIST 核實；分子帶待來源核對"
  };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}

function speciesColor(species, theme) {
  if (["F", "O", "Cl", "Br"].includes(species)) return theme.primary;
  if (["Ar", "N2"].includes(species)) return theme.neutral;
  if (["Si", "CO", "CN", "C2"].includes(species)) return theme.ion;
  return theme.electron;
}

function map(value, fromMin, fromMax, toMin, toMax) {
  return toMin + (value - fromMin) / (fromMax - fromMin) * (toMax - toMin);
}

function syncCanvasResolution(canvas) {
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Number.isFinite(rect.width) && rect.width > 0 ? rect.width : canvas.width;
  const cssHeight = Number.isFinite(rect.height) && rect.height > 0 ? rect.height : canvas.height;
  const scale = Math.max(canvas.width / cssWidth, canvas.height / cssHeight);
  const minEffectiveFontCssPx = 10;
  canvas.dataset.minFontCssPx = String(minEffectiveFontCssPx);
  canvas.dataset.cssWidth = cssWidth.toFixed(1);
  return {
    width: canvas.width,
    height: canvas.height,
    isMobile: cssWidth < 500,
    minEffectiveFontCssPx,
    px: (cssPixels) => cssPixels * scale
  };
}

function setCanvasFont(ctx, metrics, cssPixels, weight = 400) {
  const fontSize = Math.max(metrics.minEffectiveFontCssPx, cssPixels);
  ctx.font = `${weight} ${metrics.px(fontSize)}px system-ui`;
}
