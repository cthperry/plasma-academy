export const packagingCleaningProtocols = [
  protocol(
    "3-7-p1",
    "污染分型與材料堆疊盤點",
    "清潔開發的第一步不是選氣體，而是把污染、基材與下一站接合界面分開描述。同一個『不沾』可能是有機離型劑、氧化金屬、微粒、吸附水、低分子弱層或前段濕洗殘留；若未分型就加大 plasma dose，可能去掉有機物卻同時把 Cu 氧化，或把 EMC 樹脂打薄後暴露 filler。",
    "建立 package stack 表，逐層列出 RDL、UBM、Cu/Ni/Au pad、PI/PBO、EMC、solder mask、underfill 與暫時載板。每個界面記錄供應商、lot、cure 條件、前段濕洗、烘烤、等待時間與接觸環境。污染證據至少組合光學/SEM、XPS 或 FTIR、離子污染、顆粒 map、接觸角與功能性接合結果，避免把單一表面能數字當成污染身分。",
    "先用無處理 witness 建基線，再以低 dose 做 chemistry screening。若 O₂ 後碳訊號下降但 Cu oxide 與 NSOP 上升，表示有機清除與金屬氧化同時發生；若 remote 處理可維持化學清除而材料 loss 顯著下降，則離子/VUV 損傷是可分離路徑。每一個候選根因都要列支持訊號與否證訊號。",
    "污染身分、材料相容與量測方法未確認前，只能標示開發中，不得把暫時可潤濕視為量產清潔完成。放行資料要能追溯到實際 package stack 與材料 lot，材料替換、cure 變更或前段濕洗變更都應觸發相容性重查。",
    "常見失誤是沿用裸 Si wafer 的清潔直覺、只量中心接觸角、忽略 pad 與 polymer 同時暴露、或把白光外觀正常解讀為無氧化。另一個風險是把供應商材料名稱視為固定配方；EMC 與 solder mask 的填料、偶聯劑與 release agent 變更，都可能改變 damage threshold。",
    "交班包需包含堆疊剖面、污染假說表、witness 設計、材料 lot、前段歷史、量測原始檔與尚未排除的風險。若證據不足，清楚標記 hold 原因與取得下一筆證據的責任人。"
  ),
  protocol(
    "3-7-p2",
    "氣體化學與表面反應選擇",
    "封裝清潔常見 O₂、Ar、N₂、H₂/Ar 與其組合，但名稱不等於作用機制。O radical 擅長移除碳氫污染並提高多數 polymer 表面能，也可能氧化 Cu、Ag 或易氧化 UBM；Ar 主要提供動量轉移，能去除弱附著層，過量時會再沉積、粗化或破壞低介電材料；受控 H₂/Ar 可協助還原金屬氧化，但必須受設備與廠區核准程序約束。",
    "選擇 chemistry 時同時建立『要去除什麼』與『不能改變什麼』兩張表。前者列污染鍵結、厚度與位置，後者列金屬氧化態、polymer loss、粗糙度、filler exposure、色差、warpage、敏感元件及下游接合需求。記錄 actual flow、pressure、source/bias、電極面積、溫度與時間，不能只存 forward power。",
    "比較氣體要保持可比 dose，並分別量化 radical 與 ion exposure 的代理。O₂ 相對 Ar 若只改善碳污染但惡化金屬接合，應評估短 O₂ 加低能 Ar、remote oxygen、局部遮蔽或更短 queue；H₂/Ar 若降低 oxide 卻使有機污染殘留，可能需要分段處理。DOE 必須包含未處理對照與已知過度處理點，才能看見上下限。",
    "選定配方必須同時通過 cleanliness、oxide、material loss、功能性 bond strength 與可靠度，不以最低接觸角選優。含氫、含氧與任何反應性氣體的供應、排放、偵測、purge、interlock 及 abatement 都依核准 SDS 與廠區 EH&S 程序；教材不提供現場操作授權。",
    "常見失誤包括把氣體流量當成到達表面的活性物種通量、在不同設備間直接複製功率、忽略 electrode configuration、或用 O₂ 清所有材質。對金屬與 polymer 共存界面，最佳點通常是多目標折衷，而不是單一反應最快的條件。",
    "交班需記錄 chemistry 選擇理由、被淘汰方案、每條材料禁限用條件、氣體實際值、排放狀態與 recipe 復歸版。任何超出核准 gas box、abatement 或 interlock 範圍的構想都停留在風險評估，不進機台試驗。"
  ),
  protocol(
    "3-7-p3",
    "Direct、Remote 與大氣電漿架構比較",
    "Direct plasma 讓工件直接接觸鞘層離子、radical、電子與 VUV，清潔快但 damage 風險高；remote source 主要輸送較長壽命中性活性種，可降低充電與濺鍍，但管路復合、距離與流量會吃掉有效通量；大氣電漿適合 inline 與局部處理，卻對間隙、掃描速度、環境濕度與噴頭方位敏感。架構選擇先由材料容忍度與產線節拍決定。",
    "設備比較至少保存 source type、頻率、電極與工件相對位置、ground path、source-to-part 距離、pressure、溫度、掃描速度、重疊率與治具遮蔽。若只用相同 forward power 比較 direct/remote，不能推定表面收到相同 dose；應使用 actinometry、OES、witness etch、熱敏貼片或設備核准代理建立實際曝露尺度。",
    "設計同一材料 lot 的架構 split，讓目標污染清除程度相近，再比較 oxide、polymer loss、粗糙度、接著力與可靠度。對大氣掃描另做速度×間隙×pass 數矩陣，檢查 overlap band 與起停端；對 remote 則掃距離與流量，確認到達通量是否受管壁復合限制。結果要用面內 map，而非單點平均。",
    "若 direct 在最低有效 dose 已超過損傷上限，應轉 remote 或增加遮蔽，不以縮短時間掩蓋局部高能尾。大氣電漿放行需定義噴頭壽命、間隙監控、掃描路徑與環境窗口；remote 放行需包含 source 狀態、管路清潔與 endpoint。",
    "常見失誤是把 remote 當成完全無離子、把大氣電漿當成不需排氣、忽略治具邊緣電場集中，或只以平均接觸角比較。帶有懸空金屬、敏感 die 或薄 polymer 的封裝，局部充電與 VUV 仍需以產品結構驗證。",
    "交班包要有架構圖、工件方位、距離/間隙、實際 dose 代理、map、治具版次與設備狀態。設備間轉移時重新建立等效曝露，不用瓦數、時間或流量的一對一比例直接換算。"
  ),
  protocol(
    "3-7-p4",
    "Dose Window 與過度處理上限",
    "合格清潔窗口至少有三個區域：低 dose 的污染殘留、足夠 dose 的功能平台，以及高 dose 的氧化、鏈斷裂、粗化或材料 loss。接觸角通常隨 dose 先下降後飽和，但 bond strength 可能在更早或更晚出現峰值；因此最低接觸角不是最佳 recipe。對多材料堆疊，整體上限由最脆弱材料決定。",
    "Dose 描述需包含 power、時間、pressure、flow、duty cycle、距離、溫度與累積處理次數。量測至少包含接觸角及其 aging、XPS/FTIR 或 oxide、roughness、material loss、pull/shear、underfill flow、截面與一項可靠度。每個數值附量測位置、儀器、樣本數、平均/分布及 MSA 狀態。",
    "DOE 需刻意放入未處理、低於清潔門檻、平台區與過度處理點，並使用中心點重複檢查非線性。先以小幅單因子找安全邊界，再以 chemistry×dose×queue time 交互作用確認量產窗口。若接觸角持續下降而 pull/shear 開始下降，這是功能上限，不應以外觀或表面能結果覆蓋。",
    "製程中心值要在上下限間保留設備漂移、材料 lot、腔體生命週期與量測誤差餘裕。放行同時設定最低清潔效果與最高 damage 指標，並定義 warning/hold 線；超限不得只靠重跑接觸角確認。任何 re-clean 都以累積 dose 重新判定。",
    "常見失誤包括只做兩點線性外插、沒有過度處理點、把設定時間當實際 dose、忽略治具遮蔽與 wafer/panel 位置、或只看平均值。若極端點造成不可逆產品風險，應使用 witness coupon 與材料試片，不在產品上探索未知上限。",
    "交班需附 DOE 矩陣、原始數據、模型殘差、功能窗口圖、上下限理由、warning/hold 規則與復歸 recipe。量產 SPC 應選能提前看見失控的代理，而不是只在可靠度完成後才發現窗口偏移。"
  ),
  protocol(
    "3-7-p5",
    "接觸角、表面分析與量測系統 MSA",
    "接觸角是潤濕相關代理，受滴液體積、等待時間、表面粗糙、吸水、局部污染與操作者影響。低角度可能來自真正清潔，也可能來自過度氧化或弱低分子層；高角度可能是疏水回復、再污染或量測位置差異。它不能單獨證明 wire bond、die attach、underfill 或 molding 界面可靠。",
    "方法定義需固定液體、滴量、影像擷取時間、左右角取法、溫濕度、表面等待時間、取樣位置與 edge exclusion。曲面 pad、細線或粗糙 EMC 若不適合傳統 sessile drop，改用 dyne ink、XPS、FTIR、ToF-SIMS 或功能性 coupon，但同樣要做 repeatability、reproducibility 與 reference sample。",
    "MSA 先用同一 sample 重複量測評估儀器與操作者，再用已知高低表面能 reference 檢查線性與漂移。接觸角 aging 要從 plasma end time 起算，在 0、1、4、8、24 小時等時間點使用獨立位置，避免同一滴液改變後續結果。表面分析與 pull/shear 應共定位或至少使用同 lot 同位置設計。",
    "只有當量測誤差顯著小於規格窗口，且代理與功能性結果建立穩定關聯，才可用於量產放行。若接觸角通過但 bond strength 失敗，先查 oxide、弱邊界層與量測代表性，不得用重測到通過取代失效調查。",
    "常見失誤是刪除不利點、在不同 queue time 量不同批次、量測液體污染、以單一中心點代表 panel，或把 dyne pen 痕跡留在功能區。粗糙度改變也會讓表觀角度偏移，必須搭配化學與功能結果解讀。",
    "交班包保存量測 SOP 版次、儀器校正、操作者、原始影像、滴量、位置圖、plasma-to-measure 時間、MSA 結果與 reference trend。任何方法或供應商軟體演算法變更都需橋接舊基準。"
  ),
  protocol(
    "3-7-p6",
    "Clean-to-Bond Queue Time 與儲存控制",
    "電漿後表面不是永久狀態。Polymer 極性基團會重新取向，低分子物種會遷移，金屬會再氧化，空氣中的碳氫與水會重新吸附；因此 clean-to-bond 必須是有證據的時間窗口。相同接觸角回升可能有不同化學原因，等待時間不能只靠經驗加倍。",
    "Queue study 要記錄 plasma end、出腔、包裝、儲存、開封與 bonding 的實際時間戳，並控制 ambient、溫濕度、dry N₂、真空袋、tray/cover 與人員接觸。每個時間點量接觸角 aging、oxide 或表面化學、bond strength、wetting 與可靠度，且按材料 lot 與 package stack 分層。",
    "設計至少包含立即、目標上限附近與明顯超時三區，另比較 ambient 與核准儲存方式。若 N₂ 只延緩有機再污染卻不能阻止 Cu 氧化，應在數據中拆開兩條路徑。把 tool downtime、跨班與週末情境納入 worst case，避免實驗只涵蓋理想物流。",
    "量產規格明確定義起算與截止事件、允許儲存、時間上限、超時 hold、witness 需求及 disposition 權限。MES 應阻止超時產品直接進下一站；人工紙本補登不能成為常態。若 queue window 改變，需重查所有受影響材料與接合流程。",
    "常見失誤包括把出腔時間當 plasma end、只量接觸角、不記 N₂ 品質與袋材、將週末超時視為普通 rework、或忽略 bonding tool 端加熱等待。時間戳缺失時不能用排程估算取代產品紀錄。",
    "交班要列 lot、材料、兩端設備、每個時間戳、儲存環境、超時分鐘數、表面與功能數據、目前 hold 範圍及決策人。趨勢報表需能區分正常 queue、核准延長與超時再處理。"
  ),
  protocol(
    "3-7-p7",
    "Re-clean、Rework 與累積損傷管理",
    "重清潔不是把時間歸零。第二次 plasma 可能重新移除污染，也會把第一次造成的 oxide、polymer loss、roughness、charge 與 VUV damage 繼續累加。若原 qualification 只驗證一次處理，就沒有證據宣稱第二次相同 recipe 安全；外觀正常與接觸角恢復都不足以證明可靠度。",
    "Re-clean qualification 至少包含 0、1、2 次處理，以及每次之間的等待與儲存條件。保存每次 actual dose、材料溫升、oxide、material loss、roughness、接觸角 aging、pull/shear、截面與可靠度。對 thin pad、PI/PBO、EMC、solder mask 與低介電材料分別建立累積上限。",
    "先比較第二次使用原 recipe、降低 dose、改 remote 或禁止重清潔四種策略。若污染是新吸附有機物而基材仍完整，低 dose 可能足夠；若失效來自金屬氧化，再加 O₂ 會惡化。用 witness 與失效分析確認機制，不以『再跑一次通常有效』作為工程理由。",
    "量產規範需列允許次數、每次 recipe、總累積 dose、最長 queue、材料限制、必要量測與核准角色。未涵蓋的第三次處理、不同 chemistry 或已超材料 loss 的產品直接 hold，不由現場口頭放行。報廢與工程偏差要有一致邊界。",
    "常見失誤是 MES 只保留最後一次處理、設備計數器在 lot split 後歸零、把不同 chamber 的 watt-second 直接相加、或只對良率做事後篩選。累積損傷可能在 TCT、HAST 或 MSL 後才顯現，短期 pull/shear 正常仍需可靠度證據。",
    "交班包要列每次處理時間、設備、recipe、actual trace、等待、材料 lot、累積 dose、量測、可靠度與 disposition。MES 無法自動累加前，採受控 traveler 與雙人覆核，並把系統缺口列入改善追蹤。"
  ),
  protocol(
    "3-7-p8",
    "Qualification、可靠度與變更管制",
    "封裝清潔的終點是界面可靠度，不是表面看起來乾淨。Qualification 要覆蓋代表性材料、最不利 package stack、設備、治具、位置、queue、re-clean、材料 lot 與製程窗口邊界。短期 pull/shear 可篩選，但 TCT、HAST/uHAST、MSL、HTS 或產品指定可靠度才會暴露弱邊界層、吸濕與熱膨脹失配。",
    "建立 CTQ tree：上游輸入包含污染、材料、cure、plasma actual、儲存與接合條件；中間代理包含 oxide、化學組成、接觸角、roughness 與 material loss；下游結果包含 pull/shear、wetting、void、cross-section、電性與可靠度。每項 CTQ 指定方法、樣本數、規格、資料擁有者與反應計畫。",
    "DOE 與 confirmation run 要跨設備與生命週期，包含中心/邊緣或 panel map、低高 dose、queue 上限與 re-clean 上限。可靠度 sample 必須可追溯到實際前處理條件，不能把不同 split 混在同一 lot 標籤。若供應商材料批次差異顯著，建立材料族群或 supplier-specific window。",
    "放行前完成材料、封裝製程、設備、品質與 EH&S 的角色核准；每個角色核對自己的證據，不以一張總表勾選取代原始報告。變更 trigger 包含 gas supplier、source、電極/治具、recipe、材料配方、cure、濕洗、儲存、bonding 材料與量測方法。",
    "常見失誤包括只驗證 nominal、用 monitor coupon 取代真實堆疊、可靠度樣本失去 plasma trace、材料變更未通知、或把設備 matching 當產品 qualification。跨廠轉移需要重新確認 local EH&S、設備差異與量測橋接。",
    "結案包需含需求、風險評估、DOE、原始數據、失效分析、可靠度、MSA、控制計畫、SPC/OCAP、recipe 版次、訓練與核准。尚未完成外部或廠區核准時，狀態必須維持 pending，不得由教材或自動化檢查代簽。"
  )
];

function protocol(id, title, purpose, evidence, experiment, release, pitfalls, handoff) {
  return { id, title, purpose, evidence, experiment, release, pitfalls, handoff };
}
