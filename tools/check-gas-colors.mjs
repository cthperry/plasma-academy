/* ==========================================================================
   check-gas-colors.mjs — 氣體配色的單一來源與可區分性

   五個互動元件讓學員選氣體(A03/A05/A10/A26/A32/A33)。原本只有 A05 會
   隨氣體換色,其餘的曲線/粒子一律固定色 —— 換了氣體,畫面上除了數字
   之外沒有任何東西在動,學員很難把「這條線」與「我剛選的那支氣體」
   連起來。

   配色現在集中在 canvas-theme.js 的 GAS_TOKENS(單一來源),這支檔案
   守住兩件事:

     1. **每個元件選單裡的每一支氣體都查得到顏色** —— 漏掉的會退回
        primary,而那正是「看起來沒換色」的舊行為,必須被抓出來。
     2. **同一個選單裡的氣體必須兩兩不同色** —— 這才是真正的需求。
        token 只有六個、氣體十幾種,跨元件重用顏色是可以的
        (Ar 在 A05 與 A26 都是紅色,那是我們要的一致性);
        但同一個下拉選單裡出現兩支同色的氣體就沒有意義了。

   ⚠️ 新增氣體到任何一個選單時,第 2 條會抓出撞色。
   解法是調整 GAS_TOKENS 的分配,不是放寬這條斷言。
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* canvas-theme.js 需要 window / document / getComputedStyle 才跑得起來 */
const sandbox = {
  window: {
    addEventListener() {},
    matchMedia: () => ({ matches: false }),
    ResizeObserver: null,
  },
  document: {
    documentElement: {},
    createElement: () => ({ getContext: () => ({ setTransform() {} }), style: {} }),
  },
  getComputedStyle: () => ({ getPropertyValue: () => "" }),
};
sandbox.window.document = sandbox.document;
sandbox.window.getComputedStyle = sandbox.getComputedStyle;
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(ROOT, "src/js/lab/canvas-theme.js"), "utf8"), sandbox, {
  filename: "canvas-theme.js",
});
const T = sandbox.window.PA.canvasTheme;

let pass = 0;
let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

/**
 * 各元件的氣體清單。
 * 這些 key 直接對應元件原始碼裡 segmented 控制項的 value ——
 * 下面第 0 條斷言會回頭比對原始碼,避免這份清單自己過期。
 */
const SELECTORS = {
  "A03 平均自由徑": ["He", "Ar", "Xe"],
  "A05 Paschen 曲線": ["Ar", "He", "N2", "Air", "O2"],
  "A10 F/C 比": ["CF4", "CHF3", "C4F8", "C4F6", "CH3F"],
  "A26 Langmuir 探針": ["ar", "o2", "cf4", "cl2"],
  "A32 0-D 全域模型": ["Ar", "O2", "Cl2", "CF4", "SF6"],
  "A33 封裝電漿": ["ar", "o2", "aro2", "h2ar", "n2"],
};

console.log("\n【清單本身沒有過期】");
/*
   這一條是防止上面那份清單與實際程式碼脫節 —— 那會讓後面兩條斷言
   驗的是一份想像中的選單。用各元件真正的資料來源反查。
*/
{
  const modelGases = (file, re) => {
    const src = readFileSync(join(ROOT, file), "utf8");
    const out = [];
    for (let m; (m = re.exec(src)); ) out.push(m[1]);
    return out;
  };
  const probe = modelGases("src/js/lab/probe-model.js", /^\s{4}(\w+): \{ key:/gm);
  ok(
    "A26 的清單與 probe-model.js 一致",
    probe.length > 0 && probe.every((g) => SELECTORS["A26 Langmuir 探針"].includes(g)) &&
      probe.length === SELECTORS["A26 Langmuir 探針"].length,
    probe.join("、")
  );
  const global = modelGases("src/js/lab/global-model.js", /^\s{4}(\w+): \{$/gm);
  ok(
    "A32 的清單與 global-model.js 一致",
    global.length > 0 && global.every((g) => SELECTORS["A32 0-D 全域模型"].includes(g)) &&
      global.length === SELECTORS["A32 0-D 全域模型"].length,
    global.join("、")
  );
  const pkg = modelGases("src/js/lab/package-model.js", /id: "(\w+)", label: "[^"]*", zh:/g);
  ok(
    "A33 的清單與 package-model.js 一致(含這一輪新增的 Ar+O₂)",
    pkg.length > 0 && pkg.every((g) => SELECTORS["A33 封裝電漿"].includes(g)) &&
      pkg.length === SELECTORS["A33 封裝電漿"].length,
    pkg.join("、")
  );
}

console.log("\n【每一支氣體都查得到顏色】");
for (const [name, gases] of Object.entries(SELECTORS)) {
  const missing = gases.filter((g) => !T.gasToken(g));
  ok(
    `${name}:${gases.length} 支氣體都有對應的 token`,
    missing.length === 0,
    missing.length ? "查不到:" + missing.join("、") : gases.map((g) => `${g}→${T.gasToken(g)}`).join("  ")
  );
}

console.log("\n【同一個選單內兩兩不同色 —— 這才是真正的需求】");
for (const [name, gases] of Object.entries(SELECTORS)) {
  const tokens = gases.map((g) => T.gasToken(g));
  const uniq = new Set(tokens);
  const dupes = tokens.filter((t, i) => tokens.indexOf(t) !== i);
  ok(
    `${name}:${gases.length} 支氣體用了 ${uniq.size} 個不同顏色`,
    uniq.size === gases.length,
    dupes.length ? "撞色:" + [...new Set(dupes)].join("、") : "全部可區分"
  );
}

console.log("\n【token 名稱要真的存在於配色系統裡】");
{
  const css = readFileSync(join(ROOT, "src/css/base.css"), "utf8");
  const bad = [];
  for (const [gas, token] of Object.entries(T.GAS_TOKENS)) {
    // vizIonPos → --pa-viz-ion-pos
    const cssVar = "--pa-" + token.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
    if (!css.includes(cssVar + ":")) bad.push(`${gas}→${token}(${cssVar})`);
  }
  ok(
    "GAS_TOKENS 指到的每個 token 在 base.css 都有定義(深淺兩套主題都會跟著切)",
    bad.length === 0,
    bad.length ? bad.join("、") : `${Object.keys(T.GAS_TOKENS).length} 支氣體`
  );
}

console.log("\n【helper 的行為】");
ok("大小寫不拘(元件的 key 有大寫有小寫)", T.gasToken("AR") === T.gasToken("ar"));
ok("查不到的氣體回傳 null,由呼叫端決定 fallback", T.gasToken("Kr") === null);
ok(
  "rgbTriplet 轉得出 rgba() 用的三元組",
  T.rgbTriplet("#c73a3a") === "199,58,58",
  T.rgbTriplet("#c73a3a")
);
ok("rgbTriplet 對壞輸入回傳中性灰而不是 crash", T.rgbTriplet("nope") === "136,136,136");

console.log(`\n${fail ? "✗" : "✓"} 氣體配色 通過 ${pass} / ${pass + fail}`);
process.exit(fail ? 1 : 0);
