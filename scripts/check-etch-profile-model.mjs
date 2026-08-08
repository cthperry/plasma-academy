import {
  coburnWintersRate,
  evaluateEtchProfile,
  profilePresetById,
  profilePresets,
  profileRanges
} from "../src/assets/js/etch-profile-model.js";

const failures = [];
let checks = 0;
function assert(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `：${detail}` : ""}`);
}

const chemistryOnly = coburnWintersRate(1, 0);
const ionOnly = coburnWintersRate(0, 1);
const combined = coburnWintersRate(1, 1);
assert("純化學速率應為 5", chemistryOnly.total === 5);
assert("純物理速率應為 2", ionOnly.total === 2);
assert("完整協同速率應為 55", combined.total === 55);
assert("簡單相加線應為 7", combined.additive === 7);
assert("協同項應為 48", combined.synergy === 48);
assert("任一通量為零時協同項消失", chemistryOnly.synergy === 0 && ionOnly.synergy === 0);
assert("半通量結果應保留乘積關係", coburnWintersRate(0.5, 0.5).synergy === 12);

assert("應定義八種輪廓預設", profilePresets.length === 8);
assert("預設識別字不得重複", new Set(profilePresets.map((item) => item.id)).size === 8);
assert("模型應有六個共用旋鈕", Object.keys(profileRanges).length === 6);
assert("所有預設參數應落在滑桿範圍", profilePresets.every((preset) => Object.entries(profileRanges).every(([key, range]) => preset[key] >= range.min && preset[key] <= range.max)));

for (const preset of profilePresets) {
  const result = evaluateEtchProfile(preset);
  assert(`${preset.label} 應由量測分類為 ${preset.expected}`, result.shape === preset.expected, result.shape);
}

const vertical = evaluateEtchProfile(profilePresetById("vertical"));
assert("垂直輪廓三段寬度應接近", Math.max(vertical.topWidth, vertical.middleWidth, vertical.bottomWidth) - Math.min(vertical.topWidth, vertical.middleWidth, vertical.bottomWidth) < 5);
assert("垂直輪廓遮罩開口應保持", Math.abs(vertical.maskOpening - 100) < 2);

const undercut = profilePresetById("undercut");
const undercutBase = evaluateEtchProfile(undercut);
const undercutFixed = evaluateEtchProfile({ ...undercut, passivation: 55 });
assert("Undercut 頂部應比中段寬", undercutBase.topWidth > undercutBase.middleWidth + 15);
assert("增加鈍化應改善 undercut", undercutFixed.topWidth < undercutBase.topWidth - 20);

const taper = profilePresetById("taper");
const taperBase = evaluateEtchProfile(taper);
const taperFixed = evaluateEtchProfile({ ...taper, passivation: 35 });
assert("Taper 底部應明顯較窄", taperBase.bottomWidth < taperBase.topWidth - 12);
assert("降低鈍化應改善 taper", taperFixed.bottomWidth > taperBase.bottomWidth + 10);

const bowing = profilePresetById("bowing");
const bowingBase = evaluateEtchProfile(bowing);
const bowingFixed = evaluateEtchProfile({ ...bowing, spread: 2 });
assert("Bowing 中段應比頂部寬", bowingBase.middleWidth > bowingBase.topWidth + 7);
assert("縮窄角度分佈應改善 bowing", bowingFixed.middleWidth < bowingBase.middleWidth - 15);

const micro = profilePresetById("microtrench");
const microBase = evaluateEtchProfile(micro);
const microFixed = evaluateEtchProfile({ ...micro, reflection: 0 });
assert("Microtrench 底角深溝應可量測", microBase.microtrench >= 13);
assert("降低反射應改善 microtrench", microFixed.microtrench < 1);

const footing = evaluateEtchProfile(profilePresetById("footing"));
assert("Footing 應在底部形成縮頸", footing.bottomWidth < footing.middleWidth - 13 && footing.footing >= 12);

const faceting = profilePresetById("faceting");
const facetingBase = evaluateEtchProfile(faceting);
const facetingFixed = evaluateEtchProfile({ ...faceting, ion: 300 });
assert("Faceting 應使遮罩開口變寬", facetingBase.maskOpening > 108);
assert("降低離子能量應改善 faceting", facetingFixed.maskOpening < facetingBase.maskOpening - 10);

const stopped = profilePresetById("etch-stop");
const stoppedBase = evaluateEtchProfile(stopped);
const stoppedFixed = evaluateEtchProfile({ ...stopped, passivation: 45, ion: 300 });
assert("Etch stop 深度應低於 42%", stoppedBase.depthPercent < 42);
assert("降低鈍化並提高離子能量應恢復蝕刻", stoppedFixed.depthPercent > stoppedBase.depthPercent + 40);

assert("ARDE 深度應隨 CD 單調增加", vertical.ardeDepths.every((depth, index, values) => index === 0 || depth > values[index - 1]));
assert("窄寬溝 ARDE 落差應超過 30%", vertical.ardeDepths[0] / vertical.ardeDepths[2] < 0.7);
assert("未知預設應回到垂直基準", profilePresetById("missing").id === "vertical");

const spatialVertical = evaluateEtchProfile({ ...profilePresetById("vertical"), wallFlux: true });
assert("A18 空間模型應揭露版本", spatialVertical.spatialModel === "wall-flux-2d-v1");
assert("A18 應輸出至少 24 個深度分箱", spatialVertical.wallFlux?.depthBins.length >= 24);
assert("A18 左右側壁通量應逐深度成對輸出", spatialVertical.wallFlux?.left.length === spatialVertical.wallFlux?.right.length);
assert("A18 側壁通量不得為負值", spatialVertical.wallFlux?.left.every((cell) => cell.total >= 0 && cell.direct >= 0 && cell.reflected >= 0));
assert("A18 二維輪廓邊界應連續涵蓋頂至底", spatialVertical.profileBoundary?.length === spatialVertical.wallFlux?.depthBins.length && spatialVertical.profileBoundary[0].depth === 0 && spatialVertical.profileBoundary.at(-1).depth === 1);
const spatialBowing = evaluateEtchProfile({ ...profilePresetById("bowing"), wallFlux: true });
const topFlux = spatialBowing.wallFlux.left.slice(0, 6).reduce((sum, cell) => sum + cell.total, 0) / 6;
const middleFlux = spatialBowing.wallFlux.left.slice(10, 18).reduce((sum, cell) => sum + cell.total, 0) / 8;
assert("Bowing 條件的反射通量應集中於側壁中段", middleFlux > topFlux * 1.08, `${topFlux.toFixed(3)} -> ${middleFlux.toFixed(3)}`);
const noReflection = evaluateEtchProfile({ ...profilePresetById("microtrench"), reflection: 0, wallFlux: true });
assert("關閉反射後側壁反射通量應歸零", noReflection.wallFlux.left.every((cell) => cell.reflected === 0));

if (failures.length) {
  console.error(`蝕刻輪廓模型檢查失敗（${failures.length}/${checks}）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`蝕刻輪廓模型檢查通過：${checks}/${checks}。`);
