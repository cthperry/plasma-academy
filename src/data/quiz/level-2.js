export const level2ExamSpec = {
  id: "L2",
  title: "L2 氣體、定律與電漿源結業測驗",
  durationMinutes: 50,
  passPercent: 75,
  draw: { single: 18, multi: 4, numeric: 4, scenario: 4 }
};

const concepts = [
  {
    chapter: "2.1", tag: "ideal-gas", reference: "2.1 氣體動力學與真空",
    single: ["固定 300 K 時，腔體壓力由 10 mTorr 升到 20 mTorr，中性粒子密度最接近哪種變化？", "加倍", ["不變", "變成四倍", "減半"]],
    multi: ["使用 n=P/kT 解讀 recipe 時，哪些敘述正確？", ["必須使用絕對溫度", "同壓升溫會降低密度"], ["sccm 可直接代入 P", "電漿開啟後所有物種都等於總中性密度"]],
    numeric: ["300 K、10 mTorr 時中性密度約為多少？輸入 10¹⁴ cm⁻³ 的倍數。", 3.22, 0.15, "×10¹⁴ cm⁻³"],
    scenario: ["壓力讀值不變但加熱後反應物濃度下降，最合理的第一層解釋是？", "同壓下氣體溫度上升使 n=P/kT 下降", ["MFC 顯示值一定錯誤", "電子溫度必定降為零", "壓力計自動改成 Torr"]]
  },
  {
    chapter: "2.1", tag: "partial-pressure", reference: "2.1 分壓與混氣",
    single: ["Ar/O₂ 流量各 90/10 sccm，plasma off 且無選擇性損失時，O₂ 分壓比例約為？", "10%", ["1%", "50%", "90%"]],
    multi: ["哪些情況會使流量比不再等於反應區物種比例？", ["電子解離", "壁面復合", "表面選擇性消耗"], ["只把 sccm 換成 slm"]],
    numeric: ["總壓 40 mTorr，O₂ 流量占 15%，估算 O₂ 分壓。", 6, 0.2, "mTorr"],
    scenario: ["plasma on 後 OES 顯示 O 原子上升，但 O₂ MFC 比例未變。應如何解讀？", "解離平衡改變，MFC 比例不能代表自由基比例", ["總壓一定變成兩倍", "O 原子就是 O₂ 分壓", "MFC 必須立即歸零"]]
  },
  {
    chapter: "2.1", tag: "residence-time", reference: "2.1 滯留時間",
    single: ["固定壓力與腔體體積時，總流量加倍，平均滯留時間如何變化？", "減半", ["加倍", "不變", "變成四倍"]],
    multi: ["哪些操作會拉長 τ=79PV/Q？", ["提高壓力", "增加有效腔體體積", "降低總流量"], ["提高總流量"]],
    numeric: ["30 L、20 mTorr、200 sccm 的平均滯留時間約多少？", 0.237, 0.01, "s"],
    scenario: ["流量加倍後壓力由節流閥維持不變。正確解讀是？", "換氣速度加快，但同溫同壓的腔內粒子數近似不變", ["中性密度必定加倍", "平均自由徑必定減半", "所有分子都剛好待半個 τ"]]
  },
  {
    chapter: "2.1", tag: "vacuum", reference: "2.1 真空輸運與量測",
    single: ["Kn≫1 時，哪種碰撞主導輸運？", "分子與壁面碰撞", ["分子彼此碰撞", "電子與光子碰撞", "離子只與晶圓碰撞"]],
    multi: ["選擇製程壓力計時應同時確認哪些條件？", ["量測範圍", "氣體校正", "化學相容", "安裝位置與動態響應"], []],
    numeric: ["平均自由徑 5 cm、管徑 2 cm，Knudsen 數是多少？", 2.5, 0.05, ""],
    scenario: ["換更大泵浦後腔體抽速幾乎不變，最先應查什麼？", "節流閥與管路流導是否成為瓶頸", ["把所有 MFC 加倍", "提高電子溫度", "改用更高 bias"]]
  },
  {
    chapter: "2.2", tag: "gas-selection", reference: "2.2 選氣四問",
    single: ["選擇蝕刻氣體時，材料反應之後最先要確認什麼？", "反應產物在製程溫度下是否可揮發", ["氣體顏色是否明顯", "分子量是否最小", "SDS 頁數是否最多"]],
    multi: ["選氣四問應包含哪些限制？", ["目標材料", "不能損傷的下層", "所需輪廓", "設備與安全限制"], []],
    numeric: ["三支氣體流量 60、30、10 sccm，第三支的比例是多少？", 10, 0.2, "%"],
    scenario: ["要求直接乾蝕刻 Cu 且產物需在低溫揮發，最合理回應是？", "指出 Cu 鹵化物揮發性限制並評估大馬士革整合", ["直接推薦 Cl₂ 高功率", "只增加 O₂", "把壓力提高到大氣"]]
  },
  {
    chapter: "2.2", tag: "fc-ratio", reference: "2.2 F/C 比與鈍化",
    single: ["有效 F/C 過低且 bias 不足時最可能出現？", "聚合堆積與 etch stop", ["完全等向高速蝕刻", "所有遮罩不消耗", "中性密度歸零"]],
    multi: ["哪些參數會移動有效 F/C 與聚合平衡？", ["O₂ 添加", "H₂ 添加", "bias", "基材表面氧"], []],
    numeric: ["CF₄ 的化學式 F/C 比為多少？", 4, 0.01, ""],
    scenario: ["側壁聚合過厚而溝底也停止，優先嘗試哪個方向？", "適度增加 O₂ 或 bias，並監看選擇比副作用", ["只降低所有能量到零", "增加 H₂ 形成更多聚合", "關閉抽氣"]]
  },
  {
    chapter: "2.2", tag: "oxygen-addition", reference: "2.2 O₂ 添加效應",
    single: ["氟碳電漿中少量 O₂ 常使自由 F 增加，主要因為？", "O 清除碳並減少 CFx 聚合消耗", ["O₂ 直接提供 F", "O₂ 使所有電子停止", "O₂ 把壓力變成零"]],
    multi: ["O₂ 過量可能帶來哪些副作用？", ["稀釋主氣體", "改變表面氧化", "降低某些選擇比", "移出聚合—蝕刻窗口"], []],
    numeric: ["總流量 200 sccm，O₂ 佔 8%，O₂ 流量是多少？", 16, 0.2, "sccm"],
    scenario: ["O₂ 從 5% 加到 25% 後速率先升後降，合理原因是？", "低量先清碳釋放 F，高量後稀釋與表面副作用占優", ["量測必定故障", "F/C 永遠只會單調下降", "電子不再碰撞任何分子"]]
  },
  {
    chapter: "2.2", tag: "safety", reference: "2.2 氣體安全與相容",
    single: ["氣體危害與材質相容性放行的主要依據是？", "廠區核准 SDS、EH&S 與設備商相容資料", ["教材中的一句摘要", "分子式長短", "網路論壇留言"]],
    multi: ["高危害氣體系統的工程控制可包含哪些項目？", ["氣櫃與隔離", "洩漏偵測", "interlock", "末端 abatement"], []],
    numeric: ["某氣體 TLV 為 0.5 ppm，量測為 0.2 ppm，量測/TLV 比是多少？", 0.4, 0.02, ""],
    scenario: ["SDS 顯示可用 316L，但設備 elastomer 未列相容資料。應如何處理？", "保留未核准狀態，向設備商與 EH&S 取得證據後再放行", ["直接假設所有材料相容", "只看氣體顏色", "把 SDS 狀態標為 verified"]]
  },
  {
    chapter: "2.3", tag: "rate-coefficient", reference: "2.3 速率係數",
    single: ["電子碰撞速率係數 k 的核心定義是？", "σ(E)、v(E) 與 f(E) 的能量積分", ["只取平均 Tₑ 代入常數", "只看總壓力", "只看氣體分子量"]],
    multi: ["哪些因素會改變電子碰撞反應率？", ["截面閾值與形狀", "EEDF 高能尾", "電子密度", "目標物種密度"], []],
    numeric: ["Tₑ 由 2 eV 升到 3 eV，若游離率變成 18 倍，倍率是多少？", 18, 0.1, "倍"],
    scenario: ["兩個電漿平均 Tₑ 相同但游離率不同，最合理的解釋是？", "EEDF 形狀與高能尾不同", ["理想氣體定律失效", "所有截面都相同", "離子質量變成零"]]
  },
  {
    chapter: "2.3", tag: "eedf", reference: "2.3 EEDF 形狀",
    single: ["同一 Tₑ 下，Druyvesteyn 相對 Maxwellian 的典型特徵是？", "高能尾較少", ["高能尾無限大", "所有電子能量相同", "完全沒有低能電子"]],
    multi: ["評估 EEDF 曲線時應確認哪些事項？", ["正規化方式", "能量座標定義", "分佈型式", "與反應截面的重疊"] , []],
    numeric: ["游離閾值 15.8 eV，電子能量 12 eV，超過閾值的餘裕是多少？", -3.8, 0.1, "eV"],
    scenario: ["Druyvesteyn 切換後游離率下降而 Tₑ 顯示不變，這是否合理？", "合理，高能尾縮短會減少跨越高閾值的電子", ["不合理，Tₑ 唯一決定所有反應", "只可能是壓力計錯", "表示截面為負值"]]
  },
  {
    chapter: "2.3", tag: "radical-balance", reference: "2.3 自由基平衡",
    single: ["穩態自由基密度由什麼決定？", "生成率與體相、壁面、表面及抽氣損失的平衡", ["只由 MFC 流量", "只由腔體體積", "只由晶圓溫度"]],
    multi: ["自由基的主要損失路徑可包括哪些？", ["壁面復合", "表面消耗", "體相反應", "抽氣排出"], []],
    numeric: ["生成率 100 a.u./s，總損失率常數 4 /s，0-D 穩態密度是多少？", 25, 0.5, "a.u."],
    scenario: ["source power 增加但下游自由基通量不增，優先檢查？", "壁面復合、傳輸距離與反應物耗盡是否同步增加", ["直接認定模型必定正確", "把 bias 設為負無限", "忽略管路材質"]]
  },
  {
    chapter: "2.3", tag: "surface", reference: "2.3 表面動力學",
    single: ["Langmuir 覆蓋率在高供應時趨於飽和，主要因為？", "可用表面位點有限", ["壓力一定為零", "離子沒有質量", "所有產物不揮發"]],
    multi: ["把氣相密度轉成表面速率時需考慮哪些步驟？", ["傳輸", "吸附與脫附", "表面覆蓋", "產物揮發"] , []],
    numeric: ["θ=S/(0.6+S)，S=0.6 時 θ 為多少？", 0.5, 0.02, ""],
    scenario: ["自由基密度加倍但速率只小幅增加，最可能處於？", "表面位點接近飽和或另一協同條件受限", ["理想氣體不存在", "所有電子溫度加倍", "壓力計量到負值"]]
  },
  {
    chapter: "2.4", tag: "bohm", reference: "2.4 Bohm 條件",
    single: ["穩定鞘層入口的 Bohm 條件要求離子？", "至少達到 Bohm 速度", ["完全靜止", "速度等於光速", "能量永遠為零"]],
    multi: ["Bohm 離子通量 Γi≈0.61ne uB 會受哪些量影響？", ["電子密度", "電子溫度", "離子質量"], ["氣體顏色"]],
    numeric: ["nₑ 加倍且 uB 不變時，Γi 變成原來多少倍？", 2, 0.01, "倍"],
    scenario: ["nₑ 上升十倍、Tₑ 幾乎不變，離子通量最合理變化是？", "約上升十倍", ["約下降十倍", "完全不變", "變成負值"]]
  },
  {
    chapter: "2.4", tag: "child-langmuir", reference: "2.4 Child–Langmuir 鞘層",
    single: ["其他條件近似不變時，電漿密度提高會使鞘層？", "變薄", ["變厚", "完全消失且無電場", "固定為 1 m"]],
    multi: ["實際 RF 鞘層相對簡單 Child–Langmuir 模型還可能包含？", ["時間振盪", "碰撞", "非均勻幾何", "多離子物種"] , []],
    numeric: ["鞘層厚度由 1.0 mm 降到 0.25 mm，縮小倍率是多少？", 4, 0.05, "倍"],
    scenario: ["bias 升高後鞘層變厚，但密度也大增。應如何判讀？", "兩個效應方向相反，需用實際 Vdc 與 nₑ 共同計算", ["只看 bias setpoint 即可", "密度永遠不影響鞘層", "鞘層厚度不能量化"]]
  },
  {
    chapter: "2.4", tag: "iedf", reference: "2.4 IEDF",
    single: ["高 RF 頻率下 IEDF 常變窄，因為離子？", "穿越時平均了多個 RF 週期", ["質量變成零", "不再受任何鞘層電場", "全部變成電子"]],
    multi: ["IEDF 形狀會受哪些條件影響？", ["RF 頻率", "鞘層厚度", "離子質量", "鞘層碰撞"] , []],
    numeric: ["峰間距由 160 eV 降到 8 eV，縮小倍率是多少？", 20, 0.5, "倍"],
    scenario: ["平均離子能量相同但高壓 recipe 損傷較分散，應優先比較？", "IEDF 低能尾與高能端比例，而非只看平均", ["只看總流量", "只看氣體分子式字數", "忽略頻率"]]
  },
  {
    chapter: "2.5", tag: "source", reference: "2.5 CCP 與 ICP",
    single: ["ICP 的 H-mode 相對 E-mode 通常具有？", "較高電子密度與感應耦合", ["完全沒有電子", "只靠晶圓熱傳", "固定為大氣壓"]],
    multi: ["CCP 的電子加熱機制可包含哪些？", ["ohmic heating", "stochastic sheath heating"], ["核分裂加熱", "重力加熱"]],
    numeric: ["密度由 3×10⁹ 跳到 1.2×10¹¹ cm⁻³，倍率是多少？", 40, 1, "倍"],
    scenario: ["ICP 設在遲滯區 550 W，批次間偶爾明暗跳變，最合理原因？", "點火歷史使系統落在 E 或 H 不同穩態", ["MFC 單位固定錯一千倍", "電子溫度必定為零", "所有 RF 頻率消失"]]
  },
  {
    chapter: "2.5", tag: "matching", reference: "2.5 阻抗匹配",
    single: ["匹配網路的主要目標是讓 generator 端看到？", "接近 50+j0 Ω", ["0+j0 Ω", "無限大純電阻", "固定負電阻"]],
    multi: ["相同 recipe 下 match position 漂移可能反映哪些變化？", ["腔壁沉積", "介電窗狀態", "接地接觸", "電漿密度"] , []],
    numeric: ["Forward 800 W、反射 0.5%，反射功率是多少？", 4, 0.1, "W"],
    scenario: ["壓力改變後 reflected 由 0.2% 升到 8%，第一個合理動作是？", "確認 plasma mode 與壓力 actual，再讓匹配盒尋找新負載位置", ["忽略並持續加功率", "把 C 值寫死不動", "關閉所有 interlock"]]
  },
  {
    chapter: "2.5", tag: "remote", reference: "2.5 Remote plasma",
    single: ["Remote plasma 對工件的主要優勢通常是？", "降低直接離子轟擊並保留中性自由基處理", ["保證零 VUV", "保證零溫升", "所有自由基都不復合"]],
    multi: ["Remote source 到工件的有效通量會受哪些因素影響？", ["傳輸距離", "管壁材質", "溫度", "壁面復合"] , []],
    numeric: ["自由基沿管路存活率 70%，source 端 100 a.u.，到達量是多少？", 70, 1, "a.u."],
    scenario: ["Remote clean 功率提高但工件清潔速率不升，最先應查？", "管路復合、source 距離與反應物耗盡是否限制到達通量", ["直接認定零損傷", "只提高 bias", "忽略管溫"]]
  },
  {
    chapter: "2.6", tag: "causal-chain", reference: "2.6 參數因果鏈",
    single: ["完整因果鏈中，recipe setpoint 與晶圓結果之間應加入？", "可量測的腔體、電子、物種、鞘層與表面中介量", ["只加一個箭頭", "只寫工程師姓名", "省略所有適用條件"]],
    multi: ["可靠因果鏈的每個箭頭應標示哪些資訊？", ["方向", "適用條件", "中介量測", "可反證預測"] , []],
    numeric: ["Source 由 200 升到 2000 W，密度近似線性時倍率是多少？", 10, 0.1, "倍"],
    scenario: ["source setpoint 升高但 absorbed power 與 nₑ 都不動，應把中斷點放在哪？", "功率傳輸或 plasma mode 層，而不是晶圓表面層", ["直接歸因材料批次", "只怪量測 CD", "跳過設備檢查"]]
  },
  {
    chapter: "2.6", tag: "process-window", reference: "2.6 多目標製程窗",
    single: ["製程最佳化為何不能只最大化 rate？", "還需滿足選擇比、輪廓、損傷與穩健性限制", ["rate 與其他結果永遠無關", "最大 rate 一定最安全", "量測不需要重複"]],
    multi: ["找到通過點後，確認量產穩健性可做哪些事？", ["小幅擾動各旋鈕", "重複中心點", "記錄中介量", "比較不同 chamber state"] , []],
    numeric: ["目標 rate≥100，實測 135 nm/min，速率餘裕是多少？", 35, 0.5, "nm/min"],
    scenario: ["一點同時通過 rate、selectivity、profile，但壓力變 1 mTorr 就失敗。正確結論？", "這是過窄的尖峰，不是足夠穩健的量產窗口", ["已可直接量產", "壓力誤差永遠不會發生", "只要平均值通過即可"]]
  },
  {
    chapter: "2.6", tag: "packaging", reference: "2.6 封裝清潔因果鏈",
    single: ["封裝清潔接著力隨 dose 先升後降，主要因為？", "活化先飽和，後續弱邊界層、鏈斷裂或氧化損傷持續累積", ["接觸角永遠增加", "所有材料都不受 plasma 影響", "自由基密度固定為零"]],
    multi: ["封裝清潔製程窗可同時限制哪些指標？", ["接觸角 / 表面能", "金屬氧化", "材料損傷", "queue time"] , []],
    numeric: ["處理後 queue time 上限 4 h，已等待 150 min，剩餘多少分鐘？", 90, 1, "min"],
    scenario: ["Cu pad 使用 O₂ 後接觸角下降但 NSOP 上升，最合理判斷？", "表面雖活化但氧化風險增加，不能只靠接觸角放行", ["接觸角低就保證 wire bond", "再無限延長 O₂ 時間", "忽略金屬氧化"]]
  }
];

export const level2Questions = concepts
  .filter((concept) => concept.tag !== "oxygen-addition")
  .flatMap((concept, index) => buildConceptQuestions(concept, index));

function buildConceptQuestions(concept, index) {
  const base = index * 4 + 1;
  const id = (offset) => `L2-${String(base + offset).padStart(3, "0")}`;
  const [singleQuestion, singleCorrect, singleWrong] = concept.single;
  const [multiQuestion, multiCorrect, multiWrong] = concept.multi;
  const [numericQuestion, answer, tolerance, unit] = concept.numeric;
  const [scenarioQuestion, scenarioCorrect, scenarioWrong] = concept.scenario;
  return [
    choiceQuestion(id(0), "single", concept, singleQuestion, [singleCorrect], singleWrong),
    choiceQuestion(id(1), "multi", concept, multiQuestion, multiCorrect, multiWrong),
    {
      id: id(2), chapter: concept.chapter, type: "numeric", difficulty: index % 3 + 1, tags: [concept.tag, "calculation"],
      question: numericQuestion, answer, tolerance, unit, explanation: `先辨認題目要求的物理量與單位，再依 ${concept.reference} 的關係計算；答案 ${answer} ${unit}。`, reference: concept.reference
    },
    choiceQuestion(id(3), "scenario", concept, scenarioQuestion, [scenarioCorrect], scenarioWrong)
  ];
}

function choiceQuestion(id, type, concept, question, correctTexts, wrongTexts) {
  const distractors = wrongTexts.length ? wrongTexts : ["只看單一 setpoint 即可，不必確認其他條件"];
  const rawOptions = [...correctTexts.map((text) => ({ text, correct: true })), ...distractors.map((text) => ({ text, correct: false }))];
  const shift = Number(id.slice(-3)) % rawOptions.length;
  const options = [...rawOptions.slice(shift), ...rawOptions.slice(0, shift)]
    .map((option, index) => ({ id: String.fromCharCode(65 + index), text: option.text, correct: option.correct, why: option.correct ? `符合 ${concept.reference} 的因果與適用條件。` : `這個選項跳過中介量、混淆單位或超出 ${concept.reference} 的適用範圍。` }));
  return {
    id, chapter: concept.chapter, type, difficulty: type === "scenario" ? 3 : type === "multi" ? 2 : 1, tags: [concept.tag, type], question,
    options, explanation: `正確判斷必須沿 ${concept.reference} 的物理鏈條，同時保留條件與副作用。`, reference: concept.reference
  };
}
