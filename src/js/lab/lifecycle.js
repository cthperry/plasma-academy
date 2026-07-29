/* ==========================================================================
   lifecycle.js — 互動元件的生命週期契約與註冊表

   契約(docs/05 §生命週期):
     init(container, options)  建立 DOM/Canvas,綁事件,不自動播放
     start()                   開始 rAF 迴圈
     stop()                    停止 rAF(離開視窗時必呼叫)
     reset()                   參數回預設
     destroy()                 移除事件、釋放資源

   強制規則:使用 IntersectionObserver,元件離開視窗時自動 stop()。
   頁面上可能同時有 3 個元件,不得同時跑滿。
   ========================================================================== */

(function (PA) {
  "use strict";

  var registry = {}; // id → factory
  var mounted = []; // 已掛載的實例

  /** 元件自我註冊 */
  function define(id, factory) {
    registry[id] = factory;
    // 若容器已在頁面上等待,立即掛載
    var pending = document.querySelectorAll(
      '[data-lab="' + id + '"]:not([data-lab-mounted])'
    );
    Array.prototype.forEach.call(pending, function (el) {
      mount(el);
    });
  }

  /**
   * 基底類別:提供 rAF 迴圈、主題監聽、可見性管理。
   * 元件工廠回傳的物件只需實作 setup/draw(/tick),其餘由此處理。
   */
  function create(spec) {
    var api = {
      el: null,
      stage: null,
      ctx: null,
      width: 0,
      height: 0,
      opts: {},
      running: false,
      _raf: 0,
      _detach: [],
      _t0: 0,
    };

    api.init = function (container, options) {
      api.el = container;
      api.opts = options || {};
      api.stage = container.querySelector(".pa-lab__stage") || container;
      if (spec.setup) spec.setup.call(api);

      // 主題變更 → 重繪
      var onTheme = function () {
        PA.canvasTheme.invalidate();
        if (spec.draw) spec.draw.call(api);
      };
      window.addEventListener("pa:themechange", onTheme);
      api._detach.push(function () {
        window.removeEventListener("pa:themechange", onTheme);
      });

      if (spec.draw) spec.draw.call(api);
      return api;
    };

    api.start = function () {
      if (api.running) return;
      // reduced-motion:不跑迴圈,只畫一次靜態代表狀態
      if (PA.canvasTheme.reducedMotion() && !api.opts.forceAnimate) {
        if (spec.draw) spec.draw.call(api);
        return;
      }
      api.running = true;
      api._t0 = performance.now();
      var loop = function (t) {
        if (!api.running) return;
        var dt = Math.min((t - api._t0) / 1000, 0.05); // 上限 50 ms,避免分頁切回時暴衝
        api._t0 = t;
        if (spec.tick) spec.tick.call(api, dt);
        if (spec.draw) spec.draw.call(api);
        api._raf = requestAnimationFrame(loop);
      };
      api._raf = requestAnimationFrame(loop);
    };

    api.stop = function () {
      api.running = false;
      if (api._raf) cancelAnimationFrame(api._raf);
      api._raf = 0;
    };

    api.reset = function () {
      if (spec.reset) spec.reset.call(api);
      if (spec.draw) spec.draw.call(api);
    };

    api.destroy = function () {
      api.stop();
      api._detach.forEach(function (fn) {
        try {
          fn();
        } catch (e) {}
      });
      api._detach = [];
      if (spec.destroy) spec.destroy.call(api);
    };

    /** 供元件登記需要在 destroy 時清理的東西 */
    api.onDestroy = function (fn) {
      api._detach.push(fn);
    };

    return api;
  }

  /** 把一個 [data-lab] 容器掛上對應元件 */
  function mount(el) {
    var id = el.getAttribute("data-lab");
    var factory = registry[id];
    if (!factory) return null; // 元件檔尚未載入
    if (el.hasAttribute("data-lab-mounted")) return null;
    el.setAttribute("data-lab-mounted", "");

    var opts = {};
    try {
      opts = JSON.parse(el.getAttribute("data-lab-options") || "{}");
    } catch (e) {}

    var inst;
    try {
      inst = factory();
      inst.init(el, opts);
    } catch (err) {
      el.setAttribute("data-lab-error", "");
      console.error("[lab] " + id + " 初始化失敗", err);
      return null;
    }

    mounted.push({ id: id, el: el, inst: inst });

    // 可見時才跑動畫
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) inst.start();
            else inst.stop();
          });
        },
        { rootMargin: "0px" }
      );
      io.observe(el);
      inst.onDestroy(function () {
        io.disconnect();
      });
    } else {
      inst.start();
    }

    // 分頁切到背景時全部暫停
    var onVis = function () {
      if (document.hidden) inst.stop();
    };
    document.addEventListener("visibilitychange", onVis);
    inst.onDestroy(function () {
      document.removeEventListener("visibilitychange", onVis);
    });

    if (PA.progress) PA.progress.noteLabUse(id);
    return inst;
  }

  /**
   * 掃描頁面上的 [data-lab],在容器接近視窗時才注入元件腳本。
   * 用 script 注入而非 dynamic import —— 這樣 file:// 直接開啟也能運作。
   */
  function scan(root) {
    var els = (root || document).querySelectorAll("[data-lab]");
    if (!els.length) return;

    var base = document.documentElement.getAttribute("data-base") || "";

    var loadFor = function (el) {
      var id = el.getAttribute("data-lab");
      if (registry[id]) {
        mount(el);
        return;
      }
      if (el.hasAttribute("data-lab-loading")) return;
      el.setAttribute("data-lab-loading", "");
      var s = document.createElement("script");
      s.src = base + "js/lab/" + id.toLowerCase() + ".js";
      s.defer = true;
      s.onerror = function () {
        el.removeAttribute("data-lab-loading");
        el.setAttribute("data-lab-error", "");
        console.warn("[lab] 找不到元件檔:" + s.src);
      };
      document.head.appendChild(s);
    };

    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(
        function (entries, obs) {
          entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            obs.unobserve(e.target);
            loadFor(e.target);
          });
        },
        { rootMargin: "200px" } // 進入視窗前 200px 就開始載
      );
      Array.prototype.forEach.call(els, function (el) {
        io.observe(el);
      });
    } else {
      Array.prototype.forEach.call(els, loadFor);
    }
  }

  function destroyAll() {
    mounted.forEach(function (m) {
      try {
        m.inst.destroy();
      } catch (e) {}
    });
    mounted.length = 0;
  }

  PA.lab = {
    define: define,
    create: create,
    mount: mount,
    scan: scan,
    destroyAll: destroyAll,
    registry: registry,
    mounted: mounted,
  };
})((window.PA = window.PA || {}));
