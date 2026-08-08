# Task 11 Report: SDS 與原子 OES 證據缺口閉合

## 範圍

依據唯一精確規格 [task-11-brief.md](task-11-brief.md)，完成公開供應商 SDS 證據與 13 條原子 OES 譜線的逐線 NIST 資料，並維持 plant approval 與分子帶來源審查的未完成界線。

## 變更檔案

- `src/data/sds-evidence.js`：保留既有 27 份 Airgas 文件身分資料，加入 c4f6、c5f8、teos、wf6、so2 的指定供應商與網址；32 筆全為 `supplier-reviewed`，全數 `localApprovalStatus: "pending"`。
- `src/data/spectra.js`：保留全部 22 個穩定 line ID，將 13 條原子線改為指定精確波長、逐線 NIST Handbook URL、`official-database-line-record`、`nist-line-verified` 與 `spectrumStage`；Br 兩線標為 Br II。
- `src/content/chapter-4-1.mjs`、`src/assets/js/labs/a27-oes.js`、`scripts/build.mjs`：教材、A27 來源狀態及 4.1 建置揭露同步為原子線逐線 NIST 核實、分子帶仍待來源審閱、`relativeIntensity` 仍只是教學權重。
- `scripts/check-data.mjs`、`scripts/check-diagnostics-model.mjs`、`scripts/check-level4-diagnostics.mjs`：加入 32/32、0/32、五份指定 SDS、13 條精確波長、NIST URL、spectrum stage、Br II 與新狀態的斷言。
- `scripts/audit-p2.mjs`、`scripts/audit-p4.mjs`、`scripts/verify-ui.mjs`：P2 以供應商文件核對量計數並顯示 0/32 plant approval 未完成；P4 報告 13/13 原子線與 9/9 分子帶狀態；UI 契約採用 32 筆供應商審閱與新原子線文案。

## 來源決策

- SDS 的五筆新增供應商、URL、文件 ID、修訂日與版本完全採用 Task 11 brief 指定值。每筆註記明示公開供應商文件不取代廠區核准的供應濃度、在地版本、供氣系統、abatement 與 EH&S 程序；修訂日早於 2024 的文件再要求確認供應商是否有新版。
- 原子 OES 資料完全採用 brief 指定的 NIST Handbook 元素強線頁面與波長。`species: "Br"` 保留給 OES model abundance lookup，但 `spectrumStage: "II"` 與教材顯示均明示 Br II atomic emission。
- 九條分子帶維持 `pedagogical-molecular-band` 與 `pending-source-review`；所有 `relativeIntensity` 維持 `pedagogical-weight`，不宣稱來自 NIST。

## 驗證

下列命令於實作提交前完整執行，皆以 exit code 0 完成：

```powershell
npm run build
npm run check:data
npm run check:diagnostics
npm run check:l4-diagnostics
npm run audit:p2
npm run audit:p4 -- --strict
```

結果：

- `build` 成功。
- `check:data` 成功。
- `check:diagnostics` 成功，60/60。
- `check:l4-diagnostics` 成功。
- `audit:p2` 證明供應商公開文件 32/32、廠區核准 0/32（pending 32/32，未視為完成）。它另報既有 `completedReviews` 0/3，非 Task 11 變更造成。
- `audit:p4 -- --strict` 成功，原子線逐線 NIST 核實 13/13、分子帶待來源審閱 9/9。
- `git diff --check` 成功。

另曾啟動本機 `http://localhost:4173` 執行 `npm run verify:ui`。第一次發現並修正舊的 27 筆供應商審閱 UI 斷言；修正後重跑遭使用者中斷，沒有最終完整 UI 契約成功證據。

## Commit

實作提交：`16a2002473a4fb705c15e24baaa2a5b51ff70292` (`Complete Task 11 SDS and OES evidence`)。

## 自我審查

- 只暫存並提交 Task 11 的資料、教材、建置揭露與對應品質檢查；未追蹤的 `src/assets/svg/l3/` 未修改、未暫存。
- 13 條原子線均具 `spectrumStage`；Br 兩條同時符合模型 key 相容性與 Br II 顯示/教材要求。
- SDS 供應商審閱與廠區批准刻意分離，沒有將公開文件視為 plant approval。
- 舊 `pending-line-review` 斷言已移除並替換為可驗證的 `nist-line-verified` 契約。

## Concerns

- 完整 `npm run verify:ui` 的修正後重跑被中斷；核心建置、資料、診斷與 P2/P4 稽核已通過，但端對端 UI 契約未取得最終成功結果。
- P2 仍有既有 `completedReviews` 0/3 的量化缺口；此項與 Task 11 的 SDS 32/32 和 plant approval 0/32 狀態分離，未在本任務範圍內變更。
- 32 筆 `localApprovalStatus` 都是 `pending`；公開 SDS 證據不可替代現場濃度、配送系統、abatement 與 EH&S 核准。
