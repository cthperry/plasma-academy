/* ==========================================================================
   A13 — IEDF 雙峰模擬
   章節 2.4 · 規格 docs/05-animation-spec.md  ★ 旗艦元件

   目標:理解 IEDF 的形狀從何而來,以及為什麼只看平均能量會誤判。

   驗收條件(docs/05):峰間距與 ΔE ∝ 1/(f·s·√M) 一致。
   必須能重現三個狀態:低頻寬雙峰 / 高頻窄單峰 / 高壓低能尾巴。

   做法是老實地把離子丟進振盪的鞘層電場裡數值積分,不是把雙峰畫上去。
   雙峰之所以出現,是因為正弦波在極值附近「停留最久」(那裡是駐點),
   所以離子最容易帶著極大或極小值的能量抵達 —— 這件事只有真的積分才看得到。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define("A13", function () {
    var C = PA.controls;
    var M = PA.model;

    var IONS = [
      { key: "Ar", label: "Ar⁺", amu: 39.95 },
      { key: "Cl", label: "Cl⁺", amu: 35.45 },
      { key: "CF3", label: "CF₃⁺", amu: 69.0 },
      { key: "H", label: "H⁺", amu: 1.008 },
    ];

    var FREQS = [
      { v: 0.4e6, label: "0.4 MHz" },
      { v: 2e6, label: "2 MHz" },
      { v: 13.56e6, label: "13.56 MHz" },
      { v: 60e6, label: "60 MHz" },
    ];

    var BINS = 90;
    // RF 漣波佔直流鞘層降的比例 —— 典型 CCP 的量級
    var RIPPLE = 0.35;
    // 橫軸上限,以 V_dc 為單位
    var E_MAX_REL = 1.6;

    return PA.lab.create({
      setup: function () {
        var api = this;
        api.state = { f: 2e6, V: 400, p: 5, ion: "Ar" };
        api.hist = new Array(BINS).fill(0);
        api.n = 0;
        api.eSum = 0;
        api.lowE = 0;

        var wrap = document.createElement("div");
        wrap.className = "pa-lab__split";
        var canvasBox = document.createElement("div");
        var plotBox = document.createElement("div");
        wrap.appendChild(canvasBox);
        wrap.appendChild(plotBox);
        api.stage.appendChild(wrap);

        var canvas = document.createElement("canvas");
        canvas.setAttribute("role", "img");
        canvas.setAttribute(
          "aria-label",
          "鞘層剖面與振盪的 RF 電壓。不同時刻進入鞘層的離子得到不同能量," +
            "低頻時能量分佈成寬雙峰,高頻時收斂成窄單峰。"
        );
        canvasBox.appendChild(canvas);
        api.canvas = canvas;

        api.plot = PA.plot.create({
          width: 560,
          height: 300,
          margin: { t: 18, r: 20, b: 46, l: 56 },
          x: { min: 0, max: 1.6, ticks: [0, 0.4, 0.8, 1.2, 1.6], label: "離子入射能量 ÷ V_dc", format: function (v) { return v.toFixed(1); } },
          y: { min: 0, max: 1.1, tickCount: 4, label: "相對次數", format: function (v) { return v.toFixed(1); } },
        });
        plotBox.appendChild(api.plot.svg);

        api.ionAmu = function () {
          for (var i = 0; i < IONS.length; i++) if (IONS[i].key === api.state.ion) return IONS[i].amu;
          return 39.95;
        };

        /** 鞘層厚度 [mm] —— 用 Child–Langmuir,與 2.4.2 同一支模型 */
        api.sheath_mm = function () {
          return M.sheathThickness(1e10, 3, api.state.V);
        };

        /**
         * 離子穿越時間 [s] —— 用 model 的同一支,課文與元件不會分家
         */
        api.tauIon = function () {
          return M.ionTransitTime(api.sheath_mm(), api.state.V, api.ionAmu());
        };

        /** 理論峰間距 [eV] —— 拿來和直方圖量出來的實測值對照 */
        api.dETheory = function () {
          return M.iedfSpread(api.state.f, api.sheath_mm(), api.state.V, api.ionAmu(), RIPPLE);
        };

        api.tauRf = function () {
          return 1 / api.state.f;
        };

        /**
         * 丟一顆離子進鞘層,回傳它抵達晶圓時的能量(以 V_bias 正規化)。
         *
         * 積分方式:離子在鞘層裡走 3s 的等效路徑,期間鞘層電位為
         *   V(t) = V_bias · (1 + sin(2πft + φ)) / 2   —— 0 到 V_bias 之間振盪
         * 離子獲得的能量是它「一路上感受到的電場」的積分,
         * 因此穿越得快就接近瞬時值(雙峰),慢就接近時間平均(單峰)。
         */
        api.launchIon = function () {
          var s = api.state;
          var tau = api.tauIon();
          var w = 2 * Math.PI * s.f;
          var phi = Math.random() * 2 * Math.PI; // 進入鞘層的時刻是隨機的

          // 沿路徑把 RF 漣波積分掉。穿越得快 → 幾乎保留瞬時值(雙峰);
          // 穿越得慢 → 平均掉(單峰)。這一步就是雙峰的成因,不是畫上去的。
          var N = 32;
          var acc = 0;
          for (var k = 0; k < N; k++) {
            var t = (k + 0.5) / N;
            acc += Math.sin(w * tau * t + phi) / N;
          }

          // 鞘層電位 = 直流降 + RF 漣波
          var E = 1 + RIPPLE * acc; // 以 V_dc 正規化

          // 鞘層內的電荷交換碰撞 —— 壓力越高、鞘層越厚,機率越大。
          // 交換後新生的離子只走完剩下那一段,因此能量被砍到隨機比例。
          var lamCm = M.meanFreePath(s.p, "Ar");
          var sCm = api.sheath_mm() / 10;
          var pColl = 1 - Math.exp(-sCm / Math.max(lamCm, 1e-6));
          if (Math.random() < pColl) E *= Math.random();

          return Math.max(0, Math.min(E_MAX_REL, E));
        };

        api.resetStats = function () {
          api.hist.fill(0);
          api.n = 0;
          api.eSum = 0;
          api.lowE = 0;
          api.refresh();
        };

        api.refresh = function () {
          if (!api.plot) return;
          var pl = api.plot;
          var pal = PA.canvasTheme.palette();
          var s = api.state;
          pl.clear();

          var max = Math.max.apply(null, api.hist) || 1;
          if (api.n > 200) {
            var pts = api.hist.map(function (v, i) {
              return [((i + 0.5) / BINS) * E_MAX_REL, v / max];
            });
            pl.area(pts, { fill: pal.vizIonPos, opacity: 0.22 });
            pl.line(pts, { stroke: pal.vizIonPos, width: 2.2 });
          }

          // 兩個峰的位置 —— 由直方圖找,不是算出來畫上去
          var peaks = api.findPeaks();
          peaks.forEach(function (pk) {
            pl.vline(pk, { stroke: pal.warning, dash: "3 3" });
          });
          var dE = peaks.length === 2 ? peaks[1] - peaks[0] : 0;
          if (dE > 0) {
            pl.label((peaks[0] + peaks[1]) / 2, 1.05, "ΔE = " + (dE * s.V).toFixed(0) + " eV", {
              fill: pal.warning, size: 11, anchor: "middle",
            });
          }

          var mean = api.n ? api.eSum / api.n : 0;
          pl.vline(mean, { stroke: pal.primary, dash: "5 3", overlay: true });
          pl.label(mean, 0.06, "平均", { fill: pal.primary, dx: 5, size: 11, overlay: true });

          if (api.readoutNode) {
            api.readoutNode.update({
              ratio: api.tauIon() / api.tauRf(),
              mean: mean * s.V,
              dE: dE > 0 ? dE * s.V : NaN,
              dEth: api.dETheory(),
              low: api.n ? (api.lowE / api.n) * 100 : 0,
              n: api.n,
            });
          }
        };

        /**
         * 從直方圖找出雙峰。
         * 用「顯著度」而不是絕對高度 —— 高壓時的低能碰撞尾會比雙峰還高,
         * 用絕對門檻會把真正的峰濾掉(這一點是實測踩到才發現的)。
         */
        api.findPeaks = function () {
          if (api.n < 3000) return [];
          var sm = [];
          for (var i = 0; i < BINS; i++) {
            var t = 0, c = 0;
            for (var d = -2; d <= 2; d++) {
              var j0 = i + d;
              if (j0 >= 0 && j0 < BINS) { t += api.hist[j0]; c++; }
            }
            sm.push(t / c);
          }
          var lo = Math.floor(BINS * 0.06); // 略過最低能的碰撞尾
          var mx = 0;
          for (var m = lo; m < BINS; m++) if (sm[m] > mx) mx = sm[m];
          if (!mx) return [];

          var found = [];
          for (var j = lo + 1; j < BINS - 1; j++) {
            if (sm[j] < sm[j - 1] || sm[j] < sm[j + 1]) continue;
            var left = sm[j], right = sm[j];
            for (var a = j; a >= lo; a--) left = Math.min(left, sm[a]);
            for (var b = j; b < BINS; b++) right = Math.min(right, sm[b]);
            if (sm[j] - Math.max(left, right) > mx * 0.05) {
              found.push(((j + 0.5) / BINS) * E_MAX_REL);
            }
          }
          if (found.length < 2) return [];
          var pair = [found[0], found[found.length - 1]];
          return pair[1] - pair[0] >= 0.06 ? pair : [];
        };

        var detach = PA.canvasTheme.autoSize(canvas, canvasBox, 2 / 1, function (ctx, w, h) {
          api.ctx = ctx;
          api.width = w;
          api.height = h;
        });
        api.onDestroy(detach);

        var readout = C.readout([
          { key: "ratio", label: "τ_ion ÷ τ_rf", digits: 2 },
          { key: "mean", label: "平均入射能量", digits: 0, unit: " eV" },
          {
            key: "dE",
            label: "峰間距 ΔE(直方圖量測)",
            format: function (v) {
              return isFinite(v) ? Math.round(v) + " eV" : "單峰(無雙峰)";
            },
          },
          { key: "dEth", label: "ΔE 理論值 2·V_rf·|sinc(ωτ/2)|", digits: 0, unit: " eV" },
          { key: "low", label: "低能離子(< 30 % V)", digits: 0, unit: " %" },
          { key: "n", label: "已累積離子", digits: 0 },
        ]);
        api.readoutNode = readout;

        var fCtl = C.segmented({
          label: "RF 頻率",
          options: FREQS.map(function (f) { return { value: String(f.v), label: f.label }; }),
          value: String(2e6),
          onChange: function (v) { api.state.f = +v; api.resetStats(); },
        });

        var vCtl = C.slider({
          label: "偏壓振幅 V_bias",
          min: 50, max: 1000, value: 400, step: 25, unit: "V", digits: 0,
          onChange: function (v) { api.state.V = v; api.resetStats(); },
        });

        var pCtl = C.slider({
          label: "壓力(控制鞘層內碰撞)",
          min: 1, max: 100, value: 5, log: true, unit: "mTorr", digits: 0,
          onChange: function (v) { api.state.p = v; api.resetStats(); },
        });

        var ionCtl = C.segmented({
          label: "離子",
          options: IONS.map(function (i) { return { value: i.key, label: i.label }; }),
          value: "Ar",
          onChange: function (v) { api.state.ion = v; api.resetStats(); },
        });

        var transport = C.transport({
          playing: true,
          onPlay: function () { api.start(); },
          onPause: function () { api.stop(); },
          onReset: function () {
            api.state = { f: 2e6, V: 400, p: 5, ion: "Ar" };
            fCtl.setValue(String(13.56e6), true);
            vCtl.setValue(400, true);
            pCtl.setValue(10, true);
            ionCtl.setValue("Ar", true);
            api.resetStats();
          },
        });

        api.el.appendChild(C.panel([fCtl, vCtl, pCtl, ionCtl, transport]));
        api.el.appendChild(readout);
        api.el.appendChild(
          C.observations([
            "切到 0.4 MHz —— τ_ion ÷ τ_rf 遠小於 1,離子瞬間穿越鞘層,感受到的是「瞬時電壓」。分佈攤成寬雙峰,峰間距接近整個 RF 振幅。",
            "切到 60 MHz —— 比值遠大於 1,離子穿越期間 RF 已經振盪很多次,只感受得到時間平均。分佈收成一個窄單峰。這就是高頻源用來「乾淨地」控制離子能量的理由。",
            "雙峰為什麼是雙峰?正弦波在極值附近是駐點、停留最久,所以離子最容易帶著極大或極小值的能量抵達 —— 分佈自然在兩端堆積。這個形狀是積分出來的,不是畫上去的。",
            "把壓力從 10 拉到 100 mTorr —— 鞘層裡發生電荷交換,長出一條低能尾巴。那些低能離子沒有足夠能量做離子輔助蝕刻,只會增加等向性成分。",
            "換成 H⁺ —— 質量小,穿越快,雙峰立刻分得更開(ΔE ∝ 1/√M)。這是含氫製程的 IEDF 特別寬的原因。",
            "最重要的一題:找兩組平均能量幾乎一樣、但分佈完全不同的設定。選擇比取決於「多少離子落在 A 材料閾值以上、B 材料閾值以下」—— 只看平均能量會誤判。",
          ])
        );

        api.resetStats();
      },

      reset: function () {
        this.resetStats();
      },

      tick: function () {
        var api = this;
        // 每幀丟一批離子進去,直方圖持續累積
        for (var i = 0; i < 250; i++) {
          var E = api.launchIon();
          var bin = Math.min(BINS - 1, Math.floor((E / E_MAX_REL) * BINS));
          api.hist[bin]++;
          api.n++;
          api.eSum += E;
          if (E < 0.3) api.lowE++;
        }
        api._fc = (api._fc || 0) + 1;
        if (api._fc % 15 === 0) api.refresh();
      },

      draw: function () {
        var api = this;
        if (!api.ctx) return;
        var ctx = api.ctx;
        var p = PA.canvasTheme.palette();
        var w = api.width;
        var h = api.height;
        var s = api.state;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = p.bg;
        ctx.fillRect(0, 0, w, h);

        // 上半:RF 電壓波形,標出離子穿越時間的長度
        var midY = h * 0.44;
        var amp = h * 0.28;
        ctx.strokeStyle = p.primary;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (var x = 0; x <= w; x++) {
          var ph = (x / w) * Math.PI * 4;
          var y = midY - Math.sin(ph) * amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.strokeStyle = p.textSubtle;
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(w, midY);
        ctx.stroke();
        ctx.setLineDash([]);

        // 離子穿越時間相對於 RF 週期的長度(畫面上一個週期 = w/2)
        var ratio = api.tauIon() / api.tauRf();
        var barW = Math.min(w * 0.9, (w / 2) * ratio);
        ctx.fillStyle = p.warning;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(w * 0.05, midY - amp - 22, Math.max(barW, 3), 12);
        ctx.globalAlpha = 1;
        ctx.fillStyle = p.warning;
        ctx.font = "11px system-ui, sans-serif";
        ctx.textBaseline = "bottom";
        ctx.fillText(
          "離子穿越時間 = " + ratio.toFixed(2) + " 個 RF 週期",
          w * 0.05,
          midY - amp - 26
        );

        ctx.fillStyle = p.textSubtle;
        ctx.textBaseline = "top";
        ctx.fillText("RF 鞘層電壓(一個畫面 = 2 個週期)", w * 0.05, midY + amp + 6);

        // 下方標註三個狀態的判準
        ctx.fillStyle = ratio < 0.5 ? p.danger : ratio > 2 ? p.success : p.textMuted;
        ctx.font = "600 13px system-ui, sans-serif";
        ctx.fillText(
          ratio < 0.5
            ? "τ_ion ≪ τ_rf → 離子看到瞬時電壓 → 寬雙峰"
            : ratio > 2
            ? "τ_ion ≫ τ_rf → 離子只看到平均場 → 窄單峰"
            : "τ_ion ≈ τ_rf → 部分平均 → 中等雙峰",
          w * 0.05,
          midY + amp + 26
        );
      },
    });
  });
})((window.PA = window.PA || {}));
