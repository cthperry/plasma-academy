import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "dist/server/index.js",
  "dist/.openai/hosting.json",
  "dist/client/_headers"
];

for (const file of requiredFiles) {
  try {
    await access(path.join(root, file));
  } catch (_) {
    throw new Error(`Sites 部署封裝缺少 ${file}。`);
  }
}

const source = JSON.parse(await readFile(path.join(root, ".openai", "hosting.json"), "utf8"));
const packaged = JSON.parse(await readFile(path.join(root, "dist", ".openai", "hosting.json"), "utf8"));
if (!source.project_id || packaged.project_id !== source.project_id) {
  throw new Error("Sites 部署封裝的 project_id 與來源 hosting.json 不一致。");
}

const staticHeaders = await readFile(path.join(root, "dist", "client", "_headers"), "utf8");
const expectedRules = ["/", "/*/", "/404.html"];
const expectedHeaders = [
  "Content-Security-Policy: default-src 'self'; script-src 'self'; script-src-attr 'none'; style-src-elem 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "X-Content-Type-Options: nosniff",
  "Referrer-Policy: no-referrer",
  "Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()"
];
for (const rule of expectedRules) {
  const block = staticHeaders.match(new RegExp(`^${rule.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\r?\\n((?:[ \\t]+[^\\r\\n]+\\r?\\n?)+)`, "m"));
  if (!block || expectedHeaders.some((header) => !block[1].includes(header))) {
    throw new Error(`Sites Static Assets 安全標頭缺少或不完整：${rule}。`);
  }
}
if (/^\/\*\s*$/m.test(staticHeaders)) {
  throw new Error("Sites Static Assets 安全標頭不可用全域 /* 規則污染非 HTML 資產。");
}

console.log(`Sites 部署封裝檢查通過：${requiredFiles.join("、")}。`);
