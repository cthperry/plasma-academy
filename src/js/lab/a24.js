/* ==========================================================================
   A24 — 磁控濺鍍 E×B 動畫與 racetrack 侵蝕
   章節 3.5 · 規格 docs/05-animation-spec.md

   目標:理解磁場如何束縛電子提升游離效率,以及 racetrack 的代價。

   觀察點(docs/05):
     · 磁場調到 0 → 電子直接飛走,游離效率崩掉
     · 拉動使用時數 → racetrack 越挖越深

   視角是**把 racetrack 攤平**的剖面:水平軸是繞著環走的方位方向,
   垂直軸是離靶面的高度,磁場垂直於畫面(靶面上方的磁力線正是這個方向)。
   在這個平面上 E×B 漂移是水平的,電子畫出教科書上的擺線 —— 這是唯一
   能在二維剖面裡誠實畫出擺線的取法(真正的軸對稱剖面裡漂移是出平面的)。

   數值面板的數字全部來自 js/lab/magnetron-model.js,
   由 tools/check-magnetron.mjs 的 24 項斷言守住;
   軌跡動畫負責「為什麼」,數字負責「多少」,兩邊不各說一套。
   ========================================================================== */

(function (PA) {
  "use strict";

  PA.lab.define(
    "A24",
    function () {
      var C = PA.controls;
      var M = PA.magnetron;

      /** 動畫用的縮放:讓迴旋週期在畫面上看得見(不是 SI 單位) */
      var OMEGA_SCALE = 0.0016;
      var E_ACC = 0.05;
      var N_ELECTRON = 14;

      return PA.lab.create({
        setup: function () {
          var api = this;
          api.state = { gauss: 300, pressure: 3, power: 5, hours: 200 };

          var wrap = document.createElement("div");
          wrap.className = "pa-lab__split";
          var canvasBox = document.createElement("div");
          var sideBox = document.createElement("div");
          wrap.appendChild(canvasBox);
          wrap.appendChild(sideBox);
          api.stage.appendChild(wrap);

          var canvas = document.createElement("canvas");
          canvas.setAttribute("role", "img");
          canvas.setAttribute(
            "aria-label",
            "上半部:電子在磁場中畫出擺線並沿著靶面漂移。下半部:靶材的侵蝕輪廓,最深處在 racetrack 半徑上。"
          );
          canvasBox.appendChild(canvas);
          api.canvas = canvas;

          var card = document.createElement("div");
          card.className = "pa-map-card";
          sideBox.appendChild(card);
          api.card = card;

          /** 重新灑一批電子 */
          api.respawn = function () {
            api.electrons = [];
            for (var k = 0; k < N_ELECTRON; k++) api.electrons.push(api.newElectron(Math.random()));
            api.lostPath = [];
          };

          api.newElectron = function (phase) {
            return {
              x: phase,                       // 0…1 的相對水平位置
              y: 0.02 + Math.random() * 0.03, // 離靶面的相對高度
              vx: (Math.random() - 0.5) * 0.004,
              vy: 0.004 + Math.random() * 0.004,
              path: 0,
              age: 0,
            };
          };

          api.advance = function () {
            var g = api.state.gauss;
            var omega = g * OMEGA_SCALE;
            var els = api.electrons || [];
            for (var i = 0; i < els.length; i++) {
              var e = els[i];
              // a = (−ω·vy, ω·vx + aE) —— B 垂直於畫面,E 把電子推離靶面
              var ax = -omega * e.vy;
              var ay = omega * e.vx + E_ACC * 0.02;
              e.vx += ax;
              e.vy += ay;
              var dx = e.vx;
              var dy = e.vy;
              e.x += dx;
              e.y += dy;
              e.path += Math.sqrt(dx * dx + dy * dy);
              e.age++;
              // 回到靶面就被吸收;飛出上緣就是跑掉了(陽極)
              if (e.y < 0) { e.y = 0.001; e.vy = Math.abs(e.vy) * 0.6; }
              if (e.x < 0) e.x += 1;
              if (e.x > 1) e.x -= 1;
              if (e.y > 1 || e.age > 1600) {
                api.lostPath.push(e.path);
                if (api.lostPath.length > 60) api.lostPath.shift();
                els[i] = api.newElectron(Math.random());
              }
            }
          };

          api.refresh = function () {
            var s = api.state;
            var h = M.hallParameter(s.gauss, s.pressure);
            var eff = M.ionizationEfficiency(s.gauss, s.pressure);
            var util = M.targetUtilization(s.gauss, s.pressure);
            var depth = M.erosionDepth(s.gauss, s.pressure, s.hours, s.power);
            if (api.readoutNode) {
              api.readoutNode.update({
                hall: h,
                path: M.pathEnhancement(s.gauss, s.pressure),
                eff: eff,
                util: util * 100,
                depth: depth * 100,
                life: depth >= 1 ? "已到壽命,該換靶" : depth > 0.8 ? "接近壽命" : "正常",
              });
            }
            api.card.textContent = "";
            var head = document.createElement("div");
            head.className = "pa-map-card__head";
            var st = document.createElement("strong");
            st.textContent =
              s.gauss === 0 ? "無磁場(等同二極濺鍍)" : h > 5 ? "磁控:電子被牢牢束縛" : "磁場偏弱,束縛不足";
            head.appendChild(st);
            api.card.appendChild(head);
            var p = document.createElement("p");
            p.textContent =
              s.gauss === 0
                ? "沒有磁場,電子被電場一路推離靶面就跑掉了 —— 沿路幾乎沒有游離。二極濺鍍只能靠提高壓力來增加碰撞次數,而高壓會散射濺出的原子。"
                : "電子每次碰撞之間繞了 " + h.toFixed(1) +
                  " 圈,等效路徑放大 " + M.pathEnhancement(s.gauss, s.pressure).toFixed(0) +
                  " 倍。束縛最強的那一圈游離最多、被轟得最兇 —— racetrack 就長在那裡。";
            api.card.appendChild(p);
            var p2 = document.createElement("p");
            p2.textContent =
              "靶材利用率 " + (util * 100).toFixed(0) +
              " %:壽命結束於最深處蝕穿,其餘地方的靶材就跟著報廢了。";
            api.card.appendChild(p2);
          };

          var detach = PA.canvasTheme.autoSize(canvas, canvasBox, 3 / 4, function (ctx, w, h2) {
            api.ctx = ctx;
            api.width = w;
            api.height = h2;
            if (!api.booted) { api.booted = true; api.respawn(); api.refresh(); }
          });
          api.onDestroy(detach);

          var readout = C.readout([
            { key: "hall", label: "Hall 參數 h = ω_c·τ", digits: 1, unit: "" },
            { key: "path", label: "等效路徑放大 1+h²", digits: 0, unit: " ×" },
            { key: "eff", label: "相對游離效率", digits: 0, unit: " ×" },
            { key: "util", label: "靶材利用率", digits: 0, unit: " %" },
            { key: "depth", label: "最深侵蝕", digits: 0, unit: " % 靶厚" },
            { key: "life", label: "靶材狀態", format: function (v) { return v; } },
          ]);
          api.readoutNode = readout;

          function knob(key, respawn) {
            var r = M.RANGES[key];
            return C.slider({
              label: r.label, min: r.min, max: r.max, step: r.step,
              unit: r.unit, digits: r.step < 1 ? 1 : 0, value: api.state[key],
              onChange: function (v) {
                if (api.state[key] === v) return;
                api.state[key] = v;
                if (respawn) api.respawn();
                api.refresh();
              },
            });
          }

          api.el.appendChild(
            C.panel([knob("gauss", true), knob("pressure"), knob("power"), knob("hours")])
          );
          api.el.appendChild(readout);
          api.el.appendChild(
            C.observations([
              "**把磁場拉到 0**:電子被電場一路推離靶面就飛走了,擺線消失。看「相對游離效率」—— 從三百多倍掉到 1。**這就是二極濺鍍的困境**:沒有束縛就只能靠高壓補碰撞次數,而高壓又會散射濺出的原子,兩頭為難。",
              "磁場加回來,電子開始畫擺線並沿著靶面漂移。**路徑被拉長就是磁控的全部好處** —— 電子在靶面附近多繞的每一圈都是游離的機會。",
              "看「Hall 參數」的定義 h = ω_c·τ:**壓力越低 τ 越長、h 越大**。把壓力從 60 拉到 3 mTorr,h 從不到 1 變成 17 —— 磁控在低壓反而更有效率,這正是它能在 1–5 mTorr 工作的原因。",
              "看下半部的侵蝕輪廓:最深的地方不在靶心也不在邊緣,而在**磁力線與靶面平行的那一圈**(racetrack)。那裡束縛最強、游離最多、離子轟擊也最猛。",
              "**「靶材利用率」與「游離效率」是同一個磁場拱的兩面。** 把磁場加強,效率上升但輪廓更尖、利用率更差;磁場歸零時利用率接近 100 %,可是根本點不起電漿。這個取捨沒有免費的解 —— 業界的答案是**讓磁鐵轉動**,把 racetrack 抹開。",
              "拉動「靶材累積使用」:侵蝕越挖越深。壽命結束於最深處蝕穿,而**其餘七八成的靶材就跟著報廢**。也因為侵蝕輪廓一路在變,沉積率與均勻度會隨靶齡漂移 —— 這就是要做 kWh 補償的原因。",
            ])
          );
        },

        reset: function () {
          this.state = { gauss: 300, pressure: 3, power: 5, hours: 200 };
          this.respawn();
          this.refresh();
        },

        tick: function () {
          if (!this.electrons) return;
          for (var k = 0; k < 3; k++) this.advance();
        },

        draw: function () {
          var api = this;
          if (!api.ctx) return;
          var ctx = api.ctx;
          var p = PA.canvasTheme.palette();
          var w = api.width;
          var h = api.height;
          var s = api.state;

          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = p.bg;
          ctx.fillRect(0, 0, w, h);

          var splitY = h * 0.58;

          /* ---- 上半:攤平的 racetrack 剖面 + 電子軌跡 ---- */
          var targetTop = splitY - 14;
          ctx.fillStyle = p.vizMask;
          ctx.fillRect(0, targetTop, w, 14);
          ctx.save();
          ctx.font = "11px system-ui, sans-serif";
          ctx.fillStyle = p.text;
          ctx.textBaseline = "middle";
          ctx.fillText("靶材(陰極)", 8, targetTop + 7);
          ctx.restore();

          // 磁場方向(垂直畫面)
          ctx.save();
          ctx.strokeStyle = p.vizAxis || p.text;
          ctx.globalAlpha = s.gauss > 0 ? 0.5 : 0.12;
          for (var bx = 40; bx < w - 20; bx += 70) {
            ctx.beginPath();
            ctx.arc(bx, targetTop - 26, 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(bx, targetTop - 26, 1.6, 0, Math.PI * 2);
            ctx.fillStyle = p.vizAxis || p.text;
            ctx.fill();
          }
          ctx.restore();
          ctx.save();
          ctx.font = "10px system-ui, sans-serif";
          ctx.fillStyle = p.textSubtle || p.text;
          ctx.globalAlpha = s.gauss > 0 ? 0.9 : 0.35;
          ctx.fillText("B 垂直畫面(" + s.gauss + " G)", 8, 14);
          ctx.restore();

          // 電子
          var els = api.electrons || [];
          ctx.save();
          for (var i = 0; i < els.length; i++) {
            var e = els[i];
            var ex = e.x * w;
            var ey = targetTop - e.y * (targetTop - 22);
            ctx.beginPath();
            ctx.arc(ex, ey, 2.6, 0, Math.PI * 2);
            ctx.fillStyle = p.vizElectron;
            ctx.fill();
          }
          ctx.restore();

          /* ---- 下半:侵蝕輪廓 ---- */
          var prof = M.erosionProfile(s.gauss, s.pressure);
          var depth = M.erosionDepth(s.gauss, s.pressure, s.hours, s.power);
          var baseY = splitY + 26;
          var maxH = h - baseY - 26;

          ctx.save();
          ctx.font = "11px system-ui, sans-serif";
          ctx.fillStyle = p.text;
          ctx.fillText("靶材侵蝕輪廓(累積 " + s.hours + " h)", 8, splitY + 14);
          ctx.restore();

          // 靶材本體
          ctx.fillStyle = p.vizSubstrate;
          ctx.fillRect(0, baseY, w, maxH);
          // 被挖掉的部分
          ctx.beginPath();
          ctx.moveTo(0, baseY);
          for (var k2 = 0; k2 < prof.length; k2++) {
            var xx = (k2 / (prof.length - 1)) * w;
            ctx.lineTo(xx, baseY + prof[k2] * depth * maxH);
          }
          ctx.lineTo(w, baseY);
          ctx.closePath();
          ctx.fillStyle = p.bg;
          ctx.fill();
          ctx.strokeStyle = p.vizIonPos;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          for (var k3 = 0; k3 < prof.length; k3++) {
            var x3 = (k3 / (prof.length - 1)) * w;
            var y3 = baseY + prof[k3] * depth * maxH;
            if (k3 === 0) ctx.moveTo(x3, y3);
            else ctx.lineTo(x3, y3);
          }
          ctx.stroke();
          ctx.lineWidth = 1;

          // racetrack 位置標示
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = p.vizIonPos;
          ctx.globalAlpha = 0.55;
          [-M.TRACK_R, M.TRACK_R].forEach(function (r) {
            var rx = ((r + 1) / 2) * w;
            ctx.beginPath();
            ctx.moveTo(rx, baseY);
            ctx.lineTo(rx, baseY + maxH);
            ctx.stroke();
          });
          ctx.restore();
          ctx.save();
          ctx.font = "10px system-ui, sans-serif";
          ctx.fillStyle = p.textSubtle || p.text;
          ctx.textAlign = "center";
          ctx.fillText("racetrack", ((M.TRACK_R + 1) / 2) * w, h - 8);
          ctx.fillText("靶心", w / 2, h - 8);
          ctx.restore();
        },
      });
    },
    ["js/lab/magnetron-model.js"]
  );
})((window.PA = window.PA || {}));
