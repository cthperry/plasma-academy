import { readCanvasTheme, watchTheme } from "../canvas-theme.js";
import { createButton, createSlider, createToggle, createValuePanel } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { ParticleEngine } from "../particle-engine.js";

export function init(container) {
  const canvas = container.querySelector("[data-a01-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const ctx = canvas.getContext("2d");
  const state = {
    electricField: 220,
    pressure: 20,
    chargedOnly: false,
    theme: readCanvasTheme()
  };
  const engine = new ParticleEngine({ width: canvas.width, height: canvas.height, count: innerWidth < 640 ? 260 : 520 });
  const valuePanel = createValuePanel([
    ["游離度", "0"],
    ["帶電粒子", "0"],
    ["提示", "畫面刻意放大約 100 倍"]
  ]);

  const labInstance = {
    update() {
      engine.update(state);
    },
    render() {
      draw(ctx, canvas, engine, state);
      const stats = engine.stats();
      valuePanel.querySelector('[data-value-key="游離度"]').textContent = `${(stats.ionization * 100).toFixed(2)}%`;
      valuePanel.querySelector('[data-value-key="帶電粒子"]').textContent = `${stats.charged} / ${stats.total}`;
      status.textContent = `電場 ${state.electricField} V/cm，壓力 ${state.pressure} mTorr。實際製程電漿游離度常低於畫面示意。`;
    },
    reset() {
      engine.reset();
    },
    applyTheme(theme) {
      state.theme = theme;
      this.render();
    }
  };
  const component = createLifecycle(labInstance);

  controls.append(
    createSlider({ label: "電場強度", min: 0, max: 500, value: state.electricField, unit: "V/cm", onInput: (value) => state.electricField = value }),
    createSlider({ label: "氣壓", min: 1, max: 100, value: state.pressure, unit: "mTorr", onInput: (value) => state.pressure = value }),
    createToggle({ label: "只顯示帶電粒子", checked: state.chargedOnly, onChange: (value) => state.chargedOnly = value }),
    createButton("重設", () => component.reset()),
    valuePanel
  );

  const unwatch = watchTheme(component);
  labInstance.destroy = unwatch;
  component.render();
  return component;
}

function draw(ctx, canvas, engine, state) {
  const theme = state.theme;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = theme.border;
  ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

  for (const particle of engine.particles) {
    if (state.chargedOnly && particle.charge === "neutral") continue;
    ctx.beginPath();
    const radius = particle.charge === "electron" ? 2.1 : particle.charge === "ion" ? 4 : 2.8;
    ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = particle.charge === "electron" ? theme.electron : particle.charge === "ion" ? theme.ion : theme.neutral;
    ctx.globalAlpha = particle.charge === "neutral" ? 0.72 : 0.95;
    ctx.fill();
    if (particle.charge === "ion") {
      ctx.fillStyle = theme.bg;
      ctx.font = "8px system-ui";
      ctx.fillText("+", particle.x - 2.5, particle.y + 3);
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.text;
  ctx.font = "600 15px system-ui";
  ctx.fillText("弱游離電漿示意", 40, 52);
  ctx.fillStyle = theme.muted;
  ctx.font = "13px system-ui";
  ctx.fillText("藍：電子 / 紅：離子 / 灰：中性粒子", 40, canvas.height - 34);
}
