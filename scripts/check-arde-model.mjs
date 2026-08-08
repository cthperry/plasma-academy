import { ardeMechanisms, ardeOpeningsUm, evaluateArdeProcess } from "../src/assets/js/arde-model.js";

const failures = [];
let checks = 0;
function assert(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `：${detail}` : ""}`);
}

const baseline = evaluateArdeProcess({ pressureMtorr: 30, angleSpreadDeg: 5, sticking: 0.2, timeSeconds: 240 });
assert("A20 應固定顯示五種 CD", baseline.trenches.length === 5 && ardeOpeningsUm.length === 5);
assert("一般模式應重現明顯 ARDE", baseline.lagPercent > 30, `${baseline.lagPercent.toFixed(1)}%`);
assert("一般模式深度應隨 CD 單調增加", baseline.trenches.every((item, index, all) => index === 0 || item.depthUm > all[index - 1].depthUm));
assert("一般模式應判定為 RIE lag", baseline.classification === "ARDE / RIE lag");

for (const { key, label } of ardeMechanisms) {
  const disabled = evaluateArdeProcess({ mechanisms: { [key]: false } });
  assert(`關閉${label}應明顯降低 lag`, disabled.lagPercent < baseline.lagPercent - 2.5, `${baseline.lagPercent.toFixed(1)} -> ${disabled.lagPercent.toFixed(1)}%`);
}

const noMechanisms = evaluateArdeProcess({ mechanisms: Object.fromEntries(ardeMechanisms.map(({ key }) => [key, false])) });
assert("關閉四機制後 CD 深度應一致", Math.abs(noMechanisms.lagPercent) < 0.2, `${noMechanisms.lagPercent.toFixed(2)}%`);

const short = evaluateArdeProcess({ timeSeconds: 60 });
const long = evaluateArdeProcess({ timeSeconds: 800 });
assert("延長時間不應消除 ARDE", long.lagPercent > short.lagPercent + 20, `${short.lagPercent.toFixed(1)} -> ${long.lagPercent.toFixed(1)}%`);

const lowPressure = evaluateArdeProcess({ pressureMtorr: 5 });
const highPressure = evaluateArdeProcess({ pressureMtorr: 180 });
assert("升壓應加重傳輸限制", highPressure.lagPercent > lowPressure.lagPercent + 8, `${lowPressure.lagPercent.toFixed(1)} -> ${highPressure.lagPercent.toFixed(1)}%`);

const narrowIons = evaluateArdeProcess({ angleSpreadDeg: 0 });
const broadIons = evaluateArdeProcess({ angleSpreadDeg: 15 });
assert("角度發散增加應加重離子遮蔽", broadIons.lagPercent > narrowIons.lagPercent + 5, `${narrowIons.lagPercent.toFixed(1)} -> ${broadIons.lagPercent.toFixed(1)}%`);

const inverse = evaluateArdeProcess({ inverse: true, sticking: 0.9 });
assert("反向模式應讓窄溝更深", inverse.trenches[0].depthUm > inverse.trenches.at(-1).depthUm);
assert("反向 ARDE 應明顯可見", inverse.lagPercent < -20, `${inverse.lagPercent.toFixed(1)}%`);
assert("反向模式應正確分類", inverse.classification === "反向 ARDE");
assert("A20 應揭露空間聚合物模型版本", inverse.spatialModel === "polymer-balance-2d-v1");
assert("每個 CD 應輸出至少 24 個深度分箱", inverse.trenches.every((item) => item.polymerProfile?.length >= 24));
assert("聚合物分箱應分離左右側壁與孔底收支", inverse.trenches.every((item) => item.polymerProfile.every((cell) => Number.isFinite(cell.leftBalance) && Number.isFinite(cell.rightBalance)) && Number.isFinite(item.bottomPolymerBalance)));
assert("高黏著反向模式中窄溝孔底聚合物應少於寬溝", inverse.trenches[0].bottomPolymerCoverage < inverse.trenches.at(-1).bottomPolymerCoverage);
assert("所有聚合物覆蓋率應維持物理界線", inverse.trenches.every((item) => item.polymerProfile.every((cell) => cell.coverage >= 0 && cell.coverage <= 1)));

if (failures.length) {
  console.error(`A20 ARDE 模型檢查失敗（${failures.length}/${checks}）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`A20 ARDE 模型檢查通過：${checks}/${checks}。`);
