import assert from "node:assert/strict";
import { isReviewApprovalComplete } from "./lib/review-packets.mjs";
import { isMolecularSourceApprovalComplete, isMolecularSourcePending } from "../src/data/spectra.js";

const validReview = {
  status: "approved",
  reviewer: { name: "王小明", role: "技術審閱者" },
  reviewed_commit: "a".repeat(40),
  approved_at: "2026-08-08T12:34:56+08:00",
  evidence: ["docs/reviews/evidence/l1-technical.md"]
};
assert.equal(isReviewApprovalComplete(validReview), true);
for (const invalid of [
  { ...validReview, evidence: [] },
  { ...validReview, reviewed_commit: "abc123" },
  { ...validReview, approved_at: "2026-08-08" },
  { ...validReview, reviewer: { name: " ", role: "技術審閱者" } }
]) assert.equal(isReviewApprovalComplete(invalid), false, "不完整人工核准證據不得計為完成。");

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
    evidence: ["docs/reviews/evidence/oes-source.md"]
  }
};
assert.equal(isMolecularSourceApprovalComplete(approvedBand), true);
assert.equal(isMolecularSourceApprovalComplete({ ...approvedBand, sourceApproval: { ...approvedBand.sourceApproval, evidence: [] } }), false);

console.log("人工與 OES 核准證據測試通過：不完整證據不會解除 strict blocker。 ");
