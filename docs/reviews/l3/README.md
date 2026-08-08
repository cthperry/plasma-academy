# L3 三道審閱

本目錄由三位具名責任者分別負責：技術審閱由蝕刻、沉積、PVD、均勻度、封裝與 PCB 製程專家執行，教學審閱由進階目標學員執行，一致性審閱由撰稿統籌執行。封包建立不代表核准。

審閱前執行 `npm run check` 與 `npm run verify:ui`，固定待審 `reviewed_commit`。審閱者逐項記錄 `findings`，並把附件放在 `docs/reviews/evidence/` 且納入 Git；只有 profile、defect、package、PCB 與 A17-A25/A33/A34 都完成責任範圍審閱後，才能把 `status` 改為 `approved`，並填妥姓名、角色、可追溯的 40 字元 `reviewed_commit`、有效 RFC 3339 `approved_at` 與證據檔路徑。
