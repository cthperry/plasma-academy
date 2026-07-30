import { getProgress, saveProgress } from "./progress-store.js";

const chapterObjectiveCounts = { "1-1": 4, "1-2": 4, "1-3": 3, "1-4": 3, "1-5": 4, "1-6": 3 };
const typeLabels = { single: "單選題", multi: "多選題", numeric: "計算題", scenario: "情境題" };
let examDataPromise;

export function initExam() {
  updateExamGates();
  document.addEventListener("pa:progresschange", updateExamGates);

  const page = document.querySelector("[data-exam-page]");
  if (!page) return;
  initExamPage(page);
}

function completedL1Chapters(progress = getProgress()) {
  return Object.entries(chapterObjectiveCounts).filter(([chapterId, expected]) => {
    const objectives = progress.chapters[chapterId]?.objectives ?? [];
    return objectives.length >= expected && objectives.slice(0, expected).every(Boolean);
  }).length;
}

function canTakeL1Exam(progress = getProgress()) {
  return completedL1Chapters(progress) >= 5 || Boolean(progress.quizzes?.L1?.passed);
}

function updateExamGates() {
  const progress = getProgress();
  const completed = completedL1Chapters(progress);
  const unlocked = canTakeL1Exam(progress);

  document.querySelectorAll("[data-exam-gate]").forEach((gate) => {
    const status = gate.querySelector("[data-exam-gate-status]");
    const link = gate.querySelector("[data-exam-link]");
    status.textContent = unlocked ? `已完成 ${completed}/6 章，可開始或重測。` : `已完成 ${completed}/6 章；還需完成 ${5 - completed} 章。`;
    link.hidden = !unlocked;
  });
}

function initExamPage(page) {
  const entry = page.querySelector("[data-exam-entry]");
  const startButton = page.querySelector("[data-exam-start]");
  const unlockTitle = page.querySelector("[data-exam-unlock-title]");
  const unlockStatus = page.querySelector("[data-exam-unlock-status]");
  const shell = page.querySelector("[data-exam-shell]");
  const form = page.querySelector("[data-exam-form]");
  const results = page.querySelector("[data-exam-results]");
  const position = page.querySelector("[data-exam-position]");
  const type = page.querySelector("[data-exam-type]");
  const timer = page.querySelector("[data-exam-timer]");
  const progressBar = page.querySelector("[data-exam-progress]");
  const questionNav = page.querySelector("[data-exam-question-nav]");
  const previousButton = page.querySelector("[data-exam-previous]");
  const nextButton = page.querySelector("[data-exam-next]");
  const submitButton = page.querySelector("[data-exam-submit]");
  const state = { questions: [], answers: {}, index: 0, interval: null, deadline: 0, spec: null, submitted: false };

  const refreshUnlock = () => {
    const progress = getProgress();
    const completed = completedL1Chapters(progress);
    const unlocked = canTakeL1Exam(progress);
    startButton.disabled = !unlocked;
    unlockTitle.textContent = unlocked ? "測驗已解鎖" : "完成學習目標以解鎖";
    unlockStatus.textContent = unlocked
      ? `已完成 ${completed}/6 章。開始後有 30 分鐘作答，離開頁面會結束本次作答。`
      : `已完成 ${completed}/6 章；完成 5 章的全部學習目標後可開始。`;
  };

  const renderNav = () => {
    questionNav.replaceChildren(...state.questions.map((question, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(index + 1);
      button.dataset.questionIndex = String(index);
      button.className = index === state.index ? "current" : isAnswered(question, state.answers[question.id]) ? "answered" : "";
      button.setAttribute("aria-label", `前往第 ${index + 1} 題${isAnswered(question, state.answers[question.id]) ? "，已作答" : ""}`);
      button.addEventListener("click", () => {
        state.index = index;
        renderQuestion();
      });
      return button;
    }));
  };

  const renderQuestion = () => {
    const question = state.questions[state.index];
    position.textContent = `第 ${state.index + 1} / ${state.questions.length} 題`;
    type.textContent = typeLabels[question.type];
    progressBar.max = state.questions.length;
    progressBar.value = state.index + 1;
    progressBar.textContent = `${state.index + 1} / ${state.questions.length}`;
    previousButton.disabled = state.index === 0;
    nextButton.hidden = state.index === state.questions.length - 1;
    submitButton.hidden = state.index !== state.questions.length - 1;

    const fieldset = document.createElement("fieldset");
    fieldset.className = "exam-question";
    fieldset.dataset.questionId = question.id;
    const legend = document.createElement("legend");
    legend.textContent = question.question;
    fieldset.append(legend);

    if (question.type === "numeric") {
      const label = document.createElement("label");
      label.className = "exam-numeric";
      label.innerHTML = `<span>輸入答案</span><span class="exam-numeric__input"><input type="number" inputmode="decimal" step="any" aria-label="${escapeHtml(question.question)}"><strong>${escapeHtml(question.unit)}</strong></span><small>允許依題目設定的合理量級誤差。</small>`;
      const input = label.querySelector("input");
      input.value = state.answers[question.id] ?? "";
      input.addEventListener("input", () => {
        state.answers[question.id] = input.value;
        renderNav();
      });
      fieldset.append(label);
    } else {
      const choices = document.createElement("div");
      choices.className = "exam-options";
      for (const option of question.options) {
        const label = document.createElement("label");
        label.className = "exam-option";
        const input = document.createElement("input");
        input.type = question.type === "multi" ? "checkbox" : "radio";
        input.name = `answer-${question.id}`;
        input.value = option.id;
        input.checked = question.type === "multi"
          ? (state.answers[question.id] ?? []).includes(option.id)
          : state.answers[question.id] === option.id;
        input.addEventListener("change", () => {
          if (question.type === "multi") {
            const selected = new Set(state.answers[question.id] ?? []);
            input.checked ? selected.add(option.id) : selected.delete(option.id);
            state.answers[question.id] = [...selected];
          } else {
            state.answers[question.id] = option.id;
          }
          renderNav();
        });
        const text = document.createElement("span");
        text.innerHTML = `<strong>${option.id}</strong>${escapeHtml(option.text)}`;
        label.append(input, text);
        choices.append(label);
      }
      fieldset.append(choices);
    }

    form.replaceChildren(fieldset);
    renderNav();
    fieldset.querySelector("input")?.focus({ preventScroll: true });
  };

  const submitExam = (timedOut = false) => {
    if (state.submitted) return;
    state.submitted = true;
    clearInterval(state.interval);
    const graded = state.questions.map((question) => ({ question, correct: isCorrect(question, state.answers[question.id]), answer: state.answers[question.id] }));
    const correctCount = graded.filter((item) => item.correct).length;
    const percent = Math.round((correctCount / graded.length) * 100);
    const passed = percent >= state.spec.passPercent;
    saveExamProgress(percent, passed, timedOut, state.questions.map((question) => question.id));
    shell.hidden = true;
    entry.hidden = true;
    results.hidden = false;
    results.innerHTML = renderResults(graded, correctCount, percent, passed, timedOut);
    results.querySelector("[data-exam-retry]").addEventListener("click", startExam);
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const startExam = async () => {
    const data = await loadExamData();
    state.spec = data.level1ExamSpec;
    state.questions = drawQuestions(data.level1Questions, data.level1ExamSpec.draw, new URLSearchParams(location.search).get("seed"));
    state.answers = {};
    state.index = 0;
    state.submitted = false;
    state.deadline = Date.now() + data.level1ExamSpec.durationMinutes * 60 * 1000;
    entry.hidden = true;
    results.hidden = true;
    shell.hidden = false;
    renderQuestion();
    updateTimer(timer, state.deadline);
    clearInterval(state.interval);
    state.interval = setInterval(() => {
      if (updateTimer(timer, state.deadline) <= 0) submitExam(true);
    }, 1000);
    shell.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  startButton.addEventListener("click", startExam);
  previousButton.addEventListener("click", () => {
    state.index = Math.max(0, state.index - 1);
    renderQuestion();
  });
  nextButton.addEventListener("click", () => {
    state.index = Math.min(state.questions.length - 1, state.index + 1);
    renderQuestion();
  });
  submitButton.addEventListener("click", () => submitExam(false));
  document.addEventListener("pa:progresschange", refreshUnlock);
  refreshUnlock();
}

async function loadExamData() {
  examDataPromise ??= import("/assets/data/quiz/level-1.js");
  return examDataPromise;
}

function drawQuestions(bank, draw, seed) {
  const random = seed ? seededRandom(seed) : cryptoRandom;
  const selected = Object.entries(draw).flatMap(([type, count]) => shuffle(bank.filter((question) => question.type === type), random).slice(0, count));
  return shuffle(selected, random);
}

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function cryptoRandom() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] / 4294967296;
}

function seededRandom(seed) {
  let state = [...seed].reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function isAnswered(question, answer) {
  if (question.type === "multi") return Array.isArray(answer) && answer.length > 0;
  return answer !== undefined && answer !== null && answer !== "";
}

function isCorrect(question, answer) {
  if (question.type === "numeric") {
    const value = Number(answer);
    if (!Number.isFinite(value)) return false;
    const difference = Math.abs(value - question.answer);
    return question.answer === 0 ? difference <= question.tolerance : difference / Math.abs(question.answer) <= question.tolerance;
  }
  const correctIds = question.options.filter((option) => option.correct).map((option) => option.id).sort();
  const selectedIds = (Array.isArray(answer) ? answer : answer ? [answer] : []).sort();
  return correctIds.length === selectedIds.length && correctIds.every((id, index) => id === selectedIds[index]);
}

function updateTimer(element, deadline) {
  const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  element.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  element.closest(".exam-timer")?.classList.toggle("urgent", remaining <= 300);
  return remaining;
}

function saveExamProgress(score, passed, timedOut, questionIds) {
  const progress = getProgress();
  progress.quizzes ??= {};
  const previous = progress.quizzes.L1 ?? { attempts: [], bestScore: 0, passed: false, completedAt: null };
  const submittedAt = new Date().toISOString();
  progress.quizzes.L1 = {
    attempts: [...(previous.attempts ?? []), { score, passed, timedOut, questionIds, submittedAt }].slice(-10),
    bestScore: Math.max(previous.bestScore ?? 0, score),
    passed: Boolean(previous.passed || passed),
    completedAt: previous.completedAt ?? (passed ? submittedAt : null)
  };
  saveProgress(progress);
}

function renderResults(graded, correctCount, percent, passed, timedOut) {
  const reviews = graded.map(({ question, correct, answer }, index) => {
    const selected = Array.isArray(answer) ? answer : answer ? [String(answer)] : [];
    const answerDetail = question.type === "numeric"
      ? `<p><strong>你的答案：</strong>${answer === undefined || answer === "" ? "未作答" : `${escapeHtml(answer)} ${escapeHtml(question.unit)}`}；參考答案 ${question.answer} ${escapeHtml(question.unit)}</p>`
      : `<ul class="exam-review-options">${question.options.map((option) => {
          const states = [option.correct ? "correct" : "", selected.includes(option.id) ? "selected" : ""].filter(Boolean).join(" ");
          return `<li class="${states}"><strong>${option.id}. ${escapeHtml(option.text)}</strong><span>${escapeHtml(option.why)}</span></li>`;
        }).join("")}</ul>`;
    return `<details class="exam-review ${correct ? "is-correct" : "is-wrong"}">
      <summary><span>第 ${index + 1} 題 · ${escapeHtml(typeLabels[question.type])}</span><strong>${correct ? "正確" : "需複習"}</strong></summary>
      <h3>${escapeHtml(question.question)}</h3>
      ${answerDetail}
      <p class="exam-explanation"><strong>整體解析：</strong>${escapeHtml(question.explanation)}</p>
      <a class="text-link" href="${chapterRoute(question.chapter)}">回到 ${escapeHtml(question.reference)}</a>
    </details>`;
  }).join("");
  return `<header class="exam-score ${passed ? "passed" : "not-passed"}">
      <p>${timedOut ? "作答時間到，系統已自動交卷" : "本次成績"}</p>
      <div><strong>${percent}</strong><span>分</span></div>
      <h2>${passed ? "通過 L1 電漿入門" : "尚未達到 75% 通過門檻"}</h2>
      <p>答對 ${correctCount} / ${graded.length} 題。${passed ? "電漿入門徽章已寫入本機進度。" : "檢視解析後可重新抽題。"}</p>
      <div class="exam-result-actions"><button class="button primary" type="button" data-exam-retry>重新抽題</button><a class="button secondary" href="/progress/">查看進度</a></div>
    </header>
    <section class="exam-review-list"><h2>逐題解析</h2>${reviews}</section>`;
}

function chapterRoute(chapter) {
  const routes = {
    "1.1": "/level/1/1-1-fourth-state/",
    "1.2": "/level/1/1-2-parameters/",
    "1.3": "/level/1/1-3-collisions-mfp/",
    "1.4": "/level/1/1-4-glow-breakdown/",
    "1.5": "/level/1/1-5-sheath/",
    "1.6": "/level/1/1-6-process-map/"
  };
  return routes[chapter] ?? "/level/1/";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
}
