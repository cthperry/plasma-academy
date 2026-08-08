import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { validateHtmlSecurity } from "./lib/html-security.mjs";

const client = path.resolve("dist/client");
const htmlFiles = [];
await walk(client);
const failures = [];

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  failures.push(...validateHtmlSecurity(html, path.relative(client, file)));
}

if (failures.length) {
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`HTML 安全檢查通過：${htmlFiles.length} 份文件沒有 inline executable code。`);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(full);
    if (entry.isFile() && entry.name.endsWith(".html")) htmlFiles.push(full);
  }
}
