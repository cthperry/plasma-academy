/* ==========================================================================
   check-bosch.mjs — 驗證 Bosch 循環模型(3.2 / A19)

   docs/05 給 A19 的兩個觀察點就是這支的主軸:
     · 「縮短循環時間 → scallop 變小但總蝕刻速率下降」
     · 「把沉積步關掉 → 側壁立刻被 SF₆ 咬爛」

   兩句都要被斷言,而且跑的是與瀏覽器同一份 bosch-model.js。
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ["src/js/lab/profile-engine.js", "src/js/lab/bosch-model.js"]) {
  vm.runInContext(readFileSync(join(ROOT, f), "utf8"), sandbox, { filename: f });
}
const B = sandbox.window.PA.boschModel;

const SCALE = Number(process.env.BOSCH_SCALE || 1.0);
let pass = 0;
let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

function run(depTime, etchTime, cycles, bias) {
  const sim = B.start({ depTime, etchTime, bias: bias == null ? 60 : bias }, SCALE);
  B.run(sim, cycles);
  return {
    sim,
    depth: B.depth(sim),
    scallop: B.scallopAmplitude(sim),
    widest: B.maxWidthRatio(sim),
    rate: B.rate(sim),
    overhead: B.overheadFraction(sim),
    verdict: B.verdict(sim),
  };
}

console.log("\n【循環長度的 trade-off —— A19 的第一個觀察點】");
const shortC = run(1, 4, 16);
const midC = run(2, 8, 8);
const longC = run(4, 16, 4);
for (const [name, r] of [["短循環 1/4×16", shortC], ["中 2/8×8", midC], ["長 4/16×4", longC]]) {
  console.log(
    `    ${name.padEnd(14)} 深 ${String(r.depth).padStart(3)}  scallop ${r.scallop.toFixed(2)}` +
      `  每秒 ${r.rate.toFixed(3)}  切換開銷 ${(r.overhead * 100).toFixed(0)} %`
  );
}
ok(
  "循環越短,scallop 越小(側壁越光滑)",
  shortC.scallop < longC.scallop,
  `短 ${shortC.scallop.toFixed(2)} < 長 ${longC.scallop.toFixed(2)}`
);
ok(
  "循環越短,每秒蝕刻深度反而**下降**(產率變差)",
  shortC.rate < longC.rate,
  `短 ${shortC.rate.toFixed(3)} < 長 ${longC.rate.toFixed(3)}`
);
ok(
  "而且原因是切換開銷佔比變高 —— 這是 trade-off 成立的唯一理由",
  shortC.overhead > longC.overhead * 2,
  `短 ${(shortC.overhead * 100).toFixed(0)} % vs 長 ${(longC.overhead * 100).toFixed(0)} %`
);
ok(
  "三種循環都刻得下去(深度相當,才有可比性)",
  [shortC, midC, longC].every((r) => r.depth > 30),
  [shortC, midC, longC].map((r) => r.depth).join(" / ")
);

console.log("\n【關掉沉積步 —— A19 的第二個觀察點】");
/**
 * 用有代表性的 1:2 沉積/蝕刻比來比。2:8(1:4)保護太薄,
 * 有沉積與沒沉積都會被咬,對照不出東西 —— 那不是模型的問題,
 * 是配方本身就不合理。
 */
const withDep = run(3, 6, 9);
const noDep = run(0, 6, 9);
console.log(
  `    有沉積 最寬 ${withDep.widest.toFixed(2)}×  /  無沉積 最寬 ${noDep.widest.toFixed(2)}×`
);
ok(
  "關掉沉積步 → 側壁被 SF₆ 咬得明顯更寬",
  noDep.widest > withDep.widest * 1.25,
  `${withDep.widest.toFixed(2)}× → ${noDep.widest.toFixed(2)}×`
);
ok("而且被判定為「側壁被咬爛」", /咬爛/.test(noDep.verdict), noDep.verdict);
ok(
  "有沉積步時側壁守得住(< 1.6 倍開口)",
  withDep.widest < 1.6,
  `${withDep.widest.toFixed(2)}×`
);

console.log("\n【清底 bias —— Bosch 唯一需要方向性的地方】");
const noBias = run(2, 8, 8, 0);
console.log(`    bias 60 深 ${withDep.depth}  /  bias 0 深 ${noBias.depth}`);
ok(
  "沒有清底 bias 就幾乎刻不下去(聚合物把溝底封死)",
  noBias.depth < 5 && withDep.depth > 30,
  `bias 0 → ${noBias.depth}、bias 60 → ${withDep.depth}`
);
ok("而且被判定出來", /幾乎沒刻/.test(noBias.verdict), noBias.verdict);

console.log("\n【模型結構】");
ok(
  "沉積步的 F/C 低於蝕刻步(C₄F₈ vs SF₆)",
  B.depParams().effFC < B.etchParams(60).effFC,
  `沉積 ${B.depParams().effFC} < 蝕刻 ${B.etchParams(60).effFC}`
);
ok(
  "沉積步的離子能量低於蝕刻步(不該把剛鋪好的打掉)",
  B.depParams().ionEnergy < B.etchParams(60).ionEnergy
);
ok(
  "bias 直接對應蝕刻步的離子能量",
  B.etchParams(100).ionEnergy > B.etchParams(0).ionEnergy,
  `${B.etchParams(0).ionEnergy} → ${B.etchParams(100).ionEnergy} eV`
);
ok("有切換開銷,且為正值", B.SWITCH_OVERHEAD_SEC > 0, `${B.SWITCH_OVERHEAD_SEC} s / 次`);

console.log(`\n${fail === 0 ? "✓" : "✗"} Bosch 循環 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
