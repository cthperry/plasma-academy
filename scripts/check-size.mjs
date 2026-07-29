import { stat } from "node:fs/promises";
import path from "node:path";

const files = [
  "assets/css/base.css",
  "assets/css/layout.css",
  "assets/css/components.css",
  "assets/js/theme-init.js",
  "assets/js/app.js",
  "assets/js/theme.js",
  "assets/js/progress-store.js",
  "assets/js/progress.js",
  "assets/js/nav.js",
  "assets/js/tooltip.js",
  "assets/js/search.js",
  "assets/js/units.js",
  "assets/js/lifecycle.js"
];

let total = 0;
for (const file of files) {
  const size = (await stat(path.join("dist/client", file))).size;
  total += size;
  console.log(`${file}: ${(size / 1024).toFixed(1)} KB`);
}

console.log(`初始 CSS/JS 預算估算: ${(total / 1024).toFixed(1)} KB`);
if (total > 70 * 1024) {
  console.error("初始資源超過 P0 暫定 70 KB 上限。");
  process.exit(1);
}
