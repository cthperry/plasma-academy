import { createSelect } from "../controls.js";

const options = {
  material: ["Si", "poly-Si", "SiO2", "SiN", "Al", "W", "Cu", "光阻", "low-k", "有機膜"],
  operation: ["蝕刻", "沉積"],
  underlayer: ["Si", "SiO2", "SiN", "光阻", "金屬", "無指定"],
  profile: ["垂直", "錐形", "等向"],
  constraint: ["高選擇比", "低損傷", "低溫", "高速率"]
};

export function init(container) {
  const stage = container.querySelector(".lab-stage");
  const canvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const visual = document.createElement("div");
  visual.className = "decision-visual";
  visual.innerHTML = `<svg class="decision-path" viewBox="0 0 720 250" role="img" aria-label="目前的氣體選用推理路徑"></svg><div class="decision-result" data-decision-result></div>`;
  canvas.replaceWith(visual);
  stage.classList.add("lab-stage--decision");

  const state = { material: "SiO2", operation: "蝕刻", underlayer: "Si", profile: "垂直", constraint: "高選擇比" };
  const instance = {
    render() {
      const result = recommend(state);
      drawPath(visual.querySelector("svg"), state, result);
      visual.querySelector("[data-decision-result]").innerHTML = resultMarkup(result);
      status.textContent = result.special
        ? `教學路徑：${result.summary}`
        : `建議 ${result.gases.map((item) => item.name).join(" / ")}；${result.direction}。`;
    },
    reset() {},
    destroy() {}
  };
  const component = {
    render: instance.render.bind(instance),
    start: instance.render.bind(instance),
    stop() {},
    reset() {},
    destroy: instance.destroy.bind(instance)
  };
  const controlDefs = [
    ["處理材料", "material"], ["製程目的", "operation"], ["下層材料", "underlayer"], ["目標 profile", "profile"], ["特殊限制", "constraint"]
  ];
  controls.replaceChildren(...controlDefs.map(([label, key]) => createSelect({
    label,
    options: options[key].map((value) => ({ value, label: value })),
    value: state[key],
    onChange: (value) => { state[key] = value; component.render(); }
  })));
  component.render();
  return component;
}

function recommend(state) {
  if (state.operation === "沉積") return depositionRecommendation(state);
  if (state.material === "Cu") return {
    special: true,
    summary: "Cu 沒有適合量產乾式蝕刻的揮發性鹵化物；主流整合改用大馬士革製程。",
    gases: [],
    direction: "先蝕刻介電層溝槽，再沉積阻障層與 Cu，最後以 CMP 去除多餘金屬",
    risk: "不要把 Cl2 或 F 系氣體列成一般 Cu RIE 配方；非揮發性 CuClx/CuFx 會殘留與再沉積。",
    link: "/level/3/"
  };

  const recipes = {
    "Si": [["SF6", "主蝕刻劑：高 F 自由基通量形成揮發性 SiF4"], ["C4F8", "鈍化劑：需要垂直 profile 時保護側壁"], ["Ar", "稀釋與離子輔助"]],
    "poly-Si": [["Cl2", "主蝕刻劑：提供 poly-Si 蝕刻率"], ["HBr", "鈍化劑：提升對氧化層選擇比與異向性"], ["O2", "添加劑：形成 SiOBr 側壁鈍化"]],
    "SiO2": [["C4F8", "主氟碳氣體：提供 F 並形成側壁聚合物"], ["Ar", "離子輔助：清除溝底聚合物並打開反應"], ["O2", "添加劑：微調有效 F/C 與聚合物厚度"]],
    "SiN": [["CH2F2", "高聚合主氣體：建立 SiN 對 Si 的選擇比"], ["O2", "添加劑：控制聚合物不致 etch stop"], ["Ar", "離子輔助與放電穩定"]],
    "Al": [["Cl2", "主蝕刻劑：形成可排出的氯化鋁物種"], ["BCl3", "去氧化物：移除阻擋反應的原生 Al2O3"], ["N2", "側壁與放電調整"]],
    "W": [["SF6", "主蝕刻劑：F 與 W 形成揮發性 WF6"], ["Cl2", "調整側壁與選擇比"], ["Ar", "離子輔助"]],
    "光阻": [["O2", "主反應氣體：把有機物轉成 CO、CO2 與 H2O"], ["N2", "調整自由基化學並降低氧化攻擊"], ["Ar", "低比例離子輔助"]],
    "low-k": [["CF4", "主蝕刻劑：提供 F 處理 SiCOH 網路"], ["CHF3", "鈍化劑：抑制側向攻擊"], ["N2", "調整表面終止與 profile"]],
    "有機膜": [["O2", "主清除氣體：氧化有機碳骨架"], ["N2", "抑制過強氧化並調整選擇比"], ["H2", "在低氧需求時提供還原性路徑"]]
  };
  const gases = (recipes[state.material] ?? recipes.SiO2).map(([name, reason]) => ({ name: formatFormula(name), reason }));
  if (state.profile === "等向" && ["Si", "poly-Si"].includes(state.material)) gases.splice(1, gases.length - 1, { name: "Ar", reason: "少量稀釋並穩定放電；避免強側壁鈍化" });
  const pressure = state.profile === "等向" ? "壓力可偏高" : "壓力偏低以保留離子方向性";
  const bias = state.constraint === "低損傷" ? "bias 偏低" : state.profile === "垂直" ? "bias 中高" : "bias 中低";
  const postClean = state.material === "Al" ? "；出腔前後需去除含 Cl 殘留，避免遇濕腐蝕" : "";
  return {
    special: false,
    summary: `${state.material} ${state.operation}，下層 ${state.underlayer}，目標 ${state.profile}`,
    gases,
    direction: `${pressure}、${bias}${postClean}`,
    risk: riskFor(state),
    link: state.material === "光阻" || state.material === "有機膜" ? "/level/3/3-7-packaging-cleaning/" : "/level/3/"
  };
}

function depositionRecommendation(state) {
  const map = {
    SiO2: [["TEOS", "Si 前驅物：提供可控的氧化物沉積化學"], ["O2", "氧化劑：完成 Si-O 網路"]],
    SiN: [["SiH4", "Si 前驅物"], ["NH3", "氮源並提供 H 終止"]],
    W: [["WF6", "W 前驅物"], ["H2", "還原 WF6 並生成 HF"]],
    Si: [["SiH4", "Si 前驅物：電漿解離後沉積非晶或微晶 Si"], ["H2", "稀釋並調整膜質"]],
    "poly-Si": [["SiH4", "Si 前驅物"], ["H2", "稀釋與表面終止控制"]]
  };
  const pairs = map[state.material] ?? [["CH4", "碳源或有機前驅物；實際化學需依薄膜規格另行選定"], ["Ar", "稀釋並穩定放電"]];
  return {
    special: false,
    summary: `${state.material} 電漿沉積，基材 ${state.underlayer}`,
    gases: pairs.map(([name, reason]) => ({ name: formatFormula(name), reason })),
    direction: state.constraint === "低損傷" ? "remote/低 bias、控制基材溫度" : "提高 source 通量但監控氣相成核與應力",
    risk: "前驅物危害、氣相粉塵、膜應力與排氣副產物必須一起驗證。",
    link: "/level/3/"
  };
}

function riskFor(state) {
  const materialRisk = {
    Al: "Cl 殘留遇水會持續腐蝕 Al；BCl3 管路必須乾燥並確認 scrubber。",
    SiO2: "低 F/C 或 bias 不足會 etch stop；過高 bias 造成 mask loss 與充電損傷。",
    SiN: "聚合物過多會殘留，O2 過多則可能失去對 Si 的選擇比。",
    "low-k": "O2 與高能離子會移除甲基、提高 k 值並造成不可逆損傷。",
    光阻: "O2 電漿可能氧化暴露金屬或聚合物；封裝清潔需驗證材料相容與附著力。",
    有機膜: "清除不完全會留下界面弱層，過度處理則可能粗化或脆化基材。"
  }[state.material];
  return materialRisk ?? "確認氣瓶櫃、purge、管路材質、氣體偵測與下游 abatement 均符合廠區核准 SDS。";
}

function drawPath(svg, state, result) {
  const nodes = [state.material, state.operation, state.underlayer, state.profile, state.constraint, result.special ? "大馬士革" : result.gases.map((gas) => gas.name).join(" + ")];
  svg.replaceChildren();
  nodes.forEach((label, index) => {
    const x = 24 + index * 116;
    if (index) svg.insertAdjacentHTML("beforeend", `<path d="M${x - 64} 112 H${x - 8}" class="decision-edge"/>`);
    svg.insertAdjacentHTML("beforeend", `<rect x="${x - 8}" y="76" width="100" height="72" rx="6" class="decision-node${index === nodes.length - 1 ? " current" : ""}"/><text x="${x + 42}" y="103" text-anchor="middle">${escapeHtml(index === 2 ? `下層 ${label}` : label)}</text><text x="${x + 42}" y="126" text-anchor="middle" class="decision-step">步驟 ${index + 1}</text>`);
  });
}

function resultMarkup(result) {
  const gases = result.gases.length ? `<ul>${result.gases.map((gas) => `<li><strong>${gas.name}</strong><span>${gas.reason}</span></li>`).join("")}</ul>` : "";
  return `<h3>${result.summary}</h3>${gases}<dl><dt>參數方向</dt><dd>${result.direction}</dd><dt>風險提示</dt><dd>${result.risk}</dd></dl><a class="text-link" href="${result.link}">前往對應應用章節</a>`;
}

function formatFormula(value) {
  return value.replace(/(\d+)/g, (_, digits) => [...digits].map((digit) => "₀₁₂₃₄₅₆₇₈₉"[Number(digit)]).join(""));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char]);
}
