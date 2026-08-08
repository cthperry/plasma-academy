import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "dist/server/index.js",
  "dist/.openai/hosting.json",
  "dist/client/__pages/index.html",
  "dist/client/__pages/404.html"
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

try {
  await access(path.join(root, "dist", "client", "index.html"));
  throw new Error("Sites 公開資產根目錄不可保留 index.html，否則正常 HTML 會繞過 Worker 安全標頭。");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

console.log(`Sites 部署封裝檢查通過：${requiredFiles.join("、")}。`);
