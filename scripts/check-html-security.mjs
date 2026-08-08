import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const client = path.resolve("dist/client");
const htmlFiles = [];
await walk(client);
const failures = [];
const META_CSP = "default-src 'self'; script-src 'self'; script-src-attr 'none'; style-src-elem 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'";
const checks = [
  [/<script\b(?![^>]*\bsrc=)[^>]*>/gi, "inline script"],
  [/<style\b/gi, "inline style element"],
  [/\sstyle\s*=/gi, "inline style attribute"],
  [/\son[a-z]+\s*=/gi, "inline event handler"],
  [/\beval\s*\(/g, "eval"],
  [/\bnew\s+Function\b/g, "new Function"]
];

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  if (!html.includes(`<meta http-equiv="Content-Security-Policy" content="${META_CSP}">`)) {
    failures.push(`${path.relative(client, file)} 缺少靜態 HTML CSP meta。`);
  }
  if (!html.includes('<meta name="referrer" content="no-referrer">')) {
    failures.push(`${path.relative(client, file)} 缺少 no-referrer meta。`);
  }
  for (const [pattern, label] of checks) {
    pattern.lastIndex = 0;
    if (pattern.test(html)) failures.push(`${path.relative(client, file)} 含有禁止的 ${label}。`);
  }
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
