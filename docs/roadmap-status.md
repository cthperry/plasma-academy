# Plasma Academy roadmap 實作狀態

更新日期：2026-08-09

本文件是此 workspace 的 roadmap 實作狀態唯一入口。它區分可由 repo 自動化證明的交付，以及仍需具名人員或廠區完成的外部核准。`pending` 不等於通過。

## 基線與範圍

- 上游基線：`79928bc72175bd20a5cdd586f3911406ddfd16c7`，commit date `2026-08-06T12:41:28Z`。
- 本地 Task 13 起點：`e55b96dc81956d4d548eb6418af1375a4b464c5d`。
- 一般自動化：`npm run check`。這個命令驗 repo 交付，不會因人工、廠區或外部來源仍 pending 而假失敗。
- 狀態稽核：`npm run audit:roadmap`。它完整執行 P1-P4 並揭露各層 `3/3`，pending 外部核准不改成完成。
- 完成稽核：`npm run audit:roadmap -- --strict`。任何人工、廠區、來源或列明的模型 acceptance 未完成時必須 nonzero。
- 發布驗證：`npm run verify:release`，依序包含完整自動化與 `verify:ui`；UI 不是未記錄的手動加項。外部完成度仍以獨立的 `npm run audit:roadmap -- --strict` 判定，不阻止已清楚揭露 pending 邊界的增量版本部署。

## Repo 交付證據

| 階段 | 已實作的 repo 交付 | 本地命令證據 |
| --- | --- | --- |
| P0 | 42 頁無 inline executable code，且以結構解析驗證 CSP/referrer meta 的數量、內容與順序；Sites Worker 對 redirect 與 404 加完整 security headers；asset pass-through、自訂 404 status/body、registry 衍生 sitemap/robots、homepage dependency graph gzip 預算、DCL 與 reduced-motion browser gate | `npm run build`；`npm run check:sites`；`npm run check:size` 為 17 項、raw 118.4 KB、gzip 34.3 KB；最終 `npm run verify:release` 通過，Task 13 DCL 中位數為 1440px 49.4 ms、375px 34.1 ms，A01/A04 reduced-motion 通過 |
| P1 | 6 章、35 self-check、55 題、35 SVG 與初階互動/測驗交付 | `npm run audit:p1` 的 repo metrics 與 Perry 使用者直接內容審閱 3/3 達標 |
| P2 | 6 章、32 氣體、A08-A16、80 題、40 SVG；32 份公開供應商 SDS 證據 | `npm run audit:p2` 與 `npm run check:data`；供應商文件 32/32，廠區核准另列 0/32 |
| P3 | 8 章、A17-A25/A33/A34、19 缺陷、116 題、49 SVG、PCB 模型與章節；A18/A20/A23 空間模型 acceptance | `npm run audit:p3`；`npm run check:pcb`；`npm run check:spatial-acceptance`；`npm run check:l3-exam`；Perry 使用者直接內容審閱 3/3 |
| P4 | 6 章、A26-A32、85 題、22 線 OES、18 公式、252 術語、5 量產案例與測驗路由 | `npm run audit:p4`、`npm run check:l4-diagnostics`、`npm run check:l4-control-damage`、`npm run check:l4-advanced`、`npm run check:l4-production` |

`npm run check:reviews` 會驗證 L1-L4 每層恰有 technical、teaching、consistency 三份 JSON、層級專屬 criteria、責任流程 README 與 evidence 欄位；隔離無效 fixture 會刻意移除 L2 gas/SDS 準則並證明 validator 可攔截。現有核准由 Git 內對話證據、具名審閱者、可追溯 commit 與核准時間共同驗證。

## 人工審閱

| 層級 | technical | teaching | consistency | 合計 |
| --- | --- | --- | --- | ---: |
| L1 | approved，Perry | approved，Perry | approved，Perry | 3/3 |
| L2 | approved，Perry | approved，Perry | approved，Perry | 3/3 |
| L3 | approved，Perry | approved，Perry | approved，Perry | 3/3 |
| L4 | approved，Perry | approved，Perry | approved，Perry | 3/3 |

Perry 於 `2026-08-09T15:24:18+08:00` 直接核准 L1-L4 課程內容，審閱版本為 `32a36ff59a9b8359bbd6307b4880d06bff31c55d`，證據位於 `docs/reviews/evidence/2026-08-09-perry-course-content-approval.md`。只有責任審閱者填妥姓名、角色、`reviewed_commit`、`approved_at` 並提供 criteria evidence 後，`approved` 才計入完成。廠區 SDS 核准同樣必須填妥具名審閱者、角色、廠區、核准日期與證據清單；只改狀態字串不會被計入。

## SDS 與 OES 外部邊界

- SDS 公開供應商文件：32/32 已核對。這是 supplier-document review，不是廠區核准。
- 廠區 EH&S SDS 核准：0/32；32/32 仍為 `localApprovalStatus: pending`。必須依實際供應濃度、在地法規版本、供氣系統、材料相容、abatement 與廠區程序核准。
- OES 原子線：13/13 已保存逐線 NIST 證據。
- OES 分子帶：0/9 完成外部來源審閱；`co-483.5`、`co-519.0`、`cn-387.1`、`cn-388.3`、`c2-516.5`、`n2-336.0`、`n2-357.0`、`oh-306.0`、`oh-309.0` 仍為 `pending-source-review`。9/9 已各整理至少兩筆候選來源與近似波長差異，詳見 `docs/reviews/evidence/oes-molecular-candidate-sources.md`；候選來源不是核准。`relativeIntensity` 只代表教學權重。
- 交接表：32 筆廠區 SDS 與 9 筆分子 OES 的待填欄位、現有文件與證據檔命名規則見 `docs/reviews/external-approval-handoff.md`。此表不是核准證據。

## 模型 acceptance

repo regression gate 與空間 acceptance 均已建立：`npm run check:profiles` 44/44、`npm run check:arde` 20/20、`npm run check:deposition` 20/20，`npm run check:spatial-acceptance` 為 A18 5/5、A20 5/5、A23 5/5。

- A18：`wall-flux-2d-v1` 保存 32 個深度 bin、左右側壁 direct/reflected/total flux 與連續輪廓邊界。
- A20：`polymer-balance-2d-v1` 保存左右側壁及孔底的沉積、離子清除、balance 與 coverage，反向 ARDE 由孔底鈍化差異驅動。
- A23：`ballistic-los-2d-v1` 以 61 條確定性射線保存孔底到達、側壁捕獲與 32-bin HDP profile；AR>6 的結果由傳輸計算決定。

完整 acceptance、假設與限制記錄於 `docs/model-acceptance.md`。這些結果證明教學模型的空間契約與預期趨勢，不代表設備或產品絕對值已校正；L3 課程內容審閱已完成，但廠區與設備等外部核准仍為獨立 gate。

## Production Sites 狀態

- 專案：`.openai/hosting.json` 的 `project_id` 為 `appgprj_6a69443bcaf08191b2d5014509f64348`。
- 正式 URL：`https://plasma-academy-p0.pperry.chatgpt.site`。
- 2026-08-09 runtime 驗證版本：Sites version 38，來源 commit `32a36ff59a9b8359bbd6307b4880d06bff31c55d`，deployment `appgdep_6a77a791e22c8191907aed9166956145` 已成功；正式首頁已以快取略過參數驗證新版學習儀表板、A18 靜態資產與無主控台錯誤。
- Production HTTP 已驗證首頁、3.7 封裝清潔、3.8 PCB、4.1 診斷、L3 測驗、進度、sitemap、robots、CSS/JS/SVG、`data/evidence.js` 與自訂 404；正常頁含 CSP/referrer meta，404 另有完整 CSP、nosniff、no-referrer 與 Permissions-Policy response headers。
- Production Browser 已驗證首頁、A33、A34、A27、L3 40 題／70 分鐘、26 章進度／完訓、無水平溢位與無 console error；封裝清潔頁的實際畫面亦已人工檢視。
- Sites 目前不解析封裝內 `_headers`，且正常靜態 HTML 會在 Worker 前直接回應，因此正常 200 HTML 無法由此零框架輸出加入 response security headers。本站以 head-first CSP/referrer meta 作瀏覽器端保護；`frame-ancestors`、`nosniff` 與 Permissions-Policy 只在 Worker 產生的 404 回應完整提供。這是已驗證的 hosting 限制，不宣稱等同完整 response-header 防護。

## Strict 結論

目前 `npm run audit:roadmap -- --strict` 預期 nonzero，共 2 個明確 blocker：1 組 32 筆廠區 EH&S SDS 核准，以及 1 組 9 筆 OES 分子帶來源審閱。L1-L4 共 12 份課程內容審閱與 A18/A20/A23 高階 acceptance 已通過。這個失敗是誠實的 roadmap completion 狀態，不是一般 repo 自動化失敗。
