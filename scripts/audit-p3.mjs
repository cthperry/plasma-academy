import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chapterThreeOne } from "../src/content/chapter-3-1.mjs";
import { chapterThreeSeven } from "../src/content/chapter-3-7-packaging-cleaning.mjs";
import { defects } from "../src/data/defects.js";
import { labs } from "../src/data/labs.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chapters = [chapterThreeOne, chapterThreeSeven];
const stripHtml = (value) => String(value ?? "").replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
const content = chapters.flatMap((chapter) => [
  chapter.title,
  chapter.summary,
  ...(chapter.objectives ?? []),
  ...(chapter.sections ?? []).flatMap((section) => [section.title, stripHtml(section.body)]),
  ...(chapter.callouts ?? []).flatMap((item) => [item.title, stripHtml(item.body)]),
  ...(chapter.selfCheck ?? []).flatMap((item) => Array.isArray(item) ? item : [item.prompt, item.answer])
]).join(" ");

const metrics = {
  chapters: chapters.length,
  sections: chapters.reduce((total, chapter) => total + (chapter.sections?.length ?? 0), 0),
  contentUnits: (content.match(/[\p{L}\p{N}]/gu) ?? []).length,
  defects: defects.length,
  labsImplemented: labs.filter((lab) => lab.level === 3 && lab.href !== "/lab/").length,
  selfChecks: chapters.reduce((total, chapter) => total + (chapter.selfCheck?.length ?? 0), 0),
  levelExamQuestions: 0,
  svgDiagrams: await countFiles(path.join(root, "src", "assets", "svg", "l3"), ".svg")
};
const targets = { chapters: 7, sections: 30, contentUnits: 68000, defects: 19, labsImplemented: 10, selfChecks: 45, levelExamQuestions: 95, svgDiagrams: 45 };
const rows = Object.entries(targets).map(([item, target]) => ({ item, current: metrics[item], target, complete: metrics[item] >= target }));

console.table(rows);
const incomplete = rows.filter((row) => !row.complete);
if (incomplete.length) {
  console.log(`P3 尚有 ${incomplete.length} 個量化缺口：${incomplete.map((row) => row.item).join(", ")}。`);
  if (process.argv.includes("--strict")) process.exit(1);
} else {
  console.log("P3 量化交付物達標；仍需逐項核對模型、圖形辨識、題庫品質與外部審閱。 ");
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
