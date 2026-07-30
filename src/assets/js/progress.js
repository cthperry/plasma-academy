import { clearProgress, defaultProgress, getProgress, saveProgress } from "./progress-store.js";

export function initProgress() {
  markVisitedChapter();
  initObjectiveChecks();
  initRoleSelection();
  initQuiz();
  initProgressPage();
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
    const l1Exam = progress.quizzes?.L1;
    const badge = page.querySelector("[data-progress-l1-badge]");
    const examStatus = page.querySelector("[data-progress-l1-status]");
    badge.classList.toggle("earned", Boolean(l1Exam?.passed));
    examStatus.textContent = l1Exam?.passed
      ? `已通過 · 最佳成績 ${l1Exam.bestScore}%`
      : l1Exam?.attempts?.length
        ? `已作答 ${l1Exam.attempts.length} 次 · 最佳成績 ${l1Exam.bestScore}%`
        : "尚未通過 L1 結業測驗";
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
    const imported = JSON.parse(await file.text());
    saveProgress({ ...defaultProgress(), ...imported, version: 1 });
  });
  page.querySelector("[data-reset-progress]").addEventListener("click", clearProgress);
}
