/* ==========================================================================
   global-model.js — 0-D 全域模型(4.5 / A32)

   整個 L2 有兩句反覆出現的話,它們的出處就是這兩條平衡方程:

     **粒子平衡** 產生 = 損失
         k_iz(T_e) · n_e · n_g · V = n_e · u_B(T_e) · A_eff
       兩邊的 n_e 直接消掉 → **T_e 只由 n_g · d_eff 決定,與功率完全無關**

     **能量平衡** 輸入 = 損失
         P_abs = e · n_e · u_B(T_e) · A_eff · (E_c + E_i + E_e)
       T_e 已經定了,所以 → **n_e 正比於吸收功率**

   「加功率主要加密度、不加溫度」(2.6.3)不是經驗法則,是上面第一行
   兩個 n_e 消掉的直接後果。這個模型的價值就在這裡:它簡單到可以手推,
   卻抓住了電漿最重要的行為。

   T_e **不是**查表或擬合來的 —— 是對粒子平衡做數值求根解出來的。

   ⚠️ 教材用的簡化模型:
   · E_c(T_e) 取自 Lieberman & Lichtenberg 的碰撞能量成本曲線,以對數內插;
     分子氣體按解離通道的多寡整體放大,不是逐條反應算的。
   · 預設**不含氣體加熱**。這正是理想 0-D 模型第一件會失準的事,
     所以做成可切換的選項,而不是偷偷放進去(見 gasHeating)。
   ========================================================================== */

(function (PA) {
  "use strict";

  var Q = 1.602176634e-19;
  var KB = 1.380649e-23;
  var AMU = 1.66053906660e-27;
  var M_E = 9.1093837015e-31;

  /**
   * 每產生一個電子-離子對的碰撞能量成本 E_c(eV)。
   *
   * 低 T_e 時 E_c 暴漲,因為激發、解離的速率相對游離高得多 ——
   * 電漿要花好幾百 eV 才換到一次游離。這是低壓電漿難維持的根本原因。
   * 表格取 Lieberman & Lichtenberg 的 Ar 曲線,分子氣體按解離通道整體放大。
   */
  var EC_AR = [
    [1.0, 10000], [1.5, 600], [2.0, 120], [2.5, 70],
    [3.0, 46], [4.0, 30], [5.0, 24], [7.0, 20], [10.0, 17],
  ];

  var GASES = {
    Ar: {
      key: "Ar", label: "Ar", mass: 40, eIz: 15.76,
      kA: 2.34e-14, kB: 0.59, kC: 17.44,     // k_iz = kA·T_e^kB·exp(−kC/T_e)
      ecScale: 1, sigmaI: 1e-18,
      diss: null,
      note: "惰性、單原子 —— 沒有解離通道,E_c 最低,最容易維持。",
    },
    O2: {
      key: "O2", label: "O₂", mass: 32, eIz: 12.06,
      kA: 9.0e-15, kB: 0.7, kC: 13.6,
      ecScale: 1.6, sigmaI: 1e-18,
      diss: { label: "O", kA: 6.0e-15, kC: 6.4, gamma: 0.02, mass: 16, per: 2 },
      note: "解離門檻低,大量能量花在解離 → E_c 比 Ar 高 60 %。",
    },
    Cl2: {
      key: "Cl2", label: "Cl₂", mass: 71, eIz: 11.48,
      kA: 1.0e-14, kB: 0.6, kC: 12.9,
      ecScale: 1.5, sigmaI: 1.2e-18,
      diss: { label: "Cl", kA: 8.0e-15, kC: 4.5, gamma: 0.05, mass: 35.5, per: 2 },
      note: "電負性、解離能低 —— Cl 自由基產率高,這是 poly 蝕刻的主力。",
    },
    CF4: {
      key: "CF4", label: "CF₄", mass: 88, eIz: 15.9,
      kA: 6.0e-15, kB: 0.7, kC: 17.0,
      ecScale: 2.6, sigmaI: 1.5e-18,
      diss: { label: "F", kA: 5.0e-15, kC: 9.0, gamma: 0.01, mass: 19, per: 1 },
      note: "多條解離通道 → E_c 是 Ar 的 2.6 倍,同樣功率下 n_e 低很多。",
    },
    SF6: {
      key: "SF6", label: "SF₆", mass: 146, eIz: 15.3,
      kA: 5.0e-15, kB: 0.7, kC: 16.5,
      ecScale: 2.6, sigmaI: 2e-18,
      diss: { label: "F", kA: 9.0e-15, kC: 8.0, gamma: 0.01, mass: 19, per: 1 },
      note: "強電負性、F 產率極高 —— 但 E_c 高,電漿不好維持。",
    },
  };

  /** 對數內插 E_c 表 */
  function ecOf(te, scale) {
    var t = Math.max(EC_AR[0][0], Math.min(EC_AR[EC_AR.length - 1][0], te));
    for (var i = 1; i < EC_AR.length; i++) {
      if (t <= EC_AR[i][0]) {
        var t0 = EC_AR[i - 1][0], t1 = EC_AR[i][0];
        var e0 = Math.log(EC_AR[i - 1][1]), e1 = Math.log(EC_AR[i][1]);
        var f = (t - t0) / (t1 - t0);
        return Math.exp(e0 + (e1 - e0) * f) * (scale || 1);
      }
    }
    return EC_AR[EC_AR.length - 1][1] * (scale || 1);
  }

  function uBohm(te, massAmu) {
    return Math.sqrt((te * Q) / (massAmu * AMU));
  }

  function vBarE(te) {
    return Math.sqrt((8 * te * Q) / (Math.PI * M_E));
  }

  function kIz(te, g) {
    return g.kA * Math.pow(te, g.kB) * Math.exp(-g.kC / te);
  }

  /**
   * 幾何:有效損失面積。
   *
   * h_R、h_L 是 Godyak 的邊緣對中心密度比 —— 低壓時電漿在腔體中心
   * 比在邊緣濃得多,直接拿幾何面積會高估損失好幾倍。
   */
  function geometry(s, nGas) {
    var R = s.radius == null ? 0.15 : s.radius;
    var L = s.height == null ? 0.10 : s.height;
    var g = GASES[s.gas] || GASES.Ar;
    var lambdaI = 1 / (nGas * g.sigmaI);
    var hR = 0.8 / Math.sqrt(4 + R / lambdaI);
    var hL = 0.86 / Math.sqrt(3 + L / (2 * lambdaI));
    var V = Math.PI * R * R * L;
    var aEff = 2 * Math.PI * R * R * hL + 2 * Math.PI * R * L * hR;
    return { R: R, L: L, V: V, aEff: aEff, hR: hR, hL: hL, lambdaI: lambdaI, dEff: V / aEff };
  }

  /** 氣體密度 —— 含(可選的)氣體加熱 */
  function gasState(s) {
    var p = s.pressure == null ? 20 : s.pressure;      // mTorr
    var pPa = p * 0.13332;
    var tg = 300;
    if (s.gasHeating) {
      var R = s.radius == null ? 0.15 : s.radius;
      var L = s.height == null ? 0.10 : s.height;
      var V = Math.PI * R * R * L;
      // 每單位體積功率造成的升溫(校到 500 W / 7 L → 約 500 K)
      tg = 300 + 2.8e-3 * ((s.power == null ? 500 : s.power) / V);
    }
    return { tg: tg, nGas: pPa / (KB * tg) };
  }

  /**
   * 粒子平衡求根:找出滿足 k_iz(T_e)/u_B(T_e) = 1/(n_g·d_eff) 的 T_e。
   *
   * **注意方程式裡沒有功率。** 這不是模型偷懶,是兩邊的 n_e 消掉的結果 ——
   * 也就是「加功率不加溫度」那句話的完整證明。
   * 用二分法解,所以 T_e 是**算出來的**,不是查表。
   */
  function solveTe(s) {
    var g = GASES[s.gas] || GASES.Ar;
    var gs = gasState(s);
    var geo = geometry(s, gs.nGas);
    var target = 1 / (gs.nGas * geo.dEff);
    var f = function (te) { return kIz(te, g) / uBohm(te, g.mass) - target; };
    var lo = 0.4, hi = 25;
    if (f(lo) > 0) return { te: lo, geo: geo, gas: gs, target: target, converged: false };
    if (f(hi) < 0) return { te: hi, geo: geo, gas: gs, target: target, converged: false };
    for (var i = 0; i < 200; i++) {
      var mid = (lo + hi) / 2;
      if (f(mid) > 0) hi = mid; else lo = mid;
    }
    return { te: (lo + hi) / 2, geo: geo, gas: gs, target: target, converged: true };
  }

  /**
   * 能量平衡:T_e 定了之後,n_e 只剩下與功率成正比這一條路。
   *
   * E_T = E_c(碰撞成本) + E_i(離子帶走的動能) + E_e(電子帶走的動能)
   */
  function solve(state) {
    var s = state || {};
    var g = GASES[s.gas] || GASES.Ar;
    var r = solveTe(s);
    var te = r.te;
    var uB = uBohm(te, g.mass);
    var ec = ecOf(te, g.ecScale);
    var eI = 5.2 * te + te / 2;      // 鞘層加速 + 進入鞘層時的動能
    var eE = 2 * te;
    var eTot = ec + eI + eE;
    var power = s.power == null ? 500 : s.power;
    var ne = power / (Q * uB * r.geo.aEff * eTot);
    var gammaI = ne * uB;             // 離子通量 m⁻²s⁻¹(以 A_eff 計)
    var gammaWafer = ne * uB;         // 晶圓面的通量同量級

    /**
     * 自由基:解離產生、黏著到壁上損失。
     *
     * ⚠️ **必須含母氣體的耗盡**,否則會算出自由基密度超過氣體密度
     * (第一版 SF₆ 跑出 2957 %)。正確的寫法是解耦合平衡:
     *     k_d·n_e·n_母 = n_自由基 · (γ·v̄·A_eff / 4V) / 每次解離的產量
     * 令解離分率 f = n_母耗掉的比例,整理得
     *     f = k_d·n_e / (L + k_d·n_e)      L = γ·v̄·A_eff/(4V)
     * 它自然被 f → 1 卡住,不會失控。
     *
     * 定壓下解離會改變總粒子數(Cl₂ → 2Cl),本模型不追這一層。
     */
    var radical = null;
    if (g.diss) {
      var kd = g.diss.kA * Math.exp(-g.diss.kC / te);
      var vBarR = Math.sqrt((8 * KB * r.gas.tg) / (Math.PI * g.diss.mass * AMU));
      var lossRate = (g.diss.gamma * vBarR * r.geo.aEff) / (4 * r.geo.V);
      var kdne = kd * ne;
      var f = kdne / (lossRate + kdne);
      var per = g.diss.per || 1;
      var nR = per * r.gas.nGas * f;
      radical = {
        label: g.diss.label, n: nR, dissFrac: f,
        frac: nR / r.gas.nGas, k: kd, per: per,
      };
    }

    return {
      te: te, ne: ne, uB: uB, ec: ec, eI: eI, eE: eE, eTot: eTot,
      gammaI: gammaI, gammaWafer: gammaWafer,
      geo: r.geo, gas: r.gas, gasDef: g, target: r.target,
      converged: r.converged, radical: radical,
      ionization: ne / r.gas.nGas,
    };
  }

  /** 粒子平衡的左式,供「兩條曲線的交點就是解」那張圖使用 */
  function balanceCurve(s, teMin, teMax, n) {
    var g = GASES[s.gas] || GASES.Ar;
    var out = [];
    var lo = teMin || 0.5, hi = teMax || 8;
    var N = n || 200;
    for (var i = 0; i < N; i++) {
      var te = lo + ((hi - lo) * i) / (N - 1);
      out.push({ te: te, v: kIz(te, g) / uBohm(te, g.mass) });
    }
    return out;
  }

  /** 掃描一個參數,回傳輸出隨它的變化 */
  function sweep(s, key, values) {
    return values.map(function (v) {
      var o = {};
      o[key] = v;
      var r = solve(Object.assign({}, s, o));
      return { x: v, te: r.te, ne: r.ne, gammaI: r.gammaI, ec: r.ec, radical: r.radical ? r.radical.n : 0, dissFrac: r.radical ? r.radical.dissFrac : 0 };
    });
  }

  /** 線性度:回傳與正比關係的最大相對偏差 */
  function linearity(points, key) {
    var k = points[0][key] / points[0].x;
    var worst = 0;
    for (var i = 0; i < points.length; i++) {
      var pred = k * points[i].x;
      var d = Math.abs(points[i][key] - pred) / pred;
      if (d > worst) worst = d;
    }
    return worst;
  }

  var RANGES = {
    pressure: { label: "壓力", min: 2, max: 200, step: 1, unit: " mTorr" },
    power: { label: "吸收功率", min: 50, max: 2000, step: 50, unit: " W" },
    radius: { label: "腔體半徑", min: 0.05, max: 0.3, step: 0.01, unit: " m" },
    height: { label: "腔體高度", min: 0.03, max: 0.3, step: 0.01, unit: " m" },
  };

  var SWEEPS = {
    power: { key: "power", label: "掃描功率", values: [100, 200, 400, 600, 800, 1000, 1400, 2000] },
    pressure: { key: "pressure", label: "掃描壓力", values: [2, 5, 10, 20, 40, 80, 120, 200] },
    radius: { key: "radius", label: "掃描腔體半徑", values: [0.05, 0.08, 0.1, 0.15, 0.2, 0.25, 0.3] },
  };

  PA.global = {
    GASES: GASES,
    RANGES: RANGES,
    SWEEPS: SWEEPS,
    ecOf: ecOf,
    kIz: kIz,
    uBohm: uBohm,
    vBarE: vBarE,
    geometry: geometry,
    gasState: gasState,
    solveTe: solveTe,
    solve: solve,
    balanceCurve: balanceCurve,
    sweep: sweep,
    linearity: linearity,
  };
})((window.PA = window.PA || {}));
