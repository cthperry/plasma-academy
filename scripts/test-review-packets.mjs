import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateReviewPackets } from "./lib/review-packets.mjs";

const fixture = await mkdtemp(path.join(os.tmpdir(), "plasma-review-invalid-"));
const projectRoot = path.resolve(".");
try {
  await cp(path.resolve("docs/reviews"), fixture, { recursive: true });
  assert.deepEqual(await validateReviewPackets(fixture, projectRoot), [], "隔離 fixture 突變前必須是有效 baseline。");

  const invalid = JSON.parse(await readFile(path.join(fixture, "l2", "technical-review.json"), "utf8"));
  invalid.criteria = ["氣體安全操作", "供應商文件索引", "版面與格式"];
  await writeFile(path.join(fixture, "l2", "technical-review.json"), JSON.stringify(invalid));

  const failures = await validateReviewPackets(fixture, projectRoot);
  assert.deepEqual(failures, ["L2 technical criteria 缺少層級專屬準則：SDS。", "L2 technical criteria 缺少層級專屬準則：邊界|不取代|核准。"], `隔離 fixture 應只回報刻意製造的 L2 缺口：${failures.join(" | ")}`);
  console.log("審閱封包無效 fixture 測試通過：有效 baseline 只回報刻意製造的 L2 缺口。 ");
} finally {
  await rm(fixture, { recursive: true, force: true });
}
