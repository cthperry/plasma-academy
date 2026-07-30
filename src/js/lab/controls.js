/* ==========================================================================
   controls.js — 統一的控制面板元件庫

   docs/05 §統一控制面板語彙:滑桿、分段控制、開關、播放鈕、重設、數值面板。
   滑桿一律用原生 <input type="range">,免費取得鍵盤操作與讀屏支援。
   ========================================================================== */

(function (PA) {
  "use strict";

  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) {
      for (var k in attrs) {
        if (attrs[k] != null) n.setAttribute(k, attrs[k]);
      }
    }
    return n;
  }

  var uid = 0;
  function nextId(prefix) {
    uid += 1;
    return prefix + "-" + uid;
  }

  /** 數字格式化:自動選定小數位與科學記號 */
  function fmt(v, digits) {
    if (!isFinite(v)) return "—";
    var a = Math.abs(v);
    if (a !== 0 && (a >= 1e5 || a < 1e-3)) {
      var e = v.toExponential(digits == null ? 2 : digits);
      var m = e.match(/^(-?[\d.]+)e([+-]\d+)$/);
      if (m) return m[1] + "×10" + sup(parseInt(m[2], 10));
      return e;
    }
    if (digits != null) return v.toFixed(digits);
    if (a >= 100) return v.toFixed(0);
    if (a >= 10) return v.toFixed(1);
    if (a >= 1) return v.toFixed(2);
    return v.toFixed(3);
  }

  var SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  function sup(n) {
    return String(n)
      .split("")
      .map(function (c) {
        return SUP[c] || c;
      })
      .join("");
  }

  /**
   * 滑桿
   * opts: { label, min, max, step, value, unit, digits, log, format, onChange }
   * log: true 時滑桿位置為對數,value 仍是真實值
   */
  function slider(opts) {
    var wrap = el("div", "pa-ctrl");
    var id = nextId("sl");

    var labelRow = el("label", "pa-ctrl__label", { for: id });
    var name = el("span");
    name.textContent = opts.label;
    var valSpan = el("span", "pa-ctrl__value");
    labelRow.appendChild(name);
    labelRow.appendChild(valSpan);

    var input = el("input", null, {
      type: "range",
      id: id,
      min: 0,
      max: 1000,
      step: 1,
    });

    var lo = opts.log ? Math.log10(opts.min) : opts.min;
    var hi = opts.log ? Math.log10(opts.max) : opts.max;

    function toValue(pos) {
      var t = pos / 1000;
      var raw = lo + (hi - lo) * t;
      var v = opts.log ? Math.pow(10, raw) : raw;
      if (opts.step && !opts.log) v = Math.round(v / opts.step) * opts.step;
      return v;
    }
    function toPos(v) {
      var raw = opts.log ? Math.log10(v) : v;
      return Math.round(((raw - lo) / (hi - lo)) * 1000);
    }

    var current = opts.value != null ? opts.value : opts.min;

    function render() {
      var text = opts.format ? opts.format(current) : fmt(current, opts.digits);
      valSpan.textContent = text;
      if (opts.unit) {
        var u = el("span", "pa-ctrl__unit");
        u.textContent = " " + opts.unit;
        valSpan.appendChild(u);
      }
      input.setAttribute("aria-valuetext", text + (opts.unit ? " " + opts.unit : ""));
    }

    input.value = toPos(current);
    render();

    input.addEventListener("input", function () {
      current = toValue(+input.value);
      render();
      if (opts.onChange) opts.onChange(current);
    });

    wrap.appendChild(labelRow);
    wrap.appendChild(input);

    wrap.getValue = function () {
      return current;
    };
    wrap.setValue = function (v, silent) {
      current = v;
      input.value = toPos(v);
      render();
      if (!silent && opts.onChange) opts.onChange(current);
    };
    return wrap;
  }

  /**
   * 分段控制
   * opts: { label, options: [{value, label}], value, onChange }
   */
  function segmented(opts) {
    var wrap = el("div", "pa-ctrl");
    if (opts.label) {
      var lab = el("div", "pa-ctrl__label");
      var n = el("span");
      n.textContent = opts.label;
      lab.appendChild(n);
      wrap.appendChild(lab);
    }

    var group = el("div", "pa-seg", { role: "group", "aria-label": opts.label || "選項" });
    var current = opts.value != null ? opts.value : opts.options[0].value;
    var buttons = [];

    opts.options.forEach(function (o) {
      var b = el("button", null, { type: "button", "aria-pressed": String(o.value === current) });
      b.textContent = o.label;
      b.addEventListener("click", function () {
        current = o.value;
        sync();
        if (opts.onChange) opts.onChange(current);
      });
      buttons.push({ btn: b, value: o.value });
      group.appendChild(b);
    });

    function sync() {
      buttons.forEach(function (x) {
        x.btn.setAttribute("aria-pressed", String(x.value === current));
      });
    }

    wrap.appendChild(group);
    wrap.getValue = function () {
      return current;
    };
    wrap.setValue = function (v, silent) {
      current = v;
      sync();
      if (!silent && opts.onChange) opts.onChange(current);
    };
    return wrap;
  }

  /** 開關 opts: { label, value, onChange } */
  function toggle(opts) {
    var wrap = el("div", "pa-ctrl");
    var lab = el("label", "pa-switch");
    var input = el("input", null, { type: "checkbox" });
    input.checked = !!opts.value;
    var span = el("span");
    span.textContent = opts.label;
    lab.appendChild(input);
    lab.appendChild(span);
    wrap.appendChild(lab);

    input.addEventListener("change", function () {
      if (opts.onChange) opts.onChange(input.checked);
    });

    wrap.getValue = function () {
      return input.checked;
    };
    wrap.setValue = function (v, silent) {
      input.checked = !!v;
      if (!silent && opts.onChange) opts.onChange(input.checked);
    };
    return wrap;
  }

  /**
   * 播放/暫停 + 重設
   * opts: { onPlay, onPause, onReset, playing }
   */
  function transport(opts) {
    var wrap = el("div", "pa-ctrl");
    var row = el("div", "pa-ctrl__row");

    var playing = !!opts.playing;
    var play = el("button", "pa-btn", { type: "button" });
    var reset = el("button", "pa-btn", { type: "button" });
    reset.textContent = "↺ 重設";

    function sync() {
      play.textContent = playing ? "⏸ 暫停" : "▶ 播放";
      play.setAttribute("aria-pressed", String(playing));
    }
    sync();

    play.addEventListener("click", function () {
      playing = !playing;
      sync();
      if (playing) {
        if (opts.onPlay) opts.onPlay();
      } else if (opts.onPause) {
        opts.onPause();
      }
    });
    reset.addEventListener("click", function () {
      if (opts.onReset) opts.onReset();
    });

    row.appendChild(play);
    row.appendChild(reset);
    wrap.appendChild(row);

    wrap.setPlaying = function (v) {
      playing = v;
      sync();
    };
    return wrap;
  }

  /**
   * 數值面板
   * items: [{ key, label, unit, digits }]
   * 回傳的 node 有 .update({key: value}) 方法
   */
  function readout(items) {
    var wrap = el("div", "pa-lab__readout", { role: "status", "aria-live": "polite" });
    var refs = {};

    items.forEach(function (it) {
      var box = el("div", "pa-readout");
      var l = el("div", "pa-readout__label");
      l.textContent = it.label;
      var v = el("div", "pa-readout__value");
      v.textContent = "—";
      box.appendChild(l);
      box.appendChild(v);
      wrap.appendChild(box);
      refs[it.key] = { node: v, spec: it };
    });

    wrap.update = function (values) {
      for (var k in values) {
        var r = refs[k];
        if (!r) continue;
        var text = r.spec.format
          ? r.spec.format(values[k])
          : fmt(values[k], r.spec.digits);
        r.node.textContent = text;
        if (r.spec.unit) {
          var u = el("span", "u");
          u.textContent = r.spec.unit;
          r.node.appendChild(u);
        }
      }
    };
    return wrap;
  }

  /** 觀察點區塊 */
  function observations(list) {
    var wrap = el("div", "pa-lab__observe");
    var t = el("div", "pa-lab__observe-title");
    t.textContent = "📌 觀察點";
    var ul = el("ul");
    list.forEach(function (s) {
      var li = el("li");
      li.textContent = s;
      ul.appendChild(li);
    });
    wrap.appendChild(t);
    wrap.appendChild(ul);
    return wrap;
  }

  /** 控制面板容器 */
  function panel(controls) {
    var wrap = el("div", "pa-lab__controls");
    controls.forEach(function (c) {
      wrap.appendChild(c);
    });
    return wrap;
  }

  /**
   * 動作按鈕。slider/segmented/toggle 都是「設定一個值」,
   * 但有些互動是**做一件事**(重新出題、重設、單步推進),沒有對應的值。
   * A25 的反向練習需要它,所以補上這個原本缺的基本元件。
   */
  function button(opts) {
    // 用 .pa-seg 當容器,直接沿用既有的按鈕樣式(CSS 選的是 .pa-seg button)
    var wrap = el("div", "pa-ctrl pa-seg");
    var btn = el("button", null, { type: "button" });
    btn.textContent = opts.label;
    if (opts.ariaLabel) btn.setAttribute("aria-label", opts.ariaLabel);
    btn.addEventListener("click", function () {
      if (opts.onClick) opts.onClick();
    });
    wrap.appendChild(btn);
    wrap.setDisabled = function (v) { btn.disabled = !!v; };
    return wrap;
  }

  PA.controls = {
    el: el,
    fmt: fmt,
    sup: sup,
    slider: slider,
    segmented: segmented,
    toggle: toggle,
    button: button,
    transport: transport,
    readout: readout,
    observations: observations,
    panel: panel,
  };
})((window.PA = window.PA || {}));
