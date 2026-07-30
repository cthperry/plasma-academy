import { defectById, defects } from "./defects.js";

export const diagnosticDefects = defects.filter((item) => item.id !== "first-wafer");

export const diagnosisOptions = {
  material: [
    ["unknown", "未確認"], ["silicon", "Si / SiO₂"], ["metal", "金屬"], ["resist", "光阻 / 有機層"]
  ],
  substrate: [["unknown", "未確認"], ["insulating", "絕緣下層"], ["conductive", "導電下層"]],
  location: [
    ["unknown", "未確認"], ["top", "開口 / 頂部"], ["middle", "側壁中段"], ["bottom", "溝底"],
    ["interface", "材料界面"], ["around", "圖形周圍"], ["full", "全深度 / 全片"]
  ],
  distribution: [
    ["unknown", "未確認"], ["uniform", "全片一致"], ["dense", "高密度區"], ["array-edge", "陣列邊緣"],
    ["first", "首片 / 隨片數"], ["random", "隨機分佈"]
  ],
  recipe: [["unknown", "未確認"], ["changed", "Recipe 有變動"], ["same", "Recipe 未變動"]]
};

const signals = {
  arde: { material: ["silicon"], location: ["bottom"], distribution: ["uniform"], recipe: ["changed", "same"] },
  "inverse-lag": { material: ["silicon"], location: ["bottom"], distribution: ["uniform"], recipe: ["changed"] },
  microloading: { location: ["bottom"], distribution: ["dense"], recipe: ["same"] },
  macroloading: { location: ["full"], distribution: ["uniform", "first"], recipe: ["same"] },
  undercut: { location: ["top"], distribution: ["uniform"], recipe: ["changed"] },
  bowing: { location: ["middle"], distribution: ["uniform"], recipe: ["changed"] },
  taper: { location: ["full"], distribution: ["uniform"], recipe: ["changed"] },
  notching: { substrate: ["insulating"], location: ["interface"], distribution: ["array-edge"], recipe: ["same"] },
  microtrench: { location: ["bottom"], distribution: ["uniform"], recipe: ["changed"] },
  footing: { substrate: ["insulating"], location: ["interface"], distribution: ["uniform"], recipe: ["changed"] },
  twisting: { substrate: ["insulating"], location: ["full"], distribution: ["random"], recipe: ["same"] },
  striation: { material: ["resist"], location: ["full"], distribution: ["uniform"], recipe: ["same"] },
  faceting: { material: ["resist"], location: ["top"], distribution: ["uniform"], recipe: ["changed"] },
  "mask-loss": { material: ["resist"], location: ["top"], distribution: ["uniform"], recipe: ["changed"] },
  "resist-wiggle": { material: ["resist"], location: ["top"], distribution: ["random"], recipe: ["same"] },
  "etch-stop": { location: ["bottom"], distribution: ["uniform"], recipe: ["changed"] },
  veil: { location: ["around"], distribution: ["uniform"], recipe: ["changed"] },
  corrosion: { material: ["metal"], location: ["full"], distribution: ["random", "uniform"], recipe: ["same"] }
};

export function rankDefectCauses(input = {}) {
  const selected = defectById(input.symptomId) ?? diagnosticDefects[0];
  const ranked = diagnosticDefects.map((defect) => {
    let score = defect.id === selected.id ? 60 : selected.related.includes(defect.id) ? 27 : defect.cat === selected.cat ? 12 : 4;
    const reasons = [defect.id === selected.id ? "症狀剖面直接符合" : selected.related.includes(defect.id) ? "外觀或機制與所選症狀相近" : "保留為低順位替代假設"];
    for (const key of ["material", "substrate", "location", "distribution", "recipe"]) {
      const value = input[key] ?? "unknown";
      if (value === "unknown") continue;
      if (signals[defect.id]?.[key]?.includes(value)) {
        score += 10;
        reasons.push(`${conditionLabel(key, value)}與此缺陷相符`);
      } else if (signals[defect.id]?.[key]?.length) {
        score -= 5;
      }
    }
    return { defect, score: Math.max(1, score), reasons };
  }).sort((a, b) => b.score - a.score || a.defect.id.localeCompare(b.defect.id));

  const total = ranked.slice(0, 5).reduce((sum, item) => sum + item.score, 0);
  return ranked.slice(0, 5).map((item) => ({
    ...item,
    confidence: Math.round(item.score / total * 100),
    methods: diagnosticMethods(item.defect),
    profilePresetId: item.defect.profilePresetId
  }));
}

export function diagnosticMethods(defect) {
  const related = defectById(defect.related[0]);
  return [
    defect.distinguish,
    related
      ? `做相同條件的截面或時間序列，並與「${related.zh}」比對位置：${related.symptom}`
      : "保留一片對照晶圓，只改一個旋鈕並比對缺陷特徵是否依預期方向改變。"
  ];
}

function conditionLabel(key, value) {
  return diagnosisOptions[key].find(([id]) => id === value)?.[1] ?? value;
}
