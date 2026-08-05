/* ==========================================================================
   gen-labs.mjs — 從 docs/05-animation-spec.md 的標題 + curriculum.js 的
   模組對照,產生 src/data/labs.js(互動實驗室 /lab/ 的目錄資料)

   兩份既有的單一來源合起來就是目錄需要的一切:
     docs/05-animation-spec.md 的 `## A## — 標題 ★` 給元件的正式名稱與複雜度標記
     curriculum.js 的 modules[].labs 給每個元件屬於哪一章、章節連結是什麼
   不再手打第三份清單。

   重新產生:node tools/gen-labs.mjs
   ========================================================================== */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const specMd = readFileSync(join(ROOT, "docs/05-animation-spec.md"), "utf8");
const HEADING_RE = /^## (A\d\d) — (.+?)$/gm;

const specById = {};
let hm;
while ((hm = HEADING_RE.exec(specMd))) {
  const id = hm[1];
  let rest = hm[2].trim();
  const starMatch = /\s*(★+)\s*$/.exec(rest);
  const stars = starMatch ? starMatch[1].length : 0;
  if (starMatch) rest = rest.slice(0, starMatch.index).trim();
  specById[id] = { title: rest, stars };
}

const ccode = readFileSync(join(ROOT, "src/data/curriculum.js"), "utf8");
const cwin = {};
new Function("window", ccode)(cwin);
const curriculum = cwin.PA.curriculum;

const labs = [];
for (const m of curriculum.modules) {
  for (const id of m.labs) {
    const spec = specById[id];
    labs.push({
      id,
      title: spec ? spec.title : null,
      stars: spec ? spec.stars : 0,
      level: m.level,
      moduleId: m.id,
      moduleTitle: m.title,
      url: m.url,
    });
  }
}
labs.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));

function esc(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
}
function jsField(v) {
  return v == null ? "null" : typeof v === "number" ? String(v) : `'${esc(v)}'`;
}

const lines = labs.map(
  (l) =>
    `  { id: ${jsField(l.id)}, title: ${jsField(l.title)}, stars: ${jsField(l.stars)}, level: ${jsField(
      l.level
    )}, moduleId: ${jsField(l.moduleId)}, moduleTitle: ${jsField(l.moduleTitle)}, url: ${jsField(l.url)} }`
);

const out = `/* ==========================================================================
   labs.js — 互動實驗室目錄(/lab/)
   自動產生,請勿手改。來源:docs/05-animation-spec.md 的標題 +
   data/curriculum.js 的模組對照。重新產生:node tools/gen-labs.mjs
   共 ${labs.length} 個元件
   ========================================================================== */

(function (PA) {
  "use strict";

  var LABS = [
${lines.join(",\n")}
  ];

  function byId(id) {
    for (var i = 0; i < LABS.length; i++) {
      if (LABS[i].id === id) return LABS[i];
    }
    return null;
  }

  function byLevel(no) {
    return LABS.filter(function (l) {
      return l.level === no;
    });
  }

  PA.labs = {
    all: LABS,
    byId: byId,
    byLevel: byLevel,
    count: LABS.length
  };
})((window.PA = window.PA || {}));
`;

writeFileSync(join(ROOT, "src/data/labs.js"), out, "utf8");
console.log(`✓ 產生 ${labs.length} 個元件目錄 → src/data/labs.js`);
