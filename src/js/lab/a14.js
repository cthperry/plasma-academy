/* ==========================================================================
   A14 — CCP vs ICP 耦合對比 + E/H 模式跳變
   章節 2.5 · 規格 docs/05-animation-spec.md

   目標:對比兩種功率耦合方式,親眼看到模式跳變與遲滯。

   驗收條件(docs/05):遲滯迴圈明確可見;上跳點與下跳點不同。

   遲滯不是畫上去的:E 與 H 兩個分支各自是一條 n_e(P) 曲線,
   系統「停在目前這一支」直到它不再存在為止 —— 這就是雙穩態的定義。
   上跳點與下跳點因此天然不同,不需要另外寫規則。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define("A14", function () {
    var C = PA.controls;

    // E→H 上跳與 H→E 下跳的功率門檻 [W]
    var P_UP = 600;
    var P_DOWN = 450;

    return PA.lab.create({
      setup: function () {
        var api = this;
        api.state = { P: 300, p: 20, sweep: 0 };
        api.mode = "E"; // 目前停在哪一支
        api.trace = []; // 掃描軌跡,用來畫出遲滯迴圈

        var wrap = document.createElement("div");
        wrap.className = "pa-lab__split";
        var canvasBox = document.createElement("div");
        var plotBox = document.createElement("div");
        wrap.appendChild(canvasBox);
        wrap.appendChild(plotBox);
        api.stage.appendChild(wrap);

        var canvas = document.createElement("canvas");
        canvas.setAttribute("role", "img");
        canvas.setAttribute(
          "aria-label",
          "左右並排的 CCP 與 ICP 腔體剖面。CCP 靠振盪的鞘層邊界拍打電子加熱," +
            "ICP 靠線圈感應出的方位角電場加速電子。ICP 在功率門檻處會從暗淡的 E-mode " +
            "跳到明亮的 H-mode,密度躍升兩個數量級。"
        );
        canvasBox.appendChild(canvas);
        api.canvas = canvas;

        api.sys = PA.particles.create({ max: 700, width: 100, height: 100 });

        api.plot = PA.plot.create({
          width: 540,
          height: 300,
          margin: { t: 18, r: 20, b: 46, l: 62 },
          x: { min: 100, max: 2000, tickCount: 5, label: "Source 功率 (W)", format: function (v) { return v.toFixed(0); } },
          y: { min: 1e9, max: 1e13, log: true, label: "電子密度 n_e (cm⁻³)" },
        });
        plotBox.appendChild(api.plot.svg);

        /** E 分支:容性耦合,密度低而且對功率不敏感 */
        api.neE = function (P) {
          return 8e8 * Math.pow(P / 100, 0.55);
        };
        /** H 分支:感性耦合,密度高且大致正比於功率 */
        api.neH = function (P) {
          return 1.1e11 * (P / 600);
        };

        /**
         * 依目前所在的分支決定密度。
         * 兩支各自只在自己的存在區間內有效:
         *   E 支存在到 P_UP,超過就撐不住 → 被迫跳到 H
         *   H 支存在到 P_DOWN,低於就撐不住 → 被迫掉回 E
         * 中間那段 450–600 W 兩支都存在 —— 那就是雙穩態區,遲滯的來源。
         */
        api.updateMode = function () {
          var P = api.state.P;
          if (api.mode === "E" && P >= P_UP) api.mode = "H";
          else if (api.mode === "H" && P <= P_DOWN) api.mode = "E";
        };

        api.ne = function () {
          return api.mode === "H" ? api.neH(api.state.P) : api.neE(api.state.P);
        };

        /** CCP 在同樣功率下的密度 —— 沒有模式跳變,平滑上升 */
        api.neCCP = function (P) {
          return 3e9 * Math.pow(P / 100, 0.8);
        };

        api.refresh = function () {
          if (!api.plot) return;
          var pl = api.plot;
          var pal = PA.canvasTheme.palette();
          pl.clear();

          // 兩條 ICP 分支,各自只畫在自己存在的區間
          var eBranch = [];
          var hBranch = [];
          for (var i = 0; i <= 160; i++) {
            var P = 100 + (i / 160) * 1900;
            if (P <= P_UP) eBranch.push([P, api.neE(P)]);
            if (P >= P_DOWN) hBranch.push([P, api.neH(P)]);
          }
          pl.line(eBranch, { stroke: pal.textMuted, width: 2.2 });
          pl.line(hBranch, { stroke: pal.vizIonPos, width: 2.6 });
          pl.label(250, api.neE(250), "E-mode(容性,暗)", {
            fill: pal.textMuted, dx: 6, dy: -8, size: 11,
          });
          pl.label(1400, api.neH(1400), "H-mode(感性,亮)", {
            fill: pal.vizIonPos, dx: -6, dy: -8, size: 11, anchor: "end",
          });

          // CCP 對照 —— 平滑,沒有跳變
          var ccp = pl.sample(function (P) { return api.neCCP(P); }, 120);
          pl.line(ccp, { stroke: pal.vizElectron, width: 2, dash: "5 3" });
          pl.label(1600, api.neCCP(1600), "CCP(無跳變)", {
            fill: pal.vizElectron, dx: -6, dy: 14, size: 11, anchor: "end",
          });

          // 雙穩態區 —— 遲滯就發生在這一段
          pl.area([[P_DOWN, 1e13], [P_UP, 1e13]], { fill: pal.warning, opacity: 0.12 });
          pl.label((P_DOWN + P_UP) / 2, 6e12, "雙穩態區", {
            fill: pal.warning, size: 11, anchor: "middle",
          });
          pl.vline(P_UP, { stroke: pal.warning, dash: "3 3" });
          pl.vline(P_DOWN, { stroke: pal.warning, dash: "3 3" });

          // 掃描留下的軌跡 —— 遲滯迴圈由它畫出來
          if (api.trace.length > 2) {
            pl.line(api.trace, { stroke: pal.success, width: 1.6, opacity: 0.85 });
          }

          pl.dot(api.state.P, api.ne(), {
            fill: api.mode === "H" ? pal.vizIonPos : pal.textMuted,
            r: 6,
            overlay: true,
          });

          if (api.readoutNode) {
            api.readoutNode.update({
              mode: api.mode === "H" ? "H-mode(感性,明亮)" : "E-mode(容性,暗淡)",
              ne: api.ne(),
              jump: api.mode === "E" ? P_UP - api.state.P : api.state.P - P_DOWN,
              ratio: api.ne() / api.neCCP(api.state.P),
              bistable:
                api.state.P >= P_DOWN && api.state.P <= P_UP
                  ? "是 —— 這裡不該擺製程點"
                  : "否",
            });
          }
        };

        api.seed = function () {
          api.sys.clear();
          for (var i = 0; i < 260; i++) {
            api.sys.spawn(function (p) {
              p.kind = "electron";
              p.r = 2.2;
              p.x = Math.random() * api.width;
              p.y = api.height * (0.15 + Math.random() * 0.7);
              var a = Math.random() * Math.PI * 2;
              var sp = 40 + Math.random() * 60;
              p.vx = Math.cos(a) * sp;
              p.vy = Math.sin(a) * sp;
              p.data = { hot: Math.random() < 0.15 };
            });
          }
        };

        var detach = PA.canvasTheme.autoSize(canvas, canvasBox, 2 / 1, function (ctx, w, h) {
          api.ctx = ctx;
          api.width = w;
          api.height = h;
          api.sys.resize(w, h);
          if (!api.seeded) { api.seeded = true; api.seed(); }
        });
        api.onDestroy(detach);

        var readout = C.readout([
          { key: "mode", label: "ICP 目前模式", format: function (v) { return v; } },
          { key: "ne", label: "ICP 電子密度", format: function (v) { return v.toExponential(1) + " cm⁻³"; } },
          { key: "jump", label: "距下一個跳變點", digits: 0, unit: " W" },
          { key: "ratio", label: "ICP ÷ CCP 密度比", digits: 1, unit: " 倍" },
          { key: "bistable", label: "落在雙穩態區?", format: function (v) { return v; } },
        ]);
        api.readoutNode = readout;

        var pCtl = C.slider({
          label: "Source 功率",
          min: 100, max: 2000, value: 300, step: 10, unit: "W", digits: 0,
          onChange: function (v) {
            api.state.P = v;
            api.updateMode();
            api.trace.push([v, api.ne()]);
            if (api.trace.length > 400) api.trace.shift();
            api.refresh();
          },
        });
        api.pCtl = pCtl;

        var sweepCtl = C.segmented({
          label: "自動掃描(看遲滯迴圈)",
          options: [
            { value: "0", label: "停止" },
            { value: "1", label: "往上掃" },
            { value: "-1", label: "往下掃" },
          ],
          value: "0",
          onChange: function (v) { api.state.sweep = +v; },
        });

        var clearCtl = C.toggle({
          label: "清除軌跡",
          value: false,
          onChange: function (v) {
            if (v) { api.trace = []; api.refresh(); }
          },
        });

        api.el.appendChild(C.panel([pCtl, sweepCtl, clearCtl]));
        api.el.appendChild(readout);
        api.el.appendChild(
          C.observations([
            "從 300 W 開始按「往上掃」—— 到 600 W 時密度突然跳兩個數量級,電漿由暗轉亮。這就是 E→H 跳變。",
            "跳上去之後改按「往下掃」—— 注意它不是在 600 W 掉回來,而是撐到 450 W 才掉。這 150 W 的差距就是遲滯,綠色軌跡會把整個迴圈畫出來。",
            "把功率停在 500 W(黃色的雙穩態區)—— 這裡兩個模式都可能存在。製程點擺在這裡,電漿會在兩個模式間反覆跳動,製程完全不穩。",
            "這就是為什麼 recipe 的第一步常刻意用高功率確保進 H-mode,再降到製程功率 —— 靠遲滯留在 H-mode。順序反了就點不亮。",
            "對照虛線的 CCP 曲線:它平滑上升、沒有跳變,但同功率下密度低一到兩個數量級。這是兩種耦合方式最根本的差別。",
          ])
        );

        api.updateMode();
        api.refresh();
      },

      reset: function () {
        this.state = { P: 300, p: 20, sweep: 0 };
        this.mode = "E";
        this.trace = [];
        this.pCtl.setValue(300, true);
        this.updateMode();
        this.refresh();
      },

      tick: function (dt) {
        var api = this;
        // 自動掃描 —— 遲滯要靠「慢慢掃」才看得出來
        if (api.state.sweep !== 0) {
          var next = api.state.P + api.state.sweep * 420 * dt;
          next = Math.max(100, Math.min(2000, next));
          api.state.P = next;
          api.pCtl.setValue(Math.round(next), true);
          api.updateMode();
          api.trace.push([next, api.ne()]);
          if (api.trace.length > 600) api.trace.shift();
          api._rf = (api._rf || 0) + 1;
          if (api._rf % 4 === 0) api.refresh();
        }

        // 粒子:H-mode 下更快更多
        var speed = api.mode === "H" ? 190 : 60;
        var w = api.width || 400, h = api.height || 200;
        api.sys.each(function (p) {
          var sc = speed / 100;
          p.x += p.vx * sc * dt;
          p.y += p.vy * sc * dt;
          if (p.x < 0) p.x += w; else if (p.x > w) p.x -= w;
          if (p.y < h * 0.12) { p.y = h * 0.12; p.vy = Math.abs(p.vy); }
          else if (p.y > h * 0.88) { p.y = h * 0.88; p.vy = -Math.abs(p.vy); }
        });
      },

      draw: function () {
        var api = this;
        if (!api.ctx) return;
        var ctx = api.ctx;
        var p = PA.canvasTheme.palette();
        var w = api.width, h = api.height;
        var half = w / 2;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = p.bg;
        ctx.fillRect(0, 0, w, h);

        ctx.font = "600 12px system-ui, sans-serif";
        ctx.textBaseline = "top";

        // --- 左:CCP ---
        ctx.fillStyle = p.borderStrong;
        ctx.fillRect(half * 0.1, h * 0.08, half * 0.8, 8);
        ctx.fillRect(half * 0.1, h * 0.9, half * 0.8, 8);
        ctx.fillStyle = p.text;
        ctx.fillText("CCP —— 振盪的鞘層邊界拍打電子", 8, 6);
        // 振盪的鞘層邊界
        var t = (Date.now() % 1000) / 1000;
        var osc = Math.sin(t * Math.PI * 2) * h * 0.04;
        ctx.strokeStyle = p.warning;
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(half * 0.1, h * 0.82 + osc);
        ctx.lineTo(half * 0.9, h * 0.82 + osc);
        ctx.stroke();
        ctx.setLineDash([]);

        // --- 右:ICP ---
        ctx.fillStyle = p.text;
        ctx.fillText("ICP —— 線圈感應出方位角電場", half + 8, 6);
        // 線圈剖面
        ctx.fillStyle = p.borderStrong;
        for (var i = 0; i < 5; i++) {
          var cx = half + half * (0.2 + i * 0.15);
          ctx.beginPath();
          ctx.arc(cx, h * 0.06, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        // 介電質窗
        ctx.fillStyle = p.vizMask;
        ctx.fillRect(half + half * 0.08, h * 0.12, half * 0.84, 6);
        // 感應電場圈 —— H-mode 下才明顯
        ctx.save();
        ctx.strokeStyle = p.vizIonPos;
        ctx.globalAlpha = api.mode === "H" ? 0.6 : 0.12;
        ctx.lineWidth = 2;
        for (var k = 1; k <= 3; k++) {
          ctx.beginPath();
          ctx.ellipse(half + half * 0.5, h * 0.4, half * 0.12 * k, h * 0.07 * k, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();

        // 粒子 —— 只畫在對應的半邊
        api.sys.each(function (pt) {
          var isRight = pt.x > half;
          var bright = isRight ? (api.mode === "H" ? 1 : 0.3) : 0.55;
          ctx.globalAlpha = bright;
          ctx.fillStyle = p.vizElectron;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.r || 2.2, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;

        // 中線
        ctx.strokeStyle = p.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(half, 0);
        ctx.lineTo(half, h);
        ctx.stroke();

        // 模式標示
        ctx.font = "700 15px system-ui, sans-serif";
        ctx.textBaseline = "bottom";
        ctx.textAlign = "center";
        ctx.fillStyle = api.mode === "H" ? p.success : p.textMuted;
        ctx.fillText(api.mode === "H" ? "H-mode 明亮" : "E-mode 暗淡", half * 1.5, h - 8);
        ctx.fillStyle = p.textMuted;
        ctx.fillText(Math.round(api.state.P) + " W", half * 0.5, h - 8);
        ctx.textAlign = "left";
      },
    });
  });
})((window.PA = window.PA || {}));
