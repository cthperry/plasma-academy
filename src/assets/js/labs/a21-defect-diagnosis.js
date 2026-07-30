import { createSelect } from "../controls.js";
import { createLifecycle } from "../lifecycle.js";
import { diagnosticDefects, diagnosisOptions, rankDefectCauses } from "/assets/data/defect-diagnosis.js";
import { defectSvg } from "/assets/data/defect-visuals.js";

export function init(container) {
  const originalCanvas = container.querySelector("[data-lab-canvas]");
  const controls = container.querySelector("[data-lab-controls]");
  const status = container.querySelector("[data-lab-status]");
  const workspace = document.createElement("div");
  workspace.className = "diagnosis-workspace";
  workspace.innerHTML = `<section><h3>1. 選擇最接近的剖面症狀</h3><div class="symptom-grid" role="listbox" aria-label="18 種缺陷症狀"></div></section><section class="diagnosis-results" aria-live="polite"><h3>3. 候選原因排序</h3><div data-diagnosis-results></div></section>`;
  originalCanvas.replaceWith(workspace);
  container.querySelector(".lab-stage").classList.add("lab-stage--diagnosis");
  const symptomGrid = workspace.querySelector(".symptom-grid");
  const resultsNode = workspace.querySelector("[data-diagnosis-results]");
  const state = { symptomId: "arde", material: "unknown", substrate: "unknown", location: "unknown", distribution: "unknown", recipe: "unknown", dirty: true };

  const instance = {
    render() {
      if (!state.dirty) return;
      state.dirty = false;
      renderSymptoms(symptomGrid, state, component);
      const ranked = rankDefectCauses(state);
      renderResults(resultsNode, ranked);
      status.textContent = `目前以「${diagnosticDefects.find((item) => item.id === state.symptomId)?.zh}」為起點；排序是資料規則權重，不是經現場校準的故障機率。`;
    },
    reset() {},
    destroy() {}
  };
  const component = createLifecycle(instance);
  controls.replaceChildren(
    heading("2. 補充現場條件"),
    ...Object.entries(diagnosisOptions).map(([key, options]) => createSelect({
      label: conditionName(key), options: options.map(([value, label]) => ({ value, label })), value: state[key],
      onChange: (value) => { state[key] = value; state.dirty = true; component.render(); }
    }))
  );
  component.render();
  return component;
}

function renderSymptoms(node, state, component) {
  node.replaceChildren(...diagnosticDefects.map((defect) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `symptom-option${defect.id === state.symptomId ? " selected" : ""}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", defect.id === state.symptomId ? "true" : "false");
    button.innerHTML = `${defectSvg(defect.id, defect.zh)}<span>${defect.zh}</span>`;
    button.addEventListener("click", () => { state.symptomId = defect.id; state.dirty = true; component.render(); });
    return button;
  }));
}

function renderResults(node, ranked) {
  node.replaceChildren(...ranked.map((item, index) => {
    const card = document.createElement("article");
    card.className = "diagnosis-result";
    const fixes = item.defect.fixes.map((fix) => `<li><strong>${fix.knob} ${fix.dir}</strong>：${fix.why}<span>副作用：${fix.sideEffect}</span></li>`).join("");
    const methods = item.methods.map((method) => `<li>${method}</li>`).join("");
    const simulator = item.profilePresetId ? `<a class="button secondary" href="/level/3/3-1-etch-mechanisms/?profile=${item.profilePresetId}#lab-a18">帶入 A18</a>` : "";
    card.innerHTML = `<header><span class="diagnosis-rank">${index + 1}</span><div><h4>${item.defect.zh}</h4><p>${item.defect.symptom}</p></div><strong>${item.confidence}%<small>規則權重</small></strong></header>
      <details ${index === 0 ? "open" : ""}><summary>查看排序理由與驗證方式</summary><p>${item.reasons.join("；")}。</p><h5>進一步區分</h5><ol>${methods}</ol><h5>對策與副作用</h5><ul class="diagnosis-fixes">${fixes}</ul><div class="diagnosis-links"><a class="button secondary" href="/defects/#${item.defect.id}">開啟圖鑑</a>${simulator}</div></details>`;
    return card;
  }));
}

function heading(text) {
  const headingNode = document.createElement("h3");
  headingNode.textContent = text;
  return headingNode;
}

function conditionName(key) {
  return ({ material: "材料", substrate: "下層導電性", location: "發生位置", distribution: "晶圓／圖形分佈", recipe: "Recipe 狀態" })[key];
}
