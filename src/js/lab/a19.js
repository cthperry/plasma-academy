/* ==========================================================================
   A19 — Bosch 製程循環動畫
   章節 3.2 · 規格 docs/05-animation-spec.md

   目標:理解循環邏輯與 scallop 的來源。

   觀察點(docs/05):
     · 縮短循環時間 → scallop 變小但總蝕刻速率下降
     · 把沉積步關掉 → 側壁立刻被 SF₆ 咬爛

   物理在 js/lab/bosch-model.js(它再包一層 profile-engine),
   由 tools/check-bosch.mjs 以 13 項斷言守住 —— 兩個觀察點都被斷言,
   不是靠人眼看畫面。

   元件本身沒有任何「畫 scallop」的程式碼:scallop 是沉積/蝕刻交替的
   必然副產品,由引擎自己長出來。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A19",
    function () {
      var C = PA.controls;
      var M = PA.boschModel;

      var PRESETS = [
        {
          key: "standard", label: "標準 Bosch",
          p: { depTime: 3, etchTime: 6, bias: 60 },
          why: "沉積:蝕刻約 1:2。側壁守得住,scallop 輕微 —— 這是多數 MEMS 製程的位置。",
        },
        {
          key: "smooth", label: "短循環(光滑側壁)",
          p: { depTime: 1, etchTime: 3, bias: 60 },
          why: "循環短 → scallop 小,但每循環的固定切換開銷佔比變高 → **產率下降**。",
        },
        {
          key: "fast", label: "長循環(高產率)",
          p: { depTime: 5, etchTime: 14, bias: 60 },
          why: "循環長 → 切換開銷被攤薄 → 產率高,代價是 scallop 明顯、側壁粗糙。",
        },
        {
          key: "nodep", label: "⚠ 關掉沉積步",
          p: { depTime: 0, etchTime: 6, bias: 60 },
          why: "只剩 SF₆。它蝕 Si 又快又**等向** → 側壁立刻被咬爛,溝變成一個大肚子。",
        },
        {
          key: "nobias", label: "⚠ 沒有清底 bias",
          p: { depTime: 3, etchTime: 6, bias: 0 },
          why: "聚合物鋪滿了卻沒人把溝底打開 → 整個溝被封死,幾乎刻不下去。",
        },
      ];

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = Object.assign({}, PRESETS[0].p, { preset: "standard" });

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
            "深矽溝槽剖面。沉積步與蝕刻步交替進行,側壁每個循環留下一個 scallop 凹痕。"
          );
          canvasBox.appendChild(canvas);
          api.canvas = canvas;

          var card = document.createElement("div");
          card.className = "pa-map-card";
          sideBox.appendChild(card);
          api.card = card;

          api.restart = function () {
            api.sim = M.start(api.state);
            api.prof = api.sim.prof;
            api.phase = "dep";
            api.refresh();
          };

          /** 一個完整循環 —— 動畫每 tick 推進一個循環,看得到一圈一個 scallop */
          api.stepCycle = function () {
            if (!api.sim) return;
            if (api.sim.cycles >= 22) return; // 刻到底就停,不要無限跑
            M.runCycle(api.sim);
          };

          api.refresh = function () {
            var sim = api.sim;
            if (!sim) return;
            if (api.readoutNode) {
              api.readoutNode.update({
                cycles: sim.cycles,
                depth: M.depth(sim),
                scallop: M.scallopAmplitude(sim),
                widest: M.maxWidthRatio(sim),
                rate: M.rate(sim),
                overhead: M.overheadFraction(sim) * 100,
                verdict: M.verdict(sim),
              });
            }

            var pr = PRESETS.filter(function (x) { return x.key === api.state.preset; })[0];
            api.card.textContent = "";
            var head = document.createElement("div");
            head.className = "pa-map-card__head";
            var st = document.createElement("strong");
            st.textContent = pr ? pr.label : "自訂配方";
            head.appendChild(st);
            api.card.appendChild(head);
            if (pr) {
              var p = document.createElement("p");
              p.textContent = pr.why;
              api.card.appendChild(p);
            }
            function row(k, v) {
              var d = document.createElement("div");
              d.className = "pa-map-card__row";
              var ks = document.createElement("span");
              ks.className = "pa-map-card__key";
              ks.textContent = k;
              var vs = document.createElement("span");
              vs.textContent = v;
              d.appendChild(ks);
              d.appendChild(vs);
              api.card.appendChild(d);
            }
            var s = api.state;
            row("一個循環", s.depTime + " s 沉積 + " + s.etchTime + " s 蝕刻");
            row("切換開銷", (2 * M.SWITCH_OVERHEAD_SEC).toFixed(1) + " s / 循環(換氣與電漿穩定)");
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
            { key: "depth", label: "蝕刻深度", digits: 0, unit: " 列" },
            { key: "scallop", label: "Scallop 振幅", digits: 2, unit: " 格" },
            { key: "widest", label: "側壁最寬", digits: 2, unit: " × 開口" },
            { key: "rate", label: "每秒深度", digits: 3, unit: " 列/s" },
            { key: "overhead", label: "切換開銷佔比", digits: 0, unit: " %" },
            { key: "verdict", label: "判定", format: function (v) { return v; } },
          ]);
          api.readoutNode = readout;

          var ctrls = {};
          function knob(key) {
            var r = M.RANGES[key];
            var s = C.slider({
              label: r.label, min: r.min, max: r.max, step: r.step,
              unit: r.unit, digits: r.step < 1 ? 1 : 0, value: api.state[key],
              onChange: function (v) {
                if (api.state[key] === v) return;
                api.state[key] = v;
                api.restart();
              },
            });
            ctrls[key] = s;
            return s;
          }

          var presetCtl = C.segmented({
            label: "配方",
            options: PRESETS.map(function (p) { return { value: p.key, label: p.label }; }),
            value: "standard",
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
            C.panel([presetCtl, knob("depTime"), knob("etchTime"), knob("bias")])
          );
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "看側壁:每一個循環在側壁留下一個弧形凹痕,就是 scallop。**沒有任何一行程式在畫它** —— 它是「蝕刻步把新露出的側壁咬一口、沉積步再把它封住」的必然結果。",
              "比較「短循環」與「長循環」:短循環的 scallop 明顯較小(側壁光滑),但看「每秒深度」——**反而比較低**。原因在「切換開銷佔比」那一欄:每循環固定要花時間換氣與等電漿穩定,循環越短,這筆固定成本佔比越高。",
              "**這就是 Bosch 最核心的 trade-off**:側壁品質與產率直接衝突,而且衝突的原因是機台的切換時間,不是化學。",
              "切到「⚠ 關掉沉積步」:只剩 SF₆,側壁立刻被咬成一個大肚子(最寬可到 1.7 倍開口)。SF₆ 蝕 Si 又快又等向 —— 這正是 Bosch 非得把沉積分出來做不可的理由。",
              "切到「⚠ 沒有清底 bias」:聚合物鋪滿了卻沒人把溝底打開,整個溝被封死。Bosch 唯一需要方向性的地方就是這一步。",
              "把沉積時間慢慢加大:側壁越守越好,但溝底也越難清開 —— 加過頭會變成第二種失敗模式。這兩個 ⚠ 預設其實是同一條軸的兩端。",
            ])
          );
        },

        reset: function () {
          this.state = Object.assign({}, PRESETS[0].p, { preset: "standard" });
          this.restart();
        },

        tick: function () {
          var api = this;
          if (!api.sim) return;
          api._acc = (api._acc || 0) + 1;
          // 每 12 幀推進一個循環 —— 慢到看得見一圈一個 scallop
          if (api._acc % 12 === 0) {
            api.stepCycle();
            api.refresh();
          }
        },

        draw: function () {
          var api = this;
          if (!api.ctx || !api.prof) return;
          var ctx = api.ctx;
          var p = PA.canvasTheme.palette();
          var prof = api.prof;
          var w = api.width, h = api.height;

          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = p.bg;
          ctx.fillRect(0, 0, w, h);

          var cw = w / prof.cols;
          var ch = h / prof.rows;

          for (var y = 0; y < prof.rows; y++) {
            for (var x = 0; x < prof.cols; x++) {
              var i = prof.idx(x, y);
              var id = prof.mat[i];
              if (id === 0) continue;
              ctx.fillStyle = p[prof.byId[id].token] || "#888";
              ctx.fillRect(x * cw, y * ch, cw + 0.6, ch + 0.6);
            }
          }
          // 聚合物疊在上面 —— 沉積步結束時側壁那層就是它
          for (var y2 = 0; y2 < prof.rows; y2++) {
            for (var x2 = 0; x2 < prof.cols; x2++) {
              var i2 = prof.idx(x2, y2);
              if (prof.mat[i2] === 0) continue;
              var t = prof.poly[i2];
              if (t <= 0.02) continue;
              ctx.globalAlpha = Math.min(0.85, t * 0.5);
              ctx.fillStyle = p.vizPolymer;
              ctx.fillRect(x2 * cw, y2 * ch, cw + 0.6, ch + 0.6);
            }
          }
          ctx.globalAlpha = 1;

          ctx.save();
          ctx.font = "11px system-ui, sans-serif";
          ctx.textBaseline = "middle";
          [["遮罩", p.vizMask], ["矽", p.vizSubstrate], ["聚合物(C₄F₈)", p.vizPolymer]]
            .forEach(function (it, k) {
              var ly = 12 + k * 15;
              ctx.fillStyle = it[1];
              ctx.fillRect(8, ly - 5, 11, 10);
              ctx.fillStyle = p.text;
              ctx.fillText(it[0], 24, ly);
            });
          ctx.restore();

          ctx.save();
          ctx.font = "700 13px system-ui, sans-serif";
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";
          ctx.fillStyle = p.text;
          ctx.fillText("第 " + api.sim.cycles + " 圈", w - 10, h - 10);
          ctx.restore();
        },
      });
    },
    ["js/lab/profile-engine.js", "js/lab/bosch-model.js"]
  );
})((window.PA = window.PA || {}));
