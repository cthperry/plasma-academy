/* ==========================================================================
   check-gases.mjs — 驗證 src/data/gases.js

   氣體資料是 A09/A10/A11 與 2.2 全章的共同來源,錯一個欄位會擴散到很多地方。
   這支檢查盯三件事:
     1. 結構完整 —— 每一筆的必填欄位都在,家族/用途/危害等級都是合法值
     2. F/C 比與分子式一致 —— 課文寫的比值必須等於程式算出來的
     3. 與 docs/02 §2.2 表格對得上 —— 課文寫幾就是幾
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(ROOT, "src/data/gases.js"), "utf8"), sandbox, {
  filename: "gases.js",
});
const G = sandbox.window.PA.gases;

let pass = 0;
let fail = 0;

function ok(label, cond, detail) {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
}

console.log("\n【結構】");

ok("共 32 種氣體", G.count === 32, `實得 ${G.count}`);

const familyKeys = G.families.map((f) => f.key);
const useKeys = G.uses.map((u) => u.key);
const REQUIRED = [
  "id", "formula", "zh", "en", "family", "mw", "bp", "ie",
  "radicals", "uses", "flow", "hazard", "ok", "no", "products",
  "scrubber", "faults", "note",
];

const missing = [];
const badFamily = [];
const badUse = [];
const badHazard = [];
const badNumber = [];

for (const g of G.all) {
  for (const k of REQUIRED) {
    if (g[k] === undefined || g[k] === null) missing.push(`${g.formula}.${k}`);
  }
  if (familyKeys.indexOf(g.family) === -1) badFamily.push(`${g.formula}:${g.family}`);
  for (const u of g.uses || []) {
    if (useKeys.indexOf(u) === -1) badUse.push(`${g.formula}:${u}`);
  }
  if (!g.hazard || G.hazardLevels.indexOf(g.hazard.level) === -1) {
    badHazard.push(`${g.formula}:${g.hazard && g.hazard.level}`);
  }
  if (!(g.mw > 0) || !isFinite(g.bp) || !(g.ie > 0)) badNumber.push(g.formula);
}

ok("必填欄位齊全", missing.length === 0, missing.slice(0, 5).join("、"));
ok("家族 key 全部合法", badFamily.length === 0, badFamily.join("、"));
ok("用途 key 全部合法", badUse.length === 0, badUse.join("、"));
ok("危害等級全部合法", badHazard.length === 0, badHazard.join("、"));
ok("分子量 / 沸點 / 游離能皆為合理數值", badNumber.length === 0, badNumber.join("、"));

const ids = G.all.map((g) => g.id);
ok("id 不重複", new Set(ids).size === ids.length);
ok("分子式不重複", new Set(G.all.map((g) => g.formula)).size === G.count);
ok(
  "id 皆為小寫英數",
  ids.every((i) => /^[a-z0-9]+$/.test(i)),
  ids.filter((i) => !/^[a-z0-9]+$/.test(i)).join("、")
);

console.log("\n【F/C 比 — 必須與 docs/02 §2.2.2 表格一致】");

// 課文表格。程式的 fc 由分子式推算,兩邊對不上就是有一邊寫錯。
for (const [formula, expected] of [
  ["CF4", 4.0],
  ["CHF3", 3.0],
  ["C2F6", 3.0],
  ["CH2F2", 2.0],
  ["CH3F", 1.0],
  ["C4F8", 2.0],
  ["C4F6", 1.5],
  ["C5F8", 1.6],
]) {
  const g = G.byFormula(formula);
  ok(
    `${formula} 的 F/C = ${expected}`,
    g && Math.abs(g.fc - expected) < 0.05,
    g ? `程式算出 ${g.fc.toFixed(2)}` : "查無此氣體"
  );
}

const noFC = ["SF6", "NF3", "F2", "Cl2", "O2", "N2", "H2", "CO", "CH4"];
ok(
  "無碳或無氟的氣體不給 F/C 比",
  noFC.every((f) => {
    const g = G.byFormula(f);
    return g && g.fc === null;
  }),
  noFC.filter((f) => G.byFormula(f) && G.byFormula(f).fc !== null).join("、")
);

console.log("\n【安全與環保 — 與 docs/02 §2.2.4 分級一致】");

for (const [formula, level] of [
  ["SiH4", "極高"],
  ["B2H6", "極高"],
  ["Cl2", "高"],
  ["HBr", "高"],
  ["BCl3", "高"],
  ["WF6", "高"],
  ["NF3", "高"],
  ["F2", "高"],
  ["Ar", "低"],
  ["He", "低"],
  ["N2", "低"],
  ["O2", "低"],
]) {
  const g = G.byFormula(formula);
  ok(`${formula} 危害分級 ${level}`, g && g.hazard.level === level, g && g.hazard.level);
}

const pyro = G.all.filter((g) => g.hazard.tags.indexOf("自燃") !== -1);
ok(
  "自燃氣體一律列為極高且需燃燒式 scrubber",
  pyro.length > 0 && pyro.every((g) => g.hazard.level === "極高" && g.scrubber.indexOf("燃燒") !== -1),
  pyro.map((g) => g.formula).join("、")
);

// GWP 排序:SF₆ 最高,這在 docs/02 §2.2.3 的環保註記裡寫死了
const withGwp = G.all.filter((g) => g.hazard.gwp);
ok("有 GWP 標註的氣體 ≥ 10 種", withGwp.length >= 10, `實得 ${withGwp.length}`);
const topGwp = withGwp.slice().sort((a, b) => b.hazard.gwp - a.hazard.gwp)[0];
ok("GWP 最高者為 SF₆", topGwp.formula === "SF6", `實得 ${topGwp.formula} = ${topGwp.hazard.gwp}`);
ok(
  "NF₃ 的 GWP 高於 C₂F₆(取代它的理由是逃逸率而非 GWP)",
  G.byFormula("NF3").hazard.gwp > G.byFormula("C2F6").hazard.gwp,
  `NF₃ ${G.byFormula("NF3").hazard.gwp} vs C₂F₆ ${G.byFormula("C2F6").hazard.gwp}`
);

console.log("\n【物理量健全性】");

// 分子量排序抽查 —— 打錯數字最常見的表現就是排序不對
const heaviest = G.all.slice().sort((a, b) => b.mw - a.mw)[0];
ok("分子量最大者為 WF₆", heaviest.formula === "WF6", `${heaviest.formula} = ${heaviest.mw}`);
const lightest = G.all.slice().sort((a, b) => a.mw - b.mw)[0];
ok("分子量最小者為 H₂", lightest.formula === "H2", `${lightest.formula} = ${lightest.mw}`);

// 游離能:He 最高、TEOS 最低(大分子容易被游離)
const ieMax = G.all.slice().sort((a, b) => b.ie - a.ie)[0];
ok("游離能最高者為 He(24.6 eV)", ieMax.formula === "He", `${ieMax.formula} = ${ieMax.ie}`);
ok(
  "惰性氣體游離能隨原子序遞減 He > Ar > Kr > Xe",
  G.byFormula("He").ie > G.byFormula("Ar").ie &&
    G.byFormula("Ar").ie > G.byFormula("Kr").ie &&
    G.byFormula("Kr").ie > G.byFormula("Xe").ie
);

// 鍵能對照:課文用這幾個數字解釋「為什麼 PECVD SiN 用 NH₃ 不用 N₂」
ok(
  "N≡N(945)遠高於 N–H(391)—— PECVD 用 NH₃ 的理由",
  G.byFormula("N2").bond.kJ === 945 && G.byFormula("NH3").bond.kJ === 391
);
ok(
  "N–F(301)低於 C–F(485)—— NF₃ 易解離的理由",
  G.byFormula("NF3").bond.kJ < G.byFormula("CF4").bond.kJ
);
ok(
  "C≡O(1077)是資料庫中最高的鍵能",
  G.all.filter((g) => g.bond).every((g) => g.bond.kJ <= G.byFormula("CO").bond.kJ)
);

// 沸點:室溫附近的氣體必須被標出來(管路要伴熱)
const nearRT = G.all.filter((g) => g.bp > 0 && g.bp < 60);
ok(
  "沸點高於 0 °C 的氣體都在 faults 或 flow 提到伴熱/汽化/凝結",
  nearRT.every((g) =>
    /伴熱|汽化|凝結|液(態|體)/.test(g.faults.join("") + g.flow + g.note)
  ),
  nearRT.map((g) => `${g.formula}(${g.bp}°C)`).join("、")
);

console.log("\n【查詢介面】");
ok("byId 可用", G.byId("c4f8") && G.byId("c4f8").formula === "C4F8");
ok("byFormula 可用", G.byFormula("C4F8") && G.byFormula("C4F8").id === "c4f8");
ok("依家族篩選", G.filter({ family: "fc" }).length === 8, `氟碳系 ${G.filter({ family: "fc" }).length} 種`);
ok("依用途篩選", G.filter({ use: "clean" }).length >= 4);
ok("依危害篩選", G.filter({ hazard: "極高" }).length === 2);
ok("關鍵字搜尋", G.filter({ q: "聚合" }).length >= 3);

console.log(`\n${fail === 0 ? "✓" : "✗"} 氣體資料 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
