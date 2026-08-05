/* ==========================================================================
   A21 — 缺陷診斷器
   章節 3.3 · 規格 docs/05-animation-spec.md

   目標:提供可實際使用的診斷工具,同時是圖鑑的互動入口。

   三步:選症狀 → 補條件 → 看可能成因排序 + 判別方法 + 對策旋鈕。

   **設計上最重要的一條**(docs/05 明列):輸出必須誠實顯示
   「這個症狀有多個可能成因」與「如何進一步區分」,而不是給一個武斷答案。
   所以條件只用來調整**排序**,不會把選項刪掉;而且每一種缺陷都會列出
   至少兩個**可以真的去做的實驗**(資料實測最少 4 個)。

   全部資料驅動:症狀、成因、判別、對策、相關缺陷都來自 data/defects.js,
   由 tools/check-defects.mjs 守住。這裡沒有第二份真相。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A21",
    function () {
      var C = PA.controls;
      var D = PA.defects;
      var el = C.el;

      var CONDS = [
        { key: "insulator", label: "下層是絕緣體" },
        { key: "arrayEdge", label: "只出現在陣列邊緣" },
        { key: "recipeChanged", label: "recipe 最近有動過" },
        { key: "wholeWafer", label: "全片一致(非局部)" },
      ];

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = { id: "arde", cond: {} };

          var box = el("div", "pa-diag");
          api.stage.appendChild(box);
          api.box = box;

          api.render = function () {
            var d = D.byId(api.state.id);
            box.textContent = "";
            if (!d) return;

            /**
             * 數值面板刻意放這四個數字。它們本身就是這個工具的主張:
             * **一個症狀對應到好幾個成因**,而判別方法比成因還多 ——
             * 看到「3 個可能成因 / 6 個判別方法」就不會急著動旋鈕。
             */
            if (api.readoutNode) {
              api.readoutNode.update({
                causes: D.rank(api.state.id, api.state.cond).length,
                methods: D.methodsFor(api.state.id).length,
                fixes: d.fixes.length,
                risk: d.risk === "high" ? "🔴 高風險" : "一般",
              });
            }

            /* --- 步驟一:目前選到的症狀 --- */
            var head = el("div", "pa-map-card");
            var h1 = el("div", "pa-map-card__head");
            var strong = el("strong");
            strong.textContent = d.zh + "  ·  " + d.en;
            h1.appendChild(strong);
            head.appendChild(h1);
            var sym = el("p");
            sym.textContent = "【症狀】" + d.symptom;
            head.appendChild(sym);
            if (d.risk === "high") {
              var risk = el("p");
              risk.className = "pa-diag__risk";
              risk.textContent = "🔴 高風險項目 —— 這一類缺陷會在出腔後持續惡化,務必依廠內規範處理。";
              head.appendChild(risk);
            }
            box.appendChild(head);

            /* --- 步驟三:可能成因排序 --- */
            var ranked = D.rank(api.state.id, api.state.cond);
            var causeSec = el("div", "pa-diag__sec");
            var ct = el("div", "pa-diag__title");
            ct.textContent = "① 可能成因(依目前條件排序)";
            causeSec.appendChild(ct);
            var ol = el("ol", "pa-diag__list");
            ranked.forEach(function (c) {
              var li = el("li");
              var t = el("span");
              t.textContent = c.text;
              li.appendChild(t);
              c.notes.forEach(function (n) {
                var note = el("div", "pa-diag__note");
                note.textContent = "↳ " + n;
                li.appendChild(note);
              });
              ol.appendChild(li);
            });
            causeSec.appendChild(ol);
            if (ranked.length > 1) {
              var warn = el("p", "pa-subtle");
              warn.textContent =
                "⚠️ 這個症狀有 " + ranked.length + " 個可能成因。排序只是起點," +
                "**下面的判別方法才是收斂的關鍵** —— 不要看到第一項就動旋鈕。";
              causeSec.appendChild(warn);
            }
            box.appendChild(causeSec);

            /* --- 判別方法 --- */
            var methods = D.methodsFor(api.state.id);
            var mSec = el("div", "pa-diag__sec");
            var mt = el("div", "pa-diag__title");
            mt.textContent = "② 怎麼區分(" + methods.length + " 個方法)";
            mSec.appendChild(mt);
            var ul = el("ul", "pa-diag__list");
            methods.forEach(function (m) {
              var li = el("li");
              var tag = el("span", "pa-diag__tag");
              tag.textContent = m.kind === "diff" ? "判別" : m.kind === "vs" ? "易混淆" : "做實驗";
              li.appendChild(tag);
              var t2 = el("span");
              t2.textContent = " " + m.text;
              li.appendChild(t2);
              ul.appendChild(li);
            });
            mSec.appendChild(ul);
            box.appendChild(mSec);

            /* --- 對策旋鈕 --- */
            var fSec = el("div", "pa-diag__sec");
            var ft = el("div", "pa-diag__title");
            ft.textContent = "③ 對策旋鈕(每一個都有副作用)";
            fSec.appendChild(ft);
            var tbl = el("table", "pa-table");
            var thead = el("thead");
            var trh = el("tr");
            ["旋鈕", "方向", "為什麼有效", "副作用"].forEach(function (x) {
              var th = el("th");
              th.textContent = x;
              trh.appendChild(th);
            });
            thead.appendChild(trh);
            tbl.appendChild(thead);
            var tb = el("tbody");
            d.fixes.forEach(function (f) {
              var tr = el("tr");
              [f.knob, f.dir, f.why, f.sideEffect].forEach(function (x) {
                var td = el("td");
                td.textContent = x;
                tr.appendChild(td);
              });
              tb.appendChild(tr);
            });
            tbl.appendChild(tb);
            var wrapT = el("div", "pa-table-wrap");
            wrapT.appendChild(tbl);
            fSec.appendChild(wrapT);
            box.appendChild(fSec);

            /* --- 延伸 --- */
            if (d.ch) {
              var ref = el("p", "pa-subtle");
              ref.textContent = "延伸閱讀:" + d.ch;
              box.appendChild(ref);
            }
          };

          /* --- 控制項 --- */
          var catSel = C.segmented({
            label: "缺陷分類",
            options: D.categories.map(function (c) { return { value: c.key, label: c.name }; }),
            value: D.byId(api.state.id).cat,
            onChange: function (v) {
              var list = D.all.filter(function (x) { return x.cat === v; });
              if (!list.length) return;
              api.state.id = list[0].id;
              rebuildDefectPicker(v);
              api.render();
            },
          });

          /**
           * 症狀選擇用 SVG 剖面縮圖,不用文字清單(docs/05 A21 規格明列)。
           * D.svg 來自 data/defect-svg.js;每張縮圖的幾何都反推自
           * defects.js 已有的 symptom/causes/distinguish 文字,不是另一份真相。
           */
          function svgSymptomPicker(opts) {
            var wrap = el("div", "pa-ctrl");
            var lab = el("div", "pa-ctrl__label");
            var n = el("span");
            n.textContent = opts.label;
            lab.appendChild(n);
            wrap.appendChild(lab);

            var grid = el("div", "pa-defect-grid", { role: "radiogroup", "aria-label": opts.label });
            var current = opts.value;
            var cards = [];

            opts.options.forEach(function (o) {
              var card = el("button", "pa-defect-pick", {
                type: "button",
                role: "radio",
                "aria-checked": String(o.value === current),
              });
              card.innerHTML = D.svg(o.value);
              var cap = el("span", "pa-defect-pick__label");
              cap.textContent = o.label;
              card.appendChild(cap);
              card.addEventListener("click", function () {
                current = o.value;
                sync();
                if (opts.onChange) opts.onChange(current);
              });
              cards.push({ btn: card, value: o.value });
              grid.appendChild(card);
            });

            function sync() {
              cards.forEach(function (x) {
                x.btn.setAttribute("aria-checked", String(x.value === current));
              });
            }

            wrap.appendChild(grid);
            return wrap;
          }

          var pickerHost = el("div");
          var currentPicker = null;
          function rebuildDefectPicker(cat) {
            var list = D.all.filter(function (x) { return x.cat === cat; });
            pickerHost.textContent = "";
            currentPicker = svgSymptomPicker({
              label: "症狀(依剖面外觀選)",
              options: list.map(function (x) { return { value: x.id, label: x.zh }; }),
              value: api.state.id,
              onChange: function (v) {
                api.state.id = v;
                api.render();
              },
            });
            pickerHost.appendChild(currentPicker);
          }
          rebuildDefectPicker(D.byId(api.state.id).cat);

          var condCtrls = CONDS.map(function (c) {
            return C.toggle({
              label: c.label,
              value: false,
              onChange: function (v) {
                api.state.cond[c.key] = v;
                api.render();
              },
            });
          });

          var readout = C.readout([
            { key: "causes", label: "可能成因", digits: 0, unit: " 個" },
            { key: "methods", label: "判別方法", digits: 0, unit: " 個" },
            { key: "fixes", label: "對策旋鈕", digits: 0, unit: " 個" },
            { key: "risk", label: "風險等級", format: function (v) { return v; } },
          ]);
          api.readoutNode = readout;

          api.el.appendChild(C.panel([catSel, pickerHost].concat(condCtrls)));
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "**先選症狀,再補條件。** 條件只會改變成因的**排序**,不會把選項刪掉 —— 診斷器的價值在於誠實告訴你「還有哪些可能」,不是給一個看起來很篤定的單一答案。",
              "勾「下層是絕緣體」看 notching 或 footing 的排序怎麼變:充電類的成因會被推到最前面。**絕緣下層是充電效應的必要條件** —— 沒有它就不必往那個方向查。",
              "看第 ② 區的「做實驗」那幾條:**每一條都是可以真的去做的動作**,而且會告訴你不同結果各代表什麼。轉片實驗、換 CD、換密度、比首片與第 25 片 —— 這四個實驗能把大部分問題切開。",
              "第 ③ 區每個旋鈕都附**副作用**。這是刻意的:製程調整沒有免費的方向,ARDE 靠降壓改善就要接受速率下降。看到只講好處的建議要提高警覺。",
              "勾「recipe 最近有動過」:提示會叫你先回頭對照 2.6 的因果鏈。**這是診斷流程的第一步,也是最常被跳過的一步** —— 有人動過參數卻先去查硬體,是最浪費時間的路徑。",
            ])
          );

          api.render();
        },

        reset: function () {
          this.state = { id: "arde", cond: {} };
          this.render();
        },
      });
    },
    ["data/defects.js", "data/defect-svg.js"]
  );
})((window.PA = window.PA || {}));
