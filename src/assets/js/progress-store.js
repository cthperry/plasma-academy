import { getCurrentUser } from "./auth-store.js";

const key = "plasma-academy.progress";
const legacyMigrationKey = "plasma-academy.progress.legacy-migrated";

export function defaultProgress(userId = getCurrentUser()?.id ?? null) {
  return {
    version: 1,
    userId,
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
    const user = getCurrentUser();
    const stored = localStorage.getItem(storageKeyFor(user));
    return normalizeProgress(JSON.parse(stored || "{}"), user?.id ?? null);
  } catch (_) {
    return defaultProgress();
  }
}

export function saveProgress(progress) {
  const user = getCurrentUser();
  const normalized = normalizeProgress(progress, user?.id ?? null);
  localStorage.setItem(storageKeyFor(user), JSON.stringify(normalized));
  document.dispatchEvent(new CustomEvent("pa:progresschange", { detail: normalized }));
}

export function clearProgress() {
  localStorage.removeItem(storageKeyFor(getCurrentUser()));
  document.dispatchEvent(new CustomEvent("pa:progresschange", { detail: defaultProgress() }));
}

export function ensureCurrentUserProgress() {
  const user = getCurrentUser();
  if (!user) return getProgress();
  const scopedKey = storageKeyFor(user);
  if (localStorage.getItem(scopedKey)) return getProgress();
  let initial = defaultProgress(user.id);
  if (!localStorage.getItem(legacyMigrationKey)) {
    try {
      const legacy = localStorage.getItem(key);
      if (legacy) initial = normalizeProgress(JSON.parse(legacy), user.id);
    } catch (_) {
      initial = defaultProgress(user.id);
    }
    localStorage.setItem(legacyMigrationKey, user.id);
  }
  localStorage.setItem(scopedKey, JSON.stringify(initial));
  return initial;
}

export function normalizeProgress(value, userId = getCurrentUser()?.id ?? null) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const defaults = defaultProgress(userId);
  return {
    ...defaults,
    ...source,
    version: 1,
    userId,
    chapters: asRecord(source.chapters),
    quizzes: asRecord(source.quizzes),
    labUsage: asRecord(source.labUsage),
    bookmarks: Array.isArray(source.bookmarks) ? source.bookmarks : [],
    settings: { ...defaults.settings, ...asRecord(source.settings) }
  };
}

function storageKeyFor(user) {
  return user?.id ? `${key}.${user.id}` : key;
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
