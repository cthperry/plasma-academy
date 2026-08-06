/* ==========================================================================
   quiz/engine.js — 測驗引擎

   兩種模式,規則不同(docs/08 的「兩層評量」):

     自我檢測  答完**立即**顯示解析、不計分、無限重測
     結業測驗  交卷後才顯示、計分、有通過門檻、**每次重抽**

   「每次重抽」是刻意的:題庫大於出題數,重測時抽不同題,避免背答案。
   抽題用可重現的亂數種子,所以同一次作答重新整理不會換題。

   解析的呈現有一條硬規則:**選錯時要顯示「為什麼那個選項錯」**,
   而不只是告訴你正確答案。這是題庫品質的底線,也是這個引擎存在的理由 ——
   否則一份靜態的題目清單就夠了。
   ========================================================================== */

(function (PA) {
  "use strict";

  var STAGES = {
    "1": { level: "1", label: "L1 初階結業測驗", draw: 20, minutes: 30, pass: 0.75 },
    "2": { level: "2", label: "L2 中階結業測驗", draw: 30, minutes: 50, pass: 0.75 },
    "3": { level: "3", label: "L3 進階結業測驗", draw: 40, minutes: 70, pass: 0.75 },
    "4": { level: "4", label: "L4 專家結業測驗", draw: 30, minutes: 60, pass: 0.8 },
  };

  var TYPE_LABEL = {
    single: "單選", multi: "複選", numeric: "計算",
    image: "圖形判讀", scenario: "情境分析", order: "排序",
  };

  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /** 可重現的亂數 —— 同一個種子抽出同一組題 */
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  function shuffle(arr, rand) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function allOf(level) {
    return (PA.quizBank && PA.quizBank[level]) || [];
  }

  function ofChapter(ch) {
    var lvl = String(ch).split(".")[0];
    return allOf(lvl).filter(function (q) { return q.chapter === ch; });
  }

  /** 判分。回傳 { correct, detail } */
  function grade(q, answer) {
    if (q.type === "numeric") {
      var v = parseFloat(answer);
      if (!isFinite(v)) return { correct: false, detail: "未作答或不是數字" };
      var tol = q.tolerance == null ? 0.1 : q.tolerance;
      var ok = Math.abs(v - q.answer) <= Math.abs(q.answer) * tol;
      return {
        correct: ok,
        detail: "正解 " + q.answer + (q.unit || "") + "(容差 ±" + (tol * 100).toFixed(0) + " %)",
      };
    }
    if (q.type === "order") {
      var given = answer || [];
      var okOrder = given.length === q.order.length &&
        given.every(function (x, i) { return x === q.order[i]; });
      return { correct: okOrder, detail: "正確順序:" + q.order.join(" → ") };
    }
    var picked = answer || [];
    var right = q.options.filter(function (o) { return o.correct; }).map(function (o) { return o.id; });
    var same = picked.length === right.length &&
      right.every(function (id) { return picked.indexOf(id) >= 0; });
    return { correct: same, detail: "" };
  }

  /** 渲染一題。immediate=true 時,作答後立刻顯示解析 */
  function renderQuestion(q, idx, state, opts) {
    var wrap = el("div", "pa-quiz__q");
    wrap.setAttribute("data-qid", q.id);

    var head = el("div", "pa-quiz__q-head");
    var num = el("span", "pa-quiz__num");
    num.textContent = String(idx + 1);
    var type = el("span", "pa-quiz__type");
    type.textContent = TYPE_LABEL[q.type] || q.type;
    var ch = el("span", "pa-quiz__ch");
    ch.textContent = "§" + q.chapter;
    head.appendChild(num);
    head.appendChild(type);
    head.appendChild(ch);
    wrap.appendChild(head);

    var qt = el("p", "pa-quiz__text");
    qt.innerHTML = mark(q.question);
    wrap.appendChild(qt);

    /**
     * 圖形判讀題要真的看得到圖。
     *
     * 原本 type: "image" 只是換一個標籤,題幹仍然用文字描述剖面長什麼樣
     * (「最寬處出現在側壁中段」)—— 那其實還是閱讀測驗,不是判讀。
     * 而 3.3 缺陷圖鑑早就有 19 張由 defects.js 的 symptom 反推座標畫出來的
     * 剖面 SVG,直接拿來當題幹就好,不必另外畫圖。
     *
     * 用 svgId 掛,而不是把 SVG 字串塞進題庫:圖只有一份幾何,
     * 圖鑑改了題目跟著改,不會出現圖文對不上的情況。
     * check-quiz.mjs 會驗每個 svgId 都查得到對應的缺陷。
     */
    if (q.svgId && PA.defects && PA.defects.svg) {
      // ⚠️ 一定要蓋掉預設 title —— 它是「中文名:症狀」,等於把答案念出來。
      var svg = PA.defects.svg(q.svgId, {
        title: "待判讀的蝕刻剖面示意圖:遮罩在上、基材在下,溝槽形狀即為題目所指。",
        titleId: "qsvg-" + q.id,
      });
      if (svg) {
        var fig = el("figure", "pa-quiz__fig");
        fig.innerHTML = svg;
        var cap = el("figcaption");
        cap.textContent = "剖面示意(遮罩在上、基材在下)";
        fig.appendChild(cap);
        wrap.appendChild(fig);
      }
    }

    var body = el("div", "pa-quiz__body");
    wrap.appendChild(body);
    var fb = el("div", "pa-quiz__feedback");
    wrap.appendChild(fb);

    function reveal() {
      var g = grade(q, state.answers[q.id]);
      fb.textContent = "";
      fb.classList.add("is-shown");
      fb.classList.toggle("is-correct", g.correct);
      fb.classList.toggle("is-wrong", !g.correct);

      var verdict = el("div", "pa-quiz__verdict");
      verdict.textContent = g.correct ? "✓ 答對" : "✗ 答錯";
      fb.appendChild(verdict);

      // 逐選項解析 —— 這是本題庫的品質底線
      if (q.options) {
        var picked = state.answers[q.id] || [];
        q.options.forEach(function (o) {
          var chosen = picked.indexOf(o.id) >= 0;
          if (!o.correct && !chosen) return;   // 沒選到的錯誤選項不用洗版
          var row = el("div", "pa-quiz__why");
          row.classList.add(o.correct ? "is-right" : "is-wrong");
          var tag = el("strong");
          tag.textContent = o.id + (o.correct ? " ✓" : " ✗") + (chosen ? "(你選的)" : "");
          row.appendChild(tag);
          var t = el("span");
          t.innerHTML = " " + mark(o.why || "");
          row.appendChild(t);
          fb.appendChild(row);
        });
      }
      if (g.detail) {
        var d = el("div", "pa-quiz__why");
        d.textContent = g.detail;
        fb.appendChild(d);
      }
      var ex = el("p", "pa-quiz__explain");
      ex.innerHTML = mark(q.explanation || "");
      fb.appendChild(ex);

      var link = el("a", "pa-quiz__ref");
      link.href = opts.base + "level/" + q.reference.split(".")[0] + "/" +
        q.reference.replace(".", "-") + "-" + slugOf(q.reference) + "/";
      link.textContent = "→ 回到 " + q.reference;
      if (slugOf(q.reference)) fb.appendChild(link);
    }

    if (q.type === "numeric") {
      var row = el("div", "pa-quiz__numeric");
      var inp = el("input", null, { type: "text", inputmode: "decimal", "aria-label": "數值答案" });
      inp.addEventListener("input", function () {
        state.answers[q.id] = inp.value;
        if (opts.onChange) opts.onChange();
      });
      row.appendChild(inp);
      if (q.unit) {
        var u = el("span", "pa-quiz__unit");
        u.textContent = q.unit;
        row.appendChild(u);
      }
      if (opts.immediate) {
        var btn = el("button", "pa-btn", { type: "button" });
        btn.textContent = "對答案";
        btn.addEventListener("click", reveal);
        row.appendChild(btn);
      }
      body.appendChild(row);
    } else if (q.type === "order") {
      var pool = shuffle(q.order, rng(state.seed + idx));
      state.answers[q.id] = state.answers[q.id] || pool.slice();
      var list = el("div", "pa-quiz__order");
      function paint() {
        list.textContent = "";
        state.answers[q.id].forEach(function (item, i) {
          var it = el("div", "pa-quiz__order-item");
          var lab = el("span");
          lab.textContent = (i + 1) + ". " + item;
          it.appendChild(lab);
          var up = el("button", "pa-btn pa-btn--tiny", { type: "button", "aria-label": "上移 " + item });
          up.textContent = "↑";
          up.disabled = i === 0;
          up.addEventListener("click", function () {
            var a = state.answers[q.id];
            var t = a[i - 1]; a[i - 1] = a[i]; a[i] = t;
            paint();
            if (opts.onChange) opts.onChange();
          });
          it.appendChild(up);
          list.appendChild(it);
        });
        if (opts.immediate) {
          var b2 = el("button", "pa-btn", { type: "button" });
          b2.textContent = "對答案";
          b2.addEventListener("click", reveal);
          list.appendChild(b2);
        }
      }
      paint();
      body.appendChild(list);
    } else {
      var multi = q.type === "multi";
      var opts2 = shuffle(q.options, rng(state.seed * 31 + idx));
      opts2.forEach(function (o) {
        var lab = el("label", "pa-quiz__opt");
        var inp2 = el("input", null, {
          type: multi ? "checkbox" : "radio",
          name: "q-" + q.id,
        });
        inp2.addEventListener("change", function () {
          var cur = state.answers[q.id] || [];
          if (multi) {
            var i2 = cur.indexOf(o.id);
            if (inp2.checked && i2 < 0) cur.push(o.id);
            if (!inp2.checked && i2 >= 0) cur.splice(i2, 1);
            state.answers[q.id] = cur;
          } else {
            state.answers[q.id] = [o.id];
            if (opts.immediate) reveal();
          }
          if (opts.onChange) opts.onChange();
        });
        lab.appendChild(inp2);
        var sp = el("span");
        sp.innerHTML = mark(o.text);
        lab.appendChild(sp);
        body.appendChild(lab);
      });
      if (multi && opts.immediate) {
        var b3 = el("button", "pa-btn", { type: "button" });
        b3.textContent = "對答案";
        b3.addEventListener("click", reveal);
        body.appendChild(b3);
      }
    }

    wrap.__reveal = reveal;
    return wrap;
  }

  /** **粗體** → <strong>,並轉義其餘 HTML */
  function mark(s) {
    var esc = String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  var SLUGS = null;
  function slugOf(ref) {
    if (!SLUGS && PA.curriculum) {
      SLUGS = {};
      PA.curriculum.modules.forEach(function (m) {
        SLUGS[m.id] = m.slug.split("-").slice(2).join("-");
      });
    }
    return (SLUGS && SLUGS[ref]) || "";
  }

  /* ---------------- 自我檢測 ---------------- */
  function mountSelfCheck(host, base) {
    var chapters = (PA.curriculum ? PA.curriculum.modules : [])
      .map(function (m) { return m.id; })
      .filter(function (id) { return ofChapter(id).length > 0; });

    var picker = el("div", "pa-quiz__picker");
    var lab = el("label");
    lab.textContent = "選擇章節:";
    var sel = el("select", null, { "aria-label": "選擇章節" });
    chapters.forEach(function (id) {
      var o = el("option");
      o.value = id;
      var m = PA.curriculum.byId[id];
      o.textContent = id + " " + (m ? m.title : "") + "(" + ofChapter(id).length + " 題)";
      sel.appendChild(o);
    });
    lab.appendChild(sel);
    picker.appendChild(lab);
    host.appendChild(picker);

    var area = el("div", "pa-quiz__area");
    host.appendChild(area);

    function paint() {
      var qs = ofChapter(sel.value);
      var state = { seed: 20260804, answers: {} };
      area.textContent = "";
      var intro = el("p", "pa-subtle");
      intro.textContent = "答完立即顯示解析,不計分,可無限重答。";
      area.appendChild(intro);
      qs.forEach(function (q, i) {
        area.appendChild(renderQuestion(q, i, state, { immediate: true, base: base }));
      });
    }
    sel.addEventListener("change", paint);
    paint();
  }

  /* ---------------- 結業測驗 ---------------- */
  function mountExam(host, base) {
    var picker = el("div", "pa-quiz__picker");
    var sel = el("select", null, { "aria-label": "選擇階段" });
    Object.keys(STAGES).forEach(function (k) {
      var st = STAGES[k];
      var o = el("option");
      o.value = k;
      o.textContent = st.label + "(題庫 " + allOf(k).length + " 題,出 " +
        Math.min(st.draw, allOf(k).length) + " 題,通過 " + st.pass * 100 + " %)";
      sel.appendChild(o);
    });
    var start = el("button", "pa-btn", { type: "button" });
    start.textContent = "開始測驗";
    picker.appendChild(sel);
    picker.appendChild(start);
    host.appendChild(picker);

    var area = el("div", "pa-quiz__area");
    host.appendChild(area);

    start.addEventListener("click", function () {
      var st = STAGES[sel.value];
      var pool = allOf(sel.value);
      var seed = Date.now() & 0x7fffffff;
      var draw = shuffle(pool, rng(seed)).slice(0, Math.min(st.draw, pool.length));
      var state = { seed: seed, answers: {} };

      area.textContent = "";
      var note = el("div", "pa-note pa-note--values");
      var nt = el("div", "pa-note__title");
      nt.textContent = "📋 " + st.label;
      note.appendChild(nt);
      var np = el("p");
      np.textContent =
        "本次抽出 " + draw.length + " 題(題庫共 " + pool.length +
        " 題)。交卷後才顯示解析;重測會重新抽題。通過門檻 " + st.pass * 100 + " %。";
      note.appendChild(np);
      if (pool.length < st.draw) {
        var warn = el("p");
        warn.className = "pa-subtle";
        warn.textContent =
          "⚠️ 題庫目前只有 " + pool.length + " 題,少於規格的 " + st.draw +
          " 題出題數,因此本次全部出題、無法重抽不同題目。題庫擴充進度見 docs/11。";
        note.appendChild(warn);
      }
      area.appendChild(note);

      var nodes = draw.map(function (q, i) {
        var n = renderQuestion(q, i, state, { immediate: false, base: base });
        area.appendChild(n);
        return n;
      });

      var submit = el("button", "pa-btn", { type: "button" });
      submit.textContent = "交卷";
      area.appendChild(submit);
      var result = el("div", "pa-quiz__result");
      area.appendChild(result);

      submit.addEventListener("click", function () {
        var right = 0;
        draw.forEach(function (q, i) {
          if (grade(q, state.answers[q.id]).correct) right++;
          nodes[i].__reveal();
        });
        var score = draw.length ? right / draw.length : 0;
        var passed = score >= st.pass;
        result.textContent = "";
        result.classList.add("is-shown");
        result.classList.toggle("is-pass", passed);
        var h = el("strong");
        h.textContent = (passed ? "✓ 通過" : "✗ 未通過") + " — " + right + " / " +
          draw.length + "(" + (score * 100).toFixed(0) + " %,門檻 " + st.pass * 100 + " %)";
        result.appendChild(h);
        if (PA.progress && PA.progress.recordQuiz) {
          try {
            PA.progress.recordQuiz("level-" + sel.value, { score: score, passed: passed });
          } catch (e) { /* 進度記錄失敗不應該影響作答 */ }
        }
        submit.disabled = true;
        result.scrollIntoView({ block: "nearest" });
      });
    });
  }

  /**
   * 測驗頁上「題庫有多大」那幾個數字。
   *
   * 這幾個數字曾經是手寫在 content/quiz.html 裡的,結果每次擴充題庫都忘了同步 ——
   * 使用者兩次直接在網站上看到「目前共 301 題」而實際已經 325 題。
   * 手寫的統計數字必然會過期,所以改成開頁時由題庫自己算出來填進去:
   * 加題、改出題數、加章節都不必再記得回來改這一頁。
   */
  function fillStats() {
    var draws = document.querySelectorAll("[data-quiz-draws]");
    Array.prototype.forEach.call(draws, function (el) {
      el.textContent = ["1", "2", "3", "4"]
        .map(function (k) { return "L" + k + " " + STAGES[k].draw; })
        .join(" / ");
    });

    var chapters = document.querySelectorAll("[data-quiz-chapters]");
    if (chapters.length && PA.curriculum) {
      Array.prototype.forEach.call(chapters, function (el) {
        el.textContent = PA.curriculum.modules.length + " 章自我檢測";
      });
    }

    var stats = document.querySelectorAll("[data-quiz-stats]");
    if (!stats.length || !PA.quizBank) return;
    var total = 0;
    var parts = ["1", "2", "3", "4"].map(function (k) {
      var n = allOf(k).length;
      total += n;
      return "L" + k + " " + n + " / 出 " + STAGES[k].draw +
        "(" + (n / STAGES[k].draw).toFixed(2) + " 倍)";
    });
    var chCount = PA.curriculum ? PA.curriculum.modules.length : 0;
    Array.prototype.forEach.call(stats, function (el) {
      el.textContent = "目前共 " + total + " 題" +
        (chCount ? ",覆蓋全部 " + chCount + " 章" : "") +
        ",四個階段都落在這個範圍內:" + parts.join("、") + "。";
    });
  }

  function scan() {
    var base = document.documentElement.getAttribute("data-base") || "";
    fillStats();
    var hosts = document.querySelectorAll("[data-quiz]");
    Array.prototype.forEach.call(hosts, function (h) {
      if (h.hasAttribute("data-quiz-mounted")) return;
      h.setAttribute("data-quiz-mounted", "");
      var mode = h.getAttribute("data-quiz");
      try {
        if (mode === "exam") mountExam(h, base);
        else mountSelfCheck(h, base);
      } catch (e) {
        h.setAttribute("data-quiz-error", "");
        console.error("[quiz] 掛載失敗", e);
      }
    });
  }

  PA.quiz = {
    STAGES: STAGES,
    TYPE_LABEL: TYPE_LABEL,
    allOf: allOf,
    ofChapter: ofChapter,
    grade: grade,
    scan: scan,
    fillStats: fillStats,
    // rng/shuffle 匯出給 tools/check-quiz-mix.mjs 用——結業測驗實際抽題
    // 用的就是這兩個函式,模擬要跑同一份演算法,不能自己另外複製一份
    // 抽樣邏輯(那樣測到的只是「模擬」符不符合規格,不是「引擎」符不符合規格)。
    rng: rng,
    shuffle: shuffle,
  };
})((window.PA = window.PA || {}));
