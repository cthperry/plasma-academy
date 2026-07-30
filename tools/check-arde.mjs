/* ==========================================================================
   check-arde.mjs — 驗證 ARDE 模型(3.3 / A20)

   docs/05 A20 的驗收條件:
     · 四個成因各自關閉時,ARDE 程度有明顯差異   → 這裡逐一驗
     · 反向 ARDE 模式可重現                      → **未達成**,見下方說明

   docs/03 §3.3.2 的宣稱:
     · 窄的比寬的淺,而且深度隨 CD 單調
     · 延長時間差距反而拉大(所以 ARDE 不能靠時間解決)
     · 降壓、脈衝、低黏著係數各自改善 ARDE

   ⚠️ **反向 ARDE(窄的反而更深)本模型做不到**,只做到「把 ARDE 壓小」
   (27 % → 18 %)。原因記在 docs/11:聚合物在 AR→0 時供應最大,
   強到足以翻轉深度排序之前,會先把最寬的溝在開口就封死(那是 etch stop)。
   要跨過這一步得把「離子驅動的聚合物清除」也寫進去,而那一項又會把
   深度依賴反轉回來 —— 需要完整的聚合物收支,不是這支一維模型的範圍。
   **這裡不為了讓它變綠而放寬斷言**,而是把「壓小」這件真的成立的事寫成斷言。
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(ROOT, "src/js/lab/arde-model.js"), "utf8"), sandbox, {
  filename: "arde-model.js",
});
const A = sandbox.window.PA.arde;

let pass = 0;
let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

const D = 3; // 比較點:最寬的那條蝕到深度 3
const base = { pressure: 20, sticking: 0.25, polyStrength: 0, pulseDuty: 1 };

console.log("\n【五種 CD 並排,蝕到最寬的達到深度 3】");
console.log("    預設        " + A.WIDTHS.map((w) => w.toFixed(2)).join("  ") + "   ARDE");
const R = {};
for (const p of A.PRESETS) {
  const r = A.runToDepth(p.state, D);
  R[p.key] = r;
  console.log(
    `    ${p.key.padEnd(10)}` + r.map((x) => x.depth.toFixed(2)).join("  ") +
      `   ${(A.ardeMagnitude(r) * 100).toFixed(1)} %`
  );
}

console.log("\n【基本行為:窄的比寬的淺,而且單調】");
ok(
  "深度隨 CD 變窄而單調變淺",
  R.normal.every((x, i, a) => i === 0 || x.depth < a[i - 1].depth),
  R.normal.map((x) => x.depth.toFixed(2)).join(" > ")
);
ok(
  "最窄的 CD 深寬比最高(ARDE 的定義前提)",
  R.normal[R.normal.length - 1].ar > R.normal[0].ar,
  `AR ${R.normal[0].ar.toFixed(1)} → ${R.normal[R.normal.length - 1].ar.toFixed(1)}`
);
ok(
  "一般條件下 ARDE 落在 25–50 %(與 3.3.2 的量級一致)",
  A.ardeMagnitude(R.normal) > 0.25 && A.ardeMagnitude(R.normal) < 0.5,
  `${(A.ardeMagnitude(R.normal) * 100).toFixed(1)} %`
);

console.log("\n【A20 驗收:四個成因各自關閉時,ARDE 程度有明顯差異】");
const c = A.contributions(base, D);
for (const k of ["knudsen", "shadow", "product", "charging"]) {
  console.log(`    ${A.LABELS[k].padEnd(18)} 關掉後 ARDE 少 ${(c[k] * 100).toFixed(1)} 個百分點`);
}
ok(
  "四個成因全部有正貢獻(關掉任何一個 ARDE 都變小)",
  ["knudsen", "shadow", "product", "charging"].every((k) => c[k] > 0),
  ["knudsen", "shadow", "product", "charging"].map((k) => `${k}:${(c[k] * 100).toFixed(1)}`).join("、")
);
/**
 * 「有明顯差異」要照字面驗:四項的貢獻不能全部擠在一起,
 * 否則 A20 的分項開關就沒有教學意義了。
 */
ok(
  "四項的貢獻分得開(最大者至少是最小者的 3 倍)",
  (() => {
    const vs = ["knudsen", "shadow", "product", "charging"].map((k) => c[k]);
    return Math.max(...vs) > Math.min(...vs) * 3;
  })(),
  `最大 ${(Math.max(c.knudsen, c.shadow, c.product, c.charging) * 100).toFixed(1)} vs 最小 ${(Math.min(c.knudsen, c.shadow, c.product, c.charging) * 100).toFixed(1)} 個百分點`
);
ok(
  "四項全部關掉時完全沒有 ARDE(沒有憑空冒出來的深度差)",
  (() => {
    const r = A.runToDepth(
      Object.assign({}, base, { on: { knudsen: false, shadow: false, product: false, charging: false } }),
      D
    );
    return Math.abs(A.ardeMagnitude(r)) < 0.01;
  })(),
  "ARDE ≈ 0"
);

console.log("\n【3.3.2:三個對策旋鈕各自改善 ARDE】");
const m = (st) => A.ardeMagnitude(A.runToDepth(Object.assign({}, base, st), D));
ok(
  "降壓改善 ARDE(離子方向性提升)",
  m({ pressure: 5 }) < m({}),
  `20 mTorr ${(m({}) * 100).toFixed(1)} % → 5 mTorr ${(m({ pressure: 5 }) * 100).toFixed(1)} %`
);
ok(
  "升壓惡化 ARDE(方向的另一端也要成立)",
  m({ pressure: 60 }) > m({}),
  `60 mTorr ${(m({ pressure: 60 }) * 100).toFixed(1)} %`
);
ok(
  "脈衝電漿改善 ARDE(off 期中和孔底充電)",
  m({ pulseDuty: 0.4 }) < m({}),
  `連續波 ${(m({}) * 100).toFixed(1)} % → 脈衝 ${(m({ pulseDuty: 0.4 }) * 100).toFixed(1)} %`
);
ok(
  "低黏著係數的自由基改善 ARDE(進得去深孔)",
  m({ sticking: 0.05 }) < m({}) && m({ sticking: 0.8 }) > m({}),
  `0.05 → ${(m({ sticking: 0.05 }) * 100).toFixed(1)} %、0.8 → ${(m({ sticking: 0.8 }) * 100).toFixed(1)} %`
);
ok(
  "壓力是透過**離子角度發散**起作用的(不是只有產物排出那一小項)",
  A.divTanOf(60) > A.divTanOf(5) * 1.5,
  `5 mTorr θ=${((Math.atan(A.divTanOf(5)) * 180) / Math.PI).toFixed(1)}° → 60 mTorr θ=${((Math.atan(A.divTanOf(60)) * 180) / Math.PI).toFixed(1)}°`
);

console.log("\n【觀察點:延長時間差距反而拉大 —— 所以 ARDE 不能靠時間解決】");
{
  const rows = [4, 8, 16, 32].map((t) => {
    const r = A.run(base, t);
    return { t, wide: r[0].depth, narrow: r[4].depth, arde: A.ardeMagnitude(r) };
  });
  for (const x of rows) {
    console.log(
      `    t=${String(x.t).padStart(2)}  寬 ${x.wide.toFixed(2)}  窄 ${x.narrow.toFixed(2)}  ARDE ${(x.arde * 100).toFixed(1)} %`
    );
  }
  ok(
    "時間越長 ARDE 越大(不是越小)",
    rows.every((x, i, a) => i === 0 || x.arde > a[i - 1].arde),
    rows.map((x) => `${(x.arde * 100).toFixed(1)}`).join(" < ")
  );
  ok(
    "窄溝槽的瞬時速率隨深度持續下降(這就是拉大的原因)",
    A.rateAt(0.5, 0.4, A.norm(base)) > A.rateAt(1.5, 0.4, A.norm(base)) &&
      A.rateAt(1.5, 0.4, A.norm(base)) > A.rateAt(2.5, 0.4, A.norm(base)),
    "深度 0.5 / 1.5 / 2.5 的速率遞減"
  );
}

console.log("\n【聚合物:壓小 ARDE(⚠ 但沒有翻負 —— 未達成的驗收條件)】");
{
  const low = A.ardeMagnitude(A.runToDepth({ pressure: 5, sticking: 0.06, polyStrength: 0, pulseDuty: 0.5 }, D));
  const high = A.ardeMagnitude(A.runToDepth({ pressure: 5, sticking: 0.06, polyStrength: 8, pulseDuty: 0.5 }, D));
  console.log(`    無聚合 ${(low * 100).toFixed(1)} % → 高聚合 ${(high * 100).toFixed(1)} %`);
  ok(
    "加聚合性氣體會把 ARDE 壓小(聚合物更進不去窄孔)",
    high < low * 0.8,
    `${(low * 100).toFixed(1)} % → ${(high * 100).toFixed(1)} %`
  );
  ok(
    "聚合物的黏著係數遠高於自由基 —— 這個落差是上一條的來源",
    A.POLY_STICKING > 0.5 && A.POLY_STICKING > 0.06 * 5,
    `聚合物 ${A.POLY_STICKING} vs 自由基典型 0.05–0.25`
  );
  /**
   * 誠實記錄未達成的部分:模型做不到「窄的反而更深」。
   * 這一條斷言的是**目前的真實狀態**,不是驗收條件 ——
   * 如果哪天做到了,這條會失敗並提醒接手的人去更新課文與 docs/11。
   */
  ok(
    "【已知限制】目前仍是正的 ARDE,沒有翻負;課文與 docs/11 已如實標註",
    high > 0,
    `高聚合區仍為 +${(high * 100).toFixed(1)} %(真實製程會翻負,見 docs/11 的診斷）`
  );
}

console.log("\n【模型結構】");
/**
 * CD 範圍要落在真實 ARDE 研究的尺度。
 * 注意「名目 AR」與「實際到達的 AR」不一樣:最窄的那條若跟得上會到 AR 7.5
 * (深度 3 ÷ 寬 0.4),但它正是因為 ARDE 才跟不上,實際只到 4.7。
 * 斷言要寫實際量到的那一個。
 */
ok(
  "比較點的實際 AR 範圍是 3.0–4.7,窄的 AR 高於寬的",
  R.normal[0].ar > 2.5 && R.normal[4].ar > R.normal[0].ar && R.normal[4].ar < 6,
  `實際 AR ${R.normal[0].ar.toFixed(1)} → ${R.normal[4].ar.toFixed(1)}` +
    `(名目 ${(D / A.WIDTHS[4]).toFixed(1)},差距就是 ARDE)`
);
ok(
  "移除與沉積是相減的競爭(不是相除的折扣)",
  A.rateAt(1, 1, A.norm({ polyStrength: 8 })) < A.rateAt(1, 1, A.norm({ polyStrength: 0 })) &&
    A.rateAt(1, 1, A.norm({ polyStrength: 60 })) === 0,
  "聚合強到一定程度速率會歸零(etch stop),而不是無限趨近於零"
);

console.log(`\n${fail === 0 ? "✓" : "✗"} ARDE 與深寬比效應 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
