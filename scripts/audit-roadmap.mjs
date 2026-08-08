import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pendingReviewGates } from "./lib/review-packets.mjs";
import { sdsEvidence } from "../src/data/sds-evidence.js";
import { spectra } from "../src/data/spectra.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.argv.includes("--strict");
const phases = [1, 2, 3, 4];
let phaseFailure = false;

for (const phase of phases) {
  console.log(`\n===== P${phase} roadmap audit${strict ? " (strict)" : " (automated status)"} =====`);
  const result = spawnSync(process.execPath, [path.join(root, "scripts", `audit-p${phase}.mjs`), ...(strict ? ["--strict"] : [])], {
    cwd: root,
    stdio: "inherit"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) phaseFailure = true;
}

if (!strict) {
  if (phaseFailure) {
    console.error("Roadmap 自動化狀態稽核發生程式或 repo gate 失敗。 ");
    process.exit(1);
  }
  console.log("\nRoadmap 自動化狀態稽核完成；pending 外部核准只揭露狀態，不使一般自動化失敗。 ");
  process.exit(0);
}

const blockers = [];
for (const gate of await pendingReviewGates(path.join(root, "docs", "reviews"))) blockers.push(`${gate} 具名核准 pending`);
const plantApproved = sdsEvidence.filter((item) => item.localApprovalStatus === "approved").length;
if (plantApproved < sdsEvidence.length) blockers.push(`廠區 EH&S SDS 核准 ${plantApproved}/${sdsEvidence.length}，${sdsEvidence.length - plantApproved} 筆 pending`);
const molecularPending = spectra.filter((item) => item.verificationStatus === "pending-source-review");
if (molecularPending.length) blockers.push(`OES 分子帶來源審閱 0/${molecularPending.length} pending：${molecularPending.map((item) => item.id).join(", ")}`);
blockers.push("A18 wallFlux／二維輪廓模型 acceptance 尚未建立");
blockers.push("A20 反向 ARDE 高階空間解析 acceptance 尚未建立");
blockers.push("A23 AR>6 HDP 填溝高階空間解析 acceptance 尚未建立");

if (blockers.length || phaseFailure) {
  console.error(`\nStrict roadmap completion 未通過，共 ${blockers.length} 項明確 blocker：`);
  blockers.forEach((blocker) => console.error(`- ${blocker}`));
  if (phaseFailure) console.error("- 一個以上 P1-P4 strict phase gate 回傳 nonzero（詳見上方輸出）");
  process.exit(1);
}

console.log("Strict roadmap completion 通過：repo 與外部核准均有完整證據。 ");
