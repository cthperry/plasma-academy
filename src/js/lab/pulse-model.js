/* ==========================================================================
   pulse-model.js — 脈衝電漿時序(4.4 / A31)

   脈衝的四個好處全部來自同一件事:**T_e 與 n_e 的衰減時間常數差兩個數量級**。

   這不是設定進去的,是 0-D 全域模型跑出來的:

     電子能量平衡:1.5·n_e·dT_e/dt = p_in − n_e[ν_iz(T_e)·E_c + ν_loss·(2T_e+V_鞘)]
     粒子平衡    :dn_e/dt = n_e[ν_iz(T_e) − ν_loss(T_e) − ν_att]

   off 期 p_in = 0,而 ν_iz ∝ exp(−E_iz/T_e) 對 T_e 極度敏感 ——
   T_e 一掉,非彈性損失立刻關掉,所以 T_e 自己先崩(次微秒);
   而 n_e 只能靠擴散慢慢流失,而且 u_B ∝ √T_e,T_e 掉了之後**擴散還變慢** ——
   於是後輝光是「高密度、低溫」的電漿。這正是脈衝的全部價值來源:

     · 鞘層電位 ∝ T_e → off 期鞘層塌陷 → 電子與負離子進得了深孔 → **中和充電**
     · 電負性氣體在 off 期形成離子-離子電漿 → 負離子質量大、進得更深
     · off 期沒有高能電子 → 少了多階解離與 VUV 光子
     · 平均 T_e 下降 → 損傷下降

   孔底充電沿用 4.3 的同一套式子(PA.charging),不另外寫一份 ——
   兩章講的本來就是同一個物理。

   ⚠️ 教材用的簡化模型。定性趨勢與量級為目標,不做定量預測。
   ========================================================================== */

(function (PA) {
  "use strict";

  var Q = 1.602176634e-19;
  var KB = 1.380649e-23;
  var AMU = 1.66053906660e-27;

  var E_IZ = 15.76;         // Ar 游離能 eV
  var K_IZ0 = 5e-14;        // 游離速率係數前因子 m³/s
  var E_COLL = 50;          // 每產生一對離子的碰撞能量損失 eV
  var LAMBDA = 0.04;        // 有效擴散長度 m
  var MASS = 40;            // Ar
  /**
   * 附著速率係數 m³/s(對電負性氣體分壓)。
   * 第一版用 1.2e-16,跑出 n_neg = 6e16、電負度 α 高達 1800 —— 不是電漿,是笑話。
   * 附著頻率變得與游離頻率同量級,電子被吃光。實際的 Cl₂/O₂ 附著係數
   * 在 T_e ~ 3 eV 是 10⁻¹⁷ 量級,改過來之後 α 落在 1–2(on 期),
   * 後輝光才升到數十(離子-離子電漿),這才是文獻上的樣子。
   */
  var K_ATT0 = 8e-18;
  var K_II = 5e-14;         // 離子-離子復合 m³/s
  /**
   * 孔底的等效電容(F/m²)—— **這個數字不能亂填**。
   *
   * 第一版隨手用 2e-8,結果孔底電位變成瞬間跟著 T_e 的天花板跑
   * (時間常數 0.05 µs ≪ 脈衝週期),於是脈衝反而讓尖峰**變高**,
   * 因為點火瞬間 T_e 會過衝。那是電容填錯造成的假象。
   *
   * 正確的量級:孔底到基板之間還有一層待蝕穿的介電質,取剩餘 100 nm 的 SiO₂:
   *     C = ε₀·k/d = 8.854e−12 × 3.9 / 100e−9 ≈ 3.45e−4 F/m²
   * 大了四個數量級,充電時間常數變成數百 µs —— 與脈衝週期同量級。
   * 這時候孔底才是在**積分**淨電流,脈衝也才真的能阻止累積。
   */
  var C_FEATURE = (8.854e-12 * 3.9) / 100e-9;
  var TE_FLOOR = 0.05;      // 數值下限,避免 T_e → 0 時除爆

  var MODES = {
    source: { key: "source", label: "Source 脈衝", note: "只脈衝源功率:調控自由基組成、降解離度、降 T_e。" },
    bias: { key: "bias", label: "Bias 脈衝", note: "只脈衝偏壓:中和充電、控制 IEDF,但 n_e 與 T_e 幾乎不動。" },
    sync: { key: "sync", label: "同步脈衝", note: "兩者同步(可設相位差):彈性最大,先進製程主流。" },
  };

  /** Bohm 速度 m/s */
  function uBohm(te) {
    return Math.sqrt((Math.max(te, TE_FLOOR) * Q) / (MASS * AMU));
  }

  /** 擴散損失頻率 —— 注意它 ∝ √T_e,所以 T_e 掉了之後損失還變慢 */
  function nuLoss(te) {
    return uBohm(te) / LAMBDA;
  }

  /** 游離頻率 —— 對 T_e 指數敏感,這是 T_e 崩得比 n_e 快的根源 */
  function nuIz(te, nGas) {
    return nGas * K_IZ0 * Math.exp(-E_IZ / Math.max(te, TE_FLOOR));
  }

  /** 附著頻率(只有電負性氣體才有) */
  function nuAtt(nGas, eneg) {
    return nGas * K_ATT0 * (eneg || 0);
  }

  /** 鞘層電位 —— 浮動鞘層約 4.7·T_e(Ar) */
  function sheath(te) {
    return 4.68 * Math.max(te, TE_FLOOR);
  }

  /** 氣體密度 m⁻³(壓力 mTorr、室溫) */
  function gasDensity(mTorr) {
    return (mTorr * 0.1333) / (KB * 300);
  }

  /** 某一時刻源功率開著嗎 */
  function sourceOn(s, t) {
    if (!s.pulse) return true;
    if (s.mode === "bias") return true;          // 只脈衝偏壓,源一直開
    var period = 1 / s.freq;
    return (t % period) / period < s.duty;
  }

  /** 某一時刻偏壓開著嗎(同步模式可設相位差) */
  function biasOn(s, t) {
    if (!s.pulse) return true;
    if (s.mode === "source") return true;        // 只脈衝源,偏壓一直開
    var period = 1 / s.freq;
    var ph = (t % period) / period;
    var shift = s.mode === "sync" ? (s.phase || 0) : 0;
    var x = (ph - shift + 1) % 1;
    return x < s.duty;
  }

  function defaults(state) {
    var s = state || {};
    return {
      power: s.power == null ? 500 : s.power,
      pressure: s.pressure == null ? 20 : s.pressure,
      volume: s.volume == null ? 0.02 : s.volume,
      biasV: s.biasV == null ? 80 : s.biasV,
      freq: s.freq == null ? 2000 : s.freq,
      duty: s.duty == null ? 0.5 : s.duty,
      mode: s.mode || "sync",
      phase: s.phase == null ? 0 : s.phase,
      eneg: s.eneg == null ? 0 : s.eneg,
      pulse: s.pulse == null ? true : s.pulse,
      arFeature: s.arFeature == null ? 8 : s.arFeature,
      shaded: s.shaded == null ? 1 : s.shaded,
      cycles: s.cycles == null ? 4 : s.cycles,
    };
  }

  /**
   * 積分數個脈衝週期。
   *
   * 自適應步長:T_e 的時間常數是次微秒、n_e 是數十微秒,差兩個數量級 ——
   * 固定步長不是精度問題,是會直接發散。
   */
  function simulate(state) {
    var s = defaults(state);
    var nGas = gasDensity(s.pressure);
    var period = 1 / s.freq;
    var tEnd = period * s.cycles;
    var N = 900;
    var dtOut = tEnd / (N - 1);

    // 先跑到週期性穩態(丟掉前幾個週期的暖機)
    var warm = period * 6;

    var ne = 1e16;
    var te = 3;
    var nNeg = s.eneg > 0 ? 1e15 : 0;
    var vBottom = 0;

    var chargeState = {
      ne: ne, mass: MASS, shaded: s.shaded, arFeature: s.arFeature,
    };

    var out = [];
    var t = -warm;
    var nextSample = 0;
    var guard = 0;

    while (out.length < N && guard++ < 4000000) {
      var tt = t < 0 ? t + warm : t;   // 暖機期用正時間算脈衝相位
      var on = sourceOn(s, tt < 0 ? 0 : (t < 0 ? tt : t));
      var bOn = biasOn(s, t < 0 ? tt : t);

      var pin = on ? (s.power / s.volume) : 0;
      var vIz = nuIz(te, nGas);
      var vLoss = nuLoss(te);
      var vAtt = nuAtt(nGas, s.eneg);

      // 能量平衡(eV/s)
      var lossPerElectron = vIz * E_COLL + vLoss * (2 * te + sheath(te));
      var dTe = (pin / (1.5 * ne * Q) - lossPerElectron) / 1.5;
      // 粒子平衡
      var dNe = ne * (vIz - vLoss - vAtt);
      // 負離子:附著生成、離子-離子復合消滅;off 期鞘層塌了才跑得到壁上
      // 準中性:n_正 = n_e + n_負。復合項必須用正離子密度,否則負離子會失控
      var nPos = ne + nNeg;
      var dNeg = s.eneg > 0
        ? ne * vAtt - K_II * nNeg * nPos - (on ? 0 : nNeg * nuLoss(0.05))
        : 0;

      // 孔底電位:沿用 4.3 的電漿電流式,off 期再加上負離子的中和
      chargeState.ne = ne;
      var jNet = PA.charging.plasmaCurrent(vBottom, chargeState, Math.max(te, TE_FLOOR));
      // 鞘層塌陷之後負離子也打得到孔底,而且質量大、方向性差 → 進得去
      var jNeg = !on && nNeg > 0 ? -Q * nNeg * uBohm(Math.max(te, TE_FLOOR)) * 0.25 : 0;
      var dV = (jNet + jNeg) / C_FEATURE;

      // 步長:限制每一步的相對變化
      var dt = dtOut / 4;
      if (Math.abs(dTe) > 1e-9) dt = Math.min(dt, (0.02 * Math.max(te, 0.1)) / Math.abs(dTe));
      if (Math.abs(dNe) > 1e-9) dt = Math.min(dt, (0.02 * ne) / Math.abs(dNe));
      if (Math.abs(dV) > 1e-9) dt = Math.min(dt, 0.05 / Math.abs(dV));
      // 不跨越脈衝邊緣
      var ph = (((t < 0 ? tt : t) % period) + period) % period;
      var toEdge = ph < s.duty * period ? s.duty * period - ph : period - ph;
      dt = Math.min(dt, Math.max(toEdge, 1e-9));
      if (t >= 0) dt = Math.min(dt, Math.max(nextSample - t, 1e-9));
      if (!(dt > 0)) dt = dtOut / 4;

      te = Math.max(TE_FLOOR, te + dTe * dt);
      ne = Math.max(1e13, ne + dNe * dt);
      nNeg = Math.max(0, nNeg + dNeg * dt);
      vBottom = vBottom + dV * dt;
      if (vBottom < 0) vBottom = 0;
      t += dt;

      if (t >= 0 && t >= nextSample - 1e-15 && out.length < N) {
        out.push({
          t: nextSample,
          ne: ne, te: te, nNeg: nNeg,
          sheath: sheath(te),
          /**
           * 晶圓上的離子能量 = 浮動鞘層 + 偏壓。
           * 沒有這一項的話,「只脈衝偏壓」在模型裡什麼都不會變 ——
           * 三種脈衝模式就退化成同一件事。
           */
          ionEnergy: sheath(te) + (bOn ? s.biasV : 0),
          vBottom: vBottom,
          on: on ? 1 : 0,
          bias: bOn ? 1 : 0,
          alpha: ne > 0 ? nNeg / ne : 0,
        });
        nextSample += dtOut;
      }
    }

    return { series: out, period: period, tEnd: tEnd, state: s, nGas: nGas };
  }

  /**
   * 量 off 期的衰減時間常數 —— A31 的驗收條件要靠這個。
   *
   * 從 off 開始,找訊號掉到 1/e 所需的時間。**這必須是量出來的**,
   * 不能拿模型裡的參數當答案:T_e 的衰減根本不是單一指數
   * (ν_iz 一關掉,衰減就換了一個機制),硬套參數會得到錯的數字。
   */
  function decayTau(sim, key) {
    var s = sim.series;
    var st = sim.state;
    var offStart = st.duty * sim.period;
    // 找 off 開始後的第一個樣本
    var i0 = 0;
    for (var i = 0; i < s.length; i++) {
      var ph = s[i].t % sim.period;
      if (ph >= offStart) { i0 = i; break; }
    }
    var v0 = s[i0][key];
    var target = v0 / Math.E;
    for (var j = i0; j < s.length; j++) {
      var ph2 = s[j].t % sim.period;
      if (ph2 < offStart && j > i0) break;      // 出了這個 off 期就停
      if (s[j][key] <= target) return s[j].t - s[i0].t;
    }
    return NaN;   // 這個 off 期還沒掉到 1/e
  }

  /** 週期內的統計 */
  function stats(sim) {
    var s = sim.series;
    var n = s.length;
    var sum = { ne: 0, te: 0, sheath: 0, nNeg: 0, vBottom: 0, ionEnergy: 0 };
    /**
     * 離子能量劑量有多少比例落在**後輝光**裡。
     *
     * 相位差這個旋鈕不會改變平均離子能量(偏壓開多久就是多久),
     * 它改的是「高能離子打下去的時候,電漿是熱的還是冷的」——
     * 把偏壓移到後輝光,就能在 T_e 已經崩掉、負離子已經出現的時候
     * 送高能離子下去。這才是同步脈衝相位差的用途,
     * 所以要量的是**相關性**,不是平均值。
     */
    var doseOff = 0, doseAll = 0;
    var max = { ne: 0, te: 0, sheath: 0, vBottom: 0, ionEnergy: 0 };
    var min = { ne: Infinity, te: Infinity };
    for (var i = 0; i < n; i++) {
      sum.ne += s[i].ne; sum.te += s[i].te;
      sum.sheath += s[i].sheath; sum.nNeg += s[i].nNeg;
      sum.vBottom += s[i].vBottom;
      sum.ionEnergy += s[i].ionEnergy;
      doseAll += s[i].ionEnergy;
      if (!s[i].on) doseOff += s[i].ionEnergy;
      if (s[i].ionEnergy > (max.ionEnergy || 0)) max.ionEnergy = s[i].ionEnergy;
      if (s[i].ne > max.ne) max.ne = s[i].ne;
      if (s[i].te > max.te) max.te = s[i].te;
      if (s[i].sheath > max.sheath) max.sheath = s[i].sheath;
      if (s[i].vBottom > max.vBottom) max.vBottom = s[i].vBottom;
      if (s[i].ne < min.ne) min.ne = s[i].ne;
      if (s[i].te < min.te) min.te = s[i].te;
    }
    return {
      neMean: sum.ne / n, teMean: sum.te / n,
      vBottomMean: sum.vBottom / n,
      ionEnergyMean: sum.ionEnergy / n,
      afterglowDose: doseAll > 0 ? doseOff / doseAll : 0,
      ionEnergyMax: max.ionEnergy || 0,
      sheathMean: sum.sheath / n, negMean: sum.nNeg / n,
      neMax: max.ne, teMax: max.te, sheathMax: max.sheath, vBottomMax: max.vBottom,
      neMin: min.ne, teMin: min.te,
      tauTe: decayTau(sim, "te"),
      tauNe: decayTau(sim, "ne"),
      // 孔底電荷的最大回落 —— 與 4.3 同一個判準
      drawdown: PA.charging.drawdown(s.map(function (x) { return { v: x.vBottom }; })),
    };
  }

  var RANGES = {
    freqLog: { label: "脈衝頻率(log₁₀ Hz)", min: 2, max: 4, step: 0.1, unit: "" },
    duty: { label: "佔空比", min: 0.1, max: 0.9, step: 0.05, unit: "" },
    phase: { label: "同步相位差", min: 0, max: 0.8, step: 0.05, unit: "" },
    power: { label: "源功率", min: 100, max: 1500, step: 50, unit: " W" },
    pressure: { label: "壓力", min: 5, max: 80, step: 5, unit: " mTorr" },
    eneg: { label: "氣體電負性", min: 0, max: 1, step: 0.05, unit: "" },
    biasV: { label: "偏壓", min: 0, max: 300, step: 10, unit: " V" },
    arFeature: { label: "孔的深寬比", min: 1, max: 20, step: 0.5, unit: " :1" },
  };

  PA.pulse = {
    E_IZ: E_IZ,
    C_FEATURE: C_FEATURE,
    K_ATT0: K_ATT0,
    E_COLL: E_COLL,
    LAMBDA: LAMBDA,
    MODES: MODES,
    RANGES: RANGES,
    uBohm: uBohm,
    nuLoss: nuLoss,
    nuIz: nuIz,
    nuAtt: nuAtt,
    sheath: sheath,
    gasDensity: gasDensity,
    sourceOn: sourceOn,
    biasOn: biasOn,
    simulate: simulate,
    decayTau: decayTau,
    stats: stats,
  };
})((window.PA = window.PA || {}));
