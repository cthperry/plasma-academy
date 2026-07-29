export function initNav() {
  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (event.key === "ArrowLeft") document.querySelector(".chapter-nav a:first-child")?.click();
    if (event.key === "ArrowRight") document.querySelector(".chapter-nav a:last-child")?.click();
  });

  document.querySelectorAll(".filter-row [data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      document.querySelectorAll(".filter-row [data-filter]").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll(".lab-card").forEach((card) => {
        card.hidden = filter !== "all" && card.dataset.level !== filter;
      });
    });
  });
}
