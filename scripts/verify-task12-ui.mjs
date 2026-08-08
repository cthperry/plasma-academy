import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = "http://localhost:4173";
const qaDir = path.resolve("qa");
await mkdir(qaDir, { recursive: true });
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
const desktop = await context.newPage();
watch(desktop);
await desktop.goto(`${base}/level/3/3-8-pcb-desmear/`, { waitUntil: "networkidle" });
if (!(await desktop.locator("h1").textContent()).includes("PCB 電漿除膠渣與咬蝕")) throw new Error("3.8 章節標題未正確渲染。");
await desktop.locator("#lab-a34").scrollIntoViewIfNeeded();
await desktop.locator("#lab-a34 [data-lab-controls] input[type=range]").first().waitFor();
const a34RangeCount = await desktop.locator("#lab-a34 input[type=range]").count();
const a34ModeCount = await desktop.locator("#lab-a34 [role=radio]").count();
const a34OutputCount = await desktop.locator("#lab-a34 .value-panel dd").count();
const a34CanvasPixels = await nonBlankPixels(desktop, "#lab-a34 canvas");
const themeBefore = await desktop.evaluate(() => [...document.querySelector("#lab-a34 canvas").getContext("2d").getImageData(0, 0, 1, 1).data]);
const resolvedTheme = await desktop.locator("html").getAttribute("data-theme");
await desktop.click("[data-theme-toggle]");
await desktop.waitForTimeout(150);
if (await desktop.locator("html").getAttribute("data-theme") === resolvedTheme) {
  await desktop.click("[data-theme-toggle]");
  await desktop.waitForTimeout(150);
}
const themeAfter = await desktop.evaluate(() => [...document.querySelector("#lab-a34 canvas").getContext("2d").getImageData(0, 0, 1, 1).data]);

const ranges = desktop.locator("#lab-a34 input[type=range]");
await ranges.nth(0).fill("5");
const lowCf4Depth = await desktop.locator('#lab-a34 [data-value-key="深度判定"]').textContent();
const lowCf4Flushness = await desktop.locator('#lab-a34 [data-value-key="Flushness"]').textContent();
await desktop.locator("#lab-a34").getByRole("radio", { name: "Etchback 咬蝕", exact: true }).click();
await ranges.nth(0).fill("20");
await ranges.nth(3).fill("50");
const etchbackDepth = await desktop.locator('#lab-a34 [data-value-key="樹脂深度"]').textContent();
const etchbackPass = await desktop.locator('#lab-a34 [data-value-key="深度判定"]').textContent();
await desktop.screenshot({ path: path.join(qaDir, "desktop-a34-pcb-desmear.png"), fullPage: false });

await desktop.evaluate(() => {
  const counts = { "3-1": 6, "3-2": 5, "3-3": 5, "3-4": 5, "3-5": 5, "3-6": 5, "3-7": 5 };
  const chapters = Object.fromEntries(Object.entries(counts).map(([id, count]) => [id, { visited: true, objectives: Array(count).fill(true) }]));
  localStorage.setItem("plasma-academy.progress", JSON.stringify({ version: 1, chapters, quizzes: {}, labUsage: {} }));
});
await desktop.goto(`${base}/level/3/exam/?seed=task12`, { waitUntil: "networkidle" });
const durationDisclosure = await desktop.locator("[data-exam-unlock-status]").textContent();
await desktop.click("[data-exam-start]");
await desktop.waitForSelector(".exam-question");
const l3QuestionCount = await desktop.locator("[data-exam-question-nav] button").count();
const l3Draw = { single: 0, multi: 0, graphic: 0, scenario: 0 };
for (let index = 0; index < l3QuestionCount; index += 1) {
  await desktop.locator("[data-exam-question-nav] button").nth(index).click();
  const label = await desktop.locator("[data-exam-type]").textContent();
  l3Draw[{ "單選題": "single", "多選題": "multi", "圖形判讀題": "graphic", "情境題": "scenario" }[label]] += 1;
}

const mobile = await context.newPage();
watch(mobile);
await mobile.setViewportSize({ width: 375, height: 812 });
await mobile.goto(`${base}/level/3/3-8-pcb-desmear/`, { waitUntil: "networkidle" });
await mobile.locator("#lab-a34").scrollIntoViewIfNeeded();
await mobile.locator("#lab-a34 [data-lab-controls] input[type=range]").first().waitFor();
const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileControlsFit = await mobile.locator("#lab-a34 [data-lab-controls]").evaluate((panel) => {
  const bounds = panel.getBoundingClientRect();
  return [...panel.querySelectorAll("input, button, output, dd")].every((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1;
  });
});
const mobileCanvasPixels = await nonBlankPixels(mobile, "#lab-a34 canvas");
await mobile.screenshot({ path: path.join(qaDir, "mobile-a34-pcb-desmear.png"), fullPage: false });

await browser.close();

if (a34RangeCount !== 4 || a34ModeCount !== 2 || a34OutputCount !== 6) throw new Error(`A34 控制或讀值不完整：range=${a34RangeCount} mode=${a34ModeCount} output=${a34OutputCount}`);
if (a34CanvasPixels < 100000 || mobileCanvasPixels < 100000) throw new Error("A34 桌機或手機 Canvas 看起來是空白。");
if (JSON.stringify(themeBefore) === JSON.stringify(themeAfter)) throw new Error("A34 主題切換後未重繪 Canvas。");
if (!lowCf4Depth.includes("通過") || !lowCf4Flushness.includes("不通過")) throw new Error(`A34 未呈現 5% CF4 深度通過、flushness 失敗：${lowCf4Depth} / ${lowCf4Flushness}`);
if (Math.abs(Number.parseFloat(etchbackDepth) - 16) > 0.1 || !etchbackPass.includes("通過")) throw new Error(`A34 未呈現 20% CF4、50 分鐘 etchback：${etchbackDepth} / ${etchbackPass}`);
if (l3QuestionCount !== 40 || JSON.stringify(l3Draw) !== JSON.stringify({ single: 12, multi: 5, graphic: 12, scenario: 11 })) throw new Error(`L3 40 題抽題分布錯誤：${JSON.stringify(l3Draw)}`);
if (!durationDisclosure.includes("70 分鐘")) throw new Error(`L3 未揭露 70 分鐘：${durationDisclosure}`);
if (mobileOverflow || !mobileControlsFit) throw new Error(`A34 375px 溢位或控制項超框：overflow=${mobileOverflow} controlsFit=${mobileControlsFit}`);
if (errors.length) throw new Error(`Task 12 UI 出現 console/page errors：${errors.join(" | ")}`);

console.log("Task 12 UI 驗證通過：A34 1440/375、主題重繪、深度/flushness、L3 40 題抽題與 70 分鐘。 ");

function watch(page) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
}

async function nonBlankPixels(page, selector) {
  return page.locator(selector).evaluate((canvas) => {
    const { width, height } = canvas;
    const data = canvas.getContext("2d").getImageData(0, 0, width, height).data;
    let count = 0;
    for (let index = 0; index < data.length; index += 4) if (data[index] || data[index + 1] || data[index + 2]) count += 1;
    return count;
  });
}
