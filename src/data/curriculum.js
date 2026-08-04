/* ==========================================================================
   curriculum.js — 課程結構(唯一來源)
   來源:docs/00-curriculum-map.md
   導覽、路徑圖、進度計算、麵包屑、章節間跳轉全部讀這裡
   ========================================================================== */

(function (PA) {
  "use strict";

  var LEVELS = [
    {
      no: 1,
      key: "level-1",
      name: "初階",
      subtitle: "電漿是什麼",
      hours: 8,
      color: "var(--pa-level-1)",
      question: "電漿由什麼組成?為什麼會發光?為什麼離子會往下打?",
      quizCount: 20,
      quizPass: 0.75,
    },
    {
      no: 2,
      key: "level-2",
      name: "中階",
      subtitle: "氣體、定律與電漿源",
      hours: 16,
      color: "var(--pa-level-2)",
      question: "為什麼這道製程選這支氣體?五個旋鈕各自在動什麼?",
      quizCount: 30,
      quizPass: 0.75,
    },
    {
      no: 3,
      key: "level-3",
      name: "進階",
      subtitle: "製程應用與整合",
      hours: 22.5,
      color: "var(--pa-level-3)",
      question: "蝕刻/沉積怎麼做出來的?profile 歪掉是誰的錯?封裝端的電漿在做什麼?",
      quizCount: 35,
      quizPass: 0.75,
    },
    {
      no: 4,
      key: "level-4",
      name: "專家",
      subtitle: "診斷、控制與前瞻",
      hours: 16,
      color: "var(--pa-level-4)",
      question: "怎麼看穿腔體裡發生什麼事?怎麼把機台調成一模一樣?",
      quizCount: 30,
      quizPass: 0.8,
    },
  ];

  // id / level / slug / 標題 / 時數 / 互動元件 / 先修 / 是否旗艦
  var MODULES = [
    ["1.1", 1, "fourth-state", "物質第四態", 1.0, ["A01"], [], false],
    ["1.2", 1, "parameters", "電漿基本參數", 1.5, ["A02"], ["1.1"], false],
    ["1.3", 1, "collisions", "碰撞與平均自由徑", 1.5, ["A03"], ["1.2"], false],
    ["1.4", 1, "glow-discharge", "輝光放電與點火", 1.5, ["A04", "A05"], ["1.3"], false],
    ["1.5", 1, "sheath-intro", "鞘層入門", 1.5, ["A06"], ["1.2", "1.4"], false],
    ["1.6", 1, "process-map", "製程電漿地圖", 1.0, ["A07"], ["1.5"], false],

    ["2.1", 2, "vacuum", "氣體動力學與真空", 2.0, ["A08"], ["1.3"], false],
    ["2.2", 2, "gas-selection", "製程氣體選用學", 4.0, ["A09", "A10", "A11"], ["1.6", "2.1"], true],
    ["2.3", 2, "plasma-chemistry", "電漿化學基礎", 2.5, ["A12"], ["1.3", "2.2"], false],
    ["2.4", 2, "sheath-physics", "鞘層物理進階", 2.5, ["A13"], ["1.5", "2.3"], false],
    ["2.5", 2, "plasma-sources", "電漿源與功率耦合", 3.0, ["A14", "A15"], ["2.4"], false],
    ["2.6", 2, "causal-chain", "參數因果鏈", 2.0, ["A16"], ["2.1", "2.2", "2.3", "2.4", "2.5"], true],

    ["3.1", 3, "etch-mechanisms", "蝕刻機制", 3.0, ["A17", "A18"], ["2.6"], false],
    ["3.2", 3, "etch-applications", "主要蝕刻應用", 4.0, ["A19"], ["3.1"], false],
    ["3.3", 3, "defect-atlas", "缺陷圖鑑", 4.0, ["A20", "A21"], ["3.2"], true],
    ["3.4", 3, "deposition", "電漿沉積", 4.0, ["A22", "A23"], ["2.3", "2.5"], false],
    ["3.5", 3, "pvd", "濺鍍 PVD 與其他", 2.5, ["A24"], ["3.1"], false],
    ["3.6", 3, "uniformity", "均勻度與腔體工程", 2.5, ["A25"], ["3.2", "3.4"], false],
    ["3.7", 3, "package-clean", "封裝電漿清潔與表面處理", 2.5, ["A33"], ["1.6", "2.2"], false],

    ["4.1", 4, "diagnostics", "電漿診斷", 3.5, ["A26", "A27"], ["2.4", "2.5"], true],
    ["4.2", 4, "endpoint-apc", "終點偵測與 APC", 2.5, ["A28"], ["4.1"], false],
    ["4.3", 4, "plasma-damage", "電漿誘發損傷", 2.5, ["A29"], ["2.4", "3.3"], false],
    // labs 依**章節裡出現的順序**列(4.4 先講脈衝 A31、再講 ALE A30,
    // 與 docs/04 的小節編號一致);煙霧測試會比對這個順序
    ["4.4", 4, "advanced-tech", "先進技術", 3.5, ["A31", "A30"], ["3.1", "4.1"], true],
    ["4.5", 4, "simulation", "電漿模擬與資料", 2.0, ["A32"], ["2.3", "4.1"], false],
    ["4.6", 4, "production", "量產、良率與安全", 2.0, [], [], false],
  ];

  var modules = MODULES.map(function (m) {
    return {
      id: m[0],
      level: m[1],
      slug: m[0].replace(".", "-") + "-" + m[2],
      title: m[3],
      hours: m[4],
      labs: m[5],
      prereqs: m[6],
      flagship: m[7],
      // 學習目標數由章節頁自行註冊(內容尚未撰寫時為 0)
      objectiveCount: 0,
      url: "level/" + m[1] + "/" + m[0].replace(".", "-") + "-" + m[2] + "/",
    };
  });

  var byId = {};
  modules.forEach(function (m) {
    byId[m.id] = m;
  });

  function modulesOfLevel(no) {
    return modules.filter(function (m) {
      return m.level === no;
    });
  }

  function level(no) {
    return LEVELS.filter(function (l) {
      return l.no === no;
    })[0];
  }

  function prev(id) {
    var i = modules.findIndex(function (m) {
      return m.id === id;
    });
    return i > 0 ? modules[i - 1] : null;
  }

  function next(id) {
    var i = modules.findIndex(function (m) {
      return m.id === id;
    });
    return i !== -1 && i < modules.length - 1 ? modules[i + 1] : null;
  }

  var totalHours = modules.reduce(function (s, m) {
    return s + m.hours;
  }, 0);

  var totalLabs = modules.reduce(function (s, m) {
    return s + m.labs.length;
  }, 0);

  PA.curriculum = {
    levels: LEVELS,
    modules: modules,
    byId: byId,
    level: level,
    modulesOfLevel: modulesOfLevel,
    prev: prev,
    next: next,
    totalHours: totalHours,
    totalLabs: totalLabs,
  };
})((window.PA = window.PA || {}));
