/* ==========================================================================
   probe-model.js — Langmuir 探針 I-V(4.1 / A26)

   曲線不是畫出來的,是**從三條物理式算出來的**:

     離子飽和   I_i,sat = 0.61 · n · e · u_B · A     (Bohm 判準,見 2.4)
     電子過渡   I_e(V)  = I_e,sat · exp((V − V_p)/T_e)   (V < V_p)
     電子飽和   I_e     = ¼ · n · e · v̄_e · A          (V ≥ V_p)

   而**四個參數的求法**(V_f、T_e、V_p、n_e)也真的照 4.1.2 的做法去算 ——
   不是把設定值抄回來顯示。所以「量錯」是可能的,這正是本元件的重點:
   關掉 RF 補償之後,學員用同一套正確方法會得到**高估數倍的 T_e**。

   ⚠️ 教材用的簡化模型。定性趨勢與量級為目標,不做定量預測。
   ========================================================================== */

(function (PA) {
  "use strict";

  var E_CHARGE = 1.602e-19;
  var M_E = 9.109e-31;
  var AMU = 1.661e-27;

  /** 常見工作氣體 —— 離子質量決定 Bohm 速度,進而決定離子飽和電流 */
  var GASES = {
    ar: { key: "ar", label: "Ar", amu: 39.9 },
    o2: { key: "o2", label: "O₂", amu: 32 },
    cf4: { key: "cf4", label: "CF₄", amu: 88 },
    cl2: { key: "cl2", label: "Cl₂", amu: 71 },
  };

  /** 探針面積(m²)—— 典型的圓柱探針:直徑 0.15 mm、長 10 mm */
  var PROBE_AREA = Math.PI * 0.15e-3 * 10e-3;

  /** Bohm 速度 u_B = √(kT_e/M) */
  function bohmSpeed(teEv, amu) {
    return Math.sqrt((teEv * E_CHARGE) / (amu * AMU));
  }

  /** 電子平均熱速度 v̄ = √(8kT_e/πm) */
  function eThermalSpeed(teEv) {
    return Math.sqrt((8 * teEv * E_CHARGE) / (Math.PI * M_E));
  }

  function ionSat(ne, teEv, amu, area) {
    return 0.61 * ne * E_CHARGE * bohmSpeed(teEv, amu) * area;
  }

  function elecSat(ne, teEv, area) {
    return 0.25 * ne * E_CHARGE * eThermalSpeed(teEv) * area;
  }

  /**
   * **瞬時**探針電流(電子流為正)。
   * V ≥ V_p 時電子電流飽和 —— 這個轉折就是 V_p 的來源。
   */
  function currentAt(V, s) {
    var ie = V >= s.vp
      ? s.iesat
      : s.iesat * Math.exp((V - s.vp) / s.te);
    return ie - s.isat;
  }

  /**
   * 量到的電流。RF 補償關掉時,電漿電位以 13.56 MHz 振盪,
   * 探針看到的是**整個 RF 週期的平均**:
   *
   *   I_meas(V) = ⟨ I(V − V_rf·sin ωt) ⟩_t
   *
   * 這一條就是「未補償會高估 T_e」的全部原因 —— 沒有另外寫任何修正項。
   * 指數區被抹平、轉折被拉開,用同一套正確的擬合方法就會算出偏大的 T_e。
   */
  var RF_PHASES = 48;

  function measuredAt(V, s) {
    if (!s.vrf) return currentAt(V, s);
    var sum = 0;
    for (var k = 0; k < RF_PHASES; k++) {
      var ph = (2 * Math.PI * k) / RF_PHASES;
      sum += currentAt(V - s.vrf * Math.sin(ph), s);
    }
    return sum / RF_PHASES;
  }

  /**
   * 探針鍍膜:表面被絕緣層蓋住,等於串一個電阻並縮小有效面積。
   * 4.1.2 的第二個實務陷阱 —— 在沉積或聚合性製程裡幾秒就會發生。
   */
  function applyCoating(I, V, s) {
    if (!s.coating) return I;
    var f = 1 - s.coating * 0.85;      // 有效面積被蓋掉
    var lag = 1 / (1 + s.coating * 6); // 絕緣層上的壓降讓曲線變鈍
    return I * f * lag;
  }

  /** 建立一組電漿條件與它的理論常數 */
  function create(opts) {
    var o = opts || {};
    var gas = GASES[o.gas || "ar"] || GASES.ar;
    var s = {
      ne: o.ne == null ? 1e16 : o.ne,        // m⁻³
      te: o.te == null ? 3 : o.te,           // eV
      vp: o.vp == null ? 20 : o.vp,          // V
      gas: gas,
      area: o.area || PROBE_AREA,
      vrf: o.vrf == null ? 0 : o.vrf,        // 0 = RF 補償正常
      noise: o.noise == null ? 0 : o.noise,
      coating: o.coating == null ? 0 : o.coating,
    };
    s.isat = ionSat(s.ne, s.te, gas.amu, s.area);
    s.iesat = elecSat(s.ne, s.te, s.area);
    return s;
  }

  /** 掃一條 I-V。雜訊用固定種子,重跑結果一致(不然擬合會抖) */
  function sweep(s, vMin, vMax, n) {
    var lo = vMin == null ? -60 : vMin;
    var hi = vMax == null ? 40 : vMax;
    var N = n || 240;
    var out = [];
    var seed = 12345;
    for (var i = 0; i < N; i++) {
      var V = lo + ((hi - lo) * i) / (N - 1);
      var I = applyCoating(measuredAt(V, s), V, s);
      if (s.noise) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        var r = (seed / 0x7fffffff - 0.5) * 2;
        I += r * s.noise * s.iesat * 0.02;
      }
      out.push({ v: V, i: I });
    }
    return out;
  }

  /* ---------------------------------------------------------------------
     四個參數的求法 —— 照 4.1.2 的表格做,不是把設定值抄回來
     --------------------------------------------------------------------- */

  /** V_f:I = 0 的電壓(線性內插) */
  function findVf(curve) {
    for (var i = 1; i < curve.length; i++) {
      if (curve[i - 1].i <= 0 && curve[i].i > 0) {
        var a = curve[i - 1];
        var b = curve[i];
        var t = -a.i / (b.i - a.i);
        return a.v + t * (b.v - a.v);
      }
    }
    return NaN;
  }

  /** 由離子飽和區求 I_i,sat —— 取最負那一段的平均 */
  function measureIsat(curve) {
    var n = Math.max(3, Math.round(curve.length * 0.12));
    var sum = 0;
    for (var i = 0; i < n; i++) sum += curve[i].i;
    return -(sum / n);
  }

  /**
   * T_e:過渡區取 ln(I_e) vs V,**斜率倒數即 T_e**。
   *
   * I_e = I + I_i,sat(把離子那一份加回來)。
   * 擬合窗取 V_f 到 V_f + span —— 這正是現場的做法,
   * 也是為什麼未補償的曲線會害人:窗內的形狀被 RF 抹平了。
   */
  function fitTe(curve, opts) {
    var o = opts || {};
    var isat = o.isat == null ? measureIsat(curve) : o.isat;
    var vf = o.vf == null ? findVf(curve) : o.vf;
    var lo = o.from == null ? vf + 1 : o.from;
    var hi = o.to == null ? vf + (o.span == null ? 10 : o.span) : o.to;
    var n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (var i = 0; i < curve.length; i++) {
      var p = curve[i];
      if (p.v < lo || p.v > hi) continue;
      var ie = p.i + isat;
      if (!(ie > 0)) continue;
      var y = Math.log(ie);
      n++; sx += p.v; sy += y; sxx += p.v * p.v; sxy += p.v * y;
    }
    if (n < 3) return NaN;
    var den = n * sxx - sx * sx;
    if (Math.abs(den) < 1e-12) return NaN;
    var slope = (n * sxy - sx * sy) / den;
    return slope > 0 ? 1 / slope : NaN;
  }

  /** V_p:dI/dV 的極大值處 */
  function findVp(curve) {
    var best = -Infinity;
    var bestV = NaN;
    for (var i = 1; i < curve.length - 1; i++) {
      var d = (curve[i + 1].i - curve[i - 1].i) / (curve[i + 1].v - curve[i - 1].v);
      if (d > best) { best = d; bestV = curve[i].v; }
    }
    return bestV;
  }

  /** n_e:由離子飽和電流反推 I_sat = 0.61·n·e·u_B·A */
  function neFromIsat(isat, teEv, amu, area) {
    var ub = bohmSpeed(teEv, amu);
    return isat / (0.61 * E_CHARGE * ub * (area || PROBE_AREA));
  }

  /**
   * EEDF —— Druyvesteyn 公式:f(E) ∝ d²I_e/dV²。
   * **它不假設 Maxwellian**,所以是唯一能實驗確認 2.3.2 那些分佈形狀的方法。
   */
  function eedf(curve, vp, isat) {
    var out = [];
    for (var i = 2; i < curve.length - 2; i++) {
      var h = curve[i + 1].v - curve[i].v;
      var y0 = curve[i - 1].i + isat;
      var y1 = curve[i].i + isat;
      var y2 = curve[i + 1].i + isat;
      var d2 = (y2 - 2 * y1 + y0) / (h * h);
      var E = vp - curve[i].v;
      if (E <= 0) continue;
      out.push({ E: E, f: Math.max(0, d2) * Math.sqrt(E) });
    }
    var peak = out.reduce(function (m, p) { return Math.max(m, p.f); }, 0);
    if (peak > 0) out.forEach(function (p) { p.f /= peak; });
    return out;
  }

  /** 一次做完四個參數的分析 —— 回傳量到的值與相對誤差 */
  function analyse(s, curve) {
    var c = curve || sweep(s);
    var isat = measureIsat(c);
    var vf = findVf(c);
    var te = fitTe(c, { isat: isat, vf: vf });
    var vp = findVp(c);
    var ne = neFromIsat(isat, te, s.gas.amu, s.area);
    return {
      isat: isat,
      vf: vf,
      te: te,
      vp: vp,
      ne: ne,
      teError: (te - s.te) / s.te,
      neError: (ne - s.ne) / s.ne,
      vpError: (vp - s.vp) / Math.abs(s.vp),
    };
  }

  var RANGES = {
    ne: { label: "電子密度 n_e", min: 1e15, max: 5e17, step: 1e15, unit: " m⁻³" },
    te: { label: "電子溫度 T_e", min: 1, max: 6, step: 0.1, unit: " eV" },
    vrf: { label: "RF 電位振幅(補償失效時)", min: 0, max: 60, step: 2, unit: " V" },
    noise: { label: "雜訊", min: 0, max: 3, step: 0.1, unit: "" },
    coating: { label: "探針鍍膜", min: 0, max: 1, step: 0.05, unit: "" },
  };

  PA.probe = {
    GASES: GASES,
    PROBE_AREA: PROBE_AREA,
    RANGES: RANGES,
    bohmSpeed: bohmSpeed,
    eThermalSpeed: eThermalSpeed,
    ionSat: ionSat,
    elecSat: elecSat,
    currentAt: currentAt,
    measuredAt: measuredAt,
    create: create,
    sweep: sweep,
    findVf: findVf,
    measureIsat: measureIsat,
    fitTe: fitTe,
    findVp: findVp,
    neFromIsat: neFromIsat,
    eedf: eedf,
    analyse: analyse,
  };
})((window.PA = window.PA || {}));
