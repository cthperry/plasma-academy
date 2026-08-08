import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { spectra } from "../src/data/spectra.js";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = await mkdtemp(path.join(os.tmpdir(), "plasma-oes-audit-"));
const evidenceReference = "docs/reviews/evidence/co-483.5-source.md";
const evidenceFile = path.join(fixture, ...evidenceReference.split("/"));
const spectraFile = path.join(fixture, "spectra.json");

try {
  await mkdir(path.dirname(evidenceFile), { recursive: true });
  await writeFile(evidenceFile, "# CO 483.5 nm source review evidence\n");
  await execFileAsync("git", ["init"], { cwd: fixture });
  await execFileAsync("git", ["config", "user.name", "Plasma Test"], { cwd: fixture });
  await execFileAsync("git", ["config", "user.email", "plasma-test@example.invalid"], { cwd: fixture });
  await execFileAsync("git", ["add", evidenceReference], { cwd: fixture });
  await execFileAsync("git", ["commit", "-m", "Add OES evidence fixture"], { cwd: fixture });

  const approved = spectra.map((line) => line.id === "co-483.5" ? {
    ...line,
    source: "https://example.test/co-band-source",
    sourceType: "reviewed-molecular-band-source",
    verificationStatus: "molecular-source-approved",
    sourceApproval: {
      reviewer: { name: "陳博士", role: "光譜資料審閱者" },
      reviewedAt: "2026-08-08T12:34:56Z",
      evidence: [evidenceReference]
    }
  } : line);
  await writeFile(spectraFile, JSON.stringify(approved));

  const success = await runAudit();
  assert.equal(success.exitCode, 0, success.output);
  assert.match(success.output, /分子帶來源核准 1\/9、pending 8\/9/, "audit:p4 必須接受 evidence-complete approved 與 pending 混合狀態。");

  approved.find((line) => line.id === "co-483.5").sourceApproval.evidence = ["docs/reviews/evidence/missing.md"];
  await writeFile(spectraFile, JSON.stringify(approved));
  const failure = await runAudit();
  assert.notEqual(failure.exitCode, 0, "不存在的 OES 證據檔必須讓 repo-strict audit 失敗。");
} finally {
  await rm(fixture, { recursive: true, force: true });
}

console.log("OES audit integration fixture 通過：1 approved + 8 pending 合法，遺失證據會使 repo gate 失敗。 ");

async function runAudit() {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      path.join(root, "scripts", "audit-p4.mjs"),
      "--repo-strict",
      "--spectra-fixture", spectraFile,
      "--evidence-repo", fixture
    ], { cwd: root });
    return { exitCode: 0, output: `${stdout}\n${stderr}` };
  } catch (error) {
    return { exitCode: error.code ?? 1, output: `${error.stdout ?? ""}\n${error.stderr ?? ""}` };
  }
}
