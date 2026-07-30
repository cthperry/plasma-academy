/* ==========================================================================
   A22 — PEALD 四步循環動畫 + 階梯覆蓋率對比
   章節 3.4 · 規格 docs/05-animation-spec.md

   目標:理解自限制反應,以及「厚度只由循環數決定」這件事為什麼成立。

   觀察點(docs/05):
     · 一個循環長一個單層 —— 通更久的前驅物不會更厚
     · 覆蓋率幾乎不隨深寬比變差(PECVD 會)

   物理在 js/lab/deposit-model.js,由 tools/check-deposit.mjs 以 24 項斷言守住。
   元件沒有任何「畫出同形薄膜」的程式碼:覆蓋率是抵達量規則的結果。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A22",
    function () {
      var C = PA.controls;
      var D = PA.deposit;

      var MODES = [
        { key: "peald", label: "PEALD(自限制)" },
        { key: "teos", label: "PECVD(TEOS)" },
        { key: "sih4", label: "PECVD(SiH₄)" },
      ];

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = { mode: "peald", ar: 3, cycles: 8, dose: 3.5, purge: 1 };

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
            "溝槽剖面。薄膜一個循環長一層,側壁與溝底的厚度和場區幾乎相同。"
          );
          canvasBox.appendChild(canvas);
          api.canvas = canvas;

          var card = document.createElement("div");
          card.className = "pa-map-card";
          sideBox.appendChild(card);
          api.card = card;

          /** PEALD 才吃 dose / purge —— 兩支 PECVD 沒有循環,調了也沒有意義 */
          api.params = function () {
            var base = D.MODES[api.state.mode];
            if (!base.selfLim) return base;
            return Object.assign({}, base, { dose: api.state.dose, purge: api.state.purge });
          };

          api.restart = function () {
            api.sim = D.create({ ar: api.state.ar });
            api.phase = 0;
            api.refresh();
          };

          /** 推進一個步驟(四步裡只有電漿步真的長膜)*/
          api.stepPhase = function () {
            if (!api.sim) return;
            var ph = D.PHASES[api.phase];
            if (ph.grows && api.sim.cycles < api.state.cycles) api.sim.runCycle(api.params());
            api.phase = (api.phase + 1) % D.PHASES.length;
            api.refresh();
          };

          api.refresh = function () {
            var s = api.sim;
            if (!s) return;
            if (api.readoutNode) {
              api.readoutNode.update({
                cycles: s.cycles,
                topT: s.topThicknessF(),
                sideT: s.sidewallThicknessF(),
                botT: s.bottomThicknessF(),
                cover: s.stepCoverage() * 100,
                botCover: s.bottomCoverage() * 100,
                gpc: s.cycles > 0 ? s.topThicknessF() / s.cycles : 0,
              });
            }

            var ph = D.PHASES[api.phase];
            api.card.textContent = "";
            var head = document.createElement("div");
            head.className = "pa-map-card__head";
            var st = document.createElement("strong");
            st.textContent = "步驟 " + (api.phase + 1) + " / 4 —— " + ph.label;
            head.appendChild(st);
            api.card.appendChild(head);
            var p = document.createElement("p");
            p.textContent = ph.why;
            api.card.appendChild(p);

            var md = D.MODES[api.state.mode];
            var p2 = document.createElement("p");
            p2.textContent = md.label + ":" + md.why;
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
            { key: "cycles", label: "已跑循環", digits: 0, unit: " 圈" },
            { key: "gpc", label: "每循環厚度 GPC", digits: 2, unit: " 格/圈" },
            { key: "topT", label: "場區膜厚", digits: 2, unit: " 格" },
            { key: "sideT", label: "側壁膜厚", digits: 2, unit: " 格" },
            { key: "botT", label: "溝底膜厚", digits: 2, unit: " 格" },
            { key: "cover", label: "階梯覆蓋率", digits: 0, unit: " %" },
            { key: "botCover", label: "溝底覆蓋率", digits: 0, unit: " %" },
          ]);
          api.readoutNode = readout;

          var ctrls = {};
          function knob(key, onDone) {
            var r = D.RANGES[key];
            var sl = C.slider({
              label: r.label, min: r.min, max: r.max, step: r.step,
              unit: r.unit, digits: r.step < 1 ? 1 : 0, value: api.state[key],
              onChange: function (v) {
                if (api.state[key] === v) return;
                api.state[key] = v;
                onDone();
              },
            });
            ctrls[key] = sl;
            return sl;
          }

          var modeCtl = C.segmented({
            label: "製程",
            options: MODES.map(function (m) { return { value: m.key, label: m.label }; }),
            value: "peald",
            onChange: function (v) {
              api.state.mode = v;
              api.restart();
            },
          });

          api.el.appendChild(
            C.panel([
              modeCtl,
              knob("ar", function () { api.restart(); }),
              knob("cycles", function () { api.refresh(); }),
              knob("dose", function () { api.restart(); }),
              knob("purge", function () { api.restart(); }),
            ])
          );
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "看四個步驟的循環:**只有電漿步那一格厚度會動**,前驅物脈衝與兩次吹除都不長膜。這就是 ALD 和 CVD 最根本的差別 —— CVD 是連續反應,ALD 是一次只做一層。",
              "看「每循環厚度 GPC」:不管跑到第幾圈,它幾乎是定值。**厚度 = GPC × 循環數** —— 這就是 ALD 為什麼能把膜厚控制到埃級,也是為什麼 ALD 配方調的是圈數而不是時間。",
              "把「循環數」拉大:場區、側壁、溝底三個厚度**一起**變厚,比例不變。",
              "把深寬比從 1 一路拉到 12,看「階梯覆蓋率」:PEALD 到 AR 8 都還接近 100 %,要到 AR 12 才掉到九成。切到 PECVD(SiH₄)再拉一次 —— 從四成多一路掉到一成。**這是 PEALD 唯一真正不可取代的理由。**",
              "**把「前驅物脈衝」從 5 往下拉**:一路拉到約 2.5 之前,覆蓋率完全不動 —— 這就是自限制,吸附滿了再通更久也沒用。低於 2.5 之後才開始掉(AR 5 在 1.0 只剩四成五)。原因是深處通量低、要更久才飽和,所以**ALD 的脈衝時間必須跟著深寬比一起加長**,這是配方移植到更高 AR 時最常踩的坑。",
              "**把「吹除充分程度」往下拉**:覆蓋率從 100 % 一路崩到 23 %。吹除不乾淨 → 前驅物與自由基在氣相就相遇 → 變回 CVD 模式,ALD 的一切好處同時消失。**purge 不是「順便抽一下」,它和脈衝一樣是決定成敗的步驟。**",
              "PEALD 的覆蓋率在中等 AR 接近 100 %,但把 AR 拉到 12 會掉到九成:自由基沿著深孔一路複合掉(模型裡的 depthAtt 是「每經過一個深寬比損耗多少」)。這是極高 AR 時 PEALD 反而輸給不用電漿的熱 ALD 的原因 —— **電漿帶來低溫與活性,代價就是方向性。**",
              "比較 SiH₄ 與 TEOS 的覆蓋率:兩者都是 PECVD,差別只在黏著係數。**覆蓋率是黏著係數的結果,不是「製程好壞」。**",
            ])
          );
        },

        reset: function () {
          this.state = { mode: "peald", ar: 3, cycles: 8, dose: 3.5, purge: 1 };
          this.restart();
        },

        tick: function () {
          var api = this;
          if (!api.sim) return;
          api._acc = (api._acc || 0) + 1;
          // 每 18 幀走一個步驟 —— 慢到看得出四步的節奏
          if (api._acc % 18 === 0) api.stepPhase();
        },

        draw: function () {
          var api = this;
          if (!api.ctx || !api.sim) return;
          PA.deposit.draw(api.ctx, api.sim, api.width, api.height, {
            phase: D.PHASES[api.phase],
            caption: "第 " + api.sim.cycles + " / " + api.state.cycles + " 圈",
          });
        },
      });
    },
    ["js/lab/deposit-model.js"]
  );
})((window.PA = window.PA || {}));
