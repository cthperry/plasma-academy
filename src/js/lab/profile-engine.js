/* ==========================================================================
   profile-engine.js — 蝕刻輪廓演化引擎

   由 A10(F/C 比滑桿)建立,P3 的 A18 輪廓模擬器、A19 Bosch、A20 ARDE、
   A22 PEALD、A23 HDP 填溝都繼承這一支。

   模型的骨架只有三件事,其餘都是它們的組合:

     1. 通量  —— 離子是方向性的(會被遮蔽),自由基是等向的(會被深寬比削弱)
     2. 鈍化  —— 聚合物到處沉積,但只有被離子打到的地方會被清掉
     3. 移除  —— 表面有聚合物就擋著;沒有,才輪到化學與離子輔助蝕刻

   側壁之所以能垂直,就是因為 (1) 讓它收不到離子、(2) 因此聚合物留著。
   把這三件事寫對,undercut / taper / etch stop / 選擇比會自己長出來,
   不必為每種輪廓各寫一套規則。

   ⚠️ 教材用的簡化模型。定性趨勢與量級為目標,不做定量預測。
   ========================================================================== */

(function (PA) {
  "use strict";

  // 材料。oxy 是「自身能提供多少氧來消耗聚合物」——
  // 這一欄就是 SiO₂ 對 Si 選擇比的來源,不是另外寫死的規則。
  var MATERIALS = {
    vacuum: { id: 0, token: "bg", oxy: 0, chem: 0, ionY: 0 },
    mask: { id: 1, token: "vizMask", oxy: 0.15, chem: 0.06, ionY: 0.35 },
    oxide: { id: 2, token: "vizFilm", oxy: 1.0, chem: 0.25, ionY: 1.0 },
    nitride: { id: 3, token: "vizPolymer", oxy: 0.3, chem: 0.45, ionY: 0.85 },
    silicon: { id: 4, token: "vizSubstrate", oxy: 0.0, chem: 1.0, ionY: 0.9 },
  };

  var BY_ID = {};
  Object.keys(MATERIALS).forEach(function (k) {
    MATERIALS[k].key = k;
    BY_ID[MATERIALS[k].id] = MATERIALS[k];
  });

  /** 濺射閾值以上的離子輔助產額 ∝ √E − √E_th(Steinbrüchel) */
  function ionYield(E_eV, Eth_eV) {
    var th = Eth_eV == null ? 25 : Eth_eV;
    if (E_eV <= th) return 0;
    return Math.sqrt(E_eV) - Math.sqrt(th);
  }

  /**
   * 建立一個剖面
   * opts: { cols, rows, layers: [{ material, thickness }], openings: [[x0,x1], ...] }
   *   layers 由上往下堆;openings 是遮罩的開口(以 0…1 的相對位置給)
   */
  function create(opts) {
    var cols = opts.cols || 160;
    var rows = opts.rows || 100;
    var n = cols * rows;

    var mat = new Uint8Array(n); // 材料 id
    var poly = new Float32Array(n); // 表面聚合物厚度(任意單位)
    var frac = new Float32Array(n); // 該格已被咬掉的比例 0…1

    var api = {
      cols: cols,
      rows: rows,
      mat: mat,
      poly: poly,
      frac: frac,
      materials: MATERIALS,
      byId: BY_ID,
      time: 0,
    };

    function idx(x, y) {
      return y * cols + x;
    }
    api.idx = idx;

    /** 依 layers / openings 重建初始結構 */
    api.reset = function (layers, openings) {
      mat.fill(0);
      poly.fill(0);
      frac.fill(0);
      api.time = 0;

      var y = 0;
      (layers || opts.layers || []).forEach(function (L) {
        var h = Math.round(L.thickness * rows);
        var m = MATERIALS[L.material];
        for (var yy = y; yy < Math.min(y + h, rows); yy++) {
          for (var x = 0; x < cols; x++) mat[idx(x, yy)] = m.id;
        }
        y += h;
      });
      // 最底下填滿最後一層,避免留空
      if (y < rows) {
        var last = (layers || opts.layers || []).slice(-1)[0];
        var lm = last ? MATERIALS[last.material].id : MATERIALS.silicon.id;
        for (var yy2 = y; yy2 < rows; yy2++) {
          for (var x2 = 0; x2 < cols; x2++) mat[idx(x2, yy2)] = lm;
        }
      }

      // 挖開遮罩的開口 —— 只挖遮罩層,底下的膜要留著讓它自己被蝕
      var maskId = MATERIALS.mask.id;
      (openings || opts.openings || []).forEach(function (o) {
        var x0 = Math.round(o[0] * cols);
        var x1 = Math.round(o[1] * cols);
        for (var yy = 0; yy < rows; yy++) {
          for (var x = x0; x < x1; x++) {
            if (mat[idx(x, yy)] === maskId) mat[idx(x, yy)] = 0;
          }
        }
      });
    };

    /** 這一格是不是暴露在電漿中(上下左右有空格) */
    function exposed(x, y) {
      if (mat[idx(x, y)] === 0) return false;
      if (y > 0 && mat[idx(x, y - 1)] === 0) return true;
      if (y < rows - 1 && mat[idx(x, y + 1)] === 0) return true;
      if (x > 0 && mat[idx(x - 1, y)] === 0) return true;
      if (x < cols - 1 && mat[idx(x + 1, y)] === 0) return true;
      return false;
    }
    api.exposed = exposed;

    /**
     * 離子通量:垂直入射,被上方任何材料遮住就收不到。
     * 側壁是垂直的,正上方一定被自己上緣擋著 → 幾乎為 0。
     * 這一條就是異向性的全部來源。
     */
    function ionFlux(x, y) {
      for (var yy = y - 1; yy >= 0; yy--) {
        if (mat[idx(x, yy)] !== 0) return 0;
      }
      return 1;
    }
    api.ionFlux = ionFlux;

    /**
     * 自由基通量:等向入射,所以看的是「這一格能看到多少上方的天空」。
     * 深溝裡看到的立體角小 → 通量低 —— ARDE / RIE lag 由此而來,
     * 不必另外寫規則。
     */
    function neutralFlux(x, y) {
      var open = 0;
      var total = 0;
      // 以 ±60° 的扇形取樣視線
      for (var a = -6; a <= 6; a++) {
        total++;
        var dx = a / 7; // 斜率
        var blocked = false;
        for (var yy = y - 1; yy >= 0; yy--) {
          var xx = Math.round(x + dx * (y - yy));
          if (xx < 0 || xx >= cols) break;
          if (mat[idx(xx, yy)] !== 0) {
            blocked = true;
            break;
          }
        }
        if (!blocked) open++;
      }
      return open / total;
    }
    api.neutralFlux = neutralFlux;

    /**
     * 推進一步
     * p: {
     *   effFC       有效 F/C 比
     *   ionEnergy   離子能量 [eV]
     *   ionFluxRel  離子通量相對值(bias 之外的密度因素)
     *   dt          步長
     *   polyCrit    聚合物擋住蝕刻的門檻厚度
     * }
     * 回傳三個代表位置的淨速率,供 UI 標示:溝底 / 側壁 / 遮罩頂
     */
    api.step = function (p) {
      var dt = p.dt || 1;
      var effFC = p.effFC;
      var E = p.ionEnergy;
      var iRel = p.ionFluxRel == null ? 1 : p.ionFluxRel;
      var polyCrit = p.polyCrit == null ? 1 : p.polyCrit;

      // F 自由基的相對量 ∝ 有效 F/C;聚合物前驅物則相反。
      // 3.4 附近是分水嶺:高於它幾乎不聚合(CF₄ 那一端),
      // 低於它聚合物快速增加(C₄F₈ / CH₃F 那一端),而且是超線性的。
      var fRad = Math.max(0, effFC) / 4;
      var depRate = Math.pow(Math.max(0, 3.4 - effFC), 1.6) * 0.9;

      var yi = ionYield(E, 25);

      var sample = { bottom: 0, wall: 0, mask: 0 };
      var bestBottom = -1;

      // 先算出所有暴露格的變化量,再一次套用,避免同一步內互相影響
      var dPoly = new Float32Array(0);
      var updates = [];

      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var i = idx(x, y);
          if (mat[i] === 0) continue;
          if (!exposed(x, y)) continue;

          var m = BY_ID[mat[i]];
          var fi = ionFlux(x, y) * iRel;
          var fn = neutralFlux(x, y);

          // --- 聚合物收支 ---
          var dep = depRate * fn;
          /**
           * 聚合物的移除有兩條路,而選擇比就藏在兩者的比例裡:
           *   a) 離子物理濺射 —— 所有材料一視同仁
           *   b) 材料自身放出的氧把碳燒成 CO/CO₂ —— 只有含氧材料有
           * (b) 需要離子先把反應打開,所以同樣正比於 fi·yi。
           * 於是在 SiO₂ 表面聚合物被清得快、蝕刻繼續;
           * 在 Si 表面只剩 (a),聚合物越積越厚 → 蝕刻停住。
           * 這就是課文說的「離子輔助聚合物移除機制」,不是另外寫死的規則。
           */
          var rem = fi * yi * (0.03 + m.oxy * 0.075) + m.oxy * fRad * 0.2;
          // 上限只是數值保險,避免長時間沉積讓數字跑掉
          var pNew = Math.min(4 * polyCrit, Math.max(0, poly[i] + (dep - rem) * dt));

          // --- 材料移除 ---
          var etch = 0;
          if (pNew < polyCrit) {
            // 聚合物越厚,擋得越多(線性衰減到門檻)
            var block = 1 - pNew / polyCrit;
            var chem = m.chem * fRad * fn * 0.35; // 等向
            var ionAssist = m.ionY * fi * yi * fRad * 0.16; // 方向性
            etch = (chem + ionAssist) * block;
          }

          updates.push([i, pNew, etch * dt]);

          // 取樣三個代表位置
          if (fi > 0.5 && m.key !== "mask" && y > bestBottom) {
            bestBottom = y;
            sample.bottom = etch;
          }
          if (fi < 0.05 && m.key !== "mask") sample.wall = Math.max(sample.wall, etch);
          if (m.key === "mask" && fi > 0.5) sample.mask = Math.max(sample.mask, etch);
        }
      }

      for (var u = 0; u < updates.length; u++) {
        var ui = updates[u][0];
        poly[ui] = updates[u][1];
        frac[ui] += updates[u][2];
        if (frac[ui] >= 1) {
          mat[ui] = 0;
          frac[ui] = 0;
          poly[ui] = 0;
        }
      }

      api.time += dt;
      return sample;
    };

    /** 溝槽深度(以列數計)—— 取中央開口正下方最深的空格 */
    api.depth = function (xRel) {
      var x = Math.round((xRel == null ? 0.5 : xRel) * (cols - 1));
      var d = 0;
      for (var y = 0; y < rows; y++) {
        if (mat[idx(x, y)] === 0) d = y + 1;
        else break;
      }
      return d;
    };

    /** 某深度處的溝寬(以行數計)—— 用來看 undercut / bowing */
    api.widthAt = function (y) {
      var w = 0;
      for (var x = 0; x < cols; x++) if (mat[idx(x, y)] === 0) w++;
      return w;
    };

    api.reset();
    return api;
  }

  PA.profile = {
    create: create,
    materials: MATERIALS,
    ionYield: ionYield,
  };
})((window.PA = window.PA || {}));
