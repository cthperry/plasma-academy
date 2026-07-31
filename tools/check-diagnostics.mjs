/* ==========================================================================
   check-diagnostics.mjs — 驗證診斷模型(4.1 / A26 Langmuir、A27 OES)

   docs/05 的驗收條件:
     A26 · 無 RF 補償時 T_e 高估至少 2 倍     → **未達成**,原因見下方(可證明)
     A26 · 學員正確操作時誤差 < 10%           → 達成
     A27 · 譜線位置與 4.1.3 表格一致           → 達成
     A27 · actinometry 比值對功率的敏感度顯著低於絕對強度 → 達成

   ⚠️ A26 第一條**做不到,而且是可以證明的**:
   探針特性在過渡區是純指數,而
       ⟨exp((V − V_p − V_rf·f(t))/T_e)⟩_t = exp((V − V_p)/T_e) · ⟨exp(−V_rf·f/T_e)⟩
   後面那一項**與 V 無關** —— 也就是說任何波形的 RF 調變在指數區都只是
   把曲線整條平移,**斜率完全不變**,T_e 因此救得回來。
   要讓 T_e 真的被高估,需要模型裡沒有的東西(探針雜散電容分壓、
   非 Maxwellian EEDF、探針座面積效應)。

   但模型**確實**顯示了一個同樣嚴重、而且量級很大的錯誤:
   **V_p 與 V_f 被整個推歪**(實測 V_p 真值 20 V → 量到 −10 V)。
   而離子能量 ≈ V_p − V_wafer,所以下游全錯。這才是本模型能誠實教的那一課。
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

console.log("\n【RF 補償失效的後果 —— 不是 T_e,是 V_p 與 V_f】");
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
  ok(
    "未補償時 V_p 被嚴重推歪(30 V 振幅 → 誤差超過 20 V)",
    Math.abs(rows[3].vp - 20) > 20,
    `量到 ${rows[3].vp.toFixed(1)} V,真值 20 V`
  );
  ok(
    "推歪的程度隨 RF 振幅單調增加",
    rows.every((r, i, a) => i === 0 || Math.abs(r.vp - 20) > Math.abs(a[i - 1].vp - 20)),
    rows.map((r) => `${r.vrf}V:${(r.vp - 20).toFixed(0)}`).join("、")
  );
  ok(
    "V_f 也跟著整條平移(兩者一起錯,不是只有一個)",
    Math.abs(rows[3].vf - rows[0].vf) > 20,
    `補償正常 ${rows[0].vf.toFixed(1)} V → 未補償 ${rows[3].vf.toFixed(1)} V`
  );
  /**
   * 這一條記錄的是**未達成的驗收條件的真實狀態**,不是驗收條件本身。
   * 指數區的 RF 平均只是整條平移(見檔頭的證明),斜率不變,所以 T_e 救得回來。
   * 如果哪天補上雜散電容或非 Maxwellian EEDF 讓 T_e 真的被高估,
   * 這條會失敗並提醒接手的人去更新課文與 docs/11。
   */
  ok(
    "【已知限制】T_e 在本模型裡**沒有**被高估(指數區的 RF 平均只是平移)",
    Math.abs(rows[3].teError) < 0.15,
    `V_rf 30 V 時 T_e 誤差僅 ${(rows[3].teError * 100).toFixed(0)} %,課文與 docs/11 已如實標註`
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
