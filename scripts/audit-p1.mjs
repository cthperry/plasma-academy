import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chapterOneOne as chapterOneOneBase } from "../src/content/chapter-1-1.mjs";
import { l1FoundationChapters as l1FoundationChaptersBase } from "../src/content/l1-foundation-chapters.mjs";
import { expandL1Content } from "../src/content/l1-prose-expansions.mjs";
import { formulas } from "../src/data/formulas.js";
import { quizBanks } from "../src/data/quiz.js";
import { countApprovedReviews } from "./lib/review-packets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chapters = expandL1Content([chapterOneOneBase, ...l1FoundationChaptersBase]);
const stripHtml = (value) => String(value ?? "").replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
const content = chapters.flatMap((chapter) => [
  chapter.title,
  chapter.summary,
  ...(chapter.objectives ?? []),
  ...(chapter.sections ?? []).flatMap((section) => [section.title, stripHtml(section.body)]),
  ...(chapter.supplements ?? []).flatMap((section) => [section.title, stripHtml(section.body)]),
  ...(chapter.callouts ?? []).flatMap((item) => [item.title, stripHtml(item.body)]),
  ...(chapter.selfCheck ?? []).flat()
]).join(" ");

const hanCharacters = (content.match(/[\p{Script=Han}]/gu) ?? []).length;
const latinTokens = (content.match(/[A-Za-z0-9_]+/g) ?? []).length;
const metrics = {
  chapters: chapters.length,
  sections: chapters.reduce((total, chapter) => total + (chapter.sections?.length ?? 0), 0),
  contentUnits: hanCharacters + latinTokens,
  selfChecks: chapters.reduce((total, chapter) => total + (chapter.selfCheck?.length ?? 0), 0),
  levelExamQuestions: quizBanks.levelExams.length,
  formulas: Object.keys(formulas).length,
  svgDiagrams: await countFiles(path.join(root, "src", "assets", "svg", "l1"), ".svg"),
  completedReviews: await countApprovedReviews(path.join(root, "docs", "reviews"), 1)
};
const targets = { chapters: 6, sections: 24, contentUnits: 20000, selfChecks: 35, levelExamQuestions: 55, formulas: 12, svgDiagrams: 35, completedReviews: 3 };
const rows = Object.entries(targets).map(([key, target]) => ({ item: key, current: metrics[key], target, complete: metrics[key] >= target }));

console.table(rows);
console.log(`P1 三道審閱核准：${metrics.completedReviews}/3。`);
const incomplete = rows.filter((row) => !row.complete && row.item !== "completedReviews");
if (incomplete.length) {
  console.log(`P1 repo 尚有 ${incomplete.length} 個量化缺口：${incomplete.map((row) => row.item).join(", ")}。`);
  if (process.argv.includes("--strict")) process.exit(1);
} else {
  console.log("P1 repo 量化交付物達標；三道人工審閱狀態另行揭露。 ");
}
if (process.argv.includes("--strict") && metrics.completedReviews < 3) {
  console.error(`P1 strict 外部封鎖：三道具名審閱核准 ${metrics.completedReviews}/3。`);
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
