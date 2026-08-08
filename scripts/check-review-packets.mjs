import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateReviewPackets } from "./lib/review-packets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, "docs", "reviews");
const failures = await validateReviewPackets(reviewRoot, root);

if (failures.length) {
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("L1-L4 審閱封包結構通過：各層恰有 technical、teaching、consistency 與責任流程 README；核准狀態由 strict audit 判定。 ");
