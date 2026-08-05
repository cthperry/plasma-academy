/* ==========================================================================
   check-diagnostics.mjs — 驗證診斷模型(4.1 / A26 Langmuir、A27 OES)

   docs/05 的驗收條件:
     A26 · 無 RF 補償時 T_e 高估至少 2 倍     → **已達成**(補上雜散電容分壓之後)
     A26 · 學員正確操作時誤差 < 10%           → 達成
     A27 · 譜線位置與 4.1.3 表格一致           → 達成
     A27 · actinometry 比值對功率的敏感度顯著低於絕對強度 → 達成

   📌 第一條曾經被判定為「可以證明做不到」,而那個證明**本身是對的** ——
   只是它證的是一個**前提不成立**的命題。原本的模型把落在鞘層上的 RF
   振幅寫成常數 V_rf,於是
       ⟨exp((V − V_p − V_rf·f(t))/T_e)⟩_t = exp((V − V_p)/T_e) · ⟨exp(−V_rf·f/T_e)⟩
   後項與 V 無關 → 指數區只是整條平移、斜率不變 → T_e 救得回來。

   真實探針缺的那塊物理是:**振幅不是常數**。探針尖端對電漿隔著鞘層電容
   C_sh、對地隔著雜散電容 C_stray,RF 由兩者分壓;而 C_sh = ε₀A/s,
   鞘層厚度 s 由 Child–Langmuir 給 ∝ ((V_p − V)/T_e)^(3/4)。
   於是深負偏壓處鞘層厚、C_sh 小 → 幾乎整個 V_rf 落在鞘層上;
   逼近 V_p 時鞘層薄、C_sh 大 → RF 被雜散電容分掉。
   **調變振幅隨偏壓變化**,上面那個「與 V 無關」的前提就破了,
   指數區被拉平 → T_e 真的被高估。見 probe-model.js 的 rfAmplitudeAt()。

   模型另外顯示的那個錯誤仍然成立而且同樣嚴重:
   **V_p 與 V_f 被整個推歪**,而離子能量 ≈ V_p − V_wafer,所以下游全錯。
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ["src/js/lab/probe-model.js", "src/js/lab/oes-model.js"]) {
  vm.runInContext(readFileSync(join(ROOT, f), "utf8"), sandbox, { filename: f });
}
const P = sandbox.window.PA.probe;
const O = sandbox.window.PA.oes;

let pass = 0;
let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

/* ====================== A26 Langmuir 探針 ====================== */
console.log("\n【A26 驗收:補償正常時,四個參數都求得回來(誤差 < 10 %)】");
{
  const truth = { te: 3, ne: 1e16, vp: 20 };
  const s = P.create({ ...truth, gas: "ar", vrf: 0 });
  const a = P.analyse(s);
  console.log(
    `    真值 T_e ${truth.te} eV / n_e ${truth.ne.toExponential(1)} / V_p ${truth.vp} V`
  );
  console.log(
    `    量到 T_e ${a.te.toFixed(2)} eV / n_e ${a.ne.toExponential(2)} / V_p ${a.vp.toFixed(1)} V / V_f ${a.vf.toFixed(1)} V`
  );
  ok("T_e 誤差 < 10 %", Math.abs(a.teError) < 0.1, `${(a.teError * 100).toFixed(1)} %`);
  ok("n_e 誤差 < 10 %", Math.abs(a.neError) < 0.1, `${(a.neError * 100).toFixed(1)} %`);
  ok("V_p 誤差 < 10 %", Math.abs(a.vpError) < 0.1, `${(a.vpError * 100).toFixed(1)} %`);
  ok("V_f 落在 V_p 之下(浮動電位必定低於電漿電位)", a.vf < a.vp, `V_f ${a.vf.toFixed(1)} < V_p ${a.vp.toFixed(1)}`);
}
ok(
  "換氣體時 n_e 仍求得準(離子質量已進 Bohm 速度)",
  ["ar", "o2", "cf4", "cl2"].every((g) => {
    const s = P.create({ te: 3, ne: 1e16, vp: 20, gas: g });
    return Math.abs(P.analyse(s).neError) < 0.1;
  }),
  ["ar", "o2", "cf4", "cl2"].map((g) => `${g}:${(P.analyse(P.create({ te: 3, ne: 1e16, vp: 20, gas: g })).neError * 100).toFixed(1)}%`).join("、")
);
ok(
  "T_e 掃描範圍內都求得準(不是只有一個點對)",
  [1.5, 2, 3, 4, 5].every((te) => {
    const s = P.create({ te, ne: 1e16, vp: 20 });
    const a = P.analyse(s);
    return Math.abs(a.teError) < 0.2;
  }),
  [2, 3, 5].map((te) => `${te}eV:${(P.analyse(P.create({ te, ne: 1e16, vp: 20 })).teError * 100).toFixed(1)}%`).join("、")
);

console.log("\n【RF 補償失效的後果 —— T_e、V_p、V_f 三個一起錯】");
{
  const rows = [0, 10, 20, 30, 45].map((vrf) => {
    const s = P.create({ te: 3, ne: 1e16, vp: 20, vrf });
    return { vrf, ...P.analyse(s) };
  });
  for (const r of rows) {
    console.log(
      `    V_rf ${String(r.vrf).padStart(2)} V   T_e ${r.te.toFixed(2)} eV (${(r.teError * 100).toFixed(0)} %)` +
        `   V_p ${r.vp.toFixed(1)} V (真值 20)   V_f ${r.vf.toFixed(1)} V`
    );
  }
  /**
   * ⚠️ 這三條的數字在補上「振幅隨偏壓變化」之後**變了**,而且是往
   * 更符合文獻的方向變:分壓讓逼近 V_p 處的 RF 被雜散電容吃掉,
   * 所以 **V_p 的推歪變小、T_e 的高估變大**。
   * 現場的經典症狀本來就是「T_e 高得離譜」,不是「V_p 差 20 V」——
   * 舊的數字是常數振幅模型的產物,不是實際探針的行為。
   */
  ok(
    "未補償時 V_p 仍被推歪好幾伏特(離子能量 ≈ V_p − V_wafer,下游全錯)",
    Math.abs(rows[3].vp - 20) > 3,
    `量到 ${rows[3].vp.toFixed(1)} V,真值 20 V`
  );
  ok(
    "V_rf ≥ 20 V 之後 V_p 的推歪隨振幅單調增加",
    rows.slice(2).every((r, i, a) => i === 0 || r.vp - 20 > a[i - 1].vp - 20),
    rows.map((r) => `${r.vrf}V:${(r.vp - 20).toFixed(0)}`).join("、")
  );
  ok(
    "V_f 被推到很深的負電位,而且單調(整流效應)",
    rows[4].vf < -20 && rows.every((r, i, a) => i === 0 || r.vf < a[i - 1].vf),
    rows.map((r) => `${r.vrf}V:${r.vf.toFixed(1)}`).join("、")
  );
  ok(
    "T_e 也被高估,而且程度隨 RF 振幅增加(雜散電容分壓的後果)",
    rows[3].teError > 0.15 &&
      rows[4].teError > rows[1].teError &&
      Math.abs(rows[0].teError) < 0.02,
    rows.map((r) => `${r.vrf}V:${(r.teError * 100).toFixed(0)}%`).join("、")
  );
}

/**
 * docs/05 的 A26 驗收條件原文:「無 RF 補償時 T_e 高估**至少 2 倍**」。
 *
 * 量在哪裡很重要,而**這件事本身就是這個缺陷的一部分**:
 * 高估的程度隨偏壓變化(振幅隨鞘層厚度變),所以擬合窗選在哪裡,
 * 答案就差多少 —— 同一條曲線可以量出 1.3 倍也可以量出 4 倍。
 * 這裡照**現場標準做法**量:擬合轉折(V_p)下方那一段指數區,
 * 而不是貼著 V_f 往上取固定 10 V(未補償時 V_f 被推到很遠的負電位,
 * 那個窗會落在離轉折很遠、失真最小的地方,反而看不出問題)。
 */
console.log("\n【A26 驗收:無 RF 補償時 T_e 高估至少 2 倍(近轉折擬合窗)】");
{
  const TRUE_TE = 3;
  const TRUE_VP = 20;
  const kneeFit = (vrf) => {
    const s = P.create({ te: TRUE_TE, ne: 1e16, vp: TRUE_VP, vrf });
    const c = P.sweep(s);
    // 標準做法:轉折下方 3–9 V 的那一段(避開轉折本身的圓角)
    return P.fitTe(c, { isat: P.measureIsat(c), vf: 0, from: TRUE_VP - 9, to: TRUE_VP - 3 });
  };
  const rows = [0, 20, 30, 45].map((vrf) => ({ vrf, te: kneeFit(vrf) }));
  for (const r of rows) {
    console.log(
      `    V_rf ${String(r.vrf).padStart(2)} V   T_e ${r.te.toFixed(2)} eV` +
        `   = ${(r.te / TRUE_TE).toFixed(2)} 倍真值`
    );
  }
  ok(
    "補償正常(V_rf = 0)時同一個窗量得準 —— 高估不是擬合窗造成的",
    Math.abs(rows[0].te - TRUE_TE) / TRUE_TE < 0.05,
    `${rows[0].te.toFixed(2)} eV vs 真值 ${TRUE_TE}`
  );
  ok(
    "**V_rf 30 V 時 T_e 高估至少 2 倍**(docs/05 的 A26 驗收條件)",
    rows[2].te / TRUE_TE >= 2,
    `${rows[2].te.toFixed(2)} eV = ${(rows[2].te / TRUE_TE).toFixed(2)} 倍`
  );
  ok(
    "高估程度隨 RF 振幅單調增加",
    rows.every((r, i, a) => i === 0 || r.te > a[i - 1].te),
    rows.map((r) => `${r.vrf}V:${r.te.toFixed(1)}eV`).join("、")
  );
}

console.log("\n【探針鍍膜 —— 4.1.2 的第二個實務陷阱】");
{
  const rows = [0, 0.3, 0.6, 0.9].map((c) => {
    const s = P.create({ te: 3, ne: 1e16, vp: 20, coating: c });
    return { c, ...P.analyse(s) };
  });
  for (const r of rows) {
    console.log(`    鍍膜 ${r.c.toFixed(1)}   n_e 誤差 ${(r.neError * 100).toFixed(0)} %   T_e 誤差 ${(r.teError * 100).toFixed(0)} %`);
  }
  ok(
    "鍍膜讓 n_e 嚴重低估(有效面積被蓋掉)",
    rows[3].neError < -0.5,
    `鍍膜 0.9 時 n_e 低估 ${(-rows[3].neError * 100).toFixed(0)} %`
  );
  ok(
    "鍍膜越厚低估越嚴重",
    rows.every((r, i, a) => i === 0 || r.neError < a[i - 1].neError),
    rows.map((r) => `${r.c}:${(r.neError * 100).toFixed(0)}%`).join("、")
  );
}

console.log("\n【模型結構:曲線是算出來的,不是描出來的】");
ok(
  "離子飽和電流用 Bohm 判準 0.61·n·e·u_B·A(與 2.4 同一條)",
  (() => {
    const ub = P.bohmSpeed(3, 39.9);
    const expected = 0.61 * 1e16 * 1.602e-19 * ub * P.PROBE_AREA;
    return Math.abs(P.ionSat(1e16, 3, 39.9, P.PROBE_AREA) - expected) < 1e-12;
  })(),
  `u_B(Ar, 3 eV) = ${(P.bohmSpeed(3, 39.9) / 1000).toFixed(1)} km/s`
);
ok(
  "電子飽和電流遠大於離子飽和電流(質量比的直接後果)",
  P.elecSat(1e16, 3, P.PROBE_AREA) / P.ionSat(1e16, 3, 39.9, P.PROBE_AREA) > 50,
  `比值 ${(P.elecSat(1e16, 3, P.PROBE_AREA) / P.ionSat(1e16, 3, 39.9, P.PROBE_AREA)).toFixed(0)} ×`
);
ok(
  "EEDF 由二次微分得到(Druyvesteyn),而且是單峰的",
  (() => {
    const s = P.create({ te: 3, ne: 1e16, vp: 20 });
    const c = P.sweep(s);
    const f = P.eedf(c, P.findVp(c), P.measureIsat(c));
    return f.length > 10 && Math.max(...f.map((x) => x.f)) === 1;
  })(),
  "已正規化,峰值為 1"
);

/* ====================== A27 OES ====================== */
console.log("\n【A27 驗收:譜線位置與 4.1.3 的表格一致】");
const EXPECTED = [
  [703.7, "F"], [750.4, "Ar"], [777.4, "O"], [483.5, "CO"],
  [251.6, "Si"], [387.1, "CN"], [516.5, "C2"], [656.3, "H"],
  [837.6, "Cl"], [470.0, "Br"], [336.0, "N2"], [306.0, "OH"],
];
ok(
  "課文表格的 12 條線全部在資料裡,而且物種對得上",
  EXPECTED.every(([nm, sp]) => {
    const l = O.lineAt(nm);
    return l && l.sp === sp;
  }),
  `${EXPECTED.length} 條全對`
);
ok(
  "Ar 750.4 標記為 actinometry 內標",
  O.lineAt(750.4).actino === true && O.lineAt(811.5).actino === true
);
ok(
  "F(703.7)與 Ar(750.4)的激發閾值相近(actinometry 的前提)",
  Math.abs(O.lineAt(703.7).eth - O.lineAt(750.4).eth) <= 1.5,
  `F ${O.lineAt(703.7).eth} eV vs Ar ${O.lineAt(750.4).eth} eV,差 ${(O.lineAt(703.7).eth - O.lineAt(750.4).eth).toFixed(1)} eV`
);

console.log("\n【各製程最強的譜線,要和課文說的主訊號一致】");
const topOf = (k, n) =>
  O.spectrum(O.create({ process: k })).sort((a, b) => b.I - a.I).slice(0, n).map((x) => x.sp);
for (const k of Object.keys(O.PROCESSES)) {
  console.log(`    ${k.padEnd(7)} ${topOf(k, 4).join(", ")}`);
}
ok(
  "SiO₂ 蝕刻:CO 是最強的訊號(4.1.3 說它是終點主訊號)",
  topOf("oxide", 1)[0] === "CO",
  topOf("oxide", 3).join(", ")
);
ok(
  "Poly 蝕刻:Si 最強(蝕刻產物),而且 Cl 進得了前四名",
  topOf("poly", 1)[0] === "Si" && topOf("poly", 4).includes("Cl"),
  topOf("poly", 4).join(", ")
);
ok(
  "灰化:O 與 CO 都在前三名(光阻被氧化的產物)",
  topOf("ash", 3).includes("O") && topOf("ash", 3).includes("CO"),
  topOf("ash", 3).join(", ")
);
ok(
  "洩漏狀態:OH 進入前三名,正常狀態不會",
  topOf("leak", 3).includes("OH") && !topOf("oxide", 3).includes("OH"),
  `洩漏 ${topOf("leak", 3).join(", ")} / 正常 ${topOf("oxide", 3).join(", ")}`
);
ok(
  "洩漏時 OH(306)與 N₂(336)同時明顯上升(免費的洩漏偵測器)",
  (() => {
    const n = O.create({ process: "oxide" });
    const l = O.create({ process: "leak" });
    return O.intensity(l, 306) / O.intensity(n, 306) > 10 &&
      O.intensity(l, 336) / O.intensity(n, 336) > 10;
  })(),
  `OH ×${(O.intensity(O.create({ process: "leak" }), 306) / O.intensity(O.create({ process: "oxide" }), 306)).toFixed(0)}、` +
    `N₂ ×${(O.intensity(O.create({ process: "leak" }), 336) / O.intensity(O.create({ process: "oxide" }), 336)).toFixed(0)}`
);

console.log("\n【A27 驗收:actinometry 比值對功率的敏感度顯著低於絕對強度】");
{
  const base = { process: "oxide", arFrac: 0.03, transmission: 1 };
  const absP = O.sensitivity(base, "power", 500, 1200, (s) => O.intensity(s, 703.7));
  const ratP = O.sensitivity(base, "power", 500, 1200, (s) => O.actinometry(s));
  console.log(`    功率 500 → 1200 W:絕對強度變 ${(absP * 100).toFixed(0)} %,比值只變 ${(ratP * 100).toFixed(1)} %`);
  ok(
    "比值對功率的敏感度至少低一個數量級",
    ratP * 10 < absP,
    `${(absP / Math.max(ratP, 1e-9)).toFixed(0)} 倍差距`
  );
  const absW = O.sensitivity(base, "transmission", 1, 0.3, (s) => O.intensity(s, 703.7));
  const ratW = O.sensitivity(base, "transmission", 1, 0.3, (s) => O.actinometry(s));
  console.log(`    視窗透光率 1.0 → 0.3:絕對強度變 ${(absW * 100).toFixed(0)} %,比值變 ${(ratW * 100).toFixed(4)} %`);
  ok(
    "視窗汙染被比值**完全**消掉(它同乘在分子分母上)",
    absW > 0.5 && ratW < 1e-9,
    `絕對 ${(absW * 100).toFixed(0)} % vs 比值 ${(ratW * 100).toFixed(6)} %`
  );
  /**
   * 但 actinometry 不是萬能的 —— 它只在兩條線的閾值相近時才成立。
   * 拿閾值差很多的線來比(F 14.5 eV vs Si 5.1 eV),T_e 的影響就消不掉。
   * 這是 4.1.4 的第二個前提,值得單獨驗。
   */
  const badRat = O.sensitivity(base, "power", 500, 1200, (s) => O.intensity(s, 703.7) / O.intensity(s, 251.6));
  console.log(`    用閾值差很多的線當內標(F 14.5 eV / Si 5.1 eV):比值變 ${(badRat * 100).toFixed(1)} %`);
  ok(
    "閾值差很多的線不能當內標 —— 比值的優勢會消失",
    badRat > ratP * 3,
    `${(badRat * 100).toFixed(1)} % vs 正確內標的 ${(ratP * 100).toFixed(1)} %`
  );
}
ok(
  "Ar 內標比例會等比例改變比值(濃度真的進得去公式)",
  (() => {
    const a = O.actinometry(O.create({ process: "oxide", arFrac: 0.02 }));
    const b = O.actinometry(O.create({ process: "oxide", arFrac: 0.04 }));
    return Math.abs(a / b - 2) < 0.01;
  })(),
  "內標加倍 → 比值減半"
);
ok(
  "功率提高時絕對強度確實上升(n_e 變多)—— 所以才會誤判",
  O.intensity(O.create({ process: "oxide", power: 1200 }), 703.7) >
    O.intensity(O.create({ process: "oxide", power: 500 }), 703.7),
  `500 W ${O.intensity(O.create({ process: "oxide", power: 500 }), 703.7).toFixed(1)} → 1200 W ${O.intensity(O.create({ process: "oxide", power: 1200 }), 703.7).toFixed(1)}`
);

console.log(`\n${fail === 0 ? "✓" : "✗"} 電漿診斷(Langmuir + OES)通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
