/* ==========================================================================
   tooltip.js — 術語 hover/focus 提示

   撰稿時只要寫 <span class="pa-term" data-term="鞘層">鞘層</span>,
   定義自動來自 data/glossary.js(單一來源)。
   行動版改為點擊觸發、底部彈出片(見 components.css)。
   ========================================================================== */

(function (PA) {
  "use strict";

  var tip = null;
  var current = null;
  var hideTimer = 0;

  function isTouch() {
    return window.matchMedia && window.matchMedia("(max-width: 639px)").matches;
  }

  function ensureTip() {
    if (tip) return tip;
    tip = document.createElement("div");
    tip.className = "pa-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.style.display = "none";
    document.body.appendChild(tip);
    return tip;
  }

  function render(term) {
    var base = document.documentElement.getAttribute("data-base") || "";
    var t = ensureTip();
    t.textContent = "";

    var head = document.createElement("div");
    head.className = "pa-tooltip__head";
    head.textContent = term.zh;
    if (term.en) {
      var en = document.createElement("span");
      en.className = "pa-tooltip__en";
      en.textContent = " " + term.en + (term.abbr ? " (" + term.abbr + ")" : "");
      head.appendChild(en);
    }

    var def = document.createElement("div");
    def.className = "pa-tooltip__def";
    def.textContent = term.def;

    t.appendChild(head);
    t.appendChild(def);

    if (term.ch) {
      var link = document.createElement("a");
      link.className = "pa-tooltip__link";
      link.href = base + "glossary/#" + term.id;
      link.textContent = "查看完整說明 → 第 " + term.ch + " 節";
      t.appendChild(link);
    }
    return t;
  }

  function place(anchor) {
    if (isTouch()) return; // 行動版由 CSS 固定在底部
    var r = anchor.getBoundingClientRect();
    var t = tip;
    t.style.display = "block";
    t.style.left = "0px";
    t.style.top = "0px";
    var tr = t.getBoundingClientRect();

    var left = r.left + window.scrollX + r.width / 2 - tr.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tr.width - 8));

    var above = r.top > tr.height + 12;
    var top = above
      ? r.top + window.scrollY - tr.height - 8
      : r.bottom + window.scrollY + 8;

    t.style.left = left + "px";
    t.style.top = top + "px";
  }

  function show(anchor) {
    // 術語資料是按需載入的 —— 還沒到就先抓,回來再顯示
    if (!PA.glossary) {
      if (PA.ensureGlossary) {
        PA.ensureGlossary(function () {
          if (current === anchor || document.activeElement === anchor) show(anchor);
        });
        current = anchor;
      }
      return;
    }
    var name = anchor.getAttribute("data-term") || anchor.textContent.trim();
    var term = PA.glossary.lookup(name);
    if (!term) {
      // 找不到就別顯示空框 —— 但在 console 提醒撰稿者
      if (window.PA_DEBUG) console.warn("[tooltip] 術語表沒有:" + name);
      return;
    }
    clearTimeout(hideTimer);
    current = anchor;
    render(term);
    tip.style.display = "block";
    place(anchor);
    anchor.setAttribute("aria-describedby", "pa-tooltip");
    tip.id = "pa-tooltip";
  }

  function hide() {
    if (!tip) return;
    hideTimer = setTimeout(function () {
      tip.style.display = "none";
      if (current) current.removeAttribute("aria-describedby");
      current = null;
    }, 80);
  }

  function init(root) {
    var scope = root || document;
    var terms = scope.querySelectorAll(".pa-term");
    if (!terms.length) return;

    Array.prototype.forEach.call(terms, function (a) {
      // 讓鍵盤能到達
      if (!a.hasAttribute("tabindex")) a.setAttribute("tabindex", "0");

      if (isTouch()) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          if (current === a) hide();
          else show(a);
        });
      } else {
        a.addEventListener("mouseenter", function () {
          show(a);
        });
        a.addEventListener("mouseleave", hide);
      }
      a.addEventListener("focus", function () {
        show(a);
      });
      a.addEventListener("blur", hide);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") hide();
    });
    // 讓游標移進 tooltip 時不消失(才能點連結)
    ensureTip().addEventListener("mouseenter", function () {
      clearTimeout(hideTimer);
    });
    tip.addEventListener("mouseleave", hide);

    window.addEventListener("scroll", function () {
      if (current && !isTouch()) place(current);
    }, { passive: true });
  }

  PA.tooltip = { init: init, show: show, hide: hide };
})((window.PA = window.PA || {}));
