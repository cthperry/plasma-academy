/* ==========================================================================
   A04 — 電子雪崩動畫
   章節 1.4 · 規格 docs/05-animation-spec.md

   目標:看見指數成長,理解 α 與 γ 各自的角色。

   驗收條件(docs/05):γ = 0 時放電無法自持(數次雪崩後熄滅)。
   這一點是整個元件的重點 —— 光有雪崩不會自持,必須有二次電子補回種子。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define("A04", function () {
    var C = PA.controls;

    return PA.lab.create({
      setup: function () {
        var api = this;

        api.state = { eOverP: 120, gamma: 0.08, d: 1.0 };
        api.gen = 0; // 第幾代雪崩
        api.history = []; // 每代的電子數
        api.seedsFromCathode = 0;
        api.dead = false;

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
          "種子電子被電場加速並游離出更多電子,形成指數成長的雪崩;離子撞擊陰極打出二次電子"
        );
        canvasBox.appendChild(canvas);
        api.canvas = canvas;

        api.sys = PA.particles.create({ max: 900, width: 100, height: 100 });

        /** Townsend 第一係數(相對值):α/p = A·exp(−B/(E/p)) */
        api.alpha = function () {
          var A = 12,
            B = 180;
          return A * Math.exp(-B / Math.max(api.state.eOverP, 1));
        };

        /** 每代倍增率 e^(αd) */
        api.multiplier = function () {
          return Math.exp(api.alpha() * api.state.d);
        };

        /** 自持條件 γ(e^(αd) − 1) = 1 */
        api.selfSustain = function () {
          return api.state.gamma * (api.multiplier() - 1);
        };

        api.launch = function (n, fromCathode) {
          var sys = api.sys;
          for (var i = 0; i < n && sys.count < sys.max - 2; i++) {
            sys.spawn(function (p) {
              p.kind = "electron";
              p.x = api.width * (0.12 + Math.random() * 0.06);
              p.y = api.height * (0.2 + Math.random() * 0.6);
              p.vx = 70 + Math.random() * 20;
              p.vy = (Math.random() - 0.5) * 18;
              p.data = { seed: !!fromCathode, born: api.width * 0.15 };
            });
          }
          if (fromCathode) api.seedsFromCathode += n;
        };

        api.restart = function () {
          api.sys.clear();
          api.gen = 0;
          api.history = [];
          api.seedsFromCathode = 0;
          api.dead = false;
          api.launch(1, false);
          api.refresh();
        };

        /** 重畫成長曲線與數值面板 */
        api.refresh = function () {
          // autoSize 的回呼可能早於 plot 建立就觸發 restart → refresh
          if (!api.plot) return;
          var pl = api.plot;
          var pal = PA.canvasTheme.palette();
          pl.clear();

          // 理論曲線 n(x) = e^(αx)
          var a = api.alpha();
          var theory = pl.sample(function (x) {
            return Math.exp(a * x);
          }, 120);
          pl.line(theory, { stroke: pal.primary, width: 2.4 });
          pl.label(api.state.d * 0.55, Math.exp(a * api.state.d * 0.55), "n = e^(αx)", {
            fill: pal.primary,
            dx: 6,
            dy: -8,
          });

          // 實際觀測到的各代電子數
          if (api.history.length > 1) {
            var obs = api.history.map(function (n, i) {
              return [(i / Math.max(api.history.length - 1, 1)) * api.state.d, Math.max(n, 1)];
            });
            pl.line(obs, { stroke: pal.warning, width: 2, dash: "4 3" });
          }

          pl.vline(api.state.d, { stroke: pal.textSubtle, dash: "3 3" });

          var S = api.selfSustain();
          if (api.readoutNode) {
            api.readoutNode.update({
              alpha: a,
              mult: api.multiplier(),
              sustain: S,
              verdict:
                api.state.gamma === 0
                  ? "無二次電子 → 熄滅"
                  : S >= 1
                  ? "自持 ✅"
                  : "衰減 → 熄滅",
            });
          }
        };

        api.plot = PA.plot.create({
          width: 520,
          height: 250,
          margin: { t: 16, r: 16, b: 44, l: 60 },
          x: { min: 0, max: 1.2, tickCount: 6, label: "距陰極的距離 x (cm)", format: function (v) { return v.toFixed(1); } },
          y: { min: 1, max: 1e4, log: true, label: "電子數" },
        });
        plotBox.appendChild(api.plot.svg);

        var detach = PA.canvasTheme.autoSize(canvas, canvasBox, 2 / 1, function (ctx, w, h) {
          api.ctx = ctx;
          api.width = w;
          api.height = h;
          api.sys.resize(w, h);
          if (!api.seeded) { api.restart(); api.seeded = true; }
        });
        api.onDestroy(detach);

        var readout = C.readout([
          { key: "alpha", label: "α(每 cm 游離數)", digits: 2 },
          { key: "mult", label: "每代倍增 e^(αd)", digits: 1, unit: " 倍" },
          { key: "sustain", label: "自持判據 γ(e^αᵈ−1)", digits: 2 },
          { key: "verdict", label: "結果", format: function (v) { return v; } },
        ]);
        api.readoutNode = readout;

        var eCtl = C.slider({
          label: "約化電場 E/p",
          min: 20,
          max: 200,
          value: 120,
          step: 5,
          unit: "V/(cm·Torr)",
          digits: 0,
          onChange: function (v) { api.state.eOverP = v; api.restart(); },
        });

        var gCtl = C.slider({
          label: "二次電子係數 γ",
          min: 0,
          max: 0.2,
          value: 0.08,
          step: 0.005,
          digits: 3,
          onChange: function (v) { api.state.gamma = v; api.restart(); },
        });

        var dCtl = C.slider({
          label: "間距 d",
          min: 0.3,
          max: 1.2,
          value: 1.0,
          step: 0.05,
          unit: "cm",
          digits: 2,
          onChange: function (v) { api.state.d = v; api.restart(); },
        });

        var transport = C.transport({
          playing: true,
          onPlay: function () { api.start(); },
          onPause: function () { api.stop(); },
          onReset: function () {
            eCtl.setValue(120, true); gCtl.setValue(0.08, true); dCtl.setValue(1.0, true);
            api.state.eOverP = 120; api.state.gamma = 0.08; api.state.d = 1.0;
            api.restart();
          },
        });

        api.el.appendChild(C.panel([eCtl, gCtl, dCtl, transport]));
        api.el.appendChild(readout);
        api.el.appendChild(
          C.observations([
            "把 γ 拉到 0 —— 雪崩衝到陽極就結束了,沒有新的種子電子,放電熄滅。這就是為什麼光有 α 不夠。",
            "把 γ 調回 0.08 —— 判據回到 1 以上,雪崩就一代接一代持續下去。這才是「放電」。",
            "E/p 從 120 調到 60 → α 從 2.7 掉到 0.6(指數關係)→ 倍增不足 → 熄滅。這對應 Paschen 曲線的左支。",
            "γ 依陰極材料而定。腔體零件換過、電極被鍍上聚合物之後 γ 就變了 —— 「同一支 recipe 換了 PM 之後點不著」常常是這個原因。",
          ])
        );
      },

      reset: function () { this.restart(); },

      tick: function (dt) {
        var api = this;
        var sys = api.sys;
        var w = api.width || 400;
        var xEnd = w * (0.15 + 0.7 * (api.state.d / 1.2));
        var a = api.alpha();

        var arrivedThisFrame = 0;

        sys.each(function (p) {
          if (p.kind !== "electron") {
            // 離子緩慢漂向陰極
            p.x -= 26 * dt;
            if (p.x <= w * 0.15) {
              sys.kill(p);
              // γ 機率打出二次電子 —— 自持的來源
              if (Math.random() < api.state.gamma) api.launch(1, true);
            }
            return;
          }

          var before = p.x;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.y < 4 || p.y > api.height - 4) p.vy = -p.vy;

          // 走過 Δx 就以機率 α·Δx 游離一次
          var dx = (p.x - before) / (w * 0.7 / 1.2); // 換算成 cm
          if (Math.random() < a * dx && sys.count < sys.max - 3) {
            sys.spawn(function (np) {
              np.kind = "electron";
              np.x = p.x;
              np.y = p.y + (Math.random() - 0.5) * 10;
              np.vx = 70 + Math.random() * 20;
              np.vy = (Math.random() - 0.5) * 18;
              np.data = { seed: false };
            });
            sys.spawn(function (ip) {
              ip.kind = "ionPos";
              ip.x = p.x;
              ip.y = p.y;
              ip.vx = 0;
              ip.vy = 0;
              ip.data = {};
            });
          }

          if (p.x >= xEnd) {
            arrivedThisFrame++;
            sys.kill(p);
          }
        });

        if (arrivedThisFrame > 0) {
          api.history.push(arrivedThisFrame);
          if (api.history.length > 24) api.history.shift();
        }

        // 電子全部走光且沒有離子在路上 → 熄滅,自動重新點一顆種子做示範
        var alive = 0;
        sys.each(function (p) { alive++; });
        if (alive === 0) {
          api.dead = true;
          api._idle = (api._idle || 0) + dt;
          if (api._idle > 1.2) { api._idle = 0; api.launch(1, false); }
        } else {
          api.dead = false;
          api._idle = 0;
        }

        api._fc = (api._fc || 0) + 1;
        if (api._fc % 30 === 0) api.refresh();
      },

      draw: function () {
        var api = this;
        if (!api.ctx) return;
        var ctx = api.ctx;
        var p = PA.canvasTheme.palette();
        var w = api.width, h = api.height;
        var xCat = w * 0.15;
        var xAno = w * (0.15 + 0.7 * (api.state.d / 1.2));

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = p.bg;
        ctx.fillRect(0, 0, w, h);

        // 電極
        ctx.fillStyle = p.borderStrong;
        ctx.fillRect(xCat - 8, 0, 8, h);
        ctx.fillRect(xAno, 0, 8, h);
        ctx.fillStyle = p.textSubtle;
        ctx.font = "11px system-ui, sans-serif";
        ctx.textBaseline = "top";
        ctx.fillText("陰極 −", xCat - 6, 6);
        ctx.fillText("陽極 +", xAno + 10, 6);

        // 電場方向
        ctx.save();
        ctx.strokeStyle = p.primary;
        ctx.globalAlpha = 0.28;
        ctx.lineWidth = 1;
        for (var i = 1; i <= 4; i++) {
          var y = (h * i) / 5;
          ctx.beginPath();
          ctx.moveTo(xCat + 6, y);
          ctx.lineTo(xAno - 6, y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(xAno - 12, y - 3);
          ctx.lineTo(xAno - 6, y);
          ctx.lineTo(xAno - 12, y + 3);
          ctx.stroke();
        }
        ctx.restore();

        api.sys.draw(ctx, p);

        // 二次電子計數 —— 讓 γ 的作用看得見
        ctx.save();
        ctx.fillStyle = p.warning;
        ctx.font = "600 12px system-ui, sans-serif";
        ctx.textBaseline = "bottom";
        ctx.fillText("陰極打出的二次電子:" + api.seedsFromCathode, xCat + 10, h - 8);
        ctx.restore();
      },
    });
  });
})((window.PA = window.PA || {}));
