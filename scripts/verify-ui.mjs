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
  ["/level/1/1-2-parameters/", "1.2 電漿基本參數", 6, 6],
  ["/level/1/1-3-collisions-mfp/", "1.3 碰撞與平均自由徑", 6, 7],
  ["/level/1/1-4-glow-breakdown/", "1.4 輝光放電與點火", 6, 6],
  ["/level/1/1-5-sheath/", "1.5 鞘層入門", 7, 7],
  ["/level/1/1-6-process-map/", "1.6 製程電漿地圖", 5, 4]
];
const l1Checks = [];
for (const [route, expectedTitle, expectedSelfChecks, expectedDiagrams] of l1Routes) {
  await desktop.goto(`${base}${route}`, { waitUntil: "networkidle" });
  const title = await desktop.locator("h1").first().textContent();
  await desktop.locator(".instruction-diagram img").evaluateAll((images) => images.forEach((image) => { image.loading = "eager"; }));
  await desktop.waitForFunction((count) => {
    const images = [...document.querySelectorAll(".instruction-diagram img")];
    return images.length === count && images.every((image) => image.complete && image.naturalWidth === 760);
  }, expectedDiagrams);
  const firstLab = desktop.locator("[data-lab-container]").first();
  await firstLab.scrollIntoViewIfNeeded();
  await desktop.waitForTimeout(600);
  const labPixels = await desktop.evaluate(() => {
    const canvas = document.querySelector("[data-lab-canvas]");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let nonBlank = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] || data[i + 1] || data[i + 2]) nonBlank++;
      }
      return nonBlank;
    }
    const svg = document.querySelector("[data-lab-container] svg");
    return svg ? svg.querySelectorAll("rect, path, line, text").length * 10000 : 0;
  });
  const selfCheckCount = await desktop.locator(".self-check details.check-card").count();
  const diagramCount = await desktop.locator(".instruction-diagram img").count();
  const diagramsLoaded = await desktop.locator(".instruction-diagram img").evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth === 760));
  const figureNumbersValid = await desktop.locator(".instruction-diagram figcaption strong").evaluateAll((captions) => captions.every((caption) => /^圖 1\.\d-\d+ /.test(caption.textContent ?? "")));
  const chapterSupportCount = await desktop.locator(".chapter-support").count();
  const observationCounts = await desktop.locator("[data-lab-container] .observation ul").evaluateAll((lists) => lists.map((list) => list.querySelectorAll("li").length));
  const observationsValid = observationCounts.every((count) => count >= 2 && count <= 4);
  l1Checks.push({ route, title, expectedTitle, expectedSelfChecks, selfCheckCount, expectedDiagrams, diagramCount, diagramsLoaded, figureNumbersValid, chapterSupportCount, observationCounts, observationsValid, labPixels });
}

await desktop.goto(`${base}/gases/`, { waitUntil: "networkidle" });
const gasCardCount = await desktop.locator("[data-gas-card]").count();
await desktop.selectOption("[data-gas-family]", "氟碳");
const fluorocarbonCardCount = await desktop.locator("[data-gas-card]:visible").count();
await desktop.selectOption("[data-gas-family]", "all");
await desktop.selectOption("[data-gas-hazard]", "extreme");
const extremeGasCount = await desktop.locator("[data-gas-card]:visible").count();
await desktop.selectOption("[data-gas-hazard]", "all");
await desktop.fill("[data-gas-search]", "三氟化氮");
const gasSearchTitle = await desktop.locator("[data-gas-card]:visible h2").textContent();
await desktop.fill("[data-gas-search]", "");
const fcLabelsDoNotOverlap = await desktop.locator(".fc-axis li").evaluateAll((items) => {
  const boxes = items.map((item) => item.getBoundingClientRect());
  return boxes.every((box, index) => index === 0 || box.left >= boxes[index - 1].right);
});
const gasSdsStatusCount = await desktop.locator(".sds-status").count();
const gasSupplierReviewedCount = await desktop.locator('[data-sds-status="supplier-reviewed"]').count();
await desktop.screenshot({ path: path.join(qaDir, "desktop-gases.png"), fullPage: false });

await desktop.goto(`${base}/formulas/`, { waitUntil: "networkidle" });
const formulaCardCount = await desktop.locator(".formula-card").count();
const formulaPageText = await desktop.locator("main").textContent();
await desktop.screenshot({ path: path.join(qaDir, "desktop-formulas.png"), fullPage: false });

await desktop.goto(`${base}/level/2/2-1-gas-vacuum/`, { waitUntil: "networkidle" });
await desktop.locator("#lab-a08").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(800);
const a08InitialPanel = await desktop.locator("#lab-a08 .value-panel").textContent();
const a08InitialDensity = await desktop.locator('#lab-a08 [data-value-key="中性密度 n"]').textContent();
const a08Ranges = desktop.locator('#lab-a08 input[type="range"]');
await a08Ranges.nth(0).evaluate((input) => {
  input.value = "400";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await desktop.waitForTimeout(200);
const a08HighFlowResidence = parseFloat(await desktop.locator('#lab-a08 [data-value-key="滯留時間 τ"]').textContent());
const a08HighFlowDensity = await desktop.locator('#lab-a08 [data-value-key="中性密度 n"]').textContent();
await a08Ranges.nth(1).evaluate((input) => {
  input.value = "200";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await desktop.waitForTimeout(200);
const a08HighPressureResidence = parseFloat(await desktop.locator('#lab-a08 [data-value-key="滯留時間 τ"]').textContent());
const a08HighPressureDensity = await desktop.locator('#lab-a08 [data-value-key="中性密度 n"]').textContent();
const a08CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a08 [data-lab-canvas]");
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] || data[i + 1] || data[i + 2]) nonBlank++;
  }
  return nonBlank;
});
const a08ThemePixelBefore = await desktop.evaluate(() => [...document.querySelector("#lab-a08 [data-lab-canvas]").getContext("2d").getImageData(0, 0, 1, 1).data]);
await desktop.click("[data-theme-toggle]");
await desktop.waitForTimeout(200);
const a08ThemePixelAfter = await desktop.evaluate(() => [...document.querySelector("#lab-a08 [data-lab-canvas]").getContext("2d").getImageData(0, 0, 1, 1).data]);
await desktop.screenshot({ path: path.join(qaDir, "desktop-a08.png"), fullPage: false });

await desktop.goto(`${base}/level/2/2-2-process-gases/`, { waitUntil: "networkidle" });
await desktop.locator("#lab-a09").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(500);
const a09NodeCount = await desktop.locator("#lab-a09 .decision-node").count();
const a09Cases = {};
for (const [material, expectedGas] of Object.entries({ "poly-Si": "Cl₂", SiO2: "C₄F₈", SiN: "CH₂F₂", Al: "BCl₃", Si: "SF₆" })) {
  await desktop.locator("#lab-a09 select").first().selectOption(material);
  a09Cases[material] = (await desktop.locator("#lab-a09 .decision-result").textContent()).includes(expectedGas);
}
await desktop.locator("#lab-a09 select").first().selectOption("Cu");
const a09CuText = await desktop.locator("#lab-a09 .decision-result").textContent();

await desktop.locator("#lab-a10").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(700);
const a10InitialStatus = await desktop.locator("#lab-a10 [data-lab-status]").textContent();
const a10InitialFc = await desktop.locator('#lab-a10 [data-value-key="有效 F/C"]').textContent();
const a10Ranges = desktop.locator('#lab-a10 input[type="range"]');
await desktop.locator("#lab-a10 select").selectOption("CF4");
await a10Ranges.nth(0).evaluate((input) => { input.value = "20"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a10HighStatus = await desktop.locator("#lab-a10 [data-lab-status]").textContent();
await desktop.locator("#lab-a10 select").selectOption("CH3F");
await a10Ranges.nth(1).evaluate((input) => { input.value = "20"; input.dispatchEvent(new Event("input", { bubbles: true })); });
await a10Ranges.nth(2).evaluate((input) => { input.value = "0"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a10LowStatus = await desktop.locator("#lab-a10 [data-lab-status]").textContent();
await desktop.locator("#lab-a10 select").selectOption("C4F8");
await a10Ranges.nth(0).evaluate((input) => { input.value = "8"; input.dispatchEvent(new Event("input", { bubbles: true })); });
await a10Ranges.nth(1).evaluate((input) => { input.value = "0"; input.dispatchEvent(new Event("input", { bubbles: true })); });
await a10Ranges.nth(2).evaluate((input) => { input.value = "250"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a10OxideRate = parseFloat(await desktop.locator('#lab-a10 [data-value-key="溝底淨速率"]').textContent());
await desktop.locator("#lab-a10").getByRole("radio", { name: "Si", exact: true }).click();
const a10SiRate = parseFloat(await desktop.locator('#lab-a10 [data-value-key="溝底淨速率"]').textContent());
const a10CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a10 [data-lab-canvas]");
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] || data[i + 1] || data[i + 2]) nonBlank++;
  return nonBlank;
});
await desktop.screenshot({ path: path.join(qaDir, "desktop-a09-a10.png"), fullPage: false });

await desktop.goto(`${base}/level/2/2-3-plasma-chemistry/`, { waitUntil: "networkidle" });
await desktop.locator("#lab-a12").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(500);
const a12PathCount = await desktop.locator("#lab-a12 svg path").count();
const a12OverlapCount = await desktop.locator("#lab-a12 .eedf-overlap").count();
const a12RateBarCount = await desktop.locator("#lab-a12 .eedf-rate-bars i").count();
const a12Range = desktop.locator('#lab-a12 input[type="range"]');
const readA12Ionization = async () => Number(await desktop.locator('#lab-a12 [data-value-key="游離率 kᵢ"]').textContent());
await a12Range.evaluate((input) => { input.value = "2"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a12Ionization2Ev = await readA12Ionization();
await a12Range.evaluate((input) => { input.value = "3"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a12Ionization3Ev = await readA12Ionization();
await desktop.locator("#lab-a12").getByRole("radio", { name: "Druyvesteyn" }).click();
const a12DruyvesteynIonization = await readA12Ionization();
await desktop.locator("#lab-a12 select").selectOption("CF4");
const a12Cf4Status = await desktop.locator("#lab-a12 [data-lab-status]").textContent();
const a12Cf4Dissociation = Number(await desktop.locator('#lab-a12 [data-value-key="解離率 k_d"]').textContent());
await desktop.screenshot({ path: path.join(qaDir, "desktop-a12.png"), fullPage: false });

await desktop.goto(`${base}/level/2/2-4-advanced-sheath/`, { waitUntil: "networkidle" });
await desktop.locator("#lab-a13").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(650);
const a13BarCount = await desktop.locator("#lab-a13 .iedf-bar").count();
const readA13Value = async (key) => parseFloat(await desktop.locator(`#lab-a13 [data-value-key="${key}"]`).textContent());
await desktop.locator("#lab-a13").getByRole("radio", { name: "0.4 MHz" }).click();
const a13LowFrequencyDelta = await readA13Value("峰間距 ΔE");
const a13LowFrequencyStatus = await desktop.locator("#lab-a13 [data-lab-status]").textContent();
await desktop.locator("#lab-a13").getByRole("radio", { name: "60 MHz" }).click();
const a13HighFrequencyDelta = await readA13Value("峰間距 ΔE");
const a13HighFrequencyStatus = await desktop.locator("#lab-a13 [data-lab-status]").textContent();
await desktop.locator("#lab-a13").getByRole("radio", { name: "13.56 MHz" }).click();
const a13Ranges = desktop.locator('#lab-a13 input[type="range"]');
await a13Ranges.nth(1).evaluate((input) => { input.value = "100"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a13HighPressureTail = await readA13Value("低能尾巴");
const a13HighPressureStatus = await desktop.locator("#lab-a13 [data-lab-status]").textContent();
await a13Ranges.nth(1).evaluate((input) => { input.value = "1"; input.dispatchEvent(new Event("input", { bubbles: true })); });
await desktop.locator("#lab-a13 select").selectOption("Ar");
const a13ArDelta = await readA13Value("峰間距 ΔE");
await desktop.locator("#lab-a13 select").selectOption("CF3");
const a13Cf3Delta = await readA13Value("峰間距 ΔE");
const a13CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a13 canvas");
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] || data[i + 1] || data[i + 2]) nonBlank++;
  return nonBlank;
});
const a13ThemeBefore = await desktop.evaluate(() => [...document.querySelector("#lab-a13 canvas").getContext("2d").getImageData(0, 0, 1, 1).data]);
await desktop.click("[data-theme-toggle]");
await desktop.waitForTimeout(150);
const a13ThemeAfter = await desktop.evaluate(() => [...document.querySelector("#lab-a13 canvas").getContext("2d").getImageData(0, 0, 1, 1).data]);
await desktop.screenshot({ path: path.join(qaDir, "desktop-a13.png"), fullPage: false });

await desktop.goto(`${base}/level/2/2-5-plasma-sources/`, { waitUntil: "networkidle" });
await desktop.locator("#lab-a14").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(350);
const a14Power = desktop.locator('#lab-a14 input[type="range"]').first();
const setA14Power = async (value) => {
  await a14Power.evaluate((input, nextValue) => {
    input.value = String(nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
  return desktop.locator("#lab-a14 [data-lab-status]").textContent();
};
const a14At550Up = await setA14Power(550);
const a14At700Up = await setA14Power(700);
const a14At550Down = await setA14Power(550);
const a14At400Down = await setA14Power(400);
const a14PathCount = await desktop.locator("#lab-a14 svg path.plot-line").count();
const a14CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a14 canvas");
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let index = 0; index < data.length; index += 4) if (data[index] || data[index + 1] || data[index + 2]) nonBlank++;
  return nonBlank;
});
const a14ThemeBefore = await desktop.evaluate(() => [...document.querySelector("#lab-a14 canvas").getContext("2d").getImageData(0, 0, 1, 1).data]);
await desktop.click("[data-theme-toggle]");
await desktop.waitForTimeout(150);
let a14ThemeAfter = await desktop.evaluate(() => [...document.querySelector("#lab-a14 canvas").getContext("2d").getImageData(0, 0, 1, 1).data]);
if (JSON.stringify(a14ThemeBefore) === JSON.stringify(a14ThemeAfter)) {
  await desktop.click("[data-theme-toggle]");
  await desktop.waitForTimeout(150);
  a14ThemeAfter = await desktop.evaluate(() => [...document.querySelector("#lab-a14 canvas").getContext("2d").getImageData(0, 0, 1, 1).data]);
}

await desktop.locator("#lab-a15").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(200);
const readA15Reflection = async () => parseFloat(await desktop.locator('#lab-a15 [data-value-key="反射功率"]').textContent());
const a15InitialReflection = await readA15Reflection();
await desktop.locator("#lab-a15").getByRole("button", { name: "自動匹配" }).click();
await desktop.waitForTimeout(1300);
const a15MatchedReflection = await readA15Reflection();
const a15FirstFingerprint = await desktop.locator('#lab-a15 [data-value-key="電容指紋"]').textContent();
const a15Ranges = desktop.locator('#lab-a15 input[type="range"]');
await a15Ranges.nth(2).evaluate((input) => {
  input.value = "80";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
const a15DriftReflection = await readA15Reflection();
await desktop.locator("#lab-a15").getByRole("button", { name: "自動匹配" }).click();
await desktop.waitForTimeout(1300);
const a15RematchedReflection = await readA15Reflection();
const a15SecondFingerprint = await desktop.locator('#lab-a15 [data-value-key="電容指紋"]').textContent();
const a15PathCount = await desktop.locator("#lab-a15 svg path").count();
const a15PointCount = await desktop.locator("#lab-a15 svg circle").count();
const a15CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a15 canvas");
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let index = 0; index < data.length; index += 4) if (data[index] || data[index + 1] || data[index + 2]) nonBlank++;
  return nonBlank;
});
await desktop.screenshot({ path: path.join(qaDir, "desktop-a14-a15.png"), fullPage: false });

await desktop.goto(`${base}/level/2/2-6-causal-chain/`, { waitUntil: "networkidle" });
await desktop.locator("#lab-a16").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(450);
const a16Ranges = desktop.locator('#lab-a16 input[type="range"]');
const readA16Value = async (key) => parseFloat(await desktop.locator(`#lab-a16 [data-value-key="${key}"]`).textContent());
const a16ControlCount = await a16Ranges.count();
const a16OutputCount = await desktop.locator("#lab-a16 .value-panel dd").count();
const a16ChainCount = await desktop.locator("#lab-a16 .a16-chain-node").count();
await a16Ranges.nth(1).fill("200");
const a16LowSourceTe = await readA16Value("電子溫度 Tₑ");
const a16LowSourceDensity = await readA16Value("電子密度 nₑ");
await a16Ranges.nth(1).fill("2000");
const a16HighSourceTe = await readA16Value("電子溫度 Tₑ");
const a16HighSourceDensity = await readA16Value("電子密度 nₑ");
const a16TeDelta = await desktop.locator('#lab-a16 [data-cause-key="electronTemperatureEv"] strong').textContent();
await a16Ranges.nth(2).fill("0");
const a16ZeroBiasRate = await readA16Value("蝕刻率");
const a16ZeroBiasSelectivity = await readA16Value("選擇比");
const a16ZeroBiasProfile = await desktop.locator('#lab-a16 [data-value-key="Profile"]').textContent();
await a16Ranges.nth(2).fill("500");
const a16HighBiasRate = await readA16Value("蝕刻率");
const a16HighBiasSelectivity = await readA16Value("選擇比");
await desktop.locator("#lab-a16").getByRole("button", { name: "開始挑戰" }).click();
for (const [index, value] of [[0, 5], [1, 600], [2, 60], [3, 45], [4, 10], [5, 45], [6, 25], [7, 3]]) await a16Ranges.nth(index).fill(String(value));
const a16ChallengeStatus = await desktop.locator("#lab-a16 [data-a16-challenge-status]").textContent();
const a16ChallengeClass = await desktop.locator("#lab-a16 .a16-challenge").getAttribute("class");
const a16CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a16 canvas");
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let index = 0; index < data.length; index += 4) if (data[index] || data[index + 1] || data[index + 2]) nonBlank++;
  return nonBlank;
});
const a16ThemeBefore = await desktop.evaluate(() => [...document.querySelector("#lab-a16 canvas").getContext("2d").getImageData(0, 0, 1, 1).data]);
await desktop.click("[data-theme-toggle]");
await desktop.waitForTimeout(150);
let a16ThemeAfter = await desktop.evaluate(() => [...document.querySelector("#lab-a16 canvas").getContext("2d").getImageData(0, 0, 1, 1).data]);
if (JSON.stringify(a16ThemeBefore) === JSON.stringify(a16ThemeAfter)) {
  await desktop.click("[data-theme-toggle]");
  await desktop.waitForTimeout(150);
  a16ThemeAfter = await desktop.evaluate(() => [...document.querySelector("#lab-a16 canvas").getContext("2d").getImageData(0, 0, 1, 1).data]);
}
await desktop.screenshot({ path: path.join(qaDir, "desktop-a16.png"), fullPage: false });

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

await desktop.goto(`${base}/level/1/1-6-process-map/`, { waitUntil: "networkidle" });
await desktop.locator("#lab-a07").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(700);
const a07InitialRegions = await desktop.locator("#lab-a07 [data-process-id]").count();
const a07InitialInfo = await desktop.locator("#lab-a07 .process-info").textContent();
await desktop.locator("#lab-a07").getByRole("radio", { name: "清潔" }).click();
const a07CleaningRegions = await desktop.locator("#lab-a07 [data-process-id]").count();
await desktop.locator('#lab-a07 input[type="search"]').fill("NF₃");
await desktop.waitForTimeout(200);
const a07SearchRegions = await desktop.locator("#lab-a07 [data-process-id]").count();
const a07SearchInfo = await desktop.locator("#lab-a07 .process-info").textContent();
const a07SearchLink = await desktop.locator("#lab-a07 .process-info a").getAttribute("href");
await desktop.locator('#lab-a07 input[type="search"]').fill("");
await desktop.locator("#lab-a07").getByRole("radio", { name: "全部" }).click();
await desktop.locator('#lab-a07 [data-process-id="pvd"]').click();
const a07PvdInfo = await desktop.locator("#lab-a07 .process-info").textContent();
const a07PvdLink = await desktop.locator("#lab-a07 .process-info a").getAttribute("href");
await desktop.screenshot({ path: path.join(qaDir, "desktop-a07.png"), fullPage: false });

await desktop.goto(`${base}/level/3/3-1-etch-mechanisms/`, { waitUntil: "networkidle" });
const chapterThreeOneTitle = await desktop.locator("h1").first().textContent();
await desktop.locator("#lab-a17").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(500);
const a17BarCount = await desktop.locator("#lab-a17 svg rect").count();
const a17OutputCount = await desktop.locator("#lab-a17 .value-panel dd").count();
const a17InitialTotal = parseFloat(await desktop.locator('#lab-a17 [data-value-key="總蝕刻率"]').textContent());
const a17InitialSynergy = parseFloat(await desktop.locator('#lab-a17 [data-value-key="協同項"]').textContent());
const a17Ranges = desktop.locator('#lab-a17 input[type="range"]');
await a17Ranges.nth(1).evaluate((input) => { input.value = "0"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a17NoIonTotal = parseFloat(await desktop.locator('#lab-a17 [data-value-key="總蝕刻率"]').textContent());
await a17Ranges.nth(1).evaluate((input) => { input.value = "1"; input.dispatchEvent(new Event("input", { bubbles: true })); });
await desktop.locator("#lab-a17").getByRole("radio", { name: "溝槽剖面" }).click();
const a17TrenchStatus = await desktop.locator("#lab-a17 [data-lab-status]").textContent();
const a17CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a17 canvas");
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let index = 0; index < data.length; index += 4) if (data[index] || data[index + 1] || data[index + 2]) nonBlank++;
  return nonBlank;
});

await desktop.locator("#lab-a18").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(500);
const a18ControlCount = await desktop.locator('#lab-a18 input[type="range"]').count();
const a18OutputCount = await desktop.locator("#lab-a18 .value-panel dd").count();
const a18InitialShape = await desktop.locator('#lab-a18 [data-value-key="判定形狀"]').textContent();
await desktop.locator("#lab-a18").getByRole("radio", { name: "Bowing" }).click();
const a18BowingWidths = await desktop.locator('#lab-a18 [data-value-key="頂／中／底寬"]').textContent();
const a18Ranges = desktop.locator('#lab-a18 input[type="range"]');
await a18Ranges.nth(1).evaluate((input) => { input.value = "2"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a18FixedBowingWidths = await desktop.locator('#lab-a18 [data-value-key="頂／中／底寬"]').textContent();
await desktop.locator("#lab-a18").getByRole("radio", { name: "Etch stop" }).click();
const a18StoppedDepth = parseFloat(await desktop.locator('#lab-a18 [data-value-key="蝕刻深度"]').textContent());
await desktop.locator('#lab-a18 input[type="range"]').nth(2).evaluate((input) => { input.value = "25"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a18RecoveredDepth = parseFloat(await desktop.locator('#lab-a18 [data-value-key="蝕刻深度"]').textContent());
await desktop.locator("#lab-a18").getByRole("radio", { name: "Faceting" }).click();
const a18FacetedMask = parseFloat(await desktop.locator('#lab-a18 [data-value-key="遮罩開口"]').textContent());
await desktop.locator('#lab-a18 input[type="range"]').nth(0).evaluate((input) => { input.value = "300"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a18FixedMask = parseFloat(await desktop.locator('#lab-a18 [data-value-key="遮罩開口"]').textContent());
const a18CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a18 canvas");
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let index = 0; index < data.length; index += 4) if (data[index] || data[index + 1] || data[index + 2]) nonBlank++;
  return nonBlank;
});
await desktop.screenshot({ path: path.join(qaDir, "desktop-a17-a18.png"), fullPage: false });

await desktop.goto(`${base}/level/3/3-2-deep-silicon-etch/`, { waitUntil: "networkidle" });
const chapterThreeTwoTitle = await desktop.locator("h1").first().textContent();
await desktop.locator("#lab-a19").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(450);
const a19ControlCount = await desktop.locator('#lab-a19 input[type="range"]').count();
const a19OutputCount = await desktop.locator("#lab-a19 .value-panel dd").count();
const a19Ranges = desktop.locator('#lab-a19 input[type="range"]');
await a19Ranges.nth(1).evaluate((input) => { input.value = "2"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a19ShortScallop = parseFloat(await desktop.locator('#lab-a19 [data-value-key="Scallop 深度"]').textContent());
const a19ShortRate = parseFloat(await desktop.locator('#lab-a19 [data-value-key="有效蝕刻率"]').textContent());
await a19Ranges.nth(1).evaluate((input) => { input.value = "15"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a19LongScallop = parseFloat(await desktop.locator('#lab-a19 [data-value-key="Scallop 深度"]').textContent());
const a19LongRate = parseFloat(await desktop.locator('#lab-a19 [data-value-key="有效蝕刻率"]').textContent());
await a19Ranges.nth(0).evaluate((input) => { input.value = "0"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a19IsotropicStatus = await desktop.locator("#lab-a19 [data-lab-status]").textContent();
const a19CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a19 canvas");
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let index = 0; index < data.length; index += 4) if (data[index] || data[index + 1] || data[index + 2]) nonBlank++;
  return nonBlank;
});
await desktop.screenshot({ path: path.join(qaDir, "desktop-a19-bosch.png"), fullPage: false });

await desktop.goto(`${base}/level/3/3-3-defect-atlas/`, { waitUntil: "networkidle" });
const chapterThreeThreeTitle = await desktop.locator("h1").first().textContent();
await desktop.locator("#lab-a20").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(450);
const a20ControlCount = await desktop.locator('#lab-a20 input[type="range"]').count();
const a20ToggleCount = await desktop.locator('#lab-a20 input[type="checkbox"]').count();
const a20OutputCount = await desktop.locator("#lab-a20 .value-panel dd").count();
const a20InitialLag = parseFloat(await desktop.locator('#lab-a20 [data-value-key="RIE lag"]').textContent());
await desktop.locator('#lab-a20 input[type="checkbox"]').first().uncheck();
const a20NoTransportLag = parseFloat(await desktop.locator('#lab-a20 [data-value-key="RIE lag"]').textContent());
await desktop.locator("#lab-a20").getByRole("radio", { name: "反向 ARDE" }).click();
await desktop.locator('#lab-a20 input[type="range"]').nth(2).evaluate((input) => { input.value = "0.9"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a20InverseLag = parseFloat(await desktop.locator('#lab-a20 [data-value-key="RIE lag"]').textContent());
const a20CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a20 canvas");
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let index = 0; index < data.length; index += 4) if (data[index] || data[index + 1] || data[index + 2]) nonBlank++;
  return nonBlank;
});
await desktop.locator("#lab-a21").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(450);
const a21SymptomCount = await desktop.locator("#lab-a21 .symptom-option").count();
const a21ResultCount = await desktop.locator("#lab-a21 .diagnosis-result").count();
const a21MethodCount = await desktop.locator("#lab-a21 .diagnosis-result").first().locator("ol li").count();
await desktop.locator("#lab-a21 .symptom-option").filter({ hasText: "Notching" }).click();
await desktop.locator("#lab-a21 select").nth(1).selectOption("insulating");
await desktop.locator("#lab-a21 select").nth(2).selectOption("interface");
await desktop.locator("#lab-a21 select").nth(3).selectOption("array-edge");
const a21RankedFirst = await desktop.locator("#lab-a21 .diagnosis-result h4").first().textContent();
await desktop.screenshot({ path: path.join(qaDir, "desktop-a20-a21.png"), fullPage: false });

await desktop.goto(`${base}/defects/`, { waitUntil: "networkidle" });
const defectCardCount = await desktop.locator("[data-defect-card]").count();
const defectHasUndefined = (await desktop.locator("body").innerText()).includes("undefined");
await desktop.locator('[data-defect-filter="ar"]').click();
const defectArVisible = await desktop.locator("[data-defect-card]:visible").count();
await desktop.locator('[data-defect-filter="all"]').click();
await desktop.locator("[data-defect-search]").fill("腐蝕");
const defectSearchVisible = await desktop.locator("[data-defect-card]:visible").count();
await desktop.screenshot({ path: path.join(qaDir, "desktop-defect-atlas.png"), fullPage: false });

await desktop.goto(`${base}/level/3/3-4-plasma-deposition/`, { waitUntil: "networkidle" });
const chapterThreeFourTitle = await desktop.locator("h1").first().textContent();
await desktop.locator("#lab-a22").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(450);
const a22ControlCount = await desktop.locator('#lab-a22 input[type="range"]').count();
const a22OutputCount = await desktop.locator("#lab-a22 .value-panel dd").count();
const a22InitialCoverage = parseFloat(await desktop.locator('#lab-a22 [data-value-key="階梯覆蓋率"]').textContent());
const a22InitialGpc = parseFloat(await desktop.locator('#lab-a22 [data-value-key="GPC"]').textContent());
const a22Ranges = desktop.locator('#lab-a22 input[type="range"]');
await a22Ranges.nth(1).evaluate((input) => { input.value = "12"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a22SaturatedThickness = parseFloat(await desktop.locator('#lab-a22 [data-value-key="頂部厚度"]').textContent());
await a22Ranges.nth(1).evaluate((input) => { input.value = "20"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a22OversuppliedThickness = parseFloat(await desktop.locator('#lab-a22 [data-value-key="頂部厚度"]').textContent());
await a22Ranges.nth(2).evaluate((input) => { input.value = "0.2"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a22PoorPurgeStatus = await desktop.locator("#lab-a22 [data-lab-status]").textContent();
const a22PoorPurgeGpc = parseFloat(await desktop.locator('#lab-a22 [data-value-key="GPC"]').textContent());
await desktop.locator("#lab-a22").getByRole("radio", { name: "PECVD 對照" }).click();
const a22PecvdCoverage = parseFloat(await desktop.locator('#lab-a22 [data-value-key="階梯覆蓋率"]').textContent());
const a22CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a22 canvas"); const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data; let nonBlank = 0;
  for (let index = 0; index < data.length; index += 4) if (data[index] || data[index + 1] || data[index + 2]) nonBlank++; return nonBlank;
});
await desktop.locator("#lab-a23").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(400);
const a23ControlCount = await desktop.locator('#lab-a23 input[type="range"]').count();
const a23OutputCount = await desktop.locator("#lab-a23 .value-panel dd").count();
const a23InitialPecvd = await desktop.locator('#lab-a23 [data-value-key="PECVD 判定"]').textContent();
const a23InitialHdp = await desktop.locator('#lab-a23 [data-value-key="HDP 判定"]').textContent();
const a23Ranges = desktop.locator('#lab-a23 input[type="range"]');
await a23Ranges.nth(0).evaluate((input) => { input.value = "15"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a23HighDs = await desktop.locator('#lab-a23 [data-value-key="HDP 判定"]').textContent();
await a23Ranges.nth(0).evaluate((input) => { input.value = "5"; input.dispatchEvent(new Event("input", { bubbles: true })); });
await a23Ranges.nth(1).evaluate((input) => { input.value = "8"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a23HighAr = await desktop.locator('#lab-a23 [data-value-key="HDP 判定"]').textContent();
const a23CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a23 canvas"); const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data; let nonBlank = 0;
  for (let index = 0; index < data.length; index += 4) if (data[index] || data[index + 1] || data[index + 2]) nonBlank++; return nonBlank;
});
await desktop.screenshot({ path: path.join(qaDir, "desktop-a22-a23.png"), fullPage: false });

await desktop.goto(`${base}/level/3/3-5-pvd-cleaning/`, { waitUntil: "networkidle" });
const chapterThreeFiveTitle = await desktop.locator("h1").first().textContent();
await desktop.locator("#lab-a24").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(450);
const a24ControlCount = await desktop.locator('#lab-a24 input[type="range"]').count();
const a24OutputCount = await desktop.locator("#lab-a24 .value-panel dd").count();
const a24InitialEfficiency = parseFloat(await desktop.locator('#lab-a24 [data-value-key="游離效率"]').textContent());
const a24InitialUtilization = parseFloat(await desktop.locator('#lab-a24 [data-value-key="靶材利用率"]').textContent());
const a24Ranges = desktop.locator('#lab-a24 input[type="range"]');
await a24Ranges.nth(0).evaluate((input) => { input.value = "0"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a24NoFieldEfficiency = parseFloat(await desktop.locator('#lab-a24 [data-value-key="游離效率"]').textContent());
await a24Ranges.nth(3).evaluate((input) => { input.value = "0"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a24FreshDepth = parseFloat(await desktop.locator('#lab-a24 [data-value-key="Racetrack 深度"]').textContent());
const a24FreshDrift = parseFloat(await desktop.locator('#lab-a24 [data-value-key="速率漂移"]').textContent());
await a24Ranges.nth(0).evaluate((input) => { input.value = "300"; input.dispatchEvent(new Event("input", { bubbles: true })); });
await a24Ranges.nth(3).evaluate((input) => { input.value = "1000"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a24AgedDepth = parseFloat(await desktop.locator('#lab-a24 [data-value-key="Racetrack 深度"]').textContent());
const a24AgedDrift = parseFloat(await desktop.locator('#lab-a24 [data-value-key="速率漂移"]').textContent());
const a24CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a24 canvas"); const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data; let nonBlank = 0;
  for (let index = 0; index < data.length; index += 4) if (data[index] || data[index + 1] || data[index + 2]) nonBlank++; return nonBlank;
});

await desktop.goto(`${base}/level/3/3-6-uniformity-chamber/`, { waitUntil: "networkidle" });
const chapterThreeSixTitle = await desktop.locator("h1").first().textContent();
await desktop.locator("#lab-a25").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(450);
const a25ControlCount = await desktop.locator('#lab-a25 input[type="range"]').count();
const a25OutputCount = await desktop.locator("#lab-a25 .value-panel dd").count();
const a25PresetCount = await desktop.locator('#lab-a25 [role="radio"]').count();
const a25Classifications = [];
for (const label of ["中心快", "邊緣快", "W 形", "單邊偏斜", "同心環", "Edge roll"]) {
  await desktop.locator("#lab-a25").getByRole("radio", { name: label, exact: true }).click();
  a25Classifications.push(await desktop.locator('#lab-a25 [data-value-key="Map 判定"]').textContent());
}
await desktop.locator("#lab-a25").getByRole("radio", { name: "中心快", exact: true }).click();
const a25InitialHalfRange = parseFloat(await desktop.locator('#lab-a25 [data-value-key="半幅不均勻度"]').textContent());
const a25Ranges = desktop.locator('#lab-a25 input[type="range"]');
await a25Ranges.nth(5).evaluate((input) => { input.value = "100"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a25WornClassification = await desktop.locator('#lab-a25 [data-value-key="Map 判定"]').textContent();
const a25WornHalfRange = parseFloat(await desktop.locator('#lab-a25 [data-value-key="半幅不均勻度"]').textContent());
await desktop.locator("#lab-a25").getByRole("button", { name: "隨機出題" }).click();
const a25ChallengeStatus = await desktop.locator("#lab-a25 [data-lab-status]").textContent();
const a25ChallengeClassification = await desktop.locator('#lab-a25 [data-value-key="Map 判定"]').textContent();
const a25ChallengeSelectedCount = await desktop.locator('#lab-a25 [role="radio"][aria-checked="true"]').count();
await desktop.locator("#lab-a25").getByRole("button", { name: "揭曉" }).click();
const a25RevealedClassification = await desktop.locator('#lab-a25 [data-value-key="Map 判定"]').textContent();
const a25CanvasPixels = await desktop.evaluate(() => {
  const canvas = document.querySelector("#lab-a25 canvas"); const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data; let nonBlank = 0;
  for (let index = 0; index < data.length; index += 4) if (data[index] || data[index + 1] || data[index + 2]) nonBlank++; return nonBlank;
});
await desktop.screenshot({ path: path.join(qaDir, "desktop-a24-a25.png"), fullPage: false });

await desktop.goto(`${base}/level/3/`, { waitUntil: "networkidle" });
await desktop.click('a[href="/level/3/3-7-packaging-cleaning/"]');
await desktop.waitForLoadState("networkidle");
const packagingH1 = await desktop.locator("h1").first().textContent();
await desktop.locator("#lab-a33").scrollIntoViewIfNeeded();
await desktop.waitForTimeout(500);
const a33ControlCount = await desktop.locator('#lab-a33 input[type="range"]').count();
const a33OutputCount = await desktop.locator("#lab-a33 .value-panel dd").count();
const a33PathCount = await desktop.locator("#lab-a33 svg path.plot-line").count();
const a33InitialAngle = parseFloat(await desktop.locator('#lab-a33 [data-value-key="接觸角"]').textContent());
const a33InitialAdhesion = parseFloat(await desktop.locator('#lab-a33 [data-value-key="接著力指數"]').textContent());
const a33Ranges = desktop.locator('#lab-a33 input[type="range"]');
await a33Ranges.nth(2).evaluate((input) => { input.value = "180"; input.dispatchEvent(new Event("input", { bubbles: true })); });
const a33OvertreatedAngle = parseFloat(await desktop.locator('#lab-a33 [data-value-key="接觸角"]').textContent());
const a33OvertreatedAdhesion = parseFloat(await desktop.locator('#lab-a33 [data-value-key="接著力指數"]').textContent());
const a33OvertreatedStatus = await desktop.locator("#lab-a33 [data-lab-status]").textContent();
await desktop.locator("#lab-a33").getByRole("radio", { name: "打線前 pad" }).click();
const a33ReducedOxide = parseFloat(await desktop.locator('#lab-a33 [data-value-key="金屬氧化"]').textContent());
const a33ReducedAdhesion = parseFloat(await desktop.locator('#lab-a33 [data-value-key="接著力指數"]').textContent());
await desktop.locator("#lab-a33 select").first().selectOption("o2");
const a33OxidizedOxide = parseFloat(await desktop.locator('#lab-a33 [data-value-key="金屬氧化"]').textContent());
const a33OxidizedAdhesion = parseFloat(await desktop.locator('#lab-a33 [data-value-key="接著力指數"]').textContent());
const a33OxidizedStatus = await desktop.locator("#lab-a33 [data-lab-status]").textContent();
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
const chapterOneOneSelfChecks = await desktop.locator(".self-check details.check-card").count();
const chapterOneOneDiagramCount = await desktop.locator(".instruction-diagram img").count();
const chapterOneOneSupportCount = await desktop.locator(".chapter-support").count();
const chapterOneOneObservationCount = await desktop.locator("#lab-a01 .observation li").count();
const chapterOneOneFigureNumbersValid = await desktop.locator(".instruction-diagram figcaption strong").evaluateAll((captions) => captions.every((caption) => /^圖 1\.1-\d+ /.test(caption.textContent ?? "")));
await desktop.click('[data-objective="0"]');
await desktop.click('.quiz-choice[data-correct="true"]');
const quizText = await desktop.locator(".quiz-result").textContent();
await desktop.screenshot({ path: path.join(qaDir, "desktop-chapter.png"), fullPage: true });

await desktop.goto(`${base}/level/1/`, { waitUntil: "networkidle" });
await desktop.waitForFunction(() => !document.querySelector("[data-exam-gate-status]")?.textContent.includes("正在讀取"));
const examLockedStatus = await desktop.locator("[data-exam-gate-status]").textContent();
const examLockedLinkHidden = await desktop.locator("[data-exam-link]").isHidden();
await desktop.evaluate(() => {
  const chapters = Object.fromEntries(["1-1", "1-2", "1-3", "1-4", "1-5"].map((id) => [id, { visited: true, objectives: [true, true, true, true], quizScore: 1, lastVisit: new Date().toISOString() }]));
  localStorage.setItem("plasma-academy.progress", JSON.stringify({ version: 1, role: null, chapters, quizzes: {}, labUsage: {}, bookmarks: [], settings: { theme: "auto", reducedMotion: false, showEnglishTerms: true } }));
});
await desktop.goto(`${base}/level/1/exam/?seed=qa`, { waitUntil: "networkidle" });
const examUnlockedStatus = await desktop.locator("[data-exam-unlock-status]").textContent();
await desktop.click("[data-exam-start]");
await desktop.waitForSelector(".exam-question");
const examQuestionCount = await desktop.locator("[data-exam-question-nav] button").count();
const examDraw = { single: 0, multi: 0, numeric: 0, scenario: 0 };
const examBank = await desktop.evaluate(async () => (await import("/assets/data/quiz/level-1.js")).level1Questions);
for (let index = 0; index < examQuestionCount; index += 1) {
  await desktop.locator("[data-exam-question-nav] button").nth(index).click();
  const typeText = await desktop.locator("[data-exam-type]").textContent();
  const typeKey = { "單選題": "single", "多選題": "multi", "計算題": "numeric", "情境題": "scenario" }[typeText];
  examDraw[typeKey] += 1;
  const questionId = await desktop.locator(".exam-question").getAttribute("data-question-id");
  const question = examBank.find((item) => item.id === questionId);
  if (question.type === "numeric") {
    await desktop.fill(".exam-question input[type=number]", String(question.answer));
  } else {
    for (const option of question.options.filter((item) => item.correct)) {
      await desktop.locator(`.exam-question input[value="${option.id}"]`).click();
    }
  }
}
await desktop.screenshot({ path: path.join(qaDir, "desktop-exam.png"), fullPage: false });
await desktop.click("[data-exam-submit]");
const examScore = Number(await desktop.locator(".exam-score > div > strong").first().textContent());
const examReviewCount = await desktop.locator(".exam-review").count();
const examStoredProgress = await desktop.evaluate(() => JSON.parse(localStorage.getItem("plasma-academy.progress")).quizzes.L1);
await desktop.screenshot({ path: path.join(qaDir, "desktop-exam-results.png"), fullPage: false });
await desktop.goto(`${base}/progress/`, { waitUntil: "networkidle" });
const examBadgeStatus = await desktop.locator("[data-progress-l1-status]").textContent();
const examBadgeEarned = await desktop.locator("[data-progress-l1-badge]").evaluate((element) => element.classList.contains("earned"));

const l2DiagramRoutes = [
  ["/level/2/2-1-gas-vacuum/", 6],
  ["/level/2/2-2-process-gases/", 10],
  ["/level/2/2-3-plasma-chemistry/", 6],
  ["/level/2/2-4-advanced-sheath/", 6],
  ["/level/2/2-5-plasma-sources/", 6],
  ["/level/2/2-6-causal-chain/", 6]
];
const l2DiagramChecks = [];
for (const [route, expected] of l2DiagramRoutes) {
  await desktop.goto(`${base}${route}`, { waitUntil: "networkidle" });
  const figures = desktop.locator(".instruction-diagram");
  const count = await figures.count();
  for (let index = 0; index < count; index += 1) await figures.nth(index).scrollIntoViewIfNeeded();
  const diagramsLoaded = await figures.locator("img").evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth === 760));
  const figureNumbersValid = await figures.locator("figcaption strong").evaluateAll((captions) => captions.every((caption) => /^圖 2\.\d-\d+ /.test(caption.textContent ?? "")));
  const caseCount = await desktop.locator(".case-study").count();
  const shiftExerciseCount = await desktop.locator(".shift-exercise").count();
  l2DiagramChecks.push({ route, expected, count, diagramsLoaded, figureNumbersValid, caseCount, shiftExerciseCount });
}
await desktop.goto(`${base}/level/2/2-2-process-gases/`, { waitUntil: "networkidle" });
await desktop.screenshot({ path: path.join(qaDir, "desktop-l2-diagrams.png"), fullPage: true });
await desktop.goto(`${base}/level/2/2-6-causal-chain/`, { waitUntil: "networkidle" });
await desktop.locator('[id="2-6-packaging-clean"] summary').click();
await desktop.locator('[id="2-6-shift-exercise"] summary').click();
const packagingCaseText = await desktop.locator('[id="2-6-packaging-clean"]').textContent();
const packagingShiftText = await desktop.locator('[id="2-6-shift-exercise"]').textContent();
await desktop.locator('[id="2-6-packaging-clean"]').scrollIntoViewIfNeeded();
await desktop.screenshot({ path: path.join(qaDir, "desktop-packaging-clean-case.png"), fullPage: false });

await desktop.goto(`${base}/level/2/`, { waitUntil: "networkidle" });
await desktop.waitForFunction(() => !document.querySelector("[data-exam-gate-status]")?.textContent.includes("正在讀取"));
const l2ExamLockedStatus = await desktop.locator("[data-exam-gate-status]").textContent();
const l2ExamLockedLinkHidden = await desktop.locator("[data-exam-link]").isHidden();
await desktop.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem("plasma-academy.progress"));
  for (const id of ["2-1", "2-2", "2-3", "2-4", "2-5"]) {
    progress.chapters[id] = { visited: true, objectives: [true, true, true, true, true], quizScore: 1, lastVisit: new Date().toISOString() };
  }
  localStorage.setItem("plasma-academy.progress", JSON.stringify(progress));
});
await desktop.goto(`${base}/level/2/exam/?seed=qa`, { waitUntil: "networkidle" });
const l2ExamUnlockedStatus = await desktop.locator("[data-exam-unlock-status]").textContent();
await desktop.click("[data-exam-start]");
await desktop.waitForSelector(".exam-question");
const l2ExamQuestionCount = await desktop.locator("[data-exam-question-nav] button").count();
const l2ExamDraw = { single: 0, multi: 0, numeric: 0, scenario: 0 };
const l2ExamBank = await desktop.evaluate(async () => (await import("/assets/data/quiz/level-2.js")).level2Questions);
for (let index = 0; index < l2ExamQuestionCount; index += 1) {
  await desktop.locator("[data-exam-question-nav] button").nth(index).click();
  const typeText = await desktop.locator("[data-exam-type]").textContent();
  const typeKey = { "單選題": "single", "多選題": "multi", "計算題": "numeric", "情境題": "scenario" }[typeText];
  l2ExamDraw[typeKey] += 1;
  const questionId = await desktop.locator(".exam-question").getAttribute("data-question-id");
  const question = l2ExamBank.find((item) => item.id === questionId);
  if (question.type === "numeric") {
    await desktop.fill(".exam-question input[type=number]", String(question.answer));
  } else {
    for (const option of question.options.filter((item) => item.correct)) {
      await desktop.locator(`.exam-question input[value="${option.id}"]`).click();
    }
  }
}
await desktop.click("[data-exam-submit]");
const l2ExamScore = Number(await desktop.locator(".exam-score > div > strong").first().textContent());
const l2ExamReviewCount = await desktop.locator(".exam-review").count();
const l2ExamStoredProgress = await desktop.evaluate(() => JSON.parse(localStorage.getItem("plasma-academy.progress")).quizzes.L2);
await desktop.screenshot({ path: path.join(qaDir, "desktop-l2-exam-results.png"), fullPage: false });
await desktop.goto(`${base}/progress/`, { waitUntil: "networkidle" });
const l2ExamBadgeStatus = await desktop.locator("[data-progress-l2-status]").textContent();
const l2ExamBadgeEarned = await desktop.locator("[data-progress-l2-badge]").evaluate((element) => element.classList.contains("earned"));

const l3DiagramRoutes = [
  ["/level/3/3-1-etch-mechanisms/", 7], ["/level/3/3-2-deep-silicon-etch/", 6],
  ["/level/3/3-3-defect-atlas/", 7], ["/level/3/3-4-plasma-deposition/", 7],
  ["/level/3/3-5-pvd-cleaning/", 6], ["/level/3/3-6-uniformity-chamber/", 6],
  ["/level/3/3-7-packaging-cleaning/", 6]
];
const l3DiagramChecks = [];
let l3PackagingCaseText = "";
for (const [route, expected] of l3DiagramRoutes) {
  await desktop.goto(`${base}${route}`, { waitUntil: "networkidle" });
  const figures = desktop.locator(".instruction-diagram");
  const count = await figures.count();
  for (let index = 0; index < count; index += 1) await figures.nth(index).scrollIntoViewIfNeeded();
  const diagramsLoaded = await figures.locator("img").evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth === 760));
  const figureNumbersValid = await figures.locator("figcaption strong").evaluateAll((captions) => captions.every((caption) => /^圖 3\.\d-\d+ /.test(caption.textContent ?? "")));
  const fieldGuideCount = await desktop.locator(".l3-field-guide").count();
  const caseCount = await desktop.locator(".case-study").count();
  const shiftExerciseCount = await desktop.locator(".shift-exercise").count();
  if (route.includes("3-7-packaging-cleaning")) {
    await desktop.locator('[id="3-7-c2"] summary').click();
    await desktop.locator('[id="3-7-c3"] summary').click();
    l3PackagingCaseText = await desktop.locator(".engineering-casebook").textContent();
    await desktop.locator('[id="3-7-c2"]').scrollIntoViewIfNeeded();
    await desktop.screenshot({ path: path.join(qaDir, "desktop-l3-packaging-cases.png"), fullPage: false });
  }
  l3DiagramChecks.push({ route, expected, count, diagramsLoaded, figureNumbersValid, fieldGuideCount, caseCount, shiftExerciseCount });
}

await desktop.goto(`${base}/level/3/`, { waitUntil: "networkidle" });
await desktop.waitForFunction(() => !document.querySelector("[data-exam-gate-status]")?.textContent.includes("正在讀取"));
const l3ExamLockedStatus = await desktop.locator("[data-exam-gate-status]").textContent();
const l3ExamLockedLinkHidden = await desktop.locator("[data-exam-link]").isHidden();
await desktop.evaluate(() => {
  const counts = { "3-1": 5, "3-2": 5, "3-3": 5, "3-4": 5, "3-5": 5, "3-6": 5 };
  const chapters = Object.fromEntries(Object.entries(counts).map(([id, count]) => [id, { visited: true, objectives: Array(count).fill(true) }]));
  localStorage.setItem("plasma-academy.progress", JSON.stringify({ version: 1, chapters, quizzes: {}, labUsage: {} }));
});
await desktop.goto(`${base}/level/3/exam/?seed=qa`, { waitUntil: "networkidle" });
const l3ExamUnlockedStatus = await desktop.locator("[data-exam-unlock-status]").textContent();
await desktop.click("[data-exam-start]");
await desktop.waitForSelector(".exam-question");
const l3ExamQuestionCount = await desktop.locator("[data-exam-question-nav] button").count();
const l3ExamDraw = { single: 0, multi: 0, graphic: 0, scenario: 0 };
const l3ExamBank = await desktop.evaluate(async () => (await import("/assets/data/quiz/level-3.js")).level3Questions);
let l3GraphicLoaded = true;
for (let index = 0; index < l3ExamQuestionCount; index += 1) {
  await desktop.locator("[data-exam-question-nav] button").nth(index).click();
  const typeText = await desktop.locator("[data-exam-type]").textContent();
  const typeKey = { "單選題": "single", "多選題": "multi", "圖形判讀題": "graphic", "情境題": "scenario" }[typeText];
  l3ExamDraw[typeKey] += 1;
  const questionId = await desktop.locator(".exam-question").getAttribute("data-question-id");
  const question = l3ExamBank.find((item) => item.id === questionId);
  if (question.type === "graphic") {
    await desktop.waitForFunction(() => document.querySelector(".exam-graphic img")?.naturalWidth === 760);
    l3GraphicLoaded &&= await desktop.locator(".exam-graphic img").evaluate((image) => image.complete && image.naturalWidth === 760);
  }
  for (const option of question.options.filter((item) => item.correct)) await desktop.locator(`.exam-question input[value="${option.id}"]`).click();
}
await desktop.screenshot({ path: path.join(qaDir, "desktop-l3-exam.png"), fullPage: false });
await desktop.click("[data-exam-submit]");
const l3ExamScore = Number(await desktop.locator(".exam-score > div > strong").first().textContent());
const l3ExamReviewCount = await desktop.locator(".exam-review").count();
const l3ExamStoredProgress = await desktop.evaluate(() => JSON.parse(localStorage.getItem("plasma-academy.progress")).quizzes.L3);
await desktop.goto(`${base}/progress/`, { waitUntil: "networkidle" });
const l3ExamBadgeStatus = await desktop.locator("[data-progress-l3-status]").textContent();
const l3ExamBadgeEarned = await desktop.locator("[data-progress-l3-badge]").evaluate((element) => element.classList.contains("earned"));

const mobile = await browser.newPage({ viewport: { width: 375, height: 900 }, deviceScaleFactor: 1, isMobile: true });
mobile.on("pageerror", (error) => errors.push(error.message));
mobile.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
await mobile.goto(`${base}/gases/`, { waitUntil: "networkidle" });
const mobileGasOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileGasCardCount = await mobile.locator("[data-gas-card]").count();
await mobile.screenshot({ path: path.join(qaDir, "mobile-gases.png"), fullPage: false });
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

await mobile.goto(`${base}/level/1/1-6-process-map/`, { waitUntil: "networkidle" });
await mobile.locator("#lab-a07").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(700);
const mobileA07Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA07Regions = await mobile.locator("#lab-a07 [data-process-id]").count();
await mobile.screenshot({ path: path.join(qaDir, "mobile-a07.png"), fullPage: false });

await mobile.goto(`${base}/level/2/2-1-gas-vacuum/`, { waitUntil: "networkidle" });
await mobile.locator("#lab-a08").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(700);
const mobileA08Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA08CanvasPixels = await mobile.evaluate(() => {
  const canvas = document.querySelector("#lab-a08 [data-lab-canvas]");
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] || data[i + 1] || data[i + 2]) nonBlank++;
  }
  return nonBlank;
});
await mobile.screenshot({ path: path.join(qaDir, "mobile-a08.png"), fullPage: false });

await mobile.goto(`${base}/level/2/2-2-process-gases/`, { waitUntil: "networkidle" });
await mobile.locator("#lab-a10").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(700);
const mobileA10Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA10CanvasPixels = await mobile.evaluate(() => {
  const canvas = document.querySelector("#lab-a10 [data-lab-canvas]");
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] || data[i + 1] || data[i + 2]) nonBlank++;
  return nonBlank;
});
await mobile.screenshot({ path: path.join(qaDir, "mobile-a09-a10.png"), fullPage: false });

await mobile.goto(`${base}/level/2/2-3-plasma-chemistry/`, { waitUntil: "networkidle" });
await mobile.locator("#lab-a12").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(500);
const mobileA12Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA12PathCount = await mobile.locator("#lab-a12 svg path").count();
await mobile.screenshot({ path: path.join(qaDir, "mobile-a12.png"), fullPage: false });

await mobile.goto(`${base}/level/2/2-4-advanced-sheath/`, { waitUntil: "networkidle" });
await mobile.locator("#lab-a13").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(600);
const mobileA13Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA13BarCount = await mobile.locator("#lab-a13 .iedf-bar").count();
const mobileA13CanvasPixels = await mobile.evaluate(() => {
  const canvas = document.querySelector("#lab-a13 canvas");
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] || data[i + 1] || data[i + 2]) nonBlank++;
  return nonBlank;
});
await mobile.screenshot({ path: path.join(qaDir, "mobile-a13.png"), fullPage: false });

await mobile.goto(`${base}/level/2/2-5-plasma-sources/`, { waitUntil: "networkidle" });
await mobile.locator("#lab-a14").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(350);
const mobileA14Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA14PathCount = await mobile.locator("#lab-a14 svg path.plot-line").count();
const mobileA14CanvasPixels = await mobile.evaluate(() => {
  const canvas = document.querySelector("#lab-a14 canvas");
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let index = 0; index < data.length; index += 4) if (data[index] || data[index + 1] || data[index + 2]) nonBlank++;
  return nonBlank;
});
await mobile.locator("#lab-a15").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(250);
const mobileA15Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA15PathCount = await mobile.locator("#lab-a15 svg path").count();
const mobileA15CanvasPixels = await mobile.evaluate(() => {
  const canvas = document.querySelector("#lab-a15 canvas");
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let index = 0; index < data.length; index += 4) if (data[index] || data[index + 1] || data[index + 2]) nonBlank++;
  return nonBlank;
});
await mobile.screenshot({ path: path.join(qaDir, "mobile-a14-a15.png"), fullPage: false });

await mobile.goto(`${base}/level/2/2-6-causal-chain/`, { waitUntil: "networkidle" });
await mobile.locator("#lab-a16").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(400);
const mobileA16Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA16ControlCount = await mobile.locator('#lab-a16 input[type="range"]').count();
const mobileA16ChainCount = await mobile.locator("#lab-a16 .a16-chain-node").count();
const mobileA16CanvasPixels = await mobile.evaluate(() => {
  const canvas = document.querySelector("#lab-a16 canvas");
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let nonBlank = 0;
  for (let index = 0; index < data.length; index += 4) if (data[index] || data[index + 1] || data[index + 2]) nonBlank++;
  return nonBlank;
});
await mobile.screenshot({ path: path.join(qaDir, "mobile-a16.png"), fullPage: false });

await mobile.goto(`${base}/level/3/3-1-etch-mechanisms/`, { waitUntil: "networkidle" });
await mobile.locator("#lab-a17").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(350);
const mobileA17Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA17OutputCount = await mobile.locator("#lab-a17 .value-panel dd").count();
await mobile.locator("#lab-a18").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(350);
const mobileA18Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA18ControlCount = await mobile.locator('#lab-a18 input[type="range"]').count();
const mobileA18OutputCount = await mobile.locator("#lab-a18 .value-panel dd").count();
await mobile.screenshot({ path: path.join(qaDir, "mobile-a17-a18.png"), fullPage: false });

await mobile.goto(`${base}/level/3/3-2-deep-silicon-etch/`, { waitUntil: "networkidle" });
await mobile.locator("#lab-a19").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(350);
const mobileA19Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA19ControlCount = await mobile.locator('#lab-a19 input[type="range"]').count();
const mobileA19OutputCount = await mobile.locator("#lab-a19 .value-panel dd").count();
await mobile.screenshot({ path: path.join(qaDir, "mobile-a19-bosch.png"), fullPage: false });

await mobile.goto(`${base}/level/3/3-3-defect-atlas/`, { waitUntil: "networkidle" });
await mobile.locator("#lab-a20").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(350);
const mobileA20Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA20ControlCount = await mobile.locator('#lab-a20 input[type="range"]').count();
const mobileA20OutputCount = await mobile.locator("#lab-a20 .value-panel dd").count();
await mobile.locator("#lab-a21").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(350);
const mobileA21Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA21SymptomCount = await mobile.locator("#lab-a21 .symptom-option").count();
const mobileA21ResultCount = await mobile.locator("#lab-a21 .diagnosis-result").count();
await mobile.screenshot({ path: path.join(qaDir, "mobile-a20-a21.png"), fullPage: false });

await mobile.goto(`${base}/defects/`, { waitUntil: "networkidle" });
const mobileDefectOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileDefectCardCount = await mobile.locator("[data-defect-card]").count();
await mobile.screenshot({ path: path.join(qaDir, "mobile-defect-atlas.png"), fullPage: false });

await mobile.goto(`${base}/level/3/3-4-plasma-deposition/`, { waitUntil: "networkidle" });
await mobile.locator("#lab-a22").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(350);
const mobileA22Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA22ControlCount = await mobile.locator('#lab-a22 input[type="range"]').count();
const mobileA22OutputCount = await mobile.locator("#lab-a22 .value-panel dd").count();
await mobile.locator("#lab-a23").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(350);
const mobileA23Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA23ControlCount = await mobile.locator('#lab-a23 input[type="range"]').count();
const mobileA23OutputCount = await mobile.locator("#lab-a23 .value-panel dd").count();
await mobile.screenshot({ path: path.join(qaDir, "mobile-a22-a23.png"), fullPage: false });

await mobile.goto(`${base}/level/3/3-5-pvd-cleaning/`, { waitUntil: "networkidle" });
await mobile.locator("#lab-a24").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(350);
const mobileA24Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA24ControlCount = await mobile.locator('#lab-a24 input[type="range"]').count();
const mobileA24OutputCount = await mobile.locator("#lab-a24 .value-panel dd").count();
await mobile.goto(`${base}/level/3/3-6-uniformity-chamber/`, { waitUntil: "networkidle" });
await mobile.locator("#lab-a25").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(350);
const mobileA25Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA25ControlCount = await mobile.locator('#lab-a25 input[type="range"]').count();
const mobileA25OutputCount = await mobile.locator("#lab-a25 .value-panel dd").count();
const mobileA25PresetCount = await mobile.locator('#lab-a25 [role="radio"]').count();
await mobile.screenshot({ path: path.join(qaDir, "mobile-a24-a25.png"), fullPage: false });

await mobile.goto(`${base}/level/3/3-7-packaging-cleaning/`, { waitUntil: "networkidle" });
await mobile.locator('[id="3-7-c3"] summary').click();
await mobile.locator('[id="3-7-c3"]').scrollIntoViewIfNeeded();
const mobileL3CasebookOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
await mobile.screenshot({ path: path.join(qaDir, "mobile-l3-packaging-case.png"), fullPage: false });
await mobile.locator("#lab-a33").scrollIntoViewIfNeeded();
await mobile.waitForTimeout(400);
const mobileA33Overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileA33ControlCount = await mobile.locator('#lab-a33 input[type="range"]').count();
const mobileA33OutputCount = await mobile.locator("#lab-a33 .value-panel dd").count();
const mobileA33PathCount = await mobile.locator("#lab-a33 svg path.plot-line").count();
await mobile.screenshot({ path: path.join(qaDir, "mobile-a33-package-clean.png"), fullPage: false });

await mobile.evaluate(() => {
  const chapters = Object.fromEntries(["1-1", "1-2", "1-3", "1-4", "1-5"].map((id) => [id, { visited: true, objectives: [true, true, true, true] }]));
  localStorage.setItem("plasma-academy.progress", JSON.stringify({ version: 1, chapters, quizzes: {}, labUsage: {} }));
});
await mobile.goto(`${base}/level/1/exam/?seed=qa`, { waitUntil: "networkidle" });
await mobile.click("[data-exam-start]");
await mobile.waitForSelector(".exam-question");
const mobileExamOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileExamQuestionCount = await mobile.locator("[data-exam-question-nav] button").count();
await mobile.screenshot({ path: path.join(qaDir, "mobile-exam.png"), fullPage: false });

await mobile.goto(`${base}/level/2/2-2-process-gases/`, { waitUntil: "networkidle" });
const mobileL2DiagramOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileL2DiagramCount = await mobile.locator(".instruction-diagram").count();
await mobile.goto(`${base}/level/2/2-6-causal-chain/`, { waitUntil: "networkidle" });
await mobile.locator('[id="2-6-packaging-clean"] summary').click();
const mobilePackagingCaseOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
await mobile.screenshot({ path: path.join(qaDir, "mobile-packaging-clean-case.png"), fullPage: false });
await mobile.evaluate(() => {
  const chapters = Object.fromEntries(["2-1", "2-2", "2-3", "2-4", "2-5"].map((id) => [id, { visited: true, objectives: [true, true, true, true, true] }]));
  localStorage.setItem("plasma-academy.progress", JSON.stringify({ version: 1, chapters, quizzes: {}, labUsage: {} }));
});
await mobile.goto(`${base}/level/2/exam/?seed=qa`, { waitUntil: "networkidle" });
await mobile.click("[data-exam-start]");
await mobile.waitForSelector(".exam-question");
const mobileL2ExamOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileL2ExamQuestionCount = await mobile.locator("[data-exam-question-nav] button").count();
await mobile.screenshot({ path: path.join(qaDir, "mobile-l2-exam.png"), fullPage: false });

await mobile.evaluate(() => {
  const chapters = Object.fromEntries(["3-1", "3-2", "3-3", "3-4", "3-5", "3-6"].map((id) => [id, { visited: true, objectives: Array(5).fill(true) }]));
  localStorage.setItem("plasma-academy.progress", JSON.stringify({ version: 1, chapters, quizzes: {}, labUsage: {} }));
});
await mobile.goto(`${base}/level/3/exam/?seed=qa`, { waitUntil: "networkidle" });
await mobile.click("[data-exam-start]");
await mobile.waitForSelector(".exam-question");
const mobileL3ExamOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const mobileL3ExamQuestionCount = await mobile.locator("[data-exam-question-nav] button").count();
const mobileL3Nav = mobile.locator("[data-exam-question-nav] button");
for (let index = 0; index < mobileL3ExamQuestionCount; index += 1) {
  await mobileL3Nav.nth(index).click();
  if ((await mobile.locator("[data-exam-type]").textContent()) === "圖形判讀題") break;
}
await mobile.waitForFunction(() => document.querySelector(".exam-graphic img")?.naturalWidth === 760);
const mobileL3GraphicLoaded = await mobile.locator(".exam-graphic img").evaluate((image) => image.complete && image.naturalWidth === 760);
const mobileL3GraphicOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
await mobile.screenshot({ path: path.join(qaDir, "mobile-l3-exam.png"), fullPage: false });

await browser.close();

const result = { themeAfterClick, searchCount, packagingSearchHit, packagingH1, l1Checks, gasCardCount, fluorocarbonCardCount, extremeGasCount, gasSearchTitle, fcLabelsDoNotOverlap, gasSdsStatusCount, mobileGasOverflow, mobileGasCardCount, formulaCardCount, formulaPageText, a08InitialPanel, a08InitialDensity, a08HighFlowResidence, a08HighFlowDensity, a08HighPressureResidence, a08HighPressureDensity, a08CanvasPixels, a08ThemePixelBefore, a08ThemePixelAfter, mobileA08Overflow, mobileA08CanvasPixels, chapterOneOneSelfChecks, chapterOneOneDiagramCount, chapterOneOneSupportCount, chapterOneOneObservationCount, chapterOneOneFigureNumbersValid, examLockedStatus, examLockedLinkHidden, examUnlockedStatus, examQuestionCount, examDraw, examScore, examReviewCount, examStoredProgress, examBadgeStatus, examBadgeEarned, mobileExamOverflow, mobileExamQuestionCount, a02Initial, a02AfterDensity, a02Polarity, a02SvgPathCount, a02CanvasPixels, a03InitialPanel, a03LowPressureFwhm, a03HighPressurePanel, a03HighPressureFwhm, a03XePanel, a03ScaleToggle, a03CanvasPixels, a04InitialStatus, a04InitialPanel, a04CriticalGamma, a04ZeroGammaStatus, a04ZeroGammaFeedback, a04CriticalStatus, a04PausedButton, a04CanvasPixels, a05Initial, a05CurveCountInitial, a05AfterO2, a05Status, a05CanvasPixels, a06SteadyStatus, a06InitialDrop, a06LowDensitySheath, a06HighDensitySheath, a06DropAt4Ev, a06CurveCount, a06PlayButton, a06PlaybackPosition, a06CanvasPixels, a07InitialRegions, a07InitialInfo, a07CleaningRegions, a07SearchRegions, a07SearchInfo, a07SearchLink, a07PvdInfo, a07PvdLink, canvasInfo, mobileCanvasInfo, mobileA03CanvasPixels, mobileA04CanvasPixels, mobileA06CanvasPixels, mobileA07Regions, quizText, mobileOverflow, mobileA03Overflow, mobileA04Overflow, mobileA06Overflow, mobileA07Overflow, errors };
Object.assign(result, { a09NodeCount, a09Cases, a09CuText, a10InitialStatus, a10InitialFc, a10HighStatus, a10LowStatus, a10OxideRate, a10SiRate, a10CanvasPixels, mobileA10Overflow, mobileA10CanvasPixels });
Object.assign(result, { gasSupplierReviewedCount });
Object.assign(result, { a12PathCount, a12OverlapCount, a12RateBarCount, a12Ionization2Ev, a12Ionization3Ev, a12DruyvesteynIonization, a12Cf4Status, a12Cf4Dissociation, mobileA12Overflow, mobileA12PathCount });
Object.assign(result, { a13BarCount, a13LowFrequencyDelta, a13LowFrequencyStatus, a13HighFrequencyDelta, a13HighFrequencyStatus, a13HighPressureTail, a13HighPressureStatus, a13ArDelta, a13Cf3Delta, a13CanvasPixels, a13ThemeBefore, a13ThemeAfter, mobileA13Overflow, mobileA13BarCount, mobileA13CanvasPixels });
Object.assign(result, { a14At550Up, a14At700Up, a14At550Down, a14At400Down, a14PathCount, a14CanvasPixels, a14ThemeBefore, a14ThemeAfter, mobileA14Overflow, mobileA14PathCount, mobileA14CanvasPixels });
Object.assign(result, { a15InitialReflection, a15MatchedReflection, a15FirstFingerprint, a15DriftReflection, a15RematchedReflection, a15SecondFingerprint, a15PathCount, a15PointCount, a15CanvasPixels, mobileA15Overflow, mobileA15PathCount, mobileA15CanvasPixels });
Object.assign(result, { a16ControlCount, a16OutputCount, a16ChainCount, a16LowSourceTe, a16LowSourceDensity, a16HighSourceTe, a16HighSourceDensity, a16TeDelta, a16ZeroBiasRate, a16ZeroBiasSelectivity, a16ZeroBiasProfile, a16HighBiasRate, a16HighBiasSelectivity, a16ChallengeStatus, a16ChallengeClass, a16CanvasPixels, a16ThemeBefore, a16ThemeAfter, mobileA16Overflow, mobileA16ControlCount, mobileA16ChainCount, mobileA16CanvasPixels });
Object.assign(result, { chapterThreeOneTitle, a17BarCount, a17OutputCount, a17InitialTotal, a17InitialSynergy, a17NoIonTotal, a17TrenchStatus, a17CanvasPixels, a18ControlCount, a18OutputCount, a18InitialShape, a18BowingWidths, a18FixedBowingWidths, a18StoppedDepth, a18RecoveredDepth, a18FacetedMask, a18FixedMask, a18CanvasPixels, mobileA17Overflow, mobileA17OutputCount, mobileA18Overflow, mobileA18ControlCount, mobileA18OutputCount });
Object.assign(result, { chapterThreeTwoTitle, a19ControlCount, a19OutputCount, a19ShortScallop, a19ShortRate, a19LongScallop, a19LongRate, a19IsotropicStatus, a19CanvasPixels, mobileA19Overflow, mobileA19ControlCount, mobileA19OutputCount });
Object.assign(result, { chapterThreeThreeTitle, a20ControlCount, a20ToggleCount, a20OutputCount, a20InitialLag, a20NoTransportLag, a20InverseLag, a20CanvasPixels, a21SymptomCount, a21ResultCount, a21MethodCount, a21RankedFirst, defectCardCount, defectHasUndefined, defectArVisible, defectSearchVisible, mobileA20Overflow, mobileA20ControlCount, mobileA20OutputCount, mobileA21Overflow, mobileA21SymptomCount, mobileA21ResultCount, mobileDefectOverflow, mobileDefectCardCount });
Object.assign(result, { chapterThreeFourTitle, a22ControlCount, a22OutputCount, a22InitialCoverage, a22InitialGpc, a22SaturatedThickness, a22OversuppliedThickness, a22PoorPurgeStatus, a22PoorPurgeGpc, a22PecvdCoverage, a22CanvasPixels, a23ControlCount, a23OutputCount, a23InitialPecvd, a23InitialHdp, a23HighDs, a23HighAr, a23CanvasPixels, mobileA22Overflow, mobileA22ControlCount, mobileA22OutputCount, mobileA23Overflow, mobileA23ControlCount, mobileA23OutputCount });
Object.assign(result, { chapterThreeFiveTitle, a24ControlCount, a24OutputCount, a24InitialEfficiency, a24InitialUtilization, a24NoFieldEfficiency, a24FreshDepth, a24FreshDrift, a24AgedDepth, a24AgedDrift, a24CanvasPixels, chapterThreeSixTitle, a25ControlCount, a25OutputCount, a25PresetCount, a25Classifications, a25InitialHalfRange, a25WornClassification, a25WornHalfRange, a25ChallengeStatus, a25ChallengeClassification, a25ChallengeSelectedCount, a25RevealedClassification, a25CanvasPixels, mobileA24Overflow, mobileA24ControlCount, mobileA24OutputCount, mobileA25Overflow, mobileA25ControlCount, mobileA25OutputCount, mobileA25PresetCount });
Object.assign(result, { l2DiagramChecks, packagingCaseText, packagingShiftText, l2ExamLockedStatus, l2ExamLockedLinkHidden, l2ExamUnlockedStatus, l2ExamQuestionCount, l2ExamDraw, l2ExamScore, l2ExamReviewCount, l2ExamStoredProgress, l2ExamBadgeStatus, l2ExamBadgeEarned, mobileL2DiagramOverflow, mobileL2DiagramCount, mobilePackagingCaseOverflow, mobileL2ExamOverflow, mobileL2ExamQuestionCount });
Object.assign(result, { l3DiagramChecks, l3PackagingCaseText, l3ExamLockedStatus, l3ExamLockedLinkHidden, l3ExamUnlockedStatus, l3ExamQuestionCount, l3ExamDraw, l3GraphicLoaded, l3ExamScore, l3ExamReviewCount, l3ExamStoredProgress, l3ExamBadgeStatus, l3ExamBadgeEarned, mobileL3CasebookOverflow, mobileL3ExamOverflow, mobileL3ExamQuestionCount, mobileL3GraphicLoaded, mobileL3GraphicOverflow });
Object.assign(result, { a33ControlCount, a33OutputCount, a33PathCount, a33InitialAngle, a33InitialAdhesion, a33OvertreatedAngle, a33OvertreatedAdhesion, a33OvertreatedStatus, a33ReducedOxide, a33ReducedAdhesion, a33OxidizedOxide, a33OxidizedAdhesion, a33OxidizedStatus, mobileA33Overflow, mobileA33ControlCount, mobileA33OutputCount, mobileA33PathCount });
console.log(JSON.stringify(result, null, 2));

if (themeAfterClick !== "light" && themeAfterClick !== "dark") throw new Error("主題切換未解析為 light/dark。");
if (searchCount < 1) throw new Error("搜尋沒有回傳結果。");
if (!packagingSearchHit.includes("封裝") || !packagingH1.includes("封裝清潔")) throw new Error("封裝清潔頁或搜尋入口未通過驗證。");
if (gasCardCount !== 32 || fluorocarbonCardCount !== 8 || extremeGasCount !== 3 || gasSearchTitle !== "三氟化氮" || !fcLabelsDoNotOverlap || gasSdsStatusCount !== 32 || gasSupplierReviewedCount !== 27) throw new Error("A11 氣體百科資料、篩選、F/C 標尺或 SDS 證據狀態未通過驗證。");
if (mobileGasOverflow || mobileGasCardCount !== 32) throw new Error("A11 氣體百科手機版發生溢位或卡片缺漏。");
for (const check of l1Checks) {
  if (!check.title.includes(check.expectedTitle) || check.labPixels < 100000 || check.selfCheckCount !== check.expectedSelfChecks || check.diagramCount !== check.expectedDiagrams || !check.diagramsLoaded || !check.figureNumbersValid || check.chapterSupportCount !== 2 || !check.observationsValid) {
    throw new Error(`L1 章節驗證失敗: ${JSON.stringify(check)}`);
  }
}
if (formulaCardCount !== 18 || !formulaPageText.includes("Townsend 自持條件") || !formulaPageText.includes("浮動電位差") || !formulaPageText.includes("滯留時間")) throw new Error("公式手冊未完整渲染 18 條公式。");
if (!a08InitialPanel.includes("0.237 s") || !a08InitialDensity.includes("6.44e+14")) throw new Error("A08 預設滯留時間或中性密度不符規格。");
if (Math.abs(a08HighFlowResidence - 0.119) > 0.002 || a08HighFlowDensity !== a08InitialDensity) throw new Error("A08 流量加倍後，滯留時間或密度變化不符規格。");
if (Math.abs(a08HighPressureResidence - 1.185) > 0.003 || !a08HighPressureDensity.includes("6.44e+15")) throw new Error("A08 壓力提高十倍後，滯留時間或密度變化不符規格。");
if (a08CanvasPixels < 100000 || mobileA08CanvasPixels < 100000) throw new Error("A08 桌機或手機 Canvas 看起來是空白。");
if (JSON.stringify(a08ThemePixelBefore) === JSON.stringify(a08ThemePixelAfter)) throw new Error("A08 Canvas 未隨主題切換重新取色。");
if (mobileA08Overflow) throw new Error("A08 手機版有水平溢出。");
if (a09NodeCount !== 6 || Object.values(a09Cases).some((passed) => !passed)) throw new Error("A09 決策路徑或五個標準案例未通過。");
if (!a09CuText.includes("大馬士革") || a09CuText.includes("一般 Cu RIE 配方：Cl")) throw new Error("A09 Cu 特殊路徑未正確阻止錯誤 RIE 配方。");
if (!a10InitialStatus.includes("製程窗") || a10InitialFc !== "2.36") throw new Error("A10 預設中 F/C 製程窗不符規格。");
if (!a10HighStatus.includes("等向") || !a10LowStatus.includes("etch stop")) throw new Error("A10 未能重現高 F/C 或低 F/C 狀態。");
if (!(a10SiRate < a10OxideRate * 0.5)) throw new Error("A10 Si 與 SiO2 的表面選擇比趨勢不符規格。");
if (a10CanvasPixels < 100000 || mobileA10CanvasPixels < 100000) throw new Error("A10 桌機或手機 Canvas 看起來是空白。");
if (mobileA10Overflow) throw new Error("A09/A10 手機版有水平溢出。");
if (a12PathCount < 4 || a12OverlapCount !== 1 || a12RateBarCount !== 3) throw new Error("A12 EEDF、截面、重疊區或反應率長條未完整渲染。");
if (!(a12Ionization3Ev / a12Ionization2Ev > 5)) throw new Error("A12 T_e 2→3 eV 的游離率增幅未超過五倍。");
if (!(a12DruyvesteynIonization < a12Ionization3Ev)) throw new Error("A12 Druyvesteyn 高能尾端沒有降低游離率。");
if (!a12Cf4Status.includes("15.9 eV") || !(a12Cf4Dissociation > 0)) throw new Error("A12 CF4 閾值或解離率未更新。");
if (mobileA12Overflow || mobileA12PathCount < 4) throw new Error("A12 手機版發生水平溢出或曲線缺漏。");
if (a13BarCount !== 48 || mobileA13BarCount !== 48) throw new Error("A13 IEDF 直方圖未完整渲染 48 個能量區間。");
if (!(a13LowFrequencyDelta > a13HighFrequencyDelta * 10) || !a13LowFrequencyStatus.includes("寬雙峰") || !a13HighFrequencyStatus.includes("窄單峰")) throw new Error("A13 低頻寬雙峰或高頻窄單峰未通過。");
if (!(a13HighPressureTail >= 20) || !a13HighPressureStatus.includes("低能尾巴")) throw new Error("A13 高壓電荷交換低能尾巴未通過。");
if (!(a13Cf3Delta < a13ArDelta)) throw new Error("A13 重離子峰間距沒有依 1/sqrt(M) 趨勢縮小。");
if (a13CanvasPixels < 100000 || mobileA13CanvasPixels < 100000) throw new Error("A13 桌機或手機 Canvas 看起來是空白。");
if (JSON.stringify(a13ThemeBefore) === JSON.stringify(a13ThemeAfter)) throw new Error("A13 Canvas 未隨主題切換重新取色。");
if (mobileA13Overflow) throw new Error("A13 手機版有水平溢出。");
if (!a14At550Up.includes("E-mode") || !a14At700Up.includes("H-mode") || !a14At550Down.includes("H-mode") || !a14At400Down.includes("E-mode")) throw new Error("A14 E/H 模式遲滯與掃描歷史未通過。");
if (a14PathCount !== 2 || mobileA14PathCount !== 2 || a14CanvasPixels < 100000 || mobileA14CanvasPixels < 100000) throw new Error("A14 遲滯曲線或 CCP/ICP Canvas 未完整渲染。");
if (JSON.stringify(a14ThemeBefore) === JSON.stringify(a14ThemeAfter)) throw new Error("A14 Canvas 未隨主題切換重新取色。");
if (mobileA14Overflow) throw new Error("A14 手機版有水平溢出。");
if (!(a15InitialReflection > 1) || !(a15MatchedReflection < 1) || !(a15DriftReflection > 5) || !(a15RematchedReflection < 1)) throw new Error("A15 初始失配、條件漂移或自動匹配收斂未通過。");
if (a15FirstFingerprint === a15SecondFingerprint) throw new Error("A15 壓力改變後沒有產生新的匹配電容指紋。");
if (a15PathCount < 8 || a15PointCount < 8 || mobileA15PathCount < 8 || a15CanvasPixels < 100000 || mobileA15CanvasPixels < 100000) throw new Error("A15 Smith-like 圖、L 網路或功率 Canvas 未完整渲染。");
if (mobileA15Overflow) throw new Error("A15 手機版有水平溢出。");
if (a16ControlCount !== 8 || a16OutputCount !== 8 || a16ChainCount !== 8 || mobileA16ControlCount !== 8 || mobileA16ChainCount !== 8) throw new Error("A16 HMI 控制、輸出儀表或因果鏈節點不完整。");
if (!(Math.abs(a16HighSourceTe / a16LowSourceTe - 1) < 0.1) || !(a16HighSourceDensity / a16LowSourceDensity > 9) || !a16TeDelta.includes("幾乎不變")) throw new Error("A16 Source power 對 n_e 與 T_e 的教學趨勢未通過。");
if (a16ZeroBiasRate >= 1 || !a16ZeroBiasProfile.includes("Etch stop") || !(a16HighBiasRate > a16ZeroBiasRate) || !(a16HighBiasSelectivity < a16ZeroBiasSelectivity)) throw new Error("A16 Bias 對速率、選擇比與 etch stop 的趨勢未通過。");
if (!a16ChallengeStatus.includes("達成") || !a16ChallengeClass.includes("passed")) throw new Error("A16 挑戰目標在製程窗內未能達成。");
if (a16CanvasPixels < 200000 || mobileA16CanvasPixels < 200000) throw new Error("A16 桌機或手機 Canvas 看起來是空白。");
if (JSON.stringify(a16ThemeBefore) === JSON.stringify(a16ThemeAfter)) throw new Error("A16 Canvas 未隨主題切換重新取色。");
if (mobileA16Overflow) throw new Error("A16 手機版有水平溢出。");
if (!chapterThreeOneTitle.includes("異向性蝕刻") || a17BarCount !== 4 || a17OutputCount !== 5 || mobileA17OutputCount !== 5) throw new Error("3.1 或 A17 長條圖與讀值未完整渲染。");
if (a17InitialTotal !== 55 || a17InitialSynergy !== 48 || a17NoIonTotal !== 5 || !a17TrenchStatus.includes("溝底")) throw new Error("A17 未正確重現 5、2、55 協同實驗或溝槽推導。");
if (a17CanvasPixels < 100000 || mobileA17Overflow) throw new Error("A17 Canvas 空白或手機版溢出。");
if (a18ControlCount !== 6 || a18OutputCount !== 6 || mobileA18ControlCount !== 6 || mobileA18OutputCount !== 6 || a18InitialShape !== "垂直") throw new Error("A18 控制、讀值或垂直基準未完整渲染。");
if (a18BowingWidths === a18FixedBowingWidths || !(a18RecoveredDepth > a18StoppedDepth + 30) || !(a18FixedMask < a18FacetedMask - 0.1)) throw new Error("A18 bowing、etch stop 或 faceting 對策未產生量測改善。");
if (a18CanvasPixels < 150000 || mobileA18Overflow) throw new Error("A18 Canvas 空白或手機版溢出。");
if (!chapterThreeTwoTitle.includes("深矽") || a19ControlCount !== 4 || a19OutputCount !== 5 || mobileA19ControlCount !== 4 || mobileA19OutputCount !== 5) throw new Error("3.2 或 A19 控制與讀值未完整渲染。");
if (!(a19LongScallop > a19ShortScallop * 3) || !(a19LongRate > a19ShortRate) || !a19IsotropicStatus.includes("等向")) throw new Error("A19 未呈現循環時間的粗糙度／速率取捨或關閉沉積後的等向側蝕。");
if (a19CanvasPixels < 150000 || mobileA19Overflow) throw new Error("A19 Canvas 空白或手機版溢出。");
if (!chapterThreeThreeTitle.includes("缺陷圖鑑") || a20ControlCount !== 4 || a20ToggleCount !== 4 || a20OutputCount !== 5 || mobileA20ControlCount !== 4 || mobileA20OutputCount !== 5) throw new Error("3.3 或 A20 控制與讀值未完整渲染。");
if (!(a20InitialLag > 30) || !(a20NoTransportLag < a20InitialLag - 2) || !(a20InverseLag < -20)) throw new Error("A20 未呈現四機制貢獻或反向 ARDE。");
if (a20CanvasPixels < 150000 || mobileA20Overflow) throw new Error("A20 Canvas 空白或手機版溢出。");
if (a21SymptomCount !== 18 || a21ResultCount !== 5 || a21MethodCount < 2 || !a21RankedFirst.includes("Notching")) throw new Error("A21 的 18 種症狀、排序或雙重判別法未完整運作。");
if (mobileA21Overflow || mobileA21SymptomCount !== 18 || mobileA21ResultCount !== 5) throw new Error("A21 手機版溢出或內容缺漏。");
if (defectCardCount !== 18 || defectHasUndefined || defectArVisible !== 4 || defectSearchVisible !== 1 || mobileDefectCardCount !== 18 || mobileDefectOverflow) throw new Error("缺陷圖鑑的 18 條資料、分類文字、篩選、搜尋或手機版未通過。");
if (!chapterThreeFourTitle.includes("電漿沉積") || a22ControlCount !== 4 || a22OutputCount !== 6 || mobileA22ControlCount !== 4 || mobileA22OutputCount !== 6) throw new Error("3.4 或 A22 控制與讀值未完整渲染。");
if (!(a22InitialCoverage > 95) || Math.abs(a22InitialGpc - 0.08) > 0.005 || Math.abs(a22OversuppliedThickness - a22SaturatedThickness) > 0.02 || !a22PoorPurgeStatus.includes("寄生 CVD") || !(a22PoorPurgeGpc > 0.12) || !(a22PecvdCoverage < 50)) throw new Error("A22 未呈現 PEALD 自限制、purge 失效或 PECVD 對照。");
if (a22CanvasPixels < 150000 || mobileA22Overflow) throw new Error("A22 Canvas 空白或手機版溢出。");
if (a23ControlCount !== 3 || a23OutputCount !== 5 || mobileA23ControlCount !== 3 || mobileA23OutputCount !== 5 || !a23InitialPecvd.includes("void") || !a23InitialHdp.includes("窗口") || !a23HighDs.includes("void") || !a23HighAr.includes("void")) throw new Error("A23 未呈現 PECVD/HDP 填溝窗口與邊界失效。");
if (a23CanvasPixels < 150000 || mobileA23Overflow) throw new Error("A23 Canvas 空白或手機版溢出。");
if (!chapterThreeFiveTitle.includes("磁控濺鍍") || a24ControlCount !== 4 || a24OutputCount !== 5 || mobileA24ControlCount !== 4 || mobileA24OutputCount !== 5) throw new Error("3.5 或 A24 控制與讀值未完整渲染。");
if (!(a24InitialEfficiency / a24NoFieldEfficiency > 9) || !(a24InitialUtilization >= 20 && a24InitialUtilization <= 40) || !(a24AgedDepth > a24FreshDepth + 5) || !(a24AgedDrift > a24FreshDrift + 5)) throw new Error("A24 未呈現磁場游離增益、靶材利用率或 racetrack 漂移。");
if (a24CanvasPixels < 150000 || mobileA24Overflow) throw new Error("A24 Canvas 空白或手機版溢出。");
if (!chapterThreeSixTitle.includes("均勻度") || a25ControlCount !== 7 || a25OutputCount !== 4 || a25PresetCount !== 6 || mobileA25ControlCount !== 7 || mobileA25OutputCount !== 4 || mobileA25PresetCount !== 6) throw new Error("3.6 或 A25 控制、預設與讀值未完整渲染。");
if (JSON.stringify(a25Classifications) !== JSON.stringify(["中心快", "邊緣快", "W 形", "單邊偏斜", "同心環", "Edge roll"]) || a25WornClassification !== "Edge roll" || !(a25WornHalfRange > a25InitialHalfRange)) throw new Error("A25 六種 map 辨識或聚焦環 edge roll 趨勢未通過。");
if (!a25ChallengeStatus.includes("反向練習") || a25ChallengeClassification !== "待揭曉" || a25ChallengeSelectedCount !== 0 || !["中心快", "邊緣快", "W 形", "單邊偏斜", "同心環", "Edge roll"].includes(a25RevealedClassification)) throw new Error("A25 反向練習未正確隱藏或揭曉標準圖形答案。");
if (a25CanvasPixels < 150000 || mobileA25Overflow) throw new Error("A25 Canvas 空白或手機版溢出。");
if (chapterOneOneSelfChecks !== 5 || chapterOneOneDiagramCount !== 5 || chapterOneOneSupportCount !== 2 || chapterOneOneObservationCount !== 3 || !chapterOneOneFigureNumbersValid) throw new Error("1.1 自我檢測、圖解、章節結構或觀察點未完整顯示。");
if (!examLockedStatus.includes("還需") || !examLockedLinkHidden || !examUnlockedStatus.includes("30 分鐘")) throw new Error("L1 測驗的 80% 章節解鎖條件未正確運作。");
if (examQuestionCount !== 20 || JSON.stringify(examDraw) !== JSON.stringify({ single: 12, multi: 3, numeric: 3, scenario: 2 })) throw new Error(`L1 測驗抽題分佈錯誤：${JSON.stringify(examDraw)}`);
if (examScore !== 100 || examReviewCount !== 20 || !examStoredProgress.passed || examStoredProgress.bestScore !== 100) throw new Error("L1 測驗計分、解析或進度寫入未通過。");
if (!examBadgeEarned || !examBadgeStatus.includes("最佳成績 100%")) throw new Error("L1 通過徽章未正確顯示在進度頁。");
if (mobileExamOverflow || mobileExamQuestionCount !== 20) throw new Error("L1 測驗手機版發生溢位或題目導覽缺漏。");
for (const check of l2DiagramChecks) {
  if (check.count !== check.expected || !check.diagramsLoaded || !check.figureNumbersValid || check.caseCount !== 6 || check.shiftExerciseCount !== 1) throw new Error(`L2 圖解或工程案例驗證失敗：${JSON.stringify(check)}`);
}
if (!["LMWOM", "金屬氧化", "接合窗口", "contact angle"].every((term) => packagingCaseText.includes(term))) throw new Error("封裝清潔工程案例缺少劑量或材料相容重點。");
if (!["queue time", "重清潔", "累積 dose", "MES"].every((term) => packagingShiftText.includes(term))) throw new Error("封裝清潔交班演練缺少超時與再處理決策。");
if (!l2ExamLockedStatus.includes("還需") || !l2ExamLockedLinkHidden || !l2ExamUnlockedStatus.includes("45 分鐘")) throw new Error("L2 測驗的 80% 章節解鎖條件未正確運作。");
if (l2ExamQuestionCount !== 30 || JSON.stringify(l2ExamDraw) !== JSON.stringify({ single: 18, multi: 4, numeric: 4, scenario: 4 })) throw new Error(`L2 測驗抽題分佈錯誤：${JSON.stringify(l2ExamDraw)}`);
if (l2ExamScore !== 100 || l2ExamReviewCount !== 30 || !l2ExamStoredProgress.passed || l2ExamStoredProgress.bestScore !== 100) throw new Error("L2 測驗計分、解析或進度寫入未通過。");
if (!l2ExamBadgeEarned || !l2ExamBadgeStatus.includes("最佳成績 100%")) throw new Error("L2 通過徽章未正確顯示在進度頁。");
if (mobileL2DiagramOverflow || mobileL2DiagramCount !== 10) throw new Error("L2 圖解手機版發生溢位或缺漏。");
if (mobilePackagingCaseOverflow) throw new Error("封裝清潔工程案例在手機版發生水平溢位。");
if (mobileL2ExamOverflow || mobileL2ExamQuestionCount !== 30) throw new Error("L2 測驗手機版發生溢位或題目導覽缺漏。");
for (const check of l3DiagramChecks) {
  if (check.count !== check.expected || !check.diagramsLoaded || !check.figureNumbersValid || check.fieldGuideCount !== 1 || check.caseCount !== 4 || check.shiftExerciseCount !== 1) throw new Error(`L3 圖解或工程案例驗證失敗：${JSON.stringify(check)}`);
}
if (!["Cu oxide", "LMWOM", "queue time", "累積 dose", "re-clean", "supplier-specific"].every((term) => l3PackagingCaseText.includes(term))) throw new Error("L3 封裝清潔案例缺少金屬氧化、弱邊界層、超時重清潔或材料差異重點。");
if (mobileL3CasebookOverflow) throw new Error("L3 封裝清潔案例在手機版發生水平溢位。");
if (!l3ExamLockedStatus.includes("還需完成 6 章") || !l3ExamLockedLinkHidden || !l3ExamUnlockedStatus.includes("60 分鐘")) throw new Error("L3 測驗的 6/7 章解鎖條件未正確運作。");
if (l3ExamQuestionCount !== 35 || JSON.stringify(l3ExamDraw) !== JSON.stringify({ single: 10, multi: 5, graphic: 10, scenario: 10 })) throw new Error(`L3 測驗抽題分布錯誤：${JSON.stringify(l3ExamDraw)}`);
if (!l3GraphicLoaded || l3ExamScore !== 100 || l3ExamReviewCount !== 35 || !l3ExamStoredProgress.passed || l3ExamStoredProgress.bestScore !== 100) throw new Error("L3 圖形題、計分、解析或進度寫入未通過。");
if (!l3ExamBadgeEarned || !l3ExamBadgeStatus.includes("最佳成績 100%")) throw new Error("L3 通過徽章未正確顯示在進度頁。");
if (mobileL3ExamOverflow || mobileL3GraphicOverflow || mobileL3ExamQuestionCount !== 35 || !mobileL3GraphicLoaded) throw new Error("L3 測驗手機版發生溢位、圖形缺漏或題目導覽缺漏。");
if (a33ControlCount !== 4 || a33OutputCount !== 7 || a33PathCount !== 2 || mobileA33ControlCount !== 4 || mobileA33OutputCount !== 7 || mobileA33PathCount !== 2) throw new Error("A33 控制項、讀值或雙曲線沒有完整渲染。");
if (!(a33InitialAngle < 30) || !(a33OvertreatedAngle <= a33InitialAngle) || !(a33OvertreatedAdhesion < a33InitialAdhesion) || !a33OvertreatedStatus.includes("處理過頭")) throw new Error("A33 未呈現接觸角持續下降但接著力因過量處理反降的製程上限。");
if (!(a33ReducedOxide < a33OxidizedOxide) || !(a33ReducedAdhesion > a33OxidizedAdhesion) || !a33OxidizedStatus.includes("NSOP")) throw new Error("A33 的 H2/Ar 去氧化或 O2 氧化 Cu 趨勢未通過。");
if (mobileA33Overflow) throw new Error("A33 封裝清潔計算器在手機版發生水平溢位。");
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
if (a07InitialRegions !== 6 || !a07InitialInfo.includes("電漿蝕刻")) throw new Error("A07 未完整顯示六大製程或初始資訊卡。");
if (a07CleaningRegions !== 2 || a07SearchRegions !== 1 || !a07SearchInfo.includes("腔體清潔") || !/^\/level\/[23]\/$/.test(a07SearchLink ?? "")) throw new Error("A07 清潔篩選、NF3 搜尋或章節連結未生效。");
if (!a07PvdInfo.includes("PVD 濺鍍") || !/^\/level\/[23]\/$/.test(a07PvdLink ?? "")) throw new Error("A07 PVD 點選或資訊卡連結未更新。");
if (mobileA07Regions !== 6) throw new Error("A07 手機版未顯示六大製程區塊。");
if (canvasInfo.nonBlank < canvasInfo.width * canvasInfo.height * 0.5) throw new Error("A01 Canvas 看起來是空白。");
if (mobileCanvasInfo.nonBlank < mobileCanvasInfo.width * mobileCanvasInfo.height * 0.5) throw new Error("手機 A01 Canvas 看起來是空白。");
if (!quizText.includes("正確")) throw new Error("自我檢測沒有顯示成功狀態。");
if (mobileOverflow) throw new Error("手機版有水平溢出。");
if (mobileA03Overflow) throw new Error("A03 手機版有水平溢出。");
if (mobileA04Overflow) throw new Error("A04 手機版有水平溢出。");
if (mobileA06Overflow) throw new Error("A06 手機版有水平溢出。");
if (mobileA07Overflow) throw new Error("A07 手機版有水平溢出。");
if (errors.length) throw new Error(`瀏覽器 console/page errors: ${errors.join("; ")}`);
