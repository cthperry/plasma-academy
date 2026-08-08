import { access, mkdir, rm, cp, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { curriculum, rolePaths } from "../src/data/curriculum.js";
import { labs } from "../src/data/labs.js";
import { glossary } from "../src/data/glossary.js";
import { formulas } from "../src/data/formulas.js";
import { gases, gasFamilies, hazardLabels } from "../src/data/gases.js";
import { sdsEvidenceByGas } from "../src/data/sds-evidence.js";
import { l2Diagrams } from "../src/data/l2-diagrams.js";
import { l3Diagrams } from "../src/data/l3-diagrams.js";
import { defectCategories, defects } from "../src/data/defects.js";
import { defectSvg } from "../src/data/defect-visuals.js";
import { chapterOneOne as chapterOneOneBase } from "../src/content/chapter-1-1.mjs";
import { chapterThreeOne } from "../src/content/chapter-3-1.mjs";
import { chapterThreeTwo } from "../src/content/chapter-3-2.mjs";
import { chapterThreeThree } from "../src/content/chapter-3-3.mjs";
import { chapterThreeFour } from "../src/content/chapter-3-4.mjs";
import { chapterThreeFive } from "../src/content/chapter-3-5.mjs";
import { chapterThreeSix } from "../src/content/chapter-3-6.mjs";
import { chapterThreeSeven } from "../src/content/chapter-3-7-packaging-cleaning.mjs";
import { chapterThreeEight } from "../src/content/chapter-3-8-pcb-desmear.mjs";
import { chapterFourOne } from "../src/content/chapter-4-1.mjs";
import { chapterFourTwo } from "../src/content/chapter-4-2.mjs";
import { chapterFourThree } from "../src/content/chapter-4-3.mjs";
import { chapterFourFour } from "../src/content/chapter-4-4.mjs";
import { chapterFourFive } from "../src/content/chapter-4-5.mjs";
import { chapterFourSix } from "../src/content/chapter-4-6.mjs";
import { l3FieldGuides, l3EngineeringCases, l3ShiftExercises } from "../src/content/l3-engineering-casebook.mjs";
import { packagingCleaningProtocols } from "../src/content/l3-packaging-cleaning-handbook.mjs";
import { l3ProcessProtocolsPart1 } from "../src/content/l3-process-handbooks-part1.mjs";
import { l3ProcessProtocolsPart2 } from "../src/content/l3-process-handbooks-part2.mjs";
import { chapterTwoOne } from "../src/content/chapter-2-1.mjs";
import { chapterTwoTwo } from "../src/content/chapter-2-2.mjs";
import { chapterTwoThree } from "../src/content/chapter-2-3.mjs";
import { chapterTwoFour } from "../src/content/chapter-2-4.mjs";
import { chapterTwoFive } from "../src/content/chapter-2-5.mjs";
import { chapterTwoSix } from "../src/content/chapter-2-6.mjs";
import { l2EngineeringCases, l2ShiftExercises } from "../src/content/l2-engineering-cases.mjs";
import { l1FoundationChapters as l1FoundationChaptersBase } from "../src/content/l1-foundation-chapters.mjs";
import { expandL1Content } from "../src/content/l1-prose-expansions.mjs";
import { level1ExamSpec } from "../src/data/quiz/level-1.js";
import { level2ExamSpec } from "../src/data/quiz/level-2.js";
import { level3ExamSpec } from "../src/data/quiz/level-3.js";
import { level4ExamSpec } from "../src/data/quiz/level-4.js";
import { shell, navItems, breadcrumb } from "../src/templates/page-shell.mjs";
import { formulaCard, callout, labContainer, progressRing } from "../src/templates/components.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "dist", "client");
const siteUrl = "https://plasma-academy-p0.pperry.chatgpt.site";
const [chapterOneOne, ...l1FoundationChapters] = expandL1Content([chapterOneOneBase, ...l1FoundationChaptersBase]);

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
    extraBodyClass: options.extraBodyClass ?? "",
    extraStyles: options.extraStyles ?? []
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
          <p>為半導體製程工程師設計的電漿教材。網站共用同一套骨架、元件庫與進度追蹤，34 件互動元件都從一致的模型與介面契約長出來。</p>
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
        <a href="/lab/"><strong>互動實驗室</strong><span>34 件元件的獨立入口</span></a>
        <a href="/gases/"><strong>氣體百科</strong><span>32 種製程氣體與安全欄位</span></a>
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

  const examSpec = { 1: level1ExamSpec, 2: level2ExamSpec, 3: level3ExamSpec, 4: level4ExamSpec }[level.id];
  const examRequirement = level.id === 3 ? "完成 8 章中的 7 章學習目標後啟用" : "完成 6 章中的 5 章學習目標後啟用";
  const assessment = examSpec ? `
      <section class="assessment-gate" data-exam-gate data-exam-level="${level.id}">
        <h2>L${level.id} 結業測驗</h2>
        <p>${examSpec.durationMinutes} 分鐘抽考 ${Object.values(examSpec.draw).reduce((sum, count) => sum + count, 0)} 題，達 ${examSpec.passPercent}% 通過。${examRequirement}。</p>
        <p class="meta" data-exam-gate-status aria-live="polite">正在讀取本機進度…</p>
        <a class="button primary" href="/level/${level.id}/exam/" data-exam-link hidden>進入 L${level.id} 測驗</a>
      </section>` : `
      <section class="assessment-gate">
        <h2>L${level.id} 結業測驗</h2>
        <p>需完成 80% 章節後啟用。此階段題庫將依建置路線逐步加入。</p>
        <button class="button secondary" type="button" disabled>尚未啟用</button>
      </section>`;

  return page(`/level/${level.id}/`, `L${level.id} ${level.name}`, `
    <main class="content-shell">
      ${breadcrumb(["首頁", `L${level.id} ${level.name}`])}
      <section class="page-intro">
        <h1>${level.title}</h1>
        <p>${level.summary}</p>
      </section>
      <section>
        <h2>模組列表</h2>
        <div class="module-grid">${modules}</div>
      </section>
      ${assessment}
    </main>
  `);
}

function chapterPage() {
  const objectives = chapterOneOne.objectives.map((item, index) => `
    <label class="objective">
      <input type="checkbox" aria-label="完成目標：${item}" data-objective="${index}" data-chapter-id="${chapterOneOne.id}">
      <span>${item}</span>
    </label>
  `).join("");

  const outline = [...chapterOneOne.sections, ...chapterOneOne.supplements].map((section) => `<a href="#${section.id}">${section.title}</a>`).join("");
  const bodySections = chapterOneOne.sections.map((section) => `
    <section id="${section.id}" class="prose-section">
      <h2>${section.title}</h2>
      ${section.body}
    </section>
  `).join("");
  const supplementalSections = chapterOneOne.supplements.map((section) => `
    <section id="${section.id}" class="prose-section chapter-supplement">
      <h2>${section.title}</h2>
      ${section.body}
    </section>
  `).join("");
  const checks = chapterOneOne.selfCheck.map(([prompt, answer]) => `
    <details class="check-card">
      <summary>${prompt}</summary>
      <p>${answer}</p>
    </details>
  `).join("");
  const prerequisites = chapterOneOne.prerequisites.map((item) => `<li>${item}</li>`).join("");
  const readings = chapterOneOne.readings.map((item) => `<li>${item}</li>`).join("");

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
        <section class="chapter-support" id="prerequisites">
          <h2>前置知識</h2>
          <ul>${prerequisites}</ul>
        </section>
        ${callout("summary", "5 分鐘摘要", chapterOneOne.summary)}
        ${bodySections}
        ${supplementalSections}
        ${formulaCard(formulas.debyeLength)}
        ${callout("intuition", "工程師直覺", "如果你只記一句話：製程電漿大多是弱游離電漿，帶電粒子很少，但它們決定了能量怎麼被送到晶圓表面。")}
        ${callout("misconception", "常見誤解", "<p><strong>常見說法：</strong>電漿就是很熱的氣體。</p><p><strong>正確理解：</strong>製程電漿常是熱非平衡，電子很有能量，氣體與晶圓仍可維持相對低溫。</p>")}
        ${labContainer({
          id: "a01",
          title: "A01 氣體到電漿相變",
          module: "/assets/js/labs/a01-fourth-state.js",
          observation: [
            "把電場由低拉高，找出開始出現持續游離事件的區間；注意這是反應門檻，不是所有粒子一起變成離子。",
            "切到只顯示帶電粒子，比較游離前後的粒子總量；帶電比例仍很低，畫面為了可見性刻意放大。",
            "按下重設後改變氣體，再比較相同電場下的游離事件；指出哪一個差異可能來自游離閾值。"
          ]
        })}
        <section class="self-check" id="self-check">
          <h2>自我檢測</h2>
          ${checks}
          <h3>快速判斷</h3>
          <button class="quiz-choice" type="button" data-correct="true">製程電漿通常是弱游離、熱非平衡的氣體。</button>
          <button class="quiz-choice" type="button">所有粒子都被游離後才叫電漿。</button>
          <p class="quiz-result" aria-live="polite"></p>
        </section>
        <section class="chapter-support" id="further-reading">
          <h2>延伸閱讀</h2>
          <ul>${readings}</ul>
        </section>
        <nav class="chapter-nav" aria-label="章節導覽">
          <a class="button secondary" href="/level/1/">返回 L1</a>
          <a class="button primary" href="/level/1/1-2-parameters/">下一章：1.2 電漿基本參數</a>
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

function l1ChapterPage(chapter, index) {
  const previous = index === 0
    ? { href: "/level/1/1-1-fourth-state/", title: "1.1 物質第四態" }
    : { href: l1FoundationChapters[index - 1].route, title: l1FoundationChapters[index - 1].title };
  const next = index < l1FoundationChapters.length - 1
    ? { href: l1FoundationChapters[index + 1].route, title: l1FoundationChapters[index + 1].title }
    : { href: "/level/1/exam/", title: "L1 結業測驗" };
  const objectives = chapter.objectives.map((item, objectiveIndex) => `
    <label class="objective">
      <input type="checkbox" aria-label="完成目標：${item}" data-objective="${objectiveIndex}" data-chapter-id="${chapter.id}">
      <span>${item}</span>
    </label>
  `).join("");
  const outline = [...chapter.sections, ...chapter.supplements].map((section) => `<a href="#${section.id}">${section.title}</a>`).join("");
  const bodySections = chapter.sections.map((section) => `
    <section id="${section.id}" class="prose-section">
      <h2>${section.title}</h2>
      ${section.body}
    </section>
  `).join("");
  const supplementalSections = chapter.supplements.map((section) => `
    <section id="${section.id}" class="prose-section chapter-supplement">
      <h2>${section.title}</h2>
      ${section.body}
    </section>
  `).join("");
  const callouts = chapter.callouts.map((item) => callout(item.type, item.title, item.body)).join("");
  const labsHtml = chapter.labs.map((lab) => labContainer(lab)).join("");
  const checks = chapter.selfCheck.map(([prompt, answer]) => `
    <details class="check-card">
      <summary>${prompt}</summary>
      <p>${answer}</p>
    </details>
  `).join("");
  const prerequisites = chapter.prerequisites.map((item) => `<li>${item}</li>`).join("");
  const readings = chapter.readings.map((item) => `<li>${item}</li>`).join("");
  const sidebar = [
    ["1.1 物質第四態", "/level/1/1-1-fourth-state/"],
    ...l1FoundationChapters.map((item) => [item.title, item.route])
  ].map(([title, href]) => `<a class="${href === chapter.route ? "current" : ""}" href="${href}">${title}</a>`).join("");

  return page(chapter.route, chapter.title, `
    <main class="chapter-layout" data-chapter-id="${chapter.id}">
      <aside class="chapter-sidebar">
        <strong>課程目錄</strong>
        ${sidebar}
        <a href="/level/1/">L1 模組列表</a>
      </aside>
      <article class="chapter-main">
        ${breadcrumb(["首頁", "L1 初階", chapter.title])}
        <header class="chapter-header">
          <p class="chapter-meta">時數 ${chapter.hours} h · 互動元件 ${chapter.labs.map((lab) => lab.id.toUpperCase()).join(", ")}</p>
          <h1>${chapter.title}</h1>
          <p>${chapter.summary}</p>
        </header>
        <section class="learning-card">
          <h2>學習目標</h2>
          ${objectives}
        </section>
        <section class="chapter-support" id="prerequisites">
          <h2>前置知識</h2>
          <ul>${prerequisites}</ul>
        </section>
        ${callout("summary", "5 分鐘摘要", chapter.summary)}
        ${bodySections}
        ${supplementalSections}
        ${callouts}
        ${labsHtml}
        <section class="self-check">
          <h2>自我檢測</h2>
          ${checks}
        </section>
        <section class="chapter-support" id="further-reading">
          <h2>延伸閱讀</h2>
          <ul>${readings}</ul>
        </section>
        <nav class="chapter-nav" aria-label="章節導覽">
          <a class="button secondary" href="${previous.href}">上一章：${previous.title}</a>
          <a class="button primary" href="${next.href}">下一章：${next.title}</a>
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

function packagingCleaningPage() {
  const objectives = chapterThreeSeven.objectives.map((item, index) => `<label class="objective"><input type="checkbox" aria-label="完成目標：${item}" data-objective="${index}" data-chapter-id="${chapterThreeSeven.id}"><span>${item}</span></label>`).join("");
  const prerequisites = chapterThreeSeven.prerequisites.map((item) => `<li>${item}</li>`).join("");
  const readings = chapterThreeSeven.readings.map((item) => `<li>${item}</li>`).join("");
  const outline = `${chapterThreeSeven.sections.map((section) => `<a href="#${section.id}">${section.title}</a>`).join("")}<a href="#lab-a33">A33 封裝處理計算器</a>`;
  const bodySections = p3SectionsHtml(chapterThreeSeven);
  const callouts = chapterThreeSeven.callouts.map((item) => callout(item.type, item.title, item.body)).join("");
  const labsHtml = chapterThreeSeven.labs.map((lab) => labContainer(lab)).join("");
  const checks = chapterThreeSeven.selfCheck.map((item) => `
    <details class="check-card">
      <summary>${item.prompt}</summary>
      <p>${item.answer}</p>
    </details>
  `).join("");

  return page("/level/3/3-7-packaging-cleaning/", "3.7 封裝清潔與表面活化", `
    <main class="chapter-layout" data-chapter-id="${chapterThreeSeven.id}">
      <aside class="chapter-sidebar">
        <strong>課程目錄</strong>
        ${[chapterThreeOne, chapterThreeTwo, chapterThreeThree, chapterThreeFour, chapterThreeFive, chapterThreeSix, chapterThreeSeven, chapterThreeEight].map((item) => `<a class="${item.id === chapterThreeSeven.id ? "current" : ""}" href="${item.route}">${item.title}</a>`).join("")}
        <a href="/level/3/">L3 模組列表</a>
        <a href="/glossary/">術語表</a>
      </aside>
      <article class="chapter-main">
        ${breadcrumb(["首頁", "L3 進階", "3.7 封裝清潔"])}
        <header class="chapter-header">
          <p class="chapter-meta">時數 ${chapterThreeSeven.hours} h · 封裝應用主題 · 互動元件 A33</p>
          <h1>${chapterThreeSeven.title}</h1>
          <p>把電漿清潔從「去殘留」提升到「界面可靠度控制」。</p>
        </header>
        <section class="learning-card"><h2>學習目標</h2>${objectives}</section>
        <section class="chapter-support"><h2>前置知識</h2><ul>${prerequisites}</ul></section>
        ${callout("summary", "5 分鐘摘要", chapterThreeSeven.summary)}
        ${bodySections}
        ${l3CasebookHtml(chapterThreeSeven)}
        ${packagingCleaningHandbookHtml()}
        ${callouts}
        ${labsHtml}
        <section class="self-check">
          <h2>自我檢測</h2>
          ${checks}
        </section>
        <section class="chapter-support"><h2>延伸閱讀</h2><ul>${readings}</ul></section>
        <nav class="chapter-nav" aria-label="章節導覽">
          <a class="button secondary" href="${chapterThreeSix.route}">上一章：${chapterThreeSix.title}</a>
          <a class="button primary" href="${chapterThreeEight.route}">下一章：${chapterThreeEight.title}</a>
        </nav>
      </article>
      <aside class="chapter-outline">
        <strong>本頁大綱</strong>
        ${outline}
        <div data-unit-converter></div>
      </aside>
    </main>
  `, { pageType: "chapter", extraStyles: ["/assets/css/l3-casebook.css"] });
}

function chapterThreeOnePage() {
  const objectives = chapterThreeOne.objectives.map((item, index) => `
    <label class="objective"><input type="checkbox" aria-label="完成目標：${item}" data-objective="${index}" data-chapter-id="${chapterThreeOne.id}"><span>${item}</span></label>
  `).join("");
  const prerequisites = chapterThreeOne.prerequisites.map((item) => `<li>${item}</li>`).join("");
  const readings = chapterThreeOne.readings.map((item) => `<li>${item}</li>`).join("");
  const outline = [...chapterThreeOne.sections, ...chapterThreeOne.labs].map((item) => `<a href="#${item.id}">${item.title}</a>`).join("");
  const sections = p3SectionsHtml(chapterThreeOne);
  const callouts = chapterThreeOne.callouts.map((item) => callout(item.type, item.title, item.body)).join("");
  const labsHtml = chapterThreeOne.labs.map((lab) => labContainer(lab)).join("");
  const checks = chapterThreeOne.selfCheck.map(([prompt, answer]) => `<details class="check-card"><summary>${prompt}</summary><p>${answer}</p></details>`).join("");

  return page(chapterThreeOne.route, chapterThreeOne.title, `
    <main class="chapter-layout" data-chapter-id="${chapterThreeOne.id}">
      <aside class="chapter-sidebar">
        <strong>課程目錄</strong>
        <a class="current" href="${chapterThreeOne.route}">${chapterThreeOne.title}</a>
        <a href="/level/3/3-7-packaging-cleaning/">3.7 封裝清潔與表面活化</a>
        <a href="${chapterThreeEight.route}">${chapterThreeEight.title}</a>
        <a href="/level/3/">L3 模組列表</a>
        <a href="/lab/">互動實驗室</a>
      </aside>
      <article class="chapter-main">
        ${breadcrumb(["首頁", "L3 進階", chapterThreeOne.title])}
        <header class="chapter-header"><p class="chapter-meta">時數 ${chapterThreeOne.hours} h · 互動元件 A17、A18</p><h1>${chapterThreeOne.title}</h1><p>${chapterThreeOne.summary}</p></header>
        <section class="learning-card"><h2>學習目標</h2>${objectives}</section>
        <section class="chapter-support"><h2>前置知識</h2><ul>${prerequisites}</ul></section>
        ${callout("summary", "5 分鐘摘要", chapterThreeOne.summary)}
        ${sections}
        ${l3CasebookHtml(chapterThreeOne)}
        ${l3ProcessHandbookHtml(chapterThreeOne.id)}
        ${callouts}
        ${labsHtml}
        <section class="self-check"><h2>自我檢測</h2>${checks}</section>
        <section class="chapter-support"><h2>延伸閱讀</h2><ul>${readings}</ul></section>
        <nav class="chapter-nav" aria-label="章節導覽"><a class="button secondary" href="/level/2/2-6-causal-chain/">上一章：2.6 參數因果鏈</a><a class="button primary" href="${chapterThreeTwo.route}">下一章：${chapterThreeTwo.title}</a></nav>
      </article>
      <aside class="chapter-outline"><strong>本頁大綱</strong>${outline}<div data-unit-converter></div></aside>
    </main>
  `, { pageType: "chapter", description: "從 Coburn-Winters 協同效應推導異向性、側壁鈍化、選擇比與蝕刻輪廓診斷。", extraStyles: ["/assets/css/a17-a18.css", "/assets/css/l3-casebook.css"] });
}

function chapterThreeTwoPage() {
  const objectives = chapterThreeTwo.objectives.map((item, index) => `<label class="objective"><input type="checkbox" aria-label="完成目標：${item}" data-objective="${index}" data-chapter-id="${chapterThreeTwo.id}"><span>${item}</span></label>`).join("");
  const prerequisites = chapterThreeTwo.prerequisites.map((item) => `<li>${item}</li>`).join("");
  const readings = chapterThreeTwo.readings.map((item) => `<li>${item}</li>`).join("");
  const outline = [...chapterThreeTwo.sections, ...chapterThreeTwo.labs].map((item) => `<a href="#${item.id}">${item.title}</a>`).join("");
  const sections = p3SectionsHtml(chapterThreeTwo);
  const callouts = chapterThreeTwo.callouts.map((item) => callout(item.type, item.title, item.body)).join("");
  const labsHtml = chapterThreeTwo.labs.map((lab) => labContainer(lab)).join("");
  const checks = chapterThreeTwo.selfCheck.map(([prompt, answer]) => `<details class="check-card"><summary>${prompt}</summary><p>${answer}</p></details>`).join("");
  const sidebar = [chapterThreeOne, chapterThreeTwo, chapterThreeThree].map((item) => `<a class="${item.id === chapterThreeTwo.id ? "current" : ""}" href="${item.route}">${item.title}</a>`).join("");
  return page(chapterThreeTwo.route, chapterThreeTwo.title, `
    <main class="chapter-layout" data-chapter-id="${chapterThreeTwo.id}">
      <aside class="chapter-sidebar"><strong>課程目錄</strong>${sidebar}<a href="/level/3/3-7-packaging-cleaning/">3.7 封裝清潔與表面活化</a><a href="${chapterThreeEight.route}">${chapterThreeEight.title}</a><a href="/level/3/">L3 模組列表</a></aside>
      <article class="chapter-main">
        ${breadcrumb(["首頁", "L3 進階", chapterThreeTwo.title])}
        <header class="chapter-header"><p class="chapter-meta">時數 ${chapterThreeTwo.hours} h · 互動元件 A19</p><h1>${chapterThreeTwo.title}</h1><p>${chapterThreeTwo.summary}</p></header>
        <section class="learning-card"><h2>學習目標</h2>${objectives}</section>
        <section class="chapter-support"><h2>前置知識</h2><ul>${prerequisites}</ul></section>
        ${callout("summary", "5 分鐘摘要", chapterThreeTwo.summary)}
        ${sections}${l3CasebookHtml(chapterThreeTwo)}${l3ProcessHandbookHtml(chapterThreeTwo.id)}${callouts}${labsHtml}
        <section class="self-check"><h2>自我檢測</h2>${checks}</section>
        <section class="chapter-support"><h2>延伸閱讀</h2><ul>${readings}</ul></section>
        <nav class="chapter-nav" aria-label="章節導覽"><a class="button secondary" href="${chapterThreeOne.route}">上一章：${chapterThreeOne.title}</a><a class="button primary" href="${chapterThreeThree.route}">下一章：${chapterThreeThree.title}</a></nav>
      </article>
      <aside class="chapter-outline"><strong>本頁大綱</strong>${outline}<div data-unit-converter></div></aside>
    </main>
  `, { pageType: "chapter", description: "Bosch 深矽蝕刻循環、scallop、深寬比限制與量產驗收。", extraStyles: ["/assets/css/l3-casebook.css"] });
}

function chapterThreeThreePage() {
  const objectives = chapterThreeThree.objectives.map((item, index) => `<label class="objective"><input type="checkbox" aria-label="完成目標：${item}" data-objective="${index}" data-chapter-id="${chapterThreeThree.id}"><span>${item}</span></label>`).join("");
  const prerequisites = chapterThreeThree.prerequisites.map((item) => `<li>${item}</li>`).join("");
  const readings = chapterThreeThree.readings.map((item) => `<li>${item}</li>`).join("");
  const outline = [...chapterThreeThree.sections, ...chapterThreeThree.labs].map((item) => `<a href="#${item.id}">${item.title}</a>`).join("");
  const sections = p3SectionsHtml(chapterThreeThree);
  const callouts = chapterThreeThree.callouts.map((item) => callout(item.type, item.title, item.body)).join("");
  const labsHtml = chapterThreeThree.labs.map((lab) => labContainer(lab)).join("");
  const checks = chapterThreeThree.selfCheck.map(([prompt, answer]) => `<details class="check-card"><summary>${prompt}</summary><p>${answer}</p></details>`).join("");
  const sidebar = [chapterThreeOne, chapterThreeTwo, chapterThreeThree].map((item) => `<a class="${item.id === chapterThreeThree.id ? "current" : ""}" href="${item.route}">${item.title}</a>`).join("");
  return page(chapterThreeThree.route, chapterThreeThree.title, `
    <main class="chapter-layout" data-chapter-id="${chapterThreeThree.id}">
      <aside class="chapter-sidebar"><strong>課程目錄</strong>${sidebar}<a href="/level/3/3-7-packaging-cleaning/">3.7 封裝清潔與表面活化</a><a href="${chapterThreeEight.route}">${chapterThreeEight.title}</a><a href="/defects/">缺陷圖鑑</a><a href="/level/3/">L3 模組列表</a></aside>
      <article class="chapter-main">
        ${breadcrumb(["首頁", "L3 進階", chapterThreeThree.title])}
        <header class="chapter-header"><p class="chapter-meta">時數 ${chapterThreeThree.hours} h · 互動元件 A20、A21</p><h1>${chapterThreeThree.title}</h1><p>${chapterThreeThree.summary}</p></header>
        <section class="learning-card"><h2>學習目標</h2>${objectives}</section>
        <section class="chapter-support"><h2>前置知識</h2><ul>${prerequisites}</ul></section>
        ${callout("summary", "5 分鐘摘要", chapterThreeThree.summary)}
        ${sections}${l3CasebookHtml(chapterThreeThree)}${l3ProcessHandbookHtml(chapterThreeThree.id)}${callouts}${labsHtml}
        <section class="self-check"><h2>自我檢測</h2>${checks}</section>
        <section class="chapter-support"><h2>延伸閱讀</h2><ul>${readings}</ul></section>
        <nav class="chapter-nav" aria-label="章節導覽"><a class="button secondary" href="${chapterThreeTwo.route}">上一章：${chapterThreeTwo.title}</a><a class="button primary" href="${chapterThreeFour.route}">下一章：${chapterThreeFour.title}</a></nav>
      </article>
      <aside class="chapter-outline"><strong>本頁大綱</strong>${outline}<a href="/defects/">開啟缺陷圖鑑</a><div data-unit-converter></div></aside>
    </main>
  `, { pageType: "chapter", description: "18 種蝕刻缺陷圖鑑、ARDE 機制拆解與資料驅動診斷流程。", extraStyles: ["/assets/css/a20-a21.css", "/assets/css/l3-casebook.css"] });
}

function chapterThreeFourPage() {
  const objectives = chapterThreeFour.objectives.map((item, index) => `<label class="objective"><input type="checkbox" aria-label="完成目標：${item}" data-objective="${index}" data-chapter-id="${chapterThreeFour.id}"><span>${item}</span></label>`).join("");
  const prerequisites = chapterThreeFour.prerequisites.map((item) => `<li>${item}</li>`).join("");
  const readings = chapterThreeFour.readings.map((item) => `<li>${item}</li>`).join("");
  const outline = [...chapterThreeFour.sections, ...chapterThreeFour.labs].map((item) => `<a href="#${item.id}">${item.title}</a>`).join("");
  const sections = p3SectionsHtml(chapterThreeFour);
  const callouts = chapterThreeFour.callouts.map((item) => callout(item.type, item.title, item.body)).join("");
  const labsHtml = chapterThreeFour.labs.map((lab) => labContainer(lab)).join("");
  const checks = chapterThreeFour.selfCheck.map(([prompt, answer]) => `<details class="check-card"><summary>${prompt}</summary><p>${answer}</p></details>`).join("");
  const sidebar = [chapterThreeOne, chapterThreeTwo, chapterThreeThree, chapterThreeFour, chapterThreeFive, chapterThreeSix, chapterThreeSeven, chapterThreeEight].map((item) => `<a class="${item.id === chapterThreeFour.id ? "current" : ""}" href="${item.route}">${item.title}</a>`).join("");
  return page(chapterThreeFour.route, chapterThreeFour.title, `
    <main class="chapter-layout" data-chapter-id="${chapterThreeFour.id}">
      <aside class="chapter-sidebar"><strong>課程目錄</strong>${sidebar}<a href="/level/3/">L3 模組列表</a></aside>
      <article class="chapter-main">
        ${breadcrumb(["首頁", "L3 進階", chapterThreeFour.title])}
        <header class="chapter-header"><p class="chapter-meta">時數 ${chapterThreeFour.hours} h · 互動元件 A22、A23</p><h1>${chapterThreeFour.title}</h1><p>${chapterThreeFour.summary}</p></header>
        <section class="learning-card"><h2>學習目標</h2>${objectives}</section>
        <section class="chapter-support"><h2>前置知識</h2><ul>${prerequisites}</ul></section>
        ${callout("summary", "5 分鐘摘要", chapterThreeFour.summary)}
        ${sections}${l3CasebookHtml(chapterThreeFour)}${l3ProcessHandbookHtml(chapterThreeFour.id)}${callouts}${labsHtml}
        <section class="self-check"><h2>自我檢測</h2>${checks}</section>
        <section class="chapter-support"><h2>延伸閱讀</h2><ul>${readings}</ul></section>
        <nav class="chapter-nav" aria-label="章節導覽"><a class="button secondary" href="${chapterThreeThree.route}">上一章：${chapterThreeThree.title}</a><a class="button primary" href="${chapterThreeFive.route}">下一章：${chapterThreeFive.title}</a></nav>
      </article>
      <aside class="chapter-outline"><strong>本頁大綱</strong>${outline}<div data-unit-converter></div></aside>
    </main>
  `, { pageType: "chapter", description: "PECVD、HDP-CVD 與 PEALD 的薄膜控制、保形性與高深寬比填溝。", extraStyles: ["/assets/css/a22-a23.css", "/assets/css/l3-casebook.css"] });
}

function chapterThreeFivePage() {
  return p3ChapterPage(chapterThreeFive, {
    labLabel: "A24",
    previous: chapterThreeFour,
    next: chapterThreeSix,
    description: "磁控濺鍍、靶材利用率、反應式濺鍍與遠端電漿腔體清潔。",
    extraStyles: ["/assets/css/a24-a25.css"]
  });
}

function chapterThreeSixPage() {
  return p3ChapterPage(chapterThreeSix, {
    labLabel: "A25",
    previous: chapterThreeFive,
    next: chapterThreeSeven,
    description: "晶圓均勻度定義、map 形狀診斷、腔體記憶與量產穩定度。",
    extraStyles: ["/assets/css/a24-a25.css"]
  });
}

function chapterThreeEightPage() {
  return p3ChapterPage(chapterThreeEight, {
    labLabel: "A34",
    previous: chapterThreeSeven,
    next: chapterFourOne,
    description: "PCB FR-4 via wall 的電漿除膠渣、咬蝕、玻纖 flushness 與量產驗證邊界。",
    extraStyles: []
  });
}

function p3ChapterPage(chapter, { labLabel, previous, next, description, extraStyles }) {
  const objectives = chapter.objectives.map((item, index) => `<label class="objective"><input type="checkbox" aria-label="完成目標：${item}" data-objective="${index}" data-chapter-id="${chapter.id}"><span>${item}</span></label>`).join("");
  const prerequisites = chapter.prerequisites.map((item) => `<li>${item}</li>`).join("");
  const readings = chapter.readings.map((item) => `<li>${item}</li>`).join("");
  const outline = [...chapter.sections, ...chapter.labs].map((item) => `<a href="#${item.id}">${item.title}</a>`).join("");
  const sections = p3SectionsHtml(chapter);
  const callouts = chapter.callouts.map((item) => callout(item.type, item.title, item.body)).join("");
  const labsHtml = chapter.labs.map((lab) => labContainer(lab)).join("");
  const checks = chapter.selfCheck.map(([prompt, answer]) => `<details class="check-card"><summary>${prompt}</summary><p>${answer}</p></details>`).join("");
  const sidebar = [chapterThreeOne, chapterThreeTwo, chapterThreeThree, chapterThreeFour, chapterThreeFive, chapterThreeSix, chapterThreeSeven, chapterThreeEight].map((item) => `<a class="${item.id === chapter.id ? "current" : ""}" href="${item.route}">${item.title}</a>`).join("");
  return page(chapter.route, chapter.title, `
    <main class="chapter-layout" data-chapter-id="${chapter.id}">
      <aside class="chapter-sidebar"><strong>課程目錄</strong>${sidebar}<a href="/level/3/">L3 模組列表</a></aside>
      <article class="chapter-main">
        ${breadcrumb(["首頁", "L3 進階", chapter.title])}
        <header class="chapter-header"><p class="chapter-meta">時數 ${chapter.hours} h · 互動元件 ${labLabel}</p><h1>${chapter.title}</h1><p>${chapter.summary}</p></header>
        <section class="learning-card"><h2>學習目標</h2>${objectives}</section>
        <section class="chapter-support"><h2>前置知識</h2><ul>${prerequisites}</ul></section>
        ${callout("summary", "5 分鐘摘要", chapter.summary)}
        ${sections}${l3CasebookHtml(chapter)}${l3ProcessHandbookHtml(chapter.id)}${callouts}${labsHtml}
        <section class="self-check"><h2>自我檢測</h2>${checks}</section>
        <section class="chapter-support"><h2>延伸閱讀</h2><ul>${readings}</ul></section>
        <nav class="chapter-nav" aria-label="章節導覽"><a class="button secondary" href="${previous.route}">上一章：${previous.title}</a><a class="button primary" href="${next.route}">下一章：${next.title}</a></nav>
      </article>
      <aside class="chapter-outline"><strong>本頁大綱</strong>${outline}<div data-unit-converter></div></aside>
    </main>
  `, { pageType: "chapter", description, extraStyles: [...extraStyles, "/assets/css/l3-casebook.css"] });
}

const l4Chapters = [chapterFourOne, chapterFourTwo, chapterFourThree, chapterFourFour, chapterFourFive, chapterFourSix];

function productionCasebookHtml(chapter) {
  if (!chapter.cases?.length) return "";
  const cases = chapter.cases.map((item) => `<article class="production-case case-study" id="${item.id}">
    <h3>${item.title}</h3>
    <h4>現象與資料</h4><p>${item.phenomenon}</p><p>${item.data}</p>
    <h4>競爭假說</h4><ul>${item.hypotheses.map((hypothesis) => `<li>${hypothesis}</li>`).join("")}</ul>
    <h4>驗證計畫</h4><p>${item.verification}</p>
    <details class="production-case-answer"><summary>揭曉：根因、處置、放行與預防</summary>
      <h4>根因</h4><p>${item.rootCause}</p>
      <h4>處置</h4><p>${item.action}</p>
      <h4>放行</h4><p>${item.release}</p>
      <h4>預防</h4><p>${item.prevention}</p>
      ${item.engineeringNote ? `<p class="case-checkpoint"><strong>工程提醒：</strong>${item.engineeringNote}</p>` : ""}
    </details>
  </article>`).join("");
  return `<section class="engineering-casebook production-casebook" aria-labelledby="${chapter.id}-casebook-title" id="production-casebook">
    <h2 id="${chapter.id}-casebook-title">量產案例判讀</h2>
    <p>先根據現象、資料、競爭假說與驗證計畫建立證據鏈，再展開每案的根因、處置、放行與預防。</p>
    <div class="casebook-list">${cases}</div>
  </section>`;
}

function chapterFourPage(chapter) {
  const objectives = chapter.objectives.map((item, index) => `<label class="objective"><input type="checkbox" aria-label="完成目標：${item}" data-objective="${index}" data-chapter-id="${chapter.id}"><span>${item}</span></label>`).join("");
  const prerequisites = chapter.prerequisites.map((item) => `<li>${item}</li>`).join("");
  const readings = chapter.readings.map((item) => `<li>${item}</li>`).join("");
  const outlineItems = [...chapter.sections, ...(chapter.cases?.length ? [{ id: "production-casebook", title: "量產案例判讀" }] : []), ...chapter.labs];
  const outline = outlineItems.map((item) => `<a href="#${item.id}">${item.title}</a>`).join("");
  const sections = chapter.sections.map((section) => `<section id="${section.id}" class="prose-section"><h2>${section.title}</h2>${section.body}</section>`).join("");
  const callouts = chapter.callouts.map((item) => callout(item.type, item.title, item.body)).join("");
  const labsHtml = chapter.labs.map((lab) => labContainer(lab)).join("");
  const checks = chapter.selfCheck.map(([prompt, answer]) => `<details class="check-card"><summary>${prompt}</summary><p>${answer}</p></details>`).join("");
  const chapterIndex = l4Chapters.findIndex((item) => item.id === chapter.id);
  const previous = chapterIndex === 0 ? chapterThreeEight : l4Chapters[chapterIndex - 1];
  const next = l4Chapters[chapterIndex + 1];
  const sidebar = l4Chapters.map((item) => `<a class="${item.id === chapter.id ? "current" : ""}" href="${item.route}">${item.title}</a>`).join("");
  const activityLabel = chapter.labs.length
    ? `互動元件 ${chapter.labs.map((lab) => lab.id.toUpperCase()).join("、")}`
    : `案例演練 ${chapter.cases?.length ?? 0} 則`;
  const descriptions = {
    "4-1": "Langmuir 探針、OES、actinometry 與量產診斷工具選擇。",
    "4-2": "低開口率 OES、干涉式終點、演算法、R2R、FDC 與虛擬量測。",
    "4-3": "天線效應、電漿損傷、Low-k、量測與電弧風險控制。",
    "4-4": "脈衝電漿、原子層蝕刻、高深寬比製程與封裝低損傷窗口。",
    "4-5": "模擬層級、0-D 平衡、資料可信度與封裝表面模型界線。",
    "4-6": "Chamber matching、DOE、COO、PM、EHS 與 PFC 排放治理。"
  };
  const style = chapter.id === "4-1"
    ? "/assets/css/a26-a27.css"
    : ["4-4", "4-5"].includes(chapter.id)
      ? "/assets/css/a30-a32.css"
      : ["4-2", "4-3"].includes(chapter.id) ? "/assets/css/a28-a29.css" : null;
  const sourceDisclosure = chapter.id === "4-1" ? `<p>13 條原子線：<code>nist-line-verified</code>；分子帶：<code>pending-source-review</code>；Br 470.492/478.548 nm 為 Br II。本站 <code>relativeIntensity</code> 僅為教學權重，非 NIST 相對強度。</p>` : "";
  return page(chapter.route, chapter.title, `
    <main class="chapter-layout" data-chapter-id="${chapter.id}">
      <aside class="chapter-sidebar"><strong>課程目錄</strong>${sidebar}<a href="/level/4/">L4 模組列表</a><a href="/lab/">互動實驗室</a></aside>
      <article class="chapter-main">
        ${breadcrumb(["首頁", "L4 專家", chapter.title])}
        <header class="chapter-header"><p class="chapter-meta">時數 ${chapter.hours} h · ${activityLabel}</p><h1>${chapter.title}</h1><p>${chapter.summary}</p></header>
        <section class="learning-card"><h2>學習目標</h2>${objectives}</section>
        <section class="chapter-support"><h2>前置知識</h2><ul>${prerequisites}</ul></section>
        ${callout("summary", "5 分鐘摘要", chapter.summary)}
        ${sections}${productionCasebookHtml(chapter)}${callouts}${labsHtml}
        <section class="self-check"><h2>自我檢測</h2>${checks}</section>
        <section class="chapter-support"><h2>延伸閱讀與來源狀態</h2><ul>${readings}</ul>${sourceDisclosure}</section>
        <nav class="chapter-nav" aria-label="章節導覽"><a class="button secondary" href="${previous.route}">上一章：${previous.title}</a><a class="button primary" href="${next?.route ?? "/level/4/"}">下一章：${next?.title ?? "返回 L4 模組列表"}</a></nav>
      </article>
      <aside class="chapter-outline"><strong>本頁大綱</strong>${outline}<div data-unit-converter></div></aside>
    </main>
  `, { pageType: "chapter", description: descriptions[chapter.id], extraStyles: [style, ...(chapter.cases?.length ? ["/assets/css/l3-casebook.css"] : [])].filter(Boolean) });
}

function defectAtlasPage() {
  const atlasDefects = defects.filter((item) => item.id !== "first-wafer");
  const filters = defectCategories.map((category) => `<button type="button" data-defect-filter="${category.key}">${category.name}</button>`).join("");
  const cards = atlasDefects.map((defect) => {
    const causes = defect.causes.map((item) => `<li>${item}</li>`).join("");
    const fixes = defect.fixes.map((fix) => `<tr><td>${fix.knob} ${fix.dir}</td><td>${fix.why}</td><td>${fix.sideEffect}</td></tr>`).join("");
    const related = defect.related.map((id) => defects.find((item) => item.id === id)).filter(Boolean).map((item) => `<a href="#${item.id}">${item.zh}</a>`).join("、");
    const simulator = defect.profilePresetId ? `<a class="button secondary" href="/level/3/3-1-etch-mechanisms/?profile=${defect.profilePresetId}#lab-a18">帶入 A18</a>` : "";
    return `<article class="defect-card" id="${defect.id}" data-defect-card data-category="${defect.cat}" data-search="${[defect.zh, defect.en, defect.symptom, ...defect.causes].join(" ").toLowerCase()}">
      <div class="defect-card__visual">${defectSvg(defect.id, defect.zh)}</div>
      <div class="defect-card__body"><header><div><p>${defectCategories.find((item) => item.key === defect.cat)?.name}</p><h2>${defect.zh}</h2><span>${defect.en}</span></div>${defect.risk === "high" ? `<strong class="risk-label">高風險</strong>` : ""}</header>
      <dl><dt>症狀</dt><dd>${defect.symptom}</dd><dt>診斷區分</dt><dd>${defect.distinguish}</dd></dl>
      <details><summary>物理成因、對策與副作用</summary><h3>物理成因</h3><ol>${causes}</ol><div class="table-wrap"><table><thead><tr><th>旋鈕</th><th>理由</th><th>副作用</th></tr></thead><tbody>${fixes}</tbody></table></div><p><strong>相關：</strong>${related}</p><div class="defect-actions">${simulator}<a class="button secondary" href="${chapterThreeThree.route}#lab-a21">開啟診斷器</a></div></details></div>
    </article>`;
  }).join("");
  return page("/defects/", "缺陷圖鑑", `<main class="page-shell defect-atlas" data-defect-atlas>${breadcrumb(["首頁", "缺陷圖鑑"])}<header class="page-heading"><p class="eyebrow">L3 工程工具</p><h1>蝕刻缺陷圖鑑</h1><p>18 種規畫書缺陷共用同一份症狀、成因、區分、對策與副作用資料。先看位置與形狀，再用證據收斂原因。</p></header><div class="defect-toolbar"><label>搜尋症狀或成因<input type="search" data-defect-search placeholder="例如 bowing、充電、遮罩"></label><div class="filter-row"><button class="active" type="button" data-defect-filter="all">全部 18 種</button>${filters}</div><output data-defect-count>${atlasDefects.length} 種</output></div><div class="defect-list">${cards}</div></main>`, { pageType: "defects", description: "18 種常見電漿蝕刻缺陷的剖面圖、成因、診斷區分、對策與副作用。", extraStyles: ["/assets/css/a20-a21.css"] });
}

function chapterTwoOnePage() {
  const objectives = chapterTwoOne.objectives.map((item, index) => `
    <label class="objective"><input type="checkbox" aria-label="完成目標：${item}" data-objective="${index}" data-chapter-id="${chapterTwoOne.id}"><span>${item}</span></label>
  `).join("");
  const prerequisites = chapterTwoOne.prerequisites.map((item) => `<li>${item}</li>`).join("");
  const readings = chapterTwoOne.readings.map((item) => `<li>${item}</li>`).join("");
  const outline = chapterTwoOne.sections.map((section) => `<a href="#${section.id}">${section.title}</a>`).join("");
  const sections = l2SectionsHtml(chapterTwoOne);
  const callouts = chapterTwoOne.callouts.map((item) => callout(item.type, item.title, item.body)).join("");
  const labsHtml = chapterTwoOne.labs.map((lab) => labContainer(lab)).join("");
  const checks = chapterTwoOne.selfCheck.map(([prompt, answer]) => `<details class="check-card"><summary>${prompt}</summary><p>${answer}</p></details>`).join("");
  const chapterFormulas = [formulas.idealGasDensity, formulas.residenceTime, formulas.knudsenNumber].map(formulaCard).join("");

  return page(chapterTwoOne.route, chapterTwoOne.title, `
    <main class="chapter-layout" data-chapter-id="${chapterTwoOne.id}">
      <aside class="chapter-sidebar">
        <strong>課程目錄</strong>
        <a class="current" href="${chapterTwoOne.route}">${chapterTwoOne.title}</a>
        <a href="${chapterTwoTwo.route}">${chapterTwoTwo.title}</a>
        <a href="/level/2/">L2 模組列表</a>
        <a href="/gases/">氣體百科</a>
      </aside>
      <article class="chapter-main">
        ${breadcrumb(["首頁", "L2 中階", chapterTwoOne.title])}
        <header class="chapter-header"><p class="chapter-meta">時數 ${chapterTwoOne.hours} h · 互動元件 A08</p><h1>${chapterTwoOne.title}</h1><p>${chapterTwoOne.summary}</p></header>
        <section class="learning-card"><h2>學習目標</h2>${objectives}</section>
        <section class="chapter-support"><h2>前置知識</h2><ul>${prerequisites}</ul></section>
        ${callout("summary", "5 分鐘摘要", chapterTwoOne.summary)}
        ${sections}
        ${engineeringCasesHtml(chapterTwoOne)}
        ${chapterFormulas}
        ${callouts}
        ${labsHtml}
        <section class="self-check"><h2>自我檢測</h2>${checks}</section>
        <section class="chapter-support"><h2>延伸閱讀</h2><ul>${readings}</ul></section>
        <nav class="chapter-nav" aria-label="章節導覽"><a class="button secondary" href="/level/1/1-6-process-map/">上一章：1.6 製程電漿地圖</a><a class="button primary" href="${chapterTwoTwo.route}">下一章：${chapterTwoTwo.title}</a></nav>
      </article>
      <aside class="chapter-outline"><strong>本頁大綱</strong>${outline}<div data-unit-converter></div></aside>
    </main>
  `, { pageType: "chapter" });
}

function chapterTwoTwoPage() {
  const objectives = chapterTwoTwo.objectives.map((item, index) => `
    <label class="objective"><input type="checkbox" aria-label="完成目標：${item}" data-objective="${index}" data-chapter-id="${chapterTwoTwo.id}"><span>${item}</span></label>
  `).join("");
  const prerequisites = chapterTwoTwo.prerequisites.map((item) => `<li>${item}</li>`).join("");
  const readings = chapterTwoTwo.readings.map((item) => `<li>${item}</li>`).join("");
  const outline = [...chapterTwoTwo.sections, ...chapterTwoTwo.labs].map((item) => `<a href="#${item.id}">${item.title}</a>`).join("");
  const sections = l2SectionsHtml(chapterTwoTwo);
  const callouts = chapterTwoTwo.callouts.map((item) => callout(item.type, item.title, item.body)).join("");
  const labsHtml = chapterTwoTwo.labs.map((lab) => labContainer(lab)).join("");
  const checks = chapterTwoTwo.selfCheck.map(([prompt, answer]) => `<details class="check-card"><summary>${prompt}</summary><p>${answer}</p></details>`).join("");

  return page(chapterTwoTwo.route, chapterTwoTwo.title, `
    <main class="chapter-layout" data-chapter-id="${chapterTwoTwo.id}">
      <aside class="chapter-sidebar">
        <strong>課程目錄</strong>
        <a href="${chapterTwoOne.route}">${chapterTwoOne.title}</a>
        <a class="current" href="${chapterTwoTwo.route}">${chapterTwoTwo.title}</a>
        <a href="/level/2/">L2 模組列表</a>
        <a href="/gases/">氣體百科</a>
      </aside>
      <article class="chapter-main">
        ${breadcrumb(["首頁", "L2 中階", chapterTwoTwo.title])}
        <header class="chapter-header"><p class="chapter-meta">時數 ${chapterTwoTwo.hours} h · 互動元件 A09、A10、A11</p><h1>${chapterTwoTwo.title}</h1><p>${chapterTwoTwo.summary}</p></header>
        <section class="learning-card"><h2>學習目標</h2>${objectives}</section>
        <section class="chapter-support"><h2>前置知識</h2><ul>${prerequisites}</ul></section>
        ${callout("summary", "5 分鐘摘要", chapterTwoTwo.summary)}
        ${sections}
        ${engineeringCasesHtml(chapterTwoTwo)}
        ${callouts}
        ${labsHtml}
        <section class="self-check"><h2>自我檢測</h2>${checks}</section>
        <section class="chapter-support"><h2>延伸閱讀</h2><ul>${readings}</ul></section>
        <nav class="chapter-nav" aria-label="章節導覽"><a class="button secondary" href="${chapterTwoOne.route}">上一章：${chapterTwoOne.title}</a><a class="button primary" href="/level/2/">返回 L2</a></nav>
      </article>
      <aside class="chapter-outline"><strong>本頁大綱</strong>${outline}<div data-unit-converter></div></aside>
    </main>
  `, { pageType: "chapter", description: "製程氣體選用、F/C 比、鈍化、材料相容與安全的工程教材。" });
}

function l2ChapterPage(chapter, { previous, next, formulaKeys = [], extraStyles = [], extraBodyClass = "" }) {
  const objectives = chapter.objectives.map((item, index) => `
    <label class="objective"><input type="checkbox" aria-label="完成目標：${item}" data-objective="${index}" data-chapter-id="${chapter.id}"><span>${item}</span></label>
  `).join("");
  const prerequisites = chapter.prerequisites.map((item) => `<li>${item}</li>`).join("");
  const readings = chapter.readings.map((item) => `<li>${item}</li>`).join("");
  const outline = [...chapter.sections, ...chapter.labs].map((item) => `<a href="#${item.id}">${item.title}</a>`).join("");
  const sections = l2SectionsHtml(chapter);
  const callouts = chapter.callouts.map((item) => callout(item.type, item.title, item.body)).join("");
  const labsHtml = chapter.labs.map((lab) => labContainer(lab)).join("");
  const checks = chapter.selfCheck.map(([prompt, answer]) => `<details class="check-card"><summary>${prompt}</summary><p>${answer}</p></details>`).join("");
  const chapterFormulas = formulaKeys.map((key) => formulas[key]).filter(Boolean).map(formulaCard).join("");
  const chapterLinks = [chapterTwoOne, chapterTwoTwo, chapterTwoThree, chapterTwoFour, chapterTwoFive, chapterTwoSix].map((item) => `<a class="${item.route === chapter.route ? "current" : ""}" href="${item.route}">${item.title}</a>`).join("");
  const labNames = chapter.labs.map((lab) => lab.id.toUpperCase()).join("、");

  return page(chapter.route, chapter.title, `
    <main class="chapter-layout" data-chapter-id="${chapter.id}">
      <aside class="chapter-sidebar"><strong>課程目錄</strong>${chapterLinks}<a href="/level/2/">L2 模組列表</a><a href="/gases/">氣體百科</a></aside>
      <article class="chapter-main">
        ${breadcrumb(["首頁", "L2 中階", chapter.title])}
        <header class="chapter-header"><p class="chapter-meta">時數 ${chapter.hours} h · 互動元件 ${labNames}</p><h1>${chapter.title}</h1><p>${chapter.summary}</p></header>
        <section class="learning-card"><h2>學習目標</h2>${objectives}</section>
        <section class="chapter-support"><h2>前置知識</h2><ul>${prerequisites}</ul></section>
        ${callout("summary", "5 分鐘摘要", chapter.summary)}
        ${sections}
        ${engineeringCasesHtml(chapter)}
        ${chapterFormulas}
        ${callouts}
        ${labsHtml}
        <section class="self-check"><h2>自我檢測</h2>${checks}</section>
        <section class="chapter-support"><h2>延伸閱讀</h2><ul>${readings}</ul></section>
        <nav class="chapter-nav" aria-label="章節導覽"><a class="button secondary" href="${previous.href}">上一章：${previous.title}</a><a class="button primary" href="${next.href}">下一章：${next.title}</a></nav>
      </article>
      <aside class="chapter-outline"><strong>本頁大綱</strong>${outline}<div data-unit-converter></div></aside>
    </main>
  `, { pageType: "chapter", extraStyles, extraBodyClass });
}

function l2SectionsHtml(chapter) {
  const chapterDiagrams = l2Diagrams.filter((diagram) => diagram.chapter === chapter.id);
  return chapter.sections.map((section) => {
    const figures = chapterDiagrams.filter((diagram) => diagram.section === section.id).map((diagram) => {
      const number = `${chapter.id.replace("-", ".")}-${chapterDiagrams.indexOf(diagram) + 1}`;
      return `<figure class="instruction-diagram"><img src="/assets/svg/l2/${diagram.id}.svg" width="760" height="360" loading="lazy" alt="${diagram.caption}"><figcaption><strong>圖 ${number} ${diagram.title}</strong>${diagram.caption}</figcaption></figure>`;
    }).join("");
    return `<section id="${section.id}" class="prose-section"><h2>${section.title}</h2>${section.body}${figures}</section>`;
  }).join("");
}

function p3SectionsHtml(chapter) {
  const chapterDiagrams = l3Diagrams.filter((diagram) => diagram.chapter === chapter.id);
  return chapter.sections.map((section) => {
    const figures = chapterDiagrams.filter((diagram) => diagram.section === section.id).map((diagram) => {
      const number = `${chapter.id.replace("-", ".")}-${chapterDiagrams.indexOf(diagram) + 1}`;
      return `<figure class="instruction-diagram"><img src="/assets/svg/l3/${diagram.id}.svg" width="760" height="360" loading="lazy" alt="${diagram.caption}"><figcaption><strong>圖 ${number} ${diagram.title}</strong>${diagram.caption}</figcaption></figure>`;
    }).join("");
    return `<section id="${section.id}" class="prose-section"><h2>${section.title}</h2>${section.body}${figures}</section>`;
  }).join("");
}

function engineeringCasesHtml(chapter) {
  const cases = l2EngineeringCases[chapter.id] ?? [];
  const exercise = l2ShiftExercises[chapter.id];
  const casesHtml = cases.map((item) => `<details class="check-card case-study" id="${item.id}">
    <summary><span>${item.title}</span><strong>展開案例</strong></summary>
    <h3>現場情境</h3><p>${item.context}</p>
    <h3>機制拆解</h3><p>${item.mechanism}</p>
    <h3>診斷路徑</h3><p>${item.diagnosis}</p>
    <h3>處置原則</h3><p>${item.action}</p>
    <p class="case-checkpoint"><strong>交班前確認：</strong>${item.checkpoint}</p>
  </details>`).join("");
  const exerciseHtml = exercise ? `<details class="check-card shift-exercise" id="${chapter.id}-shift-exercise">
    <summary><span>${exercise.title}</span><strong>開始演練</strong></summary>
    <h3>事件</h3><p>${exercise.situation}</p>
    <h3>推理步驟</h3><p>${exercise.walkthrough}</p>
    <h3>決策界線</h3><p>${exercise.decision}</p>
    <h3>交班紀錄</h3><p>${exercise.record}</p>
  </details>` : "";
  return `<section class="engineering-casebook" aria-labelledby="${chapter.id}-casebook-title">
    <h2 id="${chapter.id}-casebook-title">工程案例深讀</h2>
    <p>展開案例，沿著「情境 → 機制 → 診斷 → 處置」完成可反證的工程判讀。</p>
    <div class="casebook-list">${casesHtml}${exerciseHtml}</div>
  </section>`;
}

function l3CasebookHtml(chapter) {
  const guide = l3FieldGuides[chapter.id];
  const cases = l3EngineeringCases[chapter.id] ?? [];
  const exercise = l3ShiftExercises[chapter.id];
  const guideHtml = guide ? `<section class="l3-field-guide" aria-labelledby="${chapter.id}-field-guide-title">
    <h2 id="${chapter.id}-field-guide-title">${guide.title}</h2>
    <dl class="field-guide-grid">
      <div><dt>判讀範圍</dt><dd>${guide.scope}</dd></div>
      <div><dt>最低證據</dt><dd>${guide.evidence}</dd></div>
      <div><dt>區分實驗</dt><dd>${guide.experiment}</dd></div>
      <div><dt>放行與交班</dt><dd>${guide.release}</dd></div>
    </dl>
  </section>` : "";
  const casesHtml = cases.map((item) => `<details class="check-card case-study" id="${item.id}">
    <summary><span>${item.title}</span><strong>展開案例</strong></summary>
    <h3>現場情境</h3><p>${item.context}</p>
    <h3>機制拆解</h3><p>${item.mechanism}</p>
    <h3>診斷路徑</h3><p>${item.diagnosis}</p>
    <h3>處置原則</h3><p>${item.action}</p>
    <p class="case-checkpoint"><strong>交班前確認：</strong>${item.checkpoint}</p>
  </details>`).join("");
  const exerciseHtml = exercise ? `<details class="check-card shift-exercise" id="${chapter.id}-shift-exercise">
    <summary><span>${exercise.title}</span><strong>開始演練</strong></summary>
    <h3>事件</h3><p>${exercise.situation}</p>
    <h3>推理步驟</h3><p>${exercise.walkthrough}</p>
    <h3>決策界線</h3><p>${exercise.decision}</p>
    <h3>交班紀錄</h3><p>${exercise.record}</p>
  </details>` : "";
  return `${guideHtml}<section class="engineering-casebook" aria-labelledby="${chapter.id}-casebook-title">
    <h2 id="${chapter.id}-casebook-title">工程案例深讀</h2>
    <p>先寫下可反證假說，再展開案例比較「情境 → 機制 → 診斷 → 處置」是否形成完整證據鏈。</p>
    <div class="casebook-list">${casesHtml}${exerciseHtml}</div>
  </section>`;
}

function processHandbookHtml({ id, eyebrow, title, intro, protocols, handbookClass = "", protocolClass = "" }) {
  const protocolsHtml = protocols.map((item) => `<details class="check-card process-protocol ${protocolClass}" id="${item.id}">
    <summary><span>${item.title}</span><strong>展開手冊</strong></summary>
    <h3>工程目的</h3><p>${item.purpose}</p>
    <h3>最低證據</h3><p>${item.evidence}</p>
    <h3>區分實驗</h3><p>${item.experiment}</p>
    <h3>放行界線</h3><p>${item.release}</p>
    <h3>常見失誤</h3><p>${item.pitfalls}</p>
    <p class="case-checkpoint"><strong>交班紀錄：</strong>${item.handoff}</p>
  </details>`).join("");
  return `<section class="process-handbook ${handbookClass}" aria-labelledby="${id}-title">
    <p class="eyebrow">${eyebrow}</p>
    <h2 id="${id}-title">${title}</h2>
    <p>${intro}</p>
    <div class="protocol-list">${protocolsHtml}</div>
  </section>`;
}

function l3ProcessHandbookHtml(chapterId) {
  const metadata = {
    "3-1": {
      eyebrow: "蝕刻機制工程手冊",
      title: "從機制假說到量產放行",
      intro: "八份工作協定把離子、自由基、鈍化、遮罩與終點訊號轉成可區分、可量測、可交班的工程證據。"
    },
    "3-2": {
      eyebrow: "高深寬比製程手冊",
      title: "從深蝕刻窗口到整合驗收",
      intro: "八份工作協定涵蓋 gate、HAR dielectric、spacer、金屬、Bosch、低溫與 loading，協助把截面結果連回實際製程狀態。"
    },
    "3-3": {
      eyebrow: "蝕刻缺陷工程手冊",
      title: "從空間指紋到受控復歸",
      intro: "八份工作協定把 ARDE、輪廓、殘留、充電與量測可信度連回可反證的診斷、隔離與復歸證據。"
    },
    "3-4": {
      eyebrow: "電漿沉積工程手冊",
      title: "從薄膜窗口到可靠度閉環",
      intro: "八份工作協定涵蓋 PECVD、HDP、PEALD、傳輸、前驅物與 chamber memory，將薄膜結果連回量產驗收。"
    },
    "3-5": {
      eyebrow: "PVD 與清腔工程手冊",
      title: "從靶材狀態到受控清潔",
      intro: "八份工作協定把濺鍍能量、反應式遲滯、preclean、零件壽命與 EH&S 限制轉成可追溯的工程判斷。"
    },
    "3-6": {
      eyebrow: "均勻度與腔體工程手冊",
      title: "從空間 Map 到跨腔放行",
      intro: "八份工作協定把 map 定義、座標對位、zone 控制、matching、PM 與 run-to-run qualification 串成完整證據鏈。"
    }
  };
  const entry = metadata[chapterId];
  const protocols = l3ProcessProtocolsPart1[chapterId] ?? l3ProcessProtocolsPart2[chapterId] ?? [];
  if (!entry || !protocols.length) return "";
  return processHandbookHtml({ id: `${chapterId}-process-handbook`, ...entry, protocols });
}

function packagingCleaningHandbookHtml() {
  return processHandbookHtml({
    id: "packaging-handbook",
    eyebrow: "封裝清潔工程手冊",
    title: "從表面活化到可靠度放行",
    intro: "八份可展開工作手冊把清潔開發拆成材料、設備、量測、物流、再處理與變更管制，供 DOE 規畫與交班使用。",
    protocols: packagingCleaningProtocols,
    handbookClass: "packaging-handbook",
    protocolClass: "packaging-protocol"
  });
}

function chapterTwoThreePage() {
  return l2ChapterPage(chapterTwoThree, {
    previous: { href: chapterTwoTwo.route, title: chapterTwoTwo.title },
    next: { href: chapterTwoFour.route, title: chapterTwoFour.title },
    formulaKeys: ["rateCoefficient"]
  });
}

function chapterTwoFourPage() {
  return l2ChapterPage(chapterTwoFour, {
    previous: { href: chapterTwoThree.route, title: chapterTwoThree.title },
    next: { href: chapterTwoFive.route, title: chapterTwoFive.title },
    formulaKeys: ["bohmIonFlux"]
  });
}

function chapterTwoFivePage() {
  return l2ChapterPage(chapterTwoFive, {
    previous: { href: chapterTwoFour.route, title: chapterTwoFour.title },
    next: { href: chapterTwoSix.route, title: chapterTwoSix.title }
  });
}

function chapterTwoSixPage() {
  return l2ChapterPage(chapterTwoSix, {
    previous: { href: chapterTwoFive.route, title: chapterTwoFive.title },
    next: { href: "/level/3/", title: "L3 製程應用與整合" },
    extraStyles: ["/assets/css/a16.css"],
    extraBodyClass: "a16-page"
  });
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
        <p>34 件互動元件共用同一套 lifecycle、controls、plot、particle engine 與 canvas theme 模組；已完成的元件可從章節直接操作。</p>
      </section>
      <div class="filter-row" role="group" aria-label="實驗室篩選">
        <button type="button" class="segmented active" data-filter="all">全部</button>
        <button type="button" class="segmented" data-filter="1">L1</button>
        <button type="button" class="segmented" data-filter="2">L2</button>
        <button type="button" class="segmented" data-filter="3">L3</button>
        <button type="button" class="segmented" data-filter="4">L4</button>
      </div>
      <section>
        <h2>元件列表</h2>
        <div class="lab-grid">${cards}</div>
      </section>
    </main>
  `);
}

function progressPage() {
  const certificateModules = curriculum.levels.flatMap((level) => level.modules.map((module) => `
    <li data-certificate-module="${module.id}"><strong>${module.id}</strong><span>${module.title}</span></li>
  `)).join("");
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
        <section class="progress-badge" data-progress-l1-badge>
          <div>
            <span class="badge-mark" aria-hidden="true">L1</span>
            <div><strong>電漿入門</strong><p data-progress-l1-status>尚未通過 L1 結業測驗</p></div>
          </div>
          <a class="button secondary" href="/level/1/exam/">查看測驗</a>
        </section>
        <section class="progress-badge" data-progress-l2-badge>
          <div>
            <span class="badge-mark" aria-hidden="true">L2</span>
            <div><strong>氣體與電漿源</strong><p data-progress-l2-status>尚未通過 L2 結業測驗</p></div>
          </div>
          <a class="button secondary" href="/level/2/exam/">查看測驗</a>
        </section>
        <section class="progress-badge" data-progress-l3-badge>
          <div>
            <span class="badge-mark" aria-hidden="true">L3</span>
            <div><strong>製程應用與診斷</strong><p data-progress-l3-status>尚未通過 L3 結業測驗</p></div>
          </div>
          <a class="button secondary" href="/level/3/exam/">查看測驗</a>
        </section>
        <section class="progress-badge" data-progress-l4-badge>
          <div>
            <span class="badge-mark" aria-hidden="true">L4</span>
            <div><strong>電漿專家</strong><p data-progress-l4-status>尚未通過 L4 結業測驗</p></div>
          </div>
          <a class="button secondary" href="/level/4/exam/">查看測驗</a>
        </section>
        <section class="progress-badge progress-badge--completion" data-progress-all-badge>
          <div>
            <span class="badge-mark" aria-hidden="true">ALL</span>
            <div><strong>全程完訓</strong><p data-progress-all-status>需通過四階測驗並完成 26 章全部學習目標</p></div>
          </div>
        </section>
        <section class="certificate-panel" data-certificate-panel>
          <div>
            <h2>本機完訓證書</h2>
            <p>通過四階測驗並完成 26 章全部學習目標後，可輸入姓名產生列印版訓練紀錄。</p>
          </div>
          <label class="certificate-name"><span>學員姓名</span><input type="text" maxlength="80" autocomplete="name" data-certificate-name></label>
          <p class="meta" data-certificate-status aria-live="polite">正在確認完訓資格…</p>
          <button class="button primary" type="button" data-certificate-generate disabled>產生證書</button>
        </section>
        <article class="training-certificate" data-training-certificate hidden aria-label="Plasma Academy 全程完訓證書">
          <header>
            <p>Plasma Academy</p>
            <h2>全程完訓證書</h2>
            <p>茲證明 <strong data-certificate-learner></strong> 已完成 Plasma Academy 四階訓練。</p>
          </header>
          <dl class="certificate-facts">
            <div><dt>完成階段</dt><dd data-certificate-levels>L1 電漿入門、L2 氣體與電漿源、L3 製程應用與診斷、L4 電漿專家</dd></div>
            <div><dt>完成日期</dt><dd data-certificate-date></dd></div>
          </dl>
          <section>
            <h3>完成模組（26）</h3>
            <ol class="certificate-modules">${certificateModules}</ol>
          </section>
          <p class="certificate-disclaimer">本證書由學習者本機產生，供內部訓練紀錄參考，非第三方認證。</p>
          <button class="button secondary certificate-print" type="button" data-certificate-print>列印證書</button>
        </article>
        <div class="progress-actions">
          <button class="button primary" type="button" data-export-progress>匯出 JSON</button>
          <label class="button secondary file-button">匯入 JSON<input type="file" accept="application/json" data-import-progress></label>
          <button class="button danger" type="button" data-reset-progress>清除本機進度</button>
        </div>
        <p class="meta" data-import-status aria-live="polite"></p>
        <textarea class="progress-json" data-progress-json readonly aria-label="目前進度 JSON"></textarea>
      </section>
    </main>
  `);
}

function examPage(level) {
  const spec = { 1: level1ExamSpec, 2: level2ExamSpec, 3: level3ExamSpec, 4: level4ExamSpec }[level];
  const bankSize = { 1: 55, 2: 80, 3: 116, 4: 85 }[level];
  const drawCount = Object.values(spec.draw).reduce((sum, count) => sum + count, 0);
  const levelName = { 1: "初階", 2: "中階", 3: "進階", 4: "專家" }[level];
  const chapterRequirement = level === 3 ? "完成 8 章中的 7 章學習目標後可開始" : "完成 6 章中的 5 章學習目標後可開始";
  return page(`/level/${level}/exam/`, spec.title, `
    <main class="content-shell narrow" data-exam-page data-exam-level="${level}" data-exam-minutes="${spec.durationMinutes}">
      ${breadcrumb(["首頁", `L${level} ${levelName}`, "結業測驗"])}
      <section class="page-intro">
        <p class="chapter-meta">L${level} 認證 · ${spec.durationMinutes} 分鐘 · ${spec.passPercent}% 通過</p>
        <h1>${spec.title}</h1>
        <p>每次從 ${bankSize} 題中重抽 ${drawCount} 題。交卷前不顯示答案，交卷後提供逐選項解析並把最佳成績保存在這台瀏覽器。</p>
      </section>
      <section class="exam-entry" data-exam-entry>
        <div class="exam-entry__status">
          <strong data-exam-unlock-title>正在確認學習進度</strong>
          <p data-exam-unlock-status aria-live="polite">${chapterRequirement}。</p>
        </div>
        <button class="button primary" type="button" data-exam-start disabled>開始測驗</button>
      </section>
      <section class="exam-shell" data-exam-shell hidden>
        <header class="exam-toolbar">
          <div><strong data-exam-position>第 1 / ${drawCount} 題</strong><span data-exam-type>單選題</span></div>
          <div class="exam-timer" role="timer" aria-label="剩餘時間"><span aria-hidden="true">◷</span><strong data-exam-timer>${String(spec.durationMinutes).padStart(2, "0")}:00</strong></div>
          <progress data-exam-progress max="${drawCount}" value="1">1 / ${drawCount}</progress>
        </header>
        <nav class="exam-question-nav" data-exam-question-nav aria-label="題目導覽"></nav>
        <form data-exam-form></form>
        <div class="exam-actions">
          <button class="button secondary" type="button" data-exam-previous>上一題</button>
          <button class="button primary" type="button" data-exam-next>下一題</button>
          <button class="button primary" type="button" data-exam-submit hidden>交卷</button>
        </div>
      </section>
      <section class="exam-results" data-exam-results hidden aria-live="polite"></section>
    </main>
  `, { pageType: "exam" });
}

function glossaryPage() {
  const rows = glossary.map((term) => `
    <tr><td>${term.zh}</td><td>${term.en}</td><td>${term.definition}</td><td>${term.chapter}</td></tr>
  `).join("");
  return page("/glossary/", "術語表", `
    <main class="content-shell">
      ${breadcrumb(["首頁", "術語表"])}
      <section class="page-intro"><h1>術語表</h1><p>收錄課綱來源術語與封裝清潔擴充詞彙；中英文名稱、定義與章節索引由資料模組統一產生。</p></section>
      <div class="table-wrap"><table><thead><tr><th>中文</th><th>英文</th><th>定義</th><th>章節</th></tr></thead><tbody>${rows}</tbody></table></div>
    </main>
  `);
}

function gasesPage() {
  const familyOptions = gasFamilies.map((family) => `<option value="${family}">${family}</option>`).join("");
  const useOptions = [...new Set(gases.flatMap((gas) => gas.uses))].sort((a, b) => a.localeCompare(b, "zh-Hant"))
    .map((use) => `<option value="${use}">${use}</option>`).join("");
  const hazardOptions = Object.entries(hazardLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  const cards = gases.map((gas) => {
    const evidence = sdsEvidenceByGas[gas.id];
    const evidenceLabel = evidence.reviewStatus === "supplier-reviewed"
      ? `已核對供應商 SDS ${evidence.documentId}（${evidence.revisionDate}，v${evidence.version}）；仍待廠區核准版。`
      : "已有供應商 SDS 目錄入口；待定位文件並核對廠區核准版。";
    const linkLabel = evidence.reviewStatus === "supplier-reviewed" ? "開啟已核對文件" : "搜尋供應商 SDS";
    return `
    <article class="gas-card" data-gas-card data-family="${gas.family}" data-hazard="${gas.hazardLevel}" data-uses="${gas.uses.join("|")}" data-query="${[gas.formula, gas.nameZh, gas.nameEn, ...gas.uses, ...gas.dissociationProducts].join(" ").toLowerCase()}">
      <header class="gas-card__header">
        <div><span class="gas-formula">${gas.formula}</span><h2>${gas.nameZh}</h2><p>${gas.nameEn}</p></div>
        <span class="hazard-badge hazard-${gas.hazardLevel}">${gas.hazardLabel}</span>
      </header>
      <div class="tag-row">${gas.uses.slice(0, 4).map((use) => `<span>${use}</span>`).join("")}</div>
      <dl class="gas-summary">
        <div><dt>家族</dt><dd>${gas.family}</dd></div>
        <div><dt>分子量</dt><dd>${gas.molecularWeight} g/mol</dd></div>
        <div><dt>F/C</dt><dd>${gas.fcRatio ?? "—"}</dd></div>
        <div><dt>GWP100</dt><dd>${gas.gwp || "0 / 未列"}</dd></div>
      </dl>
      <details>
        <summary>展開完整資料</summary>
        <dl class="gas-details">
          <div><dt>CAS</dt><dd>${gas.cas}</dd></div>
          <div><dt>沸點</dt><dd>${gas.boilingPointC}°C</dd></div>
          <div><dt>蒸氣壓／供應</dt><dd>${gas.vaporPressure}</dd></div>
          <div><dt>解離產物</dt><dd>${gas.dissociationProducts.join("、")}</dd></div>
          <div><dt>第一游離能</dt><dd>約 ${gas.ionizationEnergyEv} eV</dd></div>
          <div><dt>主要鍵結</dt><dd>${gas.bondEnergy}</dd></div>
          <div><dt>典型流量</dt><dd>${gas.typicalFlowSccm}</dd></div>
          <div><dt>危害</dt><dd>${gas.hazards.join("、")}</dd></div>
          <div><dt>控制措施</dt><dd>${gas.controls}</dd></div>
          <div><dt>相容材質</dt><dd>${gas.compatibleMaterials.join("、")}</dd></div>
          <div><dt>禁用／待確認</dt><dd>${gas.incompatibleMaterials.join("、")}</dd></div>
          <div><dt>蝕刻／沉積產物</dt><dd>${gas.etchProducts.join("、")}</dd></div>
          <div><dt>排氣處理</dt><dd>${gas.scrubber}</dd></div>
          <div><dt>常見故障</dt><dd>${gas.failureModes.join("、")}</dd></div>
        </dl>
        <p class="sds-status" data-sds-status="${evidence.reviewStatus}"><strong>SDS 狀態：</strong>${evidenceLabel}<a href="${evidence.sourceUrl}" target="_blank" rel="noopener noreferrer">${linkLabel}</a></p>
      </details>
    </article>`;
  }).join("");
  const fcAxis = gases.filter((gas) => gas.fcRatio !== null).sort((a, b) => a.fcRatio - b.fcRatio).map((gas) => `
    <li><strong>${gas.formula}</strong><span>${gas.fcRatio}</span></li>
  `).join("");

  return page("/gases/", "氣體百科", `
    <main class="content-shell" data-gas-browser>
      ${breadcrumb(["首頁", "氣體百科"])}
      <section class="page-intro gas-intro">
        <p class="chapter-meta">P2 資料模組 · A11 氣體百科瀏覽器 · 32 種製程氣體</p>
        <h1>氣體百科</h1>
        <p>用同一份資料查氣體角色、F/C 比、危害、材質與排氣處理。安全欄位是教材索引，不取代廠區核准 SDS、EH&amp;S 規範或設備相容性審查。</p>
      </section>
      <section class="gas-toolbar" aria-label="氣體篩選">
        <label>搜尋<input type="search" data-gas-search placeholder="分子式、名稱、用途或自由基"></label>
        <label>家族<select data-gas-family><option value="all">全部家族</option>${familyOptions}</select></label>
        <label>用途<select data-gas-use><option value="all">全部用途</option>${useOptions}</select></label>
        <label>危害<select data-gas-hazard><option value="all">全部等級</option>${hazardOptions}</select></label>
        <label>排序<select data-gas-sort><option value="family">家族與名稱</option><option value="fc">F/C 由高到低</option><option value="hazard">危害由高到低</option></select></label>
      </section>
      <p class="gas-result-count" data-gas-count aria-live="polite">顯示 32 種氣體</p>
      <section class="fc-axis" aria-labelledby="fc-axis-title">
        <div><h2 id="fc-axis-title">氟碳氣體 F/C 比</h2><p>由左至右自由 F 傾向增加；低 F/C 端的 CFx 聚合傾向較強。實際有效 F/C 還會受 O₂、H₂、功率與表面消耗影響。</p></div>
        <ol>${fcAxis}</ol>
      </section>
      <section class="gas-grid" data-gas-grid aria-label="氣體卡片">${cards}</section>
      <p class="empty-state" data-gas-empty hidden>沒有符合目前條件的氣體。</p>
    </main>
  `, { pageType: "gases", description: "32 種半導體製程氣體的用途、F/C 比、危害與排氣處理資料。", extraStyles: ["/assets/css/gases.css"] });
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

function notFoundPage() {
  return page("/404.html", "找不到頁面", `
    <main class="content-shell narrow">
      ${breadcrumb(["首頁", "找不到頁面"])}
      <section class="page-intro">
        <p class="chapter-meta">HTTP 404</p>
        <h1>找不到這個頁面</h1>
        <p>網址可能已變更或輸入錯誤。請回到首頁、學習路徑或互動實驗室繼續查找。</p>
        <div class="hero-actions">
          <a class="button primary" href="/">回到首頁</a>
          <a class="button secondary" href="/lab/">前往互動實驗室</a>
        </div>
      </section>
    </main>
  `, { pageType: "not-found", description: "Plasma Academy 找不到頁面的導覽入口。" });
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
  await cp(path.join(root, "src", "static", "_headers"), path.join(out, "_headers"));
  await mkdir(path.join(out, "data"), { recursive: true });
  await cp(path.join(root, "src", "data", "spectra.js"), path.join(out, "data", "spectra.js"));
  await cp(path.join(root, "src", "data", "evidence.js"), path.join(out, "data", "evidence.js"));
  await mkdir(path.join(root, "dist", "server"), { recursive: true });
  await cp(path.join(root, "worker", "index.js"), path.join(root, "dist", "server", "index.js"));
  try {
    await access(path.join(root, ".openai", "hosting.json"));
    await cp(path.join(root, ".openai"), path.join(root, "dist", ".openai"), { recursive: true });
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
    ...l1FoundationChapters.map(l1ChapterPage),
    chapterTwoOnePage(),
    chapterTwoTwoPage(),
    chapterTwoThreePage(),
    chapterTwoFourPage(),
    chapterTwoFivePage(),
    chapterTwoSixPage(),
    chapterThreeOnePage(),
    chapterThreeTwoPage(),
    chapterThreeThreePage(),
    chapterThreeFourPage(),
    chapterThreeFivePage(),
    chapterThreeSixPage(),
    packagingCleaningPage(),
    chapterThreeEightPage(),
    ...l4Chapters.map(chapterFourPage),
    labPage(),
    progressPage(),
    examPage(1),
    examPage(2),
    examPage(3),
    examPage(4),
    gasesPage(),
    defectAtlasPage(),
    glossaryPage(),
    formulasPage()
  ];
  await Promise.all(pages.map(writePage));
  await writeFile(path.join(out, "404.html"), notFoundPage().html);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(({ route }) => `  <url><loc>${siteUrl}${route}</loc></url>`).join("\n")}\n</urlset>\n`;
  await writeFile(path.join(out, "sitemap.xml"), sitemap);
  await writeFile(path.join(out, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);

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
