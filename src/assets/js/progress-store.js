const key = "plasma-academy.progress";

export function defaultProgress() {
  return {
    version: 1,
    role: null,
    chapters: {},
    quizzes: {},
    labUsage: {},
    bookmarks: [],
    settings: { theme: "auto", reducedMotion: false, showEnglishTerms: true }
  };
}

export function getProgress() {
  try {
    return { ...defaultProgress(), ...JSON.parse(localStorage.getItem(key) || "{}") };
  } catch (_) {
    return defaultProgress();
  }
}

export function saveProgress(progress) {
  localStorage.setItem(key, JSON.stringify(progress));
  document.dispatchEvent(new CustomEvent("pa:progresschange", { detail: progress }));
}

export function clearProgress() {
  localStorage.removeItem(key);
  document.dispatchEvent(new CustomEvent("pa:progresschange", { detail: defaultProgress() }));
}
