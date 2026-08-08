import { evaluateAdvancedModelAcceptance } from "./lib/advanced-model-acceptance.mjs";

const results = evaluateAdvancedModelAcceptance();
const failures = results.filter((item) => !item.passed);

if (failures.length) {
  console.error(`進階空間模型 acceptance 失敗（${failures.length}/${results.length}）：`);
  failures.forEach((item) => console.error(`- ${item.id} ${item.title}：${item.failedChecks.join(", ")}`));
  process.exit(1);
}

console.log(`進階空間模型 acceptance 通過：${results.map((item) => `${item.id} ${Object.keys(item.checks).length}/${Object.keys(item.checks).length}`).join("；")}。`);
