/* ==========================================================================
   defect-svg.js — 19 種缺陷的剖面示意 SVG

   docs/05-animation-spec.md 的 A21 規格寫著:「症狀以 SVG 剖面縮圖呈現,
   而非文字 —— 因為工程師是看圖對照的」,但實作一直停在文字清單。
   這支檔案把它補上。

   設計原則:
   - 每個缺陷的形狀由 defects.js 裡已經寫好的 `symptom` / `causes` /
     `distinguish` 反推座標,不是憑印象亂畫 —— 例如 undercut 的最寬處
     在遮罩正下方、bowing 在中段,兩者的座標差異就是診斷文字裡
     「量一下剖面最寬處的深度就能分開」這句話的視覺版本。
   - 純 SVG 路徑字串,不吃資料也不需要 Canvas;顏色一律用
     `var(--pa-viz-*)` token,深色模式切換時不需要任何 JS 重繪
     (這是 SVG 相對於 Canvas 在這裡的優勢 —— 見 canvas-theme.js 的註解
     解釋 Canvas 為什麼做不到這件事)。
   - 一份幾何 = 一份事實:tools/check-defect-svg.mjs 會驗證每個 id
     都有對應的 body、viewBox 合法、且 <title> 內容與 defects.js 的
     zh 名稱一致 —— 不會有圖文對不上的情況。
   ========================================================================== */

(function (PA) {
  "use strict";

  var VB = "0 0 160 140";
  var MASK_TOP = 12;
  var MASK_BOT = 34;
  var SUB_BOT = 128;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function pathD(points, close) {
    var d = points
      .map(function (p, i) {
        return (i === 0 ? "M" : "L") + p[0] + "," + p[1];
      })
      .join(" ");
    return close ? d + " Z" : d;
  }

  function poly(points, fill, opts) {
    opts = opts || {};
    var attrs = 'fill="' + fill + '"';
    if (opts.stroke) attrs += ' stroke="' + opts.stroke + '" stroke-width="' + (opts.strokeWidth || 1) + '"';
    if (opts.dash) attrs += ' stroke-dasharray="' + opts.dash + '"';
    if (opts.opacity != null) attrs += ' opacity="' + opts.opacity + '"';
    return '<path d="' + pathD(points, opts.close !== false) + '" ' + attrs + "/>";
  }

  function rect(x, y, w, h, fill, opts) {
    opts = opts || {};
    var attrs = 'fill="' + fill + '"';
    if (opts.opacity != null) attrs += ' opacity="' + opts.opacity + '"';
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" ' + attrs + "/>";
  }

  function line(x1, y1, x2, y2, stroke, opts) {
    opts = opts || {};
    var attrs = 'stroke="' + stroke + '" stroke-width="' + (opts.strokeWidth || 1) + '"';
    if (opts.dash) attrs += ' stroke-dasharray="' + opts.dash + '"';
    if (opts.opacity != null) attrs += ' opacity="' + opts.opacity + '"';
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" ' + attrs + "/>";
  }

  var SUBSTRATE = "var(--pa-viz-substrate)";
  var VOID = "var(--pa-surface-sunken)";
  var MASK = "var(--pa-viz-mask)";
  var POLYMER = "var(--pa-viz-polymer)";
  var FILM = "var(--pa-viz-film)";
  var BORDER = "var(--pa-border-strong)";
  var TEXT = "var(--pa-text-subtle)";

  /** 基本襯底(全寬,從遮罩底部一路到底) */
  function base() {
    return rect(0, MASK_BOT, 160, SUB_BOT - MASK_BOT, SUBSTRATE);
  }

  /** 標準矩形溝槽(左右直壁、平底),供未特別覆寫的預設使用 */
  function stdTrench(openL, openR, bottomY) {
    return poly(
      [
        [openL, MASK_BOT],
        [openL, bottomY],
        [openR, bottomY],
        [openR, MASK_BOT],
      ],
      VOID
    );
  }

  function maskPair(openL, openR, leftD, rightD) {
    var l = leftD || [[0, MASK_TOP], [openL, MASK_TOP], [openL, MASK_BOT], [0, MASK_BOT]];
    var r = rightD || [[160, MASK_TOP], [openR, MASK_TOP], [openR, MASK_BOT], [160, MASK_BOT]];
    return poly(l, MASK) + poly(r, MASK);
  }

  function label(x, y, text, anchor) {
    return (
      '<text x="' + x + '" y="' + y + '" font-size="9" fill="' + TEXT +
      '" text-anchor="' + (anchor || "middle") + '">' + esc(text) + "</text>"
    );
  }

  /* -------------------------------------------------------------------- */
  /* 雙溝槽對比模板(ARDE / inverse-lag / macroloading / first-wafer)       */
  /* -------------------------------------------------------------------- */
  function dualUnit(cx, halfW, openHalfW, bottomY, capLabel) {
    var openL = cx - openHalfW, openR = cx + openHalfW;
    var subL = cx - halfW, subR = cx + halfW;
    return (
      rect(subL, MASK_BOT, subR - subL, SUB_BOT - 22 - MASK_BOT, SUBSTRATE) +
      poly([[openL, MASK_BOT], [openL, bottomY], [openR, bottomY], [openR, MASK_BOT]], VOID) +
      maskPair(openL, openR,
        [[subL, MASK_TOP], [openL, MASK_TOP], [openL, MASK_BOT], [subL, MASK_BOT]],
        [[subR, MASK_TOP], [openR, MASK_TOP], [openR, MASK_BOT], [subR, MASK_BOT]]
      ) +
      label(cx, SUB_BOT - 12, capLabel)
    );
  }

  var BODIES = {
    // ---- 深寬比相關:雙溝槽對比 ------------------------------------------
    arde: function () {
      return dualUnit(40, 34, 10, 122, "窄 · 深寬比高 · 較淺") + dualUnit(120, 34, 20, 92, "寬 · 深寬比低 · 較深");
    },
    "inverse-lag": function () {
      return dualUnit(40, 34, 10, 92, "窄 · 反而較淺") + dualUnit(120, 34, 20, 122, "寬 · 反而較深");
    },
    microloading: function () {
      // 左半:三條緊鄰的窄溝槽(高圖形密度),自由基被局部耗盡,較淺
      var denseTrenches = [16, 36, 56]
        .map(function (x) {
          return poly([[x, MASK_BOT], [x, 94], [x + 8, 94], [x + 8, MASK_BOT]], VOID);
        })
        .join("");
      var denseMaskSegments = [[6, 16], [24, 36], [44, 56], [64, 74]]
        .map(function (seg) {
          return poly(
            [[seg[0], MASK_TOP], [seg[1], MASK_TOP], [seg[1], MASK_BOT], [seg[0], MASK_BOT]],
            MASK
          );
        })
        .join("");
      var dense =
        rect(6, MASK_BOT, 68, SUB_BOT - 22 - MASK_BOT, SUBSTRATE) +
        denseTrenches +
        denseMaskSegments +
        label(40, SUB_BOT - 12, "密集區 · 較淺");
      // 右半:單一孤立溝槽,自由基供應充足,較深
      var isolated = dualUnit(120, 34, 20, 118, "孤立區 · 較深");
      return dense + isolated;
    },
    macroloading: function () {
      return dualUnit(40, 34, 16, 88, "低開口率 · 較深") + dualUnit(120, 34, 16, 112, "高開口率 · 較淺");
    },
    "first-wafer": function () {
      return dualUnit(40, 34, 16, 96, "第一片") + dualUnit(120, 34, 16, 114, "第 N 片(穩態)");
    },

    // ---- Profile 形狀 -----------------------------------------------------
    undercut: function () {
      // 最寬處緊貼遮罩(y=42),之後幾乎不再收窄 —— 與 bowing(中段最寬、頭尾收回)區分
      var left = [[52, 34], [34, 42], [36, 108]];
      var right = [[108, 34], [126, 42], [124, 108]];
      return (
        base() +
        poly(left.concat([[124, 108]], right.slice().reverse()), VOID) +
        maskPair(52, 108)
      );
    },
    bowing: function () {
      var left = [[52, 34], [40, 52], [34, 71], [40, 90], [50, 108]];
      var right = [[108, 34], [120, 52], [126, 71], [120, 90], [110, 108]];
      return base() + poly(left.concat([[110, 108]], right.slice().reverse()), VOID) + maskPair(52, 108);
    },
    taper: function () {
      var left = [[52, 34], [66, 108]];
      var right = [[108, 34], [94, 108]];
      return base() + poly(left.concat([[94, 108]], right.slice().reverse()), VOID) + maskPair(52, 108);
    },
    notching: function () {
      var left = [[52, 34], [52, 95], [38, 101], [48, 108]];
      var right = [[108, 34], [108, 108]];
      return (
        base() +
        poly(left.concat([[108, 108]], right.slice().reverse()), VOID) +
        maskPair(52, 108) +
        // 標出偏折方向:一個小箭頭指向凹口,呼應「有方向性」的判讀線索
        line(70, 60, 45, 98, BORDER, { strokeWidth: 1, dash: "2 2", opacity: 0.6 })
      );
    },
    microtrench: function () {
      var bottom = [[52, 100], [60, 118], [80, 104], [100, 118], [108, 100]];
      return base() + poly([[52, 34]].concat(bottom, [[108, 34]]), VOID) + maskPair(52, 108);
    },
    footing: function () {
      var left = [[52, 34], [52, 100], [60, 108]];
      var right = [[108, 34], [108, 100], [100, 108]];
      return base() + poly(left.concat([[100, 108]], right.slice().reverse()), VOID) + maskPair(52, 108);
    },
    twisting: function () {
      var left = [[64, 34], [64, 70], [70, 85], [60, 100], [68, 118]];
      var right = [[96, 34], [96, 70], [90, 85], [100, 100], [92, 118]];
      return base() + poly(left.concat([[92, 118]], right.slice().reverse()), VOID) + maskPair(64, 96);
    },
    striation: function () {
      var ticks = [46, 58, 70].map(function (y) {
        return line(52, y, 52, y + 6, BORDER, { strokeWidth: 1, opacity: 0.7 }) +
          line(108, y, 108, y + 6, BORDER, { strokeWidth: 1, opacity: 0.7 });
      }).join("");
      return base() + stdTrench(52, 108, 108) + maskPair(52, 108) + ticks;
    },

    // ---- 遮罩相關 ---------------------------------------------------------
    faceting: function () {
      var l = [[0, MASK_TOP], [38, MASK_TOP], [52, 26], [52, MASK_BOT], [0, MASK_BOT]];
      var r = [[160, MASK_TOP], [122, MASK_TOP], [108, 26], [108, MASK_BOT], [160, MASK_BOT]];
      return base() + stdTrench(52, 108, 106) + maskPair(52, 108, l, r);
    },
    "mask-loss": function () {
      var l = [[0, 24], [40, 22], [56, 34], [0, 34]];
      var r = [[160, 24], [120, 22], [104, 34], [160, 34]];
      return base() + stdTrench(56, 104, 108) + maskPair(56, 104, l, r);
    },
    "resist-wiggle": function () {
      var left = [[66, 20], [64, 50], [58, 80], [50, 105], [44, 120]];
      var right = [[80, 20], [78, 50], [72, 80], [64, 105], [58, 120]];
      return (
        rect(0, 20, 160, SUB_BOT - 20, "var(--pa-surface-sunken)") +
        poly(left.concat(right.slice().reverse()), MASK)
      );
    },

    // ---- 殘留與污染 -------------------------------------------------------
    "etch-stop": function () {
      var cap = [[52, 80], [60, 87], [80, 90], [100, 87], [108, 80]];
      return (
        base() +
        poly([[52, 34], [52, 80]].concat(cap.slice(1, -1), [[108, 80], [108, 34]]), VOID) +
        poly(cap, POLYMER, { opacity: 0.9 }) +
        line(52, 80, 52, 118, TEXT, { dash: "3 3", opacity: 0.85, strokeWidth: 1.2 }) +
        line(108, 80, 108, 118, TEXT, { dash: "3 3", opacity: 0.85, strokeWidth: 1.2 }) +
        line(52, 118, 108, 118, TEXT, { dash: "3 3", opacity: 0.85, strokeWidth: 1.2 }) +
        maskPair(52, 108)
      );
    },
    veil: function () {
      var veilPath = [
        [46, 36], [58, 32], [70, 37], [82, 31], [94, 36], [106, 32], [114, 38],
        [114, 44], [104, 40], [92, 45], [80, 39], [68, 44], [56, 39], [46, 44],
      ];
      return base() + stdTrench(52, 108, 108) + maskPair(52, 108) + poly(veilPath, POLYMER, { opacity: 0.85 });
    },
    corrosion: function () {
      var bursts = [
        [[46, 60], [42, 52], [50, 55]],
        [[70, 58], [66, 48], [76, 52]],
        [[98, 58], [94, 48], [104, 53]],
        [[122, 60], [118, 51], [128, 55]],
      ];
      return (
        rect(0, 34, 160, SUB_BOT - 34, FILM) +
        rect(30, 60, 110, 30, SUBSTRATE) +
        bursts.map(function (b) { return poly(b, "var(--pa-danger)", { opacity: 0.85 }); }).join("")
      );
    },

    // ---- 未特別覆寫(以標準溝槽呈現,搭配文字標註成因) -------------------
  };

  function bodyFor(d) {
    if (BODIES[d.id]) return BODIES[d.id]();
    // 沒有專屬幾何的缺陷(目前 19 種皆已覆寫;保留 fallback 避免未來新增缺陷時整頁掛掉)
    return base() + stdTrench(52, 108, 108) + maskPair(52, 108);
  }

  function svg(id) {
    var D = PA.defects;
    var d = D && D.byId ? D.byId(id) : null;
    if (!d) return "";
    var titleId = "dsvg-title-" + id;
    return (
      '<svg class="pa-defect-thumb" viewBox="' + VB + '" role="img" aria-labelledby="' + titleId + '" ' +
      'preserveAspectRatio="xMidYMid meet">' +
      "<title id=\"" + titleId + '">' + esc(d.zh) + "：" + esc(d.symptom) + "</title>" +
      bodyFor(d) +
      "</svg>"
    );
  }

  PA.defects = PA.defects || {};
  PA.defects.svg = svg;
  PA.defects.svgIds = function () {
    return Object.keys(BODIES);
  };
})((window.PA = window.PA || {}));
