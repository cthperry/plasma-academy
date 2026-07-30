export function init(container) {
  const stage = container.querySelector(".lab-stage");
  const status = container.querySelector("[data-lab-status]");
  stage.innerHTML = `<div class="lab-link-panel"><strong>32 種製程氣體</strong><p>氣體百科使用同一份資料呈現家族、用途、F/C、危害、材質相容、排氣與 SDS 狀態。</p><a class="button primary" href="/gases/">開啟 A11 氣體百科</a></div>`;
  status.textContent = "A11 是獨立全頁工具，搜尋、篩選與 F/C 排序會保留較大的閱讀空間。";
  return { start() {}, stop() {}, reset() {}, destroy() {} };
}
