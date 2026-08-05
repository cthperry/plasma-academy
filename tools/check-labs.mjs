/* ==========================================================================
   check-labs.mjs — 驗證 src/data/labs.js

   互動實驗室目錄(/lab/)是從兩份既有的單一來源(docs/05 的標題、
   curriculum.js 的模組對照)合出來的,不是第三份手打清單。這支檢查守的是
   合併本身沒出錯:數量與課綱完全對等、每個元件都有標題、
   每個連回的章節網址都真實存在。
   ========================================================================== */

import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0;
let fail = 0;
function ok(label, cond, detail) {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
}

console.log("\n【產生器與資料同步】");

const before = readFileSync(join(ROOT, "src/data/labs.js"), "utf8");
execFileSync(process.execPath, [join(ROOT, "tools/gen-labs.mjs")], { stdio: "pipe" });
const after = readFileSync(join(ROOT, "src/data/labs.js"), "utf8");
ok("重新執行 gen-labs.mjs 產生的內容與現存檔案一致(沒有漏跑產生器)", before === after);

const sandbox = { window: {} };
vm.createContext(sandbox);

const ccode = readFileSync(join(ROOT, "src/data/curriculum.js"), "utf8");
vm.runInContext(ccode, sandbox, { filename: "curriculum.js" });
vm.runInContext(after, sandbox, { filename: "labs.js" });
const L = sandbox.window.PA.labs;
const curriculum = sandbox.window.PA.curriculum;

console.log("\n【與課綱、docs/05 對等】");

const curriculumLabIds = curriculum.modules.flatMap((m) => m.labs).sort();
const dataLabIds = L.all.map((l) => l.id).slice().sort();
ok(
  "目錄的元件清單與課綱 modules[].labs 完全一致(不多不少)",
  JSON.stringify(curriculumLabIds) === JSON.stringify(dataLabIds),
  `課綱 ${curriculumLabIds.length} 個 / 目錄 ${dataLabIds.length} 個`
);

const specMd = readFileSync(join(ROOT, "docs/05-animation-spec.md"), "utf8");
const specIds = [...specMd.matchAll(/^## (A\d\d) —/gm)].map((m) => m[1]).sort();
ok(
  "目錄的元件清單與 docs/05 的標題數一致",
  JSON.stringify(specIds) === JSON.stringify(dataLabIds),
  `docs/05 ${specIds.length} 個 / 目錄 ${dataLabIds.length} 個`
);

console.log("\n【結構合法性】");

const ids = L.all.map((l) => l.id);
ok("id 不重複", new Set(ids).size === ids.length);
ok(
  "id 皆為 A + 兩位數字",
  ids.every((id) => /^A\d\d$/.test(id)),
  ids.filter((id) => !/^A\d\d$/.test(id)).join("、")
);

const noTitle = L.all.filter((l) => !l.title);
ok("每一個都有從 docs/05 抽到標題", noTitle.length === 0, noTitle.map((l) => l.id).join("、"));

const missingFile = L.all.filter((l) => {
  const p = join(ROOT, "src/content", l.url.replace(/\/$/, "") + ".html");
  try {
    statSync(p);
    return false;
  } catch {
    return true;
  }
});
ok("每一個的 url 對應的章節檔案真實存在", missingFile.length === 0, missingFile.map((l) => l.id).join("、"));

const badLevel = L.all.filter((l) => ![1, 2, 3, 4].includes(l.level));
ok("level 都落在 1–4", badLevel.length === 0, badLevel.map((l) => l.id).join("、"));

console.log("\n【查詢介面】");
ok("byId 可用", !!L.byId(L.all[0].id));
ok("byLevel 可用", L.byLevel(1).length > 0, `L1 共 ${L.byLevel(1).length} 個`);

console.log(`\n${fail === 0 ? "✓" : "✗"} 互動實驗室目錄 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
