const names = [
  ["A01", 1, "1.1", "氣體到電漿相變", "Canvas", "低", "模擬", "看到弱游離與熱非平衡。"],
  ["A02", 1, "1.2", "Debye 遮蔽互動", "Canvas+SVG", "中", "模擬", "理解 λ_D 對 n_e、T_e 的依賴。"],
  ["A03", 1, "1.3", "平均自由徑粒子模擬", "Canvas", "中", "模擬", "把壓力決定方向性變成可見的。"],
  ["A04", 1, "1.4", "電子雪崩動畫", "Canvas", "中", "模擬", "看見 Townsend 指數成長。"],
  ["A05", 1, "1.4", "Paschen 曲線互動", "SVG+Canvas", "中", "計算器", "讀懂點火條件與左右支成因。"],
  ["A06", 1, "1.5", "鞘層形成時間軸", "Canvas+SVG", "高", "模擬", "理解離子方向性的來源。"],
  ["A07", 1, "1.6", "製程電漿地圖", "SVG+HTML", "低", "工具", "定位不同製程的壓力與密度區間。"],
  ["A08", 2, "2.1", "滯留時間計算器", "Canvas+HTML", "低", "計算器", "建立 τ 的量級感。"],
  ["A09", 2, "2.2", "氣體選用決策樹", "SVG+HTML", "中", "工具", "外顯化配方設計推理。"],
  ["A10", 2, "2.2", "F/C 比滑桿", "Canvas+SVG", "高", "模擬", "理解蝕刻、鈍化與 etch stop。"],
  ["A11", 2, "2.2", "氣體百科瀏覽器", "HTML", "低", "圖鑑", "查詢氣體用途與危害。"],
  ["A12", 2, "2.3", "EEDF 曲線互動", "SVG", "中", "計算器", "理解高能尾巴決定反應速率。"],
  ["A13", 2, "2.4", "IEDF 雙峰模擬", "Canvas+SVG", "高", "模擬", "理解平均能量以外的分佈形狀。"],
  ["A14", 2, "2.5", "CCP vs ICP 對比", "Canvas+SVG", "高", "模擬", "看見耦合方式與 E/H 跳變。"],
  ["A15", 2, "2.5", "阻抗匹配互動", "SVG+Canvas", "中", "工具", "理解匹配網路和反射功率。"],
  ["A16", 2, "2.6", "虛擬機台控制面板", "Canvas+SVG+HTML", "極高", "工具", "整合參數到晶圓結果的因果鏈。"],
  ["A17", 3, "3.1", "Coburn-Winters 實驗", "SVG+Canvas", "中", "模擬", "看到離子與自由基協同效應。"],
  ["A18", 3, "3.1/3.3", "蝕刻輪廓模擬器", "Canvas", "極高", "工具", "探索參數與 profile 缺陷關係。"],
  ["A19", 3, "3.2", "Bosch 製程循環", "Canvas", "中", "模擬", "理解 scallop 與循環 trade-off。"],
  ["A20", 3, "3.3", "ARDE 深寬比效應", "Canvas+SVG", "高", "模擬", "看懂 RIE lag 的多重成因。"],
  ["A21", 3, "3.3", "缺陷診斷器", "HTML+SVG", "中", "工具", "用症狀圖推論可能成因。"],
  ["A22", 3, "3.4", "PEALD 循環動畫", "Canvas", "中", "模擬", "理解自限制與階梯覆蓋率。"],
  ["A23", 3, "3.4", "HDP vs PECVD 填溝", "Canvas", "中", "模擬", "對比填溝與 void 形成。"],
  ["A24", 3, "3.5", "磁控濺鍍 E×B", "Canvas", "中", "模擬", "理解磁場束縛電子與 racetrack。"],
  ["A25", 3, "3.6", "晶圓分佈熱圖", "Canvas+SVG", "中", "工具", "建立 map 形狀到成因的對照。"],
  ["A26", 4, "4.1", "Langmuir 探針 I-V", "SVG+Canvas", "高", "工具", "實際操作探針分析。"],
  ["A27", 4, "4.1", "OES 光譜互動", "SVG+Canvas", "高", "工具", "讀光譜並做 actinometry。"],
  ["A28", 4, "4.2", "終點訊號動畫", "SVG+Canvas", "中", "模擬", "理解 SNR 與開口率限制。"],
  ["A29", 4, "4.3", "天線效應充電", "Canvas+SVG", "高", "模擬", "理解充電損傷路徑。"],
  ["A30", 4, "4.4", "ALE 循環動畫", "Canvas+SVG", "高", "模擬", "理解兩個自限制與 ALE window。"],
  ["A31", 4, "4.4", "脈衝電漿時序", "SVG+Canvas", "高", "模擬", "理解 off 期中和與低溫高密度。"],
  ["A32", 4, "4.5", "0-D 全域模型計算器", "HTML+SVG", "中", "計算器", "驗證 T_e 與功率近乎無關。"]
];

export const labs = names.map(([id, level, chapter, name, tech, complexity, kind, goal]) => ({
  id,
  level,
  chapter,
  name,
  tech,
  complexity,
  kind,
  goal,
  href: labHref(id)
}));

function labHref(id) {
  const map = {
    A01: "/level/1/1-1-fourth-state/#lab-a01",
    A02: "/level/1/1-2-parameters/#lab-a02",
    A03: "/level/1/1-3-collisions-mfp/#lab-a03",
    A04: "/level/1/1-4-glow-breakdown/#lab-a04",
    A05: "/level/1/1-4-glow-breakdown/#lab-a05",
    A06: "/level/1/1-5-sheath/#lab-a06",
    A07: "/level/1/1-6-process-map/#lab-a07",
    A08: "/level/2/2-1-gas-vacuum/#lab-a08",
    A11: "/gases/"
  };
  return map[id] ?? "/lab/";
}
