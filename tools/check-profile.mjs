/* ==========================================================================
   check-profile.mjs — 驗證 profile-engine.js 的定性行為

   這支引擎不做定量預測,但它必須把 docs/02 §2.2.2 描述的物理「長出來」,
   而不是靠寫死的規則。以下每一條都對應課文的一個宣稱:

     高 F/C → 不聚合 → 側壁沒保護 → undercut、選擇比 1
     中 F/C → 側壁有聚合物、溝底被離子清開 → 垂直
     低 F/C → 連溝底都蓋住 → etch stop,再低就淨沉積把開口封死
     SiO₂ 自身的氧會燒掉聚合物,Si 沒有 → 這就是選擇比的來源
     離子能量低於濺射閾值 → 沒有離子輔助 → 幾乎不蝕刻

   P3 的 A18–A23 都繼承這支引擎,所以這裡守住,後面五個元件就有共同底線。
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(ROOT, "src/js/lab/profile-engine.js"), "utf8"), sandbox, {
  filename: "profile-engine.js",
});
const P = sandbox.window.PA.profile;

let pass = 0;
let fail = 0;

function ok(label, cond, detail) {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
}

const OPEN_COLS = 16; // 開口寬度(格),由下方 openings 決定

/** 跑一輪,回傳深度、遮罩正下方的寬度、中段寬度 */
function run({ film = "oxide", fc, E = 300, steps = 500, energyThreshold } = {}) {
  const p = P.create({
    cols: 80,
    rows: 60,
    layers: [
      { material: "mask", thickness: 0.18 },
      { material: film, thickness: 0.5 },
      { material: "silicon", thickness: 0.32 },
    ],
    openings: [[0.4, 0.6]],
  });
  const top = p.depth(0.5);
  for (let i = 0; i < steps; i++) p.step({ effFC: fc, ionEnergy: E, dt: 0.05 });
  const d = p.depth(0.5);
  return {
    depth: d - top,
    widthUnderMask: p.widthAt(top + 1),
    widthMid: d > top ? p.widthAt(Math.round((top + d) / 2)) : 0,
  };
}

console.log("\n【F/C 比:蝕刻模式 → 沉積模式】");

const sweep = [4.0, 3.0, 2.5, 2.0, 1.5, 1.0].map((fc) => ({ fc, ...run({ fc }) }));
for (const r of sweep) {
  console.log(
    `    F/C=${r.fc.toFixed(1)}  深度 ${String(r.depth).padStart(2)}  ` +
      `遮罩下寬 ${String(r.widthUnderMask).padStart(2)}(開口 ${OPEN_COLS})`
  );
}

const at = (fc) => sweep.find((r) => r.fc === fc);

ok(
  "蝕刻深度隨 F/C 單調遞減(F 少了、聚合物多了)",
  sweep.every((r, i) => i === 0 || r.depth <= sweep[i - 1].depth),
  sweep.map((r) => r.depth).join(" ≥ ")
);
ok(
  "高 F/C(CF₄ 端)側壁無保護 → 遮罩下方被側蝕",
  at(4.0).widthUnderMask > OPEN_COLS * 1.3,
  `${at(4.0).widthUnderMask} 格 vs 開口 ${OPEN_COLS}`
);
ok(
  "中 F/C(C₄F₈ 端)側壁有聚合物 → 寬度守住開口,不 undercut",
  at(2.5).widthUnderMask <= OPEN_COLS && at(2.0).widthUnderMask <= OPEN_COLS,
  `F/C 2.5 → ${at(2.5).widthUnderMask}、2.0 → ${at(2.0).widthUnderMask}`
);
ok(
  "側蝕程度隨 F/C 下降而單調收斂",
  sweep.every((r, i) => i === 0 || r.widthUnderMask <= sweep[i - 1].widthUnderMask),
  sweep.map((r) => r.widthUnderMask).join(" ≥ ")
);
ok(
  "F/C 太低 → 連溝底都被蓋住 → etch stop",
  at(1.5).depth === 0,
  `F/C 1.5 深度 ${at(1.5).depth}`
);
ok(
  "F/C 更低 → 淨沉積,開口被封死",
  at(1.0).widthUnderMask === 0,
  `F/C 1.0 遮罩下寬 ${at(1.0).widthUnderMask}`
);
ok(
  "存在一個「垂直且刻得動」的製程窗",
  sweep.some((r) => r.depth > 10 && r.widthUnderMask > 0 && r.widthUnderMask <= OPEN_COLS),
  sweep
    .filter((r) => r.depth > 10 && r.widthUnderMask > 0 && r.widthUnderMask <= OPEN_COLS)
    .map((r) => "F/C " + r.fc)
    .join("、")
);

console.log("\n【選擇比:SiO₂ 對 Si —— 由材料自身的氧長出來,不是寫死的規則】");

for (const fc of [4.0, 3.0, 2.0]) {
  const o = run({ film: "oxide", fc });
  const si = run({ film: "silicon", fc });
  const ratio = si.depth > 0 ? o.depth / si.depth : Infinity;
  console.log(
    `    F/C=${fc.toFixed(1)}  SiO₂ ${String(o.depth).padStart(2)}  ` +
      `Si ${String(si.depth).padStart(2)}  選擇比 ${isFinite(ratio) ? ratio.toFixed(1) : "∞"}`
  );
}

const hiO = run({ film: "oxide", fc: 4.0 });
const hiSi = run({ film: "silicon", fc: 4.0 });
ok(
  "高 F/C 幾乎沒有選擇比(沒有聚合物可供區辨)",
  Math.abs(hiO.depth / hiSi.depth - 1) < 0.25,
  `${(hiO.depth / hiSi.depth).toFixed(2)}`
);

const loO = run({ film: "oxide", fc: 2.0 });
const loSi = run({ film: "silicon", fc: 2.0 });
ok(
  "低 F/C 時 SiO₂ 照刻、Si 被聚合物停住 → 高選擇比",
  loO.depth > 10 && loSi.depth === 0,
  `SiO₂ ${loO.depth}、Si ${loSi.depth}`
);

const loN = run({ film: "nitride", fc: 2.0 });
ok(
  "SiN 含氧量介於兩者之間 → 選擇比行為也介於兩者之間",
  loN.depth >= loSi.depth && loN.depth <= loO.depth,
  `SiO₂ ${loO.depth} ≥ SiN ${loN.depth} ≥ Si ${loSi.depth}`
);

console.log("\n【離子能量:低於濺射閾值就沒有離子輔助】");

const energies = [0, 25, 60, 150, 300, 600];
const eRuns = energies.map((E) => ({ E, ...run({ fc: 2.5, E }) }));
for (const r of eRuns) console.log(`    E=${String(r.E).padStart(3)} eV  深度 ${r.depth}`);

ok(
  "E ≤ 25 eV(閾值)幾乎不蝕刻 —— 浮接表面刻不動的原因",
  eRuns.find((r) => r.E === 0).depth <= 2 && eRuns.find((r) => r.E === 25).depth <= 2,
  `0 eV → ${eRuns.find((r) => r.E === 0).depth}、25 eV → ${eRuns.find((r) => r.E === 25).depth}`
);
ok(
  "蝕刻深度隨離子能量單調上升",
  eRuns.every((r, i) => i === 0 || r.depth >= eRuns[i - 1].depth),
  eRuns.map((r) => r.depth).join(" ≤ ")
);
ok(
  "離子產額遵循 √E − √E_th(Steinbrüchel)",
  Math.abs(P.ionYield(100, 25) - (10 - 5)) < 1e-9 && P.ionYield(25, 25) === 0
);

console.log("\n【通量的方向性 —— 異向性的來源】");
{
  const p = P.create({
    cols: 60,
    rows: 50,
    layers: [
      { material: "mask", thickness: 0.2 },
      { material: "oxide", thickness: 0.8 },
    ],
    openings: [[0.4, 0.6]],
  });
  for (let i = 0; i < 200; i++) p.step({ effFC: 2.5, ionEnergy: 300, dt: 0.05 });
  const d = p.depth(0.5);
  const midY = Math.round(d * 0.6);
  // 溝內找一個側壁格與一個溝底格
  let wallX = -1;
  for (let x = 0; x < p.cols; x++) {
    if (p.mat[p.idx(x, midY)] !== 0 && p.exposed(x, midY)) {
      wallX = x;
      break;
    }
  }
  const centerX = Math.round(p.cols / 2);
  ok(
    "側壁的離子通量為 0(被自己上緣遮住)",
    wallX >= 0 && p.ionFlux(wallX, midY) === 0,
    `側壁 x=${wallX}`
  );
  ok("溝底的離子通量為 1(直視電漿)", p.ionFlux(centerX, d - 1) === 1);
  ok(
    "自由基通量隨深度下降(ARDE / RIE lag 的來源)",
    p.neutralFlux(centerX, d - 1) < p.neutralFlux(centerX, 1),
    `溝底 ${p.neutralFlux(centerX, d - 1).toFixed(2)} < 開口 ${p.neutralFlux(centerX, 1).toFixed(2)}`
  );
}

console.log(`\n${fail === 0 ? "✓" : "✗"} 輪廓引擎 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
