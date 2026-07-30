/* ==========================================================================
   check-deposit.mjs — 驗證沉積/填溝模型(3.4 / A22、A23)

   docs/03 §3.4 的四個宣稱,全部在這裡變成斷言:

     · PECVD(SiH₄)黏著係數高 → 開口先合攏 → **夾 void**
     · TEOS 表面遷移率高 → 填溝能力遠優於 SiH₄(但高 AR 仍有殘餘空洞)
     · HDP-CVD 靠「濺鍍產額在 45° 最大」削掉 cusp + 濺出的材料落回溝裡 → 填得進去
     · PEALD 自限制 → 幾乎同形,填滿且零空洞

   ⚠️ 比較點是「**同樣的淨沉積厚度**」(場區膜厚達到 budget),不是各自跑到停滯。
   跑到停滯會讓場區的膜頂到格點上緣,天空消失、viewFactor 全歸零,
   四種製程就只剩「被遮住時的殘餘通量」在跑 —— 濺鍍項會完全失效,
   而結果看起來還很漂亮(填滿、零空洞)。那是量測假象,不是物理。
   所以下面每一組都要順便斷言「沒有頂到上緣」。
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(ROOT, "src/js/lab/deposit-model.js"), "utf8"), sandbox, {
  filename: "deposit-model.js",
});
const D = sandbox.window.PA.deposit;

let pass = 0;
let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

function run(mode, ar) {
  const p = D.create({ ar });
  p.growUntilFilled(mode);
  return {
    voids: p.voidCells(),
    final: p.fillFraction(),
    pinch: p.pinchFill(),
    steps: p.steps,
    ceiling: p.hitCeiling,
    verdict: p.verdict(),
  };
}

const ARS = [2, 3, 5];
const MODES = ["sih4", "teos", "hdp", "peald"];
const R = {};

console.log("\n【填溝結果 —— 四種製程 × 三種深寬比,同樣的淨沉積厚度】");
console.log("    模式    AR   空洞   最終填充   合攏時填充   步數");
for (const ar of ARS) {
  for (const m of MODES) {
    const r = run(m, ar);
    R[m + "@" + ar] = r;
    console.log(
      `    ${m.padEnd(7)}${String(ar).padStart(2)}  ${String(r.voids).padStart(5)}` +
        `   ${(r.final * 100).toFixed(0).padStart(5)} %   ${(r.pinch * 100).toFixed(0).padStart(7)} %` +
        `   ${String(r.steps).padStart(5)}`
    );
  }
}

console.log("\n【量測前提:沒有任何一組是靠「膜頂到格點上緣」得到的】");
ok(
  "十二組全部在頂到上緣之前就達到沉積預算",
  ARS.every((ar) => MODES.every((m) => R[m + "@" + ar].ceiling === false)),
  "全部 hitCeiling = false"
);

console.log("\n【SiH₄ PECVD:黏著係數高 → 開口先合攏 → 夾 void】");
ok(
  "每一種深寬比下 SiH₄ 都夾 void",
  ARS.every((ar) => R["sih4@" + ar].voids >= 4),
  ARS.map((ar) => `AR${ar}:${R["sih4@" + ar].voids}`).join("、")
);
ok(
  "空洞大到讓溝根本填不滿(每一種 AR 都 < 40 %)",
  ARS.every((ar) => R["sih4@" + ar].final < 0.4),
  ARS.map((ar) => `AR${ar}:${(R["sih4@" + ar].final * 100).toFixed(0)}%`).join("、")
);
ok(
  "合攏得非常早(填不到三成就封住)",
  ARS.every((ar) => R["sih4@" + ar].pinch < 0.3),
  ARS.map((ar) => `AR${ar}:${(R["sih4@" + ar].pinch * 100).toFixed(0)}%`).join("、")
);
ok(
  "深寬比越高,合攏得越早、填得越少(ARDE 式的惡化)",
  R["sih4@5"].pinch < R["sih4@2"].pinch && R["sih4@5"].final < R["sih4@2"].final,
  `合攏 AR5 ${(R["sih4@5"].pinch * 100).toFixed(0)} % < AR2 ${(R["sih4@2"].pinch * 100).toFixed(0)} %` +
    `;填充 AR5 ${(R["sih4@5"].final * 100).toFixed(0)} % < AR2 ${(R["sih4@2"].final * 100).toFixed(0)} %`
);

console.log("\n【TEOS:表面遷移率高 → 明顯優於 SiH₄,但沒有解決問題】");
ok(
  "每一種 AR 下 TEOS 的最終填充都遠優於 SiH₄(至少多兩倍)",
  ARS.every((ar) => R["teos@" + ar].final > R["sih4@" + ar].final * 2),
  ARS.map((ar) =>
    `AR${ar}:${(R["teos@" + ar].final * 100).toFixed(0)}% vs ${(R["sih4@" + ar].final * 100).toFixed(0)}%`
  ).join("、")
);
ok(
  "TEOS 撐到填了較多才合攏(比 SiH₄ 晚)",
  ARS.every((ar) => R["teos@" + ar].pinch > R["sih4@" + ar].pinch),
  ARS.map((ar) =>
    `AR${ar}:${(R["teos@" + ar].pinch * 100).toFixed(0)}% > ${(R["sih4@" + ar].pinch * 100).toFixed(0)}%`
  ).join("、")
);
/**
 * TEOS 的分界線正好落在「夠不夠用」上,這才是它的工程意義:
 * 低 AR 的溝它**填得掉**(所以中等節點用 TEOS 就夠了),
 * 高 AR 才開始留空洞 —— 那時候才非得動用 HDP。
 * 硬要斷言「TEOS 每一種 AR 都留空洞」是把它說得太差了。
 */
ok(
  "TEOS 填得掉低 AR 的溝(AR 2 幾乎零空洞)—— 中等節點用它就夠",
  R["teos@2"].voids < 4 && R["teos@2"].final > 0.95,
  `AR2 空洞 ${R["teos@2"].voids} 格 / 填充 ${(R["teos@2"].final * 100).toFixed(0)} %`
);
ok(
  "但高 AR 就開始留空洞 —— 這時候才非得動用 HDP",
  R["teos@5"].voids > R["teos@2"].voids && R["teos@5"].voids >= 4,
  `AR5 ${R["teos@5"].voids} 格 > AR2 ${R["teos@2"].voids} 格`
);

console.log("\n【HDP-CVD:削 cusp + 濺出的材料落回溝裡 → 高 AR 也填得滿】");
ok(
  "三種 AR 全部填滿且零空洞",
  ARS.every((ar) => R["hdp@" + ar].voids === 0 && R["hdp@" + ar].final > 0.95),
  ARS.map((ar) => `AR${ar}:${(R["hdp@" + ar].final * 100).toFixed(0)}%/${R["hdp@" + ar].voids} 空洞`).join("、")
);
ok(
  "高 AR 下 HDP 勝過 TEOS(TEOS 有空洞、HDP 沒有)",
  R["hdp@5"].voids < R["teos@5"].voids,
  `HDP ${R["hdp@5"].voids} < TEOS ${R["teos@5"].voids}`
);
/**
 * HDP 的代價要單獨講:同樣的**淨**沉積厚度,它要花大約兩倍的時間 ——
 * 因為濺鍍一直在把剛長好的膜打掉。這就是課文說的 dep/sputter ratio,
 * 也是為什麼 HDP 不會拿來當一般的厚膜製程。
 */
ok(
  "代價:同樣淨厚度 HDP 要花約兩倍步數(這就是 dep/sputter ratio)",
  ARS.every((ar) => {
    const k = R["hdp@" + ar].steps / R["sih4@" + ar].steps;
    return k > 1.6 && k < 2.6;
  }),
  ARS.map((ar) => `AR${ar}:${(R["hdp@" + ar].steps / R["sih4@" + ar].steps).toFixed(1)}×`).join("、")
);

/**
 * 把兩個機制分別關掉的對照 —— HDP 填得進去到底是哪一項在做事。
 * 兩項都是必要的:只削 cusp 不夠(要把 sputter 拉到 0.85 以上才填得動,
 * 那時場區幾乎不長膜),只靠落回也不行(沒有濺鍍就沒有材料可落)。
 */
console.log("\n【HDP 的兩個機制分別關掉會怎樣】");
for (const ar of [3, 5]) {
  const base = R["hdp@" + ar];
  const noSput = run(Object.assign({}, D.MODES.hdp, { sputter: 0, redep: 0 }), ar);
  const noRedep = run(Object.assign({}, D.MODES.hdp, { redep: 0 }), ar);
  console.log(
    `    AR${ar}  完整 void ${base.voids}/填充 ${(base.final * 100).toFixed(0)} %` +
      `  ·  關濺鍍 void ${noSput.voids}/填充 ${(noSput.final * 100).toFixed(0)} %` +
      `  ·  關落回 void ${noRedep.voids}/填充 ${(noRedep.final * 100).toFixed(0)} %`
  );
  ok(
    `AR${ar}:關掉濺鍍就退回 PECVD 的夾 void`,
    noSput.voids > 100 && noSput.final < 0.4 && base.voids === 0,
    `關濺鍍 ${noSput.voids} 格空洞 / 填充 ${(noSput.final * 100).toFixed(0)} %`
  );
  ok(
    `AR${ar}:只削 cusp、不讓材料落回溝裡,一樣填不滿`,
    noRedep.voids > 0 && noRedep.final < base.final,
    `關落回 ${noRedep.voids} 格空洞 / 填充 ${(noRedep.final * 100).toFixed(0)} % < 完整 ${(base.final * 100).toFixed(0)} %`
  );
}

console.log("\n【PEALD:自限制 → 最接近同形】");
ok(
  "每一種 AR 都填滿且零空洞",
  ARS.every((ar) => R["peald@" + ar].voids === 0 && R["peald@" + ar].final > 0.95),
  ARS.map((ar) => `AR${ar}:${(R["peald@" + ar].final * 100).toFixed(0)}%`).join("、")
);
ok(
  "兩種 PECVD 都被 PEALD 甩開:PEALD 幾乎填滿才可能合攏",
  ARS.every((ar) => R["peald@" + ar].pinch > R["sih4@" + ar].pinch * 2 &&
                    R["peald@" + ar].pinch > R["teos@" + ar].pinch),
  ARS.map((ar) => `AR${ar}:${(R["peald@" + ar].pinch * 100).toFixed(0)}%`).join("、")
);
ok(
  "自限制:抵達量與視角因子脫鉤(這是 PEALD 的定義)",
  D.MODES.peald.selfLim === true && D.MODES.sih4.selfLim === false
);
ok(
  "但仍保留深孔的自由基衰減 —— 極高 AR 時 PEALD 不如熱 ALD 的原因",
  D.MODES.peald.depthAtt > 0,
  `depthAtt ${D.MODES.peald.depthAtt}`
);
ok(
  "而且不必付 HDP 的速率代價:步數與 PECVD 同級",
  ARS.every((ar) => R["peald@" + ar].steps <= R["sih4@" + ar].steps),
  ARS.map((ar) => `AR${ar}:${R["peald@" + ar].steps} vs ${R["sih4@" + ar].steps}`).join("、")
);

console.log("\n【模型結構:黏著係數是階梯覆蓋率的來源】");
ok(
  "SiH₄ 的黏著係數遠高於 TEOS",
  D.MODES.sih4.stick > D.MODES.teos.stick * 3,
  `SiH₄ ${D.MODES.sih4.stick} vs TEOS ${D.MODES.teos.stick}`
);
ok("只有 HDP 有濺鍍項", MODES.filter((m) => D.MODES[m].sputter > 0).join("、") === "hdp");
ok(
  "濺鍍比 < 1 —— 否則場區淨蝕刻,根本長不出膜",
  D.MODES.hdp.sputter < 1,
  `sputter ${D.MODES.hdp.sputter}`
);

console.log(`\n${fail === 0 ? "✓" : "✗"} 沉積與填溝 通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
