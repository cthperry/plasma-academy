import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { curriculum } from "../src/data/curriculum.js";
import { labs } from "../src/data/labs.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

async function readRequired(relativePath, label) {
  try {
    return await readFile(path.join(root, relativePath), "utf8");
  } catch {
    failures.push(`缺少 ${label}：${relativePath}`);
    return "";
  }
}

const specs = [
  {
    exportName: "chapterFourTwo",
    file: "src/content/chapter-4-2.mjs",
    id: "4-2",
    moduleId: "4.2",
    route: "/level/4/4-2-endpoint-control/",
    title: "4.2 終點偵測與先進製程控制",
    hours: 2.5,
    sections: 7,
    selfChecks: 7,
    lab: "A28",
    labId: "a28",
    built: "dist/client/level/4/4-2-endpoint-control/index.html",
    textUnits: 7500,
    required: ["Timed etch", "開口率", "0.1%", "lambda", "2n", "干涉式", "移動平均", "一階微分", "歸一化", "視窗污染", "R2R", "EWMA", "FDC", "Virtual Metrology"]
  },
  {
    exportName: "chapterFourThree",
    file: "src/content/chapter-4-3.mjs",
    id: "4-3",
    moduleId: "4.3",
    route: "/level/4/4-3-plasma-damage/",
    title: "4.3 電漿誘發損傷",
    hours: 2.5,
    sections: 4,
    selfChecks: 7,
    lab: "A29",
    labId: "a29",
    built: "dist/client/level/4/4-3-plasma-damage/index.html",
    textUnits: 7000,
    required: ["天線比", "electron shading", "脈衝", "off-phase", "天線二極體", "UV/VUV", "無法", "離子轟擊", "污染", "Low-k", "CHARM", "TDDB", "Arcing"]
  }
];

for (const spec of specs) {
  const source = await readRequired(spec.file, `${spec.moduleId} 章節資料`);
  let chapter;
  if (source) {
    try {
      const module = await import(`${pathToFileURL(path.join(root, spec.file)).href}?check=${Date.now()}`);
      chapter = module[spec.exportName];
    } catch (error) {
      failures.push(`${spec.moduleId} 無法匯入：${error.message}`);
    }
  }
  if (chapter) {
    if (chapter.id !== spec.id || chapter.route !== spec.route || chapter.title !== spec.title || chapter.hours !== spec.hours) failures.push(`${spec.moduleId} id、route、title 或 hours 不符合契約。`);
    if (chapter.sections?.length !== spec.sections) failures.push(`${spec.moduleId} 應有 ${spec.sections} 節，目前 ${chapter.sections?.length ?? 0}。`);
    if (chapter.selfCheck?.length !== spec.selfChecks || chapter.selfCheck.some((item) => !Array.isArray(item) || !String(item[1] ?? "").trim())) failures.push(`${spec.moduleId} 應有 ${spec.selfChecks} 題含答案自我檢測。`);
    if (chapter.labs?.length !== 1 || chapter.labs[0].id !== spec.labId) failures.push(`${spec.moduleId} 應只包含 ${spec.lab}。`);
    const prose = [chapter.summary, ...(chapter.sections ?? []).map((section) => section.body)].join(" ");
    const textUnits = (prose.match(/[\p{L}\p{N}]/gu) ?? []).length;
    if (textUnits < spec.textUnits) failures.push(`${spec.moduleId} 正文有效字母/數字至少 ${spec.textUnits}，目前 ${textUnits}。`);
    for (const required of spec.required) if (!prose.includes(required)) failures.push(`${spec.moduleId} 缺少必要內容：${required}`);
  }

  const levelFour = curriculum.levels.find((level) => level.id === 4);
  const module = levelFour?.modules.find((item) => item.id === spec.moduleId);
  if (!module || module.href !== spec.route || module.hours !== spec.hours || module.labs?.join(",") !== spec.lab) failures.push(`curriculum ${spec.moduleId} 不符合章節契約。`);
  const lab = labs.find((item) => item.id === spec.lab);
  if (!lab || lab.chapter !== spec.moduleId || lab.href !== `${spec.route}#lab-${spec.labId}`) failures.push(`${spec.lab} lab href 或 chapter 不正確。`);

  const built = await readRequired(spec.built, `建置後 ${spec.moduleId} 頁面`);
  if (built) {
    const count = (pattern) => (built.match(pattern) ?? []).length;
    if (count(/class="prose-section"/g) !== spec.sections) failures.push(`建置後 ${spec.moduleId} section 數量不正確。`);
    if (count(/data-lab-module=/g) !== 1 || count(/class="check-card"/g) !== spec.selfChecks) failures.push(`建置後 ${spec.moduleId} lab 或 self-check 數量不正確。`);
    for (const required of [spec.lab, "上一章：", "下一章：", "data-unit-converter", "/assets/css/a28-a29.css"]) if (!built.includes(required)) failures.push(`建置後 ${spec.moduleId} 缺少：${required}`);
  }
}

const a28Source = await readRequired("src/assets/js/labs/a28-endpoint.js", "A28 UI module");
const a29Source = await readRequired("src/assets/js/labs/a29-antenna-charging.js", "A29 UI module");
const cssSource = await readRequired("src/assets/css/a28-a29.css", "A28/A29 CSS");
for (const required of ["createLifecycle", "watchTheme", "generateEndpointSeries", "analyzeEndpointSeries", "openAreaExponent", "movingAverage", "firstDerivative", "normalized", "interference", "update(time)", "reduceMotion()", "播放", "curveSignature", "syncCanvasResolution"]) if (!a28Source.includes(required)) failures.push(`A28 UI 缺少契約標記：${required}`);
for (const required of ["createLifecycle", "watchTheme", "simulateCharging", "createToggle", "antennaExponent", "aspectRatio", "oxideThicknessNm", "pulsed", "antennaDiode", "UV/VUV", "累積電荷", "breakdownExceeded", "update(time)", "reduceMotion()", "播放", "syncCanvasResolution"]) if (!a29Source.includes(required)) failures.push(`A29 UI 缺少契約標記：${required}`);
if (!/aspect-ratio:\s*720\s*\/\s*430/.test(cssSource) || !/height:\s*auto/.test(cssSource)) failures.push("A28/A29 Canvas CSS 必須固定 720/430 並以 height:auto 顯示。 ");
if (/#lab-a2[89][\s\S]*?canvas[\s\S]*?min-height:/.test(cssSource)) failures.push("A28/A29 Canvas 不可使用 min-height 拉伸比例。 ");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("L4 4.2/4.3 章節與 A28/A29 靜態契約檢查通過。 ");
