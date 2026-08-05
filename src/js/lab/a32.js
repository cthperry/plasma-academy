/* ==========================================================================
   A32 — 0-D 全域模型計算器
   章節 4.5 · 規格 docs/05-animation-spec.md

   上圖是**平衡方程的圖示求解**:k_iz(T_e)/u_B(T_e) 這條上升曲線,
   與 1/(n_g·d_eff) 這條水平線,交點就是 T_e。
   水平線的高度只由壓力與腔體尺寸決定 —— **功率不在圖上**,
   這就是「加功率不加溫度」最直接的視覺證明。

   下圖是掃描結果。掃功率時 T_e 是一條完美的水平線,而 n_e 是一條完美的直線。

   物理在 js/lab/global-model.js,由 tools/check-global.mjs 守住。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A32",
    function () {
      var C = PA.controls;
      var M = PA.global;

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = {
            gas: "Ar", pressure: 20, power: 500, radius: 0.15, height: 0.1,
            gasHeating: false, sweep: "power",
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
            "上圖為粒子平衡的圖示求解:游離率除以 Bohm 速度的曲線與由壓力尺寸決定的水平線,交點即為電子溫度;下圖為選定參數的掃描結果。"
          );
          canvasBox.appendChild(canvas);
          api.canvas = canvas;

          var card = document.createElement("div");
          card.className = "pa-map-card";
          sideBox.appendChild(card);
          api.card = card;

          api.rebuild = function () {
            var s = api.state;
            api.sol = M.solve(s);
            api.curve = M.balanceCurve(s, 0.5, 8, 240);
            var sw = M.SWEEPS[s.sweep];
            api.sweepData = M.sweep(s, sw.key, sw.values);
            api.refresh();
          };

          api.refresh = function () {
            var r = api.sol;
            if (api.readoutNode) {
              api.readoutNode.update({
                te: r.te,
                ne: r.ne,
                neCm: r.ne / 1e6,
                ec: r.ec,
                eTot: r.eTot,
                flux: r.gammaI,
                ioniz: r.ionization,
                diss: r.radical ? r.radical.dissFrac * 100 : NaN,
              });
            }

            api.card.textContent = "";
            var head = document.createElement("div");
            head.className = "pa-map-card__head";
            var st = document.createElement("strong");
            st.textContent = r.gasDef.label + " · " + api.state.pressure + " mTorr · " + api.state.power + " W";
            head.appendChild(st);
            api.card.appendChild(head);

            var note = document.createElement("p");
            note.textContent = r.gasDef.note;
            api.card.appendChild(note);

            var diag = document.createElement("div");
            diag.className = "pa-diag";
            var sw = api.sweepData;
            var teSpread =
              (Math.max.apply(null, sw.map(function (x) { return x.te; })) -
                Math.min.apply(null, sw.map(function (x) { return x.te; }))) /
              Math.min.apply(null, sw.map(function (x) { return x.te; }));
            var lin = M.linearity(sw, "ne");
            var rows = [
              ["有效損失長度 d_eff", r.geo.dEff.toFixed(3) + " m", true],
              ["離子平均自由徑", (r.geo.lambdaI * 1000).toFixed(2) + " mm", true],
              ["掃描中 T_e 的變化", (teSpread * 100).toFixed(2) + " %", teSpread < 0.1],
              ["掃描中 n_e 的線性偏差", (lin * 100).toFixed(2) + " %", lin < 0.05],
            ];
            rows.forEach(function (row2) {
              var row = document.createElement("div");
              row.className = "pa-diag__row";
              var k = document.createElement("span");
              k.textContent = row2[0];
              var v = document.createElement("strong");
              v.textContent = row2[1];
              v.style.color = row2[2] ? "var(--pa-success)" : "var(--pa-danger)";
              row.appendChild(k);
              row.appendChild(v);
              diag.appendChild(row);
            });
            api.card.appendChild(diag);

            var verdict = document.createElement("p");
            if (api.state.sweep === "power" && !api.state.gasHeating) {
              verdict.textContent =
                "掃功率時 T_e 的變化是 " + (teSpread * 100).toFixed(2) +
                " % —— 不是「幾乎不變」,是**完全不變**。功率根本不在粒子平衡方程裡。";
            } else if (api.state.sweep === "power" && api.state.gasHeating) {
              verdict.textContent =
                "打開氣體加熱之後,T_e 的變化變成 " + (teSpread * 100).toFixed(1) +
                " %,n_e 的線性也偏了 " + (lin * 100).toFixed(1) +
                " %。這是理想 0-D 模型第一件會失準的事。";
            } else if (api.state.sweep === "pressure") {
              verdict.textContent =
                "壓力從 " + sw[0].x + " 掃到 " + sw[sw.length - 1].x + " mTorr:T_e 從 " +
                sw[0].te.toFixed(2) + " 降到 " + sw[sw.length - 1].te.toFixed(2) +
                " eV,而 E_c 從 " + sw[0].ec.toFixed(0) + " 漲到 " + sw[sw.length - 1].ec.toFixed(0) +
                " eV —— 高壓難維持電漿就是這個原因。";
            } else {
              verdict.textContent =
                "腔體越小,損失面積相對越大 → 要更高的 T_e 才補得回來。" +
                "R " + sw[0].x + " m → " + sw[0].te.toFixed(2) + " eV;R " +
                sw[sw.length - 1].x + " m → " + sw[sw.length - 1].te.toFixed(2) + " eV。";
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
            { key: "te", label: "電子溫度 T_e", digits: 3, unit: " eV" },
            { key: "ne", label: "電子密度 n_e", digits: 0, unit: " m⁻³", format: function (v) { return v.toExponential(3); } },
            { key: "neCm", label: "電子密度", digits: 0, unit: " cm⁻³", format: function (v) { return v.toExponential(2); } },
            { key: "ec", label: "碰撞能量成本 E_c", digits: 1, unit: " eV" },
            { key: "eTot", label: "每對離子的總能量成本", digits: 1, unit: " eV" },
            { key: "flux", label: "離子通量", digits: 0, unit: " m⁻²s⁻¹", format: function (v) { return v.toExponential(2); } },
            { key: "ioniz", label: "游離度", digits: 0, unit: "", format: function (v) { return v.toExponential(2); } },
            { key: "diss", label: "解離度", digits: 1, unit: " %", format: function (v) { return isFinite(v) ? v.toFixed(1) : "無解離通道"; } },
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

          var gasCtl = C.segmented({
            label: "氣體",
            options: Object.keys(M.GASES).map(function (k) {
              return { value: k, label: M.GASES[k].label };
            }),
            value: "Ar",
            onChange: function (v) { api.state.gas = v; api.rebuild(); },
          });

          var sweepCtl = C.segmented({
            label: "掃描模式",
            options: Object.keys(M.SWEEPS).map(function (k) {
              return { value: k, label: M.SWEEPS[k].label };
            }),
            value: "power",
            onChange: function (v) { api.state.sweep = v; api.rebuild(); },
          });

          var heatCtl = C.toggle({
            label: "含氣體加熱(理想模型的第一個破口)",
            value: false,
            onChange: function (v) { api.state.gasHeating = v; api.rebuild(); },
          });

          api.el.appendChild(
            C.panel([gasCtl, sweepCtl, heatCtl, knob("pressure"), knob("power"), knob("radius"), knob("height")])
          );
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "**先看上面那張圖,它是整個模型的全部。** 上升的曲線是 k_iz(T_e)/u_B(T_e);水平線的高度是 1/(n_g·d_eff),由**壓力與腔體尺寸**決定。兩者的交點就是 T_e。⚠️ **功率不在這張圖上** —— 因為粒子平衡的兩邊都有 n_e,直接消掉了。",
              "**把功率從 100 拉到 2000 W:上面那張圖一動也不動。** 讀數裡的 T_e 也是。這不是「幾乎不變」,是**完全不變**(掃描中 T_e 的變化 0.00 %)。而 n_e 從 8.6×10¹⁶ 一路線性長到 1.7×10¹⁸,n_e/P 是常數。",
              "**這就是 2.6.3「加功率主要加密度、不加溫度」的完整證明。** 那句話不是經驗法則,是兩個 n_e 消掉的直接後果。整個 L2 有一半的因果鏈掛在這個結論上。",
              "**把壓力從 2 拉到 200 mTorr:水平線降下來,交點往左移,T_e 從 3.70 掉到 1.55 eV。** T_e 只由 n_g·d_eff 決定 —— 壓力高、腔體大,產生一個電子需要跑的距離就短,不需要那麼熱。",
              "同時看 E_c:從 34 eV 漲到 513 eV。**低 T_e 時電漿要花五百多 eV 才換到一次游離**,因為能量幾乎都花在激發與解離上。這是高壓電漿難維持、以及分子氣體難維持的同一個原因。",
              "**切到「掃描腔體半徑」:腔體越小 T_e 越高。** 損失面積相對體積變大,要更熱才補得回來。這也解釋了為什麼小腔體(如某些 300 mm 單片機)天生 T_e 偏高,損傷風險也跟著高。",
              "**切換氣體看 E_c。** Ar 95 eV、O₂ 205、CF₄ 211、Cl₂ 405 —— 分子氣體多了解離通道,同樣功率下 n_e 低很多。**這是純 Ar 電漿最好點、最好維持的定量原因。**",
              "看「解離度」讀數:CF₄ 在 500 W 下已經解離了約 90 %。把功率降到 100 W 再看 —— 解離度掉下來。⚠️ 注意它**不會超過 100 %**:母氣體會被耗盡,這一項少了的話模型會算出「自由基比氣體還多」。",
              "**最後打開「含氣體加熱」,再掃一次功率。** T_e 的變化從 0.00 % 變成 27 %,n_e 的線性也偏了 21 %。高功率把氣體加熱 → n_g 下降 → 交點右移。**這是理想 0-D 模型第一件會失準的事**,而它預設是關的:理想結論要先立得住,才談它什麼時候失準。",
              "把這一課帶到 4.5.4:0-D 模型最有價值的用途不是預測絕對數字,是**指出方向**。上面每一條趨勢你都可以拿去現場對,而絕對值不必當真。",
            ])
          );
        },

        reset: function () {
          this.state = {
            gas: "Ar", pressure: 20, power: 500, radius: 0.15, height: 0.1,
            gasHeating: false, sweep: "power",
          };
          this.rebuild();
        },

        draw: function () {
          var api = this;
          if (!api.ctx || !api.sol) return;
          var ctx = api.ctx;
          var p = PA.canvasTheme.palette();
          var w = api.width;
          var h = api.height;
          var r = api.sol;

          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = p.bg;
          ctx.fillRect(0, 0, w, h);

          var L = 52, R = w - 14;
          var T1 = 16, B1 = T1 + (h - 60) * 0.46;
          var T2 = B1 + 40, B2 = h - 24;

          /* ---------- 上:平衡方程的圖示求解 ---------- */
          var teMin = 0.5, teMax = 8;
          var xOf = function (te) { return L + ((te - teMin) / (teMax - teMin)) * (R - L); };
          var vals = api.curve.map(function (c) { return c.v; });
          var vMin = Math.log(Math.max(1e-30, Math.min.apply(null, vals)));
          var vMax = Math.log(Math.max.apply(null, vals));
          var yOf = function (v) {
            var lv = Math.log(Math.max(1e-30, v));
            return B1 - ((lv - vMin) / (vMax - vMin)) * (B1 - T1);
          };

          ctx.strokeStyle = p.vizAxis || p.border;
          ctx.beginPath();
          ctx.moveTo(L, T1); ctx.lineTo(L, B1); ctx.lineTo(R, B1);
          ctx.stroke();

          /*
             k_iz/u_B 曲線用所選氣體的顏色 —— 這條**就是**氣體相依的那條
             (游離速率係數由氣體決定),換氣體時它會整條移動。
             下方的水平線是 1/(n_g·d_eff),只由壓力與尺寸決定、與氣體無關,
             所以維持 danger 紅虛線不動 —— 兩者的角色不同,顏色語意也不該混。
             下半部掃描圖的 T_e / n_e 同理維持原色:那是物理量的語意色。
          */
          var gasCol = PA.canvasTheme.gasColor(api.state.gas, p);
          ctx.strokeStyle = gasCol;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (var i = 0; i < api.curve.length; i++) {
            var x = xOf(api.curve[i].te);
            var y = yOf(api.curve[i].v);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.lineWidth = 1;

          // 水平線 = 1/(n_g·d_eff)
          ctx.save();
          ctx.strokeStyle = p.danger;
          ctx.setLineDash([5, 3]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(L, yOf(r.target)); ctx.lineTo(R, yOf(r.target));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // 交點
          ctx.fillStyle = p.success || p.primary;
          ctx.beginPath();
          ctx.arc(xOf(r.te), yOf(r.target), 5, 0, 6.284);
          ctx.fill();
          ctx.save();
          ctx.strokeStyle = p.success || p.primary;
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(xOf(r.te), yOf(r.target)); ctx.lineTo(xOf(r.te), B1);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          ctx.save();
          ctx.font = "11px system-ui, sans-serif";
          ctx.fillStyle = gasCol;
          ctx.textAlign = "left";
          ctx.fillText("k_iz(T_e) / u_B(T_e)", L + 6, T1 + 12);
          ctx.fillStyle = p.danger;
          ctx.fillText("1 / (n_g · d_eff) — 只由壓力與尺寸決定", L + 6, yOf(r.target) - 5);
          ctx.fillStyle = p.text;
          ctx.textAlign = "center";
          ctx.fillText("T_e = " + r.te.toFixed(2) + " eV", xOf(r.te), B1 + 14);
          ctx.font = "10px system-ui, sans-serif";
          ctx.fillStyle = p.textSubtle || p.text;
          ctx.textAlign = "right";
          ctx.fillText("T_e (eV)", R, B1 + 14);
          ctx.restore();

          /* ---------- 下:掃描 ---------- */
          var sw = api.sweepData;
          var swDef = M.SWEEPS[api.state.sweep];
          var xs = sw.map(function (a) { return a.x; });
          var xMin = Math.min.apply(null, xs), xMax = Math.max.apply(null, xs);
          var sx = function (v) { return L + ((v - xMin) / (xMax - xMin)) * (R - L); };

          ctx.strokeStyle = p.vizAxis || p.border;
          ctx.beginPath();
          ctx.moveTo(L, T2); ctx.lineTo(L, B2); ctx.lineTo(R, B2);
          ctx.stroke();

          var teTop = Math.max.apply(null, sw.map(function (a) { return a.te; })) * 1.25;
          var neTop = Math.max.apply(null, sw.map(function (a) { return a.ne; })) * 1.15;

          [["te", teTop, p.danger, "T_e"], ["ne", neTop, p.vizElectron || p.primary, "n_e"]].forEach(function (cfg, ci) {
            ctx.strokeStyle = cfg[2];
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (var j = 0; j < sw.length; j++) {
              var xx = sx(sw[j].x);
              var yy = B2 - (sw[j][cfg[0]] / cfg[1]) * (B2 - T2);
              if (j === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
            for (var k2 = 0; k2 < sw.length; k2++) {
              ctx.fillStyle = cfg[2];
              ctx.beginPath();
              ctx.arc(sx(sw[k2].x), B2 - (sw[k2][cfg[0]] / cfg[1]) * (B2 - T2), 2.6, 0, 6.284);
              ctx.fill();
            }
            ctx.lineWidth = 1;
            ctx.save();
            ctx.font = "10px system-ui, sans-serif";
            ctx.fillStyle = cfg[2];
            ctx.textAlign = "right";
            ctx.fillText(cfg[3], R, T2 + 11 + ci * 12);
            ctx.restore();
          });

          ctx.save();
          ctx.font = "10px system-ui, sans-serif";
          ctx.fillStyle = p.textSubtle || p.text;
          ctx.textAlign = "left";
          ctx.fillText(swDef.label + "(兩條都歸一化到各自的最大值)", L + 4, T2 - 6);
          ctx.textAlign = "center";
          for (var m = 0; m < sw.length; m++) {
            if (m % 2 === 0 || sw.length <= 6) ctx.fillText(String(sw[m].x), sx(sw[m].x), B2 + 13);
          }
          ctx.restore();
        },
      });
    },
    ["js/lab/global-model.js"]
  );
})((window.PA = window.PA || {}));
