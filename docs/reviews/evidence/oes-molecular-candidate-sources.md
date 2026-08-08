# OES 分子帶候選來源證據包

更新日期：2026-08-09

本文件只整理待審候選來源，不代表來源已核准。9 筆資料仍維持 `pending-source-review`，不得在沒有具名光譜審閱者、審閱時間與納入 Git 的證據紀錄時改成 `molecular-source-approved`。`relativeIntensity` 仍是教學權重，不是文獻或資料庫的相對強度。

## 候選來源與待決事項

| 現行 ID | 現行標記 | 候選文獻依據 | 審閱時必須處理 |
| --- | ---: | --- | --- |
| `co-483.5` | 483.5 nm | Smid 等人的 HMDSO/O2 電漿實驗列出 483.53 nm；Duncan 1927 實驗列出 4834.8 A | 確認 Angstrom system 的振轉指派與儀器解析度 |
| `co-519.0` | 519.0 nm | 同兩份來源分別列出 519.82 與 5197.6 A | 現行值是粗略標記；正式審閱應決定是否改為 519.8 nm |
| `cn-387.1` | 387.1 nm | CN violet system 的實驗與線表涵蓋 Delta-v=0 帶系 | 確認 387.1 nm 的振轉指派，不可只以附近 388.3 nm bandhead 代替 |
| `cn-388.3` | 388.3 nm | 雷射電漿實驗與 CN violet system 文獻支持 388.3 nm 附近 (0,0) bandhead | 確認製程電漿的重疊帶與背景扣除方式 |
| `c2-516.5` | 516.5 nm | C2 Swan system 電漿研究；鑽石 CVD OES 文獻列出 516.52 nm | 確認 (0,0) 指派及與 CO 519.8 nm 的光譜分離 |
| `n2-336.0` | 336.0 nm | Applied Optics 實驗列出 N2 SPS (0,0) 337.1 nm | 現行值偏離約 1.1 nm；正式審閱應決定 ID 與資料遷移方式 |
| `n2-357.0` | 357.0 nm | 同文獻列出 N2 SPS (0,1) 357.69 nm | 現行值是粗略標記；正式審閱應決定是否改為 357.7 nm |
| `oh-306.0` | 306.0 nm | OH A-X Fourier-transform 光譜與電漿實驗支持 306-310 nm 帶系 | 應視為帶系範圍而非獨立窄原子線 |
| `oh-309.0` | 309.0 nm | 電漿實驗使用 OH(A-X) 309.0 nm 訊號 | 確認 (0,0) bandhead、積分窗口與 H2O/濕氣判讀邊界 |

## 一手與權威來源

- CO：<https://physics.mff.cuni.cz/wds/proc/pdf05/WDS05_070_f2_Smid.pdf>
- CO：<https://adsabs.harvard.edu/pdf/1927ApJ....65..214D>
- CN：<https://doi.org/10.1021/acs.jpca.0c00361>
- CN：<https://doi.org/10.1016/0022-2852(74)90100-3>
- C2：<https://doi.org/10.1016/0022-4073(94)90036-1>
- C2：<https://www.osti.gov/servlets/purl/1335676>
- N2：<https://doi.org/10.1364/AO.22.003612>
- N2：<https://doi.org/10.1103/PhysRevA.53.2239>
- OH：<https://opg.optica.org/josab/abstract.cfm?uri=josab-11-1-3>
- OH：<https://pmc.ncbi.nlm.nih.gov/articles/PMC6053385/>

## 核准前檢查

1. 逐筆確認 species、電子態、振動帶與 air/vacuum wavelength 定義。
2. 記錄儀器解析度、積分窗口及會混疊的鄰近原子線或分子帶。
3. 修正近似波長時同步檢查資料 ID、OES 模型、測試與既有 localStorage 相容性。
4. 由具名光譜審閱者填入角色、RFC 3339 時間與 Git 追蹤的逐筆證據後，再變更核准狀態。
