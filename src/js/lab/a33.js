/* ==========================================================================
   A33 — 封裝電漿處理計算器
   章節 3.7 · 規格 docs/05-animation-spec.md

   目標:讓學員親眼看到「封裝電漿的製程窗有上限」。

   這件事與前段的直覺相反,所以元件的主角是**接著力曲線先升後降**:
   接觸角是單調的(越做越小),但接著力不是 —— 損傷會把它拉下來。
   只看接觸角的人會把製程開在曲線的右半邊,而那裡的接著力比左邊差。

   物理全部在 js/lab/package-model.js,由 tools/check-package.mjs 以
   34 項斷言守住,所以畫面上的數字與課文不可能漂移。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A33",
    function () {
      var C = PA.controls;
      var M = PA.packageModel;

      /** 四個現場情境 —— 對應 3.7.1 的四個用途 */
      var PRESETS = [
        {
          key: "mold", label: "封膠前活化",
          p: { gas: "o2", material: "emc", power: 300, pressure: 0.4, time: 60, mode: "lp" },
          why: "EMC 界面是分層失效的主要位置。O₂ 把表面能推高,接觸角要打到 30° 以下。",
        },
        {
          key: "bond", label: "打線前 pad 清潔",
          p: { gas: "h2ar", material: "cu", power: 250, pressure: 0.4, time: 60, mode: "lp" },
          why: "Cu pad 要的是**去氧化**,不是活化。只有還原性氣體做得到 —— 換 O₂ 會直接害它不沾。",
        },
        {
          key: "flux", label: "助焊劑殘留去除",
          p: { gas: "o2", material: "sm", power: 300, pressure: 0.5, time: 45, mode: "lp" },
          why: "綠漆是四種材料裡最不耐打的。時間拉長一點就粉化,製程窗最窄。",
        },
        {
          key: "inline", label: "大氣電漿(inline)",
          p: { gas: "n2", material: "emc", power: 300, pressure: 760, time: 45, mode: "atm" },
          why: "不必抽真空、可接產線,但熱負荷高得多 —— 時間上限比低壓短很多。",
        },
      ];

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = Object.assign({}, PRESETS[0].p, { preset: "mold", wait: 0 });

          var wrap = document.createElement("div");
          wrap.className = "pa-lab__split";
          var plotBox = document.createElement("div");
          var sideBox = document.createElement("div");
          wrap.appendChild(plotBox);
          wrap.appendChild(sideBox);
          api.stage.appendChild(wrap);

          api.plot = PA.plot.create({
            width: 560,
            height: 300,
            margin: { t: 18, r: 20, b: 46, l: 56 },
            x: { min: 0, max: 240, tickCount: 4, label: "處理時間 [s]",
                 format: function (v) { return v.toFixed(0); } },
            y: { min: 0, max: 90, tickCount: 5, label: "接觸角 [°] / 接著力 ×30",
                 format: function (v) { return v.toFixed(0); } },
          });
          api.plot.svg.setAttribute(
            "aria-label",
            "接觸角與接著力隨處理時間的變化。接觸角單調下降,但接著力先升後降 —— " +
              "封裝電漿的製程窗有上限。"
          );
          plotBox.appendChild(api.plot.svg);

          var card = document.createElement("div");
          card.className = "pa-map-card";
          sideBox.appendChild(card);
          api.card = card;

          var readout = C.readout([
            { key: "angle", label: "接觸角", digits: 0, unit: " °" },
            { key: "gamma", label: "表面能", digits: 1, unit: " mN/m" },
            { key: "adh", label: "接著力指數", digits: 2, unit: " ×" },
            { key: "dmg", label: "基材損傷", digits: 0, unit: " %" },
            { key: "oxide", label: "金屬氧化", format: function (v) { return v; } },
            { key: "queue", label: "Queue time 上限", format: function (v) { return v; } },
            { key: "verdict", label: "判定", format: function (v) { return v; } },
          ]);
          api.readoutNode = readout;

          /** 掃時間,畫出兩條曲線 —— 這是元件的主角 */
          api.refresh = function () {
            var s = api.state;
            var r = M.evaluate(s);
            var maxT = s.mode === "atm" ? 150 : 240;

            var angleCurve = [];
            var adhCurve = [];
            for (var t = 0; t <= maxT; t += 3) {
              var e = M.evaluate(Object.assign({}, s, { time: t }));
              angleCurve.push([t, e.angle]);
              // 接著力乘 30 才能與接觸角共用同一個 y 軸
              adhCurve.push([t, e.adhesion * 30]);
            }

            var pal = PA.canvasTheme.palette();
            var pl = api.plot;
            var adhColor = pal.vizIonPos || pal.warning;
            pl.clear();
            // 30° 規格線 —— 課文 3.7.4 的常見判準
            pl.hline(30, { stroke: pal.danger, dash: "5 3" });
            pl.label(maxT * 0.03, 30, "規格 30°", { fill: pal.danger, dy: -6, size: 11 });
            pl.line(angleCurve, { stroke: pal.primary, width: 2.4 });
            pl.line(adhCurve, { stroke: adhColor, width: 2.4, dash: "3 3" });
            pl.dot(s.time, r.angle, { fill: pal.primary, r: 4.5 });
            pl.dot(s.time, r.adhesion * 30, { fill: adhColor, r: 4.5 });
            pl.legend(
              [
                { label: "接觸角 [°]", color: pal.primary },
                { label: "接著力 ×30", color: adhColor },
              ],
              pl.m.l + 16,
              pl.m.t + 14
            );
            /*
               這裡**不**把兩條曲線改成氣體色 —— 它們是兩個不同的物理量
               (接觸角 vs 接著力),而本元件的主張正是「兩者會分道」,
               顏色必須留給量的區分。換氣體時兩條**都**會動,沒有哪一條
               是「氣體那條」。
               改成在圖上標一個氣體色的標籤:圖隨時說得出自己畫的是哪支氣體,
               而且顏色與其他元件的同一支氣體一致。
            */
            pl.label(maxT * 0.97, 87, r.gas.label, {
              fill: PA.canvasTheme.gasColor(s.gas, pal),
              anchor: "end",
              size: 13,
            });

            if (api.readoutNode) {
              api.readoutNode.update({
                angle: r.angle,
                gamma: r.gamma,
                adh: r.adhesion,
                dmg: r.damage * 100,
                oxide: r.material.metal ? (r.oxide * 100).toFixed(0) + " %" : "不適用(非金屬)",
                queue:
                  r.queueHours === Infinity
                    ? "不受限"
                    : r.queueHours < 1
                    ? "尚未達標"
                    : r.queueHours.toFixed(0) + " 小時",
                verdict: r.verdict,
              });
            }

            // 說明卡
            var pr = PRESETS.filter(function (x) { return x.key === api.state.preset; })[0];
            api.card.textContent = "";
            function row(k, v) {
              var d = document.createElement("div");
              d.className = "pa-map-card__row";
              var ks = document.createElement("span");
              ks.className = "pa-map-card__key";
              ks.textContent = k;
              var vs = document.createElement("span");
              vs.textContent = v;
              d.appendChild(ks);
              d.appendChild(vs);
              api.card.appendChild(d);
            }
            var head = document.createElement("div");
            head.className = "pa-map-card__head";
            var st = document.createElement("strong");
            st.textContent = pr ? pr.label : "自訂條件";
            head.appendChild(st);
            api.card.appendChild(head);
            if (pr) {
              var p = document.createElement("p");
              p.textContent = pr.why;
              api.card.appendChild(p);
            }
            row("氣體", r.gas.label + " —— " + r.gas.why);
            row("材料", r.material.label + " —— " + r.material.note);
            row("熱負荷", r.thermal.toFixed(1) + (r.thermal > 3.2 ? "(超過上限)" : ""));
          };

          var ctrls = {};
          function setPreset(key) {
            var pr = PRESETS.filter(function (x) { return x.key === key; })[0];
            if (!pr) return;
            api.state.preset = key;
            Object.keys(pr.p).forEach(function (k) {
              api.state[k] = pr.p[k];
              if (ctrls[k] && ctrls[k].setValue) ctrls[k].setValue(pr.p[k], true);
            });
            api.refresh();
          }

          var presetCtl = C.segmented({
            label: "四個現場情境",
            options: PRESETS.map(function (p) { return { value: p.key, label: p.label }; }),
            value: "mold",
            onChange: setPreset,
          });

          ctrls.gas = C.segmented({
            label: "氣體",
            options: M.gases.map(function (g) { return { value: g.id, label: g.label }; }),
            value: api.state.gas,
            onChange: function (v) { api.state.gas = v; api.refresh(); },
          });
          ctrls.material = C.segmented({
            label: "材料",
            options: M.materials.map(function (m) { return { value: m.id, label: m.label }; }),
            value: api.state.material,
            onChange: function (v) { api.state.material = v; api.refresh(); },
          });
          ctrls.mode = C.segmented({
            label: "電漿型式",
            options: [
              { value: "lp", label: "低壓(真空)" },
              { value: "atm", label: "大氣(APPJ)" },
            ],
            value: api.state.mode,
            onChange: function (v) { api.state.mode = v; api.refresh(); },
          });
          ctrls.time = C.slider({
            label: "處理時間", min: 0, max: 240, step: 5, unit: "s", digits: 0,
            value: api.state.time,
            onChange: function (v) { api.state.time = v; api.refresh(); },
          });
          ctrls.power = C.slider({
            label: "功率", min: 50, max: 800, step: 25, unit: "W", digits: 0,
            value: api.state.power,
            onChange: function (v) { api.state.power = v; api.refresh(); },
          });
          ctrls.pressure = C.slider({
            label: "壓力(低壓模式)", min: 0.05, max: 1.5, step: 0.05, unit: "Torr", digits: 2,
            value: api.state.pressure,
            onChange: function (v) { api.state.pressure = v; api.refresh(); },
          });

          api.el.appendChild(
            C.panel([presetCtl, ctrls.gas, ctrls.material, ctrls.mode,
                     ctrls.time, ctrls.power, ctrls.pressure])
          );
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "**先看兩條曲線的形狀差別。** 接觸角(實線)是單調下降的 —— 做越久越小。接著力(虛線)不是:它先升後降。只看接觸角的人會把製程開在曲線右半邊,而那裡的接著力比峰值差。",
              "「封膠前活化」預設把時間從 60 s 拉到 150 s:接觸角只從 17° 掉到 9°(幾乎沒好處),但基材損傷衝到 60 % 以上,接著力從 1.41 掉到 0.7 以下 —— 比不處理還糟。**這是本元件最重要的一件事。**",
              "切到「打線前 pad 清潔」(Cu + H₂/Ar),把氣體換成 O₂:氧化從 16 % 跳到 79 %,判定變成「打線會不沾(NSOP)」。Cu pad 要的是還原,不是活化 —— O₂ 在這裡是幫倒忙。",
              "同一個 Cu 條件下注意「接觸角」對金屬沒有意義:角度還有 55°,判定卻是「金屬表面乾淨」。金屬看的是氧化狀態與拉力,不是水滴。",
              "切到「大氣電漿」:同樣 300 W、同樣時間,熱負荷是低壓的 3 倍以上,時間上限因此短很多。這就是為什麼要進窄縫或深孔時得回頭用低壓。",
              "比較三種有機材料(EMC / PI / 綠漆)在同條件下的損傷:綠漆最不耐、PI 最耐。綠漆的製程窗窄到必須另外訂 recipe。",
              "看「Queue time 上限」這一欄:它是由疏水回復算出來的,不是規定出來的。回復快的綠漆只有幾小時,PI 撐得比較久 —— 這就是封裝廠排程的硬約束。",
            ])
          );

          setPreset("mold");
        },

        reset: function () {
          this.state = Object.assign({}, PRESETS[0].p, { preset: "mold", wait: 0 });
          this.refresh();
        },

        draw: function () {
          if (this.refresh) this.refresh();
        },
      });
    },
    ["js/lab/package-model.js"]
  );
})((window.PA = window.PA || {}));
