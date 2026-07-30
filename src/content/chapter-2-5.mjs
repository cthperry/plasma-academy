export const chapterTwoFive = {
  id: "2-5",
  route: "/level/2/2-5-plasma-sources/",
  title: "2.5 電漿源與功率耦合",
  hours: 3,
  objectives: [
    "比較 CCP、ICP、ECR 與 remote plasma 的功率進入路徑與主要應用。",
    "由功率掃描歷史判斷 ICP E-mode、H-mode 與遲滯區。",
    "用複數阻抗與反射係數說明匹配網路如何把電漿負載轉成 50 Ω。",
    "把匹配電容位置、反射功率與腔體狀態連成可監控的診斷指紋。"
  ],
  prerequisites: ["1.4 輝光放電與點火：知道崩潰、維持和點火瞬間反射的差異。", "2.3 電漿化學：能區分電子加熱、密度與 EEDF。", "2.4 鞘層進階：能區分 source、bias、離子通量和能量。"],
  summary: "電漿源的差異在於能量如何穿過真空邊界進入電子。CCP 以電極與鞘層電場耦合，結構簡單但密度與離子能量較耦合；ICP 由線圈磁場感應方位角電場，可建立高密度並另用 bias 控能量，卻可能在 E/H mode 間跳變。ECR 與表面波源用微波和磁場或介電結構提高低壓耦合；remote source 則把帶電粒子留在上游，只把自由基送到處理區。所有 RF source 都面對電漿阻抗不是 50 Ω 的問題，匹配網路透過可變電容降低反射；電容位置本身會隨壓力、功率、氣體與腔體表面改變，是免費且高敏感的健康指紋。",
  sections: [
    {
      id: "ccp",
      title: "CCP：鞘層拍打與能量—密度耦合",
      body: `<p>CCP 由兩片電極形成電容結構，RF 電壓使 bulk 與鞘層電場振盪。高壓時，電子在振盪場中頻繁碰撞，把有序運動轉成隨機能量，稱為 ohmic 加熱；低壓時，快速移動的鞘層邊界像活塞拍打電子，stochastic heating 成為重要來源。兩種機制可同時存在，比例隨壓力、頻率、波形與 gap 改變。</p><p>單頻 CCP 提高功率時，電漿密度、鞘層電壓、Vdc 與電子加熱往往一起改變，因此離子通量與能量難以獨立調。這種耦合不全是缺點：介電質蝕刻需要足夠離子能量打開 Si–O 鍵並清除聚合物，CCP 可在簡單耐用結構中提供高 bias。</p><p>雙頻或三頻系統以高頻偏向控制密度、低頻偏向控制能量，改善但不消除耦合。高頻電流仍會改變鞘層電壓，低頻鞘層運動仍會加熱電子；不同頻率還會透過非線性鞘層產生互調與諧波。報告「source/bias 解耦」時要附上實測 V/I、Vdc 與 density，而不是只列 generator setpoint。</p><p>CCP 的設備診斷常看 forward/reflected、match positions、Vpp、Vdc、壓力與點火波形。若相同 recipe 的 Vdc 漂移，可能來自 chamber wall、電極面積、介電層沉積或匹配負載改變；先確認電氣路徑，再把變化連到 IEDF 與 wafer profile。</p>`
    },
    {
      id: "icp",
      title: "ICP：感應圈與 E/H 模式遲滯",
      body: `<p>ICP 線圈電流建立時變磁場，穿過石英或氧化鋁窗後感應方位角電場，電子沿環向吸收能量。bulk 加熱可在較低鞘層電壓下建立 10¹¹–10¹² cm⁻³ 等級密度；晶圓電極另加 bias，讓離子通量與能量相對獨立。介電窗仍是製程邊界，沉積、侵蝕、溫度與微粒會改變耦合。</p><p>低功率點火時，線圈電壓可透過雜散電容形成弱 E-mode，密度低且發光暗。功率上升到門檻後，線圈電流與感應場形成正回授，系統跳進高密度 H-mode；下降時因高密度改善耦合，可在更低功率維持，直到另一個門檻才掉回 E-mode。這就是遲滯。</p><p>550 W 可能不是一個唯一狀態：若從低功率上掃、尚未跨過 600 W，可留在 E-mode；若先以高功率進 H-mode 再下降，可能在 550 W 保持 H-mode。recipe 常用高功率 ignition/strike step 再降到 process power，但製程點若太靠近遲滯邊界，pressure、gas 或 chamber state 的小漂移就會造成 mode hopping。</p><p>A14 保留掃描方向與前一模式，不用功率單點直接決定狀態。現場驗證可疊圖 nₑ proxy、OES、coil voltage/current、match positions 與光強；若密度突然跳變而壓力與 flow 平穩，E/H transition 比 MFC step 更合理。</p>`
    },
    {
      id: "microwave-remote",
      title: "ECR、表面波與 remote plasma",
      body: `<p>ECR 在電子迴旋頻率等於微波頻率時共振吸能。2.45 GHz 對應約 875 Gauss，可在 0.1–1 mTorr 建立高密度、低碰撞電漿；磁場線與共振面同時決定電子加熱與輸運。優點是極低壓與低損傷，代價是磁場系統、均勻度、腔體尺寸與維護複雜。</p><p>表面波與 RLSA 類微波源利用介電質板或天線讓波沿界面傳播，建立大面積高密度電漿。它們可在低 Tₑ 條件提供高自由基通量，適合 low-k、有機膜或需要降低 charging 的製程；但介電窗污染、mode pattern 與邊緣均勻性仍需控制。</p><p>Remote plasma 把放電放在上游 source，電子與離子在下游傳輸中復合，只讓壽命較長的 O、F、H 等中性自由基抵達處理區。NF₃ 遠端腔體清潔可減少離子轟擊零件；光阻灰化與封裝表面清潔可降低 charging、UV 與直接 ion damage。沒有離子方向性也表示它不適合用來定義垂直圖形。</p><p>「remote」不自動等於零損傷。短壽命物種會在管壁復合，source 距離、管徑、材質與溫度控制到達通量；VUV、亞穩態、殘餘離子或高溫自由基仍可能影響 low-k、Cu、PI、epoxy 與有機界面。封裝清潔需用材料相容、表面化學、附著與可靠度驗證，而不是只看 source power。</p>`
    },
    {
      id: "matching-network",
      title: "阻抗匹配：把動態負載轉成 50 Ω",
      body: `<p>RF generator 與傳輸線以 50 Ω 為設計基準，電漿則是隨時間與條件改變的複數阻抗。鞘層帶來電容性虛部，bulk 電阻、線圈、纜線與 stray 元件共同形成實部和電抗；點火前、E-mode、H-mode 與製程穩態的負載可能完全不同。</p><p>反射係數 Γ=(Zin−50)/(Zin+50)，反射功率比例為 |Γ|²。匹配網路不會消滅能量，而是用反應元件變換負載：A15 的模型讓電漿先經固定電感與 C_tune 串聯，再由 C_load 並聯，將輸入阻抗移向 50+j0 Ω。Smith-like 圖上的圓心代表匹配，而不是「阻抗為零」。</p><p>自動匹配盒依 reflected power、相位或 V/I feedback 移動真空電容。演算法太快可能追逐 plasma oscillation，太慢則讓 generator 長時間承受高 VSWR；E/H 跳變時負載本身突然改變，match motor 震盪不一定是馬達故障。診斷要同時看 plasma mode 與電容軌跡。</p><p>匹配成功只代表 generator 端看見接近 50 Ω，不保證所有 forward power 都被電子吸收。線圈、電容、纜線、介電窗與電極都有損耗；真正 absorbed power 需由校正 VI、熱量測或功率平衡估算。A15 顯示 delivered power 是傳輸線層級近似，不等於全部進入電漿電子。</p>`
    },
    {
      id: "matching-diagnostics",
      title: "匹配位置是腔體狀態指紋",
      body: `<p>相同 pressure、flow、power 與硬體下，穩態 C_tune/C_load 位置應落在可重現區間。腔壁沉積、liner 更換、介電窗鍍膜、接地接觸、線圈溫度與電漿密度改變都會移動複數負載，因此匹配位置常比 reflected power alarm 更早顯示 drift。</p><p>把匹配位置納入 SPC 時要按 recipe step、mode 與時間對齊。點火瞬間高反射正常，不能與穩態平均混在同一指標；motor encoder 零點、電容非線性與機構 backlash 也要校正。golden fingerprint 至少包含 tune/load、forward/reflected、Vdc、pressure、valve、gas actual 與 source mode。</p><p>常見診斷路徑是：反射持續偏高先確認點火與 mode，再確認 pressure/flow、線纜與接地；電容貼近行程極限代表負載可能跑出匹配範圍；電容來回震盪要分辨控制迴路不穩還是 plasma E/H hopping；突然反射尖峰則要排除 arcing、particle 與絕緣失效。</p><p>A15 改變壓力後，電漿阻抗與最佳電容位置一起移動；若沿用舊位置，反射立即上升，自動匹配可再收斂到低於 1%。量產上不應只在 match 成功後丟掉位置資料，因為新的終點本身就是 chamber health 與 clean/seasoning 狀態的敏感訊號。</p>`
    }
  ],
  callouts: [
    { type: "intuition", title: "工程師直覺", body: "Source 決定電子如何吸收功率；matching 決定 generator 如何把功率送到動態負載。兩者相連，但匹配成功不等於電子吸收效率一定高。" },
    { type: "misconception", title: "常見誤解", body: "同一 power setpoint 不保證同一 ICP 模式；位於遲滯區時，掃描歷史決定系統落在 E-mode 還是 H-mode。" },
    { type: "warning", title: "高反射與 arcing", body: "點火瞬間反射升高可能正常；持續高反射、反射尖峰、聲響或燒痕需依設備安全程序停機排查，不能只放寬 alarm。" }
  ],
  labs: [
    { id: "a14", title: "A14 CCP/ICP 耦合與 E/H 遲滯", module: "/assets/js/labs/a14-source-coupling.js", observation: ["從 100 W 向上掃描，記錄進 H-mode 的功率與密度跳變。", "從高功率向下掃描，記錄掉回 E-mode 的功率，確認與上跳門檻不同。", "分別從上下方向到 550 W，比較模式、光強與 nₑ。", "切換壓力與氣體，觀察門檻移動，說明為何 recipe 不應貼著遲滯邊界。"] },
    { id: "a15", title: "A15 阻抗匹配與 Smith-like 圖", module: "/assets/js/labs/a15-matching.js", observation: ["按自動匹配，確認輸入點移到 50 Ω 圓心附近且反射低於 1%。", "匹配完成後改變壓力，觀察反射立即上升，再次匹配並比較電容位置。", "切換 Ar、O₂、CF₄ 或 power，記錄 C_tune/C_load 指紋如何改變。", "把電容移離最佳點，比較 forward、reflected 與 delivered power。"] }
  ],
  selfCheck: [
    ["低壓 CCP 的 stochastic heating 圖像是什麼？", "振盪鞘層邊界像活塞拍打電子，使電子取得能量。"],
    ["ICP H-mode 為何比 E-mode 密度高？", "H-mode 由線圈電流的感應場高效率耦合，形成密度與吸收的正回授。"],
    ["550 W 為何可能對應 E-mode 或 H-mode？", "它位於遲滯區，狀態取決於從低功率上掃或從高功率下掃。"],
    ["Remote plasma 為何適合低損傷清潔？", "帶電粒子多在上游復合，處理區主要接收中性自由基，離子與 charging 較少。"],
    ["Smith 圖圓心在 A15 代表什麼？", "generator 端輸入阻抗為 50+j0 Ω，反射係數接近零。"],
    ["反射功率比例如何由 Γ 得到？", "P_reflected/P_forward=|Γ|²。"],
    ["匹配成功為何不等於所有 delivered power 都被電子吸收？", "線圈、電容、纜線、窗與電極仍有損耗。"],
    ["匹配電容位置為何值得納入 SPC？", "它對電漿阻抗、腔壁、介電窗、接地與密度變化敏感，可作 chamber fingerprint。"]
  ],
  readings: ["Lieberman & Lichtenberg, Principles of Plasma Discharges and Materials Processing，章節：Capacitively and Inductively Coupled Discharges。", "Chabert & Braithwaite, Physics of Radio-Frequency Plasmas，章節：Power Coupling and Matching。", "設備供應商核准的 RF generator、matching network 與 arcing 安全操作手冊。"]
};
