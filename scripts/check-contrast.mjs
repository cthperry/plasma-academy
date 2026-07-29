const pairs = [
  ["light text/bg", "#1a1f26", "#fbfcfd", 7],
  ["light muted/bg", "#4a5560", "#fbfcfd", 4.5],
  ["light primary/bg", "#0f6fd6", "#fbfcfd", 4.5],
  ["dark text/bg", "#e6edf3", "#0e1116", 7],
  ["dark muted/bg", "#9aa7b4", "#0e1116", 4.5],
  ["dark primary/bg", "#4d9df0", "#0e1116", 4.5]
];

let failed = false;
for (const [name, fg, bg, min] of pairs) {
  const ratio = contrast(fg, bg);
  console.log(`${name}: ${ratio.toFixed(2)} (${min})`);
  if (ratio < min) failed = true;
}

if (failed) {
  console.error("對比檢查未通過。");
  process.exit(1);
}

function contrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const high = Math.max(l1, l2);
  const low = Math.min(l1, l2);
  return (high + 0.05) / (low + 0.05);
}

function luminance(hex) {
  const rgb = hex.replace("#", "").match(/../g).map((part) => parseInt(part, 16) / 255).map((value) => (
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
