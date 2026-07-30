export const chapterThreeSix = {
  id: "3-6", route: "/level/3/3-6-uniformity-chamber/", title: "3.6 均勻度、腔體狀態與量產診斷", hours: 2.5,
  prerequisites: ["2.1 氣體動力學與真空", "2.5 電漿源與功率耦合", "3.3 缺陷圖鑑與診斷"],
  objectives: [
    "分別計算半幅法與 1σ 法不均勻度。", "由中心快、邊緣快、W 形、偏斜、同心環與 edge roll 推論候選機制。",
    "把 gap、壓力、分區氣體、溫度、聚焦環與泵口連到 map。", "區分 first wafer effect、逐片漂移與單片局部異常。",
    "設計跨晶圓位置、機台、批次與 PM 週期的診斷證據。"
  ],
  summary: "均勻度數字必須附計算定義：半幅法對極端值敏感，1σ 法描述整體分散，兩者不可混報。Wafer map 的形狀提供機制線索：中心/邊緣差可能來自分區氣體、溫度或電場，單邊偏斜常與泵口或硬體不對稱相關，同心環可能指向駐波或多區控制，edge roll 則要檢查聚焦環與邊界鞘層。腔壁沉積、清潔、seasoning、首片與零件壽命會讓相同設定產生不同結果，因此量產診斷需把 map 與時間軸、設備 trace、圖形密度及 PM 週期對齊。",
  sections: [
    { id: "definitions", title: "先寫清楚不均勻度定義，再比較數字", body: `<p>常見半幅法為 (最大值−最小值)/(最大值+最小值)×100%，直接反映最差兩點，對邊緣異常、量測離群與取樣密度敏感。1σ 法則以標準差除平均值，描述整體分散；若只有少數 edge point 失控，半幅法可能很差而 1σ 仍可接受。</p><p>比較機台、recipe 或文獻前，要確認 wafer exclusion、取樣點、插值、正規化與單位一致。膜厚、蝕刻率與 CD 的規格也可能用不同定義。A25 同時顯示兩個數值，目的不是選較好看的指標，而是把 map 的局部極端與整體分布分開。</p>` },
    { id: "flow-temperature", title: "氣流與溫度通常形成平滑徑向或單邊分布", body: `<p>Showerhead 分區比例、總流量、gap、壓力與抽氣位置共同決定前驅物供應和耗盡。中心供氣偏高可能形成中心快，edge zone 或側向補償過強則可能邊緣快；泵口與進氣不對稱會形成方向固定的單邊偏斜。提高 gap 或碰撞通常會平滑短尺度差異，但也改變 residence time 與電漿耦合。</p><p>晶座多區溫度會透過表面反應、聚合物收支與吸附改變速率。溫度 map 先於製程 map 改變時，應檢查 backside He、接觸、chiller、wafer bow 與 zone calibration。只用氣體分區補償熱問題可能暫時把 map 拉平，卻讓不同產品厚度或熱負載下再次失控。</p>` },
    { id: "field-hardware", title: "電場與邊界硬體會留下環形、W 形與 edge roll 指紋", body: `<p>高頻大面積電漿可能受駐波、skin effect、電極結構與匹配位置影響，形成中心、邊緣或同心環分布。多區 source/bias 控制也可能產生 W 形：中心與邊緣較高、中環較低。這類 map 常隨頻率、功率模式或硬體位置變化，而不只隨流量。</p><p>聚焦環高度、材質與侵蝕改變晶圓邊界的鞘層與離子軌跡，使用壽命後常出現 edge roll。換新環若 map 立即恢復，是強證據；但仍要排除 edge exclusion、晶圓偏心與量測邊緣誤差。A25 會把聚焦環耗損拉到 100%，要求模型必定形成 edge roll。</p>` },
    { id: "chamber-memory", title: "腔體不是固定邊界：清潔、沉積與 seasoning 會改變反應", body: `<p>腔壁在批次間吸附水氣、覆蓋聚合物或被清潔成不同材料表面，會改變自由基復合、二次電子、放氣與顆粒。First wafer effect 是待機或清潔後第一片不同、後續趨穩；若整批持續單向漂移，則較像腔壁累積、靶材/電極/聚焦環消耗或溫控偏移。</p><p>Seasoning 用 dummy wafer 與指定 chemistry 把腔壁帶回可重複狀態，但其終點也應有證據。量產 SPC 要按 clean count、RF hour、kWh、片數、recipe mix 與 idle time 分層，否則不同腔體生命週期的資料混在同一管制圖會掩蓋漂移。</p>` },
    { id: "diagnostic-plan", title: "Map 診斷要加入時間、密度、機台與量測四個維度", body: `<p>先確認量測系統與 wafer orientation，再看 map 是否固定在 wafer 座標或隨 wafer 旋轉。接著比較不同圖形密度、不同 recipe、不同機台與不同 PM 階段。固定在 chamber 方位的偏斜支持泵口、供氣或硬體不對稱；固定在 wafer 的缺陷則要查上游膜厚、翹曲與圖形。</p><p>診斷實驗要一次只改一個高辨識力變因，並保存 setpoint 與實際 trace。中心/邊緣氣體、溫度 zone、gap、pressure、focus ring 與 match position 都可能互相補償；只看最後均勻度無法判斷是否在穩健窗口。放行還需確認平均速率、profile、選擇比、顆粒與產品功能未被補償動作犧牲。</p>` }
  ],
  callouts: [
    { type: "intuition", title: "工程師直覺", body: "Map 是空間指紋，SPC 是時間指紋；把兩者對齊 PM、recipe mix 與 wafer orientation，候選原因才會快速縮小。" },
    { type: "misconception", title: "常見誤解", body: "半幅 3% 與 1σ 3% 不是同一件事。未標定義、edge exclusion 與取樣點的均勻度數字不能直接比較。" },
    { type: "warning", title: "量產界線", body: "分區氣體、溫度與 focus ring 補償會影響其他膜性與硬體壽命；任何放行需依產品與設備核准流程。" }
  ],
  labs: [{ id: "a25", title: "A25 晶圓分布熱圖與反向診斷", module: "/assets/js/labs/a25-wafer-map.js", observation: ["依序切換六種 map，先只看形狀猜候選原因，再揭曉。", "將聚焦環耗損拉到 100%，確認 edge roll 與半幅不均勻度上升。", "改變泵口角度與中心氣體比例，比較單邊與徑向成分。"] }],
  selfCheck: [
    ["半幅法與 1σ 法最大差異是什麼？", "半幅法由最大最小值決定、對局部極端敏感；1σ 描述所有點的整體分散。"],
    ["單邊偏斜首先要記錄什麼？", "Wafer orientation 與 chamber 方位，判斷偏斜固定在晶圓還是設備座標。"],
    ["W 形 map 常提示哪些候選？", "多區氣體、溫度或電場補償過度，以及高頻電漿空間耦合。"],
    ["Edge roll 為何要查聚焦環？", "環的高度與侵蝕改變邊界鞘層和離子軌跡，影響晶圓外圈速率。"],
    ["First wafer effect 和逐片漂移如何分？", "前者主要是第一片異常後趨穩；後者沿片數持續改變。"],
    ["為何 seasoning 不能只用固定片數？", "前次清潔、idle、recipe mix 與腔壁狀態不同，固定片數未必到相同穩態。"],
    ["Map 拉平後為何仍不能直接放行？", "補償可能犧牲平均速率、profile、膜性、顆粒或硬體壽命，需一併驗證。"]
  ],
  readings: ["半導體設備 OEM 的 uniformity tuning、focus ring 與 chamber matching 手冊。", "產品核准的 wafer map、edge exclusion、SPC 與 PM 後放行規範。", "量測設備的 MSA、取樣與插值方法文件。"]
};
