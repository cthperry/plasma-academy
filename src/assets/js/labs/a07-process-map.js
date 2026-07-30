import { createSegmentedControl } from "../controls.js";
import { createSvg, linearScale, logScale } from "../plot.js";
import { processCategories, processMapEntries } from "../data/process-map.js";

const SVG_WIDTH = 720;
const SVG_HEIGHT = 410;

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const panel = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const labStage = canvas.closest(".lab-stage");
  const visual = document.createElement("div");
  visual.className = "process-map-visual";
  const toolbar = document.createElement("div");
  toolbar.className = "process-map-toolbar";
  const svg = createSvg("svg", {
    class: "process-map-svg",
    viewBox: `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`,
    role: "img",
    "aria-label": "六大電漿製程的壓力與電子密度對數地圖"
  });
  visual.append(toolbar, svg);
  canvas.replaceWith(visual);
  labStage.classList.add("lab-process-layout");
  panel.classList.add("process-info");

  const state = { category: "all", query: "", selectedId: processMapEntries[0].id };
  const component = {
    start() { render(); },
    stop() {},
    reset() {
      state.category = "all";
      state.query = "";
      state.selectedId = processMapEntries[0].id;
      renderToolbar();
      render();
    },
    destroy() {},
    render,
    applyTheme() { render(); }
  };

  function renderToolbar() {
    toolbar.replaceChildren();
    const filter = createSegmentedControl({
      label: "製程類別",
      value: state.category,
      options: processCategories,
      onChange: (next) => {
        state.category = next;
        chooseVisibleSelection();
        render();
      }
    });
    filter.classList.add("process-map-filter");
    const search = document.createElement("label");
    search.className = "process-map-search";
    search.innerHTML = `<span>搜尋</span><input type="search" value="${escapeAttribute(state.query)}" placeholder="氣體、機台、製程…"><span class="process-map-count" data-process-count></span>`;
    search.querySelector("input").addEventListener("input", (event) => {
      state.query = event.target.value;
      chooseVisibleSelection();
      render();
    });
    toolbar.append(filter, search);
  }

  function render() {
    const entries = visibleEntries(state);
    const count = toolbar.querySelector("[data-process-count]");
    if (count) count.textContent = `${entries.length} / ${processMapEntries.length}`;
    drawMap(svg, entries, state, (id) => {
      state.selectedId = id;
      render();
    });
    renderInfo(panel, processMapEntries.find((entry) => entry.id === state.selectedId) ?? entries[0]);
    status.textContent = entries.length
      ? `顯示 ${entries.length} 類製程；目前選取 ${processMapEntries.find((entry) => entry.id === state.selectedId)?.name ?? "無"}。`
      : "沒有符合目前篩選與搜尋條件的製程。";
  }

  function chooseVisibleSelection() {
    const entries = visibleEntries(state);
    if (!entries.some((entry) => entry.id === state.selectedId)) state.selectedId = entries[0]?.id ?? "";
  }

  renderToolbar();
  render();
  return component;
}

function visibleEntries(state) {
  const query = state.query.trim().toLocaleLowerCase("zh-Hant");
  return processMapEntries.filter((entry) => {
    if (state.category !== "all" && entry.category !== state.category) return false;
    if (!query) return true;
    return [entry.name, entry.purpose, entry.gases, entry.tool, entry.challenge]
      .join(" ")
      .toLocaleLowerCase("zh-Hant")
      .includes(query);
  });
}

function drawMap(svg, entries, state, onSelect) {
  svg.replaceChildren();
  const plot = { x: 76, y: 36, width: 596, height: 300 };
  const xScale = logScale(0.1, 760000, plot.x, plot.x + plot.width);
  const yScale = linearScale(8, 12.5, plot.y + plot.height, plot.y);
  const xTicks = [0.1, 1, 10, 100, 1000, 10000, 100000, 760000];
  const yTicks = [8, 9, 10, 11, 12];
  const grid = createSvg("g", { class: "process-map-grid" });
  for (const value of xTicks) {
    const x = xScale(value);
    grid.append(createSvg("line", { x1: x, y1: plot.y, x2: x, y2: plot.y + plot.height }));
  }
  for (const value of yTicks) {
    const y = yScale(value);
    grid.append(createSvg("line", { x1: plot.x, y1: y, x2: plot.x + plot.width, y2: y }));
  }
  svg.append(grid);

  for (const entry of entries) {
    const x1 = xScale(entry.pressureMinMtorr);
    const x2 = xScale(entry.pressureMaxMtorr);
    const y1 = yScale(entry.densityMaxLog);
    const y2 = yScale(entry.densityMinLog);
    const group = createSvg("g", {
      class: `process-map-region${entry.id === state.selectedId ? " selected" : ""}`,
      "data-process-id": entry.id,
      "data-category": entry.category,
      role: "button",
      tabindex: "0",
      "aria-label": `${entry.name}，壓力 ${entry.pressure}`
    });
    group.append(createSvg("rect", {
      x: x1,
      y: y1,
      width: Math.max(42, x2 - x1),
      height: Math.max(34, y2 - y1),
      rx: 4
    }));
    const text = createSvg("text", { x: x1 + 7, y: y1 + 18 });
    text.textContent = entry.name;
    group.append(text);
    group.addEventListener("click", () => onSelect(entry.id));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(entry.id);
      }
    });
    svg.append(group);
  }
  drawAxes(svg, plot, xScale, yScale, xTicks, yTicks);
  if (!entries.length) {
    const text = createSvg("text", { x: plot.x + plot.width / 2, y: plot.y + plot.height / 2, class: "process-map-empty", "text-anchor": "middle" });
    text.textContent = "沒有符合條件的製程";
    svg.append(text);
  }
}

function drawAxes(svg, plot, xScale, yScale, xTicks, yTicks) {
  const axes = createSvg("g", { class: "process-map-axis" });
  axes.append(createSvg("line", { x1: plot.x, y1: plot.y + plot.height, x2: plot.x + plot.width, y2: plot.y + plot.height }));
  axes.append(createSvg("line", { x1: plot.x, y1: plot.y, x2: plot.x, y2: plot.y + plot.height }));
  for (const value of xTicks) {
    const x = xScale(value);
    const label = createSvg("text", { x, y: plot.y + plot.height + 20, "text-anchor": "middle" });
    label.textContent = pressureTick(value);
    axes.append(label);
  }
  for (const value of yTicks) {
    const y = yScale(value);
    const label = createSvg("text", { x: plot.x - 10, y: y + 4, "text-anchor": "end" });
    label.textContent = `10^${value}`;
    axes.append(label);
  }
  const xLabel = createSvg("text", { x: plot.x + plot.width, y: 392, "text-anchor": "end" });
  xLabel.textContent = "壓力 p（mTorr，對數）";
  const yLabel = createSvg("text", { x: plot.x, y: 22 });
  yLabel.textContent = "電子密度 nₑ（cm⁻³，對數）";
  axes.append(xLabel, yLabel);
  svg.append(axes);
}

function renderInfo(panel, entry) {
  panel.replaceChildren();
  if (!entry) {
    panel.innerHTML = "<p>請調整篩選條件。</p>";
    return;
  }
  const title = document.createElement("h3");
  title.textContent = entry.name;
  const description = document.createElement("p");
  description.textContent = entry.purpose;
  const details = document.createElement("dl");
  const rows = [
    ["典型氣體", entry.gases],
    ["壓力範圍", entry.pressure],
    ["功率範圍", entry.power],
    ["機台型式", entry.tool],
    ["關鍵挑戰", entry.challenge]
  ];
  for (const [label, value] of rows) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    details.append(dt, dd);
  }
  const link = document.createElement("a");
  link.className = "button primary";
  link.href = entry.link.href;
  link.textContent = entry.link.label;
  panel.append(title, description, details, link);
}

function pressureTick(value) {
  if (value < 1000) return `${value}m`;
  if (value === 760000) return "760T";
  return `${value / 1000}T`;
}

function escapeAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
