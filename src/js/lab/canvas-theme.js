/* ==========================================================================
   canvas-theme.js — Canvas 的主題適配與 HiDPI 處理

   Canvas 內容不吃 CSS,必須由 JS 讀 token 並在主題切換時重繪。
   docs/07 §深色模式:「這是最容易漏掉的一點 —— 切換主題後粒子還是舊配色,
   看起來很像 bug」。此模組把它變成不可能漏。
   ========================================================================== */

(function (PA) {
  "use strict";

  var TOKENS = [
    "bg",
    "surface",
    "surface-sunken",
    "text",
    "text-muted",
    "text-subtle",
    "border",
    "border-strong",
    "primary",
    "success",
    "warning",
    "danger",
    "viz-electron",
    "viz-ion-pos",
    "viz-ion-neg",
    "viz-neutral",
    "viz-radical",
    "viz-polymer",
    "viz-mask",
    "viz-film",
    "viz-substrate",
    "viz-grid",
    "viz-axis",
  ];

  var cache = null;

  /** 讀取當前主題的所有色彩 token */
  function palette() {
    if (cache) return cache;
    var cs = getComputedStyle(document.documentElement);
    var p = {};
    TOKENS.forEach(function (t) {
      var key = t.replace(/-([a-z])/g, function (_, c) {
        return c.toUpperCase();
      });
      p[key] = cs.getPropertyValue("--pa-" + t).trim() || "#888";
    });
    cache = p;
    return p;
  }

  function invalidate() {
    cache = null;
  }

  window.addEventListener("pa:themechange", invalidate);

  /**
   * 設定 Canvas 的 HiDPI 尺寸。
   * 回傳 { ctx, width, height, dpr } —— width/height 為 CSS 像素,
   * 繪圖時直接用它們,不必自己處理 dpr。
   */
  function setup(canvas, cssWidth, cssHeight) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2); // 上限 2,避免行動裝置吃記憶體
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    canvas.style.width = cssWidth + "px";
    canvas.style.height = cssHeight + "px";
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, width: cssWidth, height: cssHeight, dpr: dpr };
  }

  /**
   * 依容器寬度自動決定 Canvas 尺寸並在 resize 時重設。
   * aspect 可為數字,或 function(width) —— 後者用於窄螢幕改變比例。
   * onResize(ctx, w, h) 會在尺寸變動後被呼叫。
   * 回傳 detach 函式。
   */
  function autoSize(canvas, container, aspect, onResize) {
    var ro = null;
    var last = 0;

    function apply() {
      var w = Math.max(240, container.clientWidth);
      if (w === last) return;
      last = w;
      var ratio = typeof aspect === "function" ? aspect(w) : aspect;
      var h = Math.round(w / ratio);
      var s = setup(canvas, w, h);
      onResize(s.ctx, s.width, s.height);
    }

    if (window.ResizeObserver) {
      ro = new ResizeObserver(apply);
      ro.observe(container);
    } else {
      window.addEventListener("resize", apply);
    }
    apply();

    return function detach() {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", apply);
    };
  }

  /** 是否應停用動畫 */
  function reducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  PA.canvasTheme = {
    palette: palette,
    invalidate: invalidate,
    setup: setup,
    autoSize: autoSize,
    reducedMotion: reducedMotion,
  };
})((window.PA = window.PA || {}));
