/* ==========================================================================
   plasma-model.js — 物理常數、氣體參數與公用計算
   被 A16(虛擬機台)、A18(輪廓模擬器)、A32(0-D 模型)等多數元件共用

   ⚠️ 教材用簡化模型。所有函式的數值必須與 docs/ 中的課文一致 ——
      這是驗收條件之一(見 docs/09-content-style-guide.md 技術審閱項)。
   ========================================================================== */

(function (PA) {
  "use strict";

  // ---- 常數(SI) --------------------------------------------------------

  var C = {
    e: 1.602176634e-19, // 基本電荷 [C]
    me: 9.1093837015e-31, // 電子質量 [kg]
    amu: 1.66053906660e-27, // 原子質量單位 [kg]
    kB: 1.380649e-23, // 波茲曼常數 [J/K]
    eps0: 8.8541878128e-12, // 真空介電常數 [F/m]
    TORR_PA: 133.322, // 1 Torr = 133.322 Pa
    EV_K: 11604.518, // 1 eV = 11604.5 K
  };

  // ---- 氣體資料 ---------------------------------------------------------
  // M     : 分子量 [amu]
  // Eiz   : 第一游離能 [eV]
  // d     : 氣體動力學分子直徑 [m](用於硬球平均自由徑)
  // Ec    : 每產生一個電子離子對的碰撞能量成本 [eV]
  //         ⚠️ 實際強烈依賴 T_e,此處取 T_e ≈ 3 eV 附近的代表值(教學近似)
  // kiz   : 游離速率係數擬合 k = A·Te^B·exp(−C/Te) [m³/s]
  //         Ar 取自 Lieberman & Lichtenberg;其餘為同型式的教學近似值
  // paschen: gamma(二次電子發射係數,依常見金屬電極)
  //          pdMin / vMin 為 docs/01 §1.4.2 的表列最小值
  //          ⚠️ 係數 A、B 由 (pdMin, vMin, gamma) 反推(見下),
  //             因此曲線最小值必然等於課文表格,兩者不可能漂移

  var GASES = {
    Ar: {
      name: "Ar", zh: "氬", M: 39.95, Eiz: 15.76, d: 0.37e-9, Ec: 55,
      kiz: { A: 2.34e-14, B: 0.59, C: 17.44 },
      paschen: { gamma: 0.08, pdMin: 0.9, vMin: 137 },
    },
    He: {
      name: "He", zh: "氦", M: 4.0, Eiz: 24.59, d: 0.22e-9, Ec: 45,
      kiz: { A: 2.5e-14, B: 0.68, C: 26.5 },
      paschen: { gamma: 0.14, pdMin: 4.0, vMin: 156 },
    },
    N2: {
      name: "N₂", zh: "氮", M: 28.01, Eiz: 15.58, d: 0.375e-9, Ec: 60,
      kiz: { A: 1.0e-14, B: 0.5, C: 19.5 },
      paschen: { gamma: 0.045, pdMin: 0.67, vMin: 251 },
    },
    O2: {
      name: "O₂", zh: "氧", M: 32.0, Eiz: 12.07, d: 0.36e-9, Ec: 60,
      kiz: { A: 9.0e-15, B: 0.5, C: 16.0 },
      paschen: { gamma: 0.021, pdMin: 0.7, vMin: 450 },
      electronegative: true,
    },
    Air: {
      name: "Air", zh: "空氣", M: 28.96, Eiz: 14.5, d: 0.372e-9, Ec: 60,
      kiz: { A: 1.0e-14, B: 0.5, C: 18.5 },
      paschen: { gamma: 0.023, pdMin: 0.57, vMin: 327 },
    },
    Xe: {
      name: "Xe", zh: "氙", M: 131.3, Eiz: 12.13, d: 0.49e-9, Ec: 40,
      kiz: { A: 3.0e-14, B: 0.6, C: 13.4 },
      paschen: { gamma: 0.08, pdMin: 1.1, vMin: 155 },
    },
    Cl2: {
      name: "Cl₂", zh: "氯", M: 70.9, Eiz: 11.48, d: 0.42e-9, Ec: 55,
      kiz: { A: 1.0e-14, B: 0.5, C: 13.0 },
      electronegative: true,
    },
    CF4: {
      name: "CF₄", zh: "四氟化碳", M: 88.0, Eiz: 16.0, d: 0.47e-9, Ec: 90,
      kiz: { A: 1.0e-14, B: 0.5, C: 18.0 },
      electronegative: true,
    },
  };

  // 派生量:硬球有效截面 σ = √2·π·d²,以及 Paschen 的 A、B
  //
  // Paschen 最小值的解析解:
  //   pd_min = (e/A)·ln(1+1/γ)      V_min = e·(B/A)·ln(1+1/γ)
  // 反解可得(e 為自然對數底):
  //   A = e·ln(1+1/γ) / pd_min      B = V_min / pd_min
  Object.keys(GASES).forEach(function (k) {
    var g = GASES[k];
    g.sigma = Math.SQRT2 * Math.PI * g.d * g.d;
    if (g.paschen) {
      var p = g.paschen;
      p.A = (Math.E * Math.log(1 + 1 / p.gamma)) / p.pdMin;
      p.B = p.vMin / p.pdMin;
    }
  });

  function gas(key) {
    return GASES[key] || GASES.Ar;
  }

  // ---- 單位換算 ---------------------------------------------------------

  var mTorrToPa = function (p) {
    return (p * C.TORR_PA) / 1000;
  };
  var torrToPa = function (p) {
    return p * C.TORR_PA;
  };
  var eVtoK = function (e) {
    return e * C.EV_K;
  };

  // ---- 基本電漿量 -------------------------------------------------------

  /**
   * 中性粒子密度 [cm⁻³]
   * 室溫速算(300 K):n ≈ 3.2e13 × P[mTorr] —— 與 docs 2.1.1 一致
   */
  function gasDensity(pressure_mTorr, T_K) {
    var T = T_K || 300;
    var P = mTorrToPa(pressure_mTorr); // Pa
    return (P / (C.kB * T)) * 1e-6; // m⁻³ → cm⁻³
  }

  /**
   * Debye 長度 [mm]
   * λ_D = √(ε₀ k T_e / (n_e e²))
   */
  function debyeLength(ne_cm3, Te_eV) {
    var ne = ne_cm3 * 1e6; // → m⁻³
    var lam = Math.sqrt((C.eps0 * Te_eV * C.e) / (ne * C.e * C.e)); // m
    return lam * 1000; // → mm
  }

  /**
   * 電子電漿頻率 [Hz]
   * f_pe ≈ 8980 × √(n_e[cm⁻³]) —— 與 docs 1.2.5 一致
   */
  function plasmaFrequency(ne_cm3) {
    return 8980 * Math.sqrt(ne_cm3);
  }

  /**
   * 平均自由徑 [cm]
   * λ = kT / (σP)。Ar 室溫速算應得 λ[cm] ≈ 5 / P[mTorr](docs 1.3.2)
   */
  function meanFreePath(pressure_mTorr, gasKey, T_K) {
    var g = gas(gasKey);
    var T = T_K || 300;
    var P = mTorrToPa(pressure_mTorr);
    var lam = (C.kB * T) / (g.sigma * P); // m
    return lam * 100; // → cm
  }

  /**
   * Bohm 速度 [m/s]:u_B = √(kT_e / M)
   */
  function bohmVelocity(Te_eV, M_amu) {
    return Math.sqrt((Te_eV * C.e) / (M_amu * C.amu));
  }

  /**
   * Bohm 離子通量 [cm⁻² s⁻¹]:Γ = 0.61 n_e u_B
   * n_e=1e10、Ar、Te=3 應得 ≈1.6e15(docs 2.4.1)
   */
  function bohmFlux(ne_cm3, Te_eV, M_amu) {
    var uB = bohmVelocity(Te_eV, M_amu) * 100; // → cm/s
    return 0.61 * ne_cm3 * uB;
  }

  /**
   * Child–Langmuir 鞘層厚度 [mm]
   * s = (√2/3) λ_D (2V₀/T_e)^(3/4)
   * ne=1e10, Te=3, V=500 應得 ≈4.8 mm(docs 2.4.2)
   */
  function sheathThickness(ne_cm3, Te_eV, V_volt) {
    var lamD = debyeLength(ne_cm3, Te_eV);
    return (Math.SQRT2 / 3) * lamD * Math.pow((2 * V_volt) / Te_eV, 0.75);
  }

  /**
   * 電漿電位與浮動電位之差 [V]
   * V_p − V_f = (T_e/2)·ln(M / 2π m_e)。Ar 應得 ≈4.7 × T_e(docs 1.5.2)
   */
  function floatingPotentialDrop(Te_eV, M_amu) {
    var ratio = (M_amu * C.amu) / (2 * Math.PI * C.me);
    return (Te_eV / 2) * Math.log(ratio);
  }

  /**
   * 滯留時間 [s]
   * τ = 79.0 × P[Torr] × V[L] / Q[sccm](docs 2.1.3)
   * 30 L、20 mTorr、200 sccm 應得 ≈0.24 s
   */
  function residenceTime(pressure_mTorr, volume_L, flow_sccm) {
    if (!flow_sccm) return Infinity;
    return (79.0 * (pressure_mTorr / 1000) * volume_L) / flow_sccm;
  }

  /**
   * 有效抽速 [L/s]:S = Q / P
   * 1 sccm = 760 Torr × 0.001 L / 60 s = 1/79.0 Torr·L/s —— 與 residenceTime
   * 用的是同一個常數,所以恆有 τ = V / S,兩式不可能互相矛盾。
   * 200 sccm、20 mTorr 應得 ≈127 L/s(docs 2.1.5)
   */
  function pumpingSpeed(pressure_mTorr, flow_sccm) {
    var throughput = flow_sccm / 79.0; // Torr·L/s
    return throughput / (pressure_mTorr / 1000);
  }

  /**
   * Knudsen 數
   */
  function knudsen(pressure_mTorr, dimension_cm, gasKey) {
    return meanFreePath(pressure_mTorr, gasKey) / dimension_cm;
  }

  /** Knudsen 數對應的流體區間(docs 2.1.4) */
  function flowRegime(Kn) {
    if (Kn < 0.01) return "黏滯流";
    if (Kn <= 1) return "過渡流";
    return "分子流";
  }

  // ---- Paschen ----------------------------------------------------------

  /**
   * 崩潰電壓 [V],pd 單位 Torr·cm
   * V_b = B·pd / (ln(A·pd) − ln(ln(1 + 1/γ)))
   * 分母 <= 0 表示該 pd 下無法崩潰,回傳 Infinity
   */
  function breakdownVoltage(pd_TorrCm, gasKey) {
    var g = gas(gasKey);
    if (!g.paschen) return Infinity;
    var p = g.paschen;
    var denom = Math.log(p.A * pd_TorrCm) - Math.log(Math.log(1 + 1 / p.gamma));
    if (!(denom > 0)) return Infinity;
    return (p.B * pd_TorrCm) / denom;
  }

  /** Paschen 曲線最小值 —— 用查表值(與 docs 1.4.2 表格一致) */
  function paschenMinimum(gasKey) {
    var g = gas(gasKey);
    if (!g.paschen) return null;
    return { pd: g.paschen.pdMin, V: g.paschen.vMin };
  }

  // ---- EEDF -------------------------------------------------------------

  /**
   * 正規化的 EEDF f(E)
   * kind: "maxwellian" | "druyvesteyn"
   * 回傳的是能量機率分佈(對 E 積分為 1)
   */
  function eedf(E_eV, Te_eV, kind) {
    if (kind === "druyvesteyn") {
      // f(E) ∝ √E · exp(−0.243 (E/Te)²) ,係數使平均能量仍為 1.5 Te
      var b = 0.243;
      return Math.sqrt(E_eV) * Math.exp(-b * Math.pow(E_eV / Te_eV, 2));
    }
    return Math.sqrt(E_eV) * Math.exp(-E_eV / Te_eV);
  }

  /**
   * 反應截面的簡化模型:閾值以上線性上升、達峰後緩降
   * 用於 A12 展示「截面 × EEDF 的重疊決定速率」
   */
  function crossSection(E_eV, threshold_eV, peak_eV, peakValue) {
    if (E_eV <= threshold_eV) return 0;
    var x = (E_eV - threshold_eV) / (peak_eV - threshold_eV);
    if (x <= 1) return peakValue * x;
    return (peakValue * Math.log(E_eV / threshold_eV)) / (x * Math.log(peak_eV / threshold_eV));
  }

  /**
   * 速率係數 k = ∫ σ(E) v(E) f(E) dE(數值積分,相對值)
   */
  function rateCoefficient(Te_eV, threshold_eV, kind) {
    var sum = 0,
      norm = 0;
    var dE = 0.25;
    for (var E = dE / 2; E < Te_eV * 25 + threshold_eV * 3; E += dE) {
      var f = eedf(E, Te_eV, kind);
      norm += f * dE;
      var sigma = crossSection(E, threshold_eV, threshold_eV * 4, 1);
      if (sigma > 0) {
        var v = Math.sqrt((2 * E * C.e) / C.me);
        sum += sigma * v * f * dE;
      }
    }
    return norm > 0 ? sum / norm : 0;
  }

  // ---- 0-D 全域模型 -----------------------------------------------------

  /**
   * 簡化 0-D 全域模型(docs 4.5.2)
   *
   * 兩個必須成立的教學結論:
   *   1. T_e 由粒子平衡決定 → 只依賴 n_g·L 與氣體種類,**與功率無關**
   *   2. n_e 由能量平衡決定 → **正比於吸收功率**
   *
   * 這兩點是 A16 與 A32 的驗收條件。
   */
  /** 游離速率係數 [m³/s],用 Arrhenius 型擬合(比通用截面積分可靠) */
  function ionizationRate(Te_eV, gasKey) {
    var f = gas(gasKey).kiz;
    return f.A * Math.pow(Te_eV, f.B) * Math.exp(-f.C / Te_eV);
  }

  function globalModel(opts) {
    var gasKey = opts.gas || "Ar";
    var g = gas(gasKey);
    var p = opts.pressure_mTorr;
    var R = (opts.radius_cm || 15) / 100; // → m
    var L = (opts.height_cm || 3) / 100; // → m
    var Pabs = opts.power_W;

    var ng_cm3 = gasDensity(p);
    var ng = ng_cm3 * 1e6; // → m⁻³

    // 幾何:體積、器壁損失面積(乘上 edge-to-center 比的經驗因子)
    var V = Math.PI * R * R * L;
    var A = 2 * Math.PI * R * R + 2 * Math.PI * R * L;
    var hFactor = 0.4; // n_edge / n_center 的典型值
    var Aeff = A * hFactor;
    var dEff = V / Aeff; // 特徵長度 [m]

    // --- 粒子平衡求 T_e ---
    //   k_iz(T_e) · n_g · V = 0.61 · u_B(T_e) · A_eff
    // ⇔ k_iz(T_e) · n_g · d_eff / (0.61 · u_B(T_e)) = 1
    // 左式對 T_e 單調遞增,故可二分求根。
    // 注意:此式中 **完全沒有功率** —— 這正是「T_e 與功率無關」的來源。
    function balance(Te) {
      return (ionizationRate(Te, gasKey) * ng * dEff) / (0.61 * bohmVelocity(Te, g.M));
    }

    var lo = 0.3,
      hi = 20,
      Te = 3;
    for (var i = 0; i < 80; i++) {
      Te = (lo + hi) / 2;
      if (balance(Te) > 1) hi = Te;
      else lo = Te;
    }

    // --- 能量平衡求 n_e ---
    //   P_abs = Γ_i · A_eff · (E_c + E_i + E_e) · e
    //   Γ_i = 0.61 · n_e · u_B
    // 此式中 n_e 正比於 P_abs —— 「n_e 正比功率」的來源。
    var uB = bohmVelocity(Te, g.M); // m/s
    var Ei = 0.5 * Te + floatingPotentialDrop(Te, g.M); // 離子帶走(預鞘層 + 鞘層)
    var Ee = 2 * Te; // 電子帶走
    var Etot = g.Ec + Ei + Ee; // [eV]
    var ne_m3 = Pabs / (0.61 * uB * Aeff * Etot * C.e);
    var ne = ne_m3 * 1e-6; // → cm⁻³

    return {
      Te: Te,
      ne: ne,
      ng: ng_cm3,
      mfp: meanFreePath(p, gasKey),
      debye: debyeLength(ne, Te),
      sheath: sheathThickness(ne, Te, opts.sheathVoltage || 100),
      ionFlux: bohmFlux(ne, Te, g.M),
      uB: uB,
      Ec: g.Ec,
      Etot: Etot,
      dEff: dEff * 100, // → cm
      // 自由基密度(相對值):解離速率係數 × n_g × n_e
      radicalRel: rateCoefficient(Te, 8, "maxwellian") * ng_cm3 * ne * 1e-24,
    };
  }

  // ---- 蝕刻速率(教學用經驗式)------------------------------------------

  /**
   * 蝕刻率相對值:化學項 + 離子輔助協同項
   * 協同項含 √E 的濺鍍閾值行為(docs 3.1.5)
   */
  function etchRate(opts) {
    var radical = opts.radicalFlux; // 相對
    var ionFlux = opts.ionFlux; // 相對
    var Eion = opts.ionEnergy; // eV
    var Eth = opts.threshold || 25; // eV
    var chem = opts.chemWeight != null ? opts.chemWeight : 0.15;
    var syn = opts.synWeight != null ? opts.synWeight : 1.0;

    var yieldTerm = Eion > Eth ? Math.sqrt(Eion) - Math.sqrt(Eth) : 0;
    return chem * radical + syn * ionFlux * yieldTerm * Math.min(1, radical);
  }

  /**
   * 濺鍍產額的角度依賴 —— 45–70° 最大(docs 3.1.5)
   * theta 以弧度表示,0 = 垂直入射
   */
  function angularYield(theta) {
    var t = Math.abs(theta);
    if (t >= Math.PI / 2) return 0;
    // 經驗式:1/cosθ 上升,大角度被反射抑制
    var v = (1 / Math.cos(Math.min(t, 1.4))) * Math.pow(Math.cos(Math.min(t, 1.4)), 0.35);
    var falloff = t > 1.05 ? Math.max(0, 1 - (t - 1.05) / 0.52) : 1;
    return v * falloff;
  }

  PA.model = {
    C: C,
    GASES: GASES,
    gas: gas,
    mTorrToPa: mTorrToPa,
    torrToPa: torrToPa,
    eVtoK: eVtoK,
    gasDensity: gasDensity,
    debyeLength: debyeLength,
    plasmaFrequency: plasmaFrequency,
    meanFreePath: meanFreePath,
    bohmVelocity: bohmVelocity,
    bohmFlux: bohmFlux,
    sheathThickness: sheathThickness,
    floatingPotentialDrop: floatingPotentialDrop,
    residenceTime: residenceTime,
    pumpingSpeed: pumpingSpeed,
    knudsen: knudsen,
    flowRegime: flowRegime,
    breakdownVoltage: breakdownVoltage,
    paschenMinimum: paschenMinimum,
    eedf: eedf,
    crossSection: crossSection,
    rateCoefficient: rateCoefficient,
    ionizationRate: ionizationRate,
    globalModel: globalModel,
    etchRate: etchRate,
    angularYield: angularYield,
  };
})((window.PA = window.PA || {}));
