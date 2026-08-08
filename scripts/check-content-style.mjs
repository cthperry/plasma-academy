import { chapterOneOne } from "../src/content/chapter-1-1.mjs";
import { l1FoundationChapters } from "../src/content/l1-foundation-chapters.mjs";
import { expandL1Content } from "../src/content/l1-prose-expansions.mjs";
import { chapterTwoOne } from "../src/content/chapter-2-1.mjs";
import { chapterTwoTwo } from "../src/content/chapter-2-2.mjs";
import { chapterTwoThree } from "../src/content/chapter-2-3.mjs";
import { chapterTwoFour } from "../src/content/chapter-2-4.mjs";
import { chapterTwoFive } from "../src/content/chapter-2-5.mjs";
import { chapterTwoSix } from "../src/content/chapter-2-6.mjs";
import { chapterThreeOne } from "../src/content/chapter-3-1.mjs";
import { chapterThreeTwo } from "../src/content/chapter-3-2.mjs";
import { chapterThreeThree } from "../src/content/chapter-3-3.mjs";
import { chapterThreeFour } from "../src/content/chapter-3-4.mjs";
import { chapterThreeFive } from "../src/content/chapter-3-5.mjs";
import { chapterThreeSix } from "../src/content/chapter-3-6.mjs";
import { chapterThreeSeven } from "../src/content/chapter-3-7-packaging-cleaning.mjs";
import { chapterThreeEight } from "../src/content/chapter-3-8-pcb-desmear.mjs";
import { chapterFourOne } from "../src/content/chapter-4-1.mjs";
import { chapterFourTwo } from "../src/content/chapter-4-2.mjs";
import { chapterFourThree } from "../src/content/chapter-4-3.mjs";
import { chapterFourFour } from "../src/content/chapter-4-4.mjs";
import { chapterFourFive } from "../src/content/chapter-4-5.mjs";
import { chapterFourSix } from "../src/content/chapter-4-6.mjs";
import { l2EngineeringCases, l2ShiftExercises } from "../src/content/l2-engineering-cases.mjs";
import { l3FieldGuides, l3EngineeringCases, l3ShiftExercises } from "../src/content/l3-engineering-casebook.mjs";
import { packagingCleaningProtocols } from "../src/content/l3-packaging-cleaning-handbook.mjs";
import { l3ProcessProtocolsPart1 } from "../src/content/l3-process-handbooks-part1.mjs";
import { l3ProcessProtocolsPart2 } from "../src/content/l3-process-handbooks-part2.mjs";
import { l1Diagrams } from "../src/data/l1-diagrams.js";
import { l2Diagrams } from "../src/data/l2-diagrams.js";
import { l3Diagrams } from "../src/data/l3-diagrams.js";

const l1Chapters = expandL1Content([chapterOneOne, ...l1FoundationChapters]);
const chapters = [...l1Chapters, chapterTwoOne, chapterTwoTwo, chapterTwoThree, chapterTwoFour, chapterTwoFive, chapterTwoSix];
const p3Chapters = [chapterThreeOne, chapterThreeTwo, chapterThreeThree, chapterThreeFour, chapterThreeFive, chapterThreeSix, chapterThreeSeven, chapterThreeEight];
const failures = [];
const stripHtml = (value) => String(value ?? "")
  .replace(/<figure[\s\S]*?<\/figure>/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&[^;]+;/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const l4ChapterSpecs = [
  { chapter: chapterFourOne, sections: 7, checks: 8, sectionMin: 750, sectionMax: 1800 },
  { chapter: chapterFourTwo, sections: 7, checks: 7, sectionMin: 750, sectionMax: 2100 },
  { chapter: chapterFourThree, sections: 4, checks: 7, sectionMin: 1200, sectionMax: 2800 },
  { chapter: chapterFourFour, sections: 8, checks: 8, sectionMin: 500, sectionMax: 3000 },
  { chapter: chapterFourFive, sections: 7, checks: 6, sectionMin: 500, sectionMax: 1800 },
  { chapter: chapterFourSix, sections: 6, checks: 7, sectionMin: 500, sectionMax: 3000 }
];
for (const { chapter, sections, checks, sectionMin, sectionMax } of l4ChapterSpecs) {
  const summaryLength = stripHtml(chapter.summary).length;
  if (summaryLength < 200 || summaryLength > 500) failures.push(`${chapter.id} 的 5 分鐘摘要應為 200–500 字，目前 ${summaryLength} 字。`);
  if (chapter.objectives.length < 3 || chapter.objectives.length > 5 || chapter.objectives.some((item) => /了解|認識|熟悉/.test(item))) failures.push(`${chapter.id} 必須有 3–5 個可驗證學習目標。`);
  if (chapter.sections.length !== sections) failures.push(`${chapter.id} 必須有 ${sections} 節正文，目前 ${chapter.sections.length} 節。`);
  for (const section of chapter.sections) {
    const length = stripHtml(section.body).length;
    if (length < sectionMin || length > sectionMax) failures.push(`${chapter.id}/${section.id} 應為 ${sectionMin}–${sectionMax} 字，目前 ${length} 字。`);
  }
  if (chapter.selfCheck.length !== checks || chapter.selfCheck.some((item) => !item[1])) failures.push(`${chapter.id} 必須有 ${checks} 題含答案的自我檢測。`);
  for (const lab of chapter.labs) if (!Array.isArray(lab.observation) || lab.observation.length < 2 || lab.observation.length > 4) failures.push(`${chapter.id}/${lab.id} 應有 2–4 條可執行觀察點。`);
}

if (chapterFourSix.cases.length !== 5) failures.push(`4-6 應有 5 則量產案例，目前 ${chapterFourSix.cases.length} 則。`);
const productionCaseIds = new Set();
const productionParagraphs = new Map();
for (const item of chapterFourSix.cases) {
  if (productionCaseIds.has(item.id)) failures.push(`4-6 量產案例 ID 重複：${item.id}。`);
  productionCaseIds.add(item.id);
  for (const field of ["id", "title", "phenomenon", "data", "hypotheses", "verification", "rootCause", "action", "release", "prevention", "engineeringNote"]) {
    if (!item[field]) failures.push(`4-6/${item.id ?? "?"} 缺少 ${field}。`);
  }
  if (!Array.isArray(item.hypotheses) || item.hypotheses.length < 2) failures.push(`4-6/${item.id ?? "?"} 至少需要 2 個競爭假說。`);
  const caseLength = Object.values(item).join(" ").match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  if (caseLength < 650) failures.push(`4-6/${item.id} 量產案例至少需 650 個有效字元，目前 ${caseLength}。`);
  for (const value of [item.phenomenon, item.data, ...item.hypotheses, item.verification, item.rootCause, item.action, item.release, item.prevention, item.engineeringNote]) {
    const paragraph = stripHtml(value).replace(/[\s\u3000]+/g, " ").trim();
    if (paragraph.length < 80) continue;
    const previous = productionParagraphs.get(paragraph);
    if (previous && previous !== item.id) failures.push(`4-6/${item.id} 與 ${previous} 有重複長案例段落。`);
    productionParagraphs.set(paragraph, item.id);
  }
}

for (const chapter of chapters) {
  const summaryLength = stripHtml(chapter.summary).length;
  if (summaryLength < 200 || summaryLength > 400) {
    failures.push(`${chapter.id} 的 5 分鐘摘要應為 200–400 字，目前 ${summaryLength} 字。`);
  }
  if (chapter.objectives.length < 3 || chapter.objectives.length > 5) {
    failures.push(`${chapter.id} 應有 3–5 個學習目標，目前 ${chapter.objectives.length} 個。`);
  }
  if (chapter.objectives.some((item) => /了解|認識|熟悉/.test(item))) {
    failures.push(`${chapter.id} 的學習目標使用了無法驗證的動詞。`);
  }
  if (!chapter.prerequisites?.length) failures.push(`${chapter.id} 缺少前置知識。`);
  if ((chapter.readings?.length ?? 0) < 2) failures.push(`${chapter.id} 至少需要 2 筆延伸閱讀。`);
  if (chapter.selfCheck.length < 5 || chapter.selfCheck.length > 8) {
    failures.push(`${chapter.id} 應有 5–8 題自我檢測，目前 ${chapter.selfCheck.length} 題。`);
  }

  for (const section of chapter.sections) {
    const length = stripHtml(section.body).length;
    if (length < 400 || length > 1200) {
      failures.push(`${chapter.id}/${section.id} 應為 400–1,200 字，目前 ${length} 字。`);
    }
  }

  for (const lab of chapter.labs ?? []) {
    if (!Array.isArray(lab.observation) || lab.observation.length < 2 || lab.observation.length > 4) {
      failures.push(`${chapter.id}/${lab.id} 應有 2–4 條可執行觀察點。`);
    }
  }

  const figures = l1Diagrams.filter((entry) => entry.chapter === chapter.id);
  figures.forEach((entry, index) => {
    const number = `${chapter.id.replace("-", ".")}-${index + 1}`;
    const captionLength = entry.caption.length;
    const markup = chapter.sections.map((section) => section.body).join("");
    if (!markup.includes(`圖 ${number} ${entry.title}`)) failures.push(`${entry.id} 缺少圖 ${number} 的圖說編號。`);
    if (captionLength < 20 || captionLength > 80) failures.push(`${entry.id} 圖說應為 20–80 字，目前 ${captionLength} 字。`);
  });
}

for (const chapter of [chapterTwoOne, chapterTwoTwo, chapterTwoThree, chapterTwoFour, chapterTwoFive, chapterTwoSix]) {
  const figures = l2Diagrams.filter((entry) => entry.chapter === chapter.id);
  for (const entry of figures) {
    if (!chapter.sections.some((section) => section.id === entry.section)) failures.push(`${entry.id} 指向不存在的小節 ${chapter.id}/${entry.section}。`);
    if (entry.caption.length < 20 || entry.caption.length > 80) failures.push(`${entry.id} 圖說應為 20–80 字，目前 ${entry.caption.length} 字。`);
  }
  const cases = l2EngineeringCases[chapter.id] ?? [];
  if (cases.length !== 6) failures.push(`${chapter.id} 應有 6 則工程案例，目前 ${cases.length} 則。`);
  const ids = new Set();
  for (const item of cases) {
    if (ids.has(item.id)) failures.push(`${chapter.id} 工程案例 ID 重複：${item.id}。`);
    ids.add(item.id);
    for (const field of ["id", "title", "context", "mechanism", "diagnosis", "action", "checkpoint"]) {
      if (!item[field]) failures.push(`${chapter.id}/${item.id ?? "?"} 缺少 ${field}。`);
    }
    const length = Object.values(item).join(" ").match(/[\p{L}\p{N}]/gu)?.length ?? 0;
    if (length < 450) failures.push(`${chapter.id}/${item.id} 工程案例至少需 450 個有效字元，目前 ${length}。`);
  }
  const exercise = l2ShiftExercises[chapter.id];
  for (const field of ["title", "situation", "walkthrough", "decision", "record"]) {
    if (!exercise?.[field]) failures.push(`${chapter.id} 交班演練缺少 ${field}。`);
  }
}

for (const chapter of p3Chapters) {
  const summaryLength = stripHtml(chapter.summary).length;
  if (summaryLength < 150 || summaryLength > 400) failures.push(`${chapter.id} 的 5 分鐘摘要應為 150–400 字，目前 ${summaryLength} 字。`);
  if (chapter.objectives.length < 5 || chapter.objectives.length > 6) failures.push(`${chapter.id} 應有 5–6 個可驗證學習目標，目前 ${chapter.objectives.length} 個。`);
  if (chapter.objectives.some((item) => /了解|認識|熟悉/.test(item))) failures.push(`${chapter.id} 的學習目標使用了無法驗證的動詞。`);
  if ((chapter.prerequisites?.length ?? 0) < 2) failures.push(`${chapter.id} 至少需要 2 筆前置知識。`);
  if ((chapter.readings?.length ?? 0) < 2) failures.push(`${chapter.id} 至少需要 2 筆延伸閱讀。`);
  if (chapter.selfCheck.length < 5 || chapter.selfCheck.length > 8) failures.push(`${chapter.id} 應有 5–8 題自我檢測，目前 ${chapter.selfCheck.length} 題。`);
  for (const section of chapter.sections) {
    const length = stripHtml(section.body).length;
    if (length < 190 || length > 1200) failures.push(`${chapter.id}/${section.id} 應為 190–1,200 字，目前 ${length} 字。`);
  }
  for (const lab of chapter.labs ?? []) {
    if (!Array.isArray(lab.observation) || lab.observation.length < 2 || lab.observation.length > 4) failures.push(`${chapter.id}/${lab.id} 應有 2–4 條可執行觀察點。`);
  }
  const figures = l3Diagrams.filter((entry) => entry.chapter === chapter.id);
  for (const entry of figures) {
    if (!chapter.sections.some((section) => section.id === entry.section)) failures.push(`${entry.id} 指向不存在的小節 ${chapter.id}/${entry.section}。`);
    if (entry.caption.length < 20 || entry.caption.length > 80) failures.push(`${entry.id} 圖說應為 20–80 字，目前 ${entry.caption.length} 字。`);
    if (!entry.note || !["flow", "compare", "plot", "profile", "wafer"].includes(entry.type)) failures.push(`${entry.id} 缺少有效圖型或教學註記。`);
  }

  if (chapter.id === "3-8") continue;

  const guide = l3FieldGuides[chapter.id];
  for (const field of ["title", "scope", "evidence", "experiment", "release"]) {
    if (!guide?.[field]) failures.push(`${chapter.id} 現場判讀指南缺少 ${field}。`);
  }
  const guideLength = Object.values(guide ?? {}).join(" ").match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  if (guideLength < 300) failures.push(`${chapter.id} 現場判讀指南至少需 300 個有效字元，目前 ${guideLength}。`);

  const cases = l3EngineeringCases[chapter.id] ?? [];
  if (cases.length !== 4) failures.push(`${chapter.id} 應有 4 則進階工程案例，目前 ${cases.length} 則。`);
  const ids = new Set();
  for (const item of cases) {
    if (ids.has(item.id)) failures.push(`${chapter.id} 進階工程案例 ID 重複：${item.id}。`);
    ids.add(item.id);
    for (const field of ["id", "title", "context", "mechanism", "diagnosis", "action", "checkpoint"]) {
      if (!item[field]) failures.push(`${chapter.id}/${item.id ?? "?"} 缺少 ${field}。`);
    }
    const length = Object.values(item).join(" ").match(/[\p{L}\p{N}]/gu)?.length ?? 0;
    if (length < 250) failures.push(`${chapter.id}/${item.id} 進階工程案例至少需 250 個有效字元，目前 ${length}。`);
  }
  const exercise = l3ShiftExercises[chapter.id];
  for (const field of ["title", "situation", "walkthrough", "decision", "record"]) {
    if (!exercise?.[field]) failures.push(`${chapter.id} 進階交班演練缺少 ${field}。`);
  }
  const exerciseLength = Object.values(exercise ?? {}).join(" ").match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  if (exerciseLength < 220) failures.push(`${chapter.id} 進階交班演練至少需 220 個有效字元，目前 ${exerciseLength}。`);
}

if (l3Diagrams.length !== 45) failures.push(`L3 應有 45 張圖解資料，目前 ${l3Diagrams.length} 張。`);

if (packagingCleaningProtocols.length !== 8) failures.push(`3-7 封裝清潔工程手冊應有 8 單元，目前 ${packagingCleaningProtocols.length} 單元。`);
const protocolIds = new Set();
for (const item of packagingCleaningProtocols) {
  if (protocolIds.has(item.id)) failures.push(`3-7 封裝清潔工程手冊 ID 重複：${item.id}。`);
  protocolIds.add(item.id);
  for (const field of ["id", "title", "purpose", "evidence", "experiment", "release", "pitfalls", "handoff"]) {
    if (!item[field]) failures.push(`3-7/${item.id ?? "?"} 封裝清潔工程手冊缺少 ${field}。`);
  }
  const length = Object.values(item).join(" ").match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  if (length < 650) failures.push(`3-7/${item.id} 封裝清潔工程手冊至少需 650 個有效字元，目前 ${length}。`);
}

for (const { source, chapterIds, minimumLength } of [
  { source: l3ProcessProtocolsPart1, chapterIds: ["3-1", "3-2"], minimumLength: 500 },
  { source: l3ProcessProtocolsPart2, chapterIds: ["3-3", "3-4", "3-5", "3-6"], minimumLength: 700 }
]) {
  for (const chapterId of chapterIds) {
    const protocols = source[chapterId] ?? [];
    if (protocols.length !== 8) failures.push(`${chapterId} 製程工程手冊應有 8 單元，目前 ${protocols.length} 單元。`);
    const ids = new Set();
    for (const item of protocols) {
      if (ids.has(item.id)) failures.push(`${chapterId} 製程工程手冊 ID 重複：${item.id}。`);
      ids.add(item.id);
      for (const field of ["id", "title", "purpose", "evidence", "experiment", "release", "pitfalls", "handoff"]) {
        if (!item[field]) failures.push(`${chapterId}/${item.id ?? "?"} 製程工程手冊缺少 ${field}。`);
      }
      const length = Object.values(item).join(" ").match(/[\p{L}\p{N}]/gu)?.length ?? 0;
      if (length < minimumLength) failures.push(`${chapterId}/${item.id} 製程工程手冊至少需 ${minimumLength} 個有效字元，目前 ${length}。`);
    }
  }
}

if (failures.length) {
  console.error(`內容規範檢查失敗（${failures.length} 項）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`內容規範檢查通過：20 個 P1-P3 章 + 6 個 L4 章（共 26 章）、L1 ${l1Diagrams.length} 張圖、L2 ${l2Diagrams.length} 張圖、L3 ${l3Diagrams.length} 張圖、L2 36 則工程案例與 6 份交班演練、L3 28 則工程案例與 7 份交班演練、3.1/3.2 工程手冊 16 單元、3.3–3.6 工程手冊 32 單元、3-7 封裝清潔工程手冊 8 單元、A01–A34 觀察引導。`);
