import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const client = path.resolve("dist/client");
const htmlFiles = [];
await walk(client);
let failed = false;

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const links = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const link of links) {
    if (/^(https?:|mailto:|#|data:)/.test(link)) continue;
    const clean = link.split("#")[0].split("?")[0];
    if (!clean) continue;
    const target = clean.startsWith("/")
      ? path.join(client, clean)
      : path.join(path.dirname(file), clean);
    const resolved = clean.endsWith("/") ? path.join(target, "index.html") : target;
    try {
      await access(resolved);
    } catch (_) {
      console.error(`死鏈: ${path.relative(client, file)} -> ${link}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log(`連結檢查通過：${htmlFiles.length} 個 HTML。`);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    if (entry.isFile() && entry.name.endsWith(".html")) htmlFiles.push(full);
  }
}
