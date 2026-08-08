import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { countApprovedReviews, isReviewApprovalComplete, pendingReviewGates } from "./lib/review-packets.mjs";
import { isMolecularSourceApprovalComplete, isMolecularSourcePending } from "../src/data/spectra.js";

const execFileAsync = promisify(execFile);
const fixture = await mkdtemp(path.join(os.tmpdir(), "plasma-approval-evidence-"));
const reviewRoot = path.join(fixture, "docs", "reviews");
const evidenceReference = "docs/reviews/evidence/l1-technical.md";
const evidenceFile = path.join(fixture, ...evidenceReference.split("/"));

try {
  await mkdir(path.dirname(evidenceFile), { recursive: true });
  await mkdir(path.join(reviewRoot, "l1"), { recursive: true });
  await writeFile(evidenceFile, "# L1 technical review evidence\n");
  await execFileAsync("git", ["init"], { cwd: fixture });
  await execFileAsync("git", ["config", "user.name", "Plasma Test"], { cwd: fixture });
  await execFileAsync("git", ["config", "user.email", "plasma-test@example.invalid"], { cwd: fixture });
  await execFileAsync("git", ["add", evidenceReference], { cwd: fixture });
  await execFileAsync("git", ["commit", "-m", "Add review evidence fixture"], { cwd: fixture });
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: fixture });
  const reviewedCommit = stdout.trim();

  const validReview = {
    gate: "technical",
    status: "approved",
    reviewer: { name: "王小明", role: "技術審閱者" },
    reviewed_commit: reviewedCommit,
    approved_at: "2026-08-08T12:34:56+08:00",
    criteria: ["物理", "公式", "模型"],
    evidence: [evidenceReference],
    findings: []
  };
  const reviewFile = path.join(reviewRoot, "l1", "technical-review.json");
  await writeFile(reviewFile, JSON.stringify(validReview));
  assert.equal(await isReviewApprovalComplete(validReview, fixture), true);
  assert.equal(await countApprovedReviews(reviewRoot, 1, fixture), 1, "完整核准必須由 caller 計入。");
  assert.equal((await pendingReviewGates(reviewRoot, fixture)).includes("L1 technical"), false, "完整核准不得留在 pending 清單。");

  for (const invalid of [
    { ...validReview, evidence: [] },
    { ...validReview, evidence: ["x"] },
    { ...validReview, reviewed_commit: "f".repeat(40) },
    { ...validReview, approved_at: "2026-02-31T12:34:56Z" },
    { ...validReview, reviewer: { name: " ", role: "技術審閱者" } }
  ]) {
    await writeFile(reviewFile, JSON.stringify(invalid));
    assert.equal(await isReviewApprovalComplete(invalid, fixture), false, "無效核准證據不得通過完整性檢查。");
    assert.equal(await countApprovedReviews(reviewRoot, 1, fixture), 0, "caller 不得計入無效核准。");
    assert.equal((await pendingReviewGates(reviewRoot, fixture)).includes("L1 technical"), true, "無效核准必須回到 pending 清單。");
  }

  await writeFile(reviewFile, JSON.stringify(validReview));
  await rm(evidenceFile);
  assert.equal(await countApprovedReviews(reviewRoot, 1, fixture), 0, "工作樹中不存在的證據檔不得解除 blocker。");
} finally {
  await rm(fixture, { recursive: true, force: true });
}

const pendingBand = {
  verificationStatus: "pending-source-review",
  sourceType: "pedagogical-molecular-band",
  source: "Plasma Academy 教學近似；分子帶位置待正式光譜資料來源審查",
  sourceApproval: { reviewer: { name: "", role: "" }, reviewedAt: "", evidence: [] }
};
assert.equal(isMolecularSourcePending(pendingBand), true);
assert.equal(isMolecularSourcePending({ ...pendingBand, sourceApproval: { ...pendingBand.sourceApproval, evidence: ["預填"] } }), false);

const approvedBand = {
  verificationStatus: "molecular-source-approved",
  sourceType: "reviewed-molecular-band-source",
  source: "https://example.test/molecular-source",
  sourceApproval: {
    reviewer: { name: "陳博士", role: "光譜資料審閱者" },
    reviewedAt: "2026-08-08T12:34:56Z",
    evidence: ["docs/reviews/evidence/co-483.5-source.md"]
  }
};
assert.equal(isMolecularSourceApprovalComplete(approvedBand), true);
assert.equal(isMolecularSourceApprovalComplete({ ...approvedBand, sourceApproval: { ...approvedBand.sourceApproval, evidence: ["x"] } }), false);
assert.equal(isMolecularSourceApprovalComplete({ ...approvedBand, sourceApproval: { ...approvedBand.sourceApproval, reviewedAt: "2026-02-31T12:34:56Z" } }), false);

console.log("人工與 OES 核准證據測試通過：caller 會拒絕不存在的日期、commit 與 Git 證據檔。 ");
