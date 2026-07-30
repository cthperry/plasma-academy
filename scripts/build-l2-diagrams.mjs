import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { l2Diagrams } from "../src/data/l2-diagrams.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "src", "assets", "svg", "l2");
await mkdir(out, { recursive: true });
for (const entry of l2Diagrams) await writeFile(path.join(out, `${entry.id}.svg`), renderDiagram(entry));
console.log(`已產生 ${l2Diagrams.length} 張 L2 SVG 圖解。`);

function renderDiagram(entry) {
  const content = entry.type === "flow" ? renderFlow(entry.items)
    : entry.type === "compare" ? renderCompare(entry.items)
      : entry.type === "plot" ? renderPlot(entry.items)
        : renderScale(entry.items);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="360" viewBox="0 0 760 360" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(entry.title)}</title><desc id="desc">${escapeXml(entry.caption)} ${escapeXml(entry.note)}</desc>
  <style>.bg{fill:#fff}.panel{fill:#f2f5f8;stroke:#b7c1cc}.line{fill:none;stroke:#0f6fd6;stroke-width:3}.line2{fill:none;stroke:#c02626;stroke-width:3}.axis{stroke:#4a5560;stroke-width:1.5}.title{fill:#1a1f26;font:700 22px system-ui,sans-serif}.label{fill:#1a1f26;font:700 15px system-ui,sans-serif}.small{fill:#4a5560;font:14px system-ui,sans-serif}.note{fill:#4a5560;font:13px system-ui,sans-serif}.accent{fill:#0f6fd6}.success{fill:#1a7f4b}.border{fill:none;stroke:#d9e0e8}@media(prefers-color-scheme:dark){.bg{fill:#161b22}.panel{fill:#0b0e13;stroke:#3d4753}.title,.label{fill:#e6edf3}.small,.note{fill:#9aa7b4}.axis{stroke:#9aa7b4}.line{stroke:#4d9df0}.line2{stroke:#f0685f}.border{stroke:#2a323c}}</style>
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="accent"/></marker></defs>
  <rect class="bg" width="760" height="360" rx="8"/><rect class="border" x="1" y="1" width="758" height="358" rx="8"/><text class="title" x="34" y="44">${escapeXml(entry.title)}</text>${content}<text class="note" x="34" y="334">${escapeXml(entry.note)}</text></svg>`;
}

function renderFlow(items) {
  const width = 158;
  return items.map((item, index) => {
    const x = 34 + index * 180;
    const arrow = index < items.length - 1 ? `<path class="line" d="M${x + width} 178 H${x + 175}" marker-end="url(#arrow)"/>` : "";
    return `<rect class="panel" x="${x}" y="112" width="${width}" height="132" rx="6"/><circle class="accent" cx="${x + 22}" cy="136" r="10"/><text class="small" x="${x + 16}" y="172">${wrap(item, x + 16, 172, 17)}</text>${arrow}`;
  }).join("");
}

function renderCompare(items) {
  return items.map((item, index) => {
    const [heading, ...details] = item.split("｜");
    const x = index === 0 ? 34 : 395;
    return `<rect class="panel" x="${x}" y="92" width="331" height="190" rx="6"/><rect class="${index ? "success" : "accent"}" x="${x}" y="92" width="8" height="190"/><text class="label" x="${x + 24}" y="126">${escapeXml(heading)}</text>${details.map((detail, i) => `<text class="small" x="${x + 24}" y="${164 + i * 34}">${escapeXml(detail)}</text>`).join("")}`;
  }).join("");
}

function renderScale(items) {
  return items.map((item, index) => {
    const [heading, middle, detail] = item.split("｜");
    const y = 88 + index * 64;
    return `<text class="label" x="34" y="${y + 24}">${escapeXml(heading)}</text><rect class="panel" x="190" y="${y}" width="536" height="46" rx="5"/><rect class="accent" x="190" y="${y}" width="${170 + index * 105}" height="46" rx="5" opacity="${0.35 + index * 0.2}"/><text class="small" x="206" y="${y + 19}">${escapeXml(middle ?? "")}</text><text class="small" x="206" y="${y + 38}">${escapeXml(detail ?? "")}</text>`;
  }).join("");
}

function renderPlot(items) {
  const [xLabel, yLabel, first, second] = items;
  return `<path class="axis" d="M92 274 V82 M92 274 H704"/><text class="small" x="610" y="302">${escapeXml(xLabel)}</text><text class="small" transform="translate(28 214) rotate(-90)">${escapeXml(yLabel)}</text><path class="line" d="M106 250 C180 246 222 206 290 142 S430 96 506 142 S610 236 690 252"/><path class="line2" d="M106 252 C220 248 318 230 398 196 S554 128 690 112"/><text class="small" x="128" y="116">${escapeXml(first)}</text><text class="small" x="474" y="102">${escapeXml(second)}</text>`;
}

function wrap(value, x, y, maxChars) {
  const chunks = String(value).match(new RegExp(`.{1,${maxChars}}`, "g")) ?? [value];
  return chunks.slice(0, 4).map((chunk, index) => `<tspan x="${x}" y="${y + index * 24}">${escapeXml(chunk)}</tspan>`).join("");
}

function escapeXml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" })[char]);
}
