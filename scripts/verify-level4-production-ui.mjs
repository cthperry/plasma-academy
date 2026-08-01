import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch (error) {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  if (!existsSync(chromePath)) throw error;
  browser = await chromium.launch({ headless: true, executablePath: chromePath });
}

const base = "http://localhost:4173";
const route = "/level/4/4-6-production-yield-safety/";
const qaDir = path.resolve("qa");
await mkdir(qaDir, { recursive: true });
const errors = [];

function watch(page) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
}

async function verifyPage(page, label) {
  watch(page);
  await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
  const cases = page.locator(".production-case");
  const answers = page.locator(".production-case-answer");
  const caseCount = await cases.count();
  const answerCount = await answers.count();
  const initiallyOpen = await answers.evaluateAll((items) => items.filter((item) => item.open).length);
  for (let index = 0; index < answerCount; index += 1) await answers.nth(index).locator("summary").click();
  const openCount = await answers.evaluateAll((items) => items.filter((item) => item.open).length);
  const overflowAfterOpen = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  const revealedHeadings = await answers.first().locator("h4").allTextContents();
  const previousHref = await page.getByRole("link", { name: /上一章：4\.5/ }).getAttribute("href");
  const nextHref = await page.getByRole("link", { name: /下一章：返回 L4 模組列表/ }).getAttribute("href");
  const outlineHref = await page.locator('.chapter-outline a[href="#production-casebook"]').getAttribute("href");
  await page.locator("#production-casebook").screenshot({ path: path.join(qaDir, `${label}-production-casebook.png`) });
  return { caseCount, answerCount, initiallyOpen, openCount, overflowAfterOpen, revealedHeadings, previousHref, nextHref, outlineHref };
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const desktopResult = await verifyPage(desktop, "desktop-l4-production");
const mobile = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
const mobileResult = await verifyPage(mobile, "mobile-l4-production");
await mobile.goto(`${base}${route}#production-casebook`, { waitUntil: "networkidle" });
await mobile.waitForTimeout(100);
const hashResult = await mobile.evaluate(() => {
  const header = document.querySelector(".site-header").getBoundingClientRect();
  const target = document.querySelector("#production-casebook").getBoundingClientRect();
  return { headerBottom: header.bottom, targetTop: target.top, visible: target.top >= header.bottom - 1 };
});

await browser.close();

for (const [label, result] of [["桌機", desktopResult], ["手機", mobileResult]]) {
  if (result.caseCount !== 5 || result.answerCount !== 5 || result.initiallyOpen !== 0) throw new Error(`${label}案例數量或預設收合狀態錯誤：${JSON.stringify(result)}`);
  if (result.openCount !== 5 || result.overflowAfterOpen) throw new Error(`${label}逐案展開或水平溢位驗證失敗：${JSON.stringify(result)}`);
  if (!["根因", "處置", "放行", "預防"].every((heading) => result.revealedHeadings.includes(heading))) throw new Error(`${label}案例揭曉欄位不完整。`);
  if (result.previousHref !== "/level/4/4-5-plasma-modeling-data/" || result.nextHref !== "/level/4/" || result.outlineHref !== "#production-casebook") throw new Error(`${label}章節或大綱導覽錯誤：${JSON.stringify(result)}`);
}
if (!hashResult.visible) throw new Error(`手機 hash 導覽被固定頁首遮蔽：${JSON.stringify(hashResult)}`);
if (errors.length) throw new Error(`瀏覽器錯誤：${errors.join(" | ")}`);

console.log("L4 量產章節瀏覽器驗證通過：桌機與 375px、五案收合/展開、完整揭曉欄位、無水平溢位與導覽。");
