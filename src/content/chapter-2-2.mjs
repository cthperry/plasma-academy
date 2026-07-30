export const chapterTwoTwo = {
  id: "2-2",
  route: "/level/2/2-2-process-gases/",
  title: "2.2 製程氣體選用學",
  hours: 4,
  objectives: [
    "依揮發產物判斷指定材料可用的主反應氣體。",
    "用有效 F/C 與離子輔助解釋蝕刻、側壁鈍化與 etch stop。",
    "針對材料、下層與 profile 提出配方並逐支說明角色。",
    "從危害、材質相容、排氣與殘留後處理淘汰不可用方案。"
  ],
  prerequisites: ["1.6 製程電漿地圖：先分辨蝕刻、沉積、灰化、腔體清潔與表面處理。", "2.1 氣體動力學與真空：能區分進氣比例、分壓、滯留時間與實際腔內組成。"],
  summary: "選氣體不是查表後照抄，而是依序回答四題：目標材料能否形成可揮發產物、下層材料要如何保護、輪廓需要多少側壁鈍化與離子方向性，以及安全、殘留、材料相容和排氣系統是否允許。氟碳氣體的 F/C 比提供一條重要主軸：高 F/C 偏化學蝕刻，低 F/C 偏 CFx 聚合；O₂、H₂、bias 與表面含氧量會再移動有效平衡。本章以五個量產案例、A09 決策樹、A10 profile 模擬和 A11 氣體百科，把配方從名稱清單改寫成可檢查的因果鏈。",
  sections: [
    {
      id: "four-questions",
      title: "先問四題：材料、下層、輪廓、限制",
      body: `<p>配方設計的第一題不是「哪支氣體常用」，而是目標固體能否被轉成在製程溫度與壓力下可排出的產物。Si 遇 F 可形成低沸點 SiF₄，Al 遇 Cl 可形成可升華的 AlCl₃；相反地，AlF₃ 與多數 Cu 鹵化物不易揮發，生成後會留在表面或再沉積。若第一步的產物不會離開，增加功率通常只會帶來更多損傷與顆粒。</p><p>第二題是不能動到的下層。Poly-Si gate 蝕刻停在薄 gate oxide 上，需要 Cl₂ 提供速率、HBr/O₂ 建立側壁鈍化與選擇比；SiO₂ 接觸孔停在 Si 上，則靠低 F/C 氟碳聚合物在 Si 表面累積。選擇比不是氣體固有常數，而是自由基供應、離子能量、表面含氧、溫度與聚合物穩態共同產生的結果。</p><p>第三題是 profile。等向清除需要自由基能從各方向反應，常使用高 F 產率、較弱鈍化與較高碰撞條件；垂直溝槽需要側壁持續沉積保護層，並讓具方向性的離子只清除溝底。錐形輪廓位於兩者之間，可用壓力、bias、鈍化供應與溫度調整側壁角。</p><p>第四題是整合限制。低損傷會限制 bias、UV 與 charging；低溫會改變產物揮發與聚合物黏著；高速率可能犧牲選擇比與均勻度。最後還要問氣瓶櫃、purge、管路材質、scrubber、GWP、後處理與跨批次殘留。A09 會把這四題展成可見路徑，但輸出仍是待驗證假說，不是可直接上機的 recipe。</p>`
    },
    {
      id: "gas-families",
      title: "七大氣體家族與分工",
      body: `<p>惰性氣體不代表沒有製程作用。Ar 容易維持放電，Ar⁺ 能清除鈍化層、打斷表面鍵或濺鍍靶材，也能作為 OES actinometry 內標；He 質量低、熱傳導高，常用於稀釋與晶圓背面導熱。背吹 He 走 ESC 與晶圓之間，不應與反應腔主流量混算，洩漏率異常往往先反映夾持或晶圓溫度問題。</p><p>氟碳氣體同時提供 F 自由基與 CFx 聚合前驅物。CF₄ 的 F/C=4，偏向高 F 供應；CHF₃、CH₂F₂、C₄F₈、C₄F₆ 與 CH₃F 依序提高聚合傾向。SF₆、NF₃ 與 F₂ 不含碳，通常不建立同類側壁聚合；SF₆ 適合快速或等向 Si 移除，NF₃ 因遠端解離效率高而常用於腔體清潔，但都必須處理溫室效應與下游排放。</p><p>Cl₂、HBr、BCl₃ 與 SiCl₄ 是導體與矽蝕刻的重要家族。Cl₂ 提供反應性 Cl，HBr 有利於 poly-Si 異向性與對氧化層選擇比，BCl₃ 可去除 Al 原生氧化層。這些氣體劇毒、腐蝕且高度怕水；Al 蝕刻後若含 Cl 殘留直接暴露於濕氣，腐蝕可能在出腔後繼續。</p><p>O₂、N₂O、CO₂ 與 CO 改變氧化、灰化與氟碳碳平衡；N₂、NH₃、H₂ 則負責稀釋、氮化或還原。SiH₄、TEOS、WF₆、B₂H₆ 與 PH₃ 等前驅物供應要沉積的元素，其中自燃、劇毒或腐蝕風險必須先由設備與 EHS 審查。家族分類是功能索引，不是安全等級；同一支氣體在不同濃度、供應型態與設備上會有不同控制要求。</p>`
    },
    {
      id: "fc-balance",
      title: "F/C 比與離子輔助聚合物平衡",
      body: `<p>F/C 比把氟碳化學壓縮成一條可用的第一階軸。高 F/C 通常代表較多自由 F、較少單位 F 對應的碳供應，化學蝕刻較強而聚合較弱；低 F/C 供應較多 CFx 片段，表面聚合物增厚，側壁保護與對下層選擇比提高，過頭則會 etch stop。這個軸是相對趨勢，不是跨設備通用的臨界值。</p><p>O₂ 會把碳轉成 CO/CO₂，常使有效 F/C 上升並清除聚合物；H₂ 抓取 F 形成 HF，常使有效 F/C 下降。兩者都存在非線性與最佳點：少量 O₂ 可能提高 SiO₂ 蝕刻率，過量卻造成稀釋、表面氧化或光阻消耗；H₂ 太多則可能讓所有表面都被聚合物封住。</p><p>聚合物會在遮罩頂部、溝底與側壁同時沉積，但移除能力不同。離子沿鞘層電場接近垂直入射，能清除溝底聚合物並啟動離子輔助反應；側壁缺少直接離子轟擊，保護層得以保留。這就是異向性不是單靠「離子往下打」，而是定向移除與全方向沉積的動態平衡。</p><p>表面材料也參與平衡。SiO₂ 可提供氧幫助消耗氟碳聚合物，使溝底反應持續；Si 表面缺少這個氧來源，同一條件下聚合物更容易累積，因此形成 SiO₂ 對 Si 選擇比。A10 以簡化模型顯示三個狀態與相對趨勢，數值不能替代設備校正、截面資料或量測 recipe。</p>`
    },
    {
      id: "five-cases",
      title: "五個配方案例：逐支說明角色",
      body: `<p><strong>Poly-Si gate over gate oxide：</strong>Cl₂ 提供 poly-Si 蝕刻率，HBr 建立 SiOBr 類側壁鈍化並提高對薄氧化層的選擇比，少量 O₂ 調整鈍化。壓力需保留方向性，bias 要能打開溝底但不能穿傷 gate oxide。判斷成功不能只看平均速率，還要看 CD、側壁角、notching 與 over-etch 後氧化層損失。</p><p><strong>SiO₂ contact over Si：</strong>C₄F₈ 供應 F 與 CFx 聚合物，Ar 提供離子輔助，O₂ 微調有效 F/C。聚合物保護側壁與 Si stop layer，bias 清除底部聚合物。若 bias 太低或 F/C 太低會 etch stop；太高則 mask loss、charging 與 Si recess 上升。</p><p><strong>SiN spacer over Si：</strong>CH₂F₂ 提供高聚合化學，O₂ 控制聚合物厚度，Ar 穩定放電並提供方向性。目標是移除水平 SiN、保留側壁 spacer 並停止在 Si 或 oxide；loading、溫度與圖形密度會改變局部自由基耗盡，因此 blanket coupon 的選擇比不能直接代表圖形結果。</p><p><strong>Al line over SiO₂：</strong>Cl₂ 是主反應氣體，BCl₃ 去除 Al₂O₃ 並補充 Cl，N₂ 可調整側壁與放電。製程後必須移除含 Cl 殘留並保持乾燥，否則出腔吸濕後會持續腐蝕。<strong>Deep Si MEMS：</strong>Bosch 製程交替以 SF₆ 快速蝕刻、C₄F₈ 鈍化，循環時間決定 scallop、速率與 profile。</p><p>Cu 是刻意保留的反例。常溫下沒有適合主流 RIE 的高揮發性 Cu 鹵化物，因此先在介電層做 trench/via，再沉積 barrier、seed 與 Cu，最後用 CMP 去除多餘金屬。好的決策樹必須允許「不要蝕刻這個材料」成為正確答案，而不是為每個選項硬湊氣體。</p>`
    },
    {
      id: "safety-cleanliness",
      title: "危害、殘留與封裝清潔的材料相容",
      body: `<p>氣體危害要拆成毒性、自燃、腐蝕、氧化、窒息與溫室效應，而不是只貼一個顏色。SiH₄、B₂H₆、PH₃ 等自燃或劇毒前驅物需要氣瓶櫃、雙層管、偵測與自動關斷；Cl₂、HBr、BCl₃、WF₆、NF₃、F₂ 等需確認濕式、乾式或燃燒式 abatement 是否匹配。教材中的等級只是索引，實際使用以廠區核准 SDS、供應濃度與設備規範為準。</p><p>切換氣體前要確認互斥化學不會在管路混合，purge 量與時間足以把死角置換，閥件、O-ring、金屬與油脂都相容。製程結束後還要問副產物去哪裡：SiF₄、HF、HCl、COF₂、粉塵與可凝結前驅物可能在 foreline、pump 或 scrubber 累積，改變 conductance、形成顆粒或在維護時暴露人員。</p><p>腔體清潔和封裝清潔不能混稱。NF₃ remote clean 的目標是移除設備內壁沉積並恢復 chamber baseline；封裝清潔處理的是 RDL、UBM、Cu/Ni/Sn、PI、epoxy、助焊劑與 underfill 接合界面。O₂ 適合有機去污與活化，卻可能氧化金屬；Ar 可物理去除薄弱層，過高 bias 會粗化、再沉積或打傷聚合物；N₂/H₂ 可提供較溫和的還原路徑，但氫安全與材料相容仍需驗證。</p><p>因此「清乾淨」必須轉成可量測驗收：接觸角或 dyne test 看潤濕，XPS/FTIR 看表面化學，離子層析看 Cl/F/Na/K，particle monitor 看微粒，剪切／拉力、C-SAM、HAST、TC、MSL 看界面與長期可靠度。A09 對光阻與有機膜會導向 3.7，但不會把一組泛用 O₂ recipe 當成所有封裝材料的答案。</p>`
    }
  ],
  callouts: [
    { type: "intuition", title: "工程師直覺", body: "先問產物會不會揮發，再談功率與速率。若產物留在原地，更多能量往往只會增加損傷、殘留與微粒。" },
    { type: "misconception", title: "常見誤解", body: "F/C 比不是氣體的萬能排名。O₂、H₂、解離率、溫度、bias、表面含氧與 loading 都會改變有效平衡。" },
    { type: "warning", title: "安全與資料邊界", body: "氣體百科與決策樹是教材工具，不取代廠區核准 SDS、EHS 程序、設備 gas matrix、MOC 或相容性審查。" }
  ],
  labs: [
    { id: "a09", title: "A09 氣體選用決策樹", module: "/assets/js/labs/a09-gas-decision-tree.js", observation: ["走完五個標準案例，逐支指出主反應、鈍化、稀釋或添加角色。", "把材料切換為 Cu，確認系統停止推薦 RIE 配方並說明大馬士革替代流程。", "選擇光阻或有機膜與低損傷限制，檢查輸出是否連到封裝清潔的材料相容與可靠度。"] },
    { id: "a10", title: "A10 F/C 比與蝕刻輪廓模擬", module: "/assets/js/labs/a10-fc-profile.js", observation: ["選 CF₄ 並提高 O₂，觀察高有效 F/C 如何產生 undercut 與較差選擇比。", "以 C₄F₈、適量 O₂ 與中高 bias 找到垂直側壁製程窗。", "把 bias 調到 0 或切到 CH₃F/H₂，確認溝底也被聚合物封住而 etch stop。", "保持參數不變切換 SiO₂ 與 Si，比較表面含氧造成的淨速率差。"] },
    { id: "a11", title: "A11 氣體百科瀏覽器", module: "/assets/js/labs/a11-gas-browser-link.js", observation: ["用家族與用途篩選找出介電質蝕刻、腔體清潔與封裝表面處理的候選氣體。", "按 F/C 排序比較 CF₄、CHF₃、C₄F₈、C₄F₆ 與 CH₃F。", "展開任一高危害氣體，確認 SDS 狀態、材質禁用與排氣處理都被保留。"] }
  ],
  selfCheck: [
    ["為什麼 Al 蝕刻用 Cl 系而不能直接改用 F 系？", "AlCl3 在製程條件下可被排出，AlF3 極難揮發，會形成殘留。"],
    ["Cu 路徑為什麼不推薦一般鹵素 RIE？", "Cu 鹵化物揮發性不足，主流整合以鑲嵌、填 Cu 與 CMP 取代直接圖形蝕刻。"],
    ["提高有效 F/C 對蝕刻與聚合通常有何影響？", "自由 F 傾向增加、聚合減弱，化學蝕刻與側向攻擊通常變強。"],
    ["為什麼側壁聚合物能保留而溝底可以繼續蝕刻？", "方向性離子能清除溝底聚合物，側壁缺少直接離子轟擊。"],
    ["同一氟碳條件下，SiO2 為何可比 Si 蝕得快？", "SiO2 表面含氧有助消耗聚合物，Si 上聚合物更容易累積。"],
    ["BCl3 在 Al 蝕刻的核心角色是什麼？", "抓取氧並移除阻擋反應的原生 Al2O3，同時提供 Cl。"],
    ["為什麼氣體危害顏色不能取代 SDS？", "危害還受濃度、供應型態、設備、混氣、在地規範與核准控制措施影響。"],
    ["封裝清潔和腔體清潔的目標差在哪裡？", "前者控制產品界面的接合與可靠度，後者移除機台內壁沉積並恢復腔體基準。"]
  ],
  readings: ["Lieberman & Lichtenberg, Principles of Plasma Discharges and Materials Processing，章節：Plasma Etching and Surface Chemistry。", "Donnelly & Kornblit, Plasma etching: Yesterday, today, and tomorrow, Journal of Vacuum Science & Technology A。", "使用任何氣體前，另查廠區核准供應商 SDS、設備 gas matrix 與 abatement 操作規範。"]
};
