/* ==========================================================================
   check-defect-svg.mjs — 驗證 src/data/defect-svg.js

   一份幾何 = 一份事實:每個缺陷 id 都要有專屬 SVG(不能落到 fallback
   標準溝槽),viewBox 合法,座標落在畫布內,<title> 要跟 defects.js
   的 zh/symptom 對得上 —— 不會有圖文不一致的情況。
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
vm.runInContext(readFileSync(join(ROOT, "src/data/defect-svg.js"), "utf8"), sandbox, {
  filename: "defect-svg.js",
});
const D = sandbox.window.PA.defects;

let pass = 0;
let fail = 0;
function ok(label, cond, detail) {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
}

console.log("\n【覆蓋率】");

const svgIds = D.svgIds();
const allIds = D.all.map((d) => d.id);
const missingBody = allIds.filter((id) => svgIds.indexOf(id) === -1);
ok(
  "全部 19 條缺陷都有專屬 SVG 幾何(非 fallback 標準溝槽)",
  missingBody.length === 0,
  missingBody.join("、")
);

const extraBodies = svgIds.filter((id) => allIds.indexOf(id) === -1);
ok("沒有多餘、對不到 defects.js 的幾何", extraBodies.length === 0, extraBodies.join("、"));

console.log("\n【結構合法性】");

const VB_RE = /^0 0 \d+ \d+$/;
const badViewBox = [];
const badTitle = [];
const badCoord = [];
const noPaint = [];

for (const d of D.all) {
  const svg = D.svg(d.id);
  const vbMatch = svg.match(/viewBox="([^"]+)"/);
  if (!vbMatch || !VB_RE.test(vbMatch[1])) {
    badViewBox.push(d.id);
    continue;
  }
  const [, , w, h] = vbMatch[1].split(" ").map(Number);

  const titleMatch = svg.match(/<title[^>]*>([^<]*)<\/title>/);
  const expectTitle = `${d.zh}：${d.symptom}`;
  if (!titleMatch || titleMatch[1] !== expectTitle) {
    badTitle.push(d.id);
  }

  // 掃 path/rect/line/text 座標,確認落在 viewBox 範圍內(容許遮罩延伸到邊界 0/寬度)
  const nums = [];
  for (const m of svg.matchAll(/(?:^|[ML,"])(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)) {
    nums.push([Number(m[1]), Number(m[2])]);
  }
  const outOfBounds = nums.filter(([x, y]) => x < -1 || x > w + 1 || y < -1 || y > h + 1);
  if (outOfBounds.length) badCoord.push(`${d.id}(${outOfBounds.length} 點)`);

  if (!/<(path|rect|line)\b/.test(svg)) noPaint.push(d.id);
}

ok("viewBox 格式合法(4 個非負整數)", badViewBox.length === 0, badViewBox.join("、"));
ok(
  "<title> 內容與 defects.js 的 zh + symptom 一致",
  badTitle.length === 0,
  badTitle.join("、")
);
ok("所有座標點都落在 viewBox 範圍內", badCoord.length === 0, badCoord.join("、"));
ok("每張圖至少有一個實際繪圖元素(path/rect/line)", noPaint.length === 0, noPaint.join("、"));

console.log("\n【與 CSS 主題系統的介面】");

const noThemeVar = D.all.filter((d) => !/var\(--pa-viz-|var\(--pa-surface-sunken\)/.test(D.svg(d.id)));
ok(
  "每張圖至少用一個 var(--pa-viz-* / --pa-surface-sunken) token 上色(深色模式免 JS 重繪)",
  noThemeVar.length === 0,
  noThemeVar.map((d) => d.id).join("、")
);

const hardCodedColor = D.all.filter((d) => /#[0-9a-fA-F]{3,6}\b/.test(D.svg(d.id)));
ok(
  "沒有寫死的十六進位色碼(全部走 CSS 變數,才能跟主題系統同步)",
  hardCodedColor.length === 0,
  hardCodedColor.map((d) => d.id).join("、")
);

console.log("\n【區分度 —— 呼應 check-defects.mjs 的診斷區分斷言】");

// undercut 最寬處要貼近遮罩(y 小),bowing 最寬處要在中段(y 較大)
const undercutSvg = D.svg("undercut");
const bowingSvg = D.svg("bowing");
ok(
  "undercut 與 bowing 的幾何字串不同(避免複製貼上後忘記改座標)",
  undercutSvg !== bowingSvg
);

console.log("\n【空 id / 不存在 id 的邊界行為】");
ok("不存在的 id 回傳空字串而非拋錯", D.svg("not-a-real-defect-id") === "");

console.log(`\n${fail === 0 ? "✓" : "✗"} 缺陷 SVG 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
