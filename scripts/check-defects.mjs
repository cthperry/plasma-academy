import { defectById, defectCategories, defectKnobs, defects, defectsByKnob, filterDefects } from "../src/data/defects.js";

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

const withProfile = defects.filter((item) => item.profile);
assert("至少六種缺陷應提供 A18 預設", withProfile.length >= 6);
assert("A18 缺陷預設應落在來源規格範圍", withProfile.every((item) => item.profile.ion >= 0 && item.profile.ion <= 1000 && item.profile.spread >= 0 && item.profile.spread <= 15 && item.profile.passiv >= 0 && item.profile.passiv <= 100 && item.profile.radical >= 0 && item.profile.radical <= 100));
assert("Undercut 鈍化應低於 taper", defectById("undercut").profile.passiv < defectById("taper").profile.passiv);
assert("Faceting 離子能量應為預設最高", withProfile.every((item) => item.profile.ion <= defectById("faceting").profile.ion));
assert("Etch stop 鈍化應為預設最高", withProfile.every((item) => item.profile.passiv <= defectById("etch-stop").profile.passiv));
assert("ARDE 應指定多溝槽視圖", defectById("arde").profile.multi === true);
assert("金屬腐蝕應標記高風險", defectById("corrosion").risk === "high");
assert("關鍵字搜尋應找到至少三條充電缺陷", filterDefects({ q: "充電" }).length >= 3);
assert("脈衝旋鈕應關聯至少三條缺陷", defectsByKnob("脈衝").length >= 3);

if (failures.length) {
  console.error(`缺陷資料檢查失敗（${failures.length}/${checks}）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`缺陷資料檢查通過：${checks}/${checks}，${defects.length} 條。`);
