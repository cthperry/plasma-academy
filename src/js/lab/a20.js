/* ==========================================================================
   A20 — ARDE 深寬比效應動畫
   章節 3.3 · 規格 docs/05-animation-spec.md

   目標:理解 ARDE 的四個成因,以及為什麼延長時間解決不了。

   五條不同 CD 的溝槽並排同時蝕刻,右側即時畫「深度 vs 深寬比」。
   **四個成因可以個別關掉** —— 這是本元件的重點:
   讓人看到各自貢獻多少,而不是把 ARDE 當成沒有內部結構的黑箱。

   物理在 js/lab/arde-model.js,由 tools/check-arde.mjs 的 18 項斷言守住。
   ⚠️ 已知限制:模型做得到「高聚合區把 ARDE 壓小」,但做不到**反向 ARDE**
   (窄的反而更深)。原因與修法記在 docs/11,課文也如實標註。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A20",
    function () {
      var C = PA.controls;
      var M = PA.arde;

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = {
            pressure: 20, sticking: 0.25, polyStrength: 0, pulseDuty: 1,
            time: 10, preset: "normal",
            on: { knudsen: true, shadow: true, product: true, charging: true },
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
            "五條不同線寬的溝槽並排同時蝕刻,窄的明顯比寬的淺。右側是深度對深寬比的曲線。"
          );
          canvasBox.appendChild(canvas);
          api.canvas = canvas;

          var card = document.createElement("div");
          card.className = "pa-map-card";
          sideBox.appendChild(card);
          api.card = card;

          api.modelState = function () {
            return {
              pressure: api.state.pressure,
              sticking: api.state.sticking,
              polyStrength: api.state.polyStrength,
              pulseDuty: api.state.pulseDuty,
              on: api.state.on,
            };
          };

          api.rebuild = function () {
            api.results = M.run(api.modelState(), api.state.time);
            api.contrib = M.contributions(api.modelState(), 3);
            api.refresh();
          };

          api.refresh = function () {
            var r = api.results;
            if (!r) return;
            var arde = M.ardeMagnitude(r);
            if (api.readoutNode) {
              api.readoutNode.update({
                arde: arde * 100,
                wide: r[0].depth,
                narrow: r[r.length - 1].depth,
                arWide: r[0].ar,
                arNarrow: r[r.length - 1].ar,
                verdict: arde < 0 ? "反向 ARDE(窄的反而深)" : arde < 0.15 ? "ARDE 輕微" : arde < 0.3 ? "ARDE 中等" : "ARDE 明顯",
              });
            }
            api.card.textContent = "";
            var head = document.createElement("div");
            head.className = "pa-map-card__head";
            var st = document.createElement("strong");
            st.textContent = "四個成因各自貢獻多少";
            head.appendChild(st);
            api.card.appendChild(head);

            var keys = ["knudsen", "shadow", "product", "charging"];
            keys.forEach(function (k) {
              var row = document.createElement("div");
              row.className = "pa-map-card__row";
              var ks = document.createElement("span");
              ks.className = "pa-map-card__key";
              ks.textContent = M.LABELS[k] + (api.state.on[k] ? "" : "(已關)");
              var vs = document.createElement("span");
              vs.textContent = api.state.on[k]
                ? (api.contrib[k] * 100).toFixed(1) + " 個百分點"
                : "—";
              row.appendChild(ks);
              row.appendChild(vs);
              api.card.appendChild(row);
            });

            var pr = M.PRESETS.filter(function (x) { return x.key === api.state.preset; })[0];
            if (pr) {
              var p = document.createElement("p");
              p.textContent = pr.why;
              api.card.appendChild(p);
            }
          };

          var detach = PA.canvasTheme.autoSize(canvas, canvasBox, 3 / 4, function (ctx, w, h) {
            api.ctx = ctx;
            api.width = w;
            api.height = h;
            if (!api.booted) { api.booted = true; api.rebuild(); }
          });
          api.onDestroy(detach);

          var readout = C.readout([
            { key: "arde", label: "ARDE 程度", digits: 1, unit: " %" },
            { key: "wide", label: "最寬 CD 深度", digits: 2, unit: "" },
            { key: "narrow", label: "最窄 CD 深度", digits: 2, unit: "" },
            { key: "arWide", label: "最寬的深寬比", digits: 1, unit: "" },
            { key: "arNarrow", label: "最窄的深寬比", digits: 1, unit: "" },
            { key: "verdict", label: "判定", format: function (v) { return v; } },
          ]);
          api.readoutNode = readout;

          var ctrls = {};
          function knob(key) {
            var r = M.RANGES[key];
            var sl = C.slider({
              label: r.label, min: r.min, max: r.max, step: r.step,
              unit: r.unit, digits: r.step < 1 ? 2 : 0, value: api.state[key],
              onChange: function (v) {
                if (api.state[key] === v) return;
                api.state[key] = v;
                api.rebuild();
              },
            });
            ctrls[key] = sl;
            return sl;
          }

          function causeToggle(key) {
            return C.toggle({
              label: M.LABELS[key],
              value: true,
              onChange: function (v) {
                api.state.on[key] = v;
                api.rebuild();
              },
            });
          }

          var presetCtl = C.segmented({
            label: "配方",
            options: M.PRESETS.map(function (p) { return { value: p.key, label: p.label }; }),
            value: "normal",
            onChange: function (v) {
              var pr = M.PRESETS.filter(function (x) { return x.key === v; })[0];
              if (!pr) return;
              api.state.preset = v;
              Object.keys(pr.state).forEach(function (k) {
                api.state[k] = pr.state[k];
                if (ctrls[k] && ctrls[k].setValue) ctrls[k].setValue(pr.state[k], true);
              });
              api.rebuild();
            },
          });

          api.el.appendChild(
            C.panel([
              presetCtl,
              knob("time"), knob("pressure"), knob("sticking"),
              knob("polyStrength"), knob("pulseDuty"),
              causeToggle("knudsen"), causeToggle("shadow"),
              causeToggle("product"), causeToggle("charging"),
            ])
          );
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "五條溝槽**同時開始、同時結束**,深度卻差了三成以上。這就是 ARDE:同一個配方,線寬不同結果就不同。",
              "**把「蝕刻時間」拉長**:窄溝槽的深度確實有增加,但看「ARDE 程度」—— 它**反而變大**。因為速率隨深寬比持續下降,窄的越刻越慢,差距越拉越開。**這就是為什麼 ARDE 不能靠延長時間解決** —— 多給的時間,寬的拿走的比窄的多。",
              "**把四個成因逐一關掉**,看右側各自的貢獻。在典型條件下,Knudsen 傳輸限制與孔底充電是兩個大頭,產物排出最小。四項全關時 ARDE 歸零 —— 深度差不是憑空冒出來的。",
              "**降壓**是最常用的第一個旋鈕。它同時改善兩件事:鞘層碰撞變少 → 離子角度發散小 → 遮蔽減少;背景變稀 → 產物好排。代價是化學蝕刻成分下降。",
              "**脈衝電漿**對付的是充電那一項:off 期讓電子進得來中和孔底的正電荷。把工作週期從 1 降到 0.4,充電的貢獻明顯縮小 —— 代價是平均速率下降。",
              "**自由基黏著係數**是 Knudsen 那一項的主旋鈕。黏著係數低的自由基在孔壁上彈很多次也不會被吃掉,深孔裡的供應好得多 —— 和 3.4 的 TEOS 為什麼比 SiH₄ 好是同一個道理。",
              "切到「高聚合區」:ARDE 被壓小(約 27 % → 18 %)。聚合物前驅物是大分子、黏著係數接近 1,**比自由基更進不去窄孔**,所以窄孔要清掉的鈍化反而少。⚠️ 真實製程再往這個方向走會出現**反向 ARDE**(窄的反而更深),本模型只做到壓小、沒做到翻負 —— 課文有說明原因。",
            ])
          );
        },

        reset: function () {
          this.state = {
            pressure: 20, sticking: 0.25, polyStrength: 0, pulseDuty: 1,
            time: 10, preset: "normal",
            on: { knudsen: true, shadow: true, product: true, charging: true },
          };
          this.rebuild();
        },

        draw: function () {
          var api = this;
          if (!api.ctx || !api.results) return;
          var ctx = api.ctx;
          var p = PA.canvasTheme.palette();
          var w = api.width;
          var h = api.height;
          var r = api.results;

          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = p.bg;
          ctx.fillRect(0, 0, w, h);

          /* ---- 左:五條溝槽剖面 ---- */
          var leftW = w * 0.56;
          var topY = 30;
          var maxDepth = Math.max(4, r[0].depth * 1.15);
          var floorY = h - 28;
          var band = leftW / r.length;

          ctx.save();
          ctx.font = "11px system-ui, sans-serif";
          ctx.fillStyle = p.text;
          ctx.fillText("五種 CD 同時蝕刻", 8, 16);
          ctx.restore();

          for (var i = 0; i < r.length; i++) {
            var cx = band * (i + 0.5);
            var halfW = (band * 0.42) * r[i].width;
            var d = (r[i].depth / maxDepth) * (floorY - topY);
            // 基材
            ctx.fillStyle = p.vizSubstrate;
            ctx.fillRect(cx - band * 0.44, topY, band * 0.88, floorY - topY);
            // 溝
            ctx.fillStyle = p.bg;
            ctx.fillRect(cx - halfW, topY, halfW * 2, d);
            // 溝壁描邊
            ctx.strokeStyle = p.vizIonPos;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(cx - halfW, topY);
            ctx.lineTo(cx - halfW, topY + d);
            ctx.lineTo(cx + halfW, topY + d);
            ctx.lineTo(cx + halfW, topY);
            ctx.stroke();
            ctx.lineWidth = 1;
            // 標籤
            ctx.save();
            ctx.font = "10px system-ui, sans-serif";
            ctx.fillStyle = p.textSubtle || p.text;
            ctx.textAlign = "center";
            ctx.fillText("CD " + r[i].width.toFixed(2), cx, h - 14);
            ctx.fillText("AR " + r[i].ar.toFixed(1), cx, topY + d + 12);
            ctx.restore();
          }

          /* ---- 右:深度 vs 深寬比 ---- */
          var gx = leftW + 34;
          var gw = w - gx - 12;
          var gy = 40;
          var gh = h - gy - 40;
          ctx.save();
          ctx.font = "11px system-ui, sans-serif";
          ctx.fillStyle = p.text;
          ctx.fillText("深度 vs 名目深寬比", gx - 24, 16);
          ctx.restore();

          ctx.strokeStyle = p.vizGrid || p.border;
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx, gy + gh);
          ctx.lineTo(gx + gw, gy + gh);
          ctx.stroke();

          // 名目深寬比 = 目標深度 / CD,用最寬那條的深度當目標
          var nominal = r.map(function (x) { return r[0].depth / x.width; });
          var maxNom = Math.max.apply(null, nominal);
          ctx.strokeStyle = p.primary;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (var k = 0; k < r.length; k++) {
            var px = gx + (nominal[k] / maxNom) * gw;
            var py = gy + gh - (r[k].depth / maxDepth) * gh;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.lineWidth = 1;
          for (var k2 = 0; k2 < r.length; k2++) {
            var px2 = gx + (nominal[k2] / maxNom) * gw;
            var py2 = gy + gh - (r[k2].depth / maxDepth) * gh;
            ctx.fillStyle = p.primary;
            ctx.beginPath();
            ctx.arc(px2, py2, 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
          // 「沒有 ARDE 的話」參考線
          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = p.textSubtle || p.text;
          ctx.globalAlpha = 0.55;
          var refY = gy + gh - (r[0].depth / maxDepth) * gh;
          ctx.beginPath();
          ctx.moveTo(gx, refY);
          ctx.lineTo(gx + gw, refY);
          ctx.stroke();
          ctx.restore();
          ctx.save();
          ctx.font = "10px system-ui, sans-serif";
          ctx.fillStyle = p.textSubtle || p.text;
          ctx.fillText("沒有 ARDE 的話", gx + 4, refY - 5);
          ctx.textAlign = "right";
          ctx.fillText("名目 AR →", gx + gw, gy + gh + 14);
          ctx.restore();
        },
      });
    },
    ["js/lab/arde-model.js"]
  );
})((window.PA = window.PA || {}));
