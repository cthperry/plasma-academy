const caseNotes = {
  "c1-rate-drift": "風險註記：供氣與壁面漂移可能同時影響 rate、選擇比、profile 與封裝清潔殘留；處置後需確認不是只把平均速率拉回而讓 edge 或高 AR 結構惡化。",
  "c2-focus-ring-cd": "風險註記：focus ring 相關差異常先出現在邊緣 map、角度與局部 profile；若只以全片平均 CD 或中心 monitor 驗證，會錯過產品最敏感的區域。",
  "c3-first-wafer": "風險註記：首片異常可與 clean、idle、vent、parts 或 transfer 疊加；封裝表面還要區分腔體未收斂和 queue 導致的 Cu 再氧化或吸附污染。首片若已進入接合流程，還需追蹤後續界面 void 與可靠度，不可只因第二片正常就解除隔離。",
  "c4-antenna-leakage": "風險註記：高天線比只提高 charging 假說權重，不能排除 UV/VUV、IEDF 高能尾端、金屬/鹵素污染或後段測試變因；驗證必須保留這些競爭路徑。對照組要涵蓋相同 plasma history 的低 AR 結構，否則產品/版圖差異會被誤當作電荷效應。",
  "c5-pm-particles": "風險註記：關電漿粒子 signature 也可能與維護組裝、backstream、載具或量測混合；必須比較粒徑、座標、時間與空跑結果，不可只看總 particle count。"
};

export const chapterFourSix = {
  id: "4-6",
  route: "/level/4/4-6-production-yield-safety/",
  title: "4.6 量產、良率與安全",
  hours: 2,
  prerequisites: ["3.6 均勻度、PM 與腔體記憶", "3.7 封裝清潔工程", "4.1 電漿診斷", "4.4 先進脈衝、ALE 與 HAR 技術"],
  objectives: [
    "用硬體、電漿指紋與產品 CTQ 三層完成 chamber matching，先排除硬體與狀態差異再考慮 recipe 補償。",
    "以篩選與優化兩階段 DOE 定義可量產窗口，處理交互作用、隨機化、中心點與 actual/setpoint 不獨立。",
    "把 COO、零件壽命、PM、seasoning、FDC 與封裝清潔的 queue/reclean、接合可靠度連成同一個放行流程。",
    "依核准的氣體、RF、排氣、abatement 與污染控制程序處理安全和 PFC 排放，不將教材數值當成在地閾值。"
  ],
  summary: "量產工程的目標不是讓一片 monitor 漂亮，而是讓腔體、產品、材料和安全控制在可追溯的共同窗口內。Chamber matching 先比硬體與狀態，再比電漿指紋，最後才以 wafer CTQ 驗證；DOE 必須保留交互作用、時間漂移與實際值證據。COO 和 PM 也不是成本部門的獨立課題，零件耗損、seasoning、FDC、particle、封裝清潔 queue 及接合可靠度會同時決定良率。安全與環境決策應依核准程序、實測排放與物料資料；PFC 影響以 GWP 乘實際逃逸量的可追溯計算處理，而非背誦可能已改變的固定數值。",
  sections: [
    { id: "matching-three-layers", title: "Chamber matching：硬體、電漿、製程三層先後順序", body: `<p>Chamber matching 的目標是讓可互換腔體在產品 CTQ 與空間 signature 上都可接受，而不是把平均 rate 或平均 CD 調成相同。第一層是硬體與狀態：零件料號/版本、focus ring 與 showerhead 壽命、ESC/He、接地、pump、MFC、溫度校正、clean、idle、seasoning 與前一產品。第二層是電漿指紋：delivered/reflect power、VI/phase、match 位置、throttle、pressure response、He、OES 或其他核准 proxy。第三層才是 wafer：rate、map、CD、profile、selectivity、particle、電性與封裝表面結果。</p><p>建立 golden chamber 時，先確認它在完整生命週期、代表產品與最差結構均可重複，不以單次最高良率選定。Reference wafer、相同 metrology recipe、notch/座標對齊和原始 map 是比較基礎。若 hardware 或 plasma layer 已顯示差異，直接改 recipe 只是在補償症狀；下一次 PM、parts 或產品 mix 改變後，補償往往反向失效。只有修復/校正後仍存在穩定、可量化的差異，才評估受控 chamber-specific offset，並保留共同 guard band。</p><p>封裝清潔的 matching 更要分材料。RDL/UBM/Cu 的氧化與表面粗糙度、PI/PBO 或 mold compound 的配方/吸濕/filler、low-k 的損傷敏感度與 queue history 都可能讓同一腔體的平均 proxy 相同而 bond 或可靠度不同。每次 matching bridge 必須含處理前後 surface state、queue/reclean 條件、接觸或接合指標、particle/離子殘留及既有可靠度 CTQ。把平坦 Si coupon 的結果搬到 fine-pitch pad 或多材料封裝 stack 前，需明確標為待驗證假說。</p>` },
    { id: "doe-window", title: "兩階段 DOE：找因子，再證明量產窗口", body: `<p>製程窗是 rate、CD/profile、選擇比、均勻度、缺陷、電性、產能和材料可靠度同時成立的區域。第一階段用篩選設計找出真正影響 CTQ 的少數因子與明顯風險；第二階段再以可估交互作用和曲率的設計建立局部模型、確認中心與邊界。篩選不能被當作最佳化：未被選中的因子可能在不同材料、AR、chamber state 或封裝表面下重新變重要。</p><p>電漿 DOE 有四個固定注意。第一，pressure×power、source×bias、氣體×溫度、時間×wall state 等交互作用常比主效應重要；只改一因子可能得到錯誤方向。第二，腔體隨時間漂移，run order 應隨機化，並穿插可重複中心點量化漂移。第三，setpoint 不等於 actual，flow 與 pressure、功率與 bias、溫度與 wafer surface state 可能不獨立，分析必須保存 actual trace。第四，許多 response 有非單調峰谷或硬邊界，線性平均模型不可取代邊界確認。</p><p>對封裝清潔，DOE 的反應不能只寫 cleanliness。因子可包含受核准的模式、時間、溫度、queue 或 re-clean 分支；反應需同時有 Cu/UBM 氧化和粗糙度、PI/PBO/mold compound 化學/形貌、low-k 代理、殘留、particle、接合與老化。當表面清潔改善但 bond reliability 下降，該點不在製程窗內。DOE 結案應附材料範圍、抽樣座標、MSA、失敗模式、停止線和必要的產品 qualification，而不是只交一個最佳 setpoint。</p>` },
    { id: "coo-pm-fdc", title: "COO、PM、seasoning 與 FDC：把成本訊號變成良率控制", body: `<p>COO 包括設備折舊、耗材、氣體、電力、排氣處理、維護時間、seasoning、監測 wafer 與停機造成的機會成本。最便宜的單片 recipe 不一定是最低 COO：若它加速 focus ring、showerhead、liner、ESC 或 abatement 耗損，增加 particle、延長 clean 或造成重工，總成本可能上升。零件壽命應以使用量、產品 mix、熱循環、clean history、FDC 特徵、reference wafer map 和 particle signature 的趨勢管理，而不是只以固定日曆或單一 RF 小時數管理。</p><p>PM 後 first-wafer effect 與 seasoning 是製程狀態問題。清腔、拆裝、pumpdown、wall condition 與零件表面改變後，rate、uniformity、OES/VI、particle 或材料組成可逐片收斂。seasoning 完成條件應由產品 CTQ 或 reference wafer 的收斂證明，而非預設片數。若首片偏差超過既有窗口，應 hold 並回到 PM/clean/硬體診斷；把第一片結果排除統計只會延後良率事件。</p><p>FDC 收集壓力、閥位、power、match、He、溫度、OES、VI、pump 與其他可用時間序列，目的在產品失效前辨識狀態偏離。feature 必須與結果、時間、產品和 PM 分層關聯；alarm 沒響不等於無異常，模型也不可取代 particle、表面或電性量測。封裝線還要把 plasma clean 的 queue、re-clean 次數、transfer/儲存環境、Cu oxide、污染與 bond/reliability 回填進 FDC/SPC，否則短期 clean proxy 無法預警長期接合失效。</p>` },
    { id: "safety-abatement-pfc", title: "氣體、RF、abatement 與 PFC：程序邊界先於工程最佳化", body: `<p>自燃、毒性、腐蝕、窒息與高壓/RF 風險需依所在地 EHS、設備操作、氣體供應與緊急應變程序管理。工程教材可以說明風險路徑：反應性氣體與副產物需要偵測、隔離、相容材料、連鎖、排氣和核准處置；RF generator、match 與電容存在高壓及儲能風險；拆裝、清腔或開蓋可釋放沉積物、鹵素殘留和微粒。但不得用未確認的數值、閾值或自行推定的操作方法替代現場核准。</p><p>Abatement 的選擇要以實際製程物種、副產物、流量、濃度、溫度、停留時間、設備狀態與核准能力評估。濕式、乾式吸附、熱/燃燒或電漿等路徑有不同的適用邊界；工程師應確認 alarm、maintenance、byproduct、排氣與監測資料，而不是假設只要設備存在就一直有效。封裝清潔也需處理 polymer、PI/PBO、mold compound、助焊/樹脂殘留與金屬氧化物可能形成的污染或排氣問題，避免為去除 wafer 表面殘留而把污染移到腔體、排氣或下一批產品。</p><p>PFC 減量的基本計算是某物種的氣候影響約等於經來源確認的 GWP 乘該期間實際排放/逃逸量，再按組織採用的盤查方法彙總。GWP 版本、破壞效率、利用率、量測邊界與維護狀態都可能改變結果，因此本章不硬寫可能隨來源更新的數值。工程行動應以物料平衡、排氣量測、abatement 狀態、recipe 使用量與經核准的盤查規則比較改善前後；不要以氣體名稱、名義 flow 或供應商宣稱單獨推斷實際排放。</p>` },
    { id: "yield-release-governance", title: "良率放行、queue/reclean 與跨班交接", body: `<p>量產放行需要一份從腔體狀態到產品 disposition 的證據鏈：最後良品與第一異常的時間、受影響 wafer、recipe/actual、PM/parts/clean、FDC/SPC、map、缺陷、電性、材料分析與下游結果。Containment 先圈定可能範圍，再以 reference wafer、受控回退或對照腔體驗證；根因未明時不可同時改 recipe、零件、clean 和量測定義，否則下一班無法重建因果。</p><p>封裝清潔的 queue 是產品條件的一部分。RDL/UBM/Cu 可能在等待中再氧化，PI/PBO 或 mold compound 可能吸濕或吸附污染，re-clean 又可能累積 roughness、化學改變、低-k 損傷或金屬再沉積。放行應明確定義已驗證的 queue 範圍、超窗時的隔離和 re-clean qualification，不把「再跑一次」當無代價修復。接合品質、接觸電阻、界面 void、濕熱/熱循環或既有可靠度指標需要與 clean 前後 surface evidence 一起判讀。</p><p>跨班交接寫明暫定假說、反證、唯一待變因、資料位置、hold 清單、停止線與復歸條件。當產品或安全風險高於工程資訊時，依既有 escalation 程序停止擴大實驗。這種治理不會降低技術深度；它讓 matching、DOE、PM 和案例中的對策在產品、封裝表面與設備生命週期改變後仍可稽核。</p>` }
  ],
  callouts: [
    { type: "warning", title: "先修硬體與狀態", body: "以 recipe 補償硬體、seasoning 或量測差異，常把下一次 PM 的風險延後到產品上。" },
    { type: "insight", title: "排放是量測問題", body: "PFC 影響應以來源、GWP 版本與實際逃逸量計算；未量測的破壞效率與排放邊界必須標示不確定度。" }
  ],
  labs: [],
  selfCheck: [
    ["Chamber matching 的三層與調整順序是什麼？", "先確認硬體/零件/seasoning/校正，再比較電漿指紋，最後以 wafer CTQ 驗證；先修硬體與狀態，不以 recipe 掩蓋可修復差異。"],
    ["電漿 DOE 為何需要兩階段與四項注意？", "先篩選再優化；必須處理交互作用、腔體漂移的隨機化與中心點、actual 與 setpoint 不獨立，以及非線性/硬邊界。"],
    ["為何 PM 後不能以固定片數宣稱 seasoning 完成？", "wall、零件與清腔狀態的收斂依產品和 CTQ 而異，需用 reference/product wafer 的 map、rate、particle 或材料結果證明。"],
    ["FDC 在封裝清潔量產中少了什麼會失效？", "若不回填 queue、re-clean、surface state、Cu oxide、污染、接合與可靠度，設備 trace 即使正常也可能漏掉材料與下游失效。"],
    ["PFC 為何不能只用 GWP 或名義流量比較？", "需使用經來源確認的 GWP 與實際逃逸/排放量，並考慮利用率、abatement、量測邊界和維護狀態。"],
    ["封裝表面超過 queue 時，為何不能直接 re-clean？", "re-clean 可能去除再氧化或污染，也可能累積 Cu/UBM 粗化、PI/mold compound/low-k 損傷與再沉積；必須依已驗證分支決定。"],
    ["安全異常為何不能以工程 split 自行驗證？", "氣體、RF、排氣與 abatement 異常須依核准 EHS/設備程序隔離與升級；工程資料不能取代安全狀態確認。"]
  ],
  cases: [
    caseStudy("c1-rate-drift", "蝕刻率逐日下降，match 與 OES 同步漂移", "同一 recipe 的 reference wafer rate 連日下降；matching capacitor 位置持續偏移，含氟 proxy 變弱，產品尚未全面失效。", "保留 rate/map、OES 原始通道、VI/match、pressure/flow actual、showerhead/liner 使用履歷、clean/seasoning、產品 mix 與量測 MSA。", ["showerhead 孔或供氣路徑被沉積物改變，造成輸送與解離狀態漂移。", "wall condition 或 clean 不完全改變自由基耗損；也可能是 OES 光路或速率量測漂移。"], "以 reference wafer 和獨立厚度/截面復核 rate；比較壓力響應、flow actual、VI 與多條光譜線，並依程序檢查/處置供氣與腔體零件。若光學整體衰減但 wafer 結果不變，先查視窗；若 actual 和產品同步變，硬體/壁面假說上升。", "經交叉量測與硬體檢查確認 showerhead 有沉積造成有效供氣分布改變，而非單純 recipe 或 OES 顯示問題。", "依核准維護流程處理零件與清腔，重建真空/flow/電漿基線，完成 seasoning 後以 reference 與代表產品 bridge。", "放行要求 rate/map、profile/selectivity、particle、FDC 指紋與產品 CTQ 同時回到既定窗口，且確認受影響批次的 disposition。", "以零件壽命、pressure/match/OES 多變量趨勢、reference wafer 和 clean 後收斂建立預警；不以單一 OES 強度或固定日曆週期作唯一判據。"),
    caseStudy("c2-focus-ring-cd", "單一腔體 CD 偏大，且 focus ring 壽命最長", "四腔中只有一腔的產品 CD 系統性偏大，偏差約為數奈米量級；其 focus ring 使用履歷最長，但平均 rate 與 recipe setpoint 接近其他腔。", "收集 CD/profile map、notch 對位、focus ring 料號/高度/耗損、ESC/He、VI/phase、edge FDC、產品密度、量測工具 MSA 和其他腔 reference map。", ["focus ring 耗損改變邊緣鞘層與離子角度，使 CD transfer 在特定區域偏移。", "CD 偏差來自 metrology 對位、產品 mix 或 resist/mask 差異，並非 chamber 本體。"], "先以同一 reference wafer、相同 metrology 座標和 rotation 排除量測與 wafer signature；再比較硬體幾何、edge VI/He 與 profile。依程序以受控零件處理或已知良好環件 bridge，避免同時改 recipe。", "證據顯示 ring 耗損造成 edge sheath/profile 差異，CD 偏移並非 setpoint 本身或量測假象。", "更換或校正至核准的 ring 狀態，重新建立 chamber baseline 與 seasoning，先驗證 edge/center profile 再做產品 bridge。", "放行需證明全片 CD/map、profile、電性與 chamber matching guard band 恢復；不能只把中心 CD 調回來。", "把 ring 版本、累積使用、edge signature 和 profile 納入 FDC/PM 趨勢；維護後先修硬體，再評估是否仍需要任何受控 recipe offset。"),
    caseStudy("c3-first-wafer", "清腔後首片失效，後續恢復", "clean 後第一片產品出現 rate/map、particle 或缺陷異常，第二片後逐漸正常；recipe、入料與操作紀錄未顯示同時變更。", "保存 clean endpoint、parts/vent/pumpdown、idle、首片到穩態片的 actual trace、reference map、particle、OES/VI、sample queue 和產品 CTQ。", ["clean 後 wall coverage 與表面反應尚未收斂，形成 first-wafer effect。", "第一片在轉移、背面、量測或來料上異常；或 clean endpoint/真空狀態本身不完整。"], "以受控片序與 reference wafer 重建收斂曲線，並獨立檢查 base pressure、leak、particle 與轉移條件。若只第一片的 plasma proxy 與 wafer CTQ 一起偏移且後續收斂，seasoning 假說成立；若多片不收斂，回查 clean/硬體。", "資料支持 clean 後腔壁狀態未達穩態，而非單一產品 lot 問題。", "依既有程序重做必要 seasoning/確認，隔離首片及相鄰風險批次，將 clean、parts、idle 與片序連到回復資料。", "放行要求 seasoning 完成判據基於 reference 與產品 CTQ、particle 和 FDC 收斂，不以預設片數代替驗證。", "建立 clean 後片序 dashboard、first-wafer hold/monitor 規則和超窗 escalation；封裝清潔同時追蹤 queue、Cu oxide 與接合結果。"),
    caseStudy("c4-antenna-leakage", "高天線比產品出現 gate leakage", "特定產品的 gate leakage 與可靠度 fail 較高，版圖 antenna ratio 最大；一般產品與平均 rate 仍正常，異常集中在高風險 plasma 步驟後。", "保留 antenna PCM、版圖/AR、Vt/C-V/TDDB 或既有電性、bias/source waveform、pressure、charging-sensitive 結構、UV/離子 proxy、wafer map、產品層次與後段測試。", ["electron shading 與正充電經大面積導體匯集至 gate，造成 oxide stress。", "UV/VUV、離子轟擊或污染造成介電層損傷，與天線路徑只有相關而非因果。"], "比較不同 AR 的 PCM、脈衝 off-phase、bias/能量條件和具/不具洩放路徑結構，並在相同總移除量下看電性。若 antenna 保護改善部分失效但 UV proxy 或低 AR 結構仍劣化，需分離光子/離子機制。", "驗證支持 charging 為主要貢獻，但不把它當成排除 UV、離子或污染的唯一答案。", "採受控低損傷脈衝/能量窗口或設計端洩放方案，並重新驗證 profile、殘留、產能與最敏感電性；封裝 stack 若含 low-k 亦納入材料損傷檢查。", "放行需包含 antenna 分層電性、可靠度、product map、製程 CTQ 和必要設計/製程 qualification，不能只看平均 leakage。", "將高 AR 產品、波形/charging 指紋、電性與失效分析納入導入審查；任何 recipe 改動都保留對 UV/VUV、IEDF 和污染的獨立監控。"),
    caseStudy("c5-pm-particles", "PM 後微粒上升，且集中於關電漿瞬間", "PM 後數日 particle count 上升，事件時間多在 plasma shutdown 附近；rate 可能仍在窗口，且不同產品均可看到相似 particle signature。", "收集 particle map/size、shutdown waveform、pressure/throttle、parts/clean/assembly、腔體影像依程序、pump/flow、reference wafer、PM scope、產品位置與 defect review。", ["關電漿過快使懸浮粒子或鬆動沉積物落下，形成可重複的 shutdown signature。", "PM 組裝、零件表面、pump/backstream 或量測/載具污染才是粒子來源。"], "以受控 power ramp、reference wafer、不同 shutdown sequence 與空跑/rotation 對照比較 particle 時序及座標；同時依程序檢查零件、接地、flow 和轉移。不可只因總數下降就排除新出現的關鍵粒徑或位置。", "證據顯示 shutdown 暫態促使腔內懸浮粒子沉降，PM 後表面狀態使風險提高。", "在核准範圍內採平緩 shutdown 與必要清潔/seasoning，確認 particle map、產品 defects、rate/profile 與硬體狀態；封裝產品另確認 RDL/UBM 表面無金屬或聚合污染。", "放行要求連續 monitor 與產品粒子/缺陷穩定，且無新 edge/center signature、接合污染或可靠度分離。", "將 shutdown trace、particle 時序、PM parts/assembly、清潔與季節化納入 FDC/PM checklist；若事件重複，升級硬體與污染路徑分析而非只放寬 alarm。")
  ],
  readings: ["既有產品、設備與 EHS 核准的 chamber matching、DOE、PM/FDC、氣體/RF、abatement、排放盤查和封裝清潔/可靠度程序。", "政府、產業或組織採用之最新 GWP 與溫室氣體盤查來源；使用前確認版本、邊界、實際排放與破壞效率資料。"]
};

function caseStudy(id, title, phenomenon, data, hypotheses, verification, rootCause, action, release, prevention) {
  return { id, title, phenomenon, data, hypotheses, verification, rootCause, action, release, prevention, engineeringNote: caseNotes[id] };
}

const releaseLedger = [
  ["基準版本", "golden chamber、reference wafer、metrology、產品 stack 與產品族群是否已固定？", "保存版次、座標、最後良品、前後 PM/clean、raw map 與實際 trace，避免將不同條件混成基準。"],
  ["硬體 gate", "parts、focus ring、showerhead、ESC、接地、pump 與感測器是否在核准狀態？", "先處理版本/壽命/校正與真空完整性，再判讀 plasma 或 recipe 差異；硬體未閉環時不做永久補償。"],
  ["指紋 gate", "pressure、flow、VI、match、OES、He、溫度和節流反應是否與 reference 一致？", "保留多來源 proxy 與時間對齊；單一 tag 合格不足以排除耦合、光路或壁面狀態問題。"],
  ["產品 gate", "最差 AR、density、edge、最薄 layer、最敏感 dielectric 或封裝 pad 是否通過？", "同時確認 rate、CD/profile、殘留、particle、電性/接合及必要可靠度，不用平均結果替代最差結構。"],
  ["DOE gate", "因子、交互作用、中心點、run order、actual 與停止線是否事先定義？", "每輪實驗只回答可辨識的問題；若 chamber drift 超過中心點容許範圍，先恢復狀態而非把漂移擬合成 recipe 效果。"],
  ["PM gate", "clean、parts、seasoning 與 first-wafer 的收斂是否已有資料支持？", "以片序、reference、particle 和產品 CTQ 定義完成條件，並對超窗首片建立 hold 與 disposition。"],
  ["封裝 queue gate", "RDL/UBM/Cu、PI/PBO、mold compound、low-k 的處理後等待與 re-clean 是否經產品驗證？", "保存表面氧化、化學、roughness、離子殘留、接合/接觸與老化資料；超窗不預設可重洗。"],
  ["污染 gate", "清潔副產物、金屬濺鍍、聚合物、filler、backstream 或 transfer 是否可能帶入下一批？", "以 witness/reference、particle map、表面分析與產品 defect 分開追蹤來源，並把腔體與排氣路徑同時納入。"],
  ["EHS gate", "氣體、RF、真空、排氣與 abatement 是否依核准程序處於可操作狀態？", "安全 alarm、連鎖、維護或排放異常時停止工程擴大，依既有 escalation 處置；工程資料不取代安全確認。"],
  ["排放 gate", "PFC 使用、實際逃逸、GWP 來源與 abatement 狀態是否可追溯？", "以盤查版本、物料平衡和量測邊界報告改善與不確定度，不把名義 flow 或過時 GWP 數字當排放結論。"],
  ["量測 gate", "CD、厚度、particle、surface analysis、接觸或接合的 MSA 是否足以分辨預期改善？", "保存方法、解析度、抽樣、操作者與校正資料；方法誤差接近 recipe 差異時，先修量測再做 DOE 或 chamber disposition。"],
  ["資料完整性 gate", "wafer ID、時間戳、recipe/actual、PM/parts、queue 與下游結果是否可串成同一時間線？", "缺少其中任一鏈結時，根因應保留為暫定，並限制對策只用於 containment 而非長期放行。"],
  ["變更控制 gate", "recipe、零件、clean、量測、材料或供應商變更，是否各有唯一識別、理由與回退條件？", "在受控時段一次導入可辨識的變更，保留變更前後的 chamber fingerprint、產品 CTQ、封裝表面與可靠度 bridge；多項變更同時上線時，必須降低根因信心並擴大監測，不可事後只以良率上升宣稱每一項都有效。"],
  ["異常關聯 gate", "局部 CD、particle、漏電或接合失效，是否以座標、時間、腔體與材料批次驗證為同一事件？", "先比較空間 map、缺陷影像、片序、產品層次與設備暫態，再判斷相關性；不同量測只有趨勢相似而無共同時間或位置證據時，應保留獨立故障路徑，避免把 coincident drift 合併成單一根因。"],
  ["產品變更 gate", "新產品、stack、mask、材料供應或封裝流程導入時，原有 matching 與 DOE 範圍是否仍適用？", "以最敏感幾何和材料做 bridge，重新確認 queue/reclean、污染、接合與可靠度；舊資料只能提供比較基線，不能自動授權外推。"],
  ["放行 gate", "誰確認 evidence、哪些 wafer 受影響、何時回退、監測多久是否明確？", "放行包保留根因信心、未解假說、產品 disposition、監測期限與跨班責任，讓下一次異常可立即比較。"]
].map(([gate, question, evidence]) => `<p><strong>${gate}</strong>：${question} <em>證據要求：</em>${evidence}</p>`).join("");

chapterFourSix.sections.push({
  id: "production-release-ledger",
  title: "量產放行帳冊：每個 gate 都要有可反駁證據",
  body: `<p>量產不是在每次異常後重新發明放行條件，而是將已知風險轉成一組可稽核的 gates。下列帳冊以不同問題、證據和決策邊界串接 chamber matching、DOE、PM、封裝 queue、污染、EHS 與排放；任一 gate 不完整時，結果只能支持工程假說或 containment，不可擴大成產品宣稱。</p>${releaseLedger}`
});
