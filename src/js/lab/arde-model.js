/* ==========================================================================
   arde-model.js — 深寬比依賴蝕刻(3.3 / A20)

   ARDE 不是一個效應,是**四個獨立的傳輸限制疊在一起**(docs/03 §3.3.2):

     1. Knudsen 傳輸限制  自由基要在孔壁上彈很多次才到得了底,
                          **黏著係數越高,途中被吃掉的越多**
     2. 離子遮蔽          有角度分佈的離子被孔口攔截,AR 越大攔掉越多
     3. 產物排出困難      SiF₄ 出不來,佔住表面 —— 壓力越高越排不掉
     4. 孔底充電          電子的角度分佈比離子寬,先被孔壁擋掉 →
                          孔底淨正電 → 排斥後續離子

   四項可以**個別關掉**,這是 A20 的重點:讓人看到各自貢獻多少,
   而不是把 ARDE 當成一個沒有內部結構的黑箱。

   **反向 ARDE** 用同一組傳輸規則:聚合物前驅物的黏著係數比自由基高得多,
   所以它更進不去窄孔 → 窄孔的鈍化反而少 → 窄孔刻得快。
   不是另外寫的模式,是「把鈍化也套上同一條傳輸公式」的結果。

   ⚠️ 教材用的簡化模型。定性趨勢與量級為目標,不做定量預測。
   ========================================================================== */

(function (PA) {
  "use strict";

  /**
   * 五種 CD(相對寬度)—— 並排同時蝕刻。
   *
   * 範圍刻意不要拉太開。原本取 1.0…0.25,最寬的刻到 AR 3 時最窄的已經到 AR 12,
   * 那已經超出真實 ARDE 研究的比較範圍,四個傳輸限制在 AR 12 全部飽和,
   * **任何旋鈕都救不動**(實測整組只在 46–65 % 之間動)。
   * 取 1.0…0.4 對應 AR 3…7.5,才是現場真的會並排比較的尺寸。
   */
  var WIDTHS = [1.0, 0.8, 0.65, 0.5, 0.4];

  /**
   * Knudsen 傳輸:自由基在深孔裡要多次碰壁才到得了底,
   * 每次碰壁都有機會被吸附掉。存活率隨「AR × 黏著係數」衰減。
   *
   * 黏著係數是這一項的**主旋鈕** —— 這也是為什麼低黏著係數的前驅物
   * (例如 3.4 的 TEOS)在深孔裡表現好得多。
   */
  function knudsen(ar, sticking) {
    return 1 / (1 + 2.2 * sticking * ar);
  }

  /**
   * 離子遮蔽:離子有角度分佈,偏斜的那些在半路就撞上孔壁。
   * 能到底的比例隨 AR × tanθ 下降。θ 由壓力決定(鞘層碰撞越多越發散)。
   */
  function shadowing(ar, divTan) {
    return 1 / (1 + Math.pow(2.6 * ar * divTan, 1.5));
  }

  /**
   * 產物排出:SiF₄ 要沿著同一條窄孔往外擴散。
   * 孔越深越排不掉,而**壓力越高背景越擁擠**,排出越慢。
   */
  function product(ar, pressure) {
    return 1 / (1 + 0.055 * ar * (pressure / 20));
  }

  /**
   * 孔底充電:電子的角度分佈比離子寬得多,先被孔壁擋掉,
   * 於是孔底淨帶正電,排斥後續的正離子。AR 越大越嚴重。
   * 脈衝電漿在 off 期讓電子進得來中和 —— 這是唯一有效的對策。
   */
  function charging(ar, pulseDuty) {
    var neutralize = pulseDuty == null ? 1 : pulseDuty; // 1 = 連續波(不中和)
    return 1 / (1 + 0.16 * ar * ar * neutralize);
  }

  /**
   * 側壁/孔底的鈍化 —— 反向 ARDE 的來源。
   * 聚合物前驅物的黏著係數高(取自由基的 3 倍),更進不去窄孔,
   * 所以**窄孔的鈍化反而薄**。
   */
  var POLY_STICKING = 0.85;

  function passivation(ar, polyStrength) {
    /**
     * 聚合物前驅物的黏著係數是**它自己的性質**,不是自由基黏著係數的倍數。
     * 原本寫成 sticking × 3,等於「自由基跑得動時聚合物也跟著跑得動」——
     * 那樣兩者的深度依賴太接近,窄孔的鈍化差異永遠贏不過通量差異,
     * 反向 ARDE 做不出來。真實的 CxFy 前驅物是大分子,黏著係數接近 1,
     * 與 F 自由基的 0.01–0.1 差了一個數量級以上 —— 這個落差正是反向 ARDE 的來源。
     */
    var reach = 1 / (1 + 2.2 * POLY_STICKING * ar);
    return polyStrength * reach;
  }

  var DEFAULTS = {
    pressure: 20,          // mTorr
    divTan: Math.tan((7 * Math.PI) / 180),
    sticking: 0.25,        // 自由基黏著係數
    polyStrength: 0,       // 聚合性氣體(反向 ARDE 要拉高)
    pulseDuty: 1,          // 1 = 連續波;< 1 = 脈衝,off 期中和充電
    on: { knudsen: true, shadow: true, product: true, charging: true },
  };

  /**
   * 某一條溝在目前深度下的瞬時蝕刻率。
   *
   * **移除與沉積是相減的競爭,不是相除的折扣。**
   * 第一版寫成 `傳輸 ÷ (1 + 鈍化)`,鈍化只能把速率按比例壓小,
   * 永遠翻不過傳輸限制 —— 反向 ARDE 因此做不出來(實測最低只到 +25 %,
   * 要把四個傳輸限制全部關掉才會變負,那等於沒有在解釋現象)。
   *
   * 寫成相減之後,窄孔「聚合物進不去所以要清的東西少」這件事
   * 才真的能贏過「窄孔的通量少」—— 這正是反向 ARDE 的物理。
   * 與 3.2 的 Bosch、3.4 的 HDP 用的是同一種寫法:讓兩個機制在同一格相減。
   */
  function rateAt(depth, width, s) {
    var ar = depth / width;
    var on = s.on || DEFAULTS.on;
    // 自由基驅動的化學項:受 Knudsen 傳輸與產物排出限制
    var chem = 1;
    if (on.knudsen) chem *= knudsen(ar, s.sticking);
    if (on.product) chem *= product(ar, s.pressure);
    // 離子驅動的方向性項:受遮蔽與孔底充電限制
    var ion = 1;
    if (on.shadow) ion *= shadowing(ar, s.divTan);
    if (on.charging) ion *= charging(ar, s.pulseDuty);
    var removal = 0.45 * chem + 0.55 * ion;
    // 聚合物沉積要先被清掉才輪得到蝕刻 —— 相減
    var dep = 0.12 * passivation(ar, s.polyStrength || 0);
    return Math.max(0, removal - dep);
  }

  /**
   * 離子角度發散由**壓力**決定 —— 鞘層裡的碰撞越多,離子偏得越厲害。
   * θ ≈ 1.5° + 1.1·√P(度):5 mTorr 約 4°,20 mTorr 約 6.4°,80 mTorr 約 11°。
   *
   * ⚠️ 第一版把 divTan 當成獨立參數,預設固定不動 —— 於是「降壓」預設
   * 只改到產物排出那一個小項,ARDE 幾乎沒變(62.4 % → 61.9 %),
   * 看起來像「降壓沒有用」。**壓力真正的威力是透過離子方向性來的**,
   * 沒接起來就把這一章最常用的旋鈕講廢了。
   */
  function divTanOf(pressure) {
    var deg = 1.5 + 1.1 * Math.sqrt(Math.max(0, pressure));
    return Math.tan((deg * Math.PI) / 180);
  }

  /** 從 state 補齊預設值 */
  function norm(state) {
    var s = state || {};
    var on = Object.assign({}, DEFAULTS.on, s.on || {});
    return {
      pressure: s.pressure == null ? DEFAULTS.pressure : s.pressure,
      divTan: s.divTan == null ? divTanOf(s.pressure == null ? DEFAULTS.pressure : s.pressure) : s.divTan,
      sticking: s.sticking == null ? DEFAULTS.sticking : s.sticking,
      polyStrength: s.polyStrength == null ? DEFAULTS.polyStrength : s.polyStrength,
      pulseDuty: s.pulseDuty == null ? DEFAULTS.pulseDuty : s.pulseDuty,
      on: on,
    };
  }

  /**
   * 積分到指定時間,回傳每條溝的深度。
   * 用固定步長的顯式積分 —— 速率隨深度單調下降,不會有穩定性問題。
   */
  function run(state, time, dt) {
    var s = norm(state);
    var h = dt || 0.02;
    var depths = WIDTHS.map(function () { return 0; });
    var t = 0;
    while (t < time) {
      for (var i = 0; i < WIDTHS.length; i++) {
        depths[i] += rateAt(depths[i], WIDTHS[i], s) * h;
      }
      t += h;
    }
    return depths.map(function (d, i) {
      return { width: WIDTHS[i], depth: d, ar: d / WIDTHS[i] };
    });
  }

  /**
   * 蝕到「最寬的那條達到目標深度」為止 —— 這才是現場的比較點。
   *
   * ⚠️ 不能用固定時間比。速率寫成 1/(1 + k·AR) 時,積分的漸近解是
   * d ∝ √w,**與 k 完全無關** —— 也就是說跑得夠久之後,
   * 不管壓力、黏著係數怎麼調,ARDE 都會收斂到同一個值(實測五種預設
   * 全部落在 62–63 %,旋鈕看起來完全沒有效果)。那是漸近行為,不是物理沒效。
   * 蝕到固定目標深度就沒有這個問題:k 小的時候窄溝跟得上,ARDE 就真的小。
   */
  function runToDepth(state, targetDepth, dt, maxTime) {
    var s = norm(state);
    var h = dt || 0.02;
    var lim = maxTime || 4000;
    var depths = WIDTHS.map(function () { return 0; });
    var t = 0;
    while (depths[0] < targetDepth && t < lim) {
      for (var i = 0; i < WIDTHS.length; i++) {
        depths[i] += rateAt(depths[i], WIDTHS[i], s) * h;
      }
      t += h;
    }
    var out = depths.map(function (d, i) {
      return { width: WIDTHS[i], depth: d, ar: d / WIDTHS[i] };
    });
    out.time = t;
    return out;
  }

  /**
   * ARDE 程度 = (最寬的深度 − 最窄的深度) / 最寬的深度。
   * 正值 = 一般 ARDE(窄的淺);**負值 = 反向 ARDE(窄的反而深)**。
   */
  function ardeMagnitude(results) {
    var wide = results[0].depth;
    var narrow = results[results.length - 1].depth;
    if (wide <= 0) return 0;
    return (wide - narrow) / wide;
  }

  /**
   * 把四個成因逐一關掉,看 ARDE 各掉多少 —— A20 的驗收條件。
   * 回傳每一項的「貢獻度」= 全開時的 ARDE − 只關掉這一項時的 ARDE。
   */
  function contributions(state, targetDepth) {
    var s = norm(state);
    var D = targetDepth || 3;
    var full = ardeMagnitude(runToDepth(s, D));
    var keys = ["knudsen", "shadow", "product", "charging"];
    var out = {};
    keys.forEach(function (k) {
      var off = Object.assign({}, s, { on: Object.assign({}, s.on) });
      off.on[k] = false;
      out[k] = full - ardeMagnitude(runToDepth(off, D));
    });
    out.full = full;
    return out;
  }

  var LABELS = {
    knudsen: "Knudsen 傳輸限制",
    shadow: "離子遮蔽",
    product: "產物排出困難",
    charging: "孔底充電",
  };

  var RANGES = {
    pressure: { label: "壓力", min: 2, max: 80, step: 1, unit: " mTorr" },
    sticking: { label: "自由基黏著係數", min: 0.01, max: 1, step: 0.01, unit: "" },
    // 上限 8:再高會連最寬的溝都在 AR≈0 就被聚合物封死(那是 etch stop,不是 ARDE)
    polyStrength: { label: "聚合性氣體", min: 0, max: 8, step: 0.25, unit: "" },
    pulseDuty: { label: "工作週期(1 = 連續波)", min: 0.2, max: 1, step: 0.05, unit: "" },
    time: { label: "蝕刻時間", min: 2, max: 40, step: 1, unit: "" },
  };

  var PRESETS = [
    {
      key: "normal", label: "一般 ARDE",
      state: { pressure: 20, sticking: 0.25, polyStrength: 0, pulseDuty: 1 },
      why: "四個傳輸限制同時作用:窄溝槽的自由基進不去、離子被遮蔽、產物排不出、孔底又充電。**窄的比寬的淺。**",
    },
    {
      key: "lowp", label: "降壓改善",
      state: { pressure: 5, sticking: 0.25, polyStrength: 0, pulseDuty: 1 },
      why: "降壓 → 離子角度發散小、產物也好排 → ARDE 明顯改善。這是最常用的第一個旋鈕。",
    },
    {
      key: "pulse", label: "脈衝電漿(中和充電)",
      state: { pressure: 20, sticking: 0.25, polyStrength: 0, pulseDuty: 0.4 },
      why: "off 期讓電子進得來中和孔底的正電荷 → 充電這一項幾乎消失。代價是平均速率下降。",
    },
    {
      key: "lowstick", label: "低黏著係數自由基",
      state: { pressure: 20, sticking: 0.05, polyStrength: 0, pulseDuty: 1 },
      why: "黏著係數低 → 自由基在孔壁上彈很多次也不會被吃掉 → 深孔裡的供應改善。與 3.4 的 TEOS 是同一個道理。",
    },
    {
      key: "poly", label: "高聚合區(ARDE 被壓小)",
      state: { pressure: 5, sticking: 0.06, polyStrength: 8, pulseDuty: 0.5 },
      why: "聚合物前驅物是大分子、黏著係數接近 1,**比自由基更進不去窄孔** → 窄孔要清掉的鈍化比較少 → ARDE 被壓小(實測 27 % → 18 %)。⚠️ 真實製程再往這個方向走會出現**反向 ARDE**(窄的反而更深),本模型只做到「壓小」,沒有做到翻負 —— 原因見章節內的說明。",
    },
  ];

  PA.arde = {
    WIDTHS: WIDTHS,
    DEFAULTS: DEFAULTS,
    LABELS: LABELS,
    RANGES: RANGES,
    PRESETS: PRESETS,
    knudsen: knudsen,
    shadowing: shadowing,
    product: product,
    charging: charging,
    passivation: passivation,
    POLY_STICKING: POLY_STICKING,
    divTanOf: divTanOf,
    rateAt: rateAt,
    norm: norm,
    run: run,
    runToDepth: runToDepth,
    ardeMagnitude: ardeMagnitude,
    contributions: contributions,
  };
})((window.PA = window.PA || {}));
