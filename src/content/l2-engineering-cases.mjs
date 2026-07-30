export const l2EngineeringCases = {
  "2-1": [
    {
      id: "2-1-pumpdown",
      title: "抽氣曲線變慢：先分辨氣體負載、漏氣與導通限制",
      context: "同一座 ICP 腔體在 PM 後 base pressure 達標時間由 18 分鐘拉長到 42 分鐘，但最終壓力仍能到規格。直接提高 turbo 轉速看似合理，卻可能掩蓋門閥、O-ring、腔壁含水或排氣管路的真正問題。工程判讀應先保留完整壓力對時間曲線，而不是只看最後一個數字。",
      mechanism: "抽氣初期通常由腔體自由體積與有效抽速決定，壓力近似指數下降；進入較低壓後，腔壁脫附、水氣釋放與微小虛漏會使曲線尾端變平。若管路導通率 C 小於幫浦額定抽速 Sp，腔體看到的有效抽速 Seff 滿足 1/Seff=1/Sp+1/C。此時更換更大的幫浦不會按比例縮短時間，因為瓶頸留在節流閥、彎管或狹窄 foreline。真正漏氣則帶來近似固定吞吐量 Qleak，使壓力停在 Qleak/Seff 附近。",
      diagnosis: "先將曲線分成粗抽、過渡與高真空三段，計算各段 ln(P) 的斜率。所有壓力區都同步變慢，優先檢查閥位與有效抽速；只有尾端拉長，優先做 rate-of-rise、殘氣分析或延長烘烤。隔離腔體後若壓升近線性，表示有固定氣體負載；若壓升先快後慢，常見於表面脫附。量測時要確認 Pirani 與電容式壓力計的交接區，避免把感測器氣體相依誤當成真實壓力變化。",
      action: "建立 PM 前後相同起始溫度、相同閥序的標準 pumpdown trace，並記錄 1000、100、10、1 mTorr 的到達時間。先驗證閥門 fully open、foreline 壓力與 turbo speed，再做 isolation test。若確認為含水，採用乾燥 N2 purge 與受控 bake；若為導通限制，檢查沉積堵塞與閥體開度校正。只有在 Seff 已由量測證實不足時，才討論幫浦升級。",
      checkpoint: "可否用同一條曲線說明哪一段受體積控制、哪一段受脫附控制，並提出一個不拆機即可區分漏氣與含水的方法？"
    },
    {
      id: "2-1-pressure-flow",
      title: "流量增加但壓力不變：控制迴路其實改了什麼",
      context: "製程工程師把 Ar 從 100 sccm 加到 200 sccm，chamber pressure 仍固定 20 mTorr，卻觀察到 residence time、plasma color 與 etch rate 都改變。若把壓力不變解讀成氣體狀態不變，就會忽略 APC 節流閥為維持設定值而自動增加有效抽速。",
      mechanism: "穩態質量平衡可寫成吞吐量 Qin=P×Seff。當控制器固定 P 而 Qin 加倍，閥門必須打開使 Seff 近似加倍。中性粒子密度主要由 P/T 決定，因此在溫度相近時不會因流量加倍而加倍；但平均滯留時間約與 PV/Q 成正比，會縮短一半。反應物更新加快、產物排出變快、壁面循環改變，均可能改寫自由基組成。APC 閥的動態與位置上限也會決定設定值是否仍可維持。",
      diagnosis: "比較 recipe history 中的 MFC actual、壓力、throttle position 與 foreline pressure。若壓力平穩但閥位大幅上升，代表控制器用抽速補償流量；若閥位已到上限而壓力開始升高，表示系統進入抽速飽和。再以已知腔體體積估算 residence time，並確認腔體溫度是否因高流量冷卻而改變。OES 強度不能直接當濃度，因電子密度與激發率也可能同步變化。",
      action: "DOE 應把壓力與流量視為兩個獨立因子，並把 throttle position、估算抽速與 residence time 列為中介變數。比較化學效應時保持壓力與 source power 固定；比較碰撞效應時則需保持流量或換氣率可比。recipe 移轉時不要只複製 P 與 Q，還要確認不同機台的腔體體積與 pumping curve。",
      checkpoint: "在壓力固定下把流量加倍，請指出中性密度、有效抽速與滯留時間各自應如何變化，以及哪一項由 APC 實際執行。"
    },
    {
      id: "2-1-gauge-correction",
      title: "壓力計讀值漂移：氣體校正與安裝位置造成的假象",
      context: "同一個 30 mTorr recipe 由 Ar 換成 He 後，電容式壓力計與 Pirani 的讀值差異突然擴大；設備團隊懷疑 chamber leak。若未先確認感測原理，可能在健康腔體上做無效 leak check，甚至用錯誤讀值重新調整製程。",
      mechanism: "電容式壓力計量測膜片受力，理論上近似氣體無關；熱傳式 Pirani 則以氣體導熱能力推算壓力，對 He、Ar、N2 的響應不同。離子規也具有氣體游離截面校正因子。即使使用氣體無關感測器，量測口的導通率、局部溫度、沉積覆蓋與電漿 RF 干擾仍可能造成偏差。壓力梯度在高流量、窄通道或量測口遠離 wafer 時尤其明顯。",
      diagnosis: "先查 pressure gauge 型號、校正氣體與可用範圍，確認零點與滿刻度狀態。比較 plasma off、固定流量且 APC 關閉時的兩支 gauge，排除 RF pickup。若只有 plasma on 才偏移，檢查接地與感測器熱負載；若隨氣種規律改變，依供應商 correction factor 修正。使用 portable reference gauge 時要安裝在接近原量測口的位置，否則比較的是兩個位置的真實壓差。",
      action: "建立 gauge hierarchy：製程控制使用氣體無關的電容式壓力計，粗抽與設備保護可使用 Pirani，base pressure 使用適當離子規。recipe 文件要標示控制 gauge、量測位置及氣體校正。對容易沉積的製程設定 purge 與定期 zero check；校正紀錄應連結到異常批次，以判斷是感測漂移還是腔體狀態改變。",
      checkpoint: "為何 He 與 Ar 在相同真實壓力下可能讓 Pirani 顯示不同數值，而電容式壓力計原理上不應如此？"
    },
    {
      id: "2-1-conductance",
      title: "升級幫浦卻沒有增益：分子流導通率才是瓶頸",
      context: "一條 remote clean 排氣線將 1000 L/s turbo 換成 1600 L/s，腔體抽速只提升約 8%。採購規格沒有錯，錯在把幫浦銘牌抽速當成 wafer plane 的有效抽速。這種情況在長管路、直角彎頭、screen 與半開閥門中很常見。",
      mechanism: "串聯系統以倒數相加，Seff=(1/Sp+1/C)⁻¹。若管路導通率只有 120 L/s，Sp 從 1000 提高到 1600 L/s，Seff 只從約 107 增至 112 L/s。分子流中圓管導通率對直徑約呈三次方、對長度成反比，因此小幅增加管徑可能比大幅增加幫浦更有效。過渡流與黏滯流則需用不同模型，不能在整段 pumpdown 中套用單一分子流公式。",
      diagnosis: "用已知流量與穩態壓力估算 wafer plane 的 Seff，再與幫浦端讀值比較。逐段盤點 isolation valve、throttle valve、elbow、trap 與 foreline，找出最小導通段。可在不同閥位下量測 P-Q curve，觀察有效抽速是否隨開度飽和。若腔體與幫浦端壓差隨吞吐量線性增加，常是導通限制而非幫浦能力不足。",
      action: "先改善最小截面、縮短管路、減少急彎或清除沉積，再重新計算幫浦尺寸。若製程需要控制較高壓力，仍要保留 throttle valve 的可控範圍，不能一味追求最大導通。工程變更後重新標定 APC valve position 對 Seff 的曲線，並確認排氣處理系統與 foreline 壓力仍在安全範圍。",
      checkpoint: "當 C 遠小於 Sp 時，為何提高 Sp 的報酬快速下降？請指出一項比換大幫浦更有效的硬體修改。"
    },
    {
      id: "2-1-recipe-scale",
      title: "300 mm recipe 移轉：體積、面積與抽速不能只按比例放大",
      context: "一套 300 mm chamber 的 20 mTorr、200 sccm recipe 要移到較大容積的設備。團隊只維持相同壓力與流量，結果反應產物累積、seasoning 時間與 wafer uniformity 全部不同。幾何放大不只改變體積，也同時改變壁面面積、氣體路徑與功率密度。",
      mechanism: "相同 P 與 Q 不保證相同 residence time，因 τ 約與 PV/Q 成正比；體積增加會延長換氣。壁面面積對體積比改變，會影響自由基 recombination、表面吸附與 memory effect。若 source power 未按有效電漿體積或晶圓面積調整，電子密度與解離率也不等效。showerhead 孔洞與 pumping slot 的分布還會決定局部流場，單一 lumped model 只能提供第一輪縮放方向。",
      diagnosis: "整理兩機台的有效體積、wafer 面積、powered area、gas inlet、pumping perimeter 與最大有效抽速。先比較 P、Q、PV/Q、power/area 及 wall area/volume 五個無因次或尺度指標，再用 wafer map 和 exhaust byproduct 驗證。若中心到邊緣趨勢改變，需優先檢查流場與功率耦合，而不是只補一個 global time。",
      action: "建立 staged transfer：先使 residence time 與壓力可比，再調整 source power 取得相近密度指標，最後以 bias 與 gas ratio 收斂 profile。每一步只允許少數旋鈕，並記錄 APC position、match position、OES ratio 與 wafer map。對壁面主導化學，需定義相同的 seasoning endpoint，而非相同 seasoning wafer 數。",
      checkpoint: "列出至少三個在壓力與流量相同時仍不會自動等效的尺度，並說明哪一個直接控制平均換氣時間。"
    },
    {
      id: "2-1-residence-endpoint",
      title: "滯留時間與終點延遲：排氣端看到的是過去的腔體狀態",
      context: "蝕刻終點由 exhaust FTIR 或 downstream OES 判定時，訊號總比 wafer 上的實際 breakthrough 晚數百毫秒到數秒。若把這個延遲全部當成感測器反應慢，控制器會在流量、壓力改變後產生系統性 over-etch。",
      mechanism: "產物從 wafer 生成後，要經過腔體混合、輸送管路與偵測 cell，形成 residence、transport 與 instrument response 三種延遲。流量增加且壓力固定會縮短腔體 residence time，但管路死體積與採樣泵仍可能主導。反應性產物還會在壁面吸附或復合，使訊號既延遲又失真。終點模型因此不能只用固定秒數補償，應把 recipe 條件納入。",
      diagnosis: "以快速切換已知 tracer gas 量測整條訊號鏈的 step response，分離腔體與分析儀延遲。比較不同流量、APC 位置與採樣管長時的 t10、t50、t90。若上升與下降時間不對稱，表示有吸附或反應，不只是純輸送。把 wafer-side electrical endpoint 或 interferometry 與 exhaust signal 對時，可建立實際 breakthrough 的基準。",
      action: "控制策略應使用條件化 delay compensation：依 P、Q、V 與採樣設定選擇補償值，並保留最大 over-etch 上限。縮短或加熱採樣管可降低吸附，卻必須確認材料相容與安全。recipe 改變流量或氣體後要重新驗證 endpoint timing，不能沿用舊設備的固定延遲。",
      checkpoint: "請把終點延遲拆成三個來源，並說明為何改變 chamber flow 只會直接改善其中一部分。"
    }
  ],
  "2-2": [
    {
      id: "2-2-oxide-window",
      title: "氧化層高深寬比蝕刻：F 供應與聚合鈍化的雙重平衡",
      context: "SiO2 contact etch 在 open area 速率充足，但 dense pattern 底部逐漸停止，側壁仍有厚聚合物。單純增加 CF4 流量可能提高 F 供應，也可能改變 F/C 比與氣相聚合，不能用『更多蝕刻氣體等於更高速』的單向推理。",
      mechanism: "氟碳電漿同時供應 F radical 與 CFx 前驅物。F 參與 SiO2 轉為揮發性 SiFx，CFx 則形成側壁鈍化與選擇比來源；離子必須在溝底移除聚合層並啟動反應。高深寬比結構中，radical transport、離子角度散射與 charging 共同降低底部有效通量。O2 添加可消耗碳、提高有效 F/C，但過量會讓側壁保護不足而 bowing。",
      diagnosis: "分開查看 blanket rate、pattern bottom CD、sidewall angle、mask loss 與 polymer residue。若 blanket 正常而 pattern stop，優先判斷傳輸與鈍化，不要先怪 source density。比較低 bias pulse、較低壓力及小幅 O2 split，觀察底部清除與 mask selectivity 是否呈相反趨勢。OES 的 F 或 CF2 ratio 可當相對指標，但需固定光路與功率後才有可比性。",
      action: "採用小步 DOE 同時掃 O2 與 bias，將 bottom open、側壁角、mask loss 畫成 process window，而非只最大化 etch rate。需要提高方向性時先降低壓力、縮窄 IAD，再以適量聚合補回側壁；需要解除 etch stop 時確認底部離子能量與 polymer removal。每個改善都要檢查 charging damage 與 microtrenching。",
      checkpoint: "若 blanket rate 正常但深孔底部停止，為何增加 source power 不一定有效？請指出化學供應、離子與幾何傳輸三條可能路徑。"
    },
    {
      id: "2-2-polysilicon",
      title: "多晶矽閘極蝕刻：鹵素選擇與側壁保護需一起設計",
      context: "poly-Si gate recipe 從 Cl2/HBr/O2 改成較高 Cl2 比例後，速率提升但 CD bias 與 notching 惡化。問題不只是化學速率，而是 HBr 形成的重物種、側壁鈍化及氧添加共同控制 profile 與氧化層 stop。",
      mechanism: "Cl radical 對 Si 有高反應性並形成揮發性 SiClx，通常提高速率；HBr 可帶來較低揮發性的 SiBrx、較強側壁保護與較重離子，改善 anisotropy。少量 O2 促進含 Si/O/Br 的鈍化層，但過量會降低底部反應或造成殘留。接近 thin gate oxide 時，charging 與離子能量成為 selectivity、notching 和 damage 的主要限制。",
      diagnosis: "把 main etch 與 over-etch 分段分析。main etch 看 CD、側壁角與 loading；over-etch 看 oxide loss、notching 與 across-wafer charging signature。若增加 Cl2 後速率上升且側壁變斜，表示鈍化不足；若底部殘留且 O2 敏感，可能鈍化過強。檢查 endpoint 後的 over-etch time 是否因新速率仍沿用舊比例。",
      action: "main etch 用 Cl2/HBr 比例建立速率與 profile 平衡，O2 只做小幅鈍化調整；over-etch 降低 bias、提高 selectivity，必要時用 pulsed plasma 緩解 charging。recipe qualification 需同時包含 isolated/dense gate、不同 open area 與 antenna structure，避免 blanket wafer 的漂亮結果掩蓋 pattern-dependent defect。",
      checkpoint: "說明 Cl2、HBr 與少量 O2 在 poly-Si gate etch 中各自主要扮演什麼角色，以及為何 over-etch 應使用不同能量策略。"
    },
    {
      id: "2-2-metal-route",
      title: "Al 可乾蝕刻、Cu 採大馬士革：揮發性產物決定整合路線",
      context: "材料選擇流程若只看鍵結能，容易誤以為任何金屬都能找到更強的鹵素電漿直接刻除。Al 與 Cu 的量產路線正好說明：能不能生成並帶走揮發性產物，通常比能不能在表面反應更關鍵。",
      mechanism: "Al 與 Cl 系可生成在適當溫度下可移除的 AlClx，因此能以 Cl2/BCl3 類電漿蝕刻；BCl3 也有助於處理原生氧化層與調整側壁。反應後若接觸水氣，殘留氯可能造成腐蝕。Cu 的 CuClx/CuFx 揮發性不足，容易再沉積與污染，因此主流改用先刻介電層溝槽、沉積 barrier/seed、電鍍 Cu，再 CMP 的 damascene 流程。",
      diagnosis: "遇到金屬殘留時，先查目標溫度下產物蒸氣壓、表面氧化物與腔體壁再沉積，而不是只提高 bias。Al etch 的 post-corrosion 需結合 queue time、ambient humidity 與 ash/rinse；Cu 圖形若有人提出一般 RIE，應要求揮發性產物與污染控制證據。對 Ti、Ta、W 等 barrier，也要逐一查其鹵化物與氧化物行為，不能由 Al 類推。",
      action: "材料選擇表應列出反應路徑、主要揮發產物、所需 wafer 溫度、可能殘留與 downstream clean。Al flow 要控制 post-etch dechlorination 與濕氣暴露；Cu flow 則把 plasma 應用放在介電層圖形、preclean 與表面活化，不把 Cu bulk removal 當成一般乾蝕刻。",
      checkpoint: "為何『表面可與氯反應』不足以證明某金屬適合量產 RIE？請以 Al 與 Cu 的後續產物去向比較。"
    },
    {
      id: "2-2-spacer",
      title: "SiN spacer 選擇比：CHxFy 化學、底層氧化物與 CD 損失",
      context: "spacer etch 需要移除水平 SiN，同時保留垂直側壁並停在薄 SiO2 或 Si。recipe 若只追求 SiN blanket rate，常在 over-etch 出現 foot、oxide punch-through 或 gate CD loss。",
      mechanism: "CH3F、CH2F2 等較低 F/C 的氣體容易形成聚合層，提供 oxide selectivity 與側壁保護；加入 O2 會削弱聚合並提高可用 F，Ar 則透過離子動量協助底部清除。SiN、SiO2 與 Si 表面的氧、氮與碳平衡不同，因此相同入射通量得到不同淨速率。over-etch 階段剩餘區域小，局部 charging 與 pattern loading 會放大。",
      diagnosis: "以 TEM/SEM 將 top loss、sidewall retention、footing、oxide loss 分開量化，並比較 dense/isolated pattern。若加 O2 後 foot 改善但 oxide loss 上升，顯示原先底部聚合過厚；若降 bias 後 punch-through 改善但殘留增加，表示需要化學或壓力補償。監看 chamber seasoning，因含碳壁面會改變有效 radical balance。",
      action: "main etch 先取得方向性與足夠底部清除，over-etch 改用較低離子能量與較高選擇比。用短時間 split 建立清除率與 oxide loss 對時間曲線，選擇穩健窗口，不要把 endpoint 後固定百分比直接沿用到所有 pattern density。PM 後需用標準 seasoning 將碳庫存恢復到可重現狀態。",
      checkpoint: "在 spacer etch 中，為何加 O2 可能同時減少 foot 又惡化 oxide loss？這兩個結果由哪一個共同中介量連接？"
    },
    {
      id: "2-2-ash-clean",
      title: "光阻灰化不是只看 O2：離子能量、含鹵殘留與低 k 損傷",
      context: "金屬或介電層蝕刻後的 photoresist strip 使用 O2 plasma，表面看似乾淨，後續卻出現低 k 漏電與接觸電阻漂移。灰化的目標是移除有機物，但前段製程留下的 F、Cl、金屬鹵化物與交聯光阻會改變所需化學。",
      mechanism: "O radical 把有機碳轉為 CO/CO2/H2O；直接 plasma 同時帶有離子與 UV，可加速去除，也可能破壞 porous low-k、改變表面終端或造成 charging。remote plasma 主要輸送中性自由基，可降低離子損傷，但對厚、交聯或無機殘留的清除能力有限。加入 H2、N2 或含氟步驟可處理特定殘留，卻引入材料相容與安全風險。",
      diagnosis: "不要只用膜厚 loss 判定 clean。結合 ellipsometry、contact angle、XPS/FTIR、sheet resistance 與 electrical test 分辨有機殘留和 substrate damage。若 direct plasma 提高 bias 後 strip rate 上升但 k-value 或 leakage 惡化，代表離子/UV 損傷主導。若 remote clean 表面仍有金屬鹵化物，需要前段 dehalogenation 或濕式補充，而不是無限延長 O2 劑量。",
      action: "依材料建立 damage budget：先以 remote O radical 完成大部分有機去除，再用最短必要 direct step 處理頑固殘留。對 low-k 控制 wafer temperature、ion exposure 與 queue time；對 Al/Cl 殘留安排去氯與乾燥。驗收同時包含 cleanliness 與功能性指標，避免『更親水』被誤當成永遠更乾淨。",
      checkpoint: "為何 remote O2 plasma 對低 k 較溫和，卻不一定能解決所有 post-etch residue？請從到達表面的物種回答。"
    },
    {
      id: "2-2-safety-change",
      title: "氣體替換的 MOC：製程相似不代表風險相似",
      context: "團隊想把既有 NF3 clean 部分改成 F2 或把 C2F6 改為較低 GWP 的替代氣體。若只比較 etch rate 與成本，會漏掉毒性、可燃性、腐蝕性、鋼瓶供應、gas cabinet、detector 與 abatement 的整條變更。",
      mechanism: "氣體進入機台前後經過供氣、混氣、電漿解離、腔體反應、排氣與處理設備。危害可能來自原料，也可能來自副產物與清洗廢氣。相同化學元素不代表相同反應性；不同濃度與載氣也會改變 detector setpoint、洩漏擴散與 purge 需求。SDS 提供危害與處置基線，但不能取代機台特定風險評估與在地法規。",
      diagnosis: "MOC 前逐項核對供應商最新版 SDS、允許材質、閥件壓力、MFC 校正、gas box interlock、洩漏偵測、exhaust capacity 與 abatement destruction efficiency。製程端要盤點未反應氣體與副產物；EHS 端確認 exposure limit、emergency response 與人員訓練。任何欄位無證據都應標為待驗證，而不是用類似氣體推定。",
      action: "建立 pre-startup safety review，要求製程、設備、廠務、EHS 與供應商共同簽核。先用最小 inventory、封閉測試與受控 qualification，確認 purge sequence、alarm matrix 和 fail-safe。網站氣體百科的風險標籤只作教學導引，現場決策必須回到指定供應商 SDS、機台手冊與公司程序。",
      checkpoint: "列出氣體替換時至少五個非 recipe 參數的檢查面向，並說明為何網站上的一般危害摘要不能直接當作作業許可。"
    }
  ],
  "2-3": [
    {
      id: "2-3-eedf-tail",
      title: "平均電子溫度相同，反應率仍可差一個數量級",
      context: "兩套 plasma source 的 Langmuir probe 都回報 Te 約 3 eV，卻只有其中一套能有效游離 Ar 並解離 CF4。若把 Te 當成所有電子都具有 3 eV，就無法解釋高閾值反應為何差異巨大。",
      mechanism: "電子溫度通常是 EEDF 形狀的參數或平均能量指標，真正反應率係數是 k=<sigma v>，必須將能量相依截面與整個 EEDF 積分。Ar ionization 閾值約 15.8 eV，主要依賴高能尾端；Maxwellian 與 Druyvesteyn 即使平均能量相近，高能尾端人口也可顯著不同。RF 波形、壓力、非局域加熱與電子損失共同塑造 EEDF。",
      diagnosis: "比較 probe 擬合方法與有效能量範圍，避免只看單一 Te。使用 actinometry、OES line ratio 或反應產物量測做相對交叉驗證，但要承認各方法假設。若低閾值 excitation 近似、而高閾值 ionization 差很多，通常指向 EEDF tail，不一定是總電子密度。改變頻率或壓力時，觀察不同閾值譜線是否呈非等比例變化。",
      action: "模型與 DOE 應至少區分 density、mean energy 與 tail-sensitive reaction。不要用單一 Te 對所有速率做 Arrhenius 類推；對關鍵反應使用截面資料與 EEDF 積分。量產監控若只能取得 OES，選擇一組高低閾值線比，並在已知穩定條件下建立 empirical window。",
      checkpoint: "請用積分概念解釋為何 Te 都是 3 eV 時，Maxwellian 與 Druyvesteyn 對 15.8 eV 閾值反應可有巨大差異。"
    },
    {
      id: "2-3-network",
      title: "從單一反應轉向反應網路：生成、損失與壁面閉合",
      context: "CF4/O2 電漿分析只列出 e+CF4→CF3+F，便預測 O2 越多 F 越高。實際上 F、CFx、O、COFx 與表面聚合物互相耦合，超過某個 O2 比例後 etch rate 可能飽和甚至下降。",
      mechanism: "每個物種的穩態密度由所有生成項與損失項平衡。O 可消耗碳、釋放更多 F，也會改變電子能量、形成 CO/CO2/COFx，並影響壁面聚合層。F 會在 wafer 反應、在壁面復合或被下游帶走；CFx 既可被進一步解離，也可沉積。反應網路若沒有壁面邊界條件，就無法閉合，因為低壓腔體的 surface-to-volume ratio 使壁面損失常與氣相反應同等重要。",
      diagnosis: "先畫出目標物種的 source-sink 圖，不需一開始就收集全部速率常數。用 O2 split 觀察 F emission、CO signal、polymer thickness 與 etch rate 的共同趨勢。若清洗後第一片與 seasoned chamber 差異大，表示壁面狀態是網路的一部分。不同 pressure 下趨勢轉折，可能來自 residence time 與三體反應改變，不宜只用進氣比例解釋。",
      action: "建立最小可用網路：電子解離、電子游離、主要中性反應、wafer consumption、wall loss 與 pumping。先用靈敏度分析找控制步驟，再投入量測精度。recipe window 不只記錄 gas ratio，還要記錄 seasoning、temperature 與 residence time，讓反應網路的邊界條件可重現。",
      checkpoint: "如果只知道 F 的電子生成率，還缺哪三類損失資訊才可能預測穩態 F 密度？"
    },
    {
      id: "2-3-wall",
      title: "壁面復合與腔體記憶：同一 recipe 為何在 PM 後改變",
      context: "PM 後第一批的 O radical 指標偏低，數片 seasoning wafer 後恢復。氣體流量、壓力與功率都符合設定，差異來自腔壁材質、溫度與覆蓋層改變了自由基損失機率。",
      mechanism: "自由基碰到壁面後可能反射、吸附、復合或與沉積層反應。有效壁面損失率與 thermal velocity、surface-to-volume ratio 及 recombination probability 有關。裸 Al2O3、氟化壁面與碳聚合層對 O、F、H 的係數不同；壁溫也改變吸附停留時間。seasoning 不是神祕的等待，而是在建立可重現的表面化學邊界。",
      diagnosis: "記錄 PM 材料、清洗方式、bake、seasoning recipe 與 wafer count，將 OES ratio 或 process monitor wafer 依序畫出。若指標單調收斂且與 wafer count 關聯，支持壁面覆蓋模型；若隨 idle time 退回，可能有吸水、氧化或揮發性殘留。比較不同 chamber volume/area 後，若小腔體效應更強，也符合壁面主導。",
      action: "定義 seasoning endpoint 而非固定片數，例如 OES ratio、match position 與 monitor rate 同時進入控制帶。PM 文件要規定允許材料、表面 roughness、乾燥與組裝暴露時間。跨機台 matching 時把 wall age 納入，否則單靠 recipe setpoint 無法消除 chamber-to-chamber 差異。",
      checkpoint: "為何 PM 後用固定 10 片 seasoning 不一定可靠？請提出一個能反映壁面已穩定的 endpoint 組合。"
    },
    {
      id: "2-3-oxygen",
      title: "O2 添加的非單調效應：解聚、電子附著與材料氧化",
      context: "在 fluorocarbon plasma 中逐步增加 O2，etch rate 先上升後下降，selectivity 與 profile 也各自轉折。把 O2 只標成『去碳、增加 F』會漏掉 electronegativity、表面氧化與過度去除側壁聚合等反向機制。",
      mechanism: "少量 O2 生成 O radical，消耗碳並降低 CFx 聚合，常提高可用 F 與底部清除。更多 O2 會改變 EEDF、電子附著與負離子比例，也可能稀釋主反應氣體。對 Si、金屬或有機材料，表面氧化會改變反應障壁與揮發產物；側壁鈍化不足則導致 undercut。結果取決於 substrate、bias、pressure 與 wall condition，沒有跨材料通用的最佳百分比。",
      diagnosis: "用細步 O2 split 同時量 etch rate、selectivity、profile、polymer thickness 與 OES/FTIR 指標，尋找非單調轉折。若 source current 或 match position 明顯改變，代表 O2 不只改表面化學，也改 plasma impedance。對包材或金屬表面，增加 O2 前要檢查氧化敏感性，不能沿用 SiO2 etch 的直覺。",
      action: "以 process window 表示 O2，而非單向最佳化。先固定 source/bias 找出化學轉折，再以能量調整底部清除。對封裝清潔等表面活化，O2 劑量需與接觸角、XPS、bond strength 及 queue-time aging 一起驗證，避免剛處理時很好、等待後反而劣化。",
      checkpoint: "列出 O2 增加時至少三條可能互相競爭的因果鏈，並說明為何 etch rate 可能出現峰值。"
    },
    {
      id: "2-3-electronegative",
      title: "負電性電漿：probe 讀值與正離子通量不能直接套用電正性模型",
      context: "SF6、O2 或 Cl2 製程中，工程師以 electron density 下降判定 plasma 變弱，但 wafer ion current 未按比例下降。負離子儲存大部分負電荷後，準中性條件與 sheath edge 組成都和 Ar 電漿不同。",
      mechanism: "電正性電漿近似 ne≈ni；負電性電漿則 ni≈ne+nnegative。電子附著把低能電子轉為負離子，改變 EEDF 與 conductivity。負離子通常被 sheath 電位阻擋在 bulk，正離子仍向 wafer 加速。傳統 Langmuir probe 的電子飽和與 Te 擬合可能受負離子、RF 與非 Maxwellian 分佈影響，因此單一 ne 不能代表總帶電粒子密度。",
      diagnosis: "比較 ion saturation current、microwave/interferometry、photodetachment 或 mass spectrometry 等互補訊號。若 O2/SF6 增加時 ne 降低而 positive ion current 保持，可能是 electronegativity 上升。檢查 plasma potential 與 self-bias，因 conductivity 改變會重新分配電壓。任何 probe 結論都要標示補償方法與模型假設。",
      action: "製程模型要明確包含負離子或至少使用 electronegativity 指標。控制策略可把 source power、gas ratio 與 ion current 分開監控，避免用 OES 單一亮度代替密度。跨 recipe 比較時先判斷是否仍在同一放電 regime，若由電正性跨到高負電性，原本的線性 scaling 可能失效。",
      checkpoint: "當 ne 下降但 ni 未同步下降時，準中性如何仍成立？這會使哪一類 probe 解讀最容易出錯？"
    },
    {
      id: "2-3-global-model",
      title: "零維模型的正確用途：找方向、做守恆，不假裝預測每個位置",
      context: "A16 類虛擬機台用 0-D 模型連結旋鈕與輸出。這類模型可快速教學與做 sensitivity，但若把它當成 wafer edge profile 或絕對產率預測器，就超出模型邊界。",
      mechanism: "0-D global model 假設腔體內物種以體積平均表示，用 particle balance 與 power balance 求穩態。它能保留 source、loss、residence、wall area 等主要因果，計算成本低；代價是無法解析 sheath、局部 gas depletion、skin effect、showerhead jet 與 edge pumping。參數化係數若來自特定機台，移轉後也不再是普適常數。",
      diagnosis: "先問模型輸出是否真的由守恆式約束，還是只做視覺映射。以極端條件測試單調性、界限與量綱：flow→0、bias→0、power 增加、pressure 增加時結果是否合理。再用少量實驗點校正尺度，保留未校正區域的警告。若 uniformity 或局部 profile 是決策目標，必須升級到 1-D/2-D、feature scale 或實測。",
      action: "把 0-D 用於 DOE 排序、控制方向、challenge training 與異常假設產生；將絕對 acceptance criteria 留給量測。模型文件要列出輸入範圍、假設、校正資料與不適用情境。每次改公式都加入物理不變量測試，例如 source power 對 ne 的趨勢、zero bias 的 etch stop 與氣體總和正規化。",
      checkpoint: "舉出兩個 0-D 模型適合回答的問題，以及兩個必須靠空間模型或 wafer map 才能回答的問題。"
    }
  ],
  "2-4": [
    {
      id: "2-4-frequency",
      title: "相同平均離子能量，不同頻率仍會得到不同 IEDF",
      context: "兩個 bias recipe 的 mean ion energy 都約 150 eV，一個使用 400 kHz，另一個使用 60 MHz；前者造成較寬的 profile variation 與局部損傷。只用平均值描述離子轟擊，會遺失雙峰、低能尾巴與高能端點等真正決定表面反應的資訊。",
      mechanism: "離子穿越 RF sheath 的時間與 RF 週期比值控制它能否感受到瞬時電壓。低頻下，離子保留進入 sheath 的相位資訊，IEDF 容易形成寬雙峰；高頻下，離子跨越多個週期並看到時間平均場，分佈較窄。峰間距近似隨頻率升高而縮小，也受離子質量與 sheath transit time 影響。相同 mean energy 因此可能對 sputter threshold、damage threshold 與反應活化產生不同結果。",
      diagnosis: "除了 dc self-bias，量測或模擬 IEDF 寬度、峰間距與高能百分位。比較不同材料的 threshold response：若高能尾端降低後 damage 大幅改善而平均速率相近，表示分佈寬度才是關鍵。確認量測位置與 analyzer transmission，避免儀器本身把窄峰展寬。對多離子氣體，質量組成改變也會疊加多組峰。",
      action: "把 bias waveform 當作可設計變數。需要高方向性但低 damage 時，可提高頻率或使用脈衝控制高能尾端；需要啟動特定表面反應時，則確認最低有效能量與占比。recipe 文件至少保存 mean、spread、high-energy fraction 與 ion species，而不是只保存一個 bias voltage。",
      checkpoint: "為何兩個平均能量相同的 IEDF 仍可能造成不同 damage？低頻與高頻時，離子穿越時間相對 RF 週期有何差異？"
    },
    {
      id: "2-4-collisional",
      title: "高壓鞘層中的電荷交換：低能尾巴與角度散射一起出現",
      context: "pressure 從 5 提高到 100 mTorr 後，離子平均能量下降，profile 同時變得較圓。把這兩個結果分別歸因於 bias 不足與側壁化學，可能錯過 sheath 內電荷交換碰撞的共同來源。",
      mechanism: "當 sheath 厚度與 ion-neutral mean free path 可比，快速離子可與中性粒子發生 charge exchange，產生慢離子與快速中性粒子。新生慢離子從碰撞位置重新被電場加速，形成 IEDF 低能尾巴；彈性散射與碰撞後起始位置分布也擴大入射角。壓力提高同時縮短 mean free path，故能量與角度分佈都不能再用 collisionless sheath 假設。",
      diagnosis: "估算 sheath thickness/mean-free-path 比值，並以壓力 split 觀察低能比例與 angular FWHM 是否同步增加。若 source density 變化也改變 sheath thickness，要把 density 效應分開。質譜能量分析可看 IEDF，feature profile 則提供 IAD 的間接證據；兩者趨勢一致時，碰撞 sheath 假設較可信。",
      action: "需要方向性時優先降低 pressure、縮短 sheath 或提高 density 使 sheath 變薄，而非只增加 bias。若化學需求迫使高壓操作，可用較短 gap、較高 source density 或 pulse window 減少散射影響。所有調整都要檢查 charging、microtrenching 與 selectivity，因更高能量可能交換另一類缺陷。",
      checkpoint: "charge exchange 為何會同時製造低能離子與快速中性粒子？哪一個無因次比值可先判斷 sheath 是否容易碰撞？"
    },
    {
      id: "2-4-pulsed-bias",
      title: "脈衝偏壓：用 duty、頻率與同步相位管理能量劑量",
      context: "連續 bias 能維持速率，卻在高深寬比介電結構造成 charging 與 mask loss。改成 30% duty pulse 後缺陷改善，但若只用平均功率比較，可能忽略 on-time 峰值電壓與 off-time 電荷消散。",
      mechanism: "pulse-on 時 sheath 建立並加速離子，瞬時能量可高於同平均功率的連續模式；pulse-off 時電子或低能物種有機會中和表面電荷，metastable 與 radical 也依各自生命期衰減。頻率決定每次 sheath 是否完全建立，duty 決定時間平均劑量，同步 source/bias 相位則控制離子通量與能量是否重疊。平均功率相同並不保證 peak IEDF、ion dose 或 surface charging 相同。",
      diagnosis: "記錄 pulse waveform、actual voltage/current、rise/fall time 與 phase，不只記 generator setpoint。比較 charging monitor、IEDF、etch-per-cycle 與 temperature。若 duty 降低但 peak voltage 上升，damage 不一定按比例降低；若 off-time 延長後 notch 改善，支持電荷鬆弛機制。需要確認 matching network 是否能追隨脈衝，避免反射功率造成假趨勢。",
      action: "先定義目標是降低峰值能量、降低總劑量或提供中和時間，再選 pulse 參數。用固定 peak voltage 掃 duty 可分離劑量；用固定 duty 掃 frequency 可找 sheath 建立與 charge relaxation 尺度。qualification 要涵蓋最差 antenna ratio 與 wafer temperature，因脈衝也改變熱負載。",
      checkpoint: "同為 100 W 平均 bias，連續與 25% duty pulse 為何不能視為等效？至少指出峰值、時間結構與電荷鬆弛三項差異。"
    },
    {
      id: "2-4-charging",
      title: "介電圖形充電：局部電場把垂直離子偏轉成 notching",
      context: "oxide trench 在導體 stop layer 附近出現 notch，且 isolated pattern 比 dense pattern 嚴重。global bias、pressure 與 etch time 都正常，缺陷來自電子與離子進入高深寬比結構的角度與速度差，造成局部電荷累積。",
      mechanism: "電子熱速度高、角度分布寬，離子由 sheath 準直加速；圖形幾何會遮蔽兩者並在側壁或底部建立不均勻電位。局部橫向電場偏轉正離子，接近導電 stop layer 時可能集中蝕刻形成 notch。負電性 plasma、脈衝波形、mask charging 與 feature aspect ratio 都會改變電荷平衡。這是 feature-scale 現象，wafer-level 平均 self-bias 可能完全看不出來。",
      diagnosis: "使用不同 antenna ratio、pitch 與 aspect ratio 的結構確認 pattern dependence；比較 conductor 與 dielectric stop。若降低 bias 或增加 off-time 後 notch 改善，支持 charging。觀察缺陷方向是否與局部 pattern 對稱而非 wafer radial trend。必要時用 charging test structure、feature-scale simulation 或 pulsed probe 補足 global sensor。",
      action: "可降低 ion energy、使用 pulsed plasma 提供 neutralization、調整 electron temperature 或導入適量導電/passivation 路徑。不要用增加 over-etch 補殘留，因會放大 notch。製程窗口要同時包含 clearing 與 charging limit，並把最差 pattern 納入 release wafer。",
      checkpoint: "為何 wafer-level bias 正常仍可能產生 feature-level notch？請說明電子與離子角度差如何建立局部橫向電場。"
    },
    {
      id: "2-4-angular",
      title: "離子角度分布與 HAR profile：小尾巴也能主導側壁碰撞",
      context: "平均入射角接近垂直，HAR hole 仍出現 bowing 與 sidewall attack。原因是平均值遮蔽了角度分布尾端；對狹窄開口，少量大角度離子就可能優先撞上側壁。",
      mechanism: "IAD 由 sheath 電場準直、氣相與 sheath 碰撞、surface charging 及入口散射共同決定。feature acceptance cone 隨 aspect ratio 增加而變窄，因此相同 FWHM 在淺溝槽可接受，在深孔卻造成強烈 transport loss。mask faceting 還會改變入口幾何，把離子或中性物種重新導向側壁。profile 是 IAD、IEDF、radical sticking 與 passivation 的聯合結果。",
      diagnosis: "不要只量平均角；比較 FWHM、95th percentile 與非高斯尾端。以不同 aspect ratio test structure 畫出 bottom rate 與 bowing 的 scaling。pressure 降低後若側壁改善，支持角度散射；若只改 polymer chemistry 才改善，則 passivation 主導。截面 SEM 要統一量測位置與傾角，避免樣品製備造成假輪廓。",
      action: "先用低 pressure、高 density 縮窄 sheath 與 IAD，再調整 mask/profile chemistry。避免無限制提高 bias，因 mask faceting 與 secondary electron 會反過來擴大角度問題。模型應把 feature acceptance 與 IAD 卷積，而不是以單一垂直 ray 預測。",
      checkpoint: "為何平均角 0° 不能保證 HAR 結構沒有側壁攻擊？請用 acceptance cone 與分布尾端解釋。"
    },
    {
      id: "2-4-damage-budget",
      title: "能量劑量與損傷預算：速率最佳點不一定是整合最佳點",
      context: "提高 bias 使 etch rate 增加 20%，卻讓低 k leakage、Si recess 與 mask loss 超出規格。單位時間速率提升可能被更高 defect cost 抵銷，必須把能量、通量與時間整合成 dose。",
      mechanism: "表面接受的 ion energy dose 近似 ion flux×energy×time，但不同 damage mechanism 還有 threshold、非線性與材料累積。高能尾端可觸發鍵結破壞，總通量影響缺陷數，wafer temperature 改變修復與擴散。source power 主要改 flux、bias 主要改 energy 的 decoupling 只在一定機台與 regime 近似成立，兩者仍透過 impedance 與 sheath 耦合。",
      diagnosis: "同時記錄 rate、ion current proxy、bias waveform、wafer temperature 與 damage monitor。用固定 removal amount 比較 recipe，而不是固定 time，才能分辨高能短時間與低能長時間。若 damage 對 energy 出現明顯 threshold，優先限制 peak；若對總時間累積，需降低 dose 或改善選擇比。",
      action: "建立多目標窗口：throughput、profile、selectivity、electrical damage 與 consumable life。source 提供足夠 flux，再以最低可用 bias 啟動反應；需要額外方向性時先檢查 pressure/IAD。將 damage budget 分配到 main etch、over-etch、ash 與 clean，避免每一步各自達標但總整合超限。",
      checkpoint: "比較固定時間與固定移除量兩種 DOE，哪一種更適合判斷能量損傷？為什麼 peak energy 與 total dose 都要記錄？"
    }
  ],
  "2-5": [
    {
      id: "2-5-source-choice",
      title: "CCP、ICP 與 remote source：選擇的是耦合方式，不是高低等級",
      context: "設備選型常把 ICP 簡化成『高密度、高階』，CCP 簡化成『低密度、便宜』。實際選擇要回到所需 ion flux、energy control、radical transport、腔體幾何與材料損傷，沒有單一 source 對所有製程最佳。",
      mechanism: "CCP 透過電容場加熱電子，powered electrode 同時形成 sheath，密度與 bias 較容易耦合；多頻 CCP 可部分分離。ICP 由線圈感應場驅動 bulk electron heating，通常可用 source power 控 density、另用 chuck bias 控 energy，但 E/H mode 與 skin effect 仍造成耦合。remote source 在上游產生 radical，經 transport 到 wafer，可大幅減少 ion/UV exposure，代價是 wall loss、物種選擇與 transport time。",
      diagnosis: "先列製程需要的主要到達物種：高 ion flux、高 ion energy、窄 IAD、長壽命 radical 或低 damage。再評估 pressure window、wafer area、均勻度與 chamber wall interaction。若問題是 direct plasma damage，remote 可能合適；若需要深孔方向性，remote radical 單獨不夠。比較 source 時使用 wafer-plane 指標，不以 generator nameplate power 判斷。",
      action: "建立需求矩陣後選 source，並保留可控制範圍與量產維護性。CCP recipe 需留意 electrode area 與 self-bias；ICP 需驗證 E/H transition、coil window coating 與 matching；remote clean 需驗證 radical survival、管路材質與 endpoint。選型結果應能明確說出哪一項需求由哪個耦合機制滿足。",
      checkpoint: "各舉一個 CCP、ICP 與 remote source 最適合的需求，並指出 remote source 為何不能取代需要方向性離子轟擊的製程。"
    },
    {
      id: "2-5-match",
      title: "反射功率升高：先判斷負載變了，還是匹配器失去追蹤",
      context: "recipe 中段 reflected power 從 0.5% 突升到 8%，重新 auto-match 後恢復。直接把事件歸為 matcher 故障不完整；plasma impedance 可能因 pressure、gas composition、mode transition 或 chamber coating 改變。",
      mechanism: "RF generator 通常以 50 ohm 為目標，matching network 用可變電容與電感把複數 plasma load 轉換到近似匹配。反射係數由負載與特性阻抗差決定。當 electron density、sheath capacitance 或 loss resistance 改變，最佳 tune/load 位置也改變。match position 因此既是控制量，也可當 chamber/plasma fingerprint，但不能單獨證明哪個物理量變化。",
      diagnosis: "保留 forward/reflected power、V/I phase、tune/load position、pressure、MFC actual 與 OES 的同步 trace。若 matcher 到達機械限位，可能 recipe 超出可匹配範圍；若位置可收斂但反射週期性震盪，檢查控制 gain 與 plasma instability。跨批慢漂移可能來自 chamber coating，瞬間跳變則要查 arc、mode transition 或 gas/pressure step。",
      action: "對每個穩態步驟建立正常 match fingerprint 與容許帶，異常時先確認 plasma process variable，再判 matcher。recipe step 要給足 settle time，避免在負載尚未穩定時開始關鍵製程。設備維護後重新 baseline；不要把固定 capacitor position 當成保證匹配，因 chamber state 改變時會過時。",
      checkpoint: "為何 match capacitor position 可作為健康指紋，卻不能單獨判定 electron density？還需要哪些同步訊號？"
    },
    {
      id: "2-5-mode",
      title: "ICP E/H 模式遲滯：相同功率可能有兩個穩態",
      context: "source power 向上掃到 650 W 時 plasma 突然變亮、density 跳升；向下掃時要到 450 W 才跳回。若控制器假設 power 對 density 單值且連續，就可能在啟動或 recipe step 中落入不同狀態。",
      mechanism: "低密度 E-mode 以電容耦合成分為主，高密度 H-mode 以感應耦合與較高 conductivity 為主。密度上升會改善感應吸收，形成正回授；不同穩態間的能量損失與匹配條件造成遲滯。壓力、氣體、coil geometry、wall loss 與匹配狀態都會移動 transition threshold。相同 550 W 可依歷史位於 E 或 H mode。",
      diagnosis: "以受控 up/down sweep 同步記錄 density proxy、OES、coil current、match position 與 reflected power，畫出 hysteresis loop。不要在 production wafer 上首次探索轉換。若 recipe target 位於重疊區，啟動歷史、idle 狀態與前一步會決定落點。確認亮度跳升不是 camera auto exposure 或單一譜線化學改變。",
      action: "啟動時先 overshoot 到確定 H-mode 的功率，再回到目標，或選擇遠離遲滯區的 operating point。控制系統加入 mode-state 判斷，而非只檢查 setpoint。跨腔 matching 要比較 transition boundary，若差異擴大，檢查 coil window coating、wall condition 與 matching network。",
      checkpoint: "為何 550 W 不一定對應唯一 density？請描述一條保證每次進入 H-mode 的啟動路徑。"
    },
    {
      id: "2-5-remote",
      title: "Remote plasma transport：在上游產生不等於能到達 wafer",
      context: "remote O2 或 NF3 source 的 generator power 正常，下游 clean rate 卻因管路更換後下降。上游 dissociation 只決定生成，真正到達 chamber 的 radical 還受管徑、材質、溫度、表面復合與流量控制。",
      mechanism: "radical 沿 transport tube 移動時會擴散到壁面並復合，存活率與 residence time、surface recombination probability、tube surface-to-volume ratio 有關。較長或較窄管路增加碰壁機會；某些 coating 或水分會消耗 F/O radical。提高 flow 可縮短 transport time，卻也改變 pressure 與 source dissociation fraction。remote source 的低 ion damage 優勢來自 charged species 在上游/管路損失，但也因此無法用 ion current 直接監控有效 radical flux。",
      diagnosis: "比較 source-end 與 chamber-end 的 optical/chemical indicator，做 flow、pressure 與 tube temperature split。若 source 指標穩定但 clean rate 下降，優先查 transport path。更換管材或 PM 後立即改變，常指向 wall condition。確認 exhaust endpoint delay，避免把 transport delay 當成清洗動力學。",
      action: "管路設計盡量短、低 surface-to-volume ratio，選用經供應商與安全規範確認的相容材質。建立 seasoning 與 leak-tight assembly 程序，並以 monitor coupon 或 chamber clean endpoint 校正有效 radical delivery。任何提高溫度或改材質的措施都要同步評估腐蝕、副產物與人員安全。",
      checkpoint: "列出 remote radical 從 source 到 wafer 的三個主要損失途徑，並說明為何 generator forward power 正常不能證明 wafer flux 正常。"
    },
    {
      id: "2-5-pulsed-source",
      title: "脈衝 source 與 afterglow：分離電子反應與長壽物種輸送",
      context: "在 pulsed ICP 的 afterglow 期間，electron density 快速下降，radical 與 metastable 仍可存在；某些表面反應因此在較低 charging 或 UV 下繼續。若只用時間平均功率描述，就看不見 on/off phase 的物種排序。",
      mechanism: "source-off 後，高能電子與電子密度通常先衰減，離子通量隨 ambipolar loss 下降，中性 radical 依化學與壁面生命期較慢衰減。負電性電漿還可能出現負離子釋放與電位重組。pulse frequency 與 duty 決定每周期是否回到相同初態；當 off-time 太短，系統接近小幅調變，太長則每次重新點火並增加不穩定。",
      diagnosis: "需要 time-resolved OES、current 或 probe，而不是只取平均值。掃 duty 時固定 peak power 與固定 average power會回答不同問題。觀察表面 rate、charging monitor 與 radical proxy 對 phase 的關係，確認改善是否真的來自 afterglow。matching 與 generator rise time 會吃掉短 pulse 的有效 on-time，必須量 actual waveform。",
      action: "先依目標物種生命期選頻率，再以 duty 分配電子活化與低損傷處理時間。若需要 bias，同步 phase 可把離子能量放在特定時窗。recipe qualification 保存 peak、average、duty、frequency、rise/fall 與 phase 六項，否則同名 pulse recipe 無法重現。",
      checkpoint: "在 afterglow 中，電子、離子與中性 radical 的典型衰減順序如何？為何固定平均功率的比較仍可能改變 peak chemistry？"
    },
    {
      id: "2-5-transfer",
      title: "Generator watt 不是 wafer watt：跨機台功率轉移要追蹤能量路徑",
      context: "兩台 ICP 都設定 1000 W，wafer rate 與 density proxy 卻差 25%。generator forward power 只是能量鏈起點，線路損失、反射、coil coupling、window coating 與 plasma absorption 決定真正沉積到 plasma 的功率。",
      mechanism: "功率由 generator 經 cable、match、coil/electrode 與介電窗進入 plasma；每段都有 resistive、reactive 或 reflected loss。匹配良好只表示 generator 端接近 50 ohm，不代表相同 absorbed power。coil window 上的沉積改變電磁場與熱損失，plasma mode 又改變耦合效率。bias path 也受 chuck capacitance、wafer backside He 與 sheath impedance 影響。",
      diagnosis: "比對 forward/reflected、VI probe 的 real power、coil current/voltage、match position、density proxy 與 wafer response。若可用 calorimetry 或 power sensor，建立 absorbed fraction。PM 前後若同 generator W 但 coil current 與 density 都漂移，優先查 coupling path。跨機台比較要使用同 pressure/gas/wall state，避免化學差異污染功率標定。",
      action: "recipe transfer 先匹配 plasma state 指標，再回填各機台所需 setpoint，不強求 watt 數字相同。建立 generator-to-wafer energy ledger，至少包含 reflected power、match fingerprint 與可量測的 absorbed proxy。對關鍵製程設定 coupling health limits，超出時先維護硬體，不用 recipe 補償無止境追趕。",
      checkpoint: "反射功率低為何仍不能證明兩台機器有相同 absorbed power？請畫出 generator 到 plasma 的至少四個能量節點。"
    }
  ],
  "2-6": [
    {
      id: "2-6-pressure-chain",
      title: "壓力旋鈕的完整因果鏈：密度、碰撞、滯留與輪廓同時改變",
      context: "A16 中把 pressure 由 10 調到 80 mTorr，看見 etch rate 與 profile 改變。工程上不能把結果縮成『高壓比較慢』，因壓力同時影響中性密度、mean free path、sheath collision、EEDF、residence time 與 APC 閥位。",
      mechanism: "在溫度近似固定時，中性密度與 P 成正比，mean free path 約反比於 P。若 flow 固定，較高 P 往往拉長 residence time 並需要較小有效抽速；碰撞增加可提高某些解離機率，也可能冷卻高能電子。sheath 內碰撞形成低能尾巴與寬 IAD，feature directionality 下降。各鏈條可能互相抵銷，所以 rate 不必單調。",
      diagnosis: "調 pressure 時同步記錄 throttle position、match position、OES ratio、self-bias、ion current proxy 與 wafer profile。先確認控制器是否真的達到穩態，再比較。若 rate 改變而 plasma proxy 穩定，可能是 transport/surface；若 match 與 OES 同時跳變，可能跨 discharge regime。使用 A16 時把每個因果節點逐一點亮，訓練自己說出中介量。",
      action: "故障排除每次只沿一條鏈提出可反證假設。例如『壓力高→IAD 變寬→側壁攻擊』應以 angular/profile 證據驗證；『壓力高→residence 長→radical density 高』則看流量與化學訊號。不要從旋鈕直接跳到 wafer 結果。DOE 報告需保留至少一個 plasma state 與一個 transport state 指標。",
      checkpoint: "把壓力上升到 profile 變圓的因果鏈寫成至少四個節點，並另寫一條可能讓 etch rate 上升的競爭鏈。"
    },
    {
      id: "2-6-source-chain",
      title: "Source power 的主要任務是通量，但 Te 與化學不會永遠不變",
      context: "教學模型讓 source power 200→2000 W 時 ne 約增十倍、Te 變化低於 10%，用來強調 flux/energy 分離。這是合理的一階近似，不是所有機台與範圍的保證；跨越 E/H mode 或 gas depletion 時會失效。",
      mechanism: "增加 absorbed source power 通常提高 ionization 與 electron density，Bohm ion flux 隨 ne 增加。更高 density 使 sheath 變薄，也會改變 impedance 與 radical generation。Te 由 power balance 決定，可能因碰撞損失與 density 自我調節而變化較小；但在 mode transition、低壓非局域加熱或強負電性條件下，EEDF 形狀可大幅改變。高解離率還可能耗盡母氣體。",
      diagnosis: "掃 source power 時同時看 density proxy、Te/EEDF proxy、OES ratio、match position 與 pressure control。若 density 平滑增長且 chemistry ratio穩定，可使用一階 scaling；若出現亮度、match 或 rate 跳變，視為 regime change。不要用 generator watt 代替 absorbed power。對 A16 的結果要讀成可檢驗假設，而非 equipment guarantee。",
      action: "需要提高 throughput 時先用 source 增通量，再以最低必要 bias 控能量。選擇遠離 mode boundary 的量產窗口，並對 gas depletion 或 wall loading 設上限。控制圖把 source setpoint 與 match/density fingerprint 並列，這樣相同功率但耦合失常時才會被發現。",
      checkpoint: "source power 提高而 Te 近似不變的物理理由是什麼？列出兩個會讓這個近似失效的 regime。"
    },
    {
      id: "2-6-bias-chain",
      title: "Bias 增加：速率、方向性、選擇比與損傷的四向交易",
      context: "A16 中 bias 從 0 增到 500 W，etch stop 被解除且速率上升，但 selectivity 下降。這正是量產最常見的多目標衝突：更高能量能清除底部鈍化，也會侵蝕 mask、stop layer 與敏感介電質。",
      mechanism: "bias 改變 sheath voltage 與 IEDF，離子能量跨過 sputter或反應活化 threshold 後，底部反應加速並改善 anisotropy。能量再提高時，mask/underlayer sputter、lattice damage、charging 與 secondary electron 增加；若 pressure 高，更多能量可能在 sheath 碰撞中分散。selectivity 是不同材料能量響應的比值，不是固定氣體常數。",
      diagnosis: "用 bias split 同時量 target rate、mask loss、stop loss、sidewall angle、damage monitor 與 wafer temperature。若 0 bias 仍有 rate，確認是否為純化學反應；若模型顯示 etch stop，代表該案例假設需要 ion-assisted pathway。找出 rate 對 energy 的 knee 與 damage threshold，不用全範圍線性外插。",
      action: "選擇略高於有效反應門檻、低於 damage 急升區的 bias。若方向性不足，先確認 pressure/IAD，不直接加能量；若底部 polymer 過厚，化學調整可能比 bias 更便宜。main 與 over-etch 使用不同 bias，並把總 energy dose 納入整合 budget。",
      checkpoint: "為何提高 bias 常讓 etch rate 與方向性改善，卻讓 selectivity 下降？請以兩種材料不同的能量響應曲線回答。"
    },
    {
      id: "2-6-gas-temp-gap",
      title: "氣體比例、溫度與 gap：三個常被當成補償旋鈕的邊界條件",
      context: "當 profile 漂移時，工程師可能同時改 O2、chuck temperature 與 electrode gap，最後雖把 CD 拉回，卻不知道哪個機制真正補償。這種 recipe 能過一批，遇到 chamber age 或產品切換就失去可預測性。",
      mechanism: "gas ratio 改變 radical 與聚合前驅物供應，也可能改 electronegativity；wafer temperature 改變 adsorption、desorption、polymer sticking 與產物揮發；gap 改變 plasma volume、residence、field distribution 與 wafer coupling。三者都能影響 profile，卻沿不同因果鏈。若用多個旋鈕互相抵銷，hidden state 仍在漂移。",
      diagnosis: "採 sequential DOE：先固定 gap 與溫度掃化學，再固定選定 gas ratio 掃溫度，最後只在需要改善均勻度或 coupling 時評估 gap。每次記錄 plasma state、surface proxy 與 wafer result。若兩個設定產生相同 CD 但 OES、match、polymer thickness 不同，代表它們不是相同 process state。",
      action: "為每個旋鈕指定主要責任：gas ratio 管化學平衡，temperature 管 surface sticking/volatility，gap 管幾何耦合與流場。只允許在已知責任範圍內補償，超出便觸發設備或 chamber state 調查。release criteria 不只看 CD，還要看 selectivity、residue 與 match fingerprint。",
      checkpoint: "同樣把 CD 調回規格，為何改 O2 與改溫度不算等效？請各指出至少兩個不會同步恢復的中介狀態。"
    },
    {
      id: "2-6-packaging-clean",
      title: "封裝清潔劑量：從污染辨識到接合窗口，而不是追求最低接觸角",
      context: "RDL、UBM、Cu pillar 或 mold compound 表面在 underfill、wire bond、die attach 前常需要 plasma clean。量產異常可能表現為 non-wet、delamination 或 bond pull 下降。把條件簡化成『O2 plasma 越久越乾淨』會忽略污染種類、基材氧化、聚合物蝕刻與活化後 aging。",
      mechanism: "有機污染可被 O radical 氧化成揮發產物，Ar ion 可物理移除薄層並增加粗糙度，H2/N2 類 chemistry 可能協助處理特定氧化物或表面終端。處理也會生成低分子量氧化物 LMWOM、暴露 filler、氧化 Cu/Ni 或改變 polymer chain。有效 dose 由物種通量×反應效率×時間決定，source power、pressure、gas、距離與 loading 都會影響，單看秒數無法跨機台比較。",
      diagnosis: "先依污染來源分類：fingerprint/有機殘留、silicone、flux、氧化物、吸附水或 release agent。驗證至少包含 contact angle 的時間序列、XPS/FTIR 或表面元素、AFM/roughness、bond pull/shear、underfill wetting 與 cross-section。最低接觸角若伴隨 Cu oxide 增厚或 polymer embrittlement，不是最佳條件。比較 direct 與 remote 時記錄 ion exposure，不能只比較 forward power。",
      action: "用 dose window 而非單點 recipe：下限要達 cleanliness/adhesion，上限由金屬氧化、材料 loss、roughness 與電性限制。對有機基材優先低 damage radical，對頑固薄層才加入受控 ion assist。每種 package stack、supplier material 與前段化學都需 qualification；現場不可把一套 O2/Ar recipe 無條件套用到所有 Cu、Ni、PI、PBO、EMC 與 solder mask。",
      checkpoint: "為何最低 contact angle 不等於最佳封裝清潔？請列出至少三個必須一起通過的功能性驗證。"
    },
    {
      id: "2-6-packaging-queue",
      title: "活化後等待時間：疏水回復、再污染與金屬氧化決定 queue-time 規格",
      context: "plasma clean 後立即量測接觸角為 12°，放置 8 小時後升到 48°；同時 Cu surface oxide 增加。若製程規格只寫 clean recipe、不寫 clean-to-bond queue time 與儲存環境，實際接合面就不是 qualification 時的表面。",
      mechanism: "聚合物活化後，極性官能基可旋轉或向 bulk 重排，低分子片段遷移，表面自由能隨時間回復；空氣中的有機物與水也會再吸附。金屬在 O2 plasma 與後續 ambient 中持續氧化，可能降低 solder wetting 或增加 contact resistance。溫度、濕度、包裝、氮氣儲存與表面材質共同決定 aging rate，因此 queue time 是製程參數，不是物流備註。",
      diagnosis: "在 0、1、2、4、8、24 小時量測 contact angle、XPS oxide/contamination、bond strength 與 wetting，分別在 cleanroom ambient、dry N2 與密封載具中比較。若 contact angle 回升但 bond strength仍穩定，功能性窗口可能比表面能指標寬；若 Cu oxide 與 resistance先失效，則金屬限制更嚴。記錄實際等待分布，不只平均值。",
      action: "將最大 queue time 寫入 traveler/MES 並設超時處置：重清潔、降級或報廢需由材料驗證決定。clean station 盡量靠近 bonding/underfill，使用經驗證的 dry N2 storage 與低 outgassing carrier。監控採用時間戳與環境資料，不能靠操作員記憶。recipe、queue time、儲存方式與再處理次數必須作為一組受控條件。",
      checkpoint: "設計一個 clean-to-bond queue-time 實驗，至少包含四個時間點、兩種環境與兩個功能性量測；說明何者決定最終上限。"
    }
  ]
};

export const l2ShiftExercises = {
  "2-1": {
    title: "交班演練：壓力漂移但所有設定值都在規格",
    situation: "夜班回報 20 mTorr 步驟的穩態壓力仍是 20.0 mTorr，etch rate 卻連續三批下降；MFC setpoint、source power 與 bias 均未改變。APC valve position 由平常 42% 慢慢移到 27%，foreline pressure 也略升。早班必須在不直接調 recipe 的前提下，判斷應繼續生產、安排 monitor wafer，或停機檢查。",
    walkthrough: "先把『壓力正常』拆成控制結果與設備狀態。APC 為維持同一壓力而關小，表示相同吞吐量下有效抽速或排氣路徑已改變；foreline 上升支持 downstream restriction、pump performance 或 abatement load 的方向。接著核對 MFC actual 而非 setpoint、腔體溫度、throttle zero 與 pressure gauge 交叉讀值。以 P、Q 與 valve curve 估算 Seff，再比較 residence time、OES 產物比與 match fingerprint。若只有排氣狀態慢漂而 plasma coupling穩定，反應產物累積或 residence time 改變可解釋 rate 下降；若 OES 與 match 同時改變，需把 chamber coating 或 mode state 納入。不要用提高 power 抵銷，因這會把設備退化藏進 recipe。",
    decision: "交班決策需先設定 stop criteria：foreline 或 valve position 超出設備控制帶、pressure recovery 變慢、monitor wafer rate 超過產品允收時停止放行。若仍在預警帶，可限定批數並同步安排空腔 P-Q test；若達停機界線，檢查 throttle/pump/abatement 與排氣沉積。恢復後以相同 monitor wafer、相同 seasoning state 驗證，而不是看壓力顯示回到 20 mTorr 就解除。",
    record: "紀錄至少包含時間對齊的 MFC actual、chamber/foreline pressure、APC position、match position、OES ratio、rate 與 wafer map；交班文字要寫明已排除與尚未排除的假設、下一個可反證測試、產品暴露批號及明確停止條件。"
  },
  "2-2": {
    title: "交班演練：新氣體比例改善速率，卻讓安全與材料證據斷鏈",
    situation: "DOE 顯示把某 fluorocarbon 比例提高可讓 SiO2 rate 增加 18%，工程師準備直接放大到 production。配方總流量與壓力沒有超過機台範圍，但新比例會提高鋼瓶消耗與未反應排氣，現有 qualification 只量 blanket rate、CD 與 selectivity，沒有確認 elastomer、pump oil、abatement 與副產物。",
    walkthrough: "先把製程有效與變更可放行分開。製程端需確認 profile、loading、mask loss、polymer residue、chamber wall accumulation 與 endpoint，不只三個平均值。設備與 EHS 端需回到指定供應商最新版 SDS、gas cabinet 設計、MFC 校正因子、compatible materials、detector response、purge sequence 與 abatement capacity。總流量相同不代表風險相同，因解離分率、未反應 fraction、腐蝕性副產物與 global warming impact 都可能變化。若資料只來自另一個濃度或另一家供應商，應標為未驗證。",
    decision: "先以受控工程批建立 mass balance 與 exhaust evidence，必要時由廠務量測 abatement inlet/outlet；在 MOC、PSSR 與材料相容簽核完成前，不可用產品效益取代安全閘門。若配方有替代方案，應比較達成同一 wafer 結果所需的總用量、clean frequency 與排放，不只比較單片速率。任何 alarm/interlock 修改必須獨立驗證 fail-safe。",
    record: "交班包要列 recipe 版本、氣體供應商與濃度、SDS 版本日期、最大瞬時與每批使用量、預期副產物、MFC/閥件/密封材質、detector 與 abatement 證據、工程批 wafer 結果及所有待簽欄位。未完成項目不得寫成『同類氣體可類推』。"
  },
  "2-3": {
    title: "交班演練：OES 亮度下降究竟是密度、EEDF 還是窗口污染",
    situation: "Ar/CF4 製程的某條高閾值 emission line 在兩週內下降 25%，低閾值線只下降 5%，wafer etch rate 下降 8%。source power、pressure 與 flow 都穩定。設備人員主張清潔 viewport，製程人員主張提高 power；兩方都缺少能排除其他原因的證據。",
    walkthrough: "單一 OES intensity 同時受 emitting species density、electron density、EEDF 與 optical throughput 影響。高閾值線比低閾值線降得多，可能是高能尾端變弱；所有線等比例下降才較像視窗 transmission。先使用穩定 lamp 或已知 plasma reference 檢查光路，再比較 line ratio、match position、VI/density proxy、endpoint 與 chamber history。若 cleaning viewport 後全部強度恢復但 ratio 不變，光學污染主導；若 ratio 與 wafer rate 同步、光路 reference 穩定，才支持 plasma chemistry/EEDF 改變。還要檢查壁面 seasoning，因它會改變 CFx/F source-sink。",
    decision: "禁止先以 power 補 rate，因 power 會同時改 density、EEDF 與 wall state，讓根因更難分離。先做無產品風險的 reference plasma、光路檢查與一片 monitor wafer；依結果決定清 viewport、恢復 seasoning、檢查 matching/coupling 或設計小幅 power split。若 line ratio 已越過 validated window，即使 rate 尚在規格也應進入 hold/review。",
    record: "交班記錄要保存原始 spectrum、integration time、光纖與 viewport 位置、dark/reference 訊號、各 line intensity 與 ratio、match/VI、chamber clean/seasoning 歷史及 wafer response。結論需區分觀察、推論與已驗證根因。"
  },
  "2-4": {
    title: "交班演練：profile 變圓時，先改壓力還是偏壓",
    situation: "HAR contact 底部 CD 逐批縮小、側壁 bowing 增加。pressure actual 仍在規格但偏高側，bias voltage 與平均 ion energy proxy 仍正常。值班工程師提出把 bias 加 10%，另一位建議先把 pressure 拉回中心。必須用因果鏈決定第一個低風險動作。",
    walkthrough: "profile 變圓可能來自 IAD 變寬、bottom polymer 增厚、mask faceting 或 charging。pressure 位於高側會縮短 mean free path，使 sheath charge exchange 與角度散射增加；提高 bias 可能增加底部清除，也會放大 mask loss、damage 與斜向離子側壁攻擊。先比較 IEDF low-energy fraction proxy、OES chemistry、mask CD、polymer residue 與 pressure/APC trend。若化學與 mask 都穩定、pressure/IAD 指標偏移，先把 pressure 恢復中心較符合單一鏈條；若 bottom residue 明顯而 IAD 無變化，才考慮化學或最低必要 bias。",
    decision: "第一個動作應可逆、只影響最可能的中介量，並設定觀察終點。把 pressure 回中心後用 monitor wafer 比較 bottom CD、bowing 與 selectivity；不允許同時加 bias。若無改善，再沿 polymer/energy 路徑做小 split。任何 bias 增加都需重新核對 damage budget 與 mask loss，不以 profile 單項改善放行。",
    record: "交班要附 pressure distribution、APC position、mean free path/sheath ratio 估算、IEDF/IAD proxy、mask 與 feature 截面、OES chemistry、候選因果鏈及每一步的反證條件。若只有平均 ion energy，需明確標示缺少分布寬度證據。"
  },
  "2-5": {
    title: "交班演練：匹配器反覆搜尋，是真故障還是 ICP 模式跳變",
    situation: "ICP 點火後 matcher 在兩組 capacitor position 間來回，reflected power 間歇升高；OES 與 coil current 同步在高低兩態切換。手動固定 matcher 可短暫穩定，但下一片又重現。直接更換 matcher 或鎖死位置都可能治標不治本。",
    walkthrough: "兩組穩定的 OES/coil/match 狀態提示 plasma load 本身有雙穩態，可能位於 E/H mode 遲滯區。matcher 追逐負載會放大震盪，但不一定是起點。先以 engineering wafer 做受控 power up/down sweep，畫 density proxy、coil current、match position 與 reflected power 的 hysteresis；再檢查 pressure、gas、wall condition 與 window coating 是否使 transition boundary 移到 production setpoint。若固定 dummy load 時 matcher 正常，更支持 plasma-driven；若 dummy load 也震盪，才轉向機構或控制器。",
    decision: "短期可使用明確的 ignition overshoot 進入 H-mode，再回到遠離重疊區的 target，前提是 hardware 與 wafer limit 允許；不可在產品上用手動鎖位掩蓋反射。中期調整 operating point 或控制 gain，並處理 window/wall 根因。恢復條件需包含連續多次 cold/warm start 都進入同一 mode。",
    record: "保存 power sweep 方向、actual waveform、pressure/gas、coil V/I、forward/reflected、tune/load、OES/density proxy、前一 recipe 與 idle time。交班必須寫出 mode 判定規則與禁止操作，例如未確認負載時不得強制固定電容位置。"
  },
  "2-6": {
    title: "交班演練：封裝 plasma clean 超過 queue time，能否直接重清潔",
    situation: "一批 Cu pillar/PI package 在 O2/Ar plasma clean 後因 bonding tool 停機等待 10 小時，超過已驗證的 4 小時 clean-to-bond 上限。接觸角從 16° 回升到 41°，外觀無異常。生產希望再跑一次相同 clean 後直接接合，但這批材料已承受一次完整 ion/radical dose。",
    walkthrough: "超時包含兩條不同風險：聚合物表面可能疏水回復或再污染，Cu/Ni 表面可能持續氧化。接觸角只能反映潤濕相關表面能，不能證明金屬氧化、LMWOM、roughness、PI thickness 與 bondability。重清潔或許重新降低接觸角，也會累加 polymer etch、filler exposure、金屬氧化與 ion damage。先查原 qualification 是否包含 re-clean 次數、累積 dose 與超時 recovery；若沒有，就不能把『看起來恢復』當作已驗證。可用 witness coupon 或保留樣做 XPS/oxide、contact angle、bond pull/shear、underfill wetting 與 cross-section 比較。",
    decision: "若既有規範明確允許一次 re-clean 且本批累積 dose、ambient、material lot 都在範圍，可按受控流程處理並重設較短 queue time；若沒有再處理證據，批次應 hold，由材料/封裝/品質共同決定工程評估、降級或報廢。不得只因停線成本高就臨時擴張 recipe。未來 qualification 要加入 0/1/2 次 clean、不同等待與 dry N2 儲存的交互矩陣。",
    record: "MES 與交班包需保存 clean start/end、實際 queue time、ambient 溫濕度或 N2 儲存、package stack 與材料 lot、recipe/source/bias/dose、接觸角時間序列、金屬氧化與功能性接合數據、re-clean 次數及核准人。超時處置必須可追溯到版本化規範，不以口頭經驗放行。"
  }
};
