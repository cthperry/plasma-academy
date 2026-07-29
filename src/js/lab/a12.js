/* ==========================================================================
   A12 — EEDF 曲線互動
   章節 2.3 · 規格 docs/05-animation-spec.md

   目標:理解為什麼「高能尾巴決定一切」。

   驗收條件(docs/05):T_e 2→3 eV 時游離率上升超過 5 倍。

   這個元件的主角是那塊「重疊區」:速率係數是 σ(E) 與 f(E) 的重疊積分。
   σ 有閾值(左邊是零),f 呈指數衰減(右邊快速掉光),
   所以兩者只在高能尾巴那一小段重疊 —— T_e 動一點點,那一段就變很多。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define("A12", function () {
    var C = PA.controls;
    var M = PA.model;

    // 三種反應的閾值 [eV]。解離最低、游離最高 —— 這就是為什麼
    // 製程電漿裡自由基永遠比離子多好幾個數量級。
    var REACTIONS = [
      { key: "diss", label: "解離(產生自由基)", th: 8, peak: 25, token: "vizRadical" },
      { key: "exc", label: "激發(發光,OES 看的就是它)", th: 11.5, peak: 20, token: "vizPolymer" },
      { key: "iz", label: "游離(維持電漿)", th: 15.76, peak: 50, token: "vizIonPos" },
    ];

    var E_MAX = 40; // 橫軸上限 [eV]

    return PA.lab.create({
      setup: function () {
        var api = this;
        api.state = { Te: 3, kind: "maxwellian", show: "iz" };

        var wrap = document.createElement("div");
        wrap.className = "pa-lab__split";
        var mainBox = document.createElement("div");
        var barBox = document.createElement("div");
        wrap.appendChild(mainBox);
        wrap.appendChild(barBox);
        api.stage.appendChild(wrap);

        // 主圖:EEDF(對數縱軸)+ 截面 + 重疊區
        api.plot = PA.plot.create({
          width: 580,
          height: 320,
          margin: { t: 18, r: 20, b: 46, l: 62 },
          x: { min: 0, max: E_MAX, ticks: [0, 10, 20, 30, 40], label: "電子能量 E (eV)", format: function (v) { return v.toFixed(0); } },
          y: { min: 1e-6, max: 1, log: true, label: "f(E) 正規化 / σ(E) 相對值" },
        });
        mainBox.appendChild(api.plot.svg);

        // 速率長條圖
        api.bars = PA.plot.create({
          width: 520,
          height: 240,
          margin: { t: 18, r: 20, b: 46, l: 62 },
          x: { min: 1, max: 8, ticks: [1, 2, 3, 4, 5, 6, 7, 8], label: "電子溫度 T_e (eV)", format: function (v) { return v.toFixed(0); } },
          y: { min: 1e-4, max: 100, log: true, label: "相對速率(以 T_e=8 的游離率為 1)" },
        });
        barBox.appendChild(api.bars.svg);

        /** 正規化的 EEDF —— 峰值縮到 1,方便和截面畫在同一張圖 */
        api.f = function (E) {
          var v = M.eedf(E, api.state.Te, api.state.kind);
          return v / api.fMax;
        };

        api.recomputeNorm = function () {
          var mx = 0;
          for (var E = 0.05; E < E_MAX; E += 0.05) {
            var v = M.eedf(E, api.state.Te, api.state.kind);
            if (v > mx) mx = v;
          }
          api.fMax = mx || 1;
        };

        /** 相對速率:σ 與 f 的重疊積分,以 T_e=8 的游離率為 1 */
        api.rate = function (r, Te, kind) {
          return M.rateCoefficient(Te, r.th, kind) / api.rateRef;
        };

        api.refresh = function () {
          if (!api.plot) return;
          var pl = api.plot;
          var pal = PA.canvasTheme.palette();
          var s = api.state;
          api.recomputeNorm();
          pl.clear();

          var r = REACTIONS.filter(function (x) { return x.key === s.show; })[0];

          // 截面曲線(正規化到 1)
          var sig = pl.sample(function (E) {
            return M.crossSection(E, r.th, r.peak, 1);
          }, 240);
          pl.line(sig, { stroke: pal[r.token], width: 2.2, dash: "5 3" });
          var sigLabelX = Math.min(r.peak, E_MAX * 0.72);
          pl.label(sigLabelX, M.crossSection(sigLabelX, r.th, r.peak, 1), "σ " + r.label.split("(")[0], {
            fill: pal[r.token], dx: 6, dy: -8, size: 11,
          });

          // EEDF
          var f = pl.sample(function (E) {
            return api.f(E);
          }, 240);
          pl.line(f, { stroke: pal.primary, width: 2.6 });
          pl.label(s.Te * 1.2, api.f(s.Te * 1.2), "f(E)", {
            fill: pal.primary, dx: 8, dy: -4, size: 11,
          });

          // 重疊區 —— 本元件的主角
          var overlap = [];
          for (var i = 0; i <= 200; i++) {
            var E = (i / 200) * E_MAX;
            var prod = M.crossSection(E, r.th, r.peak, 1) * api.f(E);
            overlap.push([E, Math.max(prod, 1e-6)]);
          }
          pl.area(overlap, { fill: pal.warning, opacity: 0.3 });
          // 標在重疊區的峰值上
          var pk = overlap.reduce(function (a, b) { return b[1] > a[1] ? b : a; });
          if (pk[1] > 2e-6) {
            pl.label(pk[0], pk[1], "重疊區 = 速率的來源", {
              fill: pal.warning, dx: 8, dy: -8, size: 11,
            });
          }

          pl.vline(r.th, { stroke: pal.textSubtle, dash: "3 3" });
          pl.label(r.th, 1e-6, "閾值 " + r.th + " eV", {
            fill: pal.textSubtle, dx: 4, dy: -6, size: 10, weight: 500,
          });

          // --- 速率 vs T_e 曲線 ---
          var bl = api.bars;
          bl.clear();
          REACTIONS.forEach(function (rx) {
            var pts = bl.sample(function (Te) {
              return Math.max(1e-4, api.rate(rx, Te, s.kind));
            }, 120);
            bl.line(pts, {
              stroke: pal[rx.token],
              width: rx.key === s.show ? 2.8 : 1.6,
              opacity: rx.key === s.show ? 1 : 0.5,
            });
          });
          // 另一種分佈拿來對照
          var other = s.kind === "maxwellian" ? "druyvesteyn" : "maxwellian";
          var otherPts = bl.sample(function (Te) {
            return Math.max(1e-4, api.rate(r, Te, other));
          }, 120);
          bl.line(otherPts, { stroke: pal.textSubtle, width: 1.8, dash: "4 3" });
          bl.label(6.5, Math.max(1e-4, api.rate(r, 6.5, other)), other === "maxwellian" ? "Maxwellian" : "Druyvesteyn", {
            fill: pal.textSubtle, dx: 6, dy: 12, size: 10, weight: 500,
          });

          bl.vline(s.Te, { stroke: pal.primary, dash: "3 3", overlay: true });
          bl.dot(s.Te, Math.max(1e-4, api.rate(r, s.Te, s.kind)), {
            fill: pal.primary, r: 5, overlay: true,
          });
          bl.legend(
            REACTIONS.map(function (rx) {
              return { label: rx.label.split("(")[0], color: pal[rx.token] };
            }),
            bl.m.l + 14,
            bl.m.t + 12
          );

          // --- 數值 ---
          var izNow = M.rateCoefficient(s.Te, 15.76, s.kind);
          var iz2 = M.rateCoefficient(2, 15.76, s.kind);
          var iz3 = M.rateCoefficient(3, 15.76, s.kind);
          var maxK = M.rateCoefficient(s.Te, r.th, "maxwellian");
          var druK = M.rateCoefficient(s.Te, r.th, "druyvesteyn");

          if (api.readoutNode) {
            api.readoutNode.update({
              tail: (api.tailFraction() * 100),
              sens: iz3 / iz2,
              ratio: druK / maxK,
              diss: M.rateCoefficient(s.Te, 8, s.kind) / Math.max(izNow, 1e-30),
            });
          }
        };

        /** 能量高於游離閾值的電子佔比 —— 「高能尾巴」的具體數字 */
        api.tailFraction = function () {
          var tot = 0;
          var tail = 0;
          for (var E = 0.05; E < 80; E += 0.05) {
            var v = M.eedf(E, api.state.Te, api.state.kind) * Math.sqrt(E) * 0.05;
            tot += v;
            if (E >= 15.76) tail += v;
          }
          return tot > 0 ? tail / tot : 0;
        };

        // 參考值:T_e = 8 eV 的 Maxwellian 游離率
        api.rateRef = M.rateCoefficient(8, 15.76, "maxwellian");
        api.fMax = 1;

        var readout = C.readout([
          {
            key: "tail",
            label: "能量 > 15.76 eV 的電子佔比",
            format: function (v) {
              return v < 0.01 ? v.toExponential(1) + " %" : v.toFixed(2) + " %";
            },
          },
          { key: "sens", label: "T_e 2→3 eV 游離率變化", digits: 1, unit: " 倍" },
          { key: "ratio", label: "Druyvesteyn ÷ Maxwellian", digits: 3 },
          { key: "diss", label: "解離率 ÷ 游離率", digits: 0, unit: " 倍" },
        ]);
        api.readoutNode = readout;

        var teCtl = C.slider({
          label: "電子溫度 T_e",
          min: 1, max: 8, value: 3, step: 0.1, unit: "eV", digits: 1,
          onChange: function (v) { api.state.Te = v; api.refresh(); },
        });

        var kindCtl = C.segmented({
          label: "EEDF 型式",
          options: [
            { value: "maxwellian", label: "Maxwellian" },
            { value: "druyvesteyn", label: "Druyvesteyn" },
          ],
          value: "maxwellian",
          onChange: function (v) { api.state.kind = v; api.refresh(); },
        });

        var showCtl = C.segmented({
          label: "看哪個反應",
          options: REACTIONS.map(function (r) {
            return { value: r.key, label: r.label.split("(")[0] };
          }),
          value: "iz",
          onChange: function (v) { api.state.show = v; api.refresh(); },
        });

        api.el.appendChild(C.panel([teCtl, kindCtl, showCtl]));
        api.el.appendChild(readout);
        api.el.appendChild(
          C.observations([
            "看那塊填色的重疊區:σ 在閾值以下是 0,f 在高能端指數衰減,兩者只在一小段重疊。速率係數就是這塊面積,所以它對 T_e 極度敏感。",
            "把 T_e 從 2 拉到 3 eV —— 只上升 50 %,游離率卻上升好幾倍。這就是為什麼電漿能把 T_e 自我穩定在 2–5 eV:稍高就損失太快,稍低就維持不住。",
            "換成 Druyvesteyn —— 同樣的 T_e,高能尾巴少很多,游離率明顯下降。你用簡單模型算的自由基密度和量測差很多時,EEDF 形狀常常就是原因。",
            "切到「解離」—— 閾值只有 8 eV,遠低於游離的 15.76 eV。所以自由基密度比離子密度高好幾個數量級,真正咬掉材料的量大半是自由基做的。",
            "注意「能量 > 15.76 eV 的電子佔比」這個數字。T_e = 3 eV 時它小到不可思議 —— 電漿就是靠這麼一小撮電子維持著。",
          ])
        );

        api.refresh();
      },

      reset: function () {
        this.state = { Te: 3, kind: "maxwellian", show: "iz" };
        this.refresh();
      },
    });
  });
})((window.PA = window.PA || {}));
