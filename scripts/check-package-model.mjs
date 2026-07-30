import {
  WATER_SURFACE_TENSION,
  contactAngle,
  evaluatePackageTreatment,
  packageGasById,
  packageGases,
  packageMaterialById,
  recoveredSurfaceEnergy
} from "../src/assets/js/package-model.js";

const failures = [];
let checks = 0;
function assert(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `：${detail}` : ""}`);
}

const evaluate = (gas, material, time, extra = {}) => evaluatePackageTreatment({
  gas, material, time, power: 300, pressure: 0.4, wait: 0, mode: "lp", ...extra
});

assert("封裝氣體應為四種", packageGases.length === 4);
assert("封裝氣體不可含氟 chemistry", packageGases.every((gas) => !/F/.test(gas.label)));
assert("應只有一種還原性氣體", packageGases.filter((gas) => gas.redox < 0).length === 1);
assert("應只有一種氧化性氣體", packageGases.filter((gas) => gas.redox > 0).length === 1);
assert("O2 活化效率應最高", packageGases.every((gas) => gas.activation <= packageGasById("o2").activation));
assert("O2 對有機材料侵蝕性應最高", packageGases.every((gas) => gas.etch <= packageGasById("o2").etch));

for (const id of ["emc", "pi", "sm"]) {
  const material = packageMaterialById(id);
  assert(`${material.label} 未處理時應偏疏水`, contactAngle(material.initialEnergy) > 60);
}

const times = [15, 30, 45, 60, 90, 120, 180];
const runs = times.map((time) => evaluate("o2", "emc", time));
const adhesion = runs.map((result) => result.adhesion);
const peakIndex = adhesion.indexOf(Math.max(...adhesion));
assert("接著力應先升後降", peakIndex > 0 && peakIndex < adhesion.length - 1);
assert("過度處理接著力應低於未處理", evaluate("o2", "emc", 180).adhesion < 1);
assert("接觸角應隨處理時間單調下降", runs.every((result, index) => index === 0 || result.angle <= runs[index - 1].angle));
assert("過度處理應明確判定", /處理過頭/.test(evaluate("o2", "emc", 150).verdict));
assert("表面能應趨近飽和", evaluate("o2", "emc", 240).gamma - evaluate("o2", "emc", 120).gamma < 1.5);

const qualifiedEmc = evaluate("o2", "emc", 60);
assert("O2 60 秒應使 EMC 接觸角低於 30 度", qualifiedEmc.angle < 30);
assert("O2 60 秒時 EMC 損傷應低於 10%", qualifiedEmc.damage < 0.1);
assert("O2 60 秒時 EMC 應達教學窗口", !/不足|尚未|過頭|過高/.test(qualifiedEmc.verdict));

const copperOxide = (gas) => evaluate(gas, "cu", 60).oxide;
assert("O2 應加重 Cu 氧化", copperOxide("o2") > 0.6);
assert("H2/Ar 的 Cu 去氧化應最佳", ["ar", "o2", "n2"].every((gas) => copperOxide("h2ar") < copperOxide(gas)));
assert("Ar 應可物理去除部分 Cu 氧化物", copperOxide("ar") < 0.6 && copperOxide("ar") > copperOxide("h2ar"));
assert("O2 處理 Cu 應警示不沾", /NSOP|不沾/.test(evaluate("o2", "cu", 60).verdict));
assert("H2/Ar 處理 Cu 的接著力應最高", ["ar", "o2", "n2"].every((gas) => evaluate("h2ar", "cu", 60).adhesion > evaluate(gas, "cu", 60).adhesion));

const reducedCopper = evaluate("h2ar", "cu", 60);
assert("Cu 判定不可使用接觸角門檻", !/疏水|30°/.test(reducedCopper.verdict) && reducedCopper.angle > 30);
assert("有機材料判定應使用活化與損傷門檻", /疏水|30°|接觸角|損傷/.test(evaluate("h2ar", "emc", 60).verdict));

const damageAt90 = (material) => evaluate("o2", material, 90).damage;
assert("綠漆損傷應高於 EMC 與 PI", damageAt90("sm") > damageAt90("emc") && damageAt90("sm") > damageAt90("pi"));
assert("PI 損傷應低於 EMC", damageAt90("pi") < damageAt90("emc"));

const lowPressure = evaluate("n2", "emc", 60);
const atmospheric = evaluate("n2", "emc", 60, { mode: "atm" });
assert("大氣電漿熱負荷應顯著高於低壓", atmospheric.thermal > lowPressure.thermal * 2);
assert("大氣電漿長時間處理應觸發上限", /熱負荷|處理過頭/.test(evaluate("n2", "emc", 120, { mode: "atm" }).verdict));

const queue = qualifiedEmc.queueHours;
assert("EMC queue time 應落在數小時量級", queue > 1 && queue < 48);
assert("等待後接觸角應回升", contactAngle(recoveredSurfaceEnergy(qualifiedEmc.gammaPeak, qualifiedEmc.material, 48)) > contactAngle(qualifiedEmc.gammaPeak));
assert("疏水回復後仍應保留部分活化", recoveredSurfaceEnergy(qualifiedEmc.gammaPeak, qualifiedEmc.material, 100000) > qualifiedEmc.material.initialEnergy);
assert("綠漆 queue time 應短於 PI", evaluate("o2", "sm", 60).queueHours < evaluate("o2", "pi", 60).queueHours);

assert("水表面張力對應接觸角應為零", Math.abs(contactAngle(WATER_SURFACE_TENSION)) < 1e-6);
assert("接觸角應隨表面能單調下降", contactAngle(40) > contactAngle(55) && contactAngle(55) > contactAngle(70));

if (checks !== 34) failures.push(`封裝模型驗收應固定為 34 項，目前 ${checks} 項。`);
if (failures.length) {
  console.error(`封裝電漿模型檢查失敗（${failures.length} 項）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`封裝電漿模型檢查通過：${checks}/${checks}。`);
