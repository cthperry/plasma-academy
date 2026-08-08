const nistAsdSource = "https://physics.nist.gov/PhysRefData/ASD/lines_form.html";
const molecularTeachingSource = "Plasma Academy 教學近似；分子帶位置待正式光譜資料來源審查";
const RFC3339_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function atomicLine(id, species, wavelengthNm, spectrumStage, transition, relativeIntensity, source, extra = {}) {
  return {
    id,
    species,
    wavelengthNm,
    spectrumStage,
    transition,
    relativeIntensity,
    source,
    sourceType: "official-database-line-record",
    verificationStatus: "nist-line-verified",
    intensityType: "pedagogical-weight",
    ...extra
  };
}

function molecularBand(id, species, wavelengthNm, transition, relativeIntensity, extra = {}) {
  return {
    id,
    species,
    wavelengthNm,
    transition,
    relativeIntensity,
    source: molecularTeachingSource,
    sourceType: "pedagogical-molecular-band",
    verificationStatus: "pending-source-review",
    sourceApproval: {
      reviewer: { name: "", role: "" },
      reviewedAt: "",
      evidence: []
    },
    intensityType: "pedagogical-weight",
    ...extra
  };
}

// relativeIntensity 僅供本站製程情境計算，不是 NIST ASD 的通用相對強度。
export const spectra = [
  atomicLine("f-703.7", "F", 703.7469, "I", "F I atomic emission", 0.9, "https://physics.nist.gov/PhysRefData/Handbook/Tables/fluorinetable2.htm", { excitationThresholdEv: 14.75 }),
  atomicLine("f-685.6", "F", 685.603, "I", "F I atomic emission", 0.55, "https://physics.nist.gov/PhysRefData/Handbook/Tables/fluorinetable2.htm", { excitationThresholdEv: 14.5 }),
  atomicLine("ar-750.4", "Ar", 750.3869, "I", "Ar I atomic emission", 0.8, "https://physics.nist.gov/PhysRefData/Handbook/Tables/argontable2.htm", { excitationThresholdEv: 13.48, actinometryReference: true }),
  atomicLine("ar-811.5", "Ar", 811.5311, "I", "Ar I atomic emission", 0.75, "https://physics.nist.gov/PhysRefData/Handbook/Tables/argontable2.htm", { excitationThresholdEv: 13.08, actinometryReference: true }),
  atomicLine("o-777.4", "O", 777.417, "I", "O I atomic triplet", 1, "https://physics.nist.gov/PhysRefData/Handbook/Tables/oxygentable2_a.htm", { excitationThresholdEv: 10.74 }),
  atomicLine("o-844.6", "O", 844.625, "I", "O I atomic emission", 0.7, "https://physics.nist.gov/PhysRefData/Handbook/Tables/oxygentable2_a.htm", { excitationThresholdEv: 10.99 }),
  molecularBand("co-483.5", "CO", 483.5, "Molecular band teaching marker", 1, { excitationThresholdEv: 11 }),
  molecularBand("co-519.0", "CO", 519, "Molecular band teaching marker", 0.65, { excitationThresholdEv: 11.2 }),
  atomicLine("si-251.6", "Si", 251.6112, "I", "Si I atomic emission", 1, "https://physics.nist.gov/PhysRefData/Handbook/Tables/silicontable2_a.htm", { excitationThresholdEv: 5.1 }),
  atomicLine("si-288.2", "Si", 288.15771, "I", "Si I atomic emission", 0.65, "https://physics.nist.gov/PhysRefData/Handbook/Tables/silicontable2_a.htm", { excitationThresholdEv: 5.08 }),
  molecularBand("cn-387.1", "CN", 387.1, "Violet system band head", 0.7, { excitationThresholdEv: 3.2 }),
  molecularBand("cn-388.3", "CN", 388.3, "Violet system band head", 0.5, { excitationThresholdEv: 3.2 }),
  molecularBand("c2-516.5", "C2", 516.5, "Swan system band head", 0.7, { excitationThresholdEv: 2.5 }),
  atomicLine("h-656.3", "H", 656.28518, "I", "Balmer H-alpha", 0.8, "https://physics.nist.gov/PhysRefData/Handbook/Tables/hydrogentable2.htm", { excitationThresholdEv: 12.09 }),
  atomicLine("cl-837.6", "Cl", 837.594, "I", "Cl I atomic emission", 0.85, "https://physics.nist.gov/PhysRefData/Handbook/Tables/chlorinetable2.htm", { excitationThresholdEv: 10.6 }),
  atomicLine("cl-725.7", "Cl", 725.662, "I", "Cl I atomic emission", 0.55, "https://physics.nist.gov/PhysRefData/Handbook/Tables/chlorinetable2.htm", { excitationThresholdEv: 10.8 }),
  atomicLine("br-470.0", "Br", 470.492, "II", "Br II atomic emission", 0.8, "https://physics.nist.gov/PhysRefData/Handbook/Tables/brominetable2.htm", { excitationThresholdEv: 9 }),
  atomicLine("br-478.0", "Br", 478.548, "II", "Br II atomic emission", 0.55, "https://physics.nist.gov/PhysRefData/Handbook/Tables/brominetable2.htm", { excitationThresholdEv: 9.1 }),
  molecularBand("n2-336.0", "N2", 336, "Second positive system teaching marker", 0.9, { excitationThresholdEv: 11 }),
  molecularBand("n2-357.0", "N2", 357, "Second positive system teaching marker", 0.6, { excitationThresholdEv: 11.1 }),
  molecularBand("oh-306.0", "OH", 306, "A-X band teaching marker", 0.9, { excitationThresholdEv: 9 }),
  molecularBand("oh-309.0", "OH", 309, "A-X band teaching marker", 0.65, { excitationThresholdEv: 9.1 })
];

export const spectrumSources = {
  nistAsd: {
    label: "NIST Atomic Spectra Database",
    url: nistAsdSource,
    doi: "https://doi.org/10.18434/T4W30F",
    scope: "僅原子與離子譜線；本站教學權重不取自 NIST 相對強度"
  },
  molecularTeachingApproximation: {
    label: "分子帶教學近似",
    status: "pending-source-review",
    scope: "CO、CN、C2、N2、OH 不宣稱已由 NIST ASD 核實"
  }
};

export function isMolecularSourceApprovalComplete(line) {
  const approval = line?.sourceApproval;
  return line?.verificationStatus === "molecular-source-approved"
    && line?.sourceType === "reviewed-molecular-band-source"
    && /^https:\/\//.test(line?.source ?? "")
    && isNonEmptyString(approval?.reviewer?.name)
    && isNonEmptyString(approval?.reviewer?.role)
    && isRfc3339DateTime(approval?.reviewedAt)
    && Array.isArray(approval?.evidence)
    && approval.evidence.length > 0
    && approval.evidence.every(isNonEmptyString);
}

export function isMolecularSourcePending(line) {
  const approval = line?.sourceApproval;
  return line?.verificationStatus === "pending-source-review"
    && line?.sourceType === "pedagogical-molecular-band"
    && line?.source === molecularTeachingSource
    && !approval?.reviewer?.name
    && !approval?.reviewer?.role
    && !approval?.reviewedAt
    && Array.isArray(approval?.evidence)
    && approval.evidence.length === 0;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isRfc3339DateTime(value) {
  return isNonEmptyString(value) && RFC3339_DATE_TIME.test(value) && !Number.isNaN(Date.parse(value));
}
