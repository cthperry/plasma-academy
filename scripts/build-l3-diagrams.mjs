import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { l3Diagrams } from "../src/data/l3-diagrams.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "src", "assets", "svg", "l3");
await mkdir(out, { recursive: true });
for (const entry of l3Diagrams) await writeFile(path.join(out, `${entry.id}.svg`), renderDiagram(entry));
console.log(`已產生 ${l3Diagrams.length} 張 L3 SVG 圖解。`);

function renderDiagram(entry) {
  const renderers = { flow: renderFlow, compare: renderCompare, plot: renderPlot, profile: renderProfile, wafer: renderWafer };
  const content = (renderers[entry.type] ?? renderFlow)(entry.items);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="360" viewBox="0 0 760 360" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(entry.title)}</title><desc id="desc">${escapeXml(entry.caption)} ${escapeXml(entry.note)}</desc>
  <style>.bg{fill:#fff}.panel{fill:#f2f5f8;stroke:#b7c1cc}.line{fill:none;stroke:#7040c0;stroke-width:3}.line2{fill:none;stroke:#c02626;stroke-width:3}.axis{stroke:#4a5560;stroke-width:1.5}.title{fill:#1a1f26;font:700 22px system-ui,sans-serif}.label{fill:#1a1f26;font:700 15px system-ui,sans-serif}.small{fill:#4a5560;font:14px system-ui,sans-serif}.note{fill:#4a5560;font:13px system-ui,sans-serif}.accent{fill:#7040c0}.accent2{fill:#0f6fd6}.material{fill:#9aa6b5;stroke:#52657d}.void{fill:#fff;stroke:#7040c0;stroke-width:3}.wafer{fill:#e6edf3;stroke:#52657d;stroke-width:2}.border{fill:none;stroke:#d9e0e8}@media(prefers-color-scheme:dark){.bg{fill:#161b22}.panel{fill:#0b0e13;stroke:#3d4753}.title,.label{fill:#e6edf3}.small,.note{fill:#9aa7b4}.axis{stroke:#9aa7b4}.line{stroke:#a882f0}.line2{stroke:#f0685f}.material{fill:#52657d;stroke:#9aa7b4}.void{fill:#161b22;stroke:#a882f0}.wafer{fill:#0b0e13;stroke:#9aa7b4}.border{stroke:#2a323c}}</style>
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="accent"/></marker><radialGradient id="heat"><stop offset="0" stop-color="#f05a45"/><stop offset=".5" stop-color="#f1c232"/><stop offset="1" stop-color="#286ec7"/></radialGradient></defs>
  <rect class="bg" width="760" height="360" rx="8"/><rect class="border" x="1" y="1" width="758" height="358" rx="8"/><text class="title" x="34" y="44">${escapeXml(entry.title)}</text>${content}<text class="note" x="34" y="334">${escapeXml(entry.note)}</text></svg>`;
}

function renderFlow(items) {
  return items.map((item, index) => { const x = 34 + index * 180; const arrow = index < items.length - 1 ? `<path class="line" d="M192 178 H${x + 175}" marker-end="url(#arrow)"/>`.replace("M192", `M${x + 158}`) : ""; return `<rect class="panel" x="${x}" y="112" width="158" height="132" rx="6"/><circle class="accent" cx="${x + 22}" cy="136" r="10"/><text class="small" x="${x + 16}" y="172">${wrap(item, x + 16, 172, 16)}</text>${arrow}`; }).join("");
}

function renderCompare(items) {
  return items.map((item, index) => { const [heading, ...details] = item.split("｜"); const x = index ? 395 : 34; return `<rect class="panel" x="${x}" y="92" width="331" height="190" rx="6"/><rect class="${index ? "accent2" : "accent"}" x="${x}" y="92" width="8" height="190"/><text class="label" x="${x + 24}" y="126">${escapeXml(heading)}</text>${details.map((detail, i) => `<text class="small" x="${x + 24}" y="${164 + i * 34}">${escapeXml(detail)}</text>`).join("")}`; }).join("");
}

function renderPlot(items) {
  const [xLabel, yLabel, first, second] = items;
  return `<path class="axis" d="M92 274 V82 M92 274 H704"/><text class="small" x="570" y="302">${escapeXml(xLabel)}</text><text class="small" transform="translate(28 235) rotate(-90)">${escapeXml(yLabel)}</text><path class="line" d="M106 252 C190 242 234 168 318 116 S506 112 690 250"/><path class="line2" d="M106 250 C246 248 362 232 462 178 S602 116 690 104"/><text class="small" x="122" y="104">${escapeXml(first)}</text><text class="small" x="478" y="94">${escapeXml(second)}</text>`;
}

function renderProfile(items) {
  const [kind, first, second] = items;
  if (kind === "racetrack") {
    return `<text class="label" x="118" y="86">新靶</text><rect class="material" x="56" y="112" width="288" height="92" rx="4"/><path class="line" d="M80 126 H320"/><text class="label" x="476" y="86">耗損靶</text><path class="material" d="M416 112 H704 V204 H416Z"/><path class="void" d="M440 112 H680 C634 116 626 180 560 180 S486 116 440 112Z"/><path class="line2" d="M452 122 Q502 192 560 180 Q626 192 668 122"/><text class="small" x="104" y="240">${escapeXml(first)}</text><text class="small" x="452" y="240">${escapeXml(second)}</text>`;
  }

  const left = miniProfile(kind === "undercut" ? "vertical" : kind, 76);
  const rightKind = { undercut: "undercut", bowing: "taper", notching: "microtrench", faceting: "faceting-aged", coverage: "coverage-poor", fill: "pinch" }[kind] ?? "vertical";
  const right = miniProfile(rightKind, 416);
  return `${left}${right}<text class="small" x="82" y="286">${escapeXml(first)}</text><text class="small" x="422" y="286">${escapeXml(second)}</text>`;
}

function miniProfile(kind, x) {
  const paths = {
    vertical: `M${x + 82} 112 H${x + 198} V250 H${x + 82}Z`,
    undercut: `M${x + 94} 112 H${x + 186} L${x + 210} 148 L${x + 192} 250 H${x + 88} L${x + 70} 148Z`,
    bowing: `M${x + 94} 112 H${x + 186} C${x + 218} 158 ${x + 214} 210 ${x + 190} 250 H${x + 90} C${x + 66} 210 ${x + 62} 158 ${x + 94} 112Z`,
    taper: `M${x + 72} 112 H${x + 208} L${x + 180} 250 H${x + 100}Z`,
    notching: `M${x + 88} 112 H${x + 192} V222 L${x + 220} 240 L${x + 188} 250 H${x + 92} L${x + 60} 240 L${x + 88} 222Z`,
    microtrench: `M${x + 82} 112 H${x + 198} V224 L${x + 188} 250 L${x + 172} 226 H${x + 108} L${x + 92} 250 L${x + 82} 224Z`,
    faceting: `M${x + 94} 112 H${x + 186} V250 H${x + 94}Z`,
    "faceting-aged": `M${x + 70} 112 L${x + 96} 138 V250 H${x + 184} V138 L${x + 210} 112Z`,
    coverage: `M${x + 86} 112 H${x + 194} V250 H${x + 86}Z`,
    "coverage-poor": `M${x + 68} 112 H${x + 212} L${x + 184} 142 V250 H${x + 96} V142Z`,
    fill: `M${x + 84} 112 H${x + 196} V250 H${x + 84}Z`,
    pinch: `M${x + 82} 112 H${x + 198} L${x + 176} 154 L${x + 168} 250 H${x + 112} L${x + 104} 154Z`
  };
  const extra = kind === "faceting-aged" ? `<path class="line2" d="M${x + 70} 112 L${x + 96} 138 M${x + 210} 112 L${x + 184} 138"/>`
    : kind === "coverage" ? `<path class="line2" d="M${x + 72} 104 H${x + 208} M${x + 98} 122 V238 M${x + 182} 122 V238 M${x + 100} 238 H${x + 180}"/>`
      : kind === "coverage-poor" ? `<path class="line2" d="M${x + 56} 100 H${x + 224} M${x + 102} 144 V232 M${x + 178} 144 V232"/>`
        : kind === "fill" ? `<path class="accent2" d="M${x + 96} 238 H${x + 184} V170 C${x + 168} 194 ${x + 112} 194 ${x + 96} 170Z"/>`
          : kind === "pinch" ? `<ellipse class="void" cx="${x + 140}" cy="198" rx="24" ry="42"/>`
            : `<path class="line" d="${profileGuide(kind, x)}"/>`;
  return `<rect class="panel" x="${x}" y="92" width="280" height="174" rx="6"/><path class="material" fill-rule="evenodd" d="M${x + 24} 104 H${x + 256} V254 H${x + 24}Z ${paths[kind] ?? paths.vertical}"/>${extra}`;
}

function profileGuide(kind, x) {
  if (kind === "notching") return `M${x + 88} 222 L${x + 60} 240 M${x + 192} 222 L${x + 220} 240`;
  if (kind === "microtrench") return `M${x + 82} 224 L${x + 92} 250 M${x + 198} 224 L${x + 188} 250`;
  return `M${x + 90} 120 C${x + 82} 166 ${x + 82} 214 ${x + 94} 246 M${x + 190} 120 C${x + 198} 166 ${x + 198} 214 ${x + 186} 246`;
}

function renderWafer(items) {
  const [kind, first, second] = items;
  const overlay = kind === "skew" ? `<path class="line2" d="M154 220 C240 112 380 96 500 164" marker-end="url(#arrow)"/>` : kind === "rings" ? `<circle class="line" cx="248" cy="185" r="88"/><circle class="line2" cx="248" cy="185" r="48"/>` : `<circle cx="248" cy="185" r="118" fill="url(#heat)"/><circle class="line" cx="248" cy="185" r="82"/>`;
  return `<circle class="wafer" cx="248" cy="185" r="120"/>${overlay}<path class="axis" d="M430 272 V98 M430 272 H696"/><path class="line" d="M442 250 C500 246 542 122 602 132 S660 222 686 242"/><text class="label" x="454" y="116">${escapeXml(first)}</text><text class="small" x="454" y="300">${escapeXml(second)}</text>`;
}

function wrap(value, x, y, maxChars) {
  const chunks = String(value).match(new RegExp(`.{1,${maxChars}}`, "g")) ?? [value];
  return chunks.slice(0, 4).map((chunk, index) => `<tspan x="${x}" y="${y + index * 24}">${escapeXml(chunk)}</tspan>`).join("");
}

function escapeXml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" })[char]);
}
