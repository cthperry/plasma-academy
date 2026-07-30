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
    /**
     * 遮罩的兩個係數都被實作修正過,而且都是「遮罩根本撐不到終點」這一個問題:
     *
     * chem 0.06 → 0.01:遮罩之所以能當遮罩,就是因為它**不被化學蝕刻** ——
     *   損耗幾乎全來自離子濺射,所以遮罩的問題是 faceting 與 mask loss
     *   (角度與能量依賴),不是被自由基咬掉。
     *
     * ionY 0.35 → 0.18:0.35 對 SiO₂ 的 1.0 只有約 3 倍選擇比,
     *   而蝕穿目標膜要花掉遮罩好幾倍的厚度 —— 於是**每一種低鈍化的預設**
     *   都在中途把遮罩濺鍍光,全部被判成 faceting,undercut 根本做不出來。
     *   0.18 對應約 5–6 倍的遮罩選擇比,與介電質蝕刻的實務量級相符。
     */
    mask: { id: 1, token: "vizMask", oxy: 0.15, chem: 0.01, ionY: 0.18 },
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
   * 濺鍍產額的**角度依賴** —— 課文 3.1.6 的那條曲線。
   *
   *   Y(θ)/Y(0) = (1/cos θ)^f · exp( −Σ·(1/cos θ − 1) )        (Yamamura 型)
   *
   * cos θ 是入射方向與表面法線的夾角餘弦:1 = 垂直入射、0 = 掠射。
   * 取 f = 3、Σ = 1.5,峰值落在 cos θ = Σ/f = 0.5,也就是 **60°**,
   * 峰值約 1.8 倍 —— 與課文「45–70° 產額最大、垂直入射反而不是最高」一致。
   *
   * **為什麼這一條非加不可**:少了它,斜面與平面的濺鍍速率一樣,於是
   *   · 遮罩肩部不會被削出斜面 —— faceting 只能靠「遮罩整體變薄」冒充
   *   · 溝底兩側的斜面不會比中央快 —— microtrench 長不出來
   * 這兩個缺陷在課文裡都是用角度依賴解釋的,模型卻沒有它,是實作與課文脫節。
   */
  var ANG_F = 3;
  var ANG_SIGMA = 1.5;
  function angularYield(cosTheta) {
    if (!(cosTheta > 0)) return 0; // 背向或掠射到極限 → 打不到
    var u = 1 / Math.min(1, cosTheta);
    if (u > 12) return 0; // 極掠射:反射掉,不濺鍍
    return Math.pow(u, ANG_F) * Math.exp(-ANG_SIGMA * (u - 1));
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
     * 有角度發散的離子通量。
     *
     * 真實的離子不是完美垂直的 —— 鞘層裡的碰撞與離子的橫向溫度給它一個
     * 角度分佈(2.4 的 IEDF 同一件事的角度版本)。div 是這個分佈的
     * 半角切線值(tan θ),0 就退回上面那個完美垂直的版本。
     *
     * 回傳 { f, slope }:
     *   f     通量(0…1),中央權重高的加權平均
     *   slope 通得過的射線的加權平均斜率 —— 也就是離子實際打過來的方向。
     *         鏡面反射要用它,所以在這裡一起算出來。
     *
     * 這一條同時解釋兩件事:
     *   · 側壁開始吃得到離子 → undercut / bowing 的來源
     *   · 深窄溝的溝底反而收不足 → ARDE 不只是自由基的事
     */

    /**
     * 整個格點最上面那一列固體的位置。
     * 位於這一列(或更上面)的格子,任何方向的視線都不會被擋 ——
     * 通量必定是 1,不必射線追蹤。
     *
     * 平坦上表面(遮罩頂)佔了暴露格的一大半,這個提前判斷讓每一步
     * 省掉大部分工作。條件是「全域最上層」而不是「左右鄰居也空」——
     * 後者對自由基的 ±60° 扇形不成立,會把深溝底部誤判成無遮蔽。
     */
    var topSolidRow = 0;
    function refreshTopSolid() {
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          if (mat[idx(x, y)] !== 0) {
            topSolidRow = y;
            return;
          }
        }
      }
      topSolidRow = rows;
    }

    function skyClear(y) {
      return y <= topSolidRow;
    }

    var DIV_RAYS = 8;
    function ionFluxVec(x, y, div) {
      if (!div || div <= 0) return { f: ionFlux(x, y), slope: 0 };
      if (skyClear(y)) return { f: 1, slope: 0 };
      var open = 0;
      var total = 0;
      var slopeSum = 0;
      for (var a = -DIV_RAYS; a <= DIV_RAYS; a++) {
        var t = a / DIV_RAYS;
        var dx = t * div;
        // 角度分佈中央高、邊緣低(近似鞘層裡的橫向速度分佈)
        var w = 1 - 0.7 * Math.abs(t);
        total += w;
        var blocked = false;
        for (var yy = y - 1; yy >= 0; yy--) {
          var xx = Math.round(x + dx * (y - yy));
          if (xx < 0 || xx >= cols) break;
          if (mat[idx(xx, yy)] !== 0) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          open += w;
          slopeSum += w * dx;
        }
      }
      if (open <= 0) return { f: 0, slope: 0 };
      return { f: open / total, slope: slopeSum / open };
    }
    api.ionFluxVec = ionFluxVec;

    /**
     * 表面法線,指向真空側。用 3×3 的固體密度梯度估。
     * 反射需要知道表面是斜的還是平的,而「斜多少」正是濺鍍產額角度依賴
     * (3.1.6)與反射比例的共同依據。
     */
    function normalAt(x, y) {
      var gx = 0;
      var gy = 0;
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          var xx = x + dx;
          var yy = y + dy;
          var solid;
          if (xx < 0 || xx >= cols) solid = 1; // 側邊視為固體(週期外)
          else if (yy < 0) solid = 0; // 上方是電漿
          else if (yy >= rows) solid = 1;
          else solid = mat[idx(xx, yy)] !== 0 ? 1 : 0;
          var w = 1 / Math.sqrt(dx * dx + dy * dy);
          gx += dx * solid * w;
          gy += dy * solid * w;
        }
      }
      var L = Math.sqrt(gx * gx + gy * gy);
      if (L < 1e-6) return null;
      return { x: -gx / L, y: -gy / L };
    }
    api.normalAt = normalAt;

    /**
     * 反射離子通量圖。
     *
     * 離子打在斜面上不會全部被吸收:入射角越掠(cos θ 越小)反射比例越高。
     * 反射後沿鏡面方向前進,打到的第一個表面多吃一份離子通量。
     *
     * **一條規則、兩個缺陷**:
     *   · 遮罩肩部被削出的斜面把離子送向側壁 → bowing
     *   · 溝底附近微微內傾的側壁把離子送向溝底兩側 → microtrench
     * 兩者都不是另外寫的規則,是同一段反射計算在不同幾何下的結果。
     */
    function reflectMap(div, coef) {
      var out = new Float32Array(n);
      if (!coef || coef <= 0) return out;
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var i = idx(x, y);
          if (mat[i] === 0) continue;
          if (!exposed(x, y)) continue;
          var inc = ionFluxVec(x, y, div);
          if (inc.f <= 0.002) continue; // 門檻放很低:側壁的直射通量本來就小,&#10;                                     // 但它掠射進來,反射比例最高 —— 這正是要抓的那一份
          var nrm = normalAt(x, y);
          if (!nrm) continue;

          // 入射方向:射線朝天空是 (slope, −1),所以離子來的方向是它的反向
          var dxi = -inc.slope;
          var dyi = 1;
          var dl = Math.sqrt(dxi * dxi + 1);
          dxi /= dl;
          dyi /= dl;

          var dot = dxi * nrm.x + dyi * nrm.y; // < 0 表示打向表面
          if (dot >= 0) continue;
          var cosI = -dot; // 1 = 垂直入射,0 = 掠射
          /**
           * 掠射反射多、垂直入射全吸收。指數用 1.2 而不是 2:
           * 平方會讓 45° 入射的反射率只剩 9 %,實測下來溝底兩側的
           * 微溝完全長不出來(碗狀底部的中央優勢壓過反射的集中)。
           * 真實的離子反射係數在中等入射角也還有兩三成,不會掉那麼快。
           */
          var R = coef * Math.pow(1 - cosI, 1.2);
          if (R <= 1e-3) continue;

          // 鏡面反射方向
          var rx = dxi - 2 * dot * nrm.x;
          var ry = dyi - 2 * dot * nrm.y;
          var rl = Math.sqrt(rx * rx + ry * ry);
          if (rl < 1e-6) continue;
          rx /= rl;
          ry /= rl;

          // 沿反射方向前進,找第一個碰到的表面
          var px = x + nrm.x * 1.2;
          var py = y + nrm.y * 1.2;
          for (var s = 0; s < 2 * rows; s++) {
            px += rx * 0.7;
            py += ry * 0.7;
            var cx = Math.round(px);
            var cy = Math.round(py);
            if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) break;
            if (cx === x && cy === y) continue;
            var ti = idx(cx, cy);
            if (mat[ti] !== 0) {
              out[ti] += inc.f * R;
              break;
            }
          }
        }
      }
      return out;
    }
    api.reflectMap = reflectMap;

    /**
     * 自由基通量:等向入射,所以看的是「這一格能看到多少上方的天空」。
     * 深溝裡看到的立體角小 → 通量低 —— ARDE / RIE lag 由此而來,
     * 不必另外寫規則。
     */
    function neutralFlux(x, y) {
      if (skyClear(y)) return 1;
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
     *   ionDiv      離子角度發散的 tan θ(預設 0 = 完美垂直)
     *   ionReflect  鏡面反射係數(預設 0 = 全吸收)
     *   angularYield 是否套用濺鍍產額的角度依賴(預設 false)
     * }
     * ionDiv / ionReflect / angularYield 預設關閉,此時行為與加入它們之前
     * 完全相同 —— A10 等既有元件不受影響。
     *
     * 回傳三個代表位置的淨速率,供 UI 標示:溝底 / 側壁 / 遮罩頂
     */
    api.step = function (p) {
      var dt = p.dt || 1;
      var effFC = p.effFC;
      var E = p.ionEnergy;
      var iRel = p.ionFluxRel == null ? 1 : p.ionFluxRel;
      var polyCrit = p.polyCrit == null ? 1 : p.polyCrit;
      var div = p.ionDiv || 0;
      refreshTopSolid(); // 通量的提前判斷要用,幾何一變就要更新
      var refl = reflectMap(div, p.ionReflect || 0);

      // F 自由基的相對量 ∝ 有效 F/C;聚合物前驅物則相反。
      // 3.4 附近是分水嶺:高於它幾乎不聚合(CF₄ 那一端),
      // 低於它聚合物快速增加(C₄F₈ / CH₃F 那一端),而且是超線性的。
      // neutralRel 是「中性粒子總量」(流量/壓力)這一個獨立旋鈕:
      // 它同比例放大 F 自由基與聚合物前驅物,不改變兩者的比例(那是 effFC 的事)。
      var nRel = p.neutralRel == null ? 1 : p.neutralRel;
      var fRad = (Math.max(0, effFC) / 4) * nRel;
      var depRate = Math.pow(Math.max(0, 3.4 - effFC), 1.6) * 0.9 * nRel;

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
          // 直射 + 反射。反射進來的那一份沒有「方向性」的意義,
          // 但它一樣打斷鍵、一樣清聚合物 —— 所以就是加在同一個 fi 上。
          var inc = ionFluxVec(x, y, div);
          var fi = (inc.f + refl[i]) * iRel;
          var fn = neutralFlux(x, y);

          /**
           * 濺鍍產額的角度依賴(3.1.6)。斜面比平面快,峰值在約 60°。
           * 只作用在**離子驅動**的兩項(離子輔助蝕刻、聚合物的離子濺射),
           * 化學蝕刻是等向的,與表面朝向無關。
           */
          var angY = 1; // 物理濺射用:完整的角度峰值
          var angYchem = 1; // 離子輔助化學蝕刻用:角度依賴弱得多
          if (p.angularYield) {
            var nrm = normalAt(x, y);
            if (nrm) {
              // 離子來的方向:射線朝天空是 (slope, −1),所以入射是它的反向
              var dxi = -inc.slope;
              var dl = Math.sqrt(dxi * dxi + 1);
              var cosI = -((dxi / dl) * nrm.x + (1 / dl) * nrm.y);
              angY = angularYield(cosI);
              /**
               * **兩種移除機制的角度依賴不一樣,不能共用同一條曲線。**
               *
               * 物理濺射(打掉聚合物、削掉遮罩)是動量轉移,60° 附近有明顯峰值
               * —— 用完整的 Y(θ)。
               *
               * 離子輔助化學蝕刻(3.1.2 的協同)靠的是離子提供活化能,
               * 而反應速率主要由**自由基覆蓋率**決定,不是由反衝原子噴不噴得出來
               * 決定 —— 它的角度依賴弱得多,接近只跟通量投影有關。
               *
               * 第一版把完整的 Y(θ) 也套在化學項上,結果任何斜面都被清得特別快,
               * 溝變成**完美的矩形** —— 比真實製程乾淨太多,taper 與 footing
               * 直接被抹平。用 0.35 的權重把峰值收斂回來。
               */
              angYchem = 1 + 0.35 * (angY - 1);
            }
          }

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
          /**
           * 兩條路都必須有離子。第二條原本寫成與離子無關,結果側壁的聚合物
           * 也會被清掉 —— 那就違反了 3.1.4 的整個圖像(側壁離子打不到,
           * 所以鈍化層留著、蝕刻停住)。加上 gate 之後,無離子處 rem → 0,
           * 側壁才真的受保護。
           */
          // 離子活化強度。角度依賴同時作用在聚合物濺射與離子輔助蝕刻上 ——
          // 兩者都是離子打出來的,沒有理由只有其中一項有角度依賴。
          var ionAct = fi * yi * angY;
          var gate = ionAct / (3 + ionAct); // 無離子 → 0,離子充足 → 1
          var rem = ionAct * 0.03 + m.oxy * (ionAct * 0.075 + fRad * 0.38 * gate);
          // 上限只是數值保險,避免長時間沉積讓數字跑掉
          var pNew = Math.min(4 * polyCrit, Math.max(0, poly[i] + (dep - rem) * dt));

          // --- 材料移除 ---
          var etch = 0;
          if (pNew < polyCrit) {
            // 聚合物越厚,擋得越多(線性衰減到門檻)
            var block = 1 - pNew / polyCrit;
            var chem = m.chem * fRad * fn * 0.35; // 等向
            /**
             * 離子輔助(方向性)。兩種寫法:
             *
             * 預設 —— 只乘全域的自由基密度 fRad。這是 P2 建立、
             *   `tools/check-profile.mjs` 16 項斷言守住的版本,A10 等既有元件用它。
             *
             * localCoverage —— 再乘上「表面**本地**被自由基覆蓋了多少」。
             *   這才是 3.1.2 協同效應的完整內容:離子只是把已經生成的 SiFx
             *   打掉,本地沒有 SiFx 就只剩純濺鍍。用 Langmuir 型飽和:
             *   供應充足時趨近 1(離子限制),不足時正比於供應(自由基限制)。
             *
             *   **這一項是 ARDE / RIE lag 的主因** —— 深窄溝的自由基通量被
             *   立體角削掉,覆蓋率跟著掉,即使離子照樣打得到,速率還是慢。
             *   少了本地的 fn,深窄溝與淺寬溝會刻得一樣快(實測落差 < 2 %),那是錯的。
             *
             * 為什麼不直接把 localCoverage 變成預設:它會改變絕對蝕刻率,
             * 而 F/C 各模式的邊界(尤其 etch stop 落在哪個 F/C)是被課文與
             * check-profile 綁住的。與其為了 A18 去重新校準 A10 的既有結論,
             * 不如讓需要的元件明確 opt in。
             */
            var ionAssist;
            if (p.localCoverage) {
              var supply = fRad * fn;
              var coverage = supply / (0.6 + supply);
              ionAssist = m.ionY * fi * yi * angYchem * coverage * 0.48;
            } else {
              ionAssist = m.ionY * fi * yi * angYchem * fRad * 0.16;
            }
            etch = (chem + ionAssist) * block;
          }

          updates.push([i, pNew, etch * dt, x, y, etch]);

          // 取樣三個代表位置
          if (fi > 0.5 && m.key !== "mask" && y > bestBottom) {
            bestBottom = y;
            sample.bottom = etch;
          }
          if (fi < 0.05 && m.key !== "mask") sample.wall = Math.max(sample.wall, etch);
          if (m.key === "mask" && fi > 0.5) sample.mask = Math.max(sample.mask, etch);
        }
      }

      /**
       * 再沉積(redeposition)。
       *
       * 從溝底被打下來的材料不會全部變成揮發性分子飛走 —— 一部分會落在
       * 附近的表面上重新黏住,形成一層擋住蝕刻的膜(與聚合物同樣的作用)。
       * 落點集中在**溝的下半段**,因為那裡離濺射源最近、立體角最大。
       *
       * 這一條解釋了三件課文裡的事,而且是同一個機制:
       *   · taper   —— 下段的再沉積比上段厚 → 越往下越窄
       *   · footing —— 底角是再沉積最厚的地方 → 清不乾淨
       *   · 側壁因此不再完美垂直,鏡面反射才開始有作用(bowing / microtrench)
       *
       * 沒有它,模型會給出「完美矩形」的溝 —— 那比真實製程乾淨太多了。
       */
      var redep = p.redeposition || 0;
      var redepAdd = null;
      if (redep > 0) {
        redepAdd = new Float32Array(n);
        var RAD = 3;
        for (var q = 0; q < updates.length; q++) {
          var src = updates[q];
          var srcEtch = src[5];
          if (srcEtch <= 0) continue;
          var sx = src[3];
          var sy = src[4];
          for (var oy = -RAD; oy <= RAD; oy++) {
            for (var ox = -RAD; ox <= RAD; ox++) {
              if (!ox && !oy) continue;
              var tx = sx + ox;
              var ty = sy + oy;
              if (tx < 0 || tx >= cols || ty < 0 || ty >= rows) continue;
              var ti2 = idx(tx, ty);
              if (mat[ti2] === 0) continue;
              if (!exposed(tx, ty)) continue;
              var d2 = ox * ox + oy * oy;
              // 落點權重隨距離衰減;往上飛的比往旁邊的少(重力無關,是立體角)
              var w2 = 1 / (1 + d2);
              if (oy < 0) w2 *= 0.45; // 往上落得少
              redepAdd[ti2] += redep * srcEtch * w2 * dt;
            }
          }
        }
      }

      for (var u = 0; u < updates.length; u++) {
        var ui = updates[u][0];
        // 先寫回這一步算出的聚合物收支,再疊上再沉積 ——
        // 順序反過來的話 pNew 會把再沉積整個蓋掉(它算的時候還不知道有再沉積)。
        poly[ui] = updates[u][1];
        if (redepAdd) poly[ui] = Math.min(4 * polyCrit, poly[ui] + redepAdd[ui]);
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
    refreshTopSolid();
    return api;
  }

  PA.profile = {
    create: create,
    materials: MATERIALS,
    ionYield: ionYield,
  };
})((window.PA = window.PA || {}));
