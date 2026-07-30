import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chapterOneOne } from "../src/content/chapter-1-1.mjs";
import { l1FoundationChapters } from "../src/content/l1-foundation-chapters.mjs";
import { formulas } from "../src/data/formulas.js";
import { quizBanks } from "../src/data/quiz.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chapters = [chapterOneOne, ...l1FoundationChapters];
const stripHtml = (value) => String(value ?? "").replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
const content = chapters.flatMap((chapter) => [
  chapter.title,
  chapter.summary,
  ...(chapter.objectives ?? []),
  ...(chapter.sections ?? []).flatMap((section) => [section.title, stripHtml(section.body)]),
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
  completedReviews: await countFiles(path.join(root, "docs", "reviews", "l1"), ".json")
};
const targets = { chapters: 6, sections: 24, contentUnits: 20000, selfChecks: 35, levelExamQuestions: 55, formulas: 12, svgDiagrams: 35, completedReviews: 3 };
const rows = Object.entries(targets).map(([key, target]) => ({ item: key, current: metrics[key], target, complete: metrics[key] >= target }));

console.table(rows);
const incomplete = rows.filter((row) => !row.complete);
if (incomplete.length) {
  console.log(`P1 尚有 ${incomplete.length} 個量化缺口：${incomplete.map((row) => row.item).join(", ")}。`);
  if (process.argv.includes("--strict")) process.exit(1);
} else {
  console.log("P1 量化交付物達標；仍需逐項核對品質與三道審閱內容。");
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
