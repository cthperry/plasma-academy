export const constants = {
  electronCharge: 1.602176634e-19,
  electronMass: 9.1093837139e-31,
  epsilon0: 8.8541878128e-12,
  boltzmann: 1.380649e-23,
  argonIonMass: 6.6335209e-26,
  argonIonizationEv: 15.76
};

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
