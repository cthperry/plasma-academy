export function initUnitConverters() {
  document.querySelectorAll("[data-unit-converter]").forEach((mount) => {
    mount.innerHTML = `<section class="unit-converter" aria-label="單位換算">
      <strong>單位換算</strong>
      ${row("pressure", "mTorr", "Pa", 133.322 / 1000)}
      ${row("flow", "sccm", "slm", 0.001)}
      ${row("energy", "eV", "K", 11605)}
      ${row("density", "cm⁻³", "m⁻³", 1000000)}
    </section>`;
    mount.querySelectorAll("[data-unit-row]").forEach((unitRow) => {
      const input = unitRow.querySelector("input");
      const output = unitRow.querySelector("output");
      input.addEventListener("input", () => {
        output.value = format(Number(input.value) * Number(unitRow.dataset.factor));
      });
      output.value = format(Number(input.value) * Number(unitRow.dataset.factor));
    });
  });
}

function row(id, from, to, factor) {
  return `<label class="control" data-unit-row="${id}" data-factor="${factor}">
    <span>${from} → ${to}</span>
    <input type="number" value="1" step="any">
    <output></output>
  </label>`;
}

function format(value) {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) >= 10000 || Math.abs(value) < 0.01) return value.toExponential(2);
  return value.toFixed(3).replace(/\.?0+$/, "");
}
