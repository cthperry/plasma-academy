import { defectById, defectCategories, defectKnobs, defects, defectsByKnob, filterDefects } from "../src/data/defects.js";
import { diagnosticDefects, diagnosticMethods, rankDefectCauses } from "../src/data/defect-diagnosis.js";
import { defectSvg } from "../src/data/defect-visuals.js";
import { profilePresetById } from "../src/assets/js/etch-profile-model.js";

const failures = [];
let checks = 0;
function assert(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `：${detail}` : ""}`);
}

const specIds = [
  "arde", "inverse-lag", "microloading", "macroloading",
  "undercut", "bowing", "taper", "notching", "microtrench", "footing", "twisting", "striation",
  "faceting", "mask-loss", "resist-wiggle", "etch-stop", "veil", "corrosion"
];
assert("規畫書 18 條缺陷應全部存在", specIds.every((id) => defectById(id)));
assert("缺陷資料應為 18 條規格加 1 條增補", defects.length === 19);
assert("增補條目應只有 First Wafer Effect", defects.filter((item) => !specIds.includes(item.id)).map((item) => item.id).join() === "first-wafer");
assert("缺陷 ID 不可重複", new Set(defects.map((item) => item.id)).size === defects.length);
assert("缺陷 ID 應為小寫英數連字號", defects.every((item) => /^[a-z0-9-]+$/.test(item.id)));
assert("應有四種有效分類", defectCategories.length === 4 && defectCategories.every((category) => filterDefects({ cat: category.key }).length > 0));

const required = ["id", "zh", "en", "cat", "symptom", "causes", "distinguish", "fixes", "related", "ch"];
assert("每條缺陷必填欄位應完整", defects.every((item) => required.every((field) => item[field] && (!Array.isArray(item[field]) || item[field].length))));
assert("每條缺陷應明確宣告 profilePresetId", defects.every((item) => Object.hasOwn(item, "profilePresetId")));
assert("每條診斷區分應超過 25 字", defects.every((item) => item.distinguish.length > 25));
assert("每條至少應有兩個對策", defects.every((item) => item.fixes.length >= 2));
assert("每個對策應有方向、理由與副作用", defects.every((item) => item.fixes.every((fix) => fix.knob && fix.dir && fix.why && fix.sideEffect)));
assert("對策旋鈕應使用核准清單", defects.every((item) => item.fixes.every((fix) => defectKnobs.includes(fix.knob))));
assert("每個旋鈕至少應影響一種缺陷", defectKnobs.every((knob) => defectsByKnob(knob).length > 0));
assert("相關缺陷應全部存在", defects.every((item) => item.related.every((id) => defectById(id))));
assert("每條至少應關聯一種相似缺陷", defects.every((item) => item.related.length >= 1));

for (const [id, keyword] of [
  ["undercut", "中段"], ["bowing", "undercut"], ["microtrench", "footing"],
  ["footing", "microtrench"], ["arde", "密度"], ["etch-stop", "footing"], ["notching", "undercut"]
]) assert(`${id} 應用關鍵字區分相似缺陷`, defectById(id).distinguish.includes(keyword));

const withProfile = defects.filter((item) => item.profilePresetId);
assert("至少六種缺陷應提供 A18 預設", withProfile.length >= 6);
assert("A18 缺陷連結應全部解析到同名單一預設", withProfile.every((item) => profilePresetById(item.profilePresetId).id === item.profilePresetId));
assert("Undercut 鈍化應低於 taper", profilePresetById("undercut").passivation < profilePresetById("taper").passivation);
assert("Faceting 離子能量應為可見預設最高", ["undercut", "bowing", "taper", "microtrench", "footing", "faceting", "etch-stop"].every((id) => profilePresetById(id).ion <= profilePresetById("faceting").ion));
assert("Etch stop 鈍化應為預設最高", withProfile.every((item) => profilePresetById(item.profilePresetId).passivation <= profilePresetById("etch-stop").passivation));
assert("ARDE 應指定多溝槽視圖", profilePresetById(defectById("arde").profilePresetId).multi === true);
assert("金屬腐蝕應標記高風險", defectById("corrosion").risk === "high");
assert("關鍵字搜尋應找到至少三條充電缺陷", filterDefects({ q: "充電" }).length >= 3);
assert("脈衝旋鈕應關聯至少三條缺陷", defectsByKnob("脈衝").length >= 3);
assert("診斷器應只列規畫書 18 種缺陷", diagnosticDefects.length === 18 && diagnosticDefects.every((item) => specIds.includes(item.id)));
assert("每種缺陷至少應提供兩個判別方法", diagnosticDefects.every((item) => diagnosticMethods(item).length >= 2 && diagnosticMethods(item).every((method) => method.length > 20)));
assert("每種缺陷都應有可辨識 SVG", diagnosticDefects.every((item) => defectSvg(item.id, item.zh).includes(`aria-label=\"${item.zh} 剖面示意圖\"`)));
assert("補充條件應能改變候選排序", rankDefectCauses({ symptomId: "notching" })[0].defect.id === "notching" && rankDefectCauses({ symptomId: "footing", substrate: "insulating", location: "interface", distribution: "array-edge" })[0].defect.id === "footing");

if (failures.length) {
  console.error(`缺陷資料檢查失敗（${failures.length}/${checks}）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`缺陷資料檢查通過：${checks}/${checks}，${defects.length} 條。`);
