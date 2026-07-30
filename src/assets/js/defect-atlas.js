export function initDefectAtlas() {
  const atlas = document.querySelector("[data-defect-atlas]");
  if (!atlas) return;
  const search = atlas.querySelector("[data-defect-search]");
  const count = atlas.querySelector("[data-defect-count]");
  const cards = [...atlas.querySelectorAll("[data-defect-card]")];
  let category = "all";

  function apply() {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    for (const card of cards) {
      const matchesCategory = category === "all" || card.dataset.category === category;
      const matchesQuery = !query || card.dataset.search.includes(query);
      card.hidden = !(matchesCategory && matchesQuery);
      if (!card.hidden) visible += 1;
    }
    count.value = `${visible} 種`;
  }

  atlas.querySelectorAll("[data-defect-filter]").forEach((button) => button.addEventListener("click", () => {
    category = button.dataset.defectFilter;
    atlas.querySelectorAll("[data-defect-filter]").forEach((item) => item.classList.toggle("active", item === button));
    apply();
  }));
  search.addEventListener("input", apply);
  apply();
}
