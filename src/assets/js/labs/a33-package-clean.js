import { createSegmentedControl, createSelect, createSlider, createValuePanel } from "../controls.js";
import { clearSvg, createSvg, drawAxes, drawLegend, drawLine, linearScale } from "../plot.js";
import { evaluatePackageTreatment, packageGases, packageMaterials } from "../package-model.js";

const presets = {
  mold: { label: "封膠前活化", gas: "o2", material: "emc", power: 300, pressure: 0.4, time: 60, wait: 0, mode: "lp" },
  bond: { label: "打線前 pad", gas: "h2ar", material: "cu", power: 250, pressure: 0.4, time: 60, wait: 0, mode: "lp" },
  flux: { label: "助焊劑殘留", gas: "o2", material: "sm", power: 300, pressure: 0.5, time: 45, wait: 0, mode: "lp" },
  inline: { label: "大氣 inline", gas: "n2", material: "emc", power: 300, pressure: 760, time: 45, wait: 0, mode: "atm" }
};

export function init(container) {
  const stage = container.querySelector(".lab-stage");
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const visual = document.createElement("div");
  visual.className = "package-clean-visual";
  visual.innerHTML = `<svg viewBox="0 0 720 390" role="img" aria-label="封裝清潔接觸角與接著力隨處理時間變化"></svg><div class="package-clean-context" data-package-context></div>`;
  canvas.replaceWith(visual);
  stage.classList.add("lab-stage--package-clean");
  const svg = visual.querySelector("svg");
  const context = visual.querySelector("[data-package-context]");
  const state = { preset: "mold", ...presets.mold };
  const panel = createValuePanel([
    ["接觸角", "—"], ["表面能", "—"], ["接著力指數", "—"], ["基材損傷", "—"],
    ["金屬氧化", "—"], ["Queue time", "—"], ["判定", "—"]
  ]);

  const component = {
    render() {
      const result = evaluatePackageTreatment(state);
      drawTreatmentPlot(svg, state);
      updatePanel(panel, result);
      context.innerHTML = `<strong>${presets[state.preset]?.label ?? "自訂條件"}</strong><span>${result.gas.label} · ${result.material.label} · ${state.mode === "atm" ? "大氣電漿" : "低壓電漿"}</span><p>${result.gas.note} ${result.material.note}</p>`;
      status.textContent = `${result.verdict} 接觸角 ${result.angle.toFixed(0)}°、接著力指數 ${result.adhesion.toFixed(2)}、累積損傷 ${(result.damage * 100).toFixed(0)}%。教材模型只用於比較趨勢，實際放行須依材料、設備與可靠度規範。`;
    },
    start() { this.render(); },
    stop() {},
    reset() { Object.assign(state, { preset: "mold", ...presets.mold }); renderControls(); this.render(); },
    destroy() {}
  };

  function setState(key, value) {
    state[key] = value;
    state.preset = "custom";
    const presetGroup = controls.querySelector(".segmented-group");
    for (const button of presetGroup?.querySelectorAll("button") ?? []) {
      button.classList.remove("is-active");
      button.setAttribute("aria-pressed", "false");
    }
    component.render();
  }

  function renderControls() {
    controls.replaceChildren(
      createSegmentedControl({ label: "現場情境", options: Object.entries(presets).map(([value, item]) => ({ value, label: item.label })), value: state.preset, onChange: (value) => { Object.assign(state, { preset: value, ...presets[value] }); renderControls(); component.render(); } }),
      createSelect({ label: "氣體", options: packageGases.map((item) => ({ value: item.id, label: `${item.label} ${item.name}` })), value: state.gas, onChange: (value) => setState("gas", value) }),
      createSelect({ label: "材料", options: packageMaterials.map((item) => ({ value: item.id, label: item.label })), value: state.material, onChange: (value) => setState("material", value) }),
      createSegmentedControl({ label: "電漿模式", options: [{ value: "lp", label: "低壓" }, { value: "atm", label: "大氣" }], value: state.mode, onChange: (value) => { setState("mode", value); renderControls(); } }),
      createSlider({ label: "功率", min: 50, max: 600, value: state.power, step: 10, unit: "W", onInput: (value) => setState("power", value) }),
      createSlider({ label: "壓力", min: 0.1, max: 1, value: state.mode === "atm" ? 0.4 : state.pressure, step: 0.05, formatValue: (value) => state.mode === "atm" ? "大氣 760 Torr" : `${value.toFixed(2)} Torr`, onInput: (value) => setState("pressure", value) }),
      createSlider({ label: "處理時間", min: 0, max: state.mode === "atm" ? 150 : 240, value: state.time, step: 5, unit: "s", onInput: (value) => setState("time", value) }),
      createSlider({ label: "Clean-to-bond 等待", min: 0, max: 72, value: state.wait, step: 1, unit: "h", onInput: (value) => setState("wait", value) }),
      panel
    );
  }

  renderControls();
  component.render();
  return component;
}

function drawTreatmentPlot(svg, state) {
  clearSvg(svg);
  const plot = { x: 62, y: 42, width: 620, height: 286 };
  const maxTime = state.mode === "atm" ? 150 : 240;
  const xScale = linearScale(0, maxTime, plot.x, plot.x + plot.width);
  const yScale = linearScale(0, 90, plot.y + plot.height, plot.y);
  drawAxes(svg, {
    ...plot,
    xLabel: "處理時間 (s)",
    yLabel: "接觸角 (°) / 接著力 ×30",
    xTicks: [0, 0.25, 0.5, 0.75, 1].map((fraction) => ({ x: xScale(maxTime * fraction), label: String(Math.round(maxTime * fraction)) })),
    yTicks: [0, 30, 60, 90].map((value) => ({ y: yScale(value), label: String(value) }))
  });
  const anglePoints = [];
  const adhesionPoints = [];
  for (let time = 0; time <= maxTime; time += 3) {
    const result = evaluatePackageTreatment({ ...state, time, wait: 0 });
    anglePoints.push([xScale(time), yScale(result.angle)]);
    adhesionPoints.push([xScale(time), yScale(result.adhesion * 30)]);
  }
  const specY = yScale(30);
  svg.append(createSvg("line", { x1: plot.x, y1: specY, x2: plot.x + plot.width, y2: specY, class: "package-spec-line" }));
  drawLine(svg, { points: anglePoints, className: "plot-line package-angle-line" });
  drawLine(svg, { points: adhesionPoints, className: "plot-line package-adhesion-line" });
  const current = evaluatePackageTreatment(state);
  svg.append(createSvg("circle", { cx: xScale(state.time), cy: yScale(current.angle), r: 5, class: "package-angle-point" }));
  svg.append(createSvg("circle", { cx: xScale(state.time), cy: yScale(current.adhesion * 30), r: 5, class: "package-adhesion-point" }));
  drawLegend(svg, [
    { label: "接觸角", className: "plot-line package-angle-line" },
    { label: "接著力 ×30", className: "plot-line package-adhesion-line" }
  ], { x: 465, y: 360 });
}

function updatePanel(panel, result) {
  const values = {
    "接觸角": `${result.angle.toFixed(0)}°`,
    "表面能": `${result.gamma.toFixed(1)} mN/m`,
    "接著力指數": `${result.adhesion.toFixed(2)}×`,
    "基材損傷": `${(result.damage * 100).toFixed(0)}%`,
    "金屬氧化": result.material.metal ? `${(result.oxide * 100).toFixed(0)}%` : "不適用",
    "Queue time": result.queueHours === Infinity ? "不受 30° 限制" : result.queueHours < 1 ? "尚未達標" : `${result.queueHours.toFixed(0)} h`,
    "判定": result.verdict
  };
  for (const item of panel.querySelectorAll("dd")) item.textContent = values[item.dataset.valueKey];
}
