/* ==========================================================================
   A30 — ALE 循環動畫 ★
   章節 4.4 · 規格 docs/05-animation-spec.md

   三個畫面對齊同一組參數:
     上   四步循環的表面示意(改質層以顏色標示)
     中   **能量窗圖表** —— 兩條閾值線,中間是窗,游標是目前設定
     下   EPC vs 循環數(理想是一條水平線)

   ⚠️ 圖上畫兩條窗:教科書的閾值窗,與**實際可用窗**。
   後者的下緣是「移除步的離子劑量剛好清完改質層」的那一點,
   會隨移除步時間移動 —— 這是實測逼出來的,診斷在 tools/check-advanced.mjs。

   物理在 js/lab/ale-model.js,由 tools/check-advanced.mjs 守住。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A30",
    function () {
      var C = PA.controls;
      var M = PA.ale;

      /** 四步的時間長度(相對),用來跑動畫 */
      function stepDurations(s) {
        return [s.tMod, s.tPurge, s.tRemove, s.tPurge];
      }

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = { energy: 40, tMod: 2, tPurge: 1.5, tRemove: 1, cycles: 20 };
          api.phase = 0;      // 0..4 連續,整數部分是步驟

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
            "上方為 ALE 四步循環的表面示意,中間為離子能量窗圖表(含改質層移除閾值與原始材料濺鍍閾值),下方為每循環蝕刻量對循環數的曲線。"
          );
          canvasBox.appendChild(canvas);
          api.canvas = canvas;

          var card = document.createElement("div");
          card.className = "pa-map-card";
          sideBox.appendChild(card);
          api.card = card;

          api.rebuild = function () {
            var s = api.state;
            api.series = M.run(s);
            api.syn = M.synergy(s);
            api.reg = M.regime(s);
            api.ew = M.effectiveWindow(s);
            api.refresh();
          };

          api.refresh = function () {
            var s = api.state;
            var last = api.series[api.series.length - 1];
            if (api.readoutNode) {
              api.readoutNode.update({
                epc: last.epc,
                epcNm: last.epcNm,
                depth: last.depthNm,
                coverage: M.coverage(s.tMod) * 100,
                winLo: api.ew.usable ? api.ew.lo : NaN,
                winHi: api.ew.usable ? api.ew.hi : NaN,
                synergy: api.syn.S * 100,
                alpha: api.syn.alpha,
                beta: api.syn.beta,
              });
            }

            api.card.textContent = "";
            var head = document.createElement("div");
            head.className = "pa-map-card__head";
            var st = document.createElement("strong");
            st.textContent = api.reg.label;
            head.appendChild(st);
            api.card.appendChild(head);

            var note = document.createElement("p");
            note.textContent = api.reg.note.replace(/\*\*/g, "");
            api.card.appendChild(note);

            var diag = document.createElement("div");
            diag.className = "pa-diag";
            var rows = [
              ["吸附飽和?", (M.coverage(s.tMod) * 100).toFixed(1) + " %", M.coverage(s.tMod) >= 0.95],
              ["移除步清得完?", M.cycle(s, 0).selfLimited ? "是" : "否", M.cycle(s, 0).selfLimited],
              ["離子有打到原始材料?", M.yieldSub(s.energy) > 0 ? "有" : "沒有", M.yieldSub(s.energy) <= 0],
              ["協同度 S", (api.syn.S * 100).toFixed(1) + " %", api.syn.S > 0.9],
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
            verdict.className = "pa-subtle";
            verdict.textContent = api.ew.usable
              ? "實際可用窗 " + api.ew.lo.toFixed(1) + "–" + api.ew.hi.toFixed(1) +
                " eV(教科書閾值窗是 " + M.E_TH_MOD + "–" + M.E_TH_SUB +
                " eV)。窗的下緣由移除步時間決定,不是材料常數。"
              : "目前的移除步時間太短,整個窗都消失了 —— 沒有任何能量能在這個時間內清完改質層。";
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
            { key: "epc", label: "每循環蝕刻量 EPC", digits: 4, unit: " ML" },
            { key: "epcNm", label: "EPC", digits: 4, unit: " nm" },
            { key: "depth", label: "累積深度", digits: 3, unit: " nm" },
            { key: "coverage", label: "改質層覆蓋率", digits: 1, unit: " %" },
            { key: "winLo", label: "可用窗下緣", digits: 1, unit: " eV", format: function (v) { return isFinite(v) ? v.toFixed(1) : "—"; } },
            { key: "winHi", label: "可用窗上緣", digits: 1, unit: " eV", format: function (v) { return isFinite(v) ? v.toFixed(1) : "—"; } },
            { key: "synergy", label: "協同度 S", digits: 1, unit: " %" },
            { key: "beta", label: "純物理貢獻 β", digits: 4, unit: " ML" },
          ]);
          api.readoutNode = readout;

          function knob(key) {
            var r = M.RANGES[key];
            return C.slider({
              label: r.label, min: r.min, max: r.max, step: r.step,
              unit: r.unit, digits: r.step < 1 ? 1 : 0, value: api.state[key],
              onChange: function (v) {
                if (api.state[key] === v) return;
                api.state[key] = v;
                api.rebuild();
              },
            });
          }

          api.el.appendChild(
            C.panel([knob("energy"), knob("tMod"), knob("tPurge"), knob("tRemove"), knob("cycles")])
          );
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "**先看中間那張能量窗圖。** 兩條閾值線:18 eV 是移除改質層(氯化 Si,鍵結弱)、55 eV 是濺鍍原始 Si。ALE 就是把離子能量放在兩者之間 —— 打得動改質層,打不動底下的材料。所以改質層一清完,蝕刻就自己停了。",
              "**在窗內把能量從 30 掃到 54 eV:EPC 一位數都不變。** 這就是自限制的意思 —— 蝕刻量由改質層的厚度決定,不由離子能量決定。上方的表面圖與下方的 EPC 曲線同時都不動。",
              "**把能量拉到 70 eV(窗外上緣)。** EPC 開始隨能量持續上升,而且協同度從 99.6 % 掉到 74 %。⚠️ 這已經不是 ALE 了,只是慢速濺鍍 —— 因為清完改質層之後,離子繼續打原始材料,沒有東西叫它停。",
              "**把能量拉到 12 eV(窗外下緣)。** EPC 趨近 0,只剩自發蝕刻的背景。離子打不動改質層,四步循環變成什麼都沒發生。",
              "⚠️ **注意圖上有兩條窗。** 教科書的窗是兩個閾值之間(18–55 eV),但**實際可用窗更窄**。把能量放在 20 eV 試試:雖然過了閾值,產額只有 0.067,移除步的離子劑量根本清不完改質層 —— 自限制沒發生,EPC 變回由劑量決定。",
              "**把「移除步時間」從 1 s 減到 0.3 s,看可用窗怎麼縮。** 窗從 29.5 eV 寬縮到 8.5 eV 寬,下緣從 25.5 eV 升到 46.5 eV。**窗寬不是材料常數,是你的配方決定的** —— 這是規格書上看不到、但現場一定會遇到的事。",
              "**把「改質步時間」從 2 s 減到 0.5 s。** 覆蓋率只到 63 %,EPC 跟著時間跑 —— 第一個自限制沒發生。ALE 的兩個自限制要**同時**成立才算數,少一個就退化成普通的循環蝕刻。",
              "**把「Purge 時間」減到 0.3 s,看下方的 EPC 曲線。** 它不再是水平線:前幾個循環一路爬升,漲了約 63 % 才穩下來。沒抽乾淨的前驅物疊到下一循環,而且要好幾個循環才達到新的平衡 —— 現場看到「前幾片偏深」多半就是這個。",
              "**協同度 S = (EPC − α − β)/EPC 是 3.1.2 Coburn–Winters 實驗的定量版。** 窗內 β = 0(離子單獨打不動原始材料),所以 S = 99.6 % —— 蝕刻幾乎完全來自兩步的協同。能量拉出窗外,β 就開始長,S 跟著崩。",
              "最後看代價:窗內 EPC 只有 **0.136 nm/循環**。要蝕 10 nm 得跑 74 個循環,每循環好幾秒 —— 這就是量產上「主蝕刻用連續模式、收尾才用 ALE」的理由。",
            ])
          );

          api.transportNode = C.transport({
            playing: true,
            onPlay: function () { api.playing = true; },
            onPause: function () { api.playing = false; },
            onReset: function () { api.phase = 0; },
          });
          api.playing = true;
          api.el.appendChild(api.transportNode);
        },

        reset: function () {
          this.state = { energy: 40, tMod: 2, tPurge: 1.5, tRemove: 1, cycles: 20 };
          this.phase = 0;
          this.rebuild();
        },

        tick: function (dt) {
          if (!this.playing) return;
          /**
           * 動畫的四步等長,而**真實的四步不等長**(改質 2 s、purge 1.5 s、
           * 移除 1 s)。這裡刻意用等長顯示,好讓四步一樣看得清楚;
           * 真實的時間比例在讀數與配方裡,不在動畫裡。
           */
          var d = stepDurations(this.state);
          this.cycleSeconds = d[0] + d[1] + d[2] + d[3];
          // dt 由 lifecycle 傳進來,單位是**秒**(不是毫秒),而且可能為負
          this.phase = (this.phase + Math.max(0, dt)) % 4;   // 每步 1 秒
        },

        draw: function () {
          var api = this;
          if (!api.ctx || !api.series) return;
          var ctx = api.ctx;
          var p = PA.canvasTheme.palette();
          var w = api.width;
          var h = api.height;
          var s = api.state;

          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = p.bg;
          ctx.fillRect(0, 0, w, h);

          var L = 40, R = w - 14;
          var h1 = h * 0.30, h2 = h * 0.33, h3 = h * 0.30;
          var T1 = 16, B1 = T1 + h1;
          var T2 = B1 + 22, B2 = T2 + h2;
          var T3 = B2 + 26, B3 = T3 + h3;

          /* ---------- 上:四步循環 ---------- */
          /**
           * 正模數。第一幀的 rAF 時戳可能**早於** start() 裡取的
           * performance.now(),於是 dt 是負的、phase 變成 −1.5e−5,
           * Math.floor 給 −1、STEPS[−1] 是 undefined —— 實測炸在這裡。
           * 負的 dt 是瀏覽器的正常行為,不是例外情況。
           */
          var step = ((Math.floor(api.phase) % 4) + 4) % 4;
          var frac = api.phase - Math.floor(api.phase);
          var stepInfo = M.STEPS[step];

          var subTop = B1 - 26;
          var subH = 22;
          // 基板
          ctx.fillStyle = p.vizSubstrate || p.border;
          ctx.fillRect(L, subTop, R - L, subH);
          // 改質層
          var cov = M.coverage(s.tMod);
          var modFrac =
            step === 0 ? cov * frac :
            step === 1 ? cov :
            step === 2 ? cov * (1 - Math.min(1, frac / Math.max(0.05, Math.min(1, M.cycle(s, 0).tClear / s.tRemove)))) :
            0;
          modFrac = Math.max(0, Math.min(1, modFrac));
          if (modFrac > 0.01) {
            ctx.fillStyle = p.vizRadical || p.warning || p.primary;
            ctx.fillRect(L, subTop - 7 * modFrac, R - L, 7 * modFrac);
          }
          // 入射粒子
          ctx.save();
          ctx.globalAlpha = 0.8;
          if (step === 0) {
            ctx.fillStyle = p.vizRadical || p.primary;
            for (var i = 0; i < 18; i++) {
              var gx = L + ((i + 0.5) / 18) * (R - L);
              var gy = T1 + 6 + ((subTop - T1 - 10) * ((frac + i * 0.11) % 1));
              ctx.beginPath(); ctx.arc(gx, gy, 2.6, 0, 6.284); ctx.fill();
            }
          } else if (step === 2) {
            ctx.strokeStyle = p.vizIonPos || p.danger;
            ctx.lineWidth = 1.6;
            for (var k = 0; k < 16; k++) {
              var ix = L + ((k + 0.5) / 16) * (R - L);
              var iy = T1 + 6 + ((subTop - T1 - 10) * ((frac * 2 + k * 0.13) % 1));
              ctx.beginPath(); ctx.moveTo(ix, iy - 7); ctx.lineTo(ix, iy); ctx.stroke();
            }
            ctx.lineWidth = 1;
          }
          ctx.restore();

          ctx.save();
          ctx.font = "12px system-ui, sans-serif";
          ctx.fillStyle = p.text;
          ctx.textAlign = "left";
          ctx.fillText(stepInfo.label + " — " + stepInfo.note, L, T1 + 10);
          ctx.restore();
          // 四步進度條
          for (var q = 0; q < 4; q++) {
            var bw = (R - L) / 4 - 4;
            var bx = L + q * ((R - L) / 4);
            ctx.fillStyle = q === step ? (p.primary) : (p.vizGrid || p.border);
            ctx.globalAlpha = q === step ? 1 : 0.35;
            ctx.fillRect(bx, B1 - 3, bw, 3);
            ctx.globalAlpha = 1;
          }

          /* ---------- 中:能量窗 ---------- */
          var eMax = M.RANGES.energy.max;
          var xOfE = function (E) { return L + (E / eMax) * (R - L); };
          ctx.strokeStyle = p.vizAxis || p.border;
          ctx.beginPath();
          ctx.moveTo(L, T2); ctx.lineTo(L, B2); ctx.lineTo(R, B2);
          ctx.stroke();

          // 教科書窗
          ctx.save();
          ctx.globalAlpha = 0.16;
          ctx.fillStyle = p.success || p.primary;
          ctx.fillRect(xOfE(M.E_TH_MOD), T2, xOfE(M.E_TH_SUB) - xOfE(M.E_TH_MOD), B2 - T2);
          ctx.restore();
          // 實際可用窗
          if (api.ew.usable) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = p.success || p.primary;
            ctx.fillRect(xOfE(api.ew.lo), T2, xOfE(api.ew.hi) - xOfE(api.ew.lo), B2 - T2);
            ctx.restore();
          }
          // 兩條產額曲線
          var yMaxV = Math.max(M.yieldMod(eMax), 0.1);
          [[M.yieldMod, p.vizRadical || p.warning, "改質層產額"],
           [M.yieldSub, p.danger, "原始材料產額"]].forEach(function (cfg, idx) {
            ctx.strokeStyle = cfg[1];
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (var E = 0; E <= eMax; E += 1) {
              var yy = B2 - (cfg[0](E) / yMaxV) * (B2 - T2) * 0.9;
              if (E === 0) ctx.moveTo(xOfE(E), yy); else ctx.lineTo(xOfE(E), yy);
            }
            ctx.stroke();
            ctx.lineWidth = 1;
            ctx.save();
            ctx.font = "10px system-ui, sans-serif";
            ctx.fillStyle = cfg[1];
            ctx.textAlign = "right";
            ctx.fillText(cfg[2], R, T2 + 12 + idx * 12);
            ctx.restore();
          });
          // 游標
          ctx.save();
          ctx.strokeStyle = p.text;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(xOfE(s.energy), T2); ctx.lineTo(xOfE(s.energy), B2);
          ctx.stroke();
          ctx.font = "10px system-ui, sans-serif";
          ctx.fillStyle = p.text;
          ctx.textAlign = "center";
          ctx.fillText(s.energy + " eV", xOfE(s.energy), T2 - 3);
          ctx.restore();
          ctx.save();
          ctx.font = "10px system-ui, sans-serif";
          ctx.fillStyle = p.textSubtle || p.text;
          ctx.textAlign = "center";
          for (var ee = 0; ee <= eMax; ee += 30) ctx.fillText(String(ee), xOfE(ee), B2 + 12);
          ctx.textAlign = "left";
          ctx.fillText("離子能量 (eV)", L, B2 + 12);
          ctx.restore();

          /* ---------- 下:EPC vs 循環數 ---------- */
          ctx.strokeStyle = p.vizAxis || p.border;
          ctx.beginPath();
          ctx.moveTo(L, T3); ctx.lineTo(L, B3); ctx.lineTo(R, B3);
          ctx.stroke();
          var maxE = Math.max.apply(null, api.series.map(function (x) { return x.epc; }));
          var top = Math.max(maxE * 1.25, 0.05);
          var n = api.series.length;
          ctx.strokeStyle = p.primary;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (var j = 0; j < n; j++) {
            var px = L + (j / Math.max(1, n - 1)) * (R - L);
            var py = B3 - (api.series[j].epc / top) * (B3 - T3);
            if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.save();
          ctx.font = "10px system-ui, sans-serif";
          ctx.fillStyle = p.textSubtle || p.text;
          ctx.textAlign = "right";
          ctx.fillText(top.toFixed(2) + " ML", L - 3, T3 + 4);
          ctx.fillText("0", L - 3, B3);
          ctx.textAlign = "left";
          ctx.fillText("EPC vs 循環數(理想是水平線)", L + 4, T3 + 10);
          ctx.textAlign = "right";
          ctx.fillText(n + " 循環", R, B3 + 12);
          ctx.restore();
        },
      });
    },
    ["js/lab/ale-model.js"]
  );
})((window.PA = window.PA || {}));
