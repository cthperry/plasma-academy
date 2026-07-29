/* ==========================================================================
   A07 — 製程電漿地圖互動
   章節 1.6 · 規格 docs/05-animation-spec.md

   目標:定位自己的製程,建立全景。

   驗收條件(docs/05):
     · 六大類與 docs/01 §1.6.1 表格一致
     · 每張卡至少一個連往 L2/L3 章節的連結

   地圖的兩個軸不是隨便選的:
     X = 壓力 → 決定 λ(1.3)→ 決定方向性
     Y = 電漿密度 → 決定鞘層厚度(1.5)→ 決定離子在鞘層裡會不會被撞歪
   所以這張圖不只是分類,它把 1.3 與 1.5 的結論疊在同一個平面上。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define("A07", function () {
    var C = PA.controls;
    var M = PA.model;

    /**
     * 六大類製程 —— 與 docs/01 §1.6.1 表格同源。
     * p 為壓力範圍 [mTorr],n 為電子密度範圍 [cm⁻³]。
     */
    var PROCESSES = [
      {
        key: "etch",
        label: "蝕刻",
        name: "電漿蝕刻",
        en: "Plasma Etching",
        token: "vizIonPos",
        p: [5, 100],
        n: [1e9, 1e12],
        goal: "移除材料、把光罩圖形轉印到薄膜上",
        gas: "氟系(CF₄/C₄F₈/SF₆/NF₃)、氯溴系(Cl₂/HBr/BCl₃)+ Ar/O₂",
        power: "source 200–2000 W,bias 20–500 W",
        tool: "CCP(介電質)、ICP/TCP(導體)",
        challenge: "同時要方向性、選擇比與均勻度 —— 三者互相拉扯,是整個製程最難調的一類",
        links: [
          ["2.2 製程氣體選用學", "../../2/2-2-gas-selection/"],
          ["3.1 蝕刻機制", "../../3/3-1-etch-mechanisms/"],
          ["3.3 缺陷圖鑑", "../../3/3-3-defect-atlas/"],
        ],
      },
      {
        key: "pecvd",
        label: "PECVD",
        name: "電漿輔助化學氣相沉積",
        en: "PECVD",
        token: "vizRadical",
        p: [1000, 10000],
        n: [1e9, 1e10],
        goal: "在 300–400 °C 就長出 SiO₂ / SiN / a-Si —— 熱 CVD 要 700 °C 以上",
        gas: "SiH₄、TEOS、NH₃、N₂O、N₂",
        power: "高頻 100–1000 W;低頻另外加以控制膜應力",
        tool: "CCP 平行板(噴淋頭即上電極)",
        challenge: "膜應力、氫含量、階梯覆蓋率;高壓下氣相反應易生微粒",
        links: [
          ["2.3 電漿化學基礎", "../../2/2-3-plasma-chemistry/"],
          ["3.4 電漿沉積", "../../3/3-4-deposition/"],
        ],
      },
      {
        key: "pvd",
        label: "PVD",
        name: "濺鍍(物理氣相沉積)",
        en: "PVD / Sputtering",
        token: "vizElectron",
        p: [1, 10],
        n: [1e10, 1e11],
        goal: "把靶材原子打下來鍍到晶圓上 —— 金屬層與阻障層的主力",
        gas: "Ar(反應式濺鍍另加 N₂ 或 O₂)",
        power: "DC 或 RF,1–20 kW",
        tool: "DC / RF magnetron(磁場把電子束縛在靶面)",
        challenge: "靶材 racetrack 侵蝕不均、階梯覆蓋、深孔填充需要離子化 PVD",
        links: [
          ["3.5 濺鍍 PVD 與其他", "../../3/3-5-pvd/"],
          ["2.5 電漿源與功率耦合", "../../2/2-5-plasma-sources/"],
        ],
      },
      {
        key: "ash",
        label: "灰化",
        name: "光阻灰化",
        en: "Photoresist Ashing / Stripping",
        token: "vizPolymer",
        p: [500, 2000],
        n: [1e10, 1e12],
        goal: "把光阻整片燒掉變成 CO₂ 與 H₂O 抽走",
        gas: "O₂ 為主,視情況加 N₂ / H₂ / 微量 CF₄",
        power: "微波 1–3 kW",
        tool: "Downstream / 微波下游電漿(電漿在上游,只送自由基下來)",
        challenge: "不能傷到下層與 low-k;離子必須留在上游,所以刻意做成遠端",
        links: [
          ["2.3 電漿化學基礎", "../../2/2-3-plasma-chemistry/"],
          ["4.3 電漿誘發損傷", "../../4/4-3-plasma-damage/"],
        ],
      },
      {
        key: "clean",
        label: "腔體清潔",
        name: "腔體清潔",
        en: "Chamber Clean",
        token: "vizIonNeg",
        p: [1000, 5000],
        n: [1e11, 1e12],
        goal: "把腔內累積的沉積物蝕掉,讓下一片晶圓面對一樣的腔體",
        gas: "NF₃(遠端)、C₂F₆ / CF₄ + O₂(原位)",
        power: "遠端源 3–6 kW",
        tool: "Remote plasma source(RPS)或原位電漿",
        challenge: "清乾淨與零件壽命的取捨;PFC 是強溫室氣體,NF₃ 遠端解離率高才被廣泛採用",
        links: [
          ["3.6 均勻度與腔體工程", "../../3/3-6-uniformity/"],
          ["4.6 量產、良率與安全", "../../4/4-6-production/"],
        ],
      },
      {
        key: "surface",
        label: "表面處理",
        name: "表面活化與處理",
        en: "Surface Treatment",
        token: "vizNeutral",
        p: [100, 1000],
        n: [1e9, 1e11],
        goal: "改變表面能:除有機物、親水化、提升接著力",
        gas: "O₂、Ar、N₂、H₂",
        power: "50–500 W",
        tool: "多樣 —— CCP、下游、大氣電漿都有",
        challenge: "效果會隨時間衰退(疏水回復),處理後到下一站的時間必須管控",
        links: [
          ["2.2 製程氣體選用學", "../../2/2-2-gas-selection/"],
          ["2.3 電漿化學基礎", "../../2/2-3-plasma-chemistry/"],
        ],
      },
    ];

    /** λ 等值線:λ 只跟壓力有關,所以是垂直線 */
    var LAMBDA_MARKS = [10, 1, 0.1, 0.01]; // cm

    /** 鞘層等值線:s ∝ 1/√n_e,所以是水平線(取代表性的 100 V、T_e = 3 eV) */
    var SHEATH_MARKS = [5, 1, 0.2]; // mm

    /** 由目標 λ [cm] 反推壓力 [mTorr] —— λ = k/p */
    function pressureForLambda(lambdaCm) {
      return (M.meanFreePath(1, "Ar") / lambdaCm) * 1;
    }

    /** 由目標鞘層厚度 [mm] 反推密度 [cm⁻³] —— s ∝ n^(−1/2) */
    function densityForSheath(sMm) {
      var ref = M.sheathThickness(1e10, 3, 100);
      return 1e10 * Math.pow(ref / sMm, 2);
    }

    return PA.lab.create({
      setup: function () {
        var api = this;

        api.state = { sel: "etch", showLambda: true, showSheath: false };

        var wrap = document.createElement("div");
        wrap.className = "pa-lab__split";
        var mapBox = document.createElement("div");
        var cardBox = document.createElement("div");
        wrap.appendChild(mapBox);
        wrap.appendChild(cardBox);
        api.stage.appendChild(wrap);

        api.plot = PA.plot.create({
          width: 600,
          height: 380,
          // 右邊留寬一點 —— 最後一個刻度是「1000 Torr」,窄了會被切掉
          margin: { t: 18, r: 48, b: 46, l: 66 },
          x: {
            min: 0.1,
            max: 1e6,
            log: true,
            label: "壓力 (mTorr)",
            format: function (v) {
              return v >= 1000 ? v / 1000 + " Torr" : String(v);
            },
          },
          y: { min: 1e8, max: 1e13, log: true, label: "電子密度 n_e (cm⁻³)" },
        });
        api.plot.svg.setAttribute(
          "aria-label",
          "製程電漿地圖:橫軸為壓力、縱軸為電子密度,六大類電漿製程各佔一塊區域。" +
            "蝕刻與濺鍍在低壓區,PECVD、灰化與腔體清潔在高壓區。"
        );
        mapBox.appendChild(api.plot.svg);

        // --- 資訊卡 ---
        var card = document.createElement("div");
        card.className = "pa-map-card";
        cardBox.appendChild(card);
        api.card = card;

        var readout = C.readout([
          { key: "p", label: "壓力窗", format: function (v) { return v; } },
          { key: "n", label: "電子密度", format: function (v) { return v; } },
          { key: "lam", label: "該壓力的 λ", format: function (v) { return v; } },
          { key: "sheath", label: "該密度的鞘層厚度", format: function (v) { return v; } },
        ]);
        api.readoutNode = readout;

        var procCtl = C.segmented({
          label: "製程",
          options: PROCESSES.map(function (p) { return { value: p.key, label: p.label }; }),
          value: "etch",
          onChange: function (v) { api.state.sel = v; api.refresh(); },
        });
        api.procCtl = procCtl;

        var lamCtl = C.toggle({
          label: "顯示 λ 等值線(1.3)",
          value: true,
          onChange: function (v) { api.state.showLambda = v; api.refresh(); },
        });

        var sheathCtl = C.toggle({
          label: "顯示鞘層厚度等值線(1.5)",
          value: false,
          onChange: function (v) { api.state.showSheath = v; api.refresh(); },
        });

        /** 目前選到的製程 */
        api.current = function () {
          for (var i = 0; i < PROCESSES.length; i++) {
            if (PROCESSES[i].key === api.state.sel) return PROCESSES[i];
          }
          return PROCESSES[0];
        };

        function fmtPressure(mTorr) {
          return mTorr >= 1000 ? mTorr / 1000 + " Torr" : mTorr + " mTorr";
        }
        function fmtDensity(n) {
          return "10" + C.sup(Math.round(Math.log10(n)));
        }
        function fmtLength(cm) {
          if (cm >= 1) return cm.toFixed(1) + " cm";
          if (cm >= 0.1) return (cm * 10).toFixed(1) + " mm";
          return (cm * 1e4).toFixed(0) + " µm";
        }

        /** 畫一塊製程區域 */
        function region(proc, active, pal, index) {
          var pl = api.plot;
          var x1 = pl.sx(proc.p[0]);
          var x2 = pl.sx(proc.p[1]);
          var y1 = pl.sy(proc.n[1]);
          var y2 = pl.sy(proc.n[0]);
          var g = PA.plot.svgEl("g", { class: "pa-map__region" });
          g.appendChild(
            PA.plot.svgEl("rect", {
              x: x1, y: y1, width: Math.max(x2 - x1, 6), height: Math.max(y2 - y1, 6),
              rx: 6,
              fill: pal[proc.token],
              opacity: active ? 0.3 : 0.1,
              stroke: pal[proc.token],
              "stroke-width": active ? 2.4 : 1.2,
            })
          );
          // 標籤靠區塊左上角,不置中 —— 區域彼此重疊,置中會讓標籤疊在一起
          var t = PA.plot.svgEl("text", {
            x: x1 + 6,
            // 相鄰區塊的上緣常常一樣高(例如灰化與腔體清潔),交錯排開才不會疊字
            y: y1 + 15 + (index % 2) * 16,
            fill: active ? pal.text : pal.textMuted,
            "font-size": 12,
            "font-weight": active ? 700 : 500,
          });
          t.textContent = proc.label;
          g.appendChild(t);

          // 點區域即選取。鍵盤操作走上方的分段按鈕,所以這裡對輔助技術隱藏。
          g.setAttribute("aria-hidden", "true");
          g.style.cursor = "pointer";
          g.addEventListener("click", function () {
            api.procCtl.setValue(proc.key, true);
            api.state.sel = proc.key;
            api.refresh();
          });
          return g;
        }

        api.refresh = function () {
          var pl = api.plot;
          var pal = PA.canvasTheme.palette();
          var cur = api.current();
          pl.clear();

          // λ 等值線 —— 低壓在左,λ 大,方向性好
          if (api.state.showLambda) {
            LAMBDA_MARKS.forEach(function (lam) {
              var p = pressureForLambda(lam);
              if (p < 0.1 || p > 1e6) return;
              pl.vline(p, { stroke: pal.warning, dash: "3 4" });
              pl.label(p, 1e13, "λ = " + fmtLength(lam), {
                fill: pal.warning, dx: 4, dy: 12, size: 10, weight: 500,
              });
            });
          }

          // 鞘層厚度等值線 —— 高密度在上,鞘層薄
          if (api.state.showSheath) {
            SHEATH_MARKS.forEach(function (s) {
              var n = densityForSheath(s);
              if (n < 1e8 || n > 1e13) return;
              pl.hline(n, { stroke: pal.primary, dash: "3 4" });
              pl.label(0.1, n, "鞘層 " + s + " mm", {
                fill: pal.primary, dx: 6, dy: -5, size: 10, weight: 500,
              });
            });
          }

          PROCESSES.forEach(function (proc, i) {
            pl.layers.data.appendChild(region(proc, proc.key === cur.key, pal, i));
          });

          // --- 資訊卡 ---
          var lamLo = M.meanFreePath(cur.p[1], "Ar"); // 壓力高 → λ 小
          var lamHi = M.meanFreePath(cur.p[0], "Ar");
          var sLo = M.sheathThickness(cur.n[1], 3, 100); // 密度高 → 鞘層薄
          var sHi = M.sheathThickness(cur.n[0], 3, 100);

          api.readoutNode.update({
            p: fmtPressure(cur.p[0]) + " – " + fmtPressure(cur.p[1]),
            n: fmtDensity(cur.n[0]) + " – " + fmtDensity(cur.n[1]) + " cm⁻³",
            lam: fmtLength(lamLo) + " – " + fmtLength(lamHi),
            sheath: sLo.toFixed(2) + " – " + sHi.toFixed(2) + " mm",
          });

          api.card.textContent = "";
          var h = document.createElement("div");
          h.className = "pa-map-card__head";
          var zh = document.createElement("strong");
          zh.textContent = cur.name;
          var en = document.createElement("span");
          en.textContent = cur.en;
          h.appendChild(zh);
          h.appendChild(en);
          api.card.appendChild(h);

          [
            ["目的", cur.goal],
            ["典型氣體", cur.gas],
            ["功率", cur.power],
            ["機台型式", cur.tool],
            ["關鍵挑戰", cur.challenge],
          ].forEach(function (row) {
            var d = document.createElement("div");
            d.className = "pa-map-card__row";
            var k = document.createElement("span");
            k.className = "pa-map-card__key";
            k.textContent = row[0];
            var v = document.createElement("span");
            v.textContent = row[1];
            d.appendChild(k);
            d.appendChild(v);
            api.card.appendChild(d);
          });

          var links = document.createElement("div");
          links.className = "pa-map-card__links";
          var lt = document.createElement("span");
          lt.className = "pa-map-card__key";
          lt.textContent = "接下來讀";
          links.appendChild(lt);
          cur.links.forEach(function (l) {
            var a = document.createElement("a");
            a.href = l[1];
            a.textContent = l[0];
            links.appendChild(a);
          });
          api.card.appendChild(links);
        };

        api.el.appendChild(C.panel([procCtl, lamCtl, sheathCtl]));
        api.el.appendChild(readout);
        api.el.appendChild(
          C.observations([
            "先看橫軸的分佈:蝕刻與濺鍍擠在最左邊(低壓),PECVD、灰化、腔體清潔都在右邊(高壓)。分水嶺就是「要不要方向性」。",
            "打開 λ 等值線 —— 蝕刻與 PVD 落在 λ 約 1 cm 以上的區域,離子與濺射原子飛得過去且不被撞歪;PECVD 那一區的 λ 只剩幾 µm,粒子早就散開了,但沉積正好不需要方向性。",
            "打開鞘層等值線 —— 縱軸越高鞘層越薄。ICP 蝕刻在地圖上端,鞘層只有零點幾 mm,離子穿越時幾乎不碰撞。",
            "灰化刻意做成下游式:電漿在上游,只有自由基流下來。地圖上它的密度不低,但晶圓看到的離子很少 —— 這是「要化學不要轟擊」的設計。",
            "找到自己負責的製程,把它的壓力窗與密度記下來。L2 之後所有的討論都會回到這兩個座標。",
          ])
        );

        api.refresh();
      },

      reset: function () {
        this.state.sel = "etch";
        this.procCtl.setValue("etch", true);
        this.refresh();
      },
    });
  });
})((window.PA = window.PA || {}));
