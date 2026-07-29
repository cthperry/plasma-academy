import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const client = path.resolve("dist/client");
const pages = [
  "/",
  "/level/1/",
  "/level/1/1-1-fourth-state/",
  "/lab/",
  "/progress/",
  "/glossary/",
  "/formulas/"
];

function tokenize(text) {
  const lower = text.toLowerCase();
  const english = lower.match(/[a-z0-9_+-]+/g) ?? [];
  const chinese = Array.from(lower.matchAll(/[\u4e00-\u9fff]+/g)).flatMap(([chunk]) => {
    const chars = Array.from(chunk);
    return chars.length < 2 ? chars : chars.slice(0, -1).map((char, index) => `${char}${chars[index + 1]}`);
  });
  return [...new Set([...english, ...chinese])];
}

const docs = [];
for (const route of pages) {
  const html = await readFile(path.join(client, route, "index.html"), "utf8");
  const title = html.match(/<title>(.*?)<\/title>/)?.[1] ?? route;
  docs.push({ title, url: route, text: html.replace(/<[^>]+>/g, " ") });
}

const index = {};
docs.forEach((doc, docId) => {
  for (const token of tokenize(`${doc.title} ${doc.text}`)) {
    index[token] ??= [];
    index[token].push(docId);
  }
});

await writeFile(path.join(client, "assets/search-index.json"), JSON.stringify({
  version: 1,
  docs: docs.map(({ title, url }) => ({ title, url })),
  index
}, null, 2));
