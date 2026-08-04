/* ==========================================================================
   app.js — 啟動流程與腳本載入器

   初始載入只包含每一頁都需要的東西。兩塊大的按需載入:
     · data/glossary.js(41 KB)—— 頁面有 .pa-term 時才需要
     · js/lab/*(48 KB)     —— 頁面有 [data-lab] 時才需要

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
    loadScripts(
      [
        "data/quiz/level-1.js", "data/quiz/level-2.js",
        "data/quiz/level-3.js", "data/quiz/level-4.js",
        "js/quiz/engine.js",
      ],
      cb
    );
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
      ["search", function () { PA.search && PA.search.init(); }],
      ["home", function () { PA.home && PA.home.init(); }],
    ];

    steps.forEach(function (s) {
      try {
        s[1]();
      } catch (err) {
        // 單一模組失敗不應該讓整頁掛掉 —— 教材必須永遠讀得到
        console.error("[app] " + s[0] + " 初始化失敗", err);
      }
    });

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
  }

  PA.loadScripts = loadScripts;
  PA.ensureGlossary = ensureGlossary;
  PA.ensureLab = ensureLab;
  PA.ensureQuiz = ensureQuiz;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  PA.boot = boot;
})((window.PA = window.PA || {}));
