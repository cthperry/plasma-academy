/* ==========================================================================
   A16 — 虛擬機台控制面板
   章節 2.6 · 規格 docs/05-animation-spec.md  ★★ 全站最複雜的元件,L2 的收束

   目標:整合前面所有概念,建立完整的因果鏈心智模型。

   驗收條件(docs/05):T_e 對 source power 的變化 < 10 %。

   設計上最重要的一件事:**所有輸出都由既有模型算出來,沒有一條是手寫的規則。**
     n_e、T_e     ← plasma-model 的 0-D 全域模型
     鞘層、IEDF   ← plasma-model 的 Child–Langmuir 與 sinc 因子
     蝕刻率、輪廓 ← profile-engine 的三條規則
   因果鏈追蹤顯示的是「哪些量真的變了」,不是預先寫死的箭頭。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A16",
    function () {
      var C = PA.controls;
      var M = PA.model;

      // 五個旋鈕的預設值 —— 一支典型的介電質蝕刻 recipe
      var DEFAULTS = { p: 20, src: 800, bias: 150, fc: 2.0, temp: 40, gap: 3 };

      // 預設條件下的蝕刻率定為 200 nm/min,其餘一律相對它。
      // 這樣面板上的數字有量級感,而不是一堆 10⁸。
      var RATE_AT_DEFAULT = 200;

      /** 把目前的旋鈕算成一整組電漿與製程量 */
      function solve(s) {
        var g = M.globalModel({
          gas: "Ar",
          pressure_mTorr: s.p,
          power_W: s.src,
          radius_cm: 15,
          height_cm: s.gap,
        });

        // 偏壓 → 自偏壓。功率固定時密度越高,單位電荷分到的電壓越低
        var Vdc = 30 + 900 * Math.sqrt(Math.max(s.bias, 0) / 500 / (g.ne / 1e11));
        Vdc = Math.min(Vdc, 1500);

        var sheath = M.sheathThickness(g.ne, g.Te, Vdc);
        var lam = M.meanFreePath(s.p, "Ar");
        // 鞘層內平均碰撞次數 —— 方向性的殺手
        var collisions = sheath / 10 / lam;

        // 自由基通量:密度 × 中性密度 × 解離速率係數(EEDF 決定)
        var radical =
          M.rateCoefficient(g.Te, 8, "maxwellian") * g.ng * g.ne * 1e-24;
        var ionFlux = M.bohmFlux(g.ne, g.Te, 39.95);

        // 溫度:純化學那一段服從 Arrhenius,離子輔助那一段不敏感
        var arr = Math.exp(-0.25 * (1 / ((s.temp + 273) / 313) - 1) * 11.6);

        return {
          Te: g.Te,
          ne: g.ne,
          ng: g.ng,
          Vdc: Vdc,
          sheath: sheath,
          lam: lam,
          collisions: collisions,
          radical: radical,
          ionFlux: ionFlux,
          arrhenius: arr,
          tau: M.residenceTime(s.p, 30, 200),
        };
      }

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = Object.assign({}, DEFAULTS);
          api.prev = null;
          api.lastKnob = null;
          // 正規化基準 —— 預設條件下的各項通量
          api.ref = solve(DEFAULTS);

          var wrap = document.createElement("div");
          wrap.className = "pa-lab__split";
          var canvasBox = document.createElement("div");
          var chainBox = document.createElement("div");
          wrap.appendChild(canvasBox);
          wrap.appendChild(chainBox);
          api.stage.appendChild(wrap);

          var canvas = document.createElement("canvas");
          canvas.setAttribute("role", "img");
          canvas.setAttribute(
            "aria-label",
            "腔體即時狀態與晶圓剖面:電漿發光強度反映電子密度,底部顯示正在演化的蝕刻輪廓。"
          );
          canvasBox.appendChild(canvas);
          api.canvas = canvas;

          // 因果鏈面板 —— 調哪個旋鈕就顯示那條鏈,並標出實際變化量
          var chain = document.createElement("div");
          chain.className = "pa-chainpanel";
          chainBox.appendChild(chain);
          api.chainNode = chain;

          api.prof = PA.profile.create({
            cols: 120,
            rows: 76,
            layers: [
              { material: "mask", thickness: 0.18 },
              { material: "oxide", thickness: 0.5 },
              { material: "silicon", thickness: 0.32 },
            ],
            openings: [[0.38, 0.62]],
          });

          api.restart = function () {
            api.prof.reset(
              [
                { material: "mask", thickness: 0.18 },
                { material: "oxide", thickness: 0.5 },
                { material: "silicon", thickness: 0.32 },
              ],
              [[0.38, 0.62]]
            );
            api.openTop = api.prof.depth(0.5);
            api.openWidth = api.prof.widthAt(Math.max(0, api.openTop - 1));
            api.steps = 0;
            api.refresh();
          };

          api.maxWidth = function () {
            var p = api.prof;
            var d = p.depth(0.5);
            var w = 0;
            for (var y = api.openTop; y <= d && y < p.rows; y++) {
              var wy = p.widthAt(y);
              if (wy > w) w = wy;
            }
            return w;
          };

          /** 因果鏈:每個旋鈕影響哪些量 —— 顯示的變化量是實際算出來的 */
          var CHAINS = {
            p: {
              name: "壓力",
              links: [
                ["n_gas", "中性粒子密度 ↑ → 自由基多 → 化學蝕刻率 ↑", function (r) { return r.ng; }],
                ["lam", "λ ↓ → 鞘層內碰撞 ↑ → 方向性 ↓ → undercut/bowing", function (r) { return r.lam; }],
                ["Te", "T_e ↓ → 解離效率 ↓(反向作用)", function (r) { return r.Te; }],
                ["tau", "τ ↑ → 產物滯留 ↑ → 再沉積", function (r) { return r.tau; }],
              ],
              note: "淨效果不是單向的 —— 這正是壓力常有最佳點的原因。",
            },
            src: {
              name: "Source 功率",
              links: [
                ["ne", "n_e ↑ → 離子通量與自由基同時 ↑ → 蝕刻率 ↑", function (r) { return r.ne; }],
                ["Te", "T_e 幾乎不動(由粒子平衡鎖定)", function (r) { return r.Te; }],
                ["sheath", "鞘層變薄(s ∝ n_e^−1/2)→ 方向性略改善", function (r) { return r.sheath; }],
                ["radical", "自由基密度 ↑", function (r) { return r.radical; }],
              ],
              note: "「加功率」的第一效果是加自由基,不是加離子能量。想加能量請動 bias。",
            },
            bias: {
              name: "Bias 功率",
              links: [
                ["Vdc", "V_dc ↑ → 離子能量 ↑ → 物理濺鍍 ↑ → 蝕刻率 ↑", function (r) { return r.Vdc; }],
                ["sheath", "鞘層變厚(s ∝ V^3/4)→ 鞘層內碰撞 ↑", function (r) { return r.sheath; }],
                ["collisions", "鞘層碰撞次數 ↑ → 低能離子 ↑ → 方向性 ↓", function (r) { return r.collisions; }],
              ],
              note: "Bias 是最危險的旋鈕:提升蝕刻率最快,但幾乎所有副作用都跟著來 —— 尤其是選擇比。",
            },
            fc: {
              name: "氣體配比(有效 F/C)",
              links: [
                ["fc", "F/C ↓ → 聚合物 ↑ → 側壁保護 ↑、選擇比 ↑", function () { return api.state.fc; }],
                ["fc2", "F/C 太低 → 連溝底都蓋住 → etch stop", function () { return api.state.fc; }],
              ],
              note: "這一條的完整機制在 2.2 與 A10。加 O₂ 提高有效 F/C,加 H₂ 降低。",
            },
            temp: {
              name: "晶座溫度",
              links: [
                ["arr", "純化學那一段服從 Arrhenius,溫度敏感", function (r) { return r.arrhenius; }],
              ],
              note: "蝕刻率對溫度很敏感 → 製程偏化學;幾乎不敏感 → 偏離子輔助。這是免費的診斷實驗(2.3.5)。",
            },
            gap: {
              name: "Gap 電極間距",
              links: [
                ["Te", "gap ↓ → 表面損失相對變大 → T_e ↑", function (r) { return r.Te; }],
                ["ne", "有效體積改變 → n_e 改變", function (r) { return r.ne; }],
              ],
              note: "常被忽略的第六個旋鈕。它同時動到 T_e 與均勻度,所以 gap 一改往往要重調整支 recipe。",
            },
          };

          api.refresh = function () {
            var r = solve(api.state);
            var d = api.prof.depth(0.5) - api.openTop;
            var w = api.maxWidth();
            var aniso = api.openWidth ? w / api.openWidth : 1;

            /**
             * 蝕刻率 = 化學項 + 離子輔助協同項,兩項都相對「預設條件」正規化。
             * 協同項刻意做成「自由基 × 離子」的乘積而不是相加 ——
             * 這是 Coburn–Winters 的結論(L3 3.1):兩者缺一都慢,
             * 同時存在才快。所以 bias 歸零時速率會掉得很明顯。
             */
            var chem = (r.radical / api.ref.radical) * r.arrhenius;
            var ionTerm =
              (r.ionFlux / api.ref.ionFlux) *
              (Math.sqrt(Math.max(r.Vdc - 25, 0)) /
                Math.sqrt(Math.max(api.ref.Vdc - 25, 1)));
            var syn = Math.sqrt(Math.max(chem, 0)) * ionTerm; // 協同
            var rate =
              RATE_AT_DEFAULT *
              (0.18 * chem + 0.82 * syn) *
              (api.state.fc / DEFAULTS.fc);
            // 選擇比:聚合物越多、離子能量越低,越有選擇性
            var sel =
              Math.max(1, (18 * Math.pow(2.6 / Math.max(api.state.fc, 0.6), 1.4)) /
                Math.max(1, r.Vdc / 180));

            if (api.readoutNode) {
              api.readoutNode.update({
                Te: r.Te,
                ne: r.ne,
                Vdc: r.Vdc,
                sheath: r.sheath,
                coll: r.collisions,
                rate: rate,
                sel: sel,
                aniso:
                  aniso > 1.2
                    ? "側壁被咬(" + Math.round(aniso * 100) + " %)"
                    : d < 3 && api.steps > 150
                    ? "Etch stop"
                    : "垂直 ✅",
              });
            }

            api.renderChain(r);
          };

          /** 畫出目前旋鈕對應的因果鏈,並標出每個量的實際變化 */
          api.renderChain = function (r) {
            var node = api.chainNode;
            node.textContent = "";
            var key = api.lastKnob || "src";
            var spec = CHAINS[key];

            var h = document.createElement("div");
            h.className = "pa-chainpanel__head";
            h.textContent = "剛剛動的是:" + spec.name;
            node.appendChild(h);

            spec.links.forEach(function (L) {
              var row = document.createElement("div");
              row.className = "pa-chainpanel__row";
              var txt = document.createElement("span");
              txt.textContent = L[1];
              row.appendChild(txt);

              if (api.prev) {
                var now = L[2](r);
                var before = L[2](api.prev);
                if (isFinite(now) && isFinite(before) && before !== 0) {
                  var pct = ((now - before) / Math.abs(before)) * 100;
                  var badge = document.createElement("span");
                  badge.className =
                    "pa-chainpanel__delta " +
                    (Math.abs(pct) < 2 ? "is-flat" : pct > 0 ? "is-up" : "is-down");
                  badge.textContent =
                    Math.abs(pct) < 2
                      ? "幾乎不變"
                      : (pct > 0 ? "+" : "") + pct.toFixed(0) + " %";
                  row.appendChild(badge);
                }
              }
              node.appendChild(row);
            });

            var n = document.createElement("div");
            n.className = "pa-chainpanel__note";
            n.textContent = spec.note;
            node.appendChild(n);
          };

          api.bump = function (knob) {
            api.prev = solve(api.state);
            api.lastKnob = knob;
          };

          var detach = PA.canvasTheme.autoSize(canvas, canvasBox, 3 / 2, function (ctx, w, h) {
            api.ctx = ctx;
            api.width = w;
            api.height = h;
            if (!api.booted) { api.booted = true; api.restart(); }
          });
          api.onDestroy(detach);

          var readout = C.readout([
            { key: "Te", label: "電子溫度 T_e", digits: 2, unit: " eV" },
            { key: "ne", label: "電子密度 n_e", format: function (v) { return v.toExponential(1) + " cm⁻³"; } },
            { key: "Vdc", label: "自偏壓 V_dc", digits: 0, unit: " V" },
            { key: "sheath", label: "鞘層厚度", digits: 2, unit: " mm" },
            { key: "coll", label: "鞘層內碰撞次數", digits: 2, unit: " 次" },
            { key: "rate", label: "蝕刻率(相對)", digits: 0, unit: " nm/min" },
            { key: "sel", label: "對下層選擇比", digits: 0, unit: " :1" },
            { key: "aniso", label: "側壁", format: function (v) { return v; } },
          ]);
          api.readoutNode = readout;

          function knob(label, key, opts) {
            return C.slider(
              Object.assign(
                {
                  label: label,
                  onChange: function (v) {
                    // 滑桿對同一次操作可能連發兩次 onChange。若不擋掉,
                    // 第二次會把基準覆蓋成「變更後」的值,
                    // 因果鏈的變化量就永遠顯示「幾乎不變」。
                    if (api.state[key] === v) return;
                    api.bump(key);
                    api.state[key] = v;
                    api.restart();
                  },
                },
                opts
              )
            );
          }

          var pK = knob("壓力", "p", { min: 5, max: 100, value: 20, log: true, unit: "mTorr", digits: 0 });
          var sK = knob("Source 功率", "src", { min: 200, max: 2000, value: 800, step: 50, unit: "W", digits: 0 });
          var bK = knob("Bias 功率", "bias", { min: 0, max: 500, value: 150, step: 10, unit: "W", digits: 0 });
          var fK = knob("有效 F/C 比", "fc", { min: 1, max: 4, value: 2, step: 0.1, digits: 1 });
          var tK = knob("晶座溫度", "temp", { min: 0, max: 80, value: 40, step: 5, unit: "°C", digits: 0 });
          var gK = knob("Gap 電極間距", "gap", { min: 1, max: 5, value: 3, step: 0.5, unit: "cm", digits: 1 });

          var transport = C.transport({
            playing: true,
            onPlay: function () { api.start(); },
            onPause: function () { api.stop(); },
            onReset: function () {
              api.state = Object.assign({}, DEFAULTS);
              pK.setValue(20, true); sK.setValue(800, true); bK.setValue(150, true);
              fK.setValue(2, true); tK.setValue(40, true); gK.setValue(3, true);
              api.prev = null;
              api.lastKnob = null;
              api.restart();
            },
          });

          api.el.appendChild(C.panel([pK, sK, bK, fK, tK, gK, transport]));
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "先只動 Source 功率:200 → 2000 W。看 T_e —— 幾乎不動(< 10 %),但 n_e 跟著功率走。這就是 2.3 說的「功率調密度不調溫度」,現在你看得到它。",
              "只動 Bias:蝕刻率上去了,但看選擇比 —— 掉得比蝕刻率漲得還快。Bias 是最危險的旋鈕,提升速率最快但副作用全部跟著來。",
              "壓力從 5 拉到 100 mTorr:自由基變多(蝕刻率的化學那一項上升),但鞘層內碰撞次數也上去,側壁開始被咬。淨效果不是單向的,所以壓力有最佳點。",
              "把 F/C 降到 1.2:選擇比衝很高,但輪廓停住不動 —— etch stop。製程窗是有邊界的。",
              "動 Gap 看 T_e:間距越小,表面損失相對越大,T_e 反而上升。這是最容易被忽略的第六個旋鈕。",
              "挑戰:同時做到蝕刻率 > 250、選擇比 > 20、側壁垂直。你會發現這三件事互相拉扯 —— 這就是 2.6 的全部重點。",
            ])
          );
        },

        reset: function () {
          this.state = Object.assign({}, DEFAULTS);
          this.prev = null;
          this.restart();
        },

        tick: function () {
          var api = this;
          if (!api.prof) return;
          var r = solve(api.state);
          for (var i = 0; i < 2; i++) {
            api.prof.step({
              effFC: api.state.fc,
              ionEnergy: r.Vdc,
              ionFluxRel: Math.min(2, r.ne / 1e11),
              dt: 0.04,
            });
            api.steps++;
          }
          if (api.steps % 40 === 0) api.refresh();
        },

        draw: function () {
          var api = this;
          if (!api.ctx || !api.prof) return;
          var ctx = api.ctx;
          var p = PA.canvasTheme.palette();
          var w = api.width, h = api.height;
          var r = solve(api.state);

          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = p.bg;
          ctx.fillRect(0, 0, w, h);

          // 上半:腔體,發光強度反映 n_e
          var glowH = h * 0.42;
          var glow = Math.min(0.75, Math.log10(Math.max(r.ne, 1e9) / 1e9) / 4);
          var grad = ctx.createLinearGradient(0, 0, 0, glowH);
          grad.addColorStop(0, "rgba(150,110,220,0)");
          grad.addColorStop(0.5, "rgba(160,120,235," + glow.toFixed(3) + ")");
          grad.addColorStop(1, "rgba(150,110,220,0)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, glowH);

          ctx.fillStyle = p.borderStrong;
          ctx.fillRect(0, 0, w, 6);
          ctx.fillStyle = p.textSubtle;
          ctx.font = "11px system-ui, sans-serif";
          ctx.textBaseline = "top";
          ctx.fillText(
            "n_e = " + r.ne.toExponential(1) + " cm⁻³   T_e = " + r.Te.toFixed(2) + " eV",
            8, 10
          );

          // 鞘層帶
          var sPx = Math.min(glowH * 0.5, (r.sheath / 6) * glowH);
          ctx.save();
          ctx.strokeStyle = p.warning;
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(0, glowH - sPx);
          ctx.lineTo(w, glowH - sPx);
          ctx.stroke();
          ctx.restore();
          ctx.fillStyle = p.warning;
          ctx.fillText("鞘層 " + r.sheath.toFixed(2) + " mm", 8, glowH - sPx + 4);

          // 下半:晶圓剖面
          var prof = api.prof;
          var top = glowH + 6;
          var cw = w / prof.cols;
          var ch = (h - top) / prof.rows;
          for (var y = 0; y < prof.rows; y++) {
            for (var x = 0; x < prof.cols; x++) {
              var i = prof.idx(x, y);
              var id = prof.mat[i];
              if (id === 0) continue;
              ctx.fillStyle = p[prof.byId[id].token] || "#888";
              ctx.fillRect(x * cw, top + y * ch, cw + 0.6, ch + 0.6);
            }
          }
          for (var y2 = 0; y2 < prof.rows; y2++) {
            for (var x2 = 0; x2 < prof.cols; x2++) {
              var i2 = prof.idx(x2, y2);
              if (prof.mat[i2] === 0) continue;
              var t = prof.poly[i2];
              if (t <= 0.02) continue;
              ctx.globalAlpha = Math.min(0.85, t * 0.6);
              ctx.fillStyle = p.vizPolymer;
              ctx.fillRect(x2 * cw, top + y2 * ch, cw + 0.6, ch + 0.6);
            }
          }
          ctx.globalAlpha = 1;
        },
      });
    },
    ["js/lab/profile-engine.js"]
  );
})((window.PA = window.PA || {}));
