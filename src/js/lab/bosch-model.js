/* ==========================================================================
   bosch-model.js — Bosch 深矽蝕刻循環(3.2 / A19)

   Bosch 的全部祕密只有一句話:**把「保護」與「移除」分到不同的時間段**。

   SF₆ 蝕 Si 的速率極高但**完全等向** —— 單獨用會把側壁咬爛。
   分成循環之後,側壁在蝕刻步只暴露很短的時間就被下一輪聚合物蓋住,
   而溝底因為被離子打到,聚合物每一輪都會被清開 → 只有往下的方向持續前進。

   所以這支模型**不需要任何新規則** —— 直接用 profile-engine,
   在兩組參數之間交替就好:

     沉積步  effFC 低(C₄F₈)、離子能量低  → 全表面鋪聚合物
     蝕刻步  effFC 高(SF₆)、離子能量高    → 溝底聚合物被清開,F 等向咬 Si

   Scallop(扇貝紋)是這個交替的**必然副產品**,不是畫上去的:
   每一輪蝕刻步在側壁新露出的那一小段會被等向咬出一個弧,
   下一輪的聚合物再把它封住 —— 一輪一個弧。

   ⚠️ 教材用的簡化模型。定性趨勢與量級為目標,不做定量預測。
   ========================================================================== */

(function (PA) {
  "use strict";

  /** 遮罩薄、矽很厚 —— 深矽蝕刻的比例 */
  var LAYERS = [
    { material: "mask", thickness: 0.08 },
    { material: "silicon", thickness: 0.92 },
  ];
  var MASK_FRAC = LAYERS[0].thickness;
  var OPENING = [[0.42, 0.58]];

  var RANGES = {
    depTime: { min: 0, max: 10, step: 0.5, unit: " s", label: "沉積步時間(C₄F₈)" },
    etchTime: { min: 1, max: 15, step: 0.5, unit: " s", label: "蝕刻步時間(SF₆)" },
    bias: { min: 0, max: 100, step: 5, unit: "", label: "清底 bias" },
  };

  function makeProf(scale) {
    var k = scale || 1;
    return PA.profile.create({
      cols: Math.round(120 * k),
      rows: Math.round(140 * k),
      layers: LAYERS,
      openings: OPENING,
    });
  }

  /**
   * 沉積步:C₄F₈,F/C 很低 → 聚合物淨沉積。
   * 離子能量刻意壓低 —— 這一步不該把剛鋪好的東西又打掉。
   */
  function depParams() {
    return {
      effFC: 1.0,
      ionEnergy: 30,
      neutralRel: 1.2,
      ionDiv: Math.tan((4 * Math.PI) / 180),
      dt: 0.05,
    };
  }

  /**
   * 蝕刻步:SF₆,F/C 很高 → 不聚合、純 F 的等向蝕刻。
   * bias 決定溝底的聚合物清得多乾淨 —— 這是 Bosch 唯一需要方向性的地方。
   */
  function etchParams(bias) {
    return {
      effFC: 4.0,
      ionEnergy: 40 + (bias / 100) * 360,
      neutralRel: 1.5,
      ionDiv: Math.tan((4 * Math.PI) / 180),
      localCoverage: true,
      // 清底靠的是離子把聚合物打掉 —— 矽沒有氧可以幫忙,只能靠物理濺射
      polySputterRel: 14,
      // SF₆ 對 Si 的自發蝕刻又快又等向 —— 這才是 Bosch 要分步的原因
      chemRel: 7,
      dt: 0.05,
    };
  }

  function start(state, scale) {
    var prof = makeProf(scale);
    var sim = {
      prof: prof,
      state: state,
      center: 0.5,
      maskBottom: Math.round(MASK_FRAC * prof.rows) - 1,
      cycles: 0,
      steps: 0,
    };
    sim.openWidth = widthAtRow(prof, sim.maskBottom);
    return sim;
  }

  function widthAtRow(prof, y) {
    if (y < 0 || y >= prof.rows) return 0;
    var cx = Math.round(0.5 * (prof.cols - 1));
    if (prof.mat[prof.idx(cx, y)] !== 0) return 0;
    var w = 1;
    for (var x = cx - 1; x >= 0 && prof.mat[prof.idx(x, y)] === 0; x--) w++;
    for (var x2 = cx + 1; x2 < prof.cols && prof.mat[prof.idx(x2, y)] === 0; x2++) w++;
    return w;
  }

  /** 每「秒」換算成幾步 —— 時間軸與現場的秒對得起來 */
  var STEPS_PER_SEC = 4;

  /**
   * 每次切換氣體的固定開銷 [s]:換氣、抽掉上一步的殘氣、電漿重新穩定。
   * 一個循環有兩次切換,所以每循環固定花掉 2 × 這個值。
   *
   * **這一項不能省。** 沒有它,模型會得出「循環越短越好」——
   * scallop 更小、深度速率還更高,那 Bosch 就沒有任何理由用長循環了。
   * 真正讓短循環吃虧的正是這個固定開銷:循環越短,開銷佔比越高。
   * 課文說的「循環時間短 → scallop 小但產率低」只有加上它才成立。
   */
  var SWITCH_OVERHEAD_SEC = 0.6;

  /**
   * 跑一個完整循環:沉積 → 蝕刻。
   * depTime = 0 就等於「把沉積步關掉」,那正是驗收條件要示範的對照組。
   */
  function runCycle(sim) {
    var s = sim.state;
    var dp = depParams();
    var ep = etchParams(s.bias);
    var nDep = Math.round(s.depTime * STEPS_PER_SEC);
    var nEtch = Math.max(1, Math.round(s.etchTime * STEPS_PER_SEC));
    var i;
    for (i = 0; i < nDep; i++) { sim.prof.step(dp); sim.steps++; }
    for (i = 0; i < nEtch; i++) { sim.prof.step(ep); sim.steps++; }
    sim.cycles++;
    // 兩次切換的固定開銷:算進時間,但不推進蝕刻
    sim.overheadSec = (sim.overheadSec || 0) + 2 * SWITCH_OVERHEAD_SEC;
    return sim;
  }

  function run(sim, cycles) {
    for (var i = 0; i < cycles; i++) runCycle(sim);
    return sim;
  }

  /** 溝深(以列數計,從遮罩下緣起算) */
  function depth(sim) {
    return Math.max(0, sim.prof.depth(sim.center) - sim.maskBottom);
  }

  /** 溝內每一列的寬度 —— scallop 就藏在這條曲線的起伏裡 */
  function widthProfile(sim) {
    var out = [];
    var d = sim.prof.depth(sim.center);
    for (var y = sim.maskBottom + 1; y < d; y++) out.push(widthAtRow(sim.prof, y));
    return out;
  }

  /**
   * Scallop 振幅:沿深度的寬度起伏。
   *
   * 作法是**先去趨勢再量起伏**:用移動平均當基線,取殘差的平均絕對值 ×2。
   * 直接用 max−min 不行,那會把「整體越來越寬」也算進去(那是 taper);
   * 用局部極大/極小配對也不行,格點離散化會產生一整段平台,配對會漏掉。
   */
  function scallopAmplitude(sim) {
    var w = widthProfile(sim);
    if (w.length < 8) return 0;
    // 掐頭去尾:最上面受遮罩影響、最下面是還在推進的蝕刻前緣
    var lo = Math.floor(w.length * 0.1);
    var hi = Math.ceil(w.length * 0.85);
    var seg = w.slice(lo, hi);
    if (seg.length < 6) return 0;

    var win = 5;
    var sum = 0;
    var n = 0;
    for (var i = 0; i < seg.length; i++) {
      var a = Math.max(0, i - win);
      var b = Math.min(seg.length - 1, i + win);
      var acc = 0;
      for (var j = a; j <= b; j++) acc += seg[j];
      var base = acc / (b - a + 1);
      sum += Math.abs(seg[i] - base);
      n++;
    }
    return n ? (sum / n) * 2 : 0;
  }

  /** 側壁最大寬度相對開口 —— 沒有沉積步時側壁會被咬爛,靠這個抓 */
  function maxWidthRatio(sim) {
    var w = widthProfile(sim);
    if (!w.length || !sim.openWidth) return 1;
    return Math.max.apply(null, w) / sim.openWidth;
  }

  /** 每秒蝕刻深度 —— 循環時間與產率的 trade-off 靠這個量 */
  function rate(sim) {
    var sec = sim.steps / STEPS_PER_SEC + (sim.overheadSec || 0);
    return sec > 0 ? depth(sim) / sec : 0;
  }

  /** 切換開銷佔總時間的比例 —— 短循環吃虧就吃在這裡 */
  function overheadFraction(sim) {
    var proc = sim.steps / STEPS_PER_SEC;
    var oh = sim.overheadSec || 0;
    return proc + oh > 0 ? oh / (proc + oh) : 0;
  }

  function verdict(sim) {
    var ratio = maxWidthRatio(sim);
    var amp = scallopAmplitude(sim);
    if (depth(sim) < 3) return "幾乎沒刻進去";
    if (ratio > 1.6) return "側壁被咬爛 —— 沉積步不足";
    if (amp >= 2.5) return "可用,但 scallop 明顯(側壁粗糙)";
    if (amp >= 1) return "✅ 正常 Bosch:側壁有輕微 scallop";
    return "✅ 側壁光滑(接近 pseudo-Bosch)";
  }

  PA.boschModel = {
    RANGES: RANGES,
    LAYERS: LAYERS,
    STEPS_PER_SEC: STEPS_PER_SEC,
    depParams: depParams,
    etchParams: etchParams,
    start: start,
    runCycle: runCycle,
    run: run,
    depth: depth,
    widthProfile: widthProfile,
    scallopAmplitude: scallopAmplitude,
    maxWidthRatio: maxWidthRatio,
    rate: rate,
    overheadFraction: overheadFraction,
    SWITCH_OVERHEAD_SEC: SWITCH_OVERHEAD_SEC,
    verdict: verdict,
  };
})((window.PA = window.PA || {}));
