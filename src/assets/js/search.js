export function initSearch() {
  const button = document.querySelector("[data-search-open]");
  const popover = document.querySelector("[data-search-popover]");
  const input = document.querySelector("[data-search-input]");
  const results = document.querySelector("[data-search-results]");
  if (!button || !popover || !input || !results) return;
  let indexPromise;
  button.addEventListener("click", () => {
    popover.hidden = !popover.hidden;
    if (!popover.hidden) input.focus();
  });
  input.addEventListener("input", async () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      results.textContent = "";
      return;
    }
    indexPromise ??= fetch("/assets/search-index.json").then((response) => response.json());
    const searchIndex = await indexPromise;
    const tokens = tokenize(query);
    const ids = new Set(tokens.flatMap((token) => searchIndex.index[token] ?? []));
    const matches = [...ids].slice(0, 8).map((id) => searchIndex.docs[id]);
    results.innerHTML = matches.length
      ? matches.map((item) => `<a href="${item.url}">${item.title}</a>`).join("")
      : "<p>沒有找到結果。</p>";
  });
}

function tokenize(text) {
  const english = text.match(/[a-z0-9_+-]+/g) ?? [];
  const chineseChunks = Array.from(text.matchAll(/[\u4e00-\u9fff]+/g)).flatMap(([chunk]) => {
    const chars = Array.from(chunk);
    return chars.length < 2 ? chars : chars.slice(0, -1).map((char, index) => `${char}${chars[index + 1]}`);
  });
  return [...new Set([...english, ...chineseChunks])];
}
