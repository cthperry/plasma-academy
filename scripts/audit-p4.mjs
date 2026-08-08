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
import { countApprovedReviews } from "./lib/review-packets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.argv.includes("--strict");
const repoStrict = strict || process.argv.includes("--repo-strict");
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
  examPage: await fileExists(path.join(root, "dist", "client", "level", "4", "exam", "index.html")) ? 1 : 0,
  completedReviews: await countApprovedReviews(path.join(root, "docs", "reviews"), 4)
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
  examPage: 1,
  completedReviews: 3
};
const rows = Object.entries(targets).map(([item, target]) => ({ item, current: metrics[item], target, complete: metrics[item] >= target }));

console.table(rows);
console.log(`P4 三道審閱核准：${metrics.completedReviews}/3。`);
const incomplete = rows.filter((row) => !row.complete && row.item !== "completedReviews");
if (incomplete.length) {
  console.error(`P4 repo 交付尚有 ${incomplete.length} 個缺口：${incomplete.map((row) => row.item).join(", ")}。`);
  if (repoStrict) process.exitCode = 1;
} else {
  console.log("P4 repo 量化交付達標：L4 內容、A26-A32、測驗、公式、術語、案例與測驗路由均已納入品質門。 ");
}
if (strict && metrics.completedReviews < 3) {
  console.error(`P4 strict 外部封鎖：三道具名審閱核准 ${metrics.completedReviews}/3。`);
  process.exitCode = 1;
}

const atomicLinesVerified = spectra.filter((line) => line.verificationStatus === "nist-line-verified").length;
const molecularBandsPending = spectra.filter((line) => line.verificationStatus === "pending-source-review").length;
console.log(`外部審閱狀態：OES 原子線已逐線 NIST 核實 ${atomicLinesVerified}/13、分子帶待來源審閱 ${molecularBandsPending}/9；L4 技術、教學與一致性審閱仍需具名審閱者簽核。`);
if (atomicLinesVerified !== 13 || molecularBandsPending !== 9) {
  console.error("OES 來源狀態門檻不符：必須為原子線 NIST 核實 13/13、分子帶待來源審閱 9/9。");
  if (repoStrict) process.exitCode = 1;
}
if (strict && molecularBandsPending > 0) {
  console.error(`P4 strict 外部封鎖：OES 分子帶來源審閱 0/${molecularBandsPending}，全部仍為 pending-source-review。`);
  process.exitCode = 1;
}

async function fileExists(file) {
  try {
    await access(file);
    return true;
  } catch (_) {
    return false;
  }
}
