/* ==========================================================================
   magnetron-model.js — 磁控濺鍍與反應式濺鍍(3.5 / A24)

   兩件事,共用一組濺鍍產額:

     1. **磁控**:磁場把電子束縛在靶面附近 → 游離效率大增 → 低壓也點得起來。
        代價是束縛得最好的那一圈被轟得最兇 → racetrack 侵蝕 → 靶材利用率只有兩三成。
     2. **反應式濺鍍的遲滯**:靶面被氮化之後產額掉一個量級,
        而要恢復得把 N₂ 降到比原臨界點更低 —— 中間那一段是**雙值**的。

   核心只有一條物理:**Hall 參數 h = ω_c·τ**。
     ω_c = eB/m 是電子迴旋頻率,τ 是碰撞時間(∝ 1/壓力)。
     跨磁場的遷移率被壓成 μ/(1+h²),等效路徑長度就放大 (1+h²) 倍。
   磁控能在 1–5 mTorr 運作、二極濺鍍非得幾十 mTorr 不可,全部由這一條解釋:
   **低壓讓 τ 變長、h 變大**,磁場把低壓的劣勢反過來變成優勢。

   ⚠️ 教材用的簡化模型。定性趨勢與量級為目標,不做定量預測。
   ========================================================================== */

(function (PA) {
  "use strict";

  var E_CHARGE = 1.602e-19;
  var M_E = 9.109e-31;

  /**
   * 靶材資料。Y 是 Ar⁺ 500 eV 的濺鍍產額(原子/離子),
   * eth 是閾值能量(約昇華熱的 4 倍,典型 20–40 eV)。
   * 課文 3.5.1 的表格讀這裡,不另外寫一份。
   */
  var TARGETS = {
    al: { key: "al", label: "Al", y500: 1.0, eth: 25, note: "互連金屬的老本行,產額中等" },
    ti: { key: "ti", label: "Ti", y500: 0.6, eth: 30, note: "阻障層/黏著層;產額低,要靠功率補" },
    cu: { key: "cu", label: "Cu", y500: 2.3, eth: 20, note: "產額最高 —— 但 Cu 不能用電漿蝕刻,只能鍍(見 3.2)" },
    w: { key: "w", label: "W", y500: 0.6, eth: 35, note: "熔點高、鍵結強 → 閾值高、產額低" },
    ta: { key: "ta", label: "Ta", y500: 0.6, eth: 35, note: "Cu 製程的阻障層,與 TaN 搭配" },
  };

  /**
   * 濺鍍產額對能量的依賴 —— Sigmund 近似,與 3.1.5 / profile-engine 用的是同一條:
   *   Y(E) ∝ √E − √E_th,低於 E_th 完全不濺鍍。
   * 以 500 eV 的實測值標定,所以 y(500) 一定等於表上的數字。
   */
  function yieldAt(target, energy) {
    var t = typeof target === "string" ? TARGETS[target] : target;
    if (!t) return 0;
    if (energy <= t.eth) return 0;
    var norm = Math.sqrt(500) - Math.sqrt(t.eth);
    if (norm <= 0) return 0;
    return t.y500 * ((Math.sqrt(energy) - Math.sqrt(t.eth)) / norm);
  }

  /**
   * 碰撞時間 τ。壓力越高碰撞越頻繁 → τ 越短。
   * 以 10 mTorr 取 1 ns 為刻度(電子–中性粒子碰撞的典型量級)。
   */
  function collisionTime(pressureMTorr) {
    var p = Math.max(0.05, pressureMTorr);
    return 1e-9 * (10 / p);
  }

  /** 電子迴旋頻率 ω_c = eB/m。B 以 Gauss 給(1 G = 1e-4 T) */
  function cyclotronFreq(gauss) {
    return (E_CHARGE * (gauss * 1e-4)) / M_E;
  }

  /**
   * Hall 參數 h = ω_c·τ —— 整支模型的核心。
   * h ≫ 1 表示電子在兩次碰撞之間繞了很多圈,被磁場牢牢綁住。
   */
  function hallParameter(gauss, pressureMTorr) {
    return cyclotronFreq(gauss) * collisionTime(pressureMTorr);
  }

  /**
   * 等效路徑長度放大倍率 = 1 + h²。
   *
   * 來源是跨磁場遷移率 μ⊥ = μ/(1 + h²):電子要橫越磁力線到陽極,
   * 難度被放大 (1+h²) 倍,等於在靶面附近多繞了那麼多路。
   * 路徑越長,沿路游離的機會越多 —— 這就是磁控的全部好處。
   */
  function pathEnhancement(gauss, pressureMTorr) {
    var h = hallParameter(gauss, pressureMTorr);
    return 1 + h * h;
  }

  /**
   * 相對游離效率。正比於「等效路徑長度 × 沿路的中性粒子密度」。
   *
   * 路徑 ∝ (1+h²)·λ,而平均自由徑 λ ∝ 1/p,中性密度 ∝ p ——
   * 兩者相消,所以效率主要由 (1+h²) 決定。
   * **這正是磁控可以在 1–5 mTorr 工作的原因**:低壓讓 τ 長、h 大,
   * 而沒有磁場時 (1+h²) = 1,只能靠提高壓力增加碰撞次數 —— 二極濺鍍的困境。
   */
  function ionizationEfficiency(gauss, pressureMTorr) {
    return pathEnhancement(gauss, pressureMTorr);
  }

  /**
   * 靶面的平行磁場分布 B∥(x)。
   *
   * 磁控的磁鐵是「中心一極 + 外圈反極」,磁力線在靶面上拱成一道環。
   * 拱頂那一圈的磁力線與靶面**平行**,那裡的束縛最強 ——
   * racetrack 就長在那裡。用兩個高斯峰描述(左右對稱的環剖面)。
   * x 用 −1…1 的相對半徑。
   */
  var TRACK_R = 0.55; // racetrack 的相對半徑
  var TRACK_W = 0.18; // 磁場拱的寬度

  function bParallel(xRel, gauss) {
    var a = Math.exp(-Math.pow((xRel - TRACK_R) / TRACK_W, 2));
    var b = Math.exp(-Math.pow((xRel + TRACK_R) / TRACK_W, 2));
    return gauss * Math.max(a, b);
  }

  /**
   * 靶面各處的離子轟擊強度(未正規化)。
   * 電漿密度跟著局部游離效率走,所以直接用 (1 + h(x)²)。
   */
  function bombardment(xRel, gauss, pressureMTorr) {
    return ionizationEfficiency(bParallel(xRel, gauss), pressureMTorr);
  }

  var NX = 121;

  /** 侵蝕輪廓:回傳 −1…1 上 NX 點的相對侵蝕深度(峰值正規化為 1) */
  function erosionProfile(gauss, pressureMTorr) {
    var out = [];
    var peak = 0;
    for (var i = 0; i < NX; i++) {
      var x = -1 + (2 * i) / (NX - 1);
      var v = bombardment(x, gauss, pressureMTorr);
      out.push(v);
      if (v > peak) peak = v;
    }
    if (peak > 0) for (var k = 0; k < NX; k++) out[k] /= peak;
    return out;
  }

  /**
   * **靶材利用率** —— 3.5.2 說的 20–40 %。
   *
   * 靶材壽命終止於「最深的那一點蝕穿」。那一刻整片靶只被用掉
   *   平均侵蝕深度 ÷ 最深侵蝕深度
   * 這個比例。輪廓越尖(束縛越集中),利用率越差。
   *
   * 沒有磁場時輪廓是平的 → 利用率接近 100 %,但那時根本點不起低壓電漿 ——
   * **利用率與游離效率是同一個磁場拱的兩面**,這是本元件要讓人看見的取捨。
   */
  function targetUtilization(gauss, pressureMTorr) {
    var prof = erosionProfile(gauss, pressureMTorr);
    var sum = 0;
    var peak = 0;
    for (var i = 0; i < prof.length; i++) {
      sum += prof[i];
      if (prof[i] > peak) peak = prof[i];
    }
    if (peak <= 0) return 0;
    return sum / prof.length / peak;
  }

  /** 累積使用時數 → 最深處的侵蝕深度(相對靶厚);到 1 就該換靶 */
  function erosionDepth(gauss, pressureMTorr, hours, powerKW) {
    var rate = 0.0016 * (powerKW == null ? 5 : powerKW);
    return Math.min(1, rate * hours);
  }

  /* ---------------------------------------------------------------------
     反應式濺鍍的遲滯
     --------------------------------------------------------------------- */

  /**
   * 靶面覆蓋率 θ_t、基板/腔壁覆蓋率 θ_s、反應氣體分壓 P —— 三者耦合。
   *
   * **第一版只寫靶面的收支,結果完全沒有遲滯**(升流量與降流量走同一條線)。
   * 原因很實在:單看靶面,穩態解 Q(θ) 是單調的,不可能有折返。
   * 遲滯的正回饋不在靶面,在**氣體收支**:
   *
   *   1. 只有**裸金屬**會把反應氣體吃掉(gettering)。腔壁與基板的面積遠大於靶面,
   *      所以「基板上還有沒有裸金屬」才是分壓的主要決定者。
   *   2. 基板上的化合物是靠**新到的金屬原子**埋掉的,而金屬通量 ∝ 靶面的裸露比例。
   *      靶一中毒,金屬通量崩掉 → 基板也跟著中毒 → 沒人再吃氣體 →
   *      分壓暴漲 → 靶更中毒。**這才是那個正回饋。**
   *   3. 化合物的濺鍍產額只有金屬的 1/6,讓上面兩步都更難回頭。
   *
   * 把這三條寫進去,S 形與雙值區就自己出現了 —— 不是寫死的。
   * (as/at ≈ 15 是「腔壁+基板面積 ≫ 靶面積」的直接後果,不是湊出來的參數:
   *  實測 as 要到 20 以上雙值區才出現,而真實機台的面積比正是這個量級。)
   */
  var COMPOUND_YIELD_RATIO = 1 / 6;

  var RX = {
    S: 1,      // 抽速
    at: 2,     // 靶面的 gettering 份額(面積小)
    as: 30,    // 基板+腔壁的 gettering 份額(面積大得多)
    c1: 0.35,  // 反應氣體毒化靶面的速率係數
    ct: 1.0,   // 濺鍍把靶面化合物移除的速率係數
    c3: 0.5,   // 反應氣體毒化基板的速率係數
    c4: 2,     // 新到的金屬把基板化合物埋掉的速率係數
  };

  function reactiveDeriv(thT, thS, flow) {
    // 分壓:流量除以「抽走的 + 被裸金屬吃掉的」
    var P = flow / (RX.S + RX.at * (1 - thT) + RX.as * (1 - thS));
    // 靶送得出的金屬通量 —— 只有裸露的金屬區送得出來
    var metalFlux = 1 - thT;
    return {
      P: P,
      metalFlux: metalFlux,
      dT: RX.c1 * P * (1 - thT) - RX.ct * COMPOUND_YIELD_RATIO * thT,
      dS: RX.c3 * P * (1 - thS) - RX.c4 * metalFlux * thS,
    };
  }

  /** 從給定的初始狀態積到穩態 —— 落在哪一支由初始狀態決定,遲滯是積出來的 */
  function settle(flow, thT, thS) {
    var t = thT == null ? 0 : thT;
    var s2 = thS == null ? 0 : thS;
    for (var i = 0; i < 20000; i++) {
      var d = reactiveDeriv(t, s2, flow);
      t = Math.min(1, Math.max(0, t + d.dT * 0.01));
      s2 = Math.min(1, Math.max(0, s2 + d.dS * 0.01));
    }
    return { thT: t, thS: s2, rate: depRate(t) };
  }

  /** 沉積率(相對):金屬模式最高,中毒後掉下來 */
  function depRate(thT) {
    return 1 - (1 - COMPOUND_YIELD_RATIO) * thT;
  }

  /**
   * 掃一遍流量:先往上加、再往下減,回傳兩條分支。
   * 兩條不重合的那一段就是**雙值區**,製程設在那裡會來回跳。
   */
  function hysteresisSweep(flows) {
    var up = [];
    var down = [];
    var t = 0;
    var s2 = 0;
    var i;
    var r;
    for (i = 0; i < flows.length; i++) {
      r = settle(flows[i], t, s2);
      t = r.thT;
      s2 = r.thS;
      up.push({ flow: flows[i], theta: r.thT, thetaS: r.thS, rate: r.rate });
    }
    for (i = flows.length - 1; i >= 0; i--) {
      r = settle(flows[i], t, s2);
      t = r.thT;
      s2 = r.thS;
      down.push({ flow: flows[i], theta: r.thT, thetaS: r.thS, rate: r.rate });
    }
    down.reverse();
    return { up: up, down: down };
  }

  /** 預設的流量掃描格點 */
  function defaultFlows() {
    var f = [];
    for (var i = 0; i <= 80; i++) f.push(i * 0.25);
    return f;
  }

  /** 雙值區的範圍:兩條分支的覆蓋率差超過 0.15 的流量區間 */
  function bistableRange(flows) {
    var fl = flows || defaultFlows();
    var sw = hysteresisSweep(fl);
    var lo = null;
    var hi = null;
    var gap = 0;
    for (var i = 0; i < fl.length; i++) {
      var g = Math.abs(sw.up[i].theta - sw.down[i].theta);
      if (g > gap) gap = g;
      if (g > 0.15) {
        if (lo == null) lo = fl[i];
        hi = fl[i];
      }
    }
    return { lo: lo, hi: hi, gap: gap, sweep: sw, flows: fl };
  }

  var RANGES = {
    gauss: { label: "磁場強度", min: 0, max: 500, step: 10, unit: " G" },
    pressure: { label: "工作壓力", min: 1, max: 60, step: 1, unit: " mTorr" },
    energy: { label: "離子能量(靶電壓)", min: 0, max: 1000, step: 25, unit: " eV" },
    hours: { label: "靶材累積使用", min: 0, max: 700, step: 10, unit: " h" },
    flow: { label: "反應氣體流量(N₂)", min: 0, max: 20, step: 0.25, unit: " sccm" },
    power: { label: "功率", min: 1, max: 15, step: 0.5, unit: " kW" },
  };

  PA.magnetron = {
    TARGETS: TARGETS,
    RANGES: RANGES,
    TRACK_R: TRACK_R,
    yieldAt: yieldAt,
    collisionTime: collisionTime,
    cyclotronFreq: cyclotronFreq,
    hallParameter: hallParameter,
    pathEnhancement: pathEnhancement,
    ionizationEfficiency: ionizationEfficiency,
    bParallel: bParallel,
    bombardment: bombardment,
    erosionProfile: erosionProfile,
    targetUtilization: targetUtilization,
    erosionDepth: erosionDepth,
    COMPOUND_YIELD_RATIO: COMPOUND_YIELD_RATIO,
    RX: RX,
    settle: settle,
    depRate: depRate,
    hysteresisSweep: hysteresisSweep,
    bistableRange: bistableRange,
    defaultFlows: defaultFlows,
    NX: NX,
  };
})((window.PA = window.PA || {}));
