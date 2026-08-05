/* ==========================================================================
   A10 — F/C 比滑桿
   章節 2.2 · 規格 docs/05-animation-spec.md  ★ 旗艦元件

   目標:從蝕刻模式一路滑到聚合物沉積模式,看晶圓剖面同步變化。

   驗收條件(docs/05):
     · 高 F/C → 等向、無選擇比;低 F/C → 側壁鈍化、高選擇比;更低 → etch stop
     · 加 O₂ 提高有效 F/C,加 H₂ 降低有效 F/C

   所有輪廓都由 profile-engine.js 演化出來,沒有一種形狀是畫上去的。
   側壁之所以垂直,只是因為它收不到離子、聚合物因此留著 —— 就這樣。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A10",
    function () {
    var C = PA.controls;
    var G = PA.gases;

    // 課文 §2.2.2 的氟碳氣體。F/C 由 gases.js 依分子式推算,這裡不重寫。
    var FC_GASES = ["CF4", "CHF3", "C4F8", "C4F6", "CH3F"];

    var FILMS = [
      { key: "oxide", label: "SiO₂", zh: "氧化層" },
      { key: "nitride", label: "SiN", zh: "氮化層" },
      { key: "silicon", label: "Si", zh: "多晶矽" },
    ];

    /**
     * 有效 F/C —— 課文 §2.2.2 的兩句話:
     *   加 O₂ 會提高有效 F/C(O 消耗 C 形成 CO/CO₂,把 F 釋放出來)
     *   加 H₂ 會降低有效 F/C(H 消耗 F 形成 HF)
     */
    function effectiveFC(baseFC, o2pct, h2pct) {
      return Math.max(0, baseFC + o2pct * 0.055 - h2pct * 0.05);
    }

    return PA.lab.create({
      setup: function () {
        var api = this;

        api.state = { gas: "C4F8", o2: 0, h2: 0, energy: 300, film: "oxide" };

        var wrap = document.createElement("div");
        wrap.className = "pa-lab__split";
        var canvasBox = document.createElement("div");
        var scaleBox = document.createElement("div");
        wrap.appendChild(canvasBox);
        wrap.appendChild(scaleBox);
        api.stage.appendChild(wrap);

        var canvas = document.createElement("canvas");
        canvas.setAttribute("role", "img");
        canvas.setAttribute(
          "aria-label",
          "晶圓剖面:光阻遮罩下的薄膜正在被蝕刻。高 F/C 比時側壁被側蝕," +
            "低 F/C 比時側壁被聚合物保護而垂直,更低時連溝底都被蓋住而停止蝕刻。"
        );
        canvasBox.appendChild(canvas);
        api.canvas = canvas;

        // 模式尺標:一條從蝕刻模式到沉積模式的軸,標出各氣體的位置
        api.plot = PA.plot.create({
          width: 520,
          height: 250,
          margin: { t: 20, r: 20, b: 46, l: 56 },
          x: { min: 0.5, max: 4.5, ticks: [1, 2, 3, 4], label: "有效 F/C 比", format: function (v) { return v.toFixed(0); } },
          y: { min: 0, max: 1.15, tickCount: 4, label: "相對速率", format: function (v) { return v.toFixed(1); } },
        });
        scaleBox.appendChild(api.plot.svg);

        api.prof = PA.profile.create({
          cols: 150,
          rows: 96,
          layers: [
            { material: "mask", thickness: 0.17 },
            { material: "oxide", thickness: 0.5 },
            { material: "silicon", thickness: 0.33 },
          ],
          openings: [[0.38, 0.62]],
        });

        api.effFC = function () {
          var g = G.byFormula(api.state.gas);
          return effectiveFC(g.fc, api.state.o2, api.state.h2);
        };

        api.restart = function () {
          api.prof.reset(
            [
              { material: "mask", thickness: 0.17 },
              { material: api.state.film, thickness: 0.5 },
              { material: "silicon", thickness: 0.33 },
            ],
            [[0.38, 0.62]]
          );
          api.openTop = api.prof.depth(0.5);
          // 開口寬度要量「遮罩層」那一列 —— 量第一列膜的話,還沒開始蝕刻時是 0,
          // 之後所有以它為分母的判定都會壞掉。
          api.openWidth = api.prof.widthAt(Math.max(0, api.openTop - 1));
          api.steps = 0;
          api.refresh();
        };

        /** 溝內最寬處(遮罩以下)—— undercut 與 bowing 都看這個 */
        api.maxWidth = function () {
          var p = api.prof;
          var d = p.depth(0.5);
          var w = 0;
          for (var y = api.openTop; y <= d && y < p.rows; y++) {
            var wy = p.widthAt(y);
            if (wy > w) w = wy;
          }
          return w;
        };

        /** 判定目前落在哪個模式 —— 由實際輪廓量出來,不是查表 */
        api.verdict = function () {
          var p = api.prof;
          var d = p.depth(0.5) - api.openTop;
          var w = api.maxWidth();
          if (api.prof.widthAt(Math.max(0, api.openTop - 1)) < api.openWidth * 0.6) {
            return { text: "淨沉積 —— 開口被封死", tone: "danger" };
          }
          if (api.steps > 150 && d < 3) return { text: "Etch stop —— 聚合物蓋住溝底", tone: "danger" };
          if (w > api.openWidth * 1.2) return { text: "等向蝕刻 —— 側壁被咬", tone: "warning" };
          if (d > 4) return { text: "異向蝕刻 ✅ 側壁垂直", tone: "success" };
          return { text: "蝕刻中…", tone: "textMuted" };
        };

        api.refresh = function () {
          if (!api.plot) return;
          var pl = api.plot;
          var pal = PA.canvasTheme.palette();
          var s = api.state;
          var fc = api.effFC();
          pl.clear();

          // 兩條相對速率曲線:F 自由基(蝕刻)與聚合物沉積
          var etchCurve = pl.sample(function (x) {
            return Math.min(1, x / 4);
          }, 120);
          pl.line(etchCurve, { stroke: pal.vizIonPos, width: 2.4 });
          pl.label(3.7, Math.min(1, 3.7 / 4), "F 自由基", {
            fill: pal.vizIonPos, dx: -8, dy: -8, size: 11, anchor: "end",
          });

          var depCurve = pl.sample(function (x) {
            return Math.min(1.1, Math.pow(Math.max(0, 3.4 - x), 1.6) * 0.22);
          }, 120);
          pl.line(depCurve, { stroke: pal.vizPolymer, width: 2.4, dash: "5 3" });
          pl.label(1.0, Math.min(1.1, Math.pow(2.4, 1.6) * 0.22), "聚合物", {
            fill: pal.vizPolymer, dx: 8, dy: 4, size: 11,
          });

          // 製程窗(由 check-profile.mjs 驗證過的範圍)
          pl.area(
            [[1.8, 1.15], [2.9, 1.15]],
            { fill: pal.success, opacity: 0.12 }
          );
          pl.label(2.35, 1.08, "製程窗", { fill: pal.success, size: 11, anchor: "middle" });

          /*
             各氣體的原始 F/C 位置。五支氟碳氣體各有自己的顏色
             (來自 canvas-theme 的單一來源),選中的那支加粗、其餘淡化 ——
             原本全部都是同一個灰色,只靠粗體區分選中的是哪支。
          */
          FC_GASES.forEach(function (f) {
            var g = G.byFormula(f);
            var sel = g.formula === s.gas;
            var col = PA.canvasTheme.gasColor(f, pal);
            pl.dot(g.fc, 0.03, { fill: col, r: sel ? 4 : 3, opacity: sel ? 1 : 0.5 });
            pl.label(g.fc, 0.03, g.formula, {
              fill: col,
              opacity: sel ? 1 : 0.6,
              dx: 0, dy: 16, size: 10, anchor: "middle",
              weight: sel ? 700 : 500,
            });
          });

          // 目前的有效 F/C —— 用所選氣體的顏色,與下方的氣體標記對得起來
          var selCol = PA.canvasTheme.gasColor(s.gas, pal);
          pl.vline(fc, { stroke: selCol, dash: "4 3", overlay: true });
          pl.dot(fc, 1.02, { fill: selCol, r: 5, overlay: true });

          var v = api.verdict();
          var base = G.byFormula(s.gas);
          if (api.readoutNode) {
            api.readoutNode.update({
              base: s.gas + " 的 F/C = " + base.fc.toFixed(1),
              eff: fc,
              depth: ((api.prof.depth(0.5) - api.openTop) / api.prof.rows) * 100,
              width: (api.maxWidth() / api.openWidth) * 100,
              verdict: v.text,
            });
          }
        };

        var detach = PA.canvasTheme.autoSize(canvas, canvasBox, 3 / 2, function (ctx, w, h) {
          api.ctx = ctx;
          api.width = w;
          api.height = h;
          if (!api.booted) { api.booted = true; api.restart(); }
        });
        api.onDestroy(detach);

        var readout = C.readout([
          { key: "base", label: "氣體", format: function (v) { return v; } },
          { key: "eff", label: "有效 F/C", digits: 2 },
          { key: "depth", label: "已蝕刻深度", digits: 0, unit: " % 膜厚" },
          { key: "width", label: "開口寬度", digits: 0, unit: " % 原始" },
          { key: "verdict", label: "模式", format: function (v) { return v; } },
        ]);
        api.readoutNode = readout;

        var gasCtl = C.segmented({
          label: "氟碳氣體",
          options: FC_GASES.map(function (f) {
            return { value: f, label: G.byFormula(f).formula };
          }),
          value: "C4F8",
          onChange: function (v) { api.state.gas = v; api.restart(); },
        });

        var o2Ctl = C.slider({
          label: "加 O₂(提高有效 F/C)",
          min: 0, max: 20, value: 0, step: 1, unit: "%", digits: 0,
          onChange: function (v) { api.state.o2 = v; api.restart(); },
        });

        var h2Ctl = C.slider({
          label: "加 H₂(降低有效 F/C)",
          min: 0, max: 20, value: 0, step: 1, unit: "%", digits: 0,
          onChange: function (v) { api.state.h2 = v; api.restart(); },
        });

        var eCtl = C.slider({
          label: "離子能量(bias)",
          min: 0, max: 800, value: 300, step: 25, unit: "eV", digits: 0,
          onChange: function (v) { api.state.energy = v; api.restart(); },
        });

        var filmCtl = C.segmented({
          label: "被蝕刻的膜",
          options: FILMS.map(function (f) { return { value: f.key, label: f.label }; }),
          value: "oxide",
          onChange: function (v) { api.state.film = v; api.restart(); },
        });

        var transport = C.transport({
          playing: true,
          onPlay: function () { api.start(); },
          onPause: function () { api.stop(); },
          onReset: function () {
            api.state = { gas: "C4F8", o2: 0, h2: 0, energy: 300, film: "oxide" };
            gasCtl.setValue("C4F8", true);
            o2Ctl.setValue(0, true);
            h2Ctl.setValue(0, true);
            eCtl.setValue(300, true);
            filmCtl.setValue("oxide", true);
            api.restart();
          },
        });

        api.el.appendChild(C.panel([gasCtl, filmCtl, o2Ctl, h2Ctl, eCtl, transport]));
        api.el.appendChild(readout);
        api.el.appendChild(
          C.observations([
            "從 CF₄(F/C = 4)開始 —— 聚合物幾乎不生成,側壁沒有保護,遮罩下方被咬出 undercut。這就是「純 CF₄ 刻不出垂直側壁」。",
            "切到 C₄F₈(F/C = 2)—— 側壁被聚合物守住,溝槽變垂直。溝底照樣被刻,因為離子把那裡的聚合物清掉了。這就是異向性的機制。",
            "切到 CH₃F(F/C = 1)—— 聚合物連溝底都蓋住,蝕刻停了,再久也刻不下去。這是 etch stop,不是機台壞掉。",
            "把「被蝕刻的膜」從 SiO₂ 換成 Si,維持 C₄F₈ —— SiO₂ 照刻,Si 幾乎不動。原因是 SiO₂ 自己的氧會把聚合物燒成 CO/CO₂,Si 沒有氧可用。這就是選擇比的來源,不是氣體「認得」材料。",
            "在 CH₃F 下把 O₂ 加上去 —— 有效 F/C 被推回製程窗,蝕刻恢復。現場「加一點 O₂ 讓它刻得動」就是在做這件事。",
            "把離子能量降到 60 eV 以下 —— 不管 F/C 多少都幾乎不蝕刻。化學到處都有,但沒有離子把反應打開就沒有用(這是 L3 3.1 協同效應的預告)。",
          ])
        );
      },

      reset: function () {
        this.restart();
      },

      tick: function () {
        var api = this;
        if (!api.prof) return;
        // 一幀推進數步,讓輪廓在數秒內演化到可判讀的狀態
        for (var i = 0; i < 3; i++) {
          api.prof.step({ effFC: api.effFC(), ionEnergy: api.state.energy, dt: 0.05 });
          api.steps++;
        }
        if (api.steps % 30 === 0) api.refresh();
      },

      draw: function () {
        var api = this;
        if (!api.ctx || !api.prof) return;
        var ctx = api.ctx;
        var p = PA.canvasTheme.palette();
        var prof = api.prof;
        var w = api.width;
        var h = api.height;

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
            var m = prof.byId[id];
            ctx.fillStyle = p[m.token] || "#888";
            ctx.fillRect(x * cw, y * ch, cw + 0.6, ch + 0.6);
          }
        }

        // 聚合物層畫在材料之上 —— 這是本元件的主角,要看得見
        for (var y2 = 0; y2 < prof.rows; y2++) {
          for (var x2 = 0; x2 < prof.cols; x2++) {
            var i2 = prof.idx(x2, y2);
            if (prof.mat[i2] === 0) continue;
            var t = prof.poly[i2];
            if (t <= 0.02) continue;
            ctx.globalAlpha = Math.min(0.85, t * 0.6);
            ctx.fillStyle = p.vizPolymer;
            ctx.fillRect(x2 * cw, y2 * ch, cw + 0.6, ch + 0.6);
          }
        }
        ctx.globalAlpha = 1;

        // 圖例
        ctx.save();
        ctx.font = "11px system-ui, sans-serif";
        ctx.textBaseline = "middle";
        var items = [
          ["光阻遮罩", p.vizMask],
          [api.state.film === "oxide" ? "SiO₂" : api.state.film === "nitride" ? "SiN" : "Si 膜", p.vizFilm],
          ["下層 Si", p.vizSubstrate],
          ["聚合物", p.vizPolymer],
        ];
        var lx = 8;
        items.forEach(function (it, k) {
          var ly = 12 + k * 16;
          ctx.fillStyle = it[1];
          ctx.fillRect(lx, ly - 5, 12, 10);
          ctx.fillStyle = p.text;
          ctx.fillText(it[0], lx + 17, ly);
        });
        ctx.restore();

        // 判定
        var v = api.verdict();
        ctx.save();
        ctx.font = "600 14px system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = p[v.tone] || p.text;
        ctx.fillText(v.text, w - 10, h - 10);
        ctx.restore();
        },
      });
    },
    // 這兩支只有輪廓類元件用得到,不進 lab core
    ["data/gases.js", "js/lab/profile-engine.js"]
  );
})((window.PA = window.PA || {}));
