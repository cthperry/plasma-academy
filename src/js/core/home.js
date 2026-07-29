/* ==========================================================================
   home.js — 首頁與階層頁的進度環
   路徑圖本身由建置期產生(無 JS 也看得到),此處只負責疊上進度。
   ========================================================================== */

(function (PA) {
  "use strict";

  function ring(ratio, color) {
    var NS = "http://www.w3.org/2000/svg";
    var r = 16;
    var circ = 2 * Math.PI * r;
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "pa-ring");
    svg.setAttribute("viewBox", "0 0 42 42");
    svg.setAttribute("aria-hidden", "true");
    svg.style.setProperty("--level-color", color);

    var track = document.createElementNS(NS, "circle");
    track.setAttribute("class", "pa-ring__track");
    track.setAttribute("cx", "21");
    track.setAttribute("cy", "21");
    track.setAttribute("r", String(r));

    var bar = document.createElementNS(NS, "circle");
    bar.setAttribute("class", "pa-ring__bar");
    bar.setAttribute("cx", "21");
    bar.setAttribute("cy", "21");
    bar.setAttribute("r", String(r));
    bar.setAttribute("stroke-dasharray", String(circ));
    bar.setAttribute("stroke-dashoffset", String(circ * (1 - ratio)));

    var text = document.createElementNS(NS, "text");
    text.setAttribute("class", "pa-ring__text");
    text.setAttribute("x", "21");
    text.setAttribute("y", "21");
    text.textContent = Math.round(ratio * 100) + "%";

    svg.appendChild(track);
    svg.appendChild(bar);
    svg.appendChild(text);
    return svg;
  }

  function render() {
    if (!PA.progress || !PA.curriculum) return;
    var slots = document.querySelectorAll("[data-level-progress]");
    Array.prototype.forEach.call(slots, function (slot) {
      var no = +slot.getAttribute("data-level-progress");
      var lv = PA.curriculum.level(no);
      var st = PA.progress.levelStats(no);
      slot.textContent = "";
      var label = document.createElement("span");
      label.textContent = st.done + " / " + st.total;
      slot.appendChild(label);
      slot.appendChild(ring(st.ratio, lv.color));
      slot.className = "pa-path__progress";
    });
  }

  function init() {
    render();
    window.addEventListener("pa:progresschange", render);
  }

  PA.home = { init: init, ring: ring };
})((window.PA = window.PA || {}));
