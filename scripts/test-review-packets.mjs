import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateReviewPackets } from "./lib/review-packets.mjs";

const fixture = await mkdtemp(path.join(os.tmpdir(), "plasma-review-invalid-"));
try {
  for (const level of [1, 2, 3, 4]) {
    const directory = path.join(fixture, `l${level}`);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "README.md"), `# L${level} 審閱\n\n具名審閱者依流程核准。\n`);
    for (const gate of ["technical", "teaching", "consistency"]) {
      const criteria = [`L${level} ${gate} 準則`];
      if (level === 2 && gate === "technical") criteria.push("氣體危害與 SDS 邊界");
      if (level === 3) criteria.push("profile defect package PCB A17 A18 A19 A20 A21 A22 A23 A24 A25 A33 A34");
      if (level === 4) criteria.push("diagnostics control damage advanced models production OES source boundaries");
      await writeFile(path.join(directory, `${gate}-review.json`), JSON.stringify({
        gate,
        status: "pending",
        reviewer: { name: "", role: "" },
        reviewed_commit: "",
        approved_at: "",
        criteria,
        evidence: [],
        findings: []
      }));
    }
  }

  const invalid = JSON.parse(await import("node:fs/promises").then(({ readFile }) => readFile(path.join(fixture, "l2", "technical-review.json"), "utf8")));
  invalid.criteria = ["只檢查版面，不檢查氣體安全"];
  await writeFile(path.join(fixture, "l2", "technical-review.json"), JSON.stringify(invalid));

  const failures = await validateReviewPackets(fixture);
  assert(failures.some((failure) => failure.includes("L2 technical") && failure.includes("SDS")), `隔離 fixture 未偵測 L2 SDS 準則缺口：${failures.join(" | ")}`);
  console.log("審閱封包無效 fixture 測試通過：隔離資料可偵測 L2 gas/SDS 邊界缺口。 ");
} finally {
  await rm(fixture, { recursive: true, force: true });
}
