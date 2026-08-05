/* ==========================================================================
   A26 — Langmuir 探針 I-V 互動 ★
   章節 4.1 · 規格 docs/05-animation-spec.md

   三個分頁:線性 I-V / 半對數 ln(I_e) vs V / 二次微分(Druyvesteyn EEDF)。

   **重點是「量」而不是「看」**:四個參數全部由曲線算出來
   (findVf / fitTe / findVp / neFromIsat),再和設定的真值比對顯示誤差。
   所以量錯是可能的 —— 這正是探針教學的核心。

   ⚠️ 已知限制:關掉 RF 補償時,本模型**不會**讓 T_e 被高估
   (指數區的 RF 平均只是把曲線整條平移,斜率不變 —— 這是可以證明的)。
   它會讓 **V_p 與 V_f 整個被推歪**(30 V 振幅 → V_p 差 30 V),
   而離子能量 ≈ V_p − V_wafer,所以下游全錯。課文如實說明兩者的差別。

   物理在 js/lab/probe-model.js,由 tools/check-diagnostics.mjs 守住。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A26",
    function () {
      var C = PA.controls;
      var M = PA.probe;

      var VIEWS = [
        { key: "iv", label: "線性 I-V" },
        { key: "log", label: "半對數 ln(I_e)" },
        { key: "eedf", label: "二次微分 EEDF" },
      ];

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = { ne: 1e16, te: 3, vrf: 0, stray: 0.35, noise: 0, coating: 0, gas: "ar", view: "iv" };

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
            "Langmuir 探針的電流對偏壓曲線,分為離子飽和區、指數過渡區與電子飽和區。"
          );
          canvasBox.appendChild(canvas);
          api.canvas = canvas;

          var card = document.createElement("div");
          card.className = "pa-map-card";
          sideBox.appendChild(card);
          api.card = card;

          api.rebuild = function () {
            var s = api.state;
            api.sim = M.create({
              ne: s.ne, te: s.te, vp: 20, gas: s.gas,
              vrf: s.vrf, stray: s.stray, noise: s.noise, coating: s.coating,
            });
            api.curve = M.sweep(api.sim, -70, 40, 260);
            api.res = M.analyse(api.sim, api.curve);
            api.refresh();
          };

          api.refresh = function () {
            var r = api.res;
            var s = api.state;
            if (!r) return;
            if (api.readoutNode) {
              api.readoutNode.update({
                vf: r.vf,
                te: r.te,
                teErr: r.teError * 100,
                vp: r.vp,
                vpErr: r.vpError * 100,
                ne: r.ne,
                neErr: r.neError * 100,
              });
            }
            api.card.textContent = "";
            var head = document.createElement("div");
            head.className = "pa-map-card__head";
            var st = document.createElement("strong");
            st.textContent =
              s.vrf > 0 ? "⚠ RF 補償失效" : s.coating > 0.3 ? "⚠ 探針已鍍膜" : "量測狀態正常";
            head.appendChild(st);
            api.card.appendChild(head);

            var p = document.createElement("p");
            if (s.vrf > 0) {
              p.textContent =
                "電漿電位以 13.56 MHz 振盪 ±" + s.vrf + " V,探針量到的是整個週期的平均。" +
                "注意 V_p:真值 20 V,現在量到 " + r.vp.toFixed(1) + " V —— 差了 " +
                Math.abs(r.vp - 20).toFixed(0) + " V。離子能量 ≈ V_p − V_wafer,所以下游全錯。";
            } else if (s.coating > 0.3) {
              p.textContent =
                "探針表面被絕緣層蓋住,有效面積縮小 → 離子飽和電流變小 → n_e 被低估 " +
                (-r.neError * 100).toFixed(0) + " %。曲線形狀還在,所以**很容易沒發現**。";
            } else {
              p.textContent =
                "四個參數都由曲線算出來(不是把設定值抄回來),誤差都在 10 % 以內。" +
                "這是探針分析正確時該有的樣子。";
            }
            api.card.appendChild(p);

            var p2 = document.createElement("p");
            p2.className = "pa-subtle";
            p2.textContent =
              "真值:T_e " + s.te.toFixed(1) + " eV、n_e " + s.ne.toExponential(1) +
              " m⁻³、V_p 20 V(氣體 " + M.GASES[s.gas].label + ")";
            api.card.appendChild(p2);
          };

          var detach = PA.canvasTheme.autoSize(canvas, canvasBox, 3 / 4, function (ctx, w, h) {
            api.ctx = ctx;
            api.width = w;
            api.height = h;
            if (!api.booted) { api.booted = true; api.rebuild(); }
          });
          api.onDestroy(detach);

          var readout = C.readout([
            { key: "vf", label: "浮動電位 V_f", digits: 1, unit: " V" },
            { key: "te", label: "電子溫度 T_e(量到)", digits: 2, unit: " eV" },
            { key: "teErr", label: "T_e 誤差", digits: 1, unit: " %" },
            { key: "vp", label: "電漿電位 V_p(量到)", digits: 1, unit: " V" },
            { key: "vpErr", label: "V_p 誤差", digits: 1, unit: " %" },
            { key: "ne", label: "電子密度 n_e(量到)", digits: 0, unit: " m⁻³", format: function (v) { return v.toExponential(2); } },
            { key: "neErr", label: "n_e 誤差", digits: 1, unit: " %" },
          ]);
          api.readoutNode = readout;

          function knob(key) {
            var r = M.RANGES[key];
            return C.slider({
              label: r.label, min: r.min, max: r.max, step: r.step,
              unit: r.unit, digits: r.step < 1 ? 2 : 0, value: api.state[key],
              onChange: function (v) {
                if (api.state[key] === v) return;
                api.state[key] = v;
                api.rebuild();
              },
            });
          }

          var viewCtl = C.segmented({
            label: "檢視",
            options: VIEWS.map(function (v) { return { value: v.key, label: v.label }; }),
            value: "iv",
            onChange: function (v) { api.state.view = v; },
          });
          var gasCtl = C.segmented({
            label: "氣體",
            options: Object.keys(M.GASES).map(function (k) {
              return { value: k, label: M.GASES[k].label };
            }),
            value: "ar",
            onChange: function (v) { api.state.gas = v; api.rebuild(); },
          });

          api.el.appendChild(
            C.panel([viewCtl, gasCtl, knob("te"), knob("ne"), knob("vrf"), knob("stray"), knob("noise"), knob("coating")])
          );
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "**先在補償正常的狀態下走一次四參數流程。** V_f 是 I = 0 的地方;切到半對數圖,過渡區是一條直線,**斜率的倒數就是 T_e**;V_p 在 dI/dV 最大處;n_e 由離子飽和電流反推。四個誤差都在 1 % 以內 —— 這是分析正確時該有的樣子。",
              "看電子飽和電流與離子飽和電流差多少(面板上的 n_e 是由後者算的):相差 50 倍以上。**原因只有一個 —— 質量比。** 電子輕得多,熱速度快得多,所以同樣的密度下收集到的電流差兩個數量級。",
              "**把「RF 電位振幅」拉到 30 V(模擬補償失效)**:V_f 從 4.5 V 一路掉到 −9.9 V、V_p 也被推歪。**離子能量 ≈ V_p − V_wafer,所以你對離子能量的估計整個垮掉。**",
              "⚠️ **同一個動作也讓 T_e 被高估** —— 而且是最嚴重的那個症狀:用現場標準的近轉折擬合窗量,V_rf 30 V 時 T_e 從 3 eV 變成 16.5 eV,**高估 5.5 倍**;45 V 更到 9.1 倍。補償正常(V_rf = 0)時同一個窗仍準到 0 %,所以這不是擬合窗造成的假象。",
              "成因是探針對電漿隔著鞘層電容、對地隔著雜散電容,RF 由兩者**分壓**;而鞘層電容 ∝ 1/s、s 又由 Child–Langmuir 給 ∝ ((V_p−V)/T_e)^(3/4) —— 所以落在鞘層上的調變振幅**隨偏壓而變**,時間平均就不再只是整條平移,斜率跟著被抹開。把「雜散電容比」設成 0 可以退回「振幅固定」的舊行為,那時 T_e 確實不會被高估。",
              "**把「探針鍍膜」拉起來**:n_e 被低估到只剩幾分之一,但**曲線形狀看起來還很正常** —— 這是它危險的地方。在沉積或聚合性製程裡探針幾秒就會鍍上一層,所以要靠離子轟擊清洗或加熱。",
              "把「雜訊」拉起來看真實資料的樣子。二次微分對雜訊**極度敏感** —— 切到 EEDF 分頁就會看到。這是為什麼實務上 EEDF 量測需要非常乾淨的訊號與大量平均。",
              "換氣體看 n_e 還準不準:Ar / O₂ / CF₄ / Cl₂ 的離子質量差好幾倍,而**離子質量直接進 Bohm 速度**。模型用對了質量,所以四種氣體都算得準 —— 現場用錯氣體參數是 n_e 算錯的常見原因。",
            ])
          );
        },

        reset: function () {
          this.state = { ne: 1e16, te: 3, vrf: 0, stray: 0.35, noise: 0, coating: 0, gas: "ar", view: "iv" };
          this.rebuild();
        },

        draw: function () {
          var api = this;
          if (!api.ctx || !api.curve) return;
          var ctx = api.ctx;
          var p = PA.canvasTheme.palette();
          var w = api.width;
          var h = api.height;
          var view = api.state.view;

          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = p.bg;
          ctx.fillRect(0, 0, w, h);

          var L = 46, R = w - 14, T = 24, B = h - 34;
          var c = api.curve;
          var r = api.res;
          /*
             I-V 與半對數曲線用所選氣體的顏色。換氣體時離子質量變、
             離子飽和電流跟著變 —— 讓曲線同時換色,學員才看得出
             「動的是這支氣體的那條線」。EEDF 分頁維持 vizElectron:
             那條畫的是電子能量分佈,與氣體種類無關,語意不該被蓋掉。
          */
          var gasCol = PA.canvasTheme.gasColor(api.state.gas, p);

          function axes(xlab, ylab) {
            ctx.strokeStyle = p.vizAxis || p.border;
            ctx.beginPath();
            ctx.moveTo(L, T);
            ctx.lineTo(L, B);
            ctx.lineTo(R, B);
            ctx.stroke();
            ctx.save();
            ctx.font = "10px system-ui, sans-serif";
            ctx.fillStyle = p.textSubtle || p.text;
            ctx.textAlign = "right";
            ctx.fillText(xlab, R, B + 16);
            ctx.textAlign = "left";
            ctx.fillText(ylab, 4, T - 8);
            ctx.restore();
          }

          if (view === "iv") {
            var iMin = Math.min.apply(null, c.map(function (x) { return x.i; }));
            var iMax = Math.max.apply(null, c.map(function (x) { return x.i; }));
            var span = iMax - iMin || 1;
            var vMin = c[0].v, vMax = c[c.length - 1].v;
            axes("探針偏壓 V", "電流 I");
            // 零線
            var zeroY = B - ((0 - iMin) / span) * (B - T);
            ctx.save();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = p.textSubtle || p.text;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(L, zeroY);
            ctx.lineTo(R, zeroY);
            ctx.stroke();
            ctx.restore();
            ctx.strokeStyle = gasCol;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (var i = 0; i < c.length; i++) {
              var x = L + ((c[i].v - vMin) / (vMax - vMin)) * (R - L);
              var y = B - ((c[i].i - iMin) / span) * (B - T);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.lineWidth = 1;
            // 標出 V_f 與 V_p
            // 標註色刻意避開氣體配色(vizIonPos 現在是 Ar 的曲線色,會撞)
            [[r.vf, "V_f", p.warning], [r.vp, "V_p", p.success]].forEach(function (m) {
              if (!isFinite(m[0])) return;
              var mx = L + ((m[0] - vMin) / (vMax - vMin)) * (R - L);
              ctx.save();
              ctx.strokeStyle = m[2];
              ctx.setLineDash([4, 3]);
              ctx.beginPath();
              ctx.moveTo(mx, T);
              ctx.lineTo(mx, B);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.font = "10px system-ui, sans-serif";
              ctx.fillStyle = m[2];
              ctx.textAlign = "center";
              ctx.fillText(m[1], mx, T - 4);
              ctx.restore();
            });
          } else if (view === "log") {
            var isat = M.measureIsat(c);
            var pts = [];
            for (var k = 0; k < c.length; k++) {
              var ie = c[k].i + isat;
              if (ie > 0) pts.push({ v: c[k].v, y: Math.log(ie) });
            }
            if (!pts.length) return;
            var yMin = Math.min.apply(null, pts.map(function (x) { return x.y; }));
            var yMax = Math.max.apply(null, pts.map(function (x) { return x.y; }));
            var v0 = pts[0].v, v1 = pts[pts.length - 1].v;
            axes("探針偏壓 V", "ln(I_e)");
            ctx.strokeStyle = gasCol;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (var m2 = 0; m2 < pts.length; m2++) {
              var x2 = L + ((pts[m2].v - v0) / (v1 - v0)) * (R - L);
              var y2 = B - ((pts[m2].y - yMin) / (yMax - yMin || 1)) * (B - T);
              if (m2 === 0) ctx.moveTo(x2, y2);
              else ctx.lineTo(x2, y2);
            }
            ctx.stroke();
            ctx.lineWidth = 1;
            ctx.save();
            ctx.font = "11px system-ui, sans-serif";
            ctx.fillStyle = p.text;
            ctx.fillText("直線段的斜率倒數 = T_e = " + r.te.toFixed(2) + " eV", L + 8, T + 14);
            ctx.restore();
          } else {
            var f = M.eedf(c, r.vp, M.measureIsat(c));
            axes("電子能量 E (eV)", "f(E)");
            if (!f.length) return;
            var eMax = Math.max.apply(null, f.map(function (x) { return x.E; }));
            ctx.strokeStyle = p.vizElectron;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (var q = 0; q < f.length; q++) {
              var x3 = L + (f[q].E / eMax) * (R - L);
              var y3 = B - f[q].f * (B - T);
              if (q === 0) ctx.moveTo(x3, y3);
              else ctx.lineTo(x3, y3);
            }
            ctx.stroke();
            ctx.lineWidth = 1;
            ctx.save();
            ctx.font = "11px system-ui, sans-serif";
            ctx.fillStyle = p.text;
            ctx.fillText("Druyvesteyn:f(E) ∝ d²I_e/dV² —— 不假設 Maxwellian", L + 8, T + 14);
            ctx.restore();
          }
        },
      });
    },
    ["js/lab/probe-model.js"]
  );
})((window.PA = window.PA || {}));
