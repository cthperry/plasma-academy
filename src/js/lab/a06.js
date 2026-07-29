/* ==========================================================================
   A06 — 鞘層形成時間軸動畫
   章節 1.5 · 規格 docs/05-animation-spec.md  ★ 旗艦元件

   目標:看懂鞘層形成的四個階段,理解離子方向性的來源。
   這是 L1 最重要的觀念 —— 沒有鞘層,離子就是四面八方亂飛的化學物種。

   驗收條件(docs/05):
     · 穩態時 V_p − V_f ≈ 4.7 × T_e(Ar)
     · 鞘層厚度隨 n_e 上升而變薄
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define("A06", function () {
    var C = PA.controls;
    var M = PA.model;

    // 畫面(以及下方曲線)涵蓋的物理範圍。鞘層 s ∝ λ_D,
    // 在 n_e = 10⁹~10¹²、T_e = 1~8 eV 的範圍內約 0.02~1.7 mm,2 mm 剛好包住。
    var SPAN_MM = 2;

    // 視覺速度 [px/s]。真實 v_e/v_i ≈ 270,畫面上看不完,
    // 取約 7 倍 —— 仍足以看出「電子先跑掉」。
    var V_E = 180;
    var V_I = 26;

    var STAGES = [
      {
        key: 0,
        label: "t = 0",
        title: "均勻、準中性",
        desc: "電子與離子均勻分佈,處處 n_e ≈ n_i,沒有電場。",
      },
      {
        key: 1,
        label: "t = t₁",
        title: "電子先跑掉",
        desc: "電子熱速度是離子的約 2,700 倍(Ar、T_e = 3 eV),率先大量抵達表面 —— 表面開始帶負電。",
      },
      {
        key: 2,
        label: "t = t₂",
        title: "鞘層建立",
        desc: "表面的負電位排斥後續電子、吸引離子,近表面形成電子被排空的區域。",
      },
      {
        key: 3,
        label: "穩態",
        title: "離子被垂直加速",
        desc: "電子與離子的流量相等,鞘層厚度穩定。離子在鞘層電場中被垂直加速轟擊晶圓。",
      },
    ];

    return PA.lab.create({
      setup: function () {
        var api = this;

        api.state = { stage: 3, ne: 1e10, Te: 3, showField: true };

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
          "腔體剖面:電子先流失到表面使其帶負電,形成電子被排空的鞘層,離子在其中被垂直加速"
        );
        canvasBox.appendChild(canvas);
        api.canvas = canvas;

        api.sys = PA.particles.create({ max: 800, width: 100, height: 100 });

        // --- 三條同步曲線:電位、電子密度、離子密度 ---
        api.plot = PA.plot.create({
          width: 560,
          height: 300,
          margin: { t: 16, r: 16, b: 44, l: 56 },
          x: { min: 0, max: SPAN_MM, tickCount: 5, label: "距晶圓表面的距離 (mm)", format: function (v) { return v.toFixed(1); } },
          y: { min: -1.05, max: 1.15, tickCount: 6, label: "正規化", format: function (v) { return v.toFixed(1); } },
        });
        plotBox.appendChild(api.plot.svg);

        /** V_p − V_f [V] —— Ar。浮動表面的鞘層電位降就是這個值 */
        api.drop = function () {
          return M.floatingPotentialDrop(api.state.Te, M.gas("Ar").M);
        };

        /**
         * 鞘層厚度 [mm]
         * 電位降取浮動條件下的 V_p − V_f(這一章不外加偏壓,V_dc 留到 2.4)。
         * 因為 V ∝ T_e,(2V/T_e)^(3/4) 是常數 → s ∝ λ_D,
         * 這正是「n_e 上升四倍、鞘層減半」的來源。
         */
        api.sheath = function () {
          return M.sheathThickness(api.state.ne, api.state.Te, api.drop());
        };

        /** 目前階段的鞘層「成熟度」0…1 */
        api.maturity = function () {
          var s = api.state.stage;
          return s === 0 ? 0 : s === 1 ? 0.25 : s === 2 ? 0.7 : 1;
        };

        /**
         * 單顆電子能鑽進鞘層多深(佔鞘層厚度的比例)。
         * 只有能量高過該處電位障的電子進得去,所以是指數分佈 ——
         * 這正是上圖 n_e 曲線在鞘層內指數衰減的粒子版本。
         */
        api.penetration = function () {
          return Math.min(1, -Math.log(1 - Math.random()) * 0.22);
        };

        api.reseed = function () {
          var sys = api.sys;
          if (!sys || !api.width) return;
          sys.clear();
          var n = PA.particles.budget() < 900 ? 150 : 300;
          n = Math.min(n, Math.floor((sys.max - 4) / 2)); // 每圈生一電子一離子
          var sheathPx = api.sheathPx();
          var mat = api.maturity();

          for (var i = 0; i < n; i++) {
            // 電子:鞘層內依成熟度被排空
            sys.spawn(function (p) {
              p.kind = "electron";
              var x, y, tries = 0;
              do {
                x = Math.random() * api.width;
                y = Math.random() * api.height;
                tries++;
              } while (tries < 20 && y > api.height - sheathPx && Math.random() < mat);
              p.x = x; p.y = y;
              // 這個元件的重點就是「鞘層裡電子少了」,電子必須看得見,
              // 所以放大到接近離子的視覺量體。
              p.r = 2.6;
              var a = Math.random() * Math.PI * 2;
              var sp = sys.thermalSpeed(V_E);
              p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
              p.data = { depth: api.penetration() };
            });
            // 離子:鞘層內被加速,呈垂直向下
            sys.spawn(function (p) {
              p.kind = "ionPos";
              p.x = Math.random() * api.width;
              p.y = Math.random() * api.height;
              var a = Math.random() * Math.PI * 2;
              var sp = sys.thermalSpeed(V_I);
              p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
            });
          }
        };

        /** 鞘層在畫面上的像素厚度(下緣往上);畫面高度對應 SPAN_MM */
        api.sheathPx = function () {
          return (api.sheath() / SPAN_MM) * (api.height || 300) * api.maturity();
        };

        /** 重畫曲線與數值面板 */
        api.refresh = function () {
          if (!api.plot) return;
          var pl = api.plot;
          var pal = PA.canvasTheme.palette();
          pl.clear();

          var s = api.sheath(); // mm
          var mat = api.maturity();
          var sEff = s * mat;

          // 鞘層電位降,以 T_e 為單位(Ar 約 4.68)。取自 model,不另外寫死。
          var K = api.drop() / api.state.Te;
          // 離子進入鞘層時的能量,以 T_e 為單位(Bohm 判準:½T_e)
          var E0 = 0.5;

          /** 從壁面(u=0)到鞘層邊界(u=1)已回升的電位比例 —— Child–Langmuir 的 x^(4/3) */
          function rise(u) {
            return Math.pow(u, 4 / 3);
          }
          /** 距該點還差多少電位才回到 bulk,單位 T_e */
          function deficit(u) {
            return K * (1 - rise(u));
          }

          // 電位:bulk 平坦,鞘層內急降
          var phi = pl.sample(function (x) {
            if (x >= sEff || sEff <= 0) return 1;
            return -1 + 2 * rise(x / sEff);
          }, 200);
          pl.line(phi, { stroke: pal.primary, width: 2.6 });

          // 電子密度:Boltzmann 關係 n_e = n₀·exp(−eΔφ/kT_e) —— 指數排空
          var ne = pl.sample(function (x) {
            if (sEff <= 0) return 1;
            return x >= sEff ? 1 : Math.exp(-deficit(x / sEff));
          }, 200);
          pl.line(ne, { stroke: pal.vizElectron, width: 2, dash: "5 3" });

          // 離子密度:通量守恆 n_i·v = 定值,而 v ∝ √E —— 被加速所以變稀,但不歸零
          var ni = pl.sample(function (x) {
            if (sEff <= 0) return 1;
            return x >= sEff ? 1 : Math.sqrt(E0 / (E0 + deficit(x / sEff)));
          }, 200);
          pl.line(ni, { stroke: pal.vizIonPos, width: 2, dash: "2 3" });

          if (sEff > SPAN_MM * 0.004) {
            pl.vline(sEff, { stroke: pal.warning, dash: "4 3" });
            pl.label(sEff, 1.05, "鞘層邊界", { fill: pal.warning, dx: 6, size: 11 });
          }

          pl.legend(
            [
              { label: "電位 φ", color: pal.primary },
              { label: "電子密度 n_e", color: pal.vizElectron, dash: "5 3" },
              { label: "離子密度 n_i", color: pal.vizIonPos, dash: "2 3" },
            ],
            // 放在圖面中段偏右的空白處 —— 曲線的平台在頂端,別壓上去
            pl.m.l + 200,
            pl.m.t + 96
          );

          var st = STAGES[api.state.stage];
          if (api.readoutNode) {
            api.readoutNode.update({
              stage: st.label + " · " + st.title,
              sheath: sEff,
              drop: api.drop(),
              // 離子穿過鞘層獲得的能量 = 該時刻已建立的電位降
              energy: api.drop() * mat,
            });
          }
          if (api.descNode) api.descNode.textContent = st.desc;
        };

        var detach = PA.canvasTheme.autoSize(canvas, canvasBox, 3 / 2, function (ctx, w, h) {
          api.ctx = ctx;
          api.width = w;
          api.height = h;
          api.sys.resize(w, h);
          api.reseed();
          api.refresh();
        });
        api.onDestroy(detach);

        var readout = C.readout([
          { key: "stage", label: "階段", format: function (v) { return v; } },
          { key: "sheath", label: "鞘層厚度 s", digits: 3, unit: " mm" },
          { key: "drop", label: "V_p − V_f(穩態)", digits: 1, unit: " V" },
          { key: "energy", label: "離子入射能量", digits: 1, unit: " eV" },
        ]);
        api.readoutNode = readout;

        var stageCtl = C.segmented({
          label: "時間軸",
          options: STAGES.map(function (s) { return { value: s.key, label: s.label }; }),
          value: 3,
          onChange: function (v) {
            api.state.stage = +v;
            api.reseed();
            api.refresh();
          },
        });

        var neCtl = C.slider({
          label: "電子密度 n_e",
          min: 1e9, max: 1e12, value: 1e10, log: true, unit: "cm⁻³",
          format: function (v) {
            var e = Math.floor(Math.log10(v));
            return (v / Math.pow(10, e)).toFixed(1) + "×10" + C.sup(e);
          },
          onChange: function (v) { api.state.ne = v; api.reseed(); api.refresh(); },
        });

        var teCtl = C.slider({
          label: "電子溫度 T_e",
          min: 1, max: 8, step: 0.5, value: 3, unit: "eV", digits: 1,
          onChange: function (v) { api.state.Te = v; api.reseed(); api.refresh(); },
        });

        var fieldCtl = C.toggle({
          label: "顯示鞘層電場向量",
          value: true,
          onChange: function (v) { api.state.showField = v; },
        });

        api.el.appendChild(C.panel([stageCtl, neCtl, teCtl, fieldCtl]));

        // 階段說明
        var desc = document.createElement("div");
        desc.className = "pa-lab__caveat";
        api.descNode = desc;
        api.el.appendChild(desc);

        api.el.appendChild(readout);
        api.el.appendChild(
          C.observations([
            "從 t = 0 一格一格往後點,看電子如何先流失、表面如何帶負電、鞘層如何建立起來。",
            "看下方曲線:鞘層裡 n_e 掉到接近 0 而 n_i 沒有 —— 這裡「準中性不成立」,和 1.1 的 bulk 完全相反。",
            "電場向量全部指向表面而且是垂直的。離子被這個場加速 —— 這就是異向性蝕刻的唯一來源。",
            "把 T_e 從 3 拉到 6 eV:V_p − V_f 跟著加倍(≈4.7 T_e)。鞘層電位降完全由電子溫度決定,和密度無關。",
            "把 n_e 從 10¹⁰ 拉到 10¹²:鞘層薄十倍(s ∝ λ_D ∝ 1/√n_e),但入射能量一動也不動。密度管厚度、溫度管能量,兩件事。",
            "注意入射能量只有十幾 eV —— 這樣是蝕刻不動的。要打到幾百 eV 必須另外加 RF 偏壓,那是 2.4 的主題。",
          ])
        );

        api.refresh();
      },

      reset: function () {
        this.state.stage = 3;
        this.state.ne = 1e10;
        this.state.Te = 3;
        this.reseed();
        this.refresh();
      },

      tick: function (dt) {
        var api = this;
        var sheathPx = api.sheathPx();
        var h = api.height || 300;
        var mat = api.maturity();

        api.sys.each(function (p) {
          if (p.kind === "ionPos") {
            // 鞘層內被垂直加速
            if (p.y > h - sheathPx && mat > 0) {
              p.vy += 260 * mat * dt;
              p.vx *= 0.94;
            }
          } else if (mat > 0 && sheathPx > 0) {
            // 電子:鞘層電位障把它們擋回 bulk。
            // 每顆只能鑽到自己能量對應的深度,深了就反彈。
            var limit = h - sheathPx * (1 - (p.data ? p.data.depth : 0.2));
            if (p.y > limit && p.vy > 0) {
              p.vy = -Math.abs(p.vy);
              if (p.data) p.data.depth = api.penetration(); // 下次再抽一次能量
            }
          }

          p.x += p.vx * dt;
          p.y += p.vy * dt;

          if (p.x < 0) p.x += api.width;
          else if (p.x > api.width) p.x -= api.width;

          if (p.y > h - 3) {
            // 抵達表面 → 回到 bulk 頂端重新開始(維持穩態粒子數)
            p.y = 4;
            var a = Math.random() * Math.PI * 2;
            var sp = api.sys.thermalSpeed(p.kind === "electron" ? V_E : V_I);
            p.vx = Math.cos(a) * sp;
            p.vy = Math.abs(Math.sin(a) * sp);
            if (p.kind === "electron") p.data = { depth: api.penetration() };
          } else if (p.y < 2) {
            p.y = 2;
            p.vy = Math.abs(p.vy);
          }
        });
      },

      draw: function () {
        var api = this;
        if (!api.ctx) return;
        var ctx = api.ctx;
        var p = PA.canvasTheme.palette();
        var w = api.width, h = api.height;
        var sheathPx = api.sheathPx();
        var mat = api.maturity();

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = p.bg;
        ctx.fillRect(0, 0, w, h);

        // 鞘層區底色
        if (sheathPx > 1) {
          ctx.save();
          var g = ctx.createLinearGradient(0, h - sheathPx, 0, h);
          g.addColorStop(0, "rgba(120,120,140,0)");
          g.addColorStop(1, "rgba(120,120,140,0.16)");
          ctx.fillStyle = g;
          ctx.fillRect(0, h - sheathPx, w, sheathPx);
          ctx.strokeStyle = p.warning;
          ctx.setLineDash([5, 4]);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(0, h - sheathPx);
          ctx.lineTo(w, h - sheathPx);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = p.warning;
          ctx.font = "11px system-ui, sans-serif";
          ctx.textBaseline = "bottom";
          ctx.fillText("鞘層邊界", 8, h - sheathPx - 4);
          ctx.restore();
        }

        // 晶圓與表面電荷
        ctx.fillStyle = p.vizSubstrate;
        ctx.fillRect(0, h - 8, w, 8);
        if (mat > 0) {
          // 表面累積的負電荷 —— 鞘層的成因,數量隨階段增加
          ctx.save();
          ctx.fillStyle = p.vizElectron;
          ctx.textBaseline = "middle";
          ctx.textAlign = "center";
          var n = Math.round(3 + mat * 9);
          for (var i = 0; i < n; i++) {
            var cx = ((i + 0.5) / n) * w;
            ctx.beginPath();
            ctx.arc(cx, h - 14, 6, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = p.bg;
          ctx.font = "700 12px system-ui, sans-serif";
          for (var j = 0; j < n; j++) {
            ctx.fillText("−", ((j + 0.5) / n) * w, h - 14);
          }
          ctx.restore();
        }

        // 鞘層電場向量
        if (api.state.showField && sheathPx > 8 && mat > 0) {
          ctx.save();
          ctx.strokeStyle = p.primary;
          ctx.globalAlpha = 0.45 * mat;
          ctx.lineWidth = 1.3;
          var cols = 7;
          for (var c = 1; c <= cols; c++) {
            var x = (w * c) / (cols + 1);
            ctx.beginPath();
            ctx.moveTo(x, h - sheathPx + 4);
            ctx.lineTo(x, h - 12);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x - 3.5, h - 19);
            ctx.lineTo(x, h - 12);
            ctx.lineTo(x + 3.5, h - 19);
            ctx.stroke();
          }
          ctx.restore();
        }

        api.sys.draw(ctx, p);

        // bulk 標註
        ctx.save();
        ctx.fillStyle = p.textSubtle;
        ctx.font = "11px system-ui, sans-serif";
        ctx.textBaseline = "top";
        ctx.fillText("bulk(準中性)", 8, 8);
        ctx.restore();
      },
    });
  });
})((window.PA = window.PA || {}));
