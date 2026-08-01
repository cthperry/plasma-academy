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
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
  const detailId = `formula-${formula.id}-details`;
  const rows = formula.symbols.map(([symbol, meaning, unit]) => `<tr><td>${escapeHtml(symbol)}</td><td>${escapeHtml(meaning)}</td><td>${escapeHtml(unit)}</td></tr>`).join("");
  return `<section class="formula-card" id="formula-${escapeHtml(formula.id)}">
    <div class="formula-expression">${formula.expression}</div>
    <h2>${escapeHtml(formula.name)}</h2>
    <p>${escapeHtml(formula.summary)}</p>
    <details aria-labelledby="${detailId}">
      <summary id="${detailId}">展開推導、尺度與符號表</summary>
      <section class="formula-card__derivation">
        <h3>推導</h3>
        ${formula.derivation}
      </section>
      <section class="formula-card__typical-values">
        <h3>典型數值與尺度</h3>
        ${formula.typicalValues}
      </section>
      <section class="formula-card__conditions">
        <h3>適用條件與限制</h3>
        <p>${escapeHtml(formula.conditions)}</p>
      </section>
      <section class="formula-card__source">
        <h3>來源</h3>
        <p>${formula.source}</p>
      </section>
      <section class="formula-card__symbols">
        <h3>符號表</h3>
        <div class="table-wrap"><table><thead><tr><th>符號</th><th>意義</th><th>單位</th></tr></thead><tbody>${rows}</tbody></table></div>
      </section>
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
