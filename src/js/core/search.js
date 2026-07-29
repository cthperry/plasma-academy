/* ==========================================================================
   search.js — 前端全站搜尋

   索引在建置時產生(build/search-index.mjs),首次搜尋才載入。
   中文以 bigram 切分、英文以詞邊界切分,支援中英混合查詢。
   ========================================================================== */

(function (PA) {
  "use strict";

  var index = null;
  var loading = false;
  var pending = [];

  var TYPE_LABEL = {
    chapter: "章節",
    term: "術語",
    gas: "氣體",
    defect: "缺陷",
    lab: "互動元件",
    page: "頁面",
  };

  function tokenize(text) {
    var out = [];
    var s = String(text).toLowerCase();
    // 英文/數字詞
    var words = s.match(/[a-z0-9]+/g);
    if (words) out.push.apply(out, words);
    // 中文 bigram
    var han = s.match(/[一-鿿]+/g);
    if (han) {
      han.forEach(function (run) {
        if (run.length === 1) out.push(run);
        for (var i = 0; i < run.length - 1; i++) out.push(run.slice(i, i + 2));
      });
    }
    return out;
  }

  function load(cb) {
    if (index) return cb(index);
    pending.push(cb);
    if (loading) return;
    loading = true;

    var base = document.documentElement.getAttribute("data-base") || "";
    var s = document.createElement("script");
    s.src = base + "data/search-index.js";
    s.onload = function () {
      index = window.PA_SEARCH_INDEX || { docs: [], inverted: {} };
      loading = false;
      pending.forEach(function (fn) {
        fn(index);
      });
      pending = [];
    };
    s.onerror = function () {
      loading = false;
      index = { docs: [], inverted: {} };
      pending.forEach(function (fn) {
        fn(index);
      });
      pending = [];
    };
    document.head.appendChild(s);
  }

  function query(q, limit) {
    if (!index || !q || !q.trim()) return [];
    var tokens = tokenize(q);
    if (!tokens.length) return [];

    var scores = {};
    tokens.forEach(function (t) {
      var postings = index.inverted[t];
      if (!postings) return;
      // 常見詞權重低
      var idf = Math.log(1 + index.docs.length / postings.length);
      postings.forEach(function (pair) {
        var docId = pair[0];
        var tf = pair[1];
        scores[docId] = (scores[docId] || 0) + tf * idf;
      });
    });

    var results = Object.keys(scores).map(function (id) {
      var d = index.docs[+id];
      return {
        doc: d,
        score: scores[id] * (d.weight || 1),
      };
    });

    results.sort(function (a, b) {
      return b.score - a.score;
    });
    return results.slice(0, limit || 20);
  }

  /** 綁定搜尋 UI */
  function init() {
    var btn = document.querySelector("[data-search-btn]");
    if (!btn) return;

    var box = null;
    var input = null;
    var list = null;

    function build() {
      box = document.createElement("div");
      box.className = "pa-search";
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-label", "全站搜尋");
      box.innerHTML =
        '<div class="pa-search__panel">' +
        '<input class="pa-search__input" type="search" placeholder="搜尋章節、術語、氣體、缺陷…" aria-label="搜尋">' +
        '<div class="pa-search__results" role="listbox"></div>' +
        "</div>";
      document.body.appendChild(box);
      input = box.querySelector("input");
      list = box.querySelector(".pa-search__results");

      input.addEventListener("input", function () {
        load(function () {
          render(query(input.value, 15));
        });
      });
      box.addEventListener("click", function (e) {
        if (e.target === box) close();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && box.classList.contains("is-open")) close();
      });
    }

    function render(results) {
      var base = document.documentElement.getAttribute("data-base") || "";
      list.textContent = "";
      if (!results.length) {
        var empty = document.createElement("div");
        empty.className = "pa-search__empty";
        empty.textContent = input.value.trim() ? "找不到符合的內容" : "輸入關鍵字開始搜尋";
        list.appendChild(empty);
        return;
      }
      results.forEach(function (r) {
        var a = document.createElement("a");
        a.className = "pa-search__item";
        a.href = base + r.doc.url;
        a.setAttribute("role", "option");

        var type = document.createElement("span");
        type.className = "pa-search__type";
        type.textContent = TYPE_LABEL[r.doc.type] || r.doc.type;

        var title = document.createElement("span");
        title.className = "pa-search__title";
        title.textContent = r.doc.title;

        var ctx = document.createElement("span");
        ctx.className = "pa-search__ctx";
        ctx.textContent = r.doc.context || "";

        a.appendChild(type);
        a.appendChild(title);
        a.appendChild(ctx);
        list.appendChild(a);
      });
    }

    function open() {
      if (!box) build();
      box.classList.add("is-open");
      input.value = "";
      input.focus();
      load(function () {
        render([]);
      });
    }
    function close() {
      if (box) box.classList.remove("is-open");
      btn.focus();
    }

    btn.addEventListener("click", open);

    // Ctrl/Cmd + K
    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open();
      }
    });
  }

  PA.search = { init: init, query: query, load: load, tokenize: tokenize };
})((window.PA = window.PA || {}));
