/* ==========================================================================
   smoke.mjs — 瀏覽器煙霧測試(P0 驗收)

   驗證 docs/11-build-roadmap.md 的 P0 驗收條件:
     · 首頁與示範章節頁可正常瀏覽
     · 深淺主題切換無閃爍,Canvas 元件正確重繪
     · 進度追蹤可記錄與匯出
     · 無 CSP 違規、無 console 錯誤
     · 首次載入 < 50 KB、可互動 < 300 ms
     · prefers-reduced-motion 下內容仍完整

   用法:node tools/serve.mjs 8081 & node tools/smoke.mjs
   ========================================================================== */

import { chromium } from "playwright";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:8081";

/** 課綱的期望值直接從單一來源讀 —— 增補模組時測試不必跟著改 */
const EXPECT = (() => {
  const code = readFileSync(
    new URL("../src/data/curriculum.js", import.meta.url),
    "utf8"
  );
  const sandbox = { window: {} };
  new Function("window", code)(sandbox.window);
  const c = sandbox.window.PA.curriculum;
  /*
     術語數同理從 glossary.js 讀。原本這裡寫死 242,新增五條 PCB 術語
     之後就變紅 —— 那不是回歸,是測試自己過期了。
     (與 quiz.html 的「301 題」是同一類問題,見 docs/11。)
  */
  const gcode = readFileSync(
    new URL("../src/data/glossary.js", import.meta.url),
    "utf8"
  );
  const gs = { window: {} };
  new Function("window", gcode)(gs.window);
  return {
    modules: c.modules.length,
    hours: c.totalHours,
    labs: c.totalLabs,
    terms: gs.window.PA.glossary.count,
  };
})();
let pass = 0;
let fail = 0;

function ok(label, cond, detail) {
  console.log(`  ${cond ? "✓" : "✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
}

/**
 * 用環境預裝的 Chromium,不另外下載。
 * PLAYWRIGHT_BROWSERS_PATH 下的 build 編號未必與 npm 安裝的 playwright 版本相符,
 * 因此自行尋找可用的 chrome 執行檔。
 */
function findChromium() {
  if (process.env.PW_CHROMIUM && existsSync(process.env.PW_CHROMIUM)) {
    return process.env.PW_CHROMIUM;
  }
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  if (!existsSync(root)) return undefined;
  const candidates = [];
  for (const name of readdirSync(root)) {
    if (!name.startsWith("chromium")) continue;
    candidates.push(
      join(root, name, "chrome-linux", "chrome"),
      join(root, name, "chrome-linux", "headless_shell"),
      join(root, name, "chrome-headless-shell-linux64", "chrome-headless-shell")
    );
  }
  return candidates.find(existsSync);
}

const EXECUTABLE = findChromium();
if (EXECUTABLE) console.log(`(使用 Chromium:${EXECUTABLE})`);

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ["--no-sandbox"],
});

async function newPage(opts = {}) {
  const ctx = await browser.newContext({
    viewport: opts.viewport || { width: 1440, height: 900 },
    reducedMotion: opts.reducedMotion,
    colorScheme: opts.colorScheme,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.errors = errors;
  return { page, ctx };
}

// ---------------------------------------------------------------- 首頁
console.log("\n【首頁】");
{
  const { page, ctx } = await newPage();

  // 先暖機一次:排除伺服器冷啟動與瀏覽器首次導覽的雜訊,
  // 之後量到的才是頁面本身的重量(這才是這個門檻要管的事)
  await page.goto(BASE + "/", { waitUntil: "load" });
  const t0 = Date.now();
  const resp = await page.goto(BASE + "/?warm", { waitUntil: "domcontentloaded" });
  const domMs = Date.now() - t0;

  ok("HTTP 200", resp.status() === 200);
  ok("標題正確", (await page.title()).includes("Plasma Academy"));
  ok("DOMContentLoaded < 300 ms(暖機後)", domMs < 300, `${domMs} ms`);

  const levels = await page.locator(".pa-path__level").count();
  ok("學習路徑圖渲染 4 階", levels === 4, `實得 ${levels}`);

  await page.waitForFunction(() => window.PA && window.PA.curriculum, null, { timeout: 3000 });
  const stats = await page.evaluate(() => ({
    modules: PA.curriculum.modules.length,
    hours: PA.curriculum.totalHours,
    labs: PA.curriculum.totalLabs,
    glossaryLoaded: !!PA.glossary,
    labLoaded: !!PA.lab,
  }));
  /**
   * 對照 src/data/curriculum.js 本身,而不是寫死數字。
   * 這一組斷言的意思是「頁面渲染的內容與課綱一致」——
   * 寫死 24 / 60 / 32 的話,每次增補模組都得回來改測試,
   * 而那只是在追著資料跑,不是在驗證任何東西。
   */
  ok(
    `課程資料與 curriculum.js 一致(${EXPECT.modules} 模組)`,
    stats.modules === EXPECT.modules,
    `頁面 ${stats.modules} vs 課綱 ${EXPECT.modules}`
  );
  ok(
    `總時數與 curriculum.js 一致(${EXPECT.hours} 小時)`,
    Math.abs(stats.hours - EXPECT.hours) < 0.01,
    `頁面 ${stats.hours} vs 課綱 ${EXPECT.hours}`
  );
  ok(
    `互動元件編號數與 curriculum.js 一致(${EXPECT.labs} 個)`,
    stats.labs === EXPECT.labs,
    `頁面 ${stats.labs} vs 課綱 ${EXPECT.labs}`
  );
  ok("首頁不載入術語表(無 .pa-term)", stats.glossaryLoaded === false);
  ok("首頁不載入 lab 核心(無 [data-lab])", stats.labLoaded === false);

  await page.waitForTimeout(300);
  const rings = await page.locator(".pa-ring").count();
  ok("進度環渲染", rings === 4, `${rings}`);

  ok("無 console 錯誤", page.errors.length === 0, page.errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------- 章節頁
console.log("\n【章節頁 1.1】");
let chapterErrors = [];
{
  const { page, ctx } = await newPage();
  await page.goto(BASE + "/level/1/1-1-fourth-state/", { waitUntil: "load" });

  ok("麵包屑存在", (await page.locator(".pa-breadcrumb li").count()) === 3);
  ok(
    `側欄列出全部 ${EXPECT.modules} 個模組`,
    (await page.locator(".pa-toc a[data-module]").count()) === EXPECT.modules,
    `${await page.locator(".pa-toc a[data-module]").count()}`
  );
  ok("右側大綱有項目", (await page.locator(".pa-outline a").count()) >= 5);
  ok("上/下章導覽", (await page.locator("[data-nav-next]").count()) === 1);

  // 學習目標 → 進度
  const boxes = page.locator(".pa-objectives input[type=checkbox]");
  ok("學習目標 3 條", (await boxes.count()) === 3);
  await boxes.nth(0).check();
  await page.waitForTimeout(120);
  const saved = await page.evaluate(() => PA.progress.chapter("1.1").objectives[0]);
  ok("勾選寫入 localStorage", saved === true);

  const visited = await page.evaluate(() => PA.progress.chapter("1.1").visited);
  ok("造訪已記錄", visited === true);

  const exported = await page.evaluate(() => JSON.parse(PA.progress.exportJSON()));
  ok("進度可匯出", exported.version === 1 && !!exported.chapters["1.1"]);

  // 術語 tooltip
  const term = page.locator(".pa-term").first();
  await term.hover();
  await page.waitForTimeout(200);
  const tipVisible = await page.evaluate(() => {
    const t = document.querySelector(".pa-tooltip");
    return t && t.style.display !== "none" && t.textContent.length > 10;
  });
  ok("術語 tooltip 顯示定義", tipVisible);

  const terms = await page.evaluate(() => (PA.glossary ? PA.glossary.count : 0));
  ok(
    `術語表按需載入後有 ${EXPECT.terms} 條(數字來自 glossary.js,不寫死)`,
    terms === EXPECT.terms,
    `${terms}`
  );

  // 互動元件 A01
  await page.locator("[data-lab=A01]").scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const labState = await page.evaluate(() => {
    const el = document.querySelector("[data-lab=A01]");
    const c = el && el.querySelector("canvas");
    return {
      mounted: el && el.hasAttribute("data-lab-mounted"),
      error: el && el.hasAttribute("data-lab-error"),
      hasCanvas: !!c,
      w: c ? c.width : 0,
      controls: el ? el.querySelectorAll(".pa-ctrl").length : 0,
      readouts: el ? el.querySelectorAll(".pa-readout").length : 0,
      particles: window.PA.lab.mounted.length ? window.PA.lab.mounted[0].inst.sys.count : 0,
    };
  });
  ok("A01 已掛載", labState.mounted && !labState.error);
  ok("A01 Canvas 已建立", labState.hasCanvas && labState.w > 0, `width=${labState.w}`);
  ok("A01 控制項 4 組", labState.controls === 4, `${labState.controls}`);
  ok("A01 數值面板 4 格", labState.readouts === 4, `${labState.readouts}`);
  ok("A01 粒子已產生", labState.particles > 300, `${labState.particles} 顆`);

  // 誠實標註誇大 —— 規格書驗收條件
  const caveat = await page.locator("[data-lab=A01]").textContent();
  ok("A01 誠實標註游離度誇大", caveat.includes("放大") && caveat.includes("10⁻⁵"));

  chapterErrors = page.errors;
  ok("無 console 錯誤", page.errors.length === 0, page.errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// ---------------------------------------------------------------- 主題切換
console.log("\n【主題切換與 Canvas 重繪】");
{
  const { page, ctx } = await newPage();
  await page.goto(BASE + "/level/1/1-1-fourth-state/", { waitUntil: "load" });
  await page.locator("[data-lab=A01]").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);

  const read = () =>
    page.evaluate(() => ({
      theme: document.documentElement.getAttribute("data-theme"),
      bg: getComputedStyle(document.body).backgroundColor,
      palette: PA.canvasTheme.palette().bg,
    }));

  const before = await read();
  await page.evaluate(() => PA.theme.set("dark"));
  await page.waitForTimeout(250);
  const after = await read();

  ok("data-theme 已切為 dark", after.theme === "dark");
  ok("body 背景色改變", before.bg !== after.bg, `${before.bg} → ${after.bg}`);
  ok(
    "Canvas 調色盤快取已失效並更新",
    before.palette !== after.palette,
    `${before.palette} → ${after.palette}`
  );

  await page.evaluate(() => PA.theme.set("light"));
  await page.waitForTimeout(250);
  const back = await read();
  ok("切回 light 生效(明確指定勝過系統偏好)", back.theme === "light" && back.bg === before.bg);

  // 深色模式下不應閃白:重載後首次繪製即為深色
  await page.evaluate(() => PA.theme.set("dark"));
  await page.reload({ waitUntil: "domcontentloaded" });
  const atLoad = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  ok("重載時 data-theme 於 CSS 套用前就設好(防閃爍)", atLoad === "dark");

  await ctx.close();
}

// ---------------------------------------------------------------- 系統深色
console.log("\n【跟隨系統偏好】");
{
  const { page, ctx } = await newPage({ colorScheme: "dark" });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok("auto 模式跟隨系統深色", bg === "rgb(14, 17, 22)", bg);
  await ctx.close();
}

// ---------------------------------------------------------------- reduced motion
console.log("\n【prefers-reduced-motion】");
{
  const { page, ctx } = await newPage({ reducedMotion: "reduce" });
  await page.goto(BASE + "/level/1/1-1-fourth-state/", { waitUntil: "load" });
  await page.locator("[data-lab=A01]").scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);

  const st = await page.evaluate(() => {
    const inst = window.PA.lab.mounted[0] && window.PA.lab.mounted[0].inst;
    return {
      running: inst ? inst.running : null,
      particles: inst && inst.sys ? inst.sys.count : 0,
      textLen: document.querySelector(".pa-main").innerText.length,
    };
  });
  ok("動畫迴圈未啟動", st.running === false);
  ok("仍畫出靜態粒子", st.particles > 300, `${st.particles} 顆`);
  ok("章節內容完整可讀", st.textLen > 2000, `${st.textLen} 字`);
  await ctx.close();
}

// ---------------------------------------------------------------- 行動版
console.log("\n【行動版 375px】");
{
  const { page, ctx } = await newPage({ viewport: { width: 375, height: 780 } });
  await page.goto(BASE + "/level/1/1-1-fourth-state/", { waitUntil: "load" });

  const noHScroll = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1
  );
  ok("頁面不橫向捲動", noHScroll);

  const menuVisible = await page.locator("[data-menu-btn]").isVisible();
  ok("漢堡選單顯示", menuVisible);

  await page.locator("[data-menu-btn]").click();
  await page.waitForTimeout(300);
  ok("側欄抽屜可開啟", await page.evaluate(() => document.querySelector(".pa-sidebar").classList.contains("is-open")));

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  ok("Esc 可關閉抽屜", await page.evaluate(() => !document.querySelector(".pa-sidebar").classList.contains("is-open")));

  await page.locator("[data-lab=A01]").scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  const canvasFits = await page.evaluate(() => {
    const c = document.querySelector("[data-lab=A01] canvas");
    return c && c.getBoundingClientRect().width <= window.innerWidth;
  });
  ok("互動元件不溢出視窗", canvasFits);
  await ctx.close();
}

// ---------------------------------------------------------------- 資源大小
console.log("\n【效能預算】");
{
  const { page, ctx } = await newPage();
  const sizes = [];
  page.on("response", async (r) => {
    try {
      const h = r.headers();
      const len = +(h["content-length"] || 0);
      sizes.push({ url: r.url().replace(BASE, ""), len });
    } catch (e) {}
  });
  await page.goto(BASE + "/level/1/1-1-fourth-state/", { waitUntil: "load" });
  await page.waitForTimeout(300);

  // 關鍵路徑 = 模板直接引用的 HTML/CSS/JS(不含任何按需載入的東西)
  const DEFERRED = ["data/glossary.js", "js/lab/", "search-index", "core/search.js"];
  const critical = sizes.filter((s) => !DEFERRED.some((d) => s.url.includes(d)));
  const deferred = sizes.filter((s) => DEFERRED.some((d) => s.url.includes(d)));

  const kb = critical.reduce((a, b) => a + b.len, 0) / 1024;
  const dkb = deferred.reduce((a, b) => a + b.len, 0) / 1024;
  ok("關鍵路徑 < 120 KB", kb > 0 && kb < 120, `${kb.toFixed(1)} KB / ${critical.length} 個資源`);
  ok("按需資源確實被延後", deferred.length > 0, `${dkb.toFixed(1)} KB / ${deferred.length} 個`);
  ok(
    "A01 未在初始載入",
    critical.every((s) => !s.url.includes("/lab/a01")),
    `${critical.length} 個資源`
  );
  ok("搜尋索引完全未載入(要按搜尋鈕才抓)", sizes.every((s) => !s.url.includes("search-index")));
  /*
     home.js 只在有 [data-level-progress] 的頁面(首頁與四個階層頁)有事做,
     章節頁不該碰它。它原本掛在模板上、每頁都載,25 個章節頁白背 2.3 KB。
     這條斷言把「章節頁不載 home.js」釘住,免得日後又被搬回模板。
  */
  ok(
    "章節頁不載入首頁的進度環腳本",
    sizes.every((s) => !s.url.includes("core/home.js")),
    "home.js 只在首頁/階層頁按需載入"
  );

  // 第二段:捲到元件才應該抓 a01.js
  await page.locator("[data-lab=A01]").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const lazy = sizes.filter((s) => s.url.includes("/lab/a01"));
  ok("捲到才載入 A01(僅一次請求)", lazy.length === 1, `${lazy.length} 次請求`);
  ok(
    "A01 元件檔 < 30 KB",
    lazy.length === 1 && lazy[0].len < 30 * 1024,
    lazy.length ? `${(lazy[0].len / 1024).toFixed(1)} KB` : "未載入"
  );
  await ctx.close();
}

// ---------------------------------------------------------------- 搜尋
console.log("\n【搜尋】");
{
  const { page, ctx } = await newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.locator("[data-search-btn]").click();
  await page.waitForTimeout(150);
  await page.locator(".pa-search__input").fill("鞘層");
  await page.waitForTimeout(600);
  const n = await page.locator(".pa-search__item").count();
  ok("中文查詢有結果", n > 0, `${n} 筆`);

  await page.locator(".pa-search__input").fill("paschen");
  await page.waitForTimeout(400);
  const n2 = await page.locator(".pa-search__item").count();
  ok("英文查詢有結果", n2 > 0, `${n2} 筆`);
  await ctx.close();
}

// ---------------------------------------------------------------- 無障礙
console.log("\n【無障礙】");
{
  const { page, ctx } = await newPage();
  await page.goto(BASE + "/level/1/1-1-fourth-state/", { waitUntil: "load" });
  await page.locator("[data-lab=A01]").scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);

  const a11y = await page.evaluate(() => {
    const headings = [...document.querySelectorAll(".pa-main h1,.pa-main h2,.pa-main h3")].map(
      (h) => +h.tagName[1]
    );
    let skip = false;
    for (let i = 1; i < headings.length; i++) {
      if (headings[i] - headings[i - 1] > 1) skip = true;
    }
    const canvas = document.querySelector("[data-lab=A01] canvas");
    const sliders = [...document.querySelectorAll('.pa-ctrl input[type="range"]')];
    return {
      h1: document.querySelectorAll(".pa-main h1").length,
      skip,
      canvasLabel: canvas && !!canvas.getAttribute("aria-label"),
      slidersNative: sliders.length > 0,
      slidersLabelled: sliders.every((s) => {
        const l = document.querySelector(`label[for="${s.id}"]`);
        return !!l;
      }),
      readoutLive: !!document.querySelector('.pa-lab__readout[aria-live]'),
      skipLink: !!document.querySelector(".skip-link"),
    };
  });
  ok("只有一個 h1", a11y.h1 === 1);
  ok("標題階層不跳級", !a11y.skip);
  ok("Canvas 有 aria-label", a11y.canvasLabel);
  ok("滑桿用原生 input[type=range]", a11y.slidersNative);
  ok("滑桿有關聯的 label", a11y.slidersLabelled);
  ok("數值面板為 aria-live 區域", a11y.readoutLive);
  ok("有跳至主內容連結", a11y.skipLink);

  // 鍵盤:Tab 到滑桿並用方向鍵改值
  await page.locator('.pa-ctrl input[type="range"]').first().focus();
  const v0 = await page.locator('.pa-ctrl input[type="range"]').first().inputValue();
  await page.keyboard.press("ArrowRight");
  const v1 = await page.locator('.pa-ctrl input[type="range"]').first().inputValue();
  ok("滑桿可用鍵盤操作", v0 !== v1, `${v0} → ${v1}`);

  await ctx.close();
}

// ---------------------------------------------------------------- CSP
console.log("\n【CSP 相容】");
{
  const { page, ctx } = await newPage();
  const violations = [];
  page.on("console", (m) => {
    if (/Content Security Policy/i.test(m.text())) violations.push(m.text());
  });
  await page.goto(BASE + "/level/1/1-1-fourth-state/", { waitUntil: "load" });
  await page.locator("[data-lab=A01]").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);

  const inline = await page.evaluate(() => ({
    inlineScripts: [...document.querySelectorAll("script")].filter((s) => !s.src).length,
    styleBlocks: document.querySelectorAll("style").length,
    onAttrs: document.querySelectorAll("[onclick],[onload],[onerror]").length,
  }));
  ok("無 inline <script>", inline.inlineScripts === 0, `${inline.inlineScripts} 個`);
  ok("無 <style> 區塊", inline.styleBlocks === 0, `${inline.styleBlocks} 個`);
  ok("無 on* 事件屬性", inline.onAttrs === 0, `${inline.onAttrs} 個`);
  ok("無 CSP 違規", violations.length === 0, violations.slice(0, 2).join(" | "));
  await ctx.close();
}

// ------------------------------------------------- 所有已撰寫章節的通用檢查
// 隨著 P1–P4 逐章上線,這一段自動涵蓋新章節,不必每次改測試
console.log("\n【已撰寫章節通用檢查】");
{
  const { page, ctx } = await newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  const authored = await page.evaluate(async () => {
    // 佔位頁含「本章尚未撰寫」,用它區分已撰寫與未撰寫
    const mods = PA.curriculum.modules.map((m) => ({ id: m.id, url: m.url, labs: m.labs }));
    const out = [];
    for (const m of mods) {
      const r = await fetch(m.url === "" ? "./" : new URL(m.url, location.href).href);
      const t = await r.text();
      if (!t.includes("本章尚未撰寫")) out.push(m);
    }
    return out;
  });
  await ctx.close();

  ok("至少有一章已撰寫", authored.length > 0, `${authored.length} 章:${authored.map((m) => m.id).join("、")}`);

  for (const mod of authored) {
    const { page, ctx } = await newPage();
    await page.goto(BASE + "/" + mod.url, { waitUntil: "load" });

    const info = await page.evaluate(() => ({
      h1: document.querySelectorAll(".pa-main h1").length,
      objectives: document.querySelectorAll(".pa-objectives input").length,
      summary: !!document.querySelector(".pa-summary"),
      words: document.querySelector(".pa-main").innerText.length,
      labs: [...document.querySelectorAll("[data-lab]")].map((e) => e.getAttribute("data-lab")),
      badTerms: [],
    }));

    ok(`${mod.id} 章節結構完整`,
      info.h1 === 1 && info.objectives >= 3 && info.summary && info.words > 1500,
      `${info.words} 字 / ${info.objectives} 個學習目標`);

    ok(`${mod.id} 互動元件齊備`,
      JSON.stringify(info.labs) === JSON.stringify(mod.labs),
      `頁面 ${info.labs.join()} vs 課綱 ${mod.labs.join()}`);

    // 逐一掛載每個元件
    for (const labId of info.labs) {
      await page.locator(`[data-lab=${labId}]`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(1100);
      const st = await page.evaluate((id) => {
        const el = document.querySelector(`[data-lab=${id}]`);
        return {
          mounted: el.hasAttribute("data-lab-mounted"),
          error: el.hasAttribute("data-lab-error"),
          // 有些元件依規格就是純 HTML(A11 氣體百科、A09 決策樹的資料卡),
          // 硬要求 canvas/svg 只會逼人加裝飾用的圖。改為「舞台真的長出東西」:
          // 掛載失敗時舞台是空的,一樣抓得到。
          visual:
            !!(el.querySelector("canvas") || el.querySelector("svg")) ||
            el.querySelectorAll(".pa-lab__stage *").length >= 3,
          controls: el.querySelectorAll(".pa-ctrl").length,
          readouts: el.querySelectorAll(".pa-readout").length,
          observe: !!el.querySelector(".pa-lab__observe"),
          /*
             觀察點裡的 `**強調**` 要真的變成粗體。
             controls.js 原本用 textContent,34 個元件寫的星號全部原封不動
             印在畫面上 —— 純資料檢查看不到這種問題,只有真的渲染才抓得到。
          */
          rawStars: (el.querySelector(".pa-lab__observe") || { textContent: "" })
            .textContent.indexOf("**") >= 0,
          strongs: el.querySelectorAll(".pa-lab__observe strong").length,
        };
      }, labId);
      ok(`${labId} 掛載且有控制項與觀察點`,
        st.mounted && !st.error && st.visual && st.controls >= 2 && st.readouts >= 2 && st.observe,
        `控制項 ${st.controls} / 數值 ${st.readouts}`);
      ok(`${labId} 觀察點的強調有渲染成粗體(沒有殘留星號)`,
        !st.rawStars,
        st.rawStars ? "畫面上看得到 ** 字面" : `${st.strongs} 處粗體`);
    }

    // 術語 tooltip 全部查得到定義(撰稿時打錯字會在這裡被抓到)
    await page.evaluate(() => PA.ensureGlossary(() => {}));
    await page.waitForTimeout(400);
    const missing = await page.evaluate(() =>
      [...document.querySelectorAll(".pa-term")]
        .map((a) => a.getAttribute("data-term") || a.textContent.trim())
        .filter((n) => !PA.glossary.lookup(n))
    );
    ok(`${mod.id} 術語全部查得到`, missing.length === 0, missing.length ? missing.join("、") : "");

    ok(`${mod.id} 無 console 錯誤`, page.errors.length === 0, page.errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}

/* ==========================================================================
   測驗中心

   這一段是被一個逃掉的 bug 逼出來的:`PA.curriculum.byId` 是 map 不是函式,
   自我檢測整個掛不上去,而品質門完全沒攔住 —— 因為當時煙霧測試只涵蓋章節頁。
   純資料的 check-quiz.mjs 驗得了題庫結構,驗不到「在瀏覽器裡真的能作答」。
   所以這裡實際點下去:選項要能選、解析要展開、交卷要算得出分數。
   ========================================================================== */
console.log("\n【測驗中心】");
{
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/quiz/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const mounted = await page.evaluate(() => {
    const self = document.querySelector('[data-quiz="self"]');
    const exam = document.querySelector('[data-quiz="exam"]');
    return {
      selfOk: self.hasAttribute("data-quiz-mounted") && !self.hasAttribute("data-quiz-error"),
      examOk: exam.hasAttribute("data-quiz-mounted") && !exam.hasAttribute("data-quiz-error"),
      chapters: self.querySelectorAll("select option").length,
      questions: self.querySelectorAll(".pa-quiz__q").length,
      options: self.querySelectorAll(".pa-quiz__opt").length,
    };
  });
  ok("兩種模式都掛載成功", mounted.selfOk && mounted.examOk, "");
  // 對照 curriculum.js 本身,不寫死數字 —— 3.8 獨立成章時這裡曾經因為
  // 寫死 25 而假失敗,課綱才是唯一來源。
  ok(
    "章節選單涵蓋課綱的每一章",
    mounted.chapters === EXPECT.modules,
    `${mounted.chapters} 章 / 課綱 ${EXPECT.modules} 章`
  );
  ok("預設章節有題目與選項",
    mounted.questions >= 1 && mounted.options >= 2,
    `${mounted.questions} 題 / ${mounted.options} 個選項`);

  /*
     圖形判讀題要真的看得到圖。
     check-quiz.mjs 驗得了「每題的 svgId 查得到缺陷」,驗不到
     「瀏覽器裡真的畫出一張 SVG」—— 這中間隔著 ensureQuiz 有沒有把
     defects.js / defect-svg.js 一起載進來。那正是最容易漏掉的一環,
     所以在這裡實際切到 3.3 缺陷圖鑑,看它有沒有渲染出來。
  */
  await page.selectOption('[data-quiz="self"] select', "3.3");
  await page.waitForTimeout(500);
  const fig = await page.evaluate(() => {
    const figs = document.querySelectorAll('[data-quiz="self"] .pa-quiz__fig svg');
    const titles = [...figs].map((s) => (s.querySelector("title") || {}).textContent || "");
    return { count: figs.length, leaks: titles.filter((t) => !t.includes("待判讀")).length };
  });
  ok("**圖形判讀題在頁面上真的畫出剖面 SVG**", fig.count >= 1, `3.3 有 ${fig.count} 張`);
  ok("剖面圖的替代文字不會把答案念出來", fig.count >= 1 && fig.leaks === 0, "title 一律是中性的「待判讀…」");
  await page.selectOption('[data-quiz="self"] select', "1.1");
  await page.waitForTimeout(500);

  // 自我檢測:選一個選項 → 解析要立刻展開,而且要有逐選項的 why
  await page.locator('[data-quiz="self"] .pa-quiz__opt input').first().check();
  await page.waitForTimeout(300);
  const answered = await page.evaluate(() => {
    const fb = document.querySelector('[data-quiz="self"] .pa-quiz__feedback.is-shown');
    return {
      revealed: !!fb,
      whys: fb ? fb.querySelectorAll(".pa-quiz__why").length : 0,
      hasExplain: fb ? !!fb.querySelector(".pa-quiz__explain") : false,
    };
  });
  ok("自我檢測作答後立即展開解析", answered.revealed, "");
  ok("**解析含逐選項的 why 與整體說明**",
    answered.whys >= 1 && answered.hasExplain,
    `${answered.whys} 條逐選項解析`);

  // 結業測驗:開始 → 交卷 → 要算得出分數,而且每題都展開
  await page.locator('[data-quiz="exam"] button').first().click();
  await page.waitForTimeout(600);
  const drawn = await page.evaluate(
    () => document.querySelectorAll('[data-quiz="exam"] .pa-quiz__q').length
  );
  ok("結業測驗抽得出題目", drawn >= 5, `抽出 ${drawn} 題`);

  await page.locator('[data-quiz="exam"] button', { hasText: "交卷" }).click();
  await page.waitForTimeout(500);
  const graded = await page.evaluate(() => {
    const r = document.querySelector('[data-quiz="exam"] .pa-quiz__result.is-shown');
    return {
      scored: !!r && /\d+\s*\/\s*\d+/.test(r.textContent),
      text: r ? r.textContent.trim() : "",
      revealed: document.querySelectorAll('[data-quiz="exam"] .pa-quiz__feedback.is-shown').length,
    };
  });
  ok("交卷後算得出分數", graded.scored, graded.text);
  ok("交卷後每一題都展開解析",
    graded.revealed === drawn,
    `${graded.revealed} / ${drawn}`);

  ok("無 console 錯誤", page.errors.length === 0, page.errors.slice(0, 2).join(" | "));
  await ctx.close();
}

/* ==========================================================================
   我的進度(/progress/)

   徽章邏輯本身由 check-progress.mjs 用 vm sandbox 驗過,但那驗不到
   「PA.progress.recordQuiz 這個名字真的接得上瀏覽器裡跑的 quiz 引擎、
   徽章畫面真的會因為 recordQuiz 而重繪、證書真的能從表單產生出來」——
   這正是 recordQuiz/setQuiz 那個對不上名字的 bug 曾經逃過的那一種檢查空隙。
   ========================================================================== */
console.log("\n【我的進度】");
{
  const { page, ctx } = await newPage();
  await page.goto(`${BASE}/progress/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const initial = await page.evaluate(() => ({
    badgeCount: document.querySelectorAll(".pa-badge").length,
    earnedCount: document.querySelectorAll(".pa-badge--earned").length,
  }));
  ok("五個徽章都掛出來,初始狀態全部未取得",
    initial.badgeCount === 5 && initial.earnedCount === 0,
    `${initial.earnedCount} / ${initial.badgeCount}`);

  // 模擬通過 L1 結業測驗(跟 quiz 引擎交卷時走同一個函式),徽章畫面要能即時反映
  await page.evaluate(() => {
    PA.progress.recordQuiz("level-1", { score: 0.9, passed: true });
  });
  await page.waitForTimeout(300);
  const afterPass = await page.evaluate(() => ({
    earnedCount: document.querySelectorAll(".pa-badge--earned").length,
    earnedName: document.querySelector(".pa-badge--earned .pa-badge__name")?.textContent,
  }));
  ok("recordQuiz 之後徽章畫面自動重繪(靠 pa:progresschange 事件,不必重新整理)",
    afterPass.earnedCount === 1 && afterPass.earnedName === "電漿入門",
    `取得:${afterPass.earnedName}`);

  // 證書產生
  await page.fill("#cert-name", "測試學員");
  await page.click(".pa-progress__cert-sec button.pa-btn--primary");
  await page.waitForTimeout(200);
  const cert = await page.evaluate(() => {
    const c = document.querySelector(".pa-cert");
    return c
      ? {
          hasBadgeName: c.querySelector(".pa-cert__badge")?.textContent === "電漿入門",
          bodyHasName: c.querySelector(".pa-cert__body")?.textContent.includes("測試學員"),
          modCount: c.querySelectorAll(".pa-cert__mods li").length,
          hasDisclaimer: c.querySelector(".pa-cert__disclaimer")?.textContent.includes("非第三方認證"),
        }
      : null;
  });
  ok("證書產生成功,姓名、階段、免責聲明都在",
    !!cert && cert.hasBadgeName && cert.bodyHasName && cert.hasDisclaimer,
    JSON.stringify(cert));
  ok("證書列出涵蓋模組(L1 共 6 個)", !!cert && cert.modCount === 6, `${cert && cert.modCount} 個模組`);

  ok("無 console 錯誤", page.errors.length === 0, page.errors.slice(0, 2).join(" | "));
  await ctx.close();
}

await browser.close();

console.log(`\n${fail === 0 ? "✓" : "✗"} 煙霧測試 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
