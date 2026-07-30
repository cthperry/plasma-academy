import { boschCycleAt, evaluateBoschProcess } from "../src/assets/js/bosch-model.js";

const failures = [];
let checks = 0;
function assert(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `：${detail}` : ""}`);
}

const baseline = evaluateBoschProcess();
assert("預設應落在 Bosch 製程窗", baseline.regime === "bosch-window");
assert("預設應有正蝕刻深度", baseline.totalDepthUm > 0);
assert("預設側壁角應接近垂直", baseline.sidewallAngleDeg > 85);
assert("總深度應等於每循環深度乘循環數", Math.abs(baseline.totalDepthUm - baseline.etchPerCycleUm * baseline.cycles) < 1e-9);

const etchSweep = [2, 4, 7, 10, 15].map((etchSeconds) => evaluateBoschProcess({ etchSeconds }));
assert("Scallop 應隨蝕刻步時間單調增加", etchSweep.every((item, index) => index === 0 || item.scallopDepthUm > etchSweep[index - 1].scallopDepthUm));
assert("總深度應隨蝕刻步時間增加", etchSweep.every((item, index) => index === 0 || item.totalDepthUm > etchSweep[index - 1].totalDepthUm));
assert("短蝕刻步應降低有效速率", etchSweep[0].effectiveRateUmMin < etchSweep[2].effectiveRateUmMin);
assert("短蝕刻步應產生較小 scallop", etchSweep[0].scallopDepthUm < etchSweep[2].scallopDepthUm * 0.4);

const noDeposition = evaluateBoschProcess({ depositionSeconds: 0 });
assert("關閉沉積步應切到等向模式", noDeposition.regime === "isotropic");
assert("關閉沉積步側蝕應大幅增加", noDeposition.sideEtchPerCycleUm > baseline.sideEtchPerCycleUm * 8);
assert("等向模式側壁角應明顯降低", noDeposition.sidewallAngleDeg < 75);

const weakBias = evaluateBoschProcess({ biasW: 60 });
const strongBias = evaluateBoschProcess({ biasW: 350 });
assert("低 bias 應造成底部清膜不足", weakBias.regime === "bottom-stop");
assert("提高 bias 應提高每循環蝕刻深度", strongBias.etchPerCycleUm > baseline.etchPerCycleUm);
assert("提高 bias 應提高底部清膜效率", strongBias.bottomClear > baseline.bottomClear);

const fewCycles = evaluateBoschProcess({ cycles: 10 });
const manyCycles = evaluateBoschProcess({ cycles: 80 });
assert("循環數增加應增加總深度", manyCycles.totalDepthUm > fewCycles.totalDepthUm);
assert("高深寬比傳輸應使每循環深度略降", manyCycles.etchPerCycleUm < fewCycles.etchPerCycleUm);

assert("沉積階段應可由時間軸辨識", boschCycleAt(1).phase === "passivation");
assert("Purge 階段應可由時間軸辨識", boschCycleAt(3.4).phase === "purge");
assert("蝕刻階段應可由時間軸辨識", boschCycleAt(5).phase === "etch");

if (failures.length) {
  console.error(`Bosch 模型檢查失敗（${failures.length}/${checks}）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Bosch 模型檢查通過：${checks}/${checks}。`);
