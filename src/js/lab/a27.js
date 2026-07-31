/* ==========================================================================
   A27 — OES 光譜互動 ★
   章節 4.1 · 規格 docs/05-animation-spec.md

   核心是 docs/05 的第 2–4 個互動任務:
     2. 提高功率 → F 譜線強度上升。**但這是濃度變了還是電漿條件變了?**
     3. 開 actinometry → 比值幾乎不動 → **證明是電漿條件變了**
     4. 降低視窗透光率 → 絕對強度掉、比值不動 → **證明比值也消掉視窗汙染**

   強度不是查表來的:I = 濃度 × 譜線強度 × n_e × exp(−E_th/T_e) × 透光率。
   所以上面三件事是算出來的結果,不是寫死的動畫。

   物理在 js/lab/oes-model.js,由 tools/check-diagnostics.mjs 守住。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A27",
    function () {
      var C = PA.controls;
      var M = PA.oes;

      /** 物種配色 —— 同一物種的兩條線用同一個顏色 */
      function colorOf(sp, p) {
        var map = {
          F: p.vizRadical, Ar: p.vizNeutral, O: p.vizIonPos, CO: p.primary,
          Si: p.vizSubstrate, CN: p.vizPolymer, C2: p.vizPolymer,
          H: p.vizElectron, Cl: p.vizFilm, Br: p.vizFilm,
          N2: p.warning || p.vizMask, OH: p.danger,
        };
        return map[sp] || p.text;
      }

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = {
            process: "oxide", power: 500, pressure: 20,
            arFrac: 0.03, transmission: 1, actino: false,
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
            "200 至 900 奈米的發射光譜,主要譜線以物種標註。下方為選定譜線的強度比較。"
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
              process: s.process, power: s.power, pressure: s.pressure,
              arFrac: s.arFrac, transmission: s.transmission,
            });
            api.spec = M.spectrum(api.sim);
            // 以 500 W、透光率 1 當基準,好讓「相對變化」看得出來
            api.ref = M.create({
              process: s.process, power: 500, pressure: s.pressure,
              arFrac: s.arFrac, transmission: 1,
            });
            api.refresh();
          };

          api.refresh = function () {
            var s = api.state;
            var iF = M.intensity(api.sim, 703.7);
            var iAr = M.intensity(api.sim, 750.4);
            var ratio = iAr > 0 ? iF / iAr : 0;
            var iF0 = M.intensity(api.ref, 703.7);
            var iAr0 = M.intensity(api.ref, 750.4);
            var ratio0 = iAr0 > 0 ? iF0 / iAr0 : 0;
            if (api.readoutNode) {
              api.readoutNode.update({
                iF: iF,
                iFrel: iF0 > 0 ? (iF / iF0) * 100 : 0,
                ratio: ratio,
                ratioRel: ratio0 > 0 ? (ratio / ratio0) * 100 : 0,
                te: api.sim.plasma.te,
                ne: api.sim.plasma.ne,
              });
            }
            api.card.textContent = "";
            var head = document.createElement("div");
            head.className = "pa-map-card__head";
            var st = document.createElement("strong");
            st.textContent = api.sim.proc.label;
            head.appendChild(st);
            api.card.appendChild(head);
            var p1 = document.createElement("p");
            p1.textContent = api.sim.proc.why;
            api.card.appendChild(p1);

            // 最強的四條線
            var top = api.spec.slice().sort(function (a, b) { return b.I - a.I; }).slice(0, 4);
            var t = document.createElement("p");
            t.className = "pa-subtle";
            t.textContent = "最強的四條線:" + top.map(function (x) {
              return x.sp + " " + x.nm + " nm";
            }).join("、");
            api.card.appendChild(t);

            var q = document.createElement("p");
            if (Math.abs(s.power - 500) > 1 && s.transmission >= 0.99) {
              q.textContent =
                "功率改了 → I_F 變成基準的 " + (iF0 > 0 ? ((iF / iF0) * 100).toFixed(0) : "—") +
                " %,但 actinometry 比值只變成 " + (ratio0 > 0 ? ((ratio / ratio0) * 100).toFixed(0) : "—") +
                " %。**濃度其實沒怎麼變,變的是 n_e。**";
            } else if (s.transmission < 0.99) {
              q.textContent =
                "視窗透光率 " + (s.transmission * 100).toFixed(0) + " % → 絕對強度掉到 " +
                (iF0 > 0 ? ((iF / iF0) * 100).toFixed(0) : "—") + " %,但比值仍是 " +
                (ratio0 > 0 ? ((ratio / ratio0) * 100).toFixed(0) : "—") +
                " %。**視窗汙染被比值完全消掉。**";
            } else {
              q.textContent =
                "改功率或視窗透光率,看「絕對強度」與「actinometry 比值」誰會跟著動。";
            }
            api.card.appendChild(q);
          };

          var detach = PA.canvasTheme.autoSize(canvas, canvasBox, 3 / 4, function (ctx, w, h) {
            api.ctx = ctx;
            api.width = w;
            api.height = h;
            if (!api.booted) { api.booted = true; api.rebuild(); }
          });
          api.onDestroy(detach);

          var readout = C.readout([
            { key: "iF", label: "I_F(703.7 nm)絕對強度", digits: 2, unit: "" },
            { key: "iFrel", label: "相對基準(500 W、乾淨視窗)", digits: 0, unit: " %" },
            { key: "ratio", label: "Actinometry I_F / I_Ar", digits: 3, unit: "" },
            { key: "ratioRel", label: "比值相對基準", digits: 0, unit: " %" },
            { key: "te", label: "電漿 T_e", digits: 2, unit: " eV" },
            { key: "ne", label: "電漿 n_e", digits: 0, unit: " m⁻³", format: function (v) { return v.toExponential(2); } },
          ]);
          api.readoutNode = readout;

          function knob(key) {
            var r = M.RANGES[key];
            return C.slider({
              label: r.label, min: r.min, max: r.max, step: r.step,
              unit: r.unit, digits: r.step < 1 ? 3 : 0, value: api.state[key],
              onChange: function (v) {
                if (api.state[key] === v) return;
                api.state[key] = v;
                api.rebuild();
              },
            });
          }

          var procCtl = C.segmented({
            label: "製程",
            options: Object.keys(M.PROCESSES).map(function (k) {
              return { value: k, label: M.PROCESSES[k].label };
            }),
            value: "oxide",
            onChange: function (v) { api.state.process = v; api.rebuild(); },
          });

          api.el.appendChild(
            C.panel([procCtl, knob("power"), knob("pressure"), knob("arFrac"), knob("transmission")])
          );
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "**先認出這個製程的主訊號。** SiO₂ 蝕刻最強的是 CO(483.5 nm)—— 蝕穿之後不再有 SiO₂ 供氧,CO 就掉下來,這是終點訊號的來源。切到 Poly 蝕刻,最強的變成 Si 與 Cl。",
              "**把功率從 500 拉到 1200 W。** I_F 的絕對強度上升約五成 —— 但這代表 F 自由基變多了嗎?看下一條。",
              "**看 actinometry 比值 I_F / I_Ar:它幾乎不動(變化不到 3 %)。** 所以 F 的濃度其實沒怎麼變,變的是 n_e —— 強度上升只是因為激發的電子變多了。**這就是為什麼只看絕對強度會誤判。**",
              "為什麼比值有效:I ∝ 濃度 × n_e × exp(−E_th/T_e)。F(703.7)的閾值 14.5 eV 與 Ar(750.4)的 13.5 eV 只差 1 eV,**相除之後 n_e 與 T_e 幾乎完全消掉**,剩下純粹的濃度比。",
              "**把「觀測窗透光率」拉到 30 %**(模擬視窗積膜):絕對強度掉了七成,但比值**一點都沒變**。視窗汙染同乘在每一條線上,比值把它整個消掉 —— 這是 actinometry 第二個實用價值,而且在現場比第一個更常救人。",
              "⚠️ 但 actinometry 有前提。試著改用 Si(251.6 nm,閾值 5.1 eV)當內標去比 F ——**比值又開始跟著功率跑了**。兩條線的激發閾值必須接近,否則 T_e 的影響消不掉。",
              "**切到「⚠ 洩漏狀態」**:OH(306 nm)跳到前三名,N₂(336 nm)也一起上來。這兩條線是**免費的洩漏偵測器** —— 機台本來就在收光譜,把 306 nm 納入常態監控不用加任何硬體。",
              "把 Ar 內標比例減半,看比值怎麼變:它會加倍。**內標濃度真的進得了公式** —— 所以換配方時 Ar 比例一定要記錄,不然歷史資料無法比較。",
            ])
          );
        },

        reset: function () {
          this.state = {
            process: "oxide", power: 500, pressure: 20,
            arFrac: 0.03, transmission: 1, actino: false,
          };
          this.rebuild();
        },

        draw: function () {
          var api = this;
          if (!api.ctx || !api.spec) return;
          var ctx = api.ctx;
          var p = PA.canvasTheme.palette();
          var w = api.width;
          var h = api.height;

          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = p.bg;
          ctx.fillRect(0, 0, w, h);

          var L = 40, R = w - 12, T = 26;
          var specB = h * 0.62;
          var nmMin = 200, nmMax = 900;
          var iMax = Math.max.apply(null, api.spec.map(function (x) { return x.I; })) || 1;

          // 座標軸
          ctx.strokeStyle = p.vizAxis || p.border;
          ctx.beginPath();
          ctx.moveTo(L, T);
          ctx.lineTo(L, specB);
          ctx.lineTo(R, specB);
          ctx.stroke();
          ctx.save();
          ctx.font = "10px system-ui, sans-serif";
          ctx.fillStyle = p.textSubtle || p.text;
          for (var nm = 200; nm <= 900; nm += 100) {
            var gx = L + ((nm - nmMin) / (nmMax - nmMin)) * (R - L);
            ctx.textAlign = "center";
            ctx.fillText(String(nm), gx, specB + 13);
          }
          ctx.textAlign = "left";
          ctx.fillText("強度", 4, T - 10);
          ctx.textAlign = "right";
          ctx.fillText("波長 (nm)", R, specB + 26);
          ctx.restore();

          // 譜線
          api.spec.forEach(function (l) {
            var x = L + ((l.nm - nmMin) / (nmMax - nmMin)) * (R - L);
            var hgt = (l.I / iMax) * (specB - T);
            ctx.strokeStyle = colorOf(l.sp, p);
            ctx.lineWidth = l.actino ? 2.4 : 1.8;
            ctx.beginPath();
            ctx.moveTo(x, specB);
            ctx.lineTo(x, specB - hgt);
            ctx.stroke();
          });
          ctx.lineWidth = 1;

          // 標註最強的六條
          var top = api.spec.slice().sort(function (a, b) { return b.I - a.I; }).slice(0, 6);
          ctx.save();
          ctx.font = "10px system-ui, sans-serif";
          top.forEach(function (l) {
            var x = L + ((l.nm - nmMin) / (nmMax - nmMin)) * (R - L);
            var y = specB - (l.I / iMax) * (specB - T) - 4;
            ctx.fillStyle = colorOf(l.sp, p);
            ctx.textAlign = "center";
            ctx.fillText(l.sp, x, y);
          });
          ctx.restore();

          /* ---- 下半:絕對強度 vs actinometry 比值 ---- */
          var bT = specB + 40;
          var bH = h - bT - 22;
          var iF = M.intensity(api.sim, 703.7);
          var iAr = M.intensity(api.sim, 750.4);
          var iF0 = M.intensity(api.ref, 703.7);
          var iAr0 = M.intensity(api.ref, 750.4);
          var relAbs = iF0 > 0 ? iF / iF0 : 0;
          var relRat = iAr0 > 0 && iAr > 0 ? (iF / iAr) / (iF0 / iAr0) : 0;

          ctx.save();
          ctx.font = "11px system-ui, sans-serif";
          ctx.fillStyle = p.text;
          ctx.fillText("相對基準(500 W、乾淨視窗)", L, bT - 12);
          ctx.restore();

          var barW = (R - L) * 0.3;
          [
            ["絕對強度 I_F", relAbs, p.danger],
            ["比值 I_F/I_Ar", relRat, p.success || p.primary],
          ].forEach(function (b, k) {
            var bx = L + k * (barW + 40);
            var frac = Math.max(0, Math.min(1.6, b[1])) / 1.6;
            ctx.fillStyle = b[2];
            ctx.fillRect(bx, bT + bH - frac * bH, barW, frac * bH);
            ctx.save();
            ctx.font = "10px system-ui, sans-serif";
            ctx.fillStyle = p.text;
            ctx.fillText(b[0], bx, h - 8);
            ctx.fillText((b[1] * 100).toFixed(0) + " %", bx, bT + bH - frac * bH - 4);
            ctx.restore();
          });
          // 100% 參考線
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = p.textSubtle || p.text;
          ctx.globalAlpha = 0.6;
          var refY = bT + bH - (1 / 1.6) * bH;
          ctx.beginPath();
          ctx.moveTo(L, refY);
          ctx.lineTo(R, refY);
          ctx.stroke();
          ctx.restore();
        },
      });
    },
    ["js/lab/oes-model.js"]
  );
})((window.PA = window.PA || {}));
