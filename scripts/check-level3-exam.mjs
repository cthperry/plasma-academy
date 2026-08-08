import { l3Diagrams } from "../src/data/l3-diagrams.js";
import { level3ExamSpec, level3Questions } from "../src/data/quiz/level-3.js";
import { chapterRoute } from "../src/assets/js/exam.js";

const failures = [];
const ids = new Set();
const diagramPaths = new Set(l3Diagrams.map((item) => `/assets/svg/l3/${item.id}.svg`));
if (level3Questions.length !== 116) failures.push(`L3 題庫應為 116 題，目前 ${level3Questions.length} 題。`);
if (level3ExamSpec.durationMinutes !== 70) failures.push(`L3 測驗時間應為 70 分鐘，目前 ${level3ExamSpec.durationMinutes} 分鐘。`);
if (JSON.stringify(level3ExamSpec.draw) !== JSON.stringify({ single: 12, multi: 5, graphic: 12, scenario: 11 })) failures.push(`L3 抽題規格錯誤：${JSON.stringify(level3ExamSpec.draw)}。`);
if (Object.values(level3ExamSpec.draw).reduce((sum, count) => sum + count, 0) !== 40) failures.push("L3 正式測驗應抽 40 題。");
for (const [type, count] of Object.entries(level3ExamSpec.draw)) {
  const available = level3Questions.filter((item) => item.type === type).length;
  if (available < count) failures.push(`${type} 題型只有 ${available} 題，少於抽題需求 ${count}。`);
}
for (const question of level3Questions) {
  if (ids.has(question.id)) failures.push(`題目 ID 重複：${question.id}。`);
  ids.add(question.id);
  if (!/^L3-\d{3}$/.test(question.id) || !/^3\.[1-8]$/.test(question.chapter)) failures.push(`${question.id} 的 ID 或章節格式錯誤。`);
  if (!question.question || !question.explanation || !question.reference || !question.tags?.length) failures.push(`${question.id} 缺少題幹、解析、參考章節或標籤。`);
  const correct = question.options?.filter((item) => item.correct) ?? [];
  const wrong = question.options?.filter((item) => !item.correct) ?? [];
  if (!correct.length || !wrong.length || question.options.some((item) => !item.why)) failures.push(`${question.id} 的選項、正解或逐項解析不完整。`);
  if (question.type !== "multi" && correct.length !== 1) failures.push(`${question.id} 非多選題卻有 ${correct.length} 個正解。`);
  if (question.type === "graphic" && (!diagramPaths.has(question.image) || !question.imageAlt)) failures.push(`${question.id} 圖形題未連到有效 L3 SVG。`);
}
const pcbQuestions = level3Questions.filter((question) => question.chapter === "3.8");
if (pcbQuestions.length !== 21) failures.push(`3.8 應有 21 題題庫覆蓋，目前 ${pcbQuestions.length} 題。`);
const pcbDiagramIds = new Set(["l3-46", "l3-47", "l3-48", "l3-49"]);
const pcbDiagrams = l3Diagrams.filter((diagram) => diagram.chapter === "3-8");
const pcbGraphicQuestions = pcbQuestions.filter((question) => question.type === "graphic");
if (pcbDiagrams.length !== 4 || pcbDiagrams.some((diagram) => !pcbDiagramIds.has(diagram.id) || !diagram.type.startsWith("pcb-"))) failures.push("3.8 必須有四張 PCB 專用語意圖解。");
if (pcbGraphicQuestions.length !== 4 || new Set(pcbGraphicQuestions.map((question) => question.image)).size !== 4 || pcbGraphicQuestions.some((question) => !pcbDiagramIds.has(question.image?.split("/").at(-1)?.replace(".svg", "")))) failures.push("3.8 四題圖形題必須各自使用一張 PCB 專用圖解。");
if (chapterRoute("3.8") !== "/level/3/3-8-pcb-desmear/") failures.push("3.8 測驗解析回鏈錯誤。");
const requiredPcbTags = ["smear-cause", "latent-reliability", "desmear-etchback", "oxygen-glass", "sif4", "cf4-optimum", "excess-cf4", "depth-flushness", "wet-dry", "panel-uniformity", "pfc-abatement"];
for (const tag of requiredPcbTags) if (!pcbQuestions.some((question) => question.tags.includes(tag))) failures.push(`3.8 題庫缺少 ${tag} 概念。`);
if (failures.length) {
  console.error(`L3 題庫檢查失敗（${failures.length} 項）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
const distribution = Object.fromEntries(["single", "multi", "graphic", "scenario"].map((type) => [type, level3Questions.filter((item) => item.type === type).length]));
console.log(`L3 題庫檢查通過：116/116，題型 ${JSON.stringify(distribution)}。`);
