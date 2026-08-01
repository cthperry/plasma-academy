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
    let varied = 0;
    for (let index = 4; index < pixels.length; index += 1600) {
      if (pixels[index] !== pixels[0] || pixels[index + 1] !== pixels[1] || pixels[index + 2] !== pixels[2]) varied += 1;
    }
    return varied > 8;
  });
}

async function setRange(page, lab, label, value) {
  const control = page.locator(`${lab} .control`).filter({ hasText: label }).first();
  await control.locator('input[type="range"]').fill(String(value));
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
watch(desktop);

await desktop.goto(`${base}/level/4/4-2-endpoint-control/`, { waitUntil: "networkidle" });
const a28 = desktop.locator("#lab-a28");
await a28.scrollIntoViewIfNeeded();
await desktop.waitForFunction(() => document.querySelector("#lab-a28 canvas")?.dataset.renderState === "complete");
const a28Title = await desktop.locator("h1").first().textContent();
const a28ControlCount = await a28.locator(".lab-panel .control").count();
const a28OutputCount = await a28.locator(".value-panel dd").count();
const a28Ratio = await a28.locator("canvas").evaluate((canvas) => canvas.getBoundingClientRect().width / canvas.getBoundingClientRect().height);
const a28Pixels = await canvasHasPixels(desktop, "#lab-a28 canvas");
const a28PausedClears = await a28.locator("canvas").evaluate(async (canvas) => {
  const ctx = canvas.getContext("2d");
  const original = ctx.clearRect.bind(ctx);
  let clears = 0;
  ctx.clearRect = (...args) => { clears += 1; return original(...args); };
  await new Promise((resolve) => setTimeout(resolve, 250));
  ctx.clearRect = original;
  return clears;
});
await a28.getByRole("button", { name: "播放或暫停 A28 終點訊號時間動畫" }).click();
await desktop.waitForTimeout(300);
const a28AnimatedPlayhead = Number(await a28.locator("canvas").getAttribute("data-playhead"));
await a28.getByRole("button", { name: "播放或暫停 A28 終點訊號時間動畫" }).click();
await setRange(desktop, "#lab-a28", "開口率", 0);
await setRange(desktop, "#lab-a28", "雜訊", 20);
await a28.getByRole("radio", { name: "原始" }).click();
await desktop.waitForFunction(() => document.querySelector("#lab-a28 canvas")?.dataset.oesReliable === "false");
const a28LowAreaStatus = await a28.locator("[data-lab-status]").textContent();
const a28CurveSignatures = [];
for (const label of ["原始", "移動平均", "一階微分", "歸一化"]) {
  await a28.getByRole("radio", { name: label }).click();
  a28CurveSignatures.push(await a28.locator("canvas").getAttribute("data-curve-signature"));
}
const a28Algorithm = await a28.locator("canvas").getAttribute("data-algorithm");
const a28ThemeBefore = await desktop.locator("html").getAttribute("data-theme");
const a28BackgroundBefore = await a28.locator("canvas").evaluate((canvas) => [...canvas.getContext("2d").getImageData(0, 0, 1, 1).data].join(","));
await desktop.locator("[data-theme-toggle]").click();
let a28ThemeAfter = await desktop.locator("html").getAttribute("data-theme");
if (a28ThemeAfter === a28ThemeBefore) {
  await desktop.locator("[data-theme-toggle]").click();
  a28ThemeAfter = await desktop.locator("html").getAttribute("data-theme");
}
const a28BackgroundAfter = await a28.locator("canvas").evaluate((canvas) => [...canvas.getContext("2d").getImageData(0, 0, 1, 1).data].join(","));
await a28.screenshot({ path: path.join(qaDir, "desktop-a28-lab.png") });

await desktop.goto(`${base}/level/4/4-3-plasma-damage/`, { waitUntil: "networkidle" });
const a29 = desktop.locator("#lab-a29");
await a29.scrollIntoViewIfNeeded();
await desktop.waitForFunction(() => document.querySelector("#lab-a29 canvas")?.dataset.renderState === "complete");
const a29Title = await desktop.locator("h1").first().textContent();
const a29ControlCount = await a29.locator(".lab-panel .control").count();
const a29OutputCount = await a29.locator(".value-panel dd").count();
const a29Ratio = await a29.locator("canvas").evaluate((canvas) => canvas.getBoundingClientRect().width / canvas.getBoundingClientRect().height);
const a29Pixels = await canvasHasPixels(desktop, "#lab-a29 canvas");
const a29FinalUvBeforeAnimation = Number(await a29.locator('[data-value-key="UV/VUV 劑量"]').textContent());
const a29PausedClears = await a29.locator("canvas").evaluate(async (canvas) => {
  const ctx = canvas.getContext("2d");
  const original = ctx.clearRect.bind(ctx);
  let clears = 0;
  ctx.clearRect = (...args) => { clears += 1; return original(...args); };
  await new Promise((resolve) => setTimeout(resolve, 250));
  ctx.clearRect = original;
  return clears;
});
await a29.getByRole("button", { name: "播放或暫停 A29 天線充電時間動畫" }).click();
await desktop.waitForTimeout(300);
const a29AnimatedPlayhead = Number(await a29.locator("canvas").getAttribute("data-playhead"));
const a29AnimatedUv = Number(await a29.locator('[data-value-key="UV/VUV 劑量"]').textContent());
await a29.getByRole("button", { name: "播放或暫停 A29 天線充電時間動畫" }).click();
await a29.getByRole("button", { name: "重設" }).click();
const continuousTerminal = Number((await a29.locator('[data-value-key="終端電位"]').textContent()).replace(/[^0-9.]/g, ""));
await a29.locator(".control").filter({ hasText: "脈衝電漿" }).locator('input[type="checkbox"]').check();
await desktop.waitForFunction(() => document.querySelector("#lab-a29 canvas")?.dataset.pulsed === "true");
const pulsedTerminal = Number((await a29.locator('[data-value-key="終端電位"]').textContent()).replace(/[^0-9.]/g, ""));
await a29.locator(".control").filter({ hasText: "脈衝電漿" }).locator('input[type="checkbox"]').uncheck();
await setRange(desktop, "#lab-a29", "天線面積", 4.3);
const noDiodePeak = Number((await a29.locator('[data-value-key="峰值電位"]').textContent()).replace(/[^0-9.]/g, ""));
const noDiodeUv = await a29.locator('[data-value-key="UV/VUV 劑量"]').textContent();
await a29.locator(".control").filter({ hasText: "天線二極體" }).locator('input[type="checkbox"]').check();
const diodePeak = Number((await a29.locator('[data-value-key="峰值電位"]').textContent()).replace(/[^0-9.]/g, ""));
const diodeUv = await a29.locator('[data-value-key="UV/VUV 劑量"]').textContent();
const a29Status = await a29.locator("[data-lab-status]").textContent();
await a29.screenshot({ path: path.join(qaDir, "desktop-a29-lab.png") });

const mobile = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
watch(mobile);
const mobileResults = [];
for (const [route, selector, file] of [
  ["/level/4/4-2-endpoint-control/", "#lab-a28", "mobile-a28-lab.png"],
  ["/level/4/4-3-plasma-damage/", "#lab-a29", "mobile-a29-lab.png"]
]) {
  await mobile.goto(`${base}${route}`, { waitUntil: "networkidle" });
  const lab = mobile.locator(selector);
  await lab.scrollIntoViewIfNeeded();
  await mobile.waitForFunction((target) => document.querySelector(`${target} canvas`)?.dataset.renderState === "complete", selector);
  const overflow = await lab.evaluate((element) => element.scrollWidth > element.clientWidth + 1);
  const ratio = await lab.locator("canvas").evaluate((canvas) => canvas.getBoundingClientRect().width / canvas.getBoundingClientRect().height);
  const minFontCssPx = Number(await lab.locator("canvas").getAttribute("data-min-font-css-px"));
  const labelLayout = await lab.locator("canvas").getAttribute("data-label-layout");
  const pixels = await canvasHasPixels(mobile, `${selector} canvas`);
  mobileResults.push({ selector, overflow, ratio, pixels, minFontCssPx, labelLayout });
  await lab.screenshot({ path: path.join(qaDir, file) });
}

const reducedMotion = await browser.newPage({ viewport: { width: 900, height: 700 }, reducedMotion: "reduce" });
watch(reducedMotion);
const reducedResults = [];
for (const [route, selector, buttonName, expectedEnd] of [
  ["/level/4/4-2-endpoint-control/", "#lab-a28", "播放或暫停 A28 終點訊號時間動畫", 162],
  ["/level/4/4-3-plasma-damage/", "#lab-a29", "播放或暫停 A29 天線充電時間動畫", 100]
]) {
  await reducedMotion.goto(`${base}${route}`, { waitUntil: "networkidle" });
  const lab = reducedMotion.locator(selector);
  await lab.scrollIntoViewIfNeeded();
  await lab.getByRole("button", { name: buttonName }).click();
  const playhead = Number(await lab.locator("canvas").getAttribute("data-playhead"));
  const buttonText = await lab.getByRole("button", { name: buttonName }).textContent();
  reducedResults.push({ selector, playhead, buttonText, expectedEnd });
}

await browser.close();

const nearCanvasRatio = (value) => Math.abs(value - 720 / 430) < 0.02;
if (!a28Title?.includes("終點偵測") || a28ControlCount < 6 || a28OutputCount !== 8 || !nearCanvasRatio(a28Ratio) || !a28Pixels) throw new Error("A28 桌機結構、控制、輸出或 Canvas 不完整。 ");
if (!a28LowAreaStatus.includes("不可靠") || a28Algorithm !== "normalized" || new Set(a28CurveSignatures).size !== 4) throw new Error("A28 演算法曲線或個別可靠度互動失敗。 ");
if (a28PausedClears !== 0 || !(a28AnimatedPlayhead > 0 && a28AnimatedPlayhead < 162) || a28ThemeBefore === a28ThemeAfter || a28BackgroundBefore === a28BackgroundAfter) throw new Error("A28 動畫、閒置停止或主題重繪失敗。 ");
if (!a29Title?.includes("電漿誘發損傷") || a29ControlCount < 6 || a29OutputCount !== 9 || !nearCanvasRatio(a29Ratio) || !a29Pixels) throw new Error("A29 桌機結構、控制、輸出或 Canvas 不完整。 ");
if (!(pulsedTerminal < continuousTerminal) || !(diodePeak < noDiodePeak) || diodeUv !== noDiodeUv || !a29Status.includes("UV/VUV 劑量不變")) throw new Error("A29 脈衝中和、二極體鉗位或 UV 限制互動失敗。 ");
if (a29PausedClears !== 0 || !(a29AnimatedPlayhead > 0 && a29AnimatedPlayhead < 100) || !(a29AnimatedUv > 0 && a29AnimatedUv < a29FinalUvBeforeAnimation)) throw new Error("A29 動畫、時間劑量或閒置停止失敗。 ");
if (mobileResults.some((item) => item.overflow || !nearCanvasRatio(item.ratio) || !item.pixels || item.minFontCssPx < 11 || item.labelLayout !== "compact")) throw new Error(`A28/A29 手機版溢出、比例、字級或 Canvas 異常：${JSON.stringify(mobileResults)}`);
if (reducedResults.some((item) => Math.abs(item.playhead - item.expectedEnd) > 1 || item.buttonText !== "播放")) throw new Error(`reduced-motion 完整狀態或按鈕復原失敗：${JSON.stringify(reducedResults)}`);
if (errors.length) throw new Error(`瀏覽器錯誤：${errors.join(" | ")}`);

console.log("L4 A28/A29 瀏覽器驗證通過：桌機互動、主題、Canvas 與 375px 響應式。 ");
