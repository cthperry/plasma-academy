# Plasma Academy roadmap 實作狀態

更新日期：2026-08-08

本文件是此 workspace 的 roadmap 實作狀態唯一入口。它區分可由 repo 自動化證明的交付、仍需具名人員或廠區完成的外部核准，以及尚未建立高階 acceptance 的教學模型。`pending` 不等於通過。

## 基線與範圍

- 上游基線：`79928bc72175bd20a5cdd586f3911406ddfd16c7`，commit date `2026-08-06T12:41:28Z`。
- 本地 Task 13 起點：`e55b96dc81956d4d548eb6418af1375a4b464c5d`。
- 一般自動化：`npm run check`。這個命令驗 repo 交付，不會因人工、廠區或外部來源仍 pending 而假失敗。
- 狀態稽核：`npm run audit:roadmap`。它完整執行 P1-P4 並揭露各層 `0/3`，pending 外部核准不改成完成。
- 完成稽核：`npm run audit:roadmap -- --strict`。任何人工、廠區、來源或列明的模型 acceptance 未完成時必須 nonzero。
- 發布驗證：`npm run verify:release`，依序包含完整自動化與 `verify:ui`；UI 不是未記錄的手動加項。外部完成度仍以獨立的 `npm run audit:roadmap -- --strict` 判定，不阻止已清楚揭露 pending 邊界的增量版本部署。

## Repo 交付證據

| 階段 | 已實作的 repo 交付 | 本地命令證據 |
| --- | --- | --- |
| P0 | 無 inline executable code；Sites Worker HTML-only CSP/security headers；slash redirect、asset pass-through、自訂 404 status/body；registry 衍生 404/sitemap/robots；homepage dependency graph gzip 預算；DCL 與 reduced-motion browser gate | `npm run build`；`npm run check:sites`；`npm run check:size` 為 17 項、raw 118.4 KB、gzip 34.3 KB；完整 `npm run verify:ui` 中 Task 13 的 DCL 中位數為 1440px 59.0 ms、375px 74.8 ms，A01/A04 reduced-motion 通過 |
| P1 | 6 章、35 self-check、55 題、35 SVG 與初階互動/測驗交付 | `npm run audit:p1` 的 repo metrics 達標；三道審閱另列 pending |
| P2 | 6 章、32 氣體、A08-A16、80 題、40 SVG；32 份公開供應商 SDS 證據 | `npm run audit:p2` 與 `npm run check:data`；供應商文件 32/32，廠區核准另列 0/32 |
| P3 | 8 章、A17-A25/A33/A34、19 缺陷、116 題、49 SVG、PCB 模型與章節 | `npm run audit:p3`；`npm run check:pcb`；`npm run check:l3-exam`；三道審閱與高階模型 acceptance 另列 pending |
| P4 | 6 章、A26-A32、85 題、22 線 OES、18 公式、252 術語、5 量產案例與測驗路由 | `npm run audit:p4`、`npm run check:l4-diagnostics`、`npm run check:l4-control-damage`、`npm run check:l4-advanced`、`npm run check:l4-production` |

`npm run check:reviews` 會驗證 L1-L4 每層恰有 technical、teaching、consistency 三份 JSON、層級專屬 criteria、責任流程 README 與 evidence 欄位；隔離無效 fixture 會刻意移除 L2 gas/SDS 準則並證明 validator 可攔截。這只證明封包結構，不是人工核准。

## 人工審閱

| 層級 | technical | teaching | consistency | 合計 |
| --- | --- | --- | --- | ---: |
| L1 | pending，未具名 | pending，未具名 | pending，未具名 | 0/3 |
| L2 | pending，未具名 | pending，未具名 | pending，未具名 | 0/3 |
| L3 | pending，未具名 | pending，未具名 | pending，未具名 | 0/3 |
| L4 | pending，未具名 | pending，未具名 | pending，未具名 | 0/3 |

只有責任審閱者填妥姓名、角色、`reviewed_commit`、`approved_at` 並提供 criteria evidence 後，`approved` 才計入完成。現在沒有任何核准可宣稱。廠區 SDS 核准同樣必須填妥具名審閱者、角色、廠區、核准日期與證據清單；只改狀態字串不會被計入。

## SDS 與 OES 外部邊界

- SDS 公開供應商文件：32/32 已核對。這是 supplier-document review，不是廠區核准。
- 廠區 EH&S SDS 核准：0/32；32/32 仍為 `localApprovalStatus: pending`。必須依實際供應濃度、在地法規版本、供氣系統、材料相容、abatement 與廠區程序核准。
- OES 原子線：13/13 已保存逐線 NIST 證據。
- OES 分子帶：0/9 完成外部來源審閱；`co-483.5`、`co-519.0`、`cn-387.1`、`cn-388.3`、`c2-516.5`、`n2-336.0`、`n2-357.0`、`oh-306.0`、`oh-309.0` 仍為 `pending-source-review`。`relativeIntensity` 只代表教學權重。

## 模型 acceptance

目前 repo regression gate 為綠：`npm run check:profiles` 37/37、`npm run check:arde` 15/15、`npm run check:deposition` 14/14。這些證明現有簡化模型契約沒有漂移，不足以宣稱上游要求的高階物理 acceptance 已完成：

- A18：尚未建立 `wallFlux`／二維輪廓空間解析 acceptance。
- A20：尚未建立反向 ARDE 的高階空間解析 acceptance。
- A23：尚未建立 AR>6 HDP 填溝的高階空間解析 acceptance。

因此 strict audit 會把 A18/A20/A23 分別列為 blocker，不能由既有單元回歸測試推定完成。

## Production Sites 狀態

- 專案：`.openai/hosting.json` 的 `project_id` 為 `appgprj_6a69443bcaf08191b2d5014509f64348`。
- 正式 URL：`https://plasma-academy-p0.pperry.chatgpt.site`。
- 最後有 repo 報告證據的正式版本：Sites version 31，來源 commit `395b4a3`；Task 10 報告記錄該版本的 HTTP 與 Playwright 驗證通過。
- Task 11、Task 12 與 Task 13 的本地提交晚於 version 31，Task 13 不執行部署。因此不能把目前 workspace 說成已在正式 URL 上線；version 31 之後的實際 save/deploy/provenance 與 live headers/browser 狀態必須由後續 release task 重新驗證並回寫本節。

## Strict 結論

目前 `npm run audit:roadmap -- --strict` 預期 nonzero：12 份具名人工審閱、32 筆廠區 EH&S SDS 核准、9 筆 OES 分子帶來源審閱，以及 A18/A20/A23 高階 acceptance 均未完成。這個失敗是誠實的 roadmap completion 狀態，不是一般 repo 自動化失敗。
