export function progressRing(value, label) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value);
  return `<svg class="progress-ring" viewBox="0 0 72 72" role="img" aria-label="${label} 完成 ${Math.round(value * 100)}%">
    <circle cx="36" cy="36" r="${radius}" class="ring-bg"></circle>
    <circle cx="36" cy="36" r="${radius}" class="ring-fg" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
    <text x="36" y="40" text-anchor="middle">${label}</text>
  </svg>`;
}

export function formulaCard(formula) {
  const rows = formula.symbols.map(([symbol, meaning, unit]) => `<tr><td>${symbol}</td><td>${meaning}</td><td>${unit}</td></tr>`).join("");
  return `<section class="formula-card" id="formula-${formula.id}">
    <div class="formula-expression">${formula.expression}</div>
    <h2>${formula.name}</h2>
    <p>${formula.summary}</p>
    <details>
      <summary>展開推導與符號表</summary>
      <div class="table-wrap"><table><thead><tr><th>符號</th><th>意義</th><th>單位</th></tr></thead><tbody>${rows}</tbody></table></div>
    </details>
  </section>`;
}

export function callout(type, title, body) {
  return `<aside class="callout callout-${type}">
    <h2>${title}</h2>
    <div>${body}</div>
  </aside>`;
}

export function labContainer({ id, title, module, observation }) {
  const observations = Array.isArray(observation) ? observation : [observation];
  const observationItems = observations.map((item) => `<li>${item}</li>`).join("");
  return `<section class="lab-container" id="lab-${id}" data-lab-container data-lab-module="${module}" aria-label="${title}">
    <header class="lab-container__header">
      <h2>${title}</h2>
      <a class="button secondary" href="/lab/">全螢幕</a>
    </header>
    <div class="lab-stage">
      <canvas width="720" height="360" data-lab-canvas data-a01-canvas data-lab-id="${id.toUpperCase()}" aria-label="${title} 視覺化區域"></canvas>
      <div class="lab-panel" data-lab-controls></div>
    </div>
    <p class="lab-status" data-lab-status aria-live="polite">等待元件載入。</p>
    <div class="observation"><strong>觀察點</strong><ul>${observationItems}</ul></div>
    <noscript>此互動元件需要 JavaScript。你仍可閱讀本章文字說明。</noscript>
  </section>`;
}
