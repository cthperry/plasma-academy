import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import worker, { HTML_SECURITY_HEADERS } from "../worker/index.js";

const client = path.resolve("dist/client");
const errors = [];
const server = createServer(async (request, response) => {
  try {
    const origin = `http://${request.headers.host}`;
    const workerResponse = await worker.fetch(new Request(new URL(request.url, origin), { method: request.method }), {
      ASSETS: { fetch: serveAsset }
    });
    response.writeHead(workerResponse.status, Object.fromEntries(workerResponse.headers));
    response.end(Buffer.from(await workerResponse.arrayBuffer()));
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(`本機 Worker adapter 失敗：${error.message}`);
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;
let browser;

try {
  browser = await launchBrowser();
  const timingRows = [];
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 375, height: 812 }]) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(() => {
      window.__task13CspViolations = [];
      addEventListener("securitypolicyviolation", (event) => {
        window.__task13CspViolations.push(`${event.violatedDirective}:${event.blockedURI}`);
      });
    });
    const page = await context.newPage();
    watch(page);
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
    const samples = [];
    for (let sample = 0; sample < 5; sample += 1) {
      const navigation = await page.goto(`${base}/?dcl=${viewport.width}-${sample}`, { waitUntil: "domcontentloaded" });
      assertCsp(navigation, viewport.width);
      samples.push(await page.evaluate(() => {
        const entry = performance.getEntriesByType("navigation").at(-1);
        return entry.domContentLoadedEventEnd - entry.startTime;
      }));
    }
    const medianMs = median(samples);
    timingRows.push({ viewport: viewport.width, samplesMs: samples.map((value) => Number(value.toFixed(1))).join(", "), medianMs: Number(medianMs.toFixed(1)), targetMs: 300 });
    if (!(medianMs < 300)) throw new Error(`${viewport.width}px 的 DOMContentLoaded 中位數 ${medianMs.toFixed(1)} ms 未低於 300 ms。`);

    const defectsResponse = await page.goto(`${base}/defects/`, { waitUntil: "networkidle" });
    assertCsp(defectsResponse, viewport.width);
    await page.locator("[data-defect-search]").fill("不存在的缺陷關鍵字-task13");
    if (!/^0 種$/.test((await page.locator("[data-defect-count]").textContent()).trim())) throw new Error(`${viewport.width}px 缺陷圖鑑外部 page-type initializer 未運作。`);
    const violations = await page.evaluate(() => window.__task13CspViolations ?? []);
    if (violations.length) throw new Error(`${viewport.width}px 發生 CSP 違規：${JSON.stringify(violations)}`);
    await context.close();
  }

  const reducedRows = [];
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 375, height: 812 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    await context.addInitScript(() => {
      window.__task13RafCount = 0;
      window.__task13CspViolations = [];
      const requestFrame = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) => {
        window.__task13RafCount += 1;
        return requestFrame(callback);
      };
      addEventListener("securitypolicyviolation", (event) => {
        window.__task13CspViolations.push(`${event.violatedDirective}:${event.blockedURI}`);
      });
    });
    const page = await context.newPage();
    watch(page);
    for (const lab of [
      { id: "A01", route: "/level/1/1-1-fourth-state/", selector: "#lab-a01", outputs: 3 },
      { id: "A04", route: "/level/1/1-4-glow-breakdown/", selector: "#lab-a04", outputs: 5 }
    ]) {
      const navigation = await page.goto(`${base}${lab.route}`, { waitUntil: "networkidle" });
      assertCsp(navigation, viewport.width);
      const container = page.locator(lab.selector);
      await container.scrollIntoViewIfNeeded();
      await container.locator("canvas").waitFor();
      await page.waitForFunction(({ selector, outputs }) => document.querySelectorAll(`${selector} .value-panel dd`).length === outputs, lab);
      await page.waitForTimeout(100);
      const before = await page.evaluate(() => window.__task13RafCount);
      await page.waitForTimeout(250);
      const after = await page.evaluate(() => window.__task13RafCount);
      const contentComplete = await canvasHasContent(page, `${lab.selector} canvas`);
      const outputCount = await container.locator(".value-panel dd").count();
      const reducedMatches = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
      reducedRows.push({ viewport: viewport.width, lab: lab.id, rafBefore: before, rafAfter: after, outputCount, contentComplete });
      if (!reducedMatches || after !== before || outputCount !== lab.outputs || !contentComplete) throw new Error(`${viewport.width}px ${lab.id} reduced-motion 內容或動畫停止失敗。`);
    }
    await context.close();
  }

  console.log("DOMContentLoaded 方法：本機 Worker、無 throttle、每個 viewport 1 次 warm-up + 5 次 warm-cache navigation，門檻採中位數 <300 ms。 ");
  console.table(timingRows);
  console.table(reducedRows);
  if (errors.length) throw new Error(`Task 13 瀏覽器 console/page errors：${errors.join(" | ")}`);
  console.log("Task 13 瀏覽器驗證通過：1440/375 CSP、缺陷圖鑑外部初始化、DCL、A01/A04 reduced-motion。 ");
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function serveAsset(request) {
  const url = new URL(request.url);
  const pathname = decodeURIComponent(url.pathname);
  const file = path.resolve(client, `.${pathname}`);
  if (!file.startsWith(`${client}${path.sep}`)) return new Response("禁止存取此路徑。", { status: 403 });
  try {
    if (!(await stat(file)).isFile()) throw Object.assign(new Error("不是檔案"), { code: "ENOENT" });
    const body = await readFile(file);
    return new Response(request.method === "HEAD" ? null : body, { headers: { "Content-Type": contentType(file) } });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return new Response("本機資產找不到。", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

function contentType(file) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".xml": "application/xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8"
  })[path.extname(file)] ?? "application/octet-stream";
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    if (!existsSync(chromePath)) throw error;
    return chromium.launch({ headless: true, executablePath: chromePath });
  }
}

function watch(page) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
}

function assertCsp(response, viewport) {
  const actual = response?.headers()["content-security-policy"];
  if (actual !== HTML_SECURITY_HEADERS["Content-Security-Policy"]) throw new Error(`${viewport}px HTML CSP 不符合 Worker 契約：${actual}`);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function canvasHasContent(page, selector) {
  return page.locator(selector).evaluate((canvas) => {
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set();
    for (let index = 0; index < pixels.length; index += Math.max(4, Math.floor(pixels.length / 500 / 4) * 4)) {
      colors.add(`${pixels[index]},${pixels[index + 1]},${pixels[index + 2]},${pixels[index + 3]}`);
    }
    return colors.size >= 4;
  });
}
