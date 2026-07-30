export const constants = {
  electronCharge: 1.602176634e-19,
  electronMass: 9.1093837139e-31,
  epsilon0: 8.8541878128e-12,
  boltzmann: 1.380649e-23,
  argonIonMass: 6.6335209e-26,
  argonIonizationEv: 15.76
};

export function neutralGasDensityCm3(pressureMtorr, temperatureK = 300) {
  const pressurePa = Math.max(pressureMtorr, 0) * 0.133322368;
  return pressurePa / (constants.boltzmann * Math.max(temperatureK, 1)) / 1e6;
}

export function residenceTimeSeconds({ pressureMtorr, volumeL, flowSccm }) {
  return 79 * (Math.max(pressureMtorr, 0) / 1000) * Math.max(volumeL, 0) / Math.max(flowSccm, 0.001);
}

export function effectivePumpingSpeedLps({ pressureMtorr, flowSccm }) {
  const throughputTorrLps = Math.max(flowSccm, 0) * (760 / 60000);
  return throughputTorrLps / Math.max(pressureMtorr / 1000, 1e-9);
}

export const fluorocarbonGases = {
  CF4: { label: "CF₄", fcRatio: 4 },
  CHF3: { label: "CHF₃", fcRatio: 3 },
  C4F8: { label: "C₄F₈", fcRatio: 2 },
  C4F6: { label: "C₄F₆", fcRatio: 1.5 },
  CH3F: { label: "CH₃F", fcRatio: 1 }
};

export function fluorocarbonProfile({ gas = "C4F8", oxygenPercent = 8, hydrogenPercent = 0, biasW = 250, substrate = "SiO2" }) {
  const baseFc = fluorocarbonGases[gas]?.fcRatio ?? 2;
  const effectiveFc = Math.max(0.4, baseFc + oxygenPercent * 0.045 - hydrogenPercent * 0.035);
  const polymerSupply = 90 / effectiveFc;
  const ionRemoval = Math.sqrt(Math.max(biasW, 0)) * 4.2;
  const oxygenAssist = substrate === "SiO2" ? 24 : 4;
  const materialFactor = substrate === "SiO2" ? 1 : 0.24;
  const chemicalEtch = Math.max(0, effectiveFc - 0.75) * 38 * materialFactor;
  const bottomNetRate = Math.max(0, chemicalEtch + ionRemoval + oxygenAssist - polymerSupply);
  const maskRate = Math.max(1, effectiveFc * 5 + biasW * 0.018);
  const sidewallPolymer = Math.max(0, polymerSupply - effectiveFc * 7);
  let regime = "process-window";
  if (effectiveFc >= 3.25 && biasW >= 60) regime = "isotropic";
  if (effectiveFc < 1.65 || biasW < 45 || bottomNetRate < 8) regime = "etch-stop";
  return {
    baseFc,
    effectiveFc,
    polymerSupply,
    ionRemoval,
    bottomNetRate,
    maskRate,
    sidewallPolymer,
    selectivityToMask: bottomNetRate / maskRate,
    regime
  };
}

export function debyeLengthMm({ electronDensityCm3, electronTemperatureEv }) {
  const ne = electronDensityCm3 * 1e6;
  const teJ = electronTemperatureEv * constants.electronCharge;
  return Math.sqrt((constants.epsilon0 * teJ) / (ne * constants.electronCharge ** 2)) * 1000;
}

export function floatingPotentialDropEv(electronTemperatureEv, ionMassKg = constants.argonIonMass) {
  return (electronTemperatureEv / 2) * Math.log(ionMassKg / (2 * Math.PI * constants.electronMass));
}

export function childLangmuirSheathMm({
  electronDensityCm3,
  electronTemperatureEv,
  potentialDropV = floatingPotentialDropEv(electronTemperatureEv)
}) {
  const densityM3 = Math.max(electronDensityCm3, 1) * 1e6;
  const bohmSpeed = Math.sqrt((constants.electronCharge * electronTemperatureEv) / constants.argonIonMass);
  const ionCurrentDensity = constants.electronCharge * densityM3 * bohmSpeed;
  const coefficient = (4 / 9) * constants.epsilon0 * Math.sqrt((2 * constants.electronCharge) / constants.argonIonMass);
  const thicknessM = Math.sqrt((coefficient * Math.max(potentialDropV, 0.01) ** 1.5) / ionCurrentDensity);
  return thicknessM * 1000;
}

export function exaggeratedIonization(electricField, pressure) {
  return Math.max(0, Math.min(1e-3, ((electricField / 500) ** 2) / Math.max(pressure, 1) * 0.015));
}

export function meanFreePathCm(pressureMtorr, gas = "Ar") {
  const scale = { He: 8.5, Ar: 5, Xe: 3.3 }[gas] ?? 5;
  return scale / Math.max(pressureMtorr, 0.1);
}

export function ionAngularFwhmDeg({ pressureMtorr, gas = "Ar", pathLengthCm = 5 }) {
  const expectedCollisions = pathLengthCm / meanFreePathCm(pressureMtorr, gas);
  return Math.min(85, 2.5 + 5.2 * Math.sqrt(expectedCollisions));
}

export function townsendDischarge({
  reducedFieldVPerCmTorr,
  gamma,
  gapCm,
  pressureTorr = 1,
  coefficientA = 15,
  coefficientB = 180
}) {
  const reducedField = Math.max(reducedFieldVPerCmTorr, 1);
  const alphaPerCm = pressureTorr * coefficientA * Math.exp(-coefficientB / reducedField);
  const exponent = Math.min(14, alphaPerCm * Math.max(gapCm, 0));
  const gain = Math.exp(exponent);
  const feedback = Math.max(gamma, 0) * (gain - 1);
  return {
    alphaPerCm,
    gain,
    feedback,
    selfSustaining: feedback >= 1,
    criticalGamma: gain > 1 ? 1 / (gain - 1) : Number.POSITIVE_INFINITY
  };
}

export const paschenGases = {
  Ar: paschenGasFromMinimum({ label: "Ar", pdMinTorrCm: 0.9, vMin: 137, gamma: 0.01, glow: "#c26be8" }),
  He: paschenGasFromMinimum({ label: "He", pdMinTorrCm: 4.0, vMin: 156, gamma: 0.01, glow: "#f2b04b" }),
  N2: paschenGasFromMinimum({ label: "N₂", pdMinTorrCm: 0.67, vMin: 251, gamma: 0.01, glow: "#8b66f1" }),
  Air: paschenGasFromMinimum({ label: "Air", pdMinTorrCm: 0.57, vMin: 327, gamma: 0.01, glow: "#80b7ff" }),
  O2: paschenGasFromMinimum({ label: "O₂", pdMinTorrCm: 0.70, vMin: 450, gamma: 0.01, glow: "#9ed7ff" })
};

function paschenGasFromMinimum({ label, pdMinTorrCm, vMin, gamma, glow }) {
  const secondaryTerm = Math.log(1 + 1 / gamma);
  return {
    label,
    pdMinTorrCm,
    vMin,
    gamma,
    A: (Math.E * secondaryTerm) / pdMinTorrCm,
    B: vMin / pdMinTorrCm,
    glow
  };
}

export function paschenVoltage(pdTorrCm, gas = "Ar") {
  const { A, B, gamma } = paschenGases[gas] ?? paschenGases.Ar;
  const pd = Math.max(pdTorrCm, 0.02);
  const denominator = Math.log(A * pd) - Math.log(Math.log(1 + 1 / gamma));
  if (denominator <= 0) return Number.POSITIVE_INFINITY;
  return Math.max(0, (B * pd) / denominator);
}

export function paschenMargin({ pdTorrCm, voltage, gas = "Ar" }) {
  const breakdownVoltage = paschenVoltage(pdTorrCm, gas);
  return {
    breakdownVoltage,
    margin: voltage - breakdownVoltage,
    ignites: voltage >= breakdownVoltage
  };
}
