export const ardeOpeningsUm = [0.3, 0.5, 0.8, 1.2, 2.0];

export const ardeMechanisms = [
  { key: "transport", label: "傳輸限制" },
  { key: "shadowing", label: "離子遮蔽" },
  { key: "product", label: "產物排出" },
  { key: "charging", label: "孔底充電" }
];

export function evaluateArdeProcess(input = {}) {
  const pressureMtorr = clamp(input.pressureMtorr ?? 30, 5, 200);
  const angleSpreadDeg = clamp(input.angleSpreadDeg ?? 5, 0, 15);
  const sticking = clamp(input.sticking ?? 0.2, 0.01, 1);
  const timeSeconds = clamp(input.timeSeconds ?? 240, 10, 900);
  const inverse = Boolean(input.inverse);
  const enabled = Object.fromEntries(ardeMechanisms.map(({ key }) => [key, input.mechanisms?.[key] !== false]));
  const steps = 120;
  const dtMinutes = timeSeconds / steps / 60;

  const trenches = ardeOpeningsUm.map((cdUm) => {
    let depthUm = 0;
    let last = null;
    for (let step = 0; step < steps; step += 1) {
      const aspectRatio = depthUm / cdUm;
      const factors = mechanismFactors({ aspectRatio, pressureMtorr, angleSpreadDeg, sticking, inverse, enabled });
      const rateUmMin = 1.45 * factors.total;
      depthUm += rateUmMin * dtMinutes;
      last = { aspectRatio, rateUmMin, factors };
    }
    return { cdUm, depthUm, aspectRatio: depthUm / cdUm, rateUmMin: last.rateUmMin, factors: last.factors };
  });

  const widest = trenches.at(-1).depthUm;
  const narrowest = trenches[0].depthUm;
  const lagPercent = widest > 0 ? (widest - narrowest) / widest * 100 : 0;
  const rates = trenches.map((item) => item.depthUm / (timeSeconds / 60));
  return {
    trenches,
    lagPercent,
    spreadPercent: (Math.max(...rates) - Math.min(...rates)) / Math.max(...rates) * 100,
    mode: inverse ? "inverse" : "normal",
    classification: lagPercent < -5 ? "反向 ARDE" : lagPercent > 5 ? "ARDE / RIE lag" : "CD 差異不明顯"
  };
}

function mechanismFactors({ aspectRatio, pressureMtorr, angleSpreadDeg, sticking, inverse, enabled }) {
  const ar = Math.max(0, aspectRatio);
  const pressure = Math.sqrt(pressureMtorr / 30);
  const spread = Math.pow(angleSpreadDeg / 7.5, 1.3);
  const neutralArrival = 1 / (1 + 0.10 * ar * pressure * Math.sqrt(sticking / 0.2));
  const transport = enabled.transport ? neutralArrival : 1;
  const shadowing = enabled.shadowing ? 1 / (1 + 0.075 * ar * spread) : 1;
  const product = enabled.product ? 1 / (1 + 0.026 * Math.pow(ar, 1.35) * pressure) : 1;
  const charging = enabled.charging ? 1 / (1 + 0.035 * Math.pow(ar, 1.28)) : 1;

  if (inverse) {
    const polymerArrival = 1 / (1 + 0.22 * ar * Math.pow(sticking / 0.55, 0.7));
    const passivationPenalty = clamp(1 - 0.72 * polymerArrival, 0.20, 1);
    const inverseTransport = enabled.transport ? 0.86 + 0.14 * transport : 1;
    const inverseShadowing = enabled.shadowing ? 0.88 + 0.12 * shadowing : 1;
    const inverseProduct = enabled.product ? 0.88 + 0.12 * product : 1;
    const inverseCharging = enabled.charging ? 0.88 + 0.12 * charging : 1;
    return {
      transport: inverseTransport,
      shadowing: inverseShadowing,
      product: inverseProduct,
      charging: inverseCharging,
      passivation: passivationPenalty,
      total: clamp(inverseTransport * inverseShadowing * inverseProduct * inverseCharging * passivationPenalty, 0.02, 1)
    };
  }

  return {
    transport,
    shadowing,
    product,
    charging,
    passivation: 1,
    total: clamp(transport * shadowing * product * charging, 0.02, 1)
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
