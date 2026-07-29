import { glossary } from "../data/glossary.js";

export function initTooltips() {
  let tooltip;
  const terms = new Map(glossary.map((term) => [term.zh, term]));
  document.querySelectorAll("[data-term]").forEach((node) => {
    const show = () => {
      const term = terms.get(node.dataset.term);
      if (!term) return;
      tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      tooltip.innerHTML = `<strong>${term.zh}</strong><br><span>${term.en}</span><p>${term.definition}</p>`;
      document.body.append(tooltip);
      const rect = node.getBoundingClientRect();
      tooltip.style.left = `${Math.min(rect.left, innerWidth - 300)}px`;
      tooltip.style.top = `${rect.bottom + 8}px`;
    };
    const hide = () => {
      tooltip?.remove();
      tooltip = null;
    };
    node.addEventListener("mouseenter", show);
    node.addEventListener("focus", show);
    node.addEventListener("mouseleave", hide);
    node.addEventListener("blur", hide);
  });
}
