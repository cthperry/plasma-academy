/* ==========================================================================
   progress.js — 學習進度追蹤(localStorage,無後端無帳號)
   資料格式見 docs/06-site-architecture.md
   ========================================================================== */

(function (PA) {
  "use strict";

  var KEY = "plasma-academy.progress";
  var SCHEMA_VERSION = 1;

  function blank() {
    return {
      version: SCHEMA_VERSION,
      role: null,
      chapters: {},
      quizzes: {},
      labUsage: {},
      bookmarks: [],
      settings: { showEnglishTerms: true },
    };
  }

  var cache = null;

  function load() {
    if (cache) return cache;
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) {
        cache = blank();
        return cache;
      }
      var data = JSON.parse(raw);
      if (!data || data.version !== SCHEMA_VERSION) {
        // 未來版本升級時在此做遷移;目前僅有 v1
        cache = blank();
        return cache;
      }
      // 補齊可能缺少的欄位
      var base = blank();
      for (var k in base) {
        if (!(k in data)) data[k] = base[k];
      }
      cache = data;
      return cache;
    } catch (e) {
      cache = blank();
      return cache;
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(load()));
    } catch (e) {
      /* 配額滿或隱私模式 —— 靜默失敗,不影響瀏覽 */
    }
    emit();
  }

  function emit() {
    try {
      window.dispatchEvent(new CustomEvent("pa:progresschange"));
    } catch (e) {}
  }

  // ---- 章節 -------------------------------------------------------------

  function chapter(id) {
    var d = load();
    if (!d.chapters[id]) {
      d.chapters[id] = {
        visited: false,
        objectives: [],
        quizScore: null,
        lastVisit: null,
      };
    }
    return d.chapters[id];
  }

  function visit(id) {
    var c = chapter(id);
    c.visited = true;
    c.lastVisit = Date.now();
    save();
  }

  function setObjective(id, index, done) {
    var c = chapter(id);
    while (c.objectives.length <= index) c.objectives.push(false);
    c.objectives[index] = !!done;
    save();
  }

  function setQuizScore(id, score) {
    chapter(id).quizScore = score;
    save();
  }

  /**
   * 章節完成 = 造訪 + 學習目標全勾 + 自我檢測 >= 60%
   * (目標數為 0 時視為不設限)
   */
  function isChapterDone(id, objectiveCount) {
    var c = load().chapters[id];
    if (!c || !c.visited) return false;
    var n = typeof objectiveCount === "number" ? objectiveCount : c.objectives.length;
    for (var i = 0; i < n; i++) {
      if (!c.objectives[i]) return false;
    }
    if (c.quizScore !== null && c.quizScore < 0.6) return false;
    return true;
  }

  // ---- 階段 -------------------------------------------------------------

  function levelStats(levelNo) {
    var cur = PA.curriculum;
    if (!cur) return { total: 0, done: 0, ratio: 0 };
    var mods = cur.modulesOfLevel(levelNo);
    var done = 0;
    for (var i = 0; i < mods.length; i++) {
      if (isChapterDone(mods[i].id, mods[i].objectiveCount)) done++;
    }
    return {
      total: mods.length,
      done: done,
      ratio: mods.length ? done / mods.length : 0,
    };
  }

  /**
   * 記錄一次結業測驗結果。levelKey 格式為 "level-1".."level-4"
   * (與 quiz/engine.js 交卷時呼叫的格式一致)。
   */
  function recordQuiz(levelKey, info) {
    var d = load();
    var prev = d.quizzes[levelKey] || { attempts: 0 };
    d.quizzes[levelKey] = {
      score: info.score,
      passed: !!info.passed,
      attempts: (prev.attempts || 0) + 1,
      date: Date.now(),
    };
    save();
  }

  // ---- 其他 -------------------------------------------------------------

  function setRole(role) {
    load().role = role;
    save();
  }

  function noteLabUse(labId) {
    var d = load();
    d.labUsage[labId] = (d.labUsage[labId] || 0) + 1;
    save();
  }

  function toggleBookmark(id) {
    var d = load();
    var i = d.bookmarks.indexOf(id);
    if (i === -1) d.bookmarks.push(id);
    else d.bookmarks.splice(i, 1);
    save();
    return i === -1;
  }

  // ---- 匯出 / 匯入 -------------------------------------------------------

  function exportJSON() {
    return JSON.stringify(load(), null, 2);
  }

  function importJSON(text) {
    var data = JSON.parse(text);
    if (!data || data.version !== SCHEMA_VERSION) {
      throw new Error("進度檔版本不符(需要 v" + SCHEMA_VERSION + ")");
    }
    cache = data;
    save();
  }

  function reset() {
    cache = blank();
    save();
  }

  PA.progress = {
    load: load,
    visit: visit,
    chapter: chapter,
    setObjective: setObjective,
    setQuizScore: setQuizScore,
    isChapterDone: isChapterDone,
    levelStats: levelStats,
    recordQuiz: recordQuiz,
    setRole: setRole,
    noteLabUse: noteLabUse,
    toggleBookmark: toggleBookmark,
    exportJSON: exportJSON,
    importJSON: importJSON,
    reset: reset,
    KEY: KEY,
  };
})((window.PA = window.PA || {}));
