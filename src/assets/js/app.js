import { initThemeToggle } from "./theme.js";
import { initProgress } from "./progress.js";
import { initNav } from "./nav.js";
import { initTooltips } from "./tooltip.js";
import { initSearch } from "./search.js";
import { initUnitConverters } from "./units.js";
import { initLabContainers } from "./lifecycle.js";

initThemeToggle();
import("./firebase-auth.bundle.js").then(({ initFirebaseAuth }) => initFirebaseAuth());
initProgress();
initNav();
initTooltips();
initSearch();
initUnitConverters();
initLabContainers();
if (document.querySelector("[data-exam-page], [data-exam-gate]")) {
  import("./exam.js").then(({ initExam }) => initExam());
}
if (document.querySelector("[data-gas-browser]")) {
  import("./gas-browser.js").then(({ initGasBrowser }) => initGasBrowser());
}
if (document.body.dataset.pageType === "defects") {
  import("./defect-atlas.js").then(({ initDefectAtlas }) => initDefectAtlas());
}
if (document.querySelector("[data-admin-page]")) {
  import("./admin.js").then(({ initAdmin }) => initAdmin());
}
