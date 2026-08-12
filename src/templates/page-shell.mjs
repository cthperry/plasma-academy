export const navItems = [
  ["學習路徑", "/"],
  ["實驗室", "/lab/"],
  ["氣體", "/gases/"],
  ["公式", "/formulas/"],
  ["術語", "/glossary/"],
  ["進度", "/progress/"]
];

export function shell({ title, description, navItems, body, pageType, extraBodyClass, extraStyles = [] }) {
  const nav = navItems.map(([label, href]) => `<a href="${href}">${label}</a>`).join("");
  const pageStyles = extraStyles.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n  ");
  return `<!doctype html>
<html lang="zh-Hant" data-theme="auto">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; script-src-attr 'none'; style-src-elem 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'">
  <meta name="referrer" content="no-referrer">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <script src="/assets/js/theme-init.js"></script>
  <link rel="stylesheet" href="/assets/css/base.css">
  <link rel="stylesheet" href="/assets/css/layout.css">
  <link rel="stylesheet" href="/assets/css/components.css">
  ${pageStyles}
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
      <button class="account-button" type="button" data-auth-open aria-label="登入學員帳號"><span data-auth-name-display>登入</span></button>
      <button class="icon-button" type="button" data-search-open aria-label="搜尋">⌕</button>
      <button class="icon-button" type="button" data-theme-toggle aria-label="切換主題">◐</button>
    </div>
  </header>
  <div class="search-popover" hidden data-search-popover>
    <label>搜尋<input type="search" data-search-input placeholder="輸入電漿、sheath、A01..."></label>
    <div class="search-results" data-search-results></div>
  </div>
  <dialog class="auth-dialog" data-auth-dialog aria-labelledby="auth-dialog-title">
    <div class="auth-dialog__header"><h2 id="auth-dialog-title">公司帳號登入</h2><button class="button secondary" type="button" data-auth-close>關閉</button></div>
    <div data-auth-signed-out>
      <p>僅接受 <strong>@premtek.com.tw</strong> 公司信箱。登入時間會保存於中央管理紀錄。</p>
      <form class="auth-form" data-auth-login>
        <label>公司信箱<input type="email" autocomplete="email" required data-auth-email placeholder="name@premtek.com.tw"></label>
        <label>密碼<input type="password" autocomplete="current-password" required data-auth-password></label>
        <button class="button primary" type="submit">登入</button>
      </form>
      <p class="auth-divider">或</p>
      <button class="button secondary" type="button" data-auth-github>使用 GitHub 登入</button>
      <details class="auth-register"><summary>首次使用，建立公司帳號</summary>
        <form class="auth-form auth-form--stacked" data-auth-register>
          <label>顯示名稱<input type="text" maxlength="80" autocomplete="name" required data-auth-display-name></label>
          <label>公司信箱<input type="email" autocomplete="email" required data-auth-register-email placeholder="name@premtek.com.tw"></label>
          <label>密碼<input type="password" minlength="6" autocomplete="new-password" required data-auth-register-password></label>
          <button class="button primary" type="submit">建立帳號</button>
        </form>
      </details>
    </div>
    <div data-auth-session hidden>
      <p>目前以 <strong data-auth-session-name></strong> 身分登入。</p>
      <p class="meta" data-auth-session-email></p>
      <button class="button danger" type="button" data-auth-logout>登出</button>
    </div>
    <p class="meta" data-auth-status aria-live="polite"></p>
    <p class="auth-admin-link"><a class="button secondary" href="/admin/">管理登入紀錄</a></p>
  </dialog>
  <div id="main">${body}</div>
  <footer class="site-footer">
    <span>Plasma Academy · 學習進度儲存在目前裝置；登入紀錄由管理系統集中保存</span>
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
