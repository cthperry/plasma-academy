import { gases } from "./gases.js";
import { isEvidenceReference, isValidRfc3339DateTime } from "./evidence.js";

const reviewedDocuments = {
  he: { documentId: "001025", revisionDate: "2025-03-28", version: "6.04" },
  ar: { documentId: "001004", revisionDate: "2025-03-28", version: "7.05" },
  cf4: { documentId: "001051", revisionDate: "2024-11-12", version: "0.03" },
  chf3: { documentId: "001078", revisionDate: "2025-03-30", version: "0.03" },
  ch2f2: { documentId: "001054", revisionDate: "2025-04-08", version: "1.01" },
  ch3f: { documentId: "001154", revisionDate: "2018-07-25", version: "0.03" },
  c2f6: { documentId: "001053", revisionDate: "2018-11-07", version: "0.02" },
  c4f8: { documentId: "001056", revisionDate: "2022-03-15", version: "0.01" },
  sf6: { documentId: "001048", revisionDate: "2025-04-02", version: "2.02" },
  nf3: { documentId: "001079", revisionDate: "2022-03-18", version: "0.01" },
  f2: { documentId: "001061", revisionDate: "2022-03-15", version: "1.01" },
  cl2: { documentId: "001015", revisionDate: "2025-05-07", version: "2.02" },
  hbr: { documentId: "001027", revisionDate: "2022-03-03", version: "2.01" },
  bcl3: { documentId: "001005", revisionDate: "2022-10-04", version: "4.02" },
  sicl4: { documentId: "001075", revisionDate: "2022-03-18", version: "0.01" },
  o2: { documentId: "001043", revisionDate: "2020-09-22", version: "1" },
  n2o: { documentId: "001042", revisionDate: "2025-03-28", version: "1.06" },
  co2: { documentId: "001013", revisionDate: "2025-03-28", version: "8.02" },
  co: { documentId: "001014", revisionDate: "2024-10-01", version: "3.02" },
  n2: { documentId: "001040", revisionDate: "2025-03-28", version: "21.06" },
  nh3: { documentId: "001003", revisionDate: "2025-05-06", version: "4.04" },
  h2: { documentId: "001026", revisionDate: "2025-04-11", version: "8.02" },
  sih4: { documentId: "001073", revisionDate: "2023-11-21", version: "0.03" },
  b2h6: { documentId: "001071", revisionDate: "2022-03-18", version: "0.01" },
  ph3: { documentId: "001070", revisionDate: "2025-04-01", version: "0.02" },
  ch4: { documentId: "001033", revisionDate: "2025-05-08", version: "10.02" },
  cos: { documentId: "001012", revisionDate: "2017-07-03", version: "1" }
};

const airgasSupplier = "Airgas USA, LLC";
const supplierDocuments = {
  ...Object.fromEntries(Object.entries(reviewedDocuments).map(([gasId, document]) => [
    gasId,
    { ...document, supplier: airgasSupplier, sourceUrl: `https://www.airgas.com/msds/${document.documentId}.pdf` }
  ])),
  c4f6: { supplier: airgasSupplier, sourceUrl: "https://www.airgas.com/msds/001138.pdf", documentId: "001138", revisionDate: "2022-03-04", version: "0.01" },
  c5f8: { supplier: "Air Liquide Far Eastern Ltd.", sourceUrl: "https://tw.airliquide.com/sites/al_tw/files/2022-06/alfe-0082-c5f8-v09-20220302.pdf", documentId: "ALFE0082", revisionDate: "2022-03-02", version: "09" },
  teos: { supplier: "Sigma-Aldrich Inc.", sourceUrl: "https://www.sigmaaldrich.com/US/en/sds/aldrich/333859", documentId: "ALDRICH-333859", revisionDate: "2026-04-20", version: "6.11" },
  wf6: { supplier: "Air Liquide (China) Holding Co., Ltd.", sourceUrl: "https://cn.airliquide.com/sites/al_cn/files/2022-10/alc-sds-p047_tungsten-hexafluoride-wf6-2.pdf", documentId: "ALC-SDS-P047", revisionDate: "2022-02", version: "2" },
  so2: { supplier: "Air Liquide Far Eastern Ltd.", sourceUrl: "https://tw.airliquide.com/sites/al_tw/files/2022-06/alfe-0054-so2-v08-20190902.pdf", documentId: "ALFE0054", revisionDate: "2019-09-02", version: "08" }
};
const plantApprovalBoundary = "公開供應商文件核對不取代廠區核准；仍須以廠區核准的供應濃度、在地版本、供氣系統、abatement 與 EH&S 程序為準。";

export const sdsEvidence = gases.map((gas) => {
  const document = supplierDocuments[gas.id];
  if (!document) throw new Error(`缺少 ${gas.id} 的供應商 SDS 文件。`);

  const revisionYear = Number(document.revisionDate.slice(0, 4));
  return {
    gasId: gas.id,
    cas: gas.cas,
    reviewStatus: "supplier-reviewed",
    localApprovalStatus: "pending",
    localApproval: {
      reviewer: { name: "", role: "" },
      site: "",
      approvedAt: "",
      evidence: []
    },
    reviewedAt: "2026-07-30",
    ...document,
    reviewScope: ["產品名稱", "CAS", "GHS 危害分類", "修訂日期與版本"],
    note: revisionYear >= 2024
      ? `已核對供應商公開文件。 ${plantApprovalBoundary}`
      : `已核對供應商公開文件，但修訂日早於 2024；在廠區核准前，請向供應商確認是否有新版。 ${plantApprovalBoundary}`
  };
});

export const sdsEvidenceByGas = Object.fromEntries(sdsEvidence.map((entry) => [entry.gasId, entry]));

export function isLocalApprovalShapeComplete(evidence) {
  return evidence.localApprovalStatus === "approved"
    && isNonEmptyString(evidence.localApproval?.reviewer?.name)
    && isNonEmptyString(evidence.localApproval?.reviewer?.role)
    && isNonEmptyString(evidence.localApproval?.site)
    && isValidRfc3339DateTime(evidence.localApproval?.approvedAt)
    && Array.isArray(evidence.localApproval?.evidence)
    && evidence.localApproval.evidence.length > 0
    && evidence.localApproval.evidence.every(isEvidenceReference);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
