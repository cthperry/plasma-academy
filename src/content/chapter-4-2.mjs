export const chapterFourTwo = {
  id: "4-2",
  route: "/level/4/4-2-endpoint-control/",
  title: "4.2 終點偵測與先進製程控制",
  hours: 2.5,
  prerequisites: ["3.1 蝕刻輪廓工程", "3.6 均勻度、PM 與腔體記憶", "4.1 電漿診斷"],
  objectives: [
    "由膜厚、速率分佈、選擇比與允許殘留，計算 timed etch 的主蝕刻、終點確認與 over-etch 邊界。",
    "依 OES 產物下降與反應物上升建立雙訊號端點規則，並用四級開口率判斷訊號是否可識別。",
    "用 IEP 的條紋週期 lambda/(2n) 反推膜厚與速率，說明其不依賴產品開口率但仍受光學條件限制。",
    "比較原始閾值、移動平均、一階微分與歸一化四種端點演算法，設計視窗污染的監控與復歸方法。",
    "區分 R2R、EWMA、FDC 與 VM 的控制責任，寫出模型失效時的 hold、確認、復歸與人工覆核界線。"
  ],
  summary: "終點不是一個漂亮的訊號轉折，而是把欠蝕、下層損失與設備漂移轉成可驗證的停止規則。Timed etch 必須以速率與膜厚分佈計算最壞情境；OES 應同時觀察產物下降及反應物上升，且開口率低於 0.1% 時通常不再具有足夠 SNR。IEP 以每一條紋對應 lambda/(2n) 的膜厚變化取得即時厚度，不依賴產品反應面積，但需要透明、平坦且可觀測的區域。量產演算法須保存原始訊號、濾波與觸發版本，並把視窗透光率、基線、延遲與假端點納入驗證。R2R/EWMA 補償慢漂，FDC 偵測異常，VM 預測量測結果；三者都不能在未驗證範圍內自動掩蓋突變或取代實際量測。",
  sections: [
    {
      id: "timed-etch-boundary",
      title: "Timed etch：先建立可計算的無感測基準",
      body: `<p>固定時間蝕刻不是低階做法，而是所有端點策略都必須比較的基準。若進料膜厚為 <code>H</code>、實際局部蝕刻率為 <code>R</code>，理想清除時間是 <code>t=H/R</code>；量產不能只代入平均值，必須使用最厚位置、最低可接受速率、啟動暫態與量測不確定度。假設膜厚中心值 1000 nm、片內與片間上限 1060 nm，健康速率 100 nm/min 但允許降至 92 nm/min，最慢位置至少需要 11.52 min。若 recipe 只用平均值算 10 min，即使平均 wafer 看似完成，低速區仍可能留下超過 100 nm 殘膜。</p>
      <p>Timed etch 應拆成 main etch、endpoint window 與 over-etch。Main etch 在高效率條件下接近界面；endpoint window 降低取樣誤判或步驟切換延遲；over-etch 以較高選擇比清除最慢位置。Over-etch 百分比常寫成 <code>(t_total-t_nominal)/t_nominal</code>，但百分比本身沒有安全意義。必須同時計算下層損失 <code>loss=R_stop*t_over</code>、遮罩消耗、CD 漂移、側壁轟擊與充電劑量。把 20% over-etch 套到所有產品，等於假設所有 stop layer、圖形密度與局部速率都相同。</p>
      <div class="table-wrap"><table><thead><tr><th>輸入</th><th>最低要求</th><th>替代解釋</th><th>確認方式</th></tr></thead><tbody>
      <tr><td>進料膜厚</td><td>片內 map、片間與 lot 間分佈</td><td>膜厚站 offset 或材料折射率改變</td><td>標準片、第二量測法、量測系統分析</td></tr>
      <tr><td>蝕刻率</td><td>跨 PM、seasoning、產品密度與 wafer position</td><td>量測 recipe 或殘膜使速率被低估</td><td>短時間 split、截面與完整去膜確認</td></tr>
      <tr><td>選擇比</td><td>主蝕刻與 over-etch 分開量</td><td>blanket coupon 不代表圖形底部</td><td>圖形 test vehicle、stop loss map</td></tr>
      <tr><td>切換延遲</td><td>感測、PLC、gas settling 與 RF ramp 總延遲</td><td>畫面時間戳與設備時鐘未同步</td><td>原始 trace 與硬體事件時間對齊</td></tr>
      </tbody></table></div>
      <p>需要終點的真正原因，是 <code>H</code> 與 <code>R</code> 會隨入料、腔壁、零件壽命、開口率、溫度及 loading 改變。端點讓停止時間跟著可觀測的材料轉換走，卻不能消除所有分佈：OES 看的是腔體積分訊號，最先清完的區域可能主導轉折，最慢角落仍有殘留。因此端點後通常仍保留經過材料損失驗證的 over-etch，而不是訊號一變就立即關電。</p>
      <p>工程放行要先寫出無端點時仍可安全生產的 fallback。包括最大允許 timed value、使用哪一版速率基線、何種 chamber state 可套用、何時必須跑 monitor wafer，以及感測器失效後禁止自動延長的上限。若 endpoint sensor 壞掉時操作員只能臨時猜一個時間，代表策略尚未完成。反過來，若 timed baseline 已顯示最慢位置清除會超出 stop-layer budget，就算端點曲線很清楚，該製程窗仍不具量產性。</p>`
    },
    {
      id: "oes-endpoint-signals",
      title: "OES 終點：產物下降、反應物上升與雙訊號證據",
      body: `<p>OES 終點利用界面切換前後的氣相組成變化。正在蝕刻目標膜時，揮發產物持續進入電漿；目標膜清除後，產物來源下降，而原本被表面消耗的反應物可能上升。單一強度同時受物種濃度、電子密度、EEDF、光路與視窗透光率影響，因此較穩健的規則會同時監控一條產物線與一條反應物線，或取兩者比值，再要求變化持續一段確認時間。</p>
      <div class="table-wrap"><table><thead><tr><th>製程</th><th>產物或消耗訊號</th><th>界面預期</th><th>交叉訊號</th><th>主要歧義</th></tr></thead><tbody>
      <tr><td>SiO2 接觸孔</td><td>CO 483 nm</td><td>產物下降</td><td>F 或含氟反應物上升</td><td>光阻與腔壁也會供應 CO</td></tr>
      <tr><td>Poly-Si 蝕刻</td><td>Si 288 nm 或 SiCl 帶</td><td>產物下降</td><td>Cl 837 nm 上升</td><td>腔壁沉積膜釋放 Si/Cl</td></tr>
      <tr><td>光阻灰化</td><td>CO 483 nm、OH 309 nm</td><td>有機產物下降</td><td>O 線恢復</td><td>水氣與載具有機物形成長尾</td></tr>
      <tr><td>SiN 蝕刻</td><td>CN 387 nm</td><td>產物下降</td><td>F/Cl 反應物上升</td><td>光阻或有機 ARC 也提供 CN</td></tr>
      <tr><td>NF3 腔體清潔</td><td>SiF/Si 類產物</td><td>清除接近完成時下降</td><td>F 訊號上升</td><td>不同腔區清除時間不一致</td></tr>
      </tbody></table></div>
      <p>訊號規則必須明示方向、基線窗、觸發門檻、最短 recipe 時間、確認時間與失效狀態。例如先用點火後 5 至 15 秒建立局部基線，main etch 的前 70% 禁止觸發；進入搜尋窗後，要求正規化 CO 低於移動基線 3 個標準差，同時 Cl 高於 2 個標準差，並持續 1.5 秒。這些數字不是跨機通用答案，而是說明規則要能被重播。若只寫「CO 掉下來就 endpoint」，任何 spike、光纖鬆動或 step transition 都可能誤停。</p>
      <p>雙訊號仍不是絕對證據。CO 下降且 Cl 上升可能真的代表 SiO2 或 poly 清除，也可能是 source power 降低後產物激發變弱、氣體流量切換、壓力控制暫態，或視窗膜造成波長相依衰減。應同步檢查 forward/delivered power、pressure、flow actual、throttle、VI 與 recipe step。若只有 OES 改變而設備訊號穩定，材料轉換假設較強；若所有光譜線一起縮小，先查光路或電子激發，而不是宣告所有物種同時消失。</p>
      <p>產品驗證至少包括三種 split：不同進料膜厚驗證觸發時間會按厚度移動；不同產品開口率驗證振幅與 SNR；刻意改變小幅速率驗證終點能追隨實際時間。每次 split 都要以殘膜、stop loss、CD/profile 與 electrical 結果對齊。若端點時間與膜厚無關、只跟固定 recipe 秒數一致，演算法可能在抓設備暫態；若曲線轉折清楚但截面仍殘留，量到的可能是大面積 monitor pad，而不是最慢產品結構。</p>
      <p>保存 raw spectrum 比只保存 endpoint timestamp 更重要。原始資料讓工程師在演算法更新後重播舊 wafer、估計假陽性與漏報，並區分感測器退化和製程漂移。量產記錄至少含波長通道、暗訊號、積分時間、飽和旗標、視窗/光纖識別、演算法版本、觸發前後曲線、recipe step 與設備時鐘。沒有這些欄位，事後看到端點漂移只能猜測。</p>`
    },
    {
      id: "open-area-snr",
      title: "四級開口率：從可見訊號到 OES 不可識別",
      body: `<p>產品造成的 OES 變化量近似正比於暴露反應面積，也就是開口率；背景發光、讀出雜訊、腔壁反應與 RF 波動卻不會同比縮小。當 open area 從 20% 降到 0.02%，產品貢獻可縮小一千倍，endpoint step 可能完全埋在背景變異內。增加顯示器的 y 軸放大不會增加資訊，只有提高有效光子數、降低噪聲、加入獨立特徵或改用不同物理原理才可能改善可識別性。</p>
      <div class="table-wrap"><table><thead><tr><th>開口率</th><th>OES 判定</th><th>可接受策略</th><th>必要驗證</th></tr></thead><tbody>
      <tr><td>&gt; 10%</td><td>訊號通常明確</td><td>雙線比值、簡單濾波與持續時間</td><td>跨膜厚、跨 PM 的殘膜與 stop loss</td></tr>
      <tr><td>1-10%</td><td>需要演算法輔助</td><td>移動平均、一階微分、樣板比對</td><td>噪聲注入、門檻敏感度與誤報率</td></tr>
      <tr><td>0.1-1%</td><td>困難</td><td>高通量光學、較長積分、多變量 PCA/PLS</td><td>獨立 lot、不同 chamber 與低 SNR 壓力測試</td></tr>
      <tr><td>&lt; 0.1%</td><td>OES 基本失效</td><td>IEP、RF 阻抗、質譜，或 timed + R2R</td><td>證明替代訊號與實際清除同步</td></tr>
      </tbody></table></div>
      <p>四級表是方法選擇的起點，不是設備保證。光學 étendue、光譜儀狹縫、積分時間、波長響應、背景物種與 endpoint contrast 都會移動實際門檻。高解析度可分離重疊線，卻可能因狹縫變窄而損失光子；延長積分時間可改善 shot-noise SNR，卻會把快速轉折平均掉並增加控制延遲。每一次改善都有時間解析度或穩健性的代價，必須用實際產品與最短可接受 over-etch window 驗證。</p>
      <p>可用性應由檢出能力量化。先在無界面變化的健康區段估計背景標準差 <code>sigma</code>，再用終點前後平均差 <code>delta</code> 建立 <code>SNR=delta/sigma</code>。還要報告觸發誤差分佈、漏報率與假報率，而不是只展示一條代表性 golden curve。若 delta 只有 1.2 sigma，某次恰好抓到正確秒數不代表可量產；門檻稍移或噪聲稍增就會失效。模型訓練與性能評估必須分開 wafer，否則只是記住自己的樣板。</p>
      <p>PCA 或 PLS 可把數百個波長通道壓縮成少數特徵，利用多條微弱但相關的變化提高統計能力。PCA 尋找資料變異最大的方向，不保證最大變異就是 endpoint；若腔體暖機或視窗漂移比產品訊號大，第一主成分可能只代表設備歷史。PLS 使用膜厚或 endpoint label 建立監督模型，較能對準目標，但更容易受到錯誤標籤、產品族群與訓練範圍影響。兩者都需要版本化前處理、獨立驗證、漂移監控與可退回的簡單基線。</p>
      <p>低開口率產品應在開發早期預留 endpoint monitor 結構或替代策略，而不是量產前才要求 OES 解決物理上不存在的訊號。大面積透明 pad 可供 IEP 使用，RF/VI 可監控整體負載轉換；若兩者都無法對應產品最慢區，則以 blanket/圖形速率模型、進料膜厚與 EWMA 更新 timed recipe。重要界線是：<strong>低於 0.1% 時，系統應明確標記 OES 不可靠，而不是永遠輸出一個看似精確的時間。</strong></p>`
    },
    {
      id: "interferometric-endpoint",
      title: "IEP：以 lambda/(2n) 條紋量即時厚度與速率",
      body: `<p>干涉式終點 IEP 將雷射或白光照到透明膜，上表面與下界面的反射光因光程差形成相長、相消。近正入射時，膜厚每改變 <code>Delta d=lambda/(2n)</code> 就完成一個條紋週期；<code>lambda</code> 是真空波長，<code>n</code> 是膜在該波長的折射率。若使用 633 nm 光源、SiO2 的 n 約 1.46，一個完整週期對應約 217 nm 厚度。30 秒內完成一週期，局部平均速率約 434 nm/min。工程上應保留波長、n 的來源、入射角與溫度條件，不能只報條紋數。</p>
      <p>IEP 的訊號來自光學 pad 或足夠大的膜面，不以實際蝕刻開口面積產生反應物，所以產品 open area 從 20% 降到 0.02% 時，條紋振幅原理上不按比例消失。這使它成為低開口率接觸孔的重要替代方案。它量到的是光斑位置的光學厚度，不自動代表全片最慢位置、圖形孔底或不同密度區。Monitor pad 的局部速率若與產品存在 microloading 差異，endpoint 可以非常精確地停止在錯誤的產品狀態。</p>
      <p>膜需在量測波長具有足夠透光與反射界面，表面也要在光斑尺度內近似平坦。圖形散射、表面粗化、多層膜的多重反射、光阻吸收、晶圓振動、ESC 高度變化與視窗積膜都會降低條紋對比。Poly-Si 是否可用取決於波長、摻雜與吸收，不能只因上游表格列為可行就假設所有 poly stack 都透明。白光反射可同時擬合多波長與多層厚度，但模型參數與計算治理也更複雜。</p>
      <p>端點演算法不應直接讀取 recipe 中的預定終點。可驗證流程是先從實際反射序列偵測峰、谷或零交越，估計週期與相位，再由已知起始厚度、目標剩餘厚度及條紋計數推算停止點。若反射序列為 NaN、飽和、振幅低於門檻或週期不一致，系統必須回報不可用並切換 fallback，不能仍回傳預定秒數。用真值欄位產生完美答案只是在繪圖，不是訊號分析。</p>
      <p>驗證 IEP 要刻意改變三件事。第一，改變 open area 而保持 pad 相同，確認條紋檢出不受產品反應面積直接縮放；第二，改變膜厚與速率，確認條紋數及週期按 <code>lambda/(2n)</code> 移動；第三，降低對比、加入散射或遮斷光路，確認系統拒絕輸出。最後用多點膜厚 map、截面與產品 electrical 對齊 pad endpoint，建立 pad-to-product offset 及其適用產品族群。</p>
      <p>IEP 的量產優勢是同時提供厚度與速率趨勢，可在真正 endpoint 前發現速率變慢；但控制動作仍需加上上下限。若即時速率突然變成負值、條紋週期跳變或預測時間超過 timed safety cap，應 hold 而不是無限延長。量測區遭微粒遮蔽或晶圓 notch 定位偏移時，也應由反射品質指標先判 invalid。高解析的厚度數字不能取代訊號品質旗標。</p>`
    },
    {
      id: "alternative-endpoints",
      title: "其他端點：RF 阻抗、Vdc、質譜與多原理選擇",
      body: `<p>RF 諧波或阻抗端點利用材料界面、反應面積與表面阻抗改變電漿負載。VI probe 可量 voltage、current、phase、實功率、阻抗與高次諧波；金屬暴露、聚合物清除或表面導電性改變時，match network 看到的等效負載可能產生可重現轉折。這類訊號不直接按 OES 的產品發光面積縮放，適合弱光或低開口率情境，但它是整體電氣回應，也可能對 RF generator、匹配動作、接地、腔壁膜與溫度更敏感。</p>
      <p>偏壓電壓端點觀察 <code>Vdc</code> 或 electrode voltage 的微小改變，設備成本低，卻容易被 source/bias 功率控制、電子密度、ESC capacitance 與 match state 混淆。若 generator 以 delivered power 閉迴路，界面轉換可能被 match network 的動作部分抵消；此時單看 Vdc 不如聯合 voltage、current、phase 與 capacitor position。任何 RF endpoint 都要固定取樣位置與校正，跨機不能只比同名 tag。</p>
      <p>質譜端點由 RGA 或 process mass spectrometer 直接看反應物和揮發產物的 m/z。它對不發光物種有優勢，也能區分 OES 激發率與真實組成，但存在碎裂重疊、旁路取樣延遲、壁面吸附與壓力轉換。CO 與 N2 都可能貢獻 m/z 28，單一質量下降不能唯一指向產品清除；應用多個 fragment ratio、背景譜與已知氣體校正。控制延遲必須包含氣體從晶圓到取樣口及 analyzer 的 response time。</p>
      <div class="table-wrap"><table><thead><tr><th>方法</th><th>直接敏感量</th><th>適合情境</th><th>首要失效模式</th><th>必要交叉確認</th></tr></thead><tbody>
      <tr><td>OES</td><td>激發態發光與產物/反應物</td><td>高至中開口率、快速逐片</td><td>低 SNR、視窗污染、EEDF 改變</td><td>VI/設備訊號與殘膜</td></tr>
      <tr><td>IEP</td><td>光學厚度與速率</td><td>透明膜、低開口率、monitor pad</td><td>散射、吸收、pad-to-product 偏差</td><td>膜厚 map 與圖形截面</td></tr>
      <tr><td>RF/VI/Vdc</td><td>電漿負載與鞘層電氣特徵</td><td>金屬、弱光、整體界面變化</td><td>match、接地、腔壁狀態混淆</td><td>OES/IEP 或產品量測</td></tr>
      <tr><td>質譜</td><td>氣體組成與產物</td><td>非發光物種、研究與清潔</td><td>碎裂重疊與輸送延遲</td><td>多 m/z、背景與時間對齊</td></tr>
      <tr><td>Timed + R2R</td><td>前批結果與速率模型</td><td>所有線上訊號不可識別</td><td>突變、量測延遲、模型外推</td><td>週期 monitor 與 FDC interlock</td></tr>
      </tbody></table></div>
      <p>方法選擇必須問「哪個物理量在界面前後確實會變，而且變化大於感測鏈噪聲」。透明膜有 pad 時優先 IEP；金屬暴露造成明顯負載轉換時可選 RF；可揮發產物明確但 OES 線弱時可選質譜；完全沒有可識別線上轉折時就承認限制，採 timed + R2R。把多個低品質訊號塞進黑箱，不會自動形成高品質 endpoint。</p>
      <p>雙原理策略可降低共同失效。例如 OES 同時受光路與 EEDF，VI 不經光路；IEP 受 monitor pad 與散射，質譜看排出產物。若兩者在可接受時間窗內一致，才進入 over-etch；若不一致，依預先定義規則 hold 或採保守 timed cap。不能在異常發生後才挑一個比較符合預期的訊號，否則控制規則無法稽核。</p>`
    },
    {
      id: "algorithms-window-health",
      title: "四種核心演算法與視窗污染治理",
      body: `<p>端點演算法的第一責任是把原始資料轉成可重播的判準，而不是讓曲線看起來平滑。本章核心比較四種模式：<strong>原始閾值</strong>保留最快反應但最怕 noise 和 baseline drift；<strong>移動平均</strong>降低高頻波動但引入約半個窗口的群延遲；<strong>一階微分</strong>突出最大變化率，對 step endpoint 有效但會放大噪聲；<strong>歸一化</strong>用參考線或總強度消除共同增益漂移，卻可能把參考通道的變化注入結果。每種模式都要固定參數並報告延遲、誤差與失效旗標。</p>
      <div class="table-wrap"><table><thead><tr><th>模式</th><th>判準示例</th><th>優勢</th><th>主要代價</th></tr></thead><tbody>
      <tr><td>原始閾值</td><td>I 小於基線 70% 且持續 N 點</td><td>透明、延遲小</td><td>跨日基線與透光率漂移會移動門檻</td></tr>
      <tr><td>移動平均</td><td>窗口平均穿越動態門檻</td><td>壓低隨機噪聲</td><td>短暫真轉折被抹平，觸發變晚</td></tr>
      <tr><td>一階微分</td><td>dI/dt 最小且振幅超過門檻</td><td>對轉折時間敏感</td><td>噪聲、取樣間距與濾波決定峰值</td></tr>
      <tr><td>歸一化</td><td>Iproduct/Ireference 或 I/Itotal</td><td>抵消共同光路與增益</td><td>參考線受化學影響時產生假 endpoint</td></tr>
      </tbody></table></div>
      <p>實作順序應先做暗訊號與飽和檢查，再進行 baseline correction、濾波、特徵計算與狀態機。狀態機至少包含 arming、searching、candidate、confirmed、invalid 與 timeout。Candidate 必須在持續時間內同時滿足幅度與斜率；invalid 包括 NaN、飽和、光強低於可用門檻、取樣中斷及 recipe step 不一致。Timeout 到達 safety cap 時不能無限等待，應執行已驗證 fallback 或 hold。</p>
      <p>Savitzky-Golay 可在平滑時較好地保留斜率與峰形，但多項式階數和窗口仍會改變端點；二階微分可找轉折，對噪聲更敏感；樣板比對可使用整段 golden trace，卻容易把固定 recipe 暫態當成材料特徵。多變量 PCA/PLS 適合 0.1-1% 的困難區，仍不應越過 &lt;0.1% 的物理訊號限制。量產比較必須用同一批 raw trace 離線重播所有候選演算法，報告中位誤差、95 百分位誤差、假報、漏報與 stop loss，而非只挑最好的一片。</p>
      <p><strong>視窗污染是 OES 的頭號敵人。</strong>聚合物、SiOx、金屬或清潔副產物覆蓋觀測窗後，透光率逐日降低，且可能隨波長不同。原始閾值會因此延後或漏報；共同倍率可由比值部分抵消，但波長相依吸收、散射和薄膜干涉不能被單一 normalization 完全消除。較低 transmission 也會減少有效訊號，使非零讀出噪聲下的 SNR 下降；可靠度計算若只看 open area 而忽略 transmission，就會錯把嚴重污染標成可用。</p>
      <p>視窗治理應包含 purge curtain、shield 幾何、定期原位或離線清潔、標準光源 transmission check、暗訊號、全譜基線、清潔前後 acceptance 與 PM 壽命。清窗後不能直接沿用舊 baseline，因為光學耦合、安裝角度與透光率已改變；需跑 reference wafer 建立新基線並確認 endpoint-to-metrology 關聯。若只用 OES 自己判斷自己的視窗健康，會有循環論證，至少要加入標準光源、第二光路或與 VI/產品量測的獨立比較。</p>
      <p>演算法變更也應像 recipe 變更一樣治理。版本記錄要包含 source code/hash、參數、訓練資料範圍、適用產品、chamber/optic configuration、核准人與 rollback。上線前以歷史 raw trace shadow replay，不讓新版本直接控制；通過後先以 advisory mode 比較，再逐步開啟自動停止。任何人工 override 都要記錄理由與 wafer disposition，否則模型會在沉默中掩蓋硬體問題。</p>`
    },
    {
      id: "r2r-fdc-vm-production",
      title: "R2R、EWMA、FDC、VM 與量產控制界線",
      body: `<p>Run-to-Run 控制使用前一批或前一片的量測結果修正下一次 recipe。最簡單的時間控制可寫成：量到剩餘膜厚偏高，就增加下一片蝕刻時間；偏低或 stop loss 過大則縮短。這是一個離散回授系統，包含量測延遲、產品切換、chamber 漂移與控制增益。若 metrology 要到 lot 結束後才回來，控制器修正的是數片之前的狀態；增益過大會來回震盪，增益過小則追不上漂移。</p>
      <p>EWMA 以 <code>xhat_k=lambda*x_k+(1-lambda)*xhat_(k-1)</code> 更新狀態估計。較小 lambda 強調長期歷史、抗單點噪聲但反應慢；較大 lambda 快速追蹤、卻容易把一次量測誤差當成真漂移。它適合腔體結垢、零件緩慢消耗與 seasoning 漸變，不適合 MFC 卡住、wafer backside He leak、arc 或視窗突然遮蔽。突變應由 FDC interlock 攔截，而不是讓 EWMA 用幾片產品慢慢追上。</p>
      <p>FDC 收集每片完整時間序列，包括 pressure、flow actual、throttle、forward/reflected power、match position、Vdc、He leak、ESC temperature、OES、VI 與 valve events。特徵不只取平均值，還包括 step settling time、overshoot、斜率、面積、頻譜、跨訊號時間差與 recipe state。FDC 的任務是偵測和分類設備/製程行為偏離，不是直接證明 wafer 已超規。警報要連到 fault tree、確認步驟與 disposition；只有紅綠燈而沒有下一步，會造成 alarm fatigue。</p>
      <p>Virtual Metrology 使用感測器特徵預測 etch depth、CD、uniformity、殘膜或 stop loss，讓未實測 wafer 也有估計值。VM 必須同時輸出 prediction interval、資料品質與 applicability flag。產品、膜 stack、tool state、PM 版本或量測站變更超出訓練範圍時，應標示 out-of-domain 並要求實測。VM 可以提高抽樣密度，不能把稀少、偏斜或延遲的 metrology label 變成真實資料。</p>
      <div class="table-wrap"><table><thead><tr><th>層級</th><th>輸入</th><th>動作</th><th>不能掩蓋</th><th>量產保護</th></tr></thead><tbody>
      <tr><td>Endpoint</td><td>單片即時 OES/IEP/VI</td><td>停止或轉 over-etch</td><td>全片最慢區與 sensor invalid</td><td>quality flag、timeout、timed cap</td></tr>
      <tr><td>R2R/EWMA</td><td>前批結果與狀態估計</td><td>調下一批時間或有限參數</td><td>突變與錯誤量測</td><td>上下限、rate limit、產品分群</td></tr>
      <tr><td>FDC</td><td>設備完整 trace</td><td>偵測、分類、hold 或 advisory</td><td>未被量測的 wafer 缺陷</td><td>fault tree、誤報審查、復歸測試</td></tr>
      <tr><td>VM</td><td>FDC 特徵與歷史 metrology</td><td>預測 wafer 結果</td><td>模型外推與 label 偏差</td><td>不確定度、OOD、定期實測</td></tr>
      </tbody></table></div>
      <p>一個合理的量產階層是：設備 interlock 先保護人員與硬體；FDC 在 wafer 進程中偵測突變；endpoint 在有效訊號下控制單片停止；VM 提供結果預測；實際 metrology 校驗 VM 並餵給有限權限的 R2R。任何上層模型都不能解除下層 safety interlock。R2R 的可調範圍應受工程上下限、每次最大變更量與最小資料品質限制，且保留人工覆核和一鍵 rollback。</p>
      <p>部署前需用歷史與刻意故障資料回答：正常變異下會 hold 幾片；MFC drift、視窗污染、arc、pressure transient 與 endpoint loss 是否各被正確分類；VM 在跨 PM、跨 chamber、產品切換時偏差多少；EWMA 是否在慢漂中收斂而在 step fault 時停止更新。模型監控還要追 feature drift、residual、missingness、class balance 與 metrology delay。只監控預測平均誤差，可能漏掉某一個高風險產品族群已失效。</p>
      <p>量產界線應寫入控制計畫：哪些產品與 chamber state 已驗證、哪些 tag 缺失就禁止自動控制、endpoint 最長可延多少、R2R 每批最多改多少、何種 FDC 級別要 hold、VM 何時降級為 advisory、誰能解除、需要哪一片 monitor wafer 復歸。FDC 和 VM 的價值不是演算法名稱，而是讓異常在良率受損前產生可執行的證據，同時避免模型安靜地把硬體劣化補成一支越來越脆弱的 recipe。</p>`
    }
  ],
  callouts: [
    { type: "intuition", title: "工程師直覺", body: "先問產品造成的訊號變化是否大於感測鏈噪聲。若物理上不可識別，就更換量測原理或使用受控 timed + R2R，不要用更複雜的演算法製造虛假的精確時間。" },
    { type: "warning", title: "量產界線", body: "A28 是可重現的教學模型，不是設備端點認證。任何自動停止都需用實際產品驗證殘膜、stop loss、誤報、漏報、控制延遲與 sensor-invalid fallback。" },
    { type: "misconception", title: "常見誤解", body: "歸一化不能恢復已被視窗污染吃掉的光子，也不能保證參考線不受化學影響；FDC 正常亦不代表未量測的產品結果必然合格。" }
  ],
  labs: [
    {
      id: "a28",
      title: "A28 OES 終點訊號與干涉條紋",
      module: "/assets/js/labs/a28-endpoint.js",
      observation: [
        "以對數控制把開口率由 20% 降到 0.05%，比較 OES 的 SNR、可靠度與終點誤差，確認低於 0.1% 時系統不應假裝可用。",
        "在原始、移動平均、一階微分與歸一化模式間切換，記錄噪聲抑制、觸發延遲及視窗透光率下降造成的差異。",
        "保持膜厚、折射率與蝕刻率不變，只改開口率，確認 IEP 條紋週期與由 lambda/(2n) 推得的厚度不隨產品開口率縮小。"
      ]
    }
  ],
  selfCheck: [
    ["Timed etch 為何不能只用平均膜厚除以平均蝕刻率？", "平均值會隱藏最厚膜、最低局部速率、啟動延遲與量測不確定度。應以分佈邊界計算最慢清除時間，再確認 over-etch 造成的 stop loss、CD、遮罩與充電劑量仍在規格內。"],
    ["OES 終點為何通常同時監控產物下降與反應物上升？", "兩個方向相反且物理來源互補的訊號可降低單線受 EEDF、背景、視窗或非產品來源干擾的歧義；仍需與設備訊號及 wafer metrology 交叉確認。"],
    ["四級開口率對 OES 策略有何影響？", ">10% 通常清楚；1-10% 需濾波或樣板；0.1-1% 需高通量光學與多變量並嚴格驗證；<0.1% 時 OES 基本失效，應改用 IEP、RF、質譜或 timed + R2R。"],
    ["633 nm 光源觀察 n=1.46 的透明膜，一個 IEP 完整條紋約代表多少膜厚？為何它仍可能錯判產品？", "Delta d=lambda/(2n)，約為 217 nm。IEP 不依賴產品開口率，但量到的是光斑或 monitor pad；若 pad 與最慢圖形區有 microloading 差異，精確條紋仍可能不代表產品已清除。"],
    ["原始閾值、移動平均、一階微分與歸一化各自最主要的代價是什麼？", "原始閾值怕噪聲與漂移；移動平均引入延遲；一階微分放大噪聲；歸一化依賴參考通道穩定，且無法恢復低 transmission 下已損失的 SNR。"],
    ["R2R/EWMA 與 FDC 的責任有何不同？", "R2R/EWMA 用前批結果補償可預期慢漂；FDC 從設備時間序列偵測與分類異常，尤其攔截突變。不能讓 EWMA 用數片產品慢慢補償 MFC 卡住、arc 或感測器失效。"],
    ["VM 何時必須降級為 advisory 或要求實測？", "當產品、膜 stack、chamber/PM 狀態、感測器版本或 feature 分佈超出訓練範圍，資料缺失，預測區間過寬，或 metrology residual 持續偏移時，必須停止自動依賴並以實測復歸。"]
  ],
  readings: [
    "Lieberman and Lichtenberg, Principles of Plasma Discharges and Materials Processing, endpoint and plasma-surface interaction chapters.",
    "SEMI E133 and equipment-supplier approved process control, FDC, endpoint and data collection specifications.",
    "設備供應商核准的 OES、IEP、VI probe、質譜校正、觀測窗清潔與 endpoint qualification 程序。",
    "廠內 R2R、EWMA、FDC、VM 模型治理、變更控制、wafer disposition 與復歸規範。"
  ]
};
