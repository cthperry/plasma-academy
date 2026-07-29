export const constants = {
  electronCharge: 1.602176634e-19,
  epsilon0: 8.8541878128e-12,
  boltzmann: 1.380649e-23,
  argonIonizationEv: 15.76
};

export function debyeLengthMm({ electronDensityCm3, electronTemperatureEv }) {
  const ne = electronDensityCm3 * 1e6;
  const teJ = electronTemperatureEv * constants.electronCharge;
  return Math.sqrt((constants.epsilon0 * teJ) / (ne * constants.electronCharge ** 2)) * 1000;
}

export function exaggeratedIonization(electricField, pressure) {
  return Math.max(0, Math.min(1e-3, ((electricField / 500) ** 2) / Math.max(pressure, 1) * 0.015));
}

export function meanFreePathCm(pressureMtorr, gas = "Ar") {
  const scale = { He: 8.5, Ar: 5, Xe: 3.3 }[gas] ?? 5;
  return scale / Math.max(pressureMtorr, 0.1);
}

export function paschenVoltage(pdTorrCm, gas = "Ar") {
  const constantsByGas = {
    Ar: { A: 15, B: 180, gamma: 0.01 },
    He: { A: 3.8, B: 34, gamma: 0.01 },
    N2: { A: 12, B: 342, gamma: 0.01 },
    Air: { A: 11.25, B: 273.8, gamma: 0.01 }
  };
  const { A, B, gamma } = constantsByGas[gas] ?? constantsByGas.Ar;
  const pd = Math.max(pdTorrCm, 0.02);
  const denominator = Math.log(A * pd) - Math.log(Math.log(1 + 1 / gamma));
  if (denominator <= 0) return 5000;
  return Math.min(5000, Math.max(50, (B * pd) / denominator));
}
