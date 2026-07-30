export const l1FoundationChapters = [
  {
    id: "1-2",
    route: "/level/1/1-2-parameters/",
    title: "1.2 電漿基本參數",
    hours: 1.5,
    labs: [
      { id: "a02", title: "A02 Debye 遮蔽互動", module: "/assets/js/labs/a02-debye-shielding.js", observation: ["把電子密度提高十倍，記下遮蔽圈縮小的比例；用結果驗證 λD ∝ 1/√ne。", "把電子溫度提高四倍，觀察遮蔽圈是否約放大兩倍；比較密度與溫度對 λD 的方向。", "切換正、負測試電荷，確認電子聚集與排斥方向反轉，但遮蔽長度量級不變。"] }
    ],
    objectives: [
      "說出 n_e、T_e、T_i 的典型數值與單位。",
      "解釋為什麼電子熱、離子冷。",
      "用 Debye 長度判斷鞘層量級。",
      "說明 13.56 MHz 對電子與離子的不同意義。"
    ],
    summary: "電漿基本參數是後面所有 recipe 判讀的尺。製程電漿常見電子密度約 10⁹–10¹² cm⁻³，電子溫度約 2–5 eV，離子溫度接近氣體溫度。電子因為質量小、跟得上 RF 場、且彈性碰撞不容易把能量交給中性粒子，所以可以很熱；離子重，幾乎只感受到時間平均場。Debye 長度則告訴你電漿遮蔽外來電場需要多短距離，也是估算鞘層厚度的入口。",
    sections: [
      {
        id: "numbers",
        title: "五個必須記住的數字",
        body: `<div class="table-wrap"><table><thead><tr><th>參數</th><th>符號</th><th>CCP 典型值</th><th>ICP 典型值</th></tr></thead><tbody>
        <tr><td>電子密度</td><td>n_e</td><td>10⁹–10¹⁰ cm⁻³</td><td>10¹¹–10¹² cm⁻³</td></tr>
        <tr><td>電子溫度</td><td>T_e</td><td>2–5 eV</td><td>2–4 eV</td></tr>
        <tr><td>離子溫度</td><td>T_i</td><td>0.03–0.05 eV</td><td>0.03–0.05 eV</td></tr>
        <tr><td>氣體溫度</td><td>T_g</td><td>300–500 K</td><td>400–800 K</td></tr>
        <tr><td>電漿電位</td><td>V_p</td><td>10–30 V</td><td>15–25 V</td></tr>
        </tbody></table></div>`
      },
      {
        id: "electron-hot",
        title: "為什麼電子熱、離子冷",
        body: `<p>同樣的電場作用在電子與 Ar+ 上，加速度差了約 73,000 倍。電子能跟著 13.56 MHz RF 場振盪並吸收能量；離子太重，跟不上，只感受到時間平均場。</p><p>電子和中性粒子彈性碰撞時，能量交換比例約 2m_e/M，量級只有 10⁻⁵。電子吸到的能量散不掉，所以電子溫度高；離子與中性粒子質量接近，一撞就接近熱平衡。</p>`
      },
      {
        id: "debye",
        title: "Debye 長度與遮蔽",
        body: `<p>Debye 長度 λ_D 是電漿遮蔽外來電場所需的距離。實用上，CCP 在 n_e = 10¹⁰ cm⁻³、T_e = 3 eV 時，λ_D 約 0.13 mm；ICP 在 n_e = 10¹² cm⁻³ 時，λ_D 約 0.013 mm。</p><p>工程上的意義是：鞘層厚度通常是 λ_D 的數倍到數十倍。密度越高，鞘層越薄，離子穿越時碰撞更少，能量分佈也更窄。</p>`
      },
      {
        id: "frequency",
        title: "電漿頻率與 RF 選擇",
        body: `<p>n_e = 10¹⁰ cm⁻³ 時，電子電漿頻率約 900 MHz。13.56 MHz 位在離子反應慢、電子反應快的區間：電子跟得上並吸功率，離子跟不上而只感受到平均場。</p><p>這也是 RF 電漿能在低溫下維持高活性化學的原因。</p>`
      }
    ],
    callouts: [
      { type: "intuition", title: "工程師直覺", body: "Te 調的是反應門檻，ne 調的是反應量。現場講功率時，先問它主要改變密度、溫度，還是鞘層電位。" },
      { type: "misconception", title: "常見誤解", body: "<p><strong>常見說法：</strong>功率變大，電子溫度就一定變高。</p><p><strong>正確理解：</strong>在許多低壓電漿中，source power 更直接拉高密度；T_e 常由壓力、尺度與氣體碰撞決定。</p>" }
    ],
    selfCheck: [
      ["T_e = 3 eV 大約是多少 K？", "約 34,800 K；但這是電子能量分佈參數，不代表晶圓或氣體也有這麼熱。"],
      ["n_e 提高 100 倍時，λ_D 如何變化？", "λ_D 與 1/√n_e 成正比，所以縮小 10 倍。"],
      ["電子與 Ar 原子彈性碰撞後，為什麼電子不容易冷卻？", "電子質量遠小於 Ar，一次彈性碰撞只交出約 2m_e/M 的能量，量級約 10⁻⁵。"],
      ["T_e 與 T_g 分別描述什麼？", "T_e 描述電子能量分佈尺度；T_g 描述中性氣體的熱運動溫度，兩者在低溫電漿中可相差數個數量級。"],
      ["相同 T_e 下，ICP 的 λ_D 為什麼通常比 CCP 小？", "ICP 的電子密度通常高一至兩個數量級，而 λ_D 與 1/√n_e 成正比。"],
      ["13.56 MHz RF 場下，電子與離子的反應有何差異？", "電子能跟隨場振盪並吸收功率；離子太重，主要感受到時間平均的鞘層電場。"]
    ]
  },
  {
    id: "1-3",
    route: "/level/1/1-3-collisions-mfp/",
    title: "1.3 碰撞與平均自由徑",
    hours: 1.5,
    labs: [
      { id: "a03", title: "A03 平均自由徑粒子模擬", module: "/assets/js/labs/a03-mean-free-path.js", observation: ["把壓力從 1 mTorr 拉到 100 mTorr，數出同一飛行距離內碰撞閃光的量級變化。", "固定鞘層厚度後比較低壓與高壓軌跡，指出哪一組離子入射角分佈較窄。", "把平均自由徑分別和 gap、鞘層厚度比較，說明兩個比值各回答哪一種傳輸問題。"] }
    ],
    objectives: [
      "由壓力估算平均自由徑。",
      "區分彈性、激發、游離、解離與附著碰撞。",
      "在 Torr、mTorr、Pa 與 sccm 間建立量級感。"
    ],
    summary: "壓力決定粒子在腔體裡能飛多遠才撞到下一個粒子。低壓時平均自由徑大，離子穿越鞘層比較不會散射，profile 容易變直；高壓時自由基多、反應量高，但離子方向性變差。這章把「壓力調低 profile 變直」這句現場經驗，連回平均自由徑與碰撞截面的物理圖像。",
    sections: [
      { id: "units", title: "壓力與流量單位", body: `<p>1 Torr = 133.3 Pa，1 mTorr = 0.1333 Pa。sccm 是標準狀態下的質量流量，不是腔內實際體積流量，所以可跨壓力條件比較進氣量。</p>` },
      { id: "mfp", title: "平均自由徑", body: `<p>室溫 Ar 的實用近似是 λ[cm] ≈ 5 / P[mTorr]。1 mTorr 約 5 cm，10 mTorr 約 5 mm，100 mTorr 約 0.5 mm。</p><p>拿這個數字和 gap、鞘層厚度比較，就能快速判斷離子會不會在抵達晶圓前被散射。</p>` },
      { id: "cross-section", title: "碰撞截面不是常數", body: `<p>游離截面有閾值，低於游離能時完全游離不動；激發截面閾值較低，所以低 Te 的電漿仍會發光，但不一定有足夠游離。</p>` },
      { id: "collision-types", title: "五種電子碰撞", body: `<div class="table-wrap"><table><thead><tr><th>碰撞</th><th>製程意義</th></tr></thead><tbody><tr><td>彈性</td><td>決定電子遷移率與能量損失</td></tr><tr><td>激發</td><td>放光，是 OES 的來源</td></tr><tr><td>游離</td><td>維持電漿</td></tr><tr><td>解離</td><td>產生蝕刻自由基</td></tr><tr><td>附著</td><td>形成負離子，改變電負性電漿行為</td></tr></tbody></table></div>` }
    ],
    callouts: [
      { type: "intuition", title: "工程師直覺", body: "壓力不是單純的反應量旋鈕，它同時改變碰撞、方向性、自由基停留與產物排出。" }
    ],
    selfCheck: [
      ["Ar 在 10 mTorr 時平均自由徑約多少？", "約 5 mm。"],
      ["為什麼高壓灰化可以接受方向性差？", "灰化主要靠中性自由基化學反應，不需要離子垂直轟擊形成 profile。"],
      ["1 Torr 約等於多少 Pa？", "約 133.3 Pa；因此 1 mTorr 約為 0.1333 Pa。"],
      ["sccm 為什麼不是腔內實際體積流量？", "sccm 以標準狀態定義質量流量；腔內體積會隨實際壓力與溫度改變。"],
      ["哪一類電子碰撞直接產生蝕刻自由基？", "解離碰撞，例如 e+CF₄→e+CF₃+F；F 原子自由基可參與化學蝕刻。"],
      ["電負性氣體抓走電子後，電漿通常如何補償？", "電子密度下降後，電漿往往需要較高 T_e 或更高功率維持游離；負離子也會被鞘層擋在 bulk。"]
    ]
  },
  {
    id: "1-4",
    route: "/level/1/1-4-glow-breakdown/",
    title: "1.4 輝光放電與點火",
    hours: 1.5,
    labs: [
      { id: "a04", title: "A04 電子雪崩動畫", module: "/assets/js/labs/a04-townsend-avalanche.js", observation: ["先把 γ 調到 0，播放到電子抵達陽極；確認單次雪崩為什麼仍會熄滅。", "逐步提高 γ，找出能補回下一代種子的區間；觀察二次電子如何建立自持回授。", "保持 γ 不變並調整 αd，比較電子成長速度；指出氣體碰撞與表面回授缺一不可的原因。"] },
      { id: "a05", title: "A05 Paschen 曲線互動", module: "/assets/js/labs/a05-paschen-curve.js", observation: ["切換氣體並顯示所有曲線，找出各自谷底；比較最低崩潰電壓與對應 pd 是否相同。", "把壓力固定在 0.01 Torr、間距設為 3 cm，定位工作點在左支或右支，並說明碰撞不足或過多。", "提高壓力直到工作點靠近谷底，觀察崩潰電壓如何改變；把結果連回先衝壓力的 ignition step。"] }
    ],
    objectives: [
      "說明 Townsend 雪崩如何導致崩潰。",
      "讀懂 Paschen 曲線左右兩支的物理原因。",
      "解釋為什麼點火常先衝壓力再降回製程壓力。"
    ],
    summary: "點火不是單純把電壓加大。電子必須在電極間累積足夠能量並撞到足夠多中性分子，才能形成 Townsend 雪崩；同時表面必須提供二次電子，放電才會自持。Paschen 曲線把這件事濃縮成 pd 乘積：太低壓碰撞太少，太高壓每次碰撞間能量累積不足，兩邊都需要更高電壓。",
    sections: [
      { id: "townsend", title: "Townsend 雪崩", body: `<p>一個種子電子被電場加速，撞出更多電子，電子數沿距離呈指數成長：n(d)=n0·e^(αd)。但雪崩衝到陽極就結束了，必須靠離子撞擊陰極產生二次電子 γ 才能自持。</p>` },
      { id: "paschen", title: "Paschen 曲線", body: `<p>崩潰電壓主要依賴 pd。右支高壓時平均自由徑太短，電子累積不到游離能；左支低壓時平均自由徑太長，電子還沒撞到分子就到陽極。</p><div class="table-wrap"><table><thead><tr><th>氣體</th><th>p·d(Torr·cm)</th><th>Vmin</th></tr></thead><tbody><tr><td>Ar</td><td>0.9</td><td>137 V</td></tr><tr><td>He</td><td>4.0</td><td>156 V</td></tr><tr><td>N2</td><td>0.67</td><td>251 V</td></tr><tr><td>Air</td><td>0.57</td><td>327 V</td></tr><tr><td>O2</td><td>0.70</td><td>450 V</td></tr></tbody></table></div>` },
      { id: "glow-regions", title: "DC 輝光分區", body: `<p>陰極暗區中電位降最大，負輝光最亮，正柱區則接近準中性。RF 電漿裡靠近電極的暗帶可視為鞘層的視覺線索。</p>` },
      { id: "rf", title: "為什麼用 RF", body: `<p>DC 放電遇到絕緣表面會累積電荷並熄滅。RF 電場不斷反轉，讓介電質也能透過電容耦合維持電漿，這正是半導體蝕刻與沉積需要 RF 的原因。</p>` }
    ],
    callouts: [
      { type: "warning", title: "設備安全", body: "RF matching box、法蘭窄縫或管路空腔若 pd 落在 Paschen 谷底附近，可能出現寄生放電、微粒與零件損傷。" }
    ],
    selfCheck: [
      ["為什麼製程壓力很低時常先提高壓力點火？", "低壓落在 Paschen 左支，碰撞次數不足；提高壓力讓 pd 靠近較容易崩潰的區間。"],
      ["γ 變小會發生什麼？", "二次電子不足，放電較難自持，點火電壓上升。"],
      ["為什麼只有 α 的電子雪崩仍不能自持？", "雪崩電子最終被陽極收集；若沒有離子撞陰極產生二次電子，就沒有下一代種子。"],
      ["Paschen 曲線左支與右支各自為什麼需要較高電壓？", "左支是碰撞太少；右支是平均自由徑太短，電子在兩次碰撞間累積不到足夠能量。"],
      ["DC 為什麼難以持續處理絕緣表面？", "介電質累積表面電荷後會屏蔽外加電場，使 DC 放電衰減或熄滅。"],
      ["腔體窄縫為何可能出現寄生放電？", "窄縫的 pd 若接近 Paschen 谷底，局部崩潰電壓會降低，形成不希望的輝光或電弧。"]
    ]
  },
  {
    id: "1-5",
    route: "/level/1/1-5-sheath/",
    title: "1.5 鞘層入門",
    hours: 1.5,
    labs: [
      { id: "a06", title: "A06 鞘層形成時間軸", module: "/assets/js/labs/a06-sheath-timeline.js", observation: ["拖動時間軸，依序指出電子先流失、表面帶負電、鞘層形成與離子加速四個階段。", "停在鞘層剛形成的時刻，比較 bulk 與表面附近的電荷分佈；指出準中性在哪裡失效。", "提高電子密度後比較鞘層厚度，再加入較高壓力；觀察厚度與碰撞對方向性的不同影響。"] }
    ],
    objectives: [
      "解釋鞘層為什麼必然形成。",
      "區分 Vp、Vf 與 Vdc。",
      "說明離子方向性從何而來。",
      "用壓力與鞘層厚度判斷方向性風險。"
    ],
    summary: "鞘層是電漿與任何表面之間的非中性區。電子比離子快，表面先收到電子而變負，接著排斥電子、吸引離子，最後形成離子過剩的鞘層。鞘層內有強烈、近似垂直於表面的電場，離子進入後被垂直加速；只要鞘層內碰撞少，離子就能保持方向性，這就是異向性蝕刻的來源。",
    sections: [
      { id: "formation", title: "鞘層為什麼必然存在", body: `<p>假設一開始電子與離子均勻分佈。電子速度遠高於離子，會先抵達器壁，使表面帶負電。負電位排斥後續電子、吸引離子，直到兩者流量平衡。這個電子被排空、離子過剩的區域就是鞘層。</p>` },
      { id: "potentials", title: "三個電位不要混", body: `<div class="table-wrap"><table><thead><tr><th>電位</th><th>定義</th><th>典型值</th></tr></thead><tbody><tr><td>Vp</td><td>bulk 電漿相對接地電位</td><td>+10–30 V</td></tr><tr><td>Vf</td><td>浮接表面的自然電位</td><td>比 Vp 低 10–20 V</td></tr><tr><td>Vdc</td><td>RF 電極自偏壓</td><td>-50 到 -1000 V</td></tr></tbody></table></div>` },
      { id: "directionality", title: "離子方向性的因果鏈", body: `<p>電子先跑掉 → 表面帶負 → 形成鞘層 → 鞘層裡有垂直電場 → 離子垂直加速 → 若壓力低、碰撞少，就形成垂直轟擊與異向性蝕刻。</p>` },
      { id: "scale", title: "鞘層厚度的量級", body: `<p>CCP 高偏壓低密度時，鞘層可達數 mm；ICP 高密度低 bias 時，鞘層可能只有 0.1–0.3 mm。把它和平均自由徑比較，就能判斷鞘層內是否容易碰撞。</p>` }
    ],
    callouts: [
      { type: "intuition", title: "工程師直覺", body: "沒有鞘層就沒有方向性。離子不是天生往下打，是被表面附近的鞘層電場最後幾毫米拉直。" }
    ],
    selfCheck: [
      ["為什麼所有表面都會被離子轟擊？", "電漿電位通常相對表面為正，表面外都有鞘層電場吸引正離子。"],
      ["壓力太高對方向性有什麼影響？", "鞘層內碰撞變多，離子入射角散開，profile 容易變差。"],
      ["鞘層形成的四個階段是什麼？", "均勻準中性、電子先流失、表面帶負並排斥電子、最後電子與離子流量達到穩態。"],
      ["Vp、Vf 與 Vdc 的差別是什麼？", "Vp 是 bulk 電漿電位；Vf 是浮接表面的自然電位；Vdc 是 RF 不對稱耦合形成的直流自偏壓。"],
      ["Ar 電漿 T_e=3 eV 時，Vp−Vf 約多少？", "約 4.7×3=14 V。"],
      ["為什麼小 RF 電極通常得到較大的鞘層電位降？", "不對稱電極必須平衡一個 RF 週期的電流，面積較小的一側會建立較大的負自偏壓。"],
      ["離子方向性為什麼來自鞘層而不是離子本身？", "離子在 bulk 中方向近似隨機；進入鞘層後才被垂直於表面的強電場加速與拉直。"]
    ]
  },
  {
    id: "1-6",
    route: "/level/1/1-6-process-map/",
    title: "1.6 製程電漿地圖",
    hours: 1,
    labs: [
      { id: "a07", title: "A07 製程電漿地圖", module: "/assets/js/labs/a07-process-map.js", observation: ["切換蝕刻與 PVD，找出兩者都偏低壓但目的不同的原因：一個保留離子方向，一個保留濺出原子路徑。", "比較 PECVD、灰化與 remote clean 的位置，指出高壓與自由基產率、方向性需求之間的關係。", "把你熟悉的 recipe 壓力與設備型式放上地圖，寫下一個密度或傳輸量測來驗證定位。"] }
    ],
    objectives: [
      "說出六大類電漿製程的目的、氣體與壓力窗。",
      "定位自己負責的製程在壓力與密度地圖上的位置。",
      "讀懂一支 poly gate etch recipe 的欄位意義。"
    ],
    summary: "L1 的收束點是把前面所有物理圖像放回 recipe。蝕刻要方向性，所以常低壓；PECVD 要產率與覆蓋，壓力較高；PVD 要靶材原子少散射，壓力低；灰化與清潔主要靠自由基，通常用 downstream 或 remote plasma 降低離子損傷。當你能逐欄說出壓力、source power、bias、氣體與 endpoint 的目的，L1 就真正完成。",
    sections: [
      { id: "applications", title: "六大類應用", body: `<div class="table-wrap"><table><thead><tr><th>類別</th><th>目的</th><th>主要氣體</th><th>壓力</th><th>機台</th></tr></thead><tbody><tr><td>電漿蝕刻</td><td>移除材料、定義圖形</td><td>氟/氯/溴系 + Ar/O2</td><td>5–100 mTorr</td><td>CCP / ICP</td></tr><tr><td>PECVD</td><td>低溫沉積</td><td>SiH4、TEOS、NH3</td><td>1–10 Torr</td><td>CCP</td></tr><tr><td>PVD</td><td>沉積金屬</td><td>Ar</td><td>1–10 mTorr</td><td>Magnetron</td></tr><tr><td>灰化</td><td>去除光阻</td><td>O2、N2/H2</td><td>0.5–2 Torr</td><td>Downstream</td></tr><tr><td>腔體清潔</td><td>去除腔內沉積</td><td>NF3、C2F6</td><td>1–5 Torr</td><td>Remote</td></tr><tr><td>表面處理</td><td>活化、除膠、親水化</td><td>O2、Ar、N2、H2</td><td>0.1–1 Torr</td><td>多樣</td></tr></tbody></table></div>` },
      { id: "pressure-logic", title: "為什麼壓力差這麼多", body: `<p>蝕刻需要方向性，所以低壓；沉積要覆蓋與產率，所以較高壓；濺鍍要靶材原子飛到晶圓，所以低壓；灰化不需要方向性，反而希望少離子損傷，所以常用下游高壓自由基。</p>` },
      { id: "tool-types", title: "機台型式速覽", body: `<p>CCP 結構簡單、離子能量高；ICP 密度高、source/bias 可解耦；remote plasma 把電漿放在上游，只送自由基到製程區；magnetron PVD 用磁場束縛電子提升游離率。</p>` },
      { id: "recipe", title: "讀一支 poly gate recipe", body: `<p>Breakthrough 壓力低、bias 高，是為了打穿原生氧化層；main etch 加 HBr 與 O2，是為了側壁鈍化與選擇比；over etch 壓力升高、bias 降低，是為了保護下方 gate oxide。</p>` }
    ],
    callouts: [
      { type: "intuition", title: "工程師直覺", body: "recipe 每一欄都是物理折衷：壓力管碰撞，source power 管密度，bias 管離子能量，氣體管化學與鈍化。" }
    ],
    selfCheck: [
      ["為什麼 PVD 濺鍍通常低壓？", "靶材原子要少散射地抵達晶圓，平均自由徑必須夠長。"],
      ["OE 為什麼常降低 bias？", "接近下層時降低離子轟擊，保護下層並提高選擇比。"],
      ["蝕刻與 PECVD 的典型壓力窗為什麼不同？", "蝕刻重視低碰撞方向性；PECVD 重視自由基產率、氣相反應與覆蓋率，因此通常在較高壓操作。"],
      ["Downstream / remote plasma 為什麼適合灰化與清潔？", "電漿在上游產生，只讓壽命較長的自由基抵達基材，可降低離子與 UV 損傷。"],
      ["recipe 中 source power 與 bias power 分別優先控制什麼？", "source power 主要影響電漿密度與通量；bias power 主要影響晶圓鞘層電位與離子入射能量。"]
    ]
  }
];
