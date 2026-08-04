/* ==========================================================================
   ale-model.js — 原子層蝕刻(4.4 / A30)

   ALE 的靈魂是**兩個自限制**,而它們必須是模型跑出來的,不是畫出來的:

     步驟 1(改質)吸附飽和  → 改質層厚度與時間無關(只要給夠時間)
     步驟 3(移除)能量窗    → 能量夠移除改質層、但不夠濺鍍原始材料

   兩者都讓製程「做完就停」,所以蝕刻量只由**循環數**決定。
   於是三種失效模式全部是同一組方程式的自然後果:

     · 能量 < 改質層閾值   → 移不掉,EPC ≈ 0
     · 能量 > 原始材料閾值 → 清完改質層之後繼續濺鍍 → **退化成慢速濺鍍**
     · 改質時間不足        → 吸附沒飽和,EPC 跟著時間跑

   產額用 Sigmund–Steinbrüchel 的閾值形式 Y(E) = A(√E − √E_th),
   與 3.5 的濺鍍章同一條式子 —— ALE 不是新物理,是**把兩個閾值分開用**。

   協同度 S = (EPC − α − β)/EPC 是 3.1.2 Coburn–Winters 協同效應的定量版:
     α = 只做步驟 1、2(純化學)、β = 只做步驟 3、4(純物理)。

   ⚠️ 教材用的簡化模型。定性趨勢與量級為目標,不做定量預測。
   ========================================================================== */

(function (PA) {
  "use strict";

  /** Si(100) 一個單原子層 */
  var ML_ATOMS = 6.8e14;    // atoms/cm²
  var ML_NM = 0.135;        // nm

  /**
   * 兩個閾值 —— ALE window 就是它們之間的那段。
   * 改質層(氯化 Si)鍵結弱,閾值低;原始 Si 閾值高。
   */
  var E_TH_MOD = 18;        // eV,移除改質層
  var E_TH_SUB = 55;        // eV,濺鍍原始材料
  var A_MOD = 0.29;         // 產額係數 atoms/ion/√eV
  var A_SUB = 0.0774;       // 校到 Ar⁺ 100 eV 打 Si 的產額 ≈ 0.2

  /** 移除步驟的離子通量(低功率步驟,刻意壓低) */
  var ION_FLUX = 3e15;      // ions/cm²/s

  /** 吸附飽和的時間常數 */
  var TAU_ADS = 0.5;        // s
  /** Purge 的時間常數 */
  var TAU_PURGE = 0.4;      // s
  /** 純化學(自發)蝕刻速率 —— 沒有離子時的背景,ALE 希望它趨近 0 */
  var K_SPONT = 0.002;      // ML/s

  /** Sigmund–Steinbrüchel 閾值產額 */
  function yieldOf(E, eTh, A) {
    if (!(E > eTh)) return 0;
    return A * (Math.sqrt(E) - Math.sqrt(eTh));
  }

  function yieldMod(E) { return yieldOf(E, E_TH_MOD, A_MOD); }
  function yieldSub(E) { return yieldOf(E, E_TH_SUB, A_SUB); }

  /** 吸附覆蓋率:自限制的第一個來源 */
  function coverage(tMod) {
    return 1 - Math.exp(-tMod / TAU_ADS);
  }

  /** Purge 效率 */
  function purgeEfficiency(tPurge) {
    return 1 - Math.exp(-tPurge / TAU_PURGE);
  }

  /**
   * 跑一個循環,回傳這一次移除多少(ML)。
   *
   * carry = 上一循環沒被 purge 掉的前驅物,會疊到這一循環的有效覆蓋率上 ——
   * 這就是「purge 不足 → EPC 要幾個循環才穩」的來源,
   * 也是 EPC-vs-循環數 那張圖之所以不是一條完美水平線的原因。
   */
  function cycle(s, carry) {
    var E = s.energy == null ? 40 : s.energy;
    var tMod = s.tMod == null ? 2 : s.tMod;
    var tRem = s.tRemove == null ? 1 : s.tRemove;
    var tPur = s.tPurge == null ? 1.5 : s.tPurge;
    var flux = s.flux == null ? ION_FLUX : s.flux;

    var p = purgeEfficiency(tPur);
    var theta = Math.min(1.6, coverage(tMod) + (carry || 0));

    /* --- 步驟 3:移除 --- */
    var yM = yieldMod(E);
    var yS = yieldSub(E);
    // 清掉改質層需要的時間
    var tClear = yM > 0 ? (theta * ML_ATOMS) / (flux * yM) : Infinity;
    var removedMod, overTime;
    if (tClear <= tRem) {
      removedMod = theta;                 // 改質層清完就停 —— 第二個自限制
      overTime = tRem - tClear;
    } else {
      removedMod = (flux * yM * tRem) / ML_ATOMS;
      overTime = 0;
    }
    // 清完之後剩下的時間打的是**原始材料**
    var sputtered = (flux * yS * overTime) / ML_ATOMS;

    /* --- 自發蝕刻:改質步 + 沒 purge 乾淨的殘留在移除步繼續作用 --- */
    var spont = K_SPONT * tMod + K_SPONT * (1 - p) * tRem;

    var newCarry = (1 - p) * theta;
    return {
      epc: removedMod + sputtered + spont,
      removedMod: removedMod,
      sputtered: sputtered,
      spont: spont,
      theta: theta,
      tClear: tClear,
      selfLimited: tClear <= tRem,
      carry: newCarry,
    };
  }

  /** 跑 n 個循環,回傳每循環的 EPC 與累積深度 */
  function run(s) {
    var n = s.cycles == null ? 20 : s.cycles;
    var carry = 0;
    var out = [];
    var total = 0;
    for (var i = 0; i < n; i++) {
      var c = cycle(s, carry);
      carry = c.carry;
      total += c.epc;
      out.push({
        cycle: i + 1,
        epc: c.epc,
        epcNm: c.epc * ML_NM,
        depth: total,
        depthNm: total * ML_NM,
        selfLimited: c.selfLimited,
        removedMod: c.removedMod,
        sputtered: c.sputtered,
        spont: c.spont,
      });
    }
    return out;
  }

  /** 穩態 EPC —— 取最後幾個循環的平均,避開 purge 造成的起始暫態 */
  function epcSteady(s) {
    var r = run(Object.assign({}, s, { cycles: Math.max(8, s.cycles || 20) }));
    var tail = r.slice(Math.max(0, r.length - 5));
    var sum = 0;
    for (var i = 0; i < tail.length; i++) sum += tail[i].epc;
    return sum / tail.length;
  }

  /**
   * 協同度 S = (EPC − α − β) / EPC。
   *
   * α = 只做步驟 1、2(通氣 + purge,不轟擊)→ 純化學貢獻
   * β = 只做步驟 3、4(只轟擊,不通反應氣)→ 純物理貢獻
   *
   * 理想 ALE 的 S 接近 100 %:蝕刻幾乎完全來自兩步的**協同**,
   * 沒有任何一步自己就能刻。這是 3.1.2 Coburn–Winters 實驗的定量化。
   */
  function synergy(s) {
    var epc = epcSteady(s);
    var tMod = s.tMod == null ? 2 : s.tMod;
    var tRem = s.tRemove == null ? 1 : s.tRemove;
    var flux = s.flux == null ? ION_FLUX : s.flux;
    var E = s.energy == null ? 40 : s.energy;
    // α:沒有離子,只有自發蝕刻
    var alpha = K_SPONT * tMod;
    // β:沒有改質層,離子直接打原始材料
    var beta = (flux * yieldSub(E) * tRem) / ML_ATOMS;
    var S = epc > 0 ? (epc - alpha - beta) / epc : 0;
    return { epc: epc, alpha: alpha, beta: beta, S: S };
  }

  /** 兩個閾值之間 —— 教科書畫的那個窗 */
  function window_() {
    return { lo: E_TH_MOD, hi: E_TH_SUB, width: E_TH_SUB - E_TH_MOD };
  }

  /**
   * **實際可用的窗**,而它比教科書的窄。
   *
   * 這一條是實測逼出來的:照兩個閾值取窗(18–55 eV)去掃 EPC,
   * 變異高達 239 %,完全不像自限制。原因不是模型壞掉 ——
   * 是**閾值只告訴你移除「開始」,沒告訴你移除「來得及完成」**。
   * 剛過閾值時產額極小(20 eV 時 Y_mod 只有 0.067),
   * 移除步的離子劑量根本清不完改質層,EPC 就變回由劑量決定。
   *
   * 所以可用窗的下緣不是 E_th,而是「t_clear ≤ 移除步時間」的那一點 ——
   * **它會隨移除步時間移動**。這在現場的意思是:
   * 窗的寬度不是材料常數,是你自己的配方決定的。
   */
  function effectiveWindow(s) {
    var lo = null, hi = null;
    for (var E = E_TH_MOD; E <= E_TH_SUB; E += 0.5) {
      var c = cycle(Object.assign({}, s, { energy: E }), 0);
      var okDose = c.selfLimited;
      var okSub = yieldSub(E) <= 0;
      if (okDose && okSub) {
        if (lo === null) lo = E;
        hi = E;
      }
    }
    if (lo === null) return { lo: NaN, hi: NaN, width: 0, usable: false };
    return { lo: lo, hi: hi, width: hi - lo, usable: true };
  }

  /** 判斷目前落在窗的哪裡 */
  function regime(s) {
    var E = s.energy == null ? 40 : s.energy;
    if (E <= E_TH_MOD) {
      return { key: "low", label: "能量過低", note: "離子打不動改質層,EPC 趨近 0 —— 只剩自發蝕刻的背景。" };
    }
    if (E >= E_TH_SUB) {
      return { key: "high", label: "能量過高", note: "清完改質層之後繼續濺鍍原始材料 —— **自限制消失,這已經不是 ALE,是慢速濺鍍**。" };
    }
    var c = cycle(s, 0);
    if (!c.selfLimited) {
      return { key: "dose", label: "移除步時間不足", note: "改質層沒清完就結束,EPC 由離子劑量決定而不是由改質層決定 —— 自限制沒發生。" };
    }
    if (coverage(s.tMod == null ? 2 : s.tMod) < 0.95) {
      return { key: "unsat", label: "改質未飽和", note: "吸附還沒到飽和,EPC 會跟著改質時間跑 —— 第一個自限制沒發生。" };
    }
    return { key: "ideal", label: "ALE 窗內", note: "兩個自限制都成立:EPC 只由循環數決定,與能量、與時間都無關。" };
  }

  var RANGES = {
    energy: { label: "離子能量", min: 0, max: 150, step: 1, unit: " eV" },
    tMod: { label: "改質步時間", min: 0.1, max: 5, step: 0.1, unit: " s" },
    tPurge: { label: "Purge 時間", min: 0.1, max: 4, step: 0.1, unit: " s" },
    tRemove: { label: "移除步時間", min: 0.1, max: 3, step: 0.1, unit: " s" },
    cycles: { label: "循環數", min: 5, max: 60, step: 1, unit: " 循環" },
  };

  var STEPS = [
    { key: "mod", label: "① 改質", note: "通入 Cl₂,自限制吸附形成一薄改質層" },
    { key: "purge1", label: "② Purge", note: "抽走多餘反應氣" },
    { key: "remove", label: "③ 移除", note: "低能量 Ar⁺ 轟擊,能量設在兩個閾值之間" },
    { key: "purge2", label: "④ Purge", note: "抽走產物" },
  ];

  PA.ale = {
    ML_ATOMS: ML_ATOMS,
    ML_NM: ML_NM,
    E_TH_MOD: E_TH_MOD,
    E_TH_SUB: E_TH_SUB,
    ION_FLUX: ION_FLUX,
    TAU_ADS: TAU_ADS,
    TAU_PURGE: TAU_PURGE,
    K_SPONT: K_SPONT,
    RANGES: RANGES,
    STEPS: STEPS,
    yieldMod: yieldMod,
    yieldSub: yieldSub,
    coverage: coverage,
    purgeEfficiency: purgeEfficiency,
    cycle: cycle,
    run: run,
    epcSteady: epcSteady,
    synergy: synergy,
    window: window_,
    effectiveWindow: effectiveWindow,
    regime: regime,
  };
})((window.PA = window.PA || {}));
