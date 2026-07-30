import { gases } from "./gases.js";

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

export const sdsEvidence = gases.map((gas) => {
  const document = reviewedDocuments[gas.id];
  if (!document) {
    return {
      gasId: gas.id,
      cas: gas.cas,
      supplier: "Airgas",
      sourceUrl: gas.sdsSource,
      reviewStatus: "directory-only",
      localApprovalStatus: "pending",
      reviewedAt: null,
      documentId: null,
      revisionDate: null,
      version: null,
      reviewScope: [],
      note: "已有供應商 SDS 目錄入口；仍需定位與核對純物質文件，再比對廠區核准版本。"
    };
  }

  const revisionYear = Number(document.revisionDate.slice(0, 4));
  return {
    gasId: gas.id,
    cas: gas.cas,
    supplier: "Airgas USA, LLC",
    sourceUrl: `https://www.airgas.com/msds/${document.documentId}.pdf`,
    reviewStatus: "supplier-reviewed",
    localApprovalStatus: "pending",
    reviewedAt: "2026-07-30",
    ...document,
    reviewScope: ["產品名稱", "CAS", "GHS 危害分類", "修訂日期與版本"],
    note: revisionYear >= 2024
      ? "已核對供應商文件；仍須由廠區 EH&S 比對實際供應濃度、在地版本與核准程序。"
      : "供應商文件已核對，但修訂日早於 2024；需先向供應商確認是否有新版，再進行廠區核准。"
  };
});

export const sdsEvidenceByGas = Object.fromEntries(sdsEvidence.map((entry) => [entry.gasId, entry]));
