import assert from "node:assert/strict";
import { runPhaseAudits } from "./lib/roadmap-audit.mjs";

const statuses = [0, 1, 0, 0];
let index = 0;
const result = runPhaseAudits({
  root: "C:\\fixture",
  phases: [1, 2, 3, 4],
  stdio: "ignore",
  spawn(_command, args) {
    assert.equal(args.at(-1), "--repo-strict", "每個 phase 必須使用 repo-strict gate。");
    return { status: statuses[index++], error: null };
  }
});

assert.equal(result.failed, true, "任一 phase nonzero 必須讓 orchestrator 判定失敗。");
assert.deepEqual(result.results.map((item) => item.status), statuses);
console.log("Roadmap orchestrator fixture 通過：單一 phase nonzero 會傳播為整體失敗。 ");
