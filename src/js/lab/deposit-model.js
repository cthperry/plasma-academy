/* ==========================================================================
   deposit-model.js — 沉積與填溝(3.4 / A22 PEALD、A23 HDP vs PECVD)

   輪廓引擎只會「移除」,沉積要反過來:往真空側長材料。所以這是獨立的一支,
   但骨架同樣只有三條規則:

     1. 抵達 —— 前驅物能不能到這一格?黏著係數 s 決定它是「撞到就黏」
                還是「彈幾次才黏」,而這一條就是階梯覆蓋率的全部來源
     2. 長厚 —— 抵達量累積到一格的厚度就變成膜
     3. 濺掉 —— HDP 才有:高 bias 的 Ar⁺ 把膜打掉,而**產額在 45° 最大**,
                開口處剛形成的 cusp 正好是 45° 斜面 → 優先被削掉

   四種模式全部是這三條的組合,沒有為 void 或 conformal 寫任何規則:

     SiH₄ PECVD   s 高 → 開口處長最快 → cusp 合攏 → **夾 void**
     TEOS PECVD   s 低 → 表面遷移率高 → 爬得進凹處 → 覆蓋率好得多
     HDP-CVD      s 高 + 同時濺鍍 → cusp 一形成就被削掉 → 由下往上填滿
     PEALD        自限制 → 抵達量與通量無關,只看循環數 → 覆蓋率接近 100 %

   ⚠️ 教材用的簡化模型。定性趨勢與量級為目標,不做定量預測。
   ========================================================================== */

(function (PA) {
  "use strict";

  var VOID = 0;
  var BASE = 1;
  var FILM = 2;

  /**
   * 四種製程。
   *   stick    黏著係數(1 = 撞到就黏;小 = 會彈、會遷移)
   *   sputter  濺鍍/沉積比(只有 HDP 有)
   *   redep    濺掉的材料落回溝裡的比例(HDP 填溝的另外一半)
   *   selfLim  自限制(PEALD):抵達量不看通量,只看有沒有被遮住
   *   depthAtt 自由基**每經過一個單位深寬比**的損耗率(PEALD 的方向性代價)
   *   dose     前驅物脈衝時間,以「場區剛好飽和」為 1。真實 ALD 都是過量給的
   *   purge    吹除是否充分(1 = 充分;不足 → 前驅物與自由基在氣相相遇 → 退化成 CVD)
   */
  var MODES = {
    sih4: {
      id: "sih4", label: "PECVD(SiH₄)", stick: 0.95, sputter: 0, redep: 0, selfLim: false, depthAtt: 0,
      why: "黏著係數高 —— 撞到什麼就黏什麼。開口處通量最高、長最快,先合攏 → 夾 void。",
    },
    teos: {
      id: "teos", label: "PECVD(TEOS)", stick: 0.18, sputter: 0, redep: 0, selfLim: false, depthAtt: 0,
      why: "分子在表面遷移率高(黏著係數低),沉積後能移動到凹處 → 階梯覆蓋率遠優於 SiH₄。代價是需要液態源汽化系統。",
    },
    hdp: {
      id: "hdp", label: "HDP-CVD", stick: 0.9, sputter: 0.55, redep: 0.75, selfLim: false, depthAtt: 0,
      why: "邊沉積邊濺鍍。濺鍍產額在 45° 最大,而開口處的 cusp 正好是 45° 斜面 → 一形成就被削掉,開口保持敞開。",
    },
    peald: {
      id: "peald", label: "PEALD", stick: 1, sputter: 0, redep: 0, selfLim: true,
      depthAtt: 0.03, dose: 3.5, purge: 1,
      why: "自限制:吸附滿了就停,所以厚度只由循環數決定,與流量、時間、位置都無關 → 覆蓋率接近 100 %。",
    },
  };

  /**
   * 溝槽的深寬比由 ar 決定 —— 填溝能力隨 AR 惡化,這是重點。
   *
   * ⚠️ 格點尺寸不能固定,必須由「要沉積多厚」反推。
   * 填一條寬 w 的溝,同形沉積需要 w/2 的膜厚,有 cusping 要更多;
   * 場區的膜是往**上**長的,頂部空間不夠時膜會頂到格點上緣,
   * 那之後 viewFactor 看不到天空、全部歸零,四種製程就只剩
   * 「被遮住時的殘餘通量」在跑 —— 濺鍍項會變成完全無效,
   * 結果看起來還很合理(填滿、零空洞),但那是**量測假象不是物理**。
   * 所以頂部空間取 width + 4,並且只長到 budget 就停(見 growUntilFilled)。
   */
  function create(opts) {
    var o = opts || {};
    var ar = o.ar == null ? 3 : o.ar;

    var depth = o.depth || 44;
    var width = Math.max(4, Math.round(depth / ar));
    /**
     * 沉積預算:場區長到這麼厚就停,四種製程在這裡比。
     *
     * 必須是**溝寬的固定倍數**。寫成 width + 4 會讓窄溝拿到相對更多的膜
     * (AR 8 的溝寬 6、預算 10,等於 1.7 倍溝寬;AR 2 的溝寬 22、預算 26,
     * 只有 1.2 倍),高 AR 反而佔便宜 —— 那樣的比較是不公平的。
     * 同形填滿只需 0.5 倍溝寬,取 1.5 倍是三倍餘裕。
     */
    var budget = Math.max(6, Math.round(width * 1.5));
    var top = budget + 4;                     // 頂部空間:預算之上再留 4 格天空
    var rows = top + depth + 4;
    var cols = o.cols || Math.max(72, width * 3 + 24);

    var n = cols * rows;
    var mat = new Uint8Array(n);
    var grow = new Float32Array(n);

    var api = { cols: cols, rows: rows, mat: mat, grow: grow, ar: ar, steps: 0, budget: budget };
    function idx(x, y) { return y * cols + x; }
    api.idx = idx;

    var x0 = Math.round((cols - width) / 2);
    var x1 = x0 + width;
    api.trench = { x0: x0, x1: x1, top: top, depth: depth, width: width };

    api.reset = function () {
      mat.fill(VOID);
      grow.fill(0);
      api.steps = 0;
      api.cycles = 0;
      api._pinchFill = null;
      // 基材:top 以下全是 BASE,再把溝挖出來
      for (var y = top; y < rows; y++) {
        for (var x = 0; x < cols; x++) mat[idx(x, y)] = BASE;
      }
      for (var yy = top; yy < top + depth && yy < rows; yy++) {
        for (var xx = x0; xx < x1; xx++) mat[idx(xx, yy)] = VOID;
      }
    };

    /**
     * 左右邊界是**鏡射**而不是固體牆。
     *
     * 蝕刻引擎把格點外當固體沒問題(牆就是牆),沉積不行:
     * 「格點外是固體」會讓最外面那一欄每一列都變成「貼著固體的真空格」,
     * 於是兩側邊界自己長出一道膜牆、一路往內爬,場區膜厚的探針會量到那道牆
     * 而不是真正的場區膜(實測 26 格的預算在 36 步就「達到」了)。
     * 鏡射邊界的物理意義是「一整排相同的溝」—— 場區本來就該這樣。
     */
    function solid(x, y) {
      if (y < 0) return false;
      if (y >= rows) return true;
      var xx = x < 0 ? -x - 1 : x >= cols ? 2 * cols - x - 1 : x;
      if (xx < 0 || xx >= cols) return true;
      return mat[idx(xx, y)] !== VOID;
    }

    /** 這一格是不是「可以長膜」的真空格:貼著固體 */
    function surfaceVoid(x, y) {
      if (mat[idx(x, y)] !== VOID) return false;
      return solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1);
    }
    api.surfaceVoid = surfaceVoid;

    /**
     * 能看到多少天空(±60° 扇形)—— 高黏著係數的前驅物直接照這個抵達,
     * 所以開口處最多、溝底最少。**這就是 cusping 與 void 的來源。**
     */
    function viewFactor(x, y) {
      var open = 0, total = 0;
      for (var a = -6; a <= 6; a++) {
        total++;
        var dx = a / 7;
        var blocked = false;
        for (var yy = y - 1; yy >= 0; yy--) {
          // 同樣鏡射:射線掃出格點外不算「看到天空」,要折回來看鏡像的那一欄
          var xx = Math.round(x + dx * (y - yy));
          if (xx < 0) xx = -xx - 1;
          else if (xx >= cols) xx = 2 * cols - xx - 1;
          if (xx < 0 || xx >= cols) break;
          if (mat[idx(xx, yy)] !== VOID) { blocked = true; break; }
        }
        if (!blocked) open++;
      }
      return open / total;
    }
    api.viewFactor = viewFactor;

    /** 局部表面法線(指向真空側)—— 濺鍍的角度依賴要用 */
    function normalAt(x, y) {
      var gx = 0, gy = 0;
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          var s = solid(x + dx, y + dy) ? 1 : 0;
          var w = 1 / Math.sqrt(dx * dx + dy * dy);
          gx += dx * s * w;
          gy += dy * s * w;
        }
      }
      var L = Math.sqrt(gx * gx + gy * gy);
      if (L < 1e-6) return null;
      return { x: -gx / L, y: -gy / L };
    }

    /** 把貼著這個表面格的膜削掉一格(回蝕)。BASE 基材不動 —— 濺鍍削膜不削基材 */
    function removeNeighbourFilm(x, y) {
      var cand = [[x, y + 1], [x - 1, y], [x + 1, y], [x, y - 1]];
      for (var k = 0; k < cand.length; k++) {
        var cx = cand[k][0], cy = cand[k][1];
        if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) continue;
        var ci = idx(cx, cy);
        if (mat[ci] === FILM) { mat[ci] = VOID; grow[ci] = 0; return true; }
      }
      return false;
    }

    /**
     * 推進一步。
     * PEALD 的 selfLim 讓抵達量與 viewFactor 幾乎無關 —— 這正是自限制的意義。
     */
    api.step = function (mode, dt) {
      var m = typeof mode === "string" ? MODES[mode] : mode;
      var h = dt == null ? 1 : dt;
      var adds = [];
      var y, x, i;
      var sputTotal = 0;   // 這一步總共濺掉多少材料(要落回溝裡)
      // 溝口目前在哪一列 —— 場區的膜往上長,溝口跟著抬高,深度要從這裡算
      var mouthY = top - api.topThickness();

      for (y = 0; y < rows; y++) {
        for (x = 0; x < cols; x++) {
          i = idx(x, y);
          if (!surfaceVoid(x, y)) continue;
          var vf = viewFactor(x, y);
          var arrive;
          if (m.selfLim) {
            /**
             * 自限制:吸附滿一個單層就停 —— 與通量多寡無關。三個折扣:
             *
             * 1. **脈衝夠不夠長**:深處的前驅物通量低,要更久才飽和。
             *    dose 以「場區剛好飽和」為 1,所以要讓整條溝都飽和得給到 3 以上。
             *    **給過量之後再加也不會更厚** —— 這就是自限制,也是 A22 的觀察點。
             * 2. **自由基在深孔衰減**:電漿自由基會在管壁上複合掉,損耗跟著
             *    「已經走過多少個深寬比」走,不是跟著視角因子走。
             *    寫成 (1 − vf) 會在 AR 3 就掉到八成 —— 那不對,真實 PEALD 在
             *    AR 3 的覆蓋率有九成五以上,要到極高 AR 才明顯變差。
             * 3. **吹除不足**:前驅物沒抽乾淨就通電漿 → 氣相反應 → 退化成 CVD。
             */
            var satNeed = 1 / (0.3 + 0.7 * vf);
            var dose = m.dose == null ? 3.5 : m.dose;
            var sat = Math.min(1, dose / satNeed);
            var localAR = Math.max(0, y - mouthY) / width;
            var radical = Math.exp(-m.depthAtt * localAR);
            arrive = sat * radical;
            var cvdFrac = 1 - (m.purge == null ? 1 : m.purge);
            if (cvdFrac > 0) {
              // 退化成 CVD:高黏著係數的直來直往通量,覆蓋率跟著崩掉
              var cvd = 0.95 * vf + 0.05 * (0.35 + 0.65 * vf);
              arrive = (1 - cvdFrac) * arrive + cvdFrac * cvd;
            }
          } else {
            /**
             * 非自限制:黏著係數高 → 直接照視角因子抵達(開口處多、溝底少);
             * 黏著係數低 → 彈很多次才黏,抵達量被抹平,深處也到得了。
             */
            arrive = m.stick * vf + (1 - m.stick) * (0.35 + 0.65 * vf);
          }
          /**
           * 濺鍍(只有 HDP)—— **必須和沉積算在同一格**。
           *
           * 一開始寫成「沉積長真空格、濺鍍削固體膜」兩個獨立迴圈,結果濺鍍項
           * 完全無效:沉積 6 步就把那格膜埋起來,而削掉一格要 11 步,
           * 累積的 −0.55 就此凍結,永遠碰不到門檻。**埋得比削得快,濺鍍就等於沒寫。**
           * 兩項算在同一個表面格才是對的,淨值也才是課文講的 dep/sputter ratio。
           */
          var net = arrive;
          var sputAmt = 0;
          if (m.sputter > 0) {
            var nrm = normalAt(x, y);
            // 垂直入射的 Ar⁺:cos θ = −n.y;產額的角度依賴見 3.1.6
            var cosI = nrm ? -nrm.y : 0;
            if (cosI > 0) {
              var u = 1 / Math.min(1, cosI);
              /**
               * 45° 斜面的產額遠高於水平面,而 cusp 就是 45° 斜面
               * → **HDP 能填溝全靠這一條**:cusp 的淨沉積被壓到場區的兩成。
               */
              var yAng = u > 12 ? 0 : Math.pow(u, 3) * Math.exp(-1.5 * (u - 1));
              sputAmt = m.sputter * yAng * vf;
              net -= sputAmt;
            }
          }
          sputTotal += sputAmt * h * 0.16;
          adds.push([i, net * h * 0.16, x, y, vf, sputAmt * h * 0.16]);
        }
      }

      /**
       * **濺掉的材料要落回溝裡** —— 這是 HDP 填溝的另外一半,不是修正項。
       *
       * cusp 是朝著溝內的 45° 斜面,從它上面濺出來的材料看得到的就是側壁與溝底,
       * 所以會往「看不到天空的地方」堆 —— 溝就這樣由下往上被填起來。
       * 少了這一項,光靠削 cusp 要把 sputter 拉到 0.85 以上才填得動,
       * 而那時場區幾乎不長膜、表面還會被削出孔洞 —— 那是硬湊,不是物理。
       *
       * ⚠️ 落點**必須有局部性**。一開始寫成「按 (1 − 視角因子) 分給全場」,
       * 等於把濺出來的材料無條件送到最深處,於是 HDP 在任何深寬比都填得滿 ——
       * 連 AR 10 都填滿,而課文明明說 AR > 6 會夾 void。那不是模型厲害,
       * 是這條規則把真實的失敗模式寫掉了:濺出來的原子是直線飛的,
       * **從溝口附近削下來的材料就落在溝口附近**,深溝裡它根本到不了,
       * 反而在上方堆成一頂帽子把開口封起來 —— 這才是 HDP 的深寬比極限。
       * 所以權重再乘上一個沿深度的指數衰減,尺度取溝寬。
       */
      if (sputTotal > 0 && m.redep > 0 && adds.length) {
        var lambda = Math.max(2, width);
        for (var sj = 0; sj < adds.length; sj++) {
          var srcAmt = adds[sj][5];
          if (!(srcAmt > 0)) continue;
          var sy = adds[sj][3];
          // 只往下與同高處落 —— 往上飛的原子直接離開溝,不會回頭
          var wsum = 0;
          var qq;
          for (qq = 0; qq < adds.length; qq++) {
            if (adds[qq][3] < sy) continue;
            wsum += (1 - adds[qq][4]) * Math.exp(-(adds[qq][3] - sy) / lambda);
          }
          if (!(wsum > 0)) continue;
          var share = (m.redep * srcAmt) / wsum;
          for (qq = 0; qq < adds.length; qq++) {
            if (adds[qq][3] < sy) continue;
            adds[qq][1] += share * (1 - adds[qq][4]) * Math.exp(-(adds[qq][3] - sy) / lambda);
          }
        }
      }

      for (var k = 0; k < adds.length; k++) {
        var ai = adds[k][0];
        grow[ai] += adds[k][1];
        if (grow[ai] >= 1) {
          mat[ai] = FILM;
          grow[ai] = 0;
        } else if (grow[ai] <= -1) {
          // 淨值為負且累積到一整格:把貼著的那一格膜削掉(cusp 被回蝕)
          if (removeNeighbourFilm(adds[k][2], adds[k][3])) grow[ai] = 0;
          else grow[ai] = -1;
        }
      }

      api.steps++;
      return api;
    };

    /** 頂部(場區)膜厚:溝外的平坦面上長了幾格 */
    api.topThickness = function () {
      /**
       * 場區膜厚 = 離溝夠遠的那幾欄裡最厚的一欄。
       * 只取單一欄不行:靠近格點邊界的那一欄「看到的天空」被邊界處理放大,
       * 長得比別人快,量到的場區厚度會失真(AR 2 時實測直接失準)。
       */
      var best = 0;
      var probes = [2, Math.round(x0 * 0.35), Math.round(x0 * 0.6)];
      for (var k = 0; k < probes.length; k++) {
        var px = Math.min(cols - 1, Math.max(0, probes[k]));
        if (px >= x0 - 1) continue; // 已經進到溝口附近就不算場區
        var t = 0;
        for (var y = top - 1; y >= 0; y--) {
          if (mat[idx(px, y)] === FILM) t++;
          else break;
        }
        if (t > best) best = t;
      }
      return best;
    };

    /** 側壁膜厚:溝深一半處,從溝壁往內數幾格膜 */
    api.sidewallThickness = function () {
      var y = top + Math.round(depth * 0.5);
      if (y >= rows) return 0;
      var t = 0;
      for (var x = x0; x < x1; x++) {
        if (mat[idx(x, y)] === FILM) t++;
        else break;
      }
      return t;
    };

    /** 溝底膜厚 */
    api.bottomThickness = function () {
      var cx = Math.round((x0 + x1) / 2);
      var yb = Math.min(rows - 1, top + depth - 1);
      var t = 0;
      for (var y = yb; y >= top; y--) {
        if (mat[idx(cx, y)] === FILM) t++;
        else break;
      }
      return t;
    };

    /**
     * 連續膜厚 —— 整數格數 **加上正在長的那一格的分數**。
     *
     * 覆蓋率量的膜厚只有兩三格,純數格子的比值會被量化成 0.00 / 0.33 / 0.50
     * 這種階梯(同一個製程換個 AR 就跳一大階),看起來像物理其實是解析度。
     * 模型本來就把未滿一格的沉積量記在 grow 裡,補進來就平滑了。
     */
    function contThickness(sx, sy, dx, dy) {
      var t = 0;
      var cx = sx, cy = sy;
      while (cx >= 0 && cx < cols && cy >= 0 && cy < rows && mat[idx(cx, cy)] === FILM) {
        t++;
        cx += dx;
        cy += dy;
      }
      // 再往外一格:那是正在累積、還沒滿一格的表面
      if (cx >= 0 && cx < cols && cy >= 0 && cy < rows && mat[idx(cx, cy)] === VOID) {
        var g = grow[idx(cx, cy)];
        if (g > 0) t += Math.min(1, g);
      }
      return t;
    }

    /** 場區連續膜厚(取離溝最遠的探針,避開溝口的影響) */
    api.topThicknessF = function () {
      var best = 0;
      var probes = [2, Math.round(x0 * 0.35), Math.round(x0 * 0.6)];
      for (var k = 0; k < probes.length; k++) {
        var px = Math.min(cols - 1, Math.max(0, probes[k]));
        if (px >= x0 - 1) continue;
        var t = contThickness(px, top - 1, 0, -1);
        if (t > best) best = t;
      }
      return best;
    };

    api.sidewallThicknessF = function () {
      var y = top + Math.round(depth * 0.5);
      if (y >= rows) return 0;
      return contThickness(x0, y, 1, 0);
    };

    api.bottomThicknessF = function () {
      var cx = Math.round((x0 + x1) / 2);
      return contThickness(cx, Math.min(rows - 1, top + depth - 1), 0, -1);
    };

    /**
     * 長到「場區膜厚達到 targetTop 格」為止。
     *
     * 階梯覆蓋率**必須在溝還沒填滿之前量** —— 一旦填滿,側壁與溝底的厚度
     * 就變成整條溝的尺寸,比值失去意義(實測會看到覆蓋率 3.13 這種數字)。
     * 現場量 step coverage 也是在膜厚遠小於溝寬時量的。
     */
    /** 量覆蓋率的建議場區膜厚:溝寬的 22 %,至少 2 格(連續值,不必取整) */
    api.coverageTarget = function () {
      return Math.max(2, width * 0.22);
    };

    api.growTo = function (mode, targetTop, maxSteps) {
      var lim = maxSteps || 4000;
      // 用連續膜厚當停止條件 —— 目標可以是 2.6 格這種值,覆蓋率才量得準
      while (api.topThicknessF() < targetTop && api.steps < lim) api.step(mode, 1);
      return api;
    };

    /**
     * 長到**場區膜厚達到沉積預算**為止 —— 這是四種製程的公平比較點。
     *
     * 為什麼是「同樣的沉積厚度」而不是「跑到不再變化」:
     *   · 跑到停滯會讓場區的膜頂到格點上緣,天空消失,結果變成假象(見 create 的註解)
     *   · 現場比較填溝能力也是在**同樣膜厚**下比的,不是各自跑到極限
     *   · HDP 的場區成長率本來就被濺鍍扣掉一截(這就是 dep/sputter ratio),
     *     用「同樣淨沉積厚度」正好把這件事一起正規化掉
     */
    api.growUntilFilled = function (mode, maxSteps) {
      var lim = maxSteps || 6000;
      api.hitCeiling = false;
      while (api.steps < lim && api.topThickness() < budget) {
        api.step(mode, 1);
        // 第一次出現封閉空洞的那一刻,記下溝內已經填了多少
        if (api._pinchFill == null && api.voidCells() >= 4) api._pinchFill = api.fillFraction();
        if (api.topThickness() >= top) { api.hitCeiling = true; break; }
      }
      return api;
    };

    /** 階梯覆蓋率 = 側壁 ÷ 場區,兩者都用連續膜厚(見 contThickness 的註解) */
    api.stepCoverage = function () {
      var t = api.topThicknessF();
      return t > 0 ? api.sidewallThicknessF() / t : 0;
    };

    /** 溝底覆蓋率 = 溝底 ÷ 場區 */
    api.bottomCoverage = function () {
      var t = api.topThicknessF();
      return t > 0 ? api.bottomThicknessF() / t : 0;
    };

    /**
     * Void 偵測:從頂端往下泛洪,凡是**到不了**的真空格就是被封住的空洞。
     * 這是「開口先合攏」的直接後果,不是另外判斷的。
     */
    api.voidCells = function () {
      var seen = new Uint8Array(n);
      var stack = [];
      /**
       * 入口取「最上面仍有真空的那一列」而不是固定第 0 列 ——
       * 場區的膜會往上長,固定第 0 列可能已經是膜,那樣泛洪一格都進不去,
       * 整條溝會被誤判成 void。
       */
      var entry = -1;
      for (var ey = 0; ey < rows && entry < 0; ey++) {
        for (var ex = 0; ex < cols; ex++) {
          if (mat[idx(ex, ey)] === VOID) { entry = ey; break; }
        }
      }
      if (entry < 0) {
        // 整個格點都是固體,沒有空洞可談
        api._lastSeen = seen;
        api._lastSeenStep = api.steps;
        return 0;
      }
      for (var x = 0; x < cols; x++) {
        var i0 = idx(x, entry);
        if (mat[i0] === VOID && !seen[i0]) { seen[i0] = 1; stack.push(i0); }
      }
      while (stack.length) {
        var cur = stack.pop();
        var cy = Math.floor(cur / cols);
        var cx2 = cur - cy * cols;
        var nb = [[cx2 - 1, cy], [cx2 + 1, cy], [cx2, cy - 1], [cx2, cy + 1]];
        for (var k = 0; k < 4; k++) {
          var nx = nb[k][0], ny = nb[k][1];
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
          var ni = idx(nx, ny);
          if (seen[ni] || mat[ni] !== VOID) continue;
          seen[ni] = 1;
          stack.push(ni);
        }
      }
      var count = 0;
      for (var j = 0; j < n; j++) if (mat[j] === VOID && !seen[j]) count++;
      api._lastSeen = seen;
      api._lastSeenStep = api.steps;
      return count;
    };

    /**
     * 哪些格子是**被封住的**真空(給繪製用)。
     * 沿用 voidCells 的泛洪結果 —— 兩邊各算一次遲早會不一致。
     */
    api.voidMask = function () {
      if (api._lastSeen == null || api._lastSeenStep !== api.steps) api.voidCells();
      var seen = api._lastSeen;
      var out = new Uint8Array(n);
      for (var j = 0; j < n; j++) out[j] = mat[j] === VOID && !seen[j] ? 1 : 0;
      return out;
    };

    /** 溝內被填掉的比例 */
    api.fillFraction = function () {
      var total = 0, filled = 0;
      for (var y = top; y < top + depth && y < rows; y++) {
        for (var x = x0; x < x1; x++) {
          total++;
          if (mat[idx(x, y)] !== VOID) filled++;
        }
      }
      return total ? filled / total : 0;
    };

    /**
     * **開口合攏時溝內已經填了多少** —— 本模型最可靠的填溝指標。
     *
     * 為什麼不用階梯覆蓋率當主指標:膜厚在這個格點解析度下只有一兩格,
     * 「側壁 ÷ 頂部」的分子分母都是小整數,量出來的比值抖動很大
     * (實測同一組參數在不同 AR 下會給出 0.04 到 0.67)。那是**解析度限制**,
     * 不是物理。`stepCoverage()` 仍然保留供參考,但判定不靠它。
     *
     * 相對地「合攏時填了多少」是整數穩健的:同形的製程幾乎填滿才合攏,
     * cusping 的製程很早就把開口封住 —— 這正是課文要講的那件事。
     */
    api.pinchFill = function () {
      return api._pinchFill == null ? api.fillFraction() : api._pinchFill;
    };

    api.verdict = function () {
      var v = api.voidCells();
      var fill = api.fillFraction();
      if (v >= 4) return "夾 void —— 開口先合攏了";
      if (fill > 0.92) return "✅ 填滿,沒有空洞";
      if (fill > 0.6) return "填了大半,但還沒滿";
      return "填得很少";
    };

    /**
     * 跑一個 ALD 循環。
     *
     * 四個步驟裡只有「電漿步」會長膜 —— 前驅物脈衝與兩次吹除都不長。
     * 模型不需要為四步各寫一套規則:自限制的意思就是**一個循環長一個單層**,
     * 所以一個循環 = STEPS_PER_CYCLE 步的沉積,場區剛好長約一格。
     * 這也是 A22 要讓人看到的那件事:厚度 = GPC × 循環數,與時間、流量都無關。
     */
    api.runCycle = function (mode) {
      for (var k = 0; k < STEPS_PER_CYCLE; k++) api.step(mode, 1);
      api.cycles = (api.cycles || 0) + 1;
      return api;
    };

    api.growCycles = function (mode, n) {
      while ((api.cycles || 0) < n) api.runCycle(mode);
      return api;
    };

    api.reset();
    return api;
  }

  /** 一個 ALD 循環等於幾步沉積 —— 取 6 讓場區一個循環剛好長約一格 */
  var STEPS_PER_CYCLE = 6;

  /** ALD 的四個步驟。只有電漿步長膜,其餘三步是為了「自限制」才存在 */
  var PHASES = [
    { key: "dose", label: "前驅物脈衝", grows: false,
      why: "前驅物吸附到表面。吸附滿一層就停 —— **這就是自限制**,再通更久也不會更厚。" },
    { key: "purge1", label: "吹除", grows: false,
      why: "把沒吸附的前驅物抽掉。少了這一步,氣相反應會變回 CVD,覆蓋率也跟著壞掉。" },
    { key: "plasma", label: "電漿步", grows: true,
      why: "電漿產生的自由基和吸附層反應,長出一個單層。**厚度只在這一步增加。**" },
    { key: "purge2", label: "吹除", grows: false,
      why: "抽掉副產物,回到乾淨表面,準備下一個循環。" },
  ];

  var RANGES = {
    ar: { label: "溝槽深寬比 AR", min: 1, max: 12, step: 0.5, unit: "" },
    cycles: { label: "循環數", min: 1, max: 20, step: 1, unit: " 圈" },
    sputter: { label: "濺鍍/沉積比", min: 0, max: 0.9, step: 0.05, unit: "" },
    redep: { label: "濺出材料落回比例", min: 0, max: 1, step: 0.05, unit: "" },
    stick: { label: "黏著係數", min: 0.05, max: 1, step: 0.05, unit: "" },
    dose: { label: "前驅物脈衝(1 = 場區剛好飽和)", min: 0.5, max: 5, step: 0.25, unit: " ×" },
    purge: { label: "吹除充分程度", min: 0, max: 1, step: 0.1, unit: "" },
  };

  /**
   * A22 與 A23 共用的剖面繪製 —— 基材、膜、空洞三種顏色,外加未滿一格的
   * 沉積量以半透明表示(不然一格一格跳,看不出膜在長)。
   * 空洞用泛洪的結果上色:被封住的真空才畫成空洞,開著的溝口不算。
   */
  function draw(ctx, sim, w, h, opts) {
    var o = opts || {};
    var p = PA.canvasTheme.palette();
    var cw = w / sim.cols;
    var ch = h / sim.rows;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, w, h);

    var trapped = sim.voidMask();
    for (var y = 0; y < sim.rows; y++) {
      for (var x = 0; x < sim.cols; x++) {
        var i = sim.idx(x, y);
        var m = sim.mat[i];
        if (m === BASE) ctx.fillStyle = p.vizSubstrate;
        else if (m === FILM) ctx.fillStyle = p.vizFilm;
        else if (trapped[i]) ctx.fillStyle = p.vizIonNeg;   // 被封住的空洞
        else continue;
        ctx.fillRect(x * cw, y * ch, cw + 0.6, ch + 0.6);
      }
    }
    // 未滿一格的沉積量 —— 讓「正在長」看得出來
    ctx.save();
    for (var y2 = 0; y2 < sim.rows; y2++) {
      for (var x2 = 0; x2 < sim.cols; x2++) {
        var i2 = sim.idx(x2, y2);
        if (sim.mat[i2] !== VOID) continue;
        var g = sim.grow[i2];
        if (g <= 0.02) continue;
        ctx.globalAlpha = Math.min(0.8, g * 0.8);
        ctx.fillStyle = p.vizFilm;
        ctx.fillRect(x2 * cw, y2 * ch, cw + 0.6, ch + 0.6);
      }
    }
    ctx.restore();

    ctx.save();
    ctx.font = "11px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    var legend = [["基材", p.vizSubstrate], ["薄膜", p.vizFilm], ["封閉空洞 void", p.vizIonNeg]];
    for (var k = 0; k < legend.length; k++) {
      var ly = 12 + k * 15;
      ctx.fillStyle = legend[k][1];
      ctx.fillRect(8, ly - 5, 11, 10);
      ctx.fillStyle = p.text;
      ctx.fillText(legend[k][0], 24, ly);
    }
    ctx.restore();

    if (o.phase) {
      ctx.save();
      ctx.font = "700 12px system-ui, sans-serif";
      ctx.textBaseline = "top";
      ctx.fillStyle = o.phase.grows ? p.vizFilm : p.textMuted || p.text;
      ctx.fillText(o.phase.label, 8, h - 44);
      ctx.restore();
    }
    if (o.caption) {
      ctx.save();
      ctx.font = "700 13px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = p.text;
      ctx.fillText(o.caption, w - 10, h - 10);
      ctx.restore();
    }
  }

  PA.deposit = {
    create: create, MODES: MODES, VOID: VOID, BASE: BASE, FILM: FILM,
    PHASES: PHASES, RANGES: RANGES, STEPS_PER_CYCLE: STEPS_PER_CYCLE, draw: draw,
  };
})((window.PA = window.PA || {}));
