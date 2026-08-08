import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chapterThreeOne } from "../src/content/chapter-3-1.mjs";
import { chapterThreeTwo } from "../src/content/chapter-3-2.mjs";
import { chapterThreeThree } from "../src/content/chapter-3-3.mjs";
import { chapterThreeFour } from "../src/content/chapter-3-4.mjs";
import { chapterThreeFive } from "../src/content/chapter-3-5.mjs";
import { chapterThreeSix } from "../src/content/chapter-3-6.mjs";
import { chapterThreeSeven } from "../src/content/chapter-3-7-packaging-cleaning.mjs";
import { chapterThreeEight } from "../src/content/chapter-3-8-pcb-desmear.mjs";
import { l3FieldGuides, l3EngineeringCases, l3ShiftExercises } from "../src/content/l3-engineering-casebook.mjs";
import { packagingCleaningProtocols } from "../src/content/l3-packaging-cleaning-handbook.mjs";
import { l3ProcessProtocolsPart1 } from "../src/content/l3-process-handbooks-part1.mjs";
import { l3ProcessProtocolsPart2 } from "../src/content/l3-process-handbooks-part2.mjs";
import { defects } from "../src/data/defects.js";
import { labs } from "../src/data/labs.js";
import { l3Diagrams } from "../src/data/l3-diagrams.js";
import { level3Questions } from "../src/data/quiz/level-3.js";
import { countApprovedReviews } from "./lib/review-packets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chapters = [chapterThreeOne, chapterThreeTwo, chapterThreeThree, chapterThreeFour, chapterThreeFive, chapterThreeSix, chapterThreeSeven, chapterThreeEight];
const stripHtml = (value) => String(value ?? "").replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
const narrativeContent = chapters.flatMap((chapter) => [
  chapter.title,
  chapter.summary,
  ...(chapter.objectives ?? []),
  ...(chapter.sections ?? []).flatMap((section) => [section.title, stripHtml(section.body)]),
  ...(chapter.callouts ?? []).flatMap((item) => [item.title, stripHtml(item.body)]),
  ...(chapter.selfCheck ?? []).flatMap((item) => Array.isArray(item) ? item : [item.prompt, item.answer])
]).join(" ");
const casebookContent = chapters.flatMap((chapter) => [
  ...Object.values(l3FieldGuides[chapter.id] ?? {}),
  ...(l3EngineeringCases[chapter.id] ?? []).flatMap((item) => Object.values(item)),
  ...Object.values(l3ShiftExercises[chapter.id] ?? {})
]).concat(
  Object.values(l3ProcessProtocolsPart1).flatMap((protocols) => protocols.flatMap((item) => Object.values(item))),
  Object.values(l3ProcessProtocolsPart2).flatMap((protocols) => protocols.flatMap((item) => Object.values(item))),
  packagingCleaningProtocols.flatMap((item) => Object.values(item))
).join(" ");
const assetContent = JSON.stringify({ diagrams: l3Diagrams, defects, exam: level3Questions });
const countUnits = (value) => (String(value).match(/[\p{L}\p{N}]/gu) ?? []).length;
const narrativeUnits = countUnits(narrativeContent);
const casebookUnits = countUnits(casebookContent);
const learningAssetUnits = countUnits(assetContent);

const metrics = {
  chapters: chapters.length,
  sections: chapters.reduce((total, chapter) => total + (chapter.sections?.length ?? 0), 0),
  contentUnits: narrativeUnits + casebookUnits,
  defects: defects.length,
  labsImplemented: labs.filter((lab) => lab.level === 3 && lab.href !== "/lab/").length,
  selfChecks: chapters.reduce((total, chapter) => total + (chapter.selfCheck?.length ?? 0), 0),
  levelExamQuestions: level3Questions.length,
  svgDiagrams: await countFiles(path.join(root, "src", "assets", "svg", "l3"), ".svg"),
  completedReviews: await countApprovedReviews(path.join(root, "docs", "reviews"), 3)
};
const targets = { chapters: 8, sections: 35, contentUnits: 68000, defects: 19, labsImplemented: 11, selfChecks: 52, levelExamQuestions: 116, svgDiagrams: 49, completedReviews: 3 };
const rows = Object.entries(targets).map(([item, target]) => ({ item, current: metrics[item], target, complete: metrics[item] >= target }));

console.log(`P3 正文口徑：章節核心 ${narrativeUnits.toLocaleString("zh-TW")} + 現場指南、案例、交班與製程/封裝手冊 ${casebookUnits.toLocaleString("zh-TW")} = ${metrics.contentUnits.toLocaleString("zh-TW")} 字元單位。`);
console.log(`另有圖解、缺陷圖鑑與認證題庫 ${learningAssetUnits.toLocaleString("zh-TW")} 字元單位，不列入 68,000 正文目標。`);
console.table(rows);
console.log(`P3 三道審閱核准：${metrics.completedReviews}/3。`);
const incomplete = rows.filter((row) => !row.complete && row.item !== "completedReviews");
if (incomplete.length) {
  console.log(`P3 repo 尚有 ${incomplete.length} 個量化缺口：${incomplete.map((row) => row.item).join(", ")}。`);
  if (process.argv.includes("--strict")) process.exit(1);
} else {
  console.log("P3 repo 量化交付物達標；人工審閱與高階模型 acceptance 另行揭露。 ");
}
if (process.argv.includes("--strict") && metrics.completedReviews < 3) {
  console.error(`P3 strict 外部封鎖：三道具名審閱核准 ${metrics.completedReviews}/3。`);
  process.exitCode = 1;
}

async function countFiles(directory, extension) {
  try {
    const entries = await readdir(directory, { withFileTypes: true, recursive: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith(extension)).length;
  } catch (error) {
    if (error.code === "ENOENT") return 0;
    throw error;
  }
}
