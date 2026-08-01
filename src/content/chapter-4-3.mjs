export const chapterFourThree = {
  id: "4-3",
  route: "/level/4/4-3-plasma-damage/",
  title: "4.3 電漿誘發損傷",
  hours: 2.5,
  prerequisites: ["2.4 鞘層物理進階", "3.1 蝕刻輪廓工程", "3.7 封裝清潔工程", "4.1 電漿診斷"],
  objectives: [
    "由導體面積與閘極面積計算天線比，沿電子遮蔽、電荷匯集、氧化層電場到可靠度失效建立因果鏈。",
    "比較連續與脈衝電漿的閘極電位軌跡，指出 off-phase 如何中和電荷及何時中和仍不足。",
    "將充電、UV/VUV、離子轟擊、污染與 Low-k 五類損傷分開，為每類指定可反駁的量測與對策。",
    "設計封裝清潔的材料相容與 damage budget，驗證殘留去除、接合品質、Cu 氧化、聚合物劣化及再污染。",
    "依 arcing 事件、電性、材料與製程證據完成風險矩陣，決定繼續、降級、hold、返工或報廢。"
  ],
  summary: "電漿損傷要從能量與電荷如何抵達敏感結構來判斷。高深寬比結構中的 electron shading 使電子難以到達孔底，離子卻沿鞘層方向進入，導體累積正電並經大面積天線灌入小閘極；天線比越大，單位閘極承受的電荷密度通常越高。脈衝 off-phase 可讓鞘層塌縮、電子或負離子中和電荷，但天線二極體只提供導電洩放路徑，不能阻擋 UV/VUV 光子。風險需分成充電、光子、離子轟擊、污染與 Low-k 五類，並以 Antenna PCM、CHARM 類監測、C-V、TDDB/Qbd、材料分析與產品電性建立證據。封裝清潔同樣需要 damage budget：去除有機殘留與活化表面不能以 Cu 氧化、mold compound/PI 粗化、吸濕、離子污染或接合可靠度為代價。Arcing 則是局部場、沉積物、微粒與寄生放電的高後果事件，必須以快速切斷、事件分級、硬體檢查與明確 disposition 管理。",
  sections: [
    {
      id: "antenna-charging-mechanism",
      title: "天線效應：electron shading、AR 與脈衝中和",
      body: `<p>充電損傷的起點不是「電漿帶正電」，而是電子與離子抵達圖形表面的空間、角度及時間分佈不同。電子熱速度高且方向近似各向，離子在鞘層電場中獲得垂直動量。平坦導體若接收的電子、離子電流能平衡，浮動電位會自行調整；在高深寬比 trench 或 contact 中，側壁與遮罩會優先截擋斜向電子，離子仍沿近垂直軌跡到達底部，形成 <strong>electron shading</strong>。孔底或與其相連的導體因此累積淨正電荷，局部電位上升又會偏轉後續離子，造成 notching、twisting，也可能把電流送向敏感閘極。</p>
      <p>若暴露金屬、poly 或互連最終接到 gate，收集面積上的電荷會匯集到薄閘極氧化層。天線比定義為 <code>AR=Aconductor/Agate</code>。導體面積決定可收集的總電流，閘極面積決定電流密度與電容尺度；其他條件近似時，AR 從 50 增至 500，閘極承受的累積電荷、電位或 oxide stress 通常顯著增加。這是設計規則採 AR 上限的原因，但不存在跨節點通用的安全值：氧化層厚度、介電常數、製程步驟、導線連接順序、圖形密度與電漿均勻度都會改變耐受度。</p>
      <p>電荷路徑可拆為六個可驗證節點：表面離子/電子通量差；導體上的淨電流；導體與 gate 的總電容；gate potential；氧化層電場 <code>Eox=Vgate/tox</code>；最後是穿隧電流、陷阱生成與崩潰。氧化層越薄，同一 Vgate 產生的 MV/cm 越高；但先進 high-k/metal gate 的等效氧化層厚度、實體厚度與 trap physics 不同，不能只沿用 SiO2 的單一擊穿場。工程模型應輸出趨勢與風險級別，不應把簡化 RC 或線性 AR 關係宣稱為元件壽命預測。</p>
      <div class="table-wrap"><table><thead><tr><th>增加項目</th><th>主要機制</th><th>預期觀察</th><th>替代解釋</th></tr></thead><tbody>
      <tr><td>導體面積/AR</td><td>收集總電荷增加</td><td>Vgate、Qinj、Vt shift 或 fail rate 上升</td><td>圖形位置與局部電漿不均勻同時改變</td></tr>
      <tr><td>結構深寬比</td><td>electron shading 加強</td><td>孔底正充電與 profile 偏轉增加</td><td>ARDE、自由基耗盡或側壁 charging</td></tr>
      <tr><td>離子能量</td><td>底部定向電流及直接轟擊增加</td><td>充電與晶格損傷可能同時增加</td><td>化學清底改善造成表觀 electrical 改善</td></tr>
      <tr><td>電漿不均勻</td><td>橫向電流與局部浮動電位差</td><td>wafer map 與 antenna fail map 相關</td><td>溫度、膜厚或後段量測 map</td></tr>
      </tbody></table></div>
      <p>脈衝 source 或 bias 在 off-phase 降低電子溫度並使鞘層部分塌縮，先前被排斥或遮蔽的電子可更容易抵達正充電區；電負性電漿中的負離子也可能在鞘層消失後參與中和。連續模式下 gate potential 可在高風險步驟中單調累積；有效脈衝應看到 on-phase 上升、off-phase 回落的鋸齒軌跡，且每週期殘餘值不持續失控。只比較相同峰值功率不公平，還需控制平均功率、總 etch depth、總時間與化學組成；脈衝若讓時間加倍，較低瞬時 charging 仍可能累積相近總 dose。</p>
      <p>脈衝不是只要勾選開關就有效。Off-time 必須長於鞘層塌縮與局部 RC 中和尺度，頻率過高或 duty 過大時電位來不及下降；off-time 太長又可能熄火、改變自由基比例、降低速率或在每次重點火產生 spike。數值模擬若以 10 us time step 取樣 10 us pulse period，所有樣點可能都落在同一相位，錯誤地看不到 off-phase；模型必須對每個步長計算 on/off 覆蓋比例或使用足夠細的子步長，再用 charge trace 驗證非單調中和。</p>
      <p>天線二極體在製程期間提供導電洩放或箝位路徑，使 gate potential 不再隨 AR 無限制上升；正常電路操作時則保持不影響功能。它的有效性取決於二極體連接在該製程層是否已成立、導通方向、串聯電阻及版圖。Jumpers 可在製程高風險階段暫時切斷大天線，後續金屬層再接回。這些是設計端保護；製程端仍要降低不均勻、調整脈衝、限制 bias 與縮短高風險步驟。最重要的界線是：<strong>二極體只能洩放電荷，不能遮蔽 UV/VUV 光子，也不能修復離子或污染造成的材料缺陷。</strong></p>`
    },
    {
      id: "five-damage-modes-packaging-clean",
      title: "五類損傷與封裝清潔的材料相容邊界",
      body: `<p>損傷分析必須把不同能量載體分開，因為相同 electrical fail 可能有完全不同的對策。<strong>充電損傷</strong>由離子/電子通量不平衡和導電路徑造成，優先檢查 AR、圖形深寬比、wafer map、脈衝與 antenna PCM。<strong>UV/VUV 光子損傷</strong>由小於約 200 nm 的高能光子在 dielectric 產生電子電洞對、打斷鍵結或形成陷阱，不需要金屬天線路徑；加入二極體後若 Vt shift 或 TDDB 劣化仍存在，就要比較光子劑量、電子溫度、source type 與遮蔽。</p>
      <p><strong>離子轟擊損傷</strong>來自高能離子與快速中性粒子在表面下數奈米造成位移、非晶化、混合、濺鍍與粗化。降低 bias 可減少損傷，但也可能無法移除底部鈍化；要找的是化學反應門檻以上、材料位移或 sputter 門檻以下的能量窗，而非一律追求零 bias。IEDF 的高能尾端比平均能量更可能決定少量嚴重缺陷。對超薄 channel、2D 材料或淺接面，即使平均 etch rate 合格，少數高能事件仍可能增加接面漏電與遷移率劣化。</p>
      <p><strong>污染與非預期摻雜</strong>包括腔體金屬零件濺鍍、陶瓷/石英腐蝕、前一 recipe 的 memory、泵或 foreline backstream、鹵素與含氟殘留，以及清潔後吸濕造成的腐蝕。金屬離子可形成深能階，Cl/Br 殘留出腔遇水後會延續腐蝕；微粒也可能同時引發局部 arcing。污染問題不能只靠延長 plasma clean，因為更長或更高 bias 可能把 chamber wall 材料濺到 wafer。應用 witness wafer、TXRF/ICP-MS、XPS/ToF-SIMS、particle map、空白 run 與 recipe sequence 分離來源。</p>
      <p><strong>Low-k 損傷</strong>特別容易被平均厚度掩蓋。含 O 電漿會從 SiCOH 抽走 CH3，使碳耗盡、孔洞表面形成 silanol、材料變親水並吸收水分；結果是 k 值上升、漏電增加、機械強度下降與後續 barrier/metal adhesion 改變。離子也會造成表面緻密化或 roughness，使「膜厚變化很小」卻有顯著 dielectric 性能損失。N2/H2 灰化、CO2 基化學、remote plasma、低 Te source、短時間處理與 silylation repair 可降低或修復部分損傷，但修復是否進入高 AR 結構、是否恢復長期可靠度仍要量測。</p>
      <div class="table-wrap"><table><thead><tr><th>損傷類別</th><th>能量/物質載體</th><th>代表結果</th><th>第一對策</th><th>不能用來排除的證據</th></tr></thead><tbody>
      <tr><td>充電</td><td>淨電流與導體匯集</td><td>Vt shift、Qbd/TDDB 劣化</td><td>脈衝、均勻度、AR/diode</td><td>二極體保護良好不能排除 UV</td></tr>
      <tr><td>UV/VUV</td><td>高能光子</td><td>dielectric trap、界面缺陷</td><td>低 Te source、遮蔽、降低 dose</td><td>低 Vdc 不能證明光子劑量低</td></tr>
      <tr><td>離子轟擊</td><td>離子與快速中性粒子</td><td>晶格缺陷、粗化、濺鍍</td><td>控制 IEDF、bias、壓力與脈衝</td><td>平均能量低不能排除高能尾端</td></tr>
      <tr><td>污染/摻雜</td><td>金屬、鹵素、微粒、memory</td><td>深能階、腐蝕、漏電與接合失效</td><td>材質、clean/seasoning、順序治理</td><td>表面看起來乾淨不能排除痕量殘留</td></tr>
      <tr><td>Low-k</td><td>O radical、光子與離子</td><td>碳耗盡、吸濕、k 與漏電上升</td><td>低損傷化學、remote、repair</td><td>膜厚穩定不能排除化學劣化</td></tr>
      </tbody></table></div>
      <p><strong>封裝清潔是這五類風險的交會點。</strong>Wire bonding、die attach、Cu-to-Cu、hybrid bonding、underfill、molding 或 redistribution layer 前，電漿常用來移除有機殘留、助焊劑薄膜、弱邊界層並提高表面能。目標不是取得最高接觸角下降，而是在限定時間內讓接合強度、空洞率與電性達標，同時不氧化 Cu/Ni/Sn、不粗化 Al pad、不蝕傷 PI/PBO/epoxy/mold compound、不讓 filler 外露，也不把 Na/K/Cl/F 或 chamber metal 重新沉積。封裝材料多且幾何遮蔽強，單一 recipe 套全產品的風險高於前段單一薄膜。</p>
      <p>O2 plasma 對有機殘留有效，卻會氧化 Cu、使某些 epoxy 或 mold compound 表面過度粗化並增加吸濕；Ar plasma 以物理活化為主，可去除薄氧化/污染層，bias 太高則會濺鍍、pad recess、filler exposure 或再沉積；N2/H2、Ar/H2 或 remote chemistry 可降低氧化並處理部分金屬表面，但需評估氫安全、材料脆化、殘留與設備核准。對 hybrid bonding，奈米級粗糙度、particle、氧化層厚度與活化後等待時間都會改變 void；對 wire bond，初始 pull/shear 提升不代表高溫高濕後仍可靠。</p>
      <p>封裝清潔應建立四段 control plan。第一段是<strong>進料狀態</strong>：保存表面污染、氧化、儲存時間、濕度與來料 lot。第二段是<strong>製程劑量</strong>：用 delivered power、pressure、flow、time、sample temperature、載具遮蔽與位置 map，而不是只記 generator setpoint。第三段是<strong>清潔終點</strong>：OES/質譜產物下降、witness coupon、接觸角或 XPS 只能各回答一部分，不能以接觸角單項放行。第四段是<strong>功能與可靠度</strong>：bond pull/shear、contact resistance、SAM/void、漏電、MSL/preconditioning、temperature cycle、HAST/uHAST 與 cross-section。只有清潔效果和 damage 指標同時達標，才算製程窗。</p>
      <p>過度清潔的典型線索是：接觸角繼續下降但 bond strength 不再提高；Cu oxide 或 sheet/contact resistance 上升；mold compound roughness、吸水與離子萃取增加；PI/PBO 厚度或 FTIR 官能基改變；同一產品邊緣比中心受損，對應載具或電漿不均。遇到殘留與損傷拉扯時，優先使用分段 recipe、remote source、降低 bias、縮短 air break、改善前段濕洗/烘烤與載具流場，不應只增加電漿時間。封裝清潔也是製程，不是沒有上限的前處理。</p>`
    },
    {
      id: "damage-measurement",
      title: "損傷量測：把電位、劑量、材料與可靠度對齊",
      body: `<p>沒有單一量測能覆蓋全部損傷。Antenna PCM 在同一 wafer 放置不同 AR、gate area、metal level 與位置的 test structure，量 Vt shift、gate leakage、Qbd 或 fail rate；若失效隨 AR 增加且脈衝/diode split 改善，充電機制得到支持。設計矩陣要避免 AR 與位置、線寬、圖形密度完全共線，否則無法區分天線面積和 plasma map。零失效也不代表沒有潛在損傷，可能只是 oxide 尚未立即崩潰，需 TDDB 或 stress test 放大差異。</p>
      <p>CHARM 類監測晶圓可記錄製程中的正負電位、電流或 UV dose，提供產品後測看不到的時間資訊。它適合比較 recipe step、wafer position、source/bias pulsing 與 PM 狀態，但 sensor 的頻寬、dynamic range、耦合與可重複性有自己的限制。量到一個高峰後要對齊 RF/gas/valve event，判斷是點火、step transition、主蝕刻還是關電；若只保存全步驟最大值，就無法設計針對性的 ramp 或 blanking。</p>
      <div class="table-wrap"><table><thead><tr><th>方法</th><th>主要量</th><th>支持的機制</th><th>重要限制</th></tr></thead><tbody>
      <tr><td>Antenna PCM</td><td>Vt、漏電、Qbd、fail rate 對 AR</td><td>充電與設計保護</td><td>位置/版圖共線、潛在損傷需加速測試</td></tr>
      <tr><td>CHARM 類 wafer</td><td>製程中電位、電流、UV dose</td><td>事件時間與 wafer map</td><td>sensor 頻寬、校正及產品代表性</td></tr>
      <tr><td>C-V / charge pumping</td><td>Dit、固定電荷、平帶/閾值漂移</td><td>dielectric/interface trap</td><td>需合適 test capacitor/MOS 結構</td></tr>
      <tr><td>TDDB / Qbd</td><td>壽命分佈與崩潰電荷</td><td>潛在 oxide reliability</td><td>加速模型、樣本數與 censoring</td></tr>
      <tr><td>XPS/FTIR/ellipsometry</td><td>鍵結、碳含量、厚度與光學常數</td><td>Low-k、氧化與清潔化學</td><td>表面/平均深度、spot 代表性</td></tr>
      <tr><td>TXRF/ToF-SIMS/ICP-MS</td><td>金屬、鹵素與深度分佈</td><td>污染與非預期摻雜</td><td>檢出限、背景、破壞性與定量標準</td></tr>
      <tr><td>AFM/TEM/SEM</td><td>粗糙、晶格、recess 與 profile</td><td>離子、表面與局部 arc 損傷</td><td>取樣小，需 map 與盲選位置</td></tr>
      </tbody></table></div>
      <p>C-V 可由平帶電壓、hysteresis、frequency dispersion 與 conductance 推論固定電荷及界面態；charge pumping 對界面陷阱敏感。TDDB 與 Qbd 將初期看似正常的 oxide 置於加速 stress，分析 Weibull 分佈、形狀參數及位置，而不是只比較平均壽命。若 UV split 使 Dit 上升但 antenna diode 無改善，光子機制較可信；若 fail 強烈跟 AR 走且 diode/pulsing 改善，charging 較可信。兩者可以同時存在，實驗矩陣要允許交互作用。</p>
      <p>Low-k 與封裝聚合物需要化學和功能量測一起看。FTIR 追蹤 Si-CH3、OH 與有機官能基，XPS 看表面碳/氧與化學態，ellipsometry 看厚度與 optical constant，contact angle 看最表層潤濕但高度非專一。AFM/SEM 看 roughness、filler exposure 與 pad recess；四點探針或 Kelvin structure 看金屬/接點電阻；wire pull、ball shear、die shear、SAM、cross-section 與可靠度 stressing 才回答接合是否真正改善。接觸角低不能證明離子污染已去除，也不能證明高溫高濕後不 delaminate。</p>
      <p>污染量測要有空白與來源追蹤。Blank wafer、無電漿載具、只跑 clean、只跑 seasoning、不同 recipe sequence 與不同 chamber kit 可分離進料、載具、腔壁與排氣來源。TXRF 適合 wafer 表面金屬 map，ToF-SIMS 可看痕量與深度，ICP-MS 對萃取液或消化樣品靈敏，ion chromatography 可追 Cl/F/Na/K 等可萃取離子。檢出限以下不等於零；報告需保存方法檢出限、blank、recovery、標準片與採樣面積。</p>
      <p>有效的 qualification 使用因子矩陣，而不是只做 before/after。至少包含 plasma off control、低/中心/高 dose、連續/脈衝、diode/no-diode 或高/低 AR、wafer center/edge，以及 PM 前後。每一因子先寫預測：若是 charging，結果應隨 AR、position、pulsing 改變；若是 UV，應隨 photon dose/source 改變且 diode 無效；若是 ion damage，應隨 IEDF/bias 改變；若是 contamination，應隨 kit/sequence/blank 改變。量測結果若不符合預測，就保留替代解釋而不是硬貼機制標籤。</p>
      <p>量產監控需分成 leading 與 lagging indicators。VI/OES/arc count、CHARM monitor、match/pressure trace 是早期指標；PCM、材料分析與產品 electrical 是結果證據；TDDB、HAST、temperature cycle 是長期可靠度。任何 recipe 或 chamber kit 變更都要指定哪一層先驗證、抽樣頻率、控制界線與超界 disposition。只在開發時做一次完整材料分析、量產只看 generator setpoint，無法保證損傷機制沒有隨腔體壽命移動。</p>`
    },
    {
      id: "arcing-risk-decision",
      title: "Arcing 與風險決策：從事件波形到 wafer disposition",
      body: `<p>Arcing 是局部電場、可用氣體路徑與可供應能量同時成立的快速放電。尖角、螺絲間隙、刮痕、絕緣件表面帶電、金屬片、鬆動沉積物與微粒會集中電場；主腔壓力雖不在 Paschen 谷底，陶瓷背面、法蘭窄縫、ESC 邊緣或 match box 的局部 <code>p*d</code> 仍可能適合寄生放電。RF step 太快會產生高瞬時電壓，match 尚未收斂時 reflected power 也可能放大局部 stress。</p>
      <p>RF generator 的 arc detection 可從 voltage/current collapse、相位突變、寬頻發射或 reflected spike 在微秒至毫秒內切斷能量。快速切斷降低熔蝕範圍，卻不等於 wafer 無損；一次 arc 可能造成局部 crater、金屬噴濺、微粒、介電擊穿與後續污染。偵測過敏則會把正常點火或 match transient 當 arc，頻繁重點火反而增加 stress。門檻、blanking window、重試次數與 power ramp 必須由事件波形和實體證據校正。</p>
      <div class="table-wrap"><table><thead><tr><th>觀察</th><th>優先假設</th><th>立即檢查</th><th>禁止直接採取</th></tr></thead><tbody>
      <tr><td>固定 recipe 時間反覆 spike</td><td>step transition、點火或 match 暫態</td><td>RF/gas/pressure 時戳與 ramp</td><td>只提高 arc threshold</td></tr>
      <tr><td>固定 wafer 方位/edge</td><td>ESC、focus ring、gap 或局部沉積</td><td>event map、零件檢查、dark mark</td><td>以 recipe 補償硬體缺陷</td></tr>
      <tr><td>PM 壽命增加後上升</td><td>沉積剝落、尖角暴露或接地改變</td><td>kit 壽命、particle、ground path</td><td>讓 EWMA 延長製程時間</td></tr>
      <tr><td>只在特定產品</td><td>圖形充電、背面污染或載具差異</td><td>產品 map、backside、AR 與 clamp</td><td>宣告 chamber 對所有產品正常</td></tr>
      <tr><td>封裝載具/基板邊緣</td><td>金屬 lead、tray、翹曲與窄縫寄生放電</td><td>治具間距、接地、翹曲與燒痕</td><td>只降低清潔時間後直接放行</td></tr>
      </tbody></table></div>
      <p>預防措施包括移除尖角與鬆動沉積物、控制 PM/clean/seasoning、維持可靠接地、改善 shield 與絕緣幾何、限制微粒、使用 power ramp 而非 step，以及在設備核准範圍內以氣體/壓力調整寄生放電條件。He 稀釋可能提高特定混氣的有效崩潰門檻或穩定放電，但不是通用解法，也不能覆蓋窄縫、表面 flashover 或場發射。任何氣體變更都會影響電子能量、化學、速率、損傷與排氣安全，需完整再驗證。</p>
      <p>事件分級應同時考慮強度、持續時間、重複次數、recipe phase、位置證據與產品敏感度。低級單一疑似事件可先 hold wafer、重播 trace、做外觀/particle/electrical screen；重複事件、能量高、發生於產品敏感步驟或伴隨 pressure/ground fault 時，應停止 chamber、檢查 kit/ESC/ground，並擴大到前後 wafer。若發現 crater、金屬噴濺、介電擊穿或無法排除潛在可靠度損傷，不應只因最終尺寸合格就 release。</p>
      <p>風險決策可用嚴重度、發生率與可檢出性，但數字分數不能取代 failure physics。高嚴重度且 downstream screen 難檢出的 gate oxide、Low-k 或 hybrid-bond interface 損傷，即使發生率低也需要保守 hold；可由 100% electrical screen 明確捕捉且可返工的表面殘留，處置可以不同。每項 disposition 要記錄證據、未排除機制、受影響 wafer window、返工限制、可靠度風險與核准責任。</p>
      <p>封裝清潔遇到 arc 或過度處理時，返工尤其要受控。再做一次 plasma 可能移除殘留，也會累積 Cu oxide、polymer dose、粗糙與吸濕；已完成 partial bond、underfill dispense 或敏感薄 die 的產品通常不能假設可重複處理。返工規格應定義最大累積 plasma dose、air exposure、烘烤、氧化/表面能復驗、bond strength 與可靠度抽樣。沒有累積劑量記錄，就無法證明第二次清潔仍在材料窗口。</p>
      <p>一個可稽核的決策流程是：先由 interlock 停止能量並保存 pre/post-trigger raw trace；隔離 wafer 與時間窗；比對 RF、VI、pressure、OES、match、ground 與 event map；檢查 chamber/fixture/wafer 實體痕跡；依假設安排 particle、材料、電性或可靠度量測；完成 root cause 與復歸 monitor；最後才解除 hold。若根因仍不確定，文件應明示剩餘風險與保守處置，不應以「未再發生」代替原因證據。</p>
      <p>A29 的 gate potential、oxide field 與 lifetime/risk 是因果教學輸出。它應重現 AR 增加使充電風險提高、electron shading 加劇、pulsed off-phase 使軌跡回落、diode 箝位充電但 UV 風險保留等方向；不能把簡化數值當成特定技術節點的設計規則、產品壽命或設備保證。量產決策仍須回到核准 PCM、材料分析、可靠度與實際機台事件資料。</p>`
    }
  ],
  callouts: [
    { type: "intuition", title: "工程師直覺", body: "先辨認抵達敏感結構的是淨電流、光子、離子還是污染物，再選對可反駁量測。相同 Vt shift 不代表相同機制，相同對策也不會同時保護所有損傷。" },
    { type: "warning", title: "封裝清潔界線", body: "接觸角下降或初始 bond strength 上升只證明部分表面效果；放行仍要限制累積 plasma dose，並驗證 Cu 氧化、聚合物劣化、離子污染、空洞及濕熱可靠度。" },
    { type: "misconception", title: "常見誤解", body: "天線二極體只處理導電充電路徑，不會遮住 UV/VUV，也不會消除離子轟擊、Low-k 化學損傷、污染或 arcing。" }
  ],
  labs: [
    {
      id: "a29",
      title: "A29 天線效應充電動畫",
      module: "/assets/js/labs/a29-antenna-charging.js",
      observation: [
        "固定 gate area 與氧化層，逐步提高 antenna area/AR，記錄累積電荷、gate potential、oxide field 與風險如何近似隨 AR 上升。",
        "提高結構深寬比觀察 electron shading，再切換脈衝模式，確認 off-phase 期間 gate potential 回落而非持續單調累積。",
        "開啟 antenna diode 比較箝位效果，並確認 UV/VUV 風險指標不因二極體存在而消失。"
      ]
    }
  ],
  selfCheck: [
    ["高深寬比結構為何容易出現 electron shading 與正充電？", "電子熱速度方向較分散，容易被遮罩與側壁截擋；離子由鞘層加速後較垂直，仍可到達孔底。孔底或相連導體因此接收較多正離子並累積正電。"],
    ["天線比為何使用導體面積除以閘極面積？", "導體面積近似決定可收集的總電荷，閘極面積決定承受電流密度與電容尺度；AR 越大，單位閘極通常承受更高 charge stress，但安全上限仍依節點與結構驗證。"],
    ["脈衝電漿如何降低充電？模型與實驗應看到什麼證據？", "Off-phase 讓鞘層塌縮，電子或負離子更容易到達正充電區中和電荷。應看到 gate potential 在 on-phase 上升、off-phase 回落，且在相同製程結果下累積值低於連續模式。"],
    ["為什麼 antenna diode 不能保護 UV/VUV 損傷？", "二極體只能提供電荷洩放或電位箝位路徑；UV/VUV 光子不需要經過導線，仍可穿入介電質產生電子電洞對、斷鍵與陷阱。"],
    ["五類主要損傷各是什麼？", "充電、UV/VUV 光子、離子轟擊、污染/非預期摻雜與 Low-k 化學/結構損傷。它們可能同時存在，需以 AR、光子劑量、IEDF、污染分析及材料/可靠度量測分離。"],
    ["封裝清潔為何不能只以接觸角或初始 bond pull 放行？", "兩者只反映部分表面與短期接合效果，不能排除 Cu 氧化、PI/PBO/epoxy/mold compound 劣化、filler exposure、離子殘留、吸濕、空洞與濕熱後 delamination。"],
    ["偵測到 arcing 後，何時不能只重跑 wafer 或提高偵測門檻？", "事件重複、能量高、位於敏感步驟、伴隨硬體/接地異常，或已有 crater、噴濺、微粒與潛在介電損傷時，必須停機、擴大隔離並完成實體與電性證據；提高門檻可能只是隱藏故障。"]
  ],
  readings: [
    "Lieberman and Lichtenberg, Principles of Plasma Discharges and Materials Processing, sheath, charging and plasma-surface interaction chapters.",
    "設備與技術節點核准的 antenna rule、PCM、CHARM 類監測、C-V、TDDB/Qbd 與 plasma damage qualification 程序。",
    "封裝產品核准的 plasma cleaning、材料相容、wire/die bond、hybrid bonding、MSL、HAST 與 temperature-cycle 規範。",
    "設備供應商核准的 arc detection、power ramp、PM、grounding、chamber/fixture inspection 與 wafer disposition 程序。"
  ]
};
