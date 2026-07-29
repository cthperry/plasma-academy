import { getProgress, saveProgress } from "./progress-store.js";

export function resolveTheme(mode) {
  if (mode === "auto") {
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

export function setTheme(mode) {
  const progress = getProgress();
  progress.settings.theme = mode;
  saveProgress(progress);
  document.documentElement.dataset.theme = resolveTheme(mode);
  document.dispatchEvent(new CustomEvent("pa:themechange", { detail: { mode, resolved: resolveTheme(mode) } }));
}

export function initThemeToggle() {
  const button = document.querySelector("[data-theme-toggle]");
  if (!button) return;
  button.addEventListener("click", () => {
    const current = getProgress().settings.theme;
    const next = current === "auto" ? "light" : current === "light" ? "dark" : "auto";
    setTheme(next);
    button.setAttribute("aria-label", `切換主題，目前 ${next}`);
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (getProgress().settings.theme === "auto") setTheme("auto");
  });
}
