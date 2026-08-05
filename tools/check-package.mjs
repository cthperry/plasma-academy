/* ==========================================================================
   check-package.mjs — 驗證封裝電漿模型(3.7 / A33)

   3.7 的主張與前段完全相反,所以每一條都要被斷言,不能只寫在課文裡:

     · 製程窗有**上限** —— 接著力先升後降,不是「做久一點總會更好」
     · 封裝端不用氟系 —— 氣體清單裡不該出現任何氟碳氣體
     · Cu pad 去氧化只有還原性氣體做得到,O₂ 會幫倒忙
     · 金屬表面不看接觸角
     · 疏水回復決定 queue time,而它是算出來的不是規定的
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(ROOT, "src/js/lab/package-model.js"), "utf8"), sandbox, {
  filename: "package-model.js",
});
const M = sandbox.window.PA.packageModel;

let pass = 0;
let fail = 0;
function ok(label, cond, detail) {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
}

const LP = { power: 300, pressure: 0.4, mode: "lp" };
const ev = (gas, material, time, extra) =>
  M.evaluate({ gas, material, time, ...LP, ...(extra || {}) });

console.log("\n【氣體清單:封裝端不用氟系】");
/*
   ⚠️ 範圍很重要:這條講的是**封裝表面活化**用的氣體清單(GASES)。
   同一章後半的 PCB desmear 反而非加 CF₄ 不可(見本檔最後一段)——
   兩者不衝突,因為 desmear 面對的是玻纖(SiO₂),而封裝活化面對的是
   有機物與金屬 pad。斷言只守住「活化用的清單裡不該有氟」。
*/
ok(
  "**表面活化**的氣體清單沒有任何含氟的氣體(3.7.2 的三個理由)",
  M.gases.every((g) => !/F/.test(g.label)),
  M.gases.map((g) => g.label).join("、")
);
ok("五支氣體齊備:Ar / O₂ / Ar+O₂ / H₂系 / N₂", M.gases.length === 5);
ok(
  "只有一支是還原性的(H₂ 系)",
  M.gases.filter((g) => g.redox < 0).length === 1,
  M.gases.filter((g) => g.redox < 0).map((g) => g.label).join("、")
);
ok(
  "有兩支是氧化性的(O₂ 純氣與 Ar+O₂ 混合,都含氧)",
  M.gases.filter((g) => g.redox > 0).length === 2,
  M.gases.filter((g) => g.redox > 0).map((g) => g.label).join("、")
);
ok(
  "O₂ 的活化效率最高(課文:表面能推得最高)",
  M.gases.every((g) => g.act <= M.gasById("o2").act)
);
ok(
  "O₂ 同時也是對有機材料最兇的(課文:最快傷到基材)",
  M.gases.every((g) => g.etch <= M.gasById("o2").etch)
);

/**
 * Ar+O₂ 存在的理由不是「多一個選項」,是「活化/損傷比更好」——
 * 這個比值就是製程窗寬度的代理指標,直接對應 3.7.2 加進去的那段課文。
 */
ok(
  "**Ar+O₂ 的活化/損傷比是五支氣體裡最高的**(這就是「製程窗比純 O₂ 寬」的量化版本)",
  (() => {
    const ratio = (g) => g.act / g.etch;
    const aro2 = M.gasById("aro2");
    return M.gases.every((g) => g.id === "aro2" || ratio(aro2) > ratio(g));
  })(),
  M.gases.map((g) => `${g.label} ${(g.act / g.etch).toFixed(2)}`).join("、")
);
ok(
  "但 Ar+O₂ 的活化效率仍不超過純 O₂(化學活化終究由 O₂ 主導,不是稀釋後變更快)",
  M.gasById("aro2").act < M.gasById("o2").act
);

console.log("\n【未處理的接觸角:課文寫 70–90°(EMC/PI)】");
for (const id of ["emc", "pi", "sm"]) {
  const m = M.materialById(id);
  const a = M.contactAngle(m.g0);
  ok(`${m.label} 未處理落在疏水區(> 60°)`, a > 60, `${a.toFixed(0)}°`);
}

console.log("\n【製程窗有上限 —— 本章與前段最大的差別】");
{
  const times = [15, 30, 45, 60, 90, 120, 180];
  const runs = times.map((t) => ({ t, r: ev("o2", "emc", t) }));
  console.log(
    "    " +
      runs
        .map((x) => `${x.t}s:θ${x.r.angle.toFixed(0)}°/接著${x.r.adhesion.toFixed(2)}`)
        .join("  ")
  );

  const adh = runs.map((x) => x.r.adhesion);
  const peakIdx = adh.indexOf(Math.max(...adh));
  ok(
    "接著力先升後降(不是單調 —— 做過頭會變差)",
    peakIdx > 0 && peakIdx < adh.length - 1,
    `峰值在 ${times[peakIdx]} s,之後 ${adh[adh.length - 1].toFixed(2)} < 峰值 ${adh[peakIdx].toFixed(2)}`
  );
  ok(
    "過度處理的接著力低於未處理(接著力指數 < 1)",
    ev("o2", "emc", 180).adhesion < 1,
    `180 s → ${ev("o2", "emc", 180).adhesion.toFixed(2)}`
  );
  ok(
    "接觸角本身是單調的 —— 所以「只看接觸角」會誤判",
    runs.every((x, i) => i === 0 || x.r.angle <= runs[i - 1].r.angle),
    runs.map((x) => x.r.angle.toFixed(0)).join(" ≥ ")
  );
  ok(
    "過度處理有被判定出來",
    /過頭/.test(ev("o2", "emc", 150).verdict),
    ev("o2", "emc", 150).verdict
  );
  ok(
    "表面能會飽和(再延長時間不會更好)",
    ev("o2", "emc", 240).gamma - ev("o2", "emc", 120).gamma < 1.5,
    `120 s ${ev("o2", "emc", 120).gamma.toFixed(1)} → 240 s ${ev("o2", "emc", 240).gamma.toFixed(1)} mN/m`
  );
}

console.log("\n【達標:課文寫處理後要求 < 30°】");
{
  const r = ev("o2", "emc", 60);
  ok("O₂ 60 s 可讓 EMC 達到 < 30°", r.angle < 30, `${r.angle.toFixed(0)}°`);
  ok("而且此時損傷還很小(< 10 %)", r.damage < 0.1, `${(r.damage * 100).toFixed(0)} %`);
  ok("判定為達標", /✅/.test(r.verdict), r.verdict);
}

console.log("\n【Cu pad:氧化 vs 還原 —— 順序題的物理基礎】");
{
  const rows = ["ar", "o2", "h2ar", "n2"].map((g) => ({ g, r: ev(g, "cu", 60) }));
  for (const x of rows) {
    console.log(
      `    ${x.g.padEnd(5)} 氧化 ${(x.r.oxide * 100).toFixed(0)} %  接著 ${x.r.adhesion.toFixed(2)}  ${x.r.verdict}`
    );
  }
  const ox = (g) => ev(g, "cu", 60).oxide;
  ok("O₂ 讓 Cu 的氧化更嚴重(比未處理的 0.6 還高)", ox("o2") > 0.6, `${ox("o2").toFixed(2)}`);
  ok("H₂/Ar 的去氧化效果最好", ["ar", "o2", "n2"].every((g) => ox("h2ar") < ox(g)), `${ox("h2ar").toFixed(2)}`);
  ok("Ar 也能去掉一部分(物理濺射),但不如還原性氣體", ox("ar") < 0.6 && ox("ar") > ox("h2ar"));
  ok(
    "O₂ 處理過的 Cu 被判為會不沾(NSOP)",
    /NSOP|不沾/.test(ev("o2", "cu", 60).verdict),
    ev("o2", "cu", 60).verdict
  );
  ok(
    "H₂/Ar 處理後 Cu 的接著力最高",
    ["ar", "o2", "n2"].every((g) => ev("h2ar", "cu", 60).adhesion > ev(g, "cu", 60).adhesion),
    `${ev("h2ar", "cu", 60).adhesion.toFixed(2)}`
  );
}

console.log("\n【金屬不看接觸角 —— 混用判準是現場常見誤用】");
{
  const cu = ev("h2ar", "cu", 60);
  ok(
    "Cu 的判定沒有提到接觸角/疏水,即使角度仍偏高",
    !/疏水|30°/.test(cu.verdict) && cu.angle > 30,
    `θ ${cu.angle.toFixed(0)}° 但判定為「${cu.verdict}」`
  );
  const emc = ev("h2ar", "emc", 60);
  ok("有機材料才用接觸角判準", /疏水|規格|達標|損傷/.test(emc.verdict), emc.verdict);
}

console.log("\n【材料耐受度:綠漆最不耐,PI 最耐】");
{
  const d = (id) => ev("o2", id, 90).damage;
  console.log(`    EMC ${(d("emc") * 100).toFixed(0)} %、PI ${(d("pi") * 100).toFixed(0)} %、綠漆 ${(d("sm") * 100).toFixed(0)} %`);
  ok("同條件下綠漆的損傷最大", d("sm") > d("emc") && d("sm") > d("pi"));
  ok("PI 的損傷最小(課文:比 EMC 耐電漿)", d("pi") < d("emc"));
}

console.log("\n【低壓 vs 大氣:熱負荷是大氣電漿的限制】");
{
  const lp = ev("n2", "emc", 60);
  const atm = M.evaluate({ gas: "n2", material: "emc", time: 60, power: 300, mode: "atm" });
  console.log(`    低壓 熱負荷 ${lp.thermal.toFixed(1)}、大氣 熱負荷 ${atm.thermal.toFixed(1)}`);
  ok("同功率同時間,大氣電漿的熱負荷明顯較高", atm.thermal > lp.thermal * 2);
  ok(
    "大氣電漿因此有更短的時間上限",
    /熱負荷|過頭/.test(M.evaluate({ gas: "n2", material: "emc", time: 120, power: 300, mode: "atm" }).verdict),
    M.evaluate({ gas: "n2", material: "emc", time: 120, power: 300, mode: "atm" }).verdict
  );
}

console.log("\n【疏水回復與 queue time —— 課文寫「數小時」】");
{
  const r = ev("o2", "emc", 60);
  const q = r.queueHours;
  console.log(`    EMC(O₂ 60 s)queue time ≈ ${q === Infinity ? "∞" : q.toFixed(0)} 小時`);
  ok("queue time 落在「數小時」的量級(1–48 h)", q > 1 && q < 48, `${q.toFixed(0)} h`);
  ok(
    "接觸角會隨等待時間回升",
    M.contactAngle(M.recovered(r.gamma, r.material, 48)) >
      M.contactAngle(M.recovered(r.gamma, r.material, 0)),
    `0 h ${M.contactAngle(M.recovered(r.gamma, r.material, 0)).toFixed(0)}° → ` +
      `48 h ${M.contactAngle(M.recovered(r.gamma, r.material, 48)).toFixed(0)}°`
  );
  ok(
    "但不會回到完全未處理(有一部分是永久的)",
    M.recovered(r.gamma, r.material, 100000) > r.material.g0,
    `∞ 後仍有 ${M.recovered(r.gamma, r.material, 100000).toFixed(1)} mN/m > 原始 ${r.material.g0}`
  );
  const qsm = ev("o2", "sm", 60).queueHours;
  const qpi = ev("o2", "pi", 60).queueHours;
  ok(
    "回復最快的綠漆 queue time 最短、PI 最長",
    qsm < qpi,
    `綠漆 ${qsm.toFixed(0)} h < PI ${qpi === Infinity ? "∞" : qpi.toFixed(0)} h`
  );
}

/* ==========================================================================
   PCB 除膠渣(desmear)/ 回蝕(etchback)

   本章最反直覺的一段:3.7.2 說「封裝端幾乎不用氟系」,
   PCB 的 desmear 卻**非加 CF₄ 不可** —— 因為 FR-4 裡有玻纖(SiO₂),
   而 O₂ 對 SiO₂ 完全無效。這幾條斷言守住那個結論。
   ========================================================================== */
console.log("\n【PCB desmear:為什麼這裡反而非用氟不可】");
{
  const at = (cf4, extra) => M.desmear({ cf4, time_min: 15, ...(extra || {}) });
  const scan = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5, 0.8];
  console.log(
    "    " +
      scan
        .map((c) => `${(c * 100).toFixed(0)}%:突出${at(c).protrusion.toFixed(1)}µm`)
        .join("  ")
  );

  ok(
    "**純 O₂ 完全去不掉玻纖** —— 這就是封裝端的結論在 PCB 不成立的原因",
    at(0).glass === 0 && at(0).protrusion > 3,
    `玻纖移除 ${at(0).glass.toFixed(2)} µm、玻纖突出 ${at(0).protrusion.toFixed(1)} µm`
  );
  ok(
    "純 O₂ 的判定會明講玻纖沒退(不是只給一個數字)",
    /玻纖/.test(at(0).verdict),
    at(0).verdict
  );
  ok(
    "加了 CF₄ 玻纖才開始退,且移除量隨 CF₄ 比例單調上升",
    scan.every((c, i) => i === 0 || at(c).glass > at(scan[i - 1]).glass),
    scan.map((c) => at(c).glass.toFixed(1)).join(" < ")
  );

  /* 樹脂速率先升後降 —— 與 A33 的接著力曲線是同一個形狀、同一個教訓 */
  const rates = scan.map((c) => M.resinRate(c, 1));
  const peakIdx = rates.indexOf(Math.max(...rates));
  ok(
    "**樹脂移除速率先升後降**(少量 F 幫忙打開高分子鏈,加太多把 O 稀釋掉)",
    peakIdx > 0 && peakIdx < rates.length - 1,
    `峰值在 CF₄ ${(scan[peakIdx] * 100).toFixed(0)} %`
  );
  ok(
    "樹脂速率的峰值落在現場常用的 10–25 % 區間",
    scan[peakIdx] >= 0.1 && scan[peakIdx] <= 0.25,
    `${(scan[peakIdx] * 100).toFixed(0)} %`
  );

  const best = M.bestCF4({ time_min: 15 });
  ok(
    "**齊平度存在一個最佳 CF₄ 比例**,而且落在 10–25 %",
    best.cf4 >= 0.1 && best.cf4 <= 0.25,
    `最佳 ${(best.cf4 * 100).toFixed(0)} %,玻纖突出 ${best.r.protrusion.toFixed(2)} µm`
  );
  ok(
    "CF₄ 過量時玻纖反過來被過度咬蝕(突出變負)",
    at(0.5).protrusion < -1.5,
    `50 % 時 ${at(0.5).protrusion.toFixed(1)} µm`
  );
  ok(
    "CF₄ 過量時樹脂速率也確實掉下來(兩件事同時變糟)",
    M.resinRate(0.8, 1) < M.resinRate(0.2, 1),
    `80 % ${M.resinRate(0.8, 1).toFixed(3)} < 20 % ${M.resinRate(0.2, 1).toFixed(3)} µm/min`
  );

  /* desmear 與 etchback 是不同的目標深度,不是同一件事 */
  const d = M.desmear({ cf4: 0.2, time_min: 15, target: "desmear" });
  const e = M.desmear({ cf4: 0.2, time_min: 15, target: "etchback" });
  ok(
    "desmear 與 etchback 的目標深度窗不同(後者要刻意讓樹脂退更多)",
    e.window[0] > d.window[1],
    `desmear ${d.window.join("–")} µm、etchback ${e.window.join("–")} µm`
  );
  ok(
    "同樣 15 min 達得到 desmear 的窗,但還不到 etchback 的窗",
    d.okDepth && !e.okDepth,
    `樹脂退 ${d.resin.toFixed(1)} µm`
  );
  const eLong = M.desmear({ cf4: 0.2, time_min: 50, target: "etchback" });
  ok(
    "拉長到 50 min 才進得了 etchback 的窗",
    eLong.okDepth,
    `樹脂退 ${eLong.resin.toFixed(1)} µm — ${eLong.verdict}`
  );
}

console.log("\n【接觸角換算(Girifalco–Good)】");
ok("γs = 水的表面張力時接觸角為 0°", Math.abs(M.contactAngle(M.GAMMA_WATER)) < 1e-6);
ok("接觸角隨表面能單調下降", M.contactAngle(40) > M.contactAngle(55) && M.contactAngle(55) > M.contactAngle(70));

console.log(`\n${fail === 0 ? "✓" : "✗"} 封裝電漿模型 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
