import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export const REVIEW_GATES = Object.freeze(["technical", "teaching", "consistency"]);

const levelCriteria = {
  1: {
    technical: [/物理|公式|模型/],
    teaching: [/六章|A01|初階/],
    consistency: [/glossary|術語/, /單位|圖號/]
  },
  2: {
    technical: [/氣體|gas/i, /SDS/i, /安全|EH&S|EHS/i, /邊界|不取代|核准/],
    teaching: [/氣體百科|A08|A16|中階/],
    consistency: [/SDS|CAS|F\/C/, /氣體|危害/]
  },
  3: {
    technical: [/profile|輪廓/i, /defect|缺陷/i, /package|封裝/i, /PCB/i, /A17/, /A18/, /A19/, /A20/, /A21/, /A22/, /A23/, /A24/, /A25/, /A33/, /A34/],
    teaching: [/診斷|案例/, /3\.1|3\.8|八章/],
    consistency: [/缺陷|封裝|PCB/, /A17|A34/]
  },
  4: {
    technical: [/diagnostics|診斷/i, /control|控制/i, /damage|損傷/i, /advanced|進階/i, /models|模型/i, /production|量產/i, /OES/i, /source|來源/i, /boundar|邊界/i],
    teaching: [/A26|A32/, /專家|量產案例/],
    consistency: [/OES|譜線/, /診斷|控制|損傷|量產/]
  }
};

export async function validateReviewPackets(reviewRoot) {
  const failures = [];
  for (const level of [1, 2, 3, 4]) {
    const directory = path.join(reviewRoot, `l${level}`);
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") {
        failures.push(`L${level} 審閱目錄不存在。`);
        continue;
      }
      throw error;
    }

    const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
    const jsonFiles = files.filter((name) => name.endsWith(".json"));
    const expectedJson = REVIEW_GATES.map((gate) => `${gate}-review.json`).sort();
    const expectedFiles = [...expectedJson, "README.md"].sort();
    if (JSON.stringify(files) !== JSON.stringify(expectedFiles)) failures.push(`L${level} 必須恰好包含三份審閱 JSON 與 README.md。`);
    if (JSON.stringify(jsonFiles) !== JSON.stringify(expectedJson)) failures.push(`L${level} 必須剛好包含 technical、teaching、consistency 三份 JSON。`);
    if (!files.includes("README.md")) failures.push(`L${level} 缺少 README.md。`);
    else {
      const readme = await readFile(path.join(directory, "README.md"), "utf8");
      if (!/具名|accountable/i.test(readme) || !/approved/.test(readme) || !/reviewed_commit/.test(readme)) failures.push(`L${level} README 未說明具名責任者與核准程序。`);
    }

    for (const gate of REVIEW_GATES) {
      const file = `${gate}-review.json`;
      if (!jsonFiles.includes(file)) continue;
      let review;
      try {
        review = JSON.parse(await readFile(path.join(directory, file), "utf8"));
      } catch (error) {
        failures.push(`L${level} ${file} 不是有效 JSON：${error.message}`);
        continue;
      }
      if (review.gate !== gate) failures.push(`L${level} ${file} 的 gate 必須為 ${gate}。`);
      if (!["pending", "changes_requested", "approved"].includes(review.status)) failures.push(`L${level} ${file} 的 status 無效。`);
      if (!Array.isArray(review.criteria) || review.criteria.length < 3) failures.push(`L${level} ${file} 至少需要三項 criteria。`);
      if (!Array.isArray(review.evidence) || !Array.isArray(review.findings)) failures.push(`L${level} ${file} 的 evidence/findings 必須為陣列。`);
      const criteria = (review.criteria ?? []).join(" ");
      for (const requirement of levelCriteria[level][gate]) {
        if (!requirement.test(criteria)) failures.push(`L${level} ${gate} criteria 缺少層級專屬準則：${requirement.source}。`);
      }
      if (review.status === "pending") {
        if (review.reviewer?.name || review.reviewer?.role || review.reviewed_commit || review.approved_at) failures.push(`L${level} ${file} pending 時審閱者、reviewed_commit 與 approved_at 必須留白。`);
      }
      if (review.status === "approved") {
        if (!review.reviewer?.name || !review.reviewer?.role || !review.reviewed_commit || !review.approved_at) failures.push(`L${level} ${file} approved 時必須填妥全部審閱證據。`);
      }
    }
  }
  return failures;
}

export async function countApprovedReviews(reviewRoot, level) {
  let approved = 0;
  for (const gate of REVIEW_GATES) {
    try {
      const review = JSON.parse(await readFile(path.join(reviewRoot, `l${level}`, `${gate}-review.json`), "utf8"));
      if (review.status === "approved" && review.reviewer?.name && review.reviewer?.role && review.reviewed_commit && review.approved_at) approved += 1;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return approved;
}

export async function pendingReviewGates(reviewRoot) {
  const pending = [];
  for (const level of [1, 2, 3, 4]) {
    for (const gate of REVIEW_GATES) {
      try {
        const review = JSON.parse(await readFile(path.join(reviewRoot, `l${level}`, `${gate}-review.json`), "utf8"));
        if (!(review.status === "approved" && review.reviewer?.name && review.reviewer?.role && review.reviewed_commit && review.approved_at)) pending.push(`L${level} ${gate}`);
      } catch (_) {
        pending.push(`L${level} ${gate}`);
      }
    }
  }
  return pending;
}
