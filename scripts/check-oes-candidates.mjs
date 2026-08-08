import { spectra } from "../src/data/spectra.js";

const molecularSpecies = new Set(["CO", "CN", "C2", "N2", "OH"]);
const bands = spectra.filter((line) => molecularSpecies.has(line.species));
const failures = [];

for (const band of bands) {
  if (band.verificationStatus !== "pending-source-review") {
    failures.push(`${band.id} 在具名審閱前必須維持 pending-source-review。`);
  }
  if (!Array.isArray(band.candidateSources) || band.candidateSources.length < 2) {
    failures.push(`${band.id} 至少需要兩筆候選來源。`);
    continue;
  }
  for (const candidate of band.candidateSources) {
    if (!/^https:\/\//.test(candidate.url ?? "") || !(candidate.scope ?? "").trim()) {
      failures.push(`${band.id} 含無效的候選來源 URL 或適用範圍。`);
    }
  }
}

if (bands.length !== 9) failures.push(`分子帶應為 9 筆，目前 ${bands.length} 筆。`);

if (failures.length) {
  console.error(`OES 候選來源檢查失敗（${failures.length}）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("OES 候選來源檢查通過：9/9 分子帶各有至少兩筆候選來源，核准狀態仍為 0/9。");
