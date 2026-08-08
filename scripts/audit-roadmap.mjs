import path from "node:path";
import { fileURLToPath } from "node:url";
import { pendingReviewGates } from "./lib/review-packets.mjs";
import { runPhaseAudits } from "./lib/roadmap-audit.mjs";
import { isLocalApprovalComplete, sdsEvidence } from "../src/data/sds-evidence.js";
import { isMolecularSourceApprovalComplete, isMolecularSourcePending, spectra } from "../src/data/spectra.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.argv.includes("--strict");
console.log(`\n===== P1-P4 roadmap audit${strict ? " (strict completion)" : " (automated repo)"} =====`);
const { failed: phaseFailure } = runPhaseAudits({ root });

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
const plantApproved = sdsEvidence.filter(isLocalApprovalComplete).length;
if (plantApproved < sdsEvidence.length) blockers.push(`廠區 EH&S SDS 核准 ${plantApproved}/${sdsEvidence.length}，${sdsEvidence.length - plantApproved} 筆 pending`);
const molecularBands = spectra.filter((item) => ["CO", "CN", "C2", "N2", "OH"].includes(item.species));
const molecularPending = molecularBands.filter(isMolecularSourcePending);
const molecularApproved = molecularBands.filter(isMolecularSourceApprovalComplete).length;
if (molecularPending.length) blockers.push(`OES 分子帶來源審閱 ${molecularApproved}/9，${molecularPending.length} 筆 pending：${molecularPending.map((item) => item.id).join(", ")}`);
blockers.push("A18 wallFlux／二維輪廓模型 acceptance 尚未建立");
blockers.push("A20 反向 ARDE 高階空間解析 acceptance 尚未建立");
blockers.push("A23 AR>6 HDP 填溝高階空間解析 acceptance 尚未建立");

if (blockers.length || phaseFailure) {
  const blockerCount = blockers.length + (phaseFailure ? 1 : 0);
  console.error(`\nStrict roadmap completion 未通過，共 ${blockerCount} 項明確 blocker：`);
  blockers.forEach((blocker) => console.error(`- ${blocker}`));
  if (phaseFailure) console.error("- 一個以上 P1-P4 repo gate 回傳 nonzero（詳見上方輸出）");
  process.exit(1);
}

console.log("Strict roadmap completion 通過：repo 與外部核准均有完整證據。 ");
