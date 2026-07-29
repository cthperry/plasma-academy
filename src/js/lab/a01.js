/* ==========================================================================
   A01 — 氣體→電漿相變粒子動畫
   章節 1.1 · 規格 docs/05-animation-spec.md

   目標:建立「電漿是氣體中極少數粒子被游離」的直覺,並看到游離度有多低。

   ⚠️ 誠實標註:為了讓帶電粒子看得見,本元件的游離度刻意放大。
      畫面上必須明白寫出放大倍率(規格書驗收條件)。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define("A01", function () {
    var C = PA.controls;

    return PA.lab.create({
      setup: function () {
        var api = this;

        // --- 狀態 ---
        api.state = {
          field: 0, // V/cm
          pressure: 20, // mTorr
          showOnlyCharged: false,
          ionizedFrac: 0,
        };

        // --- Canvas ---
        var canvas = document.createElement("canvas");
        canvas.setAttribute("role", "img");
        canvas.setAttribute(
          "aria-label",
          "腔體剖面粒子模擬:施加電場後少數中性粒子被游離為電子與正離子"
        );
        api.stage.appendChild(canvas);
        api.canvas = canvas;

        api.sys = PA.particles.create({ max: 900, width: 100, height: 100 });

        // --- 實例輔助方法 ---

        api.seed = function () {
          var sys = api.sys;
          if (!sys || !api.width) return;
          sys.clear();
          var n = PA.particles.budget() < 900 ? 360 : 600;
          for (var i = 0; i < n; i++) {
            sys.spawn(function (pt) {
              pt.kind = "neutral";
              pt.x = Math.random() * api.width;
              pt.y = 6 + Math.random() * (api.height - 12);
              var a = Math.random() * Math.PI * 2;
              var sp = sys.thermalSpeed(18);
              pt.vx = Math.cos(a) * sp;
              pt.vy = Math.sin(a) * sp;
            });
          }
          // 種子電子 —— 沒有它就永遠點不著(1.4 會正式講為什麼)
          for (var j = 0; j < 6; j++) {
            sys.spawn(function (pt) {
              pt.kind = "electron";
              pt.x = Math.random() * api.width;
              pt.y = api.height * 0.7;
              pt.vx = (Math.random() - 0.5) * 40;
              pt.vy = -Math.random() * 40;
            });
          }
        };

        /** 水塘抽樣:從中性粒子中均勻挑一顆 */
        api.pickNeutral = function () {
          var found = null;
          var seen = 0;
          api.sys.each(function (pt) {
            if (pt.kind !== "neutral") return;
            seen++;
            if (Math.random() < 1 / seen) found = pt;
          });
          return found;
        };

        // 窄螢幕用較高的比例,否則粒子被拉得太扁、看不出密度
        var aspect = function (w) {
          return w < 520 ? 4 / 3 : 16 / 9;
        };
        var detach = PA.canvasTheme.autoSize(canvas, api.stage, aspect, function (ctx, w, h) {
          api.ctx = ctx;
          api.width = w;
          api.height = h;
          api.sys.resize(w, h);
          if (!api.seeded) {
            api.seed();
            api.seeded = true;
          }
        });
        api.onDestroy(detach);

        // --- 控制面板 ---
        var readout = C.readout([
          { key: "alpha", label: "畫面游離度", format: fmtAlpha },
          { key: "real", label: "實際製程", format: function () { return "~10⁻⁵"; } },
          { key: "charged", label: "帶電粒子", digits: 0 },
          { key: "total", label: "總粒子", digits: 0 },
        ]);
        api.readoutNode = readout;

        var fieldCtl = C.slider({
          label: "電場強度",
          min: 0,
          max: 500,
          step: 10,
          value: 0,
          unit: "V/cm",
          digits: 0,
          onChange: function (v) {
            api.state.field = v;
          },
        });

        var pressCtl = C.slider({
          label: "氣壓",
          min: 1,
          max: 100,
          value: 20,
          unit: "mTorr",
          log: true,
          digits: 0,
          onChange: function (v) {
            api.state.pressure = v;
          },
        });

        var modeCtl = C.segmented({
          label: "顯示",
          options: [
            { value: "all", label: "全部粒子" },
            { value: "charged", label: "只顯示帶電粒子" },
          ],
          value: "all",
          onChange: function (v) {
            api.state.showOnlyCharged = v === "charged";
          },
        });

        var transport = C.transport({
          playing: true,
          onPlay: function () {
            api.start();
          },
          onPause: function () {
            api.stop();
          },
          onReset: function () {
            fieldCtl.setValue(0, true);
            pressCtl.setValue(20, true);
            modeCtl.setValue("all", true);
            api.state.field = 0;
            api.state.pressure = 20;
            api.state.showOnlyCharged = false;
            api.seed();
          },
        });

        api.el.appendChild(C.panel([fieldCtl, pressCtl, modeCtl, transport]));
        api.el.appendChild(readout);

        // 誠實標註誇大 —— 規格書要求
        var caveat = document.createElement("div");
        caveat.className = "pa-lab__caveat";
        caveat.textContent =
          "⚠️ 為了讓帶電粒子看得見,本模擬的游離度刻意放大約 1000 倍。" +
          "實際 CCP 製程電漿約 10⁻⁵ —— 若照真實比例,900 顆粒子裡連一顆離子都不會出現。";
        api.el.appendChild(caveat);

        api.el.appendChild(
          C.observations([
            "先不要動電場。注意畫面上全是灰色的中性粒子。",
            "把電場拉到 300 V/cm 以上,看有多少粒子變色 —— 切到「只顯示帶電粒子」模式數數看。",
            "電子(小藍點)跑得多快?正離子(大紅點)幾乎沒動 —— 質量差 73000 倍。",
            "把氣壓調高,碰撞變頻繁,電子累積不到游離能,游離度反而下降。",
          ])
        );
      },

      reset: function () {
        this.seed();
      },

      tick: function (dt) {
        var api = this;
        var s = api.state;
        var sys = api.sys;
        var w = api.width || 1;
        var h = api.height || 1;

        // 平均自由徑(像素):壓力越高越短。以 10 mTorr ≈ 半個腔體寬為基準。
        var mfpPx = (w * 0.5 * 10) / Math.max(s.pressure, 0.5);

        // 電場加速度(畫面單位)。只有電子跟得上,離子質量大 73000 倍。
        var accE = s.field * 0.9;
        var accI = accE / 200; // 視覺上刻意不用真實的 73000,否則離子完全不動看不出差異

        var ionized = 0;
        var total = 0;

        sys.each(function (p) {
          total++;
          if (p.kind === "electron") {
            p.vy -= accE * dt; // 電場方向:向上
            var speed = Math.hypot(p.vx, p.vy);
            var dist = speed * dt;

            if (sys.collides(dist, mfpPx)) {
              // 電子動能是否足以游離?用速度平方當代理量
              var ke = speed * speed;
              var threshold = 9000; // 對應 Ar 15.76 eV 的畫面尺度
              if (ke > threshold && sys.count < sys.max - 2) {
                // 游離:產生一對新的電子 + 正離子,原電子失去能量
                var host = api.pickNeutral();
                if (host) {
                  host.kind = "ionPos";
                  host.vx *= 0.25;
                  host.vy *= 0.25;
                  sys.spawn(function (np) {
                    np.kind = "electron";
                    np.x = host.x;
                    np.y = host.y;
                    var a = Math.random() * Math.PI * 2;
                    np.vx = Math.cos(a) * 30;
                    np.vy = Math.sin(a) * 30;
                  });
                  p.vx *= 0.3;
                  p.vy *= 0.3;
                }
              } else {
                sys.scatter(p);
              }
            }
          } else if (p.kind === "ionPos") {
            ionized++;
            p.vy += accI * dt; // 正離子往反方向,且慢得多
            if (sys.collides(Math.hypot(p.vx, p.vy) * dt, mfpPx)) {
              sys.scatter(p, 0.8);
            }
            // 抵達邊界即在器壁複合 —— 低壓下損失以器壁為主(1.3.4)
            if (p.y > h - 2 || p.y < 2) {
              p.kind = "neutral";
              p.vy = -p.vy * 0.3;
            }
          } else {
            if (sys.collides(Math.hypot(p.vx, p.vy) * dt, mfpPx)) {
              sys.scatter(p);
            }
          }
        });

        sys.integrate(dt, "bounce");

        s.ionizedFrac = total ? ionized / total : 0;
        api.counts = { charged: ionized * 2, total: total, alpha: s.ionizedFrac };

        // 節流更新數值面板(每 6 幀一次,避免數字狂跳)
        api._fc = (api._fc || 0) + 1;
        if (api._fc % 6 === 0 && api.readoutNode) {
          api.readoutNode.update({
            alpha: s.ionizedFrac,
            real: 0,
            charged: ionized * 2,
            total: total,
          });
        }
      },

      draw: function () {
        var api = this;
        if (!api.ctx) return;
        var ctx = api.ctx;
        var p = PA.canvasTheme.palette();
        var w = api.width;
        var h = api.height;

        ctx.clearRect(0, 0, w, h);

        // 腔體背景與電極
        ctx.fillStyle = p.bg;
        ctx.fillRect(0, 0, w, h);

        var eh = Math.max(6, h * 0.035);
        ctx.fillStyle = p.borderStrong;
        ctx.fillRect(0, 0, w, eh);
        ctx.fillRect(0, h - eh, w, eh);

        ctx.fillStyle = p.textSubtle;
        ctx.font = "11px system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText("電極(−)", 8, eh / 2);
        ctx.fillText("電極(+)", 8, h - eh / 2);

        // 電場箭頭
        if (api.state.field > 0) {
          ctx.save();
          ctx.strokeStyle = p.primary;
          ctx.globalAlpha = Math.min(0.5, api.state.field / 500);
          ctx.lineWidth = 1.2;
          var n = 6;
          for (var i = 1; i <= n; i++) {
            var x = (w * i) / (n + 1);
            ctx.beginPath();
            ctx.moveTo(x, h - eh - 6);
            ctx.lineTo(x, eh + 6);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x - 3.5, eh + 12);
            ctx.lineTo(x, eh + 5);
            ctx.lineTo(x + 3.5, eh + 12);
            ctx.stroke();
          }
          ctx.restore();
        }

        // 粒子
        if (api.state.showOnlyCharged) {
          api.sys.each(function (pt) {
            pt.alpha = pt.kind === "neutral" ? 0.05 : 1;
          });
        } else {
          api.sys.each(function (pt) {
            pt.alpha = pt.kind === "neutral" ? 0.55 : 1;
          });
        }
        api.sys.draw(ctx, p);

        // 輝光:游離度越高越亮
        if (api.state.ionizedFrac > 0.002) {
          ctx.save();
          var g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h * 0.7);
          var a = Math.min(0.22, api.state.ionizedFrac * 6);
          g.addColorStop(0, "rgba(150,110,220," + a + ")");
          g.addColorStop(1, "rgba(150,110,220,0)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }

        // 圖例
        drawLegend(ctx, p, w, h);
      },
    });

    function drawLegend(ctx, p, w, h) {
      var items = [
        { label: "中性", token: "vizNeutral", shape: "dot", r: 2.2 },
        { label: "電子", token: "vizElectron", shape: "dot", r: 1.8 },
        { label: "正離子", token: "vizIonPos", shape: "plus", r: 3.6 },
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
        if (it.shape === "plus") {
          ctx.strokeStyle = p.bg;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x - 1.9, 14);
          ctx.lineTo(x + 1.9, 14);
          ctx.moveTo(x, 12.1);
          ctx.lineTo(x, 15.9);
          ctx.stroke();
        }
        x -= 14;
      }
      ctx.restore();
    }
  });

  function fmtAlpha(v) {
    if (!v) return "0";
    var e = Math.floor(Math.log10(v));
    var m = (v / Math.pow(10, e)).toFixed(1);
    var SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
    var sup = String(e).split("").map(function (c) { return SUP[c] || c; }).join("");
    return m + "×10" + sup;
  }
})((window.PA = window.PA || {}));
