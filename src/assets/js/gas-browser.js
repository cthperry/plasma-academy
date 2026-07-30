const hazardOrder = { extreme: 4, high: 3, medium: 2, low: 1 };

export function initGasBrowser() {
  const root = document.querySelector("[data-gas-browser]");
  if (!root) return;
  const grid = root.querySelector("[data-gas-grid]");
  const cards = [...root.querySelectorAll("[data-gas-card]")];
  const controls = {
    search: root.querySelector("[data-gas-search]"),
    family: root.querySelector("[data-gas-family]"),
    use: root.querySelector("[data-gas-use]"),
    hazard: root.querySelector("[data-gas-hazard]"),
    sort: root.querySelector("[data-gas-sort]")
  };

  const update = () => {
    const query = controls.search.value.trim().toLowerCase();
    let visible = 0;
    for (const card of cards) {
      const matches = (!query || card.dataset.query.includes(query))
        && (controls.family.value === "all" || card.dataset.family === controls.family.value)
        && (controls.use.value === "all" || card.dataset.uses.split("|").includes(controls.use.value))
        && (controls.hazard.value === "all" || card.dataset.hazard === controls.hazard.value);
      card.hidden = !matches;
      if (matches) visible += 1;
    }

    const sorted = [...cards].sort((a, b) => {
      if (controls.sort.value === "hazard") return hazardOrder[b.dataset.hazard] - hazardOrder[a.dataset.hazard];
      if (controls.sort.value === "fc") {
        const aFc = Number(a.querySelector(".gas-summary div:nth-child(3) dd").textContent) || -1;
        const bFc = Number(b.querySelector(".gas-summary div:nth-child(3) dd").textContent) || -1;
        return bFc - aFc;
      }
      return `${a.dataset.family}${a.querySelector("h2").textContent}`.localeCompare(`${b.dataset.family}${b.querySelector("h2").textContent}`, "zh-Hant");
    });
    sorted.forEach((card) => grid.append(card));
    root.querySelector("[data-gas-count]").textContent = `顯示 ${visible} / ${cards.length} 種氣體`;
    root.querySelector("[data-gas-empty]").hidden = visible !== 0;
  };

  Object.values(controls).forEach((control) => control.addEventListener("input", update));
  update();
}
