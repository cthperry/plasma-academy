# L1 三道審閱

這個目錄保存 P1 發佈前的三道審閱證據。建立檔案不等於通過；只有具名責任者把 `status` 改為 `approved`，且填妥審閱者姓名、角色、40 字元 `reviewed_commit`、RFC 3339 `approved_at` 與至少一筆非空 `evidence`，才會被 `npm run audit:p1 -- --strict` 計為完成。

## 流程

1. 先執行 `npm run check` 與 `npm run verify:ui`，把要審閱的 Git commit 固定下來。
2. 技術審閱由具電漿背景的資深工程師或學界人士執行。
3. 教學審閱由 0–3 年資歷的目標讀者實際閱讀與操作。
4. 一致性審閱由撰稿統籌依 `09-content-style-guide.md` 核對術語、單位、格式與交叉引用。
5. 有修改要求時使用 `changes_requested` 並記錄 findings；修正後必須針對新 commit 重新簽核。

`npm run check:reviews` 只驗證封包結構，`npm run audit:p1 -- --strict` 才會把三份正式核准列為 P1 完成條件。
