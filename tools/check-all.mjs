/* ==========================================================================
   check-all.mjs — 完整品質門

   依序執行,任一失敗即中止。對應 docs/11-build-roadmap.md 的品質門檻。
   用法:npm run check
   ========================================================================== */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createServer } from "node:http";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const STEPS = [
  ["物理模型與課文數值一致", "tools/check-model.mjs"],
  ["氣體資料與課文表格一致", "tools/check-gases.mjs"],
  ["色彩對比(深淺兩套主題)", "tools/check-contrast.mjs"],
  ["建置", "build/build.mjs"],
  ["死鏈", "tools/check-links.mjs"],
];

function run(label, script, env) {
  console.log(`\n════ ${label} ════`);
  const r = spawnSync(process.execPath, [join(ROOT, script)], {
    stdio: "inherit",
    cwd: ROOT,
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) {
    console.error(`\n✗ 品質門在「${label}」失敗\n`);
    process.exit(1);
  }
}

for (const [label, script] of STEPS) run(label, script);

// 瀏覽器煙霧測試需要一個伺服器 —— 挑一個未佔用的埠自動起停
const PORT = 8000 + Math.floor(Math.random() * 900);

console.log(`\n════ 瀏覽器煙霧測試(埠 ${PORT})════`);
const child = (await import("node:child_process")).spawn(
  process.execPath,
  [join(ROOT, "tools/serve.mjs"), String(PORT)],
  { cwd: ROOT, stdio: "ignore", detached: false }
);

await new Promise((r) => setTimeout(r, 1200));

const smoke = spawnSync(process.execPath, [join(ROOT, "tools/smoke.mjs")], {
  stdio: "inherit",
  cwd: ROOT,
  env: { ...process.env, BASE_URL: `http://localhost:${PORT}` },
});

child.kill();

if (smoke.status !== 0) {
  console.error("\n✗ 品質門在「瀏覽器煙霧測試」失敗\n");
  process.exit(1);
}

console.log("\n✓ 品質門全數通過\n");
