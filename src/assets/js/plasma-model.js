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
