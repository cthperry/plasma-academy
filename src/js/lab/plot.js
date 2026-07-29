/* ==========================================================================
   plot.js — SVG 座標軸與曲線繪製

   被 A02、A05、A12、A13、A15、A20、A26、A27、A28、A32 共用。
   支援線性與對數軸、多曲線、填色區域、游標讀值、標註。
   ========================================================================== */

(function (PA) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  function svgEl(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (attrs[k] != null) n.setAttribute(k, String(attrs[k]));
      }
    }
    return n;
  }

  var SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  function supStr(n) {
    return String(n)
      .split("")
      .map(function (c) {
        return SUP[c] || c;
      })
      .join("");
  }

  /**
   * 建立一張圖
   * opts: {
   *   width, height, margin: {t,r,b,l},
   *   x: { min, max, log, label, ticks },
   *   y: { min, max, log, label, ticks },
   *   grid: true
   * }
   */
  function create(opts) {
    var W = opts.width || 640;
    var H = opts.height || 360;
    var m = Object.assign({ t: 16, r: 16, b: 42, l: 56 }, opts.margin || {});
    var iw = W - m.l - m.r;
    var ih = H - m.t - m.b;

    var svg = svgEl("svg", {
      viewBox: "0 0 " + W + " " + H,
      width: "100%",
      role: "img",
      preserveAspectRatio: "xMidYMid meet",
    });

    var gGrid = svgEl("g", { class: "plot-grid" });
    var gAxis = svgEl("g", { class: "plot-axis" });
    var gData = svgEl("g", { class: "plot-data" });
    var gOver = svgEl("g", { class: "plot-overlay" });
    svg.appendChild(gGrid);
    svg.appendChild(gData);
    svg.appendChild(gAxis);
    svg.appendChild(gOver);

    var xs = opts.x;
    var ys = opts.y;

    function sx(v) {
      var t = xs.log
        ? (Math.log10(v) - Math.log10(xs.min)) / (Math.log10(xs.max) - Math.log10(xs.min))
        : (v - xs.min) / (xs.max - xs.min);
      return m.l + t * iw;
    }
    function sy(v) {
      var t = ys.log
        ? (Math.log10(v) - Math.log10(ys.min)) / (Math.log10(ys.max) - Math.log10(ys.min))
        : (v - ys.min) / (ys.max - ys.min);
      return m.t + ih - t * ih;
    }
    /** 反推:像素 → 資料值 */
    function ix(px) {
      var t = (px - m.l) / iw;
      return xs.log
        ? Math.pow(10, Math.log10(xs.min) + t * (Math.log10(xs.max) - Math.log10(xs.min)))
        : xs.min + t * (xs.max - xs.min);
    }

    function tickValues(spec) {
      if (spec.ticks && spec.ticks.length) return spec.ticks;
      var out = [];
      if (spec.log) {
        var e0 = Math.floor(Math.log10(spec.min));
        var e1 = Math.ceil(Math.log10(spec.max));
        for (var e = e0; e <= e1; e++) {
          var v = Math.pow(10, e);
          if (v >= spec.min * 0.999 && v <= spec.max * 1.001) out.push(v);
        }
      } else {
        var n = spec.tickCount || 6;
        for (var i = 0; i <= n; i++) out.push(spec.min + ((spec.max - spec.min) * i) / n);
      }
      return out;
    }

    function tickLabel(v, spec) {
      if (spec.format) return spec.format(v);
      if (spec.log) {
        var e = Math.round(Math.log10(v));
        return "10" + supStr(e);
      }
      var a = Math.abs(v);
      if (a >= 1000) return String(Math.round(v));
      if (a >= 10) return v.toFixed(0);
      if (a >= 1) return v.toFixed(1);
      if (a === 0) return "0";
      return v.toFixed(2);
    }

    var api = {
      svg: svg,
      W: W,
      H: H,
      m: m,
      iw: iw,
      ih: ih,
      sx: sx,
      sy: sy,
      ix: ix,
      layers: { grid: gGrid, axis: gAxis, data: gData, overlay: gOver },
    };

    /** 畫座標軸與格線(主題色由此處統一套用) */
    api.drawAxes = function () {
      var p = PA.canvasTheme.palette();
      gGrid.textContent = "";
      gAxis.textContent = "";

      var xt = tickValues(xs);
      var yt = tickValues(ys);

      if (opts.grid !== false) {
        xt.forEach(function (v) {
          gGrid.appendChild(
            svgEl("line", {
              x1: sx(v), y1: m.t, x2: sx(v), y2: m.t + ih,
              stroke: p.vizGrid, "stroke-width": 1,
            })
          );
        });
        yt.forEach(function (v) {
          gGrid.appendChild(
            svgEl("line", {
              x1: m.l, y1: sy(v), x2: m.l + iw, y2: sy(v),
              stroke: p.vizGrid, "stroke-width": 1,
            })
          );
        });
      }

      // 軸線
      gAxis.appendChild(
        svgEl("line", { x1: m.l, y1: m.t + ih, x2: m.l + iw, y2: m.t + ih, stroke: p.vizAxis, "stroke-width": 1.5 })
      );
      gAxis.appendChild(
        svgEl("line", { x1: m.l, y1: m.t, x2: m.l, y2: m.t + ih, stroke: p.vizAxis, "stroke-width": 1.5 })
      );

      // 刻度標籤。
      // 注意 tickCount: n 會產生 n+1 個刻度,若 format 又四捨五入到整數,
      // 相鄰兩格可能印出一樣的字(例如 1.6 與 2.4 都變成「2」)。
      // 格線照畫,但重複的標籤跳過 —— 軸上不該出現兩個一樣的數字。
      var prevX = null;
      xt.forEach(function (v) {
        var text = tickLabel(v, xs);
        if (text === prevX) return;
        prevX = text;
        var t = svgEl("text", {
          x: sx(v), y: m.t + ih + 16, "text-anchor": "middle",
          fill: p.textSubtle, "font-size": 11,
        });
        t.textContent = text;
        gAxis.appendChild(t);
      });
      var prevY = null;
      yt.forEach(function (v) {
        var textY = tickLabel(v, ys);
        if (textY === prevY) return;
        prevY = textY;
        var t = svgEl("text", {
          x: m.l - 8, y: sy(v) + 4, "text-anchor": "end",
          fill: p.textSubtle, "font-size": 11,
        });
        t.textContent = tickLabel(v, ys);
        gAxis.appendChild(t);
      });

      // 軸名
      if (xs.label) {
        var xl = svgEl("text", {
          x: m.l + iw / 2, y: H - 6, "text-anchor": "middle",
          fill: p.textMuted, "font-size": 12, "font-weight": 600,
        });
        xl.textContent = xs.label;
        gAxis.appendChild(xl);
      }
      if (ys.label) {
        var yl = svgEl("text", {
          x: 12, y: m.t + ih / 2, "text-anchor": "middle",
          fill: p.textMuted, "font-size": 12, "font-weight": 600,
          transform: "rotate(-90 12 " + (m.t + ih / 2) + ")",
        });
        yl.textContent = ys.label;
        gAxis.appendChild(yl);
      }
    };

    /**
     * 畫一條曲線
     * points: [[x,y], ...],超出 y 範圍者自動裁切成斷線
     */
    api.line = function (points, style) {
      var s = style || {};
      var d = "";
      var pen = false;
      /**
       * 離譜的值(發散、無定義)才提筆斷線。
       * 線性軸的門檻要用「值域跨距」算 —— 寫成 ys.min * 0.5 的話,
       * 值域含負數時門檻會反而往上跑,把合法資料切掉。
       * 對數軸則維持倍率門檻,那才符合它的尺度。
       */
      var span = ys.max - ys.min;
      var loCut = ys.log ? ys.min * 0.5 : ys.min - span;
      var hiCut = ys.log ? ys.max * 1.5 : ys.max + span;
      for (var i = 0; i < points.length; i++) {
        var px = points[i][0],
          py = points[i][1];
        if (!isFinite(px) || !isFinite(py) || py > hiCut || py < loCut) {
          pen = false;
          continue;
        }
        var X = sx(px),
          Y = sy(Math.min(Math.max(py, ys.min), ys.max));
        d += (pen ? "L" : "M") + X.toFixed(2) + " " + Y.toFixed(2) + " ";
        pen = true;
      }
      var path = svgEl("path", {
        d: d,
        fill: "none",
        stroke: s.stroke || PA.canvasTheme.palette().primary,
        "stroke-width": s.width || 2,
        "stroke-dasharray": s.dash || null,
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
        opacity: s.opacity || 1,
      });
      gData.appendChild(path);
      return path;
    };

    /** 填色區域(用於 A12 的截面 × EEDF 重疊區) */
    api.area = function (points, style) {
      var s = style || {};
      if (!points.length) return null;
      var d = "M" + sx(points[0][0]) + " " + sy(ys.min) + " ";
      points.forEach(function (pt) {
        var y = Math.min(Math.max(pt[1], ys.min), ys.max);
        d += "L" + sx(pt[0]).toFixed(2) + " " + sy(y).toFixed(2) + " ";
      });
      d += "L" + sx(points[points.length - 1][0]) + " " + sy(ys.min) + " Z";
      var path = svgEl("path", {
        d: d,
        fill: s.fill || PA.canvasTheme.palette().primary,
        opacity: s.opacity != null ? s.opacity : 0.18,
        stroke: "none",
      });
      gData.appendChild(path);
      return path;
    };

    api.dot = function (x, y, style) {
      var s = style || {};
      var c = svgEl("circle", {
        cx: sx(x), cy: sy(y), r: s.r || 5,
        fill: s.fill || PA.canvasTheme.palette().primary,
        stroke: s.stroke || PA.canvasTheme.palette().bg,
        "stroke-width": s.strokeWidth || 2,
      });
      (s.overlay ? gOver : gData).appendChild(c);
      return c;
    };

    api.vline = function (x, style) {
      var s = style || {};
      var l = svgEl("line", {
        x1: sx(x), y1: m.t, x2: sx(x), y2: m.t + ih,
        stroke: s.stroke || PA.canvasTheme.palette().textSubtle,
        "stroke-width": s.width || 1.5,
        "stroke-dasharray": s.dash || "4 3",
      });
      (s.overlay ? gOver : gData).appendChild(l);
      return l;
    };

    api.hline = function (y, style) {
      var s = style || {};
      var l = svgEl("line", {
        x1: m.l, y1: sy(y), x2: m.l + iw, y2: sy(y),
        stroke: s.stroke || PA.canvasTheme.palette().textSubtle,
        "stroke-width": s.width || 1.5,
        "stroke-dasharray": s.dash || "4 3",
      });
      (s.overlay ? gOver : gData).appendChild(l);
      return l;
    };

    api.label = function (x, y, text, style) {
      var s = style || {};
      var t = svgEl("text", {
        x: sx(x) + (s.dx || 0),
        y: sy(y) + (s.dy || 0),
        "text-anchor": s.anchor || "start",
        fill: s.fill || PA.canvasTheme.palette().text,
        "font-size": s.size || 11,
        "font-weight": s.weight || 600,
      });
      t.textContent = text;
      (s.overlay ? gOver : gData).appendChild(t);
      return t;
    };

    /** 圖例 —— 顏色 + 形狀,不以顏色為唯一區辨 */
    api.legend = function (items, x, y) {
      var p = PA.canvasTheme.palette();
      var g = svgEl("g");
      items.forEach(function (it, i) {
        var yy = y + i * 16;
        g.appendChild(
          svgEl("line", {
            x1: x, y1: yy, x2: x + 18, y2: yy,
            stroke: it.color, "stroke-width": 2.5,
            "stroke-dasharray": it.dash || null,
          })
        );
        var t = svgEl("text", {
          x: x + 24, y: yy + 4, fill: p.textMuted, "font-size": 11,
        });
        t.textContent = it.label;
        g.appendChild(t);
      });
      gOver.appendChild(g);
      return g;
    };

    api.clear = function (layer) {
      if (layer) api.layers[layer].textContent = "";
      else {
        gData.textContent = "";
        gOver.textContent = "";
      }
    };

    /**
     * 綁定游標讀值。handler(dataX, dataY, evt) 於指標移動時呼叫。
     * 同時支援滑鼠與觸控。
     */
    api.onCursor = function (handler) {
      var rect = svgEl("rect", {
        x: m.l, y: m.t, width: iw, height: ih,
        fill: "transparent", style: "cursor:crosshair",
      });
      gOver.appendChild(rect);

      function pos(evt) {
        var box = svg.getBoundingClientRect();
        var scale = W / box.width;
        var cx = ((evt.touches ? evt.touches[0].clientX : evt.clientX) - box.left) * scale;
        return Math.min(Math.max(cx, m.l), m.l + iw);
      }
      function onMove(evt) {
        handler(ix(pos(evt)), evt);
      }
      rect.addEventListener("mousemove", onMove);
      rect.addEventListener("touchmove", function (e) {
        e.preventDefault();
        onMove(e);
      }, { passive: false });
      return rect;
    };

    /** 產生曲線取樣點 */
    api.sample = function (fn, n) {
      var count = n || 200;
      var pts = [];
      for (var i = 0; i <= count; i++) {
        var t = i / count;
        var x = xs.log
          ? Math.pow(10, Math.log10(xs.min) + t * (Math.log10(xs.max) - Math.log10(xs.min)))
          : xs.min + t * (xs.max - xs.min);
        pts.push([x, fn(x)]);
      }
      return pts;
    };

    api.drawAxes();
    return api;
  }

  PA.plot = { create: create, svgEl: svgEl, NS: NS, sup: supStr };
})((window.PA = window.PA || {}));
