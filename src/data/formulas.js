export const formulas = {
  debyeLength: {
    id: "debye-length",
    name: "Debye 長度",
    expression: "λ<sub>D</sub> = √(ε<sub>0</sub> k T<sub>e</sub> / n<sub>e</sub> e<sup>2</sup>)",
    summary: "密度越高，遮蔽距離越短；電子溫度越高，遮蔽距離越長。",
    symbols: [
      ["λD", "Debye 長度", "m"],
      ["Te", "電子溫度", "eV 或 K"],
      ["ne", "電子密度", "m^-3"],
      ["e", "基本電荷", "C"]
    ]
  }
};
