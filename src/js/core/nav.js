/* ==========================================================================
   nav.js — 導覽:側欄抽屜、主題鈕、鍵盤跳章、右側大綱高亮
   ========================================================================== */

(function (PA) {
  "use strict";

  function initDrawer() {
    var btn = document.querySelector("[data-menu-btn]");
    var sidebar = document.querySelector(".pa-sidebar");
    if (!btn || !sidebar) return;

    var backdrop = document.querySelector(".pa-drawer-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "pa-drawer-backdrop";
      document.body.appendChild(backdrop);
    }

    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      sidebar.classList.add("is-open");
      backdrop.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      var first = sidebar.querySelector("a, button");
      if (first) first.focus();
    }
    function close() {
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      if (lastFocus) lastFocus.focus();
    }

    btn.addEventListener("click", function () {
      sidebar.classList.contains("is-open") ? close() : open();
    });
    backdrop.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sidebar.classList.contains("is-open")) close();
    });
  }

  function initThemeButton() {
    var btn = document.querySelector("[data-theme-btn]");
    if (!btn) return;

    var LABEL = { auto: "跟隨系統", light: "淺色", dark: "深色" };
    var ICON = {
      auto: "M12 3a9 9 0 100 18 9 9 0 000-18zm0 2v14a7 7 0 000-14z",
      light: "M12 7a5 5 0 100 10 5 5 0 000-10zM12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
      dark: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z",
    };

    function render() {
      var mode = PA.theme.get();
      btn.setAttribute("aria-label", "主題:" + LABEL[mode] + "(點擊切換)");
      btn.setAttribute("title", "主題:" + LABEL[mode]);
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
        'aria-hidden="true"><path d="' + ICON[mode] + '"/></svg>';
    }

    btn.addEventListener("click", function () {
      PA.theme.cycle();
      render();
    });
    window.addEventListener("pa:themechange", render);
    render();
  }

  /** 鍵盤 ← → 跳章(避開輸入框與修飾鍵) */
  function initKeyboardNav() {
    document.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

      var sel =
        e.key === "ArrowLeft" ? "[data-nav-prev]" : e.key === "ArrowRight" ? "[data-nav-next]" : null;
      if (!sel) return;
      var link = document.querySelector(sel);
      if (link) {
        e.preventDefault();
        window.location.href = link.href;
      }
    });
  }

  /** 右側大綱:捲動時高亮當前小節 */
  function initOutline() {
    var outline = document.querySelector(".pa-outline");
    if (!outline || !window.IntersectionObserver) return;

    var links = outline.querySelectorAll("a[href^='#']");
    if (!links.length) return;

    var map = {};
    var targets = [];
    Array.prototype.forEach.call(links, function (a) {
      var id = decodeURIComponent(a.getAttribute("href").slice(1));
      var el = document.getElementById(id);
      if (el) {
        map[id] = a;
        targets.push(el);
      }
    });

    var visible = new Set();

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        });
        // 取文件順序最前的可見項
        var active = null;
        for (var i = 0; i < targets.length; i++) {
          if (visible.has(targets[i].id)) {
            active = targets[i].id;
            break;
          }
        }
        Array.prototype.forEach.call(links, function (a) {
          a.classList.remove("is-active");
        });
        if (active && map[active]) map[active].classList.add("is-active");
      },
      { rootMargin: "-80px 0px -70% 0px" }
    );
    targets.forEach(function (t) {
      io.observe(t);
    });
  }

  /** 學習目標勾選 → 寫進度 */
  function initObjectives() {
    var box = document.querySelector("[data-objectives]");
    if (!box || !PA.progress) return;
    var chapterId = box.getAttribute("data-objectives");
    var inputs = box.querySelectorAll('input[type="checkbox"]');

    var saved = PA.progress.chapter(chapterId).objectives || [];
    Array.prototype.forEach.call(inputs, function (input, i) {
      input.checked = !!saved[i];
      input.addEventListener("change", function () {
        PA.progress.setObjective(chapterId, i, input.checked);
      });
    });
  }

  /** 記錄造訪 */
  function initVisit() {
    var main = document.querySelector("[data-chapter]");
    if (main && PA.progress) PA.progress.visit(main.getAttribute("data-chapter"));
  }

  /** 側欄標出已完成章節 */
  function initSidebarProgress() {
    if (!PA.progress || !PA.curriculum) return;
    var links = document.querySelectorAll(".pa-toc a[data-module]");
    Array.prototype.forEach.call(links, function (a) {
      var id = a.getAttribute("data-module");
      var mod = PA.curriculum.byId[id];
      if (!mod) return;
      if (PA.progress.isChapterDone(id, mod.objectiveCount)) {
        var mark = document.createElement("span");
        mark.className = "pa-toc__done";
        mark.setAttribute("aria-label", "已完成");
        mark.textContent = "✓";
        a.appendChild(mark);
      }
    });
  }

  function init() {
    initDrawer();
    initThemeButton();
    initKeyboardNav();
    initOutline();
    initVisit();
    initObjectives();
    initSidebarProgress();
  }

  PA.nav = { init: init };
})((window.PA = window.PA || {}));
