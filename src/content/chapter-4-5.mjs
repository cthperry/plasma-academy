const modelReviewAppendix = [
  ["問題與輸出", "先把需求寫成可推翻的問題，並指定模型必須輸出的物理量、空間/時間尺度與產品 CTQ。只說要一張 plasma map 或最佳 recipe，無法判斷模型層級與驗證資料。"],
  ["輸入版本", "記錄幾何、parts、wall state、氣體、pressure、absorbed power、溫度、碰撞截面、reaction set 與表面係數的來源和版次；輸入缺一項，就應標示結論可能受何種漂移影響。"],
  ["數值守恆", "0-D 檢查粒子/能量收支；流體檢查網格與邊界；PIC-MCC 檢查粒子數、random seed、time step、統計誤差與電荷守恆；profile 檢查 mesh、時間步進與幾何守恆。"],
  ["獨立校正", "用未參與擬合的 VI、OES、rate、map、截面或表面資料驗證趨勢。若同一張 SEM 同時用來調參和評分，只能說模型重現了校正樣本。"],
  ["內插與外推", "把已校正範圍和欲決策範圍並列；材料、腔體、壓力、功率或 wave form 超出範圍時，輸出僅是實驗排序假說，不能做產品放行。"],
  ["封裝材料", "RDL/UBM/Cu 的氧化、pad edge 與 roughness，PI/PBO/mold compound 的交聯、吸濕、filler 與 outgassing，以及 low-k 的多孔化學都要列為模型未必涵蓋的邊界。"],
  ["表面驗證", "對低損傷清潔，同時以表面化學、氧化狀態、粗糙度、離子殘留、接觸或接合與老化確認；radical flux 或 ion dose 的預測不能直接等同 cleanliness 或 bond yield。"],
  ["時間對齊", "將量測時間、RF phase、閥門/壓力暫態、sample queue 與模型輸出時間基準對齊。把 steady-state simulation 與包含點火或 clean 後 first wafer 的資料直接比較，會把暫態誤當反應係數錯誤。"],
  ["不確定度傳遞", "對 collision cross section、sticking、wall loss、溫度和幾何誤差做敏感度或區間掃描，說明哪個輸入決定結論。輸出只有單一曲線而未附不確定度，無法判斷兩個 recipe 是否真正可區分。"],
  ["資料切分", "將校正、開發、獨立驗證與失敗案例分開保存，並防止同 wafer、同 lot 或同一重複 run 同時落入訓練與評估。否則看似精準的模型可能只是在記住腔體特定狀態。"],
  ["決策稽核", "每次模型建議的實驗都要回填預測方向、實際結果、是否支持、下一步與停止線。這讓模型的價值可由排除假說的效率評估，而不是由視覺化效果或參數數量評估。"],
  ["維護後重驗", "parts、clean、seasoning、感測器校正或材料供應改變時，重新確認模型的邊界與關鍵輸入。若 reference wafer 已顯示 map 或 rate signature 變化，舊模型不可繼續作為自動補償依據。"],
  ["可重播交付", "交付模型時封存 input deck、程式與資料版次、設定檔、raw output、後處理腳本、random seed 或求解器設定，以及每張比對圖的來源。閱讀者應能在不依賴口頭說明下重跑關鍵案例，辨識哪些差異來自模型更新、哪些來自實驗材料或量測流程。"],
  ["責任範圍", "每個模型結論都標示可支持的決策、不可支持的決策與負責確認的量測角色。這可避免趨勢模型被誤當產品規格或安全核准依據。"],
  ["版本退回", "若新 reaction set、mesh 或表面係數使已驗證案例退步，保留舊版輸出與差異原因；不可只覆寫結果並宣稱模型自然進步。"],
  ["失配處置", "模型與實驗分離時，先查 sample history、座標、MSA、時間對齊、壁面和表面狀態，再做敏感度分析與小 split。禁止只調一個係數使平均值吻合後忽略其他輸出。"]
].map(([topic, control]) => `<p><strong>${topic}</strong>：${control}</p>`).join("");

export const chapterFourFive = {
  id: "4-5",
  route: "/level/4/4-5-plasma-modeling-data/",
  title: "4.5 電漿模擬與資料可信度",
  hours: 2,
  prerequisites: ["2.3 電子能量分佈", "2.4 鞘層物理進階", "4.1 電漿診斷"],
  objectives: [
    "選擇 0-D、流體、PIC-MCC 與 profile evolution 四層中能回答問題且可驗證的模型。",
    "由 0-D 粒子與能量平衡說明 Te 對功率不必然線性、ne 對吸收功率常呈近似線性趨勢的條件與限制。",
    "審查碰撞截面、reaction set、表面係數、量測與封裝材料資料的來源、版本與可信度。",
    "把模擬輸出轉成受控的產品、HAR 與低損傷封裝清潔驗證計畫。"
  ],
  summary: "模型不是精確數字製造器，而是用明確假設排除機制與安排實驗的工具。0-D 全域模型以整腔平均的粒子與能量平衡快速預測 ne、Te 和物種趨勢；在固定幾何、氣體與損失模型下，Te 常主要由粒子平衡與有效碰撞條件決定，而 ne 對吸收功率常呈近似線性，但兩者都會因表面、模式或 EEDF 改變而偏離。流體模型提供空間分佈，PIC-MCC 保留動力學與鞘層細節，profile evolution 將通量、能量和表面反應轉成形貌。四層必須以可追溯資料、量測和材料邊界連結；這對 RDL/UBM/Cu、PI、mold compound 和 low-k 的低損傷清潔尤為重要。",
  sections: [
    section("four-model-layers", "四層模型：問題尺度決定可信輸出", `<p>四個層級回答不同問題。<strong>0-D 全域模型</strong>把腔體視為平均體積，適合快速比較壓力、功率、流量或氣體組成對 ne、Te、物種密度和 wall loss 的趨勢。<strong>流體模型</strong>求解連續、動量、能量與電場方程，適合看 showerhead、pump、電極或溫控造成的空間不均勻。<strong>PIC-MCC</strong>追蹤代表性粒子與蒙地卡羅碰撞，能解析非 Maxwellian EEDF、鞘層與 IEDF，但計算成本與幾何限制較高。<strong>profile evolution</strong>把通量、角度、能量與表面反應帶到 feature 尺度，預測 CD、taper、bowing、ARDE 或局部 charging。</p><table><thead><tr><th>層級</th><th>優勢</th><th>不可直接保證</th><th>最小驗證</th></tr></thead><tbody><tr><td>0-D</td><td>快速趨勢、物種收支</td><td>局部 map、鞘層角度</td><td>密度/光譜 proxy 與 rate 趨勢</td></tr><tr><td>Fluid</td><td>空間均勻度、流場</td><td>任意 EEDF 的動力學</td><td>map、pressure/flow 與 probe/OES</td></tr><tr><td>PIC-MCC</td><td>IEDF、EEDF、sheath</td><td>全腔快速產能預測</td><td>VI、IEDF proxy 與局部損傷</td></tr><tr><td>Profile</td><td>圖形演化與表面反應</td><td>未校正材料的絕對 CD</td><td>多 AR 截面與時間序列</td></tr></tbody></table><p>選錯層級是最常見錯誤：用 0-D 的平均 Te 解釋 edge ring，或用漂亮 profile 動畫掩蓋未知 IEDF/表面係數。更好的流程是用 0-D 篩選趨勢、以流體或量測定位空間來源、用 PIC-MCC 檢驗鞘層假說，再用 profile 對最差幾何產生可反駁預測。不是每個問題都需要最高成本模型。</p>`),
    section("zero-d-balance", "0-D 粒子與能量平衡：Te 與 ne 的條件式結論", `<p>0-D 的粒子平衡可概念化為電子造成的 ionization/解離產生，等於離子、電子與反應物經 wall、pump 或體相反應的損失。以符號表示，可寫成與 <code>k_iz(Te) ne ng V</code> 有關的產生項，對上由 Bohm flux、有效面積、擴散與抽氣決定的損失項。因 ionization rate coefficient 對 Te 很敏感，在幾何、壓力、氣體與損失模型固定時，平衡常將 Te 鎖在足以補償損失的範圍；增加 absorbed power 時，系統較常透過提高 ne 承擔更多能量，而非讓 Te 無限制上升。</p><p>能量平衡把 absorbed power 分配到電子碰撞的電離、激發、解離、彈性損失，以及電子和離子帶到壁面的能量。在假設不變時，power 增加會使產生率與 ne 常呈近似線性關係，這是工程上「加功率主要加密度」的有用起點。它不是定律：EEDF、表面二次電子、電磁耦合模式、氣體加熱、反應機制、pressure、wall condition 或 power deposition 位置改變時，Te 與 ne 都可能非線性甚至跳變。</p><p>因此報告應寫成條件式結論，例如「在本機制、幾何、壓力與校正範圍內，模型預測 Te 對此功率 sweep 變化小於 ne 的相對變化」，並用診斷 proxy、OES actinometry、VI、Langmuir/probe 的適用量測或 wafer result 驗證。若 simulation 只輸入 generator setpoint 而非 absorbed power，還需量或估計反射、match 與耦合改變；否則宣稱 ne 對功率線性沒有物理基礎。封裝 remote clean 中的 polymer outgassing 與多材料壁面耗損更可能改變平衡，不可直接套用 Si process 的表面係數。</p>`),
    section("fluid-pic-profile", "Fluid、PIC-MCC 與 Profile：從腔體到特徵的交接", `<p>流體模型將電子、離子與中性物種視為連續場，可連接電場、流場、熱與反應，適合回答 center/edge、方位不對稱、showerhead 或 pump port 是否足以造成 map signature。其 closure 常假設 EEDF 形狀或局部平衡，在低壓、強 RF 或鞘層附近可能不充分。PIC-MCC 則以粒子軌跡和碰撞統計求 EEDF、IEDF、角度與鞘層瞬態，特別適合檢驗 bias waveform、off-phase、負離子和 charging 假說；代價是收斂、雜訊、網格與時間步長的治理。</p><p>Profile evolution 不能自行發明上游通量。它需吃進通量、能量、角度、自由基組成、surface sticking、反應機率、再沉積與 charging 模型，才用 level-set、cellular 或 string 類方法演化 feature。若輸入 IEDF 只是一個平均能量、側壁係數由單張 SEM 擬合，輸出的 bowing 或 taper 只能視為情境圖。正確驗證用不同 AR/CD/density、不同深度與 wafer 位置的截面來檢查模型是否同時預測趨勢，而不是用同一張校正圖再次打分。</p><p>對封裝表面，model handoff 更困難。RDL/UBM/Cu pad 的幾何、氧化層、粗糙度與邊緣場；PI/mold compound 的揮發、交聯與 filler；low-k 的多孔化學均可能使 wall/reaction coefficient 失效。可先用 fluid 或 global 模型比較 remote clean 的供應和熱趨勢，以 PIC-MCC 檢查 ion exposure 的相對差異，但最後仍要用 XPS/ToF-SIMS、ellipsometry/FTIR、roughness、接觸或接合與可靠度來閉環。</p>`),
    section("data-provenance", "資料來源、反應集與可信度：模型好壞從輸入開始", `<p>碰撞截面決定電子如何把能量轉成 ionization、dissociation、excitation 與動量傳輸；reaction set 決定物種收支；表面係數決定自由基被消耗、產物脫附、壁面復合與材料移除。<strong>LXCat</strong> 等公開碰撞截面資料庫與經審查文獻可提供可追溯起點，但資料庫名稱本身不等於適用性保證；不同量測、能量範圍、氣體純度與擬合方式可能給出不同截面，複雜氟碳、含氧、含氫或聚合系統的反應集更可能缺少中間物種或表面路徑。</p><p>表面係數通常是不確定度最大的項目，因為它依材料、溫度、粗糙度、覆蓋率、ion dose、seasoning 和前批 history 改變。把它調到讓一個 etch rate 對上並不等於已驗證 profile、selectivity、particle 或 damage。模型交付應列出每個主要輸入的來源、版本、量測或擬合狀態、敏感度與合理範圍，並把未量測的係數明示為假設。資料若不可追溯，就無法在 recipe、parts 或材料更新後判斷原結論是否仍有效。</p><p>可信度分三層：數值可信度看收斂、網格/時間步長、守恆和隨機統計；物理可信度看反應、邊界與幾何是否適用；預測可信度看是否以獨立實驗驗證了真正要用的輸出。工程師可問：模型能回答哪個決策？輸入來自哪裡？是否只在內插範圍？對哪個係數最敏感？有哪些資料可推翻它？這些問題比要求更多小數位更能降低錯誤決策。</p>`),
    section("experiment-design", "從模擬到實驗：以趨勢、反證與封裝 qualification 收斂", `<p>模型最有效的用途是縮小 DOE，而不是取代 DOE。先讓模型提出兩到三個可區分的機制預測，例如壓力下降若主要改善角度分布，深部 profile 應改善但 mask/stop loss 可能上升；若主要是自由基供應，增加有效 dose 或 purge 應先改善底部 coverage。接著用小幅、一次一因子的 split、reference wafer、時間序列和多幾何截面測試。若趨勢反向，更新反應/表面假說，而不是只把模型輸出縮放到實驗。</p><p>低損傷封裝清潔的實驗必須把「去除」與「不傷害」一起設為響應。輸入可包括 mode、off-time、改質/移除劑量、溫度或 queue；輸出至少有污染/氧化狀態、Cu/UBM 電性或表面、PI/mold compound/low-k 化學與形貌、particle/離子殘留，以及接合或後段可靠度。若模型只預測 radical flux，將它視為候選中介指標，而不是直接當作 cleanliness 或 bond yield。</p><p>最終報告應有模型版本、輸入範圍、校正資料、獨立驗證資料、失配案例、適用產品與明確禁止外推的區域。這些資料讓下一位工程師知道何時可以用模型做排序，何時必須回到量測或加做 qualification，也避免封裝表面在模型外被錯誤地宣稱為已驗證。</p>`),
    section("model-review-and-packaging-boundaries", "模型審查紀錄與封裝表面邊界", `<p>一份可供工程決策的模型審查紀錄，先以問題句開始，而不是以軟體名稱開始。例如「edge roll 是否由 radial radical depletion 主導」、「bias-off 是否足以降低孔底 charging」、「remote clean 是否能移除 Cu oxide 而不改變 PI 表面」，每個問題指定可觀測輸出與至少一個反證。接著列出模型層級、幾何、材料堆疊、壓力/功率/流量範圍、吸收功率的取得方式、collision/reaction set、surface coefficient、wall condition、初始狀態、網格與時間步長。這使閱讀者知道曲線是腔體平均、局部鞘層還是特徵尺度，也知道它省略了什麼。</p><p>數值檢查不能省略。0-D 要檢查粒子與能量收支是否平衡、解是否隨初值改變、主要反應路徑是否合理；流體模型要報告網格獨立性、邊界流量與熱邊界；PIC-MCC 要報告粒子數、random seed、統計誤差、time step 是否能解析 RF 或脈衝相位、電荷守恆與收斂；profile 模型要報告 surface mesh、時間步進、regridding 與幾何守恆。若數值輸出連自身守恆都無法通過，與 SEM 或 OES 偶然相符也不提供預測可信度。</p><p>物理校正應避免一個輸出對一個自由參數。先以獨立量測約束可量的輸入，例如 pressure、flow、溫度、absorbed power、rate、thickness map、OES/VI proxy、粒子或表面組成；再用另一組 wafer、不同 AR、不同時間或不同 chamber state 測試預測。若為了對準平均 rate 而調高 sticking coefficient，卻使 center/edge、profile 或副產物趨勢變差，應把此失配記為模型缺口。模型的敏感度分析可指出最值得量測的係數，也可防止把不確定輸入誤當物理常數。</p><p>封裝表面是最需要資料治理的案例。RDL 與 UBM 可能有多層金屬、局部氧化、grain/roughness 和 pad edge；Cu 的氧化還受儲存和轉移時間影響。PI/PBO 與 mold compound 則有配方、交聯、吸濕、filler、殘膠和 outgassing 差異，low-k 的孔隙與碳耗損又讓有效表面遠超出平面幾何。全域或流體模型若只使用單一 SiO2 或 Cu coefficient，最多可用於選擇可能較低 ion/radical dose 的方向；它不能證明 oxide removal、polymer damage、ion residue、bond yield 或濕熱後界面仍然合格。</p><p>因此封裝模型的驗證矩陣必須有處理前後資料：以表面分析確認 Cu/UBM 的氧化與污染，以 roughness/形貌檢查濺鍍或 filler 露出，以化學或材料量測檢查 PI/mold compound/low-k，並以接觸、接合、老化或既有可靠度流程確認功能。模型輸出和實驗結果都保留版本、座標、sample history 與失敗樣品；不能只挑符合預測的樣本。當輸入超出已校正範圍、材料更換、腔體 clean/parts 改變或結果出現新 signature，模型應降級為假說，工程行動回到受控 small split 與產品 hold 邊界。</p>`)
  ].concat([
    section("review-record-and-confidence-gates", "模型審查記錄與可信度 gate", `<p>此 gate 將四層模型的用途、輸入資料、數值品質、物理邊界與封裝表面驗證轉成可稽核欄位。它不增加模型的準確度，但能防止把未校正輸出誤用為跨材料、跨腔體或跨產品的絕對結論。</p>${modelReviewAppendix}`)
  ]),
  callouts: [
    { type: "insight", title: "0-D 的工程價值", body: "在假設固定且已校正的範圍內，0-D 能快速指出 ne、Te 與物種趨勢；它不提供局部 profile 或跨材料的絕對 recipe。" },
    { type: "warning", title: "模型與量測不符時", body: "先檢查資料可比性、MSA、邊界條件、表面狀態與外推；不可只調一個表面係數讓單一輸出吻合。" }
  ],
  labs: [
    { id: "a32", title: "A32 0-D 全域模型計算器", module: "/assets/js/labs/a32-global-model.js", observation: ["改變 absorbed power、pressure、氣體與腔體幾何，觀察 ne、Te 與粒子平衡交點的條件式趨勢。", "掃描 flow 與 power，區分滯留時間、自由基密度和電子密度的變化，並說明 generator power 不等於 absorbed power。", "以封裝多材料或 remote clean 案例解讀結果，列出模型未含的 Cu 氧化、PI/mold compound outgassing、wall chemistry 與 low-k 損傷驗證。"] }
  ],
  selfCheck: [
    ["四種模型層級各適合回答什麼？", "0-D 適合整腔平均趨勢；流體適合空間分佈；PIC-MCC 適合 EEDF、IEDF 與鞘層動力學；profile evolution 適合 feature 形貌，但它需要可信的上游通量和表面係數。"],
    ["0-D 為何常得到 Te 對功率較不敏感、ne 對吸收功率近似線性的結果？", "在固定氣體、幾何與損失模型下，粒子平衡要求 Te 提供足夠 ionization 以補償損失，新增 absorbed power 常由較高 ne 承擔；模式、EEDF、表面或耦合變化時此近似可失效。"],
    ["為何 generator setpoint 不足以作為 0-D 能量輸入？", "反射功率、match、耦合、腔體狀態與 power deposition 位置會改變真正 absorbed power；若未量測或估計，就不能把 setpoint 與 ne 的關係當作物理結論。"],
    ["流體模型與 PIC-MCC 的主要取捨是什麼？", "流體較適合大尺度空間分佈與較快掃描，但須有 closure/EEDF 假設；PIC-MCC 保留粒子動力學與鞘層細節，卻受計算成本、統計雜訊、網格和時間步長限制。"],
    ["何種情況下 profile 模型只能作為示意？", "若 IEDF、角度、通量、surface sticking、再沉積或 charging 只靠未驗證假設，或僅用同一張校正截面評估，模型不能宣稱預測新 AR、材料或 recipe 的絕對 profile。"],
    ["封裝表面為何是模型可信度的高風險邊界？", "RDL/UBM/Cu 氧化與邊緣、PI/mold compound 的 outgassing/filler、low-k 化學及多材料界面不符合平坦單一材料假設；需以表面、接合與可靠度量測驗證。"]
  ],
  readings: ["Lieberman and Lichtenberg, Principles of Plasma Discharges and Materials Processing, global models, fluid descriptions and kinetic simulations.", "已核准的 collision/reaction data、surface characterization、model verification 與封裝清潔/可靠度 qualification 文件。"]
};

function section(id, title, body) {
  return { id, title, body };
}
