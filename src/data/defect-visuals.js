const profilePaths = {
  undercut: "M62 28 C46 48 50 100 58 112 L122 112 C130 100 134 48 118 28 Z",
  bowing: "M62 28 C58 48 45 62 52 82 C58 98 64 106 68 112 L112 112 C116 106 122 98 128 82 C135 62 122 48 118 28 Z",
  taper: "M56 28 L72 112 L108 112 L124 28 Z",
  twisting: "M62 28 C104 48 62 72 104 112 L132 112 C94 72 132 48 118 28 Z",
  striation: "M60 28 L64 112 L116 112 L120 28 Z",
  "etch-stop": "M60 28 L68 75 L112 75 L120 28 Z"
};

export function defectSvg(id, label = id) {
  const content = renderDefect(id);
  return `<svg class="defect-svg" viewBox="0 0 180 130" role="img" aria-label="${escapeHtml(label)} 剖面示意圖">
    <rect class="defect-film" x="10" y="25" width="160" height="94" rx="2"></rect>
    <rect class="defect-substrate" x="10" y="112" width="160" height="12"></rect>
    ${content}
  </svg>`;
}

function renderDefect(id) {
  if (["arde", "inverse-lag", "microloading", "macroloading"].includes(id)) return loadingVisual(id);
  if (profilePaths[id]) {
    const striations = id === "striation" ? `<g class="defect-accent">${[70, 78, 86, 94, 102, 110].map((x) => `<path d="M${x} 34 L${x - 3} 106"></path>`).join("")}</g>` : "";
    return `${mask()}<path class="defect-void" d="${profilePaths[id]}"></path>${striations}`;
  }
  if (id === "notching") return `${mask()}<path class="defect-void" d="M61 28 L66 105 L48 112 L132 112 L114 105 L119 28 Z"></path><path class="defect-accent" d="M48 108 L70 101 M132 108 L110 101"></path>`;
  if (id === "microtrench") return `${mask()}<path class="defect-void" d="M61 28 L66 103 L58 118 L82 108 L98 108 L122 118 L114 103 L119 28 Z"></path>`;
  if (id === "footing") return `${mask()}<path class="defect-void" d="M61 28 L65 100 L76 112 L104 112 L115 100 L119 28 Z"></path>`;
  if (id === "faceting") return `${mask(true)}<path class="defect-void" d="M55 28 L65 112 L115 112 L125 28 Z"></path>`;
  if (id === "mask-loss") return `<path class="defect-mask" d="M10 24 H53 L62 28 H118 L127 24 H170 V29 H10 Z"></path><path class="defect-void" d="M62 28 L68 112 L112 112 L118 28 Z"></path>`;
  if (id === "resist-wiggle") return `<path class="defect-mask" d="M10 12 H48 L54 26 L66 10 L75 25 H105 L114 9 L126 25 L132 12 H170 V28 H10 Z"></path><path class="defect-void" d="M63 28 L68 112 L112 112 L117 28 Z"></path>`;
  if (id === "veil") return `${mask()}<path class="defect-void" d="M62 28 L68 112 L112 112 L118 28 Z"></path><path class="defect-accent" d="M55 29 Q48 70 58 112 M125 29 Q132 70 122 112"></path>`;
  if (id === "corrosion") return `<rect class="defect-metal" x="24" y="60" width="132" height="25"></rect><g class="defect-accent"><circle cx="55" cy="67" r="8"></circle><circle cx="91" cy="80" r="7"></circle><circle cx="130" cy="66" r="10"></circle></g>`;
  return `${mask()}<path class="defect-void" d="M62 28 L68 112 L112 112 L118 28 Z"></path>`;
}

function loadingVisual(id) {
  const inverse = id === "inverse-lag";
  const dense = id === "microloading";
  const openings = dense ? [18, 18, 18, 50] : [24, 40, 62];
  let x = 20;
  const trenches = openings.map((width, index) => {
    const normalDepth = 42 + index * 20;
    const depth = inverse ? 86 - index * 15 : normalDepth;
    const item = `<rect class="defect-void" x="${x}" y="28" width="${width}" height="${depth}"></rect>`;
    x += width + 12;
    return item;
  }).join("");
  if (id === "macroloading") return `<path class="defect-accent" d="M18 64 Q90 112 162 64"></path><path class="defect-accent dashed" d="M18 46 Q90 90 162 46"></path>`;
  return `${trenches}<path class="defect-mask" d="M10 18 H170 V28 H10 Z"></path>`;
}

function mask(faceted = false) {
  if (faceted) return `<path class="defect-mask" d="M10 10 H52 L65 28 H115 L128 10 H170 V28 H10 Z"></path>`;
  return `<path class="defect-mask" d="M10 10 H61 V28 H119 V10 H170 V28 H10 Z"></path>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}
