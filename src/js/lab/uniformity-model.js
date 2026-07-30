/* ==========================================================================
   uniformity-model.js — 晶圓均勻度(3.6 / A25)

   六種 map 形狀**不是六個選項**,是六個物理項的疊加結果:

     1. 氣體供應   噴淋頭分中心區與邊緣區;壓力越高橫向輸送越差 → 分區的痕跡越明顯
     2. 電場/鞘層  gap 越小,邊緣的電場終結效應越強 → 邊緣快
     3. 溫度       多區控溫,蝕刻率走 Arrhenius
     4. 聚焦環     消耗之後晶圓邊緣的鞘層畸變 → 最外圈急升/急降(edge roll)
     5. 抽氣不對稱 泵口在某一側 → 方位方向的壓力梯度 → 單邊偏斜
     6. 分區邊界   多區之間的交界本身就是一圈不連續 → 同心環紋

   W 形不是另外寫的規則:它是「中心快的氣體項」與「邊緣快的電場項」
   疊在一起、中間塌下去的必然結果。

   判定(classify)看的是**量出來的 map**,不是使用者選了哪個預設 ——
   與 A18 同一個原則:不能用「你選了 X 所以我說是 X」來自我證明。

   ⚠️ 教材用的簡化模型。定性趨勢與量級為目標,不做定量預測。
   ========================================================================== */

(function (PA) {
  "use strict";

  var NR = 24; // 徑向取樣點
  var NT = 48; // 方位取樣點

  /**
   * 三個控溫區的邊界(相對半徑)。分區邊界本身就是同心環紋的來源 ——
   * 真實 ESC 的分區交界處確實會留下一圈痕跡。
   */
  var ZONES = [0.38, 0.74];

  function zoneOf(r) {
    if (r < ZONES[0]) return 0;
    if (r < ZONES[1]) return 1;
    return 2;
  }

  /**
   * 溫度 → 相對速率。Arrhenius:蝕刻/沉積速率對溫度是指數依賴,
   * 所以**溫度是修均勻度最直接的旋鈕**(3.6.4)。
   * Ea 取 0.12 eV,對應**每 10 °C 約差 13 %**。
   * (原本寫 0.2 eV 並註「約差 8 %」—— 實際算出來是 22.5 %,註解與數字對不上。
   *  溫度確實是很強的旋鈕,但沒有那麼強;以量出來的為準。)
   */
  function arrhenius(tempC) {
    var Ea = 0.12;
    var k = 8.617e-5;
    var T0 = 60 + 273.15;
    var T = tempC + 273.15;
    return Math.exp((-Ea / k) * (1 / T - 1 / T0));
  }

  /**
   * 分區溫度 → 連續的溫度剖面。
   * 區與區之間用有限寬度過渡(真實的熱擴散會抹平一點,但抹不完)——
   * 過渡帶越窄,交界的環紋越明顯。
   */
  function tempAt(r, zoneTemps, sharp) {
    // 過渡帶越窄,交界的環紋越銳利。真實機台的分區隔熱做得越好,環紋越明顯
    var w = sharp == null ? 0.05 : sharp;
    var t = zoneTemps[zoneOf(r)];
    for (var i = 0; i < ZONES.length; i++) {
      var d = r - ZONES[i];
      if (Math.abs(d) < w) {
        var f = (d + w) / (2 * w);
        t = zoneTemps[i] * (1 - f) + zoneTemps[i + 1] * f;
      }
    }
    return t;
  }

  /**
   * 氣體供應項。噴淋頭分中心/邊緣兩區,centerFrac 是中心區的分配比例。
   *
   * **壓力是關鍵的放大器**:壓力高 → 平均自由徑短 → 橫向輸送差 →
   * 噴淋頭的分區圖形直接印在晶圓上;壓力低 → 自由基跑得動 → 分區被抹平。
   * 這就是為什麼同一台機、同一個噴淋頭,換壓力就換一種 map。
   */
  function gasTerm(r, centerFrac, pressure) {
    var localize = Math.min(1, pressure / 60); // 壓力越高,分區越「印」得上去
    /**
     * 兩個供應區的分佈要**夠寬、夠重疊**。第一版取 0.55 / 0.45,
     * 兩個高斯在中間半徑都衰減掉,於是「只有氣體項」也會凹一個假的 W ——
     * 那樣 W 形就不是「中心快 + 邊緣快疊加」的結果了,論述會落空。
     * 放寬到 0.75 / 0.62 之後,單獨的氣體項是單調的。
     */
    var center = Math.exp(-Math.pow(r / 0.75, 2));
    var edge = Math.exp(-Math.pow((r - 1) / 0.62, 2));
    var supply = centerFrac * center + (1 - centerFrac) * edge;
    var flat = centerFrac * 0.5 + (1 - centerFrac) * 0.5;
    return 1 + localize * (supply - flat) * 1.6;
  }

  /**
   * 電場/鞘層項。gap 越小,邊緣的電場終結效應越強 → 邊緣的離子通量越高。
   * 這一項天生是**邊緣快**的,和氣體項(通常中心快)方向相反 ——
   * 兩者疊加就是 W 形的來源。
   */
  function fieldTerm(r, gapCm) {
    var strength = Math.max(0, (5 - gapCm) / 4); // gap 小 → 效應強
    return 1 + strength * 0.45 * Math.exp(-Math.pow((r - 1) / 0.3, 2));
  }

  /**
   * 聚焦環項 —— 只作用在最外圈。
   *
   * 環是新的(wear 0)時,它把鞘層平順地延伸出晶圓外,邊緣沒有異常。
   * 環消耗之後高度降低,晶圓邊緣的鞘層開始彎曲 → 最外圈幾 mm 的離子
   * 入射角與通量都變 → **edge roll**。這是先進製程換聚焦環最頻繁的原因,
   * 也是可動聚焦環要解的問題。
   */
  function ringTerm(r, wear) {
    if (r < 0.88) return 1;
    var f = (r - 0.88) / 0.12;
    return 1 + (wear / 100) * 0.75 * Math.pow(f, 2);
  }

  /**
   * 抽氣不對稱項 —— 泵口在某一側,造成方位方向的壓力梯度。
   * 這是唯一一個**非軸對稱**的項,所以它產生的圖形轉晶圓也不會跟著轉
   * (3.6.2 的「轉片實驗」就是在測這件事)。
   */
  function pumpTerm(r, theta, asym, pumpAngle) {
    return 1 + (asym / 100) * 0.35 * r * Math.cos(theta - pumpAngle);
  }

  /**
   * 產生一張 map。回傳極座標格點上的相對速率。
   * state:{ gap, pressure, centerFrac, zoneTemps:[c,m,e], ringWear, pumpAsym, pumpAngle }
   */
  function makeMap(state) {
    var s = state || {};
    var gap = s.gap == null ? 3 : s.gap;
    var pressure = s.pressure == null ? 30 : s.pressure;
    var centerFrac = s.centerFrac == null ? 0.5 : s.centerFrac;
    var zoneTemps = s.zoneTemps || [60, 60, 60];
    var ringWear = s.ringWear == null ? 0 : s.ringWear;
    var pumpAsym = s.pumpAsym == null ? 0 : s.pumpAsym;
    var pumpAngle = s.pumpAngle == null ? 0 : s.pumpAngle;

    var cells = [];
    var radial = [];
    for (var i = 0; i < NR; i++) {
      var r = (i + 0.5) / NR;
      var base = gasTerm(r, centerFrac, pressure) * fieldTerm(r, gap) * ringTerm(r, ringWear);
      var th = arrhenius(tempAt(r, zoneTemps, s.zoneSharp));
      var rowSum = 0;
      for (var j = 0; j < NT; j++) {
        var theta = (j / NT) * Math.PI * 2;
        var v = base * th * pumpTerm(r, theta, pumpAsym, pumpAngle);
        cells.push({ r: r, theta: theta, v: v });
        rowSum += v;
      }
      radial.push({ r: r, v: rowSum / NT });
    }
    return { cells: cells, radial: radial, NR: NR, NT: NT, state: s };
  }

  /* ---------------------------------------------------------------------
     3.6.1 的兩種不均勻度定義 —— 兩個都要顯示
     --------------------------------------------------------------------- */

  function stats(map) {
    var vs = map.cells.map(function (c) { return c.v; });
    var n = vs.length;
    var mean = vs.reduce(function (a, b) { return a + b; }, 0) / n;
    var max = Math.max.apply(null, vs);
    var min = Math.min.apply(null, vs);
    var varSum = vs.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0);
    var sigma = Math.sqrt(varSum / n);
    return {
      mean: mean,
      max: max,
      min: min,
      /** 半幅法:(Max − Min) / (2 × Mean) */
      halfWidth: ((max - min) / (2 * mean)) * 100,
      /** 標準差法:1σ / Mean */
      oneSigma: (sigma / mean) * 100,
    };
  }

  /* ---------------------------------------------------------------------
     由 map 反推形狀 —— 看量出來的東西,不看使用者選了什麼
     --------------------------------------------------------------------- */

  /** 方位方向的不對稱幅度(擬合 cos 的振幅 ÷ 平均) */
  function tiltAmplitude(map) {
    var sc = 0;
    var ss = 0;
    var sum = 0;
    for (var i = 0; i < map.cells.length; i++) {
      var c = map.cells[i];
      sc += c.v * Math.cos(c.theta) * c.r;
      ss += c.v * Math.sin(c.theta) * c.r;
      sum += c.v;
    }
    var n = map.cells.length;
    var amp = (2 * Math.sqrt(sc * sc + ss * ss)) / n;
    return amp / (sum / n);
  }

  /**
   * Edge roll —— 最外圈**偏離內部趨勢**多少,不是「最外圈比肩部高多少」。
   *
   * 差別很重要:bull's eye 的剖面本來就一路往下掉,最外圈當然比肩部低,
   * 但那是**整體趨勢**,不是邊緣異常。用「外圈 − 肩部」會把每一張
   * 中心快的 map 都誤判成 edge roll(實測就是這樣)。
   *
   * 正確的做法是拿 r = 0.5…0.85 的線性趨勢外推到最外圈,
   * 量**殘差** —— 這才是「最後幾 mm 做了別的事」。
   */
  function edgeRoll(map) {
    var rad = map.radial;
    var lo = Math.round(rad.length * 0.5);
    var hi = Math.round(rad.length * 0.85);
    var n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (var i = lo; i <= hi && i < rad.length; i++) {
      var x = rad[i].r, y = rad[i].v;
      n++; sx += x; sy += y; sxx += x * x; sxy += x * y;
    }
    if (n < 3) return 0;
    var den = n * sxx - sx * sx;
    if (Math.abs(den) < 1e-12) return 0;
    var slope = (n * sxy - sx * sy) / den;
    var icept = (sy - slope * sx) / n;
    var last = rad[rad.length - 1];
    var predicted = slope * last.r + icept;
    return (last.v - predicted) / (sy / n);
  }

  /** 徑向剖面的內部極值(W / M 形的判據) */
  function interiorDip(map) {
    var rad = map.radial;
    var lo = Math.round(rad.length * 0.2);
    var hi = Math.round(rad.length * 0.8);
    var minV = Infinity;
    var minI = -1;
    for (var i = lo; i <= hi; i++) {
      if (rad[i].v < minV) { minV = rad[i].v; minI = i; }
    }
    if (minI < 0) return 0;
    var inner = rad[0].v;
    var outer = rad[hi].v;
    // 兩端都比中間高,才算塌下去
    var d = Math.min(inner, outer) - minV;
    return d / rad[0].v;
  }

  /**
   * 環紋 = **銳利的台階**,不是「起伏」。
   *
   * 這是同心環紋與 W 形唯一可靠的分界:
   *   · W 形是一個**平緩**的凹 —— 曲率小而分佈廣
   *   · 環紋是分區邊界造成的**局部不連續** —— 曲率在特定半徑上尖起來
   * 所以數的是「二階差分的尖峰個數」,不是斜率變號次數。
   * (第一版用變號次數,結果 W 形也被算成環紋 —— 兩者的斜率都會變號。)
   */
  function ringiness(map) {
    var rad = map.radial;
    var mean = rad.reduce(function (a, b) { return a + b.v; }, 0) / rad.length;
    var d2 = [];
    for (var i = 1; i < rad.length - 1; i++) {
      d2.push(Math.abs(rad[i + 1].v - 2 * rad[i].v + rad[i - 1].v) / mean);
    }
    /**
     * 「尖」必須相對於**背景曲率**來判,不能用固定門檻:
     * 平緩的 W 形也會有一堆小起伏越過固定門檻(實測平緩的反而數到比銳利的多)。
     * 取中位數當背景,只有明顯高出背景數倍的才算一圈。
     */
    var sorted = d2.slice().sort(function (a, b) { return a - b; });
    var med = sorted[Math.floor(sorted.length / 2)] || 1e-9;
    var count = 0;
    for (var k = 1; k < d2.length - 1; k++) {
      if (d2[k] > med * 4 && d2[k] > 0.002 && d2[k] >= d2[k - 1] && d2[k] >= d2[k + 1]) count++;
    }
    return count;
  }

  function classify(map) {
    var st = stats(map);
    var tilt = tiltAmplitude(map);
    var roll = edgeRoll(map);
    var dip = interiorDip(map);
    var rings = ringiness(map);
    var rad = map.radial;
    var center = rad[0].v;
    var edge = rad[rad.length - 1].v;

    // 幾乎平坦就不必談形狀
    if (st.halfWidth < 1.2) return "均勻 ✅";
    // 非軸對稱優先:它是唯一「轉片不跟著轉」的一種,診斷路徑完全不同
    if (tilt > 0.035) return "單邊偏斜(tilt)";
    // 最外圈急升/急降
    if (Math.abs(roll) > 0.12) return "Edge roll(極邊緣異常)";
    if (rings >= 2) return "同心環紋";
    if (dip > 0.03) return "W 形(中間塌)";
    if (center > edge * 1.05) return "中心快(bull's eye)";
    if (edge > center * 1.05) return "邊緣快";
    return "均勻 ✅";
  }

  /**
   * 六種 map 的代表配方 —— 每一種都只靠物理旋鈕,沒有「形狀」這個參數。
   * A25 的驗收條件就是這六個都要被 classify 判對。
   */
  var PRESETS = [
    {
      key: "center", label: "中心快(bull's eye)", expect: "中心快(bull's eye)",
      state: { gap: 4.5, pressure: 60, centerFrac: 0.85, zoneTemps: [60, 60, 60], ringWear: 0, pumpAsym: 0 },
      why: "氣體大部分從中心區進,而壓力高讓自由基橫向跑不動 —— 噴淋頭的分區圖形直接印在晶圓上。",
    },
    {
      key: "edge", label: "邊緣快", expect: "邊緣快",
      state: { gap: 1.2, pressure: 20, centerFrac: 0.2, zoneTemps: [60, 60, 60], ringWear: 0, pumpAsym: 0 },
      why: "氣體偏邊緣區,而且 gap 小 → 邊緣的電場終結效應強,離子通量在邊緣更高。兩個效應同向疊加。",
    },
    {
      key: "w", label: "W 形(中間塌)", expect: "W 形(中間塌)",
      state: { gap: 1.0, pressure: 55, centerFrac: 0.62, zoneTemps: [60, 60, 60], ringWear: 0, pumpAsym: 0 },
      why: "中心快的氣體項 + 邊緣快的電場項,兩者方向相反 → 中間半徑兩邊都不討好,塌下去。**W 形不是另一種缺陷,是兩個正常效應的疊加。**",
    },
    {
      key: "tilt", label: "單邊偏斜(tilt)", expect: "單邊偏斜(tilt)",
      state: { gap: 3, pressure: 30, centerFrac: 0.5, zoneTemps: [60, 60, 60], ringWear: 0, pumpAsym: 70 },
      why: "泵口在某一側造成方位方向的壓力梯度。**這是唯一轉晶圓也不會跟著轉的一種** —— 轉片實驗一測就知道。",
    },
    {
      key: "rings", label: "同心環紋", expect: "同心環紋",
      state: { gap: 3, pressure: 25, centerFrac: 0.5, zoneTemps: [64, 59, 63], zoneSharp: 0.012, ringWear: 0, pumpAsym: 0 },
      why: "多區控溫的分區交界本身就是一圈不連續。速率對溫度是 Arrhenius 依賴,幾度的落差就看得出環。",
    },
    {
      key: "edgeroll", label: "Edge roll(聚焦環消耗)", expect: "Edge roll(極邊緣異常)",
      state: { gap: 3, pressure: 30, centerFrac: 0.5, zoneTemps: [60, 60, 60], ringWear: 100, pumpAsym: 0 },
      why: "聚焦環消耗後高度降低,晶圓最外圈的鞘層開始彎曲 → 最後幾 mm 急升。**聚焦環是消耗最快的零件**,先進機台已導入可動聚焦環自動補償。",
    },
  ];

  var RANGES = {
    gap: { label: "Gap(上下電極間距)", min: 1, max: 5, step: 0.1, unit: " cm" },
    pressure: { label: "壓力", min: 5, max: 80, step: 1, unit: " mTorr" },
    centerFrac: { label: "噴淋頭中心區分配", min: 0, max: 1, step: 0.05, unit: "" },
    ringWear: { label: "聚焦環消耗", min: 0, max: 100, step: 5, unit: " %" },
    zoneSharp: { label: "分區交界銳利度", min: 0.01, max: 0.09, step: 0.005, unit: "" },
    pumpAsym: { label: "抽氣不對稱(泵口)", min: 0, max: 100, step: 5, unit: " %" },
    tCenter: { label: "中心區溫度", min: 40, max: 90, step: 1, unit: " °C" },
    tMid: { label: "中環溫度", min: 40, max: 90, step: 1, unit: " °C" },
    tEdge: { label: "邊緣區溫度", min: 40, max: 90, step: 1, unit: " °C" },
  };

  PA.uniformity = {
    NR: NR, NT: NT, ZONES: ZONES,
    arrhenius: arrhenius,
    tempAt: tempAt,
    gasTerm: gasTerm,
    fieldTerm: fieldTerm,
    ringTerm: ringTerm,
    pumpTerm: pumpTerm,
    makeMap: makeMap,
    stats: stats,
    tiltAmplitude: tiltAmplitude,
    edgeRoll: edgeRoll,
    interiorDip: interiorDip,
    ringiness: ringiness,
    classify: classify,
    PRESETS: PRESETS,
    RANGES: RANGES,
  };
})((window.PA = window.PA || {}));
