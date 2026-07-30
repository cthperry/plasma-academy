export const chapterTwoOne = {
  id: "2-1",
  route: "/level/2/2-1-gas-vacuum/",
  title: "2.1 氣體動力學與真空",
  hours: 2,
  objectives: [
    "由流量、壓力與腔體體積計算滯留時間。",
    "用 Knudsen 數區分黏滯流、過渡流與分子流。",
    "依量測範圍與氣體依賴性選擇壓力計。"
  ],
  prerequisites: ["1.3 碰撞與平均自由徑：需要先能由壓力估算碰撞尺度。", "1.6 製程電漿地圖：需要知道不同應用的典型壓力窗。"],
  summary: "流量和壓力不是同一個旋鈕。壓力主要決定腔內中性粒子密度，流量在壓力固定時主要改變換氣速度與滯留時間。你會用 τ=79PV/Q 算出一個分子平均待在腔內多久，再用 Kn=λ/d 判斷管路與 gap 落在黏滯流、過渡流或分子流。最後把 Baratron、Pirani 與 ion gauge 的量測原理連回控制需求，避免把 gauge 讀值、節流閥位置與實際晶圓區狀態混成同一件事，並能說明氣體排出效率為何會影響腔體狀態與後續封裝表面清潔的重現性。",
  sections: [
    { id: "ideal-gas", title: "理想氣體定律的製程版本", body: `<p>現場看到 10 mTorr，真正要問的是這代表多少中性粒子。由 n=P/kT 可得 300 K 時每 1 mTorr 約對應 3.22×10¹³ cm⁻³，因此 10 mTorr 約是 3.22×10¹⁴ cm⁻³。和 L1 常見 nₑ≈10¹⁰ cm⁻³ 比較，游離度約 3×10⁻⁵，與弱游離圖像一致。</p><p>這個換算可以把 recipe setpoint 接到碰撞頻率、平均自由徑與反應物供應量。若壓力提高十倍而氣體溫度近似不變，中性密度也提高十倍；電子與分子的碰撞變頻繁，卻不代表電子密度會依相同比例上升。電漿密度仍由功率吸收、游離與器壁損失共同決定。</p><p>計算時最常見的錯誤是把 Torr、mTorr、Pa 或 cm⁻³、m⁻³直接混用。另一個邊界是氣體溫度：壓力計與晶圓上方若不在同一溫度與位置，單一讀值只能提供量級。heated showerhead、熱晶圓與冷腔壁會建立溫度梯度，相同靜壓下的局部密度因而不同。</p><p>密度換算是 sanity check，不是局部流場量測。工程紀錄至少要保留壓力單位、採樣位置、氣體溫度假設與 gauge 型式；否則兩組看似相同的密度數字，可能只是不同單位或不同位置的讀值被誤當成同一條件。</p>` },
    { id: "partial-pressure", title: "Dalton 分壓與混氣 recipe", body: `<p>若 Ar 100、CF₄ 50、O₂ 10 sccm，總流量是 160 sccm；在沒有選擇性消耗時，20 mTorr 總壓可估為 Ar 12.5、CF₄ 6.25、O₂ 1.25 mTorr。這是進氣配方的第一層模型，可以快速檢查 MFC 設定是否符合預期比例，也能把各成分帶入碰撞與安全評估。</p><p>這個估算隱含三個條件：各 MFC 的 actual flow 已校正、混合氣體共用近似相同的有效抽速，而且腔內沒有顯著選擇性生成或消耗。若使用 He 背壓、上游 premix 或多區 showerhead，還要先分清楚哪些流量真的進入反應腔，不能把所有氣路設定直接相加。</p><p>真實腔體通常不完全符合。CF₄ 會被解離，O₂ 被表面與聚合物消耗，SiF₄、CO 與 CO₂ 等產物又加入氣相。高消耗製程中，進氣流量比和晶圓附近物種比例可能差數倍；需要 RGA、質譜、OES 或經驗模型才能往下收斂。</p><p>診斷時先用 Dalton 模型建立可否證的基準，再找偏差來源。若總壓正確但特定產物分壓上升，可能是清潔不足、腔壁 loading 或晶圓反應改變；若所有分壓一起偏移，則優先檢查 MFC、漏氣、節流閥與 pump throughput。模型的價值是縮小排查範圍，不是宣稱腔內組成完全等於進氣比例。</p>` },
    { id: "residence-time", title: "滯留時間：換氣速度的尺度", body: `<p>滯留時間 τ=79P[Torr]V[L]/Q[sccm]。30 L、20 mTorr、200 sccm 得到約 0.24 s。若維持 20 mTorr 而把總流量加倍，τ 會減半；壓力控制器會把節流閥開得更大，讓更多氣體進出，但由壓力決定的平均中性密度近似不變。</p><p>式中的 79 來自把 Torr、L、sccm 與標準狀態流量換成一致單位。它假設腔體近似 well mixed、壓力與溫度穩定，並以體積平均描述換氣。若腔內有狹縫、載台下空間、死角或多個排氣口，實際停留時間會形成分佈，而不是所有分子都剛好在 τ 時離開。</p><p>τ 太短時，前驅物可能來不及充分解離，氣體利用率下降；τ 太長時，副產物累積、再解離與再沉積機率上升。對腔體清潔而言，較長 τ 可能增加 F 自由基使用率，也可能讓揮發產物排出變慢；對封裝表面清潔而言，殘留 O、H 或濕氣的 purge 時間會影響下一道接合前的界面狀態。</p><p>因此換 recipe 或跨機台移植時，不只抄 flow 與 pressure。要把腔體有效體積、有效抽速、實際 valve position、purge 次數與達穩時間一起納入。A08 提供的是第一階尺度；若 wafer map、RGA decay 或 endpoint 顯示明顯多時間常數，就要改用 compartment 或流場模型。</p>` },
    { id: "knudsen", title: "Knudsen 數與流動區間", body: `<p>Kn=λ/d 把平均自由徑和管徑或 gap 比較。Kn&lt;0.01 時分子互撞為主，接近黏滯流；Kn&gt;1 時分子主要撞壁，接近分子流；中間是過渡流。PECVD 在 Torr 等級常偏黏滯流，低壓蝕刻常落在過渡流，高真空管路則接近分子流。</p><p>流動區間決定可用的工程直覺。黏滯流可用連續流體的壓降、速度場與邊界層描述；分子流更像粒子在表面之間飛行，傳輸受幾何視線與壁面碰撞控制。過渡流同時受到兩者影響，不能把大氣管路公式直接套到低壓腔體。</p><p>在分子流區，管路導傳強烈依賴直徑，近似與 D³/L 成正比，所以泵到腔體的路徑要粗且短。相同名義泵速接上細長 elbow、閥件與 trap 後，腔體看到的有效抽速可能大幅下降。這也解釋了為何只換一段 foreline 或排氣零件，就可能改變 throttle 工作點與 purge 尾巴。</p><p>Kn 的 d 必須對應問題：分析主排氣管用管徑，分析晶圓上方輸運用 gap，分析封裝 substrate 狹縫或載具遮蔽則要用局部特徵尺寸。若清潔自由基需進入窄縫，局部 Kn 與表面復合率會一起限制到達通量；用全腔平均壓力無法保證每個界面都得到相同處理。</p>` },
    { id: "pumps", title: "泵浦鏈與壓力控制", body: `<p>乾式幫浦把系統從大氣抽到粗真空，渦輪分子泵或冷凝泵再建立高真空。製程時，節流閥改變泵的有效抽速；控制迴路由 capacitance manometer 讀壓力，再調整閥位平衡進氣 throughput 與排氣。泵的銘牌抽速不是腔體抽速，兩者之間還隔著管路 conductance、閥件與污染控制設備。</p><p>壓力穩定是閉迴路結果，不表示進氣與排氣都健康。若 MFC actual 偏低，控制器可能關小節流閥仍維持 setpoint；若 foreline 壓力上升，控制器也可能用不同閥位掩蓋泵效變化。因此保存 pressure trace 時應同步保存 flow actual、throttle position、foreline pressure 與 pump speed。</p><p>閥位是 chamber health 的重要 proxy。相同 flow 與 pressure 下，閥長期越開越大可能表示 conductance 改變或漏入額外氣體；越關越小可能是泵效下降、排氣沉積或流量偏差。判讀必須和 base pressure、rate of rise、maintenance history 與 clean 後 seasoning 狀態一起看。</p><p>清潔流程還要處理排出的危害物與凝結物。腔體清潔可能產生 SiF₄、COF₂ 或酸性副產物；封裝清潔則可能帶出有機碎片、水氣與微粒。泵、foreline、abatement 與濾材必須按 SDS、設備規範及在地 EHS 程序選型，清潔後也要用 purge、base pressure、殘氣或見證片確認沒有把污染從產品表面轉移到排氣系統後又帶回腔體。</p>` },
    { id: "gauges", title: "壓力量測：選對計", body: `<p>Baratron 以隔膜位移量測壓力，對氣體種類較不敏感，是製程閉迴路控制的主力。Pirani 以熱傳導估壓，便宜且範圍適合粗真空，但 Ar、He 等氣體的校正不同。Ion gauge 由游離電流估算高真空壓力，用於 base pressure，不適合 mTorr 製程壓力。</p><p>選量程時要讓正常製程落在感測器有足夠解析度的區段。1000 Torr full-scale gauge 雖能讀 20 mTorr，零點漂移占比可能過大；10 Torr gauge 對製程壓力較敏感，卻不能承受或準確描述所有 pump-down 階段。量產機常以多支 gauge 交疊量程，並明確定義切換條件。</p><p>任何 gauge 都有位置與動態限制。控制點在腔體側壁，不代表 showerhead 下方與排氣口分壓完全相同；快速 step 中的讀值也可能落後真實變化。選 gauge 時同時問量測範圍、氣體依賴、反應時間、污染耐受與安裝位置，並定期執行 zero、span 與 cross-check。</p><p>清潔製程特別容易污染 gauge 或改變其熱傳導校正。含氟副產物、聚合物碎片與水氣可能沉積在隔膜或 Pirani 線材上，使基線緩慢漂移。封裝表面清潔若要求低殘留，僅看壓力達標不足以證明腔體乾淨；還需配合 rate-of-rise、RGA、水氣指標、particle monitor、接觸角或離子污染等與產品界面直接相關的驗證。</p>` }
  ],
  callouts: [
    { type: "misconception", title: "常見誤解", body: "流量比只有在沒有選擇性反應與消耗時才近似腔內濃度比；實際組成需用 RGA、質譜或校正模型確認。" },
    { type: "intuition", title: "工程師直覺", body: "壓力固定時加倍流量，主要改變的是換氣速度與節流閥位置，不是平均中性密度。" },
    { type: "note", title: "銜接 3.7 封裝清潔", body: "封裝清潔處理的是產品界面，不是機台腔壁；但 purge、殘氣、流場死角與排氣回帶會直接影響表面活化的重現性。到了 3.7 會把這些真空基礎連到 RDL、UBM、凸塊、underfill 與模封前後的污染控制。" }
  ],
  labs: [{
    id: "a08",
    title: "A08 腔體流場與滯留時間計算器",
    module: "/assets/js/labs/a08-residence-time.js",
    observation: [
      "保持 20 mTorr 與 30 L，把流量從 200 加到 400 sccm；確認 τ 約減半，而中性密度不變。",
      "保持流量不變，把壓力提高十倍；比較 τ、密度與節流閥估算如何同時移動。",
      "把腔體體積從 30 L 改到 60 L；指出為什麼同一份 recipe 跨設備不能只複製流量與壓力。"
    ]
  }],
  selfCheck: [
    ["30 L、20 mTorr、200 sccm 的滯留時間約多少？", "約 0.24 s。"],
    ["壓力固定時把流量加倍，τ 如何變化？", "τ 與流量成反比，因此約減半。"],
    ["為什麼流量比不一定等於晶圓附近濃度比？", "反應物會被解離與表面消耗，副產物也會加入氣相。"],
    ["Kn 大於 1 代表哪種流動？", "接近分子流，分子撞壁多於彼此碰撞。"],
    ["哪一種 gauge 適合製程壓力閉迴路控制？", "Capacitance manometer（常稱 Baratron），因為氣體依賴較低。"],
    ["相同 flow 與 pressure 下 throttle 長期越開越大，應檢查什麼？", "conductance、漏氣、MFC actual、泵效與排氣沉積等狀態。"]
  ],
  readings: ["Lieberman & Lichtenberg, Principles of Plasma Discharges and Materials Processing (2nd ed.)，章節：Gas Kinetics and Vacuum Systems。", "O'Hanlon, A User's Guide to Vacuum Technology，章節：Gas Flow and Pressure Measurement。"]
};
