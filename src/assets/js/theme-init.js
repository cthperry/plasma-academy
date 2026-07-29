(function () {
  try {
    var raw = localStorage.getItem("plasma-academy.progress");
    var progress = raw ? JSON.parse(raw) : null;
    var theme = progress && progress.settings ? progress.settings.theme : "auto";
    document.documentElement.dataset.theme = theme === "auto"
      ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
  } catch (_) {
    document.documentElement.dataset.theme = "light";
  }
})();
