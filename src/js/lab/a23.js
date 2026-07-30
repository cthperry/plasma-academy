/* ==========================================================================
   A23 — HDP-CVD 填溝 vs PECVD 夾縫 void 對比
   章節 3.4 · 規格 docs/05-animation-spec.md

   目標:理解 void 是怎麼夾出來的,以及 HDP 為什麼填得進去。

   觀察點(docs/05):
     · SiH₄ 的開口先合攏 → 中央留一條縫
     · HDP 把 cusp 削掉、材料落回溝裡 → 由下往上填滿
     · 深寬比越高越難填

   物理在 js/lab/deposit-model.js,由 tools/check-deposit.mjs 以 24 項斷言守住
   —— 包含「把濺鍍關掉就退回 PECVD 的夾 void」這個因果對照。

   元件沒有任何「畫出一個 void」的程式碼:void 是泛洪泛不到的真空格。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A23",
    function () {
      var C = PA.controls;
      var D = PA.deposit;

      var PRESETS = [
        {
          key: "sih4", label: "PECVD(SiH₄)",
          p: { mode: "sih4", sputter: 0, redep: 0 },
          why: "黏著係數高,開口處通量最高、長最快 → cusp 合攏 → **中央夾一條 void**。",
        },
        {
          key: "teos", label: "PECVD(TEOS)",
          p: { mode: "teos", sputter: 0, redep: 0 },
          why: "黏著係數低、表面遷移率高,抵達量被抹平 → 覆蓋率好得多。但高 AR 仍有殘餘空洞。",
        },
        {
          key: "hdp", label: "HDP-CVD",
          p: { mode: "hdp", sputter: 0.55, redep: 0.75 },
          why: "邊沉積邊濺鍍:cusp 是 45° 斜面,產額最高 → 一形成就被削掉;削下來的材料落回溝裡 → 由下往上填滿。",
        },
        {
          key: "hdp-nosput", label: "⚠ HDP 關掉濺鍍",
          p: { mode: "hdp", sputter: 0, redep: 0 },
          why: "只剩沉積,黏著係數又高 → 立刻退回 SiH₄ 的夾 void。**濺鍍是必要條件。**",
        },
        {
          key: "hdp-noredep", label: "⚠ HDP 不讓材料落回",
          p: { mode: "hdp", sputter: 0.55, redep: 0 },
          why: "cusp 削掉了、開口撐住了,但溝裡沒有材料補進去 → 一樣填不滿。**兩個機制都要有。**",
        },
      ];

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = Object.assign({ preset: "sih4", ar: 3 }, PRESETS[0].p);

          var wrap = document.createElement("div");
          wrap.className = "pa-lab__split";
          var canvasBox = document.createElement("div");
          var sideBox = document.createElement("div");
          wrap.appendChild(canvasBox);
          wrap.appendChild(sideBox);
          api.stage.appendChild(wrap);

          var canvas = document.createElement("canvas");
          canvas.setAttribute("role", "img");
          canvas.setAttribute(
            "aria-label",
            "溝槽剖面填溝過程。開口處長得比溝底快時會先合攏,在溝中央留下封閉的空洞。"
          );
          canvasBox.appendChild(canvas);
          api.canvas = canvas;

          var card = document.createElement("div");
          card.className = "pa-map-card";
          sideBox.appendChild(card);
          api.card = card;

          /** 目前的參數組:預設的模式再蓋上兩個滑桿的值 */
          api.params = function () {
            return Object.assign({}, D.MODES[api.state.mode], {
              sputter: api.state.sputter,
              redep: api.state.redep,
            });
          };

          api.restart = function () {
            api.sim = D.create({ ar: api.state.ar });
            api.done = false;
            api.refresh();
          };

          api.advance = function () {
            var s = api.sim;
            if (!s || api.done) return;
            // 長到沉積預算就停 —— 和 check-deposit 用的是同一個比較點
            if (s.topThicknessF() >= s.budget) { api.done = true; return; }
            s.step(api.params(), 1);
            if (s._pinchFill == null && s.voidCells() >= 4) s._pinchFill = s.fillFraction();
            api.refresh();
          };

          api.refresh = function () {
            var s = api.sim;
            if (!s) return;
            if (api.readoutNode) {
              api.readoutNode.update({
                topT: s.topThicknessF(),
                budget: s.budget,
                voids: s.voidCells(),
                fill: s.fillFraction() * 100,
                pinch: s.pinchFill() * 100,
                cover: s.stepCoverage() * 100,
                verdict: s.verdict(),
              });
            }
            var pr = PRESETS.filter(function (x) { return x.key === api.state.preset; })[0];
            api.card.textContent = "";
            var head = document.createElement("div");
            head.className = "pa-map-card__head";
            var st = document.createElement("strong");
            st.textContent = pr ? pr.label : "自訂";
            head.appendChild(st);
            api.card.appendChild(head);
            if (pr) {
              var p = document.createElement("p");
              p.textContent = pr.why;
              api.card.appendChild(p);
            }
            var p2 = document.createElement("p");
            p2.textContent =
              "溝寬 " + s.trench.width + " 格、深 " + s.trench.depth +
              " 格。比較點是**場區長到 " + s.budget + " 格**,四種製程都一樣厚。";
            api.card.appendChild(p2);
          };

          var detach = PA.canvasTheme.autoSize(canvas, canvasBox, 3 / 4, function (ctx, w, h) {
            api.ctx = ctx;
            api.width = w;
            api.height = h;
            if (!api.booted) { api.booted = true; api.restart(); }
          });
          api.onDestroy(detach);

          var readout = C.readout([
            { key: "topT", label: "場區膜厚", digits: 2, unit: " 格" },
            { key: "budget", label: "比較點厚度", digits: 0, unit: " 格" },
            { key: "cover", label: "階梯覆蓋率", digits: 0, unit: " %" },
            { key: "voids", label: "封閉空洞", digits: 0, unit: " 格" },
            { key: "fill", label: "溝內填充", digits: 0, unit: " %" },
            { key: "pinch", label: "合攏時填充", digits: 0, unit: " %" },
            { key: "verdict", label: "判定", format: function (v) { return v; } },
          ]);
          api.readoutNode = readout;

          var ctrls = {};
          function knob(key, restart) {
            var r = D.RANGES[key];
            var sl = C.slider({
              label: r.label, min: r.min, max: r.max, step: r.step,
              unit: r.unit, digits: r.step < 1 ? 2 : 0, value: api.state[key],
              onChange: function (v) {
                if (api.state[key] === v) return;
                api.state[key] = v;
                if (restart) api.restart();
              },
            });
            ctrls[key] = sl;
            return sl;
          }

          var presetCtl = C.segmented({
            label: "製程",
            options: PRESETS.map(function (p) { return { value: p.key, label: p.label }; }),
            value: "sih4",
            onChange: function (v) {
              var pr = PRESETS.filter(function (x) { return x.key === v; })[0];
              if (!pr) return;
              api.state.preset = v;
              Object.keys(pr.p).forEach(function (k) {
                api.state[k] = pr.p[k];
                if (ctrls[k] && ctrls[k].setValue) ctrls[k].setValue(pr.p[k], true);
              });
              api.restart();
            },
          });

          api.el.appendChild(
            C.panel([
              presetCtl,
              knob("ar", true),
              knob("sputter", true),
              knob("redep", true),
            ])
          );
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "先看 PECVD(SiH₄):開口兩側各長出一個往內傾的 cusp,兩個 cusp 碰上就把溝封住,中央留下一條 void。**沒有任何一行程式在畫這條縫** —— 它是泛洪從天空泛不到的真空格。",
              "看「合攏時填充」:SiH₄ 填不到三成就封住了。溝底不是沒長膜,是**長得比開口慢** —— 因為溝底看得到的天空少,而黏著係數高的前驅物是直來直往的。",
              "切到 TEOS:同樣是 PECVD,只有黏著係數不同(0.18 對 0.95),填充就從約 30 % 跳到 90 % 以上。**這一格差異就是為什麼廠裡願意為 TEOS 多養一套液態源汽化系統。**",
              "切到 HDP-CVD:填滿、零空洞。注意它的「合攏時填充」很高 —— 它不是靠早早封住而僥倖,是真的由下往上填起來的。",
              "兩個 ⚠ 預設是 HDP 的拆解:關掉濺鍍就退回 SiH₄ 的夾 void;留著濺鍍但不讓削下來的材料落回溝裡,也一樣填不滿。**削 cusp 與材料落回兩件事都是必要的**,少一個都不行。",
              "把「濺鍍/沉積比」慢慢往上拉:填溝越來越好,但場區長到同樣厚度要花越久 —— 這就是 dep/sputter ratio 的代價,也是 HDP 不拿來當一般厚膜製程的原因。拉到 0.9 附近,場區幾乎不長了。",
              "把深寬比從 1 拉到 6:兩支 PECVD 明顯越來越差(SiH₄ 從填得掉變成填不到一成),HDP 則一路都填得滿。**填溝能力要連著 AR 一起講才有意義** —— 「這支製程填溝好不好」單獨問是沒有答案的。",
              "⚠️ 模型的已知極限:真實 HDP 在 AR 超過約 6 之後,濺出來的材料會在溝口附近堆成一頂帽子而重新夾出 void,本模型還沒有重現這件事(它到 AR 10 都填得滿)。要重現需要把濺出通量的角度分布與直線飛行完整算出來。**這裡的 HDP 曲線在極高 AR 是樂觀的,別拿它當製程窗的依據。**",
            ])
          );
        },

        reset: function () {
          this.state = Object.assign({ preset: "sih4", ar: 3 }, PRESETS[0].p);
          this.restart();
        },

        tick: function () {
          var api = this;
          if (!api.sim) return;
          api._acc = (api._acc || 0) + 1;
          // 每 2 幀推一步 —— 看得出開口一點一點收攏
          if (api._acc % 2 === 0) api.advance();
        },

        draw: function () {
          var api = this;
          if (!api.ctx || !api.sim) return;
          D.draw(api.ctx, api.sim, api.width, api.height, {
            caption: api.done
              ? "已達比較點(場區 " + api.sim.budget + " 格)"
              : "場區 " + api.sim.topThicknessF().toFixed(1) + " / " + api.sim.budget + " 格",
          });
        },
      });
    },
    ["js/lab/deposit-model.js"]
  );
})((window.PA = window.PA || {}));
