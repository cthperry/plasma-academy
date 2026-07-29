/* ==========================================================================
   A11 — 氣體百科瀏覽器
   章節 2.2 · 規格 docs/05-animation-spec.md

   目標:32 種氣體可依家族 / 用途 / 危害篩選與搜尋,每張卡欄位固定。

   資料全部來自 data/gases.js —— 這個元件本身不存任何氣體知識,
   它只是那份資料的一個視圖。氣體百科頁 /gases/ 用的也是同一支。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A11",
    function () {
      var C = PA.controls;
      var G = PA.gases;

      function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
      }

      function hazardClass(level) {
        return level === "極高" ? "crit" : level === "高" ? "high" : level === "中" ? "mid" : "low";
      }

      /** 一張完整的氣體卡 —— 欄位順序固定,對照 docs/02 §2.2.3 */
      function card(g) {
        var c = el("article", "pa-gas-card");
        c.id = g.id;

        var head = el("div", "pa-gas-card__head");
        head.appendChild(el("strong", "pa-gas-card__formula", g.formula));
        head.appendChild(el("span", "pa-gas-card__zh", g.zh));
        head.appendChild(el("span", "pa-gas-card__en", g.en));
        head.appendChild(el("span", "pa-tree__hazard is-" + hazardClass(g.hazard.level), g.hazard.level));
        c.appendChild(head);

        c.appendChild(el("p", "pa-gas-card__note", g.note));

        var facts = el("div", "pa-gas-card__facts");
        [
          ["分子量", g.mw.toFixed(2)],
          ["沸點", g.bp + " °C"],
          ["游離能", g.ie + " eV"],
          g.bond ? ["主要鍵能", g.bond.label + " " + g.bond.kJ + " kJ/mol"] : null,
          g.fc != null ? ["F/C 比", g.fc.toFixed(2)] : null,
          g.hazard.gwp ? ["GWP(100 年)", String(g.hazard.gwp)] : null,
        ]
          .filter(Boolean)
          .forEach(function (p) {
            var f = el("div", "pa-gas-card__fact");
            f.appendChild(el("span", "pa-gas-card__k", p[0]));
            f.appendChild(el("span", null, p[1]));
            facts.appendChild(f);
          });
        c.appendChild(facts);

        var rows = [
          ["主要自由基", g.radicals.join("、")],
          ["典型流量", g.flow],
          ["危害", g.hazard.tags.join("、") || "—"],
          ["相容材質", g.ok.join("、") || "—"],
          ["禁用", g.no.join("、") || "—"],
          ["主要產物", g.products.join("、")],
          ["排氣處理", g.scrubber],
          ["常見故障", g.faults.join(";")],
        ];
        rows.forEach(function (p) {
          var r = el("div", "pa-map-card__row");
          r.appendChild(el("span", "pa-map-card__key", p[0]));
          r.appendChild(el("span", null, p[1]));
          c.appendChild(r);
        });

        var tags = el("div", "pa-gas-card__tags");
        g.uses.forEach(function (u) {
          var def = G.uses.filter(function (x) { return x.key === u; })[0];
          tags.appendChild(el("span", "pa-gas-card__tag", def ? def.name : u));
        });
        c.appendChild(tags);

        return c;
      }

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = { family: "", use: "", hazard: "", q: "" };

          var list = el("div", "pa-gas-grid");
          api.stage.appendChild(list);
          api.list = list;

          var readout = C.readout([
            { key: "n", label: "符合條件", digits: 0, unit: " 種" },
            { key: "total", label: "資料庫共", digits: 0, unit: " 種" },
            { key: "risk", label: "其中高風險", format: function (v) { return v; } },
            { key: "gwp", label: "其中溫室氣體", format: function (v) { return v; } },
          ]);
          api.readoutNode = readout;

          api.refresh = function () {
            var s = api.state;
            var hits = G.filter({
              family: s.family || null,
              use: s.use || null,
              hazard: s.hazard || null,
              q: s.q || null,
            });

            api.list.textContent = "";
            if (!hits.length) {
              api.list.appendChild(el("p", "pa-subtle", "沒有符合條件的氣體。放寬篩選再試一次。"));
            }
            hits.forEach(function (g) {
              api.list.appendChild(card(g));
            });

            var risky = hits.filter(function (g) {
              return g.hazard.level === "極高" || g.hazard.level === "高";
            });
            var gwp = hits.filter(function (g) { return g.hazard.gwp; });

            api.readoutNode.update({
              n: hits.length,
              total: G.count,
              risk: risky.length + " 種" + (risky.length ? "(" + risky.map(function (g) { return g.formula; }).join("、") + ")" : ""),
              gwp: gwp.length + " 種",
            });
          };

          var famCtl = C.segmented({
            label: "家族",
            options: [{ value: "", label: "全部" }].concat(
              G.families.map(function (f) { return { value: f.key, label: f.name }; })
            ),
            value: "",
            onChange: function (v) { api.state.family = v; api.refresh(); },
          });

          var useCtl = C.segmented({
            label: "用途",
            options: [{ value: "", label: "全部" }].concat(
              ["etch-diel", "etch-cond", "etch-si", "cvd", "clean", "ash", "passivate", "dilute"].map(function (k) {
                var d = G.uses.filter(function (x) { return x.key === k; })[0];
                return { value: k, label: d.name };
              })
            ),
            value: "",
            onChange: function (v) { api.state.use = v; api.refresh(); },
          });

          var hazCtl = C.segmented({
            label: "危害等級",
            options: [{ value: "", label: "全部" }].concat(
              G.hazardLevels.map(function (h) { return { value: h, label: h }; })
            ),
            value: "",
            onChange: function (v) { api.state.hazard = v; api.refresh(); },
          });

          // 搜尋框:用原生 input,不做自訂控制項
          var searchWrap = el("div", "pa-ctrl");
          var lab = el("div", "pa-ctrl__label");
          lab.appendChild(el("span", null, "搜尋"));
          searchWrap.appendChild(lab);
          var input = document.createElement("input");
          input.type = "search";
          input.className = "pa-gas-search";
          input.placeholder = "分子式、名稱或關鍵字(例如「聚合」)";
          input.setAttribute("aria-label", "搜尋氣體");
          input.addEventListener("input", function () {
            api.state.q = input.value.trim();
            api.refresh();
          });
          searchWrap.appendChild(input);

          api.el.appendChild(C.panel([famCtl, useCtl, hazCtl, searchWrap]));
          api.el.appendChild(readout);

          var caveat = el("div", "pa-lab__caveat");
          caveat.textContent =
            "⚠️ 安全欄位僅供教學理解。實際作業的危害分級、相容材質與洩漏應變," +
            "一律以供應商 SDS 與廠內氣體管理規範為準 —— 本站不是安全依據。";
          api.el.appendChild(caveat);

          api.el.appendChild(
            C.observations([
              "選「氟碳系」—— 八支氣體按 F/C 比排開,從 CF₄(4.0)到 CH₃F(1.0)。這一整排就是 A10 那條滑桿的實體。",
              "選「危害等級:極高」—— 只有 SiH₄ 與 B₂H₆ 兩支,都是自燃。它們的管制等級和其他氣體完全不同級。",
              "搜尋「聚合」—— 會找出所有以側壁鈍化為賣點的氣體。搜尋「伴熱」則會找出所有沸點接近室溫、管路必須加熱的。",
              "比較 NF₃ 與 C₂F₆ 的 GWP:NF₃ 反而更高(16100 vs 11100)。它取代 C₂F₆ 的理由是遠端解離率高、逃逸率低,不是 GWP 比較低 —— 這是很多人記反的一點。",
            ])
          );

          api.refresh();
        },

        reset: function () {
          this.state = { family: "", use: "", hazard: "", q: "" };
          this.refresh();
        },
      });
    },
    ["data/gases.js"]
  );
})((window.PA = window.PA || {}));
