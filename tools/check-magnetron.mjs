/* ==========================================================================
   check-magnetron.mjs — 驗證磁控濺鍍與反應式濺鍍模型(3.5 / A24)

   docs/03 §3.5 與 docs/05 A24 的宣稱,全部在這裡變成斷言:

     · 磁場把電子束縛住 → 游離效率大增(A24 驗收:B=0 時掉一個數量級)
     · 代價是 racetrack → 靶材利用率 20–40 %(3.5.2)
     · 濺鍍產額 Y(500 eV) 與課文表格一致,低於閾值不濺鍍(3.5.1)
     · 反應式濺鍍有**雙值區**,升流量與降流量走不同的路(3.5.3)
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(ROOT, "src/js/lab/magnetron-model.js"), "utf8"), sandbox, {
  filename: "magnetron-model.js",
});
const M = sandbox.window.PA.magnetron;

let pass = 0;
let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

/* ---------- 濺鍍產額 ---------- */
console.log("\n【濺鍍產額 —— 與 3.5.1 的表格一致】");
const Y500 = { al: 1.0, ti: 0.6, cu: 2.3, w: 0.6, ta: 0.6 };
ok(
  "五種靶材的 Y(Ar⁺ 500 eV) 與課文表格完全相符",
  Object.keys(Y500).every((k) => Math.abs(M.yieldAt(k, 500) - Y500[k]) < 1e-9),
  Object.keys(Y500).map((k) => `${M.TARGETS[k].label} ${M.yieldAt(k, 500).toFixed(1)}`).join("、")
);
ok(
  "Cu 的產額最高、Ti/W/Ta 最低(3.5.1 的排序)",
  M.yieldAt("cu", 500) > M.yieldAt("al", 500) &&
    M.yieldAt("al", 500) > M.yieldAt("ti", 500),
  `Cu ${M.yieldAt("cu", 500)} > Al ${M.yieldAt("al", 500)} > Ti ${M.yieldAt("ti", 500)}`
);
ok(
  "閾值能量落在 20–40 eV(約昇華熱的 4 倍)",
  Object.keys(M.TARGETS).every((k) => M.TARGETS[k].eth >= 20 && M.TARGETS[k].eth <= 40),
  Object.keys(M.TARGETS).map((k) => `${M.TARGETS[k].label} ${M.TARGETS[k].eth}`).join("、")
);
ok(
  "低於閾值完全不濺鍍",
  Object.keys(M.TARGETS).every((k) => M.yieldAt(k, M.TARGETS[k].eth - 1) === 0),
  "每種靶材在 E_th − 1 eV 都是 0"
);
ok(
  "熔點高、鍵結強的 W/Ta 閾值高於 Cu",
  M.TARGETS.w.eth > M.TARGETS.cu.eth && M.TARGETS.ta.eth > M.TARGETS.cu.eth,
  `W ${M.TARGETS.w.eth} / Ta ${M.TARGETS.ta.eth} > Cu ${M.TARGETS.cu.eth}`
);

/* ---------- 磁控 ---------- */
console.log("\n【磁控:Hall 參數決定一切】");
const effOff = M.ionizationEfficiency(0, 3);
const effOn = M.ionizationEfficiency(300, 3);
console.log(
  `    3 mTorr:B=0 → h ${M.hallParameter(0, 3).toFixed(2)}、效率 ${effOff.toFixed(1)}` +
    `  ·  B=300 G → h ${M.hallParameter(300, 3).toFixed(1)}、效率 ${effOn.toFixed(0)}`
);
ok(
  "A24 驗收:磁場為 0 時游離效率下降一個數量級以上",
  effOn / effOff >= 10,
  `300 G 是無磁場的 ${(effOn / effOff).toFixed(0)} 倍`
);
ok(
  "無磁場時等效路徑放大倍率剛好是 1(沒有束縛就沒有加成)",
  M.pathEnhancement(0, 3) === 1
);
ok(
  "磁場越強束縛越好 —— 效率單調上升",
  [50, 150, 300, 500].every((g, i, a) => i === 0 || M.ionizationEfficiency(g, 3) > M.ionizationEfficiency(a[i - 1], 3)),
  [50, 150, 300, 500].map((g) => `${g}G:${M.ionizationEfficiency(g, 3).toFixed(0)}`).join("、")
);
/**
 * 這一條是磁控的**核心賣點**,也是最容易講反的地方:
 * 壓力越低,碰撞時間 τ 越長 → h 越大 → 束縛越好。
 * 所以磁控在低壓反而更有效率,而二極濺鍍非得靠高壓補碰撞次數不可。
 */
ok(
  "壓力越低 Hall 參數越大 —— 這就是磁控能在 1–5 mTorr 工作的原因",
  M.hallParameter(300, 3) > M.hallParameter(300, 30) &&
    M.hallParameter(300, 30) > M.hallParameter(300, 60),
  `3 mTorr h=${M.hallParameter(300, 3).toFixed(1)} > 30 mTorr h=${M.hallParameter(300, 30).toFixed(1)}` +
    ` > 60 mTorr h=${M.hallParameter(300, 60).toFixed(1)}`
);
ok(
  "典型磁控條件(300 G / 3 mTorr)的 h 遠大於 1(電子被牢牢綁住)",
  M.hallParameter(300, 3) > 5,
  `h = ${M.hallParameter(300, 3).toFixed(1)}`
);

console.log("\n【Racetrack:束縛得最好的那一圈被轟得最兇】");
const prof = M.erosionProfile(300, 3);
const peakIdx = prof.indexOf(Math.max(...prof));
const peakX = -1 + (2 * peakIdx) / (prof.length - 1);
ok(
  "侵蝕最深處落在 racetrack 半徑上,不在靶心也不在邊緣",
  Math.abs(Math.abs(peakX) - M.TRACK_R) < 0.06,
  `最深處 |x| = ${Math.abs(peakX).toFixed(2)},racetrack 半徑 ${M.TRACK_R}`
);
ok(
  "靶心的侵蝕遠小於 racetrack(所以中央那一塊幾乎沒被用到)",
  prof[Math.floor(prof.length / 2)] < 0.2,
  `靶心相對侵蝕 ${prof[Math.floor(prof.length / 2)].toFixed(2)}`
);
const util = M.targetUtilization(300, 3);
ok(
  "3.5.2 的靶材利用率 20–40 %",
  util >= 0.2 && util <= 0.4,
  `${(util * 100).toFixed(0)} %`
);
/**
 * 利用率與游離效率是**同一個磁場拱的兩面**:
 * 磁場越強、束縛越集中 → 效率越好,但侵蝕輪廓越尖、利用率越差。
 * 這個取捨是 A24 要讓人看見的東西,所以單獨斷言。
 */
ok(
  "沒有磁場時輪廓是平的 → 利用率接近 100 %(但那時根本點不起低壓電漿)",
  M.targetUtilization(0, 3) > 0.95,
  `${(M.targetUtilization(0, 3) * 100).toFixed(0)} %`
);
ok(
  "束縛越集中,利用率越差 —— 效率與利用率是同一個取捨的兩端",
  M.targetUtilization(500, 3) < M.targetUtilization(30, 3),
  `500 G ${(M.targetUtilization(500, 3) * 100).toFixed(0)} % < 30 G ${(M.targetUtilization(30, 3) * 100).toFixed(0)} %`
);
ok(
  "累積使用時數越長,最深處越深,到壽命就該換靶",
  M.erosionDepth(300, 3, 100, 5) < M.erosionDepth(300, 3, 400, 5) &&
    M.erosionDepth(300, 3, 2000, 5) === 1,
  `100 h ${(M.erosionDepth(300, 3, 100, 5) * 100).toFixed(0)} % → 400 h ${(M.erosionDepth(300, 3, 400, 5) * 100).toFixed(0)} %`
);

/* ---------- 反應式濺鍍 ---------- */
console.log("\n【反應式濺鍍:遲滯與雙值區】");
const br = M.bistableRange();
const iLo = br.flows.indexOf(br.lo);
const iHi = br.flows.indexOf(br.hi);
console.log(
  `    雙值區 流量 ${br.lo} → ${br.hi} sccm(最大覆蓋率落差 ${br.gap.toFixed(2)})`
);
console.log("    流量    升 θ / 沉積率      降 θ / 沉積率");
for (let i = 0; i < br.flows.length; i += 8) {
  const u = br.sweep.up[i];
  const d = br.sweep.down[i];
  console.log(
    `    ${String(br.flows[i]).padStart(5)}   ${u.theta.toFixed(2)} / ${u.rate.toFixed(2)}` +
      `        ${d.theta.toFixed(2)} / ${d.rate.toFixed(2)}` +
      (Math.abs(u.theta - d.theta) > 0.15 ? "   ← 雙值" : "")
  );
}
ok(
  "存在雙值區 —— 升流量與降流量走的不是同一條路",
  br.lo != null && br.hi != null && br.hi > br.lo,
  `流量 ${br.lo} → ${br.hi} sccm`
);
ok(
  "流量為 0 時是乾淨的金屬模式(沉積率最高)",
  br.sweep.up[0].theta < 0.02 && br.sweep.up[0].rate > 0.98,
  `θ ${br.sweep.up[0].theta.toFixed(2)}、沉積率 ${br.sweep.up[0].rate.toFixed(2)}`
);
ok(
  "流量夠大時兩條分支都落在中毒模式(雙值區只在中間)",
  br.sweep.up[br.flows.length - 1].theta > 0.9 &&
    br.sweep.down[br.flows.length - 1].theta > 0.9,
  `θ ${br.sweep.up[br.flows.length - 1].theta.toFixed(2)}`
);
ok(
  "中毒之後沉積率驟降(化合物的濺鍍產額低得多)",
  br.sweep.up[br.flows.length - 1].rate < 0.35 &&
    br.sweep.up[0].rate / br.sweep.up[br.flows.length - 1].rate > 3,
  `金屬模式 ${br.sweep.up[0].rate.toFixed(2)} → 中毒模式 ${br.sweep.up[br.flows.length - 1].rate.toFixed(2)}` +
    `(掉了 ${(br.sweep.up[0].rate / br.sweep.up[br.flows.length - 1].rate).toFixed(1)} 倍)`
);
/**
 * 遲滯的方向必須是對的:**同一個流量下,「降下來」的那一支比較毒**。
 * 反過來就不是遲滯了。
 */
ok(
  "雙值區內,降流量那一支的覆蓋率比較高(方向正確)",
  br.sweep.down[iLo].theta > br.sweep.up[iLo].theta &&
    br.sweep.down[iHi].theta > br.sweep.up[iHi].theta,
  `流量 ${br.lo}:降 ${br.sweep.down[iLo].theta.toFixed(2)} > 升 ${br.sweep.up[iLo].theta.toFixed(2)}`
);
ok(
  "雙值區內兩條分支的沉積率差距很大(製程設在這裡會來回跳)",
  br.sweep.up[iHi].rate / br.sweep.down[iHi].rate > 1.5,
  `流量 ${br.hi}:升 ${br.sweep.up[iHi].rate.toFixed(2)} vs 降 ${br.sweep.down[iHi].rate.toFixed(2)}`
);
/**
 * 遲滯的來源要被單獨守住,否則它會退化成「調參數調出來的形狀」。
 * 把基板/腔壁的 gettering 拿掉(as → 靶面的量級),雙值區就應該消失 ——
 * 因為正回饋本來就在氣體收支,不在靶面。第一版模型只寫靶面,完全沒有遲滯。
 */
{
  const saved = M.RX.as;
  M.RX.as = 2;
  const flat = M.bistableRange();
  M.RX.as = saved;
  ok(
    "把基板/腔壁的 gettering 拿掉,雙值區就消失 —— 正回饋確實來自氣體收支",
    flat.lo == null,
    `as=2 時最大落差僅 ${flat.gap.toFixed(3)}`
  );
}
ok(
  "化合物的濺鍍產額遠低於金屬(遲滯的第三個必要條件)",
  M.COMPOUND_YIELD_RATIO < 0.25,
  `Y_compound / Y_metal = ${M.COMPOUND_YIELD_RATIO.toFixed(2)}`
);

console.log(`\n${fail === 0 ? "✓" : "✗"} 磁控與反應式濺鍍 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
