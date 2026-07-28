/* ==========================================================================
   theme.js — 主題切換
   ⚠️ 此檔必須在 <head> 內以「同步」方式載入(不加 defer),
      在 CSS 套用前就設好 data-theme,否則切換深色時會閃白。
   ========================================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "plasma-academy.theme";
  var VALID = ["auto", "light", "dark"];

  function read() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return VALID.indexOf(v) !== -1 ? v : "auto";
    } catch (e) {
      return "auto";
    }
  }

  function apply(mode) {
    var root = document.documentElement;
    if (mode === "auto") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", mode);
    }
  }

  /** 目前實際生效的是深是淺(auto 時查系統偏好) */
  function resolved() {
    var mode = read();
    if (mode !== "auto") return mode;
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function set(mode) {
    if (VALID.indexOf(mode) === -1) mode = "auto";
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {
      /* 隱私模式下寫入失敗,仍套用本次 */
    }
    apply(mode);
    notify();
  }

  /** 三態循環:auto → light → dark → auto */
  function cycle() {
    var order = ["auto", "light", "dark"];
    var next = order[(order.indexOf(read()) + 1) % order.length];
    set(next);
    return next;
  }

  function notify() {
    try {
      window.dispatchEvent(
        new CustomEvent("pa:themechange", {
          detail: { mode: read(), resolved: resolved() },
        })
      );
    } catch (e) {
      /* 舊瀏覽器 */
    }
  }

  // 立即套用,避免 FOUC
  apply(read());

  // auto 模式下跟隨系統變化
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onChange = function () {
      if (read() === "auto") notify();
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  window.PA = window.PA || {};
  window.PA.theme = {
    get: read,
    set: set,
    cycle: cycle,
    resolved: resolved,
    STORAGE_KEY: STORAGE_KEY,
  };
})();
