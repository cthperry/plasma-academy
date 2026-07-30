/* ==========================================================================
   A25 — 晶圓蝕刻率分佈熱圖
   章節 3.6 · 規格 docs/05-animation-spec.md

   目標:建立「map 形狀 → 成因」的對照能力。

   六種 map 全部由**物理旋鈕**產生,沒有「形狀」這個參數;
   判定(右側的「判讀」)看的是量出來的 map,不是你選了哪個預設 ——
   所以「猜成因」模式才有意義:系統不會偷看答案。

   物理在 js/lab/uniformity-model.js,由 tools/check-uniformity.mjs
   的 21 項斷言守住(含 A25 的兩條驗收條件)。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A25",
    function () {
      var C = PA.controls;
      var U = PA.uniformity;

      /**
       * 低 → 高:藍 → 綠 → 黃 → 紅。
       * 放在 closure 而不是 lab.create 的物件裡 —— create 只會把
       * setup/reset/tick/draw 搬到 api 上,額外的物件方法拿不到
       * (第一版寫成 api.heatColor,執行時直接 TypeError)。
       */
      function heatColor(t) {
        var v = Math.max(0, Math.min(1, t));
        var stops = [[40, 90, 170], [50, 150, 140], [200, 190, 70], [210, 90, 60]];
        var seg = v * (stops.length - 1);
        var i = Math.min(stops.length - 2, Math.floor(seg));
        var f = seg - i;
        var a = stops[i];
        var b = stops[i + 1];
        return "rgb(" +
          Math.round(a[0] + (b[0] - a[0]) * f) + "," +
          Math.round(a[1] + (b[1] - a[1]) * f) + "," +
          Math.round(a[2] + (b[2] - a[2]) * f) + ")";
      }

      function defaults() {
        return {
          gap: 3, pressure: 30, centerFrac: 0.5,
          tCenter: 60, tMid: 60, tEdge: 60,
          ringWear: 0, pumpAsym: 0, pumpAngle: 0,
          quiz: false, quizKey: null, revealed: false,
        };
      }

      function toModel(s) {
        return {
          gap: s.gap, pressure: s.pressure, centerFrac: s.centerFrac,
          zoneTemps: [s.tCenter, s.tMid, s.tEdge],
          zoneSharp: s.zoneSharp,
          ringWear: s.ringWear, pumpAsym: s.pumpAsym, pumpAngle: s.pumpAngle,
        };
      }

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = defaults();

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
            "圓形晶圓的蝕刻率熱圖,右側是徑向剖面曲線。顏色越亮代表速率越高。"
          );
          canvasBox.appendChild(canvas);
          api.canvas = canvas;

          var card = document.createElement("div");
          card.className = "pa-map-card";
          sideBox.appendChild(card);
          api.card = card;

          api.rebuild = function () {
            api.map = U.makeMap(toModel(api.state));
            api.stats = U.stats(api.map);
            api.shape = U.classify(api.map);
            api.refresh();
          };

          /** 反向練習:隨機挑一個預設,不顯示它是哪一個 */
          api.newQuiz = function () {
            var ps = U.PRESETS;
            var pick = ps[Math.floor(Math.random() * ps.length)];
            var st = defaults();
            var m = pick.state;
            st.gap = m.gap; st.pressure = m.pressure; st.centerFrac = m.centerFrac;
            st.tCenter = m.zoneTemps[0]; st.tMid = m.zoneTemps[1]; st.tEdge = m.zoneTemps[2];
            st.zoneSharp = m.zoneSharp;
            st.ringWear = m.ringWear; st.pumpAsym = m.pumpAsym;
            st.quiz = true; st.quizKey = pick.key; st.revealed = false;
            api.state = st;
            api.rebuild();
          };

          api.refresh = function () {
            if (api.readoutNode) {
              api.readoutNode.update({
                half: api.stats.halfWidth,
                sigma: api.stats.oneSigma,
                ratio: api.stats.halfWidth / api.stats.oneSigma,
                shape: api.state.quiz && !api.state.revealed ? "（先自己判讀）" : api.shape,
              });
            }
            var s = api.state;
            api.card.textContent = "";
            var head = document.createElement("div");
            head.className = "pa-map-card__head";
            var st = document.createElement("strong");
            head.appendChild(st);
            api.card.appendChild(head);

            if (s.quiz && !s.revealed) {
              st.textContent = "🎯 反向練習:這張 map 是什麼形狀?成因是什麼?";
              var p0 = document.createElement("p");
              p0.textContent =
                "先看熱圖與徑向剖面自己判斷,再按「揭曉」。提示:先問「它是不是軸對稱的」——" +
                "不對稱的話,轉片實驗會告訴你那是腔體幾何問題。";
              api.card.appendChild(p0);
            } else {
              var pr = s.quizKey ? U.PRESETS.filter(function (x) { return x.key === s.quizKey; })[0] : null;
              st.textContent = "判讀:" + api.shape;
              var p1 = document.createElement("p");
              p1.textContent = pr
                ? pr.why
                : "這張 map 是目前旋鈕組合的結果。判讀來自量測值(方位不對稱、邊緣殘差、內部凹陷、曲率尖峰),不是來自你選了什麼。";
              api.card.appendChild(p1);
              if (pr) {
                var p2 = document.createElement("p");
                p2.className = "pa-subtle";
                p2.textContent = "配方:" + pr.label;
                api.card.appendChild(p2);
              }
            }
          };

          var detach = PA.canvasTheme.autoSize(canvas, canvasBox, 4 / 3, function (ctx, w, h) {
            api.ctx = ctx;
            api.width = w;
            api.height = h;
            if (!api.booted) { api.booted = true; api.rebuild(); }
          });
          api.onDestroy(detach);

          var readout = C.readout([
            { key: "half", label: "不均勻度(半幅法)", digits: 1, unit: " %" },
            { key: "sigma", label: "不均勻度(1σ 法)", digits: 1, unit: " %" },
            { key: "ratio", label: "兩種定義的比值", digits: 2, unit: " ×" },
            { key: "shape", label: "判讀", format: function (v) { return v; } },
          ]);
          api.readoutNode = readout;

          var ctrls = {};
          function knob(key) {
            var r = U.RANGES[key];
            var sl = C.slider({
              label: r.label, min: r.min, max: r.max, step: r.step,
              unit: r.unit, digits: r.step < 1 ? 2 : 0, value: api.state[key],
              onChange: function (v) {
                if (api.state[key] === v) return;
                api.state[key] = v;
                api.state.quiz = false;
                api.state.quizKey = null;
                api.rebuild();
              },
            });
            ctrls[key] = sl;
            return sl;
          }

          var presetCtl = C.segmented({
            label: "配方",
            options: U.PRESETS.map(function (p) { return { value: p.key, label: p.label }; }),
            value: "",
            onChange: function (v) {
              var pr = U.PRESETS.filter(function (x) { return x.key === v; })[0];
              if (!pr) return;
              var st = defaults();
              var m = pr.state;
              st.gap = m.gap; st.pressure = m.pressure; st.centerFrac = m.centerFrac;
              st.tCenter = m.zoneTemps[0]; st.tMid = m.zoneTemps[1]; st.tEdge = m.zoneTemps[2];
              st.zoneSharp = m.zoneSharp;
              st.ringWear = m.ringWear; st.pumpAsym = m.pumpAsym;
              st.quizKey = pr.key;
              api.state = st;
              Object.keys(ctrls).forEach(function (k) {
                if (ctrls[k] && ctrls[k].setValue && st[k] != null) ctrls[k].setValue(st[k], true);
              });
              api.rebuild();
            },
          });

          var quizBtn = C.button({
            label: "🎯 出一題(反向練習)",
            onClick: function () { api.newQuiz(); },
          });
          var revealBtn = C.button({
            label: "揭曉",
            onClick: function () { api.state.revealed = true; api.refresh(); },
          });

          api.el.appendChild(
            C.panel([
              presetCtl, quizBtn, revealBtn,
              knob("gap"), knob("pressure"), knob("centerFrac"),
              knob("ringWear"), knob("pumpAsym"),
              knob("tCenter"), knob("tMid"), knob("tEdge"),
            ])
          );
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "**先看兩個不均勻度的數字差多少。** 半幅法 (Max−Min)/(2×Mean) 通常是 1σ 法的 1.5–2.3 倍。對數字之前一定要先問對方用哪個定義 —— 這是現場最常見的雞同鴨講。",
              "**中心快 vs 邊緣快**:把「噴淋頭中心區分配」從 0 拉到 1,map 從邊緣快翻到中心快。但注意 —— **要把壓力也拉高才看得明顯**:壓力低時自由基橫向跑得動,噴淋頭的分區被抹平了。",
              "**W 形不是另一種缺陷,是兩個正常效應的疊加。** 把 gap 縮小(邊緣的電場效應變強)再把氣體偏中心,兩個方向相反的項就在中間半徑打架,塌出一個 W。把 gap 拉回 5 cm,W 就消失了。",
              "**同心環紋來自分區交界。** 三個控溫區只要差幾度,交界處就留下一圈痕跡 —— 因為速率對溫度是 Arrhenius 依賴(每 10 °C 約 13 %)。",
              "**單邊偏斜是唯一「轉片不跟著轉」的一種。** 把「抽氣不對稱」拉起來,熱點固定在泵口那一側。現場的判別法就是**轉片實驗**:把晶圓轉 90° 再跑一次,圖形跟著轉 → 晶圓/圖形問題;不跟著轉 → 腔體幾何問題(泵口、RF 饋入)。這個實驗應該是每個工程師的標配。",
              "**把「聚焦環消耗」拉到 100 %**:最外圈急升,而中間完全沒變。edge roll 的特徵就是「只有最後幾 mm 出事」—— 判讀時量的是**偏離內部趨勢多少**,不是「外圈比肩部高多少」(後者會把每一張中心快都誤判成 edge roll)。",
              "**用溫度救均勻度**:先做出一張中心快的 map,再把中心區降溫、邊緣區升溫。不均勻度會明顯下降 —— 這就是為什麼先進 ESC 要做 2–10 區獨立控溫。**溫度是修均勻度最直接的旋鈕。**",
              "按「出一題」做**反向練習**:系統隨機給一張 map,你先判讀再揭曉。這正是現場拿到一張 map 時要做的事 —— 先問形狀,再問成因,最後才動旋鈕。",
            ])
          );
        },

        reset: function () {
          this.state = defaults();
          this.rebuild();
        },

        draw: function () {
          var api = this;
          if (!api.ctx || !api.map) return;
          var ctx = api.ctx;
          var p = PA.canvasTheme.palette();
          var w = api.width;
          var h = api.height;

          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = p.bg;
          ctx.fillRect(0, 0, w, h);

          var mapH = h * 0.66;
          var cx = w / 2;
          var cy = mapH / 2 + 6;
          var rad = Math.min(w, mapH) * 0.44;

          var st = api.stats;
          var span = st.max - st.min || 1;

          // 熱圖:直接畫極座標格
          var m = api.map;
          var dr = rad / m.NR;
          for (var i = 0; i < m.NR; i++) {
            for (var j = 0; j < m.NT; j++) {
              var c = m.cells[i * m.NT + j];
              var t = (c.v - st.min) / span;
              ctx.fillStyle = heatColor(t);
              var a0 = (j / m.NT) * Math.PI * 2;
              var a1 = ((j + 1) / m.NT) * Math.PI * 2;
              ctx.beginPath();
              ctx.arc(cx, cy, (i + 1) * dr, a0, a1 + 0.02);
              ctx.arc(cx, cy, i * dr, a1 + 0.02, a0, true);
              ctx.closePath();
              ctx.fill();
            }
          }
          // 晶圓外框
          ctx.strokeStyle = p.border || p.text;
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.stroke();

          // 泵口方向標示
          if (api.state.pumpAsym > 0) {
            ctx.save();
            ctx.font = "10px system-ui, sans-serif";
            ctx.fillStyle = p.textSubtle || p.text;
            ctx.textAlign = "center";
            var pa = api.state.pumpAngle || 0;
            ctx.fillText("泵口", cx + Math.cos(pa) * (rad + 16), cy + Math.sin(pa) * (rad + 16));
            ctx.restore();
          }

          /* ---- 徑向剖面 ---- */
          var pyTop = mapH + 16;
          var pyH = h - pyTop - 20;
          ctx.save();
          ctx.font = "11px system-ui, sans-serif";
          ctx.fillStyle = p.text;
          ctx.fillText("徑向剖面(中心 → 邊緣)", 8, pyTop - 4);
          ctx.restore();

          ctx.strokeStyle = p.vizGrid || p.border;
          ctx.beginPath();
          ctx.moveTo(30, pyTop + pyH);
          ctx.lineTo(w - 10, pyTop + pyH);
          ctx.stroke();

          ctx.strokeStyle = p.primary;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (var k = 0; k < m.radial.length; k++) {
            var x = 30 + (m.radial[k].r) * (w - 44);
            var yv = pyTop + pyH - ((m.radial[k].v - st.min) / span) * (pyH - 6);
            if (k === 0) ctx.moveTo(x, yv);
            else ctx.lineTo(x, yv);
          }
          ctx.stroke();
          ctx.lineWidth = 1;

          // 控溫分區邊界
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = p.textSubtle || p.text;
          ctx.globalAlpha = 0.45;
          U.ZONES.forEach(function (z) {
            var zx = 30 + z * (w - 44);
            ctx.beginPath();
            ctx.moveTo(zx, pyTop);
            ctx.lineTo(zx, pyTop + pyH);
            ctx.stroke();
          });
          ctx.restore();
        },

      });
    },
    ["js/lab/uniformity-model.js"]
  );
})((window.PA = window.PA || {}));
