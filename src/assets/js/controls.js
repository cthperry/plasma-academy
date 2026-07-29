export function createSlider({ label, min, max, value, step = 1, unit = "", onInput }) {
  const wrap = document.createElement("div");
  wrap.className = "control";
  const id = `control-${crypto.randomUUID()}`;
  wrap.innerHTML = `<label for="${id}"><span>${label}</span><output>${value} ${unit}</output></label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}">`;
  const input = wrap.querySelector("input");
  const output = wrap.querySelector("output");
  input.addEventListener("input", () => {
    output.value = `${input.value} ${unit}`.trim();
    onInput(Number(input.value));
  });
  return wrap;
}

export function createToggle({ label, checked, onChange }) {
  const wrap = document.createElement("label");
  wrap.className = "control";
  wrap.innerHTML = `<span>${label}</span><input type="checkbox" ${checked ? "checked" : ""}>`;
  const input = wrap.querySelector("input");
  input.addEventListener("change", () => onChange(input.checked));
  return wrap;
}

export function createButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button secondary";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

export function createValuePanel(entries) {
  const panel = document.createElement("dl");
  panel.className = "value-panel";
  for (const [key, value] of entries) {
    const dt = document.createElement("dt");
    dt.textContent = key;
    const dd = document.createElement("dd");
    dd.textContent = value;
    dd.dataset.valueKey = key;
    panel.append(dt, dd);
  }
  return panel;
}
