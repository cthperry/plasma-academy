/* ==========================================================================
   A03 — 平均自由徑粒子模擬
   章節 1.3 · 規格 docs/05-animation-spec.md

   目標:把「壓力決定方向性」變成可見的。

   離子束從上方鞘層垂直射出,穿越腔體。碰撞後隨機偏折,
   底部晶圓累積記錄入射角分佈 —— 壓力一拉高,直方圖立刻散開。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define("A03", function () {
    var C = PA.controls;
    var M = PA.model;

    var GAP_CM = 3; // 電極間距,決定畫面的物理尺度

    return PA.lab.create({
      setup: function () {
        var api = this;

        api.state = { pressure: 10, gas: "Ar", showScale: true };
        api.hist = new Array(37).fill(0); // 入射角直方圖 −90…+90,每 5°
        api.landed = 0;
        api.collisions = 0;
        api.crossed = 0;

        var wrap = document.createElement("div");
        wrap.className = "pa-lab__split";
        var canvasBox = document.createElement("div");
        var plotBox = document.createElement("div");
        wrap.appendChild(canvasBox);
        wrap.appendChild(plotBox);
        api.stage.appendChild(wrap);

        var canvas = document.createElement("canvas");
        canvas.setAttribute("role", "img");
        canvas.setAttribute(
          "aria-label",
          "離子束從鞘層垂直射向晶圓,途中發生碰撞而偏折;壓力越高碰撞越頻繁"
        );
        canvasBox.appendChild(canvas);
        api.canvas = canvas;

        api.sys = PA.particles.create({ max: 400, width: 100, height: 100 });

        /** 目前的平均自由徑 [cm] */
        api.mfpCm = function () {
          return M.meanFreePath(api.state.pressure, api.state.gas);
        };

        /** 畫面每公分幾像素 */
        api.pxPerCm = function () {
          return (api.height || 300) / GAP_CM;
        };

        api.emit = function () {
          var sys = api.sys;
          if (sys.count > sys.max - 4) return;
          sys.spawn(function (p) {
            p.kind = "ionPos";
            p.x = 20 + Math.random() * (api.width - 40);
            p.y = 8;
            p.vx = 0;
            // 垂直向下(鞘層加速的結果)。速度依畫面高度縮放,
            // 無碰撞時約 1.1 秒穿越,確保統計能在合理時間內累積。
            p.vy = (api.height || 300) / 1.1;
            p.data = { hits: 0, age: 0 };
          });
        };

        /** 重畫直方圖與數值面板 */
        api.refresh = function () {
          var pl = api.plot;
          pl.clear();

          var max = Math.max.apply(null, api.hist) || 1;
          var pts = api.hist.map(function (v, i) {
            return [-90 + i * 5, v / max];
          });

          pl.area(pts, { fill: PA.canvasTheme.palette().vizIonPos, opacity: 0.22 });
          pl.line(pts, { stroke: PA.canvasTheme.palette().vizIonPos, width: 2.2 });
          pl.vline(0, { stroke: PA.canvasTheme.palette().textSubtle, dash: "3 3" });

          // FWHM:半高處的全寬
          var lo = null, hi = null;
          for (var i = 0; i < pts.length; i++) {
            if (pts[i][1] >= 0.5) { if (lo === null) lo = pts[i][0]; hi = pts[i][0]; }
          }
          var fwhm = lo === null ? 0 : hi - lo + 5;

          if (api.readoutNode) {
            api.readoutNode.update({
              mfp: api.mfpCm(),
              hits: api.landed ? api.crossed / api.landed : 0,
              fwhm: fwhm,
              n: api.landed,
            });
          }
        };

        api.resetStats = function () {
          api.hist.fill(0);
          api.landed = 0;
          api.collisions = 0;
          api.crossed = 0;
          api.sys.clear();
          api.refresh();
        };

        var detach = PA.canvasTheme.autoSize(canvas, canvasBox, 3 / 2, function (ctx, w, h) {
          api.ctx = ctx;
          api.width = w;
          api.height = h;
          api.sys.resize(w, h);
        });
        api.onDestroy(detach);

        // --- 入射角直方圖 ---
        api.plot = PA.plot.create({
          width: 560,
          height: 230,
          margin: { t: 16, r: 16, b: 44, l: 52 },
          x: { min: -90, max: 90, ticks: [-90, -60, -30, 0, 30, 60, 90], label: "抵達晶圓時的入射角 (°)" },
          y: { min: 0, max: 1, tickCount: 4, label: "相對次數", format: function (v) { return v.toFixed(1); } },
        });
        plotBox.appendChild(api.plot.svg);

        var readout = C.readout([
          { key: "mfp", label: "平均自由徑 λ", digits: 2, unit: " cm" },
          { key: "hits", label: "穿越腔體平均碰撞", digits: 1, unit: " 次" },
          { key: "fwhm", label: "入射角 FWHM", digits: 0, unit: " °" },
          { key: "n", label: "已抵達晶圓", digits: 0 },
        ]);
        api.readoutNode = readout;

        var pCtl = C.slider({
          label: "壓力",
          min: 1,
          max: 200,
          value: 10,
          log: true,
          unit: "mTorr",
          digits: 0,
          onChange: function (v) {
            api.state.pressure = v;
            api.resetStats();
          },
        });

        var gasCtl = C.segmented({
          label: "氣體",
          options: [
            { value: "He", label: "He" },
            { value: "Ar", label: "Ar" },
            { value: "Xe", label: "Xe" },
          ],
          value: "Ar",
          onChange: function (v) {
            api.state.gas = v;
            api.resetStats();
          },
        });

        var scaleCtl = C.toggle({
          label: "顯示 λ 標尺",
          value: true,
          onChange: function (v) {
            api.state.showScale = v;
          },
        });

        var transport = C.transport({
          playing: true,
          onPlay: function () { api.start(); },
          onPause: function () { api.stop(); },
          onReset: function () {
            pCtl.setValue(10, true);
            gasCtl.setValue("Ar", true);
            api.state.pressure = 10;
            api.state.gas = "Ar";
            api.resetStats();
          },
        });

        api.el.appendChild(C.panel([pCtl, gasCtl, scaleCtl, transport]));
        api.el.appendChild(readout);
        api.el.appendChild(
          C.observations([
            "先看 1 mTorr:λ ≈ 5 cm 比腔體還長,離子幾乎不碰撞,直直打到晶圓 —— 直方圖是一根尖峰。",
            "拉到 100 mTorr:λ 只剩 0.05 cm,離子一路被撞歪,直方圖整個攤開。這就是「壓力調低 profile 會變直」的物理。",
            "換成 He:分子小、截面小,同壓力下 λ 大得多 —— 這是 He 常被當稀釋氣體的原因之一。",
            "注意 FWHM 這個數字。它就是 L3 談 profile 時「離子角度發散」的來源。",
          ])
        );

        api.refresh();
      },

      reset: function () {
        this.resetStats();
      },

      tick: function (dt) {
        var api = this;
        var sys = api.sys;
        var h = api.height || 300;
        var pxCm = api.pxPerCm();
        var mfpPx = api.mfpCm() * pxCm;

        // 穩定的射出速率
        api._acc = (api._acc || 0) + dt;
        while (api._acc > 0.012) {
          api._acc -= 0.03;
          api.emit();
        }

        sys.each(function (p) {
          var speed = Math.hypot(p.vx, p.vy);
          var dist = speed * dt;

          if (sys.collides(dist, mfpPx)) {
            // 碰撞:等向散射,但保留部分前向動量(離子較重,散射角有限)
            sys.scatter(p, 0.85);
            if (p.vy < 0) p.vy = -p.vy * 0.6; // 不讓它整個往回跑,視覺上才看得懂
            p.data.hits++;
            api.collisions++;
          }

          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.data.age += dt;

          // 側壁反射(不是殺掉)—— 高壓下散射很強,直接移除會讓抵達數歸零
          if (p.x < 2) { p.x = 2; p.vx = Math.abs(p.vx); }
          else if (p.x > api.width - 2) { p.x = api.width - 2; p.vx = -Math.abs(p.vx); }

          if (p.y >= h - 10) {
            // 抵達晶圓:記錄入射角
            var ang = (Math.atan2(p.vx, Math.max(p.vy, 1e-3)) * 180) / Math.PI;
            var bin = Math.round((Math.max(-90, Math.min(90, ang)) + 90) / 5);
            api.hist[bin]++;
            api.landed++;
            api.crossed += p.data.hits;
            sys.kill(p);
          } else if (p.data.age > 12) {
            sys.kill(p); // 極高壓下少數粒子會困住,設上限避免佔用池位
          }
        });

        api._fc = (api._fc || 0) + 1;
        if (api._fc % 20 === 0) api.refresh();
      },

      draw: function () {
        var api = this;
        if (!api.ctx) return;
        var ctx = api.ctx;
        var p = PA.canvasTheme.palette();
        var w = api.width;
        var h = api.height;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = p.bg;
        ctx.fillRect(0, 0, w, h);

        // 鞘層邊界(上)與晶圓(下)
        ctx.fillStyle = p.borderStrong;
        ctx.fillRect(0, 0, w, 6);
        ctx.fillStyle = p.vizSubstrate;
        ctx.fillRect(0, h - 10, w, 10);

        ctx.fillStyle = p.textSubtle;
        ctx.font = "11px system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText("鞘層邊界", 8, 15);
        ctx.fillText("晶圓", 8, h - 20);

        // λ 標尺
        if (api.state.showScale) {
          var lamPx = api.mfpCm() * api.pxPerCm();
          ctx.save();
          ctx.strokeStyle = p.warning;
          ctx.fillStyle = p.warning;
          ctx.lineWidth = 1.5;
          var x0 = w - 16;
          var yTop = 18;
          var yEnd = Math.min(yTop + lamPx, h - 16);
          ctx.beginPath();
          ctx.moveTo(x0, yTop);
          ctx.lineTo(x0, yEnd);
          ctx.moveTo(x0 - 4, yTop);
          ctx.lineTo(x0 + 4, yTop);
          ctx.moveTo(x0 - 4, yEnd);
          ctx.lineTo(x0 + 4, yEnd);
          ctx.stroke();
          ctx.textAlign = "right";
          ctx.fillText(lamPx > h ? "λ 比腔體還長" : "λ", x0 - 6, (yTop + yEnd) / 2);
          ctx.textAlign = "left";
          ctx.restore();
        }

        // 離子與軌跡
        api.sys.each(function (pt) {
          api.sys.drawTrail(ctx, pt, p.vizIonPos, 14);
        });
        api.sys.draw(ctx, p);
      },
    });
  });
})((window.PA = window.PA || {}));
