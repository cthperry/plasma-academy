/* ==========================================================================
   check-shapes.mjs — A18 蝕刻輪廓模擬器的驗收條件

   docs/05 給 A18 的驗收條件是兩句話:
     · 八種 profile 全部可重現且視覺特徵明確可辨
     · 參數方向與 3.3 圖鑑的對策一致(例如「降壓」確實改善 bowing)

   這兩句話都不是「看畫面覺得像」就算過的,所以在這裡把它變成斷言。
   跑的是 src/js/lab/profile-shapes.js —— 與瀏覽器裡完全同一份程式碼,
   所以這支通過就代表元件真的做得到,不是另外寫一套來自我證明。

   判定一律走 classify(),而 classify() 只看量出來的尺寸,
   不看「使用者選了哪個預設」—— 否則就是自己出題自己改。
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of [
  "src/data/defects.js",
  "src/js/lab/profile-engine.js",
  "src/js/lab/profile-shapes.js",
]) {
  vm.runInContext(readFileSync(join(ROOT, f), "utf8"), sandbox, { filename: f });
}
const PA = sandbox.window.PA;
const S = PA.profileShapes;
const D = PA.defects;

// 縮小格點以維持檢查速度。深寬比與層厚比例不變,定性行為一致。
const SCALE = Number(process.env.SHAPES_SCALE || 0.55);

let pass = 0;
let fail = 0;
function ok(label, cond, detail) {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
}

/** 跑到終點再過蝕刻,回傳量測與判定 —— 與 A18 畫面上的數字同一條路徑 */
function run(params, opts) {
  const sim = S.start({ multi: false, ...params }, SCALE);
  S.runToEndpoint(sim, { maxSteps: 4000, ...(opts || {}) });
  const m = S.metrics(sim);
  return {
    sim,
    steps: sim.steps,
    reachedEndpoint: sim.endpoint != null,
    depthPct: m.depthPct,
    top: m.top,
    mid: m.mid,
    bot: m.bot,
    utr: S.microtrenchDepth(sim),
    foot: S.footRatio(sim),
    widen: S.maskMetrics(sim).widen,
    shape: S.classify(sim),
  };
}

const VERTICAL = { ion: 350, spread: 4, passiv: 45, radical: 60, reflect: 20, multi: false };

// 八種 profile 與各自「應該被判定成什麼」
const CASES = [
  ["vertical", VERTICAL, "垂直"],
  ["undercut", null, "Undercut"],
  ["taper", null, "Taper"],
  ["bowing", null, "Bowing"],
  ["microtrench", null, "Microtrench"],
  ["footing", null, "Footing"],
  ["faceting", null, "Faceting"],
  ["etch-stop", null, "Etch stop"],
];

console.log("\n【驗收 1:八種 profile 全部可重現,而且判定得出來】");
console.log(
  "    " + "預設".padEnd(12) + "深%".padStart(5) + "頂%".padStart(6) + "中%".padStart(6) +
  "底%".padStart(6) + "µtr".padStart(5) + "foot".padStart(6) + "widen".padStart(7) + "  判定"
);

const R = {};
for (const [key, override, expect] of CASES) {
  const p = override || D.byId(key).profile;
  const r = run(p);
  R[key] = r;
  console.log(
    "    " + key.padEnd(12) +
      r.depthPct.toFixed(0).padStart(5) + r.top.toFixed(0).padStart(6) +
      r.mid.toFixed(0).padStart(6) + r.bot.toFixed(0).padStart(6) +
      String(r.utr).padStart(5) + r.foot.toFixed(2).padStart(6) +
      r.widen.toFixed(2).padStart(7) + "  " + r.shape
  );
}
for (const [key, , expect] of CASES) {
  ok(`${key} 被判定為「${expect}」`, R[key].shape.startsWith(expect), R[key].shape);
}

console.log("\n【驗收 1b:每一種都與「垂直」對照組有可量測的差異】");
for (const [key] of CASES) {
  if (key === "vertical") continue;
  const r = R[key];
  const v = R.vertical;
  const diff = Math.max(
    Math.abs(r.top - v.top),
    Math.abs(r.mid - v.mid),
    Math.abs(r.bot - v.bot),
    Math.abs(r.depthPct - v.depthPct),
    Math.abs(r.utr - v.utr) * 5,
    Math.abs(r.foot - v.foot) * 100,
    Math.abs(r.widen - v.widen) * 100
  );
  ok(`${key} 與垂直的差異可量測`, diff > 10, `最大差 ${diff.toFixed(0)}`);
}

console.log("\n【驗收 1c:課文的定性宣稱】");
ok(
  "只有 etch stop 蝕不到終點,其餘七種都到得了(才有可比性)",
  !R["etch-stop"].reachedEndpoint &&
    CASES.filter(([k]) => k !== "etch-stop").every(([k]) => R[k].reachedEndpoint),
  CASES.filter(([k]) => !R[k].reachedEndpoint).map(([k]) => k).join("、") || "全部到達"
);
ok(
  "faceting 的遮罩開口變寬最多(3.1.6 的角度依賴削掉遮罩肩部)",
  CASES.every(([k]) => R[k].widen <= R.faceting.widen),
  `faceting widen ${R.faceting.widen.toFixed(2)}`
);
ok(
  "undercut 頂部最寬、bowing 中段最寬 —— 這正是圖鑑的診斷區分",
  R.undercut.top >= R.undercut.mid && R.bowing.mid > R.bowing.top,
  `undercut 頂 ${R.undercut.top.toFixed(0)} ≥ 中 ${R.undercut.mid.toFixed(0)};` +
    `bowing 中 ${R.bowing.mid.toFixed(0)} > 頂 ${R.bowing.top.toFixed(0)}`
);
ok(
  "microtrench 的溝底兩側比中央深,其餘 profile 不是",
  R.microtrench.utr >= 3 && R.vertical.utr < 3 && R.taper.utr < 3,
  `microtrench ${R.microtrench.utr}、垂直 ${R.vertical.utr}、taper ${R.taper.utr}`
);
ok(
  "footing 的界面處被夾住,垂直的沒有",
  R.footing.foot < 0.62 && R.vertical.foot > 0.7,
  `footing ${R.footing.foot.toFixed(2)} < 垂直 ${R.vertical.foot.toFixed(2)}`
);

console.log("\n【驗收 2:參數方向與 3.3 圖鑑的對策一致】");

/**
 * 圖鑑每一條的 fixes 都寫了「旋鈕 + 方向」。這裡把其中能對應到 A18
 * 滑桿的那幾條,真的照著調一次,看缺陷有沒有改善。
 * 改善的定義寫在每一條的 better() 裡 —— 用量測值,不用眼睛。
 */
const FIXES = [
  {
    defect: "bowing",
    knob: "壓力 ↓",
    apply: (p) => ({ ...p, spread: 2 }),
    why: "降壓 → 鞘層碰撞少 → 離子角度發散小",
    better: (a, b) => b.mid < a.mid,
    show: (r) => `中段 ${r.mid.toFixed(0)}`,
  },
  {
    defect: "bowing",
    knob: "離子鏡面反射 ↓",
    apply: (p) => ({ ...p, reflect: 0 }),
    why: "沒有反射,離子就到不了側壁中段",
    better: (a, b) => b.mid < a.mid,
    show: (r) => `中段 ${r.mid.toFixed(0)}`,
  },
  {
    defect: "microtrench",
    knob: "離子鏡面反射 ↓",
    apply: (p) => ({ ...p, reflect: 0 }),
    why: "兩道深溝完全來自反射,關掉就沒有",
    better: (a, b) => b.utr < a.utr,
    show: (r) => `溝底兩側−中央 ${r.utr}`,
  },
  {
    defect: "etch-stop",
    knob: "聚合性氣體 ↓",
    apply: (p) => ({ ...p, passiv: 58 }),
    why: "聚合物沉積降到移除之下,蝕刻才會恢復",
    better: (a, b) => b.depthPct > a.depthPct + 15,
    show: (r) => `深度 ${r.depthPct.toFixed(0)} %`,
  },
  {
    defect: "undercut",
    knob: "聚合性氣體 ↑",
    apply: (p) => ({ ...p, passiv: 55 }),
    why: "側壁長出鈍化層才擋得住化學蝕刻",
    better: (a, b) => b.top < a.top,
    show: (r) => `頂部 ${r.top.toFixed(0)}`,
  },
  {
    defect: "faceting",
    knob: "Bias 功率 ↓",
    apply: (p) => ({ ...p, ion: 300 }),
    why: "濺鍍產額隨能量下降,遮罩肩部就守得住",
    better: (a, b) => b.widen < a.widen,
    show: (r) => `遮罩開口 ${r.widen.toFixed(2)}×`,
  },
  {
    defect: "taper",
    knob: "聚合性氣體 ↓",
    apply: (p) => ({ ...p, passiv: 45 }),
    why: "鈍化過度才會上寬下窄,降下來側壁就打直",
    better: (a, b) => b.bot / b.top > a.bot / a.top,
    show: (r) => `底/頂 ${(r.bot / r.top).toFixed(2)}`,
  },
];

for (const f of FIXES) {
  const base = D.byId(f.defect).profile;
  const before = R[f.defect] || run(base);
  const after = run(f.apply(base));
  const good = f.better(before, after);
  ok(
    `${D.byId(f.defect).zh.replace(/\(.*\)/, "").trim()}:「${f.knob}」有改善`,
    good,
    `${f.show(before)} → ${f.show(after)}(${f.why})`
  );
}

console.log("\n【驗收 3:ARDE —— 窄的就是比較淺,而且是引擎自己長出來的】");
{
  const sim = S.start({ ...D.byId("arde").profile, multi: true }, SCALE);
  S.runToEndpoint(sim, { maxSteps: 4000 });
  const d = S.depthsPerOpening(sim);
  console.log(
    "    " + d.map((x, i) => `開口 ${i + 1} 深度 ${x.depth}`).join(" / ") + `(步數 ${sim.steps})`
  );
  ok("窄溝比寬溝淺", d[0].depth < d[d.length - 1].depth, `${d[0].depth} < ${d[d.length - 1].depth}`);
  ok(
    "深度隨開口寬度單調不減",
    d.every((x, i) => i === 0 || x.depth >= d[i - 1].depth),
    d.map((x) => x.depth).join(" ≤ ")
  );
  ok(
    "落差夠明顯(> 15 %),不是數值雜訊",
    (d[d.length - 1].depth - d[0].depth) / d[d.length - 1].depth > 0.15,
    `${(((d[d.length - 1].depth - d[0].depth) / d[d.length - 1].depth) * 100).toFixed(0)} %`
  );
}

console.log("\n【驗收 4:滑桿範圍與圖鑑的預設一致】");
{
  const withProfile = D.all.filter((x) => x.profile);
  const bad = [];
  for (const d of withProfile) {
    for (const k of Object.keys(S.RANGES)) {
      const v = d.profile[k];
      if (v == null || v < S.RANGES[k].min || v > S.RANGES[k].max) bad.push(`${d.id}.${k}=${v}`);
    }
  }
  ok("圖鑑的每個 profile 參數都落在滑桿範圍內", bad.length === 0, bad.join("、"));
  ok("八種預設都有 reflect 欄位", withProfile.every((d) => d.profile.reflect != null));
}

console.log(`\n${fail === 0 ? "✓" : "✗"} A18 輪廓形狀 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
