export function createSvg(tag, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

export function linePath(points) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point[0]},${point[1]}`).join(" ");
}

export function axis(svg, { x, y, width, height, label }) {
  svg.append(createSvg("line", { x1: x, y1: y + height, x2: x + width, y2: y + height, stroke: "currentColor", "stroke-width": 1.5 }));
  svg.append(createSvg("line", { x1: x, y1: y, x2: x, y2: y + height, stroke: "currentColor", "stroke-width": 1.5 }));
  svg.append(createSvg("text", { x: x + width, y: y + height + 18, "text-anchor": "end" })).textContent = label;
}

export function clearSvg(svg) {
  svg.replaceChildren();
}

export function linearScale(domainMin, domainMax, rangeMin, rangeMax) {
  const span = domainMax - domainMin || 1;
  return (value) => rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin);
}

export function logScale(domainMin, domainMax, rangeMin, rangeMax) {
  const safeMin = Math.log10(Math.max(domainMin, Number.MIN_VALUE));
  const safeMax = Math.log10(Math.max(domainMax, domainMin * 10));
  const span = safeMax - safeMin || 1;
  return (value) => rangeMin + ((Math.log10(Math.max(value, Number.MIN_VALUE)) - safeMin) / span) * (rangeMax - rangeMin);
}

export function drawAxes(svg, { x, y, width, height, xLabel, yLabel, xTicks = [], yTicks = [] }) {
  const group = createSvg("g", { class: "plot-axes" });
  group.append(createSvg("line", { x1: x, y1: y + height, x2: x + width, y2: y + height }));
  group.append(createSvg("line", { x1: x, y1: y, x2: x, y2: y + height }));

  for (const tick of xTicks) {
    group.append(createSvg("line", { x1: tick.x, y1: y + height, x2: tick.x, y2: y + height + 5 }));
    const text = createSvg("text", { x: tick.x, y: y + height + 18, "text-anchor": "middle" });
    text.textContent = tick.label;
    group.append(text);
  }

  for (const tick of yTicks) {
    group.append(createSvg("line", { x1: x - 5, y1: tick.y, x2: x, y2: tick.y }));
    const text = createSvg("text", { x: x - 8, y: tick.y + 4, "text-anchor": "end" });
    text.textContent = tick.label;
    group.append(text);
  }

  const xText = createSvg("text", { x: x + width, y: y + height + 34, "text-anchor": "end" });
  xText.textContent = xLabel;
  const yText = createSvg("text", { x, y: y - 10, "text-anchor": "start" });
  yText.textContent = yLabel;
  group.append(xText, yText);
  svg.append(group);
}

export function drawLine(svg, { points, className = "plot-line" }) {
  const path = createSvg("path", { class: className, d: linePath(points), fill: "none" });
  svg.append(path);
  return path;
}

export function drawLegend(svg, items, { x, y }) {
  const group = createSvg("g", { class: "plot-legend" });
  items.forEach((item, index) => {
    const rowY = y + index * 18;
    group.append(createSvg("line", { x1: x, y1: rowY, x2: x + 18, y2: rowY, class: item.className ?? "plot-line" }));
    const text = createSvg("text", { x: x + 24, y: rowY + 4 });
    text.textContent = item.label;
    group.append(text);
  });
  svg.append(group);
}
