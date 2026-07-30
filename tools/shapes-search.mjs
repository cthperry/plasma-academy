/* 開發用:在受限的參數空間裡找出真的能重現各缺陷的設定。不進品質門。

   搜尋空間對每個缺陷都是「受限」的 —— 範圍由 3.3 圖鑑寫的成因決定,
   例如 undercut 的鈍化必須低、etch stop 必須最高、faceting 的離子必須最高。
   這樣找出來的參數才會與課文一致,而不是純粹湊出圖形。            */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ["src/js/lab/profile-engine.js", "src/js/lab/profile-shapes.js"]) {
  vm.runInContext(readFileSync(join(ROOT, f), "utf8"), sandbox, { filename: f });
}
const S = sandbox.window.PA.profileShapes;

const SCALE = Number(process.env.SCALE || 0.6);

function measure(p) {
  const sim = S.start({ multi: false, ...p }, SCALE);
  S.runToEndpoint(sim, { maxSteps: 4000 });
  const m = S.metrics(sim);
  return {
    steps: sim.steps, endpoint: sim.endpoint, depthPct: m.depthPct,
    top: m.top, mid: m.mid, bot: m.bot,
    utr: S.microtrenchDepth(sim),
    foot: S.footRatio(sim),
    mask: S.maskMetrics(sim),
    widen: S.maskMetrics(sim).widen,
    shape: S.classify(sim),
  };
}

const want = process.argv[2];

// 受限搜尋空間:每一格的範圍都對應圖鑑寫的成因
const SPACES = {
  undercut: { ion: [150, 250, 350], spread: [3, 6, 9], passiv: [0, 5, 12], radical: [75, 90, 100], reflect: [5, 15] },
  taper: { ion: [200, 300, 400], spread: [2, 4], passiv: [82, 86, 90], radical: [35, 50, 65], reflect: [5, 15, 30] },
  bowing: { ion: [400, 550, 700], spread: [4, 6, 8], passiv: [36, 42, 48], radical: [50, 65], reflect: [75, 90, 100] },
  microtrench: { ion: [500, 650, 800], spread: [1, 2, 3], passiv: [36, 42, 48], radical: [45, 60], reflect: [90, 100] },
};

// 每個缺陷的「成功」條件 —— 就是 check 會斷言的東西
const GOALS = {
  undercut: (r) => r.endpoint && r.shape.startsWith("Undercut"),
  taper: (r) => r.endpoint && r.shape.startsWith("Taper"),
  bowing: (r) => r.endpoint && r.shape.startsWith("Bowing"),
  microtrench: (r) => r.endpoint && r.shape.startsWith("Microtrench"),
};

function* combos(space) {
  const keys = Object.keys(space);
  const idx = keys.map(() => 0);
  for (;;) {
    const o = {};
    keys.forEach((k, i) => (o[k] = space[k][idx[i]]));
    yield o;
    let i = keys.length - 1;
    while (i >= 0 && ++idx[i] >= space[keys[i]].length) { idx[i] = 0; i--; }
    if (i < 0) return;
  }
}

const targets = want ? [want] : Object.keys(SPACES);
for (const name of targets) {
  console.log(`\n===== ${name} =====`);
  let n = 0;
  const hits = [];
  for (const p of combos(SPACES[name])) {
    n++;
    const r = measure(p);
    if (GOALS[name](r)) hits.push([p, r]);
  }
  console.log(`試了 ${n} 組,命中 ${hits.length} 組`);
  for (const [p, r] of hits.slice(0, 6)) {
    console.log(
      `  ion ${String(p.ion).padStart(4)} spread ${String(p.spread).padStart(2)} ` +
      `passiv ${String(p.passiv).padStart(3)} radical ${String(p.radical).padStart(3)} ` +
      `reflect ${String(p.reflect).padStart(3)}  →  ` +
      `深${r.depthPct.toFixed(0)} 頂${r.top.toFixed(0)} 中${r.mid.toFixed(0)} 底${r.bot.toFixed(0)} ` +
      `µtr${r.utr} foot${r.foot.toFixed(2)} widen${r.widen.toFixed(2)} ` +
      `步${r.steps}  ${r.shape}`
    );
  }
}
