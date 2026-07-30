export const formulas = {
  ionizationFraction: {
    id: "ionization-fraction",
    name: "游離度",
    expression: "f<sub>i</sub> = n<sub>i</sub> / (n<sub>n</sub> + n<sub>i</sub>)",
    summary: "帶電粒子只佔極小比例，仍可透過電場與碰撞主導製程反應。",
    symbols: [["fi", "游離度", "無因次"], ["ni", "離子密度", "cm^-3"], ["nn", "中性粒子密度", "cm^-3"]]
  },
  debyeLength: {
    id: "debye-length",
    name: "Debye 長度",
    expression: "λ<sub>D</sub> = √(ε<sub>0</sub> k T<sub>e</sub> / n<sub>e</sub> e<sup>2</sup>)",
    summary: "密度越高，遮蔽距離越短；電子溫度越高，遮蔽距離越長。",
    symbols: [["λD", "Debye 長度", "m"], ["Te", "電子溫度", "eV 或 K"], ["ne", "電子密度", "m^-3"], ["e", "基本電荷", "C"]]
  },
  debyeNumber: {
    id: "debye-number",
    name: "Debye 球粒子數",
    expression: "N<sub>D</sub> = (4π / 3) n<sub>e</sub> λ<sub>D</sub><sup>3</sup>",
    summary: "N_D 遠大於 1 時，遮蔽才是許多粒子的集體行為。",
    symbols: [["ND", "Debye 球內電子數", "無因次"], ["ne", "電子密度", "m^-3"], ["λD", "Debye 長度", "m"]]
  },
  plasmaFrequency: {
    id: "electron-plasma-frequency",
    name: "電子電漿頻率",
    expression: "ω<sub>pe</sub> = √(n<sub>e</sub> e<sup>2</sup> / ε<sub>0</sub> m<sub>e</sub>)",
    summary: "電子回復電荷擾動的自然頻率，用來判斷電子能否跟上外加 RF 場。",
    symbols: [["ωpe", "電子電漿角頻率", "rad/s"], ["ne", "電子密度", "m^-3"], ["me", "電子質量", "kg"]]
  },
  evTemperature: {
    id: "ev-temperature",
    name: "eV 與 K 換算",
    expression: "T [K] = 11,604 × T [eV]",
    summary: "這是能量尺度換算；電子溫度高不代表氣體與晶圓也同溫。",
    symbols: [["T[eV]", "電子能量分佈溫度參數", "eV"], ["T[K]", "等效絕對溫度", "K"]]
  },
  meanFreePath: {
    id: "mean-free-path",
    name: "平均自由徑",
    expression: "λ = 1 / (nσ) = kT / (σP)",
    summary: "壓力越高，碰撞間距越短；室溫 Ar 可用 λ[cm] ≈ 5/P[mTorr] 快速估算。",
    symbols: [["λ", "平均自由徑", "m"], ["n", "中性粒子密度", "m^-3"], ["σ", "碰撞截面", "m^2"], ["P", "壓力", "Pa"]]
  },
  townsendGrowth: {
    id: "townsend-growth",
    name: "Townsend 雪崩增益",
    expression: "n(d) = n<sub>0</sub> e<sup>αd</sup>",
    summary: "種子電子沿電場前進時透過游離碰撞指數倍增。",
    symbols: [["n(d)", "距離 d 的電子數", "個"], ["n0", "種子電子數", "個"], ["α", "第一 Townsend 係數", "cm^-1"], ["d", "電極間距", "cm"]]
  },
  townsendAlpha: {
    id: "townsend-alpha",
    name: "Townsend 經驗式",
    expression: "α / p = A exp(−B / (E/p))",
    summary: "第一 Townsend 係數由氣體常數與約化電場 E/p 決定。",
    symbols: [["α", "第一 Townsend 係數", "cm^-1"], ["p", "壓力", "Torr"], ["E/p", "約化電場", "V/(cm·Torr)"], ["A, B", "氣體經驗常數", "依資料表"]]
  },
  townsendCriterion: {
    id: "townsend-criterion",
    name: "Townsend 自持條件",
    expression: "γ (e<sup>αd</sup> − 1) = 1",
    summary: "離子撞陰極產生的二次電子剛好補回下一代種子時，放電進入臨界自持。",
    symbols: [["γ", "第二 Townsend 係數", "無因次"], ["α", "第一 Townsend 係數", "cm^-1"], ["d", "電極間距", "cm"]]
  },
  paschenLaw: {
    id: "paschen-law",
    name: "Paschen 定律",
    expression: "V<sub>b</sub> = Bpd / (ln(Apd) − ln(ln(1 + 1/γ)))",
    summary: "崩潰電壓由 pd 乘積與氣體/表面參數決定，曲線左右兩支都需要較高電壓。",
    symbols: [["Vb", "崩潰電壓", "V"], ["p", "壓力", "Torr"], ["d", "電極間距", "cm"], ["A, B, γ", "氣體與表面常數", "依資料表"]]
  },
  floatingPotential: {
    id: "floating-potential",
    name: "浮動電位差",
    expression: "V<sub>p</sub> − V<sub>f</sub> = (kT<sub>e</sub> / 2e) ln(M / 2πm<sub>e</sub>)",
    summary: "對 Ar，Vp−Vf 約為 4.7Te；表面變負以平衡電子與離子流量。",
    symbols: [["Vp", "電漿電位", "V"], ["Vf", "浮動電位", "V"], ["Te", "電子溫度", "eV"], ["M", "離子質量", "kg"]]
  },
  electrodeAreaRatio: {
    id: "electrode-area-ratio",
    name: "不對稱電極面積比",
    expression: "V<sub>1</sub> / V<sub>2</sub> = (A<sub>2</sub> / A<sub>1</sub>)<sup>q</sup>, q ≈ 1–2.5",
    summary: "面積較小的 RF 電極承受較大鞘層電位降，因此能提高晶圓側離子能量。",
    symbols: [["V1, V2", "兩側鞘層電位降", "V"], ["A1, A2", "兩電極有效面積", "m^2"], ["q", "鞘層模型指數", "無因次"]]
  }
};
