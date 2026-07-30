export const chapterThreeOne = {
  id: "3-1",
  route: "/level/3/3-1-etch-mechanisms/",
  title: "3.1 異向性蝕刻與協同效應",
  hours: 3,
  prerequisites: ["2.2 製程氣體選用學", "2.4 鞘層物理進階", "2.6 參數因果鏈"],
  objectives: [
    "區分物理濺鍍、純化學、離子輔助與抑制劑輔助四種移除機制。",
    "用 Coburn-Winters 三階段數據說明協同項不能用簡單加法取代。",
    "從離子方向性與自由基等向性推導溝底和側壁的速率差。",
    "說明側壁鈍化如何同時建立異向性與材料選擇比。",
    "以剖面量測區分 undercut、taper、bowing、microtrench、footing、faceting 與 etch stop。",
    "依缺陷機制提出可反證的旋鈕調整，而不是只靠單一 recipe 經驗。"
  ],
  summary: "現代乾式蝕刻依靠離子與自由基的乘積型協同：自由基建立可反應表面，方向性離子打開鍵結與脫附瓶頸。Coburn-Winters 實驗中，純化學速率約 5、純物理約 2，兩者同時卻到 55；多出的 48 是協同項。溝底同時接收兩者，側壁幾乎沒有離子，因此異向性從同一機制自然產生。再加入側壁鈍化後，溝底靠離子持續清膜，側壁保留保護層，才形成量產所需的垂直輪廓與選擇比。",
  sections: [
    {
      id: "four-mechanisms",
      title: "四種移除機制與各自限制",
      body: `<p>材料要離開晶圓，最終必須形成可脫附、可被抽走的產物。<strong>物理濺鍍</strong>靠離子動量直接移除，方向性強但速率低、材料選擇性接近 1；<strong>純化學蝕刻</strong>靠中性自由基反應，速率與化學選擇性高，卻會從所有方向侵蝕。</p>
      <div class="table-wrap"><table><thead><tr><th>機制</th><th>主要驅動</th><th>輪廓</th><th>主要限制</th></tr></thead><tbody>
      <tr><td>物理濺鍍</td><td>離子動量轉移</td><td>方向性高</td><td>速率低、選擇比差、容易損傷</td></tr>
      <tr><td>純化學</td><td>中性自由基反應</td><td>等向</td><td>側蝕與 CD 損失</td></tr>
      <tr><td>離子輔助</td><td>自由基 × 離子協同</td><td>異向</td><td>依賴兩種通量同時存在</td></tr>
      <tr><td>抑制劑輔助</td><td>協同 + 側壁鈍化</td><td>高度異向</td><td>製程窗窄，過度鈍化會 etch stop</td></tr>
      </tbody></table></div>
      <p>前兩種各自都無法同時滿足速率、選擇比與尺寸控制。RIE 把化學反應的高效率和鞘層離子的方向性疊在一起；抑制劑輔助再用聚合物收支保護側壁。</p>`
    },
    {
      id: "coburn-winters",
      title: "Coburn-Winters：5 + 2 為什麼得到 55",
      body: `<p>經典實驗把 XeF₂ 自由基來源與 Ar⁺ 離子束獨立開關。只有 XeF₂ 時 Si 相對蝕刻率約為 5；只有 Ar⁺ 時約為 2；兩者同時存在時不是 7，而是約 55。</p>
      <p class="formula-inline"><strong>R = 5g + 2i + 48gi</strong></p>
      <p><code>g</code> 與 <code>i</code> 分別代表自由基和離子是否存在。乘積項表示缺少任何一邊，協同貢獻就消失。離子主要工作不是把所有材料撞走，而是打斷鍵結、建立懸鍵、混合表面反應層，並讓 SiF<sub>x</sub> 轉成可快速脫附的 SiF₄。</p>
      <p>因此現場看到「加 bias 但速率沒變」時，不能立刻再加 bias。自由基覆蓋率若已成瓶頸，增加離子能量只會提高遮罩消耗與損傷；反過來，離子不足時再增加氣體流量也可能只增加側壁化學侵蝕。</p>`
    },
    {
      id: "anisotropy",
      title: "異向性來自同一機制在兩個位置的差異",
      body: `<p>中性自由基由熱運動主導，可以到達溝底與側壁；正離子穿過鞘層後主要沿晶圓法線入射，深溝側壁接收到的直接離子通量很低。把相同協同模型放到兩個位置：</p>
      <div class="table-wrap"><table><thead><tr><th>位置</th><th>自由基</th><th>方向性離子</th><th>相對速率</th></tr></thead><tbody>
      <tr><td>溝底</td><td>有</td><td>有</td><td>約 55</td></tr>
      <tr><td>側壁</td><td>有</td><td>近乎沒有</td><td>約 5</td></tr>
      </tbody></table></div>
      <p>溝底比側壁快約 11 倍，垂直輪廓便從方向性與協同項直接產生。若壓力升高使鞘層碰撞增加，離子角度分佈變寬，側壁會開始收到離子，bowing 或 microtrench 的風險隨之上升。</p>`
    },
    {
      id: "passivation",
      title: "側壁鈍化是動態收支，不是固定塗層",
      body: `<p>氟碳聚合物、氧化型 SiOBr/SiOCl 或其他抑制層會沉積在所有暴露表面。溝底持續受到離子轟擊，保護層被移除後蝕刻得以繼續；側壁沒有足夠離子清膜，因此鈍化層淨累積並阻止自由基侵蝕。</p>
      <p>這是一個動態平衡：沉積稍低會 undercut，稍高會 taper，再高便 etch stop。深寬比增加時，自由基與聚合前驅物通量都會因立體角和表面消耗下降，局部收支沿深度改變，所以單一 blanket wafer 的結果不能直接代表高深寬比圖案。</p>
      <p>材料選擇比也可能由相同收支產生。例如 SiO₂ 表面氧可協助離子清除氟碳膜，而 Si 表面較容易累積聚合物；低 F/C 條件下可形成「氧化層繼續刻、矽表面自動停」的選擇性。</p>`
    },
    {
      id: "profile-diagnosis",
      title: "用剖面位置診斷，不只看平均 CD",
      body: `<div class="table-wrap"><table><thead><tr><th>剖面</th><th>最具區別力的量測</th><th>優先假設</th><th>第一個驗證動作</th></tr></thead><tbody>
      <tr><td>Undercut</td><td>遮罩下方頂部最寬</td><td>側壁鈍化不足</td><td>提高聚合性或降低自由基側蝕</td></tr>
      <tr><td>Taper</td><td>上寬下窄</td><td>鈍化過強或離子不足</td><td>降低聚合性，確認底部清膜</td></tr>
      <tr><td>Bowing</td><td>中段比頂部寬</td><td>斜射／反射離子打到中段</td><td>降壓縮窄角度分佈</td></tr>
      <tr><td>Microtrench</td><td>溝底兩側比中央深</td><td>底角離子反射聚焦</td><td>降低反射或 bias，改變底部角度</td></tr>
      <tr><td>Footing</td><td>下層界面附近縮頸</td><td>界面鈍化或充電</td><td>分辨材料界面效應與時間效應</td></tr>
      <tr><td>Faceting</td><td>遮罩開口本身變寬</td><td>遮罩肩部斜角濺鍍</td><td>降 bias 或增加遮罩保護</td></tr>
      <tr><td>Etch stop</td><td>深度提前停止</td><td>溝底聚合物淨累積</td><td>降低聚合性並確認離子能量</td></tr>
      </tbody></table></div>
      <p>診斷順序應先確認「哪個位置先偏離」，再映射到能到達該位置的物種。只有這樣，旋鈕調整才具備可反證的因果鏈。</p>`
    },
    {
      id: "selectivity-yield",
      title: "選擇比、蝕刻率與濺鍍角度的取捨",
      body: `<p>選擇比可來自三條路：產物揮發性的<strong>化學選擇性</strong>、不同材料聚合物收支的<strong>鈍化選擇性</strong>，以及離子能量是否跨過濺鍍閾值的<strong>閾值選擇性</strong>。高選擇比常靠更多鈍化、較低 bias 或較低 O₂ 建立，但這些方向通常也降低蝕刻率。</p>
      <p>濺鍍產額並非在垂直入射最大，而常在約 45–70° 達到峰值。遮罩肩部與溝底轉角提供斜角表面，可能比水平面更快被削除，分別形成 faceting 與 microtrenching。因此平均離子能量相同，不代表剖面影響相同；角度分佈與反射同樣需要監控。</p>`
    }
  ],
  callouts: [
    { type: "intuition", title: "工程師直覺", body: "離子是方向選擇器，自由基是主要化學移除者，鈍化層則是位置選擇器。三者的局部收支決定輪廓。" },
    { type: "misconception", title: "常見誤解", body: "把異向性解釋成『離子直接往下撞掉材料』會低估化學協同，也容易在速率不足時錯誤地持續增加 bias。" },
    { type: "warning", title: "模型界線", body: "A18 用簡化參數呈現定性因果與剖面量測，不是設備 recipe 轉換器。實際放行仍需 DOE、截面 SEM、材料選擇比與損傷資料。" }
  ],
  labs: [
    {
      id: "a17",
      title: "A17 Coburn-Winters 協同實驗",
      module: "/assets/js/labs/a17-coburn-winters.js",
      observation: [
        "依序只開自由基、只開離子，再同時開啟；比較 5、2、55 與簡單相加線 7。",
        "切到溝槽視角，比較溝底和側壁的局部速率，說明 11 倍差異從何而來。",
        "降低任一通量，觀察乘積協同項如何快速塌縮。"
      ]
    },
    {
      id: "a18",
      title: "A18 蝕刻輪廓模擬器",
      module: "/assets/js/labs/a18-profile-simulator.js",
      observation: [
        "依序切換八種預設，使用頂部、中段、底部、遮罩開口與局部深度讀值區分輪廓。",
        "在 bowing 預設降低離子角度發散，確認中段寬度下降。",
        "在 etch stop 預設降低鈍化強度，確認蝕刻深度恢復；再切到 faceting，降低 bias 比較遮罩開口。",
        "開啟多 CD 視圖，確認窄溝因自由基傳輸受限而較淺。"
      ]
    }
  ],
  selfCheck: [
    ["為什麼 5 + 2 不能預測兩者同時作用的速率？", "因為離子會打開化學反應與脫附瓶頸，出現只在兩者同時存在時才有的乘積協同項。"],
    ["異向性為什麼不需要假設自由基只能往下？", "自由基仍近似等向，但方向性離子主要到達溝底；乘積協同把這個位置差異放大。"],
    ["側壁鈍化過少與過多各造成什麼？", "過少使側壁受化學侵蝕而 undercut；過多使溝底清膜不足，先 taper、再 etch stop。"],
    ["Bowing 和 undercut 最有用的幾何區分是什麼？", "Undercut 通常在遮罩下方頂部最寬；bowing 則是中段比頂部更寬。"],
    ["Faceting 為什麼要量遮罩開口？", "因為 faceting 會削掉遮罩肩部並使開口變寬；undercut 主要侵蝕膜材，遮罩可保持完整。"],
    ["降低壓力為什麼可能改善 bowing？", "壓力下降使鞘層碰撞減少、離子角度分佈變窄，打到側壁中段的斜射離子減少。"],
    ["高選擇比為什麼常犧牲蝕刻率？", "增加鈍化、降低 bias 或減少氧都會保護非目標材料，但也使目標表面的清膜與反應變慢。"],
    ["平均離子能量相同時，剖面仍可能不同的原因是什麼？", "離子角度分佈、反射、局部充電與深寬比傳輸會改變能量實際沉積的位置。"]
  ],
  readings: [
    "Coburn, J. W. and Winters, H. F., Ion- and electron-assisted gas-surface chemistry, 1979.",
    "Lieberman and Lichtenberg, Principles of Plasma Discharges and Materials Processing.",
    "設備與材料供應商核准的蝕刻、遮罩及下層材料製程規格。"
  ]
};
