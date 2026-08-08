import { execFile } from "node:child_process";
import { lstat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { isEvidenceReference } from "../../src/data/evidence.js";
import { isMolecularSourceApprovalComplete } from "../../src/data/spectra.js";
import { isLocalApprovalShapeComplete } from "../../src/data/sds-evidence.js";

const execFileAsync = promisify(execFile);

export async function isCommitReachable(repoRoot, commit) {
  try {
    await execFileAsync("git", ["-C", repoRoot, "cat-file", "-e", `${commit}^{commit}`]);
    await execFileAsync("git", ["-C", repoRoot, "merge-base", "--is-ancestor", commit, "HEAD"]);
    return true;
  } catch (_) {
    return false;
  }
}

export async function areTrackedEvidenceFiles(repoRoot, references) {
  if (!Array.isArray(references) || references.length === 0 || !references.every(isEvidenceReference)) return false;
  for (const reference of references) {
    const absolute = path.resolve(repoRoot, reference);
    if (!absolute.startsWith(`${path.resolve(repoRoot)}${path.sep}`)) return false;
    try {
      if (!(await lstat(absolute)).isFile()) return false;
      const { stdout } = await execFileAsync("git", ["-C", repoRoot, "cat-file", "-t", `HEAD:${reference}`]);
      if (stdout.trim() !== "blob") return false;
    } catch (_) {
      return false;
    }
  }
  return true;
}

export async function isMolecularSourceReviewComplete(line, repoRoot) {
  return isMolecularSourceApprovalComplete(line)
    && await areTrackedEvidenceFiles(repoRoot, line.sourceApproval.evidence);
}

export async function isLocalApprovalReviewComplete(evidence, repoRoot) {
  return isLocalApprovalShapeComplete(evidence)
    && await areTrackedEvidenceFiles(repoRoot, evidence.localApproval.evidence);
}

export async function countCompleteLocalApprovals(entries, repoRoot) {
  return (await Promise.all(entries.map((entry) => isLocalApprovalReviewComplete(entry, repoRoot)))).filter(Boolean).length;
}
