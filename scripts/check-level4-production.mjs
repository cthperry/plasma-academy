import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chapterFourSix } from "../src/content/chapter-4-6.mjs";
import { curriculum } from "../src/data/curriculum.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const builtPath = path.join(root, "dist", "client", "level", "4", "4-6-production-yield-safety", "index.html");
const failures = [];
const requiredFields = ["id", "title", "phenomenon", "data", "hypotheses", "verification", "rootCause", "action", "release", "prevention", "engineeringNote"];
const requiredTokens = [
  "Chamber matching", "DOE", "交互作用", "隨機化", "中心點", "actual", "setpoint", "COO", "PM", "seasoning", "FDC",
  "EHS", "氣體", "RF", "abatement", "PFC", "GWP", "RDL", "UBM", "Cu", "PI/PBO", "mold compound", "low-k",
  "queue", "re-clean", "接合", "可靠度"
];

function textOf(value) {
  if (typeof value === "string") return value.replace(/<[^>]+>/g, " ");
  if (Array.isArray(value)) return value.map(textOf).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(textOf).join(" ");
  return "";
}

function effectiveLength(value) {
  return textOf(value).match(/[\p{L}\p{N}]/gu)?.length ?? 0;
}

function countMatches(source, pattern) {
  return source.match(pattern)?.length ?? 0;
}

const moduleFour = curriculum.levels.find((level) => level.id === 4)?.modules.find((module) => module.id === "4.6");
if (chapterFourSix.id !== "4-6") failures.push("章節 id 必須是 4-6。");
if (chapterFourSix.route !== "/level/4/4-6-production-yield-safety/") failures.push("4.6 route 不符合 production-yield-safety 契約。");
if (chapterFourSix.hours !== 2) failures.push("4.6 必須是 2 小時。");
if (!moduleFour) failures.push("curriculum 缺少 4.6 module。");
if (moduleFour?.href !== chapterFourSix.route) failures.push("curriculum 4.6 href 必須與章節 route 一致。");
if (moduleFour?.hours !== 2) failures.push("curriculum 4.6 hours 必須是 2。");
if (!Array.isArray(moduleFour?.labs) || moduleFour.labs.length !== 0) failures.push("curriculum 4.6 必須明確沒有 labs。");
if (chapterFourSix.sections.length !== 6) failures.push(`4.6 必須有 6 節正文，目前 ${chapterFourSix.sections.length} 節。`);
if (chapterFourSix.selfCheck.length !== 7) failures.push(`4.6 必須有 7 題自我檢測，目前 ${chapterFourSix.selfCheck.length} 題。`);
if (chapterFourSix.selfCheck.some((item) => !Array.isArray(item) || !item[0] || !item[1])) failures.push("4.6 每題自我檢測都必須有問題與答案。");

const sourceTextUnits = effectiveLength(chapterFourSix);
if (sourceTextUnits < 10000) failures.push(`4.6 source 有效內容至少需 10,000 字，目前 ${sourceTextUnits} 字。`);
const chapterText = textOf(chapterFourSix);
for (const token of requiredTokens) if (!chapterText.toLowerCase().includes(token.toLowerCase())) failures.push(`4.6 缺少必要內容 token：${token}。`);

if (!Array.isArray(chapterFourSix.cases) || chapterFourSix.cases.length !== 5) failures.push(`4.6 必須有恰好 5 個量產案例，目前 ${chapterFourSix.cases?.length ?? 0} 個。`);
const caseIds = new Set();
for (const item of chapterFourSix.cases ?? []) {
  if (caseIds.has(item.id)) failures.push(`4.6 案例 ID 重複：${item.id}。`);
  caseIds.add(item.id);
  for (const field of requiredFields) if (!item[field]) failures.push(`4.6/${item.id ?? "?"} 缺少 ${field}。`);
  if (!Array.isArray(item.hypotheses) || item.hypotheses.length < 2) failures.push(`4.6/${item.id ?? "?"} 至少需要 2 個競爭假說。`);
  if (effectiveLength(item) < 650) failures.push(`4.6/${item.id} 案例內容少於 650 個有效字元。`);
}

if (!fs.existsSync(builtPath)) {
  failures.push(`找不到 built HTML：${path.relative(root, builtPath)}。`);
} else {
  const html = fs.readFileSync(builtPath, "utf8");
  const builtTextUnits = effectiveLength(html);
  if (builtTextUnits < 10000) failures.push(`4.6 built HTML 有效內容至少需 10,000 字，目前 ${builtTextUnits} 字。`);
  if (countMatches(html, /class="production-case case-study"/g) !== 5) failures.push("built HTML 必須有恰好 5 個 production-case。");
  if (countMatches(html, /<details class="production-case-answer">/g) !== 5) failures.push("built HTML 必須有恰好 5 個 production-case-answer details。");
  if (countMatches(html, /class="engineering-casebook production-casebook"/g) !== 1) failures.push("built HTML 缺少唯一 production-casebook。");
  for (const heading of ["現象與資料", "競爭假說", "驗證計畫", "根因", "處置", "放行", "預防"]) {
    if (countMatches(html, new RegExp(`<h4>${heading}<\\/h4>`, "g")) !== 5) failures.push(`built HTML 的「${heading}」標題必須恰好出現 5 次。`);
  }
  if (countMatches(html, /class="check-card"/g) !== 7) failures.push("built HTML 必須有恰好 7 個 self-check cards。");
  if (html.includes('<details class="production-case-answer" open>')) failures.push("案例答案 details 不得預設展開。");
  if (!html.includes('href="/level/4/4-5-plasma-modeling-data/"')) failures.push("built HTML 缺少 4.5 上一章連結。");
  if (!html.includes("上一章：4.5 電漿模擬與資料")) failures.push("built HTML 缺少 4.5 上一章標籤。");
  if (!html.includes('href="/level/4/"')) failures.push("built HTML 缺少返回 L4 列表連結。");
  if (!html.includes("下一章：返回 L4 模組列表")) failures.push("built HTML 缺少返回 L4 列表導覽標籤。");
  if (!html.includes('<link rel="stylesheet" href="/assets/css/l3-casebook.css">')) failures.push("built HTML 缺少案例手冊 CSS link。");
  if (html.includes('<link rel="stylesheet" href="/assets/css/a28-a29.css">')) failures.push("4.6 不應載入 A28/A29 實驗 CSS。");
  if (!html.includes("時數 2 h · 案例演練 5 則")) failures.push("4.6 頁首必須說明 5 則案例演練。");
  if (!html.includes('<a href="#production-casebook">量產案例判讀</a>')) failures.push("4.6 大綱缺少量產案例判讀錨點。");
  if (!html.includes('href="/lab/"')) failures.push("built HTML 缺少互動實驗室連結。");
  if (html.includes("lab-a30") || html.includes("lab-a31") || html.includes("lab-a32")) failures.push("4.6 不應渲染 A30-A32 lab 元件。");
}

if (failures.length) {
  console.error(`L4 量產章節檢查失敗（${failures.length} 項）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`L4 量產章節檢查通過：4.6 source ${sourceTextUnits} 個有效字元、7 題 self-check、5 個案例，built HTML >=10,000 字且案例/details/nav/CSS/links 契約均符合。`);
