/* ==========================================================================
   check-links.mjs — 死鏈檢查
   掃描 dist/ 內所有 HTML 的內部連結與資源引用,確認目標存在。
   docs/11 品質門檻:「全站連結無死鏈(建置時自動檢查)」
   ========================================================================== */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, relative } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

if (!existsSync(DIST)) {
  console.error("✗ 找不到 dist/,請先執行 npm run build");
  process.exit(1);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(DIST).filter((f) => f.endsWith(".html"));
const broken = [];
let checked = 0;

for (const file of files) {
  const html = readFileSync(file, "utf8");
  const dir = dirname(file);
  const rel = relative(DIST, file);

  const refs = [
    ...[...html.matchAll(/\bhref="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/\bsrc="([^"]+)"/g)].map((m) => m[1]),
  ];

  for (const ref of refs) {
    // 外部、錨點、data URI、mailto 不查
    if (/^(https?:|mailto:|tel:|data:|#|\/\/)/.test(ref)) continue;

    const [pathPart] = ref.split("#");
    if (!pathPart) continue;

    checked++;
    let target = resolve(dir, pathPart);
    // 目錄式 URL → index.html
    if (pathPart.endsWith("/") || !pathPart.split("/").pop().includes(".")) {
      target = join(target, "index.html");
    }

    if (!existsSync(target)) {
      broken.push({ file: rel, ref, target: relative(DIST, target) });
    }
  }
}

if (broken.length) {
  console.log(`\n✗ 發現 ${broken.length} 個死鏈(檢查 ${checked} 個連結 / ${files.length} 頁):\n`);
  for (const b of broken) {
    console.log(`  ${b.file}`);
    console.log(`    → ${b.ref}  (找不到 ${b.target})`);
  }
  console.log("");
  process.exit(1);
}

console.log(`✓ 連結檢查:${checked} 個連結、${files.length} 頁,無死鏈\n`);
