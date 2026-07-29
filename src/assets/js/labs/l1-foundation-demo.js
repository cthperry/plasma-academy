import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createButton, createSlider, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { debyeLengthMm, meanFreePathCm, paschenVoltage } from "../plasma-model.js";

const configs = {
  A02: {
    sliders: [
      ["電子密度", 9, 12, 10, 0.1, "log cm⁻³"],
      ["電子溫度", 1, 10, 3, 0.1, "eV"]
    ],
    labels: ["λD", "遮蔽圈", "重點"]
  },
  A03: {
    sliders: [
      ["壓力", 1, 200, 20, 1, "mTorr"],
      ["角度發散", 0, 15, 4, 0.5, "°"]
    ],
    labels: ["λ", "平均碰撞", "重點"]
  },
  A04: {
    sliders: [
      ["E/p", 20, 180, 90, 1, "V/cm/Torr"],
      ["γ", 0, 0.2, 0.06, 0.01, ""]
    ],
    labels: ["增益", "自持狀態", "重點"]
  },
  A05: {
    sliders: [
      ["壓力", 0.01, 10, 0.9, 0.01, "Torr"],
      ["間距", 0.1, 10, 1, 0.1, "cm"]
    ],
    labels: ["pd", "Vb", "重點"]
  },
  A06: {
    sliders: [
      ["時間軸", 0, 3, 3, 1, "stage"],
      ["電子溫度", 1, 8, 3, 0.1, "eV"]
    ],
    labels: ["階段", "Vp-Vf", "重點"]
  },
  A07: {
    sliders: [
      ["壓力", 1, 5000, 50, 1, "mTorr"],
      ["密度指標", 9, 12, 10.5, 0.1, "log cm⁻³"]
    ],
    labels: ["製程區", "座標", "重點"]
  }
};

export function init(container) {
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const ctx = canvas.getContext("2d");
  const labId = canvas.dataset.labId;
  const config = configs[labId] ?? configs.A02;
  const state = {
    values: Object.fromEntries(config.sliders.map(([label, , , value]) => [label, value])),
    theme: readCanvasTheme()
  };
  const panel = createValuePanel(config.labels.map((label) => [label, "—"]));

  const instance = {
    render() {
      const metrics = compute(labId, state.values);
      draw(ctx, canvas, labId, state, metrics);
      for (const [label, value] of Object.entries(metrics)) {
        const node = panel.querySelector(`[data-value-key="${label}"]`);
        if (node) node.textContent = value;
      }
      status.textContent = metrics["重點"] ?? `${labId} 已更新。`;
    },
    update() {},
    reset() {
      for (const [label, , , value] of config.sliders) state.values[label] = value;
    },
    applyTheme(theme) {
      state.theme = theme;
      this.render();
    }
  };
  const component = createLifecycle(instance);
  const unwatch = watchTheme(component);
  instance.destroy = unwatch;

  for (const [label, min, max, value, step, unit] of config.sliders) {
    controls.append(createSlider({
      label,
      min,
      max,
      value,
      step,
      unit,
      onInput: (next) => {
        state.values[label] = next;
        component.render();
      }
    }));
  }
  controls.append(createButton("重設", () => {
    component.reset();
    controls.replaceChildren();
    init(container);
  }), panel);
  component.render();
  return component;
}

function compute(labId, values) {
  if (labId === "A02") {
    const ne = 10 ** values["電子密度"];
    const te = values["電子溫度"];
    const lambda = debyeLengthMm({ electronDensityCm3: ne, electronTemperatureEv: te });
    return { "λD": `${lambda.toFixed(3)} mm`, "遮蔽圈": ne > 1e11 ? "高密度，遮蔽圈小" : "低密度，遮蔽圈大", "重點": "λD 會隨電子密度上升而縮小。" };
  }
  if (labId === "A03") {
    const lambda = meanFreePathCm(values["壓力"]);
    const collisions = Math.max(0.1, 5 / lambda);
    return { "λ": `${lambda.toFixed(2)} cm`, "平均碰撞": `${collisions.toFixed(1)} 次`, "重點": values["壓力"] > 80 ? "高壓下方向性明顯變差。" : "低壓下離子較能保持方向性。" };
  }
  if (labId === "A04") {
    const gain = Math.exp(values["E/p"] / 45) * values["γ"];
    return { "增益": `${gain.toFixed(2)}`, "自持狀態": gain > 1 ? "可自持" : "未自持", "重點": "γ 代表表面提供二次電子的能力。" };
  }
  if (labId === "A05") {
    const pd = values["壓力"] * values["間距"];
    const vb = paschenVoltage(pd, "Ar");
    return { "pd": `${pd.toFixed(2)} Torr·cm`, "Vb": `${Math.round(vb)} V`, "重點": pd < 0.5 ? "落在左支：碰撞次數不足。" : pd > 2 ? "落在右支：能量累積不足。" : "接近 Paschen 谷底。" };
  }
  if (labId === "A06") {
    const stages = ["均勻準中性", "電子先流失", "鞘層形成", "穩態離子轟擊"];
    const drop = 4.7 * values["電子溫度"];
    return { "階段": stages[values["時間軸"]] ?? stages[3], "Vp-Vf": `${drop.toFixed(1)} V`, "重點": "鞘層讓離子在最後距離被垂直加速。" };
  }
  const pressure = values["壓力"];
  const density = values["密度指標"];
  const zone = pressure < 20 ? "蝕刻 / PVD" : pressure > 500 ? "PECVD / 灰化 / 清潔" : "表面處理 / 混合區";
  return { "製程區": zone, "座標": `${pressure.toFixed(0)} mTorr, 10^${density.toFixed(1)}`, "重點": "不同製程的壓力窗反映方向性與產率取捨。" };
}

function draw(ctx, canvas, labId, state, metrics) {
  const theme = state.theme;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = theme.border;
  ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);
  ctx.fillStyle = theme.text;
  ctx.font = "700 18px system-ui";
  ctx.fillText(`${labId} ${titleFor(labId)}`, 44, 62);
  ctx.font = "13px system-ui";
  ctx.fillStyle = theme.muted;
  ctx.fillText(metrics["重點"] ?? "", 44, canvas.height - 34);

  if (labId === "A02") drawDebye(ctx, canvas, theme, state.values);
  else if (labId === "A03") drawMfp(ctx, canvas, theme, state.values);
  else if (labId === "A04") drawAvalanche(ctx, canvas, theme, state.values);
  else if (labId === "A05") drawPaschen(ctx, canvas, theme, state.values);
  else if (labId === "A06") drawSheath(ctx, canvas, theme, state.values);
  else drawMap(ctx, canvas, theme, state.values);
}

function drawDebye(ctx, canvas, theme, values) {
  const radius = Math.max(32, Math.min(130, 210 - (values["電子密度"] - 9) * 48 + values["電子溫度"] * 2));
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = theme.ion;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 14, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 90; i++) dot(ctx, theme.electron, 80 + Math.random() * 560, 80 + Math.random() * 200, 2);
}

function drawMfp(ctx, canvas, theme, values) {
  const count = Math.min(18, Math.max(2, Math.round(values["壓力"] / 12)));
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 2;
  for (let i = 0; i < 22; i++) {
    const x = 70 + i * 26;
    ctx.beginPath();
    ctx.moveTo(x, 86);
    ctx.lineTo(x + values["角度發散"] * (i / 4), 284);
    ctx.stroke();
  }
  for (let i = 0; i < count; i++) dot(ctx, theme.ion, 80 + Math.random() * 560, 90 + Math.random() * 190, 4);
}

function drawAvalanche(ctx, canvas, theme, values) {
  const columns = 9;
  for (let i = 0; i < columns; i++) {
    const count = Math.min(24, Math.ceil(Math.exp(i * values["E/p"] / 280) * (1 + values["γ"] * 6)));
    for (let j = 0; j < count; j++) dot(ctx, theme.electron, 80 + i * 65 + Math.random() * 18, 95 + Math.random() * 170, 2.5);
  }
}

function drawPaschen(ctx, canvas, theme, values) {
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 180; i++) {
    const t = i / 179;
    const x = 80 + t * 560;
    const y = 260 - (Math.exp(-((t - 0.42) ** 2) / 0.08) * 130) + Math.abs(t - 0.42) * 90;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  const pd = values["壓力"] * values["間距"];
  const x = 80 + Math.min(1, pd / 4) * 560;
  dot(ctx, theme.ion, x, 164, 7);
}

function drawSheath(ctx, canvas, theme, values) {
  const stage = values["時間軸"];
  ctx.fillStyle = theme.neutral;
  ctx.fillRect(70, 250, 580, 18);
  const sheath = 36 + stage * 24;
  ctx.fillStyle = "rgba(15,111,214,0.14)";
  ctx.fillRect(70, 250 - sheath, 580, sheath);
  for (let i = 0; i < 70; i++) dot(ctx, i % 3 === 0 && stage > 1 ? theme.ion : theme.electron, 90 + Math.random() * 520, 90 + Math.random() * 130, i % 3 === 0 ? 4 : 2);
}

function drawMap(ctx, canvas, theme, values) {
  ctx.strokeStyle = theme.border;
  ctx.strokeRect(90, 86, 520, 190);
  const zones = [
    [100, 220, 150, 40, "蝕刻"],
    [115, 120, 120, 55, "PVD"],
    [360, 110, 150, 56, "PECVD"],
    [430, 200, 130, 42, "清潔"]
  ];
  ctx.font = "13px system-ui";
  for (const [x, y, w, h, label] of zones) {
    ctx.fillStyle = "rgba(15,111,214,0.12)";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = theme.text;
    ctx.fillText(label, x + 10, y + 24);
  }
  const x = 90 + Math.min(1, values["壓力"] / 5000) * 520;
  const y = 276 - ((values["密度指標"] - 9) / 3) * 190;
  dot(ctx, theme.ion, x, y, 7);
}

function dot(ctx, color, x, y, r) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function titleFor(id) {
  return {
    A02: "Debye 遮蔽",
    A03: "平均自由徑",
    A04: "電子雪崩",
    A05: "Paschen 曲線",
    A06: "鞘層形成",
    A07: "製程地圖"
  }[id] ?? "L1 demo";
}
