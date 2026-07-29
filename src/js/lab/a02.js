/* ==========================================================================
   A02 — Debye 遮蔽互動
   章節 1.2 · 規格 docs/05-animation-spec.md

   目標:理解 λ_D 的物理意義與它對 n_e、T_e 的依賴。

   設計取捨:λ_D 在實用範圍內橫跨 100 倍(0.007–0.74 mm),
   若用固定的畫面尺度,ICP 條件下遮蔽圈會小到看不見。
   因此粒子視圖改為**自動縮放到 4 λ_D**,並附上實際尺寸的比例尺 ——
   「λ_D 變小」由比例尺數字表達,而不是靠圈圈大小。
   真正的對比交給下方的電位曲線:裸庫倫 vs 遮蔽後,差異一目了然。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define("A02", function () {
    var C = PA.controls;
    var M = PA.model;

    return PA.lab.create({
      setup: function () {
        var api = this;

        api.state = {
          ne: 1e10, // cm⁻³
          Te: 3, // eV
          polarity: 1, // +1 / −1
          showCoulomb: true,
        };

        // --- 版面:上方粒子 Canvas,下方電位曲線 SVG ---
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
          "測試電荷周圍的電子與離子重新分佈,形成遮蔽雲;虛線圓標出 Debye 長度"
        );
        canvasBox.appendChild(canvas);
        api.canvas = canvas;

        api.sys = PA.particles.create({ max: 700, width: 100, height: 100 });

        /**
         * 依 Boltzmann 關係重新分佈粒子:
         *   n_e = n₀ exp(+eφ/kT_e)   電子被正電荷吸引 → 靠近時變密
         *   n_i = n₀ exp(−eφ/kT_e)   離子被排開       → 靠近時變稀
         * 以拒絕抽樣實作。
         */
        api.reseed = function () {
          var sys = api.sys;
          if (!sys || !api.width) return;
          sys.clear();

          var n = PA.particles.budget() < 900 ? 240 : 420;
          var cx = api.width / 2;
          var cy = api.height / 2;
          var lamPx = api.lamPx();
          var q = api.state.polarity;

          function place(kind, sign) {
            var tries = 0;
            while (tries++ < 60) {
              var x = Math.random() * api.width;
              var y = Math.random() * api.height;
              var r = Math.max(Math.hypot(x - cx, y - cy), lamPx * 0.12);
              // 正規化電位:在 r = λ_D 處約為 1/e,越靠近越大
              var phi = (q * (lamPx / r) * Math.exp(-r / lamPx)) * 0.55;
              var w = Math.exp(sign * phi);
              if (Math.random() < Math.min(w, 3) / 3) {
                sys.spawn(function (pt) {
                  pt.kind = kind;
                  pt.x = x;
                  pt.y = y;
                  var a = Math.random() * Math.PI * 2;
                  var sp = sys.thermalSpeed(kind === "electron" ? 26 : 7);
                  pt.vx = Math.cos(a) * sp;
                  pt.vy = Math.sin(a) * sp;
                });
                return;
              }
            }
          }

          for (var i = 0; i < n; i++) {
            place("electron", +1);
            place("ionPos", -1);
          }
        };

        /** 畫面上 1 個 λ_D 佔幾個像素(視圖固定為 4 λ_D 寬) */
        api.lamPx = function () {
          return (api.width || 400) / 4;
        };

        /** 當前 λ_D [mm] */
        api.lambdaD = function () {
          return M.debyeLength(api.state.ne, api.state.Te);
        };

        /** 重畫電位曲線與數值面板(參數變動時呼叫) */
        api.refresh = function () {
          var lam = api.lambdaD(); // mm
          var pl = api.plot;
          pl.clear();

          // 遮蔽後的電位:φ ∝ (1/r)·exp(−r/λ_D),以 r = λ_D/4 處歸一
          var r0 = lam / 4;
          var norm = (1 / r0) * Math.exp(-r0 / lam);
          var debye = pl.sample(function (r) {
            return ((1 / r) * Math.exp(-r / lam)) / norm;
          }, 260);

          if (api.state.showCoulomb) {
            var coul = pl.sample(function (r) {
              return 1 / r / norm;
            }, 260);
            pl.line(coul, {
              stroke: PA.canvasTheme.palette().textSubtle,
              width: 1.8,
              dash: "5 4",
            });
          }
          pl.line(debye, { stroke: PA.canvasTheme.palette().primary, width: 2.4 });

          // λ_D 位置與 1/e 標記
          pl.vline(lam, { stroke: PA.canvasTheme.palette().warning, dash: "4 3" });
          pl.label(lam, 0.92, "λ_D", {
            fill: PA.canvasTheme.palette().warning,
            dx: 5,
          });

          var legend = [
            { label: "有電漿(遮蔽後)", color: PA.canvasTheme.palette().primary },
          ];
          if (api.state.showCoulomb) {
            legend.push({
              label: "沒有電漿(裸庫倫)",
              color: PA.canvasTheme.palette().textSubtle,
              dash: "5 4",
            });
          }
          pl.legend(legend, pl.m.l + 16, pl.m.t + 14);

          // N_D:Debye 球內的粒子數
          var lam_cm = lam / 10;
          var ND = (4 / 3) * Math.PI * Math.pow(lam_cm, 3) * api.state.ne;

          if (api.readoutNode) {
            api.readoutNode.update({
              lam: lam,
              view: lam * 4,
              nd: ND,
              fpe: M.plasmaFrequency(api.state.ne) / 1e6,
            });
          }
          api.reseed();
        };

        var detach = PA.canvasTheme.autoSize(canvas, canvasBox, 2 / 1, function (ctx, w, h) {
          api.ctx = ctx;
          api.width = w;
          api.height = h;
          api.sys.resize(w, h);
          api.reseed();
        });
        api.onDestroy(detach);

        // --- 電位曲線 ---
        api.plot = PA.plot.create({
          width: 640,
          height: 240,
          margin: { t: 14, r: 16, b: 44, l: 58 },
          x: { min: 0.002, max: 5, log: true, label: "距測試電荷的距離 r (mm)" },
          y: { min: 0, max: 1, tickCount: 5, label: "相對電位 φ", format: function (v) { return v.toFixed(1); } },
        });
        plotBox.appendChild(api.plot.svg);

        // --- 控制面板 ---
        var readout = C.readout([
          { key: "lam", label: "Debye 長度 λ_D", digits: 3, unit: " mm" },
          { key: "view", label: "畫面寬度", digits: 2, unit: " mm" },
          { key: "nd", label: "Debye 球內粒子數 N_D", digits: 0 },
          { key: "fpe", label: "電漿頻率 f_pe", digits: 0, unit: " MHz" },
        ]);
        api.readoutNode = readout;

        var neCtl = C.slider({
          label: "電子密度 n_e",
          min: 1e9,
          max: 1e12,
          value: 1e10,
          log: true,
          unit: "cm⁻³",
          format: function (v) {
            var e = Math.floor(Math.log10(v));
            return (v / Math.pow(10, e)).toFixed(1) + "×10" + C.sup(e);
          },
          onChange: function (v) {
            api.state.ne = v;
            api.refresh();
          },
        });

        var teCtl = C.slider({
          label: "電子溫度 T_e",
          min: 1,
          max: 10,
          step: 0.5,
          value: 3,
          unit: "eV",
          digits: 1,
          onChange: function (v) {
            api.state.Te = v;
            api.refresh();
          },
        });

        var polCtl = C.segmented({
          label: "測試電荷",
          options: [
            { value: 1, label: "正電荷 +" },
            { value: -1, label: "負電荷 −" },
          ],
          value: 1,
          onChange: function (v) {
            api.state.polarity = +v;
            api.reseed();
            api.refresh();
          },
        });

        var coulCtl = C.toggle({
          label: "同時顯示「沒有電漿時」的裸庫倫電位",
          value: true,
          onChange: function (v) {
            api.state.showCoulomb = v;
            api.refresh();
          },
        });

        var presets = C.segmented({
          label: "典型條件",
          options: [
            { value: "ccp", label: "CCP" },
            { value: "icp", label: "ICP" },
          ],
          value: "ccp",
          onChange: function (v) {
            var p = v === "icp" ? { ne: 1e12, Te: 3 } : { ne: 1e10, Te: 3 };
            neCtl.setValue(p.ne, true);
            teCtl.setValue(p.Te, true);
            api.state.ne = p.ne;
            api.state.Te = p.Te;
            api.reseed();
            api.refresh();
          },
        });

        api.el.appendChild(C.panel([neCtl, teCtl, presets, polCtl, coulCtl]));
        api.el.appendChild(readout);
        api.el.appendChild(
          C.observations([
            "按「ICP」——  n_e 高 100 倍,λ_D 掉到十分之一。比例尺數字會告訴你畫面縮小了多少。",
            "驗證 λ_D ∝ √(T_e/n_e):把 T_e 從 2.5 調到 10(4 倍),λ_D 應該變成 2 倍。",
            "打開「裸庫倫電位」對照 —— 沒有電漿時電位拖著長長的尾巴;有電漿時超過 λ_D 就幾乎歸零。",
            "切成負電荷:離子被吸過來、電子被推開,遮蔽照樣發生。遮蔽與電荷正負無關。",
          ])
        );

        api.refresh();
      },

      reset: function () {
        this.state.ne = 1e10;
        this.state.Te = 3;
        this.state.polarity = 1;
        this.reseed();
        this.refresh();
      },

      tick: function (dt) {
        // 粒子只做小幅熱擾動 —— 這是靜態的遮蔽結構,不是流動
        var api = this;
        api.sys.each(function (p) {
          p.x += p.vx * dt * 0.25;
          p.y += p.vy * dt * 0.25;
          if (p.x < 0 || p.x > api.width) p.vx = -p.vx;
          if (p.y < 0 || p.y > api.height) p.vy = -p.vy;
        });
      },

      draw: function () {
        var api = this;
        if (!api.ctx) return;
        var ctx = api.ctx;
        var p = PA.canvasTheme.palette();
        var w = api.width;
        var h = api.height;
        var cx = w / 2;
        var cy = h / 2;
        var lamPx = api.lamPx();

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = p.bg;
        ctx.fillRect(0, 0, w, h);

        // Debye 圈
        ctx.save();
        ctx.strokeStyle = p.primary;
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, lamPx, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = p.primary;
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillText("λ_D", cx + lamPx + 5, cy - 5);
        ctx.restore();

        api.sys.draw(ctx, p);

        // 測試電荷
        ctx.save();
        var q = api.state.polarity;
        ctx.fillStyle = q > 0 ? p.vizIonPos : p.vizIonNeg;
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.bg;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(cx - 4.5, cy);
        ctx.lineTo(cx + 4.5, cy);
        if (q > 0) {
          ctx.moveTo(cx, cy - 4.5);
          ctx.lineTo(cx, cy + 4.5);
        }
        ctx.stroke();
        ctx.restore();

        // 比例尺 —— 「λ_D 變小」靠這個數字表達
        var lam = api.lambdaD();
        ctx.save();
        ctx.strokeStyle = p.textSubtle;
        ctx.fillStyle = p.textSubtle;
        ctx.lineWidth = 1.5;
        ctx.font = "11px system-ui, sans-serif";
        ctx.textBaseline = "bottom";
        var barY = h - 14;
        ctx.beginPath();
        ctx.moveTo(12, barY);
        ctx.lineTo(12 + lamPx, barY);
        ctx.moveTo(12, barY - 4);
        ctx.lineTo(12, barY + 4);
        ctx.moveTo(12 + lamPx, barY - 4);
        ctx.lineTo(12 + lamPx, barY + 4);
        ctx.stroke();
        ctx.fillText(
          (lam < 0.1 ? lam.toFixed(3) : lam.toFixed(2)) + " mm",
          12,
          barY - 6
        );
        ctx.restore();

        drawLegend(ctx, p, w);
      },
    });

    function drawLegend(ctx, p, w) {
      var items = [
        { label: "電子", token: "vizElectron", r: 1.8 },
        { label: "正離子", token: "vizIonPos", r: 3.4 },
      ];
      ctx.save();
      ctx.font = "11px system-ui, sans-serif";
      ctx.textBaseline = "middle";
      var x = w - 8;
      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i];
        var tw = ctx.measureText(it.label).width;
        x -= tw;
        ctx.fillStyle = p.textMuted;
        ctx.fillText(it.label, x, 14);
        x -= 8;
        ctx.fillStyle = p[it.token];
        ctx.beginPath();
        ctx.arc(x, 14, it.r, 0, Math.PI * 2);
        ctx.fill();
        x -= 14;
      }
      ctx.restore();
    }
  });
})((window.PA = window.PA || {}));
