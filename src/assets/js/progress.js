import { clearProgress, getProgress, normalizeProgress, saveProgress } from "./progress-store.js";

const chapterObjectiveCounts = {
  "1-1": 4, "1-2": 4, "1-3": 3, "1-4": 3, "1-5": 4, "1-6": 3,
  "2-1": 3, "2-2": 4, "2-3": 4, "2-4": 4, "2-5": 4, "2-6": 5,
  "3-1": 6, "3-2": 5, "3-3": 5, "3-4": 5, "3-5": 5, "3-6": 5, "3-7": 5, "3-8": 5,
  "4-1": 5, "4-2": 5, "4-3": 5, "4-4": 4, "4-5": 4, "4-6": 4
};
const levelNames = ["L1 電漿入門", "L2 氣體與電漿源", "L3 製程應用與診斷", "L4 電漿專家"];

export function initProgress() {
  markVisitedChapter();
  initObjectiveChecks();
  initHomeDashboard();
  initRoleSelection();
  initQuiz();
  initProgressPage();
}

function initHomeDashboard() {
  const dashboard = document.querySelector("[data-home-dashboard]");
  if (!dashboard) return;
  const render = () => {
    const progress = getProgress();
    const chapterLinks = [...dashboard.querySelectorAll("[data-home-chapter]")];
    const completedIds = new Set(Object.keys(chapterObjectiveCounts).filter((id) => isChapterComplete(progress, id)));
    const visitedEntries = Object.entries(progress.chapters)
      .filter(([, chapter]) => chapter?.visited)
      .sort((left, right) => Date.parse(right[1].lastVisit ?? 0) - Date.parse(left[1].lastVisit ?? 0));
    const recentIncomplete = visitedEntries.find(([id]) => !completedIds.has(id));
    const nextLink = chapterLinks.find((link) => link.dataset.homeChapter === recentIncomplete?.[0])
      ?? chapterLinks.find((link) => !completedIds.has(link.dataset.homeChapter));
    const nextTitle = dashboard.querySelector("[data-home-next-title]");
    const nextButton = dashboard.querySelector("[data-home-next-link]");

    dashboard.querySelector("[data-home-completed]").textContent = `${completedIds.size} / ${Object.keys(chapterObjectiveCounts).length}`;
    dashboard.querySelector("[data-home-visited]").textContent = String(visitedEntries.length);
    nextTitle.textContent = nextLink?.textContent.trim() ?? "全部課程已完成";
    nextButton.href = nextLink?.href ?? "/progress/";
    nextButton.textContent = nextLink ? "開啟章節" : "查看學習成果";

    dashboard.querySelectorAll("[data-level-card]").forEach((card) => {
      const ids = card.dataset.levelChapters.split(",").filter(Boolean);
      const completed = ids.filter((id) => completedIds.has(id)).length;
      const level = card.querySelector("[data-level-progress]");
      const bar = card.querySelector("progress");
      level.textContent = `${completed} / ${ids.length} 章`;
      bar.value = completed;
      bar.setAttribute("aria-label", `${card.querySelector(".level-label").textContent} 已完成 ${completed}/${ids.length} 章`);
    });
  };
  render();
  document.addEventListener("pa:progresschange", render);
}

function isChapterComplete(progress, id) {
  const expected = chapterObjectiveCounts[id];
  const objectives = progress.chapters[id]?.objectives ?? [];
  return Number.isInteger(expected) && objectives.length >= expected && objectives.slice(0, expected).every(Boolean);
}

function markVisitedChapter() {
  const chapter = document.querySelector("[data-chapter-id]");
  if (!chapter) return;
  const id = chapter.dataset.chapterId;
  const progress = getProgress();
  progress.chapters[id] ??= { visited: false, objectives: [], quizScore: 0, lastVisit: null };
  progress.chapters[id].visited = true;
  progress.chapters[id].lastVisit = new Date().toISOString();
  saveProgress(progress);
}

function initObjectiveChecks() {
  document.querySelectorAll("[data-objective]").forEach((input) => {
    const id = input.dataset.chapterId;
    const progress = getProgress();
    input.checked = Boolean(progress.chapters[id]?.objectives?.[Number(input.dataset.objective)]);
    input.addEventListener("change", () => {
      const state = getProgress();
      state.chapters[id] ??= { visited: true, objectives: [], quizScore: 0, lastVisit: new Date().toISOString() };
      state.chapters[id].objectives[Number(input.dataset.objective)] = input.checked;
      const chapterInputs = [...document.querySelectorAll(`[data-objective][data-chapter-id="${id}"]`)];
      state.chapters[id].completedAt = chapterInputs.length && chapterInputs.every((item) => item.checked) ? new Date().toISOString() : null;
      saveProgress(state);
    });
  });
}

function initRoleSelection() {
  document.querySelectorAll("[data-role]").forEach((button) => {
    button.addEventListener("click", () => {
      const progress = getProgress();
      progress.role = button.dataset.role;
      saveProgress(progress);
      button.setAttribute("aria-pressed", "true");
    });
  });
}

function initQuiz() {
  const result = document.querySelector(".quiz-result");
  document.querySelectorAll(".quiz-choice").forEach((button) => {
    button.addEventListener("click", () => {
      const correct = button.dataset.correct === "true";
      result.textContent = correct ? "正確。這句話抓到本章重點。" : "再想一次：不是所有粒子都必須游離。";
      const progress = getProgress();
      progress.chapters["1-1"] ??= { visited: true, objectives: [], quizScore: 0, lastVisit: new Date().toISOString() };
      progress.chapters["1-1"].quizScore = correct ? 1 : 0;
      saveProgress(progress);
    });
  });
}

function initProgressPage() {
  const page = document.querySelector("[data-progress-page]");
  if (!page) return;
  const render = () => {
    const progress = getProgress();
    page.querySelector("[data-progress-role]").textContent = progress.role ?? "尚未選擇";
    page.querySelector("[data-progress-visited]").textContent = Object.values(progress.chapters).filter((item) => item.visited).length;
    page.querySelector("[data-progress-objectives]").textContent = Object.values(progress.chapters).flatMap((item) => item.objectives ?? []).filter(Boolean).length;
    page.querySelector("[data-progress-labs]").textContent = Object.values(progress.labUsage).reduce((sum, value) => sum + value, 0);
    for (const level of ["L1", "L2", "L3", "L4"]) {
      const exam = progress.quizzes?.[level];
      const suffix = level.toLowerCase();
      const badge = page.querySelector(`[data-progress-${suffix}-badge]`);
      const examStatus = page.querySelector(`[data-progress-${suffix}-status]`);
      badge.classList.toggle("earned", Boolean(exam?.passed));
      examStatus.textContent = exam?.passed
        ? `已通過 · 最佳成績 ${exam.bestScore}%`
        : exam?.attempts?.length
          ? `已作答 ${exam.attempts.length} 次 · 最佳成績 ${exam.bestScore}%`
          : `尚未通過 ${level} 結業測驗`;
    }
    const completedChapters = Object.entries(chapterObjectiveCounts).filter(([id, expected]) => {
      const objectives = progress.chapters[id]?.objectives ?? [];
      return objectives.length >= expected && objectives.slice(0, expected).every(Boolean);
    }).length;
    const passedLevels = levelNames.filter((_, index) => progress.quizzes?.[`L${index + 1}`]?.passed);
    const eligible = completedChapters === Object.keys(chapterObjectiveCounts).length && passedLevels.length === levelNames.length;
    const allBadge = page.querySelector("[data-progress-all-badge]");
    const allStatus = page.querySelector("[data-progress-all-status]");
    const certificateStatus = page.querySelector("[data-certificate-status]");
    const generateButton = page.querySelector("[data-certificate-generate]");
    allBadge.classList.toggle("earned", eligible);
    allStatus.textContent = eligible
      ? "四階測驗與 26 章全部學習目標均已完成"
      : `已通過 ${passedLevels.length}/4 階測驗 · 已完成 ${completedChapters}/26 章`;
    certificateStatus.textContent = eligible
      ? "資格已確認。輸入姓名後可在這台裝置產生證書。"
      : `尚未符合資格：需通過 4/4 階測驗並完成 26/26 章，目前為 ${passedLevels.length}/4 與 ${completedChapters}/26。`;
    generateButton.disabled = !eligible;
    const certificate = progress.certificate;
    if (eligible && certificate?.learnerName && (certificate.completedAt || certificate.issuedAt)) showCertificate(page, certificate);
    else page.querySelector("[data-training-certificate]").hidden = true;
    page.querySelector("[data-progress-json]").value = JSON.stringify(progress, null, 2);
  };
  render();
  document.addEventListener("pa:progresschange", render);
  page.querySelector("[data-export-progress]").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(getProgress(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement("a"), { href: url, download: "plasma-academy-progress.json" });
    link.click();
    URL.revokeObjectURL(url);
  });
  page.querySelector("[data-import-progress]").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const status = page.querySelector("[data-import-status]");
    try {
      const imported = JSON.parse(await file.text());
      if (!imported || typeof imported !== "object" || Array.isArray(imported)) throw new Error("invalid progress root");
      saveProgress(normalizeProgress(imported));
      status.textContent = "進度匯入完成。";
    } catch (_) {
      status.textContent = "匯入失敗：請選擇 Plasma Academy 匯出的有效 JSON 檔案。";
    } finally {
      event.target.value = "";
    }
  });
  page.querySelector("[data-reset-progress]").addEventListener("click", clearProgress);
  page.querySelector("[data-certificate-generate]").addEventListener("click", () => {
    const nameInput = page.querySelector("[data-certificate-name]");
    const learnerName = nameInput.value.trim();
    if (!learnerName) {
      page.querySelector("[data-certificate-status]").textContent = "請先輸入學員姓名。";
      nameInput.focus();
      return;
    }
    const progress = getProgress();
    if (!isCertificateEligible(progress)) return;
    progress.certificate = {
      learnerName,
      completedAt: latestTrainingCompletion(progress),
      generatedAt: new Date().toISOString()
    };
    saveProgress(progress);
    page.querySelector("[data-training-certificate]").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  page.querySelector("[data-certificate-print]").addEventListener("click", () => {
    document.body.classList.add("pa-print-certificate");
    const cleanup = () => document.body.classList.remove("pa-print-certificate");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    setTimeout(cleanup, 1000);
  });
}

function isCertificateEligible(progress) {
  const chaptersComplete = Object.entries(chapterObjectiveCounts).every(([id, expected]) => {
    const objectives = progress.chapters[id]?.objectives ?? [];
    return objectives.length >= expected && objectives.slice(0, expected).every(Boolean);
  });
  return chaptersComplete && levelNames.every((_, index) => progress.quizzes?.[`L${index + 1}`]?.passed);
}

function showCertificate(page, certificate) {
  const article = page.querySelector("[data-training-certificate]");
  const completedAt = new Date(certificate.completedAt ?? certificate.issuedAt);
  if (Number.isNaN(completedAt.getTime())) {
    article.hidden = true;
    return;
  }
  page.querySelector("[data-certificate-name]").value = certificate.learnerName;
  article.querySelector("[data-certificate-learner]").textContent = certificate.learnerName;
  article.querySelector("[data-certificate-date]").textContent = new Intl.DateTimeFormat("zh-TW", { dateStyle: "long" }).format(completedAt);
  article.hidden = false;
}

function latestTrainingCompletion(progress) {
  const timestamps = [
    ...Object.values(progress.chapters ?? {}).map((chapter) => chapter.completedAt),
    ...levelNames.map((_, index) => progress.quizzes?.[`L${index + 1}`]?.completedAt)
  ].map((value) => Date.parse(value)).filter(Number.isFinite);
  return new Date(timestamps.length ? Math.max(...timestamps) : Date.now()).toISOString();
}
