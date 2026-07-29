/* ==========================================================================
   A08 — 腔體流場與滯留時間計算器
   章節 2.1 · 規格 docs/05-animation-spec.md

   目標:建立 τ 的量級感,理解流量與壓力是兩個獨立旋鈕。

   驗收條件(docs/05):2.1.3 的範例(30 L、20 mTorr、200 sccm)算出 ≈ 0.24 s

   兩個設計決定:

   1. 粒子壽命抽自「指數分佈」,不是固定值。
      理想混合腔體(CSTR)的停留時間本來就是指數分佈 ——
      τ 是平均值,不是每個分子都待滿 τ。這是本元件最想傳達的一件事,
      畫面上的顏色分佈直接把它畫出來。

   2. 動畫時間軸經過縮放。
      τ 的範圍橫跨 0.0004 s 到 790 s,照實播不是眨眼就是不動。
      因此模擬在「τ 為 1」的正規化時間裡跑,再乘回真實 τ 顯示。
      實測平均值會收斂到 1.0 —— 這同時也是模型的自我驗證。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define("A08", function () {
    var C = PA.controls;
    var M = PA.model;

    // 腔體幾何:用於 Knudsen 數的特徵尺寸(電極間距)
    var GAP_CM = 3;

    // 一個「τ」在畫面上播多久(秒)。夾在這個範圍內動畫才看得下去。
    function tauDisplay(tau) {
      return Math.min(Math.max(tau, 0.8), 3.0);
    }

    return PA.lab.create({
      setup: function () {
        var api = this;

        api.state = { Q: 200, P: 20, V: 30 };
        api.pumped = 0; // 已被抽走的粒子數(事件數)
        api.riskTime = 0; // 所有分子的累計「曝險時間」(正規化,單位 τ)
        api.simTime = 0; // 已模擬的正規化時間(單位:τ)

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
          "腔體剖面:氣體從上方噴淋頭進入、經晶圓上方流向右下的泵口。" +
            "示蹤粒子的顏色代表已停留時間,新進為藍、久留為紅。"
        );
        canvasBox.appendChild(canvas);
        api.canvas = canvas;

        api.sys = PA.particles.create({ max: 500, width: 100, height: 100 });

        // --- 停留時間分佈直方圖 ---
        api.plot = PA.plot.create({
          width: 520,
          height: 230,
          margin: { t: 16, r: 16, b: 44, l: 54 },
          // 明確給刻度 —— tickCount: n 會產生 n+1 格,整數格式會印出重複的字
          x: { min: 0, max: 4, ticks: [0, 1, 2, 3, 4], label: "停留時間 ÷ τ", format: function (v) { return v.toFixed(0); } },
          y: { min: 0, max: 1, tickCount: 4, label: "相對次數", format: function (v) { return v.toFixed(1); } },
        });
        sideBox.appendChild(api.plot.svg);
        api.hist = new Array(40).fill(0); // 0…4 τ,每格 0.1

        api.tau = function () {
          return M.residenceTime(api.state.P, api.state.V, api.state.Q);
        };

        /** 抽一個正規化停留時間:Exp(1) */
        api.drawLife = function () {
          return -Math.log(1 - Math.random());
        };

        /**
         * 射入一顆分子。
         * seeded = true 時代表「重設瞬間就已經在腔內」的那批 ——
         * 它們的年齡直接抽自穩態分佈,腔體因此一開始就在穩態,不必等暖機。
         * 但這批不列入統計:隨機時刻抓到的分子,其總停留時間是「長度偏差」
         * 抽樣(inspection paradox),平均會是 2τ 而不是 τ。
         * 只統計「在觀測期間出生又死亡」的分子才是乾淨的估計。
         */
        api.emit = function (seeded) {
          var sys = api.sys;
          if (sys.count > sys.max - 3) return;
          sys.spawn(function (p) {
            p.kind = "neutral";
            p.r = 2.6;
            var age = seeded ? api.drawLife() : 0;
            if (seeded) {
              // 已經在腔內的分子,位置也該是散開的
              p.x = api.width * (0.12 + Math.random() * 0.78);
              p.y = api.height * (0.12 + Math.random() * 0.76);
            } else {
              // 新進的從噴淋頭孔位進來
              var holes = 9;
              var i = Math.floor(Math.random() * holes);
              p.x = api.width * (0.12 + (0.66 * (i + 0.5)) / holes) + (Math.random() - 0.5) * 6;
              p.y = api.height * 0.12;
            }
            p.vx = 0;
            p.vy = 0;
            // 指數分佈無記憶:剩餘壽命與已過的年齡無關
            p.data = { age: age, life: age + api.drawLife(), seeded: !!seeded };
          });
        };

        api.resetStats = function () {
          api.sys.clear();
          api.pumped = 0;
          api.riskTime = 0;
          api.simTime = 0;
          api.hist.fill(0);
          // 用穩態分佈填滿腔體,省掉暖機期
          if (api.width) {
            for (var i = 0; i < 180; i++) api.emit(true);
          }
          api.refresh();
        };

        api.refresh = function () {
          if (!api.plot) return;
          var pl = api.plot;
          var pal = PA.canvasTheme.palette();
          var s = api.state;
          var tau = api.tau();
          pl.clear();

          // 理論曲線:Exp(1) 的機率密度,正規化成峰值 1
          var theory = pl.sample(function (t) {
            return Math.exp(-t);
          }, 120);
          pl.line(theory, { stroke: pal.textSubtle, width: 2, dash: "4 3" });
          pl.label(1.4, Math.exp(-1.4), "理論 e^(−t/τ)", {
            fill: pal.textSubtle, dx: 6, dy: -6, size: 11, weight: 500,
          });

          // 實測直方圖
          var max = Math.max.apply(null, api.hist) || 1;
          if (api.pumped > 20) {
            var pts = api.hist.map(function (v, i) {
              return [(i + 0.5) * 0.1, v / max];
            });
            pl.area(pts, { fill: pal.primary, opacity: 0.18 });
            pl.line(pts, { stroke: pal.primary, width: 2.2 });
          }

          // τ 本身的位置 —— 平均值落在 1,但最多的其實是「剛進來就走」
          pl.vline(1, { stroke: pal.warning, dash: "3 3" });
          pl.label(1, 0.94, "平均 = τ", { fill: pal.warning, dx: 6, size: 11 });

          var S = M.pumpingSpeed(s.P, s.Q);
          var Kn = M.knudsen(s.P, GAP_CM, "Ar");
          // 節流閥開度:有效抽速佔泵浦滿速的比例
          var PUMP_MAX = 1500; // L/s,典型製程 TMP
          var valve = Math.min(100, (S / PUMP_MAX) * 100);

          if (api.readoutNode) {
            api.readoutNode.update({
              tau: tau,
              speed: S,
              valve: valve > 99.5 ? Infinity : valve,
              regime: M.flowRegime(Kn) + "(Kn = " + (Kn < 0.01 ? Kn.toExponential(1) : Kn.toFixed(2)) + ")",
              // τ̂ = 總曝險時間 ÷ 事件數(設限不影響其無偏性)。
              // 只剩統計雜訊,約 1/√N,所以只需等事件數夠多。
              measured: api.pumped > 400 ? (api.riskTime / api.pumped) * tau : NaN,
              progress: Math.min(100, (api.pumped / 400) * 100),
              n: api.pumped,
            });
          }
        };

        var detach = PA.canvasTheme.autoSize(canvas, canvasBox, 3 / 2, function (ctx, w, h) {
          api.ctx = ctx;
          api.width = w;
          api.height = h;
          api.sys.resize(w, h);
          if (!api.seeded) { api.seeded = true; api.resetStats(); }
        });
        api.onDestroy(detach);

        var readout = C.readout([
          {
            key: "tau",
            label: "滯留時間 τ",
            format: function (v) {
              return v >= 1 ? v.toFixed(2) + " s" : (v * 1000).toFixed(0) + " ms";
            },
          },
          { key: "speed", label: "有效抽速 S = Q/P", digits: 0, unit: " L/s" },
          {
            key: "valve",
            label: "節流閥開度",
            format: function (v) {
              return isFinite(v) ? Math.round(v) + " %" : "全開(壓力壓不住)";
            },
          },
          { key: "regime", label: "流體區間", format: function (v) { return v; } },
          {
            key: "measured",
            label: "模擬實測 τ",
            format: function (v) {
              if (!isFinite(v)) return "取樣中…";
              return v >= 1 ? v.toFixed(2) + " s" : (v * 1000).toFixed(0) + " ms";
            },
          },
          {
            key: "progress",
            label: "取樣進度",
            format: function (v) {
              return v >= 100 ? "樣本足夠(±5 %)" : Math.round(v) + " %";
            },
          },
          { key: "n", label: "已抽走分子數", digits: 0 },
        ]);
        api.readoutNode = readout;

        var qCtl = C.slider({
          label: "總流量 Q",
          min: 10, max: 1000, value: 200, log: true, unit: "sccm", digits: 0,
          onChange: function (v) { api.state.Q = v; api.resetStats(); },
        });

        var pCtl = C.slider({
          label: "目標壓力 P",
          min: 1, max: 1000, value: 20, log: true, unit: "mTorr", digits: 0,
          onChange: function (v) { api.state.P = v; api.resetStats(); },
        });

        var vCtl = C.slider({
          label: "腔體體積 V",
          min: 5, max: 100, value: 30, step: 1, unit: "L", digits: 0,
          onChange: function (v) { api.state.V = v; api.resetStats(); },
        });

        var presetCtl = C.segmented({
          label: "情境",
          options: [
            { value: "etch", label: "蝕刻" },
            { value: "double", label: "流量加倍" },
            { value: "pecvd", label: "PECVD" },
          ],
          onChange: function (v) {
            var s = api.state;
            if (v === "etch") { s.Q = 200; s.P = 20; s.V = 30; }
            else if (v === "double") { s.Q = 400; s.P = 20; s.V = 30; }
            else { s.Q = 1000; s.P = 1000; s.V = 30; }
            qCtl.setValue(s.Q, true);
            pCtl.setValue(s.P, true);
            vCtl.setValue(s.V, true);
            api.resetStats();
          },
        });

        var transport = C.transport({
          playing: true,
          onPlay: function () { api.start(); },
          onPause: function () { api.stop(); },
          onReset: function () {
            api.state = { Q: 200, P: 20, V: 30 };
            qCtl.setValue(200, true);
            pCtl.setValue(20, true);
            vCtl.setValue(30, true);
            api.resetStats();
          },
        });

        api.el.appendChild(C.panel([qCtl, pCtl, vCtl, presetCtl, transport]));
        api.el.appendChild(readout);

        var caveat = document.createElement("div");
        caveat.className = "pa-lab__caveat";
        caveat.textContent =
          "動畫的時間軸經過縮放(τ 橫跨六個數量級,照實播不是眨眼就是不動)。" +
          "粒子顏色代表已停留時間佔 τ 的比例:藍=剛進來,紅=待了 2τ 以上。";
        api.el.appendChild(caveat);

        api.el.appendChild(
          C.observations([
            "按「蝕刻」(30 L、20 mTorr、200 sccm)—— τ ≈ 0.24 s,和 2.1.3 的算例一致。",
            "按「流量加倍」—— 壓力沒變、腔內粒子數沒變,但 τ 砍半。你改變的是「換氣速度」,不是「濃度」。這就是流量與壓力兩個獨立旋鈕的意思。",
            "看直方圖:最多的其實是「剛進來就被抽走」的分子,τ 只是平均值。理想混合腔體的停留時間是指數分佈,不是每個分子都待滿 τ。",
            "把壓力拉到 1 Torr(PECVD 區)—— τ 跳到幾秒,節流閥幾乎關死。產物在腔內待這麼久,會再解離、再沉積,這是高壓製程微粒的來源之一。",
            "把壓力降到 1 mTorr —— 流體區間從過渡流變成分子流,而且節流閥全開也壓不住,代表這個流量下泵抽不到那麼低。現場看到「閥全開但壓力偏高」就是這個狀況。",
            "「模擬實測 τ」會收斂到公式值 —— 這是模型的自我驗證。它用的是「總曝險時間 ÷ 事件數」而不是「已抽走那批的平均值」:後者會因為「待得久的還沒被抽走」而系統性偏低。任何有觀測期限的壽命統計都有這個陷阱,零件壽命分析也一樣。",
          ])
        );

        api.resetStats();
      },

      reset: function () {
        this.resetStats();
      },

      tick: function (dt) {
        var api = this;
        var sys = api.sys;
        var w = api.width || 400;
        var h = api.height || 300;
        var tau = api.tau();

        // 正規化時間步:一個 τ 播 tauDisplay(τ) 秒
        var dtn = dt / tauDisplay(tau);
        api.simTime += dtn;

        // 穩態粒子數固定 —— 這正是「流量加倍不改變腔內粒子數」的體現
        var target = 180;
        var need = target - sys.count;
        for (var i = 0; i < Math.min(need, 12); i++) api.emit();

        var pumpX = w * 0.9;
        var pumpY = h * 0.88;

        sys.each(function (p) {
          p.data.age += dtn;
          // 曝險時間:每顆分子每存活一段時間就累計一段,含尚未被抽走的。
          // 這是估計 τ 的關鍵 —— 見下方 kill 處的說明。
          api.riskTime += dtn;

          // 流場:整體往泵口帶,加上亂流般的隨機游走(混合)
          var dx = pumpX - p.x;
          var dy = pumpY - p.y;
          var d = Math.hypot(dx, dy) || 1;
          // 模型的前提是「理想混合腔體」,所以亂流混合要遠強於往泵口的漂移 ——
          // 漂移太強會讓粒子全部堆在泵口,那就不是 CSTR 了。
          var drift = (h * 0.12) / tauDisplay(tau);
          var mix = h * 1.1;
          p.x += ((dx / d) * drift + (Math.random() - 0.5) * mix) * dt;
          p.y += ((dy / d) * drift + (Math.random() - 0.5) * mix) * dt;

          // 撞牆反彈,維持在腔內
          if (p.x < w * 0.1) p.x = w * 0.1;
          else if (p.x > w * 0.92) p.x = w * 0.92;
          if (p.y < h * 0.1) p.y = h * 0.1;
          else if (p.y > h * 0.9) p.y = h * 0.9;

          // 壽命到 → 被抽走。壽命抽自 Exp(1),所以實測平均會收斂到 1。
          /**
           * 被抽走。
           *
           * τ 的估計「不能」用「已抽走那批的平均停留時間」——
           * 觀測窗有限,待得久的還沒死就被漏掉了(右設限),
           * 那樣算出來會系統性偏低,而且偏差只以 1/T 衰減,很慢。
           *
           * 正確做法是指數分佈的最大概似估計:
           *     τ̂ = 總曝險時間 ÷ 事件數
           * 分母只數「已經發生的」,分母外的存活時間仍計入分子。
           * 這樣才不會把「還沒死的那些」丟掉。
           */
          if (p.data.age >= p.data.life) {
            api.pumped++;
            // 直方圖只收完整觀測到的那批,形狀才不會被長度偏差扭曲
            if (!p.data.seeded) {
              // 超過 4τ 的落在圖外,不要全部堆進最後一格造成假的尖峰
              var bin = Math.floor(p.data.age / 0.1);
              if (bin < api.hist.length) api.hist[bin]++;
            }
            sys.kill(p);
          }
        });

        api._fc = (api._fc || 0) + 1;
        if (api._fc % 20 === 0) api.refresh();
      },

      draw: function () {
        var api = this;
        if (!api.ctx) return;
        var ctx = api.ctx;
        var p = PA.canvasTheme.palette();
        var w = api.width;
        var h = api.height;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = p.bg;
        ctx.fillRect(0, 0, w, h);

        // 腔壁
        ctx.strokeStyle = p.borderStrong;
        ctx.lineWidth = 2;
        ctx.strokeRect(w * 0.1, h * 0.1, w * 0.82, h * 0.8);

        // 噴淋頭
        ctx.fillStyle = p.borderStrong;
        ctx.fillRect(w * 0.1, h * 0.1 - 10, w * 0.7, 10);
        ctx.fillStyle = p.bg;
        for (var i = 0; i < 9; i++) {
          var hx = w * (0.12 + (0.66 * (i + 0.5)) / 9);
          ctx.fillRect(hx - 1.5, h * 0.1 - 8, 3, 8);
        }

        // 晶圓
        ctx.fillStyle = p.vizSubstrate;
        ctx.fillRect(w * 0.24, h * 0.66, w * 0.44, 8);

        ctx.fillStyle = p.textSubtle;
        ctx.font = "11px system-ui, sans-serif";
        ctx.textBaseline = "top";
        ctx.fillText("噴淋頭(氣體進)", w * 0.11, h * 0.1 - 24);
        ctx.textBaseline = "middle";
        ctx.fillText("晶圓", w * 0.25, h * 0.66 - 9);

        // 泵口與節流閥
        var S = M.pumpingSpeed(api.state.P, api.state.Q);
        var valve = Math.min(1, S / 1500);
        var pw = w * 0.16;
        var ph = h * 0.07;
        var px = w * 0.92 - pw;
        var py = h * 0.9; // 貼著腔體下緣,就是出口的位置
        ctx.fillStyle = p.surfaceSunken;
        ctx.fillRect(px, py, pw, ph);
        // 閥片:開度越小,擋得越多
        ctx.fillStyle = p.warning;
        ctx.fillRect(px, py, pw * (1 - valve), ph);
        ctx.strokeStyle = p.borderStrong;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px, py, pw, ph);
        ctx.fillStyle = p.textSubtle;
        ctx.textBaseline = "middle";
        ctx.textAlign = "right";
        ctx.fillText("節流閥 " + Math.round(valve * 100) + "% →", px - 6, py + ph / 2);
        ctx.textAlign = "left";

        // 粒子 —— 顏色編碼停留時間
        api.sys.each(function (pt) {
          var t = Math.min(1, pt.data.age / 2);
          // 藍(新)→ 紅(久)。用調色盤的兩個 viz 色線性內插。
          var c = t < 0.5 ? p.vizElectron : p.vizIonPos;
          ctx.globalAlpha = 0.45 + 0.55 * t;
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.r || 2.6, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;

        // 圖例
        ctx.save();
        ctx.font = "11px system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillStyle = p.vizElectron;
        ctx.beginPath();
        ctx.arc(w * 0.13, h * 0.15, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.textSubtle;
        ctx.fillText("剛進來", w * 0.15, h * 0.15);
        ctx.fillStyle = p.vizIonPos;
        ctx.beginPath();
        ctx.arc(w * 0.13, h * 0.21, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.textSubtle;
        ctx.fillText("待了 > τ", w * 0.15, h * 0.21);
        ctx.restore();
      },
    });
  });
})((window.PA = window.PA || {}));
