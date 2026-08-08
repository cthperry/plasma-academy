export const chapterFourOne = {
  id: "4-1",
  route: "/level/4/4-1-diagnostics/",
  title: "4.1 電漿診斷",
  hours: 3.5,
  prerequisites: ["2.3 電漿化學基礎", "2.4 鞘層物理進階", "2.5 電漿源與功率耦合", "3.6 均勻度、PM 與腔體記憶"],
  objectives: [
    "依量測量、侵入性、時間解析度與量產可維護性選擇診斷工具。",
    "從 Langmuir I-V 曲線求得 Vf、Te、Vp、ne，並判別結果何時已失去可信度。",
    "用 OES 譜線辨識物種，區分逐線 NIST 核實原子線、教學權重與待查分子帶。",
    "列出 actinometry 三個成立前提，並用正確與錯誤內標解釋比值漂移。",
    "把 OES 與 VI probe 組成雙工具診斷，將蝕刻率下降收斂成可驗證假設。"
  ],
  summary: "電漿診斷不是追求一個最精準的儀器，而是把待回答的工程問題轉成可量測量。Langmuir 探針可由 I-V 曲線取得 Vf、Te、Vp、ne 與 EEDF，適合研發與機台驗收，但侵入、易鍍膜且需要 RF 補償。OES 非侵入且可逐片監控，卻只能由光強間接推論物種；actinometry 以低比例內標取比值，可降低電子密度、電子溫度與共同光路衰減的影響，前提是內標不擾動電漿、激發閾值接近、且直接電子激發占主導。量產判斷應結合 OES、VI probe、設備訊號與晶圓量測，不能把教學模型輸出直接當成 recipe 放行依據。",
  sections: [
    {
      id: "diagnostic-overview",
      title: "診斷方法總覽：先問問題，再選量測",
      body: `<p>診斷的第一步不是選儀器，而是把問題改寫成量測需求。「蝕刻率下降」不是一個可直接量測的電漿狀態；它可能來自自由基通量下降、離子能量下降、晶圓溫度漂移、表面鈍化增加、端點時間判定錯誤或量測站偏移。工程師應先寫下要區分的假設，再決定需要量濃度、能量、密度、阻抗、排氣產物或晶圓結果。若只因設備上已有一個感測器就把其訊號當成答案，得到的通常只是相關性，而不是能指導動作的因果證據。</p>
      <div class="table-wrap"><table><thead><tr><th>方法</th><th>主要量測量</th><th>侵入性</th><th>時間特性</th><th>量產適用性</th></tr></thead><tbody>
      <tr><td>Langmuir 探針</td><td>ne、Te、Vp、Vf、EEDF</td><td>侵入</td><td>掃描後分析</td><td>研發、機台驗收與模型校驗</td></tr>
      <tr><td>OES</td><td>發光物種、相對濃度、端點特徵</td><td>非侵入</td><td>可連續高速取樣</td><td>高，需管理視窗與光譜模型</td></tr>
      <tr><td>VI probe</td><td>RF 電壓、電流、相位、阻抗與諧波</td><td>非侵入</td><td>逐 RF 週期或統計值</td><td>高，適合 FDC 與耦合狀態監控</td></tr>
      <tr><td>RGA</td><td>質荷比、反應物與產物分壓</td><td>旁路抽樣</td><td>受取樣線與抽氣延遲</td><td>中，適合洩漏、PM 與化學確認</td></tr>
      <tr><td>FTIR</td><td>排氣分子吸收光譜</td><td>非侵入排氣量測</td><td>有輸送延遲</td><td>環保、排放與清潔效率監控</td></tr>
      <tr><td>微波干涉</td><td>視線方向的線積分電子密度</td><td>非侵入</td><td>快速</td><td>需光路與反演，常見於研發</td></tr>
      <tr><td>RFEA</td><td>離子能量分佈 IEDF</td><td>表面侵入</td><td>能量掃描</td><td>晶圓平面研究與硬體驗證</td></tr>
      <tr><td>SEERS</td><td>由電流擾動反演 ne 與碰撞率</td><td>非侵入</td><td>可線上</td><td>需設備校正與模型治理</td></tr>
      </tbody></table></div>
      <p>四個篩選軸可以避免選錯工具。第一是<strong>量測量是否直接對應假設</strong>；第二是<strong>侵入性是否改變原本電漿</strong>；第三是<strong>空間與時間解析度是否看得到異常尺度</strong>；第四是<strong>量產維護成本</strong>，包括視窗積膜、探針耗材、取樣管記憶、跨機差異與校正追溯。高精度但每週只能離線量一次的工具，不一定比可逐片收集且有穩定基線的工具更能保護良率。</p>
      <p>量測也有自己的因果鏈：真實狀態先經過感測機制，再經光路、線纜、放大器、取樣率、演算法與資料庫，最後才成為工程師看到的數字。任何一段改變都可能形成假異常。因此每個監控項目都應保存原始訊號、處理版本、校正日期、設備狀態與單位，並用已知標準或第二種物理原理交叉確認。診斷工具不是新的真相來源，而是一條需要被驗證的量測鏈。</p>`
    },
    {
      id: "langmuir-analysis",
      title: "Langmuir I-V 三區與 Vf、Te、Vp、ne 求法",
      body: `<p>Langmuir 探針以小面積導體掃描偏壓並量測電流。當探針電位遠低於電漿電位時，電子被排斥而主要收集正離子，形成<strong>離子飽和區</strong>；電壓提高後，能量足以跨越位障的電子開始抵達，電流在<strong>電子阻滯區</strong>近似指數成長；探針電位接近或超過電漿電位後，電子收集趨於飽和。這三區不是視覺標籤，而是後續四個參數估算所依賴的資料窗口。若掃描範圍未包含足夠的離子基線與電子平台，分析器仍可能輸出數字，但數字不具物理可識別性。</p>
      <div class="table-wrap"><table><thead><tr><th>參數</th><th>圖上定義</th><th>常用求法</th><th>主要敏感項</th></tr></thead><tbody>
      <tr><td>浮動電位 Vf</td><td>淨電流 I=0</td><td>零交越兩點線性內插</td><td>RF 平移、漏電、偏移電流</td></tr>
      <tr><td>電子溫度 Te</td><td>電子阻滯區指數斜率</td><td>扣除離子基線後擬合 ln(Ie) 對 V，Te 為斜率倒數</td><td>擬合窗、非 Maxwellian EEDF、雜訊</td></tr>
      <tr><td>電漿電位 Vp</td><td>電子收集轉折</td><td>dI/dV 最大值或二階導數特徵</td><td>RF 展寬、平滑方法、掃描解析度</td></tr>
      <tr><td>電子密度 ne</td><td>離子或電子飽和電流尺度</td><td>Isat=0.61 ne e uB A，並由 uB=sqrt(eTe/Mi) 反推</td><td>有效面積、鞘層膨脹、離子質量、鍍膜</td></tr>
      </tbody></table></div>
      <p>實作分析時應保留每個中間量。先以負偏壓端估計離子基線，從總電流扣除後得到電子電流 Ie；只在電子飽和值約百分之零點三到百分之三的區間取自然對數，可避開離子基線主導與飽和平臺彎折。接著以線性回歸取得斜率及殘差，不應只顯示 Te。Vp 可由相鄰點斜率最大處估計，Vf 由零交越內插。ne 再使用分析得到的 Te、氣體離子質量、探針有效面積與離子飽和電流計算。任何一步若使用設定真值替代分析值，就失去診斷教學的意義。</p>
      <p>三種視圖回答不同問題。線性 I-V 最容易確認掃描是否跨越三區、是否飽和與是否有電流偏移；半對數圖把純指數區轉成直線，適合檢查 Te 擬合窗與非線性；EEDF 視圖使用 Druyvesteyn 關係，以電子電流二階導數乘能量權重得到分佈形狀。二階微分會放大高頻雜訊，因此 EEDF 必須同時交代平滑、取樣間距與邊界處理。漂亮的曲線不等於高可信度，可信度來自足夠掃描範圍、可追溯校正、殘差與重複量測。</p>
      <p>探針是侵入式工具。它會抽取電荷、改變局部電位，探針柄與絕緣層也可能形成額外收集面積。對磁化電漿、電負性電漿、高壓碰撞鞘層或高度非均勻腔體，單一位置的經典平面理論未必成立。工程報告應把模型假設、探針尺寸、位置、朝向、清潔方式、掃描速率與重複次數列入結果，而不是只報 ne 與 Te 的四位有效數字。</p>`
    },
    {
      id: "probe-limitations",
      title: "RF 補償、雜訊、鍍膜與 EEDF 的可信度界線",
      body: `<p>在 13.56 MHz 或多頻 RF 電漿中，電漿電位會隨時間振盪。掃描儀若只量週期平均電流，等於把許多瞬時 I-V 曲線疊加。真實系統通常使用 RF choke、補償電極、低雜散電容佈線與相位同步減少誤差。未補償時，Vp 與 Vf 可被推離真值數十伏特，直接破壞對離子加速電位與鞘層電壓的判讀。工程上應先用已知 RF 振幅、補償開關與重複掃描確認電位結果，再討論 Te 或 ne。</p>
      <aside class="callout callout-warning"><h3>純指數 RF 簡化模型限制</h3><p>本站 A26 對電子阻滯區採純指數模型。週期平均可寫成 exp((V-Vp)/Te) 乘上一個與掃描電壓 V 無關的 RF 因子，因此曲線會平移，但半對數斜率仍近似不變。這個模型支持<strong>Vp/Vf 嚴重偏移</strong>的教學結果，卻<strong>不支持偽造 Te 高估兩倍</strong>。真實探針可能因鞘層膨脹、雜散電容分壓、非 Maxwellian EEDF、探針座效應與錯誤擬合窗造成 Te 偏差；那些機制未納入本站模型。A26 會明確顯示這項界線，而不是把教科書的一般警告硬套成模型輸出。</p></aside>
      <p>鍍膜造成的是另一種風險。聚合物、氧化物或沉積膜覆蓋探針後，有效導電面積與表面功函數改變，電流幅度可能大幅下降，但曲線外觀仍平滑。若分析器用原始面積反推 ne，就會把面積損失誤判成密度下降。這種「看起來合理的錯數字」比明顯失敗更危險。每次量測應記錄清潔脈衝、暴露時間、重複曲線與前後基準；若同一條件下電流尺度單調衰減，而 Te 與 Vp 看似穩定，先懷疑表面狀態而不是宣告電漿密度持續下降。</p>
      <p>雜訊對各參數的傷害不同。Vf 的零交越對 DC offset 敏感；Vp 的一階導數會放大點對點波動；EEDF 的二階導數更敏感，任何量化雜訊、工頻干擾或 RF 殘留都可能產生假峰。平滑不能無限制增加，因為過度平滑也會消除真實的高能尾巴或雙溫電子族群。可接受流程應先保存原始曲線，再固定濾波器、窗口與端點規則，用合成曲線測試偏差，並以重複掃描估計不確定度。EEDF 只在訊噪比、取樣間距與邊界條件被明示時才適合比較。</p>
      <p>量產線通常不把探針留在製程區，原因不是它沒有價值，而是維護與污染代價過高。它最適合設備開發、機台驗收、模型校驗與離線 chamber matching。當探針結果要轉成量產監控時，應建立與 OES、VI probe 或微波密度量測的同期關聯，並定義可轉移的特徵與適用區間。超出驗證壓力、氣體、功率或表面狀態時，關聯必須重新確認。</p>`
    },
    {
      id: "oes-species",
      title: "OES 物種辨識、22 線資料與來源狀態",
      body: `<p>OES 量的是激發態粒子退激發時的光，不是基態濃度本身。波長可作為物種指紋，但強度同時受粒子濃度、電子密度、EEDF、激發截面、淬熄、光學收集效率與視窗透光率影響。工程師可以用它辨識製程轉換、端點與異常模式，卻不能看到某條線變高就直接宣告該自由基濃度等比例增加。任何定量推論都需要模型、校正或內標。</p>
      <div class="table-wrap"><table><thead><tr><th>物種</th><th>教學關鍵位置 nm</th><th>常見診斷用途</th><th>本站狀態</th></tr></thead><tbody>
      <tr><td>F I</td><td>703.7469、685.603</td><td>氟系化學與 F/Ar actinometry</td><td>nist-line-verified</td></tr>
      <tr><td>Ar I</td><td>750.3869、811.5311</td><td>內標與放電狀態</td><td>nist-line-verified</td></tr>
      <tr><td>O I</td><td>777.417、844.625</td><td>灰化、含氧化學與清潔</td><td>nist-line-verified</td></tr>
      <tr><td>CO</td><td>483.5、519.0</td><td>氧化物蝕刻產物與端點</td><td>pending-source-review</td></tr>
      <tr><td>Si I</td><td>251.6112、288.15771</td><td>矽產物、poly 與清潔進程</td><td>nist-line-verified</td></tr>
      <tr><td>CN</td><td>387.1、388.3</td><td>含氮有機物或光阻片段</td><td>pending-source-review</td></tr>
      <tr><td>C2</td><td>516.5</td><td>碳系片段與聚合傾向</td><td>pending-source-review</td></tr>
      <tr><td>H I</td><td>656.28518</td><td>含氫製程與水氣相關線索</td><td>nist-line-verified</td></tr>
      <tr><td>Cl I</td><td>837.594、725.662</td><td>氯系蝕刻</td><td>nist-line-verified</td></tr>
      <tr><td>Br II</td><td>470.492、478.548</td><td>溴系 poly 蝕刻</td><td>nist-line-verified</td></tr>
      <tr><td>N2</td><td>336.0、357.0</td><td>氮系製程與空氣洩漏線索</td><td>pending-source-review</td></tr>
      <tr><td>OH</td><td>306.0、309.0</td><td>水氣與濕氣污染線索</td><td>pending-source-review</td></tr>
      </tbody></table></div>
      <p>13 條原子線已依各元素 NIST Handbook 強線表逐線核實，資料標成 <code>nist-line-verified</code>；其中 Br 470.492 與 478.548 nm 是 <strong>Br II atomic emission</strong>，模型的物種 abundance key 仍可使用 Br。CO、CN、C2、N2、OH 是分子帶教學標記，NIST ASD 並不是其完整分子光譜來源，因此仍標成 <code>pending-source-review</code>。原子線的核實不延伸到分子帶，正式教材審查仍需為分子帶補足適當來源。</p>
      <p><code>relativeIntensity</code> 在本站只代表製程情境模型的<strong>教學權重</strong>，其 <code>intensityType</code> 為 <code>pedagogical-weight</code>。它用來讓五種製程的主要線在畫面上可辨識，不能稱為 NIST 相對強度，也不能拿來做跨儀器濃度校正。真實量測還需要儀器光譜響應校正、暗電流扣除、波長校正、飽和檢查與視窗基線。A27 顯示 22 根 stick spectrum，目的在比較因果趨勢與來源狀態，不是取代設備光譜庫。</p>
      <p>五種製程情境各有應被看見的主訊號：SiO2 蝕刻以 CO、F、O 為線索；poly-Si 蝕刻以 Si、Cl、Br 為線索；光阻灰化以 O、CO、H、OH 為線索；NF3 腔體清潔以 Si 與 F 的進程變化為線索；洩漏監測則關注 OH、N2、O 與 H 的共同異常。單線警報容易被重疊峰、視窗污染或功率漂移欺騙，量產規則應使用多線比例、基線模型與設備狀態共同判斷。</p>`
    },
    {
      id: "actinometry",
      title: "Actinometry：公式、三個前提與失效模式",
      body: `<p>簡化的發光強度可寫成 Iline 正比於目標物種濃度、電子密度、激發速率係數與共同光路傳輸的乘積。激發速率係數又依 EEDF 與激發閾值變化。因此功率提高時，即使 F 濃度幾乎不變，ne 與 Te 的變化仍可使 F 703.7 nm 絕對強度增加。Actinometry 加入已知低比例 Ar，使用 IF(703.7)/IAr(750.4) 比值，試圖約去共同的 ne、部分 Te 敏感度及相同光路衰減，再把比值變化解釋成 F/Ar 的相對濃度變化。</p>
      <p>這個約分只在三個前提成立時才有意義。<strong>前提一：內標比例低且穩定</strong>，通常使用少量 Ar，不能顯著改變放電阻抗、EEDF 或反應化學，且 MFC 實際流量要可追溯。<strong>前提二：分析線與參考線的激發閾值接近</strong>，如此 Te 或高能尾巴改變時，兩條線的速率係數才會近似同方向變化。<strong>前提三：兩條線都以可比較的直接電子激發為主</strong>；若解離激發、階梯激發、亞穩態轉移或淬熄占比不同，比值不再只代表濃度。少一項就可能得到穩定但錯誤的數字。</p>
      <div class="table-wrap"><table><thead><tr><th>操作變化</th><th>絕對強度預期</th><th>正確 F/Ar 比值</th><th>錯誤 F/Si 比值</th><th>判讀</th></tr></thead><tbody>
      <tr><td>功率 300 到 1200 W</td><td>顯著上升</td><td>變化較小</td><td>因閾值差大而更敏感</td><td>絕對強度上升不等於 F 濃度上升</td></tr>
      <tr><td>共同視窗透光率下降</td><td>依比例下降</td><td>理想模型中抵消</td><td>同一路徑時也可抵消</td><td>實機仍要考慮波長相依透光率</td></tr>
      <tr><td>Ar 內標比例下降</td><td>Ar 線下降</td><td>IF/IAr 上升</td><td>不直接適用</td><td>內標比例必須記錄並固定</td></tr>
      <tr><td>壓力或 Te 改變</td><td>多線共同漂移</td><td>閾值接近時較穩</td><td>閾值差大時漂移</td><td>用錯參考線會把電漿條件誤認為濃度</td></tr>
      </tbody></table></div>
      <p>A27 提供「正確 F / Ar」與「錯誤 F / Si」兩種模式。Ar 750.4 nm 被資料標為 actinometry 參考線，與 F 703.7 nm 的激發閾值差較小；Si 251.6 nm 的閾值差距大且沒有參考線標記。切換功率時，正確比值應比 IF 絕對強度穩定，錯誤比值則更容易隨 Te 漂移。這項比較不是宣稱 F/Ar 可在所有電漿中準確定量，而是讓學員看到「選哪一條內標」本身就是模型假設。</p>
      <p>視窗污染的抵消也有邊界。本站模型把 window transmission 當成所有波長共用倍率，所以比值可完全抵消；真實沉積膜的吸收、散射與干涉可能隨波長不同，兩條相距很遠的線不會等比例衰減。光纖彎折、光柵效率、CCD 響應與焦點漂移也可能具有波長相依性。量產應定期用標準光源或穩定參考線做響應檢查，監控暗訊號與飽和，並在 PM 前後重建基線。</p>
      <p>Actinometry 的量產適用界線是相對趨勢監控，不是無條件的絕對濃度計。它適合在同機、同光路、同配方族群內比較 lot 或 wafer 的變化；跨機、跨窗口、跨氣體比例或跨功率模式時，必須重新驗證。任何由比值觸發的 recipe 動作都應先用晶圓量測或另一項診斷確認，並保留版本化的閾值、訓練區間與誤報處理流程。</p>`
    },
    {
      id: "complementary-diagnostics",
      title: "VI probe、RGA、FTIR、微波干涉與 RFEA 的工程用途",
      body: `<p>VI probe 位於 RF 饋入路徑，量測電壓、電流、相位與諧波。它不直接告訴你 F 自由基濃度，但能快速辨識功率是否真的耦合進電漿、負載阻抗是否改變、匹配是否漂移與是否出現 arcing。基波實功率、虛功率、相位及二次三次諧波共同形成設備指紋；單看 generator setpoint 或匹配電容位置常會漏掉腔體表面狀態的變化。VI probe 適合逐片 FDC，但跨機比較前要處理感測器位置、線纜相位、校正與匹配網路差異。</p>
      <p>RGA 以質荷比觀察氣體與反應產物，可用於基礎真空、洩漏、PM 後潔淨度與端點研究。m/z 28、32、18 的組合能提供空氣或水氣線索，但碎裂圖樣與重疊質量會造成歧義；例如 CO 與 N2 都可能出現在 28。旁路取樣線還有傳輸延遲、壁面吸附、記憶效應與壓力轉換問題。有效做法是保存背景譜、使用已知氣體做碎裂比校正、比較多個 m/z，並把取樣延遲納入端點時間對齊。</p>
      <p>FTIR 量排氣分子的紅外吸收，對含氟溫室氣體、清潔效率、未反應前驅物與副產物監控有價值。它提供的是光路積分濃度，仍需溫度、壓力、路徑長度與吸收截面校正。反應器到量測 cell 的管路可讓不穩定物種消失或讓冷凝物累積，因此 FTIR 常用於排放與使用效率，而不是直接替代腔內自由基量測。與 MFC、abatement 狀態及總流量一起分析，才能把濃度轉成質量排放。</p>
      <p>微波干涉利用電漿折射率造成的相位差反演電子密度，非侵入且可快速量測。輸出通常是穿越光路的線積分 ne；腔體若高度不均勻，就需要幾何假設或多視線反演才能得到局部分佈。截止密度、窗口相位、機械振動與路徑漂移都會限制結果。它很適合校驗源功率對總體密度的影響，也可與 Langmuir 探針的局部值互補。</p>
      <p>RFEA 在晶圓平面或電極上掃描阻擋電位，量測離子能量分佈。它能看到平均能量看不到的雙峰、低能電荷交換尾巴與脈衝偏壓時序，但 aperture、局部鞘層、角度接受度、表面污染與解析度會改變量到的分佈。RFEA 多用於硬體與 recipe 開發，不宜長期留在產品環境。SEERS 則從注入小 RF 擾動後的非線性電流回應反演電子密度與碰撞率，具有非侵入優勢，但結果依賴等效電路與校正模型。</p>
      <p>互補診斷的原則是讓兩個工具對不同物理量敏感。例如 OES 看自由基與產物線，VI probe 看耦合和鞘層非線性；RGA 確認氣體組成，微波干涉確認密度；RFEA 確認 IEDF，晶圓 monitor 確認實際材料反應。兩個工具若共享同一個未控制的系統誤差，例如同一片污染視窗，就不算真正交叉驗證。</p>`
    },
    {
      id: "selection-and-case",
      title: "診斷決策表與蝕刻率下降雙工具案例",
      body: `<p>選擇診斷時應從決策問題出發。需要 ne、Te 與 EEDF 的研發校驗，優先考慮 Langmuir 探針並評估 RF、磁場與鍍膜；需要逐片監控物種或端點，優先 OES；需要判斷功率耦合、阻抗與 arcing，選 VI probe；需要確認氣體、洩漏與反應產物，選 RGA；需要排放分子與處理效率，選 FTIR；需要非侵入密度趨勢，選微波干涉；需要 IEDF，選 RFEA。每個選擇還要回答取樣位置、時間解析度、校正方法、失效模式與量產維護責任。</p>
      <div class="table-wrap"><table><thead><tr><th>工程問題</th><th>第一工具</th><th>第二工具</th><th>不可只靠的訊號</th><th>放行證據</th></tr></thead><tbody>
      <tr><td>蝕刻率下降：自由基或離子？</td><td>OES actinometry</td><td>VI probe</td><td>source/bias setpoint</td><td>monitor wafer 速率與輪廓</td></tr>
      <tr><td>疑似空氣或水氣洩漏</td><td>RGA 多 m/z</td><td>OES OH/N2/O/H</td><td>單一 OH 線</td><td>leak check 與基礎壓力</td></tr>
      <tr><td>密度變化但局部探針不一致</td><td>微波干涉</td><td>多位置 Langmuir</td><td>單點 ne</td><td>空間模型與重複量測</td></tr>
      <tr><td>離子損傷增加</td><td>RFEA</td><td>VI 諧波與 wafer monitor</td><td>平均 bias 電壓</td><td>電性與材料損傷量測</td></tr>
      <tr><td>清潔效率與排放偏移</td><td>FTIR</td><td>OES/RGA</td><td>MFC 設定流量</td><td>排放質量平衡與腔體檢查</td></tr>
      </tbody></table></div>
      <p><strong>案例：同一 recipe 的蝕刻率下降 12%。</strong>第一步先鎖定量測系統，確認膜厚站、wafer 溫度、端點時間、氣體 lot 與產品結構沒有同時改變。第二步讀 OES：若 F/Ar actinometry 比值下降，而 Ar 絕對線與 VI 實功率大致穩定，假設偏向 F 供應、腔壁消耗或氣體組成；可檢查 MFC 實流量、clean seasoning、含水/含氧線與 chamber history。若 F/Ar 穩定但所有絕對線與 VI 實功率一起下降，假設偏向功率耦合或觀測鏈；先區分視窗污染與真實 ne 下降。</p>
      <p>第三種情況是 OES 比值與絕對強度近似穩定，但 VI 相位、阻抗或諧波偏離基線。此時自由基供應可能未變，離子能量或鞘層波形卻改變；應檢查匹配網路、接地回路、電極溫度、沉積膜與 bias delivery。第四種情況是 OES 與 VI 都穩定，蝕刻率仍下降，則把注意力移向晶圓表面：溫控、背氦、前處理、遮罩、膜質、聚合物收支或量測站。這個分支設計的重點是每一步都能被第二項證據反駁。</p>
      <p>量產使用時，不應讓模型直接寫 recipe。正確流程是：定義健康基線與允許區間；保存 raw spectrum、比值、VI 原始特徵和設備狀態；以 monitor wafer 或產品 metrology 建立結果關聯；在足夠 lot 與 chamber 狀態下驗證誤報、漏報和漂移；建立警報後的 hold、複測、工程判讀與解除規則。本站 A26/A27 的原子波長為 <code>nist-line-verified</code>，分子帶仍為 <code>pending-source-review</code>；所有 relativeIntensity 數值仍是教學權重，不能作為第三方認證、設備規格或產品放行標準。</p>
      <p>最後要保留不確定度與替代解釋。OES 比值穩定不代表濃度必然穩定，因為兩條線可能同時受未建模機制影響；VI 穩定不代表晶圓面的 IEDF 完全相同；探針在一個位置量到的 Te 也不代表整片晶圓。高品質診斷不是永遠給出唯一答案，而是以最少測試排除最多假設，明確寫出剩餘風險，並讓下一班工程師能重現判讀。</p>`
    }
  ],
  callouts: [
    { type: "intuition", title: "工程師直覺", body: "先寫出兩個互斥假設，再問哪個量測能讓它們得到不同結果。診斷不是收集更多訊號，而是設計能反駁假設的證據。" },
    { type: "warning", title: "來源與模型界線", body: "13 條原子譜線為 nist-line-verified，Br 兩條線為 Br II；分子帶仍為 pending-source-review。relativeIntensity 是本站教學權重，不是 NIST 相對強度資料。A26/A27 只用於因果教學，不是設備規格或量產放行工具。" },
    { type: "misconception", title: "常見誤解", body: "OES 強度上升不等於物種濃度等比例上升；Langmuir 分析器輸出數字也不等於掃描範圍、表面狀態與 RF 補償已經有效。" }
  ],
  labs: [
    {
      id: "a26",
      title: "A26 Langmuir 探針 I-V",
      module: "/assets/js/labs/a26-langmuir-probe.js",
      observation: [
        "在線性 I-V、半對數與 EEDF 三視圖切換，確認同一組掃描資料回答不同分析問題。",
        "提高 RF 振幅，比較分析所得 Vp、Vf、Te 與真值誤差，說明純指數模型為何只支持電位嚴重偏移。",
        "提高鍍膜比例，觀察電流尺度與 ne 誤差；記錄曲線仍平滑時為何不能直接相信密度。"
      ]
    },
    {
      id: "a27",
      title: "A27 OES 光譜與 actinometry",
      module: "/assets/js/labs/a27-oes.js",
      observation: [
        "切換五種製程，從 22 線 stick spectrum 找出主要物種與 Ar actinometry 參考線。",
        "提高功率與降低視窗透光率，比較 F 絕對強度、正確 F/Ar 比值及相對變化。",
        "切換錯誤 F/Si 模式，確認激發閾值差距過大時比值對功率與 Te 更敏感。"
      ]
    }
  ],
  selfCheck: [
    ["為什麼量產最常用的診斷不一定是物理上最直接的工具？", "量產還必須考慮侵入性、污染、可維護性、逐片取樣與校正成本。Langmuir 探針直接但侵入，OES 與 VI probe 間接卻能長期線上監控。"],
    ["Langmuir I-V 的 Vf、Te、Vp、ne 分別如何取得？", "Vf 由 I=0 零交越，Te 由扣除離子基線後 ln(Ie)-V 斜率倒數，Vp 由 dI/dV 最大轉折，ne 由飽和電流、Bohm 速度、面積與 Te 反推。"],
    ["A26 為何不呈現 RF 未補償使 Te 高估兩倍？", "純指數過渡區的 RF 週期平均只乘上一個與 V 無關的因子，所以半對數斜率近似不變；模型只能誠實呈現 Vp/Vf 嚴重偏移。"],
    ["探針鍍膜為什麼可能產生看似合理但錯誤的 ne？", "鍍膜降低有效導電面積和電流尺度，曲線形狀仍可能平滑；若分析仍用原始面積，就會把面積損失誤判成密度下降。"],
    ["本站 spectra 的 nist-line-verified 與 pending-source-review 有何差別？", "前者是 13 條原子線已逐線對應 NIST Handbook 強線表；後者是分子帶教學位置尚待適當分子光譜來源審查。Br 470.492 與 478.548 nm 必須讀作 Br II。"],
    ["Actinometry 的三個前提是什麼？", "內標比例低且穩定、不擾動電漿；分析線與參考線激發閾值接近；兩條線以可比較的直接電子激發為主。"],
    ["為什麼共同視窗污染在本站模型中可由比值抵消，實機仍需驗證？", "模型把透光率視為所有波長共用倍率；真實沉積膜與儀器響應可能隨波長不同，兩條線不一定等比例衰減。"],
    ["蝕刻率下降時，OES 與 VI probe 如何形成雙工具診斷？", "OES actinometry 主要檢查物種與自由基趨勢，VI probe 檢查功率耦合、阻抗與鞘層非線性；兩者分支後再用晶圓量測與設備檢查確認。"]
  ],
  readings: [
    "Lieberman and Lichtenberg, Principles of Plasma Discharges and Materials Processing, plasma diagnostics chapters.",
    "Hutchinson, Principles of Plasma Diagnostics, probe theory and measurement uncertainty.",
    "NIST Handbook of Basic Atomic Spectroscopic Data, element strong-line tables; 13 條 Plasma Academy 原子線為 nist-line-verified，Br 470.492/478.548 nm 為 Br II。",
    "設備供應商核准的 OES、VI probe、RGA、FTIR 與 RF 補償操作及校正程序。"
  ]
};
