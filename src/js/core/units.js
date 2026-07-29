/* ==========================================================================
   units.js — 常駐單位換算工具列
   涵蓋 Torr / Pa / mbar、sccm / slm、eV / K / J、cm⁻³ / m⁻³
   規範來源:docs/09-content-style-guide.md §數字與單位
   ========================================================================== */

(function (PA) {
  "use strict";

  var GROUPS = {
    pressure: {
      label: "壓力",
      base: "Pa",
      units: {
        mTorr: 0.1333224,
        Torr: 133.3224,
        Pa: 1,
        kPa: 1000,
        mbar: 100,
        atm: 101325,
      },
      defaultFrom: "mTorr",
      show: ["mTorr", "Torr", "Pa", "mbar"],
    },
    flow: {
      label: "流量",
      base: "sccm",
      units: { sccm: 1, slm: 1000 },
      defaultFrom: "sccm",
      show: ["sccm", "slm"],
    },
    energy: {
      label: "能量 / 溫度",
      base: "eV",
      units: { eV: 1, K: 1 / 11604.518, J: 6.241509e18, "°C": null },
      defaultFrom: "eV",
      show: ["eV", "K", "J"],
    },
    density: {
      label: "密度",
      base: "cm⁻³",
      units: { "cm⁻³": 1, "m⁻³": 1e-6 },
      defaultFrom: "cm⁻³",
      show: ["cm⁻³", "m⁻³"],
    },
  };

  var SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  function sup(n) {
    return String(n)
      .split("")
      .map(function (c) {
        return SUP[c] || c;
      })
      .join("");
  }

  function format(v) {
    if (!isFinite(v)) return "—";
    var a = Math.abs(v);
    if (a === 0) return "0";
    if (a >= 1e5 || a < 1e-3) {
      var m = v.toExponential(3).match(/^(-?[\d.]+)e([+-]\d+)$/);
      if (m) return m[1] + "×10" + sup(parseInt(m[2], 10));
    }
    if (a >= 100) return v.toFixed(1);
    if (a >= 1) return v.toFixed(3);
    return v.toPrecision(3);
  }

  function build(container) {
    var groupKey = "pressure";

    var wrap = document.createElement("div");
    wrap.className = "pa-units";

    var title = document.createElement("div");
    title.className = "pa-units__title";
    title.textContent = "單位換算";

    var row = document.createElement("div");
    row.className = "pa-units__row";

    var input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.value = "20";
    input.setAttribute("aria-label", "輸入數值");

    var unitSel = document.createElement("select");
    unitSel.setAttribute("aria-label", "來源單位");

    var groupSel = document.createElement("select");
    groupSel.setAttribute("aria-label", "換算類別");
    Object.keys(GROUPS).forEach(function (k) {
      var o = document.createElement("option");
      o.value = k;
      o.textContent = GROUPS[k].label;
      groupSel.appendChild(o);
    });

    var out = document.createElement("div");
    out.className = "pa-units__out";

    function fillUnits() {
      var g = GROUPS[groupKey];
      unitSel.textContent = "";
      g.show.forEach(function (u) {
        var o = document.createElement("option");
        o.value = u;
        o.textContent = u;
        unitSel.appendChild(o);
      });
      unitSel.value = g.defaultFrom;
    }

    function convert() {
      var g = GROUPS[groupKey];
      var v = parseFloat(input.value);
      out.textContent = "";
      if (!isFinite(v)) {
        out.textContent = "請輸入數值";
        return;
      }
      var from = unitSel.value;
      var inBase = v * g.units[from];

      g.show.forEach(function (u) {
        if (u === from) return;
        var line = document.createElement("div");
        line.textContent = format(inBase / g.units[u]) + " " + u;
        out.appendChild(line);
      });

      // 能量類別額外給 °C(K 需減 273.15,不是純比例)
      if (groupKey === "energy") {
        var K = inBase / g.units.K;
        var line = document.createElement("div");
        line.textContent = format(K - 273.15) + " °C";
        out.appendChild(line);
      }
    }

    input.addEventListener("input", convert);
    unitSel.addEventListener("change", convert);
    groupSel.addEventListener("change", function () {
      groupKey = groupSel.value;
      fillUnits();
      convert();
    });

    row.appendChild(input);
    row.appendChild(unitSel);
    wrap.appendChild(title);
    wrap.appendChild(groupSel);
    wrap.appendChild(row);
    wrap.appendChild(out);
    container.appendChild(wrap);

    fillUnits();
    convert();
  }

  function init() {
    var host = document.querySelector("[data-units]");
    if (host) build(host);
  }

  PA.units = { init: init, GROUPS: GROUPS, format: format };
})((window.PA = window.PA || {}));
