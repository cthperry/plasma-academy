/* ==========================================================================
   oes-model.js — 光發射光譜與 actinometry(4.1 / A27)

   譜線強度不是查表查出來的,是算出來的:

     I_line = n_species × n_e × k_exc(T_e, E_th) × 視窗透光率

   k_exc 用 exp(−E_th/T_e):激發需要電子跨過閾值,而高能尾巴的數量
   對 T_e 是指數敏感的(2.3.2)。

   **這一條就是 actinometry 為什麼有效**:
     I_F / I_Ar = ([F]/[Ar]) × exp(−(E_F − E_Ar)/T_e)
   F(703.7 nm)與 Ar(750.4 nm)的激發閾值只差約 1 eV,
   所以指數項幾乎是 1 —— 比值把 n_e 與 T_e 的影響同時消掉,
   剩下的才是**真正的濃度比**。視窗汙染也一樣被消掉(它同乘在分子分母上)。

   ⚠️ 教材用的簡化模型。定性趨勢與量級為目標,不做定量預測。
   ========================================================================== */

(function (PA) {
  "use strict";

  /**
   * 關鍵譜線表 —— 對應 docs/03 §4.1.3。
   * eth 是激發閾值能量(eV);actino 標記可當 actinometry 內標的線。
   *
   * str 是**譜線本身的相對強度**(截面大小與躍遷機率)。
   * 少了它,強度只剩 exp(−E_th/T_e),低閾值的物種會壓倒一切 ——
   * 實測 SiO₂ 蝕刻最亮的變成 C₂(2.5 eV)與 Si,而課文說的主訊號是 CO 與 F。
   * 真實譜線的截面本來就差好幾個數量級,這一欄就是那件事。
   */
  var LINES = [
    { nm: 703.7, sp: "F", eth: 14.5, str: 12, use: "氟系蝕刻主監控" },
    { nm: 685.6, sp: "F", eth: 14.7, str: 6, use: "F 的第二條線" },
    { nm: 750.4, sp: "Ar", eth: 13.5, str: 15, use: "Actinometry 內標", actino: true },
    { nm: 811.5, sp: "Ar", eth: 13.1, str: 12, use: "Ar 的第二條線", actino: true },
    { nm: 777.4, sp: "O", eth: 10.7, str: 6, use: "氧自由基、灰化終點" },
    { nm: 844.6, sp: "O", eth: 10.9, str: 4, use: "O 的第二條線" },
    { nm: 483.5, sp: "CO", eth: 11.0, str: 8, use: "SiO₂ 蝕刻終點主訊號" },
    { nm: 519.0, sp: "CO", eth: 11.2, str: 5, use: "CO 的第二條線" },
    { nm: 251.6, sp: "Si", eth: 5.1, str: 3, use: "Si 蝕刻產物" },
    { nm: 288.2, sp: "Si", eth: 5.0, str: 2, use: "Si 的第二條線" },
    { nm: 387.1, sp: "CN", eth: 3.2, str: 0.6, use: "含氮有機物" },
    { nm: 388.3, sp: "CN", eth: 3.2, str: 0.5, use: "CN 的第二條線" },
    { nm: 516.5, sp: "C2", eth: 2.5, str: 0.5, use: "聚合物" },
    { nm: 656.3, sp: "H", eth: 12.1, str: 5, use: "含氫製程(Hα)" },
    { nm: 837.6, sp: "Cl", eth: 10.6, str: 4, use: "氯系蝕刻" },
    { nm: 725.7, sp: "Cl", eth: 10.8, str: 2, use: "Cl 的第二條線" },
    { nm: 470.0, sp: "Br", eth: 9.0, str: 2, use: "溴系蝕刻" },
    { nm: 478.0, sp: "Br", eth: 9.1, str: 1.5, use: "Br 的第二條線" },
    { nm: 336.0, sp: "N2", eth: 11.0, str: 1.5, use: "氮系" },
    { nm: 357.0, sp: "N2", eth: 11.1, str: 1.2, use: "N₂ 的第二條線" },
    { nm: 306.0, sp: "OH", eth: 9.0, str: 2, use: "水氣污染 ← 洩漏偵測" },
    { nm: 309.0, sp: "OH", eth: 9.1, str: 1.5, use: "OH 的第二條線" },
  ];

  /**
   * 各製程的物種相對濃度。Ar 由「內標比例」旋鈕另外加。
   * OH 只在洩漏狀態才顯著 —— 這正是它能當免費洩漏偵測器的原因。
   */
  var PROCESSES = {
    oxide: {
      key: "oxide", label: "SiO₂ 蝕刻",
      conc: { F: 1.0, CO: 0.8, Si: 0.15, C2: 0.35, O: 0.2, OH: 0.01, N2: 0.02, Cl: 0, Br: 0, H: 0.1, CN: 0.02 },
      why: "C₄F₈ 系。**CO(483.5 nm)是終點主訊號** —— 蝕穿之後不再有 SiO₂ 供氧,CO 掉下來。",
    },
    poly: {
      key: "poly", label: "Poly-Si 蝕刻",
      conc: { F: 0.1, CO: 0.03, Si: 0.9, C2: 0.05, O: 0.15, OH: 0.01, N2: 0.02, Cl: 1.0, Br: 0.7, H: 0.05, CN: 0.01 },
      why: "HBr / Cl₂ 系。看 Cl(837.6)與 Si(251.6);Si 線消失就是刻穿了。",
    },
    ash: {
      key: "ash", label: "光阻灰化",
      conc: { F: 0.02, CO: 0.9, Si: 0.01, C2: 0.1, O: 1.0, OH: 0.3, N2: 0.05, Cl: 0, Br: 0, H: 0.6, CN: 0.05 },
      why: "O₂ 電漿。CO 與 H 是光阻被氧化的產物,**兩者一起掉下來就是灰化終點**。",
    },
    clean: {
      key: "clean", label: "腔體清潔(NF₃)",
      conc: { F: 1.0, CO: 0.05, Si: 0.5, C2: 0.02, O: 0.1, OH: 0.02, N2: 0.6, Cl: 0, Br: 0, H: 0.02, CN: 0.02 },
      why: "遠端 NF₃。**Si(251.6)是清潔進度的指標** —— 腔壁的沉積物被清完,Si 訊號就掉回底線。",
    },
    leak: {
      key: "leak", label: "⚠ 洩漏狀態",
      conc: { F: 0.8, CO: 0.6, Si: 0.12, C2: 0.3, O: 0.5, OH: 0.9, N2: 0.8, Cl: 0, Br: 0, H: 0.3, CN: 0.05 },
      why: "同一支 SiO₂ 配方,但腔體有微漏。**OH(306 nm)與 N₂(336 nm)同時冒出來** —— 這兩條是免費的洩漏偵測器。",
    },
  };

  /**
   * 功率 → 電漿條件。功率主要拉高 n_e,對 T_e 的影響小得多(見 2.6)。
   * **這正是問題所在**:絕對強度 ∝ n_e,所以功率一動強度就動,
   * 但那不代表濃度變了。
   */
  function plasmaOf(powerW, pressureMTorr) {
    var p = pressureMTorr == null ? 20 : pressureMTorr;
    var ne = 1e16 * Math.pow(powerW / 500, 0.9);
    // 壓力高 → 碰撞多 → T_e 略降;功率高 → T_e 略升
    var te = 3.0 * Math.pow(500 / powerW, 0.08) * Math.pow(20 / p, 0.12);
    return { ne: ne, te: te };
  }

  /** 激發速率係數 —— 高能尾巴跨過閾值的比例 */
  function kExc(te, eth) {
    return Math.exp(-eth / te);
  }

  /**
   * 算一條譜線的強度。
   * transmission 是觀測窗透光率 —— 它同乘在每一條線上,
   * 所以會被 actinometry 的比值消掉(A27 的第 4 個互動任務)。
   */
  function intensityOf(line, state) {
    var s = state;
    var conc = s.conc[line.sp];
    if (conc == null) conc = 0;
    if (line.sp === "Ar") conc = s.arFrac;
    var pl = s.plasma;
    return conc * (line.str == null ? 1 : line.str) * pl.ne * kExc(pl.te, line.eth) * s.transmission * 1e-14;
  }

  /** 建立一個觀測狀態 */
  function create(opts) {
    var o = opts || {};
    var proc = PROCESSES[o.process || "oxide"] || PROCESSES.oxide;
    var power = o.power == null ? 500 : o.power;
    var pressure = o.pressure == null ? 20 : o.pressure;
    return {
      proc: proc,
      conc: proc.conc,
      arFrac: o.arFrac == null ? 0.03 : o.arFrac,
      transmission: o.transmission == null ? 1 : o.transmission,
      power: power,
      pressure: pressure,
      plasma: plasmaOf(power, pressure),
    };
  }

  /** 整張光譜 */
  function spectrum(state) {
    return LINES.map(function (l) {
      return { nm: l.nm, sp: l.sp, eth: l.eth, use: l.use, actino: !!l.actino, I: intensityOf(l, state) };
    });
  }

  function lineAt(nm) {
    for (var i = 0; i < LINES.length; i++) if (Math.abs(LINES[i].nm - nm) < 0.05) return LINES[i];
    return null;
  }

  /** 某條線的絕對強度 */
  function intensity(state, nm) {
    var l = lineAt(nm);
    return l ? intensityOf(l, state) : 0;
  }

  /**
   * Actinometry 比值:I_species / I_Ar。
   * 預設用 F(703.7)/ Ar(750.4)—— 兩者閾值只差 1 eV。
   */
  function actinometry(state, nm, refNm) {
    var a = intensity(state, nm == null ? 703.7 : nm);
    var b = intensity(state, refNm == null ? 750.4 : refNm);
    return b > 0 ? a / b : 0;
  }

  /**
   * 敏感度:某個旋鈕從 lo 掃到 hi,量測值變化了幾 %。
   * A27 的驗收條件就是「比值對功率的敏感度顯著低於絕對強度」。
   */
  function sensitivity(baseOpts, key, lo, hi, metric) {
    var a = create(Object.assign({}, baseOpts, keyed(key, lo)));
    var b = create(Object.assign({}, baseOpts, keyed(key, hi)));
    var va = metric(a);
    var vb = metric(b);
    if (!(va > 0)) return 0;
    return Math.abs(vb - va) / va;
  }

  function keyed(k, v) {
    var o = {};
    o[k] = v;
    return o;
  }

  var RANGES = {
    power: { label: "Source 功率", min: 200, max: 1500, step: 25, unit: " W" },
    pressure: { label: "壓力", min: 5, max: 80, step: 1, unit: " mTorr" },
    arFrac: { label: "Ar 內標比例", min: 0, max: 0.05, step: 0.005, unit: "" },
    transmission: { label: "觀測窗透光率", min: 0.2, max: 1, step: 0.05, unit: "" },
  };

  PA.oes = {
    LINES: LINES,
    PROCESSES: PROCESSES,
    RANGES: RANGES,
    plasmaOf: plasmaOf,
    kExc: kExc,
    create: create,
    spectrum: spectrum,
    lineAt: lineAt,
    intensity: intensity,
    intensityOf: intensityOf,
    actinometry: actinometry,
    sensitivity: sensitivity,
  };
})((window.PA = window.PA || {}));
