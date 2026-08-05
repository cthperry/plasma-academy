/* ==========================================================================
   build.mjs — 靜態站建置

   模板 + 內容片段 → dist/ 完整 HTML。無框架、無相依套件,只用 Node 內建。

   內容檔格式:開頭一段 JSON meta,其餘為 <main> 內的 HTML 片段
     <!--meta
     { "title": "...", "type": "chapter", "module": "1.1" }
     -->
   ========================================================================== */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  cpSync,
  rmSync,
  existsSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, sep } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");
const TEMPLATE = readFileSync(join(ROOT, "build/templates/page.html"), "utf8");

// ---- 課程結構(從 curriculum.js 取,維持單一來源)-------------------------

const curriculum = loadCurriculum();

function loadCurriculum() {
  const code = readFileSync(join(SRC, "data/curriculum.js"), "utf8");
  const sandbox = { window: {} };
  // 用 Function 而非 vm,避免額外相依
  new Function("window", code)(sandbox.window);
  return sandbox.window.PA.curriculum;
}

// ---- 工具 ------------------------------------------------------------------

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseContent(raw) {
  const m = raw.match(/^\s*<!--meta\s*([\s\S]*?)-->\s*/);
  if (!m) return { meta: {}, body: raw };
  let meta = {};
  try {
    meta = JSON.parse(m[1]);
  } catch (e) {
    throw new Error("meta 區塊不是合法 JSON:" + e.message);
  }
  return { meta, body: raw.slice(m[0].length) };
}

/** dist 相對深度 → base 前綴 */
function baseFor(outRelDir) {
  if (!outRelDir || outRelDir === ".") return "";
  const depth = outRelDir.split(sep).filter(Boolean).length;
  return "../".repeat(depth);
}

// ---- 側欄與大綱 ------------------------------------------------------------

function renderSidebar(base, activeModule) {
  const parts = [
    '<aside class="pa-sidebar"><div class="pa-sidebar__inner"><nav class="pa-toc" aria-label="章節目錄">',
  ];

  for (const lv of curriculum.levels) {
    parts.push(
      `<div class="pa-toc__level" style="--level-color:${lv.color}">` +
        `<div class="pa-toc__level-title">L${lv.no} ${esc(lv.name)}</div><ul>`
    );
    for (const m of curriculum.modulesOfLevel(lv.no)) {
      const cur = m.id === activeModule ? ' aria-current="page"' : "";
      parts.push(
        `<li><a href="${base}${m.url}" data-module="${m.id}"${cur}>` +
          `<span class="pa-toc__num">${m.id}</span>` +
          `<span>${esc(m.title)}</span></a></li>`
      );
    }
    parts.push("</ul></div>");
  }

  parts.push("</nav></div></aside>");
  return parts.join("");
}

/** 由內容中的 h2/h3 產生右側大綱 */
function renderOutline(body) {
  const heads = [...body.matchAll(/<h([23])[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g)];
  if (heads.length < 2) return "";

  const items = heads
    .map(([, lvl, id, text]) => {
      // 去掉標題裡的 emoji 與編號前綴,大綱只留文字
      const clean = text
        .replace(/<[^>]+>/g, "")
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
        .trim();
      const cls = lvl === "3" ? ' class="is-sub"' : "";
      return `<li${cls}><a href="#${id}">${esc(clean)}</a></li>`;
    })
    .join("");

  return (
    '<aside class="pa-outline"><div class="pa-outline__inner">' +
    '<div class="pa-outline__title">本頁大綱</div>' +
    `<nav aria-label="本頁大綱"><ul>${items}</ul></nav>` +
    '<div data-units></div>' +
    "</div></aside>"
  );
}

// ---- 章節頁的自動區塊 ------------------------------------------------------

function renderBreadcrumb(base, meta) {
  if (meta.type !== "chapter") return "";
  const mod = curriculum.byId[meta.module];
  const lv = curriculum.level(mod.level);
  return (
    '<nav aria-label="麵包屑"><ol class="pa-breadcrumb">' +
    `<li><a href="${base}">首頁</a></li>` +
    `<li><a href="${base}level/${lv.no}/">L${lv.no} ${esc(lv.name)}</a></li>` +
    `<li>${esc(mod.id)} ${esc(mod.title)}</li>` +
    "</ol></nav>"
  );
}

function renderChapterNav(base, meta) {
  if (meta.type !== "chapter") return "";
  const prev = curriculum.prev(meta.module);
  const next = curriculum.next(meta.module);
  if (!prev && !next) return "";

  let html = '<nav class="pa-chapter-nav" aria-label="章節導覽">';
  html += prev
    ? `<a href="${base}${prev.url}" data-nav-prev rel="prev">` +
      '<span class="pa-chapter-nav__label">← 上一章</span>' +
      `<span class="pa-chapter-nav__title">${prev.id} ${esc(prev.title)}</span></a>`
    : "<span></span>";
  html += next
    ? `<a href="${base}${next.url}" class="is-next" data-nav-next rel="next">` +
      '<span class="pa-chapter-nav__label">下一章 →</span>' +
      `<span class="pa-chapter-nav__title">${next.id} ${esc(next.title)}</span></a>`
    : "<span></span>";
  return html + "</nav>";
}

// ---- 內容中的建置期區塊 ----------------------------------------------------

/**
 * 內容檔可用 {{learningPath}} 等佔位符,由建置期展開。
 * 好處:無 JS 也看得到完整結構,同時課程資料仍是單一來源。
 */
function expandPartials(body, base) {
  return body
    .replace(/\{\{learningPath\}\}/g, renderLearningPath(base))
    .replace(/\{\{moduleGrid:(\d)\}\}/g, (_, lv) => renderModuleGrid(base, +lv))
    .replace(/\{\{stats\}\}/g, renderStats());
}

function renderLearningPath(base) {
  return (
    '<div class="pa-path" id="path">' +
    curriculum.levels
      .map((lv) => {
        const mods = curriculum.modulesOfLevel(lv.no);
        return (
          `<a class="pa-path__level" href="${base}level/${lv.no}/" style="--level-color:${lv.color}" data-level="${lv.no}">` +
          `<span class="pa-path__badge">L${lv.no}</span>` +
          `<div class="pa-path__name">${esc(lv.name)} · ${esc(lv.subtitle)}</div>` +
          `<p class="pa-path__q">${esc(lv.question)}</p>` +
          '<div class="pa-path__foot">' +
          `<span>${mods.length} 模組 · ${lv.hours} 小時 · ${mods.reduce((s, m) => s + m.labs.length, 0)} 個互動元件</span>` +
          `<span data-level-progress="${lv.no}"></span>` +
          "</div></a>"
        );
      })
      .join("") +
    "</div>"
  );
}

function renderModuleGrid(base, levelNo) {
  const lv = curriculum.level(levelNo);
  return (
    '<div class="pa-grid">' +
    curriculum
      .modulesOfLevel(levelNo)
      .map(
        (m) =>
          `<a class="pa-card" href="${base}${m.url}" style="--level-color:${lv.color}">` +
          '<div class="pa-card__title">' +
          `<span class="pa-card__num">${m.id}</span>` +
          `<span>${esc(m.title)}${m.flagship ? " ★" : ""}</span>` +
          "</div>" +
          '<div class="pa-card__meta">' +
          `<span>${m.hours} 小時</span>` +
          (m.labs.length ? `<span>${m.labs.length} 個互動元件</span>` : "") +
          (m.prereqs.length ? `<span>先修 ${m.prereqs.join("、")}</span>` : "") +
          "</div></a>"
      )
      .join("") +
    "</div>"
  );
}

function renderStats() {
  const c = curriculum;
  return (
    '<div class="pa-card__meta" style="margin:0 0 var(--pa-space-5)">' +
    `<span><strong>${c.levels.length}</strong> 階段</span>` +
    `<span><strong>${c.modules.length}</strong> 模組</span>` +
    `<span><strong>${c.totalHours}</strong> 小時</span>` +
    `<span><strong>${c.totalLabs}</strong> 個互動元件</span>` +
    "</div>"
  );
}

// ---- 主流程 ----------------------------------------------------------------

const pages = [];
const stamp = new Date().toISOString().slice(0, 10);
const SITE_URL = "https://plasma-academy.vercel.app";

/** 建置時的 commit(Vercel 會提供環境變數;本機退回 git 或 "dev") */
const COMMIT = (() => {
  const env = process.env.VERCEL_GIT_COMMIT_SHA;
  if (env) return env.slice(0, 7);
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
  } catch (e) {
    return "dev";
  }
})();

function buildPage(file) {
  const raw = readFileSync(file, "utf8");
  let parsed;
  try {
    parsed = parseContent(raw);
  } catch (e) {
    throw new Error(`${relative(ROOT, file)}: ${e.message}`);
  }
  const { meta, body } = parsed;

  const relPath = relative(join(SRC, "content"), file);
  const outRel = relPath.replace(/\.html$/, "");
  const outDir =
    outRel === "index" ? "" : outRel.endsWith(`${sep}index`) ? dirname(outRel) : outRel;
  const outFile = join(DIST, outDir, "index.html");
  const base = baseFor(outDir);

  const mod = meta.module ? curriculum.byId[meta.module] : null;
  if (meta.module && !mod) {
    throw new Error(`${relPath}: curriculum 沒有模組 ${meta.module}`);
  }

  const hasSidebar = meta.sidebar !== false;
  const outline = meta.outline === false ? "" : renderOutline(body);

  let content = renderBreadcrumb(base, meta) + expandPartials(body, base, meta) + renderChapterNav(base, meta);

  const html = TEMPLATE.replace(/\{\{base\}\}/g, base)
    .replace(/\{\{title\}\}/g, esc(meta.title || "Plasma Academy"))
    .replace(/\{\{description\}\}/g, esc(meta.description || ""))
    .replace(
      /\{\{shellClass\}\}/g,
      [hasSidebar ? "has-sidebar" : "", outline ? "has-outline" : ""].filter(Boolean).join(" ")
    )
    .replace(/\{\{sidebar\}\}/g, hasSidebar ? renderSidebar(base, meta.module) : "")
    .replace(/\{\{outline\}\}/g, outline)
    .replace(/\{\{mainAttrs\}\}/g, meta.module ? ` data-chapter="${meta.module}"` : "")
    .replace(/\{\{content\}\}/g, content)
    .replace(/\{\{extraScripts\}\}/g, (meta.scripts || []).map((s) => `<script src="${base}${s}" defer></script>`).join("\n    "))
    .replace(/\{\{extraStyles\}\}/g, (meta.styles || []).map((s) => `<link rel="stylesheet" href="${base}${s}" />`).join("\n    "))
    .replace(/\{\{buildStamp\}\}/g, `建置於 ${stamp}`)
    .replace(/\{\{commit\}\}/g, COMMIT);

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, html, "utf8");

  pages.push({
    url: (outDir ? outDir.split(sep).join("/") + "/" : ""),
    title: meta.title,
    type: meta.type || "page",
    module: meta.module || null,
    body,
    file: relPath,
  });
}

function run() {
  console.log("→ 清空 dist/");
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });

  console.log("→ 產生術語資料");
  execFileSync(process.execPath, [join(ROOT, "tools/gen-glossary.mjs")], { stdio: "inherit" });

  console.log("→ 產生公式資料");
  execFileSync(process.execPath, [join(ROOT, "tools/gen-formulas.mjs")], { stdio: "inherit" });

  console.log("→ 產生互動實驗室目錄");
  execFileSync(process.execPath, [join(ROOT, "tools/gen-labs.mjs")], { stdio: "inherit" });

  console.log("→ 複製靜態資源");
  for (const d of ["css", "js", "data"]) {
    cpSync(join(SRC, d), join(DIST, d), { recursive: true });
  }
  writeFileSync(join(DIST, "favicon.svg"), FAVICON, "utf8");

  console.log("→ 建置頁面");
  const files = walk(join(SRC, "content")).filter((f) => f.endsWith(".html"));
  for (const f of files) buildPage(f);
  const authored = pages.length;

  console.log("→ 產生佔位頁(尚未撰寫的章節與專區)");
  buildStubs();
  console.log(`   ${authored} 頁已撰寫 + ${pages.length - authored} 頁佔位 = ${pages.length} 頁`);

  console.log("→ 產生 404 頁");
  build404Page();

  console.log("→ 產生 sitemap.xml 與 robots.txt");
  buildSitemap();

  console.log("→ 產生搜尋索引");
  buildSearchIndex();

  console.log(`✓ 建置完成 → dist/`);
}

// ---- 佔位頁 ----------------------------------------------------------------

/**
 * 為尚未撰寫的章節與專區產生佔位頁。
 * 目的:導覽在 P0 就能完整走通,死鏈檢查也才有意義 ——
 * 而不是等到 P4 才第一次發現連結壞掉。
 * 佔位頁必須誠實說明「尚未撰寫」與預定的分期,不假裝有內容。
 */
function buildStubs() {
  const done = new Set(pages.map((p) => p.url));

  const PHASE = { 1: "P1", 2: "P2", 3: "P3", 4: "P4" };

  // 章節佔位頁
  for (const m of curriculum.modules) {
    if (done.has(m.url)) continue;
    const lv = curriculum.level(m.level);
    const labs = m.labs.length
      ? `<p>本章規劃 ${m.labs.length} 個互動元件:<code>${m.labs.join("</code>、<code>")}</code>。</p>`
      : "";
    const prereq = m.prereqs.length
      ? '<div class="pa-prereq"><span class="pa-prereq__label">📋 前置知識</span>' +
        m.prereqs
          .map((id) => {
            const p = curriculum.byId[id];
            return `<a href="../../../${p.url}">${p.id} ${esc(p.title)}</a>`;
          })
          .join("") +
        "</div>"
      : "";

    writeStub({
      url: m.url,
      title: `${m.id} ${m.title} — Plasma Academy`,
      module: m.id,
      body:
        '<div class="pa-chapter-header">' +
        `<h1>${m.id} ${esc(m.title)}</h1>` +
        '<div class="pa-chapter-header__meta">' +
        `<span>⏱ ${m.hours} 小時</span>` +
        (m.labs.length ? `<span>🔬 ${m.labs.length} 個互動元件</span>` : "") +
        `<span>L${lv.no} ${esc(lv.name)}</span>` +
        "</div></div>" +
        prereq +
        '<div class="pa-note pa-note--values">' +
        '<div class="pa-note__title">📊 本章尚未撰寫</div>' +
        `<p>內容大綱已完成,見規劃文件 <code>docs/0${m.level}-level${m.level}-*.md</code> 的 ${m.id} 節。</p>` +
        labs +
        `<p>預定於 <strong>${PHASE[m.level]}</strong> 實作(見 <code>docs/11-build-roadmap.md</code>)。</p>` +
        "</div>",
    });
  }

  // 階層佔位頁
  for (const lv of curriculum.levels) {
    const url = `level/${lv.no}/`;
    if (done.has(url)) continue;
    const mods = curriculum.modulesOfLevel(lv.no);
    writeStub({
      url,
      title: `L${lv.no} ${lv.name}:${lv.subtitle} — Plasma Academy`,
      body:
        '<div class="pa-chapter-header">' +
        `<h1>L${lv.no} ${esc(lv.name)} · ${esc(lv.subtitle)}</h1>` +
        '<div class="pa-chapter-header__meta">' +
        `<span>⏱ ${lv.hours} 小時</span><span>📦 ${mods.length} 模組</span>` +
        `<span>🔬 ${mods.reduce((s, m) => s + m.labs.length, 0)} 個互動元件</span>` +
        "</div></div>" +
        `<div class="pa-prose"><p>${esc(lv.question)}</p></div>` +
        "<h2 id=\"modules\">模組</h2>" +
        renderModuleGrid("../../", lv.no),
    });
  }

  // 專區佔位頁
  const HUBS = [
    ["gases/", "氣體百科", "32 種製程氣體的完整資料卡:分子式、自由基、用途、危害分級、相容材質、副產物。", "P2"],
    ["defects/", "缺陷圖鑑", "18 種蝕刻缺陷的症狀圖、成因鏈、診斷區分與對策旋鈕。", "P3"],
    ["quiz/", "測驗中心", "章末自我檢測與四階結業測驗。", "P4"],
  ];
  for (const [url, title, desc, phase] of HUBS) {
    if (done.has(url)) continue;
    writeStub({
      url,
      title: `${title} — Plasma Academy`,
      sidebar: false,
      body:
        `<div class="pa-chapter-header"><h1>${esc(title)}</h1></div>` +
        `<div class="pa-prose"><p>${esc(desc)}</p></div>` +
        '<div class="pa-note pa-note--values">' +
        '<div class="pa-note__title">📊 尚未實作</div>' +
        `<p>預定於 <strong>${phase}</strong> 上線(見 <code>docs/11-build-roadmap.md</code>)。</p>` +
        "</div>",
    });
  }

  // 術語表:資料已備妥,直接做成可用頁面
  if (!done.has("glossary/")) buildGlossaryPage();
  // 公式手冊:資料由 gen-formulas.mjs 從章節內文抽出,直接做成可用頁面
  if (!done.has("formulas/")) buildFormulasPage();
  // 互動實驗室:資料由 gen-labs.mjs 從 docs/05 標題 + 課綱模組對照,直接做成可用頁面
  if (!done.has("lab/")) buildLabsPage();
}

function writeStub(spec) {
  const outDir = spec.url.replace(/\/$/, "");
  const base = baseFor(outDir.split("/").join(sep));
  const meta = { title: spec.title, type: spec.type || "page", module: spec.module || null };
  const hasSidebar = spec.sidebar !== false;

  const html = TEMPLATE.replace(/\{\{base\}\}/g, base)
    .replace(/\{\{title\}\}/g, esc(meta.title))
    .replace(/\{\{description\}\}/g, esc(spec.description || ""))
    .replace(/\{\{shellClass\}\}/g, hasSidebar ? "has-sidebar" : "")
    .replace(/\{\{sidebar\}\}/g, hasSidebar ? renderSidebar(base, meta.module) : "")
    .replace(/\{\{outline\}\}/g, "")
    .replace(/\{\{mainAttrs\}\}/g, "")
    .replace(
      /\{\{content\}\}/g,
      renderBreadcrumb(base, { type: meta.module ? "chapter" : "page", module: meta.module }) +
        spec.body.replace(/\{\{base\}\}/g, base) +
        renderChapterNav(base, { type: meta.module ? "chapter" : "page", module: meta.module })
    )
    .replace(/\{\{extraScripts\}\}/g, spec.extraScripts || "")
    .replace(/\{\{extraStyles\}\}/g, spec.extraStyles || "")
    .replace(/\{\{buildStamp\}\}/g, `建置於 ${stamp}`)
    .replace(/\{\{commit\}\}/g, COMMIT);

  const outFile = join(DIST, outDir, "index.html");
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, html, "utf8");

  pages.push({
    url: spec.url,
    title: meta.title,
    type: meta.type,
    module: meta.module,
    body: spec.body,
    file: "(stub)",
    stub: true,
  });
}

/**
 * 404.html 放在 dist/ 根目錄,Vercel 對 outputDirectory 靜態部署的慣例是
 * 遇到不存在的路徑就回傳這個檔案內容 —— 但瀏覽器網址列停在使用者打的
 * 那個(可能任意深度的)路徑上,不是真的在根目錄。所以這裡的所有連結
 * 都要用「/」開頭的絕對路徑,不能沿用其他頁面「相對於自己深度」的
 * {{base}} 慣例(那個假設在 404 情境下不成立)。
 */
function build404Page() {
  const base = "/";
  const meta = { title: "找不到頁面 — Plasma Academy", type: "page", module: null };

  const body =
    '<div class="pa-chapter-header"><h1>404 — 找不到這個頁面</h1></div>' +
    '<div class="pa-prose">' +
    "<p>網址可能打錯了,或者這一頁被搬走了。可以試試:</p>" +
    "<ul>" +
    '<li>按右上角的搜尋(<kbd>Ctrl</kbd> + <kbd>K</kbd>)找你要的章節或術語</li>' +
    `<li>回<a href="${base}">首頁</a>看學習路徑圖</li>` +
    `<li>直接前往 <a href="${base}level/1/">L1 初階</a>、` +
    `<a href="${base}level/2/">L2 中階</a>、` +
    `<a href="${base}level/3/">L3 進階</a>、` +
    `<a href="${base}level/4/">L4 專家</a></li>` +
    `<li>查<a href="${base}glossary/">術語表</a>、` +
    `<a href="${base}formulas/">公式手冊</a>、` +
    `<a href="${base}gases/">氣體百科</a>、` +
    `<a href="${base}defects/">缺陷圖鑑</a></li>` +
    "</ul>" +
    "</div>";

  const html = TEMPLATE.replace(/\{\{base\}\}/g, base)
    .replace(/\{\{title\}\}/g, esc(meta.title))
    .replace(/\{\{description\}\}/g, esc("找不到這個頁面,回首頁或用搜尋找你要的內容。"))
    .replace(/\{\{shellClass\}\}/g, "")
    .replace(/\{\{sidebar\}\}/g, "")
    .replace(/\{\{outline\}\}/g, "")
    .replace(/\{\{mainAttrs\}\}/g, "")
    .replace(/\{\{content\}\}/g, body)
    .replace(/\{\{extraScripts\}\}/g, "")
    .replace(/\{\{extraStyles\}\}/g, "")
    .replace(/\{\{buildStamp\}\}/g, `建置於 ${stamp}`)
    .replace(/\{\{commit\}\}/g, COMMIT);

  writeFileSync(join(DIST, "404.html"), html, "utf8");
}

/**
 * sitemap.xml + robots.txt。從 `pages`(建置時每個真的產生內容的頁面
 * 都會 push 進這裡,見 buildPage/writeStub)直接產生 —— 單一資料來源,
 * 新增頁面不必記得手動更新網站地圖。
 */
function buildSitemap() {
  const urls = pages
    .map((p) => `${SITE_URL}/${p.url}`)
    .sort();

  const body = urls
    .map((u) => `  <url><loc>${esc(u)}</loc></url>`)
    .join("\n");
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    body +
    "\n</urlset>\n";
  writeFileSync(join(DIST, "sitemap.xml"), xml, "utf8");

  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  writeFileSync(join(DIST, "robots.txt"), robots, "utf8");

  console.log(`   ${urls.length} 個網址`);
}

function buildGlossaryPage() {
  const gcode = readFileSync(join(SRC, "data/glossary.js"), "utf8");
  const gwin = {};
  new Function("window", gcode)(gwin);
  const g = gwin.PA.glossary;

  let body =
    '<div class="pa-chapter-header"><h1>術語表</h1>' +
    `<div class="pa-chapter-header__meta"><span>${g.count} 條中英對照</span>` +
    `<span>${g.categories.length} 個分類</span></div></div>` +
    '<div class="pa-prose"><p>全站 tooltip 的資料來源。此表由 ' +
    "<code>docs/10-glossary.md</code> 自動產生,是術語的唯一來源。</p></div>";

  for (const c of g.categories) {
    const terms = g.terms.filter((t) => t.cat === c.key);
    body +=
      `<h2 id="cat-${c.key}">${c.key}. ${esc(c.name)}<span class="pa-subtle"> · ${terms.length} 條</span></h2>` +
      '<div class="pa-table-wrap"><table class="pa-table"><thead><tr>' +
      "<th>中文</th><th>英文</th><th>定義</th><th>章節</th></tr></thead><tbody>";
    for (const t of terms) {
      body +=
        `<tr id="${t.id}"><td><strong>${esc(t.zh)}</strong></td>` +
        `<td class="term-en">${esc(t.en)}${t.abbr ? ` (${esc(t.abbr)})` : ""}</td>` +
        `<td>${esc(t.def)}</td>` +
        `<td>${t.ch ? esc(t.ch) : "—"}</td></tr>`;
    }
    body += "</tbody></table></div>";
  }

  writeStub({
    url: "glossary/",
    title: "術語表 — Plasma Academy",
    description: `${g.count} 條電漿製程中英術語對照,附一句話定義與所屬章節。`,
    sidebar: false,
    body,
  });
}

function buildFormulasPage() {
  const fcode = readFileSync(join(SRC, "data/formulas.js"), "utf8");
  const fwin = {};
  new Function("window", fcode)(fwin);
  const all = fwin.PA.formulas.all;

  let body =
    '<div class="pa-chapter-header"><h1>公式手冊</h1>' +
    `<div class="pa-chapter-header__meta"><span>${all.length} 條公式</span></div></div>` +
    '<div class="pa-prose"><p>' +
    "全站公式的統一入口。每一條都直接取自章節內文的公式卡(<code>.pa-formula</code>)," +
    "由 <code>tools/gen-formulas.mjs</code> 抽出,不是另外重打一份 —— " +
    "改公式要回到對應章節改,重新產生用 <code>node tools/gen-formulas.mjs</code>。" +
    "點公式旁的章節號可以跳回原文的完整推導脈絡。</p></div>";

  const byLevel = new Map();
  for (const f of all) {
    const lv = f.ch ? f.ch.split(".")[0] : "0";
    if (!byLevel.has(lv)) byLevel.set(lv, []);
    byLevel.get(lv).push(f);
  }

  for (const lv of curriculum.levels) {
    const items = byLevel.get(String(lv.no)) || [];
    if (!items.length) continue;
    body += `<h2 id="l${lv.no}">L${lv.no} ${esc(lv.name)} · ${esc(lv.subtitle)}<span class="pa-subtle"> · ${items.length} 條</span></h2>`;
    for (const f of items) {
      const link = f.url ? `{{base}}${f.url}${f.anchor ? "#" + f.anchor : ""}` : null;
      body +=
        `<div class="pa-formula" id="${esc(f.id)}">` +
        `<div class="pa-formula__eq pa-eq">${f.eq}</div>` +
        (f.name ? `<div class="pa-formula__name">${esc(f.name)}</div>` : "") +
        (f.body
          ? `<details><summary>展開符號表與推導</summary><div class="pa-formula__body">${f.body}</div></details>`
          : "") +
        (link
          ? `<p class="pa-subtle" style="margin-top:var(--pa-space-2)">` +
            `${f.ch ? esc(f.ch) + " · " : ""}<a href="${link}">回原文脈絡 →</a></p>`
          : "") +
        "</div>";
    }
  }

  // 沒有解析到章節號的少數公式(仍完整列出,只是不分節)
  const orphans = byLevel.get("0") || [];
  if (orphans.length) {
    body += `<h2 id="other">其他<span class="pa-subtle"> · ${orphans.length} 條</span></h2>`;
    for (const f of orphans) {
      const link = f.url ? `{{base}}${f.url}${f.anchor ? "#" + f.anchor : ""}` : null;
      body +=
        `<div class="pa-formula" id="${esc(f.id)}">` +
        `<div class="pa-formula__eq pa-eq">${f.eq}</div>` +
        (f.name ? `<div class="pa-formula__name">${esc(f.name)}</div>` : "") +
        (f.body
          ? `<details><summary>展開符號表與推導</summary><div class="pa-formula__body">${f.body}</div></details>`
          : "") +
        (link ? `<p class="pa-subtle" style="margin-top:var(--pa-space-2)"><a href="${link}">回原文脈絡 →</a></p>` : "") +
        "</div>";
    }
  }

  writeStub({
    url: "formulas/",
    title: "公式手冊 — Plasma Academy",
    description: `${all.length} 條電漿製程公式與符號表,直接取自各章節內文,可跳轉回原文脈絡。`,
    sidebar: false,
    body,
  });
}

function buildLabsPage() {
  const lcode = readFileSync(join(SRC, "data/labs.js"), "utf8");
  const lwin = {};
  new Function("window", lcode)(lwin);
  const all = lwin.PA.labs.all;

  let body =
    '<div class="pa-chapter-header"><h1>互動實驗室</h1>' +
    `<div class="pa-chapter-header__meta"><span>${all.length} 個互動元件</span></div></div>` +
    '<div class="pa-prose"><p>' +
    "全站互動元件的獨立入口 —— 同一個元件,拿掉章節敘事的上下文,單獨當工具用。" +
    "捲到哪個元件,哪個才會真的載入(跟章節頁的行為一樣,不會一次把 33 個元件全部跑起來)。" +
    "每個元件下方都有連結跳回它原本所在的章節,完整的教學說明與觀察點在那裡。</p></div>" +
    '<nav class="pa-prose" aria-label="元件索引"><p>';
  body += all.map((l) => `<a href="#${l.id}">${l.id}</a>`).join(" · ");
  body += "</p></nav>";

  for (const lv of curriculum.levels) {
    const items = all.filter((l) => l.level === lv.no);
    if (!items.length) continue;
    body += `<h2 id="l${lv.no}">L${lv.no} ${esc(lv.name)} · ${esc(lv.subtitle)}<span class="pa-subtle"> · ${items.length} 個</span></h2>`;
    for (const l of items) {
      const complex = l.stars >= 1 ? " pa-lab--complex" : "";
      body +=
        `<div class="pa-lab-entry" id="${esc(l.id)}">` +
        `<div class="pa-lab${complex}" data-lab="${esc(l.id)}">` +
        '<div class="pa-lab__head">' +
        `<span class="pa-lab__id">${esc(l.id)}</span>` +
        `<span class="pa-lab__title">${esc(l.title)}${l.stars ? " " + "★".repeat(l.stars) : ""}</span>` +
        "</div>" +
        (l.stars >= 1
          ? '<div class="pa-lab__small-screen-note">此元件建議在較大螢幕使用。</div>'
          : "") +
        '<div class="pa-lab__stage"></div>' +
        "</div>" +
        `<p class="pa-subtle">出現於 <a href="{{base}}${l.url}">${esc(l.moduleId)} ${esc(l.moduleTitle)}</a> —— 完整教學說明與觀察點在原章節</p>` +
        "</div>";
    }
  }

  writeStub({
    url: "lab/",
    title: "互動實驗室 — Plasma Academy",
    description: `${all.length} 個互動元件的獨立入口,可當工具單獨使用,捲到哪個才載入哪個。`,
    sidebar: false,
    body,
  });
}

// ---- 搜尋索引 --------------------------------------------------------------

function tokenize(text) {
  const out = [];
  const s = String(text).toLowerCase();
  const words = s.match(/[a-z0-9]+/g);
  if (words) out.push(...words);
  const han = s.match(/[一-鿿]+/g);
  if (han) {
    for (const run of han) {
      if (run.length === 1) out.push(run);
      for (let i = 0; i < run.length - 1; i++) out.push(run.slice(i, i + 2));
    }
  }
  return out;
}

function buildSearchIndex() {
  const docs = [];

  // 頁面
  for (const p of pages) {
    const text = p.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    docs.push({
      url: p.url,
      title: p.title,
      type: p.type,
      context: p.module ? `第 ${p.module} 節` : "",
      text: `${p.title} ${text}`,
      weight: p.type === "chapter" ? 1.2 : 1,
    });
  }

  // 術語
  const gcode = readFileSync(join(SRC, "data/glossary.js"), "utf8");
  const gwin = {};
  new Function("window", gcode)(gwin);
  for (const t of gwin.PA.glossary.terms) {
    docs.push({
      url: `glossary/#${t.id}`,
      title: `${t.zh}(${t.en})`,
      type: "term",
      context: t.def,
      text: `${t.zh} ${t.en} ${t.abbr || ""} ${t.def}`,
      weight: 0.9,
    });
  }

  // 公式
  const fcode = readFileSync(join(SRC, "data/formulas.js"), "utf8");
  const fwin = {};
  new Function("window", fcode)(fwin);
  for (const f of fwin.PA.formulas.all) {
    const plainEq = f.eq.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    docs.push({
      url: `formulas/#${f.id}`,
      title: f.name || plainEq,
      type: "formula",
      context: f.ch ? `第 ${f.ch} 節` : "",
      text: `${f.name || ""} ${plainEq} ${f.heading || ""}`,
      weight: 0.9,
    });
  }

  // 倒排索引
  const inverted = {};
  docs.forEach((d, i) => {
    const counts = {};
    for (const tok of tokenize(d.text)) counts[tok] = (counts[tok] || 0) + 1;
    for (const [tok, n] of Object.entries(counts)) {
      (inverted[tok] ||= []).push([i, Math.min(n, 8)]);
    }
    delete d.text; // 索引不需要留全文
  });

  const payload = { docs, inverted };
  const out = `window.PA_SEARCH_INDEX = ${JSON.stringify(payload)};\n`;
  writeFileSync(join(DIST, "data/search-index.js"), out, "utf8");

  const kb = (Buffer.byteLength(out) / 1024).toFixed(0);
  console.log(`   ${docs.length} 筆文件、${Object.keys(inverted).length} 個詞、${kb} KB`);
  if (kb > 500) console.warn(`   ⚠️ 索引超過 500 KB,考慮縮減內文取樣`);
}

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="15" fill="#0e1116"/>
  <ellipse cx="16" cy="16" rx="12" ry="4.5" fill="none" stroke="#3fc0d4" stroke-width="1.6" transform="rotate(-25 16 16)"/>
  <ellipse cx="16" cy="16" rx="12" ry="4.5" fill="none" stroke="#e878b4" stroke-width="1.6" transform="rotate(35 16 16)"/>
  <circle cx="16" cy="16" r="3" fill="#4d9df0"/>
</svg>
`;

run();
