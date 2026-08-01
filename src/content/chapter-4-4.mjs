const pulseAleReviewAppendix = [
  ["波形校正", "先以終端或核准診斷確認 source 與 bias 的實際 on/off、rise/fall、phase 和反射功率；名義 duty 相同但 match 遲滯不同時，不可把兩支 recipe 視為相同的離子或自由基劑量。", "若 delivered waveform 與設定不同，先修量測/硬體或縮小操作窗，不用產品結果回推一個虛構的脈衝狀態。"],
  ["鞘層回復", "在 charging-sensitive 結構上比較每週期電位或其可用 proxy，並將 off-time 掃描與總移除量配對。重點是殘餘電位是否逐週期下降，而非只看平均 bias 變小。", "若 off-time 增加卻無中和證據，檢查深孔傳輸、局部 RC、電負性物種存活與採樣頻率。"],
  ["自由基暫態", "將 source 的 on-phase 分成點火、建立、準穩態與衰減，對照 OES、質譜或核准物種代理與 wall state。這可區分化學選擇改變和單純平均功率下降。", "若 proxy 隨季節化或前批大幅移動，脈衝結論只能限於該腔體生命週期。"],
  ["ALE 改質", "以不同改質 dose 的 EPC、表面組成與 incubation 建立飽和曲線，並在不同 AR 和材料上重複。平面飽和但孔底未飽和時，問題是傳輸而非自限制已成立。", "若 dose 增加仍改變 roughness 或下層化學，應查副反應、冷凝或未清除的氣相反應物。"],
  ["Purge 完整性", "利用壓力/質譜暫態、cycle-to-cycle EPC 與交叉半步實驗判斷 purge 是否真正分開反應。應特別記錄短步下閥門、pump 與管路 dead volume 的相對貢獻。", "若縮短 purge 使 throughput 提高但 alpha/beta 或殘留惡化，不能把相同總時間當作等效循環。"],
  ["Energy window", "以改質層清除、基材損失、stop-layer 變化與 IEDF proxy 聯合尋找 window，並把高能尾端列為風險。window 應依材料和壓力/波形條件描述，而不以單一跨工具電壓記錄。", "若移除結果對小幅能量變化過度敏感，量產選點應遠離尖峰並保留退回連續收尾的條件。"],
  ["HAR profile", "在固定 CD/AR 的深度序列量 top、mid、bottom CD、側壁角、底角與 residue，再用正交 density 結構分開 ARDE 和 microloading。profile 只量終點會遺失變形從何時開始。", "若低溫或波形只改善中心 coupon，仍需檢查邊緣、最密圖形與最薄 mask。"],
  ["Cryo 熱路徑", "將 chuck 設定、He 背壓/洩漏、clamp、wafer backside、RF heat、pause 與 edge zone 同步保存；以長時間 recipe 的截面和 map 確認 feature temperature 的間接證據。", "若 profile 在長 run 轉移，優先驗證熱穩態與凝結/脫附，而不是只調氣體比例。"],
  ["Cu 與 UBM", "把 Cu oxide 去除、再氧化速率、UBM 粗化、接觸電阻和微粒分開量。脈衝或 ALE 清潔若降低初始氧化訊號，仍要在受控等待後檢查是否留下活性表面或鹵素殘留。", "若結果只在新鮮 coupon 良好，應以儲存、轉移與實際 pad 幾何建立使用時間邊界。"],
  ["PI 與 mold compound", "對 PI/PBO、mold compound 和 filler 以處理前後的化學、形貌、吸濕、脫層或接合代理判讀，而不是把去膠速率當清潔品質。不同配方與交聯狀態可改變 radical uptake 和 outgassing。", "若有機殘留下降但表面脆化、filler 露出或後段接合分離，該條件必須列為材料失效而非最佳化結果。"],
  ["Low-k 保護", "將碳耗損、親水化、厚度/折射率、漏電或既有可靠度 proxy 與清除成效同表比較。遠端、低能或短 dose 只是降低風險的候選方向，不是已證實的 repair。", "若低 k 的電性與表面化學給出相反訊號，保留兩者並增加獨立樣本，不可只採用較有利的一項。"],
  ["啟動與熄火", "記錄每次 pulse sequence 的 first-cycle、最後 cycle 與中間穩態，因為點火、功率 ramp、氣體切換和壁面釋放可使前幾個 cycle 的改質或離子劑量不同於名義平均。", "若首片或首段結果分離，應建立 precondition 或工程隔離，而非只用整段平均 trace 證明穩定。"],
  ["清腔與 season", "比較 clean 前後、seasoning 片序與不同前批 recipe 下的 EPC、synergy、particle 和表面 proxy。ALE 或脈衝對 wall coverage 的敏感性可能讓同一波形在新清腔和穩態腔體表現不同。", "若參數只在特定 wall state 成功，放行範圍必須包含該狀態與超窗後的 fallback。"],
  ["量測可靠度", "對低 EPC、薄 oxide 或微小 roughness 先量 repeatability、座標偏移和 sample preparation effect，並將量測誤差放入 alpha、beta 與 material loss 的判讀。", "若效果接近方法誤差，先升級量測或增加重複，不用更多 cycle 把不確定差異放大。"],
  ["產品橋接", "由 monitor、coupon 到產品的橋接要保留產品特有的 stack、open area、AR、pad geometry、前後 queue 與下游製程；每一層只在前一層 CTQ 與失敗模式已釐清後擴大。", "若產品結果與 monitor 相反，將 monitor 視為不具代表性，重新定義 test vehicle 而不是調整產品去符合它。"],
  ["資料封存", "交班包應包含 raw waveform、cycle log、腔體狀態、樣品座標、截面與表面分析原圖、量測方法版次及失敗樣品處置。這些資料使後續人員能重算 synergy、追查氧化或殘留，並判斷差異來自製程而非後處理。", "若資料只剩摘要數字或代表性影像，任何低損傷或自限制結論都必須降級為待確認。"],
  ["班次交接", "交班時標明目前正在驗證的唯一假說、下一片的預期結果與禁止同時變更的條件。", "不明確的交接會讓連續實驗失去因果。"],
  ["轉入決策", "將每項結果連到 hold、工程延伸、產品 bridge 或回退的明確判準，並保存最差結構、腔體狀態、資料版本與例外。單次成功只能支持下一個受控實驗，不能自動擴展到不同材料或腔體。", "若任何 CTQ 只靠放寬抽樣、改量測定義或排除不利座標才合格，應回到根因與量測 MSA。"]
].map(([topic, observation, decision]) => `<p><strong>${topic}</strong>：${observation} <em>決策界線：</em>${decision}</p>`).join("");

export const chapterFourFour = {
  id: "4-4",
  route: "/level/4/4-4-advanced-techniques/",
  title: "4.4 先進脈衝、ALE 與 HAR 技術",
  hours: 3.5,
  prerequisites: ["2.4 鞘層物理進階", "3.1 蝕刻輪廓工程", "4.3 電漿誘發損傷"],
  objectives: [
    "區分 source、bias 與同步脈衝，從 off-phase 的鞘層、電荷與反應物狀態解釋其限制。",
    "用 ALE 四步、雙自限制、energy window 與 alpha/beta synergy 判定循環是否仍具原子層特徵。",
    "將高深寬比（HAR）、cryo、tailored waveform 與封裝低損傷清潔連到可驗證的 profile、材料與可靠度證據。",
    "為 RDL/UBM/Cu、PI、mold compound 與 low-k 表面建立不以絕對 recipe 為前提的損傷邊界。"
  ],
  summary: "先進電漿技術不是把連續 recipe 切成方波。Source pulsing、bias pulsing 與同步脈衝分別改變自由基生成、離子能量與兩者時間關係；off-phase 可讓鞘層回復、正電荷中和並改變負離子與反應物的可達性，但是否有效取決於時間尺度與實際波形。ALE 以改質、purge、低損傷移除、purge 的四步循環追求吸附飽和與能量選擇兩個自限制，須用 alpha、beta 與 EPC 分離寄生連續蝕刻。HAR 與 cryo 則把傳輸、充電、熱管理、鈍化和遮罩預算聯立處理。這些方法亦可用於封裝清潔，但 Cu 氧化、RDL/UBM 界面、PI/mold compound 與 low-k 對能量和化學的容忍度不同，必須以材料及可靠度驗證取代通用參數。",
  sections: [
    section("three-pulse-modes", "三種脈衝：切換的是哪一個能量與化學來源", `<p><strong>Source pulsing</strong>週期性調變產生自由基與電子的主電源，主要改變解離、激發、電子溫度及活性物種的時間史；它不是直接指定 wafer ion energy。短 on-phase 可能抑制多階解離，讓特定自由基比值改變，但也可能讓密度尚未建立即關閉。<strong>Bias pulsing</strong>以較直接方式調變鞘層加速與 IEDF，適合將底部清除劑量與高能尾端分開觀察；source 仍持續時，off-phase 不代表沒有自由基或離子。<strong>Synchronized pulsing</strong>同時調整 source 與 bias，並可設定相位，使改質、離子移除與電荷鬆弛依序發生，但同步後的平均功率、點火暫態和 match response 必須實測。</p><table><thead><tr><th>模式</th><th>首要受控量</th><th>可檢驗預測</th><th>常見誤判</th></tr></thead><tbody><tr><td>Source</td><td>解離、Te、自由基庫</td><td>物種 proxy 與化學選擇改變</td><td>把功率波形當 IEDF</td></tr><tr><td>Bias</td><td>鞘層能量、離子劑量</td><td>底部清除與損傷門檻分離</td><td>把 bias-off 視為無電漿</td></tr><tr><td>同步</td><td>相位、劑量順序、暫態</td><td>同量移除下 profile/charging 改善</td><td>只比 peak setpoint</td></tr></tbody></table><p>比較三者時要固定產品堆疊、總移除量與量測座標，並保存 delivered power、Vdc、pressure、RF phase、MFC 與 endpoint trace。若低 duty 使速率下降，不能把較少損傷直接歸功於脈衝機制；需用增加時間後仍相同的總移除量或能量劑量做交叉驗證。封裝 RDL/UBM 的局部金屬與 dielectric 區也不能由 blanket wafer 外推，因為邊緣場、氧化膜與有機殘留會改變反應路徑。</p>`),
    section("off-phase-negative-ions", "Off-phase、負離子與電荷中和的時間尺度", `<p>連續電漿中，鞘層對電子與負離子形成勢壘，正離子則被加速到 wafer。進入 off-phase 後，電子能量與密度下降、鞘層可能部分或大幅回復，先前正充電的絕緣表面有機會由電子中和；在電負性條件下，負離子也可能參與。這不是保證：off-time 若短於鞘層衰減、局部 RC、深孔傳輸或負離子存活尺度，孔底仍可能留有殘餘電位；太長則可能熄火、改變自由基庫、降低產能並在重啟時引入過衝。</p><p>證據須同時包含 duty/frequency、實際 source/bias 波形、Vdc 或 VI proxy、profile、antenna/電性結構、最深 AR 的 bottom residue 與方位 map。有效中和應在相同 CTQ 下顯示 charging-sensitive 結構的差異縮小，並可在時間解析訊號或受控 simulation 看到 on-phase 累積、off-phase 回落，而非只因 etch time 縮短。若 only-edge 缺陷改善，還要排除 ESC 溫度、He、環狀供氣及量測對位。</p><p>對封裝表面，低損傷脈衝清潔可用來降低 RDL Cu、UBM 或 fine-pitch pad 上的充電和高能濺鍍風險，但不能假定負離子會選擇性去除氧化物。Cu 氧化、鹵素殘留、PI 表面鏈段改變與 mold compound filler 露出需以材料分析、接合與可靠度確認。若 off-phase 使清潔不完全，正確對策可能是調整前處理/改質與 purge，而不是提高高能 bias 直到清除為止。</p>`),
    section("ale-four-steps", "ALE 四步與雙自限制：循環不是名稱而是證據", `<p>理想 ALE 將一個循環拆成改質、purge、移除、purge。改質步讓反應物只在可反應表面形成有限厚度的改質層；第一個 purge 清除未反應氣體，避免氣相反應延續。移除步以低能離子、熱反應或其他選擇性機制只帶走改質層；第二個 purge 排出副產物並讓下一次循環回到可定義初始狀態。四步名稱不足以證明 ALE，必須逐步掃 dose、purge 和移除能量，觀察 EPC、組成、殘留與 surface roughness 是否進入平台。</p><p>雙自限制分別是改質的表面飽和，以及移除能量只足以處理改質層。若改質 dose 增加仍使 EPC 持續上升，可能有未飽和表面、傳輸限制或 CVD-like 寄生沉積；若移除 step 單獨也持續蝕刻原始材料，則能量或化學已超出選擇性條件。Purge 不足會讓兩半步重疊，表面可能仍有看似線性的 EPC，卻失去 cycle-by-cycle control。每個 substrate、pattern AR、腔體狀態與前處理都可能需要重新確認飽和。</p><p><strong>Directional ALE</strong>以離子驅動移除，使底部反應比側壁明顯；<strong>Isotropic ALE</strong>則以熱或配位交換移除，方向性要求較低。例如 HF 改質後搭配金屬有機物的熱移除路線，可用於 GAA channel release 等需要環繞式去除的情境。兩者的反應物、purge、溫度與下層相容性不同，不能只因都有循環就共用同一個 energy window。</p><p>封裝的原子層清潔同理：可把 Cu oxide、薄有機殘留或界面吸附物視為需限量改質與移除的層，但 PI、mold compound、low-k 和 UBM 並非惰性 stop layer。應量 oxide/contaminant 降低、Cu 表面化學、粗糙度、pad/介電層損失、離子殘留與接合後可靠度。不能用「每循環很薄」推定總損傷很低，因為多循環、等待時間與表面再氧化都會累積影響。</p>`),
    section("energy-window-synergy", "Energy window 與 alpha/beta synergy 的量化判讀", `<p>ALE 的 energy window 是移除改質層的門檻與直接濺鍍/破壞未改質材料的門檻之間的區域。它應以材料、表面狀態、離子種類與 IEDF 描述，而不是指定一個可跨機搬移的電壓。平均 Vdc 即使相同，頻率、壓力、鞘層碰撞、波形和 match 都會改變高能尾端；對薄 stop layer、Cu 表面或低 k，少量尾端離子就可能主導損傷。</p><p>用 <code>alpha</code> 表示只執行改質半循環時的寄生移除，用 <code>beta</code> 表示只執行移除半循環時的基材損失，完整循環的 EPC 為 <code>EPC</code>，可用 <code>S=(EPC-alpha-beta)/EPC</code> 表示協同貢獻比例。S 接近一不等於自動合格：alpha、beta 的量測誤差、低 EPC 的訊噪比、不同時間基準與 cycle transient 都要列出。更可信的判讀是完整循環的移除明顯大於兩個單獨半步，同時飽和、粗糙度、殘留和下層損失維持可接受。</p><p>實驗順序至少包含改質 dose、purge、移除能量/時間與 cycle count 的分開 sweep，保留中心點重複。若降低能量讓 beta 下降卻使改質層殘留，不能宣稱選擇性提高；若 EPC 隨 cycle count 不線性，查 incubation、chamber memory 或 surface composition。對 RDL/UBM/Cu 要加入氧化再生與接觸電阻；對 PI/mold compound/low-k 要加入化學鍵、吸濕或 mechanical/adhesion 的後段量測。</p>`),
    section("har-cryo-waveforms", "HAR、Cryo 與客製化波形的聯立窗口", `<p>HAR 蝕刻的瓶頸同時包括自由基到達孔底、離子角度、charging、副產物排出、側壁鈍化、mask 壽命及 wafer 溫度。提高離子能量可能改善深部清除，卻也增加 mask faceting、microtrenching、下層損傷與 charging；增加鈍化可能保護側壁，卻導致 taper 或 bottom stop。工程矩陣應固定 AR 後改 density、固定 density 後改 AR，再以深度序列區分傳輸、loading 與充電。</p><p>Cryo 以受控低溫提高側壁鈍化或反應物停留的穩定性，讓底部的離子驅動移除與側壁反應產生差異。Chuck setpoint 不等於 feature temperature：He 背吹、接觸、熱負載、pause、edge zone 和腔體水氣都會改變實際熱路徑。驗證需有中心到邊緣截面、長 recipe 漂移、He/ESC trace 及 thaw 後缺陷；沒有這些資料，不能把平滑側壁單獨歸因於低溫。</p><p>Tailored waveform 的價值在於改變 IEDF、離子到達時序或瞬時鞘層，而非保證單一能量峰。用 pulse width、frequency、phase 或非正弦波形探索時，應同時看 profile、bottom residue、mask/stop budget、charging、throughput 和設備 actual。前瞻方向還包含 area-selective deposition、原子層表面平坦化與以模型輔助的 recipe 篩選；它們都必須先證明對特定材料堆疊的因果，而不是由新名稱推定更低損傷。</p>`),
    section("advanced-packaging-path", "封裝低損傷脈衝與原子層清潔路線", `<p>封裝清潔的問題常在於同一面上同時有 RDL Cu、UBM、solder residue、PI/PBO、mold compound、filler、passivation 與可能暴露的 low-k。氧化物去除、去膠、活化與乾燥不是同一個 CTQ；例如較強的氧化性條件可能移除有機物卻加速 Cu oxide 或改變 PI 表面，過高 ion energy 可能去除薄膜卻讓 UBM 粗化、mold compound filler 露出或 fine feature 再沉積。</p><p>推薦的工程路徑是先用來料/失效分析定義污染類型與材料堆疊，再用低損傷脈衝或原子層式改質/移除的最小劑量矩陣確認去除機制。對每一組條件同時測表面化學、氧化狀態、roughness、粒子、接觸電阻或接合前指標；最後以接合、濕熱、熱循環、離子遷移或其他既有產品 qualification 確認。模型若把封裝表面當作平坦 SiO2，只能幫助比較趨勢，不能預測真實 pad edge、polymer outgassing、filler 或多材料電荷路徑。</p><p>停線與交班必須明確：遇到 Cu 色澤/氧化異常、接合強度分離、表面分析顯示鹵素或有機殘留、PI/mold compound 形貌改變或 low-k 電性偏移時，先隔離產品與保留處理前樣品。後續實驗一次只變更一個機制相關因子，並保留連續模式為 fallback。這使低損傷主張可被後續資料驗證或推翻，而不會在可靠度失效後失去可追溯性。</p>`),
    section("pulse-ale-engineering-review", "脈衝與 ALE 的工程審查：從波形到產品接受", `<p>先進模式的審查必須先拆開「設定值」、「腔體實際狀態」與「表面結果」。對 source pulsing，記錄每個 on/off 內的 delivered power、反射功率、壓力、流量、OES 或其他物種 proxy，確認點火、衰減與壁面記憶是否使名義 duty 偏離有效解離 dose。對 bias pulsing，記錄 Vdc、VI、頻率、相位、波形失真與壓力，並把 IEDF 的平均、寬度與高能尾端視為待驗證假說。對同步模式，要標出 source 先行、bias 先行或同相的物理目的，例如先改質再移除、先允許中和再加速，不能只因兩個電源同時設成 pulse 就稱為協同。</p><p>實驗應設計成逐層縮小不確定度。第一層以平面或代表性 coupon 建立速率、EPC、oxide/organic removal 與初始 particle 基線；第二層以多 AR、多密度結構判斷自由基傳輸、離子角度與 loading；第三層加入最薄 stop、最小 mask、最敏感 dielectric、antenna 結構或低 k，量 profile、殘留、sidewall chemistry、mask/stop loss、charging 和電性；第四層才移到最差封裝 stack。每層須有連續 recipe 或已知良好條件作對照，並以同片座標和相同量測流程減少 wafer-to-wafer 差異。若在第二層已看到 bottom residue 或 mask failure，不能直接跳到產品並以更長時間掩蓋機制缺口。</p><p>ALE 審查須產生一份 cycle budget：改質 dose 是否飽和、第一 purge 是否移除氣相殘留、移除步是否只移掉改質層、第二 purge 是否避免產物或反應物跨循環累積。將完整 cycle、改質-only、移除-only、不同 cycle count 與不同等待時間放入同一分析表，報告 EPC、alpha、beta、synergy、roughness、殘留、基材損失與 incubation。若完整 cycle 的結果隨腔體歷史改變，需區分是 wall memory、前驅物 delivery、溫度或量測 drift；若 alpha 或 beta 接近 EPC，應誠實標示為 quasi-ALE 或連續成分顯著，而非以名稱掩蓋限制。</p><p>封裝導入前另建立 surface-state matrix。矩陣至少區分 RDL Cu 的新鮮/氧化狀態、UBM 金屬與阻障層、不同 PI 或 PBO 配方、mold compound 的樹脂/filler 組成、殘膠類型及可暴露 low-k。每一格先做處理前後的化學與形貌比較，再連結實際接合或電性。Cu 的結果需區分氧化物去除與再氧化速率；PI/mold compound 需看鏈結、揮發、filler 露出與吸濕；low-k 需看碳耗損、親水化、k 值或漏電代理。沒有這些材料分層時，單一接觸角或短期 pull test 無法判斷低損傷是否只發生在容易的表面。</p><p>最後以預先定義的接受矩陣決定下一步，而不是由一條漂亮曲線決定。矩陣可分為清潔/殘留、材料損傷、幾何、電性、接合可靠度、顆粒與產能；每個 CTQ 都指定量測方法、抽樣位置、基準條件、何時 hold 及何時可回退。結果若顯示清潔改善但 Cu oxide 回升、UBM 粗化、PI 變脆、mold compound 剝落或 low-k 偏移，必須保留為失敗模式並回到最小 dose，而非平均後宣稱通過。此閉環也適用於 HAR/cryo 和客製化波形：技術價值在可重複且可追溯的窗口，不在於單次達到最高深度或最低殘留。</p>`)
  ].concat([
    section("pulse-ale-review-matrix", "脈衝、ALE 與封裝清潔的審查矩陣", `<p>此矩陣將脈衝波形、ALE 半步、HAR/cryo 與封裝多材料表面放入同一條可追溯決策鏈。每一列都是不同的工程問題與反證，目的在防止用單一平均結果或固定 recipe 取代材料、幾何和腔體狀態的證據。</p>${pulseAleReviewAppendix}`)
  ]),
  callouts: [
    { type: "warning", title: "脈衝不是自動低損傷", body: "只有在相同產品結果與總移除量下，off-phase 的電荷回落、IEDF 改變或表面反應差異才可支持低損傷主張。" },
    { type: "insight", title: "ALE 的兩個自限制", body: "改質飽和與選擇性移除必須分別量測；EPC 線性或四步名稱本身不等於原子層行為。" }
  ],
  labs: [
    { id: "a30", title: "A30 ALE 循環與協同度", module: "/assets/js/labs/a30-ale-cycle.js", observation: ["分別掃改質時間、purge 時間與離子能量，記錄 EPC、alpha、beta、synergy 與跨循環波動。", "找出 ALE 自限制窗，確認低能量的 EPC 近零，以及超過濺鍍閾值後 beta 增加、synergy 下降。", "以 Cu/UBM 或聚合物清潔案例解讀趨勢，列出模型未包含的氧化、殘留、粗化與可靠度量測。"] },
    { id: "a31", title: "A31 脈衝電漿時序", module: "/assets/js/labs/a31-pulse-timing.js", observation: ["切換 source、bias 與同步模式，比較 duty、off-time、電子溫度、電子密度與底部電荷軌跡。", "比較脈衝與同方程 continuous 電荷，改變頻率與相位以判斷 off-time 是否足以中和。", "以 HAR 或封裝多材料案例解讀波形，列出模型未捕捉的氧化、聚合物化學、邊緣場與實際 IEDF。"] }
  ],
  selfCheck: [
    ["三種脈衝模式各自主要調控什麼？", "Source pulsing 主要改變解離、Te 與自由基時間史；bias pulsing 主要改變鞘層能量與離子劑量；同步脈衝控制兩者的相位與先後。實際效果仍需用 delivered waveform 與產品結果驗證。"],
    ["off-phase 為何可能降低 charging，又為何不保證有效？", "鞘層回復時電子或負離子較可能中和正充電；但 off-time 若不足、深孔傳輸受限或局部 RC 太慢，殘餘電位仍會累積，過長又可能熄火或改變化學。"],
    ["ALE 四步與雙自限制是什麼？", "四步為改質、purge、移除、purge；改質需表面飽和，移除能量或機制需只處理改質層。兩者均須由 dose、purge、能量與 EPC/材料結果證明。"],
    ["alpha、beta 與 synergy 如何避免把寄生蝕刻當 ALE？", "alpha 和 beta 分別量單獨改質與單獨移除的寄生貢獻；完整 EPC 必須顯著大於兩者，並以 S=(EPC-alpha-beta)/EPC 與誤差、殘留、下層損失一起判讀。"],
    ["HAR 與 cryo 的主要聯立風險為何？", "需同時管理傳輸、角度、charging、副產物、鈍化、mask 與熱路徑；cryo 的 chuck 設定不等於 feature 溫度，必須以 He/ESC、長時間與中心邊緣證據確認。"],
    ["為何封裝原子層清潔不能直接搬用晶圓 ALE recipe？", "RDL/UBM/Cu、PI、mold compound、filler 與 low-k 的反應、氧化、粗化與可靠度敏感度不同；模型和 recipe 只能提出假說，必須用表面分析、接合與老化確認。"],
    ["如何區分低損傷脈衝改善與單純少蝕刻造成的改善？", "在相同總移除量、材料、幾何與量測座標下比較，並同時看電荷/IEDF proxy、profile、殘留、材料損傷與電性或接合可靠度。"],
    ["何時不能把 ALE 或脈衝結果直接轉入產品？", "飽和、purge、energy window、最差 AR/材料、chamber lifecycle、封裝表面化學或可靠度尚未確認時，僅能維持工程狀態並使用受控 fallback。"]
  ],
  readings: ["Lieberman and Lichtenberg, Principles of Plasma Discharges and Materials Processing, pulsed plasma and plasma-surface interaction chapters.", "既有產品與設備核准的 ALE、HAR、waveform、封裝清潔、材料相容和可靠度 qualification 程序。"]
};

function section(id, title, body) {
  return { id, title, body };
}
