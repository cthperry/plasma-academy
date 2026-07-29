import { access, mkdir, rm, cp, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { curriculum, rolePaths } from "../src/data/curriculum.js";
import { labs } from "../src/data/labs.js";
import { glossary } from "../src/data/glossary.js";
import { formulas } from "../src/data/formulas.js";
import { chapterOneOne } from "../src/content/chapter-1-1.mjs";
import { shell, navItems, breadcrumb } from "../src/templates/page-shell.mjs";
import { formulaCard, callout, labContainer, progressRing } from "../src/templates/components.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "dist", "client");

const page = (route, title, body, options = {}) => ({
  route,
  title,
  html: shell({
    title,
    navItems,
    body,
    description: options.description ?? "半導體製程工程師的電漿學習網站。",
    pageType: options.pageType ?? "",
    activePath: route,
    extraBodyClass: options.extraBodyClass ?? ""
  })
});

function homepage() {
  const levels = curriculum.levels.map((level) => `
    <article class="level-node level-${level.id}">
      ${progressRing(level.progress, `L${level.id}`)}
      <div>
        <h3>${level.title}</h3>
        <p>${level.summary}</p>
        <p class="meta">${level.modules.length} 模組 · ${level.hours} h · ${level.labs.length} 件互動元件</p>
        <a class="text-link" href="/level/${level.id}/">進入 L${level.id}</a>
      </div>
    </article>
  `).join("");

  const roles = rolePaths.map((role) => `
    <button class="role-card" type="button" data-role="${role.id}">
      <span>${role.name}</span>
      <small>${role.duration}</small>
      <strong>${role.path}</strong>
    </button>
  `).join("");

  return page("/", "Plasma Academy", `
    <main class="home-shell">
      <section class="hero">
        <div class="hero-copy">
          <h1>把 recipe 上的數字，連回電漿狀態與晶圓結果。</h1>
          <p>為半導體製程工程師設計的電漿教材。P0 先完成可維護的網站骨架、共用元件庫與進度追蹤，後續章節與 28 件互動元件都從同一套系統長出來。</p>
          <div class="hero-actions">
            <a class="button primary" href="/level/1/1-1-fourth-state/">從 1.1 開始</a>
            <a class="button secondary" href="/lab/">查看互動實驗室</a>
          </div>
        </div>
        <div class="system-panel" aria-label="P0 系統狀態">
          <div class="panel-header">
            <strong>P0 骨架狀態</strong>
            <span>Static · No framework</span>
          </div>
          <dl class="status-grid">
            <div><dt>主題</dt><dd>auto / light / dark</dd></div>
            <div><dt>進度</dt><dd>localStorage + JSON</dd></div>
            <div><dt>搜尋</dt><dd>延遲載入索引</dd></div>
            <div><dt>互動庫</dt><dd>lifecycle + controls</dd></div>
          </dl>
        </div>
      </section>

      <section class="band">
        <div class="section-heading">
          <h2>學習路徑</h2>
          <p>四個階段可獨立進入；每一階都保留前置知識連結，但不封鎖學習。</p>
        </div>
        <div class="path-map">${levels}</div>
      </section>

      <section class="quick-grid" aria-label="快速入口">
        <a href="/lab/"><strong>互動實驗室</strong><span>28 件元件的獨立入口</span></a>
        <a href="/progress/"><strong>個人進度</strong><span>匯出與匯入瀏覽器進度</span></a>
        <a href="/glossary/"><strong>術語表</strong><span>中英並列與 tooltip 來源</span></a>
        <a href="/formulas/"><strong>公式手冊</strong><span>可展開的公式卡資料</span></a>
      </section>

      <section class="band">
        <div class="section-heading">
          <h2>依角色推薦路徑</h2>
          <p>首次選擇會記在這台瀏覽器，之後可在進度頁匯出備份。</p>
        </div>
        <div class="role-grid">${roles}</div>
      </section>
    </main>
  `, { pageType: "home" });
}

function levelPage(levelId) {
  const level = curriculum.levels.find((item) => item.id === levelId);
  const modules = level.modules.map((module) => `
    <article class="module-card" data-chapter="${module.id}">
      <div class="module-card__head">
        <span class="module-number">${module.id}</span>
        <span>${module.hours} h</span>
      </div>
      <h3>${module.title}</h3>
      <p>${module.description}</p>
      <p class="meta">互動元件 ${module.labs.join(", ") || "無"} · 先修 ${module.prerequisites || "—"}</p>
      <a class="button secondary" href="${module.href}">開啟章節</a>
    </article>
  `).join("");

  return page(`/level/${level.id}/`, `L${level.id} ${level.name}`, `
    <main class="content-shell">
      ${breadcrumb(["首頁", `L${level.id} ${level.name}`])}
      <section class="page-intro">
        <h1>${level.title}</h1>
        <p>${level.summary}</p>
      </section>
      <section class="module-grid">${modules}</section>
      <section class="assessment-gate">
        <h2>L${level.id} 結業測驗</h2>
        <p>需完成 80% 章節後啟用。P0 先保留入口與狀態邏輯，題庫在後續 phase 補齊。</p>
        <button class="button secondary" type="button" disabled>尚未啟用</button>
      </section>
    </main>
  `);
}

function chapterPage() {
  const objectives = chapterOneOne.objectives.map((item, index) => `
    <label class="objective">
      <input type="checkbox" data-objective="${index}" data-chapter-id="${chapterOneOne.id}">
      <span>${item}</span>
    </label>
  `).join("");

  const outline = chapterOneOne.sections.map((section) => `<a href="#${section.id}">${section.title}</a>`).join("");
  const bodySections = chapterOneOne.sections.map((section) => `
    <section id="${section.id}" class="prose-section">
      <h2>${section.title}</h2>
      ${section.body}
    </section>
  `).join("");

  return page("/level/1/1-1-fourth-state/", "1.1 物質第四態", `
    <main class="chapter-layout" data-chapter-id="${chapterOneOne.id}">
      <aside class="chapter-sidebar">
        <strong>課程目錄</strong>
        <a class="current" href="/level/1/1-1-fourth-state/">1.1 物質第四態</a>
        <a href="/level/1/">L1 模組列表</a>
        <a href="/lab/">互動實驗室</a>
      </aside>
      <article class="chapter-main">
        ${breadcrumb(["首頁", "L1 初階", "1.1 物質第四態"])}
        <header class="chapter-header">
          <p class="chapter-meta">時數 1.0 h · 互動元件 A01</p>
          <h1>1.1 物質第四態</h1>
          <p>點火時看到的光，不是「氣體變很熱」而已，而是少數粒子被游離後，整個氣體開始用集體方式回應電場。</p>
        </header>
        <section class="learning-card" id="objectives">
          <h2>學習目標</h2>
          ${objectives}
        </section>
        ${callout("summary", "5 分鐘摘要", chapterOneOne.summary)}
        ${bodySections}
        ${formulaCard(formulas.debyeLength)}
        ${callout("intuition", "工程師直覺", "如果你只記一句話：製程電漿大多是弱游離電漿，帶電粒子很少，但它們決定了能量怎麼被送到晶圓表面。")}
        ${callout("misconception", "常見誤解", "<p><strong>常見說法：</strong>電漿就是很熱的氣體。</p><p><strong>正確理解：</strong>製程電漿常是熱非平衡，電子很有能量，氣體與晶圓仍可維持相對低溫。</p>")}
        ${labContainer({
          id: "a01",
          title: "A01 氣體到電漿相變",
          module: "/assets/js/labs/a01-fourth-state.js",
          observation: "把電場拉高，再切到只顯示帶電粒子。注意帶電粒子比例仍然很低，畫面為了可見性刻意放大。"
        })}
        <section class="self-check" id="self-check">
          <h2>自我檢測</h2>
          <button class="quiz-choice" type="button" data-correct="true">製程電漿通常是弱游離、熱非平衡的氣體。</button>
          <button class="quiz-choice" type="button">所有粒子都被游離後才叫電漿。</button>
          <p class="quiz-result" aria-live="polite"></p>
        </section>
        <nav class="chapter-nav" aria-label="章節導覽">
          <a class="button secondary" href="/level/1/">返回 L1</a>
          <a class="button primary" href="/level/1/">下一章：1.2 電漿基本參數</a>
        </nav>
      </article>
      <aside class="chapter-outline">
        <strong>本頁大綱</strong>
        ${outline}
        <div data-unit-converter></div>
      </aside>
    </main>
  `, { pageType: "chapter" });
}

function labPage() {
  const cards = labs.map((lab) => `
    <article class="lab-card" data-level="${lab.level}" data-kind="${lab.kind}">
      <div class="lab-thumb" aria-hidden="true"><span>${lab.id}</span></div>
      <div class="lab-card__body">
        <p class="meta">${lab.chapter} · ${lab.tech} · ${lab.complexity}</p>
        <h3>${lab.name}</h3>
        <p>${lab.goal}</p>
        <a class="text-link" href="${lab.href}">開啟元件</a>
      </div>
    </article>
  `).join("");

  return page("/lab/", "互動實驗室", `
    <main class="content-shell">
      ${breadcrumb(["首頁", "互動實驗室"])}
      <section class="page-intro">
        <h1>互動實驗室</h1>
        <p>28 件互動元件共用同一套 lifecycle、controls、plot、particle engine 與 canvas theme 模組。P0 先啟用 A01 示範，其餘保留規格入口。</p>
      </section>
      <div class="filter-row" role="group" aria-label="實驗室篩選">
        <button type="button" class="segmented active" data-filter="all">全部</button>
        <button type="button" class="segmented" data-filter="1">L1</button>
        <button type="button" class="segmented" data-filter="2">L2</button>
        <button type="button" class="segmented" data-filter="3">L3</button>
        <button type="button" class="segmented" data-filter="4">L4</button>
      </div>
      <section class="lab-grid">${cards}</section>
    </main>
  `);
}

function progressPage() {
  return page("/progress/", "個人進度", `
    <main class="content-shell narrow">
      ${breadcrumb(["首頁", "個人進度"])}
      <section class="page-intro">
        <h1>個人進度</h1>
        <p>進度只存在這台裝置的瀏覽器。清除瀏覽資料會遺失，建議定期匯出 JSON 備份。</p>
      </section>
      <section class="progress-dashboard" data-progress-page>
        <div class="status-grid">
          <div><dt>角色路徑</dt><dd data-progress-role>尚未選擇</dd></div>
          <div><dt>已造訪章節</dt><dd data-progress-visited>0</dd></div>
          <div><dt>完成目標</dt><dd data-progress-objectives>0</dd></div>
          <div><dt>實驗室使用</dt><dd data-progress-labs>0</dd></div>
        </div>
        <div class="progress-actions">
          <button class="button primary" type="button" data-export-progress>匯出 JSON</button>
          <label class="button secondary file-button">匯入 JSON<input type="file" accept="application/json" data-import-progress></label>
          <button class="button danger" type="button" data-reset-progress>清除本機進度</button>
        </div>
        <textarea class="progress-json" data-progress-json readonly aria-label="目前進度 JSON"></textarea>
      </section>
    </main>
  `);
}

function glossaryPage() {
  const rows = glossary.map((term) => `
    <tr><td>${term.zh}</td><td>${term.en}</td><td>${term.definition}</td><td>${term.chapter}</td></tr>
  `).join("");
  return page("/glossary/", "術語表", `
    <main class="content-shell">
      ${breadcrumb(["首頁", "術語表"])}
      <section class="page-intro"><h1>術語表</h1><p>P0 先放核心術語子集；完整術語轉換器會在後續補齊。</p></section>
      <div class="table-wrap"><table><thead><tr><th>中文</th><th>英文</th><th>定義</th><th>章節</th></tr></thead><tbody>${rows}</tbody></table></div>
    </main>
  `);
}

function formulasPage() {
  const cards = Object.values(formulas).map(formulaCard).join("");
  return page("/formulas/", "公式手冊", `
    <main class="content-shell narrow">
      ${breadcrumb(["首頁", "公式手冊"])}
      <section class="page-intro"><h1>公式手冊</h1><p>公式以 HTML 呈現，可選取、可搜尋、可展開符號表。</p></section>
      ${cards}
    </main>
  `);
}

async function writePage(pageDef) {
  const dir = path.join(out, pageDef.route);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.html"), pageDef.html);
}

async function main() {
  await rm(path.join(root, "dist"), { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await cp(path.join(root, "src", "assets"), path.join(out, "assets"), { recursive: true });
  await cp(path.join(root, "src", "data"), path.join(out, "assets", "data"), { recursive: true });
  await mkdir(path.join(root, "dist", "server"), { recursive: true });
  await cp(path.join(root, "worker", "index.js"), path.join(root, "dist", "server", "index.js"));
  try {
    await access(path.join(root, ".openai", "hosting.json"));
    await cp(path.join(root, ".openai"), path.join(out, ".openai"), { recursive: true });
  } catch (_) {
    // Site project may not exist during early local builds.
  }

  const pages = [
    homepage(),
    levelPage(1),
    levelPage(2),
    levelPage(3),
    levelPage(4),
    chapterPage(),
    labPage(),
    progressPage(),
    glossaryPage(),
    formulasPage()
  ];
  await Promise.all(pages.map(writePage));

  const searchDocs = pages.map((item) => ({
    title: item.title,
    url: item.route,
    text: item.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  }));
  searchDocs.push(...glossary.map((term) => ({
    title: `${term.zh} ${term.en}`,
    url: `/glossary/#${term.zh}`,
    text: `${term.zh} ${term.en} ${term.definition}`
  })));
  await writeFile(path.join(out, "assets", "search-index.json"), JSON.stringify(buildSearchIndex(searchDocs), null, 2));
}

function tokenize(text) {
  const lower = text.toLowerCase();
  const english = lower.match(/[a-z0-9_+-]+/g) ?? [];
  const chinese = Array.from(lower.matchAll(/[\u4e00-\u9fff]+/g)).flatMap(([chunk]) => {
    const chars = Array.from(chunk);
    if (chars.length < 2) return chars;
    return chars.slice(0, -1).map((char, index) => `${char}${chars[index + 1]}`);
  });
  return [...new Set([...english, ...chinese])];
}

function buildSearchIndex(docs) {
  const index = {};
  docs.forEach((doc, docId) => {
    for (const token of tokenize(`${doc.title} ${doc.text}`)) {
      index[token] ??= [];
      index[token].push(docId);
    }
  });
  return { version: 1, docs: docs.map(({ title, url }) => ({ title, url })), index };
}

await main();
