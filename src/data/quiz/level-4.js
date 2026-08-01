export const level4ExamSpec = {
  id: "L4",
  title: "L4 電漿專家結業測驗",
  durationMinutes: 60,
  passPercent: 80,
  draw: { single: 8, multi: 4, numeric: 3, graphic: 5, scenario: 10 }
};

const concepts = [
  {
    chapter: "4.1",
    tag: "langmuir-probe",
    questions: [
      single(
        "一條 Langmuir I-V 曲線未涵蓋電子飽和轉折，分析器卻輸出 Vf、Te、Vp、ne。哪一項結論最合理？",
        [
          w("四個參數都可直接採用，只需增加小數位", "缺少轉折時 Vp 與電子區擬合不可識別，小數位不增加證據。"),
          c("先判定掃描窗不足；擴大偏壓範圍後重測", "三個物理區都被觀測，參數才有可追溯的擬合窗口。"),
          w("只要 Vf 零交越存在，ne 就必然正確", "ne 還依賴有效面積、Te、離子質量與飽和電流。"),
          w("改用更強平滑即可重建未量到的電子轉折", "平滑不能創造掃描範圍外的資訊，反而可能移動導數峰。")
        ],
        "缺少電子轉折不是雜訊問題，而是可識別性缺口；應先補足掃描範圍，再檢查基線、擬合殘差與重複性。",
        "4.1 Langmuir I-V 三區與參數求法"
      ),
      multi(
        "同一 RF 電漿的探針曲線在補償關閉後 Vp、Vf 明顯平移。哪些證據可用來判斷 Te 與 ne 是否仍可信？（複選）",
        [
          c("比較補償開/關的半對數阻滯區斜率與擬合殘差", "Te 來自 ln(Ie)-V 斜率；斜率與殘差可揭露模型是否仍成立。"),
          c("檢查同條件重複掃描的電流尺度、探針清潔前後與有效面積", "ne 對收集面積和鍍膜造成的電流衰減高度敏感。"),
          w("只看曲線外觀平滑就接受 ne", "鍍膜可讓曲線仍平滑但電流尺度錯誤。"),
          c("以 OES、VI 或其他非侵入 proxy 做同期趨勢交叉確認", "第二物理原理可檢查探針擾動與 RF 補償偏差。")
        ],
        "RF 補償先影響電位判讀；Te 與 ne 還需由斜率、殘差、面積狀態及獨立診斷共同確認。",
        "4.1 RF 補償、鍍膜與 EEDF 可信度"
      ),
      scenario(
        "探針連續量測 20 片後，離子與電子電流幅度都下降 35%，但半對數斜率、Vp、OES 比值及 delivered power 近乎不變。競爭假說為「ne 下降」與「探針鍍膜縮小有效面積」。下一步最有區分力的是？",
        [
          c("清潔或更換探針後，重測同一 reference plasma", "若電流恢復而 OES/VI 不變，直接支持有效面積改變。"),
          w("立即提高 source power 直到電流回到原值", "這同時改變真實 plasma，無法區分密度與探針面積。"),
          w("把原探針面積常數調小，使 ne 報值維持不變", "未經獨立面積證據調常數只是把異常藏入模型。"),
          w("只取第 1 片與第 20 片平均，忽略中間趨勢", "單調衰減的時間證據正是鍍膜假說的重要線索。")
        ],
        "電流尺度下降但 Te/Vp 與獨立 proxy 穩定，優先指向探針表面；清潔前後 reference 重測可反駁 ne 漂移假說。",
        "4.1 探針鍍膜與量測鏈"
      ),
      scenario(
        "EEDF 二階導數出現 14 eV 窄峰；把平滑窗由 5 點改成 9 點後窄峰消失，而 Vf 與總電流幾乎不變。要判定這是真實高能族群還是微分雜訊，應採哪個方案？",
        [
          w("固定使用 5 點窗，因為它保留較多峰", "保留峰不代表峰為真，二階微分會放大量化與 RF 殘留。"),
          w("固定使用 9 點窗，因為曲線較平順", "過度平滑也可能抹除真實高能尾，不能以美觀選窗。"),
          c("保存原始曲線，量化濾波偏差並檢查峰的重現性", "已知真值的合成資料與重複性可分開濾波器假峰和穩定物理特徵。"),
          w("把峰位置直接解讀為新的游離閾值", "EEDF 峰不是反應閾值表，且目前尚未證明峰超過分析雜訊。")
        ],
        "EEDF 的可信度取決於原始 SNR、取樣間距、邊界處理和濾波敏感度；單一平滑設定不能證明高能族群。",
        "4.1 EEDF 與二階微分限制"
      ),
      numeric(
        "扣除離子基線後，電子阻滯區在 -8 V 的 Ie 為 0.20 mA，在 -2 V 為 1.48 mA。若 ln(Ie) 對 V 近似直線，Te = ΔV / ln(I2/I1)，電子溫度約多少 eV？",
        3,
        "eV",
        0.05,
        [
          w("0.33 eV", "這是把斜率與其倒數混淆。"),
          c("3.0 eV", "ln(1.48/0.20) 約為 2.00，故 6/2=3.0 eV。"),
          w("6.0 eV", "這忽略了電子電流的對數倍率。"),
          w("7.4 eV", "這直接使用電流比，並非半對數斜率。")
        ],
        "電子阻滯區滿足 ln(Ie) 的斜率約為 1/Te；本題 ΔV=6 V、ln 比值約 2，因此 Te 約 3 eV。",
        "4.1 Langmuir Te 半對數斜率"
      )
    ]
  },
  {
    chapter: "4.1",
    tag: "oes-actinometry",
    questions: [
      single(
        "NF3 清腔時 F 703.7 nm 絕對強度上升 40%，Ar 750.4 nm 也上升 38%，F/Ar 比值幾乎不變。最保守的判讀是？",
        [
          w("F 基態濃度必然上升 40%", "絕對強度還受 ne、EEDF 與光路影響，不能等同比例換算濃度。"),
          c("共同激發或光學增益改變較可能，F 相對 Ar 的變化證據不足", "兩線同比上升而比值穩定，支持共同因子而非 F 選擇性增加。"),
          w("Ar 內標已證明污染視窗完全沒有影響", "波長相依吸收或內標化學參與仍可能破壞約分。"),
          w("只要使用 actinometry，就不必看 delivered power", "內標前提也依賴 EEDF 與放電狀態，設備 actual 仍是必要證據。")
        ],
        "Actinometry 的價值是降低共同 ne/EEDF/光路因素；兩線同步變化而比值穩定時，不宜宣稱 F 濃度大幅改變。",
        "4.1 OES 與 actinometry 證據邊界"
      ),
      multi(
        "要把 F/Ar actinometry 比值用於跨 PM 趨勢，哪些成立前提必須被驗證？（複選）",
        [
          c("Ar 添加比例低且在所有 split 中穩定，不顯著改變原電漿", "內標若擾動 chemistry，就失去被動參考的角色。"),
          c("F 與 Ar 線的主要激發路徑及閾值對 EEDF 變化足夠相近", "激發敏感度差異過大時，Te 漂移不會被比值約掉。"),
          c("兩條線共用且未飽和的光路，並監控波長相依 transmission", "共同光路只可約去共同衰減，飽和與色散仍需排除。"),
          w("把網站 pedagogical-weight 當成 NIST 定量強度", "教學權重不是儀器校正或來源化的轉移機率。")
        ],
        "低穩定內標、可比激發機制與受控共同光路是比值可解釋的必要條件；缺一項就只能當 proxy。",
        "4.1 Actinometry 三個前提"
      ),
      scenario(
        "Poly-Si 蝕刻率下降 6%；Cl 837 nm 上升、Si 288 nm 下降，match capacitor 持續單向漂移，He leak 正常。假說 A 是 Cl2 流量偏低，假說 B 是腔壁沉積改變阻抗與表面消耗。哪個檢查最能區分？",
        [
          w("只提高 Cl2 setpoint，若速率回升就接受 A", "setpoint 補償可能同時掩蓋壁面消耗，且 Cl 線上升不支持供應偏低。"),
          c("用 reference wafer 對照 PM 前後的 VI、Cl/Si、速率與 MFC actual", "壁面假說預測 clean 後電氣指紋與產物線共同回復；MFC actual 同時檢驗流量假說。"),
          w("只看 He leak，正常即排除設備問題", "He 只約束背面熱路徑，不能排除腔壁或 RF coupling。"),
          w("將 Si 線下降解讀為視窗變黑，無需看其他波長", "若視窗共同衰減，Cl 通常不會反向上升；仍需全譜與標準光源確認。")
        ],
        "Cl 未被消耗、Si 產物減少和 match 漂移共同支持壁面狀態；clean bridge 加 MFC actual 能對兩個假說提出反證。",
        "4.1 OES + VI 雙工具診斷"
      ),
      scenario(
        "光阻灰化監控中 O、CO、OH 三線同時下降，pressure/flow/VI 穩定；標準光源檢查顯示 310 nm transmission 降 45%、777 nm 只降 8%。應如何處理端點模型？",
        [
          c("判定為波長相依光路漂移；校正後重建多波長基線", "不同波長衰減不會被單一總強度 normalization 消除。"),
          w("把三條線都乘相同 1.45 校正係數", "310 與 777 nm 的衰減不同，共同倍率會產生錯誤補償。"),
          w("只保留 O 線，因為長波衰減較小", "單線仍受 EEDF 與化學變化影響，且舊模型的跨波長特徵已失效。"),
          w("忽略標準光源，因為 VI 沒有變", "VI 不經光路，正常正好支持感測鏈而非 plasma 異常。")
        ],
        "標準光源已直接證明波長相依污染；應停止沿用舊模型，完成光路復歸和 reference bridge。",
        "4.1 OES 視窗與來源治理"
      ),
      numeric(
        "Actinometry 量到 F 線 840 counts、Ar 線 280 counts；reference wafer 的 F/Ar 比為 2.50。若只做相對比值比較，本次比值相對 reference 高多少百分比？",
        20,
        "%",
        0.05,
        [
          w("12%", "這不是 3.00 相對 2.50 的比例差。"),
          w("16.7%", "這以本次值 3.00 作分母，不是 reference。"),
          c("20%", "本次 840/280=3.00，(3.00-2.50)/2.50=20%。"),
          w("300%", "3.00 是比值，不是相對增幅百分比。")
        ],
        "先算本次 F/Ar=3.00，再相對 reference 2.50 計算增幅；結果只代表相對 proxy，不等同 F 絕對濃度。",
        "4.1 Actinometry 相對比值"
      )
    ]
  },
  {
    chapter: "4.2",
    tag: "endpoint",
    questions: [
      single(
        "開口率 0.04% 的接觸孔產品，OES endpoint step 只有背景標準差的 1.2 倍，但 monitor pad 的 IEP 條紋穩定。應選哪個主要停止策略？",
        [
          w("放大 OES y 軸後沿用單線 threshold", "顯示放大不增加 SNR，1.2σ 不足以穩健觸發。"),
          c("改用 IEP 與產品橋接，另保留 timed safety cap", "IEP 不直接隨 open area 縮放，但仍需驗證 pad 代表性和最慢區。"),
          w("只用固定 20% over-etch，不需 endpoint", "固定百分比未檢查 stop loss、局部速率與產品密度。"),
          w("將 OES 與 IEP 平均成一個時間", "不可識別的 OES 不會因平均而變成有效證據。")
        ],
        "低於 0.1% 時應承認 OES 物理限制；IEP 可作替代，但 monitor pad 與產品最慢結構仍須橋接。",
        "4.2 低開口率與替代端點"
      ),
      multi(
        "一個可重播的 OES 雙訊號端點規則應保存哪些資訊？（複選）",
        [
          c("產物下降與反應物上升的通道、方向、基線窗及門檻", "相反方向的物理訊號可降低單線歧義。"),
          c("最短 recipe 時間、candidate 持續時間、timeout 與 invalid 狀態", "狀態機可防止點火/step 暫態和無限等待。"),
          c("raw spectrum、暗訊號、飽和旗標、演算法版本與設備時間戳", "原始資料和版本才能在更新後重播誤報與漏報。"),
          w("只保存最後 endpoint 秒數與操作員截圖", "摘要結果無法區分 sensor drift、演算法或材料轉換。")
        ],
        "量產端點必須同時保存物理規則、狀態機、原始訊號和時間對齊，才能驗證觸發確實跟隨界面。",
        "4.2 OES endpoint 演算法治理"
      ),
      scenario(
        "SiO2 endpoint 由 62 s 漂到 71 s；CO 下降與 F 上升仍同時發生，進料膜厚增加 13%，短片 split 的速率不變。競爭假說為膜厚變化或視窗污染。最合理的判讀是？",
        [
          w("視窗污染，因 endpoint 變晚一定是透光率下降", "雙訊號轉折仍清楚且時間變化與膜厚比例一致，不支持先指定光路。"),
          c("優先驗證膜厚增加，並以產品 CTQ 與標準光源閉環", "13% 膜厚增幅與 62→71 s 約 14.5% 相符，且速率穩定。"),
          w("蝕刻率必然下降 13%", "短片 split 已顯示速率不變。"),
          w("直接把 endpoint 上限改成 80 s 後放行", "規則調整不能取代膜厚與 stop-layer budget 的確認。")
        ],
        "數據先支持膜厚假說，但仍應用獨立光路檢查與 wafer 結果閉環，而非只按比例改時間。",
        "4.2 Endpoint 與膜厚/速率反證"
      ),
      scenario(
        "IEP monitor pad 在 44 s 顯示清除，產品最密區截面仍有 35 nm 殘膜；疏區已過蝕 18 nm。假說 A 是 IEP 演算法誤判，假說 B 是 pad 與產品 microloading 不一致。下一步？",
        [
          w("將 IEP endpoint 延後固定 5 s", "延時可能惡化疏區 stop loss，仍未分辨演算法與代表性。"),
          c("先驗證 IEP，再用多密度截面建立 pad-to-product offset", "先驗證感測本身，再處理 pad 無法代表最密區的產品偏差。"),
          w("只保留疏區量測，因其與 pad 一致", "排除最差結構會掩蓋實際放行失效。"),
          w("提高 over-etch bias 直到密區清除", "可能增加 stop loss、charging 與 profile 副作用。")
        ],
        "精確的 IEP 仍可能量到錯誤代表區；本題需要分開驗證條紋分析與 microloading bridge。",
        "4.2 IEP pad-to-product 邊界"
      ),
      numeric(
        "633 nm IEP 光源量測折射率 n=1.46 的透明膜。依 Δd=λ/(2n)，一個完整條紋代表約多少 nm 膜厚變化？",
        216.8,
        "nm",
        0.03,
        [
          c("216.8 nm", "633/(2×1.46)=216.8 nm。"),
          w("433.6 nm", "這漏掉反射往返造成的 2 倍光程。"),
          w("924.2 nm", "這把波長乘上折射率，而非除以 2n。"),
          w("108.4 nm", "這多除了一次 2。")
        ],
        "IEP 每一完整條紋對應 λ/(2n)；此數值仍需搭配入射角、n 來源和 pad-to-product 驗證。",
        "4.2 IEP 條紋膜厚"
      )
    ]
  },
  {
    chapter: "4.2",
    tag: "r2r-fdc-vm",
    questions: [
      single(
        "MFC 突然卡住造成 flow actual 階躍偏低。哪一層最應先阻止 R2R 繼續補償產品？",
        [
          w("EWMA，讓它用數片資料慢慢追上", "EWMA 適合慢漂，會在突變期間消耗產品並污染狀態估計。"),
          c("由 FDC/interlock 辨識 step fault 並 hold", "時間序列異常偵測應在慢漂控制器更新前攔截突變。"),
          w("VM，把預測值調回規格中心", "VM 是結果估計，不應修改設備狀態或掩蓋 OOD fault。"),
          w("Endpoint，無條件延長到最大時間", "端點不能修復供氣故障，無條件延長還可能增加 stop loss。")
        ],
        "控制階層需先由設備/FDC 攔截突變，再讓 endpoint、VM 與受限 R2R 處理其已驗證範圍。",
        "4.2 R2R、FDC 與 VM 責任分界"
      ),
      multi(
        "VM 要從自動決策降級為 advisory，哪些條件足以觸發？（複選）",
        [
          c("新產品 stack 或 PM 零件版本超出訓練資料", "材料與 chamber state OOD 時舊關聯未被驗證。"),
          c("關鍵 feature 缺失，或 prediction interval 超過產品允許窗", "輸入品質與不確定度不足時不能以點預測放行。"),
          c("metrology residual 在單一高風險產品族群持續偏移", "整體平均正常仍可能掩蓋分群失效。"),
          w("單片預測恰好等於 target", "命中一個中心值不證明模型仍在適用域或已校正。")
        ],
        "VM 的自動權限取決於適用域、資料完整性、不確定度與持續實測校驗，不是單一預測值是否漂亮。",
        "4.2 Virtual Metrology 適用域"
      ),
      scenario(
        "EWMA 使用 λ=0.2 補償慢漂。最近一片 CD 偏差 4 nm，同片 pressure overshoot、match settling time 與 reflected power 都超出健康基線；前後片正常。應如何處理這筆資料？",
        [
          w("直接納入 EWMA，因 λ 小所以不會有風險", "即使權重小，fault sample 仍會污染狀態並驅動錯誤補償。"),
          c("由 FDC 將其分類為事件並 hold/調查，暫停 EWMA 更新；復歸後再用健康量測重建狀態", "多個同步 transient 支持突變，不是慢漂。"),
          w("把 λ 改成 1，下一片一次補完", "更高增益會把單片 fault 全量寫入控制器。"),
          w("只刪除 pressure feature，保留 CD 做補償", "刪除反證會把設備事件錯當製程中心漂移。")
        ],
        "同步設備 transient 使此片不適合更新慢漂估計；先完成事件 disposition，再恢復受限控制。",
        "4.2 EWMA 與 step fault"
      ),
      scenario(
        "新 VM 在歷史 replay 的平均誤差只有 0.8 nm，但資料切分把同一 lot 的相鄰 wafer 分到訓練與測試；跨 PM 驗證誤差變成 3.5 nm。兩個假說是模型過擬合 lot/chamber state，或 metrology 站偏移。最小下一步是？",
        [
          c("依 lot、PM、chamber 分層並用標準片驗證；VM 暫維持 advisory", "分組切分檢驗資料洩漏，標準片則獨立檢查量測偏移。"),
          w("只報 0.8 nm，因樣本數較多", "洩漏的平均誤差不能代表跨狀態泛化。"),
          w("把跨 PM 資料加入訓練後立即上線", "未保留獨立驗證會再次把失配吸收到模型。"),
          w("放寬產品規格到 3.5 nm", "規格不能用來配合未驗證模型。")
        ],
        "本題需同時檢查資料洩漏與 metrology；只有獨立分組驗證才能分辨模型記憶和量測偏移。",
        "4.2 VM 資料切分與量測治理"
      ),
      numeric(
        "EWMA 以 x̂k=λxk+(1-λ)x̂k-1 更新。若 λ=0.25、上一估計為 100 nm、本次健康量測為 108 nm，新估計是多少 nm？",
        102,
        "nm",
        0.01,
        [
          w("100 nm", "這完全忽略本次健康量測。"),
          w("101 nm", "0.25×8 nm 的更新量是 2 nm。"),
          c("102 nm", "0.25×108+0.75×100=102 nm。"),
          w("106 nm", "這相當於把新量測權重誤用為 0.75。")
        ],
        "λ=0.25 只吸收新舊差值 8 nm 的四分之一，因此由 100 更新到 102 nm；fault sample 不應套用此更新。",
        "4.2 EWMA 更新"
      )
    ]
  },
  {
    chapter: "4.3",
    tag: "charging-damage",
    questions: [
      single(
        "加入 antenna diode 後，高 AR 結構的 gate leakage 改善，但 UV-sensitive capacitor 的 Dit 仍上升。最符合證據的結論是？",
        [
          c("二極體抑制了導電充電路徑，但 UV/VUV 光子損傷仍存在", "二極體可洩放電荷，不能遮蔽光子。"),
          w("所有 plasma damage 已被排除，Dit 是量測噪聲", "獨立 UV-sensitive 結構仍呈現系統性變化。"),
          w("Dit 上升證明離子平均能量太高", "Dit 可由光子/界面陷阱造成，現有數據未唯一支持離子。"),
          w("應只再增加二極體面積", "增加導電保護不會直接降低 photon dose。")
        ],
        "保護元件的機制邊界本身就是診斷工具：charging 改善而 UV 指標不變，可分離兩種同時存在的損傷。",
        "4.3 Charging 與 UV/VUV 分流"
      ),
      multi(
        "要區分 charging、UV/VUV 與 ion damage，哪些 split/量測組合具有機制辨識力？（複選）",
        [
          c("不同 antenna ratio 加 diode/no-diode，量 leakage、Qbd 或 TDDB", "AR 與洩放路徑直接檢驗 charging 因果。"),
          c("固定總移除量改變 bias/IEDF，量表面粗化、recess 與淺接面電性", "能量分布 split 對離子轟擊有直接預測。"),
          c("改變 source/photon dose 並使用 UV-sensitive 結構，確認 diode 是否無效", "光子路徑不依賴 antenna 導線。"),
          w("只比較最終平均 CD", "平均 CD 無法分離陷阱、電荷與表面下損傷。")
        ],
        "機制分離需要讓 AR、光子劑量與 IEDF 各自可變，並以對應的電性、材料或可靠度結果驗證。",
        "4.3 五類損傷與量測"
      ),
      scenario(
        "PCM 顯示 AR=50/200/800 的 fail rate 為 0.2%/1.1%/7.8%；改用相同總移除量的 pulsed bias 後變為 0.2%/0.4%/1.3%，wafer edge 改善最大。競爭假說為 charging 或 edge temperature。下一步？",
        [
          c("同步比對電性時序與熱 map，並重複 center/edge AR 矩陣", "AR 斜率與脈衝改善支持 charging，但 edge 差異仍需排除熱路徑。"),
          w("只因平均 fail rate 下降就直接全產品放行", "仍有位置交互作用與長期 reliability 未閉環。"),
          w("把所有 edge 結果刪除，以免位置共線", "edge 是需被設計分離的機制訊號，不是可刪除的離群。"),
          w("只增加 over-etch，確認 fail 是否再下降", "增加 dose 可能同時加重 charging 和材料損傷。")
        ],
        "AR 依賴和 pulsing response 強烈支持 charging；加入熱/He 與時間解析電位可檢查 edge 交互作用。",
        "4.3 Antenna PCM 與脈衝中和"
      ),
      scenario(
        "一次 arc 發生在 bias ramp，RF trace 有 voltage collapse、reflected spike；同方位 wafer edge 出現 3 個金屬噴濺點，後續兩片 particle 增加。應如何 disposition？",
        [
          w("提高 arc threshold，避免再次誤停", "已有實體噴濺與後續 particle，不能視為偵測過敏。"),
          c("停機隔離事件窗 wafer；完成設備與產品證據後再復歸", "高後果事件同時有波形、位置和污染證據，需硬體與產品雙路徑處置。"),
          w("只重跑受影響 wafer，尺寸通過即可", "重跑可能增加損傷，尺寸也不能排除金屬污染與可靠度。"),
          w("交由 EWMA 延長時間補償 particle", "慢漂控制器不能處理局部放電或污染。")
        ],
        "Arc 的快速切斷不等於產品安全；本題已有 crater/噴濺和片序污染證據，必須停機、隔離並復歸。",
        "4.3 Arcing 事件與風險決策"
      ),
      numeric(
        "一個導體 antenna 面積為 24,000 µm²，連到 40 µm² 的 gate。依 AR=Aconductor/Agate，天線比是多少？",
        600,
        "relative",
        0.01,
        [
          w("60", "24,000/40 不是 60。"),
          w("240", "這把面積單位或除數誤讀。"),
          c("600", "24,000÷40=600。"),
          w("960,000", "這是相乘而非面積比。")
        ],
        "天線比為 600；它表示收集面積相對 gate 面積的尺度，不是跨節點通用的安全上限。",
        "4.3 天線比"
      )
    ]
  },
  {
    chapter: "4.3",
    tag: "package-damage",
    questions: [
      single(
        "封裝 plasma clean 後接觸角由 52° 降至 14°，但 Cu pad oxide 增厚、ball shear 在 HAST 後下降。這個條件應如何判定？",
        [
          w("接觸角最低，應列為最佳 recipe", "潤濕改善不能覆蓋 Cu 氧化與濕熱後接合失效。"),
          c("已超出 damage budget；降 dose 後重做 bond/reliability", "清潔效果與材料、接合可靠度必須同時在窗口內。"),
          w("只把 ball shear 規格放寬", "規格放寬不能消除已觀測的界面劣化機制。"),
          w("再 clean 一次確認接觸角是否更低", "重洗會累積 Cu oxide、roughness 與 polymer dose。")
        ],
        "封裝清潔的終點是功能與可靠度，不是單一表面能代理；本題已有明確過度處理證據。",
        "4.3 封裝清潔 damage budget"
      ),
      multi(
        "為 RDL/UBM/Cu 與 PI/PBO/mold compound/low-k 共存表面建立清潔窗口，哪些反應量不可省略？（複選）",
        [
          c("Cu/UBM 氧化態、roughness、接觸電阻與再氧化 queue", "金屬初始乾淨不代表等待後仍適合接合。"),
          c("PI/PBO 與 mold compound 的官能基、厚度、filler exposure、吸濕或 outgassing", "聚合物可能在外觀正常時已化學劣化。"),
          c("low-k 碳耗損/親水化與電性或既有 reliability proxy", "膜厚穩定不能排除多孔介電質損傷。"),
          w("只量中心 coupon 的接觸角", "單點 proxy 無法代表多材料、pad edge 與產品功能。")
        ],
        "多材料封裝表面必須分開量金屬、聚合物、low-k 及接合功能，並納入 queue 與位置。",
        "4.3 封裝多材料相容性"
      ),
      scenario(
        "同一 lot 在 clean 後 30 min bonding 通過，等待 8 h 後 NSOP 增加；XPS 顯示 Cu oxide 隨 queue 增長，PI FTIR 穩定。假說為 Cu 再氧化或 polymer 疏水回復。最有力的確認是？",
        [
          c("做 queue time series，分別追 Cu 化學態、bond 與 PI 表面能", "金屬與 polymer 分流量測可對兩個假說給出不同預測。"),
          w("8 h 產品全部 re-clean 後直接 bonding", "未 qualification 的重洗可能累積金屬與 polymer 損傷。"),
          w("只量整面接觸角", "整面數值可能由 PI 主導，無法辨識 Cu pad 再氧化。"),
          w("提高 O2 clean 時間以延長 queue", "更強氧化條件可能加速 Cu oxide，方向與證據衝突。")
        ],
        "時間序列需把 Cu pad 與 polymer 表面分開，並連到實際 bond；超窗產品在 re-clean qualification 前應 hold。",
        "4.3 Queue、Cu 氧化與接合"
      ),
      scenario(
        "PI/PBO 與 mold compound 表面殘膠下降，但 AFM roughness 增加 70%、filler exposure 上升，初始 die shear 尚可、MSL 後 delamination 增加。應如何調整開發方向？",
        [
          w("維持 recipe，因初始 die shear 通過", "MSL 後 delamination 已顯示長期界面失效。"),
          w("增加 bias 以進一步去除 filler 周圍殘膠", "更高物理 dose 可能加劇 roughness 與 filler exposure。"),
          c("回到最低有效 dose，以殘膠、形貌、吸濕與 MSL 找窗口", "現有結果顯示清除與材料損傷在競爭，需降低直接轟擊。"),
          w("把 mold compound 結果外推到 low-k", "兩者化學與孔隙結構不同，不能共用材料結論。")
        ],
        "初始接合不代表可靠度；roughness、filler 與 MSL 分離要求降低 damage dose 並重新平衡清潔。",
        "4.3 Polymer 與 mold compound 可靠度"
      ),
      graphic(
        "圖中同一 dose sweep 顯示 organic residue 持續下降，但 Cu oxide 與 polymer roughness 在高 dose 上升，bond reliability 在中間 dose 達峰值。量產中心應選在哪一區？",
        "/assets/svg/l4/l4-package-window.svg",
        "封裝清潔 dose 橫軸，殘膠下降、Cu 氧化與 polymer 粗糙度上升、接合可靠度呈中間峰值的四曲線圖",
        [
          w("最右端，因殘膠最低", "最右端同時有最高氧化/粗糙與下降的可靠度。"),
          c("可靠度平台內且殘膠已低、氧化與粗糙尚未越界的中間區", "多 CTQ 同時成立才是 damage budget 內的製程窗。"),
          w("最左端，因材料損傷最低", "最左端殘膠仍高，清潔目的未達成。"),
          w("只依 Cu oxide 最低點，不看 polymer 與 bond", "多材料界面不能由單一金屬指標放行。")
        ],
        "圖形的可接受區是中間共同窗口，不是任何單一曲線的極值；需再以 queue、re-clean 與可靠度確認。",
        "4.3 封裝清潔多目標窗口"
      )
    ]
  },
  {
    chapter: "4.4",
    tag: "pulse",
    questions: [
      single(
        "要直接調變 wafer IEDF、讓離子高能尾只在清底時出現，首選控制模式是哪一種？",
        [
          w("只做 source pulsing", "Source 主要改變解離、Te 與自由基庫，不直接指定 wafer 鞘層能量。"),
          c("Bias pulsing，並量測實際 Vdc/VI 與高能尾 proxy", "Bias 對鞘層加速最直接，但仍須驗證實際波形。"),
          w("只降低總流量", "流量會改變 residence/chemistry，不能獨立調控 IEDF 時序。"),
          w("把 continuous power 換算成相同平均 watt 即視為等效", "相同平均功率不保證峰值、相位或 transient 相同。")
        ],
        "Bias pulsing 最直接控制 ion-energy timing；source 與同步模式則分別偏向自由基生成及兩者相位。",
        "4.4 三種脈衝模式"
      ),
      multi(
        "要證明 off-phase 確實降低 charging，而不是單純少蝕刻，實驗需要哪些條件？（複選）",
        [
          c("把 pulsed 與 continuous 配對到相同總移除量、材料與幾何", "相同 CTQ 才能排除少 dose 的表面改善。"),
          c("保存 delivered source/bias 波形、Vdc/VI、frequency、duty 與 phase", "名義 setpoint 無法證明鞘層真的回復。"),
          c("量 charging-sensitive 結構的 on-phase 上升/off-phase 回落與最終可靠度", "時間軌跡和產品結果共同驗證中和。"),
          w("只比較峰值功率與平均 etch rate", "缺少總時間、off-time 與電荷路徑，無法辨識機制。")
        ],
        "有效脈衝證據需同時約束總移除量、實際波形、電荷時序和電性/可靠度。",
        "4.4 Off-phase 中和證據"
      ),
      scenario(
        "2 kHz、80% duty 的 bias pulse 使平均 Vdc 下降，但 antenna PCM 無改善；時間解析 trace 顯示 off 期間 gate potential 只下降 3%。競爭假說為 off-time 太短或 UV 主導。下一步？",
        [
          c("固定總移除量掃 off-time，並加入 charging 與 UV 監測結構", "off-time sweep 檢驗 RC 中和，diode/UV 結構則分離光子路徑。"),
          w("只再降低平均 power", "平均值不能判斷鞘層回復或 UV dose。"),
          w("宣稱 pulsing 對此產品無效並停止量測", "目前尚有兩個可區分假說未測。"),
          w("提高頻率到 10 kHz 增加 off 次數", "頻率更高會縮短單次 off-time，可能更不利於中和。")
        ],
        "trace 已顯示中和不足，但原因可能是時間尺度或非充電損傷；正交 split 可避免錯把兩者混為一談。",
        "4.4 Off-time、RC 與 UV 競爭假說"
      ),
      scenario(
        "同步脈衝設定 source 先行 40 µs、bias 後行；量測卻顯示 reflected power 使 source 有效建立延遲 35 µs，bias 幾乎與 plasma 點火同時。應如何評估『先改質再移除』主張？",
        [
          w("仍以設定相位 40 µs 宣稱順序成立", "有效波形而非命令時間決定表面收到的 dose。"),
          c("依 delivered waveform 重算相位，修正後再驗證表面結果", "點火延遲已消耗設計的先行區，需從實際狀態重建因果。"),
          w("只看最終厚度相同就接受", "厚度不能證明改質與移除真正分時，也不能排除高能同步。"),
          w("增加 bias 峰值補償延遲", "更高峰值會改變 damage window，且不修復順序錯位。")
        ],
        "同步模式的物理目的取決於 actual rise/fall 與 plasma 建立，不可由名義 phase 單獨認定。",
        "4.4 同步脈衝實際波形"
      ),
      graphic(
        "圖中 source 先開、bias 延後，bottom charge 在兩者重疊時上升、bias-off 後回落；continuous 參考則持續累積。哪個判讀最符合圖形？",
        "/assets/svg/l4/l4-pulse-timing.svg",
        "Source 與 bias 方波、電子密度、鞘層和底部電荷共用時間軸，另有 continuous 電荷虛線",
        [
          c("相位分離提供改質與中和窗口，但仍需以相同總移除量驗證 profile 與 damage", "圖只證明時序趨勢，產品接受仍需 CTQ。"),
          w("Bias-off 期間沒有任何離子、自由基或電荷交換", "Source 與 afterglow 仍可能維持物種，圖也未支持完全歸零。"),
          w("Continuous 電荷較高即可證明 pulsed recipe 產能更高", "電荷圖不提供 throughput 或總移除量。"),
          w("只要 charge 回落，UV/VUV 損傷也同步消失", "光子路徑不由導電電荷回落直接排除。")
        ],
        "圖形支持 off-phase 中和與相位控制的假說，不提供化學、產能或光子損傷的自動保證。",
        "4.4 脈衝時序判讀"
      )
    ]
  },
  {
    chapter: "4.4",
    tag: "ale",
    questions: [
      single(
        "一個四步循環的 EPC 隨改質 dose 持續線性上升，移除-only 的 beta 又接近完整 EPC。這能稱為雙自限制 ALE 嗎？",
        [
          w("可以，只要步驟名稱是改質/purge/移除/purge", "四步名稱不等於表面飽和或選擇性移除。"),
          c("不可以；改質未顯示飽和且移除半步有顯著直接蝕刻", "兩個關鍵自限制均缺少證據。"),
          w("可以，因 EPC 線性代表 cycle control", "Cycle 線性也可能來自穩定的寄生 continuous etch。"),
          w("只需增加 cycle 數讓總移除更明顯", "更多 cycle 會累積未被辨識的基材損失。")
        ],
        "ALE 必須由改質飽和和選擇性移除兩條平台證明；alpha/beta 接近 EPC 時應降級為 quasi-ALE。",
        "4.4 ALE 雙自限制"
      ),
      multi(
        "ALE qualification 的 cycle budget 應包含哪些獨立實驗？（複選）",
        [
          c("改質 dose sweep 與改質-only alpha", "用來判斷表面飽和和半步寄生移除。"),
          c("Purge sweep 與 pressure/mass transient", "用來確認兩半步沒有氣相重疊。"),
          c("移除能量 sweep、移除-only beta 與基材/stop loss", "用來尋找改質層門檻和直接損傷門檻。"),
          w("只比較完整循環的平均 EPC", "完整 EPC 無法分離兩個寄生半步與 purge 缺口。")
        ],
        "Cycle budget 要能獨立回答飽和、purge 與 energy window，並將 EPC、alpha、beta、殘留和材料損失一起報告。",
        "4.4 ALE cycle budget"
      ),
      scenario(
        "完整循環 EPC=0.22 nm，alpha=0.02、beta=0.01；purge 從 2 s 縮到 0.5 s 後 EPC 升到 0.34 nm，但 carbon residue 與 roughness 同時上升。最合理的機制是？",
        [
          w("自限制效率提高，因此 EPC 越大越好", "殘留與 roughness 上升不符合乾淨自限制平台。"),
          c("判定半反應重疊；恢復並掃 purge 以排除 CVD 成分", "縮短 purge 同時改變移除與污染，支持氣相/表面交叉反應。"),
          w("Beta 必然變成零", "更強重疊通常不會自動消除基材寄生損失。"),
          w("只增加第二 purge 即可，不需量 first purge", "兩個 purge 分別隔離反應物與副產物，均需驗證。")
        ],
        "高 EPC 伴隨殘留與粗糙不是 ALE 改善，而是 purge 分離失效的訊號。",
        "4.4 Purge 完整性"
      ),
      scenario(
        "Cu oxide 原子層式清潔在 fresh coupon 上接觸電阻下降，但實際 RDL pad 經 4 h queue 後再氧化更快，PI 邊緣 FTIR 也改變。下一輪最小矩陣應如何設計？",
        [
          c("分層 Cu 初態、RDL/UBM 幾何與 PI/PBO，掃 dose 與 queue", "材料、初始狀態與等待皆是現有失配的可辨識因子。"),
          w("只在 fresh Cu 增加 cycle 數，找最低接觸電阻", "這會忽略再氧化和 polymer damage。"),
          w("把 PI 邊緣遮掉後宣稱產品通過", "實際產品多材料共存，排除失敗區不能建立量產窗口。"),
          w("直接將 coupon recipe 複製到所有 UBM 材料", "不同金屬/阻障層的反應和粗化門檻不同。")
        ],
        "封裝 ALE 必須以實際 pad、多材料與 queue/reliability 驗證，不能由 fresh 平面 coupon 外推。",
        "4.4 封裝原子層清潔"
      ),
      graphic(
        "圖中改質 dose 在 3 單位後 EPC 進入平台；移除能量 18–28 eV 可清除改質層，而 beta 在 30 eV 後快速上升。應選哪個區域做中心點？",
        "/assets/svg/l4/l4-ale-window.svg",
        "ALE 改質 dose 飽和曲線與移除能量窗口圖，顯示 EPC 平台及高能 beta 上升",
        [
          w("改質 dose 1、能量 12 eV", "改質未飽和且能量低於完整移除門檻。"),
          c("選 dose 3–4、能量 22–25 eV 的共同窗口", "位於改質平台和直接基材損失上升前的 energy window。"),
          w("改質 dose 8、能量 36 eV", "過量 dose 無平台收益且能量已進入 beta 高風險區。"),
          w("只選 EPC 最大的能量，不看 beta", "最大移除可能來自直接 sputter，不是選擇性 ALE。")
        ],
        "圖形同時要求改質飽和與低 beta 的移除窗；量產中心應遠離兩側門檻並以產品材料確認。",
        "4.4 ALE 飽和與 energy window"
      )
    ]
  },
  {
    chapter: "4.4",
    tag: "har-cryo",
    questions: [
      single(
        "Cryo 深蝕刻的 edge profile 在長 recipe 後轉為 undercut，chuck setpoint 未變但 edge He response 漂移。首要假說是？",
        [
          w("氣體化學必然失控，因 setpoint 溫度固定", "Chuck setpoint 不等於 feature temperature，He response 已指出熱路徑。"),
          c("Edge 熱接觸/He 使實際 feature temperature 漂移，改變鈍化平衡", "長時間與位置依賴都符合熱穩態假說。"),
          w("只因 undercut 就判定自由基通量不足", "自由基不足常導致殘留/速率下降，未唯一解釋 edge 時序。"),
          w("量測站 offset，因所有 cryo profile 都不可重複", "目前有設備 He proxy 與長 run 關聯，不能先排除製程。")
        ],
        "Cryo 必須沿 chuck、He、接觸和 RF heat 追實際熱路徑；固定設定值不能排除 feature 溫度漂移。",
        "4.4 HAR/Cryo 熱路徑"
      ),
      multi(
        "要分離 ARDE、microloading 與 charging，test vehicle 應包含哪些設計？（複選）",
        [
          c("固定 local density 改 CD/AR 的結構", "可觀察幾何深度對底部通量的效應。"),
          c("固定 AR 改 local density 的結構", "可辨識局部 loading 而非深度本身。"),
          c("不同 antenna/導電洩放路徑並保留 wafer 方位", "可檢查 charging 與空間電漿不均勻。"),
          w("只量一個最深、最密結構的最終深度", "AR 與 density 完全共線，且沒有深度演變證據。")
        ],
        "正交幾何與 charging 結構讓三個競爭機制有不同預測；還需深度序列和位置 map。",
        "4.4 HAR 機制分離"
      ),
      scenario(
        "降低 pressure 後 HAR bottom residue 減少、twist 改善，但 mask loss 增加 35%、stop loss 增加 20%。兩個假說是角度分布改善或 ion energy 過高。如何找共同窗口？",
        [
          c("固定較低 pressure，掃 bias/波形並量 bottom 與 mask budget", "Pressure 改善傳輸/角度，但需用 bias 將高能副作用分離。"),
          w("只採最低 pressure，因 bottom residue 是唯一 CTQ", "Mask 和 stop 已明顯越界，不能以底部清除單項放行。"),
          w("提高 passivation 到 residue 再出現", "未分離能量前，增加鈍化可能導致 taper 或 etch stop。"),
          w("把 mask loss 視為量測誤差，不做 MSA", "35% 系統變化需驗證，不能直接排除不利結果。")
        ],
        "低壓改善支持角度/傳輸，但 mask/stop 代價指出需另調能量分布，找多 CTQ window。",
        "4.4 HAR 傳輸與能量預算"
      ),
      scenario(
        "Tailored waveform 在 center coupon 使 sidewall 平滑，edge 最密結構仍有 residue；總 etch time 增加 40%，charging PCM 改善。下一步最合理？",
        [
          w("以 center coupon 宣稱 waveform 已完成 qualification", "Edge、密度與產能尚未通過。"),
          c("建立 center/edge × density/AR 序列，核對波形、熱路徑與 dose", "現有結果同時涉及空間供應、熱與時間劑量。"),
          w("只再延長 40% 直到 edge 清除", "可能增加 mask、stop 和總 charging/材料 dose。"),
          w("降低抽樣，只保留 center 以維持一致", "量產放行必須涵蓋最差位置與結構。")
        ],
        "波形改善單一 coupon 只能支持下一輪受控實驗；需用空間、幾何、actual 與產能共同閉環。",
        "4.4 Tailored waveform 產品橋接"
      ),
      graphic(
        "圖中的 depth map 顯示低 AR 結構全片接近 target，高 AR 結構只在 edge 變慢；wafer rotation 後慢區仍固定在 chamber 方位。優先調查什麼？",
        "/assets/svg/l4/l4-har-map.svg",
        "低與高深寬比的 wafer depth map，高 AR 只在固定 chamber 方位 edge 呈現低深度區",
        [
          w("只增加所有 wafer 的總時間", "會讓低 AR 與健康區過蝕，且未處理方位來源。"),
          c("優先檢查 edge 邊界與零件狀態，並保留高 AR test vehicle", "Rotation 後固定 chamber 方位，且只影響高 AR，指向設備分布與幾何交互作用。"),
          w("產品 notch 設計，因慢區在 edge", "若隨 wafer notch，rotation 後應跟著 wafer 轉。"),
          w("量測站固定偏差，且不需 reference wafer", "量測偏差仍是候選，但 chamber 方位與 AR 交互需 reference/rotation 證據確認。")
        ],
        "固定 chamber 方位和高 AR 選擇性共同指向 edge plasma/thermal distribution，而不是單純全片速率。",
        "4.4 HAR 空間 signature"
      )
    ]
  },
  {
    chapter: "4.5",
    tag: "global-model",
    questions: [
      single(
        "固定氣體、幾何與損失模型的 0-D sweep 中，absorbed power 加倍，Te 只小幅變化而 ne 近似加倍。最合理的物理解釋是？",
        [
          c("粒子平衡把 Te 約束在足以補償損失的區間，新增能量主要由更高 ne 承擔", "這是固定假設下全域模型常見的條件式趨勢。"),
          w("Te 在任何 plasma 都與功率無關", "模式、EEDF、表面與耦合改變時 Te 可非線性變化。"),
          w("Generator setpoint 必然等於 absorbed power", "反射、match 與耦合會改變真正沉積到 plasma 的功率。"),
          w("ne 加倍證明局部 edge density 也加倍", "0-D 是整腔平均，不能提供空間 map。")
        ],
        "ne 對 absorbed power 近線性是特定平衡假設內的趨勢，不是跨模式或空間位置的定律。",
        "4.5 0-D 粒子與能量平衡"
      ),
      multi(
        "把 generator power sweep 用於 0-D 校正前，哪些資料必須補入 absorbed-power 證據鏈？（複選）",
        [
          c("Forward/reflected 或 delivered power 與 match 狀態", "反射和匹配決定可耦合能量。"),
          c("腔體/壁面狀態、壓力與可能的 E/H mode 轉換", "損失與耦合模式改變會破壞原趨勢。"),
          c("至少一項 ne/Te 或 OES/VI proxy 與 wafer rate 趨勢", "獨立量測可檢查模型輸出是否對應實際狀態。"),
          w("只保存 generator 設定值與模擬小數位", "設定值不是能量沉積，數值精度也不是校正。")
        ],
        "0-D 的能量輸入需從設備耦合與量測建立，而不是把 generator setpoint 當作物理吸收功率。",
        "4.5 Absorbed power 與模型校正"
      ),
      scenario(
        "0-D 預測 source power 由 800→1200 W 時 ne 增 45%、Te 變 3%；實測 OES actinometry 增 10%、VI 顯示 reflected power 同時由 5% 升到 28%。假說為 reaction set 錯或 absorbed power 未增加。先做什麼？",
        [
          c("用 delivered/absorbed power 重建 sweep，再檢查模型失配", "反射已提供直接競爭解釋，應先修正模型能量輸入。"),
          w("先調大 ionization cross section 使 ne 對上", "在能量輸入未閉環前調反應係數會吸收硬體耦合誤差。"),
          w("忽略 VI，因 OES 已量到 plasma", "OES 仍受 EEDF/光路影響，且 VI 正好說明有效功率差異。"),
          w("直接將 45% 當產品 rate 增幅", "ne proxy 不等於特定表面反應或產品速率。")
        ],
        "模型失配先查可量的輸入與耦合；只有 absorbed power 對齊後仍失配，才更新 reaction/wall 假說。",
        "4.5 0-D 失配處置"
      ),
      scenario(
        "Remote package clean 的 0-D 模型沿用 Si chamber wall-loss coefficient，預測 radical flux 穩定；實際 mold compound lot 改變後 outgassing 上升、Cu oxide removal 下降。如何處理？",
        [
          w("以模型 flux 穩定判定 lot 差異與 plasma 無關", "多材料 outgassing 會改變物種收支和壁面損失。"),
          c("納入材料 lot/outgassing；完成 Cu/PI 與 bond 驗證前只作排序", "原 surface coefficient 超出校正材料範圍。"),
          w("只增加 clean time 直到 oxide removal 恢復", "可能加重 Cu、PI/PBO 或 mold compound damage。"),
          w("把 Cu oxide 結果用同一係數回填後宣稱預測完成", "單一輸出校正不能驗證物種、材料與可靠度。")
        ],
        "封裝 wall/material 變化使 0-D 邊界失效；模型只能提出受控實驗方向，不能直接放行。",
        "4.5 0-D 封裝材料邊界"
      ),
      graphic(
        "圖中 absorbed power 增加時 ne 近線性上升、Te 近平台；在模式轉換點兩者同時跳變。哪個結論正確？",
        "/assets/svg/l4/l4-global-balance.svg",
        "吸收功率橫軸，電子密度近線性、電子溫度近平台並在模式轉換處同時跳變的雙軸曲線",
        [
          w("Te 對功率永遠不敏感", "模式轉換處已顯示假設改變後 Te 跳變。"),
          c("近線性只適用於同一損失/耦合模式；轉換後需重新校正平衡與量測", "圖形直接標出條件式區域與模式邊界。"),
          w("ne 曲線可直接預測 wafer edge map", "0-D 曲線沒有空間資訊。"),
          w("把 generator setpoint 當橫軸也會得到同一物理結論", "若耦合效率變化，setpoint 與 absorbed power 不等價。")
        ],
        "圖示強調 0-D 趨勢的條件性：同一模式內可近似，跨耦合/損失轉換不能外推。",
        "4.5 0-D 條件式趨勢"
      )
    ]
  },
  {
    chapter: "4.5",
    tag: "model-layers",
    questions: [
      single(
        "工程問題是『pump port 方位是否造成 edge radical depletion map』。最低足以回答空間來源的模型層級是？",
        [
          w("0-D global model", "整腔平均模型沒有方位或 edge 空間分布。"),
          c("採含流動與反應邊界的 fluid model，並用空間量測驗證", "流體層可解析幾何、流場和物種空間分布。"),
          w("只做 feature profile animation", "Profile 需要上游通量分布，不能自行判定 pump port。"),
          w("只用 PIC-MCC 單一局部鞘層", "局部 particle model 不必然涵蓋全腔 pump/flow 方位。")
        ],
        "模型層級由問題尺度決定；全腔方位分布需要空間模型，之後才把通量交給 feature 層。",
        "4.5 四層模型選擇"
      ),
      multi(
        "PIC-MCC 要用來比較 bias waveform 的 IEDF，哪些數值品質資訊不可省略？（複選）",
        [
          c("Time step 是否解析 RF/pulse phase，網格是否解析 sheath", "時空解析不足會直接扭曲粒子加速。"),
          c("代表粒子數、random seed、統計誤差與收斂", "Monte Carlo 雜訊需量化才能比較高能尾。"),
          c("電荷/能量守恆與邊界條件", "偶然吻合量測不能取代模型內部一致性。"),
          w("只保存一張平滑 IEDF 圖", "沒有數值治理就無法判斷峰和尾端是否為統計/離散假象。")
        ],
        "PIC-MCC 的物理細節只有在 time step、mesh、粒子統計與守恆通過後才有可信度。",
        "4.5 PIC-MCC 數值可信度"
      ),
      scenario(
        "Profile model 用同一張 AR=5 SEM 擬合 sticking coefficient，接著宣稱能預測 AR=30 bowing；沒有獨立 IEDF 或其他深度截面。要如何評級？",
        [
          c("只能列為情境示意；需用未參與擬合的多 AR/深度截面與上游 IEDF/通量驗證", "同一 SEM 同時校正和評分不能支持外推。"),
          w("已是預測模型，因 fitting error 很低", "低 fitting error 只說明重現校正樣本。"),
          w("增加動畫解析度即可提高 AR=30 可信度", "視覺解析度不修復輸入和驗證缺口。"),
          w("只要模型使用 level-set 就可跨材料", "求解方法不提供未知 surface coefficient。")
        ],
        "Profile 層的可信度受上游通量和表面係數支配；未見獨立幾何/時間驗證時不可外推。",
        "4.5 Profile evolution 邊界"
      ),
      scenario(
        "Fluid model 預測 remote clean center/edge flux 差 6%，實測 Cu oxide removal 差 5%，但 PI edge roughness 差 18%。競爭假說為 flux map 或材料/溫度敏感性。下一步？",
        [
          c("加入材料敏感度與 PI-specific 量測，再用獨立 wafer 驗證", "Cu 對上不代表 PI response 可由同一係數解釋。"),
          w("因 Cu 符合就宣稱模型預測所有材料", "多材料反應與熱敏感度不同。"),
          w("把 PI roughness 乘 5/18 校正回模型", "縮放結果沒有辨識材料或熱路徑。"),
          w("刪除 edge PI 點，保留平均值", "Edge 是模型需解釋的最差位置，不是離群資料。")
        ],
        "模型可同時部分正確和材料不完整；需要材料分層和獨立驗證，而非由 Cu 結果外推 PI。",
        "4.5 Fluid-to-surface handoff"
      ),
      graphic(
        "圖示由 0-D → fluid → PIC-MCC → profile 串接，profile 結果與 SEM 分離。最先應回查哪一條交接？",
        "/assets/svg/l4/l4-model-handoff.svg",
        "四層模型流程圖，標出 global 物種、fluid map、PIC IEDF 與 profile 截面，最後與獨立 SEM 比較",
        [
          w("直接調 profile 顏色與 mesh，直到看起來相似", "外觀調整不檢驗上游物理輸入。"),
          c("核對跨層通量、IEDF、角度與 surface coefficients", "Profile 失配常源自模型層間輸入與材料邊界。"),
          w("只重跑 0-D，因所有模型都由它決定", "Fluid/PIC/profile 還有幾何和表面假設，不能只查平均層。"),
          w("用同一張 SEM 重新擬合後當獨立驗證", "校正樣本不能再次作外部評分。")
        ],
        "跨層模型的首要稽核是物理量、條件與版本是否一致交接，再用未參與擬合的資料驗證。",
        "4.5 模型層級交接"
      )
    ]
  },
  {
    chapter: "4.5",
    tag: "data-trust",
    questions: [
      single(
        "將 surface sticking coefficient 調到平均 etch rate 符合後，center/edge 與副產物趨勢反而變差。這表示什麼？",
        [
          w("平均 rate 已對上，所以模型完成校正", "一個自由參數對一個輸出可能掩蓋錯誤機制。"),
          c("該係數正在吸收其他缺失物理；需保留失配並用敏感度與獨立輸入約束", "多輸出反向失配表示校正不可識別。"),
          w("應再調第二個係數直到所有圖都對上，不需新資料", "增加自由度但沒有獨立量測會加重非唯一性。"),
          w("只報平均 rate，不公開 map 和副產物", "選擇性報告破壞可信度與可反駁性。")
        ],
        "模型校正需同時維持多個物理輸出；單點吻合而其他趨勢惡化，是結構/輸入缺口的證據。",
        "4.5 反應集與表面係數可信度"
      ),
      multi(
        "可重播的模型交付包至少應包含哪些內容？（複選）",
        [
          c("Collision/reaction set 與 surface coefficient 的來源、版本、狀態及範圍", "輸入可追溯才可在資料更新後審查。"),
          c("Geometry/input deck、solver 設定、mesh/time step、random seed 與 raw output", "這些欄位支援數值重現與差異定位。"),
          c("校正/獨立驗證/失敗案例的分割與每張比較圖來源", "資料切分可避免重用樣本製造假精準。"),
          w("只有最終簡報和最佳曲線", "缺少原始輸入、版本與失敗資料時無法重播或反證。")
        ],
        "模型交付的品質來自可追溯、可重播和保留失敗，不是圖表數量。",
        "4.5 模型資料治理"
      ),
      scenario(
        "Reaction database 更新後，模型對 calibration wafer 更準，但對保留的 validation lot rate 誤差由 4% 升到 11%，profile 方向也反轉。應如何發布？",
        [
          w("覆寫舊版，因新資料庫日期較新", "新版本不必然更適用於本材料與驗證範圍。"),
          c("保留舊版，記錄 regression，阻止新版本升級並追查反應/表面敏感度", "獨立 validation 退步是明確 release gate 失敗。"),
          w("把 validation lot 加入校正後再評自己", "這會消除獨立驗證，無法知道泛化是否改善。"),
          w("只報 calibration error，不報 profile 反轉", "隱藏失配會讓模型被錯用於產品決策。")
        ],
        "版本治理必須允許退回；來源更新不能凌駕獨立產品/機制驗證。",
        "4.5 版本退回與 regression"
      ),
      scenario(
        "模型用平坦 Cu coefficient 排序三支封裝 clean recipe；預測 B 的 ion dose 最低。實際 B 在 RDL pad edge 有 oxide 殘留，PI/PBO 吸濕上升。如何使用模型結果？",
        [
          c("把低 ion dose 當中介假說，補做材料與 bond/reliability 驗證", "模型沒有涵蓋多材料幾何和表面化學，不能直接等同 clean quality。"),
          w("仍選 B，因模型輸出比表面量測更基礎", "實際產品失效已反駁低 dose 等於合格的推論。"),
          w("把 oxide 殘留和吸濕平均成一個分數", "兩者機制與放行邊界不同，不宜用平均掩蓋。"),
          w("提高 B 的 ion dose 直到 oxide 消失，不看 PI", "可能加劇 polymer 與 low-k 損傷。")
        ],
        "模型可協助排序，但多材料表面結果已界定其適用邊界；下一步是受控 qualification，而非自動選 recipe。",
        "4.5 封裝模型可信度"
      ),
      graphic(
        "圖中 calibration error 持續下降，但 validation error 在模型複雜度 3 後回升；release gate 應選哪個區域？",
        "/assets/svg/l4/l4-validation.svg",
        "模型複雜度橫軸，校正誤差單調下降、獨立驗證誤差先降後升並標示 release gate 的曲線圖",
        [
          w("最右端，因 calibration error 最低", "最右端 validation error 已回升，顯示過擬合。"),
          c("Validation error 最低且敏感度/物理守恆通過的中間區", "Release 由獨立資料與物理 gate 決定，不由 fitting 極小值決定。"),
          w("最左端，因模型最簡單就一定最可信", "過度簡化也可能無法回答需求，仍需看 validation。"),
          w("把兩條誤差相加後選平均最低，不需保留失敗案例", "校正和驗證角色不同，不能以平均掩蓋泛化退步。")
        ],
        "圖形展示典型過擬合；可信 release 位於獨立驗證最佳且物理/數值 gate 通過的區域。",
        "4.5 Calibration 與獨立驗證"
      )
    ]
  },
  {
    chapter: "4.6",
    tag: "chamber-matching",
    questions: [
      single(
        "兩個 chamber 平均 etch rate 相同，但 B 的 match position、edge ring 與 particle signature 都不同。下一步順序是？",
        [
          w("先加 chamber-specific recipe offset 讓 edge ring 變小", "硬體/狀態差異未閉環，offset 會掩蓋症狀。"),
          c("先比 parts/校正/clean/seasoning，再比 VI/OES 等 plasma fingerprint，最後做 wafer CTQ bridge", "Matching 需依硬體、電漿、產品三層順序。"),
          w("只看平均 rate，已可宣稱 matched", "空間 signature 和 particle 已明確分離。"),
          w("把 B 的 edge 點排除後建立共同平均", "排除最差區會製造虛假的可互換性。")
        ],
        "平均結果只是 wafer 層的一部分；硬體和 plasma 指紋不同時應先修復/校正，再談受控 offset。",
        "4.6 Chamber matching 三層"
      ),
      multi(
        "封裝 clean chamber matching 的 bridge 除了 plasma proxy，還需哪些材料/產品證據？（複選）",
        [
          c("RDL/UBM/Cu 氧化、roughness、pad edge 與接觸/接合", "平均 proxy 可能看不到局部金屬界面差異。"),
          c("PI/PBO/mold compound/low-k 的配方、吸濕、filler 與表面化學", "不同材料族群可對同一 plasma state 有不同 response。"),
          c("Queue/re-clean history、particle/離子殘留與既有 reliability CTQ", "產品結果取決於處理後物流和累積 dose。"),
          w("只用平坦 Si coupon 接觸角", "Coupon 不能代表 fine-pitch pad 和多材料 stack。")
        ],
        "封裝 matching 必須從 chamber 指紋橋接到實際多材料、queue、bond 與可靠度。",
        "4.6 封裝 chamber matching"
      ),
      scenario(
        "A/B chamber 使用同 recipe。B 的 flow/pressure actual 一致，但 focus ring 版本不同、VI phase 偏 7°、edge CD 偏 4 nm；換回共同 ring 後 phase 與 CD 同時回復。根因信心如何評估？",
        [
          c("Focus ring/電氣邊界為主因；重複驗證後再決定 offset", "硬體交換同時恢復 plasma 與 wafer 結果，形成因果 bridge。"),
          w("仍優先調 recipe，因所有 chamber 都應有獨立 center", "可修復的硬體差異不應被永久 recipe 補償。"),
          w("Flow 是主因，因 CD 與氣體最相關", "Actual 一致且 ring swap 已提供更直接證據。"),
          w("只要一片回復就立即結案", "仍需重複與生命週期確認，避免偶然/seasoning 混入。")
        ],
        "受控 hardware swap 同步恢復 plasma fingerprint 和 CTQ，是高辨識力證據；仍需重複和監測期。",
        "4.6 Matching 因果橋接"
      ),
      scenario(
        "Golden chamber 是以單次最高 yield 選出；三個月後 reference map 隨 PM 壽命明顯漂移。要如何重建 golden baseline？",
        [
          w("仍用最初那一片，因 golden 不應改變", "單片沒有涵蓋生命週期，不能代表穩定基準。"),
          c("以完整 lifecycle、最差結構與重複 reference 建立 baseline", "Golden 應代表可重複共同窗口，而非最高單點。"),
          w("每月挑 yield 最高的一片替換 baseline", "移動靶會讓 drift 和改善無法比較。"),
          w("只以平均 rate 重建，忽略 map", "空間 signature 正是目前失配來源。")
        ],
        "Golden baseline 必須版本化且涵蓋受控生命週期、產品與最差結構，才能支持 chamber interchangeability。",
        "4.6 Golden chamber 與 reference"
      ),
      graphic(
        "圖中的三層 matching 顯示 hardware gate 失敗、plasma fingerprint 分離、wafer average 卻相同。可否直接進入 recipe offset？",
        "/assets/svg/l4/l4-matching-layers.svg",
        "Chamber A/B 的硬體、電漿指紋、wafer CTQ 三層比較，硬體與指紋為紅色分離而平均速率相同",
        [
          w("可以，因 wafer average 已相同", "平均值掩蓋硬體和 plasma 差異及其生命週期風險。"),
          c("不可以；先關閉硬體與 plasma gate，再評估 offset", "三層順序要求先修可修復狀態。"),
          w("只刪除 plasma fingerprint，避免層間矛盾", "刪除不一致證據會讓補償失去可追溯性。"),
          w("永遠禁止任何 chamber-specific offset", "若硬體修復後仍有穩定殘差，可在共同 guard band 內受控使用。")
        ],
        "圖形刻意顯示平均值可騙過單層判定；hardware/plasma 未通過時不能直接 recipe compensation。",
        "4.6 Matching 三層 gate"
      )
    ]
  },
  {
    chapter: "4.6",
    tag: "doe",
    questions: [
      single(
        "篩選 DOE 找到 source power 與 pressure 為主效應後，能否直接把最高 predicted rate 的 corner 當量產中心？",
        [
          w("可以，篩選設計已找到最佳點", "篩選用來找因子，通常不足以估曲率、交互作用與安全邊界。"),
          c("不可以；第二階段需估交互作用、曲率與多 CTQ 邊界", "量產窗口不是單一 rate 最大值。"),
          w("只要增加 sample size 就不需要第二階段", "更多篩選點重複不能補足未建模的曲率與交互作用。"),
          w("把 setpoint 當完全獨立因子即可", "Pressure/power/flow 的 actual 可能因控制迴路耦合。")
        ],
        "兩階段 DOE 先篩選再優化；中心選擇需同時處理交互作用、曲率、actual 和所有 CTQ。",
        "4.6 兩階段 DOE"
      ),
      multi(
        "一個可區分 recipe 效應與 chamber drift 的 DOE，哪些設計不可省略？（複選）",
        [
          c("隨機化 run order，並穿插可重複中心點", "可避免時間趨勢與因子方向完全共線。"),
          c("保存 flow/pressure/power/temperature actual trace", "控制器耦合可能讓名義因子不獨立。"),
          c("事先定義交互作用、停止線、MSA 與最差結構/材料 response", "模型和放行邊界需在看數據前成立。"),
          w("所有 low/high 依固定順序跑完，方便操作", "固定順序會把 seasoning/漂移誤認成主效應。")
        ],
        "隨機化、中心點、actual 和預定 response/停止線共同保護 DOE 的因果可識別性。",
        "4.6 DOE 漂移與 actual"
      ),
      scenario(
        "8-run DOE 的 response 隨 run number 單調改善；所有 high-power run 恰好排在後半，中心點也從前到後上升 6%。假說為 power 主效應或 seasoning drift。應如何處理？",
        [
          c("暫停主效應結論，恢復/確認 chamber state，隨機化重跑並用中心點估 drift", "Power 與時間完全共線，現有設計不可識別。"),
          w("仍宣稱 high power 改善 6%", "中心點自身上升已證明時間效應可解釋結果。"),
          w("刪除中心點，讓 power effect 更顯著", "中心點是辨識 drift 的關鍵證據。"),
          w("只增加 regression 階數擬合 run number", "不可識別的設計不能由更複雜模型自動修復。")
        ],
        "Run order 與 power 共線使兩假說無法區分；必須以受控狀態和隨機化/中心點重建實驗。",
        "4.6 DOE 隨機化與 seasoning"
      ),
      scenario(
        "封裝 clean DOE 顯示較長時間可降低有機殘留，但 time×queue 交互作用使 Cu oxide 在長 queue 急升；PI/PBO chemistry 在高 dose 也改變。量產窗應如何定義？",
        [
          w("只選殘留最低的長時間 recipe", "忽略了 queue 交互作用和 polymer damage。"),
          c("建立 time×queue 窗口，並納入材料與 bond/reliability response", "多材料與物流交互作用共同決定產品接受。"),
          w("把 queue 當物流問題，從 DOE 移除", "Queue 會改變 Cu 氧化與接合，是產品條件。"),
          w("將 Cu 與 PI 結果平均，只要總分通過", "任一高嚴重度材料 CTQ 失敗都不能被平均抵消。")
        ],
        "封裝 DOE 的量產窗必須包含處理後 queue 與多材料/接合反應，不能只最佳化 cleanliness。",
        "4.6 封裝清潔 DOE"
      ),
      graphic(
        "DOE interaction 圖中，低 pressure 時提高 source power 使 CD 改善；高 pressure 時同樣加 power 反而惡化。這代表什麼？",
        "/assets/svg/l4/l4-doe-interaction.svg",
        "Source power 橫軸、CD 偏差縱軸，低壓與高壓兩條線交叉的 DOE interaction plot",
        [
          w("Source power 沒有任何作用", "兩條線均有斜率，只是方向依 pressure 改變。"),
          c("存在 power×pressure 交互作用，主效應平均會掩蓋條件相反的 response", "交叉線是強交互作用的直接圖形證據。"),
          w("高 pressure 資料應視為離群並刪除", "它是設計中的有效因子層級，不是量測錯誤證據。"),
          w("直接選最高 power，不需看 mask/stop 或 actual", "CD 只是多個 CTQ 之一，且控制耦合仍需驗證。")
        ],
        "交叉 interaction 說明單一 power 方向不存在；第二階段模型和放行需保留 pressure 條件。",
        "4.6 DOE 交互作用"
      )
    ]
  },
  {
    chapter: "4.6",
    tag: "pm-seasoning-fdc",
    questions: [
      single(
        "PM 後規定固定 seasoning 5 片，但第 5 片的 OES 已穩定、edge map 與 particle 仍在收斂。可否放行？",
        [
          w("可以，固定片數已完成", "Seasoning 完成要由產品/參考 CTQ 收斂證明。"),
          c("不可以；維持 hold 並查 PM、parts 與 clean 狀態", "單一 OES proxy 不能覆蓋 wafer 空間與污染。"),
          w("只排除 edge 點後放行", "Edge 是產品最差位置，排除會隱藏 first-wafer effect。"),
          w("讓 R2R 調 recipe 把 edge 補平", "PM 狀態未穩定時補償會把硬體/壁面過渡寫入 recipe。")
        ],
        "Seasoning 是狀態收斂，不是耗用固定片數；所有預定 plasma、map、particle 和產品 gate 都需通過。",
        "4.6 PM 與 seasoning"
      ),
      multi(
        "零件壽命要從固定日曆升級為 condition-based 管理，哪些資料應串在一起？（複選）",
        [
          c("Parts ID/revision、RF hours/產品 mix、熱循環與 clean history", "壽命負荷需能追到實際使用方式。"),
          c("FDC 的 VI/match/pressure/OES 特徵與 reference wafer map", "設備狀態和 wafer signature 可提前顯示漂移。"),
          c("Particle map/缺陷、PM 前後片序與下游良率", "污染與產品結果決定更換的實際風險。"),
          w("只保留安裝日期，所有產品使用同一期限", "不同產品/clean 負荷使日曆時間無法代表耗損。")
        ],
        "Condition-based lifetime 將零件履歷、設備指紋、reference map、particle 和產品結果整合，而非單一累積數字。",
        "4.6 COO、零件壽命與 FDC"
      ),
      scenario(
        "換 showerhead 後 first-wafer rate 先高 8%、第 6 片回到基線；particle 卻在第 8 片才低於警戒。成本壓力要求第 6 片起放行。應如何決策？",
        [
          w("第 6 片 rate 已回復，所以直接放行", "Particle gate 尚未通過，污染風險不能由 rate 抵消。"),
          c("維持隔離，直到 particle 與 reference/product CTQ 共同收斂", "良率保護與成本需用完整狀態而非單一 rate 評估。"),
          w("放寬 particle 警戒以符合第 6 片", "控制限不能為節省 monitor wafer 臨時移動。"),
          w("只跑空 wafer 到第 8 片，不需產品 bridge", "空片可協助 seasoning，但仍需確認產品代表 CTQ。")
        ],
        "Rate 與 particle 有不同收斂時間；量產 gate 應等待所有高風險 CTQ，COO 也要計入品質成本。",
        "4.6 First-wafer effect 與 COO"
      ),
      scenario(
        "封裝 clean FDC 全部設備 tag 正常，但 re-clean lot 的 bond void 增加；MES 顯示其中 60% 已做第二次 plasma、queue 超過已驗證上限。最可能的監控缺口是？",
        [
          c("FDC/SPC 沒有串接 cumulative dose、queue、surface state 與 bond/reliability", "設備 trace 正常不能排除產品物流與累積材料損傷。"),
          w("所有 FDC sensor 同時失效", "現有資料直接提供更具體的產品歷史假說。"),
          w("只需提高 OES endpoint threshold", "問題在 re-clean/queue，不是單片設備訊號可辨識的 endpoint。"),
          w("Void 必然來自 bonding tool，plasma history 無關", "第二次處理和超窗 queue 與失效高度分層，需納入競爭假說。")
        ],
        "封裝量產監控必須把設備 trace 與產品 queue/re-clean、表面和下游可靠度串成同一時間線。",
        "4.6 封裝 FDC 資料鏈"
      ),
      graphic(
        "圖中 PM 後 rate 在第 5 片進窗、OES 在第 4 片進窗，但 particle 到第 8 片才進窗。Seasoning 完成點應在哪裡？",
        "/assets/svg/l4/l4-seasoning.svg",
        "PM 後片序圖，rate、OES 與 particle 三條收斂曲線及各自警戒帶",
        [
          w("第 4 片，因 OES 最先穩定", "Rate 與 particle 尚未通過。"),
          w("第 5 片，因 rate 是主要 CTQ", "Particle 仍超出既定 gate。"),
          c("至少第 8 片，且須確認產品/reference CTQ", "Seasoning 由最晚通過的必要 gate 決定。"),
          w("固定第 6 片，取三者平均", "Gate 不是可平均的時間；高風險項失敗不能被抵消。")
        ],
        "片序圖顯示不同 proxy 的收斂時間；量產 release 應遵守最慢必要 CTQ，而非固定或平均片數。",
        "4.6 PM 後收斂圖"
      )
    ]
  },
  {
    chapter: "4.6",
    tag: "ehs-abatement",
    questions: [
      single(
        "工程 split 中 abatement 出現未結案 alarm，但 chamber pressure 與產品 proxy 正常。可否繼續少量 wafer 收集資料？",
        [
          w("可以，因產品 proxy 正常且只跑少量", "產品結果不能證明排氣/處理系統處於核准安全狀態。"),
          c("不可以；隔離設備並依核准 EHS 程序處置 alarm", "安全 gate 優先於工程最佳化，且教材不能授權現場繞過。"),
          w("可以，只要操作員手動監看排氣", "人工觀察不能取代核准 interlock 與 alarm disposition。"),
          w("先降低 gas flow 到任意一半即可", "未來源化的臨時數值不是核准操作邊界。")
        ],
        "安全、RF、真空與 abatement 異常必須依現場核准程序處置；工程資料不能自行解除安全狀態。",
        "4.6 EHS 與 abatement 邊界"
      ),
      multi(
        "評估新的封裝 plasma clean chemistry 與排氣路徑時，哪些資料屬於必要輸入？（複選）",
        [
          c("核准的物料/SDS、實際物種與副產物、flow/濃度/溫度/停留時間", "Abatement 適用性取決於實際負荷和化學，而非氣體名稱。"),
          c("Interlock/alarm、maintenance 狀態、排氣監測與 byproduct 檢查", "設備存在不代表一直有效，狀態需被證明。"),
          c("PI/PBO/mold compound/filler、助焊/樹脂與金屬氧化物的污染轉移風險", "封裝清潔可能把表面污染移到腔體、排氣或下一批。"),
          w("從教材選一個固定安全閾值套用所有廠區", "在地規範、設備與來源會變，教材不提供操作授權。")
        ],
        "EHS/abatement 評估需要核准來源、實際負荷、設備狀態與封裝副產物，不能由通用數值代替。",
        "4.6 氣體、RF、污染與排氣"
      ),
      scenario(
        "新增含氫 clean split 後，Cu oxide 下降；同時 gas cabinet 偵測與 purge qualification 尚在 pending。工程團隊希望先用 coupon 驗證接合。應如何處理？",
        [
          w("Coupon 不屬產品，可先繞過 pending 項目", "氣體供應與排氣風險不因樣品類型而消失。"),
          c("維持 pending，不進機台；待設備/EHS 核准流程完成後才按核准範圍做受控實驗", "材料改善證據不能替代氣體系統安全 qualification。"),
          w("改用較低未指定濃度即可自行開始", "任意降低不是來源化或核准的安全條件。"),
          w("只在夜班執行以降低暴露人數", "排程不是工程控制，也違反核准程序邊界。")
        ],
        "含氫 chemistry 的設備與 EHS gate 必須先完成；本題刻意區分產品效能與安全授權。",
        "4.6 核准 chemistry 邊界"
      ),
      scenario(
        "清潔後 wafer 表面 particle 降低，但 foreline deposit 增加、下一批 blank 出現同元素污染。假說為污染被轉移到排氣/腔壁或來料污染。最小區分實驗是？",
        [
          c("用 blank、clean-only 與不同 sequence witness 拆解 carryover", "空白與片序對照可分離來料、腔壁和排氣回流。"),
          w("只延長 clean，直到 wafer particle 更低", "更長處理可能增加 deposit 與再沉積。"),
          w("只因產品表面改善就關閉 foreline 追蹤", "下游污染已顯示系統邊界外移，不是消失。"),
          w("將下一批 blank 視為無關，因不是產品", "Blank 是辨識 sequence/memory 的直接證據。")
        ],
        "污染控制要把產品、腔體和排氣視為同一物料路徑；witness/sequence 可反駁來料與轉移假說。",
        "4.6 污染與 abatement 路徑"
      ),
      graphic(
        "流程圖顯示 chamber exhaust 經 abatement 後監測值仍異常，旁路與 maintenance 狀態未知。下一個合法工程動作是？",
        "/assets/svg/l4/l4-abatement-flow.svg",
        "製程腔體到 abatement、排氣監測與警報/隔離 gate 的流程圖，異常監測以紅色標示",
        [
          w("以產品良率正常證明 abatement 有效", "產品 CTQ 不量排放與安全處理效能。"),
          c("停止工程擴大並依核准程序確認旁路、maintenance、監測與處理狀態", "流程中的安全 gate 未閉環，需由授權程序處置。"),
          w("暫時關閉排氣監測避免誤報", "移除監測會失去保護，不能解決異常。"),
          w("自行提高處理溫度到未核准值", "教材與工程團隊都不能越過設備/EHS 核准範圍。")
        ],
        "圖形要求沿物料與安全 gate 追查，不允許由產品結果、停用監測或未核准參數繞過。",
        "4.6 Abatement flow 與 safety gate"
      )
    ]
  },
  {
    chapter: "4.6",
    tag: "pfc-release",
    questions: [
      single(
        "比較兩支 PFC recipe 的氣候影響時，哪個計算框架最合理？",
        [
          w("只比較氣體名稱的 GWP 排名", "氣候影響還取決於實際使用、利用與逃逸/破壞。"),
          c("以來源化 GWP 乘實際逃逸量，並揭露盤查邊界與版本", "此框架可追溯實際排放與資料不確定度。"),
          w("只比較名義 MFC flow", "Flow 不是排放，未扣除反應消耗與處理效率。"),
          w("沿用任意舊 GWP 數字以保持歷年一致", "來源版本可能更新，應保留版本並按組織盤查方法橋接。")
        ],
        "PFC 影響需由來源化係數和實際逃逸量共同決定，且透明記錄利用、處理與量測邊界。",
        "4.6 PFC 可追溯計算"
      ),
      multi(
        "一個完整的量產 release ledger 應同時通過哪些 gate？（複選）",
        [
          c("Hardware/plasma fingerprint、reference/product CTQ 與量測 MSA", "設備狀態、產品結果和量測可信度缺一不可。"),
          c("PM/seasoning、queue/re-clean、污染與資料時間線", "生命週期和產品物流會改變結果及受影響範圍。"),
          c("EHS/abatement 與來源化 PFC accounting", "產品放行不能繞過安全和環境責任。"),
          w("只要最終平均 yield 通過即可關閉所有 gate", "平均良率可能掩蓋局部、潛在可靠度或安全失敗。")
        ],
        "量產放行是從設備到產品、安全和環境的可反駁證據鏈，不是單一 yield 指標。",
        "4.6 量產放行帳冊"
      ),
      scenario(
        "Recipe A 名義 NF3 flow 比 B 低 20%，但 A 的利用率較差且 abatement maintenance 期間實測 outlet 濃度較高。哪支排放較低尚未確定。下一步？",
        [
          c("統一盤查邊界，量 outlet 與 abatement 狀態後比較實際逃逸", "名義 flow 與設備狀態不足以決定排放。"),
          w("直接選 A，因 flow 較低", "較差利用和較高 outlet 可能抵消甚至反轉 flow 優勢。"),
          w("直接選 B，因 maintenance 不代表正常狀態", "Maintenance 狀態仍是實際生命週期排放的一部分，需分層報告。"),
          w("只用供應商宣稱的 destruction efficiency", "現場負荷、維護與量測邊界需被驗證。")
        ],
        "PFC 比較必須由實際物料/排氣量測與 abatement state 建立，不能由單一名義輸入排序。",
        "4.6 PFC 利用與逃逸量"
      ),
      scenario(
        "封裝 lot 超過已驗證 queue，前一班已 re-clean 一次；RDL Cu oxide 回復、PI/PBO 接觸角仍低，bond reliability 尚無資料。應如何 disposition？",
        [
          w("再 re-clean 一次，直到 Cu oxide 下降", "第二次以上累積 dose 未被證明，可能加重 polymer/low-k 與粗化。"),
          c("Hold lot；保留 cumulative dose/queue，依已 qualification 分支處置", "超窗和重洗已超出證據範圍，不能由接觸角放行。"),
          w("只依 PI/PBO 接觸角低就放行", "接觸角不能排除 Cu oxide 和下游可靠度。"),
          w("把 queue 起算時間改成最後一次 re-clean", "重洗不會抹除先前材料 dose 與表面歷史。")
        ],
        "Queue/re-clean 是累積產品條件；缺少 bond/reliability 時應維持 hold，不可重設歷史或無限重洗。",
        "4.6 Queue、re-clean 與產品放行"
      ),
      graphic(
        "物料流圖顯示 Recipe X 進料較低，但未反應逃逸與 abatement bypass 較高；Recipe Y 進料較高、利用率與處理較佳。哪個數據足以比較氣候影響？",
        "/assets/svg/l4/l4-pfc-flow.svg",
        "兩支 PFC recipe 從進料、反應利用、abatement 到實際逃逸的 Sankey 式流程比較",
        [
          w("只比較兩支 recipe 的 inlet flow", "圖已顯示利用與 bypass 可使出口排序反轉。"),
          c("各物種來源化 GWP 乘實測/推估逃逸量，附利用、abatement、版本與不確定度", "這是流程中唯一直接對應氣候影響且可追溯的量。"),
          w("只比較 abatement 名牌效率", "名牌值不含當期 bypass、維護與實際負荷。"),
          w("以 wafer rate 較高者視為排放較低", "產品速率不能代替物料平衡或排氣量測。")
        ],
        "流程圖強調 inlet 不等於 emission；真正比較需沿利用、處理與逃逸量套用來源化 GWP。",
        "4.6 PFC 物料平衡與排放"
      )
    ]
  }
];

const rawQuestions = concepts.flatMap(({ chapter, tag, questions }) => questions.map((question) => ({ ...question, chapter, tags: [tag, question.type] })));

export const level4Questions = rawQuestions.map((question, index) => ({
  id: `L4-${String(index + 1).padStart(3, "0")}`,
  difficulty: question.type === "single" ? 2 : 3,
  ...question
}));

function single(question, options, explanation, reference) {
  return { type: "single", question, options: addOptionIds(options), explanation, reference };
}

function multi(question, options, explanation, reference) {
  return { type: "multi", question, options: addOptionIds(options), explanation, reference };
}

function scenario(question, options, explanation, reference) {
  return { type: "scenario", question, options: addOptionIds(options), explanation, reference };
}

function numeric(question, answer, unit, tolerance, options, explanation, reference) {
  return { type: "numeric", question, answer, unit, tolerance, options: addOptionIds(options), explanation, reference };
}

function graphic(question, image, imageAlt, options, explanation, reference) {
  return { type: "graphic", question, image, imageAlt, options: addOptionIds(options), explanation, reference };
}

function c(text, why) {
  return { text, correct: true, why };
}

function w(text, why) {
  return { text, correct: false, why };
}

function addOptionIds(options) {
  return options.map((option, index) => ({ id: String.fromCharCode(65 + index), ...option }));
}
