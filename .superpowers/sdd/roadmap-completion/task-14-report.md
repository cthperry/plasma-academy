# Task 14 實作與發布報告

## 結論

- P0-P4 repo 交付、完整 UI 與 production 發布驗證已完成；封裝清潔 3.7、A33、PCB 3.8、A34 與其測驗／進度整合均在正式站可用。
- runtime 驗證版本為 Sites version 35，來源 commit `820f00db56323469a960722fa8344f9dd9d38b68`，正式 URL 為 `https://plasma-academy-p0.pperry.chatgpt.site`。
- overall roadmap 不標示完成：strict audit 仍依設計以 17 個外部 blocker 回傳 exit 1。

## 本地驗證

- `npm run verify:release`：exit 0，207.7 秒；包含完整 `npm run check` 與七組 `verify:ui`。
- 建置：26 章、A01-A34、42 份 HTML、L1 35 張／L2 40 張／L3 49 張 SVG 全部產生。
- 內容：3.7 封裝清潔工程手冊 8 單元；A33 model 34/34；A34 PCB model 28/28。
- 題庫：L3 116/116，正式抽題 40 題、70 分鐘；L4 85/85，抽題 30 題。
- 首載：17 項，raw 118.4 KB、gzip 34.3 KB，低於 120 KB gate。
- contrast、a11y、links、sitemap/robots、Worker、資料、內容、審閱封包與所有模型檢查均通過。
- Task 13 DCL：1440px 中位數 49.4 ms；375px 中位數 34.1 ms；A01/A04 reduced-motion 期間 RAF 不增加且內容完整。
- UI：A33、A34、A26-A32、L3/L4 測驗、進度／證書、桌機 1440px 與手機 375px 全部通過，無水平溢位。

## 安全與發布修正

- A27 曾因 `spectra.js` 的 `evidence.js` 建置 dependency 未複製而在瀏覽器 404；已由 `a80ccf9` 修正，並由建置後 dependency contract 保護。
- 完整 UI verifier 在失敗時可能留下 browser；`c146125` 以 `try/finally` 覆蓋全部操作與斷言，完整 UI 與 PID 檢查通過。
- Production 證明 Sites 正常靜態 HTML 會在 Worker 前回應，且不解析 archive 中 `_headers`。嘗試以 `__pages` 強制 Worker 的方案又因既有靜態路徑在部署間保留而不可接受，已完整回復。
- 最終 42 頁在 `<head>` 的第一個 script／stylesheet／preload 前加入 CSP 與 no-referrer meta。`parse5` gate 要求兩者各恰一個、內容完全一致且順序正確；comment-only、晚置、重複 meta mutation 均會失敗。
- Worker 仍對 canonical 308 與自訂 404 生效；404 response 具有 CSP、`nosniff`、`no-referrer` 與 Permissions-Policy。正常 200 HTML 的 response headers 受 Sites 平台限制，不能宣稱完整 header 防護。

## Sites provenance

- project：`appgprj_6a69443bcaf08191b2d5014509f64348`。
- runtime source：`820f00db56323469a960722fa8344f9dd9d38b68`。
- version 35：`appgprj_6a69443bcaf08191b2d5014509f64348~appgver_ed11f8a341dc81919bb0a35c42b1cd85`。
- deployment：`appgdep_6a771fdb933c8191b1cd0296ad6ff525`，status `succeeded`，2026-08-08。
- archive：289 files，Sites content hash `sha256:dc325e5d512be6baa2d6e40ddca80ecdccd97e98663538d402da9b4108c9c71d`。
- 本報告與最終 review 會由下一個 documentation-bearing Sites version 發布；其精確 source SHA 與 Sites IDs 以該版本 metadata 與 Task 14 最終回覆為準，避免在 Git 內容中建立不可能的自我 SHA 引用。

## Production HTTP 證據

- 200：`/`、`/level/3/3-7-packaging-cleaning/`、`/level/3/3-8-pcb-desmear/`、`/level/4/4-1-diagnostics/`、`/level/3/exam/`、`/progress/`。
- 200：`/sitemap.xml`、`/robots.txt`、`/assets/css/base.css`、`/assets/js/app.js`、`/assets/svg/l3/l3-01.svg`、`/data/evidence.js`。
- 404：隨機不存在尾斜線路由回傳自訂「找不到頁面」內容與完整 Worker security headers。
- 正常 HTML 都含 CSP/referrer meta；獨立 CSS/JS/SVG/data 資產沒有錯誤套用 HTML CSP response header。

## Production Browser 證據

- 1280px 首頁：標題與主體正確、CSP meta 存在、無水平溢位。
- 3.7：H1 正確、A33 有 7 個輸出、SVG 2 條 path、8 份工程手冊、無水平溢位。
- 3.8：H1 正確、A34 Canvas 寬 742、6 個輸出、無水平溢位。
- 4.1：Br II、`pending-source-review`、教學權重揭露存在，A27 Canvas 已繪製，證明 `evidence.js` dependency 可載入。
- L3 exam：頁面顯示 40 題與 70 分鐘；progress 顯示 26 章與完訓，匯出與匯入控制存在。
- Browser console logs 為空；封裝清潔 production screenshot 已人工檢視，三欄章節版面、導覽與內容沒有重疊。

## Review

- 人工／OES／SDS evidence gate、A27 dependency、UI cleanup 均經獨立 reviewer APPROVED。
- 最終 CSP meta review 第一輪提出 1 個 Important：字串比對可能接受 comment-only 或晚置 meta。`c7b84c8` 已改用 parser 與 mutation fixtures；最終收斂結論記錄於 `task-14-review.md`。

## Strict blockers

- L1-L4 technical、teaching、consistency：12 份具名人工核准 pending。
- 廠區 EH&S SDS：0/32，32 筆 pending。
- OES 分子帶來源：0/9 pending。
- A18 wallFlux／二維輪廓、A20 反向 ARDE、A23 AR>6 HDP 填溝高階 acceptance 尚未建立。

`npm run audit:roadmap -- --strict` 因上述 17 項 blocker 預期 exit 1。repo 與 production release 已完成，不代表外部核准或完整 roadmap completion 已完成。
