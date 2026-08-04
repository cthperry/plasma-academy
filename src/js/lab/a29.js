/* ==========================================================================
   A29 — 天線效應充電動畫
   章節 4.3 · 規格 docs/05-animation-spec.md

   左邊是機制(為什麼會充電),右邊是後果(閘極吃了多少)。

   ⚠️ 本元件與原規格有一處**刻意不同**,而且是實測推翻的:
   規格寫「天線比與閘極電位近似線性關係」。實測 log-log 斜率是
   **電位 0.078、劑量 0.979** —— 線性的是**劑量**,不是電位。
   所以讀數面板同時給「閘極電位」與「損傷劑量」,並讓學員自己掃一次天線比
   看見那個 12 倍的差距。診斷寫在 tools/check-charging.mjs 開頭。

   物理在 js/lab/charging-model.js,由 tools/check-charging.mjs 守住。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A29",
    function () {
      var C = PA.controls;
      var M = PA.charging;

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = {
            antennaRatioLog: 2.5, arFeature: 5, shaded: 1, te: 3, tox: 3,
            pulse: false, duty: 0.5, diode: false, stepTime: 60,
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
            "上圖為晶圓剖面:離子垂直入射到高深寬比結構底部,電子因等向入射被結構遮蔽,電荷沿導線匯集到閘極;下圖為閘極電位隨時間的變化與氧化層崩潰門檻。"
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
              antennaRatio: Math.pow(10, s.antennaRatioLog),
              arFeature: s.arFeature, shaded: s.shaded, te: s.te, tox: s.tox,
              pulse: s.pulse, duty: s.duty, freq: 5000, diode: s.diode,
              stepTime: s.stepTime, ne: 1e17,
            };
          };

          api.rebuild = function () {
            var p = api.params();
            api.p = p;
            api.dmg = M.damage(p);
            api.ceil = M.ceiling(p);
            api.refresh();
          };

          api.refresh = function () {
            var d = api.dmg;
            var p = api.p;
            if (api.readoutNode) {
              api.readoutNode.update({
                ratio: p.antennaRatio,
                ceiling: api.ceil.unbounded ? Infinity : api.ceil.v,
                vGate: d.steady.vMax,
                vMean: d.steady.vMean,
                eOx: d.eMaxMVcm,
                qInj: d.qInj,
                dose: d.margin,
                life: d.tBd,
              });
            }

            api.card.textContent = "";
            var head = document.createElement("div");
            head.className = "pa-map-card__head";
            var st = document.createElement("strong");
            st.textContent = p.pulse
              ? M.MODES.pulsed.label + "(duty " + Math.round(p.duty * 100) + " %)"
              : M.MODES.cw.label;
            head.appendChild(st);
            api.card.appendChild(head);

            var note = document.createElement("p");
            note.textContent = (p.pulse ? M.MODES.pulsed.note : M.MODES.cw.note).replace(/\*\*/g, "");
            api.card.appendChild(note);

            var diag = document.createElement("div");
            diag.className = "pa-diag";
            var rows = [
              [
                "電位天花板",
                api.ceil.unbounded ? "無上限" : api.ceil.v.toFixed(2) + " V",
                !api.ceil.unbounded && api.ceil.v < 8,
              ],
              ["氧化層場強", d.eMaxMVcm.toFixed(2) + " MV/cm", d.eMaxMVcm < 12],
              ["損傷劑量 q/Q_bd", d.margin.toExponential(2), d.margin < 0.1],
              [
                "硬崩潰(E ≥ 15 MV/cm)",
                d.hardBreak ? "是" : "否",
                !d.hardBreak,
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
            if (d.hardBreak) {
              verdict.textContent =
                "氧化層場強 " + d.eMaxMVcm.toFixed(1) +
                " MV/cm 已超過硬崩潰門檻 —— 這是瞬間的,與製程時間無關。脈衝救不了它(脈衝降的是平均值,不是尖峰),要降的是天花板本身:T_e、結構深寬比、或被遮蔽的面積比例。";
            } else if (d.wearOut) {
              verdict.textContent =
                "場強還撐得住,但 " + p.stepTime + " 秒下來注入電荷 " +
                d.qInj.toExponential(1) + " C/cm² 已超過 Q_bd " + d.qBd.toExponential(0) +
                " —— 這是磨耗失效,而它的時間**反比於天線比**。";
            } else if (d.margin > 0.05) {
              verdict.textContent =
                "尚未失效,但劑量已到 Q_bd 的 " + (d.margin * 100).toFixed(1) +
                " %。把天線比往右拉一格(×3.16)看劑量怎麼變 —— 再看電位變了多少。";
            } else {
              verdict.textContent =
                "目前安全:場強 " + d.eMaxMVcm.toFixed(1) + " MV/cm、劑量只有 Q_bd 的 " +
                d.margin.toExponential(1) + " 倍。把結構深寬比往右拉,看天花板怎麼漲。";
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
            { key: "ratio", label: "天線比 A_天線 / A_閘極", digits: 0, unit: " :1" },
            {
              key: "ceiling", label: "電子遮蔽電位天花板", digits: 2, unit: " V",
              format: function (v) { return isFinite(v) ? v.toFixed(2) : "無上限"; },
            },
            { key: "vGate", label: "閘極電位(尖峰)", digits: 3, unit: " V" },
            { key: "vMean", label: "閘極電位(時間平均)", digits: 3, unit: " V" },
            { key: "eOx", label: "氧化層電場", digits: 2, unit: " MV/cm" },
            { key: "qInj", label: "注入電荷", digits: 2, unit: " C/cm²", format: function (v) { return v.toExponential(2); } },
            { key: "dose", label: "損傷劑量 q / Q_bd", digits: 2, unit: "", format: function (v) { return v.toExponential(2); } },
            {
              key: "life", label: "到崩潰所需時間", digits: 0, unit: " s",
              format: function (v) { return isFinite(v) ? v.toExponential(2) : "∞"; },
            },
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
            label: "電漿模式",
            options: [
              { value: "cw", label: M.MODES.cw.label },
              { value: "pulsed", label: M.MODES.pulsed.label },
            ],
            value: "cw",
            onChange: function (v) { api.state.pulse = v === "pulsed"; api.rebuild(); },
          });

          var diodeCtl = C.toggle({
            label: "天線二極體",
            value: false,
            onChange: function (v) { api.state.diode = v; api.rebuild(); },
          });

          api.el.appendChild(
            C.panel([
              modeCtl, diodeCtl,
              knob("antennaRatioLog"), knob("arFeature"), knob("shaded"),
              knob("te"), knob("tox"), knob("duty"), knob("stepTime"),
            ])
          );
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "**先看上圖為什麼會充電。** 離子被鞘層加速,幾乎垂直落下,深溝擋不住它;電子是熱運動、近乎等向,深寬比 5 的孔底只收得到 **3.8 %** 的電子。收到的正電荷比負電荷多,底部就只能往正的方向浮,一直浮到把足夠的電子拉進來為止 —— 那個平衡點就是讀數裡的「電位天花板」。",
              "**把「結構深寬比」從 1 拉到 10。** 天花板從 2.1 V 漲到 13.9 V,而公式只有一個:V_天花板 = −T_e · ln(有效電子收集係數)。再往上拉到 12 以上,面板會顯示「**無上限**」—— 那表示即使把表面充到電漿電位,電子仍然補不回離子,電位會一路漲到氧化層導通為止。",
              "**把「電子溫度 T_e」從 3 減半到 1.5 eV,天花板剛好減半。** 天花板正比於 T_e,一次方,沒有別的。這就是「低 T_e 電漿源」(微波、表面波、遠端電漿)能減充電損傷的全部理由 —— 也說明它的天花板效果有限,因為 T_e 不可能降十倍。",
              "**現在做本元件最重要的一次操作:把「天線比」從 100 掃到 1000。** 閘極電位只從 4.09 V 漲到 4.85 V(**+19 %**),但「損傷劑量」從 2.2e-2 漲到 2.1e-1(**×9.5**)。⚠️ 這正是現場最常見的誤判:「電位只多了一點,應該還好」—— 電位確實只多一點,**劑量剛好翻十倍**。",
              "為什麼會這樣:電位由天花板決定(T_e 與深寬比),天線比改的是**單位閘極面積要吞多少電流**。而氧化層導通對電壓是指數的,所以再多的電流也只把電位推高一點點。**設計規則寫成面積比的上限,不是寫成電位的上限,就是這個道理。**",
              "**切到脈衝電漿。** 下圖的電位變成鋸齒 —— off 期電子冷下來(T_e → 0.3 eV)、遮蔽失效,累積的正電荷被中和,每個週期都被打回去約 78 %。損傷劑量幾乎剛好等於 duty:duty 20 % → 劑量剩 18 %。",
              "⚠️ **但脈衝不會降低尖峰電位。** 三種 duty 的 V_max 完全一樣。所以脈衝救得了「磨耗失效」(劑量累積),**救不了硬崩潰**(場強判準)。要壓尖峰只能動天花板:T_e、深寬比、遮蔽比例。",
              "**打開「天線二極體」。** 電位直接被箝在二極體導通電壓 0.6 V 附近,劑量掉將近六個數量級 —— 這是最有效的單一手段。代價是面積與接面漏電,而且**它只救得了充電損傷**:UV 光子損傷不需要導電路徑,二極體完全擋不住。",
              "**把「氧化層厚度」從 1.5 nm 掃到 10 nm,注意最危險的不是最薄的那一個。** 1.5 nm 的電位被自己的直接穿隧漏電壓在 0.6 V;10 nm 吃下整個天花板 9.8 V,但除以厚度之後場強只有 9.8 MV/cm。**硬崩潰只發生在 4–5 nm 這個中間帶** —— 電位夠高、厚度又不夠稀釋。所以先進製程真正被天線規則綁住的,往往是 I/O 元件而不是核心元件。",
              "最後把「被遮蔽的天線面積比例」從 100 % 降到 20 %:劑量掉六個數量級。因為沒被遮蔽的部分照樣收電子,而且收得很兇(電子飽和電流是離子的 108 倍)—— **一點點沒被遮蔽的面積就能把整個天線的電位拉回來**。這是版圖端最有效、也最常被忽略的一招。",
            ])
          );
        },

        reset: function () {
          this.state = {
            antennaRatioLog: 2.5, arFeature: 5, shaded: 1, te: 3, tox: 3,
            pulse: false, duty: 0.5, diode: false, stepTime: 60,
          };
          this.rebuild();
        },

        draw: function () {
          var api = this;
          if (!api.ctx || !api.dmg) return;
          var ctx = api.ctx;
          var p = PA.canvasTheme.palette();
          var w = api.width;
          var h = api.height;
          var s = api.state;
          var d = api.dmg;

          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = p.bg;
          ctx.fillRect(0, 0, w, h);

          var midY = h * 0.56;

          /* ================= 上:剖面與入射 ================= */
          var L = 16, R = w - 16;
          var top = 14;
          var surf = top + (midY - top) * 0.34;      // 晶圓表面
          var featBot = surf + (midY - surf) * 0.52; // 溝底

          // 溝槽:寬度由深寬比決定(深度固定,寬度 = 深度/AR)
          var depth = featBot - surf;
          var fw = Math.max(6, depth / Math.max(1, s.arFeature));
          var cx = L + (R - L) * 0.3;

          // 金屬層(天線)
          ctx.fillStyle = p.vizMask || p.border;
          ctx.fillRect(L, surf, cx - fw / 2 - L, depth);
          ctx.fillRect(cx + fw / 2, surf, R - 0.42 * (R - L) - (cx + fw / 2), depth);

          // 導線:從天線橫過去接到閘極
          var gateX = L + (R - L) * 0.78;
          var gateW = (R - L) * 0.1;
          ctx.strokeStyle = p.vizFilm || p.primary;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx, featBot);
          ctx.lineTo(cx, featBot + 10);
          ctx.lineTo(gateX + gateW / 2, featBot + 10);
          ctx.lineTo(gateX + gateW / 2, midY - 34);
          ctx.stroke();
          ctx.lineWidth = 1;

          // 閘極 + 氧化層 + 基板
          var oxY = midY - 30;
          ctx.fillStyle = p.vizFilm || p.primary;
          ctx.fillRect(gateX, oxY - 12, gateW, 12);
          // 氧化層厚度視覺化(誇張顯示,標註真值)
          var oxH = 3 + (s.tox / 10) * 9;
          ctx.fillStyle = d.hardBreak ? p.danger : p.vizPolymer || p.vizMask;
          ctx.fillRect(gateX, oxY, gateW, oxH);
          ctx.fillStyle = p.vizSubstrate || p.border;
          ctx.fillRect(L, oxY + oxH, R - L, midY - (oxY + oxH));

          // 入射粒子:離子垂直、電子散開
          var rnd = (function () {
            var seed = 12345;
            return function () { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
          })();
          ctx.save();
          // 離子(垂直,進得了溝底)
          ctx.strokeStyle = p.vizIonPos || p.danger;
          ctx.globalAlpha = 0.85;
          for (var i = 0; i < 26; i++) {
            var x = L + ((i + 0.5) / 26) * (R - L);
            var yTop = top;
            var yEnd = x > cx - fw / 2 && x < cx + fw / 2 ? featBot : surf;
            ctx.beginPath();
            ctx.moveTo(x, yTop);
            ctx.lineTo(x, yEnd - 2);
            ctx.stroke();
          }
          // 電子(等向,大多打在側壁上緣)
          ctx.strokeStyle = p.vizElectron || p.primary;
          ctx.globalAlpha = 0.65;
          var pass = M.transmission(s.arFeature);
          for (var k = 0; k < 26; k++) {
            var ex = L + rnd() * (R - L);
            var ang = (rnd() - 0.5) * 1.7;
            var ey = surf;
            var tx = ex + Math.tan(ang) * (surf - top);
            // 只有很小的比例進得了溝底
            var inSlot = tx > cx - fw / 2 && tx < cx + fw / 2;
            if (inSlot && rnd() < pass) ey = featBot;
            else if (inSlot) ey = surf + depth * 0.25;
            ctx.beginPath();
            ctx.moveTo(ex, top);
            ctx.lineTo(tx, ey - 2);
            ctx.stroke();
          }
          ctx.restore();

          // 標註
          ctx.save();
          ctx.font = "10px system-ui, sans-serif";
          ctx.fillStyle = p.textSubtle || p.text;
          ctx.textAlign = "left";
          ctx.fillText("離子:垂直(進得了溝底)", L, top - 3);
          ctx.textAlign = "right";
          ctx.fillText("電子:等向,穿透率 " + (pass * 100).toFixed(2) + " %", R, top - 3);
          ctx.textAlign = "center";
          ctx.fillStyle = p.text;
          ctx.fillText("天線(金屬圖形)", cx - fw / 2 - (cx - fw / 2 - L) / 2, surf - 4);
          ctx.fillText("閘極", gateX + gateW / 2, oxY - 15);
          ctx.fillText("t_ox " + s.tox.toFixed(1) + " nm", gateX + gateW / 2, oxY + oxH + 12);
          ctx.fillText("基板", L + 30, oxY + oxH + 14);
          ctx.fillText("AR " + s.arFeature.toFixed(1) + ":1", cx, featBot + 22);
          ctx.restore();

          /* ================= 下:電位對時間 ================= */
          var T = midY + 26;
          var B = h - 26;
          var series = d.steady.series;
          var tMax = d.steady.window;
          var vHard = 1.5 * s.tox;   // 15 MV/cm × t_ox[nm]×10⁻⁷ cm = 1.5 × t_ox 伏特
          var vTop = Math.max(vHard * 1.15, d.steady.vMax * 1.2, 0.5);

          ctx.strokeStyle = p.vizAxis || p.border;
          ctx.beginPath();
          ctx.moveTo(L + 30, T);
          ctx.lineTo(L + 30, B);
          ctx.lineTo(R, B);
          ctx.stroke();

          var xOf = function (t) { return L + 30 + (t / tMax) * (R - L - 30); };
          var yOf = function (v) { return B - (Math.max(0, v) / vTop) * (B - T); };

          // 硬崩潰門檻
          ctx.save();
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = p.danger;
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.moveTo(L + 30, yOf(vHard));
          ctx.lineTo(R, yOf(vHard));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = "10px system-ui, sans-serif";
          ctx.fillStyle = p.danger;
          ctx.textAlign = "left";
          ctx.fillText("硬崩潰 15 MV/cm", L + 34, yOf(vHard) - 3);
          ctx.restore();

          // 天花板
          if (!api.ceil.unbounded && api.ceil.v < vTop) {
            ctx.save();
            ctx.setLineDash([2, 4]);
            ctx.strokeStyle = p.textSubtle || p.text;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(L + 30, yOf(api.ceil.v));
            ctx.lineTo(R, yOf(api.ceil.v));
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.font = "10px system-ui, sans-serif";
            ctx.fillStyle = p.textSubtle || p.text;
            ctx.textAlign = "right";
            ctx.fillText("電子遮蔽天花板 " + api.ceil.v.toFixed(1) + " V", R, yOf(api.ceil.v) - 3);
            ctx.restore();
          }

          // 電位曲線
          ctx.strokeStyle = d.hardBreak ? p.danger : p.primary;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (var j = 0; j < series.length; j++) {
            var px = xOf(series[j].t);
            var py = yOf(series[j].v);
            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.lineWidth = 1;

          ctx.save();
          ctx.font = "10px system-ui, sans-serif";
          ctx.fillStyle = p.textSubtle || p.text;
          ctx.textAlign = "right";
          ctx.fillText(vTop.toFixed(1) + " V", L + 27, T + 4);
          ctx.fillText("0", L + 27, B);
          ctx.fillText((tMax * 1000).toFixed(1) + " ms", R, B + 14);
          ctx.textAlign = "left";
          ctx.fillText("閘極電位", L + 34, T + 4);
          ctx.restore();
        },
      });
    },
    ["js/lab/charging-model.js"]
  );
})((window.PA = window.PA || {}));
