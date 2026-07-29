/* ==========================================================================
   gases.js — 製程氣體資料庫(32 種)
   來源:docs/02-level2-intermediate.md §2.2

   同一份資料同時餵給:氣體百科頁、決策樹(A09)、F/C 滑桿(A10)、
   百科瀏覽器(A11)、章節內文。改這裡就好,不要在別處抄一份。

   ⚠️ 安全資料僅供教學理解使用。
      實際作業的危害分級、相容材質、洩漏應變一律以「供應商 SDS」與
      「廠內氣體管理規範」為準 —— 本站不是安全依據。
      這一點在氣體百科頁面上也會明白寫給使用者看。

   欄位說明
     id        識別字(URL 與程式用)
     formula   分子式(F/C 比由此推算,不手填)
     zh / en   中英名稱
     family    家族 key(對應下方 FAMILIES)
     mw        分子量
     bp        沸點 °C(sub = 昇華)
     ie        第一游離能 eV
     bond      主要鍵能,{ label, kJ } —— 解離難易的直覺來源
     radicals  主要解離產物與自由基
     uses      用途標籤(對應 USES)
     flow      典型流量範圍
     hazard    { level, tags, gwp }  level: 極高 / 高 / 中 / 低
     ok / no   相容材質 / 禁用材質
     products  主要蝕刻或反應產物
     scrubber  排氣處理型式
     faults    常見故障模式
     note      一句話重點
   ========================================================================== */

(function (PA) {
  "use strict";

  var FAMILIES = [
    { key: "inert", name: "惰性氣體", desc: "物理轟擊、稀釋、穩定電漿" },
    { key: "fc", name: "氟碳系", desc: "介電質蝕刻核心,F/C 比決定蝕刻↔沉積" },
    { key: "f", name: "其他氟系", desc: "無碳、高 F 產率,不聚合" },
    { key: "clbr", name: "氯溴系", desc: "導體蝕刻主力" },
    { key: "ox", name: "氧化性氣體", desc: "灰化、調 F/C、側壁鈍化、PECVD 氧源" },
    { key: "nred", name: "氮化與還原", desc: "PECVD 氮源、降 F/C、還原" },
    { key: "prec", name: "前驅物", desc: "薄膜的元素來源" },
  ];

  var USES = [
    { key: "etch-diel", name: "介電質蝕刻" },
    { key: "etch-cond", name: "導體蝕刻" },
    { key: "etch-si", name: "矽蝕刻" },
    { key: "sputter", name: "物理轟擊 / 濺鍍" },
    { key: "passivate", name: "側壁鈍化" },
    { key: "ash", name: "光阻灰化" },
    { key: "cvd", name: "PECVD 沉積" },
    { key: "clean", name: "腔體清潔" },
    { key: "dilute", name: "稀釋 / 載氣" },
    { key: "surface", name: "表面處理" },
    { key: "diag", name: "診斷內標" },
    { key: "thermal", name: "熱傳 / 背吹" },
  ];

  /* eslint-disable */
  var GASES = [
    // ---- 惰性氣體 -------------------------------------------------------
    {
      id: "he", formula: "He", zh: "氦", en: "Helium", family: "inert",
      mw: 4.003, bp: -268.9, ie: 24.59, bond: null,
      radicals: ["He⁺", "He*(準穩態 19.8 eV)"],
      uses: ["dilute", "thermal", "surface"],
      flow: "50–500 sccm(製程);背吹 5–20 Torr",
      hazard: { level: "低", tags: ["窒息"], gwp: null },
      ok: ["不鏽鋼", "鋁", "多數彈性體"],
      no: [],
      products: ["不參與反應"],
      scrubber: "不需要",
      faults: ["背吹洩漏率上升 → 夾持不良、晶圓溫度失控", "純度不足引入水氣"],
      note: "游離能最高(24.6 eV),幾乎不被游離,所以稀釋時對電漿擾動最小;熱導率高是背吹的原因。",
    },
    {
      id: "ar", formula: "Ar", zh: "氬", en: "Argon", family: "inert",
      mw: 39.95, bp: -185.8, ie: 15.76, bond: null,
      radicals: ["Ar⁺", "Ar*(準穩態 11.5 / 11.7 eV)"],
      uses: ["sputter", "dilute", "diag", "clean", "surface"],
      flow: "10–500 sccm",
      hazard: { level: "低", tags: ["窒息"], gwp: null },
      ok: ["不鏽鋼", "鋁", "多數彈性體"],
      no: [],
      products: ["不參與反應(僅動量傳遞)"],
      scrubber: "不需要",
      faults: ["流量計漂移 → 總壓與稀釋比同時改變,兩個變因一起動"],
      note: "三重身分:物理轟擊源、稀釋劑、電漿穩定劑。750.4 nm 譜線是 OES actinometry 的標準內標。",
    },
    {
      id: "kr", formula: "Kr", zh: "氪", en: "Krypton", family: "inert",
      mw: 83.80, bp: -153.2, ie: 14.00, bond: null,
      radicals: ["Kr⁺"],
      uses: ["sputter", "dilute"],
      flow: "5–100 sccm",
      hazard: { level: "低", tags: ["窒息"], gwp: null },
      ok: ["不鏽鋼", "鋁"],
      no: [],
      products: ["不參與反應"],
      scrubber: "不需要",
      faults: ["成本高,通常只在特定製程使用"],
      note: "比 Ar 重一倍,濺鍍產率更高但價格昂貴。特殊應用才用。",
    },
    {
      id: "xe", formula: "Xe", zh: "氙", en: "Xenon", family: "inert",
      mw: 131.29, bp: -108.1, ie: 12.13, bond: null,
      radicals: ["Xe⁺"],
      uses: ["sputter", "dilute"],
      flow: "5–50 sccm",
      hazard: { level: "低", tags: ["窒息"], gwp: null },
      ok: ["不鏽鋼", "鋁"],
      no: [],
      products: ["不參與反應"],
      scrubber: "不需要",
      faults: ["極昂貴,通常回收使用"],
      note: "最重的實用惰性氣體,濺鍍產率最高;游離能最低(12.1 eV)所以最容易點火。",
    },
    {
      id: "n2", formula: "N2", zh: "氮", en: "Nitrogen", family: "nred",
      mw: 28.01, bp: -195.8, ie: 15.58, bond: { label: "N≡N", kJ: 945 },
      radicals: ["N", "N₂⁺", "N₂*"],
      uses: ["dilute", "cvd", "surface", "passivate"],
      flow: "50–1000 sccm",
      hazard: { level: "低", tags: ["窒息"], gwp: null },
      ok: ["不鏽鋼", "鋁", "多數彈性體"],
      no: [],
      products: ["SiN(沉積)", "CN(蝕刻光阻時)"],
      scrubber: "不需要",
      faults: ["N₂ purge 不足導致水氣殘留", "微量 N₂ 洩漏會改變電漿化學而不易察覺"],
      note: "N≡N 鍵能 945 kJ/mol 是所有常用氣體最高的,所以 N₂ 解離率低 —— PECVD SiN 才要改用 NH₃。",
    },

    // ---- 氟碳系 ---------------------------------------------------------
    {
      id: "cf4", formula: "CF4", zh: "四氟化碳", en: "Carbon Tetrafluoride", family: "fc",
      mw: 88.00, bp: -128.0, ie: 16.2, bond: { label: "C–F", kJ: 485 },
      radicals: ["F", "CF₃", "CF₂", "CF"],
      uses: ["etch-diel", "etch-si", "clean"],
      flow: "20–200 sccm",
      hazard: { level: "中", tags: ["窒息", "溫室氣體"], gwp: 6630 },
      ok: ["不鏽鋼", "鋁", "PTFE"],
      no: ["高溫下的部分彈性體"],
      products: ["SiF₄", "COF₂", "CO"],
      scrubber: "燃燒式或電漿式(PFC 減量)",
      faults: ["GWP 6630,排放受管制", "純 CF₄ 蝕刻等向性強,側壁保護不足"],
      note: "F/C = 4,氟碳系裡最偏蝕刻端。通用但選擇比差,先進節點已大量被 C₄F₈ / C₄F₆ 取代。",
    },
    {
      id: "c2f6", formula: "C2F6", zh: "六氟乙烷", en: "Hexafluoroethane", family: "fc",
      mw: 138.01, bp: -78.2, ie: 13.6, bond: { label: "C–F", kJ: 485 },
      radicals: ["F", "CF₃", "CF₂"],
      uses: ["clean", "etch-diel"],
      flow: "50–500 sccm",
      hazard: { level: "中", tags: ["窒息", "溫室氣體"], gwp: 11100 },
      ok: ["不鏽鋼", "鋁", "PTFE"],
      no: [],
      products: ["SiF₄", "COF₂"],
      scrubber: "燃燒式(逃逸率高,減量困難)",
      faults: ["GWP 11100 且遠端解離不完全 → 逃逸率高,已大量被 NF₃ 取代"],
      note: "F/C = 3。曾是腔體清潔標準,但解離不完全加上 GWP 太高,讓位給 NF₃。",
    },
    {
      id: "chf3", formula: "CHF3", zh: "三氟甲烷", en: "Trifluoromethane / Fluoroform", family: "fc",
      mw: 70.01, bp: -82.1, ie: 13.86, bond: { label: "C–F", kJ: 485 },
      radicals: ["F", "CF₃", "CF₂", "H", "HF"],
      uses: ["etch-diel", "passivate"],
      flow: "10–100 sccm",
      hazard: { level: "中", tags: ["窒息", "溫室氣體"], gwp: 12400 },
      ok: ["不鏽鋼", "鋁", "PTFE"],
      no: [],
      products: ["SiF₄", "HF", "COF₂"],
      scrubber: "燃燒式",
      faults: ["聚合物累積導致 chamber memory,需定期清潔"],
      note: "F/C = 3,但含 H 會消耗 F 生成 HF,有效 F/C 比帳面更低 → 中度聚合,SiO₂ 蝕刻常用。",
    },
    {
      id: "ch2f2", formula: "CH2F2", zh: "二氟甲烷", en: "Difluoromethane", family: "fc",
      mw: 52.02, bp: -51.6, ie: 12.71, bond: { label: "C–F", kJ: 485 },
      radicals: ["F", "CF₂", "CHF", "H", "HF"],
      uses: ["etch-diel", "passivate"],
      flow: "5–50 sccm",
      hazard: { level: "中", tags: ["可燃", "窒息", "溫室氣體"], gwp: 677 },
      ok: ["不鏽鋼", "鋁", "PTFE"],
      no: [],
      products: ["SiF₄", "HF"],
      scrubber: "燃燒式",
      faults: ["聚合太厚導致 etch stop,尤其在小開口"],
      note: "F/C = 2 且含兩個 H,高聚合。SiN spacer 蝕刻對 Si 高選擇比的主力。",
    },
    {
      id: "ch3f", formula: "CH3F", zh: "氟甲烷", en: "Fluoromethane", family: "fc",
      mw: 34.03, bp: -78.4, ie: 12.5, bond: { label: "C–F", kJ: 485 },
      radicals: ["F", "CHF", "CH₂", "H", "HF"],
      uses: ["etch-diel", "passivate"],
      flow: "2–30 sccm",
      hazard: { level: "中", tags: ["可燃", "窒息", "溫室氣體"], gwp: 116 },
      ok: ["不鏽鋼", "鋁", "PTFE"],
      no: [],
      products: ["SiF₄", "HF", "聚合物"],
      scrubber: "燃燒式",
      faults: ["極易 etch stop,製程窗很窄"],
      note: "F/C = 1,聚合最強的氟碳氣體之一。SiN 對 Si 選擇比可推到極高,代價是製程窗窄。",
    },
    {
      id: "c4f8", formula: "C4F8", zh: "八氟環丁烷", en: "Octafluorocyclobutane", family: "fc",
      mw: 200.03, bp: -6.0, ie: 11.6, bond: { label: "C–F", kJ: 485 },
      radicals: ["CF₂(主要)", "CF₃", "F", "C₂F₄"],
      uses: ["etch-diel", "passivate"],
      flow: "5–50 sccm",
      hazard: { level: "中", tags: ["窒息", "溫室氣體"], gwp: 9540 },
      ok: ["不鏽鋼", "鋁", "PTFE"],
      no: [],
      products: ["SiF₄", "COF₂", "CFx 聚合物"],
      scrubber: "燃燒式",
      faults: ["沸點 −6 °C,管路過冷會凝結 → 流量不穩", "聚合物剝落成為微粒來源"],
      note: "F/C = 2,解離後以 CF₂ 為主 —— CF₂ 正是聚合物的建構單元。HAR 接觸孔與 Bosch 鈍化步的主力。",
    },
    {
      id: "c4f6", formula: "C4F6", zh: "六氟丁二烯", en: "Hexafluoro-1,3-butadiene", family: "fc",
      mw: 162.03, bp: 6.0, ie: 10.2, bond: { label: "C=C / C–F", kJ: 485 },
      radicals: ["CF₂", "C₂F₃", "F"],
      uses: ["etch-diel", "passivate"],
      flow: "5–40 sccm",
      hazard: { level: "中", tags: ["毒性", "溫室氣體"], gwp: 290 },
      ok: ["不鏽鋼", "PTFE"],
      no: ["部分彈性體"],
      products: ["SiF₄", "CFx 聚合物"],
      scrubber: "燃燒式",
      faults: ["沸點 6 °C,管路必須伴熱", "價格昂貴"],
      note: "F/C = 1.5,聚合能力比 C₄F₈ 更強。GWP 只有 290(不飽和鍵在大氣中易分解),先進節點 HAR 的主流。",
    },
    {
      id: "c5f8", formula: "C5F8", zh: "八氟環戊烯", en: "Octafluorocyclopentene", family: "fc",
      mw: 212.04, bp: 27.0, ie: 10.5, bond: { label: "C=C / C–F", kJ: 485 },
      radicals: ["CF₂", "C₂F₄", "F"],
      uses: ["etch-diel", "passivate"],
      flow: "5–30 sccm",
      hazard: { level: "中", tags: ["毒性", "溫室氣體"], gwp: 258 },
      ok: ["不鏽鋼", "PTFE"],
      no: ["部分彈性體"],
      products: ["SiF₄", "CFx 聚合物"],
      scrubber: "燃燒式",
      faults: ["沸點 27 °C,室溫下接近液態,管路與 MFC 必須加熱"],
      note: "F/C = 1.6,與 C₄F₆ 同屬低 GWP 的不飽和氟碳。HAR 蝕刻的另一個選擇。",
    },

    // ---- 其他氟系 -------------------------------------------------------
    {
      id: "sf6", formula: "SF6", zh: "六氟化硫", en: "Sulfur Hexafluoride", family: "f",
      mw: 146.06, bp: -64.0, ie: 15.3, bond: { label: "S–F", kJ: 327 },
      radicals: ["F(產率極高)", "SF₅", "SF₄", "SF₃"],
      uses: ["etch-si", "clean"],
      flow: "20–300 sccm",
      hazard: { level: "中", tags: ["窒息", "溫室氣體"], gwp: 23500 },
      ok: ["不鏽鋼", "鋁", "PTFE"],
      no: ["高溫下的銅合金"],
      products: ["SiF₄", "SOF₂", "SO₂F₂"],
      scrubber: "燃燒式 + 濕式(去除 SOx)",
      faults: ["GWP 23500,是所有製程氣體中最高", "無碳不聚合 → 側壁毫無保護,單用必然等向"],
      note: "F 產率最高的實用氣體,而且完全無碳 → 不聚合 → 強等向性。Bosch 製程用它做蝕刻步,靠 C₄F₈ 補鈍化。",
    },
    {
      id: "nf3", formula: "NF3", zh: "三氟化氮", en: "Nitrogen Trifluoride", family: "f",
      mw: 71.00, bp: -129.0, ie: 13.0, bond: { label: "N–F", kJ: 301 },
      radicals: ["F(產率最高)", "NF₂", "NF", "N"],
      uses: ["clean", "etch-si"],
      flow: "100–2000 sccm(遠端清潔)",
      hazard: { level: "高", tags: ["劇毒", "強氧化", "溫室氣體"], gwp: 16100 },
      ok: ["不鏽鋼(鈍化處理)", "蒙乃爾", "鎳"],
      no: ["油脂", "有機物", "部分彈性體"],
      products: ["SiF₄", "N₂", "NOx"],
      scrubber: "燃燒式或乾式吸附",
      faults: ["強氧化性,管路殘留油脂會劇烈反應", "遠端源零件受 F 侵蝕"],
      note: "N–F 鍵能只有 301 kJ/mol,遠端電漿中幾乎完全分解 → 逃逸率極低,這才是它取代 C₂F₆ 的關鍵。",
    },
    {
      id: "f2", formula: "F2", zh: "氟", en: "Fluorine", family: "f",
      mw: 38.00, bp: -188.1, ie: 15.70, bond: { label: "F–F", kJ: 159 },
      radicals: ["F(不需解離即可提供)"],
      uses: ["clean", "etch-si"],
      flow: "通常以 N₂ 稀釋至 5–20 % 使用",
      hazard: { level: "高", tags: ["劇毒", "強腐蝕", "強氧化"], gwp: null },
      ok: ["蒙乃爾", "鎳", "鈍化不鏽鋼"],
      no: ["幾乎所有有機物", "油脂", "多數彈性體"],
      products: ["SiF₄"],
      scrubber: "乾式吸附 + 濕式",
      faults: ["最難處理的氣體之一,管路必須完全鈍化", "微量洩漏即造成嚴重腐蝕"],
      note: "F–F 鍵能只有 159 kJ/mol,不必電漿就能反應。反應性極強是優點也是全部的麻煩。",
    },

    // ---- 氯溴系 ---------------------------------------------------------
    {
      id: "cl2", formula: "Cl2", zh: "氯", en: "Chlorine", family: "clbr",
      mw: 70.90, bp: -34.0, ie: 11.48, bond: { label: "Cl–Cl", kJ: 243 },
      radicals: ["Cl", "Cl⁺", "Cl⁻(電負性)"],
      uses: ["etch-cond", "etch-si"],
      flow: "20–200 sccm",
      hazard: { level: "高", tags: ["劇毒", "強腐蝕"], gwp: null },
      ok: ["乾燥的不鏽鋼", "蒙乃爾", "PTFE"],
      no: ["含水環境", "多數彈性體", "鋁(常溫遇水)"],
      products: ["SiCl₄", "AlCl₃", "WCl₆"],
      scrubber: "濕式(鹼洗)",
      faults: ["管路殘水 → HCl → 腐蝕與微粒", "晶圓出腔未做後處理 → Al 線路持續腐蝕"],
      note: "電負性氣體,會形成 Cl⁻ 負離子 → 影響電漿平衡與 EEDF。Poly-Si、Al、W 的主蝕刻劑。",
    },
    {
      id: "hbr", formula: "HBr", zh: "溴化氫", en: "Hydrogen Bromide", family: "clbr",
      mw: 80.91, bp: -66.8, ie: 11.67, bond: { label: "H–Br", kJ: 366 },
      radicals: ["Br", "H", "Br⁻"],
      uses: ["etch-si", "etch-cond", "passivate"],
      flow: "20–300 sccm",
      hazard: { level: "高", tags: ["劇毒", "強腐蝕"], gwp: null },
      ok: ["乾燥的不鏽鋼", "蒙乃爾", "PTFE"],
      no: ["含水環境", "多數彈性體"],
      products: ["SiBr₄", "SiOBr(側壁)"],
      scrubber: "濕式(鹼洗)",
      faults: ["管路吸附性強,切換後殘留久", "遇水生成氫溴酸,腐蝕極強"],
      note: "Br 對 Si 的反應性比 Cl 溫和 → 對 gate oxide 選擇比高。加 O₂ 生成 SiOBr 側壁鈍化,是 poly gate 異向性的來源。",
    },
    {
      id: "bcl3", formula: "BCl3", zh: "三氯化硼", en: "Boron Trichloride", family: "clbr",
      mw: 117.17, bp: 12.6, ie: 11.60, bond: { label: "B–Cl", kJ: 443 },
      radicals: ["Cl", "BCl₂", "BCl"],
      uses: ["etch-cond"],
      flow: "10–150 sccm",
      hazard: { level: "高", tags: ["劇毒", "強腐蝕", "遇水劇烈反應"], gwp: null },
      ok: ["乾燥的不鏽鋼", "蒙乃爾"],
      no: ["含水環境", "多數彈性體"],
      products: ["AlCl₃", "B₂O₃(抓氧產物)"],
      scrubber: "濕式(鹼洗)",
      faults: ["遇水生成 HCl 與 B(OH)₃ → 腐蝕加微粒", "沸點 12.6 °C,管路需伴熱"],
      note: "Al 蝕刻不可或缺 —— B 會抓走 Al 表面原生 Al₂O₃ 的氧,把蝕刻打開。同時也提供 Cl。",
    },
    {
      id: "sicl4", formula: "SiCl4", zh: "四氯化矽", en: "Silicon Tetrachloride", family: "clbr",
      mw: 169.90, bp: 57.6, ie: 11.79, bond: { label: "Si–Cl", kJ: 381 },
      radicals: ["Cl", "SiCl₃", "SiCl₂"],
      uses: ["etch-cond", "passivate"],
      flow: "5–50 sccm(液態源,需汽化)",
      hazard: { level: "高", tags: ["腐蝕", "遇水劇烈反應"], gwp: null },
      ok: ["乾燥的不鏽鋼", "PTFE"],
      no: ["含水環境"],
      products: ["SiCl₄(本身即產物)", "側壁 SiClx"],
      scrubber: "濕式",
      faults: ["室溫下為液體(bp 57.6 °C),需汽化器與伴熱管"],
      note: "常用來補矽、調整側壁鈍化強度,而不是當主蝕刻劑。",
    },
    {
      id: "hcl", formula: "HCl", zh: "氯化氫", en: "Hydrogen Chloride", family: "clbr",
      mw: 36.46, bp: -85.1, ie: 12.74, bond: { label: "H–Cl", kJ: 431 },
      radicals: ["Cl", "H"],
      uses: ["etch-cond", "clean"],
      flow: "10–100 sccm",
      hazard: { level: "高", tags: ["劇毒", "強腐蝕"], gwp: null },
      ok: ["乾燥的不鏽鋼", "蒙乃爾", "PTFE"],
      no: ["含水環境", "多數彈性體"],
      products: ["金屬氯化物"],
      scrubber: "濕式(鹼洗)",
      faults: ["遇水即成鹽酸,對整條管路都是威脅"],
      note: "比 Cl₂ 溫和,H 同時可以還原表面氧化物。用在特定金屬蝕刻與表面清潔。",
    },

    // ---- 氧化性氣體 -----------------------------------------------------
    {
      id: "o2", formula: "O2", zh: "氧", en: "Oxygen", family: "ox",
      mw: 32.00, bp: -183.0, ie: 12.07, bond: { label: "O=O", kJ: 498 },
      radicals: ["O", "O⁺", "O⁻", "O₃"],
      uses: ["ash", "passivate", "cvd", "surface", "etch-diel"],
      flow: "5–1000 sccm",
      hazard: { level: "低", tags: ["助燃"], gwp: null },
      ok: ["不鏽鋼", "鋁"],
      no: ["油脂(高壓下有燃燒風險)"],
      products: ["CO", "CO₂", "H₂O(灰化)", "SiOBr / SiOCl(鈍化)"],
      scrubber: "一般排氣",
      faults: ["加太多會氧化表面反而降低蝕刻率 —— 存在最佳點", "微量 O₂ 洩漏會顯著改變氟碳製程的 F/C"],
      note: "蝕刻中最雙面的氣體:少量清除聚合物釋放 F(速率上升),過量氧化表面加稀釋(速率下降)。經典的 DOE 題目。",
    },
    {
      id: "n2o", formula: "N2O", zh: "一氧化二氮", en: "Nitrous Oxide", family: "ox",
      mw: 44.01, bp: -88.5, ie: 12.89, bond: { label: "N–O", kJ: 167 },
      radicals: ["O", "N₂", "NO"],
      uses: ["cvd", "surface"],
      flow: "100–3000 sccm",
      hazard: { level: "中", tags: ["助燃", "麻醉性", "溫室氣體"], gwp: 273 },
      ok: ["不鏽鋼", "鋁"],
      no: ["油脂"],
      products: ["SiO₂(沉積)", "N₂"],
      scrubber: "燃燒式(NOx 處理)",
      faults: ["解離出的 NO 會摻入膜中影響折射率"],
      note: "N–O 鍵只有 167 kJ/mol,很容易釋出氧原子 → PECVD SiO₂ 的溫和氧化劑,比 O₂ 好控制。",
    },
    {
      id: "co2", formula: "CO2", zh: "二氧化碳", en: "Carbon Dioxide", family: "ox",
      mw: 44.01, bp: -78.5, ie: 13.78, bond: { label: "C=O", kJ: 799 },
      radicals: ["O", "CO"],
      uses: ["etch-diel", "passivate"],
      flow: "10–200 sccm",
      hazard: { level: "低", tags: ["窒息", "溫室氣體"], gwp: 1 },
      ok: ["不鏽鋼", "鋁"],
      no: [],
      products: ["CO", "SiF₄(混用時)"],
      scrubber: "一般排氣",
      faults: ["解離率低,加多了主要是稀釋效果"],
      note: "先進 HAR 蝕刻中用來提供「溫和的氧」——比 O₂ 緩和,不會一下把聚合物清光。",
    },
    {
      id: "co", formula: "CO", zh: "一氧化碳", en: "Carbon Monoxide", family: "ox",
      mw: 28.01, bp: -191.5, ie: 14.01, bond: { label: "C≡O", kJ: 1077 },
      radicals: ["C", "O"],
      uses: ["etch-diel", "passivate"],
      flow: "10–200 sccm",
      hazard: { level: "高", tags: ["劇毒", "可燃"], gwp: null },
      ok: ["不鏽鋼"],
      no: [],
      products: ["CO₂", "聚合物調整"],
      scrubber: "燃燒式",
      faults: ["無色無味劇毒,必須有偵測器"],
      note: "C≡O 是所有常見分子中鍵能最高的(1077 kJ/mol)。用於精細調控側壁聚合物與選擇比。",
    },

    // ---- 氮化與還原 -----------------------------------------------------
    {
      id: "nh3", formula: "NH3", zh: "氨", en: "Ammonia", family: "nred",
      mw: 17.03, bp: -33.3, ie: 10.07, bond: { label: "N–H", kJ: 391 },
      radicals: ["N", "H", "NH", "NH₂"],
      uses: ["cvd", "surface"],
      flow: "50–1000 sccm",
      hazard: { level: "中", tags: ["毒性", "腐蝕", "可燃"], gwp: null },
      ok: ["不鏽鋼", "PTFE"],
      no: ["銅與銅合金", "部分彈性體"],
      products: ["SiN(沉積)", "H₂"],
      scrubber: "濕式(酸洗)",
      faults: ["對銅零件腐蝕", "膜中氫含量高,後續熱製程會逸出"],
      note: "N–H 鍵能 391 遠低於 N₂ 的 945 → 容易解離出 N。這就是 PECVD SiN 用 NH₃ 而不用 N₂ 的原因。",
    },
    {
      id: "h2", formula: "H2", zh: "氫", en: "Hydrogen", family: "nred",
      mw: 2.016, bp: -252.9, ie: 15.43, bond: { label: "H–H", kJ: 436 },
      radicals: ["H", "H⁺", "H₂⁺"],
      uses: ["etch-diel", "surface", "cvd"],
      flow: "10–500 sccm",
      hazard: { level: "高", tags: ["爆炸性", "可燃"], gwp: null },
      ok: ["不鏽鋼", "鋁"],
      no: ["部分高強度鋼(氫脆)"],
      products: ["HF(消耗 F)", "H₂O"],
      scrubber: "燃燒式或稀釋排放",
      faults: ["爆炸下限低(4 %),洩漏偵測是必要配置", "氫脆會讓部分零件在長期使用後失效"],
      note: "在氟碳製程中的作用就一句話:H + F → HF,把 F 吃掉 → 有效 F/C 下降 → 更偏聚合。",
    },
    {
      id: "ch4", formula: "CH4", zh: "甲烷", en: "Methane", family: "nred",
      mw: 16.04, bp: -161.5, ie: 12.61, bond: { label: "C–H", kJ: 439 },
      radicals: ["CH₃", "CH₂", "CH", "H"],
      uses: ["etch-cond", "cvd"],
      flow: "5–100 sccm",
      hazard: { level: "中", tags: ["可燃", "窒息", "溫室氣體"], gwp: 27 },
      ok: ["不鏽鋼", "鋁"],
      no: [],
      products: ["有機金屬揮發物", "碳膜"],
      scrubber: "燃燒式",
      faults: ["碳沉積累積在腔壁,需定期清潔"],
      note: "同時提供 C 與 H。有機金屬蝕刻(如 CH₄/H₂ 蝕 InP)與碳膜沉積都用它。",
    },

    // ---- 前驅物 ---------------------------------------------------------
    {
      id: "sih4", formula: "SiH4", zh: "矽烷", en: "Silane", family: "prec",
      mw: 32.12, bp: -111.9, ie: 11.00, bond: { label: "Si–H", kJ: 318 },
      radicals: ["SiH₃", "SiH₂", "SiH", "Si", "H"],
      uses: ["cvd"],
      flow: "20–500 sccm(常以 N₂ 或 Ar 稀釋)",
      hazard: { level: "極高", tags: ["自燃", "毒性"], gwp: null },
      ok: ["不鏽鋼(電拋光)", "專用雙層管"],
      no: ["任何可能接觸空氣的接頭"],
      products: ["a-Si", "SiO₂", "SiN(視搭配氣體)", "H₂"],
      scrubber: "燃燒式(必須)",
      faults: ["接觸空氣即自燃 —— 雙層管、氣體偵測、自動關斷缺一不可", "腔內粉末(氣相成核)是微粒主因"],
      note: "最高等級管制氣體。Si–H 鍵能只有 318 kJ/mol,極易解離,這既是它好用的原因也是它危險的原因。",
    },
    {
      id: "teos", formula: "Si(OC2H5)4", zh: "正矽酸乙酯", en: "Tetraethyl Orthosilicate (TEOS)", family: "prec",
      mw: 208.33, bp: 168.0, ie: 9.8, bond: { label: "Si–O", kJ: 452 },
      radicals: ["SiOx(C₂H₅)y", "C₂H₄", "OH"],
      uses: ["cvd"],
      flow: "液態源,以 He 或 N₂ 鼓泡 / 汽化後供應",
      hazard: { level: "低", tags: ["刺激性", "可燃"], gwp: null },
      ok: ["不鏽鋼(伴熱)", "PTFE"],
      no: ["未伴熱的管路(會凝結)"],
      products: ["SiO₂", "C₂H₄", "H₂O"],
      scrubber: "燃燒式",
      faults: ["管路凝結 → 流量不穩與微粒", "汽化器溫度漂移直接反映在膜厚"],
      note: "沸點 168 °C 的液態源。階梯覆蓋率遠優於 SiH₄/O₂,是 IMD/PMD 的標準選擇。",
    },
    {
      id: "wf6", formula: "WF6", zh: "六氟化鎢", en: "Tungsten Hexafluoride", family: "prec",
      mw: 297.83, bp: 17.1, ie: 12.5, bond: { label: "W–F", kJ: 548 },
      radicals: ["WF₅", "F"],
      uses: ["cvd"],
      flow: "10–200 sccm",
      hazard: { level: "高", tags: ["劇毒", "強腐蝕", "遇水劇烈反應"], gwp: null },
      ok: ["鎳", "蒙乃爾", "鈍化不鏽鋼"],
      no: ["含水環境", "多數彈性體"],
      products: ["W(沉積)", "HF", "SiF₄"],
      scrubber: "乾式吸附 + 濕式",
      faults: ["遇水生成 HF —— 管路必須絕對乾燥", "沸點 17.1 °C,需伴熱"],
      note: "W plug 與 W 導線的標準前驅物。分子量 297.8,是常用氣體裡最重的。",
    },
    {
      id: "b2h6", formula: "B2H6", zh: "乙硼烷", en: "Diborane", family: "prec",
      mw: 27.67, bp: -92.5, ie: 11.4, bond: { label: "B–H", kJ: 389 },
      radicals: ["BH₃", "BH₂", "B", "H"],
      uses: ["cvd", "surface"],
      flow: "以 H₂ 或 Ar 稀釋至 1–5 % 使用",
      hazard: { level: "極高", tags: ["自燃", "劇毒", "可燃"], gwp: null },
      ok: ["不鏽鋼(電拋光)", "專用雙層管"],
      no: ["任何可能接觸空氣或水氣的接頭"],
      products: ["硼摻雜膜", "B₂O₃(遇氧)"],
      scrubber: "燃燒式(必須)",
      faults: ["自燃且劇毒,管制等級與 SiH₄ 同級", "鋼瓶內會自行分解,有保存期限"],
      note: "PECVD 的硼摻雜源。與 SiH₄ 同屬最高管制等級,而且它還會在鋼瓶裡慢慢分解。",
    },
  ];
  /* eslint-enable */

  // ---- 由分子式推算 F/C 比,不手填 ---------------------------------------

  /** 數出分子式裡某元素的原子數 —— 只處理本資料庫用得到的簡單式子 */
  function atomCount(formula, el) {
    var re = new RegExp(el + "(?![a-z])(\\d*)", "g");
    var m,
      n = 0;
    while ((m = re.exec(formula)) !== null) {
      n += m[1] ? parseInt(m[1], 10) : 1;
    }
    return n;
  }

  GASES.forEach(function (g) {
    // 帶括號的結構式(TEOS)不用這套數法,直接標為不適用 ——
    // 它本來也不是氟碳氣體,沒有 F/C 比可談。
    if (g.formula.indexOf("(") !== -1) {
      g.nC = null;
      g.nF = null;
      g.fc = null;
      return;
    }
    var c = atomCount(g.formula, "C");
    var f = atomCount(g.formula, "F");
    // 只有含碳又含氟的氣體才有 F/C 比可談
    g.fc = c > 0 && f > 0 ? f / c : null;
    g.nC = c;
    g.nF = f;
  });

  function byId(id) {
    for (var i = 0; i < GASES.length; i++) {
      if (GASES[i].id === id) return GASES[i];
    }
    return null;
  }

  /** 依分子式查(大小寫敏感,配合章節內文的寫法) */
  function byFormula(f) {
    for (var i = 0; i < GASES.length; i++) {
      if (GASES[i].formula === f) return GASES[i];
    }
    return null;
  }

  /** 篩選 opts: { family, use, hazard, q } */
  function filter(opts) {
    var o = opts || {};
    return GASES.filter(function (g) {
      if (o.family && g.family !== o.family) return false;
      if (o.use && g.uses.indexOf(o.use) === -1) return false;
      if (o.hazard && g.hazard.level !== o.hazard) return false;
      if (o.q) {
        var q = String(o.q).toLowerCase();
        var hay = (g.formula + g.zh + g.en + g.note).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  var HAZARD_LEVELS = ["極高", "高", "中", "低"];

  PA.gases = {
    families: FAMILIES,
    uses: USES,
    hazardLevels: HAZARD_LEVELS,
    all: GASES,
    byId: byId,
    byFormula: byFormula,
    filter: filter,
    count: GASES.length,
  };
})((window.PA = window.PA || {}));
