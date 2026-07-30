import { l3Diagrams } from "../src/data/l3-diagrams.js";
import { level3ExamSpec, level3Questions } from "../src/data/quiz/level-3.js";

const failures = [];
const ids = new Set();
const diagramPaths = new Set(l3Diagrams.map((item) => `/assets/svg/l3/${item.id}.svg`));
if (level3Questions.length !== 95) failures.push(`L3 題庫應為 95 題，目前 ${level3Questions.length} 題。`);
if (Object.values(level3ExamSpec.draw).reduce((sum, count) => sum + count, 0) !== 35) failures.push("L3 正式測驗應抽 35 題。");
for (const [type, count] of Object.entries(level3ExamSpec.draw)) {
  const available = level3Questions.filter((item) => item.type === type).length;
  if (available < count) failures.push(`${type} 題型只有 ${available} 題，少於抽題需求 ${count}。`);
}
for (const question of level3Questions) {
  if (ids.has(question.id)) failures.push(`題目 ID 重複：${question.id}。`);
  ids.add(question.id);
  if (!/^L3-\d{3}$/.test(question.id) || !/^3\.[1-7]$/.test(question.chapter)) failures.push(`${question.id} 的 ID 或章節格式錯誤。`);
  if (!question.question || !question.explanation || !question.reference || !question.tags?.length) failures.push(`${question.id} 缺少題幹、解析、參考章節或標籤。`);
  const correct = question.options?.filter((item) => item.correct) ?? [];
  const wrong = question.options?.filter((item) => !item.correct) ?? [];
  if (!correct.length || !wrong.length || question.options.some((item) => !item.why)) failures.push(`${question.id} 的選項、正解或逐項解析不完整。`);
  if (question.type !== "multi" && correct.length !== 1) failures.push(`${question.id} 非多選題卻有 ${correct.length} 個正解。`);
  if (question.type === "graphic" && (!diagramPaths.has(question.image) || !question.imageAlt)) failures.push(`${question.id} 圖形題未連到有效 L3 SVG。`);
}
if (failures.length) {
  console.error(`L3 題庫檢查失敗（${failures.length} 項）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
const distribution = Object.fromEntries(["single", "multi", "graphic", "scenario"].map((type) => [type, level3Questions.filter((item) => item.type === type).length]));
console.log(`L3 題庫檢查通過：95/95，題型 ${JSON.stringify(distribution)}。`);
