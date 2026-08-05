/* ==========================================================================
   check-quiz.mjs — 驗證題庫結構與品質規則

   docs/08 的品質底線只有一條,但它很硬:
     **每一個錯誤選項都必須有 `why`**
   —— 學員選錯時要立刻知道自己的誤解在哪,而不是只被告知「你錯了」。
   這支檔案把那條規則變成測試。

   ⚠️ 本檔驗的是**目前**的題庫契約,不是 docs/08 的最終目標(465 題)。
   目前是第三批 125 題,各階段剛好等於或略多於出題數,離規格要求的
   2.5–3 倍還有距離 —— 這件事在 docs/11 誠實記錄,測試也把它釘住:
   題庫沒到 2.5 倍之前,測驗頁必須顯示警告,不假裝可以重抽不同題。
   ========================================================================== */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(ROOT, "src/data/curriculum.js"), "utf8"), sandbox, {
  filename: "curriculum.js",
});
const QUIZ_DIR = join(ROOT, "src/data/quiz");
for (const f of readdirSync(QUIZ_DIR).sort()) {
  if (!f.endsWith(".js")) continue;
  vm.runInContext(readFileSync(join(QUIZ_DIR, f), "utf8"), sandbox, { filename: "quiz/" + f });
}
vm.runInContext(readFileSync(join(ROOT, "src/js/quiz/engine.js"), "utf8"), sandbox, {
  filename: "engine.js",
});

const BANK = sandbox.window.PA.quizBank;
const CUR = sandbox.window.PA.curriculum;
const Q = sandbox.window.PA.quiz;
const ALL = Object.keys(BANK).flatMap((k) => BANK[k]);

let pass = 0;
let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

/* ============ 結構 ============ */
console.log("\n【題庫結構】");
console.log(
  `    共 ${ALL.length} 題:` +
    Object.keys(BANK).sort().map((k) => `L${k} ${BANK[k].length}`).join("、")
);
ok(
  "四個階層都有題庫",
  ["1", "2", "3", "4"].every((k) => (BANK[k] || []).length > 0),
  Object.keys(BANK).sort().join("、")
);
ok(
  "id 全域唯一",
  new Set(ALL.map((q) => q.id)).size === ALL.length,
  `${ALL.length} 題,${new Set(ALL.map((q) => q.id)).size} 個相異 id`
);
ok(
  "每題都有 id / chapter / type / difficulty / question / explanation / reference",
  ALL.every(
    (q) => q.id && q.chapter && q.type && q.difficulty >= 1 && q.difficulty <= 3 &&
      q.question && q.explanation && q.reference
  ),
  "七個必填欄位"
);
ok(
  "題型都在規格列出的六種之內",
  ALL.every((q) => Object.keys(Q.TYPE_LABEL).indexOf(q.type) >= 0),
  [...new Set(ALL.map((q) => q.type))].sort().join("、")
);
ok(
  "題目的 id 前綴與所屬階層一致",
  Object.keys(BANK).every((k) => BANK[k].every((q) => q.id.startsWith("L" + k + "-"))),
  "L1-*/L2-*/L3-*/L4-*"
);

/* ============ 章節對應 ============ */
console.log("\n【章節對應】");
const modIds = CUR.modules.map((m) => m.id);
ok(
  "**每題的 chapter 都在課綱裡**",
  ALL.every((q) => modIds.indexOf(q.chapter) >= 0),
  [...new Set(ALL.map((q) => q.chapter))].sort().join("、")
);
ok(
  "每題的 chapter 與所屬階層一致(L3 的題目不會掛到 2.x)",
  Object.keys(BANK).every((k) => BANK[k].every((q) => q.chapter.split(".")[0] === k)),
  "階層與章節編號相符"
);
ok(
  "reference 也在課綱裡(解析要連得回具體章節)",
  ALL.every((q) => modIds.indexOf(q.reference) >= 0),
  "全部 reference 皆可解析"
);
const perCh = {};
for (const q of ALL) perCh[q.chapter] = (perCh[q.chapter] || 0) + 1;
console.log(
  "    每章題數:" + modIds.map((id) => `${id}:${perCh[id] || 0}`).join("  ")
);
ok(
  "**25 章每一章都有題目**(沒有考不到的章節)",
  modIds.every((id) => (perCh[id] || 0) > 0),
  `最少的一章有 ${Math.min(...modIds.map((id) => perCh[id] || 0))} 題`
);

/* ============ 品質底線 ============ */
console.log("\n【品質底線:每個錯誤選項都要有 why】");
const withOptions = ALL.filter((q) => q.options);
ok(
  "選擇題都有 2 個以上選項",
  withOptions.every((q) => q.options.length >= 2),
  `${withOptions.length} 題選擇題,最少 ${Math.min(...withOptions.map((q) => q.options.length))} 個選項`
);
ok(
  "選項 id 在題內唯一",
  withOptions.every((q) => new Set(q.options.map((o) => o.id)).size === q.options.length),
  ""
);
ok(
  "**每一個選項(對的和錯的)都有非空的 why**",
  withOptions.every((q) => q.options.every((o) => o.why && o.why.trim().length >= 10)),
  (() => {
    const bad = withOptions.flatMap((q) =>
      q.options.filter((o) => !o.why || o.why.trim().length < 10).map((o) => q.id + "/" + o.id)
    );
    return bad.length ? "缺:" + bad.join("、") : `${withOptions.reduce((a, q) => a + q.options.length, 0)} 個選項全部有解析`;
  })()
);
ok(
  "單選題剛好一個正解",
  ALL.filter((q) => q.type === "single" || q.type === "image" || q.type === "scenario")
    .every((q) => q.options.filter((o) => o.correct).length === 1),
  ""
);
ok(
  "複選題有兩個以上正解(否則應該是單選)",
  ALL.filter((q) => q.type === "multi").every((q) => q.options.filter((o) => o.correct).length >= 2),
  `${ALL.filter((q) => q.type === "multi").length} 題複選`
);
ok(
  "複選題也有錯誤選項(否則全選就對)",
  ALL.filter((q) => q.type === "multi").every((q) => q.options.some((o) => !o.correct)),
  ""
);
ok(
  "數值題有 answer / unit / tolerance,且容差在 5–20 %",
  ALL.filter((q) => q.type === "numeric").every(
    (q) => isFinite(q.answer) && q.unit && q.tolerance >= 0.05 && q.tolerance <= 0.2
  ),
  ALL.filter((q) => q.type === "numeric").map((q) => `${q.id} ±${(q.tolerance * 100).toFixed(0)} %`).join("、")
);
ok(
  "排序題有 order 陣列且至少三項",
  ALL.filter((q) => q.type === "order").every((q) => Array.isArray(q.order) && q.order.length >= 3),
  ALL.filter((q) => q.type === "order").map((q) => `${q.id}(${q.order.length} 項)`).join("、") || "(目前無排序題)"
);
ok(
  "解析長度足以說明理由(≥ 30 字)",
  ALL.every((q) => q.explanation.length >= 30),
  `最短 ${Math.min(...ALL.map((q) => q.explanation.length))} 字`
);

/* ============ 出題品質檢核(docs/08 的清單) ============ */
console.log("\n【出題品質檢核】");
/**
 * ⚠️ 這兩條都是實測逼出來的,而且它們抓到的是**我自己寫的題目**的問題。
 *
 * 第一條原本寫成「正解的平均長度不得超過干擾項的 1.8 倍」。
 * 那是個弱代理:它會被一個特別短的干擾項拉歪,而且沒有回答真正該問的問題 ——
 * **考生只要每題挑最長的選項,能不能贏過亂猜?**
 * 第一版題庫用這個直接判準一測:命中率 97.7 %,而亂猜是 25 %。
 * 換句話說整份題庫當時可以用「挑最長的」考到 98 分,是壞掉的評量工具。
 * 所以把判準換成命中率(更嚴格、也更貼近真實的作答策略),
 * 並把 43 題的正解選項改寫 —— 說明性的子句移進 why / explanation,
 * 選項本文只留主張。順帶也讓選項的設計更乾淨:選項是主張,理由在解析。
 *
 * 改完之後命中率只降到 81 %,於是查出**第二個、更嚴重的洩漏**:
 * 45 % 的正解選項帶粗體,而干擾項只有 1 % —— 考生根本不必讀,
 * 挑有強調的那個就好。把粗體全部從選項本文剝掉(強調留給解析),
 * 再把 20 題過短的干擾項補寫成完整的誤解陳述,命中率才降到 18 %
 * (**低於亂猜的 25 %**,代表長度已經不帶任何可利用的訊號)。
 *
 * 另外:平手要算「還是得猜」,不能算命中 —— 四個選項等長時
 * 考生得到的資訊是零,把它算成命中會誇大問題、也會逼出無意義的修改。
 */
const longestStats = () => {
  const single = ALL.filter((q) => q.options && q.options.filter((o) => o.correct).length === 1);
  let exp = 0, chance = 0;
  for (const q of single) {
    const max = Math.max(...q.options.map((o) => o.text.length));
    const tied = q.options.filter((o) => o.text.length === max);
    // 平手時考生仍要在等長的選項裡猜 —— 不能算他命中
    exp += tied.filter((o) => o.correct).length / tied.length;
    chance += 1 / q.options.length;
  }
  return { hit: exp / single.length, chance: chance / single.length, n: single.length };
};
ok(
  "**「每題挑最長的選項」不能贏過亂猜** —— 選項長度不得洩漏答案",
  longestStats().hit < longestStats().chance * 1.2,
  `命中率 ${(longestStats().hit * 100).toFixed(1)} %,亂猜 ${(longestStats().chance * 100).toFixed(0)} %(${longestStats().n} 題單一正解)`
);
ok(
  "**選項本文不得含粗體** —— 45 % 的正解帶粗體、干擾項只有 1 % 時,強調本身就是答案",
  ALL.filter((q) => q.options).every((q) => q.options.every((o) => !/\*\*/.test(o.text))),
  "強調留給 why 與 explanation,選項只放主張"
);

/**
 * 同一章不得有近乎重複的題目。
 *
 * 第三批擴充時我一口氣每章加兩題,結果寫出十對幾乎一樣的題目 ——
 * 「ICP 從 E-mode 跳到 H-mode 時發生了什麼 / 最直接會觀察到什麼」、
 * 「HDP 為什麼能填滿深溝 / 關鍵在哪裡」…… 換句話問同一件事。
 * 這會同時造成兩個問題:**結業測驗抽到整批題庫時,學員會連續看到兩題一樣的**;
 * 以及**題庫的名目題數高於它實際涵蓋的知識點**,補齊進度是假的。
 *
 * 判準用題幹的字元 bigram Jaccard 相似度。重寫那十題之後,
 * 同章的最高相似度是 0.290(3.6 的「背吹目的」vs「背吹洩漏警訊」——
 * 這兩題確實是不同角度,該留),所以門檻訂 0.32:
 * 容得下合理的同主題不同角度,擋得住換句話說。
 *
 * ⚠️ 擴充題庫時這條會擋人。正確的反應是**換一個角度出題**,不是調高門檻。
 */
const NORM = (t) => t.replace(/[\s【】(),。?、%·—–\-]/g, "");
const bigrams = (t) => {
  const n = NORM(t);
  const s = new Set();
  for (let i = 0; i < n.length - 1; i++) s.add(n.slice(i, i + 2));
  return s;
};
const jaccard = (a, b) => {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
};
const nearDuplicates = (threshold) => {
  const out = [];
  for (let i = 0; i < ALL.length; i++) {
    for (let j = i + 1; j < ALL.length; j++) {
      if (ALL[i].chapter !== ALL[j].chapter) continue;
      const v = jaccard(bigrams(ALL[i].question), bigrams(ALL[j].question));
      if (v >= threshold) out.push(`${ALL[i].id}≈${ALL[j].id} (${v.toFixed(2)})`);
    }
  }
  return out;
};
ok(
  "**同一章不得有近乎重複的題目** —— 換句話問同一件事,會讓題庫的名目題數灌水",
  nearDuplicates(0.32).length === 0,
  nearDuplicates(0.32).length
    ? nearDuplicates(0.32).join("、")
    : `同章最高相似度 ${Math.max(
        0,
        ...ALL.flatMap((a, i) =>
          ALL.slice(i + 1)
            .filter((b) => b.chapter === a.chapter)
            .map((b) => jaccard(bigrams(a.question), bigrams(b.question)))
        )
      ).toFixed(2)}(門檻 0.32)`
);
ok(
  "同一章不得有兩題的 tags 完全相同 —— 這是重複出題最明顯的徵兆",
  (() => {
    for (let i = 0; i < ALL.length; i++) {
      for (let j = i + 1; j < ALL.length; j++) {
        if (ALL[i].chapter !== ALL[j].chapter) continue;
        if ([...ALL[i].tags].sort().join("|") === [...ALL[j].tags].sort().join("|")) return false;
      }
    }
    return true;
  })(),
  "tags 相同代表兩題蓋的是同一個知識點"
);
ok(
  "難度分佈涵蓋三級,且不是全部集中在同一級",
  (() => {
    const d = { 1: 0, 2: 0, 3: 0 };
    ALL.forEach((q) => d[q.difficulty]++);
    return d[1] > 0 && d[2] > 0 && d[3] > 0 && Math.max(d[1], d[2], d[3]) / ALL.length < 0.75;
  })(),
  (() => {
    const d = { 1: 0, 2: 0, 3: 0 };
    ALL.forEach((q) => d[q.difficulty]++);
    return `難度 1:${d[1]}、2:${d[2]}、3:${d[3]}`;
  })()
);
ok(
  "高階(L3/L4)的情境與判讀題占比明顯高於 L1",
  (() => {
    const rate = (k) => {
      const b = BANK[k];
      return b.filter((q) => q.type === "scenario" || q.type === "image").length / b.length;
    };
    return rate("3") + rate("4") > rate("1") * 2;
  })(),
  ["1", "2", "3", "4"].map((k) => {
    const b = BANK[k];
    const r = b.filter((q) => q.type === "scenario" || q.type === "image").length / b.length;
    return `L${k} ${(r * 100).toFixed(0)} %`;
  }).join("、")
);
ok(
  "每題都有 tags(供日後依主題抽題)",
  ALL.every((q) => Array.isArray(q.tags) && q.tags.length > 0),
  `${[...new Set(ALL.flatMap((q) => q.tags))].length} 個相異標籤`
);

/* ============ 判分邏輯 ============ */
console.log("\n【判分邏輯】");
ok(
  "單選:選對得分、選錯不得分",
  (() => {
    const q = ALL.find((x) => x.type === "single");
    const right = q.options.find((o) => o.correct).id;
    const wrong = q.options.find((o) => !o.correct).id;
    return Q.grade(q, [right]).correct === true && Q.grade(q, [wrong]).correct === false;
  })(),
  ""
);
ok(
  "**複選:少選或多選都不得分**(不給部分分)",
  (() => {
    const q = ALL.find((x) => x.type === "multi");
    const right = q.options.filter((o) => o.correct).map((o) => o.id);
    const wrong = q.options.find((o) => !o.correct).id;
    return (
      Q.grade(q, right).correct === true &&
      Q.grade(q, right.slice(0, 1)).correct === false &&
      Q.grade(q, right.concat([wrong])).correct === false
    );
  })(),
  "全對才算對"
);
ok(
  "數值:容差內算對、容差外算錯、未作答算錯",
  (() => {
    const q = ALL.find((x) => x.type === "numeric");
    const t = q.tolerance;
    return (
      Q.grade(q, String(q.answer)).correct === true &&
      Q.grade(q, String(q.answer * (1 + t * 0.5))).correct === true &&
      Q.grade(q, String(q.answer * (1 + t * 2))).correct === false &&
      Q.grade(q, "").correct === false
    );
  })(),
  ""
);
ok(
  "排序:順序完全正確才算對",
  (() => {
    const q = ALL.find((x) => x.type === "order");
    if (!q) return true;
    const rev = q.order.slice().reverse();
    return Q.grade(q, q.order).correct === true && Q.grade(q, rev).correct === false;
  })(),
  ""
);

/* ============ 測驗規格 ============ */
console.log("\n【結業測驗規格(docs/08)】");
for (const k of ["1", "2", "3", "4"]) {
  const st = Q.STAGES[k];
  const have = BANK[k].length;
  console.log(
    `    ${st.label}:出題 ${st.draw}、時限 ${st.minutes} min、通過 ${st.pass * 100} %  ` +
      `— 目前題庫 ${have} 題(規格要求 ${Math.round(st.draw * 2.5)}–${st.draw * 3})`
  );
}
ok(
  "四階的出題數與通過門檻與 docs/08 一致",
  Q.STAGES["1"].draw === 20 && Q.STAGES["2"].draw === 30 &&
    Q.STAGES["3"].draw === 35 && Q.STAGES["4"].draw === 30 &&
    Q.STAGES["4"].pass === 0.8 && Q.STAGES["1"].pass === 0.75,
  "L4 門檻 80 %,其餘 75 %"
);
ok(
  "⚠️ **題庫規模尚未達到規格的 2.5–3 倍** —— 這一項照實記錄,不假裝達成",
  ["1", "2", "3", "4"].some((k) => BANK[k].length < Q.STAGES[k].draw * 2.5),
  "第一批題庫;缺口與補齊計畫見 docs/11"
);

/* ============ 頁面 ============ */
console.log("\n【測驗中心頁面】");
const page = readFileSync(join(ROOT, "src/content/quiz.html"), "utf8");
ok(
  "頁面同時掛載自我檢測與結業測驗兩種模式",
  page.includes('data-quiz="self"') && page.includes('data-quiz="exam"'),
  ""
);
ok(
  "頁面誠實說明題庫規模尚未補齊",
  page.includes("題庫") && /尚未|第一批|補齊/.test(page),
  ""
);

console.log(`\n${fail === 0 ? "✓" : "✗"} 題庫與測驗引擎通過 ${pass} / ${pass + fail}\n`);
process.exit(fail === 0 ? 0 : 1);
