/* ==========================================================================
   defects.js — 蝕刻缺陷圖鑑資料
   來源:docs/03-level3-advanced.md §3.3 的 18 條,外加 1 條增補

   增補的是 `first-wafer`(First Wafer Effect)。它在規格裡屬於 3.6
   而不是 §3.3 的圖鑑,但診斷時它和 macroloading 極容易混淆 ——
   「整批漂移」與「只有第一片不同」的分辨,放在圖鑑裡才用得到。
   `tools/check-defects.mjs` 會把增補條目單獨列出來,不讓它混進 18 條裡。

   同一份資料同時餵給:缺陷圖鑑頁、診斷器(A21)、輪廓模擬器(A18)的預設、
   章節內文。改這裡就好。

   欄位(對照 §3.3.1 的固定五欄格式)
     id        識別字
     zh / en   中英名稱
     cat       分類 key
     symptom   一句話症狀
     causes[]  成因鏈,依可能性排序
     distinguish  如何跟長得像的缺陷區分開 —— 這一欄是圖鑑真正的價值
     fixes[]   { knob, dir, why, sideEffect } 旋鈕方向與副作用
     related[] 相關缺陷 id
     ch        延伸章節
     profile   對應 A18 輪廓模擬器的預設參數(沒有則為 null)。
               A18 直接讀這裡,不自己再存一份 —— 兩邊因此不可能漂移
     risk      "high" 時在頁面上掛安全提醒
   ========================================================================== */

(function (PA) {
  "use strict";

  var CATEGORIES = [
    { key: "ar", name: "深寬比相關", desc: "同時蝕刻但深度不同,或密度不同區域速率不同" },
    { key: "profile", name: "Profile 形狀", desc: "側壁形狀不如預期" },
    { key: "mask", name: "遮罩相關", desc: "遮罩本身被消耗或變形" },
    { key: "residue", name: "殘留與污染", desc: "該走的沒走掉,或留下不該有的東西" },
  ];

  // 旋鈕名稱統一用 2.6 的六個,診斷器才能和因果鏈對得起來
  var KNOBS = ["壓力", "Source 功率", "Bias 功率", "聚合性氣體", "O₂", "溫度", "時間", "脈衝", "遮罩"];

  /* eslint-disable */
  var DEFECTS = [
    // ---- 深寬比相關 -----------------------------------------------------
    {
      id: "arde", zh: "ARDE / RIE Lag", en: "Aspect Ratio Dependent Etching", cat: "ar",
      symptom: "窄溝槽比寬溝槽淺。同時蝕刻,深度卻不同。",
      causes: [
        "Knudsen 傳輸限制 —— 中性自由基難以進入深窄孔",
        "離子遮蔽 —— 有角度分佈的離子被孔壁攔截",
        "產物排出困難 —— SiF₄ 出不來,阻礙後續反應",
        "孔底充電 —— 正電荷累積排斥後續離子",
      ],
      distinguish:
        "和 microloading 的差別在「比較的對象」:ARDE 比的是同一片上不同「深寬比」的圖形," +
        "microloading 比的是不同「圖形密度」的區域。前者換 CD 就重現,後者換密度才重現。",
      fixes: [
        { knob: "壓力", dir: "降", why: "λ 變長 → 離子方向性提升 → 遮蔽減少", sideEffect: "化學蝕刻成分下降,速率可能掉" },
        { knob: "Bias 功率", dir: "升", why: "離子能量提高,穿透深孔的能力變好", sideEffect: "選擇比與遮罩壽命同時惡化" },
        { knob: "脈衝", dir: "開", why: "off 期讓電子中和孔底充電", sideEffect: "平均速率下降" },
      ],
      related: ["inverse-lag", "microloading", "etch-stop"],
      ch: "3.3.2",
      profile: { ion: 300, spread: 5, passiv: 30, radical: 55, reflect: 20, multi: true },
      risk: null,
    },
    {
      id: "inverse-lag", zh: "反向 RIE Lag", en: "Inverse RIE Lag", cat: "ar",
      symptom: "窄的溝槽反而比寬的深 —— 和 ARDE 相反。",
      causes: [
        "聚合物前驅物的黏著係數高,進不去窄孔 → 窄孔鈍化少 → 反而刻得快",
      ],
      distinguish:
        "出現它本身就是診斷線索:代表製程落在「高聚合區」。" +
        "看到反向 lag,先確認 F/C 是不是壓太低。",
      fixes: [
        { knob: "聚合性氣體", dir: "降", why: "降低鈍化強度,回到正常區間", sideEffect: "選擇比下降" },
        { knob: "O₂", dir: "升", why: "提高有效 F/C,消耗聚合物", sideEffect: "加過量會氧化表面反而變慢" },
      ],
      related: ["arde", "etch-stop", "taper"],
      ch: "3.3.2",
      profile: null,
      risk: null,
    },
    {
      id: "microloading", zh: "Microloading(微負載)", en: "Microloading", cat: "ar",
      symptom: "高圖形密度的區域蝕刻較慢。",
      causes: ["局部自由基被大量消耗,反應物在該區域耗盡"],
      distinguish:
        "與 ARDE 的區分見該條。與 macroloading 的差別在尺度:" +
        "microloading 是晶片內幾十 µm 的差異,macroloading 是整片晶圓或片與片之間。",
      fixes: [
        { knob: "Source 功率", dir: "升", why: "提高自由基供應總量", sideEffect: "選擇比下降、熱負荷上升" },
        { knob: "壓力", dir: "降", why: "提升傳輸,讓自由基更快補進來", sideEffect: "化學成分下降" },
      ],
      related: ["macroloading", "arde"],
      ch: "3.3.2",
      profile: null,
      risk: null,
    },
    {
      id: "macroloading", zh: "Macroloading(巨負載)", en: "Macroloading", cat: "ar",
      symptom: "蝕刻率隨整片晶圓的開口率變化;或第一片與最後一片不同。",
      causes: ["全腔體的自由基被消耗;開口率越大消耗越多,蝕刻率越低"],
      distinguish:
        "換一片開口率不同的晶圓就重現 → macroloading。" +
        "「第一片效應」則要看腔體狀態(seasoning),兩者常同時出現但根因不同。",
      fixes: [
        { knob: "時間", dir: "升", why: "以補償時間吸收速率差", sideEffect: "只是補償,沒有解決根因" },
        { knob: "Source 功率", dir: "升", why: "提高自由基總供應", sideEffect: "選擇比下降" },
      ],
      related: ["microloading", "first-wafer"],
      ch: "3.3.2",
      profile: null,
      risk: null,
    },

    // ---- Profile 形狀 ---------------------------------------------------
    {
      id: "undercut", zh: "Undercut(側蝕)", en: "Undercut", cat: "profile",
      symptom: "遮罩下方被橫向咬入,最寬處緊貼遮罩底面。",
      causes: [
        "側壁鈍化不足 —— 聚合性氣體太少或 O₂ 太多",
        "化學蝕刻成分過強(高 F/C、高自由基通量)",
        "壓力過高 → 離子角度發散 → 側壁也吃到離子",
      ],
      distinguish:
        "最寬處的「位置」是關鍵:undercut 在最頂端(緊貼遮罩)," +
        "bowing 在中段。量一下剖面最寬處的深度就能分開。",
      fixes: [
        { knob: "聚合性氣體", dir: "升", why: "加強側壁鈍化", sideEffect: "聚合過頭會 etch stop" },
        { knob: "壓力", dir: "降", why: "提升離子方向性", sideEffect: "化學速率下降" },
        { knob: "溫度", dir: "降", why: "降低純化學蝕刻的 Arrhenius 項", sideEffect: "整體速率下降" },
      ],
      related: ["bowing", "taper"],
      ch: "3.3.3",
      profile: { ion: 200, spread: 6, passiv: 5, radical: 95, reflect: 10, multi: false },
      risk: null,
    },
    {
      id: "bowing", zh: "Bowing(弓形)", en: "Bowing", cat: "profile",
      symptom: "側壁中段向外鼓出,整體像個桶子。",
      causes: [
        "離子在遮罩肩部斜面被反射/散射,打向側壁中段",
        "側壁鈍化在中段不足(前驅物進不到那麼深)",
      ],
      distinguish:
        "最寬處在「中段」,而 undercut 在頂部。" +
        "另外 bowing 通常伴隨遮罩 faceting —— 看到肩部被削角,就要懷疑反射。",
      fixes: [
        { knob: "遮罩", dir: "改", why: "減少 faceting 就減少反射源", sideEffect: "硬遮罩成本與額外製程" },
        { knob: "聚合性氣體", dir: "升", why: "補強中段鈍化", sideEffect: "etch stop 風險" },
        { knob: "壓力", dir: "降", why: "降低離子角度發散", sideEffect: "速率下降" },
      ],
      related: ["undercut", "faceting", "microtrench"],
      ch: "3.3.3",
      profile: { ion: 550, spread: 8, passiv: 42, radical: 60, reflect: 95, multi: false },
      risk: null,
    },
    {
      id: "taper", zh: "Taper / Sloped(錐形)", en: "Tapered Profile", cat: "profile",
      symptom: "上寬下窄,側壁明顯傾斜。",
      causes: [
        "鈍化過度 —— 聚合物在側壁越積越厚",
        "離子通量隨深度衰減",
        "遮罩本身就有斜角",
      ],
      distinguish:
        "先量遮罩的剖面角度。遮罩本來就斜的話,那是微影或遮罩蝕刻的問題," +
        "不是這一步的鈍化問題 —— 這兩者的對策完全不同。",
      fixes: [
        { knob: "聚合性氣體", dir: "降", why: "減少側壁累積", sideEffect: "undercut 風險" },
        { knob: "O₂", dir: "升", why: "提高有效 F/C,消耗聚合物", sideEffect: "選擇比下降" },
        { knob: "Bias 功率", dir: "升", why: "提高離子能量穿透深處", sideEffect: "選擇比與遮罩壽命惡化" },
      ],
      related: ["etch-stop", "inverse-lag"],
      ch: "3.3.3",
      profile: { ion: 300, spread: 10, passiv: 55, radical: 50, reflect: 15, multi: false },
      risk: null,
    },
    {
      id: "notching", zh: "Notching(缺口)", en: "Notching", cat: "profile",
      symptom: "靠近底部界面處出現橫向凹口,而且只出現在圖形陣列的邊緣。",
      causes: [
        "充電效應 —— 絕緣底層累積正電荷,使離子軌跡偏折",
        "陣列邊緣的不對稱幾何讓偏折特別嚴重",
      ],
      distinguish:
        "兩個特徵一起看就很好認:**有方向性**(只咬單側)+ **有位置選擇性**(只在陣列邊緣)。" +
        "undercut 則是整片普遍發生、沒有偏好方向。",
      fixes: [
        { knob: "脈衝", dir: "開", why: "off 期讓電子中和累積的正電荷", sideEffect: "平均速率下降" },
        { knob: "Bias 功率", dir: "降", why: "降低離子能量,偏折造成的傷害變小", sideEffect: "速率下降、可能 footing" },
        { knob: "時間", dir: "降", why: "縮短 over etch,減少充電累積時間", sideEffect: "殘留風險" },
      ],
      related: ["footing", "twisting", "undercut"],
      ch: "3.3.3",
      profile: null,
      risk: null,
    },
    {
      id: "microtrench", zh: "Microtrenching(微溝槽)", en: "Microtrenching", cat: "profile",
      symptom: "溝底兩側各有一道更深的小溝,中央反而較淺。",
      causes: [
        "離子從側壁鏡面反射後集中打在溝底邊緣",
        "側壁鈍化層造成的離子偏折",
      ],
      distinguish:
        "看溝底的形狀:microtrench 是「兩側深、中間淺」的 W 形。" +
        "footing 則是底部整個外擴的「腳」,方向相反。",
      fixes: [
        { knob: "壓力", dir: "降", why: "降低離子入射角發散,減少斜射反射", sideEffect: "化學速率下降" },
        { knob: "聚合性氣體", dir: "調", why: "調整鈍化厚度改變反射條件", sideEffect: "兩個方向都可能過頭" },
      ],
      related: ["bowing", "footing"],
      ch: "3.3.3",
      profile: { ion: 650, spread: 6, passiv: 50, radical: 50, reflect: 100, multi: false },
      risk: null,
    },
    {
      id: "footing", zh: "Footing(腳)", en: "Footing", cat: "profile",
      symptom: "底部界面處未蝕乾淨,呈現外擴的「腳」。",
      causes: [
        "底層為絕緣體時的充電,離子被排斥",
        "界面處鈍化累積",
        "選擇比過高導致蝕刻停得太早",
      ],
      distinguish:
        "和 microtrench 的溝底形狀相反(見該條)。" +
        "和 etch stop 的差別在程度:footing 只剩底角沒清乾淨,etch stop 是整個停住。",
      fixes: [
        { knob: "時間", dir: "升", why: "延長 over etch 把腳清掉", sideEffect: "下層損失、notching 風險" },
        { knob: "Bias 功率", dir: "升", why: "提高該階段的離子能量", sideEffect: "選擇比下降" },
        { knob: "脈衝", dir: "開", why: "中和界面充電", sideEffect: "速率下降" },
      ],
      related: ["notching", "etch-stop", "microtrench"],
      ch: "3.3.3",
      profile: { ion: 250, spread: 3, passiv: 72, radical: 45, reflect: 10, multi: false },
      risk: null,
    },
    {
      id: "twisting", zh: "Twisting / Wiggling(扭曲)", en: "Twisting", cat: "profile",
      symptom: "HAR 孔在深處歪掉,彼此靠近甚至相交。",
      causes: [
        "充電導致的離子偏折沿深度累積",
        "遮罩應力導致的變形",
      ],
      distinguish:
        "只在高深寬比才出現,而且越深越嚴重。" +
        "如果淺的地方就歪,那是遮罩問題不是充電問題。",
      fixes: [
        { knob: "遮罩", dir: "改", why: "改用低應力的非晶碳硬遮罩", sideEffect: "額外製程與成本" },
        { knob: "脈衝", dir: "開", why: "中和充電,減少偏折累積", sideEffect: "速率下降" },
      ],
      related: ["notching", "resist-wiggle"],
      ch: "3.3.3",
      profile: null,
      risk: null,
    },
    {
      id: "striation", zh: "Striation(條紋)", en: "Striation", cat: "profile",
      symptom: "側壁出現垂直的細紋。",
      causes: [
        "光阻邊緣粗糙度(LER)被忠實複製到下層",
        "遮罩局部剝落",
      ],
      distinguish:
        "回頭看遮罩的 LER。如果遮罩本身就粗,那是微影的問題;" +
        "遮罩乾淨而側壁有紋,才是蝕刻步驟造成的。",
      fixes: [
        { knob: "遮罩", dir: "改", why: "光阻 trim 或加入硬化步驟改善 LER", sideEffect: "CD 改變、額外製程" },
        { knob: "聚合性氣體", dir: "升", why: "鈍化層可略為平滑化側壁", sideEffect: "etch stop 風險" },
      ],
      related: ["resist-wiggle", "faceting"],
      ch: "3.3.3",
      profile: null,
      risk: null,
    },

    // ---- 遮罩相關 -------------------------------------------------------
    {
      id: "faceting", zh: "Faceting(肩部削角)", en: "Mask Faceting", cat: "mask",
      symptom: "遮罩的上緣被削成 45° 左右的斜面。",
      causes: ["濺鍍產額的角度依賴 —— 45–70° 的面被削得最快(3.1.5)"],
      distinguish:
        "這是濺鍍產額角度依賴的直接後果,幾乎一定伴隨 CD 放大。" +
        "看到 CD 隨蝕刻時間變大,先量遮罩肩部。",
      fixes: [
        { knob: "Bias 功率", dir: "降", why: "降低物理濺鍍成分", sideEffect: "速率下降、footing 風險" },
        { knob: "聚合性氣體", dir: "升", why: "在遮罩上也長一層保護", sideEffect: "etch stop 風險" },
        { knob: "遮罩", dir: "改", why: "換非晶碳或金屬硬遮罩", sideEffect: "成本與額外製程" },
      ],
      related: ["mask-loss", "bowing"],
      ch: "3.3.4",
      profile: { ion: 850, spread: 6, passiv: 8, radical: 45, reflect: 30, multi: false },
      risk: null,
    },
    {
      id: "mask-loss", zh: "遮罩耗盡", en: "Mask Erosion", cat: "mask",
      symptom: "遮罩在蝕刻完成前就被消耗掉,CD 失控甚至圖形消失。",
      causes: ["遮罩選擇比不足", "離子能量過高", "蝕刻時間過長(常因為速率不如預期)"],
      distinguish:
        "先確認是「選擇比不夠」還是「時間太長」。" +
        "把時間縮短一半重跑,若遮罩還在,問題在速率不足而不是選擇比。",
      fixes: [
        { knob: "Bias 功率", dir: "降", why: "降低對遮罩的物理濺鍍", sideEffect: "蝕刻速率下降" },
        { knob: "聚合性氣體", dir: "升", why: "提高對遮罩的選擇比", sideEffect: "etch stop 風險" },
        { knob: "遮罩", dir: "改", why: "改用硬遮罩", sideEffect: "成本與額外製程" },
      ],
      related: ["faceting", "striation"],
      ch: "3.3.4",
      profile: null,
      risk: null,
    },
    {
      id: "resist-wiggle", zh: "光阻 Wiggling / 圖形倒塌", en: "Resist Wiggling / Pattern Collapse", cat: "mask",
      symptom: "高深寬比的光阻線條扭曲甚至倒下。",
      causes: ["光阻本身的高深寬比 + 應力", "製程加熱使光阻軟化"],
      distinguish:
        "看是否隨製程時間惡化 —— 會的話是熱與應力累積。" +
        "如果一開始就倒,那是微影階段的問題。",
      fixes: [
        { knob: "溫度", dir: "降", why: "避免光阻軟化", sideEffect: "化學蝕刻速率下降" },
        { knob: "時間", dir: "降", why: "減少熱與應力累積", sideEffect: "可能蝕不完" },
        { knob: "遮罩", dir: "改", why: "改用硬遮罩,不靠光阻撐", sideEffect: "額外製程" },
      ],
      related: ["twisting", "mask-loss"],
      ch: "3.3.4",
      profile: null,
      risk: null,
    },

    // ---- 殘留與污染 -----------------------------------------------------
    {
      id: "etch-stop", zh: "Etch Stop(蝕刻停止)", en: "Etch Stop", cat: "residue",
      symptom: "HAR 孔蝕到一半完全停住,再久也不動。",
      causes: [
        "聚合物在孔底的淨累積超過移除速率",
        "自由基或離子無法抵達孔底(深寬比太高)",
      ],
      distinguish:
        "和 footing 的差別在程度(見該條)。" +
        "和 ARDE 的差別在「會不會繼續」:ARDE 是慢但持續,etch stop 是完全停住。" +
        "延長時間再看深度,是最直接的分辨法。",
      fixes: [
        { knob: "聚合性氣體", dir: "降", why: "降低沉積速率,讓移除重新占優", sideEffect: "選擇比與側壁保護下降" },
        { knob: "O₂", dir: "升", why: "提高有效 F/C 消耗聚合物", sideEffect: "選擇比下降" },
        { knob: "Bias 功率", dir: "升", why: "提高離子能量把孔底的聚合物打開", sideEffect: "選擇比與遮罩壽命惡化" },
        { knob: "脈衝", dir: "開", why: "改善深孔的自由基與電荷傳輸", sideEffect: "平均速率下降" },
      ],
      related: ["taper", "footing", "arde", "inverse-lag"],
      ch: "3.3.5",
      profile: { ion: 150, spread: 4, passiv: 92, radical: 35, reflect: 10, multi: false },
      risk: null,
    },
    {
      id: "veil", zh: "聚合物殘留 / Veil(圍籬)", en: "Polymer Residue / Veil", cat: "residue",
      symptom: "圖形周圍留下一圈膜狀殘留,像圍籬。",
      causes: ["側壁鈍化層在蝕刻結束後沒有被移除"],
      distinguish:
        "位置很有特徵:沿著圖形輪廓一圈。" +
        "如果殘留是隨機分佈的斑點,那是微粒不是 veil。",
      fixes: [
        { knob: "O₂", dir: "升", why: "加一段 O₂ 灰化步把聚合物燒掉", sideEffect: "可能氧化下層" },
        { knob: "聚合性氣體", dir: "降", why: "從源頭降低鈍化強度", sideEffect: "側壁保護下降" },
      ],
      related: ["etch-stop", "corrosion"],
      ch: "3.3.5",
      profile: null,
      risk: null,
    },
    {
      id: "corrosion", zh: "金屬腐蝕", en: "Metal Corrosion", cat: "residue",
      symptom: "Al 線路在出腔數小時後斷線,並長出白色生成物。",
      causes: ["殘留的 Cl 遇大氣濕氣生成 HCl,持續腐蝕 Al"],
      distinguish:
        "時間軸是關鍵:**出腔當下量測正常,數小時後才失效**。" +
        "任何「離線後才惡化」的失效都要先懷疑腐蝕。",
      fixes: [
        { knob: "時間", dir: "管制", why: "出腔到後處理的等待時間必須有上限", sideEffect: "排程限制" },
        { knob: "O₂", dir: "後處理", why: "H₂O 電漿 / NH₃ 處理 / DI 沖洗,擇一但不可省", sideEffect: "額外製程步驟" },
      ],
      related: ["veil"],
      ch: "3.3.5",
      profile: null,
      risk: "high",
    },
    {
      id: "first-wafer", zh: "First Wafer Effect", en: "First Wafer Effect", cat: "residue",
      symptom: "一批的第一片與後續片的蝕刻率或 profile 不同。",
      causes: [
        "腔壁狀態在待機期間改變(吸附的水氣、前一批的殘留)",
        "腔壁自由基損失係數隨結垢改變(2.3.3)",
      ],
      distinguish:
        "只影響第一片、後續穩定 → first wafer effect。" +
        "如果整批都隨片數漂移,那是 chamber memory 或零件消耗。",
      fixes: [
        { knob: "時間", dir: "升", why: "加 seasoning / dummy wafer 讓腔壁先到穩態", sideEffect: "產能損失" },
        { knob: "壓力", dir: "調", why: "調整 purge 與抽氣程序", sideEffect: "循環時間增加" },
      ],
      related: ["macroloading"],
      ch: "3.6",
      profile: null,
      risk: null,
    },
  ];
  /* eslint-enable */

  function byId(id) {
    for (var i = 0; i < DEFECTS.length; i++) if (DEFECTS[i].id === id) return DEFECTS[i];
    return null;
  }

  /** 依症狀關鍵字/分類篩選 */
  function filter(opts) {
    var o = opts || {};
    return DEFECTS.filter(function (d) {
      if (o.cat && d.cat !== o.cat) return false;
      if (o.knob) {
        var hit = d.fixes.some(function (f) { return f.knob === o.knob; });
        if (!hit) return false;
      }
      if (o.q) {
        var q = String(o.q).toLowerCase();
        var hay = (d.zh + d.en + d.symptom + d.causes.join("") + d.distinguish).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  /** 依旋鈕反查:動這個旋鈕會影響哪些缺陷 */
  function byKnob(knob) {
    return DEFECTS.filter(function (d) {
      return d.fixes.some(function (f) { return f.knob === knob; });
    });
  }

  /* ---------------------------------------------------------------------
     診斷流程(§3.3.6)—— A21 用的「還能做什麼實驗」表
     --------------------------------------------------------------------- */

  /**
   * 每一條都是**可以真的去做的實驗**,不是「再檢查一次」這種空話。
   * 依缺陷類別給,因為同一類缺陷的收斂路徑是一樣的。
   */
  var FLOW_TESTS = {
    ar: [
      { do: "換一組 CD 重跑", tells: "深度差跟著 CD 走 → ARDE;跟著圖形密度走 → microloading" },
      { do: "只延長時間再量一次", tells: "差距**拉大**才是 ARDE(傳輸限制);差距不變比較像量測或膜厚問題" },
    ],
    profile: [
      { do: "把晶圓轉 90° 重跑", tells: "圖形跟著轉 → 圖形/光罩問題;不跟著轉 → 腔體幾何(見 3.6)" },
      { do: "看缺陷出現在陣列的哪個位置", tells: "只在陣列邊緣 → 充電效應(notching);全面出現 → 化學或鈍化問題" },
      { do: "換絕緣/導電下層各跑一片", tells: "只有絕緣下層出事 → 充電;兩者都出事 → 與充電無關" },
    ],
    mask: [
      { do: "量遮罩剩餘厚度的橫向分布", tells: "肩部比遠處薄 → faceting(角度依賴濺鍍);整片一起薄 → 選擇比不足" },
      { do: "降 bias 再跑一片", tells: "改善 → 離子轟擊主導;沒改善 → 化學或熱的問題" },
    ],
    residue: [
      { do: "加一段 O₂ 灰化再看", tells: "殘留消失 → 聚合物;還在 → 無機殘留或腐蝕生成物" },
      { do: "比較首片與第 25 片", tells: "只有首片異常 → first wafer effect / seasoning;逐片漂移 → 腔體累積" },
    ],
  };

  /**
   * 某個缺陷的**判別方法**清單。
   *
   * A21 的驗收條件是「每種至少列出 2 個判別方法」,而且必須誠實顯示
   * 「這個症狀有多個可能成因」—— 所以這裡不給單一答案,給的是一組可執行的區分方式:
   *   1. 圖鑑本身的「診斷區分」欄
   *   2. 對每個相關缺陷,指出要跟誰分開
   *   3. 該類別的診斷流程實驗
   * 三種來源都是資料驅動的,改資料就會跟著變。
   */
  function methodsFor(id) {
    var d = byId(id);
    if (!d) return [];
    var out = [];
    if (d.distinguish) out.push({ kind: "diff", text: d.distinguish });
    (d.related || []).forEach(function (rid) {
      var r = byId(rid);
      if (!r) return;
      out.push({
        kind: "vs",
        text: "要和「" + r.zh + "」分開:" + r.symptom,
        target: rid,
      });
    });
    (FLOW_TESTS[d.cat] || []).forEach(function (t) {
      out.push({ kind: "test", text: t.do + " —— " + t.tells });
    });
    return out;
  }

  /**
   * 依症狀 + 條件排出可能成因。
   * 條件只用來**調整排序與提示**,不用來刪掉選項 ——
   * 診斷器的價值在於誠實呈現「還有哪些可能」,不是給一個武斷答案。
   */
  function rank(id, cond) {
    var d = byId(id);
    if (!d) return [];
    var c = cond || {};
    return d.causes.map(function (text, i) {
      var score = d.causes.length - i; // 資料本身已依可能性排序
      var notes = [];
      if (c.insulator && /充電|charge/i.test(text)) {
        score += 3;
        notes.push("下層是絕緣體 → 充電類成因的可能性明顯上升");
      }
      if (c.arrayEdge && /充電|不對稱|偏折/.test(text)) {
        score += 2;
        notes.push("只出現在陣列邊緣 → 與充電造成的離子偏折吻合");
      }
      if (c.recipeChanged) {
        notes.push("recipe 有動過 → 先回頭對照 2.6 的因果鏈,不要急著查硬體");
      }
      if (c.wholeWafer === false && /腔|均勻|供應/.test(text)) {
        score += 1;
        notes.push("只有局部 → 與腔體均勻度相關(見 3.6)");
      }
      return { text: text, score: score, notes: notes };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  PA.defects = {
    categories: CATEGORIES,
    FLOW_TESTS: FLOW_TESTS,
    methodsFor: methodsFor,
    rank: rank,
    knobs: KNOBS,
    all: DEFECTS,
    byId: byId,
    filter: filter,
    byKnob: byKnob,
    count: DEFECTS.length,
  };
})((window.PA = window.PA || {}));
