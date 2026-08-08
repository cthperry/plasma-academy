# A18、A20、A23 空間模型 acceptance

更新日期：2026-08-09

這份紀錄定義 P3 三個高階教學模型可由 repo 自動驗證的契約。通過代表空間資料結構、守恆式計帳與預期趨勢一致，不代表模型已經用設備或晶圓資料完成絕對值校正。

## A18 側壁通量與二維輪廓

- 契約：`wall-flux-2d-v1`，至少 24 個深度 bin，左右壁分開保存 direct、reflected 與 total flux。
- 幾何：輪廓邊界由頂部連續到孔底，點數與深度 bin 一致。
- 趨勢：bowing 預設的中段反射通量必須高於頂部；反射係數為零時 reflected flux 必須全為零。
- 邊界：這是簡化的角度與反射傳輸，不含完整 sheath、charging、材料特定 yield 或動態網格。

## A20 空間聚合物平衡與反向 ARDE

- 契約：`polymer-balance-2d-v1`，每個溝槽至少 24 個深度 bin。
- 計帳：左右壁各自保存沉積、離子清除、balance 與 coverage；孔底另有獨立 balance 與 coverage。
- 趨勢：coverage 必須保持 0 到 1；反向 ARDE 條件下寬溝孔底聚合物覆蓋高於窄溝，並產生負 lag。
- 邊界：未解析完整表面反應網路、副產物熱脫附、充電電場與 feature-to-feature 耦合。

## A23 角度分布與 ballistic LOS

- 契約：`ballistic-los-2d-v1`，至少 41 條確定性射線；每條射線只能落在孔底、左壁或右壁。
- 趨勢：AR 增加時孔底到達比例下降、側壁捕獲比例上升；AR 4、D/S 5 位於教學窗口，AR 8 必須形成 void。
- 輸出：至少 24 個深度點的 HDP profile，並保存 bottom arrival 與 sidewall capture fraction。
- 邊界：射線是二維視線近似，不含氣相碰撞、再發射角分布、黏著係數材料依賴與三維 overhang。

## 自動化證據

- `npm run check:profiles`：A18 單元與空間契約。
- `npm run check:arde`：A20 聚合物計帳與趨勢。
- `npm run check:deposition`：A23 LOS、D/S 與 void 趨勢。
- `npm run check:spatial-acceptance`：A18、A20、A23 各 5 項高階 acceptance。

若上述任何檢查失敗，`npm run audit:roadmap -- --strict` 會重新把對應模型列為 blocker。外部技術、教學與一致性審閱仍是獨立 gate。
