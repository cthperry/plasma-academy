import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { curriculum } from "../src/data/curriculum.js";
import { labs } from "../src/data/labs.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const chapterPath = path.join(root, "src", "content", "chapter-4-1.mjs");
const a26Path = path.join(root, "src", "assets", "js", "labs", "a26-langmuir-probe.js");
const a27Path = path.join(root, "src", "assets", "js", "labs", "a27-oes.js");
const labCssPath = path.join(root, "src", "assets", "css", "a26-a27.css");
const contentCheckPath = path.join(root, "scripts", "check-content-style.mjs");
const builtPagePath = path.join(root, "dist", "client", "level", "4", "4-1-diagnostics", "index.html");

const readRequired = async (file, label) => {
  try {
    return await readFile(file, "utf8");
  } catch {
    failures.push(`缺少 ${label}：${path.relative(root, file)}`);
    return "";
  }
};

const chapterSource = await readRequired(chapterPath, "4.1 章節資料");
const a26Source = await readRequired(a26Path, "A26 UI module");
const a27Source = await readRequired(a27Path, "A27 UI module");
const labCssSource = await readRequired(labCssPath, "A26/A27 CSS");
const contentCheckSource = await readRequired(contentCheckPath, "內容規範檢查");
const builtPage = await readRequired(builtPagePath, "建置後 4.1 頁面");

let chapter;
if (chapterSource) {
  try {
    ({ chapterFourOne: chapter } = await import(`${pathToFileURL(chapterPath).href}?check=${Date.now()}`));
  } catch (error) {
    failures.push(`無法匯入 chapterFourOne：${error.message}`);
  }
}

if (chapter) {
  if (chapter.id !== "4-1") failures.push(`chapter id 應為 4-1，目前為 ${chapter.id ?? "未定義"}。`);
  if (chapter.route !== "/level/4/4-1-diagnostics/") failures.push(`chapter route 不正確：${chapter.route ?? "未定義"}。`);
  if (chapter.title !== "4.1 電漿診斷") failures.push(`chapter title 應為「4.1 電漿診斷」，目前為 ${chapter.title ?? "未定義"}。`);
  if (chapter.hours !== 3.5) failures.push(`chapter hours 應為 3.5，目前為 ${chapter.hours ?? "未定義"}。`);
  if (chapter.sections?.length !== 7) failures.push(`4.1 正文應有 7 節，目前 ${chapter.sections?.length ?? 0} 節。`);
  if (chapter.selfCheck?.length !== 8) failures.push(`4.1 self-check 應有 8 題，目前 ${chapter.selfCheck?.length ?? 0} 題。`);
  if (chapter.labs?.length !== 2 || chapter.labs?.map((lab) => lab.id).join(",") !== "a26,a27") {
    failures.push("4.1 labs 必須依序為 a26、a27。");
  }
  if (chapter.selfCheck?.some((item) => !Array.isArray(item) || item.length < 2 || !String(item[1]).trim())) {
    failures.push("4.1 每一題 self-check 都必須包含答案。");
  }

  const prose = [chapter.summary, ...(chapter.sections ?? []).map((section) => section.body)].join(" ");
  const textUnits = (prose.match(/[\p{L}\p{N}]/gu) ?? []).length;
  if (textUnits < 7500) failures.push(`4.1 正文有效 Unicode 字母/數字至少 7,500，目前 ${textUnits}。`);

  const disclosure = [prose, ...(chapter.callouts ?? []).map((item) => `${item.title} ${item.body}`)].join(" ");
  for (const required of [
    "純指數", "Vp/Vf", "Te 高估兩倍", "pending-line-review", "pending-source-review",
    "relativeIntensity", "教學權重", "actinometry", "激發閾值", "內標比例", "光路",
    "量產", "蝕刻率下降"
  ]) {
    if (!disclosure.includes(required)) failures.push(`4.1 缺少必要揭露或工程界線：${required}`);
  }
}

const levelFour = curriculum.levels.find((level) => level.id === 4);
const moduleFourOne = levelFour?.modules.find((module) => module.id === "4.1");
if (!moduleFourOne) failures.push("curriculum L4 缺少 4.1 module。");
else {
  if (moduleFourOne.href !== "/level/4/4-1-diagnostics/") failures.push("curriculum 4.1 href 與章節 route 不一致。");
  if (moduleFourOne.hours !== 3.5) failures.push("curriculum 4.1 hours 必須為 3.5。");
  if (moduleFourOne.labs?.join(",") !== "A26,A27") failures.push("curriculum 4.1 labs 必須為 A26、A27。");
}

for (const id of ["A26", "A27"]) {
  const lab = labs.find((item) => item.id === id);
  const expected = `/level/4/4-1-diagnostics/#lab-${id.toLowerCase()}`;
  if (!lab || lab.chapter !== "4.1" || lab.href !== expected) failures.push(`${id} 必須連到 ${expected}。`);
}

for (const [label, source, requirements] of [
  ["A26", a26Source, ["createLifecycle", "createSegmentedControl", "watchTheme", "generateProbeSweep", "analyzeProbeSweep", "deriveEedf", "線性 I-V", "半對數", "EEDF", "RF 未補償", "純指數", "Vf 誤差", "Te 誤差", "referenceSweep", "syncCanvasResolution", "minEffectiveFontCssPx", "normalizeNearZero"]],
  ["A27", a27Source, ["createLifecycle", "createSegmentedControl", "watchTheme", "generateSpectrum", "calculateActinometry", "22", "F / Ar", "F / Si", "原子線待逐線核對", "分子帶待來源核對", "syncCanvasResolution", "minEffectiveFontCssPx", "annotationLimit"]]
]) {
  for (const required of requirements) {
    if (source && !source.includes(required)) failures.push(`${label} UI 缺少契約標記：${required}`);
  }
}

if (!/aspect-ratio:\s*720\s*\/\s*430/.test(labCssSource)) failures.push("A26/A27 Canvas CSS 必須固定 720/430 顯示比例。");
if (!/height:\s*auto/.test(labCssSource)) failures.push("A26/A27 Canvas CSS 必須以 height:auto 防止拉伸。");
if (/#lab-a2[67][\s\S]*?canvas[\s\S]*?min-height:/.test(labCssSource)) failures.push("A26/A27 Canvas 不可使用 min-height 拉伸顯示比例。");
if (!contentCheckSource.includes("19 個 P1-P3 章 + 6 個 L4 章")) failures.push("check:content 成功摘要必須明確說明 19 個 P1-P3 章 + 6 個 L4 章。");

if (builtPage) {
  const count = (pattern) => (builtPage.match(pattern) ?? []).length;
  if (count(/class="prose-section"/g) !== 7) failures.push("建置後 4.1 頁面必須有 7 個 prose section。");
  if (count(/data-lab-module=/g) !== 2) failures.push("建置後 4.1 頁面必須有 2 個 lab。");
  if (count(/class="check-card"/g) !== 8) failures.push("建置後 4.1 頁面必須有 8 個 self-check。");
  for (const required of ["上一章：", "下一章：", "pending-line-review", "pending-source-review", "data-unit-converter", "/assets/css/a26-a27.css"] ) {
    if (!builtPage.includes(required)) failures.push(`建置後 4.1 頁面缺少：${required}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("L4 4.1 診斷章節與 A26/A27 靜態契約檢查通過。");
