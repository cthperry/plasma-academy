import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { isEvidenceReference } from "../../src/data/evidence.js";
import { isMolecularSourceApprovalComplete } from "../../src/data/spectra.js";

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
      await access(absolute);
      await execFileAsync("git", ["-C", repoRoot, "ls-files", "--error-unmatch", "--", reference]);
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
