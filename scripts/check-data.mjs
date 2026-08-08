import { glossary } from "../src/data/glossary.js";
import { curriculum } from "../src/data/curriculum.js";
import { labs } from "../src/data/labs.js";
import { dataSchemas } from "../src/data/schemas.js";
import { processMapEntries } from "../src/assets/js/data/process-map.js";
import { formulas } from "../src/data/formulas.js";
import { spectra } from "../src/data/spectra.js";
import { chapterOneOne } from "../src/content/chapter-1-1.mjs";
import { chapterFourOne } from "../src/content/chapter-4-1.mjs";
import { l1FoundationChapters } from "../src/content/l1-foundation-chapters.mjs";
import { level1ExamSpec, level1Questions } from "../src/data/quiz/level-1.js";
import { level2ExamSpec, level2Questions } from "../src/data/quiz/level-2.js";
import { l1Diagrams } from "../src/data/l1-diagrams.js";
import { l2Diagrams } from "../src/data/l2-diagrams.js";
import { gases, gasFamilies, hazardLevels } from "../src/data/gases.js";
import { sdsEvidence } from "../src/data/sds-evidence.js";
import { childLangmuirSheathMm, eedfReactionModel, effectivePumpingSpeedLps, findAutoMatch, floatingPotentialDropEv, fluorocarbonProfile, ionAngularFwhmDeg, meanFreePathCm, neutralGasDensityCm3, paschenGases, paschenVoltage, residenceTimeSeconds, simulateIedf, sourceCouplingModel, townsendDischarge, virtualToolModel } from "../src/assets/js/plasma-model.js";

const failures = [];

if (gases.length !== 32) failures.push(`P2 氣體百科必須包含 32 種氣體，目前 ${gases.length} 種。`);
const gasIds = new Set();
for (const gas of gases) {
  if (gasIds.has(gas.id)) failures.push(`氣體 ID 重複：${gas.id}。`);
  gasIds.add(gas.id);
  for (const field of dataSchemas.gas.required) {
    const value = gas[field];
    const missing = value === undefined || (value === null && field !== "fcRatio") || value === "" || (Array.isArray(value) && value.length === 0);
    if (missing) failures.push(`氣體 ${gas.id} 缺少 ${field}。`);
  }
  if (!gasFamilies.includes(gas.family)) failures.push(`氣體 ${gas.id} 使用未知家族 ${gas.family}。`);
  if (!hazardLevels.includes(gas.hazardLevel)) failures.push(`氣體 ${gas.id} 使用未知危害等級 ${gas.hazardLevel}。`);
  if (!/^https:\/\//.test(gas.sdsSource)) failures.push(`氣體 ${gas.id} 缺少 HTTPS SDS 來源。`);
}
for (const [id, level] of Object.entries({ sih4: "extreme", b2h6: "extreme", ph3: "extreme", cl2: "high", hbr: "high", bcl3: "high", wf6: "high", nf3: "high", f2: "high" })) {
  if (gases.find((gas) => gas.id === id)?.hazardLevel !== level) failures.push(`氣體 ${id} 的危害分級必須是 ${level}。`);
}

if (sdsEvidence.length !== gases.length) failures.push(`SDS 證據應與 32 種氣體一一對應，目前 ${sdsEvidence.length} 筆。`);
const evidenceIds = new Set();
for (const evidence of sdsEvidence) {
  if (evidenceIds.has(evidence.gasId)) failures.push(`SDS 證據 gasId 重複：${evidence.gasId}。`);
  evidenceIds.add(evidence.gasId);
  const gas = gases.find((item) => item.id === evidence.gasId);
  if (!gas || gas.cas !== evidence.cas) failures.push(`SDS 證據 ${evidence.gasId} 的 CAS 與氣體資料不一致。`);
  if (!/^https:\/\//.test(evidence.sourceUrl)) failures.push(`SDS 證據 ${evidence.gasId} 缺少 HTTPS 來源。`);
  if (!["directory-only", "supplier-reviewed"].includes(evidence.reviewStatus)) failures.push(`SDS 證據 ${evidence.gasId} 使用未知 reviewStatus。`);
  if (evidence.reviewStatus === "supplier-reviewed") {
    for (const field of ["supplier", "reviewedAt", "documentId", "revisionDate", "version", "note"]) {
      if (!evidence[field]) failures.push(`SDS 證據 ${evidence.gasId} 已標示核對但缺少 ${field}。`);
    }
    if (evidence.reviewScope.length < 4) failures.push(`SDS 證據 ${evidence.gasId} 的核對範圍不完整。`);
  }
  if (evidence.localApprovalStatus === "approved" && evidence.reviewStatus !== "supplier-reviewed") failures.push(`SDS 證據 ${evidence.gasId} 不可在供應商文件未核對前標示廠區核准。`);
}

if (sdsEvidence.filter((evidence) => evidence.reviewStatus === "supplier-reviewed").length !== 32) failures.push("SDS 供應商公開文件核對必須為 32/32。");
if (sdsEvidence.filter((evidence) => evidence.localApprovalStatus === "approved").length !== 0) failures.push("SDS 廠區核准不得被視為完成；必須為 0/32。");
if (!sdsEvidence.every((evidence) => evidence.localApprovalStatus === "pending" && evidence.supplier && evidence.documentId && evidence.revisionDate && evidence.version && evidence.reviewScope?.length >= 4)) failures.push("每筆 SDS 必須完整核對供應商文件，且廠區核准保持 pending。");
if (!sdsEvidence.every((evidence) => /不取代廠區核准.*供應濃度.*在地版本.*供氣系統.*abatement.*EH&S 程序/.test(evidence.note))) failures.push("每筆 SDS 必須揭露供應商文件不取代廠區核准。");
if (!sdsEvidence.filter((evidence) => typeof evidence.revisionDate === "string" && Number(evidence.revisionDate.slice(0, 4)) < 2024).every((evidence) => /確認是否有新版/.test(evidence.note))) failures.push("舊版 SDS 文件必須要求確認供應商新版。");
const requiredSupplierDocuments = {
  c4f6: { supplier: "Airgas USA, LLC", sourceUrl: "https://www.airgas.com/msds/001138.pdf", documentId: "001138", revisionDate: "2022-03-04", version: "0.01" },
  c5f8: { supplier: "Air Liquide Far Eastern Ltd.", sourceUrl: "https://tw.airliquide.com/sites/al_tw/files/2022-06/alfe-0082-c5f8-v09-20220302.pdf", documentId: "ALFE0082", revisionDate: "2022-03-02", version: "09" },
  teos: { supplier: "Sigma-Aldrich Inc.", sourceUrl: "https://www.sigmaaldrich.com/US/en/sds/aldrich/333859", documentId: "ALDRICH-333859", revisionDate: "2026-04-20", version: "6.11" },
  wf6: { supplier: "Air Liquide (China) Holding Co., Ltd.", sourceUrl: "https://cn.airliquide.com/sites/al_cn/files/2022-10/alc-sds-p047_tungsten-hexafluoride-wf6-2.pdf", documentId: "ALC-SDS-P047", revisionDate: "2022-02", version: "2" },
  so2: { supplier: "Air Liquide Far Eastern Ltd.", sourceUrl: "https://tw.airliquide.com/sites/al_tw/files/2022-06/alfe-0054-so2-v08-20190902.pdf", documentId: "ALFE0054", revisionDate: "2019-09-02", version: "08" }
};
for (const [gasId, expected] of Object.entries(requiredSupplierDocuments)) {
  const evidence = sdsEvidence.find((item) => item.gasId === gasId);
  if (!evidence || Object.entries(expected).some(([field, value]) => evidence[field] !== value)) failures.push("指定 SDS 供應商文件資料不正確：" + gasId + "。");
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

if (labs.length !== 33 || !labs.some((lab) => lab.id === "A33" && lab.chapter === "3.7")) {
  failures.push(`互動元件清單應為 A01-A33 共 33 件，且 A33 必須屬於 3.7，目前 ${labs.length} 件。`);
}
for (const id of ["A17", "A18"]) {
  const lab = labs.find((item) => item.id === id);
  if (!lab || lab.href !== `/level/3/3-1-etch-mechanisms/#lab-${id.toLowerCase()}`) failures.push(`${id} 尚未正確接到 3.1 章節。`);
}
if (labs.find((item) => item.id === "A19")?.href !== "/level/3/3-2-deep-silicon-etch/#lab-a19") failures.push("A19 尚未正確接到 3.2 章節。");
for (const id of ["A20", "A21"]) {
  if (labs.find((item) => item.id === id)?.href !== `/level/3/3-3-defect-atlas/#lab-${id.toLowerCase()}`) failures.push(`${id} 尚未正確接到 3.3 章節。`);
}
const levelFourModule = curriculum.levels.find((level) => level.id === 4)?.modules.find((module) => module.id === "4.1");
if (levelFourModule?.href !== chapterFourOne.route || levelFourModule?.labs.join(",") !== "A26,A27") failures.push("L4 curriculum 4.1 與章節資料未對齊。");
for (const id of ["A26", "A27"]) {
  if (labs.find((item) => item.id === id)?.href !== `${chapterFourOne.route}#lab-${id.toLowerCase()}`) failures.push(`${id} 尚未正確接到 4.1 章節。`);
}
for (const id of ["A22", "A23"]) {
  if (labs.find((item) => item.id === id)?.href !== `/level/3/3-4-plasma-deposition/#lab-${id.toLowerCase()}`) failures.push(`${id} 尚未正確接到 3.4 章節。`);
}
if (labs.find((item) => item.id === "A24")?.href !== "/level/3/3-5-pvd-cleaning/#lab-a24") failures.push("A24 尚未正確接到 3.5 章節。");
if (labs.find((item) => item.id === "A25")?.href !== "/level/3/3-6-uniformity-chamber/#lab-a25") failures.push("A25 尚未正確接到 3.6 章節。");

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

if (spectra.length !== 22) failures.push(`P4 OES 譜線資料必須包含 22 線，目前 ${spectra.length} 線。`);
const spectrumIds = new Set();
const molecularSpecies = new Set(["CO", "CN", "C2", "N2", "OH"]);
for (const line of spectra) {
  if (spectrumIds.has(line.id)) failures.push(`OES 譜線 ID 重複：${line.id}。`);
  spectrumIds.add(line.id);
  for (const field of dataSchemas.spectrumLine.required) {
    if (line[field] === undefined || line[field] === null || line[field] === "") failures.push(`OES 譜線 ${line.id} 缺少 ${field}。`);
  }
  if (!(Number.isFinite(line.wavelengthNm) && line.wavelengthNm > 0)) failures.push(`OES 譜線 ${line.id} 的波長必須為正數。`);
  if (!(Number.isFinite(line.relativeIntensity) && line.relativeIntensity > 0)) failures.push(`OES 譜線 ${line.id} 的教學權重必須為正數。`);
  if (line.intensityType !== "pedagogical-weight") failures.push(`OES 譜線 ${line.id} 未明示 relativeIntensity 為教學權重。`);
  if (!line.sourceType || !line.verificationStatus) failures.push(`OES 譜線 ${line.id} 缺少 sourceType 或 verificationStatus。`);
  if (molecularSpecies.has(line.species)) {
    if (line.sourceType !== "pedagogical-molecular-band" || line.verificationStatus !== "pending-source-review") {
      failures.push(`分子帶 ${line.id} 不可偽裝成 NIST ASD 已核實資料。`);
    }
  } else {
    if (line.sourceType !== "official-database-line-record" || line.verificationStatus !== "nist-line-verified") {
      failures.push(`原子譜線 ${line.id} 必須為逐線 NIST 核實資料。`);
    }
    if (!/^https:\/\/physics\.nist\.gov\//.test(line.source)) failures.push(`原子譜線 ${line.id} 的 NIST ASD 來源無效。`);
  }
}
if (spectra.filter((line) => !molecularSpecies.has(line.species)).length !== 13) failures.push("原子譜線必須恰有 13 條。");
const requiredAtomicLines = {
  "f-703.7": [703.7469, "I", "https://physics.nist.gov/PhysRefData/Handbook/Tables/fluorinetable2.htm"],
  "f-685.6": [685.603, "I", "https://physics.nist.gov/PhysRefData/Handbook/Tables/fluorinetable2.htm"],
  "ar-750.4": [750.3869, "I", "https://physics.nist.gov/PhysRefData/Handbook/Tables/argontable2.htm"],
  "ar-811.5": [811.5311, "I", "https://physics.nist.gov/PhysRefData/Handbook/Tables/argontable2.htm"],
  "o-777.4": [777.417, "I", "https://physics.nist.gov/PhysRefData/Handbook/Tables/oxygentable2_a.htm"],
  "o-844.6": [844.625, "I", "https://physics.nist.gov/PhysRefData/Handbook/Tables/oxygentable2_a.htm"],
  "si-251.6": [251.6112, "I", "https://physics.nist.gov/PhysRefData/Handbook/Tables/silicontable2_a.htm"],
  "si-288.2": [288.15771, "I", "https://physics.nist.gov/PhysRefData/Handbook/Tables/silicontable2_a.htm"],
  "h-656.3": [656.28518, "I", "https://physics.nist.gov/PhysRefData/Handbook/Tables/hydrogentable2.htm"],
  "cl-837.6": [837.594, "I", "https://physics.nist.gov/PhysRefData/Handbook/Tables/chlorinetable2.htm"],
  "cl-725.7": [725.662, "I", "https://physics.nist.gov/PhysRefData/Handbook/Tables/chlorinetable2.htm"],
  "br-470.0": [470.492, "II", "https://physics.nist.gov/PhysRefData/Handbook/Tables/brominetable2.htm"],
  "br-478.0": [478.548, "II", "https://physics.nist.gov/PhysRefData/Handbook/Tables/brominetable2.htm"]
};
for (const [id, [wavelengthNm, spectrumStage, source]] of Object.entries(requiredAtomicLines)) {
  const line = spectra.find((item) => item.id === id);
  if (!line || line.wavelengthNm !== wavelengthNm || line.spectrumStage !== spectrumStage || line.source !== source || line.sourceType !== "official-database-line-record" || line.verificationStatus !== "nist-line-verified") failures.push("原子譜線逐線 NIST 記錄不正確：" + id + "。");
}
if (!spectra.filter((line) => line.species === "Br").every((line) => line.spectrumStage === "II" && line.transition === "Br II atomic emission")) failures.push("Br 470/478 nm 必須明示為 Br II 原子發射。");

const formulaRequiredFields = [...dataSchemas.formula.required, "derivation", "typicalValues"];
const unsafeFormulaMarkup = /<\s*\/?\s*(script|style)\b|\bon\w+\s*=|javascript\s*:/i;
for (const [key, formula] of Object.entries(formulas)) {
  for (const field of formulaRequiredFields) {
    const value = formula[field];
    if (field === "symbols") {
      if (!Array.isArray(value) || !value.length) failures.push(`公式 ${key} 缺少 ${field}。`);
    } else if (typeof value !== "string" || !value.trim()) {
      failures.push(`公式 ${key} 缺少 ${field}。`);
    }
  }
  for (const field of ["expression", "derivation", "typicalValues", "source"]) {
    if (unsafeFormulaMarkup.test(formula[field] ?? "")) failures.push(`公式 ${key} 的 ${field} 不可包含 script/style、事件屬性或 JavaScript URL。`);
  }
  if (!/<p\b/i.test(formula.derivation)) failures.push(`公式 ${key} 的 derivation 必須使用語意化段落。`);
  if (!/<p\b/i.test(formula.typicalValues) || !/\d/.test(formula.typicalValues)) failures.push(`公式 ${key} 的 typicalValues 必須提供含數值的具體尺度。`);
}

const residenceExample = residenceTimeSeconds({ pressureMtorr: 20, volumeL: 30, flowSccm: 200 });
if (Math.abs(residenceExample - 0.237) > 0.005) failures.push(`A08 滯留時間範例應約 0.24 s，目前 ${residenceExample.toFixed(3)} s。`);
const fcWindow = fluorocarbonProfile({ gas: "C4F8", oxygenPercent: 8, hydrogenPercent: 0, biasW: 250, substrate: "SiO2" });
const fcHigh = fluorocarbonProfile({ gas: "CF4", oxygenPercent: 20, hydrogenPercent: 0, biasW: 250, substrate: "SiO2" });
const fcLow = fluorocarbonProfile({ gas: "CH3F", oxygenPercent: 0, hydrogenPercent: 20, biasW: 0, substrate: "SiO2" });
const fcSilicon = fluorocarbonProfile({ gas: "C4F8", oxygenPercent: 8, hydrogenPercent: 0, biasW: 250, substrate: "Si" });
if (fcWindow.regime !== "process-window" || fcHigh.regime !== "isotropic" || fcLow.regime !== "etch-stop") failures.push("A10 必須可重現中 F/C 製程窗、高 F/C 等向蝕刻與低 F/C etch stop。");
if (!(fcSilicon.bottomNetRate < fcWindow.bottomNetRate * 0.5)) failures.push("A10 同條件下 Si 淨速率應顯著低於 SiO2。 ");
const eedf2Ev = eedfReactionModel({ electronTemperatureEv: 2, distribution: "maxwellian", gas: "Ar" });
const eedf3Ev = eedfReactionModel({ electronTemperatureEv: 3, distribution: "maxwellian", gas: "Ar" });
const eedfDruyvesteyn = eedfReactionModel({ electronTemperatureEv: 3, distribution: "druyvesteyn", gas: "Ar" });
if (!(eedf3Ev.rates.ionization / eedf2Ev.rates.ionization > 5)) failures.push("A12 T_e 由 2 提高到 3 eV 時，Ar 游離率應上升超過五倍。");
if (!(eedfDruyvesteyn.rates.ionization < eedf3Ev.rates.ionization)) failures.push("A12 同 T_e 下 Druyvesteyn 的 Ar 游離率應低於 Maxwellian。");
const iedfLowFrequency = simulateIedf({ frequencyMhz: 0.4, biasV: 300, pressureMtorr: 1, ion: "Ar" });
const iedfReference = simulateIedf({ frequencyMhz: 13.56, biasV: 300, pressureMtorr: 1, ion: "Ar" });
const iedfHighFrequency = simulateIedf({ frequencyMhz: 60, biasV: 300, pressureMtorr: 1, ion: "Ar" });
const iedfHighPressure = simulateIedf({ frequencyMhz: 13.56, biasV: 300, pressureMtorr: 100, ion: "Ar" });
const iedfHeavyIon = simulateIedf({ frequencyMhz: 13.56, biasV: 300, pressureMtorr: 1, ion: "CF3" });
if (!(iedfLowFrequency.peakSeparationEv > iedfHighFrequency.peakSeparationEv * 10)) failures.push("A13 低頻 IEDF 應顯著寬於 60 MHz IEDF。");
if (!(iedfHighPressure.lowEnergyFraction > iedfReference.lowEnergyFraction * 5)) failures.push("A13 高壓電荷交換應形成明顯低能尾巴。");
const frequencyScaling = iedfHighFrequency.peakSeparationEv / iedfReference.peakSeparationEv;
const expectedFrequencyScaling = 13.56 / 60;
if (Math.abs(frequencyScaling / expectedFrequencyScaling - 1) > 0.3) failures.push("A13 峰間距未呈現近似 1/f 比例。");
const massScaling = iedfHeavyIon.peakSeparationEv / iedfReference.peakSeparationEv;
const expectedMassScaling = Math.sqrt(39.95 / 69.01);
if (Math.abs(massScaling / expectedMassScaling - 1) > 0.3) failures.push("A13 峰間距未呈現近似 1/sqrt(M) 比例。");
const eModeAt550 = sourceCouplingModel({ source: "ICP", powerW: 550, previousMode: "E", direction: "up" });
const hModeAt550 = sourceCouplingModel({ source: "ICP", powerW: 550, previousMode: "H", direction: "down" });
if (eModeAt550.mode !== "E" || hModeAt550.mode !== "H" || !(hModeAt550.densityCm3 > eModeAt550.densityCm3 * 10)) failures.push("A14 550 W 必須依掃描方向呈現 E/H 遲滯與密度跳變。");
const matchNominal = findAutoMatch({ pressureMtorr: 20, powerW: 800, gas: "Ar" });
const matchHighPressure = findAutoMatch({ pressureMtorr: 80, powerW: 800, gas: "Ar" });
if (!(matchNominal.reflectedFraction < 0.01) || !(matchHighPressure.reflectedFraction < 0.01)) failures.push("A15 自動匹配後反射功率必須低於 1%。");
if (matchNominal.tunePf === matchHighPressure.tunePf && matchNominal.loadPf === matchHighPressure.loadPf) failures.push("A15 壓力改變後必須需要不同匹配電容位置。");
const virtualLowSource = virtualToolModel({ sourcePowerW: 200 });
const virtualHighSource = virtualToolModel({ sourcePowerW: 2000 });
const virtualNoBias = virtualToolModel({ biasPowerW: 0 });
const virtualHighBias = virtualToolModel({ biasPowerW: 500 });
const virtualChallenge = virtualToolModel({ pressureMtorr: 5, sourcePowerW: 600, biasPowerW: 60, gasMix: { CF4: 45, O2: 10, Ar: 45 } });
const teSourceChange = Math.abs(virtualHighSource.electronTemperatureEv / virtualLowSource.electronTemperatureEv - 1);
if (!(teSourceChange < 0.1) || !(virtualHighSource.electronDensityCm3 / virtualLowSource.electronDensityCm3 > 9)) failures.push("A16 Source 200→2000 W 時，T_e 變化應低於 10%，n_e 應接近十倍。");
if (!(virtualNoBias.etchRateNmMin < 1) || !(virtualHighBias.etchRateNmMin > virtualNoBias.etchRateNmMin) || !(virtualHighBias.selectivity < virtualNoBias.selectivity)) failures.push("A16 Bias 必須呈現速率上升、選擇比下降與零 bias etch stop。");
if (!virtualChallenge.challenge.passed) failures.push("A16 挑戰目標在規定製程窗內必須確實可達成。");
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

if (level2Questions.length !== 80) failures.push(`L2 結業題庫應為 80 題，目前 ${level2Questions.length} 題。`);
if (level2ExamSpec.durationMinutes !== 50) failures.push(`L2 測驗時限應為 50 分鐘，目前 ${level2ExamSpec.durationMinutes} 分鐘。`);
const l2QuizIds = new Set();
for (const question of level2Questions) {
  if (l2QuizIds.has(question.id)) failures.push(`L2 題庫 ID 重複：${question.id}。`);
  l2QuizIds.add(question.id);
  for (const field of ["id", "chapter", "type", "difficulty", "tags", "question", "explanation", "reference"]) {
    if (question[field] === undefined || question[field] === null || question[field] === "") failures.push(`L2 題目 ${question.id} 缺少 ${field}。`);
  }
  if (!Object.hasOwn(level2ExamSpec.draw, question.type)) failures.push(`題目 ${question.id} 使用不支援的 L2 題型 ${question.type}。`);
  if (["single", "multi", "scenario"].includes(question.type)) {
    if (!Array.isArray(question.options) || question.options.length < 2) failures.push(`L2 題目 ${question.id} 缺少有效選項。`);
    for (const option of question.options ?? []) {
      if (!option.id || !option.text || typeof option.correct !== "boolean" || !option.why) failures.push(`L2 題目 ${question.id} 的選項 ${option.id ?? "?"} 未包含完整 why 解析。`);
    }
  }
  if (question.type === "numeric" && (typeof question.answer !== "number" || typeof question.tolerance !== "number" || typeof question.unit !== "string")) failures.push(`L2 計算題 ${question.id} 缺少答案、單位欄位或容差。`);
}
for (const [type, drawCount] of Object.entries(level2ExamSpec.draw)) {
  const available = level2Questions.filter((question) => question.type === type).length;
  if (available !== 20 || available < drawCount) failures.push(`L2 ${type} 題應有 20 題且足供抽題，目前 ${available} 題。`);
}
for (const chapter of ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6"]) {
  if (!level2Questions.some((question) => question.chapter === chapter)) failures.push(`L2 題庫未涵蓋章節 ${chapter}。`);
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

if (l2Diagrams.length !== 40) failures.push(`P2 教學 SVG 目錄應為 40 張，目前 ${l2Diagrams.length} 張。`);
const l2DiagramIds = new Set();
for (const diagram of l2Diagrams) {
  if (l2DiagramIds.has(diagram.id)) failures.push(`L2 圖解 ID 重複：${diagram.id}。`);
  l2DiagramIds.add(diagram.id);
  for (const field of ["id", "chapter", "section", "title", "caption", "type", "items", "note"]) {
    if (!diagram[field] || (field === "items" && !Array.isArray(diagram.items))) failures.push(`L2 圖解 ${diagram.id} 缺少 ${field}。`);
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
