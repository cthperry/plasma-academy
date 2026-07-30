import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewDirectory = path.join(root, "docs", "reviews", "l1");
const expectedGates = new Set(["technical", "teaching", "consistency"]);
const files = (await readdir(reviewDirectory)).filter((name) => name.endsWith(".json"));
const failures = [];

for (const file of files) {
  const review = JSON.parse(await readFile(path.join(reviewDirectory, file), "utf8"));
  if (!expectedGates.delete(review.gate)) failures.push(`${file} 的 gate 缺失、重複或不受支援。`);
  if (!["pending", "changes_requested", "approved"].includes(review.status)) failures.push(`${file} 的 status 無效。`);
  if (!Array.isArray(review.criteria) || !review.criteria.length) failures.push(`${file} 缺少 criteria。`);
  if (review.status === "approved") {
    if (!review.reviewer?.name || !review.reviewer?.role) failures.push(`${file} 核准時必須填寫審閱者姓名與角色。`);
    if (!review.reviewed_commit || !review.approved_at) failures.push(`${file} 核准時必須填寫提交版本與日期。`);
  }
}

if (expectedGates.size) failures.push(`缺少審閱封包：${[...expectedGates].join(", ")}。`);
if (failures.length) {
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`L1 審閱封包結構通過：${files.length} 份，核准狀態由 P1 稽核另行判定。`);
