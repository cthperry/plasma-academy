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

export const eedfGases = {
  Ar: { label: "Ar", ionization: 15.76, excitation: 11.55, dissociation: 13.1 },
  CF4: { label: "CF₄", ionization: 15.9, excitation: 8.0, dissociation: 5.6 },
  O2: { label: "O₂", ionization: 12.07, excitation: 1.0, dissociation: 5.12 },
  N2: { label: "N₂", ionization: 15.58, excitation: 6.2, dissociation: 9.8 }
};

export function eedfReactionModel({ electronTemperatureEv = 3, distribution = "maxwellian", gas = "Ar" }) {
  const te = Math.max(0.2, electronTemperatureEv);
  const thresholds = eedfGases[gas] ?? eedfGases.Ar;
  const stepEv = 0.1;
  const samples = [];
  let normalization = 0;
  for (let energyEv = stepEv; energyEv <= 40; energyEv += stepEv) {
    const raw = distribution === "druyvesteyn"
      ? Math.sqrt(energyEv) * Math.exp(-((energyEv / (1.9 * te)) ** 2))
      : Math.sqrt(energyEv) * Math.exp(-energyEv / te);
    samples.push({ energyEv, raw });
    normalization += raw * stepEv;
  }

  const rates = { ionization: 0, excitation: 0, dissociation: 0 };
  const points = samples.map(({ energyEv, raw }) => {
    const probability = raw / Math.max(normalization, Number.EPSILON);
    const speed = Math.sqrt(energyEv);
    const ionizationCrossSection = thresholdCrossSection(energyEv, thresholds.ionization, 1);
    const excitationCrossSection = thresholdCrossSection(energyEv, thresholds.excitation, 0.72);
    const dissociationCrossSection = thresholdCrossSection(energyEv, thresholds.dissociation, gas === "Ar" ? 0.12 : 0.88);
    rates.ionization += ionizationCrossSection * speed * probability * stepEv;
    rates.excitation += excitationCrossSection * speed * probability * stepEv;
    rates.dissociation += dissociationCrossSection * speed * probability * stepEv;
    return {
      energyEv,
      probability,
      ionizationCrossSection,
      excitationCrossSection,
      dissociationCrossSection,
      ionizationOverlap: probability * ionizationCrossSection * speed
    };
  });
  return { points, rates, thresholds, electronTemperatureEv: te, distribution, gas };
}

function thresholdCrossSection(energyEv, thresholdEv, amplitude) {
  if (energyEv <= thresholdEv) return 0;
  const reduced = thresholdEv / energyEv;
  return amplitude * (1 - reduced) ** 1.35 * reduced ** 0.45;
}

export const iedfIons = {
  Ar: { label: "Ar⁺", massAmu: 39.95 },
  Cl: { label: "Cl⁺", massAmu: 35.45 },
  CF3: { label: "CF₃⁺", massAmu: 69.01 }
};

export function simulateIedf({ frequencyMhz = 13.56, biasV = 300, pressureMtorr = 5, ion = "Ar", samples = 160 }) {
  const ionData = iedfIons[ion] ?? iedfIons.Ar;
  const massKg = ionData.massAmu * 1.6605390666e-27;
  const charge = constants.electronCharge;
  const frequencyHz = Math.max(frequencyMhz, 0.05) * 1e6;
  const period = 1 / frequencyHz;
  const sheathThicknessM = 0.005;
  const meanFreePathM = 0.05 / Math.max(pressureMtorr, 0.1);
  const bohmVelocity = Math.sqrt((3 * charge) / massKg);
  const dt = Math.min(period / 70, 2e-9);
  const energiesEv = [];
  const trajectories = [];

  for (let index = 0; index < samples; index += 1) {
    const phase = (index / samples) * Math.PI * 2;
    let x = 0;
    let velocity = bohmVelocity;
    let time = 0;
    let pathSinceCollision = 0;
    let collisionDistance = -meanFreePathM * Math.log(Math.max(seededUnit(index * 37 + 11), 1e-6));
    let collisions = 0;
    const trace = [];
    while (x < sheathThicknessM && time < 8e-6) {
      const voltage = Math.max(1, biasV * (0.72 + 0.28 * Math.sin(2 * Math.PI * frequencyHz * time + phase)));
      const acceleration = (charge * voltage) / (massKg * sheathThicknessM);
      velocity += acceleration * dt;
      const dx = Math.max(0, velocity * dt);
      x += dx;
      pathSinceCollision += dx;
      if (pathSinceCollision >= collisionDistance && x < sheathThicknessM * 0.98) {
        velocity = 350 + 250 * seededUnit(index * 53 + collisions * 19 + 7);
        pathSinceCollision = 0;
        collisions += 1;
        collisionDistance = -meanFreePathM * Math.log(Math.max(seededUnit(index * 71 + collisions * 31 + 3), 1e-6));
      }
      if (index < 8 && trace.length < 40 && trace.length <= time / Math.max(dt * 8, 1e-12)) trace.push([Math.min(1, x / sheathThicknessM), voltage / biasV]);
      time += dt;
    }
    energiesEv.push(Math.max(0, 0.5 * massKg * velocity ** 2 / charge));
    if (index < 8) trajectories.push({ phase, collisions, points: trace });
  }

  energiesEv.sort((a, b) => a - b);
  const meanEnergyEv = energiesEv.reduce((sum, value) => sum + value, 0) / energiesEv.length;
  const p10 = quantile(energiesEv, 0.1);
  const p90 = quantile(energiesEv, 0.9);
  const peakSeparationEv = p90 - p10;
  const lowEnergyFraction = energiesEv.filter((energy) => energy < meanEnergyEv * 0.55).length / energiesEv.length;
  const histogram = histogramOf(energiesEv, 48, Math.max(biasV * 1.1, energiesEv.at(-1) * 1.02, 20));
  return {
    energiesEv,
    trajectories,
    histogram,
    meanEnergyEv,
    peakSeparationEv,
    lowEnergyFraction,
    sheathThicknessMm: sheathThicknessM * 1000,
    meanFreePathMm: meanFreePathM * 1000,
    frequencyMhz,
    biasV,
    pressureMtorr,
    ion,
    ionMassAmu: ionData.massAmu
  };
}

function histogramOf(values, bins, maxValue) {
  const counts = Array.from({ length: bins }, () => 0);
  for (const value of values) counts[Math.min(bins - 1, Math.floor(value / maxValue * bins))] += 1;
  return counts.map((count, index) => ({ energyEv: (index + 0.5) / bins * maxValue, count }));
}

function quantile(sorted, fraction) {
  const index = Math.min(sorted.length - 1, Math.max(0, (sorted.length - 1) * fraction));
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function seededUnit(seed) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function sourceCouplingModel({ source = "ICP", powerW = 500, pressureMtorr = 20, gas = "Ar", previousMode = "E", direction = "up" }) {
  const gasFactor = { Ar: 1, O2: 0.78, CF4: 0.68 }[gas] ?? 1;
  const pressureShift = Math.max(-80, Math.min(120, (20 - pressureMtorr) * 2.2));
  const upThresholdW = 600 + pressureShift + (gas === "Ar" ? 0 : 70);
  const downThresholdW = 450 + pressureShift + (gas === "Ar" ? 0 : 55);
  let mode = previousMode;
  if (source === "ICP") {
    if (direction === "up" && powerW >= upThresholdW) mode = "H";
    if (direction === "down" && powerW <= downThresholdW) mode = "E";
  } else {
    mode = "CCP";
  }
  const densityCm3 = source === "CCP"
    ? 8e9 * gasFactor * (powerW / 300) ** 0.72 * (20 / Math.max(pressureMtorr, 2)) ** 0.12
    : mode === "H"
      ? 1.1e11 * gasFactor * (powerW / 600) ** 0.78
      : 1.5e9 * gasFactor * (powerW / 250) ** 0.88;
  const electronTemperatureEv = Math.max(1.8, Math.min(5.5, 3.1 + Math.log10(20 / Math.max(pressureMtorr, 1)) * 0.45 + (gas === "CF4" ? 0.5 : 0)));
  return { source, powerW, pressureMtorr, gas, mode, densityCm3, electronTemperatureEv, upThresholdW, downThresholdW };
}

export function plasmaLoadImpedance({ pressureMtorr = 20, powerW = 800, gas = "Ar" }) {
  const gasResistance = { Ar: 0, O2: 2.2, CF4: 4.5 }[gas] ?? 0;
  const gasReactance = { Ar: 0, O2: -4, CF4: -8 }[gas] ?? 0;
  return {
    re: 7.5 + 0.035 * pressureMtorr + 900 / Math.max(powerW, 100) + gasResistance,
    im: -14 - 0.11 * pressureMtorr - 1300 / Math.max(powerW, 100) + gasReactance
  };
}

export function matchingNetwork({ tunePf = 260, loadPf = 470, pressureMtorr = 20, powerW = 800, gas = "Ar", forwardPowerW = powerW }) {
  const frequencyHz = 13.56e6;
  const omega = 2 * Math.PI * frequencyHz;
  const fixedInductanceH = 1e-6;
  const plasma = plasmaLoadImpedance({ pressureMtorr, powerW, gas });
  const tuneReactance = omega * fixedInductanceH - 1 / (omega * Math.max(tunePf, 1) * 1e-12);
  const series = complexAdd(plasma, { re: 0, im: tuneReactance });
  const inputAdmittance = complexAdd(complexInverse(series), { re: 0, im: omega * Math.max(loadPf, 1) * 1e-12 });
  const input = complexInverse(inputAdmittance);
  const reflection = complexDivide(complexAdd(input, { re: -50, im: 0 }), complexAdd(input, { re: 50, im: 0 }));
  const reflectedFraction = Math.min(1, reflection.re ** 2 + reflection.im ** 2);
  return {
    plasma,
    afterTune: series,
    input,
    reflection,
    reflectedFraction,
    reflectedPowerW: forwardPowerW * reflectedFraction,
    deliveredPowerW: forwardPowerW * (1 - reflectedFraction),
    tunePf,
    loadPf
  };
}

export function findAutoMatch({ pressureMtorr = 20, powerW = 800, gas = "Ar" }) {
  let best = null;
  for (let tunePf = 40; tunePf <= 1600; tunePf += 10) {
    for (let loadPf = 40; loadPf <= 1600; loadPf += 10) {
      const result = matchingNetwork({ tunePf, loadPf, pressureMtorr, powerW, gas, forwardPowerW: powerW });
      if (!best || result.reflectedFraction < best.reflectedFraction) best = result;
    }
  }
  return best;
}

function complexAdd(a, b) {
  return { re: a.re + b.re, im: a.im + b.im };
}

function complexInverse(value) {
  const denominator = Math.max(value.re ** 2 + value.im ** 2, Number.EPSILON);
  return { re: value.re / denominator, im: -value.im / denominator };
}

function complexDivide(a, b) {
  const denominator = Math.max(b.re ** 2 + b.im ** 2, Number.EPSILON);
  return { re: (a.re * b.re + a.im * b.im) / denominator, im: (a.im * b.re - a.re * b.im) / denominator };
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
