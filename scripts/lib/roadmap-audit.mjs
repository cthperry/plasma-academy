import { spawnSync } from "node:child_process";
import path from "node:path";

export function runPhaseAudits({ root, phases = [1, 2, 3, 4], spawn = spawnSync, stdio = "inherit" }) {
  const results = [];
  for (const phase of phases) {
    const result = spawn(process.execPath, [path.join(root, "scripts", `audit-p${phase}.mjs`), "--repo-strict"], {
      cwd: root,
      stdio
    });
    if (result.error) throw result.error;
    results.push({ phase, status: result.status });
  }
  return { results, failed: results.some((result) => result.status !== 0) };
}
