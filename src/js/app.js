/* ==========================================================================
   app.js — 啟動流程與腳本載入器

   初始載入只包含每一頁都需要的東西。按需載入的幾塊:
     · data/glossary.js(41 KB)—— 頁面有 .pa-term 時才需要
     · js/lab/*(48 KB)     —— 頁面有 [data-lab] 時才需要
     · js/core/search.js(5.6 KB)—— 按鈕或 Ctrl/Cmd+K 觸發後才需要

   用 <script> 注入而非 dynamic import,file:// 直接開啟也能運作。
   ========================================================================== */

(function (PA) {
  "use strict";

  var base = document.documentElement.getAttribute("data-base") || "";
  var loaded = {};
  var loading = {};

  /** 依序載入一組腳本(順序重要:lab 模組彼此有相依) */
  function loadScripts(paths, cb) {
    var i = 0;
    function next() {
      if (i >= paths.length) {
        if (cb) cb();
        return;
      }
      var path = paths[i++];
      if (loaded[path]) return next();

      if (loading[path]) {
        loading[path].push(next);
        return;
      }
      loading[path] = [next];

      var s = document.createElement("script");
      s.src = base + path;
      s.onload = function () {
        loaded[path] = true;
        var queue = loading[path];
        delete loading[path];
        queue.forEach(function (fn) {
          fn();
        });
      };
      s.onerror = function () {
        console.error("[app] 載入失敗:" + s.src);
        delete loading[path];
        if (cb) cb(new Error(path));
      };
      document.head.appendChild(s);
    }
    next();
  }

  var LAB_CORE = [
    "js/lab/canvas-theme.js",
    "js/lab/plasma-model.js",
    "js/lab/lifecycle.js",
    "js/lab/controls.js",
    "js/lab/plot.js",
    "js/lab/particle-engine.js",
  ];

  function ensureGlossary(cb) {
    if (PA.glossary) return cb();
    loadScripts(["data/glossary.js"], cb);
  }

  function ensureLab(cb) {
    if (PA.lab) return cb();
    loadScripts(LAB_CORE, cb);
  }

  /** 測驗引擎 + 四份題庫,只有測驗中心那一頁會載 */
  function ensureQuiz(cb) {
    if (PA.quiz && PA.quizBank) return cb();
    // defects.js / defect-svg.js 是圖形判讀題的題幹來源(engine.js 讀 q.svgId
    // 去要那張剖面 SVG)。兩支都在 lazy 路徑上,不佔關鍵路徑預算。
    loadScripts(
      [
        "data/quiz/level-1.js", "data/quiz/level-2.js",
        "data/quiz/level-3.js", "data/quiz/level-4.js",
        "data/defects.js", "data/defect-svg.js",
        "js/quiz/engine.js",
      ],
      cb
    );
  }

  /** 首頁與階層頁的進度環,只有那些頁面會載 */
  function ensureHome(cb) {
    if (PA.home) return cb();
    loadScripts(["js/core/home.js"], cb);
  }

  /** /progress/ 頁面的畫面邏輯,只有那一頁會載 */
  function ensureProgressUI(cb) {
    if (PA.progressUI) return cb();
    loadScripts(["js/core/progress-ui.js"], cb);
  }

  /** 全站搜尋,只有真的要用(按鈕或 Ctrl/Cmd+K)才載 */
  function ensureSearch(cb) {
    if (PA.search) return cb();
    loadScripts(["js/core/search.js"], cb);
  }

  /**
   * 搜尋 UI 的觸發按鈕與 Ctrl/Cmd+K 快捷鍵要在每一頁都能用,
   * 但 search.js 本體(tokenize/index/render,5.6 KB)不必 ——
   * 跟 home.js 同一個理由被搬到按需載入:1.1 補齊三判準的物理意義後,
   * 章節頁的關鍵路徑又頂到了預算上緣。這裡先接住第一次觸發,
   * 载入完成後補一次真正的開啟動作,使用者感覺不出差異。
   */
  function bootSearchTrigger() {
    var btn = document.querySelector("[data-search-btn]");
    var triggered = false;
    function trigger() {
      if (triggered) return;
      triggered = true;
      ensureSearch(function (err) {
        if (err) return;
        try {
          PA.search.init();
          var b = document.querySelector("[data-search-btn]");
          if (b) b.click(); // 補一次剛剛那個被吃掉的觸發,真正打開搜尋框
        } catch (e) {
          console.error("[app] 搜尋初始化失敗", e);
        }
      });
    }
    if (btn) btn.addEventListener("click", trigger, { once: true });
    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        trigger();
      }
    });
  }

  /** 瀏覽器閒置時預先載入,讓首次 hover 不用等 */
  function idle(fn) {
    if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: 2500 });
    else setTimeout(fn, 1200);
  }

  function boot() {
    var steps = [
      ["nav", function () { PA.nav && PA.nav.init(); }],
      ["units", function () { PA.units && PA.units.init(); }],
      ["search", bootSearchTrigger],
    ];

    steps.forEach(function (s) {
      try {
        s[1]();
      } catch (err) {
        // 單一模組失敗不應該讓整頁掛掉 —— 教材必須永遠讀得到
        console.error("[app] " + s[0] + " 初始化失敗", err);
      }
    });

    /**
     * 首頁/階層頁的進度環。
     *
     * home.js 原本掛在模板上、每一頁都載,但它只在有 [data-level-progress]
     * 的頁面(首頁與四個階層頁)才有事做 —— 25 個章節頁白白背了 2.3 KB
     * 的關鍵路徑。改成與 glossary / lab / quiz 同一套按需載入。
     *
     * 這是被預算逼出來的:補完術語標記之後,章節頁的關鍵路徑正好頂到
     * 120.0 KB(上限是 < 120),差 20 個位元組。與其把標記砍回去,
     * 不如把本來就不該載的東西移走。
     */
    if (document.querySelector("[data-level-progress]")) {
      ensureHome(function (err) {
        if (err) return;
        try {
          PA.home.init();
        } catch (e) {
          console.error("[app] 進度環初始化失敗", e);
        }
      });
    }

    // 術語 tooltip:先綁事件,術語資料等到真的要顯示時才載
    if (document.querySelector(".pa-term")) {
      try {
        PA.tooltip.init();
      } catch (err) {
        console.error("[app] tooltip 初始化失敗", err);
      }
      idle(function () {
        ensureGlossary(function () {});
      });
    }

    // 測驗:題庫與引擎按需載入
    if (document.querySelector("[data-quiz]")) {
      ensureQuiz(function (err) {
        if (err) return;
        try {
          PA.quiz.scan();
        } catch (e) {
          console.error("[app] 測驗掛載失敗", e);
        }
      });
    }

    // 互動元件:整組 lab 核心按需載入
    if (document.querySelector("[data-lab]")) {
      ensureLab(function (err) {
        if (err) return;
        try {
          PA.lab.scan();
        } catch (e) {
          console.error("[app] lab 掃描失敗", e);
        }
      });
    }

    // 進度頁:徽章/證書/匯出入,只有 /progress/ 會載
    if (document.querySelector("[data-progress]")) {
      ensureProgressUI(function (err) {
        if (err) return;
        try {
          PA.progressUI.scan();
        } catch (e) {
          console.error("[app] 進度頁掛載失敗", e);
        }
      });
    }
  }

  PA.loadScripts = loadScripts;
  PA.ensureGlossary = ensureGlossary;
  PA.ensureLab = ensureLab;
  PA.ensureProgressUI = ensureProgressUI;
  PA.ensureQuiz = ensureQuiz;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  PA.boot = boot;
})((window.PA = window.PA || {}));
