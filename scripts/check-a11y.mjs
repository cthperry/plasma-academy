import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const client = path.resolve("dist/client");
const htmlFiles = [];
await walk(client);
const failures = [];

for (const file of htmlFiles) {
  const rel = path.relative(client, file);
  const html = await readFile(file, "utf8");

  if (!/<html[^>]+lang="zh-Hant"/.test(html)) failures.push(`${rel}: html lang 應為 zh-Hant`);
  if (!/<title>[^<]+<\/title>/.test(html)) failures.push(`${rel}: 缺少 title`);
  const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1Count !== 1) failures.push(`${rel}: h1 應剛好 1 個，目前 ${h1Count}`);
  if (!/class="skip-link"/.test(html)) failures.push(`${rel}: 缺少 skip link`);

  for (const match of html.matchAll(/<button([^>]*)>(.*?)<\/button>/gs)) {
    const attrs = match[1];
    const text = stripTags(match[2]).trim();
    if (!text && !/aria-label=/.test(attrs)) failures.push(`${rel}: button 缺少可辨識文字或 aria-label`);
  }

  for (const match of html.matchAll(/<canvas([^>]*)>/g)) {
    const attrs = match[1];
    if (!/aria-label=/.test(attrs) && !/aria-labelledby=/.test(attrs)) failures.push(`${rel}: canvas 缺少 aria-label 或 aria-labelledby`);
  }

  for (const match of html.matchAll(/<img([^>]*)>/g)) {
    const attrs = match[1];
    if (!/\salt=/.test(attrs)) failures.push(`${rel}: img 缺少 alt`);
  }

  const headings = [...html.matchAll(/<h([1-6])[\s>]/g)].map((match) => Number(match[1]));
  for (let index = 1; index < headings.length; index++) {
    if (headings[index] - headings[index - 1] > 1) {
      failures.push(`${rel}: heading 從 h${headings[index - 1]} 跳到 h${headings[index]}`);
    }
  }

  for (const match of html.matchAll(/<input([^>]*)>/g)) {
    const attrs = match[1];
    if (/type="hidden"/.test(attrs)) continue;
    if (/aria-label=|aria-labelledby=/.test(attrs)) continue;
    const id = attrs.match(/\sid="([^"]+)"/)?.[1];
    if (id && html.includes(`for="${id}"`)) continue;
    const before = html.slice(Math.max(0, match.index - 120), match.index);
    const after = html.slice(match.index, Math.min(html.length, match.index + 120));
    if (!before.includes("<label") || !after.includes("</label>")) failures.push(`${rel}: input 缺少 label 關聯`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`無障礙靜態檢查通過：${htmlFiles.length} 個 HTML。`);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    if (entry.isFile() && entry.name.endsWith(".html")) htmlFiles.push(full);
  }
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, " ");
}
