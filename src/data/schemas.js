export const dataSchemas = {
  gas: {
    required: ["id", "formula", "cas", "nameZh", "nameEn", "family", "molecularWeight", "boilingPointC", "vaporPressure", "dissociationProducts", "ionizationEnergyEv", "bondEnergy", "uses", "typicalFlowSccm", "hazardLevel", "hazards", "gwp", "fcRatio", "compatibleMaterials", "incompatibleMaterials", "etchProducts", "scrubber", "failureModes", "sdsSource", "sdsStatus"],
    notes: "P2 前必須以 SDS 核實 hazardLevel、相容材質與排放風險。"
  },
  sdsEvidence: {
    required: ["gasId", "cas", "supplier", "sourceUrl", "reviewStatus", "localApprovalStatus", "reviewedAt", "documentId", "revisionDate", "version", "reviewScope", "note"],
    notes: "supplier-reviewed 只代表核對供應商公開文件；localApprovalStatus=approved 才能視為廠區版本已驗證。"
  },
  defect: {
    required: ["id", "zh", "en", "cat", "symptom", "causes", "distinguish", "fixes", "related", "ch", "profilePresetId", "risk"],
    notes: "P3 缺陷圖鑑與 A21 共用；profilePresetId 只連到 A18 單一預設來源，fixes 必須含旋鈕、方向、理由與副作用。"
  },
  formula: {
    required: ["id", "name", "expression", "summary", "symbols", "conditions", "source"],
    notes: "公式必須可 HTML 選取，不以圖片作為主要呈現。"
  },
  quizQuestion: {
    required: ["id", "level", "chapter", "type", "prompt", "choices", "answer", "explanation"],
    notes: "測驗題必須對應已發布內容，不考尚未寫入正文的知識。"
  },
  spectrumLine: {
    required: ["id", "species", "wavelengthNm", "transition", "relativeIntensity", "source"],
    notes: "P4 OES 譜線必須查 NIST 或等級相當的資料來源。"
  }
};
