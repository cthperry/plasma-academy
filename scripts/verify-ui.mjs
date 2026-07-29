import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const browser = await chromium.launch({ headless: true });
const base = "http://localhost:4173";
const qaDir = path.resolve("qa");
await mkdir(qaDir, { recursive: true });
const errors = [];

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
desktop.on("pageerror", (error) => errors.push(error.message));
desktop.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

await desktop.goto(`${base}/`, { waitUntil: "networkidle" });
await desktop.screenshot({ path: path.join(qaDir, "desktop-home.png"), fullPage: true });
await desktop.click("[data-theme-toggle]");
const themeAfterClick = await desktop.locator("html").getAttribute("data-theme");
await desktop.click("[data-search-open]");
await desktop.fill("[data-search-input]", "封裝清潔");
await desktop.waitForTimeout(500);
const searchCount = await desktop.locator("[data-search-results] a").count();
const packagingSearchHit = await desktop.locator("[data-search-results]").textContent();

const l1Routes = [
  ["/level/1/1-2-parameters/", "1.2 電漿基本參數"],
  ["/level/1/1-3-collisions-mfp/", "1.3 碰撞與平均自由徑"],
  ["/level/1/1-4-glow-breakdown/", "1.4 輝光放電與點火"],
  ["/level/1/1-5-sheath/", "1.5 鞘層入門"],
  ["/level/1/1-6-process-map/", "1.6 製程電漿地圖"]
];
const l1Checks = [];
for (const [route, expectedTitle] of l1Routes) {
  await desktop.goto(`${base}${route}`, { waitUntil: "networkidle" });
  const title = await desktop.locator("h1").first().textContent();
  const firstLab = desktop.locator("[data-lab-container]").first();
  await firstLab.scrollIntoViewIfNeeded();
  await desktop.waitForTimeout(600);
  const labPixels = await desktop.evaluate(() => {
    const canvas = document.querySelector("[data-lab-canvas]");
    if (!canvas) return 0;
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonBlank = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] || data[i + 1] || data[i + 2]) nonBlank++;
    }
    return nonBlank;
  });
  l1Checks.push({ route, title, expectedTitle, labPixels });
}

await desktop.goto(`${base}/level/3/`, { waitUntil: "networkidle" });
await desktop.click('a[href="/level/3/3-7-packaging-cleaning/"]');
await desktop.waitForLoadState("networkidle");
const packagingH1 = await desktop.locator("h1").first().textContent();
await desktop.screenshot({ path: path.join(qaDir, "desktop-packaging-cleaning.png"), fullPage: true });

await desktop.goto(`${base}/level/1/1-1-fourth-state/`, { waitUntil: "networkidle" });
await desktop.locator("#lab-a01").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(800);
const canvasInfo = await desktop.evaluate(() => {
  const canvas = document.querySelector("[data-a01-canvas]");
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] || data[i + 1] || data[i + 2]) nonBlank++;
  }
  return { width: canvas.width, height: canvas.height, nonBlank };
});
await desktop.click('[data-objective="0"]');
await desktop.click('.quiz-choice[data-correct="true"]');
const quizText = await desktop.locator(".quiz-result").textContent();
await desktop.screenshot({ path: path.join(qaDir, "desktop-chapter.png"), fullPage: true });

const mobile = await browser.newPage({ viewport: { width: 375, height: 900 }, deviceScaleFactor: 1, isMobile: true });
mobile.on("pageerror", (error) => errors.push(error.message));
mobile.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
await mobile.goto(`${base}/level/1/1-1-fourth-state/`, { waitUntil: "networkidle" });
await mobile.waitForTimeout(800);
const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
await mobile.screenshot({ path: path.join(qaDir, "mobile-chapter.png"), fullPage: true });
await mobile.locator("#lab-a01").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(800);
const mobileCanvasInfo = await mobile.evaluate(() => {
  const canvas = document.querySelector("[data-a01-canvas]");
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] || data[i + 1] || data[i + 2]) nonBlank++;
  }
  return { width: canvas.width, height: canvas.height, nonBlank };
});
await mobile.screenshot({ path: path.join(qaDir, "mobile-lab.png"), fullPage: false });

await browser.close();

const result = { themeAfterClick, searchCount, packagingSearchHit, packagingH1, l1Checks, canvasInfo, mobileCanvasInfo, quizText, mobileOverflow, errors };
console.log(JSON.stringify(result, null, 2));

if (themeAfterClick !== "light" && themeAfterClick !== "dark") throw new Error("主題切換未解析為 light/dark。");
if (searchCount < 1) throw new Error("搜尋沒有回傳結果。");
if (!packagingSearchHit.includes("封裝") || !packagingH1.includes("封裝清潔")) throw new Error("封裝清潔頁或搜尋入口未通過驗證。");
for (const check of l1Checks) {
  if (!check.title.includes(check.expectedTitle) || check.labPixels < 100000) {
    throw new Error(`L1 章節驗證失敗: ${JSON.stringify(check)}`);
  }
}
if (canvasInfo.nonBlank < canvasInfo.width * canvasInfo.height * 0.5) throw new Error("A01 Canvas 看起來是空白。");
if (mobileCanvasInfo.nonBlank < mobileCanvasInfo.width * mobileCanvasInfo.height * 0.5) throw new Error("手機 A01 Canvas 看起來是空白。");
if (!quizText.includes("正確")) throw new Error("自我檢測沒有顯示成功狀態。");
if (mobileOverflow) throw new Error("手機版有水平溢出。");
if (errors.length) throw new Error(`瀏覽器 console/page errors: ${errors.join("; ")}`);
