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
  },
  idealGasDensity: {
    id: "ideal-gas-density",
    name: "理想氣體粒子密度",
    expression: "n = P / kT ≈ 3.22 × 10<sup>13</sup> P[mTorr] × 300 / T[K]",
    summary: "由壓力直接估算中性粒子密度；10 mTorr、300 K 約為 3.2×10¹⁴ cm⁻³。",
    symbols: [["n", "中性粒子密度", "cm^-3"], ["P", "壓力", "mTorr"], ["T", "氣體溫度", "K"], ["k", "Boltzmann 常數", "J/K"]],
    conditions: "理想氣體近似；壓力與氣體溫度必須代表同一空間區域。",
    source: "理想氣體定律。"
  },
  daltonPartialPressure: {
    id: "dalton-partial-pressure",
    name: "Dalton 分壓",
    expression: "P<sub>i</sub> = P<sub>total</sub> × Q<sub>i</sub> / Q<sub>total</sub>",
    summary: "在沒有選擇性消耗與生成時，進氣流量比例可估算各成分分壓。",
    symbols: [["Pi", "成分 i 分壓", "Torr"], ["Ptotal", "總壓", "Torr"], ["Qi", "成分 i 流量", "sccm"], ["Qtotal", "總流量", "sccm"]],
    conditions: "穩態、混合均勻，且忽略氣相與表面反應消耗。",
    source: "Dalton 分壓定律。"
  },
  residenceTime: {
    id: "residence-time",
    name: "氣體滯留時間",
    expression: "τ[s] = 79.0 × P[Torr] × V[L] / Q[sccm]",
    summary: "壓力或腔體體積增加會拉長滯留；在壓力固定時，流量加倍會把換氣時間減半。",
    symbols: [["τ", "平均滯留時間", "s"], ["P", "腔體壓力", "Torr"], ["V", "有效腔體體積", "L"], ["Q", "標準流量", "sccm"]],
    conditions: "穩態、理想混合、標準流量定義；實際流場會有停滯區與分佈。",
    source: "真空 throughput 平衡 Q=PS。"
  },
  knudsenNumber: {
    id: "knudsen-number",
    name: "Knudsen 數",
    expression: "Kn = λ / d",
    summary: "Kn 小於 0.01 接近黏滯流，大於 1 接近分子流，中間是過渡流。",
    symbols: [["Kn", "Knudsen 數", "無因次"], ["λ", "平均自由徑", "m"], ["d", "特徵尺寸", "m"]],
    conditions: "λ 的碰撞模型與 d 的幾何定義必須對應要分析的輸運問題。",
    source: "稀薄氣體動力學。"
  },
  rateCoefficient: {
    id: "rate-coefficient",
    name: "電子碰撞速率係數",
    expression: "k = ⟨σv⟩ = ∫ σ(E) v(E) f(E) dE",
    summary: "反應速率由碰撞截面與 EEDF 的重疊決定，高能尾端的小變化可大幅改變游離與解離。",
    symbols: [["k", "速率係數", "m^3/s"], ["σ(E)", "能量相依碰撞截面", "m^2"], ["v(E)", "電子速度", "m/s"], ["f(E)", "正規化 EEDF", "eV^-1"]],
    conditions: "EEDF 與截面必須使用一致的能量定義與正規化。",
    source: "電子碰撞動力學。"
  },
  bohmIonFlux: {
    id: "bohm-ion-flux",
    name: "Bohm 速度與離子通量",
    expression: "u<sub>B</sub> = √(kT<sub>e</sub>/M), Γ<sub>i</sub> ≈ 0.61 n<sub>e</sub>u<sub>B</sub>",
    summary: "離子在進入鞘層前至少要達到 Bohm 速度；密度優先決定通量，電子溫度以平方根影響。",
    symbols: [["uB", "Bohm 速度", "m/s"], ["Γi", "鞘層邊界離子通量", "m^-2 s^-1"], ["Te", "電子溫度", "eV 或 K"], ["M", "離子質量", "kg"], ["ne", "電子密度", "m^-3"]],
    conditions: "單一正離子、近似無碰撞、Maxwellian 電子與平面鞘層入口。",
    source: "Bohm sheath criterion。"
  }
};

for (const formula of Object.values(formulas)) {
  formula.conditions ??= "依公式符號、單位與章節中的適用尺度使用。";
  formula.source ??= "Plasma Academy 核心教材；正式技術審閱時核對主要教科書。";
}
