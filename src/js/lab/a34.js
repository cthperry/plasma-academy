/* ==========================================================================
   A34 — PCB 除膠渣 CF₄ 比例計算器
   章節 3.8 · 規格 docs/05-animation-spec.md

   目標:讓學員親眼看到「**純 O₂ 一定留下玻纖突出**」,
   而且齊平度有一個最佳 CF₄ 比例 —— 加太多兩件事會同時變糟。

   主圖是兩條互相競爭的移除速率隨 CF₄ 比例的變化:
     · 樹脂 —— 先升後降(少量 F 打開高分子鏈,加多了把 O 稀釋掉)
     · 玻纖 —— 從 0 開始線性上升(沒有 F 就是零,不是「慢」)
   兩條的交點就是齊平。這是本章唯一要記住的一張圖。

   側邊是孔壁剖面示意:樹脂退多少、玻纖退多少,差額就是玻纖突出。

   物理在 js/lab/pcb-model.js,由 tools/check-pcb.mjs 以 21 項斷言守住,
   所以畫面上的數字與課文不可能漂移。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A34",
    function () {
      var C = PA.controls;
      var M = PA.pcbModel;

      /** 三個現場情境 */
      var PRESETS = [
        {
          key: "pure", label: "純 O₂(常見錯誤)",
          p: { cf4: 0, power: 300, pressure: 0.4, time: 15, target: "desmear" },
          why: "樹脂清得掉,玻纖一動也不動 —— 孔壁留下一根根玻纖突出,鍍銅包不住。",
        },
        {
          key: "flush", label: "齊平配方",
          p: { cf4: 0.2, power: 300, pressure: 0.4, time: 15, target: "desmear" },
          why: "CF₄ 20 %:樹脂與玻纖退得一樣多,孔壁齊平。這正是現場常用的 10–25 %。",
        },
        {
          key: "etchback", label: "回蝕(三面包覆)",
          p: { cf4: 0.2, power: 300, pressure: 0.4, time: 50, target: "etchback" },
          why: "同樣比例、時間拉到 50 min,讓樹脂再退一段,內層銅露出上下與端面三個面。",
        },
      ];

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = Object.assign({}, PRESETS[1].p, { preset: "flush", view: "both" });

          var wrap = document.createElement("div");
          wrap.className = "pa-lab__split";
          var plotBox = document.createElement("div");
          var sideBox = document.createElement("div");
          wrap.appendChild(plotBox);
          wrap.appendChild(sideBox);
          api.stage.appendChild(wrap);

          api.plot = PA.plot.create({
            width: 560,
            height: 300,
            margin: { t: 18, r: 20, b: 46, l: 58 },
            x: { min: 0, max: 100, tickCount: 5, label: "CF₄ 比例 [%]",
                 format: function (v) { return v.toFixed(0); } },
            y: { min: 0, max: 1.8, tickCount: 4, label: "移除速率 [µm/min]",
                 format: function (v) { return v.toFixed(1); } },
          });
          api.plot.svg.setAttribute(
            "aria-label",
            "樹脂與玻纖的移除速率隨 CF₄ 比例變化。玻纖那條從原點線性上升 —— " +
              "CF₄ 為零時玻纖移除速率就是零,所以純 O₂ 必然留下玻纖突出。"
          );
          plotBox.appendChild(api.plot.svg);

          // 孔壁剖面示意
          var cell = document.createElement("canvas");
          cell.setAttribute("role", "img");
          cell.setAttribute("aria-label", "孔壁剖面示意:樹脂與玻纖各退了多少,差額即為玻纖突出");
          sideBox.appendChild(cell);
          var detach = PA.canvasTheme.autoSize(cell, sideBox, 4 / 3, function (ctx, w, h) {
            api.cctx = ctx;
            api.cw = w;
            api.ch = h;
          });
          api.onDestroy(detach);

          var readout = C.readout([
            { key: "resin", label: "樹脂退", digits: 1, unit: " µm" },
            { key: "glass", label: "玻纖退", digits: 1, unit: " µm" },
            { key: "prot", label: "玻纖突出", digits: 1, unit: " µm" },
            { key: "win", label: "目標深度窗", format: function (v) { return v; } },
            { key: "verdict", label: "判定", format: function (v) { return v; } },
          ]);
          api.readoutNode = readout;

          api.refresh = function () {
            var s = api.state;
            var r = M.desmear({
              cf4: s.cf4, power_W: s.power, pressure_Torr: s.pressure,
              time_min: s.time, target: s.target,
            });
            var pal = PA.canvasTheme.palette();
            var pl = api.plot;

            /*
               兩條速率的量級差很多:玻纖從 0 衝到 1.6,樹脂只在 0.30–0.32 之間動。
               共用一個 y 軸時,「樹脂先升後降」在圖上根本看不出來 ——
               而那正是本章要教的第二件事。所以給一個放大檢視:
               y 軸只吃樹脂那條的範圍,形狀就出得來。
               ⚠️ 不做「各自正規化」—— 那會把兩條的交點(齊平點)畫到假的位置,
               而交點才是本元件的主角。要嘛看真實比例,要嘛單看一條。
            */
            var zoom = s.view === "resin";
            pl.setY(zoom
              ? { min: 0, max: 0.42, tickCount: 4, label: "樹脂移除速率 [µm/min]",
                  format: function (v) { return v.toFixed(2); } }
              : { min: 0, max: 1.8, tickCount: 4, label: "移除速率 [µm/min]",
                  format: function (v) { return v.toFixed(1); } });

            // 兩條速率曲線。顏色沿用全站的氣體 token:
            // 玻纖那條是 CF₄ 驅動的,用 CF₄ 的顏色;樹脂那條是 O₂ 驅動的,用 O₂ 的顏色。
            var cO2 = PA.canvasTheme.gasColor("o2", pal);
            var cCF4 = PA.canvasTheme.gasColor("cf4", pal);
            var flux = PA.packageModel.radicalFlux(s.power, s.pressure, "lp");

            var resinCurve = [];
            var glassCurve = [];
            for (var i = 0; i <= 100; i++) {
              resinCurve.push([i, M.resinRate(i / 100, flux)]);
              glassCurve.push([i, M.glassRate(i / 100, flux)]);
            }

            var best = M.bestCF4({
              power_W: s.power, pressure_Torr: s.pressure,
              time_min: s.time, target: s.target,
            });

            pl.clear();
            pl.line(resinCurve, { stroke: cO2, width: 2.4 });
            if (!zoom) pl.line(glassCurve, { stroke: cCF4, width: 2.4, dash: "4 3" });

            if (zoom) {
              // 放大檢視:標出樹脂速率自己的峰值,先升後降才看得出來
              var peak = 0, peakX = 0;
              for (var j = 0; j <= 100; j++) {
                var rr = M.resinRate(j / 100, flux);
                if (rr > peak) { peak = rr; peakX = j; }
              }
              pl.vline(peakX, { stroke: pal.warning, dash: "3 3" });
              pl.label(peakX, peak, "峰值 " + peakX + " %", {
                fill: pal.warning, dx: 8, dy: -8, size: 11,
              });
            } else {
              // 齊平點 —— 兩條交會的地方
              pl.vline(best.cf4 * 100, { stroke: pal.success, dash: "3 3" });
              pl.label(best.cf4 * 100, 1.5, "齊平 " + (best.cf4 * 100).toFixed(0) + " %", {
                fill: pal.success, dx: 6, size: 11,
              });
            }

            pl.dot(s.cf4 * 100, r.resinRate, { fill: cO2, r: 4.5 });
            if (!zoom) pl.dot(s.cf4 * 100, r.glassRate, { fill: cCF4, r: 4.5 });
            pl.legend(
              zoom
                ? [{ label: "樹脂(O₂ 驅動)", color: cO2 }]
                : [
                    { label: "樹脂(O₂ 驅動)", color: cO2 },
                    { label: "玻纖(CF₄ 驅動)", color: cCF4 },
                  ],
              pl.m.l + 16,
              pl.m.t + 14
            );

            if (api.readoutNode) {
              api.readoutNode.update({
                resin: r.resin,
                glass: r.glass,
                prot: r.protrusion,
                win: r.window[0] + "–" + r.window[1] + " µm(" +
                     (r.target === "etchback" ? "回蝕" : "除膠渣") + ")" +
                     (r.okDepth ? " ✅" : " ✗"),
                verdict: r.verdict,
              });
            }
            api.last = r;
          };

          function knob(key, opts) {
            return C.slider(Object.assign({
              onChange: function (v) { api.state[key] = v; api.refresh(); },
            }, opts));
          }

          var presetCtl = C.segmented({
            label: "現場情境",
            options: PRESETS.map(function (p) { return { value: p.key, label: p.label }; }),
            value: "flush",
            onChange: function (v) {
              var pr = PRESETS.filter(function (x) { return x.key === v; })[0];
              if (!pr) return;
              api.state = Object.assign({}, pr.p, { preset: v, view: api.state.view });
              cf4Ctl.setValue(pr.p.cf4 * 100, true);
              tCtl.setValue(pr.p.time, true);
              pCtl.setValue(pr.p.power, true);
              targetCtl.setValue(pr.p.target, true);
              api.refresh();
            },
          });

          var cf4Ctl = C.slider({
            label: "CF₄ 比例", min: 0, max: 100, value: 20, step: 1, unit: "%", digits: 0,
            onChange: function (v) { api.state.cf4 = v / 100; api.refresh(); },
          });
          var tCtl = knob("time", {
            label: "處理時間", min: 1, max: 90, value: 15, step: 1, unit: "min", digits: 0,
          });
          var pCtl = knob("power", {
            label: "功率", min: 100, max: 900, value: 300, step: 25, unit: "W", digits: 0,
          });
          var viewCtl = C.segmented({
            label: "檢視",
            options: [
              { value: "both", label: "兩條速率" },
              { value: "resin", label: "樹脂速率(放大)" },
            ],
            value: "both",
            onChange: function (v) { api.state.view = v; api.refresh(); },
          });

          var targetCtl = C.segmented({
            label: "目標",
            options: [
              { value: "desmear", label: "除膠渣 3–8 µm" },
              { value: "etchback", label: "回蝕 12–25 µm" },
            ],
            value: "desmear",
            onChange: function (v) { api.state.target = v; api.refresh(); },
          });

          api.el.appendChild(C.panel([presetCtl, cf4Ctl, viewCtl, targetCtl, tCtl, pCtl]));
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "**先按「純 O₂」。** 玻纖那條曲線在 CF₄ = 0 的值就是 **0** —— 不是「慢」,是零。所以不管跑多久,玻纖都不會退,孔壁必然留下突出。這是 3.7 的「封裝端不用氟系」在 PCB 完全不成立的原因。",
              "**把 CF₄ 從 0 慢慢拉上去**,看剖面圖的玻纖跟著退。突出歸零的地方就是綠色虛線 —— 模型算出來是 **20 %**,與現場常用的 10–25 % 一致。",
              "**繼續拉到 50 % 以上**:突出變成負的(玻纖被咬凹),而且注意樹脂那條曲線**也開始往下掉** —— O 被稀釋掉了。加過頭是兩件事同時變糟,不是只有一件。",
              "**切到「回蝕」**:目標深度窗從 3–8 µm 跳到 12–25 µm,同樣 15 min 就不夠了。把時間拉到 50 min 才進得去 —— 回蝕的代價是 cycle time,不是配方。",
              "樹脂那條先升後降的形狀,**和 3.7 的 A33 接著力曲線是同一個教訓**:「多加一點有幫助」不代表「加越多越好」。",
            ])
          );

          api.refresh();
        },

        reset: function () {
          this.state = Object.assign({}, PRESETS[1].p, { preset: "flush", view: "both" });
          this.refresh();
        },

        draw: function () {
          var api = this;
          if (!api.cctx || !api.last) return;
          var ctx = api.cctx;
          var p = PA.canvasTheme.palette();
          var w = api.cw;
          var h = api.ch;
          var r = api.last;

          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = p.bg;
          ctx.fillRect(0, 0, w, h);

          // 版面:左邊是孔(真空),右邊是板材。把 µm 換算成像素。
          var wallX = w * 0.34;
          var scale = Math.min(6, (w * 0.42) / 14); // 14 µm 大約佔右半的寬度
          var top = h * 0.14;
          var bot = h * 0.86;

          // 板材底色(樹脂)
          ctx.fillStyle = p.vizPolymer;
          ctx.globalAlpha = 0.35;
          ctx.fillRect(wallX, top, w - wallX - 8, bot - top);
          ctx.globalAlpha = 1;

          // 玻纖束:三條水平帶
          var bands = [0.24, 0.5, 0.76];
          var bandH = Math.max(6, (bot - top) * 0.11);
          var resinPx = r.resin * scale;
          var glassPx = r.glass * scale;

          // 樹脂已退到的位置(整面往右縮)
          ctx.fillStyle = p.bg;
          ctx.fillRect(wallX, top, resinPx, bot - top);

          bands.forEach(function (f) {
            var y = top + (bot - top) * f - bandH / 2;
            // 玻纖從原始孔壁往右退 glassPx
            ctx.fillStyle = p.vizFilm || p.vizNeutral;
            ctx.fillRect(wallX + glassPx, y, w - wallX - glassPx - 8, bandH);
          });

          // 原始孔壁位置參考線
          ctx.save();
          ctx.strokeStyle = p.textSubtle;
          ctx.setLineDash([3, 3]);
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.moveTo(wallX, top - 6);
          ctx.lineTo(wallX, bot + 6);
          ctx.stroke();
          ctx.restore();

          // 突出標註
          ctx.save();
          ctx.font = "11px system-ui, sans-serif";
          ctx.fillStyle = p.textSubtle;
          ctx.fillText("孔(鍍銅要爬進來)", 8, top - 8);
          ctx.textAlign = "right";
          ctx.fillText("板材", w - 10, top - 8);
          ctx.restore();

          var protPx = resinPx - glassPx;
          if (Math.abs(r.protrusion) > 0.2) {
            ctx.save();
            ctx.strokeStyle = Math.abs(r.protrusion) > M.FLUSH_TOL ? p.danger : p.warning;
            ctx.lineWidth = 1.6;
            var my = top + (bot - top) * 0.5;
            ctx.beginPath();
            ctx.moveTo(wallX + glassPx, my);
            ctx.lineTo(wallX + resinPx, my);
            ctx.stroke();
            ctx.restore();
          }

          ctx.save();
          ctx.font = "600 14px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = r.okFlush ? p.success : p.danger;
          ctx.fillText(
            r.okFlush
              ? "✅ 齊平(突出 " + r.protrusion.toFixed(1) + " µm)"
              : (r.protrusion > 0 ? "❌ 玻纖突出 " : "❌ 玻纖被咬凹 ") +
                Math.abs(r.protrusion).toFixed(1) + " µm",
            w / 2,
            h - 10
          );
          ctx.restore();
          void protPx;
        },
      });
    },
    ["js/lab/package-model.js", "js/lab/pcb-model.js"]
  );
})((window.PA = window.PA || {}));
