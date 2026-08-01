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
    exportName: "chapterFourFour",
    file: "src/content/chapter-4-4.mjs",
    id: "4-4",
    moduleId: "4.4",
    hours: 3.5,
    labs: ["A30", "A31"],
    labIds: ["a30", "a31"],
    checks: 8,
    textUnits: 9000,
    required: ["脈衝", "ALE", "HAR", "高深寬比", "Directional ALE", "Isotropic ALE", "HF", "金屬有機物", "GAA", "RDL", "UBM", "Cu", "低損傷", "原子層清潔"]
  },
  {
    exportName: "chapterFourFive",
    file: "src/content/chapter-4-5.mjs",
    id: "4-5",
    moduleId: "4.5",
    hours: 2,
    labs: ["A32"],
    labIds: ["a32"],
    checks: 6,
    textUnits: 7000,
    required: ["模擬", "0-D", "粒子平衡", "Te", "ne", "功率", "LXCat", "可信度", "RDL", "UBM", "mold compound", "趨勢"]
  }
];

function effectiveUnits(text) {
  return (String(text ?? "").match(/[\p{L}\p{N}]/gu) ?? []).length;
}

function chapterProse(chapter) {
  return [
    chapter.summary,
    ...(chapter.objectives ?? []),
    ...(chapter.sections ?? []).flatMap((section) => [section.title, section.body]),
    ...(chapter.callouts ?? []).flatMap((item) => [item.title, item.body]),
    ...(chapter.labs ?? []).flatMap((lab) => [lab.title, ...(lab.observation ?? [])]),
    ...(chapter.selfCheck ?? []).flat(),
    ...(chapter.readings ?? [])
  ].join(" ");
}

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
    if (chapter.id !== spec.id || !chapter.route?.startsWith("/level/4/") || chapter.hours !== spec.hours) failures.push(`${spec.moduleId} id、route 或 hours 不符合契約。`);
    if (!Array.isArray(chapter.sections) || chapter.sections.length < 4) failures.push(`${spec.moduleId} 應有至少 4 節正文。`);
    if (chapter.selfCheck?.length !== spec.checks || chapter.selfCheck.some((item) => !Array.isArray(item) || !String(item[0] ?? "").trim() || !String(item[1] ?? "").trim())) failures.push(`${spec.moduleId} 應有 ${spec.checks} 題含問題與答案的自我檢測。`);
    if (chapter.labs?.length !== spec.labIds.length || chapter.labs.some((lab, index) => lab.id !== spec.labIds[index])) failures.push(`${spec.moduleId} lab 應依序包含 ${spec.labs.join("、")}。`);
    const impossibleObservationClaims = ["切換至封裝", "將表面設為", "平均移除量", "IEDF proxy", "反應成本", "比較不同 wall loss", "表面係數"];
    for (const claim of impossibleObservationClaims) if (chapter.labs.some((lab) => lab.observation?.some((item) => item.includes(claim)))) failures.push(`${spec.moduleId} lab 觀察點要求介面不存在的操作：${claim}`);
    const prose = chapterProse(chapter);
    const textUnits = effectiveUnits(prose);
    if (textUnits < spec.textUnits) failures.push(`${spec.moduleId} 正文有效字元至少 ${spec.textUnits}，目前 ${textUnits}。`);
    for (const required of spec.required) if (!prose.includes(required)) failures.push(`${spec.moduleId} 缺少必要內容：${required}`);

    const levelFour = curriculum.levels.find((level) => level.id === 4);
    const module = levelFour?.modules.find((item) => item.id === spec.moduleId);
    if (!module || module.href !== chapter.route || module.hours !== spec.hours || module.labs?.join(",") !== spec.labs.join(",")) failures.push(`curriculum ${spec.moduleId} 不符合章節契約。`);
    for (const labId of spec.labs) {
      const lab = labs.find((item) => item.id === labId);
      if (!lab || lab.chapter !== spec.moduleId || lab.href !== `${chapter.route}#lab-${labId.toLowerCase()}`) failures.push(`${labId} lab href 或 chapter 不正確。`);
      const chapterLab = chapter.labs.find((item) => item.id === labId.toLowerCase());
      const expectedModule = `/assets/js/labs/${labId === "A30" ? "a30-ale-cycle" : labId === "A31" ? "a31-pulse-timing" : "a32-global-model"}.js`;
      if (chapterLab?.module !== expectedModule) failures.push(`${labId} 章節資料必須直接引用 UI module：${expectedModule}`);
    }

    const longParagraphs = chapter.sections.flatMap((section) => [...section.body.matchAll(/<p>([\s\S]*?)<\/p>/g)]
      .map((match) => match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
      .filter((text) => text.length >= 120));
    if (new Set(longParagraphs).size !== longParagraphs.length) failures.push(`${spec.moduleId} 不可跨 section 重複長段落灌字。`);
  }

  const builtPath = chapter?.route ? `dist/client${chapter.route}index.html` : "";
  const built = builtPath ? await readRequired(builtPath, `建置後 ${spec.moduleId} 頁面`) : "";
  if (built) {
    const count = (pattern) => (built.match(pattern) ?? []).length;
    if (count(/class="prose-section"/g) !== (chapter?.sections?.length ?? -1)) failures.push(`建置後 ${spec.moduleId} prose section 數量不正確。`);
    if (count(/class="check-card"/g) !== spec.checks) failures.push(`建置後 ${spec.moduleId} self-check 數量不正確。`);
    for (const labId of spec.labIds) if (!built.includes(`id="lab-${labId}"`) || !built.includes(`data-lab-module="/assets/js/labs/${labId === "a30" ? "a30-ale-cycle" : labId === "a31" ? "a31-pulse-timing" : "a32-global-model"}.js"`)) failures.push(`建置後 ${spec.moduleId} 缺少 ${labId} lab。`);
    for (const required of ["data-unit-converter", "/assets/css/a30-a32.css", "上一章：", "下一章："]) if (!built.includes(required)) failures.push(`建置後 ${spec.moduleId} 缺少：${required}`);
  }
}

const uiContracts = {
  "A30": ["createLifecycle", "watchTheme", "generateAleRun", "calculateAleSynergy", "ionEnergyEv", "modificationTimeS", "purgeTimeS", "cycles", "continuous-sputter", "EPC", "reduceMotion()", "syncCanvasResolution"],
  "A31": ["createLifecycle", "watchTheme", "generatePulseWaveforms", "comparePulseCharging", "frequencyKhz", "dutyCycle", "source", "bias", "synchronized", "phaseDegrees", "continuous", "負離子", "reduceMotion()", "syncCanvasResolution"],
  "A32": ["watchTheme", "createGlobalState", "solveGlobalModel", "scanGlobalModel", "balanceCurves", "intersectionError", "electronTemperature", "electronDensity", "absorbedPowerW", "flowSccm", "趨勢教學", "syncCanvasResolution"]
};
const uiFiles = {
  A30: "src/assets/js/labs/a30-ale-cycle.js",
  A31: "src/assets/js/labs/a31-pulse-timing.js",
  A32: "src/assets/js/labs/a32-global-model.js"
};
for (const [lab, required] of Object.entries(uiContracts)) {
  const source = await readRequired(uiFiles[lab], `${lab} UI module`);
  for (const token of required) if (!source.includes(token)) failures.push(`${lab} UI 缺少契約標記：${token}`);
}

const cssSource = await readRequired("src/assets/css/a30-a32.css", "A30-A32 CSS");
if (!/aspect-ratio:\s*720\s*\/\s*430/.test(cssSource) || !/height:\s*auto/.test(cssSource)) failures.push("A30-A32 Canvas CSS 必須固定 720/430 並以 height:auto 顯示。");
if (/min-height\s*:/.test(cssSource)) failures.push("A30-A32 Canvas CSS 不可使用 min-height。");

const built43 = await readRequired("dist/client/level/4/4-3-plasma-damage/index.html", "建置後 4.3 頁面");
if (built43 && !built43.includes("下一章：4.4")) failures.push("建置後 4.3 下一章未指向 4.4。");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("L4 4.4/4.5 章節、A30-A32 UI 與建置後契約檢查通過。");
