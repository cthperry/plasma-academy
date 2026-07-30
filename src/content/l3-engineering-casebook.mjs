export const l3FieldGuides = {
  "3-1": guide("蝕刻輪廓判讀指南",
    "先把截面分成遮罩、頂部、中段、底部與材料界面五個區域，逐一記錄線寬、角度、殘留與遮罩剩餘量。輪廓名稱只能描述空間特徵，不能直接當成根因；同一個 undercut 可能來自鈍化不足、自由基過量、遮罩開口漂移或晶圓溫度升高。",
    "證據至少包含 source/bias 實際功率、Vdc、壓力、流量、ESC 溫度與 He 背吹、OES 或自由基代理、遮罩厚度及三段線寬。若只有最終 CD，無法區分氣相供應、鞘層角度與表面鈍化在哪一層中斷。",
    "區分實驗一次只改一個高辨識力旋鈕，並預先寫下兩個互斥假說各自的預測。例如 bias 小幅下降若同時降低底部速率與遮罩損耗，支持離子能量路徑；若輪廓不動但 OES 改變，則應回到化學供應與腔壁損失。",
    "放行不能只看輪廓變直，還要同步驗證速率、選擇比、底層損傷、遮罩餘量與跨晶圓分布。交班紀錄要保留原始截面位置、量測定義、recipe 版本、機台生命週期與未被排除的替代假說。"),
  "3-2": guide("深矽循環製程判讀指南",
    "Bosch 製程要按循環拆開，而不是只看總時間。每個循環都包含蝕刻、鈍化與底部清膜的暫態；閥切換、RF 穩定時間、壓力 overshoot 與 wall memory 都可能讓名義相同的 step 產生不同實際 dose。",
    "量測至少涵蓋深度、頂中底 CD、側壁角、scallop 高度與節距、底部 notch、遮罩剩餘及不同圖形密度。另需保存每步壓力、流量、RF、Vdc 與 endpoint trace，才能把幾何結果連回某一循環。",
    "區分速率與粗糙度時，使用總蝕刻時間相同的循環矩陣：縮短單步並增加循環數，再比較 scallop、深度與暫態損失。ARDE 實驗則要同片放置多種開口與深寬比，避免批次差異被誤認為尺寸效應。",
    "量產放行需包含最不利圖形、晶圓中心與邊緣、PM 前後及不同腔體。任何提高速率的修改都要重新確認 scallop、側壁角、遮罩壽命、底部損傷與設備閥件負荷。"),
  "3-3": guide("缺陷與 ARDE 診斷指南",
    "缺陷診斷先問位置，再問形狀，最後才問名稱。頂部最寬、中段外鼓、底角深溝、介面側向缺口與隨深寬比增加的速率落差，分別指向不同物理路徑；把它們統稱 profile bad 會失去可驗證性。",
    "每個候選根因至少指定一個支持訊號與一個否證訊號。充電假說應對材料界面、脈衝中和或導電路徑敏感；傳輸假說應對壓力、開口與深度敏感；遮罩假說則應伴隨開口或厚度變化。",
    "診斷順序從量測系統與截面方位開始，再比較 pattern density、wafer/chamber 座標、時間漂移與 recipe step。對策實驗必須保留復歸點，並只調整足以區分假說的最小幅度。",
    "結案報告需列症狀定義、候選排序、被排除原因、實驗前預測、結果、對策副作用與殘餘風險。診斷器提供排序，不取代產品、設備、材料與品質共同放行。"),
  "3-4": guide("薄膜與高深寬比填溝指南",
    "沉積問題要把平均膜厚、膜性與幾何覆蓋分開。Top 厚度合格不代表 sidewall 或 bottom 合格，void 消失也不代表底層未被濺鍍損傷；同一 recipe 在不同深寬比與圖形密度下可能有完全不同結果。",
    "PECVD 需追蹤前驅物流量、壓力、功率、溫度、折射率、應力、濕蝕刻率與氫含量代理。PEALD 還要驗證兩個半反應飽和與 purge；HDP 則要保存沉積/濺鍍比、bias、cusp 與底層 loss。",
    "高辨識力實驗包括脈衝飽和曲線、purge sweep、D/S 矩陣、不同 AR 截面與 pattern density coupon。每次只調整一條供應或能量路徑，並用截面直接確認材料到達位置。",
    "放行條件同時包含厚度、均勻度、膜性、應力、缺陷、step coverage、void/seam、底層完整性與可靠度。量產紀錄需標示量測位置、edge exclusion、圖形尺寸與腔體 seasoning 狀態。"),
  "3-5": guide("PVD、靶材與腔體清潔指南",
    "PVD 診斷要把電漿維持、靶面狀態、傳輸與晶圓成膜四層分開。磁場提高的是電子束縛與近靶游離，不是直接改善所有晶圓結果；racetrack 加深後，靶電壓、濺出角度、速率與均勻度可能朝不同方向漂移。",
    "必要證據包含磁場或 magnet pack 版本、靶電壓電流、累積 kWh、racetrack 深度、沉積率校正、wafer map、shield/target lot 與冷卻 trace。反應式濺鍍還需保存 OES、分壓或靶電壓回授與閥位置。",
    "區分靶材耗損與腔體沉積時，可比較換靶、換 shield、clean 與 seasoning 前後的指紋；區分遲滯則要做受控上掃/下掃並記錄歷史。任何 sweep 都需遵守設備與材料安全邊界。",
    "腔體清潔完成不能只用固定時間，應含終點、殘留、零件消耗、abatement 與 seasoning 後基準。所有氣體與副產物依核准 SDS、設備 interlock 與廠區 EH&S 程序操作。"),
  "3-6": guide("均勻度與腔體生命週期指南",
    "Wafer map 是空間指紋，SPC 是時間指紋。先標明半幅或 1σ 定義、取樣點、插值與 edge exclusion，再把徑向、單邊、環形、W 形與 edge roll 分開；未標方位的 map 不能判斷 chamber 或 wafer 座標。",
    "證據應包括原始點位、notch orientation、平均速率、溫度/He zone、中心邊緣氣體、gap、pressure、match position、focus ring 壽命、clean count、idle time 與 recipe mix。只有修正後的 uniformity 數字不足以說明根因。",
    "高辨識力實驗可旋轉 wafer、交換量測方位、比較新舊 focus ring、做中心/邊緣 zone 小幅擾動，並把 PM 後片序與穩態片分開。每個調整都要預測 map 哪個區域會改變。",
    "放行時同步確認平均值、profile、膜性、選擇比、顆粒與硬體壽命，避免用一個 zone 補償掩蓋熱或電場問題。腔體 matching 必須按相同生命週期與產品 mix 比較。"),
  "3-7": guide("封裝表面清潔與可靠度指南",
    "封裝端先辨識污染與材料堆疊，再選 plasma chemistry。RDL、UBM、Cu/Ni pad、PI/PBO、EMC、solder mask 與 underfill 對 O radical、Ar ion、H₂/Ar、VUV 與溫度的容忍度不同，不能共用一個最佳時間。",
    "證據要同時涵蓋接觸角時間序列、XPS/FTIR 或氧化態、粗糙度、材料 loss、bond pull/shear、underfill wetting、cross-section 與可靠度。最低接觸角只能表示潤濕相關表面能，不能單獨證明接合。",
    "DOE 要有 dose 下限、飽和區與過度處理上限，並加入 0/1/2 次 re-clean、不同 queue time、ambient 與 dry N₂ 儲存。Direct/remote 比較需記錄實際 ion exposure，而不是只比較 forward power。",
    "放行規範需版本化 clean-to-bond 上限、儲存條件、超時 hold/re-clean 決策、累積 dose 與核准人。材料、設備、品質與 EH&S 證據未齊時，教材模型不能取代現場核准。")
};

export const l3EngineeringCases = {
  "3-1": [
    caseStudy("3-1-c1", "Bias 提高後輪廓變直但遮罩迅速變薄", "氧化物蝕刻在提高 bias 後頂中底 CD 接近垂直，平均速率增加 18%，但光阻剩餘厚度減半，局部已有 faceting。生產只看到輪廓改善，希望直接延長 over-etch。", "較高 IEDF 讓溝底清膜與離子輔助反應變強，同時跨過光阻濺鍍門檻；遮罩肩部斜入射產額更高，開口會隨時間放大。這是方向性、速率與物理選擇比的共同取捨。", "固定總蝕刻量做三點 bias sweep，量 top/mid/bottom CD、遮罩開口、剩餘厚度與 stop layer loss；同步記 Vdc 與 reflected power。若只改 bias 即按預測移動，才支持離子能量路徑。", "把 bias 降回清膜門檻上方，再以 chemistry 或遮罩厚度取得餘裕；不得用更長 over-etch 補償遮罩失效。確認最不利 pattern density 與 wafer edge。", "交班需記錄輪廓改善伴隨的遮罩代價、bias window、over-etch 上限及 stop layer 風險。"),
    caseStudy("3-1-c2", "增加 O₂ 後頂部 Undercut", "氟碳配方為解決底部殘留加入 O₂，殘留消失、速率提高，但遮罩下方線寬向外擴，側壁中下段仍接近原尺寸。", "O radical 清除 CFx 並釋放更多有效 F，使頂部鈍化最先變薄；離子仍集中在底部，因此最大寬度緊貼遮罩下方，符合 undercut 而非 bowing。", "做小幅 O₂ 回掃並量聚合物厚度代理、F/C OES、三段 CD 與選擇比；另以相同 O₂ 降低 bias，確認是否存在化學與能量交互作用。", "先找能清底但仍保護頂部的 O₂ 範圍，必要時改脈衝或分段鈍化；每個改善點重新驗證遮罩與底層。", "未量頂部位置就只報平均 CD，會讓 undercut 在後續 over-etch 放大。"),
    caseStudy("3-1-c3", "中段 Bowing 對鈍化增加不敏感", "溝槽頂部有完整聚合物，中段明顯外鼓，底部寬度又收回；再增加鈍化只讓速率下降，中段形狀變化很小。", "頂部已受保護，問題不像單純鈍化不足。離子在遮罩肩部散射、側壁反射或角度尾端集中到中段，可能持續移除局部保護層而形成 bowing。", "比較遮罩厚度/開口、壓力與 bias 頻率，並用 A18 形狀預設檢查最大寬度位置。降低壓力若角度收斂且中段改善，支持角度傳輸路徑。", "優先修正離子角度與肩部幾何，再微調鈍化；避免用大量聚合物把 bowing 暫時遮成 taper。", "結案必須保存中段寬度而非只看頂底 CD，並列出速率下降副作用與復歸條件。"),
    caseStudy("3-1-c4", "Stop layer 上方 Etch stop 與殘留", "主蝕刻深度接近界面後速率快速下降，底部留下一層殘膜；提高時間幾乎無改善，卻讓遮罩消耗與側壁 roughness 增加。", "高深寬比降低底部自由基與離子有效通量，界面材料也可能改變充電與表面化學。若殘膜靠延長時間仍不動，限制可能是清膜門檻或非揮發產物，而非時間不足。", "用短 over-etch split 比較 bias、壓力與化學添加，量 endpoint、底部殘留成分、stop layer loss 及不同 AR。界面專一異常要與普通 ARDE 分開。", "建立 main/over-etch 分段窗口，讓 over-etch 專門處理殘膜並限制下層損傷；無材料與產物證據時不盲目加能量。", "放行需同時指定殘留檢出限、stop loss、選擇比與最大 over-etch。")
  ],
  "3-2": [
    caseStudy("3-2-c1", "Scallop 過大但深度符合", "深矽孔達到目標深度，平均速率也有餘裕，但側壁 scallop 高度超規，後續金屬覆蓋出現斷點。", "單次 SF₆ 蝕刻步移除量過大，等向側向分量隨 step time 累積；總深度合格只表示循環總移除足夠，沒有約束每循環表面粗糙度。", "固定總時間比較短循環/多循環與長循環/少循環，量 scallop 高度、節距、速率與閥切換暫態；另檢查鈍化步是否足以覆蓋新表面。", "縮短蝕刻步並重新平衡沉積和清底，利用現有產能餘裕換取平滑；確認閥壽命與暫態不成新限制。", "交班必須把 scallop 與後續覆蓋率連結，不能只寫外觀改善；後段沉積截面也要列入共同判定。"),
    caseStudy("3-2-c2", "密集孔深度落後孤立孔", "同片 5 µm 孤立孔達標，密集陣列平均少 12%，越深差距越大；中心與邊緣都有相同趨勢。", "局部圖形密度讓自由基供應被更多開口共享，副產物排出與側壁損失也加重，形成 microloading 疊加 ARDE。方位一致性降低單純流場偏斜的可能。", "設計開口尺寸×密度×深度 coupon，對比總流量、壓力與循環時間；保存同片位置並以截面量底部 CD，避免只用表面開口推算。", "優先改善傳輸或分段 recipe，必要時對密集區設計補償；不得用全片延長時間造成孤立孔過蝕。", "規格需列最不利密度與深寬比，而不是單一 monitor 結構；也要保留孤立孔過蝕上限。"),
    caseStudy("3-2-c3", "底部 Notching 只出現在氧化層界面", "深矽蝕刻接近 buried oxide 時，孔底兩側出現側向缺口；在純 Si 深度相同的位置沒有異常。", "介電層累積電荷改變局部電位，離子在界面附近偏折到側壁，形成 notching。若只由離子反射造成，應更像底角 microtrench 且不會嚴格鎖定 oxide 界面。", "比較連續與脈衝 bias、導電終點層、over-etch 時間及界面材料；量缺口深度與方位，確認改善是否與中和時間相關。", "使用受控脈衝/低能 over-etch 或終點後快速降能，限制介面累積 charge；同步驗證殘留與深度。", "放行需列 notch 尺寸、oxide loss 與脈衝設備穩定性。"),
    caseStudy("3-2-c4", "縮短循環後速率異常崩落", "為降低 scallop 把每步時間縮短一半、循環數加倍，理論總 dose 接近，但實際深度少 25%，step trace 顯示每次壓力尚未穩定就切換。", "閥切換、壓力 settling 與 RF 點火占每步固定 overhead；步驟過短時，有效穩態反應時間不是名義時間的同比縮放，鈍化與清底也可能從未到達門檻。", "由 trace 計算每步穩態占比，做保持總 on-time 而不同切換次數的矩陣；確認 RF、MFC、throttle 與 endpoint 的相位。", "設定最小有效 step time 或優化硬體切換，再調 scallop；不得假設名義 dose 可忽略暫態。", "交班記錄需包含閥與壓力動態，而不是只存 recipe 表格。")
  ],
  "3-3": [
    caseStudy("3-3-c1", "窄槽 RIE lag 在降壓後改善", "寬槽速率穩定，窄槽慢 45%；壓力由 40 降到 15 mTorr 後 lag 降到 28%，但總速率略減。", "較低壓力拉長平均自由徑、收斂離子角度並改善深部傳輸，支持碰撞與幾何陰影是 ARDE 的一部分；總速率下降則顯示中性供應或 residence time 同時改變。", "保持吸收功率與總流量可比，量多種 AR、IEDF/Vdc 代理、OES、寬窄槽底部通量與副產物；用 A20 分離 transport、charging 與 product removal。", "在 lag 改善與總速率損失間找壓力窗口，必要時以流量或 source 補供應，但重新檢查方向性。", "不可只報 lag 百分比，需同步報寬槽基準速率與 profile。"),
    caseStudy("3-3-c2", "底角 Microtrenching 隨 Bias 上升", "側壁大致垂直，溝底中央深度正常，但兩個底角形成更深小溝；提高 bias 後小溝加深。", "離子在側壁或底部斜面鏡面反射，通量在底角集中；高 bias 提高反射後的濺鍍/反應能力。這與 notching 的介面側向缺口不同。", "做 bias 與壓力小矩陣，量底角/中央深度比、IEDF 代理與側壁角；改變底部材料若位置不鎖定界面，進一步支持反射。", "降低高能尾、收斂角度或調側壁鈍化，並確認中央清底未失效；避免只增加底部保護造成 etch stop。", "結案圖需標底角局部深度，平均深度不能代表 microtrench，並保存同方位重複截面。"),
    caseStudy("3-3-c3", "Grass 隨清潔後片數增加", "PM 後前幾片乾淨，片數增加後針狀 grass 與顆粒同步上升，元素分析看到微量金屬。", "腔體零件或再沉積物脫落形成微遮罩，周圍材料持續被蝕刻而留下殘柱。與單純聚合殘留相比，金屬訊號與片數趨勢支持硬遮罩污染。", "依 clean count 分層缺陷密度，做元素/位置 map、shield 與電極檢查，並比較材料 lot；確認顆粒方位是否固定在 chamber。", "處理污染來源、零件相容與清潔/seasoning，不以增加 bias 強行清除 grass；後者可能把金屬再濺鍍擴散。", "放行需包含顆粒、金屬污染與缺陷密度，不能只看殘柱高度；清潔後基準片也須歸檔。"),
    caseStudy("3-3-c4", "缺陷對策改善截面卻惡化均勻度", "中心 bowing 經調中心氣體後改善，但 wafer edge 轉為 taper，片內半幅不均勻度從 3% 變 7%。", "分區氣體改變自由基供應，同時引入徑向組成差；中心單點截面改善只是把化學平衡移到另一區域，沒有建立全片穩健窗口。", "以固定方位取中心、中環、邊緣截面，保存 wafer map、OES 分區代理與 flow actual；比較全域 chemistry 調整與 zone 補償的差異。", "先修全域機制，再用最小 zone 補償；每次同時驗證 profile 與均勻度，必要時保留多目標 DOE。", "交班需明列改善區、惡化區與量產最差點，不以中心漂亮截面結案。")
  ],
  "3-4": [
    caseStudy("3-4-c1", "PEALD 脈衝過量但厚度不增", "前驅物脈衝由 12 秒加到 20 秒，100 cycles 的 top 厚度都約 8 nm，覆蓋率也不變；團隊懷疑 MFC 上限。", "表面位點在 12 秒前已飽和，自限制半反應使延長供應不增加 GPC。若 MFC 受限且未飽和，應看到脈衝時間仍影響厚度或深部覆蓋。", "建立完整 pulse saturation 曲線並同步量 bottom/top、排氣訊號與 wafer loading；另掃 plasma step，證明兩個半反應都各自飽和。", "採用飽和點上方合理餘裕，刪除沒有增益的過量脈衝以提升產能；保留不同產品 loading 驗證。", "放行需保存飽和曲線，不能只以單一厚度相同宣稱 ALD。"),
    caseStudy("3-4-c2", "Purge 縮短後 GPC 升高且覆蓋率下降", "為縮短 cycle time 將 purge 從 3 秒降到 0.3 秒，GPC 從 0.08 升到 0.17 nm/cycle，但高 AR 結構 bottom/top 從 98% 降到 62%。", "殘餘前驅物與共反應物重疊，出現氣相或連續表面 CVD；入口區反應更快並消耗物種，造成非自限制與深部供應不足。", "做 purge sweep、壓力尾端與 exhaust 訊號，並比較空載/滿載；用相同總厚度看組成、顆粒與 step coverage，排除只是量測偏差。", "把 purge 拉回殘餘訊號消失的窗口，若要提產能則優化抽氣、體積或脈衝，不接受寄生 CVD 當高 GPC。", "交班需記 GPC 增益伴隨的覆蓋與顆粒風險。"),
    caseStudy("3-4-c3", "HDP Gap Fill 由 Void 轉為底層侵蝕", "提高 bias 後 seam/void 消失，但底層 barrier loss 增加，D/S 計算顯示已超過原窗口。", "離子濺鍍原本用來移除 45° cusp；能量或比例過高後，淨移除延伸到底部材料。無 void 只證明入口未封閉，不代表填溝整合完整。", "做 D/S×AR 矩陣，量 cusp、void、bottom loss、再沉積與膜應力；將相同截面位置和 endpoint 對齊，找上下限。", "降低 bias 或提高受控沉積，使 cusp 仍可清除但底層 loss 在規格內；最不利 AR 與密度都要通過。", "放行條件必須同時包含 void、底層完整性與後續電性可靠度。"),
    caseStudy("3-4-c4", "PECVD 平均厚度合格但 Edge 膜性漂移", "全片平均厚度與半幅尚可，edge 折射率下降、濕蝕刻率升高，後續可靠度集中在外圈失效。", "厚度均勻不等於組成與緻密度均勻；edge 的溫度、離子能量、前驅物耗盡或 showerhead/pump 流場可能改變氫含量與交聯。", "建立厚度、RI、WER、應力與溫度的共定位 map，對齊 edge exclusion、He zone 與 chamber 方位；小幅改溫度或氣體 zone 看哪項先響應。", "修正主導膜性路徑後再做厚度補償，不能只用流量把厚度拉平；重新驗證可靠度。", "交班需以多屬性 map 描述，不把平均厚度當唯一 CTQ，並保留外圈失效位置。")
  ],
  "3-5": [
    caseStudy("3-5-c1", "靶材剩餘重量高但速率已漂移", "靶材總重量仍在供應商建議值以上，沉積率卻下降 9%，wafer map 由中心快轉為環形，靶電壓也持續漂移。", "Racetrack 最深處而非總重量限制靶壽命；侵蝕改變磁場、鞘層與濺出角度，會在安全厚度前先造成速率與均勻度漂移。", "量 racetrack 深度剖面，按 kWh 對齊靶電壓、速率校正與 map；比較新靶後是否同時復歸，並排除 shield 沉積。", "以最深厚度、漂移與冷卻限制建立換靶門檻，不再只依重量或片數；換靶後執行 seasoning 與基準片。", "交班應附靶 lot、magnet pack、kWh 與深度，而非只寫換靶；安全餘厚需由設備規範確認。"),
    caseStudy("3-5-c2", "反應式濺鍍批次間跳模式", "相同 N₂ 流量下，一批 TiN 速率正常，下一批突然下降且靶電壓跳到另一平台；重新點火後有時恢復。", "Recipe 位於金屬/中毒轉換的遲滯區，初始靶面與氣體歷史決定落在哪個穩態。固定流量開迴路無法保證固定靶面覆蓋。", "做受控 N₂ 上掃與下掃，記 OES、靶電壓、閥位與速率；改變 pre-sputter 歷史確認雙穩態，並量閉迴路延遲。", "選擇穩健模式或使用核准回授閉迴路，設定增益、飽和與失效保護；不得只在跳模後手動改流量。", "放行需含模式判定訊號、超限處置、初始靶面條件與回授失效時的復歸 recipe；膜厚、膜組成、電阻率、均勻度與批次首片都需驗證。"),
    caseStudy("3-5-c3", "Remote Clean 終點延後", "相同固定時間的 NF₃ remote clean 最近常在停止時仍有產物訊號，PM 後第一批顆粒增加。", "腔壁沉積負載、remote source 解離效率、管壁復合或 abatement 背壓改變，使到達 F 通量與清潔需求失配。固定時間未證明沉積已清除。", "比較終點積分、source trace、管溫、clean count、沉積 recipe mix 與殘留 witness；檢查零件消耗及下游處理，所有操作依核准程序。", "改為有上限保護的終點控制，處理 source/傳輸瓶頸，再建立 seasoning 與顆粒基準；不以無限延時補償未知故障。", "交班需列未反應氣體、副產物、零件與 EH&S 狀態。"),
    caseStudy("3-5-c4", "換 Shield 後 Map 改善但速率變慢", "換新 shield 後環形不均勻度消失，平均沉積率卻下降 6%；靶材與功率沒有變。", "Shield 表面與幾何會改變接地、二次電子、再濺鍍與材料捕集；舊 shield 可能提供額外再沉積，也可能扭曲電漿。更換後恢復的是一組新邊界，不必同時恢復舊速率。", "對齊換 shield 前後的 match、靶電壓、速率、map 與膜純度，跑 seasoning 片序看是否收斂；比較同 lot 新零件排除尺寸差。", "以新硬體狀態重新建立速率校正與 seasoning，不把舊速率補償直接套入；確認膜性和顆粒。", "放行基準要綁定零件版本與 seasoning 狀態。")
  ],
  "3-6": [
    caseStudy("3-6-c1", "單邊偏斜隨 Wafer 旋轉不動", "Wafer map 右側速率高 8%，把 wafer 旋轉 180° 後高值仍固定在 chamber 右側，而不是跟著 notch。", "固定 chamber 方位支持 pump、供氣、電極、match 或硬體不對稱；若缺陷跟 wafer 旋轉，才更像上游膜厚、翹曲或晶圓固有圖形。", "確認量測座標與 notch，交換進氣/抽氣條件或做 pump angle 模型，保存 pressure、flow actual、硬體位置與空白 wafer map。", "先修設備方位來源，再用最小 zone 補償；補償後仍驗證不同產品 loading，避免只對單一 wafer 調平。", "交班圖必須標 chamber 方位、notch 與量測方向。"),
    caseStudy("3-6-c2", "Focus Ring 壽命後 Edge Roll", "RF hour 增加後最外圈速率快速下降，中區保持穩定；換新 focus ring 後 edge 恢復，平均速率幾乎不變。", "Ring 高度與侵蝕改變邊界鞘層和離子軌跡，典型指紋是外圈突變而非整片平滑徑向差。換件復歸提供強因果證據。", "按 ring hour 疊圖 edge profile，量實際高度、材料與安裝；比較 edge exclusion 和量測 repeatability，排除外圈量測假象。", "建立 ring life 與 edge roll 預警，換件後做 chamber matching；不要用中心/邊緣氣體永久補償已耗損硬體。", "放行需定義 edge exclusion、ring 版本與壽命上限。"),
    caseStudy("3-6-c3", "PM 後 First Wafer Effect", "Wet clean 與組裝後第一片速率高 7%、第二片高 3%，第三片起穩定；若 idle 超過 12 小時又重現。", "腔壁水氣、表面終端與聚合覆蓋改變自由基復合和放氣，產品片逐步把腔壁帶回穩態。這是狀態歷史，不是 setpoint 改變。", "量 PM/idle 後片序的 OES、match、速率與 map，改 seasoning 片數和 chemistry；把第一片與持續漂移分開統計。", "定義可驗證的 seasoning 終點與基準片，產品只在 trace 與 wafer 結果穩定後放行；控制長 idle 後流程。", "SPC 要標片序與 idle，不把非穩態片混入長期均值。"),
    caseStudy("3-6-c4", "半幅失敗但 1σ 通過", "49 點 map 只有一個 edge point 偏低 12%，半幅超規，1σ 仍低於內控；工程師想刪除該點以取得通過。", "兩種定義對局部極端敏感度不同。單點可能是量測離群，也可能是真實 edge defect；未完成 MSA 與重測前刪點會掩蓋最差風險。", "重測相同點、旋轉 wafer、檢查 edge exclusion 與量測校正，再看鄰近點及產品失效方位。分別報半幅與 1σ，不混成一個數字。", "若證實量測離群，按預先核准規則處理；若是真實 edge roll，追 focus ring、夾持或邊界硬體。", "交班需保存原始點、刪點理由、公式與 MSA 證據；任何刪點都要可被第三方重算。")
  ],
  "3-7": [
    caseStudy("3-7-c1", "Cu Pad 接觸角下降但 NSOP 上升", "O₂ plasma 後接觸角由 54° 降到 18°，但 wire bond NSOP 與 pull 低值增加；表面分析顯示 Cu oxide 增厚。", "O radical 去除有機物並提高表面能，同時氧化 Cu。潤濕改善不代表金屬接合界面改善，接觸角與 bondability 在此朝相反方向。", "比較 O₂、Ar、受控 H₂/Ar 與 remote/direct，量接觸角、XPS oxide、pull/shear、粗糙度及 queue time；所有氣體依核准安全程序。", "降低氧化 dose 或改用相容 chemistry，在 cleanliness、oxide 與 bond strength 交集內定義窗口；不得只追最低接觸角。", "放行需包含金屬氧化與功能性接合，不以 wettability 單項取代。"),
    caseStudy("3-7-c2", "EMC 過度處理後 Delamination", "延長 O₂/Ar 時間使初始 underfill wetting 更快，但 TCT 後 delamination 增加，截面看到 filler exposure 與弱表層。", "過量 radical/ion dose 造成 polymer chain scission、LMWOM 或樹脂移除，初始表面能可高但弱邊界層的內聚強度下降。", "做 dose sweep，量接觸角 aging、XPS/FTIR、roughness、material loss、filler exposure、lap shear 與可靠度；比較 remote 低離子條件。", "設定功能性接著力的 dose 上限，必要時用低 damage remote 處理；不得以初始 wetting 取代 TCT/HAST 結果。", "交班要保留材料 lot、mold compound 配方與累積 re-clean 次數。"),
    caseStudy("3-7-c3", "Clean-to-Bond 超時要求重清潔", "一批 Cu pillar/PI 在 plasma clean 後因 bonding tool 停機等待 10 小時，超過已驗證 4 小時；接觸角回升，生產要求再跑一次原 recipe。", "等待期間可能發生疏水回復、再污染與金屬氧化；重清潔雖可降低接觸角，也會累加 polymer loss、粗糙度與 oxide。原 qualification 若沒有 re-clean，不能推定安全。", "查 MES 時間、ambient/N₂ 儲存、材料 lot、第一次 dose 與既有再處理規範；以 witness 做 oxide、接觸角、pull/shear、wetting 與截面。", "規範允許且累積 dose 在範圍才受控 re-clean；沒有證據則 hold，由材料、封裝、品質共同評估。", "所有超時與再處理需版本化、可追溯並重設較短 queue time。"),
    caseStudy("3-7-c4", "不同 EMC Lot 使用同配方結果分裂", "同一 plasma recipe 對供應商 A 的 EMC 接著力提升，供應商 B 卻出現粗糙度與 filler exposure，兩者初始接觸角相近。", "樹脂、填料、偶聯劑、release agent 與 cure history 改變表面反應和 damage threshold；相同初始接觸角無法代表相同材料結構。", "按 supplier/lot 分層做 dose、表面化學、material loss、roughness、wetting 與可靠度，確認差異是否來自污染或基材本體。", "建立材料族群或 supplier-specific window，變更材料需重新 qualification；不要以平均結果覆蓋失敗 lot。", "交班需保存完整 package stack、supplier、lot、前段濕洗與儲存歷史。")
  ]
};

export const l3ShiftExercises = {
  "3-1": shift("交班演練：輪廓改善是否足以放行", "夜班把 bias 提高 15% 後 undercut 消失，但遮罩開口增加 8%、stop layer loss 接近上限。白班需要決定維持新條件、回復或安排 split。", "先重建因果鏈：bias 讓底部清膜與方向性增加，也提高遮罩濺鍍和下層能量。把輪廓、遮罩與 stop loss 放在同一多目標窗口，確認數據是 actual 而非 setpoint，並檢查不同 AR 與 edge。", "若任何產品最差點超過遮罩或 stop loss，先回復；安排小幅 bias×chemistry split 找替代。只有所有 CTQ 與餘裕通過，才能受控導入。", "交班包保存前後 recipe、Vdc、三段 CD、遮罩/stop loss、split 預測、復歸版本與核准人。"),
  "3-2": shift("交班演練：產能與 Scallop 衝突", "客戶要求 scallop 降 30%，設備工程提出循環時間減半；試片表面變平滑但深度少 20%，壓力 trace 未到穩態。", "把名義 step time 拆成 valve/RF transient 與有效反應時間，計算縮短後穩態占比；同時確認沉積和底部清膜是否仍跨過門檻。", "不直接把循環數加倍視為等 dose。先建立最小有效 step time，再在總時間、scallop、深度與閥負荷間選窗口。", "記錄每步 trace、scallop 高度/節距、深度、側壁角、閥切換次數、產能估算與復歸條件。"),
  "3-3": shift("交班演練：診斷器排序與現場證據衝突", "A21 把 notching 排第一，但缺陷不鎖定介電界面，反而隨 bias 上升且位於兩個底角。團隊有人仍想按 notching 對策執行。", "診斷器只是先驗排序；位置與 bias 趨勢更支持 microtrenching 的離子反射。列出兩假說各自預測：脈衝中和應改善 charging，降低角度尾/能量應改善反射。", "先做能區分兩者的小 split，避免同時改 pulse 與 bias。結果符合反射才採 microtrench 對策，並驗證中央清底。", "交班需保留診斷器輸入、候選分數、現場反證、實驗前預測、截面圖與副作用。"),
  "3-4": shift("交班演練：高 GPC 是否代表 PEALD 改善", "工程師縮短 purge 後 GPC 加倍、產能提高，但 bottom/top 降到 60%，particles 上升。管理層只看到 nm/min。", "GPC 超過飽和值且覆蓋率下降是寄生 CVD 指紋。檢查壓力尾、排氣訊號、loading 與膜性，不能把失去自限制當製程改進。", "先回到已驗證 purge，若要提產能則改善抽氣或 pulse delivery；重新做兩個半反應飽和與 reliability。", "保存 GPC、step coverage、particles、膜性、cycle time、排氣 trace、回復條件與變更核准。"),
  "3-5": shift("交班演練：固定時間 Clean 未達終點", "週末批次沉積量較高，remote clean 到固定停止時間時 endpoint 尚未回基線。生產擔心延時影響零件壽命。", "同時有清潔不足與過度曝露兩端風險。依 endpoint、recipe mix、source/管路效率、零件材料與 abatement 建立證據，不臨時取消 interlock 或無上限延長。", "批次與腔體先 hold，依核准上限完成或轉維護；確認殘留、零件、排放與 seasoning 基準後才放產品。", "記錄 endpoint 積分、延時、沉積負載、source trace、零件檢查、EH&S 狀態、seasoning 與核准人。"),
  "3-6": shift("交班演練：Zone 補償把 Map 拉平", "中心快 map 經 edge gas 補償後半幅通過，但平均速率下降、edge 膜性改變，且下一個產品 loading 又失敗。", "補償只改最終 map，沒有證明中心快根因。先分氣流、溫度、電場與量測假說，對齊方位、產品密度與 PM 生命週期。", "若補償不跨產品穩健，回復並做高辨識力小實驗；只有平均、uniformity、膜性與可靠度共同通過才可導入。", "交班需附原始點位、兩種均勻度、平均值、膜性、產品 mix、PM 狀態、補償量與復歸點；另列下一產品的驗證條件、責任人、停止線與批次隔離範圍。"),
  "3-7": shift("交班演練：Queue Time 超限與 Re-clean", "產品已超過 clean-to-bond 上限，外觀正常且 tool 已恢復。現場希望重跑清潔後立即 bonding，原規範未涵蓋第二次 dose。", "超時可能是回復、再污染或氧化；re-clean 可能恢復表面能，也增加 polymer loss 與金屬氧化。接觸角只能提供部分證據。", "沒有核准再處理矩陣時先 hold；由材料、封裝、品質評估 witness 與可靠度。後續 qualification 加入 0/1/2 次 clean、等待與儲存條件。", "MES 保存兩次 dose、實際 queue、ambient/N₂、材料 lot、oxide、接觸角、bond strength、可靠度、決策與核准人。")
};

function guide(title, scope, evidence, experiment, release) { return { title, scope, evidence, experiment, release }; }
function caseStudy(id, title, context, mechanism, diagnosis, action, checkpoint) { return { id, title, context, mechanism, diagnosis, action, checkpoint }; }
function shift(title, situation, walkthrough, decision, record) { return { title, situation, walkthrough, decision, record }; }
