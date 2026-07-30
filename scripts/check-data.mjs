import { glossary } from "../src/data/glossary.js";
import { curriculum } from "../src/data/curriculum.js";
import { labs } from "../src/data/labs.js";
import { dataSchemas } from "../src/data/schemas.js";
import { processMapEntries } from "../src/assets/js/data/process-map.js";
import { formulas } from "../src/data/formulas.js";
import { chapterOneOne } from "../src/content/chapter-1-1.mjs";
import { l1FoundationChapters } from "../src/content/l1-foundation-chapters.mjs";
import { level1ExamSpec, level1Questions } from "../src/data/quiz/level-1.js";
import { l1Diagrams } from "../src/data/l1-diagrams.js";
import { gases, gasFamilies, hazardLevels } from "../src/data/gases.js";
import { childLangmuirSheathMm, effectivePumpingSpeedLps, floatingPotentialDropEv, ionAngularFwhmDeg, meanFreePathCm, neutralGasDensityCm3, paschenGases, paschenVoltage, residenceTimeSeconds, townsendDischarge } from "../src/assets/js/plasma-model.js";

const failures = [];

if (gases.length !== 32) failures.push(`P2 氣體百科必須包含 32 種氣體，目前 ${gases.length} 種。`);
const gasIds = new Set();
for (const gas of gases) {
  if (gasIds.has(gas.id)) failures.push(`氣體 ID 重複：${gas.id}。`);
  gasIds.add(gas.id);
  for (const field of dataSchemas.gas.required) {
    const value = gas[field];
    const missing = value === undefined || value === null && field !== "fcRatio" || value === "" || Array.isArray(value) && value.length === 0;
    if (missing) failures.push(`氣體 ${gas.id} 缺少 ${field}。`);
  }
  if (!gasFamilies.includes(gas.family)) failures.push(`氣體 ${gas.id} 使用未知家族 ${gas.family}。`);
  if (!hazardLevels.includes(gas.hazardLevel)) failures.push(`氣體 ${gas.id} 使用未知危害等級 ${gas.hazardLevel}。`);
  if (!/^https:\/\//.test(gas.sdsSource)) failures.push(`氣體 ${gas.id} 缺少 HTTPS SDS 來源。`);
}
for (const [id, level] of Object.entries({ sih4: "extreme", b2h6: "extreme", ph3: "extreme", cl2: "high", hbr: "high", bcl3: "high", wf6: "high", nf3: "high", f2: "high" })) {
  if (gases.find((gas) => gas.id === id)?.hazardLevel !== level) failures.push(`氣體 ${id} 的危害分級必須是 ${level}。`);
}

if (glossary.length < 242) {
  failures.push(`術語表至少應包含來源文件 242 條，目前 ${glossary.length} 條。`);
}

for (const [index, term] of glossary.entries()) {
  for (const field of ["id", "zh", "en", "definition", "chapter"]) {
    if (!term[field]) failures.push(`glossary[${index}] 缺少 ${field}`);
  }
}

const modules = curriculum.levels.flatMap((level) => level.modules);
if (modules.length < 12) {
  failures.push(`P0 curriculum 應至少列出 L1/L2 的 12 個模組，目前 ${modules.length} 個。`);
}

for (const requiredTerm of ["重佈線層", "凸塊下金屬層", "底填膠", "表面活化", "離子污染"]) {
  if (!glossary.some((term) => term.zh === requiredTerm)) {
    failures.push(`封裝清潔新增術語未進術語表：${requiredTerm}`);
  }
}

if (labs.length !== 32) {
  failures.push(`互動元件清單應為 A01-A32 共 32 件，目前 ${labs.length} 件。`);
}

const expectedProcesses = ["電漿蝕刻", "PECVD", "PVD 濺鍍", "光阻灰化", "腔體清潔", "表面處理"];
if (processMapEntries.length !== 6 || !expectedProcesses.every((name) => processMapEntries.some((entry) => entry.name === name))) {
  failures.push("A07 製程地圖必須完整包含 1.6.1 的六大類應用。");
}
for (const entry of processMapEntries) {
  for (const field of ["purpose", "gases", "pressure", "power", "tool", "challenge"]) {
    if (!entry[field]) failures.push(`A07 ${entry.name} 缺少 ${field}。`);
  }
  if (!/^\/level\/[23]\/$/.test(entry.link?.href ?? "")) {
    failures.push(`A07 ${entry.name} 缺少有效的 L2/L3 章節連結。`);
  }
}

const l1SelfCheckCount = [chapterOneOne, ...l1FoundationChapters].reduce((total, chapter) => total + (chapter.selfCheck?.length ?? 0), 0);
if (l1SelfCheckCount !== 35) {
  failures.push(`P1 章末自我檢測應為 35 題，目前 ${l1SelfCheckCount} 題。`);
}

if (Object.keys(formulas).length < 18) {
  failures.push(`P2 公式手冊應至少 18 條，目前 ${Object.keys(formulas).length} 條。`);
}
for (const [key, formula] of Object.entries(formulas)) {
  for (const field of dataSchemas.formula.required) {
    if (!formula[field] || (field === "symbols" && !Array.isArray(formula.symbols))) failures.push(`公式 ${key} 缺少 ${field}。`);
  }
}

const residenceExample = residenceTimeSeconds({ pressureMtorr: 20, volumeL: 30, flowSccm: 200 });
if (Math.abs(residenceExample - 0.237) > 0.005) failures.push(`A08 滯留時間範例應約 0.24 s，目前 ${residenceExample.toFixed(3)} s。`);
const densityExample = neutralGasDensityCm3(10, 300);
if (Math.abs(densityExample / 3.22e14 - 1) > 0.02) failures.push(`10 mTorr、300 K 中性密度應約 3.2×10^14 cm^-3，目前 ${densityExample.toExponential(2)}。`);
const pumpingExample = effectivePumpingSpeedLps({ pressureMtorr: 20, flowSccm: 200 });
if (Math.abs(pumpingExample - 126.67) > 0.2) failures.push(`A08 有效抽速範例應約 126.7 L/s，目前 ${pumpingExample.toFixed(2)} L/s。`);

if (level1Questions.length !== 55) failures.push(`L1 結業題庫應為 55 題，目前 ${level1Questions.length} 題。`);
const quizIds = new Set();
for (const question of level1Questions) {
  if (quizIds.has(question.id)) failures.push(`L1 題庫 ID 重複：${question.id}。`);
  quizIds.add(question.id);
  for (const field of ["id", "chapter", "type", "difficulty", "tags", "question", "explanation", "reference"]) {
    if (question[field] === undefined || question[field] === null || question[field] === "") failures.push(`題目 ${question.id} 缺少 ${field}。`);
  }
  if (!Object.hasOwn(level1ExamSpec.draw, question.type)) failures.push(`題目 ${question.id} 使用不支援的 L1 題型 ${question.type}。`);
  if (["single", "multi", "scenario"].includes(question.type)) {
    if (!Array.isArray(question.options) || question.options.length < 2) failures.push(`題目 ${question.id} 缺少有效選項。`);
    for (const option of question.options ?? []) {
      if (!option.id || !option.text || typeof option.correct !== "boolean" || !option.why) failures.push(`題目 ${question.id} 的選項 ${option.id ?? "?"} 未包含完整 why 解析。`);
    }
  }
  if (question.type === "numeric" && (!["number", "string"].includes(typeof question.answer) || typeof question.tolerance !== "number")) failures.push(`計算題 ${question.id} 缺少答案或容差。`);
}
for (const [type, drawCount] of Object.entries(level1ExamSpec.draw)) {
  const available = level1Questions.filter((question) => question.type === type).length;
  if (available < drawCount) failures.push(`L1 ${type} 題不足：需抽 ${drawCount}，目前 ${available}。`);
}
const expectedBankDistribution = { single: 30, multi: 9, numeric: 8, scenario: 8 };
for (const [type, expected] of Object.entries(expectedBankDistribution)) {
  const actual = level1Questions.filter((question) => question.type === type).length;
  if (actual !== expected) failures.push(`L1 ${type} 題庫分佈應為 ${expected} 題，目前 ${actual} 題。`);
}

if (l1Diagrams.length !== 35) failures.push(`L1 教學 SVG 目錄應為 35 張，目前 ${l1Diagrams.length} 張。`);
const diagramIds = new Set();
for (const diagram of l1Diagrams) {
  if (diagramIds.has(diagram.id)) failures.push(`L1 圖解 ID 重複：${diagram.id}。`);
  diagramIds.add(diagram.id);
  for (const field of ["id", "chapter", "section", "title", "caption", "type", "items", "note"]) {
    if (!diagram[field] || (field === "items" && !Array.isArray(diagram.items))) failures.push(`L1 圖解 ${diagram.id} 缺少 ${field}。`);
  }
}

for (const [gasKey, gas] of Object.entries(paschenGases)) {
  const modeled = paschenVoltage(gas.pdMinTorrCm, gasKey);
  const error = Math.abs(modeled - gas.vMin) / gas.vMin;
  if (error > 0.1) {
    failures.push(`Paschen ${gas.label} 最小值誤差 ${(error * 100).toFixed(1)}%，超過 10%。`);
  }
}

const argonFloatingDrop = floatingPotentialDropEv(3);
if (Math.abs(argonFloatingDrop - 14.1) > 0.3) {
  failures.push(`Ar 浮動電位差應約為 4.7 Te，T_e=3 eV 時計算為 ${argonFloatingDrop.toFixed(2)} V。`);
}

const lowDensitySheath = childLangmuirSheathMm({ electronDensityCm3: 1e9, electronTemperatureEv: 3 });
const highDensitySheath = childLangmuirSheathMm({ electronDensityCm3: 1e11, electronTemperatureEv: 3 });
if (!(highDensitySheath < lowDensitySheath)) {
  failures.push(`Child-Langmuir 鞘層厚度未隨 n_e 上升而變薄：${lowDensitySheath.toFixed(3)} -> ${highDensitySheath.toFixed(3)} mm。`);
}

if (Math.abs(meanFreePathCm(1, "Ar") - 5) > 0.01) {
  failures.push(`Ar 在 1 mTorr 的平均自由徑應約 5 cm，目前 ${meanFreePathCm(1, "Ar").toFixed(2)} cm。`);
}

const pressureSamples = [1, 10, 100, 200];
const angularWidths = pressureSamples.map((pressureMtorr) => ionAngularFwhmDeg({ pressureMtorr, gas: "Ar" }));
if (!angularWidths.every((value, index) => index === 0 || value > angularWidths[index - 1])) {
  failures.push(`Ar 入射角 FWHM 未隨壓力單調增加：${angularWidths.map((value) => value.toFixed(1)).join(", ")}。`);
}

const noSecondaryTownsend = townsendDischarge({ reducedFieldVPerCmTorr: 120, gamma: 0, gapCm: 1 });
if (noSecondaryTownsend.feedback !== 0 || noSecondaryTownsend.selfSustaining) {
  failures.push("Townsend 模型在 γ=0 時不應自持。");
}

const criticalTownsend = townsendDischarge({
  reducedFieldVPerCmTorr: 120,
  gamma: noSecondaryTownsend.criticalGamma,
  gapCm: 1
});
if (Math.abs(criticalTownsend.feedback - 1) > 1e-9) {
  failures.push(`Townsend 臨界條件應為 1，目前 ${criticalTownsend.feedback.toFixed(6)}。`);
}

for (const [name, schema] of Object.entries(dataSchemas)) {
  if (!Array.isArray(schema.required) || schema.required.length === 0) {
    failures.push(`dataSchemas.${name} 缺少 required 欄位。`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("資料模組檢查通過。");
