/* ==========================================================================
   A05 — Paschen 曲線互動
   章節 1.4 · 規格 docs/05-animation-spec.md  ★ 旗艦元件

   目標:讀懂 Paschen 曲線,理解左右兩支的物理成因。

   驗收條件(docs/05):五種氣體的最小值與 docs/01 §1.4.2 表格誤差 < 10%。
   這一點由 plasma-model.js 保證 —— A、B 係數由 (pd_min, V_min, γ) 反推,
   所以曲線最小值恆等於課文表格,不可能漂移。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define("A05", function () {
    var C = PA.controls;
    var M = PA.model;

    var GASES = [
      { key: "Ar", label: "Ar", token: "vizIonPos" },
      { key: "He", label: "He", token: "vizRadical" },
      { key: "N2", label: "N₂", token: "vizElectron" },
      { key: "Air", label: "Air", token: "vizPolymer" },
      { key: "O2", label: "O₂", token: "vizIonNeg" },
    ];

    return PA.lab.create({
      setup: function () {
        var api = this;

        api.state = {
          gas: "Ar",
          p: 10, // mTorr
          d: 3, // cm
          V: 500, // 施加電壓
          showAll: false,
        };

        var wrap = document.createElement("div");
        wrap.className = "pa-lab__split";
        var plotBox = document.createElement("div");
        var cellBox = document.createElement("div");
        wrap.appendChild(plotBox);
        wrap.appendChild(cellBox);
        api.stage.appendChild(wrap);

        api.plot = PA.plot.create({
          width: 640,
          height: 320,
          margin: { t: 16, r: 18, b: 46, l: 62 },
          x: { min: 0.01, max: 100, log: true, label: "p · d (Torr·cm)" },
          y: { min: 100, max: 5000, log: true, label: "崩潰電壓 V_b (V)" },
        });
        plotBox.appendChild(api.plot.svg);

        // 小型放電腔示意
        var cell = document.createElement("canvas");
        cell.setAttribute("role", "img");
        cell.setAttribute("aria-label", "放電腔示意:兩片電極與其間的氣體,點火時會發光");
        cellBox.appendChild(cell);
        api.cell = cell;
        var detach = PA.canvasTheme.autoSize(cell, cellBox, 16 / 9, function (ctx, w, h) {
          api.cctx = ctx;
          api.cw = w;
          api.ch = h;
        });
        api.onDestroy(detach);

        var readout = C.readout([
          { key: "pd", label: "p·d", digits: 3, unit: " Torr·cm" },
          {
            key: "vb",
            label: "崩潰電壓 V_b",
            format: function (v) {
              return isFinite(v) ? Math.round(v) + " V" : "此 pd 無法崩潰";
            },
          },
          {
            key: "margin",
            label: "餘裕 V − V_b",
            format: function (v) {
              return isFinite(v) ? Math.round(v) + " V" : "不足";
            },
          },
          { key: "branch", label: "位於", format: function (v) { return v; } },
        ]);
        api.readoutNode = readout;

        var gasCtl = C.segmented({
          label: "氣體",
          options: GASES.map(function (g) { return { value: g.key, label: g.label }; }),
          value: "Ar",
          onChange: function (v) { api.state.gas = v; api.refresh(); },
        });

        var pCtl = C.slider({
          label: "壓力 p",
          min: 1,
          max: 100000,
          value: 10,
          log: true,
          unit: "mTorr",
          format: function (v) {
            return v >= 1000 ? (v / 1000).toFixed(1) + " Torr" : Math.round(v) + " mTorr";
          },
          onChange: function (v) { api.state.p = v; api.refresh(); },
        });

        var dCtl = C.slider({
          label: "電極間距 d",
          min: 0.1,
          max: 10,
          value: 3,
          log: true,
          unit: "cm",
          digits: 2,
          onChange: function (v) { api.state.d = v; api.refresh(); },
        });

        var vCtl = C.slider({
          label: "施加電壓 V",
          min: 50,
          max: 5000,
          value: 500,
          log: true,
          unit: "V",
          digits: 0,
          onChange: function (v) { api.state.V = v; api.refresh(); },
        });

        var allCtl = C.toggle({
          label: "同時顯示所有氣體的曲線",
          value: false,
          onChange: function (v) { api.state.showAll = v; api.refresh(); },
        });

        var presetCtl = C.segmented({
          label: "現場情境",
          options: [
            { value: "process", label: "製程壓力" },
            { value: "min", label: "曲線谷底" },
            { value: "atm", label: "大氣" },
          ],
          onChange: function (v) {
            var s = api.state;
            if (v === "process") { s.p = 10; s.d = 3; }
            else if (v === "min") {
              var m = M.paschenMinimum(s.gas);
              s.d = 1;
              s.p = m.pd * 1000; // pd = p[Torr]·d[cm] → p[mTorr]
            } else { s.p = 760000; s.d = 0.1; }
            pCtl.setValue(s.p, true);
            dCtl.setValue(s.d, true);
            api.refresh();
          },
        });

        /** 重畫曲線、游標與數值面板 */
        api.refresh = function () {
          var pl = api.plot;
          var pal = PA.canvasTheme.palette();
          var s = api.state;
          pl.clear();

          var list = s.showAll ? GASES : GASES.filter(function (g) { return g.key === s.gas; });

          list.forEach(function (g) {
            var pts = pl.sample(function (pd) {
              return M.breakdownVoltage(pd, g.key);
            }, 240);
            pl.line(pts, {
              stroke: pal[g.token],
              width: g.key === s.gas ? 2.6 : 1.6,
              opacity: g.key === s.gas ? 1 : 0.55,
            });
            // 最小值標記 —— 與 docs/01 §1.4.2 表格同源
            var m = M.paschenMinimum(g.key);
            pl.dot(m.pd, m.V, { fill: pal[g.token], r: 4 });
            if (g.key === s.gas) {
              pl.label(m.pd, m.V, g.label + " 最小值 " + m.V + " V", {
                fill: pal[g.token],
                dx: 8,
                dy: 14,
                size: 11,
              });
            }
          });

          if (s.showAll) {
            pl.legend(
              GASES.map(function (g) { return { label: g.label, color: pal[g.token] }; }),
              pl.m.l + 14,
              pl.m.t + 14
            );
          }

          // 當前工作點
          var pd = (s.p / 1000) * s.d;
          var vb = M.breakdownVoltage(pd, s.gas);
          var lit = isFinite(vb) && s.V >= vb;

          pl.vline(pd, { stroke: pal.textSubtle, dash: "3 3", overlay: true });
          pl.hline(s.V, { stroke: pal.textSubtle, dash: "3 3", overlay: true });
          pl.dot(pd, Math.min(Math.max(s.V, 100), 5000), {
            fill: lit ? pal.success : pal.danger,
            r: 6,
            overlay: true,
          });
          pl.label(pd, Math.min(Math.max(s.V, 100), 5000), lit ? "點火 ✅" : "不點火 ❌", {
            fill: lit ? pal.success : pal.danger,
            dx: 9,
            dy: -8,
            overlay: true,
          });

          // 左支 / 右支
          var m0 = M.paschenMinimum(s.gas);
          var branch = pd < m0.pd ? "左支(碰撞太少)" : "右支(能量不足)";

          if (api.readoutNode) {
            api.readoutNode.update({
              pd: pd,
              vb: isFinite(vb) ? vb : Infinity,
              margin: isFinite(vb) ? s.V - vb : -Infinity,
              branch: branch,
            });
          }
        };

        api.el.appendChild(C.panel([gasCtl, pCtl, dCtl, vCtl, presetCtl, allCtl]));
        api.el.appendChild(readout);
        api.el.appendChild(
          C.observations([
            "按「曲線谷底」——  游標會落到最小值。對照 1.4.2 表格,Ar 應該是 pd=0.9、V=137 V。",
            "按「製程壓力」(10 mTorr、3 cm)—— pd 只有 0.03,你在左支,崩潰電壓高得離譜。這就是為什麼點火要先衝壓力。",
            "左支的物理:λ 太長,電子還沒撞到分子就到陽極了,碰撞次數不夠。右支相反:λ 太短,兩次碰撞間累積不到游離能。",
            "打開「所有氣體」—— He 的谷底在 pd=4 附近而且很淺,這是它容易點火、常被拿來當起弧氣體的原因。",
          ])
        );

        api.refresh();
      },

      reset: function () {
        this.state.gas = "Ar";
        this.state.p = 10;
        this.state.d = 3;
        this.state.V = 500;
        this.refresh();
      },

      draw: function () {
        var api = this;
        if (!api.cctx) return;
        var ctx = api.cctx;
        var p = PA.canvasTheme.palette();
        var w = api.cw;
        var h = api.ch;
        var s = api.state;

        var pdTorrCm = (s.p / 1000) * s.d;
        var vb = M.breakdownVoltage(pdTorrCm, s.gas);
        var lit = isFinite(vb) && s.V >= vb;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = p.bg;
        ctx.fillRect(0, 0, w, h);

        // 電極間距依 d 的對數縮放,視覺上看得出「間距變了」
        var t = (Math.log10(s.d) - Math.log10(0.1)) / (Math.log10(10) - Math.log10(0.1));
        var gap = (0.15 + 0.6 * t) * h;
        var cy = h / 2;
        var top = cy - gap / 2;
        var bot = cy + gap / 2;
        var mx = w * 0.12;

        // 輝光
        if (lit) {
          var g = ctx.createLinearGradient(0, top, 0, bot);
          var a = Math.min(0.55, 0.15 + (s.V / vb - 1) * 0.4);
          g.addColorStop(0, "rgba(150,110,220,0)");
          g.addColorStop(0.5, "rgba(160,120,235," + a + ")");
          g.addColorStop(1, "rgba(150,110,220,0)");
          ctx.fillStyle = g;
          ctx.fillRect(mx, top, w - 2 * mx, gap);
        }

        // 電極
        ctx.fillStyle = p.borderStrong;
        ctx.fillRect(mx, top - 8, w - 2 * mx, 8);
        ctx.fillRect(mx, bot, w - 2 * mx, 8);

        ctx.fillStyle = p.textSubtle;
        ctx.font = "11px system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText("陰極 −", mx + 4, top - 16);
        ctx.fillText("陽極 +", mx + 4, bot + 18);

        // d 標註
        ctx.save();
        ctx.strokeStyle = p.textSubtle;
        ctx.lineWidth = 1.2;
        var dx = mx - 12;
        ctx.beginPath();
        ctx.moveTo(dx, top);
        ctx.lineTo(dx, bot);
        ctx.moveTo(dx - 4, top);
        ctx.lineTo(dx + 4, top);
        ctx.moveTo(dx - 4, bot);
        ctx.lineTo(dx + 4, bot);
        ctx.stroke();
        ctx.fillStyle = p.textSubtle;
        ctx.save();
        ctx.translate(dx - 8, cy);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "center";
        ctx.fillText("d = " + (s.d < 1 ? s.d.toFixed(2) : s.d.toFixed(1)) + " cm", 0, 0);
        ctx.restore();
        ctx.restore();

        // 判定
        ctx.save();
        ctx.font = "600 15px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = lit ? p.success : p.danger;
        ctx.fillText(lit ? "✅ 點火" : "❌ 不點火", w / 2, h - 14);
        ctx.restore();
      },
    });
  });
})((window.PA = window.PA || {}));
