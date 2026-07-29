export const navItems = [
  ["學習路徑", "/"],
  ["實驗室", "/lab/"],
  ["公式", "/formulas/"],
  ["術語", "/glossary/"],
  ["進度", "/progress/"]
];

export function shell({ title, description, navItems, body, pageType, extraBodyClass }) {
  const nav = navItems.map(([label, href]) => `<a href="${href}">${label}</a>`).join("");
  return `<!doctype html>
<html lang="zh-Hant" data-theme="auto">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)}</title>
  <script src="/assets/js/theme-init.js"></script>
  <link rel="stylesheet" href="/assets/css/base.css">
  <link rel="stylesheet" href="/assets/css/layout.css">
  <link rel="stylesheet" href="/assets/css/components.css">
  <link rel="stylesheet" href="/assets/css/print.css" media="print">
</head>
<body data-page-type="${pageType}" class="${extraBodyClass}">
  <a class="skip-link" href="#main">跳到主內容</a>
  <header class="site-header">
    <a class="brand" href="/" aria-label="Plasma Academy 首頁">
      <span class="brand-mark" aria-hidden="true">PA</span>
      <span>Plasma Academy</span>
    </a>
    <nav class="site-nav" aria-label="主導覽">${nav}</nav>
    <div class="header-actions">
      <button class="icon-button" type="button" data-search-open aria-label="搜尋">⌕</button>
      <button class="icon-button" type="button" data-theme-toggle aria-label="切換主題">◐</button>
    </div>
  </header>
  <div class="search-popover" hidden data-search-popover>
    <label>搜尋<input type="search" data-search-input placeholder="輸入電漿、sheath、A01..."></label>
    <div class="search-results" data-search-results></div>
  </div>
  <div id="main">${body}</div>
  <footer class="site-footer">
    <span>P0 靜態骨架 · 進度僅儲存在本機瀏覽器</span>
  </footer>
  <script type="module" src="/assets/js/app.js"></script>
</body>
</html>`;
}

export function breadcrumb(items) {
  return `<nav class="breadcrumb" aria-label="麵包屑">${items.map((item, index) => index === items.length - 1 ? `<span>${item}</span>` : `<a href="/"> ${item}</a>`).join("<span aria-hidden=\"true\">›</span>")}</nav>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}
