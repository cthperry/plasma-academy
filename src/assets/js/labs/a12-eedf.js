import { createSegmentedControl, createSelect, createSlider, createValuePanel } from "../controls.js";
import { createSvg, clearSvg, drawAxes, drawLegend, drawLine, linearScale, logScale } from "../plot.js";
import { eedfGases, eedfReactionModel } from "../plasma-model.js";

export function init(container) {
  const stage = container.querySelector(".lab-stage");
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const visual = document.createElement("div");
  visual.className = "eedf-visual";
  visual.innerHTML = `<svg viewBox="0 0 720 420" role="img" aria-label="EEDF、反應截面與重疊區曲線"></svg><div class="eedf-rate-bars" aria-label="相對反應率"></div>`;
  canvas.replaceWith(visual);
  stage.classList.add("lab-stage--eedf");
  const svg = visual.querySelector("svg");
  const bars = visual.querySelector(".eedf-rate-bars");
  const state = { electronTemperatureEv: 3, distribution: "maxwellian", gas: "Ar" };
  const panel = createValuePanel([["游離率 kᵢ", "—"], ["激發率 kₑₓ", "—"], ["解離率 k_d", "—"], ["相對 2 eV", "—"]]);

  const component = {
    render() {
      const model = eedfReactionModel(state);
      const baseline = eedfReactionModel({ ...state, electronTemperatureEv: 2, distribution: "maxwellian" });
      drawEedf(svg, model);
      drawRates(bars, model.rates);
      updatePanel(panel, model.rates, baseline.rates.ionization);
      const distributionLabel = state.distribution === "maxwellian" ? "Maxwellian" : "Druyvesteyn";
      status.textContent = `${eedfGases[state.gas].label}、Tₑ=${state.electronTemperatureEv.toFixed(1)} eV、${distributionLabel}：游離閾值 ${model.thresholds.ionization} eV。反應率來自截面與高能尾端的重疊積分，不是平均能量單點。`;
    },
    start() { this.render(); },
    stop() {},
    reset() {},
    destroy() {}
  };

  controls.replaceChildren(
    createSlider({ label: "電子溫度 Tₑ", min: 1, max: 8, value: state.electronTemperatureEv, step: 0.25, unit: "eV", formatValue: (value) => `${value.toFixed(2)} eV`, onInput: (value) => { state.electronTemperatureEv = value; component.render(); } }),
    createSegmentedControl({ label: "EEDF 型式", options: [{ value: "maxwellian", label: "Maxwellian" }, { value: "druyvesteyn", label: "Druyvesteyn" }], value: state.distribution, onChange: (value) => { state.distribution = value; component.render(); } }),
    createSelect({ label: "氣體", options: Object.entries(eedfGases).map(([value, item]) => ({ value, label: item.label })), value: state.gas, onChange: (value) => { state.gas = value; component.render(); } }),
    panel
  );
  component.render();
  return component;
}

function drawEedf(svg, model) {
  clearSvg(svg);
  const plot = { x: 62, y: 42, width: 620, height: 305 };
  const xScale = linearScale(0, 40, plot.x, plot.x + plot.width);
  const yScale = logScale(1e-8, 0.3, plot.y + plot.height, plot.y);
  const maxCrossSection = Math.max(...model.points.flatMap((point) => [point.ionizationCrossSection, point.excitationCrossSection]));
  const crossScale = linearScale(0, maxCrossSection, plot.y + plot.height, plot.y + 42);
  const maxOverlap = Math.max(...model.points.map((point) => point.ionizationOverlap), Number.EPSILON);
  const eedfPoints = model.points.map((point) => [xScale(point.energyEv), yScale(Math.max(point.probability, 1e-8))]);
  const ionPoints = model.points.map((point) => [xScale(point.energyEv), crossScale(point.ionizationCrossSection)]);
  const excitePoints = model.points.map((point) => [xScale(point.energyEv), crossScale(point.excitationCrossSection)]);
  const overlapTop = model.points.map((point) => [xScale(point.energyEv), linearScale(0, maxOverlap, plot.y + plot.height, plot.y + 80)(point.ionizationOverlap)]);

  drawAxes(svg, {
    ...plot,
    xLabel: "電子能量 E (eV)",
    yLabel: "EEDF (log) / 截面（正規化）",
    xTicks: [0, 10, 20, 30, 40].map((value) => ({ x: xScale(value), label: String(value) })),
    yTicks: [1e-6, 1e-4, 1e-2].map((value) => ({ y: yScale(value), label: value.toExponential(0) }))
  });

  const overlapPath = [
    `M${overlapTop[0][0]},${plot.y + plot.height}`,
    ...overlapTop.map(([x, y]) => `L${x},${y}`),
    `L${overlapTop.at(-1)[0]},${plot.y + plot.height}Z`
  ].join(" ");
  svg.append(createSvg("path", { d: overlapPath, class: "eedf-overlap" }));
  drawLine(svg, { points: eedfPoints, className: "plot-line eedf-distribution" });
  drawLine(svg, { points: ionPoints, className: "plot-line eedf-ionization" });
  drawLine(svg, { points: excitePoints, className: "plot-line eedf-excitation" });

  for (const [label, value, className] of [["游離閾值", model.thresholds.ionization, "ion"], ["激發閾值", model.thresholds.excitation, "excite"]]) {
    const x = xScale(value);
    svg.append(createSvg("line", { x1: x, y1: plot.y, x2: x, y2: plot.y + plot.height, class: `eedf-threshold ${className}` }));
    const text = createSvg("text", { x: x + 5, y: plot.y + 16, class: "eedf-threshold-label" });
    text.textContent = `${label} ${value} eV`;
    svg.append(text);
  }
  drawLegend(svg, [
    { label: "EEDF f(E)", className: "plot-line eedf-distribution" },
    { label: "游離截面 σiz", className: "plot-line eedf-ionization" },
    { label: "激發截面 σex", className: "plot-line eedf-excitation" }
  ], { x: 470, y: 374 });
}

function drawRates(element, rates) {
  const items = [["游離", rates.ionization, "ionization"], ["激發", rates.excitation, "excitation"], ["解離", rates.dissociation, "dissociation"]];
  const max = Math.max(...items.map((item) => item[1]), Number.EPSILON);
  element.innerHTML = items.map(([label, value, className]) => `<div><span>${label}</span><i class="${className}" style="width:${Math.max(1, value / max * 100)}%"></i><output>${value.toExponential(2)} a.u.</output></div>`).join("");
}

function updatePanel(panel, rates, baselineIonization) {
  const values = {
    "游離率 kᵢ": rates.ionization.toExponential(2),
    "激發率 kₑₓ": rates.excitation.toExponential(2),
    "解離率 k_d": rates.dissociation.toExponential(2),
    "相對 2 eV": `${(rates.ionization / Math.max(baselineIonization, Number.EPSILON)).toFixed(1)}×`
  };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}
