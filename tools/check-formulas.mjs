/* ==========================================================================
   check-formulas.mjs — 驗證 src/data/formulas.js

   公式手冊的資料是從章節內文的 .pa-formula 區塊機械抽出來的
   (tools/gen-formulas.mjs),不是另外手寫一份。這支檢查守的是抽取
   本身的正確性:數量沒有漏、id 不重複、每條都能連回原文、
   而且產生出來的檔案與原始碼真的同步(沒有人改了章節內文卻忘記重跑產生器)。
   ========================================================================== */

import { readFileSync, readdirSync, statSync } from "node:fs";
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

const before = readFileSync(join(ROOT, "src/data/formulas.js"), "utf8");
execFileSync(process.execPath, [join(ROOT, "tools/gen-formulas.mjs")], { stdio: "pipe" });
const after = readFileSync(join(ROOT, "src/data/formulas.js"), "utf8");
ok(
  "重新執行 gen-formulas.mjs 產生的內容與現存檔案一致(沒有漏跑產生器)",
  before === after
);

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(after, sandbox, { filename: "formulas.js" });
const F = sandbox.window.PA.formulas;

console.log("\n【覆蓋率】");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}
const chapterFiles = walk(join(ROOT, "src/content/level"));
let sourceCount = 0;
for (const f of chapterFiles) {
  sourceCount += (readFileSync(f, "utf8").match(/class="pa-formula"/g) || []).length;
}
ok(
  "全部章節內文的 .pa-formula 區塊都有對應資料條目",
  F.count === sourceCount,
  `原文 ${sourceCount} 個區塊 / 資料 ${F.count} 條`
);
ok("至少涵蓋 docs/06 估計的 ~45 條規模", F.count >= 40, `${F.count} 條`);

console.log("\n【結構合法性】");

const ids = F.all.map((f) => f.id);
ok("id 不重複", new Set(ids).size === ids.length, ids.filter((id, i) => ids.indexOf(id) !== i).join("、"));

const noEq = F.all.filter((f) => !f.eq || !f.eq.trim());
ok("每一條都有公式本文(eq)", noEq.length === 0);

const badUrl = F.all.filter((f) => !f.url || !/^level\/\d\/[^/]+\/$/.test(f.url));
ok("每一條的 url 都指向合法的章節頁路徑", badUrl.length === 0, badUrl.map((f) => f.id).join("、"));

const missingFile = F.all.filter((f) => {
  const p = join(ROOT, "src/content", f.url.replace(/\/$/, "") + ".html");
  try {
    statSync(p);
    return false;
  } catch {
    return true;
  }
});
ok("每一條的 url 對應的章節檔案真實存在", missingFile.length === 0, missingFile.map((f) => f.url).join("、"));

const withAnchor = F.all.filter((f) => f.anchor);
const badAnchor = withAnchor.filter((f) => {
  const p = join(ROOT, "src/content", f.url.replace(/\/$/, "") + ".html");
  const html = readFileSync(p, "utf8");
  return html.indexOf(`id="${f.anchor}"`) === -1;
});
ok(
  "有章節錨點的公式,錨點在原文檔案裡真的存在",
  badAnchor.length === 0,
  badAnchor.map((f) => `${f.id}→${f.anchor}`).join("、")
);

console.log("\n【查詢介面】");
ok("byId 可用", !!F.byId(F.all[0].id));
ok("byChapter 可用", F.byChapter("1").length > 0, `L1 共 ${F.byChapter("1").length} 條`);

console.log(`\n${fail === 0 ? "✓" : "✗"} 公式手冊資料 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
