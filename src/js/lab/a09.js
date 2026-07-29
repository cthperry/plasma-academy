/* ==========================================================================
   A09 — 氣體選用決策樹
   章節 2.2 · 規格 docs/05-animation-spec.md  ★ 旗艦元件

   目標:選材料與目標 → 得到合理的氣體組合,而且每一支都說得出理由。

   決策順序刻意照課文 §2.2.1 的四個問題來,而且第一題就是揮發性 ——
   因為它是唯一的「否決題」:產物不揮發,後面三題再漂亮也沒用。
   Al + F → AlF₃ 沸點 1291 °C,這條路直接封死,這也是為什麼 Cu 走
   大馬士革製程而不是蝕刻。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A09",
    function () {
      var C = PA.controls;
      var G = PA.gases;

      // §2.2.1 的揮發性表 —— 這是第一原則,也是唯一的否決條件
      var VOLATILITY = {
        silicon: {
          F: { product: "SiF₄", bp: -86, ok: true },
          Cl: { product: "SiCl₄", bp: 57, ok: true },
          Br: { product: "SiBr₄", bp: 154, ok: true },
        },
        oxide: {
          F: { product: "SiF₄ + CO/CO₂", bp: -86, ok: true },
          Cl: { product: "SiCl₄(需高離子能量)", bp: 57, ok: false },
        },
        nitride: {
          F: { product: "SiF₄ + N₂", bp: -86, ok: true },
          Cl: { product: "SiCl₄ + N₂", bp: 57, ok: true },
        },
        aluminum: {
          F: { product: "AlF₃", bp: 1291, ok: false },
          Cl: { product: "AlCl₃", bp: 178, ok: true },
        },
        tungsten: {
          F: { product: "WF₆", bp: 17, ok: true },
          Cl: { product: "WCl₆", bp: 347, ok: false },
        },
        copper: {
          F: { product: "CuF₂", bp: 1676, ok: false },
          Cl: { product: "CuCl₂", bp: 993, ok: false },
        },
        resist: {
          O: { product: "CO₂ + H₂O", bp: -78, ok: true },
        },
      };

      var TARGETS = [
        { key: "silicon", label: "Poly-Si", zh: "多晶矽" },
        { key: "oxide", label: "SiO₂", zh: "氧化層" },
        { key: "nitride", label: "SiN", zh: "氮化層" },
        { key: "aluminum", label: "Al", zh: "鋁" },
        { key: "tungsten", label: "W", zh: "鎢" },
        { key: "copper", label: "Cu", zh: "銅" },
        { key: "resist", label: "光阻", zh: "光阻" },
      ];

      var STOPS = [
        { key: "oxide", label: "SiO₂" },
        { key: "silicon", label: "Si" },
        { key: "nitride", label: "SiN" },
        { key: "none", label: "無限制" },
      ];

      var GOALS = [
        { key: "aniso", label: "垂直側壁" },
        { key: "select", label: "高選擇比" },
        { key: "rate", label: "高速率" },
      ];

      /**
       * 依四個問題推出配方。
       * 每一支氣體都附「為什麼」,那才是這個元件的重點 ——
       * 背配方沒有用,能推導才有用。
       */
      function recommend(target, stop, goal) {
        var v = VOLATILITY[target] || {};
        var viable = Object.keys(v).filter(function (k) {
          return v[k].ok;
        });

        if (!viable.length) {
          return {
            blocked: true,
            reason:
              "沒有任何常用鹵素能和它形成揮發性產物 —— " +
              Object.keys(v)
                .map(function (k) {
                  return k + " → " + v[k].product + "(沸點 " + v[k].bp + " °C)";
                })
                .join("、") +
              "。這就是 Cu 不用蝕刻、改走大馬士革製程(鑲嵌 + CMP)的原因。",
            recipe: [],
          };
        }

        var r = [];

        if (target === "resist") {
          r.push(["O2", "主反應物 —— 把有機光阻氧化成 CO₂ 與 H₂O 抽走"]);
          if (goal === "rate") r.push(["N2", "提升 O 自由基產率,加快灰化"]);
          r.push(["CF4", "少量即可,幫忙清掉含矽的殘留物;加多會傷下層"]);
          return { blocked: false, recipe: r, chem: "O" };
        }

        if (target === "aluminum") {
          r.push(["Cl2", "主蝕刻劑 —— AlCl₃ 沸點 178 °C 可昇華抽走"]);
          r.push(["BCl3", "不可或缺 —— B 抓走表面原生 Al₂O₃ 的氧,把蝕刻打開;同時補 Cl"]);
          r.push(["N2", "側壁鈍化,控制側蝕"]);
          return {
            blocked: false,
            recipe: r,
            chem: "Cl",
            caution:
              "晶圓出腔後必須做後處理(去離子水沖洗或 H₂O 電漿)—— " +
              "殘留的 Cl 遇大氣濕氣會持續腐蝕 Al,幾小時內就能吃斷線路。",
          };
        }

        if (target === "tungsten") {
          r.push(["SF6", "F 產率高,WF₆ 沸點 17 °C,好抽"]);
          r.push(["N2", "側壁鈍化"]);
          if (stop === "oxide") r.push(["CHF3", "補一點碳做聚合物,拉高對 SiO₂ 的選擇比"]);
          return { blocked: false, recipe: r, chem: "F" };
        }

        if (target === "silicon") {
          r.push(["Cl2", "提供蝕刻率 —— Cl 對 Si 反應性強"]);
          if (stop === "oxide") {
            r.push(["HBr", "主力 —— Br 較溫和,對 gate oxide 的選擇比遠高於 Cl"]);
            r.push(["O2", "與 Si、Br 形成 SiOBr 側壁鈍化,擋住橫向蝕刻"]);
          } else if (goal === "rate") {
            r.push(["SF6", "F 產率極高,Si 刻得最快 —— 但無碳不聚合,側壁沒保護"]);
          } else {
            r.push(["HBr", "提升異向性與側壁鈍化"]);
          }
          return { blocked: false, recipe: r, chem: "Cl" };
        }

        if (target === "oxide") {
          if (stop === "silicon") {
            r.push(["C4F8", "F/C = 2,低 F/C 產生聚合物 —— SiO₂ 自身的氧會把它燒掉,Si 不會 → 選擇比"]);
            if (goal === "select") r.push(["C4F6", "F/C = 1.5,聚合更強,先進節點 HAR 用它把選擇比再拉高"]);
          } else {
            r.push(["CF4", "F/C = 4,速率優先,但側壁沒保護"]);
          }
          r.push(["Ar", "稀釋並提供物理轟擊,把溝底的聚合物打開"]);
          r.push(["O2", "微量 —— 調有效 F/C,避免聚合過頭 etch stop"]);
          return { blocked: false, recipe: r, chem: "F" };
        }

        if (target === "nitride") {
          r.push(["CH2F2", "F/C = 2 且含兩個 H,高聚合 —— SiN spacer 對 Si 高選擇比的主力"]);
          if (goal === "select") r.push(["CH3F", "F/C = 1,選擇比更高,但製程窗更窄"]);
          r.push(["O2", "微量,調有效 F/C"]);
          r.push(["Ar", "稀釋與物理轟擊"]);
          return { blocked: false, recipe: r, chem: "F" };
        }

        return { blocked: false, recipe: r, chem: viable[0] };
      }

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = { target: "silicon", stop: "oxide", goal: "aniso" };

          var out = document.createElement("div");
          out.className = "pa-tree";
          api.stage.appendChild(out);
          api.out = out;

          var readout = C.readout([
            { key: "chem", label: "主化學", format: function (v) { return v; } },
            { key: "product", label: "產物與沸點", format: function (v) { return v; } },
            { key: "n", label: "配方支數", digits: 0, unit: " 支" },
            { key: "verdict", label: "可行性", format: function (v) { return v; } },
          ]);
          api.readoutNode = readout;

          function el(tag, cls, text) {
            var n = document.createElement(tag);
            if (cls) n.className = cls;
            if (text != null) n.textContent = text;
            return n;
          }

          api.refresh = function () {
            var s = api.state;
            var res = recommend(s.target, s.stop, s.goal);
            var t = TARGETS.filter(function (x) { return x.key === s.target; })[0];
            var vol = VOLATILITY[s.target] || {};

            api.out.textContent = "";

            // --- 第一題:揮發性(否決題)---
            var q1 = el("div", "pa-tree__step");
            q1.appendChild(el("div", "pa-tree__q", "① 產物揮發得掉嗎?(否決題)"));
            var tbl = el("div", "pa-tree__vol");
            Object.keys(vol).forEach(function (k) {
              var row = el("div", "pa-tree__vol-row" + (vol[k].ok ? " is-ok" : " is-no"));
              row.appendChild(el("span", "pa-tree__vol-k", t.label + " + " + k));
              row.appendChild(el("span", null, vol[k].product));
              row.appendChild(el("span", "pa-tree__vol-bp", vol[k].bp + " °C"));
              row.appendChild(el("span", null, vol[k].ok ? "可行" : "不可行"));
              tbl.appendChild(row);
            });
            q1.appendChild(tbl);
            api.out.appendChild(q1);

            if (res.blocked) {
              var stop = el("div", "pa-tree__blocked");
              stop.appendChild(el("div", "pa-tree__q", "⛔ 這條路走不通"));
              stop.appendChild(el("p", null, res.reason));
              api.out.appendChild(stop);
              api.readoutNode.update({
                chem: "無",
                product: "皆不揮發",
                n: 0,
                verdict: "不能用電漿蝕刻",
              });
              return;
            }

            // --- 第二、三題 ---
            var q2 = el("div", "pa-tree__step");
            q2.appendChild(el("div", "pa-tree__q", "② 不能動到什麼?→ 決定選擇比策略"));
            q2.appendChild(
              el(
                "p",
                null,
                s.stop === "none"
                  ? "沒有下層限制 —— 可以放手用高 F/C 或高偏壓衝速率。"
                  : "下層是 " +
                    STOPS.filter(function (x) { return x.key === s.stop; })[0].label +
                    ",必須靠聚合物或溫和的鹵素把選擇比做出來。"
              )
            );
            api.out.appendChild(q2);

            var q3 = el("div", "pa-tree__step");
            q3.appendChild(el("div", "pa-tree__q", "③ 要什麼 profile?→ 決定鈍化與轟擊的比重"));
            q3.appendChild(
              el(
                "p",
                null,
                s.goal === "aniso"
                  ? "要垂直側壁 —— 需要側壁鈍化劑,而且壓力要低讓離子飛得直。"
                  : s.goal === "select"
                  ? "選擇比優先 —— 往低 F/C 或溫和鹵素走,速率會犧牲掉一些。"
                  : "速率優先 —— 高 F/C、高偏壓,代價是選擇比與側壁保護。"
              )
            );
            api.out.appendChild(q3);

            // --- 配方 ---
            var rec = el("div", "pa-tree__recipe");
            rec.appendChild(el("div", "pa-tree__q", "④ 配方"));
            res.recipe.forEach(function (pair) {
              var g = G.byFormula(pair[0]);
              var row = el("div", "pa-tree__gas");
              var head = el("div", "pa-tree__gas-head");
              var f = el("strong", null, g ? g.formula : pair[0]);
              head.appendChild(f);
              if (g) {
                var badge = el("span", "pa-tree__hazard is-" + hazardClass(g.hazard.level), g.hazard.level);
                head.appendChild(badge);
                var link = document.createElement("a");
                // 用站台根目錄推算,元件才不會綁死在某個頁面深度
                var base = document.documentElement.getAttribute("data-base") || "";
                link.href = base + "gases/#" + g.id;
                link.textContent = "查百科";
                link.className = "pa-tree__link";
                head.appendChild(link);
              }
              row.appendChild(head);
              row.appendChild(el("p", null, pair[1]));
              rec.appendChild(row);
            });
            if (res.caution) {
              var cau = el("div", "pa-tree__caution");
              cau.appendChild(el("strong", null, "⚠️ 別忘了:"));
              cau.appendChild(el("span", null, " " + res.caution));
              rec.appendChild(cau);
            }
            api.out.appendChild(rec);

            var chosen = vol[res.chem];
            api.readoutNode.update({
              chem: res.chem + " 系",
              product: chosen ? chosen.product + "(" + chosen.bp + " °C)" : "—",
              n: res.recipe.length,
              verdict: "可行 ✅",
            });
          };

          function hazardClass(level) {
            return level === "極高" ? "crit" : level === "高" ? "high" : level === "中" ? "mid" : "low";
          }

          var tCtl = C.segmented({
            label: "① 要移除的材料",
            options: TARGETS.map(function (t) { return { value: t.key, label: t.label }; }),
            value: "silicon",
            onChange: function (v) { api.state.target = v; api.refresh(); },
          });
          var sCtl = C.segmented({
            label: "② 不能動到的下層",
            options: STOPS.map(function (t) { return { value: t.key, label: t.label }; }),
            value: "oxide",
            onChange: function (v) { api.state.stop = v; api.refresh(); },
          });
          var gCtl = C.segmented({
            label: "③ 要什麼",
            options: GOALS.map(function (t) { return { value: t.key, label: t.label }; }),
            value: "aniso",
            onChange: function (v) { api.state.goal = v; api.refresh(); },
          });

          api.el.appendChild(C.panel([tCtl, sCtl, gCtl]));
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "先選「Cu」—— 第一題就被否決。CuCl₂ 沸點 993 °C、CuF₂ 1676 °C,產物根本抽不走。這就是業界改走大馬士革製程(鑲嵌 + CMP)的原因,不是因為蝕刻機不夠好。",
              "選「Al」—— 注意 F 那一列是紅的:AlF₃ 沸點 1291 °C。Al 只能走氯系,而且一定要有 BCl₃ 去掉表面的原生 Al₂O₃。",
              "選「Poly-Si + 下層 SiO₂」—— 得到 Cl₂/HBr/O₂ 三重奏,和 1.6 那支 recipe 一模一樣。現在你知道每一支的理由了。",
              "選「SiO₂ + 下層 Si」—— 推薦 C₄F₈,理由是低 F/C 產生的聚合物在 SiO₂ 上會被自身的氧燒掉、在 Si 上不會。這正是 A10 可以親手驗證的機制。",
              "把「③ 要什麼」在三個選項間切換 —— 同一組材料會給出不同配方。沒有「最好的配方」,只有「對應目標的取捨」。",
            ])
          );

          api.refresh();
        },

        reset: function () {
          this.state = { target: "silicon", stop: "oxide", goal: "aniso" };
          this.refresh();
        },
      });
    },
    ["data/gases.js"]
  );
})((window.PA = window.PA || {}));
