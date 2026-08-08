import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { level4Questions } from "../src/data/quiz/level-4.js";

const base = "http://localhost:4173";
const qaDir = path.resolve("qa");
await mkdir(qaDir, { recursive: true });
const objectiveCounts = {
  "1-1": 4, "1-2": 4, "1-3": 3, "1-4": 3, "1-5": 4, "1-6": 3,
  "2-1": 3, "2-2": 4, "2-3": 4, "2-4": 4, "2-5": 4, "2-6": 5,
  "3-1": 6, "3-2": 5, "3-3": 5, "3-4": 5, "3-5": 5, "3-6": 5, "3-7": 5, "3-8": 5,
  "4-1": 5, "4-2": 5, "4-3": 5, "4-4": 4, "4-5": 4, "4-6": 4
};
const questionById = new Map(level4Questions.map((question) => [question.id, question]));
const errors = [];
let browser;

try {
  browser = await chromium.launch({ headless: true });
} catch (error) {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  if (!existsSync(chromePath)) throw error;
  browser = await chromium.launch({ headless: true, executablePath: chromePath });
}

const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
watch(page);

await page.goto(`${base}/level/4/`, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.removeItem("plasma-academy.progress"));
await page.reload({ waitUntil: "networkidle" });
const lockedStatus = await page.locator("[data-exam-gate-status]").textContent();
const lockedLink = await page.locator("[data-exam-link]").isHidden();

const l4Unlocked = makeProgress(Object.fromEntries(Object.entries(objectiveCounts).filter(([id]) => id.startsWith("4-") && id !== "4-6")));
await setProgress(page, l4Unlocked);
await page.goto(`${base}/level/4/exam/?seed=task10`, { waitUntil: "networkidle" });
const unlockedStatus = await page.locator("[data-exam-unlock-status]").textContent();
const startDisabled = await page.locator("[data-exam-start]").isDisabled();
await page.click("[data-exam-start]");
await page.waitForSelector(".exam-question");

const questionCount = await page.locator("[data-exam-question-nav] button").count();
const draw = { single: 0, multi: 0, numeric: 0, graphic: 0, scenario: 0 };
let graphicLoaded = false;
for (let index = 0; index < questionCount; index += 1) {
  await page.locator("[data-exam-question-nav] button").nth(index).click();
  const id = await page.locator(".exam-question").getAttribute("data-question-id");
  const question = questionById.get(id);
  if (!question) throw new Error(`找不到抽中題目 ${id}。`);
  draw[question.type] += 1;
  if (question.type === "numeric") {
    await page.locator(".exam-question input[type=number]").fill(String(question.answer));
  } else {
    for (const option of question.options.filter((item) => item.correct)) {
      await page.locator(`.exam-question input[value="${option.id}"]`).click();
    }
  }
  if (question.type === "graphic") {
    graphicLoaded ||= await page.locator(".exam-graphic img").evaluate((image) => image.complete && image.naturalWidth > 0 && image.alt.trim().length >= 12);
  }
}
await page.screenshot({ path: path.join(qaDir, "desktop-l4-exam.png"), fullPage: false });
await page.click("[data-exam-submit]");
const score = Number(await page.locator(".exam-score > div > strong").textContent());
const storedL4 = await page.evaluate(() => JSON.parse(localStorage.getItem("plasma-academy.progress")).quizzes.L4);

await page.goto(`${base}/progress/`, { waitUntil: "networkidle" });
const l4Badge = await page.locator("[data-progress-l4-badge]").evaluate((element) => element.classList.contains("earned"));
const partialCertificateDisabled = await page.locator("[data-certificate-generate]").isDisabled();

const complete = makeProgress(objectiveCounts, Object.fromEntries([1, 2, 3, 4].map((level) => [`L${level}`, { attempts: [], bestScore: 100, passed: true, completedAt: "2026-08-01T00:00:00.000Z" }])));
await setProgress(page, complete);
await page.goto(`${base}/progress/`, { waitUntil: "networkidle" });
const fullBadge = await page.locator("[data-progress-all-badge]").evaluate((element) => element.classList.contains("earned"));
const certificateEnabled = !(await page.locator("[data-certificate-generate]").isDisabled());
await page.fill("[data-certificate-name]", "測試學員");
await page.click("[data-certificate-generate]");
const certificate = page.locator("[data-training-certificate]");
await certificate.waitFor({ state: "visible" });
const certificateText = await certificate.textContent();
const moduleCount = await certificate.locator("[data-certificate-module]").count();
await certificate.screenshot({ path: path.join(qaDir, "desktop-training-certificate.png") });
const generatedProgress = await page.evaluate(() => JSON.parse(localStorage.getItem("plasma-academy.progress")));

await page.locator("[data-import-progress]").setInputFiles({
  name: "invalid-progress.json",
  mimeType: "application/json",
  buffer: Buffer.from("{not valid json", "utf8")
});
await page.waitForFunction(() => document.querySelector("[data-import-status]")?.textContent?.includes("匯入失敗"));
const invalidImportStatus = await page.locator("[data-import-status]").textContent();
await page.locator("[data-import-progress]").setInputFiles({
  name: "normalized-progress.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify({ chapters: null, quizzes: null, labUsage: null }), "utf8")
});
await page.waitForFunction(() => document.querySelector("[data-import-status]")?.textContent?.includes("進度匯入完成"));
const normalizedImportStatus = await page.locator("[data-import-status]").textContent();
const normalizedProgress = await page.evaluate(() => JSON.parse(localStorage.getItem("plasma-academy.progress")));
await setProgress(page, generatedProgress);
await page.reload({ waitUntil: "networkidle" });

await page.emulateMedia({ media: "print" });
await page.evaluate(() => document.body.classList.add("pa-print-certificate"));
const printGeometry = await certificate.evaluate((element) => {
  const rect = element.getBoundingClientRect();
  return { display: getComputedStyle(element).display, left: rect.left, right: rect.right, viewport: document.documentElement.clientWidth };
});
await page.evaluate(() => document.body.classList.remove("pa-print-certificate"));
await page.emulateMedia({ media: "screen" });

const mobile = await context.newPage();
watch(mobile);
await mobile.setViewportSize({ width: 375, height: 812 });
await mobile.goto(`${base}/progress/`, { waitUntil: "networkidle" });
const mobileProgressOverflow = await hasHorizontalOverflow(mobile);
await mobile.screenshot({ path: path.join(qaDir, "mobile-progress-certificate.png"), fullPage: false });
await mobile.locator("[data-training-certificate]").screenshot({ path: path.join(qaDir, "mobile-training-certificate.png") });
await mobile.goto(`${base}/level/4/exam/?seed=task10`, { waitUntil: "networkidle" });
await mobile.click("[data-exam-start]");
await mobile.waitForSelector(".exam-question");
const mobileExamOverflow = await hasHorizontalOverflow(mobile);

await browser.close();

if (!lockedStatus.includes("還需完成 5 章") || !lockedLink) throw new Error(`L4 locked gate 錯誤：${lockedStatus}`);
if (!unlockedStatus.includes("已完成 5/6 章") || startDisabled) throw new Error(`L4 5/6 unlock 錯誤：${unlockedStatus}`);
if (questionCount !== 30 || JSON.stringify(draw) !== JSON.stringify({ single: 8, multi: 4, numeric: 3, graphic: 5, scenario: 10 })) throw new Error(`L4 draw 錯誤：${questionCount} / ${JSON.stringify(draw)}`);
if (!graphicLoaded) throw new Error("L4 圖形題未載入有效本機圖片與 alt text。");
if (score !== 100 || !storedL4?.passed || storedL4.bestScore !== 100 || !l4Badge) throw new Error("L4 滿分作答、持久化或電漿專家徽章失敗。");
if (!partialCertificateDisabled) throw new Error("只通過 L4、尚未完成 26 章時不應允許產生證書。");
if (!fullBadge || !certificateEnabled || moduleCount !== 26) throw new Error("全程完訓徽章、證書資格或 26 模組清單失敗。");
if (!certificateText.includes("測試學員") || !certificateText.includes("完成日期") || !certificateText.includes("L4 電漿專家") || !certificateText.includes("本證書由學習者本機產生，供內部訓練紀錄參考，非第三方認證。")) throw new Error("證書姓名、階段、日期或固定聲明缺失。");
if (!invalidImportStatus.includes("匯入失敗") || !normalizedImportStatus.includes("匯入完成") || Object.keys(normalizedProgress.chapters).length || Object.keys(normalizedProgress.quizzes).length || Object.keys(normalizedProgress.labUsage).length) throw new Error("進度匯入錯誤處理或資料正規化失敗。");
if (printGeometry.display === "none" || printGeometry.left < -1 || printGeometry.right > printGeometry.viewport + 1) throw new Error(`列印證書版面溢出：${JSON.stringify(printGeometry)}`);
if (mobileProgressOverflow || mobileExamOverflow) throw new Error(`375px 發生水平溢出：progress=${mobileProgressOverflow}, exam=${mobileExamOverflow}`);
if (errors.length) throw new Error(`L4 exam UI 發生錯誤：${errors.join(" | ")}`);

console.log(`L4 測驗 UI 驗證通過：locked/unlocked、${questionCount} 題 draw、100 分、四階徽章、26 章證書、375px 與列印版面。`);

function makeProgress(counts, quizzes = {}) {
  return {
    version: 1,
    role: null,
    chapters: Object.fromEntries(Object.entries(counts).map(([id, count]) => [id, { visited: true, objectives: Array(count).fill(true), quizScore: 1, lastVisit: "2026-08-01T00:00:00.000Z" }])),
    quizzes,
    labUsage: {},
    bookmarks: [],
    settings: { theme: "auto", reducedMotion: false, showEnglishTerms: true }
  };
}

async function setProgress(target, progress) {
  await target.evaluate((value) => localStorage.setItem("plasma-academy.progress", JSON.stringify(value)), progress);
}

async function hasHorizontalOverflow(target) {
  return target.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

function watch(target) {
  target.on("pageerror", (error) => errors.push(error.message));
  target.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
}
