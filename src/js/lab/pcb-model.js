/* ==========================================================================
   pcb-model.js — PCB 除膠渣(desmear)與回蝕(etchback)

   3.8 的物理。原本寄居在 package-model.js 裡(當時 PCB 只是 3.7 的一節),
   3.8 獨立成章之後跟著搬出來 —— 一章一個模型,與其餘章節一致。

   ── 這一章在解什麼問題 ────────────────────────────────────────────
   FR-4 = 環氧樹脂 + 玻璃纖維布。多層板鑽通孔時摩擦生熱把樹脂熔開、
   抹在孔壁上(smear),擋住內層銅與後續化學銅的接觸。

   O₂ 電漿灰化得掉樹脂,但**對玻纖(SiO₂)完全無效** ——
   樹脂被挖深、玻纖原地不動,結果是一根根「玻纖突出」戳在孔壁上,
   鍍銅照樣包不住。要讓玻纖一起退,必須有 F:SiO₂ + 4F → SiF₄↑(揮發)。

   **這正好把 3.7.2「封裝端幾乎不用氟系」的結論整個翻過來** ——
   不是那三個理由錯了,是面對的材料不同:封裝活化面對有機物與金屬 pad,
   那裡氟只留下腐蝕與疏水;PCB 的 desmear 面對玻纖,沒有氟根本做不動。

   ── 模型的核心:兩條互相競爭的移除速率 ──────────────────────────
       樹脂  ∝ O 的比例 ×(1 + a·CF₄ 比例)   ← 少量 F 反而加速有機物移除
       玻纖  ∝ CF₄ 比例                      ← 沒有 F 就完全不動

   樹脂那條的括號項是真實效應(F 先抽走 H、把高分子鏈打開,讓 O 更容易
   氧化),與 3.7 的 Ar+O₂ 協同是同一類的「自由基互相幫忙」。
   但 CF₄ 加太多會把 O 稀釋掉,所以樹脂速率**先升後降** ——
   又是一條先升後降的曲線,和 3.7 的 A33 接著力同一個形狀、同一個教訓。

   a = 5/3 讓樹脂速率的峰值落在 CF₄ = 20 %,與現場常用的 10–25 % 一致。

   ⚠️ 速率的絕對值是教學用的典型量級(µm/min),不是任何特定機台的實測值;
   模型要守住的是**定性結論**:純 O₂ 必然留下玻纖突出、加 CF₄ 有一個最佳點、
   加過頭兩件事同時變糟。這幾條由 tools/check-pcb.mjs 斷言。

   自由基通量沿用 package-model.js 的 radicalFlux() —— 那是「功率與壓力
   給多少自由基」的共用關係,不該有第二份。本檔因此依賴 package-model.js
   先載入(A34 的 deps 有排順序,check-pcb.mjs 也照同樣順序載)。
   ========================================================================== */

(function (PA) {
  "use strict";

  var RESIN_BASE = 0.30; // µm/min @ 參考通量
  var GLASS_BASE = 1.60; // µm/min @ CF₄ 100 %(線性正比於 F 的比例)
  var RESIN_SYNERGY = 5 / 3; // 讓樹脂速率在 CF₄ = 20 % 達到峰值

  /** 現場切片看得出來、鍍層可靠度開始掉的齊平度界線 [µm] */
  var FLUSH_TOL = 1.5;

  /** 目標樹脂移除量的窗 [µm] —— desmear 只要清掉抹層,etchback 要露出三面 */
  var WINDOWS = {
    desmear: [3, 8],
    etchback: [12, 25],
  };

  function flux(power_W, pressure_Torr) {
    // 單一來源:與 3.7 的封裝活化共用同一條「功率×壓力 → 自由基通量」關係
    return PA.packageModel.radicalFlux(power_W, pressure_Torr, "lp");
  }

  /** 樹脂移除速率 [µm/min] */
  function resinRate(cf4frac, f) {
    var x = Math.min(1, Math.max(0, cf4frac));
    return RESIN_BASE * (1 - x) * (1 + RESIN_SYNERGY * x) * f;
  }

  /** 玻纖移除速率 [µm/min] —— 沒有 F 就是 0,不是「慢」,是零 */
  function glassRate(cf4frac, f) {
    var x = Math.min(1, Math.max(0, cf4frac));
    return GLASS_BASE * x * f;
  }

  /**
   * 跑一次 desmear / etchback。
   * opts: { cf4: 0–1, power_W, pressure_Torr, time_min, target: "desmear"|"etchback" }
   *
   * protrusion > 0  玻纖突出(樹脂挖得比玻纖深)—— 鍍銅包不住
   * protrusion < 0  玻纖被過度咬蝕、樹脂反而凸出 —— 也不是好事
   */
  function desmear(opts) {
    var o = opts || {};
    var cf4 = Math.min(1, Math.max(0, o.cf4 == null ? 0.2 : o.cf4));
    var P = o.power_W == null ? 300 : o.power_W;
    var pr = o.pressure_Torr == null ? 0.4 : o.pressure_Torr;
    var t = Math.max(0, o.time_min == null ? 15 : o.time_min);
    var target = o.target === "etchback" ? "etchback" : "desmear";
    var f = flux(P, pr);

    var resin = resinRate(cf4, f) * t;
    var glass = glassRate(cf4, f) * t;
    var protrusion = resin - glass;

    var window = WINDOWS[target];
    var okDepth = resin >= window[0] && resin <= window[1];
    var okFlush = Math.abs(protrusion) <= FLUSH_TOL;

    var verdictText;
    if (cf4 === 0) verdictText = "玻纖完全沒退 —— 純 O₂ 去不掉 SiO₂,孔壁會留下玻纖突出";
    else if (protrusion > FLUSH_TOL) verdictText = "玻纖突出 —— CF₄ 比例不足,樹脂退得比玻纖快";
    else if (protrusion < -FLUSH_TOL) verdictText = "玻纖被過度咬蝕 —— CF₄ 過量,樹脂速率也被稀釋掉";
    else if (!okDepth && resin < window[0]) verdictText = "深度不足 —— 時間或功率要加";
    else if (!okDepth) verdictText = "過度處理 —— 深度超出目標窗";
    else verdictText = "✅ 深度與齊平度都在窗內";

    return {
      cf4: cf4,
      target: target,
      resin: resin,
      glass: glass,
      protrusion: protrusion,
      resinRate: resinRate(cf4, f),
      glassRate: glassRate(cf4, f),
      window: window,
      okDepth: okDepth,
      okFlush: okFlush,
      verdict: verdictText,
    };
  }

  /** 在給定條件下掃 CF₄ 比例,找齊平度最好的那一點 */
  function bestCF4(opts) {
    var best = null;
    for (var i = 0; i <= 100; i++) {
      var r = desmear(Object.assign({}, opts || {}, { cf4: i / 100 }));
      var score = -Math.abs(r.protrusion);
      if (!best || score > best.score) best = { score: score, cf4: i / 100, r: r };
    }
    return best;
  }

  PA.pcbModel = {
    RESIN_BASE: RESIN_BASE,
    GLASS_BASE: GLASS_BASE,
    RESIN_SYNERGY: RESIN_SYNERGY,
    FLUSH_TOL: FLUSH_TOL,
    WINDOWS: WINDOWS,
    resinRate: resinRate,
    glassRate: glassRate,
    desmear: desmear,
    bestCF4: bestCF4,
  };
})((window.PA = window.PA || {}));
