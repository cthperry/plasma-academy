import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { curriculum } from "../src/data/curriculum.js";
import { level4ExamSpec, level4Questions } from "../src/data/quiz/level-4.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const expectedDraw = { single: 8, multi: 4, numeric: 3, graphic: 5, scenario: 10 };
const expectedDisclaimer = "本證書由學習者本機產生，供內部訓練紀錄參考，非第三方認證。";
const ids = new Set();

if (level4Questions.length !== 85) failures.push(`L4 題庫應為 85 題，目前 ${level4Questions.length} 題。`);
if (level4ExamSpec.durationMinutes !== 60 || level4ExamSpec.passPercent !== 80) failures.push("L4 測驗必須為 60 分鐘、80% 通過。");
if (JSON.stringify(level4ExamSpec.draw) !== JSON.stringify(expectedDraw)) failures.push(`L4 抽題契約錯誤：${JSON.stringify(level4ExamSpec.draw)}。`);

const chapterSet = new Set(level4Questions.map((question) => question.chapter));
for (const chapter of ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"]) {
  if (!chapterSet.has(chapter)) failures.push(`L4 題庫缺少 ${chapter}。`);
}

for (const [type, count] of Object.entries(expectedDraw)) {
  const available = level4Questions.filter((question) => question.type === type).length;
  if (available < count) failures.push(`${type} 題型只有 ${available} 題，少於抽題需求 ${count}。`);
}

for (const question of level4Questions) {
  if (ids.has(question.id)) failures.push(`題目 ID 重複：${question.id}。`);
  ids.add(question.id);
  if (!/^L4-\d{3}$/.test(question.id) || !/^4\.[1-6]$/.test(question.chapter)) failures.push(`${question.id} 的 ID 或章節格式錯誤。`);
  if (!question.question || !question.explanation || !question.reference || !question.tags?.length) failures.push(`${question.id} 缺少題幹、解析、參考章節或標籤。`);
  const options = question.options ?? [];
  const correct = options.filter((option) => option.correct);
  const wrong = options.filter((option) => !option.correct);
  if (!correct.length || !wrong.length || options.some((option) => !option.id || !option.text || !option.why)) failures.push(`${question.id} 的選項、正解或逐項解析不完整。`);
  if (question.type !== "multi" && correct.length !== 1) failures.push(`${question.id} 非多選題卻有 ${correct.length} 個正解。`);
  if (question.type === "numeric") {
    if (!Number.isFinite(question.answer) || !question.unit || !Number.isFinite(question.tolerance) || question.tolerance <= 0) failures.push(`${question.id} 的數值答案、單位或相對容差無效。`);
  }
  if (question.type === "graphic") {
    if (!question.image?.startsWith("/assets/svg/l4/") || String(question.imageAlt ?? "").trim().length < 12) failures.push(`${question.id} 的本機圖形或 alt text 無效。`);
    else {
      try {
        await access(path.join(root, "src", question.image.replace(/^\/assets\//, "assets/")));
      } catch (_) {
        failures.push(`${question.id} 找不到圖形 ${question.image}。`);
      }
    }
  }
}

const normalizedStemCounts = new Map();
const correctAnswerCounts = new Map();
let answerLengthClues = 0;
let answerLengthEligible = 0;
for (const question of level4Questions) {
  const stem = question.question.replace(/「[^」]+」/g, "「主題」").replace(/\d+(?:\.\d+)?/g, "#").replace(/\s+/g, " ").trim();
  normalizedStemCounts.set(stem, (normalizedStemCounts.get(stem) ?? 0) + 1);
  for (const option of question.options?.filter((item) => item.correct) ?? []) {
    const answer = option.text.replace(/\s+/g, " ").trim();
    correctAnswerCounts.set(answer, (correctAnswerCounts.get(answer) ?? 0) + 1);
  }
  if (question.type !== "multi" && question.type !== "numeric") {
    const correctText = question.options?.find((option) => option.correct)?.text.trim() ?? "";
    const wrongLengths = question.options?.filter((option) => !option.correct).map((option) => option.text.trim().length) ?? [];
    if (correctText && wrongLengths.length) {
      answerLengthEligible += 1;
      const longestWrong = Math.max(...wrongLengths);
      if (correctText.length >= longestWrong * 1.7 && correctText.length - longestWrong >= 8) answerLengthClues += 1;
    }
  }
}
const repeatedStems = [...normalizedStemCounts].filter(([, count]) => count > 4);
if (repeatedStems.length) failures.push(`題庫含大量重複題幹骨架：${repeatedStems.map(([stem, count]) => `${count}×「${stem}」`).join("；")}。`);
const repeatedAnswers = [...correctAnswerCounts].filter(([, count]) => count > 5);
if (repeatedAnswers.length) failures.push(`題庫含大量重複正解：${repeatedAnswers.map(([answer, count]) => `${count}×「${answer}」`).join("；")}。`);
if (answerLengthEligible && answerLengthClues / answerLengthEligible > 0.2) failures.push(`疑似答案長度線索過多：${answerLengthClues}/${answerLengthEligible} 題的正解明顯長於所有干擾項。`);

const bankText = level4Questions.map((question) => [question.question, question.explanation, question.reference, ...(question.options ?? []).flatMap((option) => [option.text, option.why])].join(" ")).join(" ");
const packagingCoverage = [
  ["RDL", /RDL/i], ["UBM", /UBM/i], ["Cu", /(?:\bCu\b|銅)/i],
  ["PI/PBO", /(?:PI\/PBO|PI|PBO)/i], ["mold compound", /(?:mold compound|模封)/i], ["low-k", /low-k/i],
  ["queue/re-clean", /(?:queue|re-clean)/i], ["bonding/reliability", /(?:bond|接合).*(?:reliability|可靠度)|(?:reliability|可靠度).*(?:bond|接合)/i],
  ["approved EHS boundary", /(?:核准|approved).{0,30}EHS|EHS.{0,30}(?:核准|approved)/i]
];
for (const [label, pattern] of packagingCoverage) if (!pattern.test(bankText)) failures.push(`L4 題庫缺少封裝清潔主題：${label}。`);

const sourceFiles = Object.fromEntries(await Promise.all([
  "scripts/build.mjs", "src/assets/js/exam.js", "src/assets/js/progress.js",
  "src/assets/css/components.css", "src/assets/css/print.css", "package.json"
].map(async (name) => [name, await readFile(path.join(root, name), "utf8")])));

const sourceRequirements = [
  ["scripts/build.mjs", "examPage(4)", "建置未產生 L4 exam route。"],
  ["scripts/build.mjs", "../src/data/quiz/level-4.js", "建置未使用 L4 題庫 spec。"],
  ["scripts/build.mjs", "data-progress-l4-badge", "進度頁缺少 L4 徽章。"],
  ["scripts/build.mjs", "data-progress-all-badge", "進度頁缺少全程完訓徽章。"],
  ["scripts/build.mjs", "data-certificate-name", "證書缺少學員姓名輸入。"],
  ["scripts/build.mjs", "data-certificate-levels", "證書缺少完成階段。"],
  ["scripts/build.mjs", "data-certificate-date", "證書缺少完成日期。"],
  ["scripts/build.mjs", expectedDisclaimer, "證書缺少固定免責聲明。"],
  ["src/assets/js/exam.js", "/assets/data/quiz/level-4.js", "exam runtime 未載入 L4 題庫。"],
  ["src/assets/js/exam.js", "requiredChapters: 5", "L4 未設定 5/6 章解鎖。"],
  ["src/assets/js/progress.js", "[\"L1\", \"L2\", \"L3\", \"L4\"]", "進度頁未整合四階徽章。"],
  ["src/assets/js/progress.js", "isCertificateEligible", "缺少完訓證書資格函式。"],
  ["src/assets/js/progress.js", "levelNames.every", "證書資格未要求四階測驗全部通過。"],
  ["src/assets/css/components.css", ".training-certificate", "缺少證書畫面樣式。"],
  ["src/assets/css/print.css", "body.pa-print-certificate", "缺少證書列印樣式。"],
  ["package.json", "check:l4-exam", "package scripts 未串入 L4 exam checker。"],
  ["package.json", "verify-level4-exam-ui.mjs", "package scripts 未串入 L4 exam UI 驗證。"]
];
for (const [file, marker, message] of sourceRequirements) if (!sourceFiles[file].includes(marker)) failures.push(message);

for (const route of ["4-1-diagnostics", "4-2-endpoint-control", "4-3-plasma-damage", "4-4-advanced-techniques", "4-5-plasma-modeling-data", "4-6-production-yield-safety"]) {
  if (!sourceFiles["src/assets/js/exam.js"].includes(route)) failures.push(`exam review 缺少章節回鏈：${route}。`);
}

const modules = curriculum.levels.flatMap((level) => level.modules);
if (modules.length !== 26 || new Set(modules.map((module) => module.id)).size !== 26) failures.push(`證書模組來源必須是 26 個唯一模組，目前 ${modules.length}。`);
const objectiveEntries = [...sourceFiles["src/assets/js/progress.js"].matchAll(/"([1-4]-\d)":\s*(\d+)/g)];
const runtimeObjectiveCounts = new Map(objectiveEntries.map((match) => [match[1], Number(match[2])]));
if (runtimeObjectiveCounts.size !== 26) failures.push("完整完訓資格未明確涵蓋 26 章 objectives。");

const contentFiles = [
  "chapter-1-1.mjs", "l1-foundation-chapters.mjs",
  ...[1, 2, 3, 4, 5, 6].map((number) => `chapter-2-${number}.mjs`),
  ...[1, 2, 3, 4, 5, 6].map((number) => `chapter-3-${number}.mjs`),
  "chapter-3-7-packaging-cleaning.mjs",
  "chapter-3-8-pcb-desmear.mjs",
  ...[1, 2, 3, 4, 5, 6].map((number) => `chapter-4-${number}.mjs`)
];
const contentChapters = [];
for (const file of contentFiles) {
  const exports = await import(`../src/content/${file}`);
  for (const value of Object.values(exports).flatMap((item) => Array.isArray(item) ? item : [item])) {
    if (value?.id && Array.isArray(value.objectives)) contentChapters.push(value);
  }
}
if (contentChapters.length !== 26) failures.push(`內容來源應提供 26 章 objectives，目前 ${contentChapters.length} 章。`);
for (const chapter of contentChapters) {
  if (runtimeObjectiveCounts.get(chapter.id) !== chapter.objectives.length) failures.push(`${chapter.id} 的完訓目標數應為 ${chapter.objectives.length}，runtime 為 ${runtimeObjectiveCounts.get(chapter.id) ?? "缺少"}。`);
}

if (failures.length) {
  console.error(`L4 測驗與證書整合檢查失敗（${failures.length} 項）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`L4 測驗與證書整合檢查通過：85/85、30 題 draw、5/6 gate、26 章完訓契約。`);
