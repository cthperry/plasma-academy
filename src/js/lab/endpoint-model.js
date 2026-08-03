/* ==========================================================================
   endpoint-model.js — 終點偵測(4.2 / A28)

   兩種終點訊號並排,而它們對「開口率」的依賴完全不同 ——
   這就是 A28 要讓人看見的那件事:

     **OES**   產物訊號 ∝ 被蝕刻的面積 = 開口率。
               而偵測器的雜訊是**絕對值**(暗電流、背景連續光),不隨開口率縮小。
               所以 SNR ∝ 開口率 —— 開口率掉兩個數量級,SNR 就跟著掉兩個數量級。

     **干涉**  量的是**膜厚**,訊號來自量測光斑內的反射干涉。
               光斑打在夠大的量測區上,**與圖形開口率無關** ——
               所以低開口率時它還活著,而 OES 已經死了。

   終點時間不是查表來的:訊號跑出來之後,用選定的演算法去偵測,
   偵測到的時間與真實界面時間比對,誤差是**算出來的**。
   所以「演算法在低 SNR 下會誤觸發」是模擬的結果,不是寫死的動畫。

   ⚠️ 教材用的簡化模型。定性趨勢與量級為目標,不做定量預測。
   ========================================================================== */

(function (PA) {
  "use strict";

  /** 4.2.2 的監控訊號表 —— 各製程看哪條線、往哪個方向變 */
  var SIGNALS = {
    oxide: {
      key: "oxide", label: "SiO₂ 接觸孔",
      line: "CO 483 nm", dir: "down",
      why: "蝕穿之後不再有 SiO₂ 供氧,CO 這個**產物**訊號掉下來。",
    },
    poly: {
      key: "poly", label: "Poly-Si(產物)",
      line: "Si 288 nm", dir: "down",
      why: "Si 蝕刻產物消失 → 訊號下降。",
    },
    polyReactant: {
      key: "polyReactant", label: "Poly-Si(反應物)",
      line: "Cl 837 nm", dir: "up",
      why: "刻穿之後 Cl 不再被消耗 → **反應物**訊號反而上升。",
    },
    ash: {
      key: "ash", label: "光阻灰化",
      line: "CO 483 / OH 309", dir: "down",
      why: "光阻被氧化的產物同時消失。",
    },
    nitride: {
      key: "nitride", label: "SiN",
      line: "CN 387 nm", dir: "down",
      why: "含氮產物消失。",
    },
  };

  /**
   * 偵測器的絕對雜訊 —— **不隨開口率縮小**,這是 SNR 崩壞的根源。
   *
   * 數值訂在讓崩壞落在現場真正會遇到的位置:
   * 開口率 1 % 仍可用、0.3 % 邊緣、0.1 % 以下不可靠。
   * (接觸孔/貫孔層的開口率正好落在 0.1–1 % 這個區間,
   *  這也是業界會另外拉干涉終點或改用膜厚模型的原因。)
   */
  var DETECTOR_NOISE = 0.0008;

  /** 訊號從界面開始到完全消失所需的時間比例(界面不是數學上的一瞬間) */
  var TRANSITION = 0.06;

  /**
   * 產生一次蝕刻的時間序列。
   *
   * state:{ openArea(0–1)、noise、thickness(nm)、rate(nm/s)、signal、overEtch }
   */
  function run(state) {
    var s = state || {};
    var openArea = s.openArea == null ? 0.1 : s.openArea;
    var noiseMul = s.noise == null ? 1 : s.noise;
    var thickness = s.thickness == null ? 500 : s.thickness;
    var rate = s.rate == null ? 5 : s.rate;
    var sig = SIGNALS[s.signal || "oxide"] || SIGNALS.oxide;
    var over = s.overEtch == null ? 0.25 : s.overEtch;

    var tEnd = thickness / rate;                 // 真實的界面時間
    var tTotal = tEnd * (1 + over);
    var N = 400;
    var dt = tTotal / (N - 1);

    // 種子可指定 —— 同一組參數要能跑多次不同的雜訊實現,
    // 因為「低 SNR 下不可靠」本來就是**統計**陳述,不是單次結果
    var seed = (s.seed == null ? 987654321 : s.seed) >>> 0;
    function rnd() {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff - 0.5;
    }

    var oes = [];
    var interf = [];
    var lambda = 633;   // He-Ne 雷射
    var nFilm = 1.46;   // SiO₂ 折射率

    for (var i = 0; i < N; i++) {
      var t = i * dt;
      var remain = Math.max(0, 1 - t / tEnd);

      /* ---- OES ---- */
      // 產物量 ∝ 正在被蝕刻的面積。界面附近用平滑轉折,不是階梯
      var frac = 1 / (1 + Math.exp((t - tEnd) / (TRANSITION * tEnd)));
      var clean = sig.dir === "up" ? 1 - frac : frac;
      // **訊號正比於開口率;雜訊不是** —— SNR 就是這樣被開口率決定的
      var oesSignal = 0.05 + openArea * clean;
      var oesNoise = DETECTOR_NOISE * noiseMul * rnd() * 2;
      oes.push({ t: t, clean: 0.05 + openArea * clean, v: oesSignal + oesNoise });

      /* ---- 干涉 ---- */
      // 反射率隨膜厚振盪;膜刻完之後就不再有條紋
      var d = remain * thickness;
      var phase = (4 * Math.PI * nFilm * d) / lambda;
      var fringe = d > 0 ? 0.5 + 0.42 * Math.cos(phase) : 0.5;
      // 干涉訊號**不乘開口率** —— 它量的是量測區的膜厚
      var iNoise = DETECTOR_NOISE * noiseMul * rnd() * 2;
      interf.push({ t: t, clean: fringe, v: fringe + iNoise });
    }

    return {
      oes: oes, interf: interf, tEnd: tEnd, tTotal: tTotal, dt: dt,
      openArea: openArea, signal: sig, thickness: thickness, rate: rate, noiseMul: noiseMul,
      lambda: lambda, nFilm: nFilm,
    };
  }

  /* ---------------------------------------------------------------------
     4.2.6 的演算法
     --------------------------------------------------------------------- */

  /** 置中平滑 —— 事後分析用得上,即時控制用不上(它要用到未來的點) */
  function movingAverage(series, win) {
    var w = win || 9;
    var half = Math.floor(w / 2);
    return series.map(function (p, i) {
      var sum = 0, n = 0;
      for (var k = i - half; k <= i + half; k++) {
        if (k < 0 || k >= series.length) continue;
        sum += series[k].v;
        n++;
      }
      return { t: p.t, v: sum / n };
    });
  }

  /**
   * 拖尾平滑(因果) —— 只用**已經發生**的點。
   *
   * 這一條是被實測逼出來的。第一版全部用置中平滑,結果
   * 「31 點長窗」的有號偏差只有 −0.05 %,完全沒有我以為的延遲 ——
   * 因為對稱平滑不會移動對稱轉折的反曲點。
   * 但真機的終點控制器**看不到未來的取樣點**,它只能拖尾平均,
   * 而拖尾平均一定延遲約半個窗。長窗抗雜訊、但終點報得晚,
   * 這個取捨要是模型跑得出來的,不能是我寫在課文裡的空話。
   */
  function trailingAverage(series, win) {
    var w = win || 9;
    return series.map(function (p, i) {
      var sum = 0, n = 0;
      for (var k = i - w + 1; k <= i; k++) {
        if (k < 0) continue;
        sum += series[k].v;
        n++;
      }
      return { t: p.t, v: sum / n };
    });
  }

  /** 一階微分 —— 最常用的終點判準:找最大變化率 */
  function derivative(series) {
    var out = [];
    for (var i = 1; i < series.length - 1; i++) {
      var d = (series[i + 1].v - series[i - 1].v) / (series[i + 1].t - series[i - 1].t);
      out.push({ t: series[i].t, v: d });
    }
    return out;
  }

  /** 歸一化 —— 除以自身的起始水準,消掉光源與視窗透光率的漂移 */
  function normalize(series) {
    var base = 0;
    var n = Math.max(3, Math.round(series.length * 0.05));
    for (var i = 0; i < n; i++) base += series[i].v;
    base /= n;
    if (!(Math.abs(base) > 1e-9)) return series.slice();
    return series.map(function (p) { return { t: p.t, v: p.v / base }; });
  }

  /**
   * 四種偵測法。**它們必須是真的不一樣的東西** ——
   * 第一版我把「移動平均」「一階微分」「歸一化」列成三個選項,
   * 實測跑出**位元完全相同**的結果,因為:
   *   · 微分法本來就要先平滑,所以「ma」和「deriv」是同一條路徑;
   *   · 歸一化只是除以一個常數,而 argmax 對縮放免疫 ——
   *     它救的是「跨片、跨腔體的視窗霧化漂移」,不是單片的終點時間。
   * 所以改成四種**判準真的不同**的方法,它們的取捨才是 4.2.6 要教的:
   */
  var ALGOS = {
    deriv: {
      key: "deriv", label: "微分(不平滑)", win: 1, causal: true,
      note: "最靈敏、也最容易被單一雜訊尖峰騙走。",
    },
    ma: {
      key: "ma", label: "拖尾平滑 9 點 + 微分", win: 9, causal: true,
      note: "業界預設。平滑到夠抗雜訊,又還沒把轉折抹掉。",
    },
    maLong: {
      key: "maLong", label: "拖尾平滑 31 點 + 微分", win: 31, causal: true,
      note: "更抗雜訊,但**會延遲** —— 拖尾長窗一定晚報約半個窗。",
    },
    thresh: {
      key: "thresh", label: "平台間 50 % 門檻(事後)", win: 9, causal: false,
      note: "誤差最小,但它要用到**蝕刻結束後**的平台 —— 不能拿來即時停機,只能做事後分析與 R2R。",
    },
  };

  function applyAlgo(series, algo) {
    var a = ALGOS[algo] || ALGOS.ma;
    if (a.win <= 1) return series.slice();
    // 即時法只能拖尾;事後法才有資格用置中平滑
    return a.causal ? trailingAverage(series, a.win) : movingAverage(series, a.win);
  }

  /**
   * 從處理過的訊號偵測終點。
   *
   * 預設判準:找**變化最劇烈**的那一點(一階微分的極值)。
   * 這正是 4.2.6 說的最常用做法 —— 而它在低 SNR 下會被雜訊的尖峰騙走,
   * 那個「被騙走」就是 A28 要展示的失效。
   *
   * `thresh` 走另一條路:用頭尾平台定義 0 % 與 100 %,找訊號**穿過一半**
   * 的時刻。極值法只看一個點,門檻法看的是整段趨勢,所以雜訊尖峰騙不動它。
   */
  function detect(sim, algo) {
    var key = ALGOS[algo] ? algo : "ma";
    var proc = applyAlgo(sim.oes, key);

    if (key === "thresh") {
      var n = Math.max(3, Math.round(proc.length * 0.06));
      var head = 0, tail = 0, i2;
      for (i2 = 0; i2 < n; i2++) head += proc[i2].v;
      for (i2 = proc.length - n; i2 < proc.length; i2++) tail += proc[i2].v;
      head /= n; tail /= n;
      var half = (head + tail) / 2;
      var down = tail < head;
      for (i2 = 0; i2 < proc.length; i2++) {
        if (down ? proc[i2].v <= half : proc[i2].v >= half) {
          return {
            t: proc[i2].t,
            strength: Math.abs(tail - head),
            error: (proc[i2].t - sim.tEnd) / sim.tEnd,
            absError: Math.abs(proc[i2].t - sim.tEnd),
          };
        }
      }
      var lastP = proc[proc.length - 1];
      return {
        t: lastP.t, strength: Math.abs(tail - head),
        error: (lastP.t - sim.tEnd) / sim.tEnd,
        absError: Math.abs(lastP.t - sim.tEnd),
      };
    }

    var d = derivative(proc);
    if (!d.length) return { t: NaN, error: NaN };
    // 產物下降 → 找最負;反應物上升 → 找最正
    var wantMax = sim.signal.dir === "up";
    var best = wantMax ? -Infinity : Infinity;
    var bestT = NaN;
    for (var i = 0; i < d.length; i++) {
      if (wantMax ? d[i].v > best : d[i].v < best) {
        best = d[i].v;
        bestT = d[i].t;
      }
    }
    return {
      t: bestT,
      strength: Math.abs(best),
      error: (bestT - sim.tEnd) / sim.tEnd,
      absError: Math.abs(bestT - sim.tEnd),
    };
  }

  /**
   * 干涉終點:數條紋。
   * 每一個完整週期對應 λ/(2n) 的厚度變化,所以條紋數 × λ/(2n) = 已蝕刻厚度。
   * **終點 = 條紋停止振盪的時刻**,與開口率無關。
   */
  function fringePeriodNm(sim) {
    return sim.lambda / (2 * sim.nFilm);
  }

  /** 同一個週期換算成時間 —— 這就是干涉終點的固有時間解析度 */
  function fringePeriodSec(sim) {
    return fringePeriodNm(sim) / sim.rate;
  }

  /** 整支製程總共會看到幾個條紋。少於約 1.5 個就沒東西可數了 */
  function fringeBudget(sim) {
    return sim.thickness / fringePeriodNm(sim);
  }

  function countFringes(sim) {
    /**
     * 過中線要加**遲滯**:雜訊會在中線附近來回穿越,
     * 純粹數符號變化會把 2.3 個條紋數成 13.5 個(實測)。
     * 要求先離開中線 ±h 才承認下一次穿越。
     */
    var s = movingAverage(sim.interf, 7);
    var mid = 0.5;
    var h = 0.12;
    var crossings = 0;
    var armed = 0; // +1 = 等著往下穿;−1 = 等著往上穿
    for (var i = 0; i < s.length; i++) {
      var d = s[i].v - mid;
      if (d > h) {
        if (armed <= 0) { if (armed < 0) crossings++; armed = 1; }
      } else if (d < -h) {
        if (armed >= 0) { if (armed > 0) crossings++; armed = -1; }
      }
    }
    return crossings / 2;
  }

  /**
   * 干涉終點偵測:找條紋振幅塌下來的時間。
   * 用滑動窗的振幅(max − min),振幅掉到一半以下就是刻完了。
   */
  function detectInterference(sim) {
    var s = sim.interf;
    /**
     * 窗寬**必須至少涵蓋一個條紋週期**,否則量到的「振幅」只是
     * 週期內的一小段,會隨相位起伏 —— 實測會在開頭就誤判成
     * 「振幅塌了」(終點誤差 −93 %)。
     * 一個條紋 = λ/(2n) 的厚度,除以蝕刻率就是它的時間長度。
     */
    var periodSec = fringePeriodNm(sim) / sim.rate;
    var win = Math.max(8, Math.round((periodSec / sim.dt) * 1.1));
    var amps = [];
    for (var i = 0; i + win < s.length; i++) {
      var lo = Infinity, hi = -Infinity;
      for (var k = i; k < i + win; k++) {
        if (s[k].v < lo) lo = s[k].v;
        if (s[k].v > hi) hi = s[k].v;
      }
      /**
       * 時間戳記掛在窗的**中點**。
       *
       * 這裡有一個做不掉的物理限制,值得寫清楚:振幅塌陷不是一瞬間,
       * 它是一段**斜坡** —— 從「窗還全在膜裡」(振幅滿) 到
       * 「窗已全在膜外」(振幅只剩雜訊),斜坡長度就是一個窗。
       * 掛起點會系統性**早報**半個窗(實測 −22.6 %),
       * 掛終點會系統性**晚報**半個窗。掛中點是無偏的,
       * 剩下的殘差是「最後一個條紋完不完整」造成的抖動 ——
       * 這就是干涉終點的固有解析度:**一個條紋週期**。
       * 見 fringePeriodSec()。真機是靠多波長 / 更快取樣壓下去的。
       */
      amps.push({ t: s[i + Math.floor(win / 2)].t, a: hi - lo });
    }
    /**
     * 條紋不夠就直接說不能用,而不是回一個 NaN 讓呼叫端自己猜。
     * 膜太薄(或波長太長)時整支製程走不完一個條紋,
     * 「振幅塌陷」根本沒有振幅可以塌 —— 這是干涉法自己的失效邊界,
     * 與開口率無關,課文要照實寫。
     */
    if (fringeBudget(sim) < 1) {
      return { t: NaN, error: NaN, usable: false, reason: "條紋不足一個週期" };
    }
    if (!amps.length) return { t: NaN, error: NaN, usable: false, reason: "取樣不足" };
    var peak = amps.reduce(function (m, x) { return Math.max(m, x.a); }, 0);
    for (var j = 0; j < amps.length; j++) {
      if (amps[j].a < peak * 0.5) {
        return {
          t: amps[j].t, usable: true,
          error: (amps[j].t - sim.tEnd) / sim.tEnd,
          absError: Math.abs(amps[j].t - sim.tEnd),
        };
      }
    }
    var last = amps[amps.length - 1];
    return { t: last.t, usable: true, error: (last.t - sim.tEnd) / sim.tEnd, absError: Math.abs(last.t - sim.tEnd) };
  }

  /**
   * 跑 N 次不同雜訊,回報 OES 終點的統計:
   * 平均絕對誤差,以及**誤觸發率**(誤差超過 10 % 就算失敗)。
   * A28 的驗收條件「開口率 < 0.1 % 時顯著不可靠」要靠這個才驗得準。
   */
  function reliability(state, algo, trials) {
    var n = trials || 12;
    var errs = [];
    var fails = 0;
    for (var k = 0; k < n; k++) {
      var sim = run(Object.assign({}, state, { seed: 1000003 * (k + 1) + 7 }));
      var d = detect(sim, algo || "ma");
      var rel = Math.abs(d.error);
      errs.push(rel);
      if (!(rel < 0.1)) fails++;
    }
    errs.sort(function (a, b) { return a - b; });
    return {
      median: errs[Math.floor(errs.length / 2)],
      mean: errs.reduce(function (a, b) { return a + b; }, 0) / errs.length,
      failRate: fails / n,
      trials: n,
    };
  }

  /**
   * 干涉終點的同一套統計 —— 用來證明它不受開口率影響。
   *
   * 失敗判準與 OES **不同**,而且必須不同:干涉法的固有解析度就是
   * 一個條紋週期,拿 10 % 去要求它是在罰它做不到的事。
   * 這裡的失敗定義是「誤差超過一個條紋週期」。
   */
  function reliabilityInterference(state, trials) {
    var n = trials || 12;
    var errs = [];
    var fails = 0;
    for (var k = 0; k < n; k++) {
      var sim = run(Object.assign({}, state, { seed: 1000003 * (k + 1) + 7 }));
      var d = detectInterference(sim);
      var rel = Math.abs(d.error);
      var tol = fringePeriodSec(sim) / sim.tEnd;
      errs.push(rel);
      if (!(rel < tol)) fails++;
    }
    errs.sort(function (a, b) { return a - b; });
    return {
      median: errs[Math.floor(errs.length / 2)],
      mean: errs.reduce(function (a, b) { return a + b; }, 0) / errs.length,
      failRate: fails / n,
      trials: n,
    };
  }

  /** OES 訊號的 SNR —— 訊號變化量 ÷ 雜訊 */
  function snr(sim, noiseMul) {
    var nm = noiseMul == null ? 1 : noiseMul;
    return sim.openArea / (DETECTOR_NOISE * nm);
  }

  var RANGES = {
    openAreaLog: { label: "開口率(log₁₀)", min: -4, max: -0.3, step: 0.1, unit: "" },
    noise: { label: "雜訊程度", min: 0.2, max: 3, step: 0.1, unit: " ×" },
    thickness: { label: "膜厚", min: 200, max: 1200, step: 50, unit: " nm" },
    rate: { label: "蝕刻率", min: 2, max: 15, step: 0.5, unit: " nm/s" },
  };

  PA.endpoint = {
    SIGNALS: SIGNALS,
    ALGOS: ALGOS,
    RANGES: RANGES,
    DETECTOR_NOISE: DETECTOR_NOISE,
    run: run,
    movingAverage: movingAverage,
    trailingAverage: trailingAverage,
    derivative: derivative,
    normalize: normalize,
    applyAlgo: applyAlgo,
    detect: detect,
    detectInterference: detectInterference,
    reliability: reliability,
    reliabilityInterference: reliabilityInterference,
    countFringes: countFringes,
    fringePeriodNm: fringePeriodNm,
    fringePeriodSec: fringePeriodSec,
    fringeBudget: fringeBudget,
    snr: snr,
  };
})((window.PA = window.PA || {}));
