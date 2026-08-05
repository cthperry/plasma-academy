/* ==========================================================================
   progress-ui.js — /progress/ 頁面的畫面(資料邏輯在 core/progress.js)

   四塊:章節與結業測驗總覽、徽章、證書產生器、匯出/匯入/重設。
   全部讀寫都經過 PA.progress,這裡只負責畫面。
   ========================================================================== */

(function (PA) {
  "use strict";

  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    return n;
  }

  function fmtDate(ts) {
    if (!ts) return "—";
    var d = new Date(ts);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /**
   * 徽章條件,docs/08-assessment.md §認證·徽章 的唯一來源。
   * 「全程完訓」除了四階全通過,還要求所有章節都完成
   * (isChapterDone:造訪 + 學習目標全勾 + 自我檢測 ≥ 60%)。
   * 只有 /progress/ 用得到,所以放在按需載入的這支檔案,不放進
   * 每一頁都要付載入成本的 core/progress.js。
   */
  var BADGE_DEFS = [
    { id: "level-1", name: "電漿入門" },
    { id: "level-2", name: "電漿實務" },
    { id: "level-3", name: "製程整合" },
    { id: "level-4", name: "電漿專家" },
  ];

  function badges() {
    var d = PA.progress.load();
    var out = BADGE_DEFS.map(function (b) {
      var q = d.quizzes[b.id];
      return { id: b.id, name: b.name, earned: !!(q && q.passed) };
    });
    var allLevelsPassed = out.every(function (b) {
      return b.earned;
    });
    var allChaptersDone = PA.curriculum.modules.every(function (m) {
      return PA.progress.isChapterDone(m.id, m.objectiveCount);
    });
    out.push({ id: "all", name: "全程完訓", earned: allLevelsPassed && allChaptersDone });
    return out;
  }

  // ---- 章節與結業測驗總覽 -------------------------------------------------

  function renderOverview(host) {
    var wrap = el("div", "pa-progress__sec");
    var h = el("h2");
    h.textContent = "章節與結業測驗";
    wrap.appendChild(h);

    var tbl = el("table", "pa-table");
    var thead = el("thead");
    var trh = el("tr");
    ["階段", "章節完成", "結業測驗"].forEach(function (t) {
      var th = el("th");
      th.textContent = t;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    tbl.appendChild(thead);

    var tb = el("tbody");
    PA.curriculum.levels.forEach(function (lv) {
      var st = PA.progress.levelStats(lv.no);
      var quiz = PA.progress.load().quizzes["level-" + lv.no];

      var tr = el("tr");
      var tdName = el("td");
      var strong = el("strong");
      strong.textContent = "L" + lv.no + " " + lv.name;
      tdName.appendChild(strong);
      tr.appendChild(tdName);

      var tdChap = el("td");
      tdChap.textContent = st.done + " / " + st.total + "(" + Math.round(st.ratio * 100) + " %)";
      tr.appendChild(tdChap);

      var tdQuiz = el("td");
      if (!quiz) {
        tdQuiz.textContent = "尚未測驗";
      } else {
        var tag = el("span", quiz.passed ? "pa-badge-tag pa-badge-tag--pass" : "pa-badge-tag pa-badge-tag--fail");
        tag.textContent = quiz.passed ? "✓ 通過" : "✗ 未通過";
        tdQuiz.appendChild(tag);
        var detail = el("span", "pa-subtle");
        detail.textContent =
          " " + (quiz.score * 100).toFixed(0) + " %,共 " + quiz.attempts + " 次,最近 " + fmtDate(quiz.date);
        tdQuiz.appendChild(detail);
      }
      tr.appendChild(tdQuiz);

      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    var tw = el("div", "pa-table-wrap");
    tw.appendChild(tbl);
    wrap.appendChild(tw);
    host.appendChild(wrap);
  }

  // ---- 徽章 --------------------------------------------------------------

  function renderBadges(host) {
    var wrap = el("div", "pa-progress__sec");
    var h = el("h2");
    h.textContent = "徽章";
    wrap.appendChild(h);

    var grid = el("div", "pa-badge-grid");
    badges().forEach(function (b) {
      var card = el("div", "pa-badge" + (b.earned ? " pa-badge--earned" : ""));
      var icon = el("div", "pa-badge__icon");
      icon.textContent = b.earned ? "🏅" : "🔒";
      var name = el("div", "pa-badge__name");
      name.textContent = b.name;
      card.appendChild(icon);
      card.appendChild(name);
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    host.appendChild(wrap);
  }

  // ---- 證書 --------------------------------------------------------------

  /** 徽章 id → 涵蓋的模組清單與證書標題 */
  function coverageFor(badgeId) {
    if (badgeId === "all") {
      return PA.curriculum.modules;
    }
    var no = +badgeId.replace("level-", "");
    return PA.curriculum.modulesOfLevel(no);
  }

  function renderCertificate(host) {
    var wrap = el("div", "pa-progress__sec pa-progress__cert-sec");
    var h = el("h2");
    h.textContent = "證書";
    wrap.appendChild(h);

    var earned = badges().filter(function (b) {
      return b.earned;
    });

    var intro = el("p", "pa-subtle");
    intro.textContent = earned.length
      ? "選一個已取得的徽章產生證書。"
      : "尚未取得任何徽章 —— 先通過至少一階的結業測驗。";
    wrap.appendChild(intro);

    if (!earned.length) {
      host.appendChild(wrap);
      return;
    }

    var form = el("div", "pa-lab__controls");

    var nameWrap = el("div", "pa-ctrl");
    var nameLabel = el("label", "pa-ctrl__label", { for: "cert-name" });
    var nameLabelText = el("span");
    nameLabelText.textContent = "姓名";
    nameLabel.appendChild(nameLabelText);
    var nameInput = el("input", null, { type: "text", id: "cert-name", placeholder: "在此輸入姓名" });
    nameWrap.appendChild(nameLabel);
    nameWrap.appendChild(nameInput);
    form.appendChild(nameWrap);

    var selWrap = el("div", "pa-ctrl");
    var selLabel = el("label", "pa-ctrl__label", { for: "cert-badge" });
    var selLabelText = el("span");
    selLabelText.textContent = "階段";
    selLabel.appendChild(selLabelText);
    var sel = el("select", null, { id: "cert-badge" });
    earned.forEach(function (b) {
      var opt = el("option", null, { value: b.id });
      opt.textContent = b.name;
      sel.appendChild(opt);
    });
    selWrap.appendChild(selLabel);
    selWrap.appendChild(sel);
    form.appendChild(selWrap);

    wrap.appendChild(form);

    var genBtn = el("button", "pa-btn pa-btn--primary", { type: "button" });
    genBtn.textContent = "產生證書";
    wrap.appendChild(genBtn);

    var certHost = el("div");
    wrap.appendChild(certHost);

    genBtn.addEventListener("click", function () {
      certHost.textContent = "";
      var badge = earned.filter(function (b) {
        return b.id === sel.value;
      })[0];
      if (!badge) return;
      var name = nameInput.value.trim() || "（未填寫姓名）";
      var mods = coverageFor(badge.id);

      var certWrap = el("div", "pa-cert-wrap");
      var cert = el("div", "pa-cert");

      var title = el("div", "pa-cert__title");
      title.textContent = "結訓證明";
      cert.appendChild(title);

      var sub = el("div", "pa-cert__badge");
      sub.textContent = badge.name;
      cert.appendChild(sub);

      var body = el("p", "pa-cert__body");
      body.textContent = name + " 完成「" + badge.name + "」階段之學習內容,通過對應結業測驗。";
      cert.appendChild(body);

      var meta = el("div", "pa-cert__meta");
      var metaDate = el("span");
      metaDate.textContent = "完成日期:" + fmtDate(Date.now());
      meta.appendChild(metaDate);
      cert.appendChild(meta);

      var modTitle = el("div", "pa-cert__mods-title");
      modTitle.textContent = "涵蓋模組";
      cert.appendChild(modTitle);
      var modList = el("ul", "pa-cert__mods");
      mods.forEach(function (m) {
        var li = el("li");
        li.textContent = m.id + " " + m.title;
        modList.appendChild(li);
      });
      cert.appendChild(modList);

      var disclaimer = el("p", "pa-cert__disclaimer");
      disclaimer.textContent =
        "本證書由學習者本機產生,供內部訓練紀錄參考,非第三方認證。";
      cert.appendChild(disclaimer);

      certWrap.appendChild(cert);

      var printBtn = el("button", "pa-btn", { type: "button" });
      printBtn.textContent = "🖨 列印 / 另存 PDF";
      printBtn.addEventListener("click", function () {
        document.body.classList.add("pa-print-cert-only");
        window.print();
      });
      certWrap.appendChild(printBtn);

      certHost.appendChild(certWrap);
    });

    window.addEventListener("afterprint", function () {
      document.body.classList.remove("pa-print-cert-only");
    });

    host.appendChild(wrap);
  }

  // ---- 匯出 / 匯入 / 重設 --------------------------------------------------

  function renderData(host) {
    var wrap = el("div", "pa-progress__sec");
    var h = el("h2");
    h.textContent = "資料";
    wrap.appendChild(h);

    var p = el("p", "pa-subtle");
    p.textContent = "所有紀錄只存在這台瀏覽器的 localStorage。換機器或清資料前請先匯出。";
    wrap.appendChild(p);

    var row = el("div", "pa-ctrl__row");

    var exportBtn = el("button", "pa-btn", { type: "button" });
    exportBtn.textContent = "⬇ 匯出 JSON";
    exportBtn.addEventListener("click", function () {
      var blob = new Blob([PA.progress.exportJSON()], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = el("a", null, { href: url, download: "plasma-academy-progress.json" });
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
    row.appendChild(exportBtn);

    var importBtn = el("button", "pa-btn", { type: "button" });
    importBtn.textContent = "⬆ 匯入 JSON";
    var fileInput = el("input", null, { type: "file", accept: "application/json", hidden: "" });
    fileInput.addEventListener("change", function () {
      var file = fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          PA.progress.importJSON(String(reader.result));
          renderAll();
        } catch (e) {
          window.alert("匯入失敗:" + e.message);
        }
      };
      reader.readAsText(file);
    });
    importBtn.addEventListener("click", function () {
      fileInput.click();
    });
    row.appendChild(importBtn);
    row.appendChild(fileInput);

    var resetBtn = el("button", "pa-btn", { type: "button" });
    resetBtn.textContent = "↺ 清除全部紀錄";
    resetBtn.addEventListener("click", function () {
      if (!window.confirm("確定要清除所有學習紀錄?此動作無法復原(除非你先匯出過)。")) return;
      PA.progress.reset();
      renderAll();
    });
    row.appendChild(resetBtn);

    wrap.appendChild(row);
    host.appendChild(wrap);
  }

  var mountEl = null;

  function renderAll() {
    if (!mountEl) return;
    mountEl.textContent = "";
    renderOverview(mountEl);
    renderBadges(mountEl);
    renderCertificate(mountEl);
    renderData(mountEl);
  }

  function scan() {
    var host = document.querySelector("[data-progress]");
    if (!host || !PA.progress || !PA.curriculum) return;
    mountEl = host;
    renderAll();
    window.addEventListener("pa:progresschange", renderAll);
  }

  PA.progressUI = { scan: scan, badges: badges };
})((window.PA = window.PA || {}));
