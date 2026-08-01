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
const qaDir = path.resolve("qa");
await mkdir(qaDir, { recursive: true });
const errors = [];

function watch(page) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
}

async function canvasHasPixels(page, selector) {
  return page.locator(selector).evaluate((canvas) => {
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set();
    for (let index = 4; index < pixels.length; index += 1600) {
      colors.add(`${pixels[index]},${pixels[index + 1]},${pixels[index + 2]},${pixels[index + 3]}`);
    }
    return colors.size >= 4;
  });
}

async function waitForLab(page, selector) {
  const lab = page.locator(selector);
  await lab.scrollIntoViewIfNeeded();
  await page.waitForFunction((target) => document.querySelector(`${target} canvas`)?.dataset.renderState === "complete", selector);
  return lab;
}

async function setRange(page, lab, label, value) {
  await lab.locator(".control").filter({ hasText: label }).first().locator('input[type="range"]').fill(String(value));
  await page.waitForTimeout(30);
}

function nearCanvasRatio(value) {
  return Math.abs(value - 720 / 430) < 0.02;
}

async function toggleThemeAndWait(page, selector, previous) {
  await page.locator("[data-theme-toggle]").click();
  if (await page.locator(selector).getAttribute("data-theme-bg") === previous) {
    await page.locator("[data-theme-toggle]").click();
  }
  await page.waitForFunction((target, before) => document.querySelector(target)?.dataset.themeBg !== before, selector, previous);
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
watch(desktop);

await desktop.goto(`${base}/level/4/4-4-advanced-techniques/`, { waitUntil: "networkidle" });
const a30 = await waitForLab(desktop, "#lab-a30");
const a31 = await waitForLab(desktop, "#lab-a31");
const a30Canvas = a30.locator("canvas");
const a31Canvas = a31.locator("canvas");
const a30Ratio = await a30Canvas.evaluate((canvas) => canvas.getBoundingClientRect().width / canvas.getBoundingClientRect().height);
const a31Ratio = await a31Canvas.evaluate((canvas) => canvas.getBoundingClientRect().width / canvas.getBoundingClientRect().height);
const a30Pixels = await canvasHasPixels(desktop, "#lab-a30 canvas");
const a31Pixels = await canvasHasPixels(desktop, "#lab-a31 canvas");
const a30ThemeBefore = await a30Canvas.getAttribute("data-theme-bg");
await toggleThemeAndWait(desktop, "#lab-a30 canvas", a30ThemeBefore);
const a30ThemeAfter = await a30Canvas.getAttribute("data-theme-bg");

await setRange(desktop, a30, "離子能量", 0);
const a30LowRegime = await a30Canvas.getAttribute("data-regime");
await setRange(desktop, a30, "離子能量", 150);
const a30HighRegime = await a30Canvas.getAttribute("data-regime");
await setRange(desktop, a30, "改質時間", 0.02);
const a30ShortModification = await a30.locator("[data-lab-status]").textContent();
const a30Signature = await a30Canvas.getAttribute("data-numeric-signature");

const a31InitialSignature = await a31Canvas.getAttribute("data-numeric-signature");
const a31Continuous = Number(await a31Canvas.getAttribute("data-continuous-charge"));
await setRange(desktop, a31, "頻率", 10);
const a31HighFrequencySignature = await a31Canvas.getAttribute("data-numeric-signature");
await a31.getByRole("radio", { name: "Source" }).click();
const a31SourceMode = await a31Canvas.getAttribute("data-mode");
await a31.getByRole("radio", { name: "Bias" }).click();
const a31BiasMode = await a31Canvas.getAttribute("data-mode");
await a31.getByRole("radio", { name: "同步" }).click();
const a31SyncMode = await a31Canvas.getAttribute("data-mode");
const a31Pulsed = Number(await a31Canvas.getAttribute("data-terminal-charge"));
await a30.screenshot({ path: path.join(qaDir, "desktop-a30-lab.png") });
await a31.screenshot({ path: path.join(qaDir, "desktop-a31-lab.png") });

await desktop.goto(`${base}/level/4/4-5-plasma-modeling-data/`, { waitUntil: "networkidle" });
const a32 = await waitForLab(desktop, "#lab-a32");
const a32Canvas = a32.locator("canvas");
const a32Ratio = await a32Canvas.evaluate((canvas) => canvas.getBoundingClientRect().width / canvas.getBoundingClientRect().height);
const a32Pixels = await canvasHasPixels(desktop, "#lab-a32 canvas");
const a32IntersectionError = Number(await a32Canvas.getAttribute("data-intersection-error"));
const a32InitialDensity = Number(await a32Canvas.getAttribute("data-density"));
const a32InitialSignature = await a32Canvas.getAttribute("data-numeric-signature");
await setRange(desktop, a32, "吸收功率", 3000);
const a32HighPowerDensity = Number(await a32Canvas.getAttribute("data-density"));
const a32HighPowerSignature = await a32Canvas.getAttribute("data-numeric-signature");
const a32ThemeBefore = await a32Canvas.getAttribute("data-theme-bg");
await toggleThemeAndWait(desktop, "#lab-a32 canvas", a32ThemeBefore);
await a32.screenshot({ path: path.join(qaDir, "desktop-a32-lab.png") });

const mobile = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
watch(mobile);
const mobileResults = [];
for (const [route, selectors] of [
  ["/level/4/4-4-advanced-techniques/", ["#lab-a30", "#lab-a31"]],
  ["/level/4/4-5-plasma-modeling-data/", ["#lab-a32"]]
]) {
  await mobile.goto(`${base}${route}`, { waitUntil: "networkidle" });
  for (const selector of selectors) {
    const lab = await waitForLab(mobile, selector);
    const canvas = lab.locator("canvas");
    mobileResults.push({
      selector,
      overflow: await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1),
      ratio: await canvas.evaluate((item) => item.getBoundingClientRect().width / item.getBoundingClientRect().height),
      pixels: await canvasHasPixels(mobile, `${selector} canvas`),
      minFontCssPx: Number(await canvas.getAttribute("data-min-font-css-px")),
      labelLayout: await canvas.getAttribute("data-label-layout")
    });
    await lab.screenshot({ path: path.join(qaDir, `mobile-${selector.slice(5)}-lab.png`) });
  }
}

const hashNavigationResults = [];
for (const [route, selector] of [
  ["/level/4/4-4-advanced-techniques/#lab-a30", "#lab-a30"],
  ["/level/4/4-4-advanced-techniques/#lab-a31", "#lab-a31"],
  ["/level/4/4-5-plasma-modeling-data/#lab-a32", "#lab-a32"]
]) {
  await mobile.goto(`${base}${route}`, { waitUntil: "networkidle" });
  await mobile.waitForTimeout(100);
  hashNavigationResults.push(await mobile.evaluate((target) => {
    const header = document.querySelector(".site-header").getBoundingClientRect();
    const lab = document.querySelector(target).getBoundingClientRect();
    return { target, headerBottom: header.bottom, labTop: lab.top, visible: lab.top >= header.bottom - 1 };
  }, selector));
}

const reducedMotion = await browser.newPage({ viewport: { width: 900, height: 700 }, reducedMotion: "reduce" });
watch(reducedMotion);
const reducedResults = [];
for (const [route, selector, buttonName] of [
  ["/level/4/4-4-advanced-techniques/", "#lab-a30", "播放或暫停 A30 原子層蝕刻循環動畫"],
  ["/level/4/4-4-advanced-techniques/", "#lab-a31", "播放或暫停 A31 脈衝時序動畫"]
]) {
  await reducedMotion.goto(`${base}${route}`, { waitUntil: "networkidle" });
  const lab = await waitForLab(reducedMotion, selector);
  await lab.getByRole("button", { name: buttonName }).click();
  reducedResults.push({ selector, playhead: Number(await lab.locator("canvas").getAttribute("data-playhead")), buttonText: await lab.getByRole("button", { name: buttonName }).textContent() });
}

await browser.close();

if (!nearCanvasRatio(a30Ratio) || !nearCanvasRatio(a31Ratio) || !nearCanvasRatio(a32Ratio) || !a30Pixels || !a31Pixels || !a32Pixels) throw new Error("A30-A32 桌機 Canvas 結構、比例或像素輸出失敗。");
if (a30ThemeBefore === a30ThemeAfter || a30LowRegime !== "below-window" || a30HighRegime !== "continuous-sputter" || !a30ShortModification?.includes("不穩定") || !a30Signature) throw new Error("A30 主題重繪、能量窗或失效模式驗證失敗。");
if (a31InitialSignature === a31HighFrequencySignature || a31SourceMode !== "source" || a31BiasMode !== "bias" || a31SyncMode !== "synchronized" || !(a31Pulsed < a31Continuous)) throw new Error("A31 頻率、模式或 continuous 比較驗證失敗。");
if (!Number.isFinite(a32IntersectionError) || a32IntersectionError > 1e-6 || a32InitialSignature === a32HighPowerSignature || !(a32HighPowerDensity > a32InitialDensity)) throw new Error("A32 交點或功率掃描驗證失敗。");
if (mobileResults.some((item) => item.overflow || !nearCanvasRatio(item.ratio) || !item.pixels || item.minFontCssPx < 11 || item.labelLayout !== "compact")) throw new Error(`A30-A32 手機版溢出、比例、字級或 Canvas 異常：${JSON.stringify(mobileResults)}`);
if (hashNavigationResults.some((item) => !item.visible)) throw new Error(`A30-A32 hash 導覽被 sticky header 遮蔽：${JSON.stringify(hashNavigationResults)}`);
if (reducedResults.some((item) => item.playhead < 0.99 || item.buttonText !== "播放")) throw new Error(`A30/A31 reduced-motion 驗證失敗：${JSON.stringify(reducedResults)}`);
if (errors.length) throw new Error(`瀏覽器錯誤：${errors.join(" | ")}`);

console.log("L4 A30-A32 瀏覽器驗證通過：桌機、375px、主題、失效模式、模式/頻率與 0-D 交點。");
