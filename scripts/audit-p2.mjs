import { gases } from "../src/data/gases.js";
import { formulas } from "../src/data/formulas.js";
import { labs } from "../src/data/labs.js";

const metrics = {
  gases: gases.length,
  sdsVerified: gases.filter((gas) => gas.sdsStatus === "verified").length,
  labsImplemented: labs.filter((lab) => lab.level === 2 && lab.href !== "/lab/").length,
  formulas: Object.keys(formulas).length
};
const targets = { gases: 32, sdsVerified: 32, labsImplemented: 9, formulas: 18 };
const rows = Object.entries(targets).map(([item, target]) => ({ item, current: metrics[item], target, complete: metrics[item] >= target }));
console.table(rows);
const incomplete = rows.filter((row) => !row.complete);
if (incomplete.length) {
  console.log(`P2 尚有 ${incomplete.length} 個前置缺口：${incomplete.map((row) => row.item).join(", ")}。`);
  if (process.argv.includes("--strict")) process.exit(1);
} else {
  console.log("P2 前置資料與元件數量達標；仍須核對內容、題庫、SVG 與三道審閱。 ");
}
