import { gzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { staticModuleSpecifiers } from "./lib/module-dependencies.mjs";

const client = path.resolve("dist/client");
const homepage = path.join(client, "__pages", "index.html");
const resources = new Map([["/", homepage]]);
const html = await readFile(homepage, "utf8");

for (const match of html.matchAll(/<link\b[^>]*\b(?:rel="(?:stylesheet|icon)"[^>]*href|href="([^"]+)"[^>]*rel="(?:stylesheet|icon)")[^>]*>/gi)) {
  const href = match[0].match(/\bhref="([^"]+)"/)?.[1];
  if (href) addUrl(href, homepage);
}
for (const match of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/gi)) addUrl(match[1], homepage);

const pendingJavaScript = [...resources.entries()].filter(([url]) => url.endsWith(".js"));
for (let index = 0; index < pendingJavaScript.length; index += 1) {
  const [url, file] = pendingJavaScript[index];
  const source = await readFile(file, "utf8");
  for (const specifier of await staticModuleSpecifiers(source)) {
    const dependencyUrl = resolveUrl(specifier, url);
    if (!resources.has(dependencyUrl)) {
      addUrl(dependencyUrl, file);
      pendingJavaScript.push([dependencyUrl, resources.get(dependencyUrl)]);
    }
  }
}

let rawTotal = 0;
let gzipTotal = 0;
const rows = [];
for (const [url, file] of resources) {
  const content = await readFile(file);
  const gzip = gzipSync(content).byteLength;
  rawTotal += content.byteLength;
  gzipTotal += gzip;
  rows.push({ resource: url, rawBytes: content.byteLength, gzipBytes: gzip });
}

console.table(rows.sort((a, b) => a.resource.localeCompare(b.resource)));
console.log(`首頁首載依賴圖：${rows.length} 項，raw ${(rawTotal / 1024).toFixed(1)} KB，gzip ${(gzipTotal / 1024).toFixed(1)} KB。`);
if (gzipTotal >= 120 * 1024) {
  console.error(`首頁 gzip critical path 必須小於 120 KB，目前 ${(gzipTotal / 1024).toFixed(1)} KB。`);
  process.exit(1);
}

function addUrl(url, importer) {
  if (/^(?:https?:|data:|#)/.test(url)) return;
  const normalized = url.startsWith("/") ? url : resolveUrl(url, routeForFile(importer));
  resources.set(normalized, path.join(client, normalized.replace(/^\//, "")));
}

function resolveUrl(specifier, importerUrl) {
  if (specifier.startsWith("/")) return specifier;
  return new URL(specifier, `https://local.test${path.posix.dirname(importerUrl)}/`).pathname;
}

function routeForFile(file) {
  const relative = path.relative(client, file).split(path.sep).join("/");
  return `/${relative}`;
}
