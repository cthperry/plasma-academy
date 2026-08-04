/* ==========================================================================
   A31 — 脈衝電漿時序互動
   章節 4.4 · 規格 docs/05-animation-spec.md

   六條波形對齊同一時間軸:source / bias / n_e / T_e / 鞘層電位 / 負離子,
   最下面是孔底電荷 —— 全部由同一組 0-D 方程式解出來。

   規格的三個觀察點都是模型的結果,不是動畫:
     · off 期 T_e 快速下降、n_e 衰減慢 → 「高密度低溫」的後輝光
     · 孔底電荷:CW 一直累積、脈衝每個 off 期被清掉
     · 電負性氣體 → 後輝光形成離子-離子電漿

   物理在 js/lab/pulse-model.js,由 tools/check-advanced.mjs 守住。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A31",
    function () {
      var C = PA.controls;
      var M = PA.pulse;

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = {
            pulse: true, mode: "sync", freqLog: Math.log10(2000), duty: 0.5,
            phase: 0, power: 500, pressure: 20, eneg: 0, arFeature: 8, biasV: 80,
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
            "六條對齊同一時間軸的波形:源功率、偏壓、電子密度、電子溫度、鞘層電位、負離子密度,最下方為深孔底部的累積電位。"
          );
          canvasBox.appendChild(canvas);
          api.canvas = canvas;

          var card = document.createElement("div");
          card.className = "pa-map-card";
          sideBox.appendChild(card);
          api.card = card;

          api.params = function () {
            var s = api.state;
            return {
              pulse: s.pulse, mode: s.mode, freq: Math.pow(10, s.freqLog),
              duty: s.duty, phase: s.phase, power: s.power, pressure: s.pressure,
              eneg: s.eneg, arFeature: s.arFeature, biasV: s.biasV,
              cycles: 4,
            };
          };

          api.rebuild = function () {
            var p = api.params();
            api.p = p;
            api.sim = M.simulate(p);
            api.st = M.stats(api.sim);
            // 同條件的 CW 當基準 —— 「脈衝好在哪」要有對照組才說得清
            api.cwSim = M.simulate(Object.assign({}, p, { pulse: false, cycles: 2 }));
            api.cw = M.stats(api.cwSim);
            api.refresh();
          };

          api.refresh = function () {
            var st = api.st;
            var p = api.p;
            if (api.readoutNode) {
              api.readoutNode.update({
                freq: p.freq,
                tauTe: st.tauTe * 1e6,
                tauNe: st.tauNe * 1e6,
                ratio: st.tauNe / st.tauTe,
                neMean: st.neMean,
                teMean: st.teMean,
                ionE: st.ionEnergyMean,
                vBottom: st.vBottomMean,
                afterglow: st.afterglowDose * 100,
              });
            }

            api.card.textContent = "";
            var head = document.createElement("div");
            head.className = "pa-map-card__head";
            var stg = document.createElement("strong");
            stg.textContent = p.pulse ? M.MODES[p.mode].label : "連續波 CW";
            head.appendChild(stg);
            api.card.appendChild(head);

            var note = document.createElement("p");
            note.textContent = p.pulse ? M.MODES[p.mode].note : "電位單調累積到天花板,然後一直停在那裡。";
            api.card.appendChild(note);

            var dead = st.neMin < api.cw.neMean * 0.01;
            var diag = document.createElement("div");
            diag.className = "pa-diag";
            var rows = [
              ["τ(n_e) / τ(T_e)", isFinite(st.tauNe / st.tauTe) ? (st.tauNe / st.tauTe).toFixed(1) + " ×" : "—", (st.tauNe / st.tauTe) > 5],
              ["孔底最大回落", (st.drawdown * 100).toFixed(0) + " %", st.drawdown > 0.9],
              ["孔底平均電位", st.vBottomMean.toFixed(2) + " V", st.vBottomMean < api.cw.vBottomMean * 0.5],
              ["電漿撐得住?", dead ? "熄滅" : "撐得住", !dead],
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
            if (!p.pulse) {
              verdict.textContent =
                "CW 基準:孔底 " + api.cw.vBottomMax.toFixed(2) + " V,回落 " +
                (api.cw.drawdown * 100).toFixed(1) + " % —— 充上去就再也沒下來。切到脈衝看差別。";
            } else if (dead) {
              verdict.textContent =
                "頻率太低:off 期 " + ((1 - p.duty) / p.freq * 1e6).toFixed(0) +
                " µs 長到讓 n_e 掉到 CW 的 1 % 以下 —— 電漿等於熄了再點,蝕刻率與穩定性都會出事。這是脈衝頻率的**下限**。";
            } else if (st.drawdown < 0.5) {
              verdict.textContent =
                "頻率太高:off 期只有 " + ((1 - p.duty) / p.freq * 1e6).toFixed(0) +
                " µs,孔底來不及放電(回落只有 " + (st.drawdown * 100).toFixed(0) +
                " %)。這是脈衝頻率的**上限**。";
            } else {
              verdict.textContent =
                "在可用區間內:孔底每個週期被清掉 " + (st.drawdown * 100).toFixed(0) +
                " %,平均電位從 CW 的 " + api.cw.vBottomMean.toFixed(2) + " V 降到 " +
                st.vBottomMean.toFixed(2) + " V,而電漿沒有熄。";
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
            { key: "freq", label: "脈衝頻率", digits: 0, unit: " Hz" },
            { key: "tauTe", label: "off 期 τ(T_e)", digits: 2, unit: " µs", format: function (v) { return isFinite(v) ? v.toFixed(2) : "未達 1/e"; } },
            { key: "tauNe", label: "off 期 τ(n_e)", digits: 2, unit: " µs", format: function (v) { return isFinite(v) ? v.toFixed(2) : "未達 1/e"; } },
            { key: "ratio", label: "τ(n_e) / τ(T_e)", digits: 1, unit: " ×", format: function (v) { return isFinite(v) ? v.toFixed(1) : "—"; } },
            { key: "neMean", label: "平均 n_e", digits: 0, unit: " m⁻³", format: function (v) { return v.toExponential(2); } },
            { key: "teMean", label: "平均 T_e", digits: 3, unit: " eV" },
            { key: "ionE", label: "平均離子能量", digits: 1, unit: " eV" },
            { key: "vBottom", label: "孔底平均電位", digits: 2, unit: " V" },
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

          var modeCtl = C.segmented({
            label: "脈衝模式",
            options: [
              { value: "cw", label: "連續波 CW" },
              { value: "source", label: M.MODES.source.label },
              { value: "bias", label: M.MODES.bias.label },
              { value: "sync", label: M.MODES.sync.label },
            ],
            value: "sync",
            onChange: function (v) {
              api.state.pulse = v !== "cw";
              if (v !== "cw") api.state.mode = v;
              api.rebuild();
            },
          });

          api.el.appendChild(
            C.panel([
              modeCtl, knob("freqLog"), knob("duty"), knob("phase"),
              knob("power"), knob("pressure"), knob("eneg"), knob("arFeature"),
            ])
          );
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "**先看 off 期的兩條曲線,這是整章的關鍵。** T_e 在幾微秒內就崩(τ ≈ 6.7 µs),n_e 卻要十倍的時間才掉到 1/e(τ ≈ 71 µs)。原因在方程式裡:ν_iz ∝ exp(−15.76/T_e),T_e 一掉,非彈性損失立刻關掉;而 n_e 只能靠擴散慢慢流失,**而且 u_B ∝ √T_e,T_e 掉了之後擴散還變慢**。",
              "**這個時間差就是脈衝的全部價值:後輝光是「高密度、低溫」的電漿。** 有電漿密度可以用,但沒有高能電子。下面所有的好處都是這一句話的推論。",
              "**看鞘層電位那條線:它 ∝ T_e,所以 off 期跟著塌。** 鞘層一塌,電子(以及負離子)就不再被擋在外面 —— 這是孔底能被中和的前提。",
              "**最下面那條是孔底電位。切到 CW 再切回脈衝,看差別。** CW 充到天花板 10.5 V 就一直停在那裡(回落 0 %);脈衝每個週期把它清掉 97 %,平均電位從 10.5 V 掉到 1.9 V。**這正是 3.3 的 notching 與 twisting 被脈衝治好的機制。**",
              "**把頻率往左拉到 500 Hz 以下。** 面板會警告「電漿熄滅」—— off 期長到 n_e 掉了兩個數量級,等於熄了再點。這是脈衝頻率的**下限**,而它是模型跑出來的,不是抄規格書的。",
              "**把頻率往右拉到 50 kHz 以上。** 孔底的回落從 92 % 掉到 11 %:off 期只剩 10 µs,來不及放電。這是**上限**。兩個限制夾出來的可用區間落在數 kHz —— 與現場的經驗值同一個量級。",
              "**切到「只脈衝 Bias」。** n_e 與 T_e 完全不動(和 CW 一樣),平均離子能量從 92 eV 降到 52 eV。⚠️ 但**孔底電位一點都沒降** —— 因為天花板由 T_e 決定,而 T_e 沒動。Bias 脈衝控制的是 IEDF,不是充電。",
              "**切到「只脈衝 Source」:** T_e 從 2.52 降到 1.32 eV,孔底跟著從 10.5 降到 6.6 V。**同步脈衝**兩邊都拿:低 T_e 加上低離子能量。這就是為什麼先進製程用同步脈衝。",
              "**拉「同步相位差」到 0.5,注意平均離子能量一位數都不變(46.2 eV)。** 變的是它落在哪裡:相位 0 時只有 0.5 % 的離子能量劑量落在後輝光,相位 0.5 時有 87 %。**同一份離子能量,送在電漿冷掉之後** —— 這是同步脈衝相位差真正的用途。",
              "**把「氣體電負性」拉到 1.0,看負離子那條線。** on 期電負度 α 只有 0.67,off 期衝到 3.9 —— 電子跑得比負離子快,後輝光留下的是**離子-離子電漿**。它讓孔底再降一點,但幅度不大(約 6 %):電子已經把大部分中和掉了。這是模型的結果,不是課本的口號。",
            ])
          );
        },

        reset: function () {
          this.state = {
            pulse: true, mode: "sync", freqLog: Math.log10(2000), duty: 0.5,
            phase: 0, power: 500, pressure: 20, eneg: 0, arFeature: 8, biasV: 80,
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
          var ser = api.sim.series;
          if (!ser.length) return;

          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = p.bg;
          ctx.fillRect(0, 0, w, h);

          var L = 56, R = w - 12;
          var T = 12, B = h - 20;
          var lanes = [
            { key: "on", label: "Source", color: p.primary, step: true, max: 1 },
            { key: "bias", label: "Bias", color: p.vizIonPos || p.danger, step: true, max: 1 },
            { key: "ne", label: "n_e", color: p.vizElectron || p.primary },
            { key: "te", label: "T_e", color: p.danger },
            { key: "sheath", label: "鞘層 V", color: p.vizFilm || p.primary },
            { key: "nNeg", label: "負離子", color: p.vizIonNeg || p.vizPolymer },
            { key: "vBottom", label: "孔底 V", color: p.warning || p.vizRadical },
          ];
          var laneH = (B - T) / lanes.length;
          var tMax = api.sim.tEnd;
          var xOf = function (t) { return L + (t / tMax) * (R - L); };

          // off 期底色
          ctx.save();
          ctx.globalAlpha = 0.08;
          ctx.fillStyle = p.text;
          var inOff = false, offStart = 0;
          for (var i = 0; i < ser.length; i++) {
            if (!ser[i].on && !inOff) { inOff = true; offStart = ser[i].t; }
            if ((ser[i].on || i === ser.length - 1) && inOff) {
              inOff = false;
              ctx.fillRect(xOf(offStart), T, xOf(ser[i].t) - xOf(offStart), B - T);
            }
          }
          ctx.restore();

          lanes.forEach(function (lane, li) {
            var lt = T + li * laneH + 3;
            var lb = T + (li + 1) * laneH - 3;
            var vals = ser.map(function (x) { return x[lane.key]; });
            var mx = lane.max != null ? lane.max : Math.max.apply(null, vals);
            if (!(mx > 0)) mx = 1;

            ctx.save();
            ctx.strokeStyle = p.vizGrid || p.border;
            ctx.globalAlpha = 0.45;
            ctx.beginPath();
            ctx.moveTo(L, lb); ctx.lineTo(R, lb);
            ctx.stroke();
            ctx.restore();

            ctx.strokeStyle = lane.color;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            for (var j = 0; j < ser.length; j++) {
              var x = xOf(ser[j].t);
              var y = lb - (vals[j] / mx) * (lb - lt);
              if (j === 0) ctx.moveTo(x, y);
              else if (lane.step) { ctx.lineTo(x, lb - (vals[j - 1] / mx) * (lb - lt)); ctx.lineTo(x, y); }
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.lineWidth = 1;

            ctx.save();
            ctx.font = "10px system-ui, sans-serif";
            ctx.fillStyle = p.textSubtle || p.text;
            ctx.textAlign = "right";
            ctx.fillText(lane.label, L - 4, (lt + lb) / 2 + 3);
            if (!lane.step) {
              ctx.textAlign = "left";
              var peak = Math.max.apply(null, vals);
              var txt = peak >= 1e6 ? peak.toExponential(1) : peak.toFixed(peak < 10 ? 2 : 0);
              ctx.fillText(txt, L + 3, lt + 9);
            }
            ctx.restore();
          });

          ctx.save();
          ctx.font = "10px system-ui, sans-serif";
          ctx.fillStyle = p.textSubtle || p.text;
          ctx.textAlign = "center";
          for (var k = 0; k <= 4; k++) {
            var tt = (tMax * k) / 4;
            ctx.fillText((tt * 1e6).toFixed(0), xOf(tt), B + 13);
          }
          ctx.textAlign = "right";
          ctx.fillText("時間 (µs)", R, B + 13);
          ctx.textAlign = "left";
          ctx.fillText("灰底 = off 期", L, B + 13);
          ctx.restore();
        },
      });
    },
    ["js/lab/charging-model.js", "js/lab/pulse-model.js"]
  );
})((window.PA = window.PA || {}));
