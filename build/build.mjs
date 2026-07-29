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
    ["lab/", "互動實驗室", "32 個互動元件的獨立入口。每個元件可全螢幕開啟,方便當工具用。", "P1 起陸續上線"],
    ["gases/", "氣體百科", "32 種製程氣體的完整資料卡:分子式、自由基、用途、危害分級、相容材質、副產物。", "P2"],
    ["defects/", "缺陷圖鑑", "18 種蝕刻缺陷的症狀圖、成因鏈、診斷區分與對策旋鈕。", "P3"],
    ["formulas/", "公式手冊", "約 45 條公式與符號表,可由章節公式卡直接跳轉。", "P1 起陸續補齊"],
    ["progress/", "我的進度", "學習進度、徽章與證書,支援 JSON 匯出匯入。", "P4"],
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
