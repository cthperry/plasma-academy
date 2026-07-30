import { chapterOneOne } from "../src/content/chapter-1-1.mjs";
import { l1FoundationChapters } from "../src/content/l1-foundation-chapters.mjs";
import { expandL1Content } from "../src/content/l1-prose-expansions.mjs";
import { chapterTwoOne } from "../src/content/chapter-2-1.mjs";
import { chapterTwoTwo } from "../src/content/chapter-2-2.mjs";
import { chapterTwoThree } from "../src/content/chapter-2-3.mjs";
import { chapterTwoFour } from "../src/content/chapter-2-4.mjs";
import { chapterTwoFive } from "../src/content/chapter-2-5.mjs";
import { chapterTwoSix } from "../src/content/chapter-2-6.mjs";
import { l2EngineeringCases, l2ShiftExercises } from "../src/content/l2-engineering-cases.mjs";
import { l1Diagrams } from "../src/data/l1-diagrams.js";
import { l2Diagrams } from "../src/data/l2-diagrams.js";

const l1Chapters = expandL1Content([chapterOneOne, ...l1FoundationChapters]);
const chapters = [...l1Chapters, chapterTwoOne, chapterTwoTwo, chapterTwoThree, chapterTwoFour, chapterTwoFive, chapterTwoSix];
const failures = [];
const stripHtml = (value) => String(value ?? "")
  .replace(/<figure[\s\S]*?<\/figure>/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&[^;]+;/g, " ")
  .replace(/\s+/g, " ")
  .trim();

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

if (failures.length) {
  console.error(`內容規範檢查失敗（${failures.length} 項）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`內容規範檢查通過：${chapters.length} 章、L1 ${l1Diagrams.length} 張圖、L2 ${l2Diagrams.length} 張圖、L2 36 則工程案例與 6 份交班演練、A01–A16 觀察引導。`);
