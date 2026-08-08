import { evaluateArdeProcess } from "../../src/assets/js/arde-model.js";
import { evaluateGapFill } from "../../src/assets/js/deposition-model.js";
import { evaluateEtchProfile, profilePresetById } from "../../src/assets/js/etch-profile-model.js";

export function evaluateAdvancedModelAcceptance() {
  return [evaluateA18(), evaluateA20(), evaluateA23()];
}

function evaluateA18() {
  const vertical = evaluateEtchProfile({ ...profilePresetById("vertical"), wallFlux: true });
  const bowing = evaluateEtchProfile({ ...profilePresetById("bowing"), wallFlux: true });
  const noReflection = evaluateEtchProfile({ ...profilePresetById("microtrench"), reflection: 0, wallFlux: true });
  const topFlux = average(bowing.wallFlux?.left.slice(0, 6).map((cell) => cell.total));
  const middleFlux = average(bowing.wallFlux?.left.slice(10, 18).map((cell) => cell.total));
  return result("A18", "側壁通量與二維蝕刻輪廓", {
    spatialContract: vertical.spatialModel === "wall-flux-2d-v1",
    depthResolution: vertical.wallFlux?.depthBins.length >= 24,
    continuousBoundary: vertical.profileBoundary?.length === vertical.wallFlux?.depthBins.length
      && vertical.profileBoundary[0]?.depth === 0
      && vertical.profileBoundary.at(-1)?.depth === 1,
    reflectedBowing: middleFlux > topFlux * 1.08,
    reflectionDisable: noReflection.wallFlux?.left.every((cell) => cell.reflected === 0)
  });
}

function evaluateA20() {
  const inverse = evaluateArdeProcess({ inverse: true, sticking: 0.9 });
  return result("A20", "空間聚合物平衡與反向 ARDE", {
    spatialContract: inverse.spatialModel === "polymer-balance-2d-v1",
    depthResolution: inverse.trenches.every((trench) => trench.polymerProfile?.length >= 24),
    separateBalances: inverse.trenches.every((trench) => trench.polymerProfile?.every((cell) => Number.isFinite(cell.leftBalance) && Number.isFinite(cell.rightBalance)) && Number.isFinite(trench.bottomPolymerBalance)),
    coverageBounds: inverse.trenches.every((trench) => trench.polymerProfile?.every((cell) => cell.coverage >= 0 && cell.coverage <= 1)),
    inverseLagMechanism: inverse.lagPercent < -20 && inverse.trenches[0].bottomPolymerCoverage < inverse.trenches.at(-1).bottomPolymerCoverage
  });
}

function evaluateA23() {
  const ar4 = evaluateGapFill({ aspectRatio: 4, dsRatio: 5, timePercent: 80 });
  const ar8 = evaluateGapFill({ aspectRatio: 8, dsRatio: 5, timePercent: 80 });
  return result("A23", "角度分布、視線傳輸與高深寬比 HDP", {
    spatialContract: ar8.spatialModel === "ballistic-los-2d-v1",
    angularResolution: ar8.transport?.rays.length >= 41,
    rayAccounting: ar8.transport?.rays.every((ray) => ["bottom", "left-wall", "right-wall"].includes(ray.target)),
    aspectRatioTransport: ar8.transport?.bottomArrivalFraction < ar4.transport?.bottomArrivalFraction
      && ar8.transport?.sidewallCaptureFraction > ar4.transport?.sidewallCaptureFraction,
    highArOutcome: ar8.hdp.void && ar8.hdp.profile?.length >= 24 && ar4.hdp.classification === "HDP 填溝窗口"
  });
}

function result(id, title, checks) {
  const failedChecks = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  return { id, title, passed: failedChecks.length === 0, checks, failedChecks };
}

function average(values = []) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : Number.NaN;
}
