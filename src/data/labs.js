/* ==========================================================================
   labs.js — 互動實驗室目錄(/lab/)
   自動產生,請勿手改。來源:docs/05-animation-spec.md 的標題 +
   data/curriculum.js 的模組對照。重新產生:node tools/gen-labs.mjs
   共 33 個元件
   ========================================================================== */

(function (PA) {
  "use strict";

  var LABS = [
  { id: 'A01', title: '氣體→電漿相變粒子動畫', stars: 0, level: 1, moduleId: '1.1', moduleTitle: '物質第四態', url: 'level/1/1-1-fourth-state/' },
  { id: 'A02', title: 'Debye 遮蔽互動', stars: 0, level: 1, moduleId: '1.2', moduleTitle: '電漿基本參數', url: 'level/1/1-2-parameters/' },
  { id: 'A03', title: '平均自由徑粒子模擬', stars: 0, level: 1, moduleId: '1.3', moduleTitle: '碰撞與平均自由徑', url: 'level/1/1-3-collisions/' },
  { id: 'A04', title: '電子雪崩動畫', stars: 0, level: 1, moduleId: '1.4', moduleTitle: '輝光放電與點火', url: 'level/1/1-4-glow-discharge/' },
  { id: 'A05', title: 'Paschen 曲線互動', stars: 1, level: 1, moduleId: '1.4', moduleTitle: '輝光放電與點火', url: 'level/1/1-4-glow-discharge/' },
  { id: 'A06', title: '鞘層形成時間軸動畫', stars: 1, level: 1, moduleId: '1.5', moduleTitle: '鞘層入門', url: 'level/1/1-5-sheath-intro/' },
  { id: 'A07', title: '製程電漿地圖互動', stars: 0, level: 1, moduleId: '1.6', moduleTitle: '製程電漿地圖', url: 'level/1/1-6-process-map/' },
  { id: 'A08', title: '腔體流場與滯留時間計算器', stars: 0, level: 2, moduleId: '2.1', moduleTitle: '氣體動力學與真空', url: 'level/2/2-1-vacuum/' },
  { id: 'A09', title: '氣體選用決策樹', stars: 1, level: 2, moduleId: '2.2', moduleTitle: '製程氣體選用學', url: 'level/2/2-2-gas-selection/' },
  { id: 'A10', title: 'F/C 比滑桿', stars: 1, level: 2, moduleId: '2.2', moduleTitle: '製程氣體選用學', url: 'level/2/2-2-gas-selection/' },
  { id: 'A11', title: '氣體百科瀏覽器', stars: 0, level: 2, moduleId: '2.2', moduleTitle: '製程氣體選用學', url: 'level/2/2-2-gas-selection/' },
  { id: 'A12', title: 'EEDF 曲線互動', stars: 0, level: 2, moduleId: '2.3', moduleTitle: '電漿化學基礎', url: 'level/2/2-3-plasma-chemistry/' },
  { id: 'A13', title: 'IEDF 雙峰模擬', stars: 1, level: 2, moduleId: '2.4', moduleTitle: '鞘層物理進階', url: 'level/2/2-4-sheath-physics/' },
  { id: 'A14', title: 'CCP vs ICP 耦合對比 + E/H 跳變', stars: 0, level: 2, moduleId: '2.5', moduleTitle: '電漿源與功率耦合', url: 'level/2/2-5-plasma-sources/' },
  { id: 'A15', title: '阻抗匹配互動(Smith 圖)', stars: 0, level: 2, moduleId: '2.5', moduleTitle: '電漿源與功率耦合', url: 'level/2/2-5-plasma-sources/' },
  { id: 'A16', title: '虛擬機台控制面板', stars: 2, level: 2, moduleId: '2.6', moduleTitle: '參數因果鏈', url: 'level/2/2-6-causal-chain/' },
  { id: 'A17', title: 'Coburn–Winters 實驗重現', stars: 0, level: 3, moduleId: '3.1', moduleTitle: '蝕刻機制', url: 'level/3/3-1-etch-mechanisms/' },
  { id: 'A18', title: '蝕刻輪廓模擬器', stars: 2, level: 3, moduleId: '3.1', moduleTitle: '蝕刻機制', url: 'level/3/3-1-etch-mechanisms/' },
  { id: 'A19', title: 'Bosch 製程循環動畫', stars: 0, level: 3, moduleId: '3.2', moduleTitle: '主要蝕刻應用', url: 'level/3/3-2-etch-applications/' },
  { id: 'A20', title: 'ARDE 深寬比效應動畫', stars: 0, level: 3, moduleId: '3.3', moduleTitle: '缺陷圖鑑', url: 'level/3/3-3-defect-atlas/' },
  { id: 'A21', title: '缺陷診斷器', stars: 1, level: 3, moduleId: '3.3', moduleTitle: '缺陷圖鑑', url: 'level/3/3-3-defect-atlas/' },
  { id: 'A22', title: 'PEALD 循環動畫與階梯覆蓋率', stars: 0, level: 3, moduleId: '3.4', moduleTitle: '電漿沉積', url: 'level/3/3-4-deposition/' },
  { id: 'A23', title: 'HDP vs PECVD 填溝對比', stars: 0, level: 3, moduleId: '3.4', moduleTitle: '電漿沉積', url: 'level/3/3-4-deposition/' },
  { id: 'A24', title: '磁控濺鍍 E×B 動畫', stars: 0, level: 3, moduleId: '3.5', moduleTitle: '濺鍍 PVD 與其他', url: 'level/3/3-5-pvd/' },
  { id: 'A25', title: '晶圓蝕刻率分佈熱圖', stars: 0, level: 3, moduleId: '3.6', moduleTitle: '均勻度與腔體工程', url: 'level/3/3-6-uniformity/' },
  { id: 'A26', title: 'Langmuir 探針 I-V 互動', stars: 1, level: 4, moduleId: '4.1', moduleTitle: '電漿診斷', url: 'level/4/4-1-diagnostics/' },
  { id: 'A27', title: 'OES 光譜互動', stars: 1, level: 4, moduleId: '4.1', moduleTitle: '電漿診斷', url: 'level/4/4-1-diagnostics/' },
  { id: 'A28', title: '終點訊號動畫(OES + 干涉)', stars: 0, level: 4, moduleId: '4.2', moduleTitle: '終點偵測與 APC', url: 'level/4/4-2-endpoint-apc/' },
  { id: 'A29', title: '天線效應充電動畫', stars: 0, level: 4, moduleId: '4.3', moduleTitle: '電漿誘發損傷', url: 'level/4/4-3-plasma-damage/' },
  { id: 'A30', title: 'ALE 循環動畫', stars: 1, level: 4, moduleId: '4.4', moduleTitle: '先進技術', url: 'level/4/4-4-advanced-tech/' },
  { id: 'A31', title: '脈衝電漿時序互動', stars: 0, level: 4, moduleId: '4.4', moduleTitle: '先進技術', url: 'level/4/4-4-advanced-tech/' },
  { id: 'A32', title: '0-D 全域模型計算器', stars: 0, level: 4, moduleId: '4.5', moduleTitle: '電漿模擬與資料', url: 'level/4/4-5-simulation/' },
  { id: 'A33', title: '封裝電漿處理計算器', stars: 0, level: 3, moduleId: '3.7', moduleTitle: '封裝電漿清潔與表面處理', url: 'level/3/3-7-package-clean/' }
  ];

  function byId(id) {
    for (var i = 0; i < LABS.length; i++) {
      if (LABS[i].id === id) return LABS[i];
    }
    return null;
  }

  function byLevel(no) {
    return LABS.filter(function (l) {
      return l.level === no;
    });
  }

  PA.labs = {
    all: LABS,
    byId: byId,
    byLevel: byLevel,
    count: LABS.length
  };
})((window.PA = window.PA || {}));
