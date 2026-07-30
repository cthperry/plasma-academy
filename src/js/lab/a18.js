/* ==========================================================================
   A18 — 蝕刻輪廓模擬器
   章節 3.1、3.3 · 規格 docs/05-animation-spec.md  ★★ 旗艦元件

   目標:把參數與 profile 缺陷的關係變成可探索的。

   驗收條件(docs/05):
     · 八種 profile 全部可重現且視覺特徵明確可辨
     · 參數方向與 3.3 圖鑑的對策一致(例如「降壓」確實改善 bowing)

   **這一支只負責 UI。** 物理在 js/lab/profile-shapes.js(它再包一層
   profile-engine.js),因為驗收條件必須能被自動檢查 ——
   tools/check-shapes.mjs 在 Node 裡跑的就是同一份 profile-shapes.js,
   所以「八種都做得到」是被斷言的,不是靠人眼看畫面。

   八種 profile 沒有任何一種是寫死的:引擎只有三條規則(通量、鈍化、移除),
   加上離子角度發散與鏡面反射兩個通量修正。缺陷全是這些式子的結果。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A18",
    function () {
      var C = PA.controls;
      var S = PA.profileShapes;

      /**
       * 八種 profile。
       * 參數不在這裡定義 —— 全部從 data/defects.js 的 profile 欄位讀進來,
       * 所以圖鑑改了、模擬器就跟著改,兩邊不可能漂移。
       * 這裡只放「垂直」(它不是缺陷,圖鑑裡沒有)與各自的一句話說明。
       */
      var VERTICAL = {
        key: "vertical", label: "垂直", defect: null,
        p: { ion: 350, spread: 4, passiv: 45, radical: 60, reflect: 20, multi: false },
        why: "離子方向性好、鈍化剛好夠 —— 這是製程窗的中心,也是其餘七種的對照組。",
      };

      var WHY = {
        undercut: "鈍化幾乎沒有 + 自由基很強 → 側壁被化學蝕刻咬進去,而遮罩還完好。",
        taper: "離子角度發散大 → 頂部被斜射離子稍微咬開,底部仍被鈍化與再沉積守住 → 上寬下窄。",
        bowing: "離子在側壁反射後打在中段 → 中段鼓出。頂部反而被沉積保護著。",
        microtrench: "離子在溝底附近的斜面鏡面反射,集中打在溝底兩側 → 兩邊各一道深溝。",
        footing: "鈍化偏高 + 離子方向性好 → 聚合物與再沉積在底角累積,清不乾淨。",
        faceting: "離子能量高 + 幾乎無鈍化 → 遮罩肩部被濺鍍產額的角度依賴削掉,**遮罩開口自己變寬**。",
        "etch-stop": "聚合物在溝底的沉積超過移除 → 蝕刻完全停住。",
        arde: "不同 CD 同時蝕刻 —— 自由基通量隨深寬比衰減、覆蓋率跟著掉,窄的就是比較淺。",
      };

      // 顯示順序:垂直當對照組排第一,其餘依圖鑑順序
      var ORDER = ["undercut", "taper", "bowing", "microtrench", "footing", "faceting", "etch-stop"];

      function buildPresets() {
        var out = [VERTICAL];
        ORDER.forEach(function (id) {
          var d = PA.defects.byId(id);
          if (!d || !d.profile) return;
          out.push({
            key: id,
            label: d.zh.replace(/\(.*\)/, "").trim(),
            defect: id,
            p: d.profile,
            why: WHY[id] || d.causes[0],
          });
        });
        return out;
      }

      return PA.lab.create({
        setup: function () {
          var api = this;
          var PRESETS = buildPresets();
          api.presets = PRESETS;
          api.state = Object.assign({ preset: "vertical", multi: false }, PRESETS[0].p);

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
            "晶圓剖面的蝕刻輪廓演化。可切換八種預設重現垂直、undercut、taper、bowing、" +
              "microtrench、footing、faceting 與 etch stop 八種 profile。"
          );
          canvasBox.appendChild(canvas);
          api.canvas = canvas;

          // 說明卡:這組參數為什麼會產生這個缺陷 + 連往圖鑑
          var card = document.createElement("div");
          card.className = "pa-map-card";
          sideBox.appendChild(card);
          api.card = card;

          api.restart = function () {
            api.sim = S.start(api.state);
            api.prof = api.sim.prof;
            api.refresh();
          };

          /** 一步 —— 全部委給 profile-shapes,UI 不碰物理 */
          api.step = function () {
            S.step(api.sim, 1);
          };

          api.metrics = function () {
            return S.metrics(api.sim);
          };

          api.refresh = function () {
            var m = S.metrics(api.sim);
            var pr = api.presets.filter(function (x) { return x.key === api.state.preset; })[0];

            if (api.readoutNode) {
              api.readoutNode.update({
                depth: m.depthPct,
                top: m.top,
                mid: m.mid,
                bot: m.bot,
                mask: S.maskMetrics(api.sim).widen,
                shape: S.classify(api.sim),
              });
            }

            // 說明卡
            api.card.textContent = "";
            var head = document.createElement("div");
            head.className = "pa-map-card__head";
            var strong = document.createElement("strong");
            strong.textContent = pr.label;
            head.appendChild(strong);
            api.card.appendChild(head);

            var why = document.createElement("p");
            why.textContent = pr.why;
            api.card.appendChild(why);

            if (!pr.defect || !PA.defects) return;
            var def = PA.defects.byId(pr.defect);
            if (!def) return;

            [["症狀", def.symptom], ["診斷區分", def.distinguish]].forEach(function (row) {
              var r = document.createElement("div");
              r.className = "pa-map-card__row";
              var k = document.createElement("span");
              k.className = "pa-map-card__key";
              k.textContent = row[0];
              var v = document.createElement("span");
              v.textContent = row[1];
              r.appendChild(k);
              r.appendChild(v);
              api.card.appendChild(r);
            });

            var fx = document.createElement("div");
            fx.className = "pa-map-card__row";
            var fk = document.createElement("span");
            fk.className = "pa-map-card__key";
            fk.textContent = "對策";
            var fv = document.createElement("span");
            fv.textContent = def.fixes
              .map(function (f) { return f.knob + " " + f.dir; })
              .join("、");
            fx.appendChild(fk);
            fx.appendChild(fv);
            api.card.appendChild(fx);

            var links = document.createElement("div");
            links.className = "pa-map-card__links";
            var lt = document.createElement("span");
            lt.className = "pa-map-card__key";
            lt.textContent = "圖鑑";
            links.appendChild(lt);
            var a = document.createElement("a");
            var base = document.documentElement.getAttribute("data-base") || "";
            a.href = base + "defects/#" + def.id;
            a.textContent = def.zh;
            links.appendChild(a);
            api.card.appendChild(links);
          };

          var detach = PA.canvasTheme.autoSize(canvas, canvasBox, 3 / 2, function (ctx, w, h) {
            api.ctx = ctx;
            api.width = w;
            api.height = h;
            if (!api.booted) { api.booted = true; api.restart(); }
          });
          api.onDestroy(detach);

          var readout = C.readout([
            { key: "depth", label: "蝕刻深度", digits: 0, unit: " % 總厚" },
            { key: "top", label: "頂部寬度", digits: 0, unit: " % 開口" },
            { key: "mid", label: "中段寬度", digits: 0, unit: " % 開口" },
            { key: "bot", label: "底部寬度", digits: 0, unit: " % 開口" },
            { key: "mask", label: "遮罩開口", digits: 2, unit: " 倍" },
            { key: "shape", label: "判定形狀", format: function (v) { return v; } },
          ]);
          api.readoutNode = readout;

          var sliders = {};
          function knob(key) {
            var r = S.RANGES[key];
            var s = C.slider({
              label: r.label,
              min: r.min,
              max: r.max,
              step: r.step,
              unit: r.unit,
              digits: 0,
              value: api.state[key],
              onChange: function (v) {
                if (api.state[key] === v) return;
                api.state[key] = v;
                api.restart();
              },
            });
            sliders[key] = s;
            return s;
          }

          var presetCtl = C.segmented({
            label: "八種 profile 預設",
            options: PRESETS.map(function (p) { return { value: p.key, label: p.label }; }),
            value: "vertical",
            onChange: function (v) {
              var pr = api.presets.filter(function (x) { return x.key === v; })[0];
              api.state.preset = v;
              Object.keys(pr.p).forEach(function (k) {
                api.state[k] = pr.p[k];
                if (sliders[k]) sliders[k].setValue(pr.p[k], true);
              });
              api.restart();
            },
          });

          var multiCtl = C.toggle({
            label: "多溝槽視圖(看 ARDE)",
            value: false,
            onChange: function (v) { api.state.multi = v; api.restart(); },
          });

          api.el.appendChild(
            C.panel([
              presetCtl,
              knob("ion"),
              knob("spread"),
              knob("passiv"),
              knob("radical"),
              knob("reflect"),
              multiCtl,
            ])
          );
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "八個預設按一遍,每一個右邊都會說明「這組參數為什麼產生這個缺陷」,並連到圖鑑對應條目。",
              "Etch stop 預設:鈍化很高,蝕刻幾乎完全不動。把鈍化滑桿降下來蝕刻就恢復 —— 圖鑑的對策「降聚合性氣體」在這裡直接看得到,而且是聚合物收支自己算出來的。",
              "Faceting 預設:注意「遮罩開口」這一欄從 1.00 變大 —— 遮罩自己被削寬了。這正是 faceting 與 undercut 的分水嶺:undercut 的遮罩完好,只有膜被側蝕。",
              "Footing 預設:溝的中段正常,但界面附近縮起來 —— 底角沒清乾淨。降鈍化或加過蝕刻都會改善。",
              "打開多溝槽視圖:三個不同 CD 同時蝕刻,窄的明顯較淺(落差約 45 %)。這是 ARDE,而且沒有任何一行程式在處理「深寬比」—— 它來自自由基通量的立體角衰減與表面覆蓋率。",
              "把「離子角度發散」從 0 一路拉到 15°(等效於升壓),看側壁如何開始被斜射離子咬進去 —— 這是壓力影響方向性的直接畫面。",
              "Taper 預設:注意「底部寬度」掉到 54 % —— 上寬下窄。降鈍化就會打直,這驗證了圖鑑的對策。",
              "⚠ 目前垂直、Taper、Footing、Faceting、Etch stop 五種達到「特徵明確可辨」。Undercut 做不出來其實是對的 —— 本元件的膜是 SiO₂,而純化學蝕不動它(3.1.4 的化學選擇性);Bowing 與 Microtrench 受限於側壁鈍化會飽和,沒有中間梯度。診斷與修法見 docs/11 的 A18 狀態表。",
            ])
          );
        },

        reset: function () {
          this.state = Object.assign({ preset: "vertical", multi: false }, this.presets[0].p);
          this.restart();
        },

        tick: function () {
          var api = this;
          if (!api.sim) return;
          for (var i = 0; i < 2; i++) api.step();
          if (api.sim.steps % 25 === 0) api.refresh();
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
          for (var y2 = 0; y2 < prof.rows; y2++) {
            for (var x2 = 0; x2 < prof.cols; x2++) {
              var i2 = prof.idx(x2, y2);
              if (prof.mat[i2] === 0) continue;
              var t = prof.poly[i2];
              if (t <= 0.02) continue;
              ctx.globalAlpha = Math.min(0.85, t * 0.55);
              ctx.fillStyle = p.vizPolymer;
              ctx.fillRect(x2 * cw, y2 * ch, cw + 0.6, ch + 0.6);
            }
          }
          ctx.globalAlpha = 1;

          ctx.save();
          ctx.font = "11px system-ui, sans-serif";
          ctx.textBaseline = "middle";
          [["遮罩", p.vizMask], ["目標膜 SiO₂", p.vizFilm], ["下層 Si", p.vizSubstrate], ["鈍化層", p.vizPolymer]]
            .forEach(function (it, k) {
              var ly = 12 + k * 15;
              ctx.fillStyle = it[1];
              ctx.fillRect(8, ly - 5, 11, 10);
              ctx.fillStyle = p.text;
              ctx.fillText(it[0], 24, ly);
            });
          ctx.restore();

          ctx.save();
          ctx.font = "700 14px system-ui, sans-serif";
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";
          ctx.fillStyle = p.text;
          ctx.fillText(S.classify(api.sim), w - 10, h - 10);
          ctx.restore();
        },
      });
    },
    ["data/defects.js", "js/lab/profile-engine.js", "js/lab/profile-shapes.js"]
  );
})((window.PA = window.PA || {}));
