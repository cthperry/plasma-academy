/* ==========================================================================
   A17 — Coburn–Winters 實驗重現
   章節 3.1 · 規格 docs/05-animation-spec.md

   目標:親眼看到協同效應,理解異向性的根本。

   驗收條件(docs/05):三階段的相對速率與 3.1.2 表格一致(5 / 55 / 2)。

   協同不是「兩個效果相加」。5 + 2 應該是 7,實驗得到 55 ——
   所以模型必須是乘積型的:離子把 SiFx 打成揮發性的 SiF₄,
   沒有 SiFx 可打時離子只剩純濺鍍。這個結構直接決定了異向性:
   側壁有自由基但沒有離子,所以只走得到「5」那一格。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A17",
    function () {
      var C = PA.controls;

      // docs/03 §3.1.2 的三階段相對速率
      var TARGET = { chem: 5, both: 55, phys: 2 };

      /**
       * 協同模型。
       *   化學項:自由基把表面變成 SiFx,但反應停在那裡 → 慢
       *   物理項:純動量濺鍍 → 更慢
       *   協同項:離子把已經生成的 SiFx 打成 SiF₄ 脫附
       *          → 正比於「自由基 × 離子」的乘積,這才是 55 的來源
       * 係數由三個目標值反推,所以模型不可能和課文表格漂移。
       */
      var K_CHEM = TARGET.chem;
      var K_PHYS = TARGET.phys;
      var K_SYN = TARGET.both - TARGET.chem - TARGET.phys; // = 48

      function rate(hasGas, hasIon) {
        var g = hasGas ? 1 : 0;
        var i = hasIon ? 1 : 0;
        return K_CHEM * g + K_PHYS * i + K_SYN * g * i;
      }

      var STAGES = [
        { key: "chem", label: "只有 XeF₂", gas: true, ion: false },
        { key: "both", label: "XeF₂ + Ar⁺", gas: true, ion: true },
        { key: "phys", label: "只有 Ar⁺", gas: false, ion: true },
      ];

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = { gas: true, ion: false, view: "surface" };
          api.t = 0;
          api.history = []; // [時間, 速率],畫成原始論文那張圖

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
            "Si 表面的分子級示意:XeF₂ 分子在表面形成 SiFx 層,Ar⁺ 離子把它打成揮發的 SiF₄。" +
              "只有兩者同時存在時蝕刻才快。"
          );
          canvasBox.appendChild(canvas);
          api.canvas = canvas;

          api.sys = PA.particles.create({ max: 400, width: 100, height: 100 });

          api.plot = PA.plot.create({
            width: 540,
            height: 280,
            margin: { t: 18, r: 20, b: 46, l: 58 },
            x: { min: 0, max: 30, ticks: [0, 10, 20, 30], label: "時間 (s)", format: function (v) { return v.toFixed(0); } },
            y: { min: 0, max: 65, tickCount: 5, label: "Si 蝕刻率(相對)", format: function (v) { return v.toFixed(0); } },
          });
          plotBox.appendChild(api.plot.svg);

          api.rate = function () {
            return rate(api.state.gas, api.state.ion);
          };

          api.refresh = function () {
            if (!api.plot) return;
            var pl = api.plot;
            var pal = PA.canvasTheme.palette();
            pl.clear();

            // 三個階段的參考帶
            [
              [0, 10, TARGET.chem, "只有 XeF₂", pal.vizRadical],
              [10, 20, TARGET.both, "兩者同時", pal.success],
              [20, 30, TARGET.phys, "只有 Ar⁺", pal.vizIonPos],
            ].forEach(function (b) {
              pl.line([[b[0], b[2]], [b[1], b[2]]], { stroke: b[4], width: 1.6, dash: "4 3" });
              pl.label((b[0] + b[1]) / 2, b[2], b[3] + " = " + b[2], {
                fill: b[4], dy: -8, size: 11, anchor: "middle",
              });
            });

            // 實際走過的軌跡
            if (api.history.length > 1) {
              pl.line(api.history, { stroke: pal.primary, width: 2.6 });
            }

            // 「相加」與「實測」的落差 —— 本元件的重點
            pl.hline(TARGET.chem + TARGET.phys, { stroke: pal.danger, dash: "5 3" });
            pl.label(2, TARGET.chem + TARGET.phys, "若只是相加 = 7", {
              fill: pal.danger, dx: 4, dy: -6, size: 11,
            });

            if (api.readoutNode) {
              api.readoutNode.update({
                now: api.rate(),
                sum: TARGET.chem + TARGET.phys,
                syn: api.rate() / (TARGET.chem + TARGET.phys),
                mode: api.state.gas && api.state.ion
                  ? "協同 —— 離子輔助反應性蝕刻"
                  : api.state.gas
                  ? "純化學(等向)"
                  : api.state.ion
                  ? "純物理濺鍍(效率極低)"
                  : "兩者都關 —— 不蝕刻",
              });
            }
          };

          var detach = PA.canvasTheme.autoSize(canvas, canvasBox, 2 / 1, function (ctx, w, h) {
            api.ctx = ctx;
            api.width = w;
            api.height = h;
            api.sys.resize(w, h);
          });
          api.onDestroy(detach);

          var readout = C.readout([
            { key: "now", label: "目前蝕刻率(相對)", digits: 0 },
            { key: "sum", label: "化學 + 物理(若可相加)", digits: 0 },
            { key: "syn", label: "協同倍率", digits: 1, unit: " 倍" },
            { key: "mode", label: "機制", format: function (v) { return v; } },
          ]);
          api.readoutNode = readout;

          var gasCtl = C.toggle({
            label: "XeF₂ 氣體(自由基)",
            value: true,
            onChange: function (v) { api.state.gas = v; api.refresh(); },
          });
          var ionCtl = C.toggle({
            label: "Ar⁺ 離子束",
            value: false,
            onChange: function (v) { api.state.ion = v; api.refresh(); },
          });

          var seqCtl = C.segmented({
            label: "重現原始實驗",
            options: [{ value: "run", label: "▶ 依序跑三階段" }],
            value: "",
            onChange: function () {
              api.t = 0;
              api.history = [];
              api.seq = true;
              api.start();
            },
          });

          var viewCtl = C.segmented({
            label: "視角",
            options: [
              { value: "surface", label: "分子級表面" },
              { value: "trench", label: "溝槽剖面" },
            ],
            value: "surface",
            onChange: function (v) { api.state.view = v; },
          });

          api.el.appendChild(C.panel([gasCtl, ionCtl, seqCtl, viewCtl]));
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "按「依序跑三階段」看完整重現:只有 XeF₂ 得 5、兩者同時得 55、只有 Ar⁺ 得 2 —— 與 1979 年 Coburn–Winters 的原始數據一致。",
              "5 + 2 應該是 7,實測卻是 55。紅色虛線就是「若能相加」的位置 —— 差了將近八倍。協同不是相加,是相乘。",
              "為什麼?自由基單獨作用時,反應停在表面的 SiFx 層就走不下去了。離子的工作不是自己刻,而是把 SiFx 打成揮發性的 SiF₄ 讓它離開,順便打斷 Si–Si 鍵產生新的反應位置。",
              "只開離子:表面沒有 SiFx 可打,離子只能靠純動量濺鍍 —— 所以只有 2。這也說明了為什麼純物理蝕刻在製程上沒有實用性。",
              "切到「溝槽剖面」:同樣的機制,溝底同時有離子與自由基(走到 55),側壁只有自由基(停在 5)。底部快 11 倍 —— 這就是異向性的根本,不需要任何額外假設。",
            ])
          );

          api.refresh();
        },

        reset: function () {
          this.state = { gas: true, ion: false, view: "surface" };
          this.t = 0;
          this.history = [];
          this.seq = false;
          this.refresh();
        },

        tick: function (dt) {
          var api = this;
          if (api.seq) {
            api.t += dt * 3;
            // 依序:0–10 s 只有氣體、10–20 s 兩者、20–30 s 只有離子
            if (api.t < 10) { api.state.gas = true; api.state.ion = false; }
            else if (api.t < 20) { api.state.gas = true; api.state.ion = true; }
            else if (api.t < 30) { api.state.gas = false; api.state.ion = true; }
            else { api.seq = false; }
            api.history.push([Math.min(api.t, 30), api.rate()]);
            if (api.history.length > 600) api.history.shift();
            api._fc = (api._fc || 0) + 1;
            if (api._fc % 6 === 0) api.refresh();
          }

          // 粒子:氣體分子從上方飄下,離子垂直射下
          var sys = api.sys;
          var w = api.width || 400, h = api.height || 200;
          api._acc = (api._acc || 0) + dt;
          while (api._acc > 0.05) {
            api._acc -= 0.05;
            if (api.state.gas && sys.count < sys.max - 4) {
              sys.spawn(function (p) {
                p.kind = "radical";
                p.x = Math.random() * w;
                p.y = 4;
                var a = Math.PI / 2 + (Math.random() - 0.5) * 2.2; // 等向入射
                var sp = 70 + Math.random() * 40;
                p.vx = Math.cos(a) * sp;
                p.vy = Math.abs(Math.sin(a) * sp);
              });
            }
            if (api.state.ion && sys.count < sys.max - 4) {
              sys.spawn(function (p) {
                p.kind = "ionPos";
                p.x = Math.random() * w;
                p.y = 4;
                p.vx = 0; // 垂直入射 —— 這是它和自由基唯一的差別
                p.vy = 150;
              });
            }
          }

          var floor = h * 0.72;
          sys.each(function (p) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.x < 0) p.x += w; else if (p.x > w) p.x -= w;
            if (p.y > floor) sys.kill(p);
          });
        },

        draw: function () {
          var api = this;
          if (!api.ctx) return;
          var ctx = api.ctx;
          var p = PA.canvasTheme.palette();
          var w = api.width, h = api.height;
          var floor = h * 0.72;

          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = p.bg;
          ctx.fillRect(0, 0, w, h);

          if (api.state.view === "trench") {
            // --- 溝槽剖面:直接把異向性導出來 ---
            var mx = w * 0.3, tw = w * 0.4;
            ctx.fillStyle = p.vizSubstrate;
            ctx.fillRect(0, h * 0.25, w, h * 0.75);
            ctx.fillStyle = p.bg;
            ctx.fillRect(mx, h * 0.25, tw, h * 0.45);
            ctx.fillStyle = p.vizMask;
            ctx.fillRect(0, h * 0.16, mx, h * 0.09);
            ctx.fillRect(mx + tw, h * 0.16, w - mx - tw, h * 0.09);

            // 溝底:兩者都有
            ctx.font = "600 12px system-ui, sans-serif";
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";
            ctx.fillStyle = p.success;
            ctx.fillText("溝底:離子 + 自由基 → " + rate(true, true), mx + tw / 2, h * 0.78);
            // 側壁:只有自由基
            ctx.fillStyle = p.warning;
            ctx.textAlign = "right";
            ctx.fillText("側壁:只有自由基 → " + rate(true, false), mx - 8, h * 0.5);
            ctx.textAlign = "left";
            ctx.fillText("→ 底部快 " + (rate(true, true) / rate(true, false)).toFixed(0) + " 倍", mx + tw + 8, h * 0.5);
            ctx.textAlign = "left";

            // 離子只往下、自由基四面八方
            ctx.strokeStyle = p.vizIonPos;
            ctx.lineWidth = 1.6;
            for (var i = 1; i <= 5; i++) {
              var x = mx + (tw * i) / 6;
              ctx.beginPath();
              ctx.moveTo(x, h * 0.05);
              ctx.lineTo(x, h * 0.68);
              ctx.stroke();
            }
            ctx.fillStyle = p.textMuted;
            ctx.font = "11px system-ui, sans-serif";
            ctx.fillText("Ar⁺ 垂直入射 —— 打不到側壁", 8, h * 0.06);
            return;
          }

          // --- 分子級表面 ---
          // SiFx 表面層:只有在有自由基時才長出來
          var layerH = api.state.gas ? 10 : 2;
          ctx.fillStyle = p.vizSubstrate;
          ctx.fillRect(0, floor, w, h - floor);
          if (api.state.gas) {
            ctx.fillStyle = p.vizRadical;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(0, floor - layerH, w, layerH);
            ctx.globalAlpha = 1;
          }

          api.sys.draw(ctx, p);

          ctx.font = "11px system-ui, sans-serif";
          ctx.textBaseline = "middle";
          ctx.fillStyle = p.textMuted;
          ctx.fillText("Si 基材", 8, h - 12);
          if (api.state.gas) {
            ctx.fillStyle = p.vizRadical;
            ctx.fillText("SiFx 表面層 —— 反應停在這裡", 8, floor - layerH - 8);
          }

          // 有協同時,畫出脫附的 SiF₄
          if (api.state.gas && api.state.ion) {
            ctx.save();
            ctx.fillStyle = p.success;
            ctx.font = "600 12px system-ui, sans-serif";
            var t = (Date.now() % 1400) / 1400;
            for (var k = 0; k < 5; k++) {
              var xx = w * (0.15 + k * 0.18);
              var yy = floor - 14 - t * h * 0.4;
              ctx.globalAlpha = 1 - t;
              ctx.fillText("SiF₄ ↑", xx, yy);
            }
            ctx.restore();
          }

          ctx.save();
          ctx.font = "700 14px system-ui, sans-serif";
          ctx.textAlign = "right";
          ctx.textBaseline = "top";
          ctx.fillStyle =
            api.state.gas && api.state.ion ? p.success : api.rate() > 0 ? p.warning : p.textMuted;
          ctx.fillText("蝕刻率 " + api.rate(), w - 10, 10);
          ctx.restore();
        },
      });
    }
  );
})((window.PA = window.PA || {}));
