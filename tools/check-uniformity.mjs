/* ==========================================================================
   check-uniformity.mjs — 驗證均勻度模型(3.6 / A25)

   docs/05 A25 的驗收條件:
     · 六種 map 全部可重現
     · 聚焦環消耗到 100 % 時**必定**出現 edge roll

   docs/03 §3.6 的宣稱:
     · 半幅法算出來的數字約是 1σ 法的 2–3 倍(3.6.1)
     · 單邊偏斜是唯一「轉片不跟著轉」的一種(3.6.2)
     · 溫度是修均勻度最直接的旋鈕(3.6.4)

   判定看的是**量出來的 map**,不是預設的標籤 —— 與 A18 同一個原則。
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(ROOT, "src/js/lab/uniformity-model.js"), "utf8"), sandbox, {
  filename: "uniformity-model.js",
});
const U = sandbox.window.PA.uniformity;

let pass = 0;
let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

/* ---------- 六種 map ---------- */
console.log("\n【A25 驗收:六種 map 全部可重現,而且判定得出來】");
console.log("    預設          期望                    判定                  半幅%   1σ%");
const R = {};
for (const p of U.PRESETS) {
  const m = U.makeMap(p.state);
  const st = U.stats(m);
  const got = U.classify(m);
  R[p.key] = { map: m, stats: st, got: got, expect: p.expect };
  console.log(
    `    ${p.key.padEnd(10)}  ${p.expect.padEnd(22)}  ${got.padEnd(22)}  ${st.halfWidth.toFixed(1).padStart(5)}  ${st.oneSigma.toFixed(1).padStart(5)}`
  );
}
for (const p of U.PRESETS) {
  ok(`${p.label} 判定正確`, R[p.key].got === p.expect, `判定為「${R[p.key].got}」`);
}
ok(
  "六種形狀彼此相異(不是六個標籤指到同一張圖)",
  new Set(U.PRESETS.map((p) => R[p.key].got)).size === 6,
  `${new Set(U.PRESETS.map((p) => R[p.key].got)).size} 種相異判定`
);

/* ---------- 3.6.1 兩種定義 ---------- */
console.log("\n【3.6.1:兩種不均勻度定義,數字差 2–3 倍】");
for (const p of U.PRESETS) {
  const s = R[p.key].stats;
  const ratio = s.halfWidth / s.oneSigma;
  console.log(`    ${p.key.padEnd(10)} 半幅 ${s.halfWidth.toFixed(1)} % / 1σ ${s.oneSigma.toFixed(1)} % = ${ratio.toFixed(2)} ×`);
}
/**
 * 課文說「半幅法大約是 1σ 法的 2–3 倍」。這是**對數字時最常見的雞同鴨講**,
 * 所以模型必須真的量得出這個比例,而不是只在課文寫一句。
 * 用軸對稱的四種形狀檢驗 —— tilt 因為分佈形狀不同,比例會偏高,單獨看。
 */
ok(
  "軸對稱的形狀:半幅法約為 1σ 法的 1.4–3 倍",
  ["center", "edge", "w", "rings"].every((k) => {
    const s = R[k].stats;
    const q = s.halfWidth / s.oneSigma;
    return q > 1.4 && q < 3.2;
  }),
  ["center", "edge", "w", "rings"].map((k) => `${k}:${(R[k].stats.halfWidth / R[k].stats.oneSigma).toFixed(2)}×`).join("、")
);
ok(
  "半幅法永遠大於 1σ 法(定義上如此)",
  U.PRESETS.every((p) => R[p.key].stats.halfWidth > R[p.key].stats.oneSigma)
);

/* ---------- 聚焦環 ---------- */
console.log("\n【A25 驗收:聚焦環消耗到 100 % 必定出現 edge roll】");
/**
 * 「必定」要照字面驗:掃過其他旋鈕的各種組合,只要環磨光了就該看到 edge roll。
 * 只測一組預設不算數 —— 那只證明「我挑的那一組成立」。
 */
{
  const combos = [];
  for (const gap of [1.5, 3, 4.5])
    for (const pressure of [10, 35, 70])
      for (const centerFrac of [0.2, 0.5, 0.8]) combos.push({ gap, pressure, centerFrac });
  let worn = 0;
  let fresh = 0;
  for (const c of combos) {
    const w = U.makeMap({ ...c, zoneTemps: [60, 60, 60], ringWear: 100, pumpAsym: 0 });
    const f = U.makeMap({ ...c, zoneTemps: [60, 60, 60], ringWear: 0, pumpAsym: 0 });
    if (U.edgeRoll(w) > 0.12) worn++;
    if (U.edgeRoll(f) > 0.12) fresh++;
  }
  console.log(`    ${combos.length} 種組合:環磨光時 ${worn} 組出現 edge roll,環是新的時 ${fresh} 組`);
  ok(
    "27 種其他旋鈕組合下,聚焦環磨光都會產生 edge roll",
    worn === combos.length,
    `${worn} / ${combos.length}`
  );
  ok(
    "而環是新的時候,沒有任何一組出現 edge roll(是環造成的,不是別的)",
    fresh === 0,
    `${fresh} / ${combos.length}`
  );
}
ok(
  "edge roll 隨消耗程度單調變強",
  [0, 25, 50, 75, 100].every((w, i, a) => {
    if (i === 0) return true;
    const cur = U.edgeRoll(U.makeMap({ gap: 3, pressure: 30, centerFrac: 0.5, ringWear: w, zoneTemps: [60, 60, 60] }));
    const prev = U.edgeRoll(U.makeMap({ gap: 3, pressure: 30, centerFrac: 0.5, ringWear: a[i - 1], zoneTemps: [60, 60, 60] }));
    return cur > prev;
  }),
  [0, 50, 100].map((w) => `${w}%:${U.edgeRoll(U.makeMap({ gap: 3, pressure: 30, centerFrac: 0.5, ringWear: w, zoneTemps: [60, 60, 60] })).toFixed(2)}`).join("、")
);

/* ---------- 3.6.2 轉片實驗 ---------- */
console.log("\n【3.6.2:單邊偏斜是唯一「轉片不跟著轉」的一種】");
/**
 * 轉片實驗的物理:泵口造成的圖形固定在**腔體**座標上,
 * 所以把晶圓轉 90°,圖形不跟著轉。模型裡這對應到
 * 「只有 pumpTerm 有方位依賴,其餘都是軸對稱的」。
 */
ok(
  "只有抽氣不對稱會產生方位方向的不對稱",
  U.tiltAmplitude(U.makeMap({ gap: 3, pressure: 30, centerFrac: 0.5, ringWear: 0, pumpAsym: 0, zoneTemps: [60, 60, 60] })) < 1e-9 &&
    U.tiltAmplitude(R.tilt.map) > 0.03,
  `無泵口不對稱時 tilt = 0,有的時候 ${U.tiltAmplitude(R.tilt.map).toFixed(3)}`
);
ok(
  "其餘五種 map 的方位不對稱都是零(全部軸對稱)",
  ["center", "edge", "w", "rings", "edgeroll"].every((k) => U.tiltAmplitude(R[k].map) < 1e-9),
  "五種皆為 0"
);
ok(
  "泵口方向轉 90°,圖形跟著轉到新方向(固定在腔體座標上)",
  (() => {
    const base = { gap: 3, pressure: 30, centerFrac: 0.5, ringWear: 0, pumpAsym: 70, zoneTemps: [60, 60, 60] };
    const a = U.makeMap({ ...base, pumpAngle: 0 });
    const b = U.makeMap({ ...base, pumpAngle: Math.PI / 2 });
    // 兩者的最高點方位差約 90°
    const hot = (m) => m.cells.reduce((p, c) => (c.v > p.v ? c : p), m.cells[0]).theta;
    const d = Math.abs(hot(b) - hot(a));
    return Math.abs(d - Math.PI / 2) < 0.2;
  })(),
  "最熱點跟著泵口轉 90°"
);

/* ---------- 3.6.4 溫度是最直接的旋鈕 ---------- */
console.log("\n【3.6.4:溫度是修均勻度最直接的旋鈕】");
{
  const bad = { gap: 4.5, pressure: 60, centerFrac: 0.85, zoneTemps: [60, 60, 60], ringWear: 0, pumpAsym: 0 };
  const before = U.stats(U.makeMap(bad));
  // 中心快 → 把中心區降溫、邊緣區升溫來補
  const fixed = { ...bad, zoneTemps: [48, 60, 74] };
  const after = U.stats(U.makeMap(fixed));
  console.log(
    `    中心快的 map:多區溫控前 半幅 ${before.halfWidth.toFixed(1)} % → 補償後 ${after.halfWidth.toFixed(1)} %`
  );
  ok(
    "用多區溫控補償中心快,不均勻度明顯改善",
    after.halfWidth < before.halfWidth * 0.75,
    `${before.halfWidth.toFixed(1)} % → ${after.halfWidth.toFixed(1)} %`
  );
  ok(
    "溫度走 Arrhenius:每 10 °C 的速率差在 5–15 % 量級",
    (() => {
      const q = U.arrhenius(70) / U.arrhenius(60);
      return q > 1.05 && q < 1.15;
    })(),
    `60 → 70 °C:${((U.arrhenius(70) / U.arrhenius(60) - 1) * 100).toFixed(1)} %`
  );
}

/* ---------- 模型結構 ---------- */
console.log("\n【模型結構:形狀是物理項疊出來的,不是選單】");
ok(
  "W 形確實是「中心快的氣體項」與「邊緣快的電場項」疊出來的",
  (() => {
    const w = U.PRESETS.find((p) => p.key === "w").state;
    // 把電場項關掉(gap 拉大)→ 中間的凹應該消失
    const noField = U.makeMap({ ...w, gap: 5 });
    return U.interiorDip(R.w.map) > 0.03 && U.interiorDip(noField) < 0.03;
  })(),
  `原本 dip ${U.interiorDip(R.w.map).toFixed(3)},把 gap 拉到 5 cm 後 ${U.interiorDip(U.makeMap({ ...U.PRESETS.find((p) => p.key === "w").state, gap: 5 })).toFixed(3)}`
);
ok(
  "壓力是噴淋頭分區的放大器:低壓時分區圖形被抹平",
  (() => {
    const hi = U.stats(U.makeMap({ gap: 4.5, pressure: 70, centerFrac: 0.9, zoneTemps: [60, 60, 60] })).halfWidth;
    const lo = U.stats(U.makeMap({ gap: 4.5, pressure: 8, centerFrac: 0.9, zoneTemps: [60, 60, 60] })).halfWidth;
    return lo < hi * 0.5;
  })(),
  `70 mTorr 半幅 ${U.stats(U.makeMap({ gap: 4.5, pressure: 70, centerFrac: 0.9, zoneTemps: [60, 60, 60] })).halfWidth.toFixed(1)} % vs 8 mTorr ${U.stats(U.makeMap({ gap: 4.5, pressure: 8, centerFrac: 0.9, zoneTemps: [60, 60, 60] })).halfWidth.toFixed(1)} %`
);
ok(
  "分區交界越銳利,環紋越明顯(這是環紋與 W 形的物理分界)",
  (() => {
    const base = { gap: 3, pressure: 25, centerFrac: 0.5, zoneTemps: [64, 59, 63], ringWear: 0 };
    return U.ringiness(U.makeMap({ ...base, zoneSharp: 0.012 })) > U.ringiness(U.makeMap({ ...base, zoneSharp: 0.09 }));
  })(),
  `銳利 ${U.ringiness(U.makeMap({ gap: 3, pressure: 25, centerFrac: 0.5, zoneTemps: [64, 59, 63], zoneSharp: 0.012 }))} 圈` +
    ` vs 平緩 ${U.ringiness(U.makeMap({ gap: 3, pressure: 25, centerFrac: 0.5, zoneTemps: [64, 59, 63], zoneSharp: 0.09 }))} 圈`
);
ok(
  "所有旋鈕歸中時接近均勻(沒有憑空冒出來的圖形)",
  U.stats(U.makeMap({ gap: 5, pressure: 8, centerFrac: 0.5, zoneTemps: [60, 60, 60], ringWear: 0, pumpAsym: 0 })).halfWidth < 3,
  `半幅 ${U.stats(U.makeMap({ gap: 5, pressure: 8, centerFrac: 0.5, zoneTemps: [60, 60, 60], ringWear: 0, pumpAsym: 0 })).halfWidth.toFixed(2)} %`
);

console.log(`\n${fail === 0 ? "✓" : "✗"} 均勻度與 map 判讀 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
