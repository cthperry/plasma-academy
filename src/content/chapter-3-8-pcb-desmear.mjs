export const chapterThreeEight = {
  id: "3-8",
  route: "/level/3/3-8-pcb-desmear/",
  title: "3.8 PCB 電漿除膠渣與咬蝕",
  hours: 2.5,
  prerequisites: ["2.2 製程氣體選用學", "3.7 封裝清潔與表面活化"],
  labs: [{
    id: "a34",
    title: "A34 PCB 除膠渣與咬蝕視窗",
    module: "/assets/js/labs/a34-pcb-desmear.js",
    observation: [
      "固定 15 分鐘，掃描 CF4 0、10、20、30、50%，分別讀取樹脂、玻纖與 flushness。",
      "先選 Desmear，再選 Etchback；在相同 CF4 下改變時間，確認兩者不是同一深度規格。",
      "把 CF4 設為 5%，確認深度可通過而玻纖仍突出，不能只看樹脂深度。"
    ]
  }],
  objectives: [
    "說明鑽孔熱造成 FR-4 樹脂 smear 與熱循環後的潛在界面失效。",
    "區分 desmear 與 etchback 的目的、深度窗與內層銅包覆效果。",
    "解釋 O2、CF4 對樹脂與 SiO2 玻纖的材料選擇性。",
    "同時以樹脂深度與玻纖 flushness 判定 PCB via wall。",
    "說明量產 recipe 仍需 DOE、截面量測、abatement、材料相容與 EHS 核准。"
  ],
  summary: "PCB 鑽孔後的熱會把 FR-4 環氧樹脂拖抹到露出的內層銅上。初始導通量測可能正常，但若銅與後續鍍層的界面薄弱，熱循環時會以開路或高阻抗失效。Desmear 的工作是去掉非預期的樹脂 smear；etchback 則刻意多去除一些樹脂，讓鍍銅能包覆內層銅的三面。O2 會移除有機樹脂，卻不能移除 SiO2 玻纖；CF4 供應 F，使玻璃形成揮發性 SiF4。這是 PCB 材料的特例，不能把它倒推成 3.7 封裝金屬與聚合物也應普遍使用含氟氣體。",
  sections: [
    {
      id: "drilling-smear",
      title: "鑽孔 smear：初測導通不等於可靠",
      body: `<p>鑽頭切入 FR-4 時的摩擦熱會軟化環氧樹脂，並把它<strong>塗抹（smear）</strong>在剛露出的內層銅箔邊緣。量產上最危險的情況不是完全不導通，而是鑽後的 continuity test 仍可通過：電流先經過局部接觸點，尚未揭露鍍銅與內層銅之間的弱界面。</p><p>後續熱循環會使樹脂、銅與鍍層的熱膨脹不匹配。若 smear 沒有去除，界面可能逐步裂開，最後才變成 intermittent open 或高阻抗。故障分析要看截面、微切片與熱循環後阻值，不能把初測導通當成可靠度放行。</p>`
    },
    {
      id: "desmear-etchback",
      title: "Desmear 與 etchback：相關 chemistry，不同目的",
      body: `<div class="table-wrap"><table><thead><tr><th>項目</th><th>Desmear 除膠渣</th><th>Etchback 咬蝕</th></tr></thead><tbody><tr><td>目的</td><td>移除非預期樹脂 smear，露出乾淨內層銅</td><td>刻意多去除樹脂，讓鍍銅包覆內層銅三面</td></tr><tr><td>教學深度窗</td><td>3-8 um</td><td>12-25 um</td></tr><tr><td>風險</td><td>殘留 smear 或玻纖突出</td><td>過度凹蝕、玻纖 recess、結構與鍍覆風險</td></tr></tbody></table></div><p>兩者可能使用相關的氧化與含氟 chemistry，但不能以「都在去樹脂」把深度規格混為一談。Desmear 的合格深度若拿去當 etchback，三面包覆可能不足；etchback 的劑量拿來做單純 desmear，則可能平白犧牲材料與製程餘裕。</p>`
    },
    {
      id: "oxygen-glass-boundary",
      title: "O2 只移除有機樹脂，不能移除玻纖",
      body: `<p>O2 電漿中的活性氧可將環氧樹脂轉成揮發性有機產物，因此能有效清除 smear。然而 FR-4 的玻纖主體是 SiO2，並不會因為有氧而揮發。純 O2 即使讓樹脂深度落在規格內，也會留下玻纖突出。</p><p><strong>深度通過與 flushness 通過是兩個獨立的驗收條件。</strong>例如 A34 的參考條件下，CF4 5% 的樹脂去除可落在 desmear 3-8 um 窗內，但玻纖仍相對突出，flushness 失敗。只量樹脂深度會錯放行這種 via wall。</p>`
    },
    {
      id: "cf4-material-exception",
      title: "CF4 的材料特例：讓 SiO2 形成揮發性 SiF4",
      body: `<p>CF4 解離後提供 F，玻璃中的 SiO2 可以生成揮發性 SiF4，故玻纖去除會隨 CF4 比例上升。這是針對 PCB 玻纖的材料選擇性例外。它<strong>不推翻 3.7 的封裝原則</strong>：封裝件同時含有 Cu、Ag、Al、焊料與聚合物，含氟殘留、腐蝕與疏水化仍是一般性風險。</p><p>在這個教學模型中，樹脂去除隨 CF4 比例先升後降：少量 CF4 有助於平衡玻纖，但過多 CF4 一方面造成玻纖凹蝕，另一方面稀釋了驅動樹脂移除的氧。玻纖去除則隨 CF4 上升。最佳點不是「F 越多越好」，而是樹脂與玻纖接近平齊的交集。</p>`
    },
    {
      id: "acceptance-and-doe",
      title: "放行與模型邊界：趨勢不等於量產 recipe",
      body: `<p>A34 的絕對速率是代表性的教學數值，用於比較 O2/CF4 比例、功率、壓力與時間的因果關係，<strong>不是合格的量產 recipe</strong>。不同板材樹脂、玻纖織法、孔徑、內層銅幾何、電漿源與載具都會改變窗口。</p><p>正式導入仍需以 tool-specific DOE 找出深度與 flushness 的共同窗口，並以微切片／截面 metrology 核實。排氣與 abatement、F 相關排放、材料相容性、供氣系統、機台安全與所在地 EHS 核准都必須在正式 recipe 前完成；模型輸出不可取代這些控制。</p>`
    }
  ],
  callouts: [
    { type: "intuition", title: "判定順序", body: "先問樹脂是否到達 desmear 或 etchback 的深度窗，再獨立問玻纖是否平齊。兩個問題的答案不能互相替代。" },
    { type: "misconception", title: "常見誤解", body: "<p><strong>誤解：</strong>CF4 越高，玻纖去得越乾淨，所以一定越好。</p><p><strong>正解：</strong>過量 CF4 同時造成玻纖凹蝕並稀釋氧驅動的樹脂去除；樹脂深度、玻纖 flushness 都可能失去共同製程窗。</p>" },
    { type: "warning", title: "量產邊界", body: "此章的數值只供教學比較。任何實際 PCB 製程都要完成設備別 DOE、截面量測、排氣與 abatement、排放、材料相容及當地 EHS 核准。" }
  ],
  selfCheck: [
    ["鑽孔後為什麼可能初測導通、熱循環後才失效？", "smear 可留下局部導通，但弱的內層銅／鍍層界面在熱膨脹循環後會裂開。"],
    ["Desmear 與 etchback 的深度窗為何不能共用？", "desmear 只移除非預期 smear（3-8 um）；etchback 刻意多去樹脂以取得三面包覆（12-25 um）。"],
    ["純 O2 為何不能讓 FR-4 via wall 完全平齊？", "O2 移除有機樹脂，不能移除 SiO2 玻纖，所以會留下玻纖突出。"],
    ["CF4 如何協助玻纖移除？", "F 讓 SiO2 中的 Si 形成可揮發的 SiF4，這是材料特定的反應。"],
    ["為什麼 CF4 50% 可能同時不利於樹脂與玻纖？", "高 CF4 稀釋氧驅動樹脂去除，並持續加快玻纖移除而造成 recess。"],
    ["深度通過但 flushness 失敗表示什麼？", "樹脂深度雖在窗內，玻纖仍突出或凹陷；via wall 幾何尚未達到獨立的平齊驗收。"],
    ["A34 的速率能否直接作為量產 recipe？", "不能；必須以設備別 DOE、截面 metrology、排放與 abatement、材料相容和在地 EHS 核准建立正式條件。"]
  ],
  readings: [
    "IPC 對內層互連、孔壁品質與微切片驗證的適用規範。",
    "板材供應商對 FR-4 樹脂、玻纖織法與鑽孔後處理的技術資料。",
    "廠區核准的 CF4 供氣、排氣、abatement、排放與 EHS 程序。"
  ]
};
