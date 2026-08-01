const nistAsdSource = "https://physics.nist.gov/PhysRefData/ASD/lines_form.html";
const molecularTeachingSource = "Plasma Academy 教學近似；分子帶位置待正式光譜資料來源審查";

function atomicLine(id, species, wavelengthNm, transition, relativeIntensity, extra = {}) {
  return {
    id,
    species,
    wavelengthNm,
    transition,
    relativeIntensity,
    source: nistAsdSource,
    sourceType: "official-database-reference",
    verificationStatus: "pending-line-review",
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
    intensityType: "pedagogical-weight",
    ...extra
  };
}

// relativeIntensity 僅供本站製程情境計算，不是 NIST ASD 的通用相對強度。
export const spectra = [
  atomicLine("f-703.7", "F", 703.7, "F I atomic emission", 0.9, { excitationThresholdEv: 14.75 }),
  atomicLine("f-685.6", "F", 685.6, "F I atomic emission", 0.55, { excitationThresholdEv: 14.5 }),
  atomicLine("ar-750.4", "Ar", 750.4, "Ar I atomic emission", 0.8, { excitationThresholdEv: 13.48, actinometryReference: true }),
  atomicLine("ar-811.5", "Ar", 811.5, "Ar I atomic emission", 0.75, { excitationThresholdEv: 13.08, actinometryReference: true }),
  atomicLine("o-777.4", "O", 777.4, "O I atomic triplet", 1, { excitationThresholdEv: 10.74 }),
  atomicLine("o-844.6", "O", 844.6, "O I atomic emission", 0.7, { excitationThresholdEv: 10.99 }),
  molecularBand("co-483.5", "CO", 483.5, "Molecular band teaching marker", 1, { excitationThresholdEv: 11 }),
  molecularBand("co-519.0", "CO", 519, "Molecular band teaching marker", 0.65, { excitationThresholdEv: 11.2 }),
  atomicLine("si-251.6", "Si", 251.6, "Si I atomic emission", 1, { excitationThresholdEv: 5.1 }),
  atomicLine("si-288.2", "Si", 288.2, "Si I atomic emission", 0.65, { excitationThresholdEv: 5.08 }),
  molecularBand("cn-387.1", "CN", 387.1, "Violet system band head", 0.7, { excitationThresholdEv: 3.2 }),
  molecularBand("cn-388.3", "CN", 388.3, "Violet system band head", 0.5, { excitationThresholdEv: 3.2 }),
  molecularBand("c2-516.5", "C2", 516.5, "Swan system band head", 0.7, { excitationThresholdEv: 2.5 }),
  atomicLine("h-656.3", "H", 656.3, "Balmer H-alpha", 0.8, { excitationThresholdEv: 12.09 }),
  atomicLine("cl-837.6", "Cl", 837.6, "Cl I atomic emission", 0.85, { excitationThresholdEv: 10.6 }),
  atomicLine("cl-725.7", "Cl", 725.7, "Cl I atomic emission", 0.55, { excitationThresholdEv: 10.8 }),
  atomicLine("br-470.0", "Br", 470, "Br I atomic emission", 0.8, { excitationThresholdEv: 9 }),
  atomicLine("br-478.0", "Br", 478, "Br I atomic emission", 0.55, { excitationThresholdEv: 9.1 }),
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
