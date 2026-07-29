/* ==========================================================================
   check-contrast.mjs — 對比度驗證

   docs/07 要求:正文 ≥ 7:1(AAA)、次要文字 ≥ 4.5:1、UI 邊界 ≥ 3:1,
   深淺兩套主題各驗一次。

   直接解析 base.css 的 token,不需瀏覽器。
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(ROOT, "src/css/base.css"), "utf8");

/** 抓某個 CSS 區塊裡的所有 --pa-* 宣告 */
function block(selectorRe) {
  const m = css.match(selectorRe);
  if (!m) throw new Error("找不到區塊:" + selectorRe);
  const out = {};
  for (const line of m[1].split("\n")) {
    const d = line.match(/--pa-([\w-]+)\s*:\s*([^;]+);/);
    if (d) out[d[1]] = d[2].trim();
  }
  return out;
}

// :root { ... } 第一個區塊 = 淺色
const light = block(/:root\s*\{([\s\S]*?)\n\}/);
// :root[data-theme="dark"] { ... } = 深色
const dark = block(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/);

function hexToRgb(h) {
  const s = h.replace("#", "").trim();
  if (s.length === 3) {
    return [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16)];
  }
  if (s.length !== 6) return null;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg, bg) {
  const a = luminance(hexToRgb(fg));
  const b = luminance(hexToRgb(bg));
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

// 檢查項:[前景 token, 背景 token, 最低比值, 說明]
const CHECKS = [
  ["text", "bg", 7, "正文 / 頁面底(AAA)"],
  ["text", "surface", 7, "正文 / 卡片"],
  ["text", "surface-sunken", 7, "正文 / 凹陷層(公式卡、程式碼)"],
  ["text-muted", "bg", 4.5, "次要文字 / 頁面底"],
  ["text-muted", "surface", 4.5, "次要文字 / 卡片"],
  ["text-muted", "surface-sunken", 4.5, "次要文字 / 凹陷層"],
  ["text-subtle", "bg", 4.5, "標籤 / 頁面底"],
  ["text-subtle", "surface-sunken", 4.5, "標籤 / 凹陷層"],
  ["primary", "bg", 4.5, "連結 / 頁面底"],
  ["primary", "surface", 4.5, "連結 / 卡片"],
  ["primary", "info-bg", 4.5, "主色 / 提示方塊底"],
  ["success", "success-bg", 4.5, "成功色 / 提示方塊底"],
  ["warning", "warning-bg", 4.5, "警告色 / 提示方塊底"],
  ["danger", "danger-bg", 4.5, "危險色 / 提示方塊底"],
  ["border-strong", "bg", 3, "UI 邊界 / 頁面底"],
  ["level-1", "surface", 3, "L1 識別色 / 卡片"],
  ["level-2", "surface", 3, "L2 識別色 / 卡片"],
  ["level-3", "surface", 3, "L3 識別色 / 卡片"],
  ["level-4", "surface", 3, "L4 識別色 / 卡片"],
];

let fail = 0;
let pass = 0;

for (const [themeName, theme] of [
  ["淺色", light],
  ["深色", dark],
]) {
  console.log(`\n【${themeName}主題】`);
  for (const [fg, bg, min, label] of CHECKS) {
    const fgV = theme[fg];
    const bgV = theme[bg];
    if (!fgV || !bgV) {
      console.log(`  ✗ ${label} — token 缺漏(${!fgV ? "--pa-" + fg : "--pa-" + bg})`);
      fail++;
      continue;
    }
    const r = ratio(fgV, bgV);
    const ok = r >= min;
    console.log(
      `  ${ok ? "✓" : "✗"} ${label}: ${r.toFixed(2)}:1 (需 ≥ ${min}:1) ${fgV} on ${bgV}`
    );
    ok ? pass++ : fail++;
  }
}

console.log(`\n${fail === 0 ? "✓" : "✗"} 對比度 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
