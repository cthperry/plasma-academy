export function readCanvasTheme() {
  const styles = getComputedStyle(document.documentElement);
  return {
    bg: styles.getPropertyValue("--pa-surface-sunken").trim(),
    surface: styles.getPropertyValue("--pa-surface").trim(),
    text: styles.getPropertyValue("--pa-text").trim(),
    muted: styles.getPropertyValue("--pa-text-muted").trim(),
    border: styles.getPropertyValue("--pa-border").trim(),
    electron: styles.getPropertyValue("--pa-electron").trim(),
    ion: styles.getPropertyValue("--pa-ion").trim(),
    neutral: styles.getPropertyValue("--pa-neutral").trim(),
    primary: styles.getPropertyValue("--pa-primary").trim(),
    success: styles.getPropertyValue("--pa-success").trim(),
    warning: styles.getPropertyValue("--pa-warning").trim(),
    danger: styles.getPropertyValue("--pa-danger").trim()
  };
}

export function watchTheme(instance) {
  const handler = () => instance.applyTheme?.(readCanvasTheme());
  document.addEventListener("pa:themechange", handler);
  return () => document.removeEventListener("pa:themechange", handler);
}
