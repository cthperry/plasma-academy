/* ==========================================================================
   check-defects.mjs — 驗證 src/data/defects.js

   缺陷圖鑑的價值不在「列出 18 種缺陷」,而在**能不能把長得像的分開**。
   所以這支檢查最看重兩件事:
     1. 每一條都有「診斷區分」,而且真的提到了它的相似對象
     2. 每一條的對策都標了副作用 —— 沒有副作用的旋鈕不存在
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(ROOT, "src/data/defects.js"), "utf8"), sandbox, {
  filename: "defects.js",
});
const D = sandbox.window.PA.defects;

let pass = 0;
let fail = 0;
function ok(label, cond, detail) {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
}

console.log("\n【結構】");

// docs/03 §3.3 明列的 18 條 —— 一條都不能少。
// 額外增補的條目允許存在,但必須是刻意的,所以另外列出來讓人看見。
const SPEC_18 = [
  "arde", "inverse-lag", "microloading", "macroloading",
  "undercut", "bowing", "taper", "notching", "microtrench", "footing", "twisting", "striation",
  "faceting", "mask-loss", "resist-wiggle",
  "etch-stop", "veil", "corrosion",
];
const lacking = SPEC_18.filter((id) => !D.byId(id));
ok("docs/03 §3.3 的 18 條全部到齊", lacking.length === 0, lacking.join("、"));

const extras = D.all.map((d) => d.id).filter((id) => SPEC_18.indexOf(id) === -1);
ok(
  "額外增補的條目有被記錄(非意外多出來的)",
  extras.every((id) => {
    const d = D.byId(id);
    return d.ch && d.ch !== "3.3.2" && d.ch !== "3.3.3" && d.ch !== "3.3.4" && d.ch !== "3.3.5";
  }),
  extras.length ? `增補 ${extras.length} 條:${extras.join("、")}(章節須指向 §3.3 之外)` : "無增補"
);

const ids = D.all.map((d) => d.id);
ok("id 不重複", new Set(ids).size === ids.length);
ok(
  "id 皆為小寫英數與連字號",
  ids.every((i) => /^[a-z0-9-]+$/.test(i)),
  ids.filter((i) => !/^[a-z0-9-]+$/.test(i)).join("、")
);

const catKeys = D.categories.map((c) => c.key);
const REQ = ["zh", "en", "cat", "symptom", "causes", "distinguish", "fixes", "related", "ch"];
const missing = [];
const badCat = [];
for (const d of D.all) {
  for (const k of REQ) {
    const v = d[k];
    if (v === undefined || v === null || (Array.isArray(v) && !v.length) || v === "") {
      missing.push(`${d.id}.${k}`);
    }
  }
  if (catKeys.indexOf(d.cat) === -1) badCat.push(`${d.id}:${d.cat}`);
}
ok("必填欄位齊全且非空", missing.length === 0, missing.slice(0, 6).join("、"));
ok("分類 key 全部合法", badCat.length === 0, badCat.join("、"));

// 四個分類都要有條目,不然分類本身沒意義
for (const c of D.categories) {
  const n = D.filter({ cat: c.key }).length;
  ok(`分類「${c.name}」有條目`, n > 0, `${n} 條`);
}

console.log("\n【診斷區分 —— 圖鑑真正的價值】");

ok(
  "每一條的「診斷區分」都寫得夠具體(> 25 字)",
  D.all.every((d) => d.distinguish.length > 25),
  D.all.filter((d) => d.distinguish.length <= 25).map((d) => d.id).join("、")
);

// 相關缺陷必須互相指得到,而且不能指向不存在的 id
const badRel = [];
for (const d of D.all) {
  for (const r of d.related) {
    if (!D.byId(r)) badRel.push(`${d.id} → ${r}`);
  }
}
ok("related 全部指向存在的缺陷", badRel.length === 0, badRel.join("、"));
ok(
  "每一條至少關聯一條其他缺陷",
  D.all.every((d) => d.related.length >= 1),
  D.all.filter((d) => !d.related.length).map((d) => d.id).join("、")
);

// 課文明確點名的幾組「容易搞混」,診斷區分裡必須真的提到對方
const PAIRS = [
  ["undercut", "bowing", "中段"],
  ["bowing", "undercut", "undercut"],
  ["microtrench", "footing", "footing"],
  ["footing", "microtrench", "microtrench"],
  ["arde", "microloading", "密度"],
  ["etch-stop", "footing", "footing"],
  ["notching", "undercut", "undercut"],
];
for (const [a, b, kw] of PAIRS) {
  const d = D.byId(a);
  ok(
    `${d.zh} 的診斷區分有提到「${kw}」(對比 ${D.byId(b).zh})`,
    d && d.distinguish.indexOf(kw) !== -1,
    d ? d.distinguish.slice(0, 30) + "…" : "查無"
  );
}

console.log("\n【對策 —— 每個旋鈕都要標副作用】");

ok(
  "每一條至少兩個對策",
  D.all.every((d) => d.fixes.length >= 2),
  D.all.filter((d) => d.fixes.length < 2).map((d) => `${d.id}(${d.fixes.length})`).join("、")
);
const noSide = [];
for (const d of D.all) {
  for (const f of d.fixes) {
    if (!f.knob || !f.dir || !f.why || !f.sideEffect) noSide.push(`${d.id}:${f.knob}`);
  }
}
ok(
  "每個對策都有旋鈕、方向、理由與副作用",
  noSide.length === 0,
  noSide.join("、")
);

const badKnob = [];
for (const d of D.all) {
  for (const f of d.fixes) {
    if (D.knobs.indexOf(f.knob) === -1) badKnob.push(`${d.id}:${f.knob}`);
  }
}
ok("旋鈕名稱與 2.6 的清單一致", badKnob.length === 0, badKnob.join("、"));

// 反查:每個旋鈕至少影響一條缺陷,否則清單裡有廢項
const deadKnobs = D.knobs.filter((k) => D.byKnob(k).length === 0);
ok("每個旋鈕至少影響一條缺陷", deadKnobs.length === 0, deadKnobs.join("、"));

console.log("\n【與 A18 輪廓模擬器的介面】");
const withProfile = D.all.filter((d) => d.profile);
ok("至少 6 條可在輪廓模擬器重現", withProfile.length >= 6, `${withProfile.length} 條`);
const badProfile = withProfile.filter(
  (d) =>
    !(d.profile.ion >= 0 && d.profile.ion <= 1000) ||
    !(d.profile.spread >= 0 && d.profile.spread <= 15) ||
    !(d.profile.passiv >= 0 && d.profile.passiv <= 100) ||
    !(d.profile.radical >= 0 && d.profile.radical <= 100)
);
ok("預設參數全部落在 A18 的滑桿範圍內", badProfile.length === 0, badProfile.map((d) => d.id).join("、"));

// 課文的定性宣稱:undercut 的鈍化必須低於 taper
ok(
  "undercut 的鈍化設定低於 taper(課文:undercut 是鈍化不足、taper 是鈍化過度)",
  D.byId("undercut").profile.passiv < D.byId("taper").profile.passiv,
  `undercut ${D.byId("undercut").profile.passiv} < taper ${D.byId("taper").profile.passiv}`
);
ok(
  "faceting 的離子能量在所有預設中最高(濺鍍產額角度依賴)",
  withProfile.every((d) => d.profile.ion <= D.byId("faceting").profile.ion),
  `faceting ${D.byId("faceting").profile.ion} eV`
);
ok(
  "etch-stop 的鈍化在所有預設中最高",
  withProfile.every((d) => d.profile.passiv <= D.byId("etch-stop").profile.passiv),
  `etch-stop ${D.byId("etch-stop").profile.passiv}`
);
ok("ARDE 使用多溝槽視圖", D.byId("arde").profile.multi === true);

console.log("\n【安全】");
const high = D.all.filter((d) => d.risk === "high");
ok("金屬腐蝕標記為高風險", high.some((d) => d.id === "corrosion"), high.map((d) => d.id).join("、"));

console.log("\n【查詢介面】");
ok("byId 可用", D.byId("bowing") && D.byId("bowing").cat === "profile");
ok("依分類篩選", D.filter({ cat: "profile" }).length >= 6);
ok("依旋鈕反查", D.byKnob("脈衝").length >= 3, `脈衝影響 ${D.byKnob("脈衝").length} 條`);
ok("關鍵字搜尋", D.filter({ q: "充電" }).length >= 3, `${D.filter({ q: "充電" }).length} 條`);

console.log(`\n${fail === 0 ? "✓" : "✗"} 缺陷資料 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
