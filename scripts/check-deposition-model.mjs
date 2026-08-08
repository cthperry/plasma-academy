import { evaluateGapFill, evaluatePealdCycle } from "../src/assets/js/deposition-model.js";

const failures = [];
let checks = 0;
function assert(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `：${detail}` : ""}`);
}

const peald = evaluatePealdCycle({ pulseSeconds: 8, purgeSeconds: 6, aspectRatio: 6, cycles: 100 });
assert("PEALD 預設應進入保形窗口", peald.classification === "PEALD 保形窗口", peald.classification);
assert("PEALD 預設覆蓋率應高於 95%", peald.stepCoveragePercent > 95, `${peald.stepCoveragePercent.toFixed(1)}%`);
assert("PEALD 每循環成長量應接近 0.08 nm", Math.abs(peald.growthPerCycleNm - 0.08) < 0.005, peald.growthPerCycleNm.toFixed(3));
const saturated = evaluatePealdCycle({ pulseSeconds: 12, purgeSeconds: 6, aspectRatio: 6, cycles: 100 });
const oversupplied = evaluatePealdCycle({ pulseSeconds: 20, purgeSeconds: 6, aspectRatio: 6, cycles: 100 });
assert("前驅物飽和後延長脈衝不應繼續增厚", Math.abs(oversupplied.topThicknessNm - saturated.topThicknessNm) < 0.01, `${saturated.topThicknessNm.toFixed(3)} -> ${oversupplied.topThicknessNm.toFixed(3)} nm`);
const shortPulse = evaluatePealdCycle({ pulseSeconds: 0.5, purgeSeconds: 6, aspectRatio: 12, cycles: 100 });
assert("脈衝不足應降低深孔覆蓋率", shortPulse.stepCoveragePercent < 60, `${shortPulse.stepCoveragePercent.toFixed(1)}%`);
const poorPurge = evaluatePealdCycle({ pulseSeconds: 8, purgeSeconds: 0.2, aspectRatio: 6, cycles: 100 });
assert("Purge 不足應切入寄生 CVD", poorPurge.classification.includes("寄生 CVD"));
assert("Purge 不足應讓 GPC 超過自限制值", poorPurge.growthPerCycleNm > 0.12, poorPurge.growthPerCycleNm.toFixed(3));
const pecvd = evaluatePealdCycle({ mode: "pecvd", aspectRatio: 6, cycles: 100 });
assert("PECVD 對照在 AR 6 覆蓋率應低於 50%", pecvd.stepCoveragePercent < 50, `${pecvd.stepCoveragePercent.toFixed(1)}%`);

const gap = evaluateGapFill({ aspectRatio: 4, dsRatio: 5, timePercent: 70 });
assert("PECVD 在 AR > 3 應形成 void", gap.pecvd.void);
assert("HDP 適當 D/S、AR <= 6 應無 void", !gap.hdp.void && gap.hdp.classification === "HDP 填溝窗口");
assert("HDP 覆蓋率應高於 PECVD", gap.hdp.stepCoveragePercent > gap.pecvd.stepCoveragePercent + 25);
const highDs = evaluateGapFill({ aspectRatio: 4, dsRatio: 15, timePercent: 80 });
assert("D/S 過高應因濺鍍不足形成 HDP void", highDs.hdp.void);
const highAr = evaluateGapFill({ aspectRatio: 8, dsRatio: 5, timePercent: 80 });
assert("AR 8 應超出 HDP 完整填充窗口", highAr.hdp.void);
const sputterHeavy = evaluateGapFill({ aspectRatio: 4, dsRatio: 1, timePercent: 80 });
assert("D/S 過低應無淨沉積", sputterHeavy.hdp.netDeposition <= 0 && sputterHeavy.hdp.classification.includes("無淨填充"));
assert("A23 應揭露角度視線傳輸模型版本", highAr.spatialModel === "ballistic-los-2d-v1");
assert("A23 應保留逐角度射線取樣", highAr.transport?.rays.length >= 41);
assert("所有射線應落在孔底、左壁或右壁", highAr.transport?.rays.every((ray) => ["bottom", "left-wall", "right-wall"].includes(ray.target)));
assert("AR 8 的孔底視線到達率應低於 AR 4", highAr.transport.bottomArrivalFraction < gap.transport.bottomArrivalFraction);
assert("AR 8 的側壁截留率應高於 AR 4", highAr.transport.sidewallCaptureFraction > gap.transport.sidewallCaptureFraction);
assert("HDP 應輸出可繪製的二維沉積輪廓", highAr.hdp.profile?.length >= 24 && highAr.hdp.profile.every((cell) => cell.leftThickness >= 0 && cell.rightThickness >= 0));

if (failures.length) {
  console.error(`A22/A23 沉積模型檢查失敗（${failures.length}/${checks}）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`A22/A23 沉積模型檢查通過：${checks}/${checks}。`);
