/* ==========================================================================
   profile-shapes.js — A18 的輪廓物理(與 UI 分離)

   為什麼要單獨一支:A18 的驗收條件是「八種 profile 全部可重現且視覺特徵
   明確可辨,參數方向與 3.3 圖鑑的對策一致」。這件事必須被自動檢查,
   而不是靠人眼看畫面。所以把物理從 UI closure 裡拿出來,
   讓 tools/check-shapes.mjs 在 Node 裡直接跑同一份程式碼。

   物理全部在 profile-engine.js 裡 —— 這一支只做兩件事:
     1. 把 A18 的五個滑桿翻譯成引擎的參數(滑桿→物理的對照表)
     2. 量出三段寬度並判定形狀(判定看量測值,不看使用者選了哪個預設)

   ⚠️ 教材用的簡化模型。定性趨勢與量級為目標,不做定量預測。
   ========================================================================== */

(function (PA) {
  "use strict";

  /** 五個滑桿的範圍 —— UI 與檢查共用,不會兩邊寫不一樣 */
  var RANGES = {
    ion: { min: 0, max: 1000, step: 25, unit: "eV", label: "離子能量" },
    spread: { min: 0, max: 15, step: 1, unit: "°", label: "離子角度發散(等效壓力)" },
    passiv: { min: 0, max: 100, step: 1, unit: "", label: "鈍化沉積速率" },
    radical: { min: 0, max: 100, step: 1, unit: "", label: "自由基通量" },
    reflect: { min: 0, max: 100, step: 1, unit: "", label: "離子鏡面反射" },
  };

  /**
   * 鈍化滑桿 → 有效 F/C 比。
   *
   * 引擎的分水嶺在 F/C = 3.4:高於它幾乎不聚合,低於它聚合物超線性增加。
   * 這裡把滑桿 0…100 映到 3.6…1.55,讓製程窗落在滑桿的中段:
   *   滑桿 0   → F/C 3.60  完全不聚合 → undercut
   *   滑桿 45  → F/C 2.68  側壁有保護、溝底清得開 → 垂直
   *   滑桿 78  → F/C 1.92  聚合物開始贏過移除 → taper
   *   滑桿 96  → F/C 1.51  連溝底都蓋住 → etch stop
   * 上界略高於 3.4 是刻意的 —— 滑桿最左端要真的「零聚合」。
   */
  function effFC(passiv) {
    return 3.6 - (passiv / 100) * 2.4;
  }

  /** 角度發散(度)→ tan θ,引擎要的是斜率 */
  function ionDiv(spreadDeg) {
    return Math.tan((spreadDeg * Math.PI) / 180);
  }

  /**
   * 自由基滑桿 → 中性粒子總量。
   * 它同比例放大 F 與聚合物前驅物 —— 加流量不會改變 F/C 比,
   * 這一點與 2.1 的結論一致(流量與配比是兩個獨立旋鈕)。
   */
  function neutralRel(radical) {
    return 0.45 + (radical / 100) * 1.1;
  }

  /** 把 A18 的狀態翻成引擎的一步參數 */
  function stepParams(s) {
    return {
      effFC: effFC(s.passiv),
      ionEnergy: s.ion,
      ionFluxRel: 1,
      neutralRel: neutralRel(s.radical),
      ionDiv: ionDiv(s.spread),
      ionReflect: (s.reflect || 0) / 100,
      /**
       * wallFlux —— 引擎那支「側壁的離子通量恆為 0」的修正,預設關閉。
       * 這裡把它從 A18 的狀態透傳下去,好讓 tools/shapes-search.mjs 能在
       * 開啟的情況下重搜八組預設。理由與下面的 polyLoss 同一套:
       * 修正本身是對的(側壁本來就該有通量,整段鏡面反射也才會生效),
       * 但打開之後八組預設全部要重新校準,所以先做成 opt-in;
       * 等重搜出來的參數確實讓 check-shapes 變好,再改預設。
       */
      wallFlux: !!s.wallFlux,
      localCoverage: true,
      angularYield: true,
      // 再沉積是 taper / footing 的成因,也讓側壁不再完美垂直,
      // 鏡面反射(bowing / microtrench)才有作用的餘地
      redeposition: 0.5,
      /**
       * polyLoss(聚合物自發損失)引擎有支援,但這裡**刻意不開**。
       * 它的動機是讓側壁膜厚有穩態值、讓 block 出現梯度(bowing 需要),
       * 但實測:0.05–0.4 都無法讓側壁出現「中段多被咬一點」,
       * 反而把 taper 的製程窗推掉(taper 變成 footing)。
       * 要用它必須連同 block 的飽和一起重新設計 —— 見 docs/11 的 A18 狀態表。
       */
      dt: 0.045,
    };
  }

  /**
   * stepParams 再套上 state.engine 的覆寫。
   *
   * ⚠️ 這個入口是刻意留的:從外面覆寫 `S.stepParams` **沒有效果**,
   * 因為 `step()` 呼叫的是模組內部的函式 —— 探測參數時踩過兩次這個坑,
   * 得到「這個參數沒有效果」的假結論(見 docs/11)。
   * 有了 engine 覆寫,參數搜尋就不必改檔案。
   */
  function paramsFor(s) {
    var p = stepParams(s);
    if (s.engine) {
      Object.keys(s.engine).forEach(function (k) { p[k] = s.engine[k]; });
    }
    return p;
  }

  /** 建立剖面。multi = 三個不同 CD 同時蝕刻,用來看 ARDE */
  var SINGLE_OPENING = [[0.42, 0.58]];
  var MULTI_OPENINGS = [[0.06, 0.13], [0.28, 0.42], [0.58, 0.86]];

  /**
   * 層結構是單一來源 —— maskBottom、終點深度、footing 的界面位置全部從這裡算,
   * 不寫死任何一個 0.78 之類的數字。
   *
   * 遮罩厚度 0.20 而不是 0.16:遮罩對 SiO₂ 的選擇比約 5–6,蝕穿 0.60 的膜
   * 要花掉約 0.11 的遮罩,再加上肩部的角度依賴損耗,0.16 撐不到終點 ——
   * 遮罩一消失,所有低鈍化的預設就全被判成 faceting。
   * 但也不能太厚:遮罩本身就是一個深井,太厚會把膜的側壁完全遮住,
   * 鈍化強弱就再也看不出差別(0.28 試過,八種預設全部糊成一樣)。
   */
  var MASK_FRAC = 0.2;
  var FILM_FRAC = 0.6;
  var IFACE_FRAC = MASK_FRAC + FILM_FRAC;

  /**
   * 目標膜可選 —— 這不是為了多一個旋鈕,是因為**側蝕本身是材料的性質**。
   *
   * 引擎的材料表裡 silicon 的 chem 是 1.0、oxide 只有 0.25,而 oxide 的
   * oxy = 1.0(氧會把聚合物燒掉)、silicon 是 0。也就是說:
   *   · F 自由基**自發**咬矽又快又等向 → 沒有側壁保護就會 undercut
   *   · SiO₂ 幾乎不自發反應,非得靠離子輔助 → 天生就比較不會側蝕
   * 這正是 3.1.4 講的化學選擇性。把膜固定成 oxide 再要求它 undercut,
   * 等於要求模型違反自己的材料表 —— undercut 該用矽膜示範
   * (現場的經典案例也正是 poly-Si gate 的側蝕,不是接觸孔)。
   *
   * 下層跟著換:矽膜配氧化層下層(poly gate 的閘極氧化層),
   * 氧化膜配矽下層(接觸孔打到矽)—— 兩者都是真實的堆疊。
   */
  var FILMS = {
    oxide: { film: "oxide", under: "silicon", label: "SiO₂(接觸孔)" },
    silicon: { film: "silicon", under: "oxide", label: "poly-Si(閘極)" },
    nitride: { film: "nitride", under: "silicon", label: "SiN(spacer)" },
  };

  function layersOf(film) {
    var f = FILMS[film] || FILMS.oxide;
    return [
      { material: "mask", thickness: MASK_FRAC },
      { material: f.film, thickness: FILM_FRAC },
      { material: f.under, thickness: 1 - IFACE_FRAC },
    ];
  }

  var LAYERS = layersOf("oxide");

  /**
   * scale < 1 會等比例縮小格點。深寬比與各層的相對厚度都不變,
   * 所以定性行為一致 —— 參數搜尋用得起,UI 仍用全尺寸。
   */
  function makeProf(multi, scale, film) {
    var k = scale || 1;
    return PA.profile.create({
      cols: Math.round((multi ? 200 : 140) * k),
      rows: Math.round(100 * k),
      layers: layersOf(film),
      openings: multi ? MULTI_OPENINGS : SINGLE_OPENING,
    });
  }

  /** 各開口的中心(相對位置)—— ARDE 要逐個量深度 */
  function openingCenters(multi) {
    return (multi ? MULTI_OPENINGS : SINGLE_OPENING).map(function (o) {
      return (o[0] + o[1]) / 2;
    });
  }

  /** 主要量測位置:單溝就是中央,多溝取最寬的那個(它最接近「無限寬」的基準) */
  function mainCenter(multi) {
    var c = openingCenters(multi);
    return c[c.length - 1];
  }

  /**
   * 建立一個可推進的模擬。
   * ref 是 t=0 的開口寬度與遮罩底緣位置 —— 所有百分比都以它為基準,
   * 所以「頂部 171 %」的意思很明確:遮罩下方比原始開口寬了 71 %。
   */
  function start(s, scale) {
    var prof = makeProf(s.multi, scale, s.film);
    var center = mainCenter(s.multi);
    var sim = {
      prof: prof,
      state: s,
      center: center,
      // 遮罩層的最下一列 —— t=0 時溝還沒開始,不能用 depth() 當基準
      maskBottom: Math.round(MASK_FRAC * prof.rows) - 1,
      steps: 0,
    };
    sim.openWidth = widthOfOpening(prof, sim.maskBottom, center);
    return sim;
  }

  /** 只量「這一個開口」的寬度 —— 多溝視圖下不能整列一起數 */
  function widthOfOpening(prof, y, centerRel) {
    if (y < 0 || y >= prof.rows) return 0;
    var cx = Math.round(centerRel * (prof.cols - 1));
    if (prof.mat[prof.idx(cx, y)] !== 0) return 0;
    var w = 1;
    for (var x = cx - 1; x >= 0 && prof.mat[prof.idx(x, y)] === 0; x--) w++;
    for (var x2 = cx + 1; x2 < prof.cols && prof.mat[prof.idx(x2, y)] === 0; x2++) w++;
    return w;
  }

  function step(sim, n) {
    var p = paramsFor(sim.state);
    for (var i = 0; i < (n || 1); i++) {
      sim.prof.step(p);
      sim.steps++;
    }
    return sim;
  }

  /** 目標膜的厚度(列)—— 蝕到這裡就是「到終點」 */
  function targetDepth(sim) {
    return Math.round(IFACE_FRAC * sim.prof.rows) - sim.maskBottom;
  }

  /**
   * 跑到終點再過蝕刻一段,然後才量。
   *
   * 為什麼不用固定步數:不同參數的蝕刻率差好幾倍,固定步數量到的是
   * 「不同深度的溝」,三段寬度就沒有可比性 —— 淺的看起來都像垂直。
   * 現場也是蝕到終點才量 CD,所以這裡照現場做:
   * 蝕到膜/下層界面(終點)→ 再過蝕刻 10 % 的時間 → 量。
   *
   * 蝕不到終點的參數(etch stop)在步數上限處回傳,depth 自然很小。
   */
  function runToEndpoint(sim, opts) {
    var o = opts || {};
    var maxSteps = o.maxSteps || 4000;
    var target = targetDepth(sim);
    var reached = false;
    while (sim.steps < maxSteps) {
      step(sim, 10);
      if (sim.prof.depth(sim.center) - sim.maskBottom >= target) {
        reached = true;
        break;
      }
    }
    sim.endpoint = reached ? sim.steps : null;
    if (reached) {
      var over = Math.max(1, Math.round(sim.steps * (o.overEtch == null ? 0.1 : o.overEtch)));
      step(sim, over);
    }
    return sim;
  }

  /**
   * 三段寬度 + 深度。
   *
   * 量測位置刻意取「深度的百分比」而不是固定列數 ——
   * 溝越深,中段與底部的位置就跟著往下,否則淺溝量到的「底部」
   * 其實還在溝的上半段,三個數字會全部糊在一起。
   *
   * 底部取 85 % 而不是最深那一列:蝕刻前緣本來就是弧形的,
   * 量在最深的那一格會把「前緣曲率」誤讀成 taper —— 這是量測假象,
   * 現場量 bottom CD 也一樣是量在底部稍上方。
   */
  function metrics(sim) {
    var prof = sim.prof;
    var top = sim.maskBottom;
    var d = prof.depth(sim.center);
    var h = d - top;
    var wTop = widthOfOpening(prof, top + 2, sim.center);
    var wMid = h > 8 ? widthOfOpening(prof, top + Math.round(h * 0.5), sim.center) : 0;
    var wBot = h > 8 ? widthOfOpening(prof, top + Math.round(h * 0.85), sim.center) : 0;
    var base = sim.openWidth || 1;
    return {
      depth: Math.max(0, d - top),
      depthPct: (Math.max(0, d - top) / prof.rows) * 100,
      wTop: wTop,
      wMid: wMid,
      wBot: wBot,
      base: sim.openWidth,
      top: (wTop / base) * 100,
      mid: (wMid / base) * 100,
      bot: (wBot / base) * 100,
    };
  }

  /**
   * 溝底的橫向蝕刻深度分佈 —— microtrench 只能靠這個看出來,
   * 三段寬度看不到「溝底兩側各一道深溝」。
   * 回傳溝內每一格的深度。
   */
  function bottomProfile(sim) {
    var prof = sim.prof;
    var top = sim.maskBottom;
    var w = widthOfOpening(prof, top + 1, sim.center);
    if (!w) return [];
    var cx = Math.round(sim.center * (prof.cols - 1));
    var x0 = cx;
    while (x0 > 0 && prof.mat[prof.idx(x0 - 1, top + 1)] === 0) x0--;
    var out = [];
    for (var x = x0; x < x0 + w && x < prof.cols; x++) {
      var dd = 0;
      for (var y = 0; y < prof.rows; y++) {
        if (prof.mat[prof.idx(x, y)] === 0) dd = y + 1;
        else break;
      }
      out.push(dd - top);
    }
    return out;
  }

  /**
   * microtrench 判定:溝底兩側比中央深。
   * 回傳「兩側最深處 − 中央」,正值越大越明顯。
   */
  function microtrenchDepth(sim) {
    var b = bottomProfile(sim);
    if (b.length < 7) return 0;
    var q = Math.max(1, Math.floor(b.length / 5));
    var edge = Math.max(
      Math.max.apply(null, b.slice(0, q)),
      Math.max.apply(null, b.slice(b.length - q))
    );
    var midStart = Math.floor(b.length / 2) - 1;
    var mid = Math.max.apply(null, b.slice(midStart, midStart + 3));
    return edge - mid;
  }

  /** 某一欄還剩幾格遮罩 */
  function maskThicknessAt(prof, x, maskRows) {
    var t = 0;
    for (var y = 0; y < maskRows; y++) {
      if (prof.mat[prof.idx(x, y)] === prof.materials.mask.id) t++;
    }
    return t;
  }

  /**
   * 遮罩的損耗 —— faceting 只能靠這個看出來。
   * 三段寬度全是量「膜裡的溝」,遮罩肩部被削成斜角完全反映不到上面。
   *
   * 關鍵是要量**相對**損耗:遮罩頂在整個製程中都被離子打,到處都會變薄,
   * 所以「絕對厚度掉了多少」不能區分 faceting —— 每一種預設都會掉。
   * faceting 的特徵是**肩部比遠處掉得更多**(斜面),所以量的是
   *   shoulder ÷ field
   * 以及遮罩上緣開口比下緣開口寬多少(斜面的另一種表現)。
   */
  function maskMetrics(sim) {
    var prof = sim.prof;
    var maskRows = sim.maskBottom + 1;
    var wTopRow = widthOfOpening(prof, 0, sim.center);
    var wBotRow = widthOfOpening(prof, sim.maskBottom, sim.center);

    // 開口左緣(以遮罩最下一列為準)
    var cx = Math.round(sim.center * (prof.cols - 1));
    var edge = cx;
    while (edge > 0 && prof.mat[prof.idx(edge - 1, sim.maskBottom)] === 0) edge--;

    var shoulder = maskThicknessAt(prof, Math.max(0, edge - 2), maskRows);
    // 遠處的遮罩:離開口夠遠,只被平面濺鍍,沒有肩部效應
    var field = maskThicknessAt(prof, Math.max(0, Math.round(edge - prof.cols * 0.2)), maskRows);

    return {
      shoulder: shoulder,
      field: field,
      // 肩部相對遠處的殘留;< 1 表示肩部被削得更兇
      shoulderRatio: field > 0 ? shoulder / field : 1,
      fieldLeft: field / maskRows,
      /**
       * 遮罩開口自己變寬了多少 —— 這才是 faceting 與 undercut 的分水嶺:
       *   faceting  遮罩被削掉 → **遮罩開口**變寬 → CD 直接失控
       *   undercut  遮罩完好 → 只有**膜**被側蝕 → 遮罩開口不變
       * 兩者在膜裡都是「上面寬」,只看膜分不開,要看遮罩還在不在。
       */
      widen: sim.openWidth ? wBotRow / sim.openWidth : 1,
      openTopRow: wTopRow,
      openBotRow: wBotRow,
    };
  }

  /**
   * 底角殘留 —— footing 只能靠這個看出來。
   * 溝底中央已經到界面,但兩個底角還留著膜 → 「腳」。
   * 回傳界面處的開口寬 ÷ 遮罩下方開口寬,越小代表腳越大。
   */
  function footRatio(sim) {
    var prof = sim.prof;
    var iface = Math.round(IFACE_FRAC * prof.rows) - 1;
    var wTop = widthOfOpening(prof, sim.maskBottom + 2, sim.center);
    if (!wTop) return 1;
    var wIface = widthOfOpening(prof, iface, sim.center);
    return wIface / wTop;
  }

  /** 各開口的深度 —— ARDE 用 */
  function depthsPerOpening(sim) {
    return openingCenters(sim.state.multi).map(function (c) {
      return {
        widthRel: c,
        depth: Math.max(0, sim.prof.depth(c) - sim.maskBottom),
      };
    });
  }

  /**
   * 由量出來的尺寸判定形狀 —— 不看使用者選了哪個預設。
   *
   * 順序就是現場判圖的順序:先看有沒有在刻,再看遮罩還在不在,
   * 然後看溝底、中段、頂部誰不對。放前面的優先,因為它們是更嚴重的問題:
   * 遮罩掉了(faceting)之後量 CD 已經沒有意義。
   */
  function classify(sim) {
    var m = metrics(sim);
    if (!m.base) return "—";
    if (m.depthPct < 8) return sim.steps > 150 ? "Etch stop" : "蝕刻中…";
    if (m.depth <= 6) return "蝕刻中…";

    // 遮罩開口自己變寬 = 遮罩守不住了,這時量膜的 CD 已經沒有意義
    var mask = maskMetrics(sim);
    if (mask.widen > 1.25) return "Faceting(遮罩肩部被削)";

    if (microtrenchDepth(sim) >= 3) return "Microtrench(溝底兩側深)";
    if (m.top > 125 && m.top >= m.mid) return "Undercut(頂部最寬)";
    if (m.mid > m.top * 1.12 && m.mid > 108) return "Bowing(中段最寬)";
    // taper 看的是側壁角度,不是絕對寬度 —— 現場量的也是這個
    if (m.top > 0 && m.bot / m.top < 0.8) return "Taper(上寬下窄)";
    // footing 是「只有最底下被夾住」:中段正常,界面處卻縮起來
    if (footRatio(sim) < 0.62 && m.mid > m.top * 0.9) return "Footing(底角沒清乾淨)";
    if (m.depthPct > 55) return "垂直 ✅";
    return "蝕刻中…";
  }

  PA.profileShapes = {
    RANGES: RANGES,
    effFC: effFC,
    ionDiv: ionDiv,
    neutralRel: neutralRel,
    stepParams: stepParams,
    paramsFor: paramsFor,
    FILMS: FILMS,
    layersOf: layersOf,
    makeProf: makeProf,
    openingCenters: openingCenters,
    mainCenter: mainCenter,
    start: start,
    step: step,
    targetDepth: targetDepth,
    runToEndpoint: runToEndpoint,
    metrics: metrics,
    bottomProfile: bottomProfile,
    microtrenchDepth: microtrenchDepth,
    maskMetrics: maskMetrics,
    footRatio: footRatio,
    depthsPerOpening: depthsPerOpening,
    classify: classify,
  };
})((window.PA = window.PA || {}));
