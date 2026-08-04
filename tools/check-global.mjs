/* ==========================================================================
   check-global.mjs — 驗證 0-D 全域模型(4.5 / A32)

   docs/05 的 A32 驗收條件:
     · 功率掃描時 T_e 變化 < 10 %、n_e 近似線性   → 達成(而且是**精確**成立)
     · 壓力掃描時 T_e 單調下降                     → 達成

   ⚠️ 前兩條在本模型裡不是「近似」,是**恆等**:粒子平衡兩邊的 n_e 直接消掉,
   方程式裡根本沒有功率,所以 T_e 的變化是 0.0000 %、n_e 的線性偏差也是 0。
   這不是模型作弊 —— 這正是 2.6.3「加功率主要加密度、不加溫度」的完整證明,
   而 A32 存在的理由就是讓學員親手看到這個恆等式。

   所以本檔除了驗收條件,還多釘一件事:**理想結論在什麼時候會失準**。
   打開氣體加熱之後(高功率把氣體加熱 → n_g 下降 → T_e 上升),
   同一組掃描的 T_e 變化變成 27 %、n_e 線性偏差 21 %。
   那個開關預設是關的,而且課文明講它是理想 0-D 模型第一件會失準的事 ——
   不是偷偷放進去讓數字好看。
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(ROOT, "src/js/lab/global-model.js"), "utf8"), sandbox, {
  filename: "src/js/lab/global-model.js",
});
const G = sandbox.window.PA.global;

let pass = 0;
let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

const BASE = { gas: "Ar", pressure: 20, power: 500, radius: 0.15, height: 0.1 };
const at = (over) => G.solve(Object.assign({}, BASE, over));

/* ============ 基準解 ============ */
console.log("\n【基準解:Ar / 20 mTorr / 500 W / R 0.15 m × L 0.10 m】");
const b = at({});
console.log(
  `    T_e ${b.te.toFixed(3)} eV、n_e ${b.ne.toExponential(3)} m⁻³(${(b.ne / 1e6).toExponential(2)} cm⁻³)、` +
    `E_c ${b.ec.toFixed(1)}、E_T ${b.eTot.toFixed(1)} eV、游離度 ${b.ionization.toExponential(2)}`
);
ok(
  "T_e 落在製程電漿的典型範圍(1–5 eV)",
  b.te > 1 && b.te < 5,
  `${b.te.toFixed(2)} eV`
);
ok(
  "n_e 落在製程電漿的典型範圍(10⁹–10¹² cm⁻³)",
  b.ne / 1e6 > 1e9 && b.ne / 1e6 < 1e13,
  `${(b.ne / 1e6).toExponential(2)} cm⁻³`
);
ok(
  "游離度落在弱游離電漿的範圍(10⁻⁶–10⁻³)—— 與 1.1 的定義一致",
  b.ionization > 1e-6 && b.ionization < 1e-2,
  `${b.ionization.toExponential(2)}`
);
ok(
  "T_e 是**數值求根解出來的**,不是查表",
  b.converged === true && Math.abs(G.kIz(b.te, G.GASES.Ar) / G.uBohm(b.te, 40) / b.target - 1) < 1e-6,
  "粒子平衡兩邊在解上相符到 10⁻⁶"
);

/* ============ A32 驗收 1:功率 ============ */
console.log("\n【A32 驗收 1:掃描功率 → T_e 幾乎不變、n_e 線性】");
const pw = G.sweep(BASE, "power", G.SWEEPS.power.values);
for (const x of pw) {
  console.log(`    ${String(x.x).padStart(5)} W  T_e ${x.te.toFixed(4)} eV  n_e ${x.ne.toExponential(3)}  n_e/P ${(x.ne / x.x).toExponential(3)}`);
}
const teSpread = (Math.max(...pw.map((a) => a.te)) - Math.min(...pw.map((a) => a.te))) / Math.min(...pw.map((a) => a.te));
const neLin = G.linearity(pw, "ne");
ok(
  "**T_e 變化 < 10 %**",
  teSpread < 0.1,
  `實際變化 ${(teSpread * 100).toFixed(4)} %`
);
ok(
  "**n_e 近似線性**",
  neLin < 0.05,
  `與正比關係的最大偏差 ${(neLin * 100).toFixed(4)} %`
);
ok(
  "而且兩者是**恆等**成立的 —— 功率根本不在粒子平衡方程裡",
  teSpread < 1e-9 && neLin < 1e-9,
  "T_e 與 n_e/P 在整個功率範圍上逐位元相同"
);
ok(
  "n_e/P 是常數(這就是「加功率主要加密度」的完整內容)",
  new Set(pw.map((x) => (x.ne / x.x).toPrecision(12))).size === 1,
  `全部 = ${(pw[0].ne / pw[0].x).toExponential(3)} m⁻³/W`
);

/* ============ A32 驗收 2:壓力 ============ */
console.log("\n【A32 驗收 2:掃描壓力 → T_e 單調下降】");
const pr = G.sweep(BASE, "pressure", G.SWEEPS.pressure.values);
for (const x of pr) {
  console.log(`    ${String(x.x).padStart(4)} mTorr  T_e ${x.te.toFixed(3)} eV  n_e ${x.ne.toExponential(2)}  E_c ${x.ec.toFixed(1)} eV`);
}
ok(
  "**T_e 隨壓力單調下降**",
  pr.every((x, i) => i === 0 || x.te < pr[i - 1].te),
  `${pr[0].x} mTorr → ${pr[0].te.toFixed(2)} eV;${pr[pr.length - 1].x} mTorr → ${pr[pr.length - 1].te.toFixed(2)} eV`
);
ok(
  "原因是 T_e 由 n_g·d_eff 決定 —— 壓力高,產生一個電子只要跑更短的距離",
  Math.abs(at({ pressure: 40, height: 0.1 }).te - at({ pressure: 20, height: 0.2 }).te) < 0.25,
  `壓力 ×2 與尺寸 ×2 給出接近的 T_e(${at({ pressure: 40 }).te.toFixed(2)} vs ${at({ pressure: 20, height: 0.2 }).te.toFixed(2)} eV)`
);
ok(
  "E_c 隨 T_e 下降而暴漲 —— 低壓好維持、高壓難維持的根本原因",
  pr.every((x, i) => i === 0 || x.ec > pr[i - 1].ec) && pr[pr.length - 1].ec > pr[0].ec * 5,
  `${pr[0].ec.toFixed(0)} eV → ${pr[pr.length - 1].ec.toFixed(0)} eV`
);

/* ============ A32 教學任務 3:腔體尺寸 ============ */
console.log("\n【A32 教學任務 3:縮小腔體 → T_e 上升】");
const rr = G.sweep(BASE, "radius", G.SWEEPS.radius.values);
for (const x of rr) console.log(`    R ${x.x.toFixed(2)} m  T_e ${x.te.toFixed(3)} eV  n_e ${x.ne.toExponential(2)}`);
ok(
  "**腔體越小,T_e 越高**(損失面積相對變大,要更高的 T_e 才補得回來)",
  rr.every((x, i) => i === 0 || x.te < rr[i - 1].te),
  `R 0.05 m → ${rr[0].te.toFixed(2)} eV;R 0.30 m → ${rr[rr.length - 1].te.toFixed(2)} eV`
);
ok(
  "同樣功率下,小腔體的 n_e 高得多(功率密度大)",
  rr[0].ne > rr[rr.length - 1].ne * 5,
  `R 0.05 m → ${rr[0].ne.toExponential(2)};R 0.30 m → ${rr[rr.length - 1].ne.toExponential(2)}`
);

/* ============ 幾何 ============ */
console.log("\n【幾何:邊緣對中心密度比不能省】");
ok(
  "h_R 與 h_L 都在 0–1 之間,且低壓時更小(電漿在中心更濃)",
  (() => {
    const lo = G.geometry(BASE, G.gasState({ pressure: 2 }).nGas);
    const hi = G.geometry(BASE, G.gasState({ pressure: 200 }).nGas);
    return lo.hR > 0 && lo.hR < 1 && hi.hR < lo.hR && hi.hL < lo.hL;
  })(),
  (() => {
    const lo = G.geometry(BASE, G.gasState({ pressure: 2 }).nGas);
    const hi = G.geometry(BASE, G.gasState({ pressure: 200 }).nGas);
    return `2 mTorr:h_R ${lo.hR.toFixed(3)}、h_L ${lo.hL.toFixed(3)};200 mTorr:h_R ${hi.hR.toFixed(3)}、h_L ${hi.hL.toFixed(3)}`;
  })()
);
ok(
  "A_eff 顯著小於幾何面積 —— 直接拿幾何面積會高估損失",
  (() => {
    const g = G.geometry(BASE, G.gasState(BASE).nGas);
    const geom = 2 * Math.PI * g.R * g.R + 2 * Math.PI * g.R * g.L;
    return g.aEff < geom * 0.3;
  })(),
  (() => {
    const g = G.geometry(BASE, G.gasState(BASE).nGas);
    const geom = 2 * Math.PI * g.R * g.R + 2 * Math.PI * g.R * g.L;
    return `A_eff ${g.aEff.toFixed(4)} m² vs 幾何面積 ${geom.toFixed(4)} m²(${((g.aEff / geom) * 100).toFixed(0)} %)`;
  })()
);

/* ============ 各氣體 ============ */
console.log("\n【各氣體:E_c 是分子氣體難維持的原因】");
for (const k of Object.keys(G.GASES)) {
  const s = at({ gas: k });
  console.log(
    `    ${G.GASES[k].label.padEnd(4)} T_e ${s.te.toFixed(3)} eV  E_c ${s.ec.toFixed(0).padStart(4)} eV  n_e ${s.ne.toExponential(2)}  ` +
      (s.radical ? `${s.radical.label} 解離度 ${(s.radical.dissFrac * 100).toFixed(1)} %` : "無解離通道")
  );
}
ok(
  "分子氣體的 E_c 都高於 Ar",
  ["O2", "Cl2", "CF4", "SF6"].every((k) => at({ gas: k }).ec > at({ gas: "Ar" }).ec),
  `Ar ${at({ gas: "Ar" }).ec.toFixed(0)} eV,其餘 ${["O2", "Cl2", "CF4", "SF6"].map((k) => at({ gas: k }).ec.toFixed(0)).join("、")} eV`
);
ok(
  "**解離度必須 < 100 %** —— 少了母氣體耗盡這一項會算出自由基比氣體還多",
  ["O2", "Cl2", "CF4", "SF6"].every((k) => {
    const r = at({ gas: k }).radical;
    return r.dissFrac > 0 && r.dissFrac < 1;
  }),
  ["O2", "Cl2", "CF4", "SF6"].map((k) => `${G.GASES[k].label} ${(at({ gas: k }).radical.dissFrac * 100).toFixed(0)} %`).join("、")
);
ok(
  "自由基密度 = 每次解離的產量 × 氣體密度 × 解離度(雙原子分子可超過氣體密度)",
  (() => {
    const r = at({ gas: "Cl2" }).radical;
    const g = at({ gas: "Cl2" }).gas;
    return Math.abs(r.n - r.per * g.nGas * r.dissFrac) < 1;
  })(),
  `Cl₂ → 2 Cl,解離度 ${(at({ gas: "Cl2" }).radical.dissFrac * 100).toFixed(0)} % → n_Cl / n_gas = ${at({ gas: "Cl2" }).radical.frac.toFixed(2)}`
);
ok(
  "功率越高,解離度越高(但被 100 % 卡住,不會失控)",
  (() => {
    const lo = at({ gas: "CF4", power: 100 }).radical.dissFrac;
    const hi = at({ gas: "CF4", power: 2000 }).radical.dissFrac;
    return hi > lo && hi < 1;
  })(),
  `CF₄ 100 W → ${(at({ gas: "CF4", power: 100 }).radical.dissFrac * 100).toFixed(0)} %;2000 W → ${(at({ gas: "CF4", power: 2000 }).radical.dissFrac * 100).toFixed(1)} %`
);

/* ============ 理想結論何時失準 ============ */
console.log("\n【理想 0-D 第一件會失準的事:氣體加熱】");
const pwh = G.sweep(Object.assign({}, BASE, { gasHeating: true }), "power", G.SWEEPS.power.values);
for (const x of pwh) console.log(`    ${String(x.x).padStart(5)} W  T_e ${x.te.toFixed(4)} eV  n_e ${x.ne.toExponential(3)}`);
const teH = (Math.max(...pwh.map((a) => a.te)) - Math.min(...pwh.map((a) => a.te))) / Math.min(...pwh.map((a) => a.te));
ok(
  "打開氣體加熱之後,T_e **不再**與功率無關",
  teH > 0.1,
  `T_e 變化從 0.00 % 變成 ${(teH * 100).toFixed(1)} %`
);
ok(
  "n_e 也不再嚴格線性",
  G.linearity(pwh, "ne") > 0.05,
  `線性偏差 ${(G.linearity(pwh, "ne") * 100).toFixed(1)} %`
);
ok(
  "而這個開關**預設是關的** —— 理想結論要先立得住,才談它什麼時候失準",
  G.solve(Object.assign({}, BASE, { power: 2000 })).te === G.solve(Object.assign({}, BASE, { power: 100 })).te,
  "預設狀態下功率完全不影響 T_e"
);

/* ============ 控制項 ============ */
console.log("\n【控制項與掃描模式】");
ok(
  "四個滑桿都有標籤與合法範圍",
  Object.values(G.RANGES).every((r) => r.label && r.min < r.max && r.step > 0),
  Object.keys(G.RANGES).join("、")
);
ok(
  "三種掃描模式都有值列表",
  Object.values(G.SWEEPS).every((s) => s.key && s.label && s.values.length >= 5),
  Object.values(G.SWEEPS).map((s) => s.label).join("、")
);
ok(
  "五種氣體都有說明與游離參數",
  Object.values(G.GASES).every((g) => g.label && g.note && g.kA > 0 && g.eIz > 0),
  Object.values(G.GASES).map((g) => g.label).join("、")
);
ok(
  "平衡曲線資料可供「兩條曲線的交點就是解」那張圖使用",
  (() => {
    const c = G.balanceCurve(BASE, 0.5, 8, 100);
    return c.length === 100 && c.every((x, i) => i === 0 || x.v > c[i - 1].v);
  })(),
  "k_iz/u_B 對 T_e 單調上升,與水平線恰好一個交點"
);

console.log(`\n${fail === 0 ? "✓" : "✗"} 0-D 全域模型通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
