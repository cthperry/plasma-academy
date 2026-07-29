import { getProgress, saveProgress } from "./progress-store.js";

export function initLabContainers() {
  document.querySelectorAll("[data-lab-container]").forEach((container) => {
    let instance;
    const load = async () => {
      if (instance) return;
      const module = await import(container.dataset.labModule);
      instance = module.init(container, {});
      const id = container.id.replace("lab-", "").toUpperCase();
      const progress = getProgress();
      progress.labUsage[id] = (progress.labUsage[id] ?? 0) + 1;
      saveProgress(progress);
    };
    const observer = new IntersectionObserver(async ([entry]) => {
      if (entry.isIntersecting) {
        await load();
        instance?.start();
      } else {
        instance?.stop();
      }
    }, { rootMargin: "200px" });
    observer.observe(container);
  });
}

export function createLifecycle(instance) {
  let frame = null;
  const tick = (time) => {
    instance.update?.(time);
    instance.render?.();
    frame = requestAnimationFrame(tick);
  };
  return {
    init: instance.init?.bind(instance),
    update: instance.update?.bind(instance),
    render: instance.render?.bind(instance),
    applyTheme: instance.applyTheme?.bind(instance),
    start() {
      if (frame || matchMedia("(prefers-reduced-motion: reduce)").matches) {
        instance.render?.();
        return;
      }
      frame = requestAnimationFrame(tick);
    },
    stop() {
      if (frame) cancelAnimationFrame(frame);
      frame = null;
    },
    reset() {
      instance.reset?.();
      instance.render?.();
    },
    destroy() {
      this.stop();
      instance.destroy?.();
    }
  };
}
