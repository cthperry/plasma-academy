import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { glossaryExtra } from "../src/data/glossary-extra.js";

const sourcePath = path.resolve("work/plasma-academy-src/docs/10-glossary.md");
const outPath = path.resolve("src/data/glossary.js");
const markdown = await readFile(sourcePath, "utf8");
const rows = [];

for (const line of markdown.split(/\r?\n/)) {
  if (!line.startsWith("|")) continue;
  if (line.includes("---") || line.includes("中文 | 英文")) continue;
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
  if (cells.length < 4) continue;
  const [zh, en, definition, chapter] = cells;
  if (!zh || !en || !definition || !chapter) continue;
  rows.push({
    id: slugify(`${zh}-${en}`),
    zh,
    en,
    definition,
    chapter
  });
}

for (const term of glossaryExtra) {
  rows.push({
    id: slugify(`${term.zh}-${term.en}`),
    ...term
  });
}

const body = `export const glossary = ${JSON.stringify(rows, null, 2)};\n`;
await writeFile(outPath, body);
console.log(`synced ${rows.length} glossary terms to ${path.relative(process.cwd(), outPath)}`);

function slugify(value) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
