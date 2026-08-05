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

  /* ------------------------------------------------------------------
     氣體配色 —— 全站單一來源

     五個元件讓學員選氣體(A03/A05/A26/A32/A33),但除了 A05 之外,
     畫出來的曲線與粒子一律是固定色 —— 換了氣體,畫面上除了數字之外
     沒有任何地方在變,學員很難把「這條線」與「我剛選的那支氣體」連起來。

     這張表把氣體對應到既有的 viz token。**不是在模擬真實發射光譜顏色**
     (Ar 輝光偏藍紫、He 偏粉橙……那是 4.1 OES 的範圍),而是沿用站內
     既有的抽象配色系統,讓同一支氣體在不同元件裡是同一個顏色。

     ⚠️ token 只有六個、氣體有十幾種,所以**跨元件必然會重用顏色**。
     真正的要求是「同一個選單裡的幾支氣體必須互相區分得開」——
     這一點由 tools/check-gas-colors.mjs 對每個元件的清單逐一驗證,
     新增氣體到某個選單時那支斷言會抓出撞色。
     ------------------------------------------------------------------ */
  var GAS_TOKENS = {
    ar: "vizIonPos",
    he: "vizRadical",
    xe: "vizNeutral",
    n2: "vizElectron",
    air: "vizPolymer",
    o2: "vizIonNeg",
    cf4: "vizPolymer",
    // A10 的氟碳系列 —— 五支必須互相分得開(check-gas-colors 驗證)
    chf3: "vizElectron",
    c4f8: "vizIonNeg",
    c4f6: "vizRadical",
    ch3f: "vizNeutral",
    cl2: "vizRadical",
    sf6: "vizElectron",
    aro2: "vizNeutral",
    h2ar: "vizRadical",
  };

  /** 氣體 key(大小寫不拘)→ palette token 名稱;查不到回傳 null */
  function gasToken(key) {
    if (!key) return null;
    return GAS_TOKENS[String(key).toLowerCase()] || null;
  }

  /** 氣體 key → 當前主題下的色碼;查不到回傳 fallback(預設 primary) */
  function gasColor(key, pal, fallback) {
    var p = pal || palette();
    var t = gasToken(key);
    return (t && p[t]) || fallback || p.primary;
  }

  /** "#rrggbb" → "r,g,b",供 rgba() 疊透明度用 */
  function rgbTriplet(hex) {
    var m = /^#([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return "136,136,136";
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(",");
  }

  PA.canvasTheme = {
    palette: palette,
    invalidate: invalidate,
    setup: setup,
    autoSize: autoSize,
    reducedMotion: reducedMotion,
    GAS_TOKENS: GAS_TOKENS,
    gasToken: gasToken,
    gasColor: gasColor,
    rgbTriplet: rgbTriplet,
  };
})((window.PA = window.PA || {}));
