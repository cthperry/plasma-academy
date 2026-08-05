/* ==========================================================================
   check-sitemap.mjs — 驗證 dist/sitemap.xml 與 dist/robots.txt

   docs/06-site-architecture.md 說這個架構的優點之一是「SEO 友善」——
   這支檢查確認網站地圖真的涵蓋了每一個實際建置出來的頁面(不多不少),
   而且不是一份手打之後就會過期的清單。
   ========================================================================== */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

let pass = 0;
let fail = 0;
function ok(label, cond, detail) {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
}

if (!existsSync(DIST)) {
  console.error("✗ 找不到 dist/,請先執行 npm run build");
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name === "index.html") out.push(p);
  }
  return out;
}

console.log("\n【sitemap.xml 與實際建置頁面對等】");

const realUrls = walk(DIST)
  .map((f) => f.slice(DIST.length + 1).replace(/index\.html$/, ""))
  .sort();

const sitemapXml = readFileSync(join(DIST, "sitemap.xml"), "utf8");
const SITE_URL = "https://plasma-academy.vercel.app";
const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].replace(SITE_URL + "/", ""))
  .sort();

ok(
  "sitemap 列的網址數與實際建置的頁面數一致",
  sitemapUrls.length === realUrls.length,
  `sitemap ${sitemapUrls.length} 個 / 實際 ${realUrls.length} 個`
);
ok(
  "兩份清單逐一比對完全相同(不多不少)",
  JSON.stringify(sitemapUrls) === JSON.stringify(realUrls),
  sitemapUrls.length !== realUrls.length
    ? "數量已經不同,見上一項"
    : sitemapUrls.filter((u, i) => u !== realUrls[i]).join("、")
);
ok("sitemap 不含 404.html(不該被索引)", !sitemapXml.includes("404"));
ok("sitemap 是合法 XML 宣告開頭", sitemapXml.startsWith('<?xml version="1.0"'));
ok(
  "每個 <loc> 都是完整絕對網址",
  [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].every((m) => m[1].startsWith(SITE_URL)),
  ""
);

console.log("\n【robots.txt】");

const robots = readFileSync(join(DIST, "robots.txt"), "utf8");
ok("允許全站爬取", /Allow:\s*\//.test(robots));
ok("指向 sitemap.xml 的絕對網址", robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`));

console.log(`\n${fail === 0 ? "✓" : "✗"} sitemap / robots 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
