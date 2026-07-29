/* ==========================================================================
   particle-engine.js — 粒子系統

   被 A01、A03、A04、A06、A13、A24、A31 共用。
   提供:粒子池(避免 GC 抖動)、種類定義、碰撞抽樣、邊界處理、繪製。

   效能預算(docs/05):桌機 2000 顆、行動 600 顆,60 fps。
   ========================================================================== */

(function (PA) {
  "use strict";

  /** 依裝置決定粒子上限 */
  function budget() {
    var mobile = window.matchMedia && window.matchMedia("(max-width: 639px)").matches;
    return mobile ? 600 : 2000;
  }

  /**
   * 粒子種類 —— 形狀與大小必須先於顏色可辨(色盲與灰階列印)
   * shape: "dot" | "ring" | "plus" | "minus" | "tri"
   */
  var KINDS = {
    neutral: { token: "vizNeutral", r: 2.0, shape: "dot", label: "中性" },
    electron: { token: "vizElectron", r: 1.6, shape: "dot", label: "電子" },
    ionPos: { token: "vizIonPos", r: 3.6, shape: "plus", label: "正離子" },
    ionNeg: { token: "vizIonNeg", r: 3.6, shape: "minus", label: "負離子" },
    radical: { token: "vizRadical", r: 2.8, shape: "tri", label: "自由基" },
    excited: { token: "vizPolymer", r: 2.6, shape: "ring", label: "激發態" },
  };

  /**
   * 建立粒子系統
   * opts: { max, width, height }
   */
  function create(opts) {
    var max = Math.min(opts.max || 800, budget());
    var pool = new Array(max);
    for (var i = 0; i < max; i++) {
      pool[i] = {
        active: false,
        x: 0, y: 0, vx: 0, vy: 0,
        kind: "neutral",
        age: 0, life: Infinity,
        data: null,
      };
    }

    var sys = {
      pool: pool,
      max: max,
      count: 0,
      width: opts.width || 100,
      height: opts.height || 100,
    };

    sys.resize = function (w, h) {
      sys.width = w;
      sys.height = h;
    };

    sys.spawn = function (init) {
      for (var i = 0; i < max; i++) {
        var p = pool[i];
        if (p.active) continue;
        p.active = true;
        p.age = 0;
        p.life = Infinity;
        p.data = null;
        p.vx = 0;
        p.vy = 0;
        p.kind = "neutral";
        if (init) init(p);
        sys.count++;
        return p;
      }
      return null; // 池滿
    };

    sys.kill = function (p) {
      if (!p.active) return;
      p.active = false;
      sys.count--;
    };

    sys.clear = function () {
      for (var i = 0; i < max; i++) pool[i].active = false;
      sys.count = 0;
    };

    sys.each = function (fn) {
      for (var i = 0; i < max; i++) {
        if (pool[i].active) fn(pool[i], i);
      }
    };

    /**
     * 基本推進:位置積分 + 壽命
     * bounds: "wrap" | "bounce" | "kill" | "none"
     */
    sys.integrate = function (dt, bounds) {
      var mode = bounds || "wrap";
      for (var i = 0; i < max; i++) {
        var p = pool[i];
        if (!p.active) continue;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.age += dt;
        if (p.age > p.life) {
          sys.kill(p);
          continue;
        }
        if (mode === "wrap") {
          if (p.x < 0) p.x += sys.width;
          else if (p.x > sys.width) p.x -= sys.width;
          if (p.y < 0) p.y += sys.height;
          else if (p.y > sys.height) p.y -= sys.height;
        } else if (mode === "bounce") {
          if (p.x < 0) { p.x = 0; p.vx = -p.vx; }
          else if (p.x > sys.width) { p.x = sys.width; p.vx = -p.vx; }
          if (p.y < 0) { p.y = 0; p.vy = -p.vy; }
          else if (p.y > sys.height) { p.y = sys.height; p.vy = -p.vy; }
        } else if (mode === "kill") {
          if (p.x < -8 || p.x > sys.width + 8 || p.y < -8 || p.y > sys.height + 8) {
            sys.kill(p);
          }
        }
      }
    };

    /**
     * 碰撞抽樣(卜瓦松過程)
     * 給定平均自由徑 mfp(像素)與這一步移動的距離,回傳是否碰撞。
     * 這是 A03 平均自由徑模擬的核心。
     */
    sys.collides = function (distance, mfp) {
      if (mfp <= 0) return true;
      return Math.random() < 1 - Math.exp(-distance / mfp);
    };

    /** 等向散射:保持速率,隨機改方向 */
    sys.scatter = function (p, spreadRad) {
      var speed = Math.hypot(p.vx, p.vy);
      if (spreadRad == null) {
        var a = Math.random() * Math.PI * 2;
        p.vx = Math.cos(a) * speed;
        p.vy = Math.sin(a) * speed;
      } else {
        var cur = Math.atan2(p.vy, p.vx);
        var na = cur + (Math.random() - 0.5) * 2 * spreadRad;
        p.vx = Math.cos(na) * speed;
        p.vy = Math.sin(na) * speed;
      }
    };

    /** Maxwell-Boltzmann 式的隨機速率(Box-Muller 近似) */
    sys.thermalSpeed = function (mean) {
      var u = 1 - Math.random();
      var v = Math.random();
      var g = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      return Math.max(0.15, mean * (1 + g * 0.35));
    };

    /** 繪製 */
    sys.draw = function (ctx, palette) {
      var p8 = palette || PA.canvasTheme.palette();
      for (var i = 0; i < max; i++) {
        var p = pool[i];
        if (!p.active) continue;
        var k = KINDS[p.kind] || KINDS.neutral;
        var col = p8[k.token] || "#888";
        var r = p.r || k.r;
        ctx.save();
        ctx.globalAlpha = p.alpha != null ? p.alpha : 1;

        if (k.shape === "dot") {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        } else if (k.shape === "ring") {
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.stroke();
        } else if (k.shape === "tri") {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - r);
          ctx.lineTo(p.x + r * 0.9, p.y + r * 0.7);
          ctx.lineTo(p.x - r * 0.9, p.y + r * 0.7);
          ctx.closePath();
          ctx.fill();
        } else {
          // plus / minus:圓 + 符號,即使灰階也分得出正負
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = p8.bg;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(p.x - r * 0.52, p.y);
          ctx.lineTo(p.x + r * 0.52, p.y);
          if (k.shape === "plus") {
            ctx.moveTo(p.x, p.y - r * 0.52);
            ctx.lineTo(p.x, p.y + r * 0.52);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    };

    /** 畫軌跡尾巴(用於離子束、電子雪崩) */
    sys.drawTrail = function (ctx, p, color, length) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      var sp = Math.hypot(p.vx, p.vy) || 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - (p.vx / sp) * length, p.y - (p.vy / sp) * length);
      ctx.stroke();
      ctx.restore();
    };

    return sys;
  }

  /** 產生圖例資料(供元件放進 readout 或 SVG legend) */
  function legendFor(kinds) {
    var p = PA.canvasTheme.palette();
    return kinds.map(function (k) {
      var d = KINDS[k];
      return { key: k, label: d.label, color: p[d.token], shape: d.shape };
    });
  }

  PA.particles = {
    create: create,
    KINDS: KINDS,
    budget: budget,
    legendFor: legendFor,
  };
})((window.PA = window.PA || {}));
