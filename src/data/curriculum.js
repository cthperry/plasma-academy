export const curriculum = {
  levels: [
    {
      id: 1,
      name: "初階",
      title: "L1 初階 · 電漿是什麼",
      hours: 8,
      progress: 0,
      summary: "建立電漿、碰撞、點火、鞘層與製程地圖的共同語言。",
      labs: ["A01", "A02", "A03", "A04", "A05", "A06", "A07"],
      modules: [
        { id: "1.1", title: "物質第四態", hours: 1.0, labs: ["A01"], prerequisites: "", href: "/level/1/1-1-fourth-state/", description: "從現場看到的輝光開始，建立弱游離與熱非平衡的直覺。" },
        { id: "1.2", title: "電漿基本參數", hours: 1.5, labs: ["A02"], prerequisites: "1.1", href: "/level/1/", description: "電子密度、電子溫度與 Debye 遮蔽。" },
        { id: "1.3", title: "碰撞與平均自由徑", hours: 1.5, labs: ["A03"], prerequisites: "1.2", href: "/level/1/", description: "把壓力和方向性連起來。" },
        { id: "1.4", title: "輝光放電與點火", hours: 1.5, labs: ["A04", "A05"], prerequisites: "1.3", href: "/level/1/", description: "Townsend 雪崩與 Paschen 曲線。" },
        { id: "1.5", title: "鞘層入門", hours: 1.5, labs: ["A06"], prerequisites: "1.2, 1.4", href: "/level/1/", description: "理解離子為什麼垂直轟擊晶圓。" },
        { id: "1.6", title: "製程電漿地圖", hours: 1.0, labs: ["A07"], prerequisites: "1.5", href: "/level/1/", description: "把自己的 recipe 放到壓力與密度座標上。" }
      ]
    },
    {
      id: 2,
      name: "中階",
      title: "L2 中階 · 氣體、定律與電漿源",
      hours: 16,
      progress: 0,
      summary: "建立氣體選用、電漿化學、鞘層進階與機台控制的因果鏈。",
      labs: ["A08", "A09", "A10", "A11", "A12", "A13", "A14", "A15", "A16"],
      modules: [
        { id: "2.1", title: "氣體動力學與真空", hours: 2, labs: ["A08"], prerequisites: "1.3", href: "/level/1/", description: "壓力、流量、滯留時間與真空量測。" },
        { id: "2.2", title: "製程氣體選用學", hours: 4, labs: ["A09", "A10", "A11"], prerequisites: "1.6, 2.1", href: "/level/1/", description: "F/C 比、選擇比、鈍化與安全。" },
        { id: "2.3", title: "電漿化學基礎", hours: 2.5, labs: ["A12"], prerequisites: "1.3, 2.2", href: "/level/1/", description: "EEDF 和反應速率係數。" },
        { id: "2.4", title: "鞘層物理進階", hours: 2.5, labs: ["A13"], prerequisites: "1.5, 2.3", href: "/level/1/", description: "IEDF、RF 鞘層與碰撞尾巴。" },
        { id: "2.5", title: "電漿源與功率耦合", hours: 3, labs: ["A14", "A15"], prerequisites: "2.4", href: "/level/1/", description: "CCP、ICP、匹配與模式跳變。" },
        { id: "2.6", title: "參數因果鏈", hours: 2, labs: ["A16"], prerequisites: "2.1-2.5", href: "/level/1/", description: "整合機台旋鈕到晶圓結果。" }
      ]
    },
    {
      id: 3,
      name: "進階",
      title: "L3 進階 · 製程應用與整合",
      hours: 20,
      progress: 0,
      summary: "把蝕刻、沉積、缺陷與均勻度轉成可診斷的工程工具。",
      labs: ["A17", "A18", "A19", "A20", "A21", "A22", "A23", "A24", "A25"],
      modules: []
    },
    {
      id: 4,
      name: "專家",
      title: "L4 專家 · 診斷、控制與前瞻",
      hours: 16,
      progress: 0,
      summary: "進入診斷、終點偵測、PID、ALE、脈衝與量產控制。",
      labs: ["A26", "A27", "A28", "A29", "A30", "A31", "A32"],
      modules: []
    }
  ]
};

export const rolePaths = [
  { id: "etch", name: "蝕刻工程師", duration: "建議 6 週", path: "1.1-1.6 → 2.2 → 2.4 → 2.6 → 3.1-3.3 → 4.2" },
  { id: "thinfilm", name: "薄膜工程師", duration: "建議 5 週", path: "1.1-1.6 → 2.1 → 2.3 → 2.5 → 3.4 → 3.5 → 3.6" },
  { id: "equipment", name: "設備工程師", duration: "建議 4 週", path: "1.1-1.5 → 2.1 → 2.5 → 3.6 → 4.1 → 4.6" }
];
