import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { l1Diagrams } from "../src/data/l1-diagrams.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "src", "assets", "svg", "l1");
await mkdir(out, { recursive: true });

for (const entry of l1Diagrams) {
  await writeFile(path.join(out, `${entry.id}.svg`), renderDiagram(entry));
}

console.log(`已產生 ${l1Diagrams.length} 張 L1 SVG 圖解。`);

function renderDiagram(entry) {
  const content = entry.type === "flow" ? renderFlow(entry.items)
    : entry.type === "compare" ? renderCompare(entry.items)
      : entry.type === "plot" ? renderPlot(entry)
        : renderScale(entry);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="360" viewBox="0 0 760 360" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(entry.title)}</title>
  <desc id="desc">${escapeXml(entry.caption)} ${escapeXml(entry.note)}</desc>
  <style>
    .bg{fill:#fff}.panel{fill:#f2f5f8;stroke:#b7c1cc}.line{fill:none;stroke:#0f6fd6;stroke-width:3}.muted-line{fill:none;stroke:#8a95a3;stroke-width:2}.axis{stroke:#4a5560;stroke-width:1.5}.title{fill:#1a1f26;font:700 22px system-ui,sans-serif}.label{fill:#1a1f26;font:700 15px system-ui,sans-serif}.small{fill:#4a5560;font:14px system-ui,sans-serif}.note{fill:#4a5560;font:13px system-ui,sans-serif}.accent{fill:#0f6fd6}.success{fill:#1a7f4b}.warning{fill:#8a5500}.border{fill:none;stroke:#d9e0e8}
    @media(prefers-color-scheme:dark){.bg{fill:#161b22}.panel{fill:#0b0e13;stroke:#3d4753}.title,.label{fill:#e6edf3}.small,.note{fill:#9aa7b4}.axis{stroke:#9aa7b4}.line{stroke:#4d9df0}.border{stroke:#2a323c}}
  </style>
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="accent"/></marker></defs>
  <rect class="bg" width="760" height="360" rx="8"/><rect class="border" x="1" y="1" width="758" height="358" rx="8"/>
  <text class="title" x="34" y="44">${escapeXml(entry.title)}</text>
  ${content}
  <text class="note" x="34" y="334">${escapeXml(entry.note)}</text>
</svg>`;
}

function renderFlow(items) {
  const width = 158;
  const gap = 22;
  return items.map((item, index) => {
    const x = 34 + index * (width + gap);
    const arrow = index < items.length - 1 ? `<path class="line" d="M${x + width} 178 H${x + width + gap - 5}" marker-end="url(#arrow)"/>` : "";
    return `<rect class="panel" x="${x}" y="112" width="${width}" height="132" rx="6"/><circle class="accent" cx="${x + 22}" cy="136" r="10"/><text class="small" x="${x + 16}" y="176">${wrapText(item, x + 16, 176, 18)}</text>${arrow}`;
  }).join("");
}

function renderCompare(items) {
  return items.map((item, index) => {
    const [heading, ...details] = item.split("｜");
    const x = index === 0 ? 34 : 395;
    return `<rect class="panel" x="${x}" y="92" width="331" height="190" rx="6"/><rect class="${index === 0 ? "accent" : "success"}" x="${x}" y="92" width="8" height="190" rx="4"/><text class="label" x="${x + 24}" y="128">${escapeXml(heading)}</text>${details.map((detail, detailIndex) => `<text class="small" x="${x + 24}" y="${166 + detailIndex * 34}">${escapeXml(detail)}</text>`).join("")}`;
  }).join("");
}

function renderScale(entry) {
  const glowWidths = [150, 510, 120, 300];
  const items = entry.items;
  return items.map((item, index) => {
    const [heading, middle, detail] = item.split("｜");
    const y = 88 + index * 60;
    const barWidth = entry.id === "l1-23" ? glowWidths[index] : Math.min(520, 180 + index * 90);
    return `<text class="label" x="34" y="${y + 22}">${escapeXml(heading)}</text><rect class="panel" x="190" y="${y}" width="536" height="42" rx="5"/><rect class="accent" x="190" y="${y}" width="${barWidth}" height="42" rx="5" opacity="${0.35 + index * 0.17}"/><text class="small" x="206" y="${y + 18}">${escapeXml(middle ?? "")}</text><text class="small" x="206" y="${y + 36}">${escapeXml(detail ?? "")}</text>`;
  }).join("");
}

function renderPlot(entry) {
  const [xLabel, yLabel, first, second] = entry.items;
  const axes = `<path class="axis" d="M92 274 V82 M92 274 H704"/><text class="small" x="646" y="300">${escapeXml(xLabel)}</text><text class="small" transform="translate(28 174) rotate(-90)">${escapeXml(yLabel)}</text>`;
  if (entry.id === "l1-10") {
    return `${axes}<path class="line" d="M104 102 C160 118 198 174 246 212 S390 258 694 266"/><path class="muted-line" d="M104 102 C244 108 358 134 470 178 S610 232 694 250"/><text class="small" x="252" y="206">${escapeXml(first)}</text><text class="small" x="492" y="170">${escapeXml(second)}</text>`;
  }
  if (entry.id === "l1-14") {
    return `${axes}<path class="line" d="M106 104 L690 254"/><circle class="accent" cx="106" cy="104" r="6"/><circle class="accent" cx="300" cy="154" r="6"/><circle class="accent" cx="690" cy="254" r="6"/><text class="small" x="126" y="112">${escapeXml(first)}</text><text class="small" x="486" y="244">${escapeXml(second)}</text>`;
  }
  if (entry.id === "l1-15") {
    return `${axes}<path class="line" d="M104 262 C170 258 184 150 260 132 S374 180 438 236"/><path class="muted-line" d="M104 266 C254 264 276 218 342 142 S514 106 690 210"/><line class="axis" x1="190" y1="274" x2="190" y2="116" stroke-dasharray="4 4"/><line class="axis" x1="318" y1="274" x2="318" y2="116" stroke-dasharray="4 4"/><text class="small" x="126" y="118">${escapeXml(first)}</text><text class="small" x="414" y="104">${escapeXml(second)}</text>`;
  }
  return `${axes}<path class="line" d="M106 116 C176 246 254 254 338 258 S498 248 690 112"/><circle class="accent" cx="350" cy="258" r="7"/><text class="small" x="118" y="102">${escapeXml(first)}</text><text class="small" x="510" y="102">${escapeXml(second)}</text><text class="small" x="320" y="244">Vmin</text>`;
}

function wrapText(value, x, y, maxChars) {
  const chunks = String(value).match(new RegExp(`.{1,${maxChars}}`, "g")) ?? [value];
  return chunks.slice(0, 4).map((chunk, index) => `<tspan x="${x}" y="${y + index * 24}">${escapeXml(chunk)}</tspan>`).join("");
}

function escapeXml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" })[char]);
}
