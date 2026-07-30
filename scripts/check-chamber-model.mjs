import { evaluateMagnetron, evaluateWaferMap, waferMapPresets } from "../src/assets/js/chamber-model.js";

const failures = [];
let checks = 0;
function assert(label, condition, detail = "") { checks += 1; if (!condition) failures.push(`${label}${detail ? `：${detail}` : ""}`); }

const magnetron = evaluateMagnetron({ magneticFieldGauss: 300, pressureMtorr: 4, powerKw: 8, hours: 350 });
const noField = evaluateMagnetron({ magneticFieldGauss: 0, pressureMtorr: 4, powerKw: 8, hours: 350 });
assert("磁場為零時游離效率應下降一個數量級", magnetron.ionizationEfficiency / noField.ionizationEfficiency > 9, `${magnetron.ionizationEfficiency.toFixed(1)} / ${noField.ionizationEfficiency.toFixed(1)}`);
assert("磁場增加應延長電子路徑", magnetron.pathLengthM > noField.pathLengthM * 5);
assert("靶材利用率應落在 20–40%", magnetron.targetUtilizationPercent >= 20 && magnetron.targetUtilizationPercent <= 40);
const fresh = evaluateMagnetron({ hours: 0 });
const aged = evaluateMagnetron({ hours: 1000 });
assert("使用時數應加深 racetrack", aged.erosionDepthMm > fresh.erosionDepthMm + 5);
assert("Racetrack 加深應增加速率漂移", aged.rateDriftPercent > fresh.rateDriftPercent + 5);

assert("A25 應有六種 map 預設", waferMapPresets.length === 6);
for (const [id, label] of waferMapPresets) {
  const map = evaluateWaferMap({ preset: id, focusRingWearPercent: id === "edge-roll" ? 100 : 0 });
  assert(`${label} 預設應可重現`, map.classification === label, `${map.classification}，半幅 ${map.halfRangePercent.toFixed(1)}%`);
  assert(`${label} 應同時輸出兩種不均勻度`, map.halfRangePercent > 0 && map.oneSigmaPercent > 0);
}
const healthyRing = evaluateWaferMap({ preset: "center-fast", focusRingWearPercent: 0 });
const wornRing = evaluateWaferMap({ preset: "center-fast", focusRingWearPercent: 100 });
assert("聚焦環耗損 100% 應形成 edge roll", wornRing.classification === "Edge roll", wornRing.classification);
assert("聚焦環耗損應加重不均勻度", wornRing.halfRangePercent > healthyRing.halfRangePercent);

if (failures.length) {
  console.error(`A24/A25 腔體模型檢查失敗（${failures.length}/${checks}）：`);
  failures.forEach((failure) => console.error(`- ${failure}`)); process.exit(1);
}
console.log(`A24/A25 腔體模型檢查通過：${checks}/${checks}。`);
