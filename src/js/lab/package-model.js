/* ==========================================================================
   package-model.js — 封裝電漿處理模型(3.7 / A33)

   封裝端沒有「蝕刻深度」可以量,量的是**表面狀態**。所以這支模型的輸出
   是接觸角、表面能、接著力指數與損傷程度 —— 對應現場真的會量的東西。

   三條規則,其餘都是它們的組合:

     1. 活化   —— 表面能朝飽和值上升,速率 ∝ 自由基通量,呈指數趨近
     2. 損傷   —— 超過某個劑量後開始產生降解層(LMWOM),接著力反而下降
     3. 回復   —— 處理後表面能隨等待時間衰退(疏水回復),決定 queue time

   規則 2 是封裝電漿與前段蝕刻最大的差別:**製程窗有上限**。
   「刻久一點總會刻穿」在這裡是錯的。

   ⚠️ 教材用的簡化模型。定性趨勢與量級為目標,不做定量預測。
   ========================================================================== */

(function (PA) {
  "use strict";

  /** 水的表面張力 [mN/m] —— 接觸角換算的基準 */
  var GAMMA_WATER = 72.8;

  /**
   * 氣體。封裝端的清單與前段幾乎沒有重疊 —— 沒有氟系。
   *   act    活化效率(把極性基團接上表面的能力)
   *   etch   對有機材料的侵蝕性(決定多快開始損傷)
   *   redox  對金屬氧化物的作用:+1 氧化、−1 還原、0 中性(物理濺射)
   *   sat    這支氣體能把表面能推到多高 [mN/m]
   */
  var GASES = [
    {
      id: "ar", label: "Ar", zh: "氬",
      act: 0.55, etch: 0.35, redox: 0, sat: 58,
      why: "純物理濺射。最安全的萬用選擇:去氧化層、打粗表面,不引入化學殘留。",
    },
    {
      id: "o2", label: "O₂", zh: "氧",
      act: 1.0, etch: 1.0, redox: +1, sat: 72,
      why: "活化與去有機殘留的主力,表面能推得最高 —— 但會氧化 Cu/Ag,也最快傷到有機基材。",
    },
    /**
     * Ar+O₂ 混合 —— 現場另一個常見配置,原理與 3.1.3 的 Coburn–Winters
     * 離子輔助化學是同一件事:Ar 的物理轟擊持續清走反應產物與弱鍵結的
     * 降解層(LMWOM),讓 O₂ 的化學活化不必堆積劑量就能生效。
     *
     * 數字怎麼定的:act 略低於純 O₂(0.95 < 1.0)——化學活化終究由 O₂
     * 主導,稀釋後動力學略慢一點,不宜宣稱比純 O₂ 更快活化。
     * etch 明顯低於純 O₂(0.55 < 1.0)——這才是真正的效果:同樣活化到
     * 一半的劑量,傷害少了將近一半。act/etch 之比(製程窗寬度的代理指標)
     * 因此是五支氣體裡最高的,check-package.mjs 有斷言守住這個比較。
     */
    {
      id: "aro2", label: "Ar+O₂", zh: "氬氧混合",
      act: 0.95, etch: 0.55, redox: +1, sat: 71,
      why: "離子輔助化學(呼應 3.1 的 Coburn–Winters 協同):Ar 轟擊持續清開反應路徑,讓 O₂ 的活化不必堆那麼多劑量,製程窗比純 O₂ 寬。",
    },
    {
      id: "h2ar", label: "H₂/Ar", zh: "氫氬混合",
      act: 0.45, etch: 0.3, redox: -1, sat: 52,
      why: "唯一能**還原**金屬氧化物的選擇。Cu/Ag pad 去氧化只有它做得到,O₂ 反而幫倒忙。",
    },
    {
      id: "n2", label: "N₂", zh: "氮",
      act: 0.65, etch: 0.5, redox: 0, sat: 62,
      why: "大氣電漿的主要載氣,成本最低。活化夠用,但去有機殘留不如 O₂。",
    },
  ];

  /**
   * 材料。封裝端幾乎都是有機物,而有機物有溫度與劑量上限。
   *   g0        未處理的表面能 [mN/m]
   *   tough     耐電漿程度(越大越耐,損傷來得越慢)
   *   recovery  疏水回復的時間常數 [小時]
   *   keep      永久保留的活化比例(不會回復的那一部分)
   *   metal     是不是金屬表面(才需要考慮氧化/還原)
   */
  var MATERIALS = [
    {
      id: "emc", label: "封膠料 EMC", g0: 34, tough: 1.0, recovery: 30, keep: 0.45, metal: false,
      note: "環氧模封材料。封膠前活化的主要對象,分層失效多半發生在它的界面。",
    },
    {
      id: "pi", label: "聚醯亞胺 PI", g0: 38, tough: 1.4, recovery: 60, keep: 0.55, metal: false,
      note: "比 EMC 耐電漿,回復也慢一些。重佈線層與軟板的主要介電質。",
    },
    {
      id: "sm", label: "綠漆 Solder mask", g0: 32, tough: 0.7, recovery: 20, keep: 0.35, metal: false,
      note: "最不耐打的一個 —— 處理過頭會出現粉化與變色,而且回復最快。",
    },
    {
      id: "cu", label: "Cu pad", g0: 42, tough: 3.0, recovery: 200, keep: 0.9, metal: true,
      note: "金屬,幾乎不怕電漿損傷。真正的問題是**氧化狀態**,而它由氣體決定。",
    },
  ];

  /**
   * 自由基通量(相對值)。
   * 功率給密度、壓力給中性粒子數 —— 兩者都要,但都會飽和。
   * 大氣電漿的有效通量較低(反應區薄、且被氮氣稀釋),用 mode 區分。
   */
  function radicalFlux(power_W, pressure_Torr, mode) {
    var p = Math.max(0, power_W) / 300; // 300 W 當基準
    var g = Math.pow(Math.max(0.02, pressure_Torr) / 0.4, 0.45);
    var m = mode === "atm" ? 0.55 : 1;
    return p * g * m;
  }

  /**
   * 熱負荷(相對值)。大氣電漿沒有真空當隔熱,熱負荷明顯高。
   * 有機材料的上限大約在 100–150 °C,所以這一項會限制處理時間。
   */
  function thermalLoad(power_W, time_s, mode) {
    // 低壓腔體有真空當隔熱,升溫慢;大氣電漿沒有,而且噴嘴很靠近工件
    var base = mode === "atm" ? 2.2 : 0.7;
    return (Math.max(0, power_W) / 300) * (Math.max(0, time_s) / 60) * base;
  }

  /**
   * 表面能隨處理時間的演化 —— 指數趨近飽和。
   * 「再延長時間不會更好」就是這條式子:飽和之後多做的都是白花 cycle time。
   */
  function surfaceEnergy(gas, mat, power_W, pressure_Torr, time_s, mode) {
    var flux = radicalFlux(power_W, pressure_Torr, mode);
    var sat = Math.min(GAMMA_WATER - 0.5, mat.g0 + (gas.sat - mat.g0) * 1.0);
    // 活化速率:氣體效率 × 通量 ÷ 材料的耐受度
    var k = (gas.act * flux) / (mat.tough * 22);
    var frac = 1 - Math.exp(-k * Math.max(0, time_s));
    return mat.g0 + (sat - mat.g0) * frac;
  }

  /**
   * 損傷(0…1)。超過門檻劑量之後才開始累積,而且是超線性的 ——
   * 這正是「處理過頭」的來源。金屬幾乎不受影響(tough 很大)。
   */
  function damage(gas, mat, power_W, pressure_Torr, time_s, mode) {
    var dose = gas.etch * radicalFlux(power_W, pressure_Torr, mode) * Math.max(0, time_s);
    var threshold = mat.tough * 55;
    if (dose <= threshold) return 0;
    var over = (dose - threshold) / threshold;
    return Math.min(1, Math.pow(over, 1.35) * 0.5);
  }

  /**
   * 接觸角。Girifalco–Good 近似:cos θ = 2√(γs/γl) − 1。
   * 表面能越高 → 接觸角越小 → 越親水 → 膠爬得進去、銲球沾得住。
   */
  function contactAngle(gamma_s) {
    var c = 2 * Math.sqrt(Math.max(0, gamma_s) / GAMMA_WATER) - 1;
    c = Math.max(-1, Math.min(1, c));
    return (Math.acos(c) * 180) / Math.PI;
  }

  /**
   * 接著力指數(相對未處理 = 1)。
   *
   * 這裡是本模型的重點:接著力**不是**表面能的單調函數。
   *   · 表面能上升 → 附著功上升(好)
   *   · 損傷累積   → 降解層讓界面變弱(壞)
   * 兩者相乘,所以曲線會先升後降 —— 製程窗有上限。
   */
  function adhesion(gamma_s, dmg, mat, oxide) {
    var wa = 2 * Math.sqrt(Math.max(0, gamma_s) * GAMMA_WATER);
    var wa0 = 2 * Math.sqrt(mat.g0 * GAMMA_WATER);
    var gain = wa / wa0;
    var penalty = 1 - 0.85 * dmg;
    // 金屬表面殘留氧化物會直接吃掉接著力與可焊性
    var ox = mat.metal ? 1 - 0.55 * oxide : 1;
    return Math.max(0, gain * penalty * ox);
  }

  /**
   * 金屬表面的氧化狀態(0 = 乾淨金屬,1 = 完全氧化)。
   * 起點假設是「放了一段時間、已經有原生氧化層」的 0.6。
   * O₂ 把它推向 1、H₂ 拉向 0、Ar 靠物理濺射也能去掉一部分。
   */
  function oxideState(gas, power_W, pressure_Torr, time_s, mode) {
    var start = 0.6;
    var flux = radicalFlux(power_W, pressure_Torr, mode) * Math.max(0, time_s);
    if (gas.redox > 0) return Math.min(1, start + (1 - start) * (1 - Math.exp(-flux / 90)));
    if (gas.redox < 0) return Math.max(0, start * Math.exp(-flux / 45));
    // 中性(Ar):純物理濺射,慢一些,而且清不到最後
    return Math.max(0.08, start * Math.exp(-flux / 110));
  }

  /**
   * 疏水回復。處理後的高表面能不是永久的 ——
   * 一部分永久保留(keep),其餘以材料自己的時間常數衰退回去。
   * queue time 上限就是從這裡算出來的,不是規定出來的。
   */
  function recovered(gamma_peak, mat, waitHours) {
    var permanent = mat.g0 + (gamma_peak - mat.g0) * mat.keep;
    var decaying = (gamma_peak - permanent) * Math.exp(-Math.max(0, waitHours) / mat.recovery);
    return permanent + decaying;
  }

  /**
   * 還剩多久必須接下一站:接觸角回升到 targetAngle 之前的小時數。
   * 回傳 Infinity 表示永久保留的部分就已經達標,不受時間限制。
   */
  function queueTimeHours(gamma_peak, mat, targetAngle) {
    var target = targetAngle == null ? 30 : targetAngle;
    var permanent = mat.g0 + (gamma_peak - mat.g0) * mat.keep;
    if (contactAngle(permanent) <= target) return Infinity;
    if (contactAngle(gamma_peak) > target) return 0;
    // 二分搜尋回升到門檻的時間
    var lo = 0;
    var hi = 2000;
    for (var i = 0; i < 60; i++) {
      var mid = (lo + hi) / 2;
      if (contactAngle(recovered(gamma_peak, mat, mid)) > target) hi = mid;
      else lo = mid;
    }
    return (lo + hi) / 2;
  }

  /** 一次算完所有輸出 */
  function evaluate(opts) {
    var gas = byId(GASES, opts.gas) || GASES[0];
    var mat = byId(MATERIALS, opts.material) || MATERIALS[0];
    var mode = opts.mode || "lp";
    var P = opts.power;
    var pr = mode === "atm" ? 760 : opts.pressure;
    var t = opts.time;

    var gamma = surfaceEnergy(gas, mat, P, pr, t, mode);
    var dmg = damage(gas, mat, P, pr, t, mode);
    var ox = mat.metal ? oxideState(gas, P, pr, t, mode) : 0;
    var angle = contactAngle(gamma);
    var adh = adhesion(gamma, dmg, mat, ox);
    var heat = thermalLoad(P, t, mode);

    return {
      gas: gas,
      material: mat,
      mode: mode,
      gamma: gamma,
      angle: angle,
      damage: dmg,
      oxide: ox,
      adhesion: adh,
      thermal: heat,
      queueHours: queueTimeHours(gamma, mat, 30),
      verdict: verdict(angle, dmg, ox, heat, mat),
    };
  }

  /**
   * 判定 —— 用量出來的數字,不用「選了哪個預設」。
   * 順序就是現場的檢查順序:先看熱有沒有超、再看有沒有做過頭、
   * 再看金屬氧化、最後才看活化夠不夠。
   */
  function verdict(angle, dmg, ox, heat, mat) {
    if (heat > 3.2) return "熱負荷過高 —— 料條可能變形";
    if (dmg > 0.35) return "處理過頭 —— 基材降解,接著力反而下降";
    /**
     * 金屬表面不看接觸角。金屬本來就不是靠「活化」判斷的 ——
     * pad 的問題是**氧化狀態**與有機殘留,量的是可焊性與拉力,不是水滴。
     * 把兩種材料混用同一組判準是現場常見的誤用。
     */
    if (mat.metal) {
      if (ox > 0.7) return "表面被氧化 —— 打線/迴銲會不沾(NSOP)";
      if (ox > 0.45) return "氧化層仍偏厚 —— 換還原性氣體或延長時間";
      if (ox > 0.2) return "✅ 氧化層已大幅去除";
      return "✅ 金屬表面乾淨";
    }
    if (angle > 45) return "活化不足 —— 表面仍疏水";
    if (angle > 30) return "勉強 —— 未達 < 30° 的常見規格";
    if (dmg > 0.12) return "達標,但已開始有損傷 —— 時間可以縮短";
    return "✅ 達標";
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  PA.packageModel = {
    GAMMA_WATER: GAMMA_WATER,
    gases: GASES,
    materials: MATERIALS,
    gasById: function (id) { return byId(GASES, id); },
    materialById: function (id) { return byId(MATERIALS, id); },
    radicalFlux: radicalFlux,
    thermalLoad: thermalLoad,
    surfaceEnergy: surfaceEnergy,
    damage: damage,
    contactAngle: contactAngle,
    adhesion: adhesion,
    oxideState: oxideState,
    recovered: recovered,
    queueTimeHours: queueTimeHours,
    evaluate: evaluate,
    verdict: verdict,
  };
})((window.PA = window.PA || {}));
