import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chapterTwoOne } from "../src/content/chapter-2-1.mjs";
import { chapterTwoTwo } from "../src/content/chapter-2-2.mjs";
import { chapterTwoThree } from "../src/content/chapter-2-3.mjs";
import { chapterTwoFour } from "../src/content/chapter-2-4.mjs";
import { chapterTwoFive } from "../src/content/chapter-2-5.mjs";
import { chapterTwoSix } from "../src/content/chapter-2-6.mjs";
import { l2EngineeringCases, l2ShiftExercises } from "../src/content/l2-engineering-cases.mjs";
import { formulas } from "../src/data/formulas.js";
import { gases } from "../src/data/gases.js";
import { labs } from "../src/data/labs.js";
import { level2Questions } from "../src/data/quiz/level-2.js";
import { isLocalApprovalComplete, sdsEvidence } from "../src/data/sds-evidence.js";
import { countApprovedReviews } from "./lib/review-packets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.argv.includes("--strict");
const repoStrict = strict || process.argv.includes("--repo-strict");
const chapters = [chapterTwoOne, chapterTwoTwo, chapterTwoThree, chapterTwoFour, chapterTwoFive, chapterTwoSix];
const stripHtml = (value) => String(value ?? "").replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
const content = chapters.flatMap((chapter) => [
  chapter.title,
  chapter.summary,
  ...(chapter.objectives ?? []),
  ...(chapter.sections ?? []).flatMap((section) => [section.title, stripHtml(section.body)]),
  ...(chapter.callouts ?? []).flatMap((item) => [item.title, stripHtml(item.body)]),
  ...(chapter.selfCheck ?? []).flat(),
  ...(l2EngineeringCases[chapter.id] ?? []).flatMap((item) => Object.values(item)),
  ...Object.values(l2ShiftExercises[chapter.id] ?? {})
]).join(" ");
const contentCharacters = (content.match(/[\p{L}\p{N}]/gu) ?? []).length;

const metrics = {
  chapters: chapters.length,
  sections: chapters.reduce((total, chapter) => total + (chapter.sections?.length ?? 0), 0),
  contentUnits: contentCharacters,
  gases: gases.length,
  supplierDocumentsReviewed: sdsEvidence.filter((item) => item.reviewStatus === "supplier-reviewed").length,
  labsImplemented: labs.filter((lab) => lab.level === 2 && lab.href !== "/lab/").length,
  selfChecks: chapters.reduce((total, chapter) => total + (chapter.selfCheck?.length ?? 0), 0),
  levelExamQuestions: level2Questions.length,
  formulas: Object.keys(formulas).length,
  svgDiagrams: await countFiles(path.join(root, "src", "assets", "svg", "l2"), ".svg"),
  completedReviews: await countApprovedReviews(path.join(root, "docs", "reviews"), 2)
};
const targets = {
  chapters: 6,
  sections: 26,
  contentUnits: 50000,
  gases: 32,
  supplierDocumentsReviewed: 32,
  labsImplemented: 9,
  selfChecks: 43,
  levelExamQuestions: 80,
  formulas: 18,
  svgDiagrams: 40,
  completedReviews: 3
};
const rows = Object.entries(targets).map(([item, target]) => ({ item, current: metrics[item], target, complete: metrics[item] >= target }));
console.table(rows);
console.log(`P2 三道審閱核准：${metrics.completedReviews}/3。`);
const supplierReviewed = sdsEvidence.filter((item) => item.reviewStatus === "supplier-reviewed").length;
const plantApproved = sdsEvidence.filter(isLocalApprovalComplete).length;
console.log(`SDS 證據進度：供應商公開文件已核對 ${supplierReviewed}/32；廠區核准 ${plantApproved}/32（pending ${sdsEvidence.filter((item) => item.localApprovalStatus === "pending").length}/32，未視為完成）。`);
if (supplierReviewed !== 32) {
  console.error("SDS repo 證據門檻不符：供應商公開文件必須核對 32/32。");
  if (repoStrict) process.exitCode = 1;
}
if (strict && plantApproved < 32) {
  console.error(`P2 strict 外部封鎖：廠區 EH&S SDS 核准 ${plantApproved}/32，尚有 ${32 - plantApproved} 筆 pending。`);
  process.exitCode = 1;
}
const incomplete = rows.filter((row) => !row.complete && row.item !== "completedReviews");
if (incomplete.length) {
  console.log(`P2 repo 尚有 ${incomplete.length} 個量化缺口：${incomplete.map((row) => row.item).join(", ")}。`);
  if (repoStrict) process.exit(1);
} else {
  console.log("P2 repo 量化交付物與 supplier-document evidence 達標；廠區與人工核准另行揭露。 ");
}
if (strict && metrics.completedReviews < 3) {
  console.error(`P2 strict 外部封鎖：三道具名審閱核准 ${metrics.completedReviews}/3。`);
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
