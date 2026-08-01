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
    return normalizeProgress(JSON.parse(localStorage.getItem(key) || "{}"));
  } catch (_) {
    return defaultProgress();
  }
}

export function saveProgress(progress) {
  const normalized = normalizeProgress(progress);
  localStorage.setItem(key, JSON.stringify(normalized));
  document.dispatchEvent(new CustomEvent("pa:progresschange", { detail: normalized }));
}

export function clearProgress() {
  localStorage.removeItem(key);
  document.dispatchEvent(new CustomEvent("pa:progresschange", { detail: defaultProgress() }));
}

export function normalizeProgress(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const defaults = defaultProgress();
  return {
    ...defaults,
    ...source,
    version: 1,
    chapters: asRecord(source.chapters),
    quizzes: asRecord(source.quizzes),
    labUsage: asRecord(source.labUsage),
    bookmarks: Array.isArray(source.bookmarks) ? source.bookmarks : [],
    settings: { ...defaults.settings, ...asRecord(source.settings) }
  };
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
