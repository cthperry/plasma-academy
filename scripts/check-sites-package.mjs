import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "dist/server/index.js",
  "dist/.openai/hosting.json"
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

console.log(`Sites 部署封裝檢查通過：${requiredFiles.join("、")}。`);
