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
