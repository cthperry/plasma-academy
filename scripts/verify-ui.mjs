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

await desktop.goto(`${base}/level/1/1-2-parameters/`, { waitUntil: "networkidle" });
await desktop.locator("#lab-a02").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(700);
const a02Initial = await desktop.locator("#lab-a02 .value-panel").textContent();
await desktop.locator('#lab-a02 input[type="range"]').first().evaluate((input) => {
  input.value = "11";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await desktop.waitForTimeout(300);
const a02AfterDensity = await desktop.locator("#lab-a02 .value-panel").textContent();
await desktop.getByRole("radio", { name: "負電荷" }).click();
const a02Polarity = await desktop.locator('#lab-a02 .segmented[aria-checked="true"]').textContent();
const a02SvgPathCount = await desktop.locator("#lab-a02 svg path.plot-line").count();
const a02CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a02 [data-lab-canvas]");
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] || data[i + 1] || data[i + 2]) nonBlank++;
  }
  return nonBlank;
});

await desktop.goto(`${base}/level/1/1-3-collisions-mfp/`, { waitUntil: "networkidle" });
await desktop.locator("#lab-a03").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(800);
const a03InitialPanel = await desktop.locator("#lab-a03 .value-panel").textContent();
const a03LowPressureFwhm = parseFloat(await desktop.locator('#lab-a03 [data-value-key="入射角 FWHM"]').textContent());
await desktop.locator('#lab-a03 input[type="range"]').first().evaluate((input) => {
  input.value = "2";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await desktop.waitForTimeout(250);
const a03HighPressurePanel = await desktop.locator("#lab-a03 .value-panel").textContent();
const a03HighPressureFwhm = parseFloat(await desktop.locator('#lab-a03 [data-value-key="入射角 FWHM"]').textContent());
await desktop.locator("#lab-a03 select").selectOption("Xe");
await desktop.waitForTimeout(200);
const a03XePanel = await desktop.locator("#lab-a03 .value-panel").textContent();
const a03ScaleToggle = await desktop.locator('#lab-a03 input[type="checkbox"]').isChecked();
const a03CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a03 [data-lab-canvas]");
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] || data[i + 1] || data[i + 2]) nonBlank++;
  }
  return nonBlank;
});
await desktop.screenshot({ path: path.join(qaDir, "desktop-a03.png"), fullPage: false });

await desktop.goto(`${base}/level/1/1-4-glow-breakdown/`, { waitUntil: "networkidle" });
await desktop.locator("#lab-a04").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(800);
const a04InitialStatus = await desktop.locator("#lab-a04 [data-lab-status]").textContent();
const a04InitialPanel = await desktop.locator("#lab-a04 .value-panel").textContent();
const a04CriticalGamma = parseFloat(await desktop.locator('#lab-a04 [data-value-key="臨界 γ"]').textContent());
const a04Gamma = desktop.locator('#lab-a04 input[type="range"]').nth(1);
await a04Gamma.evaluate((input) => {
  input.value = "0";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
const a04ZeroGammaStatus = await desktop.locator("#lab-a04 [data-lab-status]").textContent();
const a04ZeroGammaFeedback = parseFloat(await desktop.locator('#lab-a04 [data-value-key="回授 γ(G−1)"]').textContent());
await a04Gamma.evaluate((input, criticalGamma) => {
  input.value = String(criticalGamma);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}, a04CriticalGamma);
await desktop.waitForTimeout(200);
const a04CriticalStatus = await desktop.locator("#lab-a04 [data-lab-status]").textContent();
await desktop.waitForTimeout(1200);
const a04CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a04 [data-lab-canvas]");
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] || data[i + 1] || data[i + 2]) nonBlank++;
  }
  return nonBlank;
});
await desktop.screenshot({ path: path.join(qaDir, "desktop-a04.png"), fullPage: false });
await desktop.getByRole("button", { name: "暫停" }).click();
const a04PausedButton = await desktop.getByRole("button", { name: "播放", exact: true }).count();

await desktop.goto(`${base}/level/1/1-4-glow-breakdown/`, { waitUntil: "networkidle" });
await desktop.locator("#lab-a05").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(800);
const a05Initial = await desktop.locator("#lab-a05 .value-panel").textContent();
const a05CurveCountInitial = await desktop.locator("#lab-a05 svg path.plot-line").count();
await desktop.locator("#lab-a05 select").selectOption("O2");
await desktop.locator('#lab-a05 input[type="range"]').nth(2).evaluate((input) => {
  input.value = "1000";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await desktop.waitForTimeout(300);
const a05AfterO2 = await desktop.locator("#lab-a05 .value-panel").textContent();
const a05Status = await desktop.locator("#lab-a05 [data-lab-status]").textContent();
const a05CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a05 [data-lab-canvas]");
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] || data[i + 1] || data[i + 2]) nonBlank++;
  }
  return nonBlank;
});

await desktop.goto(`${base}/level/1/1-5-sheath/`, { waitUntil: "networkidle" });
await desktop.locator("#lab-a06").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(800);
const a06Ranges = desktop.locator('#lab-a06 input[type="range"]');
await a06Ranges.nth(0).evaluate((input) => {
  input.value = "3";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await desktop.waitForTimeout(200);
const a06SteadyStatus = await desktop.locator("#lab-a06 [data-lab-status]").textContent();
const a06InitialDrop = parseFloat(await desktop.locator('#lab-a06 [data-value-key="Vp − Vf"]').textContent());
await a06Ranges.nth(1).evaluate((input) => {
  input.value = "9";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
const a06LowDensitySheath = parseFloat(await desktop.locator('#lab-a06 [data-value-key="鞘層厚度 s"]').textContent());
await a06Ranges.nth(1).evaluate((input) => {
  input.value = "11";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
const a06HighDensitySheath = parseFloat(await desktop.locator('#lab-a06 [data-value-key="鞘層厚度 s"]').textContent());
await a06Ranges.nth(2).evaluate((input) => {
  input.value = "4";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await desktop.waitForTimeout(200);
const a06DropAt4Ev = parseFloat(await desktop.locator('#lab-a06 [data-value-key="Vp − Vf"]').textContent());
const a06CurveCount = await desktop.locator("#lab-a06 svg path.plot-line").count();
const a06PlayButton = await desktop.getByRole("button", { name: "播放形成過程" }).count();
const a06CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a06 [data-lab-canvas]");
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] || data[i + 1] || data[i + 2]) nonBlank++;
  }
  return nonBlank;
});
await desktop.screenshot({ path: path.join(qaDir, "desktop-a06.png"), fullPage: false });
await desktop.getByRole("button", { name: "播放形成過程" }).click();
await desktop.waitForTimeout(700);
const a06PlaybackPosition = Number(await desktop.locator('#lab-a06 input[type="range"]').first().inputValue());

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

await mobile.goto(`${base}/level/1/1-5-sheath/`, { waitUntil: "networkidle" });
await mobile.locator("#lab-a06").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(800);
const mobileA06Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA06CanvasPixels = await mobile.evaluate(() => {
  const canvas = document.querySelector("#lab-a06 [data-lab-canvas]");
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] || data[i + 1] || data[i + 2]) nonBlank++;
  }
  return nonBlank;
});
await mobile.screenshot({ path: path.join(qaDir, "mobile-a06.png"), fullPage: false });

await mobile.goto(`${base}/level/1/1-3-collisions-mfp/`, { waitUntil: "networkidle" });
await mobile.locator("#lab-a03").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(700);
const mobileA03Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA03CanvasPixels = await mobile.evaluate(() => {
  const canvas = document.querySelector("#lab-a03 [data-lab-canvas]");
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] || data[i + 1] || data[i + 2]) nonBlank++;
  }
  return nonBlank;
});
await mobile.screenshot({ path: path.join(qaDir, "mobile-a03.png"), fullPage: false });

await mobile.goto(`${base}/level/1/1-4-glow-breakdown/`, { waitUntil: "networkidle" });
await mobile.locator("#lab-a04").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(700);
const mobileA04Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA04CanvasPixels = await mobile.evaluate(() => {
  const canvas = document.querySelector("#lab-a04 [data-lab-canvas]");
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] || data[i + 1] || data[i + 2]) nonBlank++;
  }
  return nonBlank;
});
await mobile.screenshot({ path: path.join(qaDir, "mobile-a04.png"), fullPage: false });

await browser.close();

const result = { themeAfterClick, searchCount, packagingSearchHit, packagingH1, l1Checks, a02Initial, a02AfterDensity, a02Polarity, a02SvgPathCount, a02CanvasPixels, a03InitialPanel, a03LowPressureFwhm, a03HighPressurePanel, a03HighPressureFwhm, a03XePanel, a03ScaleToggle, a03CanvasPixels, a04InitialStatus, a04InitialPanel, a04CriticalGamma, a04ZeroGammaStatus, a04ZeroGammaFeedback, a04CriticalStatus, a04PausedButton, a04CanvasPixels, a05Initial, a05CurveCountInitial, a05AfterO2, a05Status, a05CanvasPixels, a06SteadyStatus, a06InitialDrop, a06LowDensitySheath, a06HighDensitySheath, a06DropAt4Ev, a06CurveCount, a06PlayButton, a06PlaybackPosition, a06CanvasPixels, canvasInfo, mobileCanvasInfo, mobileA03CanvasPixels, mobileA04CanvasPixels, mobileA06CanvasPixels, quizText, mobileOverflow, mobileA03Overflow, mobileA04Overflow, mobileA06Overflow, errors };
console.log(JSON.stringify(result, null, 2));

if (themeAfterClick !== "light" && themeAfterClick !== "dark") throw new Error("主題切換未解析為 light/dark。");
if (searchCount < 1) throw new Error("搜尋沒有回傳結果。");
if (!packagingSearchHit.includes("封裝") || !packagingH1.includes("封裝清潔")) throw new Error("封裝清潔頁或搜尋入口未通過驗證。");
for (const check of l1Checks) {
  if (!check.title.includes(check.expectedTitle) || check.labPixels < 100000) {
    throw new Error(`L1 章節驗證失敗: ${JSON.stringify(check)}`);
  }
}
if (!a02Initial.includes("0.129 mm") || !a02Initial.includes("0.013 mm")) throw new Error("A02 未顯示 CCP/ICP λD 對照值。");
if (!a02AfterDensity.includes("0.041 mm")) throw new Error("A02 電子密度滑桿未更新 λD 數值。");
if (!a02Polarity.includes("負電荷")) throw new Error("A02 極性切換未更新選取狀態。");
if (a02SvgPathCount < 1) throw new Error("A02 沒有 SVG 電位曲線。");
if (a02CanvasPixels < 100000) throw new Error("A02 Canvas 看起來是空白。");
if (!a03InitialPanel.includes("5.00 cm") || a03LowPressureFwhm >= 12) throw new Error("A03 Ar/1 mTorr 的平均自由徑或窄角度分佈不符規格。");
if (!a03HighPressurePanel.includes("0.500 mm") || !(a03HighPressureFwhm > a03LowPressureFwhm)) throw new Error("A03 壓力升高後的 λ 或 FWHM 變化不符規格。");
if (!a03XePanel.includes("0.330 mm") || !a03ScaleToggle) throw new Error("A03 Xe 氣體切換或 λ 標尺控制未生效。");
if (a03CanvasPixels < 100000 || mobileA03CanvasPixels < 100000) throw new Error("A03 桌機或手機 Canvas 看起來是空白。");
if (!a04InitialStatus.includes("可自持") || !a04InitialPanel.includes("1.10")) throw new Error("A04 預設 Townsend 放電未進入可自持狀態。");
if (!a04ZeroGammaStatus.includes("無法自持") || a04ZeroGammaFeedback !== 0) throw new Error("A04 γ=0 時沒有正確熄滅。");
if (!a04CriticalStatus.includes("臨界穩態") || a04PausedButton !== 1) throw new Error("A04 臨界 Townsend 條件或播放控制未生效。");
if (a04CanvasPixels < 100000 || mobileA04CanvasPixels < 100000) throw new Error("A04 桌機或手機 Canvas 看起來是空白。");
if (!a05Initial.includes("0.90 Torr") || !a05Initial.includes("137 V")) throw new Error("A05 未顯示 Ar Paschen 谷底對照。");
if (a05CurveCountInitial < 5) throw new Error("A05 未顯示五種氣體曲線。");
if (!a05AfterO2.includes("0.70 Torr") || !a05AfterO2.includes("450 V") || !a05Status.includes("點火")) throw new Error("A05 O2 點火判定或谷底資訊未更新。");
if (a05CanvasPixels < 30000) throw new Error("A05 放電腔 Canvas 看起來是空白。");
if (!a06SteadyStatus.includes("穩態") || Math.abs(a06InitialDrop - 14.1) > 0.3) throw new Error("A06 穩態或 Ar 浮動電位差不符規格。");
if (!(a06HighDensitySheath < a06LowDensitySheath)) throw new Error("A06 鞘層厚度未隨電子密度上升而變薄。");
if (Math.abs(a06DropAt4Ev - 18.7) > 0.3) throw new Error("A06 T_e=4 eV 時 Vp−Vf 未約為 4.7Te。");
if (a06CurveCount < 3 || a06PlayButton !== 1) throw new Error("A06 三條同步曲線或自動播放控制缺失。");
if (a06PlaybackPosition < 0.2 || a06PlaybackPosition >= 3) throw new Error(`A06 自動播放未推進時間軸：${a06PlaybackPosition}。`);
if (a06CanvasPixels < 100000 || mobileA06CanvasPixels < 100000) throw new Error("A06 桌機或手機 Canvas 看起來是空白。");
if (canvasInfo.nonBlank < canvasInfo.width * canvasInfo.height * 0.5) throw new Error("A01 Canvas 看起來是空白。");
if (mobileCanvasInfo.nonBlank < mobileCanvasInfo.width * mobileCanvasInfo.height * 0.5) throw new Error("手機 A01 Canvas 看起來是空白。");
if (!quizText.includes("正確")) throw new Error("自我檢測沒有顯示成功狀態。");
if (mobileOverflow) throw new Error("手機版有水平溢出。");
if (mobileA03Overflow) throw new Error("A03 手機版有水平溢出。");
if (mobileA04Overflow) throw new Error("A04 手機版有水平溢出。");
if (mobileA06Overflow) throw new Error("A06 手機版有水平溢出。");
if (errors.length) throw new Error(`瀏覽器 console/page errors: ${errors.join("; ")}`);
