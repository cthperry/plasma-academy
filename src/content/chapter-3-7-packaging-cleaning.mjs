export const chapterThreeSeven = {
  id: "3-7",
  route: "/level/3/3-7-packaging-cleaning/",
  title: "3.7 封裝清潔與表面活化",
  hours: 3,
  prerequisites: ["2.1 氣體動力學與真空", "2.2 製程氣體選用學", "3.4 電漿沉積與界面"],
  labs: [{
    id: "a33",
    title: "A33 封裝電漿處理計算器",
    module: "/assets/js/labs/a33-package-clean.js",
    observation: [
      "固定 EMC 與 O₂，依序把時間調到 60、120、180 秒；比較接觸角與接著力是否同方向變化。",
      "切換 Cu pad，對比 O₂、Ar 與 H₂/Ar 的金屬氧化與接著力指數。",
      "把 Clean-to-bond 等待時間拉到 24–48 小時，觀察疏水回復如何吃掉原本的製程餘裕。"
    ]
  }],
  objectives: [
    "分辨封裝清潔與腔體清潔的目的差異。",
    "說出 RDL、UBM、凸塊與 underfill 前常見污染來源。",
    "判斷何時使用 O2、Ar、N2/H2、H2O 或遠端電漿清潔。",
    "用接觸角、表面能、離子污染與拉力測試判斷清潔是否有效。",
    "辨識過度清潔造成的金屬氧化、聚合物粗化與低 k 損傷風險。"
  ],
  summary: "封裝清潔不是把表面洗到「看起來乾淨」就結束。它的目標是讓下一道材料能可靠接合：鍍銅前要去除氧化物與有機殘留，underfill 前要提高潤濕與附著，模封前要降低離子污染與界面弱層。封裝材料比前段製程更混雜，金屬、聚醯亞胺、環氧樹脂、助焊劑、玻璃與矽都可能同時出現，所以清潔 recipe 必須同時考慮去污、表面活化、材料相容與後續可靠度。",
  sections: [
    {
      id: "difference-from-chamber-clean",
      title: "先分清楚：封裝清潔不是腔體清潔",
      body: `<p><strong>腔體清潔</strong>是在清機台，把腔壁沉積物移除，典型例子是 NF3 遠端電漿清潔。<strong>封裝清潔</strong>是在清產品表面，目標是讓 RDL、UBM、凸塊、underfill、die attach 或 mold compound 接得住、接得穩。</p>
      <p>這個差異很重要。腔體清潔重視清潔速率與零件壽命；封裝清潔重視界面可靠度。你不能只問「殘留少了多少」，還要問「下一層材料的附著力、潤濕性、腐蝕風險與可靠度有沒有變好」。</p>`
    },
    {
      id: "contamination-sources",
      title: "污染來源：多數問題藏在界面",
      body: `<p>封裝線常見污染可以分成四類：有機殘留、金屬氧化物、離子污染與微粒。來源包括光阻/PI 開口後的殘膠、RDL 電鍍前的 seed layer 氧化、助焊劑殘留、切割與研磨碎屑、搬運治具 outgassing、以及濕製程乾燥不完全留下的水痕。</p>
      <div class="table-wrap"><table><thead><tr><th>場景</th><th>常見污染</th><th>主要風險</th><th>常用判斷</th></tr></thead><tbody>
      <tr><td>RDL / UBM 前</td><td>Cu/Ni 氧化、有機殘膠、微粒</td><td>鍍層空洞、附著力差、接觸電阻上升</td><td>接觸角、XPS/AES、四點探針、剝離測試</td></tr>
      <tr><td>凸塊 / 銲接前</td><td>氧化物、助焊劑殘留、鹵素離子</td><td>non-wet、空洞、腐蝕</td><td>潤濕平衡、離子層析、剪切/拉力</td></tr>
      <tr><td>Underfill 前</td><td>有機薄膜、吸附水、低表面能污染</td><td>填充不完全、delamination、crack propagation</td><td>接觸角、SAM、C-SAM、熱循環後剝離</td></tr>
      <tr><td>模封前</td><td>微粒、離子殘留、表面弱層</td><td>界面剝離、popcorn、腐蝕路徑</td><td>離子污染、吸濕試驗、HAST、MSL</td></tr>
      </tbody></table></div>`
    },
    {
      id: "plasma-cleaning-modes",
      title: "電漿清潔：去污與活化要分開想",
      body: `<p>封裝用電漿清潔常見四種方向。<strong>O2 電漿</strong>擅長移除有機殘留並提高表面能，但會氧化金屬，也可能讓部分聚合物表面過度粗化。<strong>Ar 電漿</strong>偏物理轟擊，可移除弱吸附層與薄氧化物，但 bias 太高會傷金屬、打粗表面或產生再沉積。<strong>N2/H2 或 forming gas 電漿</strong>常用在較溫和的還原與表面活化場景。<strong>H2O 電漿</strong>可用於鹵素殘留處理與親水化，但必須注意水氣記憶與後續乾燥。</p>
      <p>現場調 recipe 時，不要只看功率。真正要問的是：你要的是化學去污、還原氧化物、表面活化、還是輕微物理轟擊？這四件事可以同時發生，但主導機制不同，副作用也不同。</p>`
    },
    {
      id: "wet-clean-integration",
      title: "濕式清潔與乾式清潔要串成一條流程",
      body: `<p>封裝清潔常常不是「濕式或電漿二選一」，而是濕式去 bulk contamination，電漿處理最後幾奈米的界面狀態。濕式清潔能有效移除鹽類、助焊劑與顆粒，但乾燥、水痕、再吸附與材料膨潤都會影響結果；電漿可以補上表面活化，但不適合拿來清大量污染。</p>
      <p>一個實用判斷：如果污染厚到肉眼、光學或 SEM 能明顯看到，先不要期待低功率電漿把它變乾淨。先處理前段濕洗、刷洗、megasonic、化學選擇性與乾燥，再用電漿微調界面能。</p>`
    },
    {
      id: "process-window",
      title: "製程窗：清不夠與清過頭都會壞",
      body: `<p>封裝清潔的製程窗通常比想像窄。清不夠會有殘膠、non-wet、delamination；清過頭則可能氧化 Cu/Ni/Sn、降低 solderability、讓 PI/epoxy 表面脆化，或把原本需要保留的 coupling chemistry 打掉。</p>
      <div class="table-wrap"><table><thead><tr><th>旋鈕上升</th><th>正向效果</th><th>副作用</th><th>監控指標</th></tr></thead><tbody>
      <tr><td>O2 比例 / 時間</td><td>有機去除、表面能上升</td><td>金屬氧化、聚合物過度改質</td><td>接觸角、XPS O/C、拉力</td></tr>
      <tr><td>Ar bias</td><td>弱層移除、薄氧化層剝除</td><td>表面粗化、再沉積、金屬損傷</td><td>AFM/SEM、接觸電阻、顆粒</td></tr>
      <tr><td>H2 / N2H2</td><td>還原與溫和活化</td><td>處理速率較慢、材料相容需確認</td><td>氧化層厚度、wetting、可靠度</td></tr>
      <tr><td>真空等待時間</td><td>排水與排氣更完整</td><td>產能下降、再吸附風險仍存在</td><td>接觸角回復曲線、outgassing</td></tr>
      </tbody></table></div>`
    },
    {
      id: "acceptance-and-reliability",
      title: "驗收：不要只看接觸角",
      body: `<p>接觸角很方便，但它只告訴你表面能的一部分，不等於可靠度。封裝清潔的驗收應該同時看短期界面狀態與長期可靠度：接觸角或 dyne test 看潤濕，XPS/FTIR 看化學殘留，離子層析看 Cl、F、Na、K，C-SAM 看界面空洞，剪切/拉力看附著，HAST、TC、MSL 看長期失效。</p>
      <p>最容易犯的錯是用「清潔後接觸角很低」直接宣稱 recipe 成功。真正的成功是：清潔後到下一道製程的等待時間內，表面仍保持可接合狀態，而且可靠度測試沒有把界面弱點放大出來。</p>`
    }
  ],
  callouts: [
    {
      type: "intuition",
      title: "工程師直覺",
      body: "封裝清潔的核心不是乾淨，而是界面可接合。把每一道清潔都問成三個問題：移除了什麼？新增或改變了什麼表面官能基？下一道材料因此更容易接上，還是更容易失效？"
    },
    {
      type: "misconception",
      title: "常見誤解",
      body: "<p><strong>常見說法：</strong>O2 plasma 越久越乾淨，附著力越好。</p><p><strong>正確理解：</strong>O2 plasma 可以去有機並活化表面，但時間過長可能氧化金屬、脆化聚合物或造成表面能快速回復，附著力反而下降。</p>"
    },
    {
      type: "warning",
      title: "安全與材料相容",
      body: "封裝線常同時有 Cu、Ni、SnAg、PI、epoxy、玻璃與有機助劑。任何新清潔 recipe 都必須做材料相容與可靠度驗證，不能只用單一 wafer coupon 的表面結果外推到產品。"
    }
  ],
  selfCheck: [
    {
      prompt: "封裝清潔和腔體清潔最大的差異是什麼？",
      answer: "封裝清潔處理產品界面，目標是提升接合、潤濕與可靠度；腔體清潔處理機台內壁沉積物。"
    },
    {
      prompt: "為什麼接觸角不能單獨當作封裝清潔成功的證據？",
      answer: "接觸角只反映部分表面能，無法直接證明離子污染、化學殘留、附著力與長期可靠度都合格。"
    },
    {
      prompt: "O2 電漿清潔 Cu pad 的主要上限風險是什麼？",
      answer: "O2 能去除有機物，卻會增加 Cu 氧化；接觸角改善不代表打線或銲接潤濕一定改善。"
    },
    {
      prompt: "為什麼大量助焊劑或可見殘留不應只靠低功率電漿處理？",
      answer: "電漿適合調整最後幾奈米界面；大量污染應先用具選擇性的濕洗、刷洗與乾燥移除，否則可能碳化、再沉積或耗盡製程窗。"
    },
    {
      prompt: "Clean-to-bond queue time 超時後，為什麼不能直接重跑相同 recipe？",
      answer: "重清潔會累積聚合物損失、粗化、金屬氧化與離子劑量；只有在核准規範已涵蓋重清潔次數與累積 dose 時才能照流程執行。"
    }
  ],
  readings: [
    "封裝材料供應商的 plasma treatment、接著與儲存條件技術資料。",
    "廠區核准的 clean-to-bond、重清潔次數、離子污染與可靠度規範。",
    "JEDEC MSL、溫循環、HAST 與封裝界面失效分析程序。"
  ]
};
