import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chapterFourOne } from "../src/content/chapter-4-1.mjs";
import { chapterFourTwo } from "../src/content/chapter-4-2.mjs";
import { chapterFourThree } from "../src/content/chapter-4-3.mjs";
import { chapterFourFour } from "../src/content/chapter-4-4.mjs";
import { chapterFourFive } from "../src/content/chapter-4-5.mjs";
import { chapterFourSix } from "../src/content/chapter-4-6.mjs";
import { formulas } from "../src/data/formulas.js";
import { glossary } from "../src/data/glossary.js";
import { labs } from "../src/data/labs.js";
import { level4Questions } from "../src/data/quiz/level-4.js";
import { spectra } from "../src/data/spectra.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chapters = [chapterFourOne, chapterFourTwo, chapterFourThree, chapterFourFour, chapterFourFive, chapterFourSix];
const metrics = {
  chapters: chapters.length,
  sections: chapters.reduce((total, chapter) => total + chapter.sections.length, 0),
  selfChecks: chapters.reduce((total, chapter) => total + chapter.selfCheck.length, 0),
  labsImplemented: labs.filter((lab) => lab.level === 4 && lab.href !== "/lab/").length,
  levelExamQuestions: level4Questions.length,
  spectra: spectra.length,
  formulas: Object.keys(formulas).length,
  glossaryTerms: glossary.length,
  productionCases: chapterFourSix.cases.length,
  examPage: await fileExists(path.join(root, "dist", "client", "level", "4", "exam", "index.html")) ? 1 : 0
};
const targets = {
  chapters: 6,
  sections: 34,
  selfChecks: 41,
  labsImplemented: 7,
  levelExamQuestions: 85,
  spectra: 22,
  formulas: 18,
  glossaryTerms: 242,
  productionCases: 5,
  examPage: 1
};
const rows = Object.entries(targets).map(([item, target]) => ({ item, current: metrics[item], target, complete: metrics[item] >= target }));

console.table(rows);
const incomplete = rows.filter((row) => !row.complete);
if (incomplete.length) {
  console.error(`P4 repo 交付尚有 ${incomplete.length} 個缺口：${incomplete.map((row) => row.item).join(", ")}。`);
  if (process.argv.includes("--strict")) process.exitCode = 1;
} else {
  console.log("P4 repo 量化交付達標：L4 內容、A26-A32、測驗、公式、術語、案例與測驗路由均已納入品質門。 ");
}

const atomicLinesPending = spectra.filter((line) => line.verificationStatus === "pending-line-review").length;
const molecularBandsPending = spectra.filter((line) => line.verificationStatus === "pending-source-review").length;
console.log(`外部審閱狀態（不偽造為 repo 完成）：OES 原子線待逐線核對 ${atomicLinesPending}、分子帶待來源審閱 ${molecularBandsPending}；L4 技術、教學與一致性審閱仍需具名審閱者簽核。`);

async function fileExists(file) {
  try {
    await access(file);
    return true;
  } catch (_) {
    return false;
  }
}
