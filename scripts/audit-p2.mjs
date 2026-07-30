import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chapterTwoOne } from "../src/content/chapter-2-1.mjs";
import { chapterTwoTwo } from "../src/content/chapter-2-2.mjs";
import { chapterTwoThree } from "../src/content/chapter-2-3.mjs";
import { chapterTwoFour } from "../src/content/chapter-2-4.mjs";
import { chapterTwoFive } from "../src/content/chapter-2-5.mjs";
import { formulas } from "../src/data/formulas.js";
import { gases } from "../src/data/gases.js";
import { labs } from "../src/data/labs.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chapters = [chapterTwoOne, chapterTwoTwo, chapterTwoThree, chapterTwoFour, chapterTwoFive];
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
  gases: gases.length,
  sdsVerified: gases.filter((gas) => gas.sdsStatus === "verified").length,
  labsImplemented: labs.filter((lab) => lab.level === 2 && lab.href !== "/lab/").length,
  selfChecks: chapters.reduce((total, chapter) => total + (chapter.selfCheck?.length ?? 0), 0),
  levelExamQuestions: await countQuizQuestions(path.join(root, "src", "data", "quiz", "level-2.js")),
  formulas: Object.keys(formulas).length,
  svgDiagrams: await countFiles(path.join(root, "src", "assets", "svg", "l2"), ".svg"),
  completedReviews: await countApprovedReviews(path.join(root, "docs", "reviews", "l2"))
};
const targets = {
  chapters: 6,
  sections: 26,
  contentUnits: 50000,
  gases: 32,
  sdsVerified: 32,
  labsImplemented: 9,
  selfChecks: 43,
  levelExamQuestions: 80,
  formulas: 18,
  svgDiagrams: 40,
  completedReviews: 3
};
const rows = Object.entries(targets).map(([item, target]) => ({ item, current: metrics[item], target, complete: metrics[item] >= target }));
console.table(rows);
const incomplete = rows.filter((row) => !row.complete);
if (incomplete.length) {
  console.log(`P2 尚有 ${incomplete.length} 個量化缺口：${incomplete.map((row) => row.item).join(", ")}。`);
  if (process.argv.includes("--strict")) process.exit(1);
} else {
  console.log("P2 量化交付物達標；仍需逐項核對物理模型、SDS 證據與三道審閱內容。");
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

async function countQuizQuestions(file) {
  try {
    const source = await readFile(file, "utf8");
    return (source.match(/\bid:\s*["']L2-/g) ?? []).length;
  } catch (error) {
    if (error.code === "ENOENT") return 0;
    throw error;
  }
}

async function countApprovedReviews(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    let approved = 0;
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const review = JSON.parse(await readFile(path.join(directory, entry.name), "utf8"));
      if (review.status === "approved" && review.reviewer?.name && review.reviewer?.role && review.reviewed_commit && review.approved_at) approved += 1;
    }
    return approved;
  } catch (error) {
    if (error.code === "ENOENT") return 0;
    throw error;
  }
}
