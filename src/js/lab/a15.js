/* ==========================================================================
   A15 — 阻抗匹配互動(Smith 圖)
   章節 2.5 · 規格 docs/05-animation-spec.md

   目標:理解匹配網路在做什麼,以及為什麼匹配電容位置是診斷指標。

   驗收條件(docs/05):
     · 匹配成功時反射功率 < 1 %
     · 改變電漿條件後需要不同的電容位置

   Smith 圖上的每一點都是實際算出來的反射係數 Γ = (Z−50)/(Z+50),
   軌跡則是 L 型網路兩個元件依序做的阻抗變換。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define("A15", function () {
    var C = PA.controls;

    var Z0 = 50;
    var F = 13.56e6;
    var W = 2 * Math.PI * F;
    // 匹配盒裡的固定串聯電感(RF strap / 線圈)。
    // 沒有它就匹配不了 —— 電漿是強電容性的負載,兩顆電容只會讓它更負,
    // 必須先有一個感性元件把鞘層電容抵銷掉。這一點是實作時才想清楚的。
    var L_H = 3.5e-6;

    // --- 複數小工具(只用得到這幾個) ---
    function cx(re, im) { return { re: re, im: im }; }
    function add(a, b) { return cx(a.re + b.re, a.im + b.im); }
    function mul(a, b) { return cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
    function div(a, b) {
      var d = b.re * b.re + b.im * b.im;
      return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
    }
    function abs(a) { return Math.hypot(a.re, a.im); }

    /**
     * 電漿阻抗 —— 隨壓力與功率變化。
     * 典型 CCP:電阻 1–20 Ω,虛部為電容性(鞘層就是個電容)。
     * 功率越高 → 密度越高 → 電阻越低、鞘層越薄 → 電容越大(容抗越小)。
     */
    function plasmaZ(P, p_mTorr) {
      var R = 2 + 40 / Math.pow(P / 100, 0.75) + p_mTorr * 0.06;
      var Csheath = 40e-12 * Math.pow(P / 100, 0.5); // F
      var X = -1 / (W * Csheath);
      return cx(R, X);
    }

    return PA.lab.create({
      setup: function () {
        var api = this;
        api.state = { P: 500, p: 20, Ctune: 300, Cload: 800, auto: false };
        api.animPath = null;

        var wrap = document.createElement("div");
        wrap.className = "pa-lab__split";
        var smithBox = document.createElement("div");
        var sideBox = document.createElement("div");
        wrap.appendChild(smithBox);
        wrap.appendChild(sideBox);
        api.stage.appendChild(wrap);

        var canvas = document.createElement("canvas");
        canvas.setAttribute("role", "img");
        canvas.setAttribute(
          "aria-label",
          "Smith 圖:圓心是 50 Ω 的完美匹配點。電漿阻抗經過 C_tune 與 C_load 兩次變換," +
            "軌跡越接近圓心,反射功率越低。"
        );
        smithBox.appendChild(canvas);
        api.canvas = canvas;

        // 功率計:前向 / 反射 / 進入電漿
        api.plot = PA.plot.create({
          width: 500,
          height: 240,
          margin: { t: 18, r: 20, b: 46, l: 62 },
          x: { min: 0, max: 1000, tickCount: 5, label: "C_tune (pF)", format: function (v) { return v.toFixed(0); } },
          y: { min: 0, max: 100, tickCount: 5, label: "反射功率 (%)", format: function (v) { return v.toFixed(0); } },
        });
        sideBox.appendChild(api.plot.svg);

        /**
         * 匹配網路,從電漿往發電機看:
         *   電漿 →(串聯 L + 串聯 C_load)→(並聯 C_tune)→ 50 Ω
         * 回傳每一步的阻抗,Smith 圖上的軌跡就是這三點連起來。
         */
        api.transform = function (Ctune_pF, Cload_pF) {
          var Zp = plasmaZ(api.state.P, api.state.p);
          // 串聯 L 與 C_load:先把電漿的電容性抵銷掉,再微調到需要的感抗
          var Xadd = W * L_H - 1 / (W * Cload_pF * 1e-12);
          var Z1 = add(Zp, cx(0, Xadd));
          // 並聯 C_tune:把電阻拉到 50 Ω
          var Y2 = add(div(cx(1, 0), Z1), cx(0, W * Ctune_pF * 1e-12));
          var Z2 = div(cx(1, 0), Y2);
          return [Zp, Z1, Z2];
        };

        api.gamma = function (Z) {
          return abs(div(add(Z, cx(-Z0, 0)), add(Z, cx(Z0, 0))));
        };

        api.reflectPct = function (Ctune, Cload) {
          var g = api.gamma(api.transform(Ctune, Cload)[2]);
          return Math.min(100, g * g * 100);
        };

        /**
         * 自動匹配 —— 解析解,不用網格搜尋。
         * 條件:並聯前的串聯支路必須滿足 R/(R²+X_s²) = 1/50
         *   → X_s = √(50R − R²)
         * 再由剩下的虛部反推 C_tune。兩顆電容因此各有唯一解。
         */
        api.autoMatch = function () {
          var Zp = plasmaZ(api.state.P, api.state.p);
          if (Zp.re >= Z0) return null; // 電阻已高於 50 Ω,這個拓樸調不到
          var Xs = Math.sqrt(Z0 * Zp.re - Zp.re * Zp.re);
          var Cl = (1 / (W * (Zp.im + W * L_H - Xs))) * 1e12; // pF
          var d = Zp.re * Zp.re + Xs * Xs;
          var Ct = ((Xs / d) / W) * 1e12; // pF
          if (!(Cl > 20 && Cl < 2000) || !(Ct > 10 && Ct < 1500)) return null;
          return { t: Ct, l: Cl, r: api.reflectPct(Ct, Cl) };
        };

        api.refresh = function () {
          if (!api.plot) return;
          var pl = api.plot;
          var pal = PA.canvasTheme.palette();
          var s = api.state;
          pl.clear();

          // 反射功率 vs C_tune(固定目前的 C_load)—— 匹配點是那個尖谷
          var curve = pl.sample(function (t) {
            return api.reflectPct(Math.max(t, 10), s.Cload);
          }, 200);
          pl.line(curve, { stroke: pal.primary, width: 2.4 });
          pl.hline(1, { stroke: pal.success, dash: "4 3" });
          pl.label(60, 1, "1 % 門檻", { fill: pal.success, dx: 4, dy: -6, size: 11 });

          var refl = api.reflectPct(s.Ctune, s.Cload);
          pl.vline(s.Ctune, { stroke: pal.warning, dash: "3 3", overlay: true });
          pl.dot(s.Ctune, Math.min(refl, 100), {
            fill: refl < 1 ? pal.success : pal.danger, r: 5, overlay: true,
          });

          var Zs = api.transform(s.Ctune, s.Cload);
          var Zp = Zs[0];

          if (api.readoutNode) {
            api.readoutNode.update({
              zp: Zp.re.toFixed(1) + " − j" + Math.abs(Zp.im).toFixed(0) + " Ω",
              refl: refl,
              into: (100 - refl) * (s.P / 100),
              vswr: (function () {
                var g = Math.sqrt(refl / 100);
                return g >= 1 ? Infinity : (1 + g) / (1 - g);
              })(),
              verdict: api.matchFail
                ? "調不到 —— 超出匹配盒可調範圍"
                : refl < 1
                ? "匹配 ✅"
                : refl < 10
                ? "接近"
                : "未匹配 ❌",
            });
          }
        };

        var detach = PA.canvasTheme.autoSize(canvas, smithBox, 1 / 1, function (ctx, w, h) {
          api.ctx = ctx;
          api.width = w;
          api.height = h;
        });
        api.onDestroy(detach);

        var readout = C.readout([
          { key: "zp", label: "電漿阻抗 Z_p", format: function (v) { return v; } },
          { key: "refl", label: "反射功率", digits: 2, unit: " %" },
          { key: "into", label: "實際進入電漿", digits: 0, unit: " W" },
          {
            key: "vswr",
            label: "VSWR",
            format: function (v) { return isFinite(v) ? v.toFixed(2) : "∞"; },
          },
          { key: "verdict", label: "狀態", format: function (v) { return v; } },
        ]);
        api.readoutNode = readout;

        var tuneCtl = C.slider({
          label: "C_tune(並聯)",
          min: 10, max: 1000, value: 300, step: 5, unit: "pF", digits: 0,
          onChange: function (v) { api.state.Ctune = v; api.refresh(); },
        });
        var loadCtl = C.slider({
          label: "C_load(串聯)",
          min: 20, max: 2000, value: 800, step: 10, unit: "pF", digits: 0,
          onChange: function (v) { api.state.Cload = v; api.refresh(); },
        });
        api.tuneCtl = tuneCtl;
        api.loadCtl = loadCtl;

        var powCtl = C.slider({
          label: "RF 功率",
          min: 100, max: 2000, value: 500, step: 50, unit: "W", digits: 0,
          onChange: function (v) { api.state.P = v; api.refresh(); },
        });
        var presCtl = C.slider({
          label: "壓力",
          min: 1, max: 200, value: 20, log: true, unit: "mTorr", digits: 0,
          onChange: function (v) { api.state.p = v; api.refresh(); },
        });

        var autoCtl = C.segmented({
          label: "自動匹配",
          options: [{ value: "go", label: "▶ 執行自動匹配" }],
          value: "",
          onChange: function () {
            var best = api.autoMatch();
            if (!best) {
              // 真實的匹配盒也有調不到的時候 —— 這是個值得認得的故障狀態
              api.matchFail = true;
              api.refresh();
              return;
            }
            api.matchFail = false;
            api.state.Ctune = Math.round(best.t);
            api.state.Cload = Math.round(best.l);
            tuneCtl.setValue(api.state.Ctune, true);
            loadCtl.setValue(api.state.Cload, true);
            api.refresh();
          },
        });

        api.el.appendChild(C.panel([tuneCtl, loadCtl, powCtl, presCtl, autoCtl]));
        api.el.appendChild(readout);
        api.el.appendChild(
          C.observations([
            "先按「執行自動匹配」—— 反射功率掉到 1 % 以下,Smith 圖上的終點落進中心的小圈。記下這時的兩個電容位置。",
            "現在把壓力從 20 改到 100 mTorr —— 電漿阻抗跑掉了,反射功率立刻飆高。這就是為什麼機台需要自動匹配盒,而不是固定電容。",
            "再按一次自動匹配 —— 它收斂到「不同的」電容位置。同一支 recipe 的匹配位置應該每次都一樣;它漂了,代表電漿或腔體狀態變了。",
            "把 C_tune 手動掃過去看那條曲線:匹配點是一個很窄的尖谷。差幾十 pF 反射功率就從 1 % 跳到幾十 %,這是匹配為什麼難的原因。",
            "注意「實際進入電漿」這一欄。反射 30 % 時,你設 500 W 其實只有 350 W 進去 —— 而機台面板顯示的常常是「前向功率」。",
            "匹配電容位置是腔體狀態的指紋。把它納入 FDC 趨勢(L4 4.2),比等 wafer 出事再查便宜太多。",
          ])
        );

        api.refresh();
      },

      reset: function () {
        this.state = { P: 500, p: 20, Ctune: 300, Cload: 800, auto: false };
        this.tuneCtl.setValue(300, true);
        this.loadCtl.setValue(800, true);
        this.refresh();
      },

      draw: function () {
        var api = this;
        if (!api.ctx) return;
        var ctx = api.ctx;
        var p = PA.canvasTheme.palette();
        var w = api.width, h = api.height;
        var R = Math.min(w, h) * 0.42;
        var cxp = w / 2, cyp = h / 2;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = p.bg;
        ctx.fillRect(0, 0, w, h);

        // Smith 圖外圈(|Γ| = 1)
        ctx.strokeStyle = p.borderStrong;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(cxp, cyp, R, 0, Math.PI * 2);
        ctx.stroke();

        // |Γ| 等值圈 —— 直接對應反射功率
        ctx.strokeStyle = p.vizGrid;
        ctx.lineWidth = 1;
        [0.25, 0.5, 0.75].forEach(function (g) {
          ctx.beginPath();
          ctx.arc(cxp, cyp, R * g, 0, Math.PI * 2);
          ctx.stroke();
        });
        // 1 % 反射 = |Γ| = 0.1
        ctx.strokeStyle = p.success;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(cxp, cyp, R * 0.1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = p.vizGrid;
        ctx.beginPath();
        ctx.moveTo(cxp - R, cyp);
        ctx.lineTo(cxp + R, cyp);
        ctx.stroke();

        function toXY(Z) {
          var g = div(add(Z, cx(-Z0, 0)), add(Z, cx(Z0, 0)));
          return [cxp + g.re * R, cyp - g.im * R];
        }

        var Zs = api.transform(api.state.Ctune, api.state.Cload);

        // 軌跡:電漿 → 並聯後 → 串聯後
        ctx.strokeStyle = p.primary;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        Zs.forEach(function (Z, i) {
          var pt = toXY(Z);
          if (i === 0) ctx.moveTo(pt[0], pt[1]);
          else ctx.lineTo(pt[0], pt[1]);
        });
        ctx.stroke();

        var labels = ["電漿 Z_p", "串聯 L + C_load 後", "並聯 C_tune 後(終點)"];
        var colors = [p.vizIonPos, p.warning, p.success];
        ctx.font = "11px system-ui, sans-serif";
        ctx.textBaseline = "middle";
        Zs.forEach(function (Z, i) {
          var pt = toXY(Z);
          ctx.fillStyle = colors[i];
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], i === 2 ? 6 : 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = p.textMuted;
          ctx.fillText(labels[i], pt[0] + 9, pt[1]);
        });

        // 圓心 = 50 Ω
        ctx.fillStyle = p.textSubtle;
        ctx.beginPath();
        ctx.arc(cxp, cyp, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText("50 Ω", cxp + 6, cyp - 12);

        ctx.font = "600 12px system-ui, sans-serif";
        ctx.textBaseline = "top";
        ctx.fillStyle = p.text;
        ctx.fillText("Smith 圖 —— 越靠圓心,反射越低", 8, 8);
        ctx.fillStyle = p.success;
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillText("綠色虛線圈 = 1 % 反射", 8, 26);
      },
    });
  });
})((window.PA = window.PA || {}));
