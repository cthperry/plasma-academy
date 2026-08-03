/* ==========================================================================
   A28 — OES 終點訊號 / 干涉終點 ★
   章節 4.2 · 規格 docs/05-animation-spec.md

   docs/05 的驗收條件只有兩條,而它們是一體兩面:
     · 開口率 < 0.1 % 時,OES 終點顯著不可靠
     · 干涉終點**不受開口率影響**

   為什麼:OES 看的是**產物**,產物量 ∝ 正在被蝕刻的面積 = 開口率;
   而偵測器的雜訊(暗電流、背景連續光)是**絕對值**,不隨開口率縮小。
   所以 SNR ∝ 開口率。干涉看的是**膜厚**,光斑打在量測區上,
   與圖形開口率無關 —— 它在 OES 已經死掉的地方還活著。

   ⚠️「不可靠」是統計陳述,不是單次結果。
   所以面板上除了「這一次的誤差」,還有跑 24 顆種子的**失敗率** ——
   單看一次會誤以為低開口率也抓得到,按「重新取樣」就知道那只是運氣。

   物理在 js/lab/endpoint-model.js,由 tools/check-endpoint.mjs 守住。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A28",
    function () {
      var C = PA.controls;
      var M = PA.endpoint;

      var TRIALS = 24;

      function fmtPct(v) {
        return (v * 100).toFixed(1) + " %";
      }

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = {
            openAreaLog: -2, noise: 1, thickness: 500, rate: 5,
            signal: "oxide", algo: "ma", seed: 987654321,
          };

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
            "上圖為 OES 產物譜線強度對時間的曲線,含真實界面時間與演算法偵測到的終點；下圖為干涉反射訊號的條紋與其終點。"
          );
          canvasBox.appendChild(canvas);
          api.canvas = canvas;

          var card = document.createElement("div");
          card.className = "pa-map-card";
          sideBox.appendChild(card);
          api.card = card;

          api.rebuild = function () {
            var s = api.state;
            var openArea = Math.pow(10, s.openAreaLog);
            var base = {
              openArea: openArea, noise: s.noise, thickness: s.thickness,
              rate: s.rate, signal: s.signal,
            };
            api.base = base;
            api.sim = M.run(Object.assign({}, base, { seed: s.seed }));
            api.det = M.detect(api.sim, s.algo);
            api.itf = M.detectInterference(api.sim);
            api.proc = M.applyAlgo(api.sim.oes, s.algo);
            // 統計:同一組參數、24 顆不同種子
            api.rel = M.reliability(base, s.algo, TRIALS);
            api.relI = M.reliabilityInterference(base, TRIALS);
            api.refresh();
          };

          api.refresh = function () {
            var s = api.state;
            var sim = api.sim;
            var snr = M.snr(sim, s.noise);
            if (api.readoutNode) {
              api.readoutNode.update({
                openArea: Math.pow(10, s.openAreaLog) * 100,
                snr: snr,
                oesErr: api.det.error * 100,
                oesFail: api.rel.failRate * 100,
                itfErr: api.itf.usable === false ? NaN : api.itf.error * 100,
                itfFail: api.relI.failRate * 100,
                fringes: M.countFringes(sim),
                period: M.fringePeriodSec(sim),
              });
            }

            api.card.textContent = "";
            var head = document.createElement("div");
            head.className = "pa-map-card__head";
            var st = document.createElement("strong");
            st.textContent = sim.signal.label + " · " + sim.signal.line;
            head.appendChild(st);
            api.card.appendChild(head);

            var p1 = document.createElement("p");
            p1.textContent = sim.signal.why.replace(/\*\*/g, "");
            api.card.appendChild(p1);

            var p2 = document.createElement("p");
            p2.className = "pa-subtle";
            p2.textContent = M.ALGOS[s.algo].label + " —— " + M.ALGOS[s.algo].note.replace(/\*\*/g, "");
            api.card.appendChild(p2);

            /* 診斷:這一次的結果 vs 24 次的統計 */
            var diag = document.createElement("div");
            diag.className = "pa-diag";
            var rows = [
              ["OES 這一次", fmtPct(Math.abs(api.det.error)), Math.abs(api.det.error) < 0.1],
              ["OES 24 次中位", fmtPct(api.rel.median), api.rel.median < 0.1],
              ["OES 24 次失敗率", fmtPct(api.rel.failRate), api.rel.failRate < 0.25],
              [
                "干涉 24 次失敗率",
                api.itf.usable === false ? "不可用" : fmtPct(api.relI.failRate),
                api.itf.usable !== false && api.relI.failRate < 0.25,
              ],
            ];
            rows.forEach(function (r) {
              var row = document.createElement("div");
              row.className = "pa-diag__row";
              var k = document.createElement("span");
              k.textContent = r[0];
              var v = document.createElement("strong");
              v.textContent = r[1];
              v.style.color = r[2] ? "var(--pa-success)" : "var(--pa-danger)";
              row.appendChild(k);
              row.appendChild(v);
              diag.appendChild(row);
            });
            api.card.appendChild(diag);

            var verdict = document.createElement("p");
            if (api.itf.usable === false) {
              verdict.textContent =
                "膜太薄:整支製程只走得完 " + M.fringeBudget(sim).toFixed(2) +
                " 個條紋,干涉法沒有振幅可以看塌陷。這是干涉法自己的失效邊界,與開口率無關。";
            } else if (api.rel.failRate > 0.5 && api.relI.failRate < 0.25) {
              verdict.textContent =
                "開口率 " + (Math.pow(10, s.openAreaLog) * 100).toFixed(3) +
                " % → SNR 只剩 " + snr.toFixed(1) + "。OES 24 次裡失敗 " +
                (api.rel.failRate * 100).toFixed(0) + " %,而干涉一次都沒失敗。這就是接觸孔層要拉干涉終點的原因。";
            } else if (api.rel.failRate > 0.25) {
              verdict.textContent =
                "已經進入邊緣區:SNR " + snr.toFixed(1) + ",OES 失敗率 " +
                (api.rel.failRate * 100).toFixed(0) + " %。多按幾次「重新取樣」會看到誤差在兩個量級之間跳。";
            } else {
              verdict.textContent =
                "SNR " + snr.toFixed(1) + ",OES 終點穩定。把開口率往左拉兩格再看。";
            }
            api.card.appendChild(verdict);
          };

          var detach = PA.canvasTheme.autoSize(canvas, canvasBox, 3 / 4, function (ctx, w, h) {
            api.ctx = ctx;
            api.width = w;
            api.height = h;
            if (!api.booted) { api.booted = true; api.rebuild(); }
          });
          api.onDestroy(detach);

          var readout = C.readout([
            { key: "openArea", label: "開口率", digits: 3, unit: " %" },
            { key: "snr", label: "OES 訊雜比 SNR", digits: 1, unit: "" },
            { key: "oesErr", label: "OES 終點誤差(這一次)", digits: 1, unit: " %" },
            { key: "oesFail", label: "OES 失敗率(24 次)", digits: 0, unit: " %" },
            { key: "itfErr", label: "干涉終點誤差(這一次)", digits: 1, unit: " %" },
            { key: "itfFail", label: "干涉失敗率(24 次)", digits: 0, unit: " %" },
            { key: "fringes", label: "數到的條紋數", digits: 2, unit: " 個" },
            { key: "period", label: "一個條紋 = 固有解析度", digits: 1, unit: " s" },
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

          var sigCtl = C.segmented({
            label: "監控訊號",
            options: Object.keys(M.SIGNALS).map(function (k) {
              return { value: k, label: M.SIGNALS[k].label };
            }),
            value: api.state.signal,
            onChange: function (v) { api.state.signal = v; api.rebuild(); },
          });

          var algoCtl = C.segmented({
            label: "偵測演算法",
            options: Object.keys(M.ALGOS).map(function (k) {
              return { value: k, label: M.ALGOS[k].label };
            }),
            value: api.state.algo,
            onChange: function (v) { api.state.algo = v; api.rebuild(); },
          });

          var reseed = C.button({
            label: "重新取樣(換一個雜訊實現)",
            ariaLabel: "重新取樣,產生另一組雜訊",
            onClick: function () {
              api.state.seed = (api.state.seed * 1103515245 + 12345) >>> 0 || 1;
              api.rebuild();
            },
          });

          api.el.appendChild(C.panel([sigCtl, algoCtl, knob("openAreaLog"), knob("noise"), knob("thickness"), knob("rate"), reseed]));
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "**先看開口率 1 %(預設)。** 上圖的 CO 訊號在 100 秒附近掉下來,演算法標的終點(虛線)幾乎壓在真實界面時間上。下圖的干涉條紋同時停止振盪。兩種方法都好用,這時候你不會覺得終點是個問題。",
              "**把開口率拉到 0.1 %。** 上圖的訊號幾乎被雜訊淹沒 —— 注意**訊號的高度縮小了,雜訊的高度沒有**。這就是全部的原因:產物量 ∝ 開口率,而偵測器的暗電流不會因為你的圖形變密就變小。",
              "**現在按「重新取樣」五六次。** 低開口率下,終點會在整條時間軸上亂跳:有時候剛好猜對,有時候差一倍。**「這一次的誤差」是騙人的,要看「24 次的失敗率」。** 這就是為什麼現場不能拿一片好片子當作終點可靠的證據。",
              "**下圖從頭到尾沒有變。** 開口率從 50 % 掃到 0.01 %,干涉的終點時間**逐位元完全相同** —— 因為干涉量的是量測區的膜厚,訊號裡根本沒有開口率這一項。接觸孔/貫孔層(開口率 0.1–1 %)之所以要拉 IEP,就是這個道理。",
              "**切換演算法比較取捨。** 開口率 1 % 時:「不平滑」誤差最大(被單一雜訊尖峰騙走);「拖尾 9 點」明顯改善;「拖尾 31 點」抗雜訊更好,但把雜訊調到很小、開口率調大,會看到它**系統性晚報** —— 拖尾平均只能看過去的點,長窗一定延遲約半個窗。",
              "⚠️ **「平台間 50 % 門檻」誤差最小,但它不能用來停機。** 它要用到蝕刻**結束後**的平台才算得出 50 % 在哪裡 —— 那時候晶片早就過蝕刻了。它是事後分析與 R2R 的工具,不是即時控制器。真機的即時演算法只能是因果的。",
              "**把「膜厚」拉到 200 nm 以下。** 干涉法自己也會失效:整支製程走不完一個條紋,沒有振幅可以看它塌陷 —— 面板會直接說「不可用」。干涉法的固有時間解析度就是**一個條紋週期 λ/(2n) ÷ 蝕刻率**,讀數裡有這個值。真機是靠多波長與更快取樣壓下去的。",
              "**切到「Poly-Si(反應物)」。** 訊號方向反過來:Cl 837 nm 在刻穿之後**上升**,因為沒有 Si 消耗它了。終點不一定是往下掉 —— 選線的時候要先想清楚你監控的是產物還是反應物。",
              "把「雜訊程度」拉到 ×3、開口率留在 1 %:一樣崩。**SNR 是比值,分子分母哪一邊壞掉都算數** —— 視窗積膜、光纖老化、背景連續光變強,效果和開口率變小一模一樣。",
            ])
          );
        },

        reset: function () {
          this.state = {
            openAreaLog: -2, noise: 1, thickness: 500, rate: 5,
            signal: "oxide", algo: "ma", seed: 987654321,
          };
          this.rebuild();
        },

        draw: function () {
          var api = this;
          if (!api.ctx || !api.sim) return;
          var ctx = api.ctx;
          var p = PA.canvasTheme.palette();
          var w = api.width;
          var h = api.height;
          var sim = api.sim;

          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = p.bg;
          ctx.fillRect(0, 0, w, h);

          var L = 44, R = w - 12;
          var gap = 34;
          var panelH = (h - gap - 34) / 2;
          var T1 = 20;
          var B1 = T1 + panelH;
          var T2 = B1 + gap;
          var B2 = T2 + panelH;

          var xOf = function (t) { return L + (t / sim.tTotal) * (R - L); };

          function frame(top, bot, title) {
            ctx.strokeStyle = p.vizAxis || p.border;
            ctx.beginPath();
            ctx.moveTo(L, top);
            ctx.lineTo(L, bot);
            ctx.lineTo(R, bot);
            ctx.stroke();
            ctx.save();
            ctx.font = "11px system-ui, sans-serif";
            ctx.fillStyle = p.text;
            ctx.textAlign = "left";
            ctx.fillText(title, L, top - 6);
            ctx.restore();
          }

          function trace(series, top, bot, lo, hi, color, alpha, width) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.beginPath();
            for (var i = 0; i < series.length; i++) {
              var y = bot - ((series[i].v - lo) / (hi - lo)) * (bot - top);
              if (i === 0) ctx.moveTo(xOf(series[i].t), y);
              else ctx.lineTo(xOf(series[i].t), y);
            }
            ctx.stroke();
            ctx.restore();
          }

          /** 真實界面時間 = 實線;偵測到的終點 = 虛線 */
          function marks(top, bot, detT, label) {
            ctx.save();
            ctx.strokeStyle = p.vizAxis || p.border;
            ctx.globalAlpha = 0.9;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(xOf(sim.tEnd), top);
            ctx.lineTo(xOf(sim.tEnd), bot);
            ctx.stroke();
            ctx.font = "10px system-ui, sans-serif";
            ctx.fillStyle = p.textSubtle || p.text;
            ctx.textAlign = "center";
            ctx.fillText("真實界面", xOf(sim.tEnd), top + 11);
            if (detT != null && isFinite(detT)) {
              var good = Math.abs((detT - sim.tEnd) / sim.tEnd) < 0.1;
              ctx.setLineDash([4, 3]);
              ctx.strokeStyle = good ? p.success || p.primary : p.danger;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(xOf(detT), top);
              ctx.lineTo(xOf(detT), bot);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.fillStyle = good ? p.success || p.primary : p.danger;
              ctx.fillText(label, xOf(detT), bot - 4);
            }
            ctx.restore();
          }

          /* ---- 上:OES ---- */
          frame(T1, B1, "OES " + sim.signal.line + " · 開口率 " + (sim.openArea * 100).toFixed(3) + " %");
          var vs = sim.oes.map(function (x) { return x.v; });
          var lo1 = Math.min.apply(null, vs);
          var hi1 = Math.max.apply(null, vs);
          var pad1 = (hi1 - lo1) * 0.12 || 0.01;
          lo1 -= pad1; hi1 += pad1;
          trace(sim.oes, T1, B1, lo1, hi1, p.textSubtle || p.text, 0.45, 1);
          trace(sim.oes.map(function (x) { return { t: x.t, v: x.clean }; }), T1, B1, lo1, hi1, p.vizGrid || p.border, 0.7, 1);
          if (api.proc && api.proc.length) trace(api.proc, T1, B1, lo1, hi1, p.primary, 1, 2);
          marks(T1, B1, api.det.t, "偵測");

          /* ---- 下:干涉 ---- */
          frame(T2, B2, "干涉反射(633 nm)· 條紋週期 " + M.fringePeriodNm(sim).toFixed(0) + " nm");
          trace(sim.interf, T2, B2, 0.02, 0.98, p.vizFilm || p.primary, 0.9, 1.4);
          marks(T2, B2, api.itf.usable === false ? NaN : api.itf.t, "偵測");
          if (api.itf.usable === false) {
            ctx.save();
            ctx.font = "12px system-ui, sans-serif";
            ctx.fillStyle = p.danger;
            ctx.textAlign = "center";
            ctx.fillText("條紋不足一個週期 —— 干涉法不可用", (L + R) / 2, (T2 + B2) / 2);
            ctx.restore();
          }

          /* ---- 時間軸 ---- */
          ctx.save();
          ctx.font = "10px system-ui, sans-serif";
          ctx.fillStyle = p.textSubtle || p.text;
          ctx.textAlign = "center";
          for (var k = 0; k <= 5; k++) {
            var tt = (sim.tTotal * k) / 5;
            ctx.fillText(tt.toFixed(0), xOf(tt), B2 + 14);
          }
          ctx.textAlign = "right";
          ctx.fillText("時間 (s)", R, B2 + 27);
          ctx.restore();
        },
      });
    },
    ["js/lab/endpoint-model.js"]
  );
})((window.PA = window.PA || {}));
