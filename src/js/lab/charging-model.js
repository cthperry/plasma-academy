/* ==========================================================================
   charging-model.js — 電漿誘發充電損傷(4.3 / A29)

   整章的因果鏈只有一條,而它是**算出來的**,不是畫出來的:

     電子有熱速度分佈(近乎等向),離子被鞘層加速(近乎垂直)
         ↓
     高深寬比結構的**底部收不到電子**(electron shading)
         ↓  幾何穿透率 T = 1/(1 + AR²)
     該處表面必須浮到更正的電位,才能把電子拉夠
         ↓  V_ceiling = −T_e · ln(有效電子收集係數)
     這個電位透過導線灌進閘極氧化層
         ↓  電流密度 = J_plasma × **天線比**
     氧化層被迫導通(FN 穿隧)→ 累積注入電荷 → 到 Q_bd 就崩潰

   兩個關鍵量分屬不同的旋鈕,這是本章最重要的一件事:
     · **電位上限**由 T_e 與結構深寬比決定 —— 與天線比**無關**
     · **注入電荷**正比於天線比 —— 所以壽命 ∝ 1/天線比

   參考電位:全部相對於**晶圓/基板**。未被遮蔽的浮動面定義為 0 V,
   因此電漿電位 V_p = 4.68·T_e(Ar 的 J_e,sat/J_i = 108)。

   ⚠️ 教材用的簡化模型:
   · 高場區用經典 FN 式;直接穿隧區用**擬合公開閘極漏電標度**的經驗式
     (見 dtCurrent 的註解 —— 這一項不是細節,是天線比得以生效的機制本身)。
   · 一維單節點,不解結構內部的電位分佈(那要 3.3 的 notching 才需要)。
   ========================================================================== */

(function (PA) {
  "use strict";

  var Q = 1.602176634e-19;
  var EPS0 = 8.8541878128e-12;
  var K_OX = 3.9;
  var M_E = 9.1093837015e-31;
  var AMU = 1.66053906660e-27;

  /** SiO₂ 的 FN 參數(cgs:E 用 V/cm、J 用 A/cm²) */
  var PHI_B = 3.1;                            // Si→SiO₂ 位障 (eV)
  var FN_A = 1.54e-6 / PHI_B;                 // A/V²
  var FN_B = 6.83e7 * Math.pow(PHI_B, 1.5);   // V/cm

  /**
   * 崩潰判準。
   *
   * Q_bd **不是常數** —— 氧化層越薄,能撐的注入電荷越多(每薄 0.5 nm 約一個數量級)。
   * 這件事不能省略:省掉它會得到「1.5 nm 的核心元件比 10 nm 的 I/O 元件更容易
   * 被天線效應打死」這個與現場完全相反的結論。
   * 4 nm 以上取 10 C/cm²,以下按公開的趨勢外推。
   */
  var Q_BD_THICK = 10;    // C/cm²(t_ox ≥ 4 nm)
  var E_HARD = 15e6;      // 硬崩潰場強,V/cm(15 MV/cm)

  function qBd(toxNm) {
    if (toxNm >= 4) return Q_BD_THICK;
    return Q_BD_THICK * Math.pow(10, (4 - toxNm) / 0.5);
  }

  /** 後輝光的電子溫度 —— 脈衝 off 期電子在數十 µs 內冷下來 */
  var TE_OFF = 0.3;

  /* ---------------------------------------------------------------------
     基本通量
     --------------------------------------------------------------------- */

  /** Bohm 速度 (m/s) */
  function uBohm(te, massAmu) {
    return Math.sqrt((te * Q) / (massAmu * AMU));
  }

  /** 電子平均熱速度 (m/s) */
  function vBarE(te) {
    return Math.sqrt((8 * te * Q) / (Math.PI * M_E));
  }

  /** 離子飽和電流密度 A/m² */
  function jIon(ne, te, massAmu) {
    return Q * ne * uBohm(te, massAmu);
  }

  /** 電子飽和電流密度 A/m² */
  function jElecSat(ne, te) {
    return (Q * ne * vBarE(te)) / 4;
  }

  /**
   * 幾何穿透率 —— 等向入射的電子要進到深寬比 AR 的孔底,
   * 只有半角 θ = atan(1/AR) 錐內的才進得去。
   * 對餘弦分佈,通過率 = sin²θ = 1/(1 + AR²)。
   *
   * 離子幾乎垂直(鞘層加速),所以**不受這一項影響** ——
   * 整個充電效應就是這個不對稱造成的。
   */
  function transmission(ar) {
    return 1 / (1 + ar * ar);
  }

  /**
   * 有效電子收集係數。
   *
   * 天線不會整片都埋在高深寬比結構底部 —— 沒被遮蔽的部分照樣收電子,
   * 而且收得很兇(J_e,sat 是 J_i 的 108 倍)。所以**被遮蔽的面積比例**
   * 是這個模型裡份量很重的一個旋鈕,不是細節。
   */
  function effectiveCollection(s) {
    var f = s.shaded == null ? 1 : s.shaded;
    return f * transmission(s.arFeature) + (1 - f);
  }

  /**
   * 電子遮蔽造成的充電電位上限(V,相對基板)。
   *
   * 由 J_i = J_e,sat · eff · exp((V − V_p)/T_e) 解出,並用
   * V_p = T_e·ln(J_e,sat/J_i) 讓「未遮蔽的浮動面 = 0 V」。
   * 結果乾淨得出乎意料:V_ceiling = −T_e · ln(eff)。
   *
   * 當 eff < J_i/J_e,sat(約 1/108,對應 AR ≳ 10 的全遮蔽)時,
   * **即使把表面充到電漿電位,電子也補不回離子** ——
   * 此時沒有電漿端的上限,電位一路漲到氧化層導通為止。
   * 回傳 { v, unbounded }。
   */
  function ceiling(s) {
    var te = s.te == null ? 3 : s.te;
    var eff = effectiveCollection(s);
    var ratio = jIon(1, te, s.mass || 40) / jElecSat(1, te);
    if (eff <= ratio) {
      return { v: Infinity, unbounded: true, eff: eff, ratio: ratio };
    }
    return { v: -te * Math.log(eff), unbounded: false, eff: eff, ratio: ratio };
  }

  /** 電漿淨電流密度(A/m²,正 = 把表面充正) */
  function plasmaCurrent(V, s, te) {
    var ne = s.ne == null ? 1e17 : s.ne;
    var mass = s.mass || 40;
    var ji = jIon(ne, te, mass);
    var jes = jElecSat(ne, te);
    var vp = te * Math.log(jes / ji);      // 讓未遮蔽浮動面 = 0 V
    var eff = effectiveCollection(s);
    // V > V_p 之後沒有位障了,電子收集飽和 —— 指數要封頂
    var je = jes * eff * Math.exp(Math.min(0, (V - vp) / te));
    return ji - je;
  }

  /* ---------------------------------------------------------------------
     氧化層導通
     --------------------------------------------------------------------- */

  /** 氧化層電場 V/cm */
  function field(V, toxNm) {
    return V / (toxNm * 1e-7);
  }

  /**
   * FN 穿隧 + 梯形位障修正(Schuegraf–Hu)。A/cm²。
   * V_ox < φ_b 時位障是梯形而非三角形,指數要乘 [1 − (1 − V/φ)^{3/2}]。
   */
  function fnCurrent(V, toxNm) {
    if (!(V > 0)) return 0;
    var E = field(V, toxNm);
    if (!(E > 0)) return 0;
    var frac = V < PHI_B ? 1 - Math.pow(1 - V / PHI_B, 1.5) : 1;
    var jc = FN_A * E * E * Math.exp(-(FN_B * frac) / E);
    return isFinite(jc) ? jc : 0;
  }

  /**
   * 直接穿隧漏電流(A/cm²)—— **經驗式,不是第一原理**。
   *
   * 這一項是被實測逼出來的,而且它不是細節,是整個天線效應的機制本身。
   *
   * 第一版只放 FN。結果:天線比從 10 掃到 3000,閘極電位與注入電荷
   * **一位數都沒變**。原因不是數值問題,是結構問題 ——
   * 浮動天線的電位被電漿自己釘住(電漿導納 ∝ 天線面積),
   * 而驅動與分流**同樣正比於天線面積**,兩邊完全對消。
   * 沒有第二條洩放路徑的話,天線比在物理上就是無效的旋鈕。
   *
   * 真正讓天線比進到方程式的是**氧化層自己的漏電**:
   *
   *     V_ox = V_ceiling × G_plasma / (G_plasma + G_ox)
   *            G_plasma ∝ 天線面積、G_ox ∝ 閘極面積
   *
   * 這是一個分壓器,而分壓比就是天線比。小天線 → 漏電贏 → 電位被拉低;
   * 大天線 → 電漿贏 → 電位直接上到天花板。
   * 而 FN 式在直接穿隧區會低估好幾個數量級,等於把 G_ox 設成 0,
   * 分壓器就退化了 —— 這就是第一版看不到天線比的原因。
   *
   * 所以這裡改用**擬合公開的閘極漏電 t_ox 標度**(1 V 偏壓下每 nm 約四個數量級:
   * 1.0 nm ≈ 10³、1.5 nm ≈ 10¹、2.0 nm ≈ 10⁻¹、2.5 nm ≈ 10⁻³、3.0 nm ≈ 10⁻⁵ A/cm²)。
   * 這是工程擬合,不宣稱定量預測,但它讓「薄氧化層靠漏電自保」這件真事進得了模型。
   */
  var DT_LAMBDA = 1 / (4 * Math.LN10);   // nm,對應「每 nm 四個數量級」
  var DT_V0 = 0.4;                        // V,直接穿隧的電壓敏感度
  var DT_A0 = 8.05e5;                     // 由 t=3 nm、V=1 V → 10⁻⁵ A/cm² 定出

  function dtCurrent(V, toxNm) {
    if (!(V > 0)) return 0;
    var x = -toxNm / DT_LAMBDA + V / DT_V0;
    if (x < -700) return 0;
    var jc = DT_A0 * Math.exp(x) * V * V;
    return isFinite(jc) ? jc : 0;
  }

  /** 氧化層總電流密度 A/m² —— 兩條機制取大者 */
  function oxideCurrent(V, toxNm) {
    if (!(V > 0)) return 0;
    return Math.max(fnCurrent(V, toxNm), dtCurrent(V, toxNm)) * 1e4;
  }

  /**
   * 天線二極體:接地的二極體在製程中提供洩放路徑。
   * 正常操作時逆偏不導通,所以不影響電路功能 —— 代價是面積與接面漏電。
   */
  function diodeCurrent(V, s) {
    if (!s.diode) return 0;
    if (!(V > 0)) return 0;
    var IS = 1e-6;         // A/m²(以閘極面積歸一)
    var VT = 0.026;
    var x = Math.min(60, V / VT);
    return IS * (Math.exp(x) - 1);
  }

  /** 單位閘極面積的氧化層電容 F/m² */
  function coxArea(toxNm) {
    return (EPS0 * K_OX) / (toxNm * 1e-9);
  }

  /* ---------------------------------------------------------------------
     時域積分
     --------------------------------------------------------------------- */

  /** 脈衝相位 → 當下的 T_e */
  function teAt(s, t) {
    if (!s.pulse) return s.te == null ? 3 : s.te;
    var f = s.freq == null ? 5000 : s.freq;
    var duty = s.duty == null ? 0.5 : s.duty;
    var period = 1 / f;
    var ph = (t % period) / period;
    return ph < duty ? (s.te == null ? 3 : s.te) : TE_OFF;
  }

  /** 下一個脈衝邊緣的時間(用來避免積分跨過邊緣) */
  function nextEdge(s, t) {
    if (!s.pulse) return Infinity;
    var f = s.freq == null ? 5000 : s.freq;
    var duty = s.duty == null ? 0.5 : s.duty;
    var period = 1 / f;
    var k = Math.floor(t / period);
    var on = k * period;
    var off = on + duty * period;
    if (t < off - 1e-15) return off;
    return (k + 1) * period;
  }

  function dVdt(V, s, te) {
    var C = coxArea(s.tox == null ? 3 : s.tox);
    var r = s.antennaRatio == null ? 100 : s.antennaRatio;
    var jin = plasmaCurrent(V, s, te) * r;
    var jout = oxideCurrent(V, s.tox == null ? 3 : s.tox) + diodeCurrent(V, s);
    return { dv: (jin - jout) / C, jox: jout };
  }

  /**
   * 積分到 tEnd,回傳等間隔取樣的 V(t)。
   *
   * 自適應步長:充電最快時 dV/dt 可達 10⁹ V/s 以上,固定步長不是精度問題
   * 而是會直接發散。這裡限制每步的 ΔV,並且**不跨越脈衝邊緣**。
   */
  function integrate(s, tEnd, nOut) {
    var n = nOut || 400;
    var dtOut = tEnd / (n - 1);
    var maxDV = 0.005;
    var out = [];
    var t = 0;
    var V = 0;
    var nextSample = 0;
    var qInj = 0;
    var vPeak = 0;
    var guard = 0;

    while (out.length < n && guard++ < 3000000) {
      while (nextSample <= t + 1e-18 && out.length < n) {
        out.push({ t: nextSample, v: V, e: field(V, s.tox == null ? 3 : s.tox) });
        nextSample += dtOut;
      }
      if (out.length >= n) break;

      var te = teAt(s, t);
      var d = dVdt(V, s, te);
      var step = dtOut / 4;
      if (Math.abs(d.dv) > 1e-12) step = Math.min(step, maxDV / Math.abs(d.dv));
      step = Math.min(step, nextSample - t, nextEdge(s, t) - t);
      if (!(step > 0)) step = dtOut / 4;

      V = V + d.dv * step;
      if (V < 0) V = 0;              // 本模型只追正向充電
      if (V > vPeak) vPeak = V;
      qInj += d.jox * step;          // C/m²(以閘極面積歸一)
      t += step;
    }

    return { series: out, vPeak: vPeak, qWindow: qInj, tWindow: t };
  }

  /**
   * 週期性穩態的統計。
   *
   * 為什麼要分兩個時間尺度:充電時間常數約 10 µs,而製程步驟長達數十秒 ——
   * 逐點積分 60 秒要 10⁹ 步。所以先在幾毫秒的視窗裡跑到週期性穩態,
   * 取**時間平均的氧化層電流**,再乘製程時間換算長期注入電荷。
   * 這也正是現場工程師會做的估算。
   */
  function steady(s) {
    var f = s.pulse ? (s.freq == null ? 5000 : s.freq) : 20000;
    var window = Math.max(2e-3, 10 / f);
    var sim = integrate(s, window, 600);
    // 丟掉前半段的暫態,只統計後半
    var half = Math.floor(sim.series.length / 2);
    var tail = sim.series.slice(half);
    var tox = s.tox == null ? 3 : s.tox;
    var jSum = 0;
    var vSum = 0;
    var vMax = 0;
    for (var i = 0; i < tail.length; i++) {
      jSum += oxideCurrent(tail[i].v, tox);
      vSum += tail[i].v;
      if (tail[i].v > vMax) vMax = tail[i].v;
    }
    return {
      series: sim.series,
      window: window,
      vMean: vSum / tail.length,
      vMax: vMax,
      eMax: field(vMax, tox),
      jOxMean: jSum / tail.length,       // A/m²(閘極面積)
    };
  }

  /**
   * 長期損傷估算。
   *
   * 兩條失效路徑,課文要分開講:
   *   · **硬崩潰**:E 超過 15 MV/cm —— 瞬間,與時間無關
   *   · **磨耗失效**:注入電荷累積到 Q_bd —— 時間 ∝ 1/天線比
   */
  function damage(s) {
    var st = steady(s);
    var stepTime = s.stepTime == null ? 60 : s.stepTime;
    var tox = s.tox == null ? 3 : s.tox;
    var qbd = qBd(tox);
    var jc = st.jOxMean * 1e-4;                    // A/m² → A/cm²
    var qInj = jc * stepTime;                      // C/cm²
    var tBd = jc > 0 ? qbd / jc : Infinity;        // 到崩潰要多久(秒)
    var hard = st.eMax >= E_HARD;
    return {
      steady: st,
      qInj: qInj,
      qBd: qbd,
      tBd: tBd,
      hardBreak: hard,
      wearOut: qInj >= qbd,
      broken: hard || qInj >= qbd,
      margin: qbd > 0 ? qInj / qbd : 0,
      eMaxMVcm: st.eMax / 1e6,
    };
  }

  /**
   * 最大回落比例 —— 「電位是不是單調累積」要用這個問,不能用嚴格單調。
   *
   * 嚴格單調在數值上沒有意義:CW 到達穩態之後也會有 10⁻¹⁵ 級的抖動,
   * 一測就說「不是單調累積」。真正要區分的是
   * **「衝上去就一直待在那裡」還是「每個週期都被打下來」**,
   * 所以量的是相對於當下最高點的最大回落。
   */
  function drawdown(series) {
    var peak = 0;
    var worst = 0;
    for (var i = 0; i < series.length; i++) {
      if (series[i].v > peak) peak = series[i].v;
      if (peak > 1e-9) {
        var d = (peak - series[i].v) / peak;
        if (d > worst) worst = d;
      }
    }
    return worst;
  }

  /** 掃天線比 —— 用來驗「注入電荷 ∝ 天線比」 */
  function sweepAntenna(s, list) {
    return (list || [10, 30, 100, 300, 1000]).map(function (r) {
      var d = damage(Object.assign({}, s, { antennaRatio: r }));
      return { ratio: r, vMax: d.steady.vMax, eMVcm: d.eMaxMVcm, qInj: d.qInj, tBd: d.tBd };
    });
  }

  var MODES = {
    cw: { key: "cw", label: "連續波 CW", note: "電位單調累積到上限,然後一直停在那裡。" },
    pulsed: { key: "pulsed", label: "脈衝電漿", note: "off 期電子冷下來、遮蔽失效,電位被中和 —— 最有效的對策。" },
  };

  var RANGES = {
    antennaRatioLog: { label: "天線比(log₁₀)", min: 0.5, max: 3.5, step: 0.1, unit: "" },
    arFeature: { label: "結構深寬比", min: 1, max: 20, step: 0.5, unit: " :1" },
    shaded: { label: "被遮蔽的天線面積比例", min: 0.05, max: 1, step: 0.05, unit: "" },
    te: { label: "電子溫度 T_e", min: 1, max: 6, step: 0.1, unit: " eV" },
    tox: { label: "閘極氧化層厚度", min: 1.5, max: 10, step: 0.5, unit: " nm" },
    duty: { label: "脈衝工作週期", min: 0.1, max: 0.9, step: 0.05, unit: "" },
    stepTime: { label: "製程步驟時間", min: 10, max: 180, step: 5, unit: " s" },
  };

  PA.charging = {
    qBd: qBd,
    Q_BD_THICK: Q_BD_THICK,
    E_HARD: E_HARD,
    TE_OFF: TE_OFF,
    PHI_B: PHI_B,
    MODES: MODES,
    RANGES: RANGES,
    fnCurrent: fnCurrent,
    dtCurrent: dtCurrent,
    transmission: transmission,
    effectiveCollection: effectiveCollection,
    ceiling: ceiling,
    jIon: jIon,
    jElecSat: jElecSat,
    plasmaCurrent: plasmaCurrent,
    oxideCurrent: oxideCurrent,
    diodeCurrent: diodeCurrent,
    field: field,
    coxArea: coxArea,
    teAt: teAt,
    integrate: integrate,
    steady: steady,
    damage: damage,
    sweepAntenna: sweepAntenna,
    drawdown: drawdown,
  };
})((window.PA = window.PA || {}));
