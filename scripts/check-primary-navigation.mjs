import { readFile } from "node:fs/promises";
import path from "node:path";
import { curriculum } from "../src/data/curriculum.js";

const failures = [];
const client = path.resolve("dist/client");
const home = await readFile(path.join(client, "index.html"), "utf8");
const chapter = await readFile(path.join(client, "level/1/1-1-fourth-state/index.html"), "utf8");
const sidebar = chapter.match(/<aside class="chapter-sidebar">([\s\S]*?)<\/aside>/)?.[1] ?? "";
const l1Modules = curriculum.levels.find((level) => level.id === 1).modules;

if (home.includes("P0 骨架狀態") || home.includes('class="system-panel"')) {
  failures.push("首頁仍顯示 P0 骨架狀態區塊。");
}

for (const module of l1Modules) {
  const link = `href="${module.href}">${module.id} ${module.title}</a>`;
  if (!sidebar.includes(link)) failures.push(`1.1 課程目錄缺少 ${module.id} ${module.title}。`);
}

const linkPositions = l1Modules.map((module) => sidebar.indexOf(`href="${module.href}"`));
if (linkPositions.some((position) => position < 0) || linkPositions.some((position, index) => index > 0 && position <= linkPositions[index - 1])) {
  failures.push("1.1 課程目錄沒有依 1.1 至 1.6 排列。");
}
if (!sidebar.includes(`class="current" href="${l1Modules[0].href}"`)) failures.push("1.1 課程目錄未正確標示目前章節。");
if (sidebar.includes("L1 模組列表") || sidebar.includes("互動實驗室")) failures.push("1.1 課程目錄仍混入非章節入口。");

if (failures.length) {
  console.error(`主要導覽檢查失敗（${failures.length}）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`主要導覽檢查通過：首頁無 P0 狀態面板，1.1 側欄依序顯示 ${l1Modules.length} 章。`);
