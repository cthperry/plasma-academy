# Plasma Academy — 電漿製程工程師教育訓練網站

> 本目錄目前只包含**規劃文件**。網站程式碼尚未實作。

## 這是什麼

一套給**半導體/面板廠製程工程師**的電漿(Plasma)線上教育訓練網站的完整內容規劃。

從「電漿到底是什麼」開始,一路走到「原子層蝕刻與機台匹配」,分成四個階段、23 個模組、約 60 小時的課程。每個關鍵概念都搭配可調參數的互動動畫,讓工程師不是背公式,而是**看見參數怎麼影響電漿、電漿怎麼影響晶圓**。

## 為什麼要做

現場工程師學電漿時,通常只有兩種資料可選:

| 來源 | 問題 |
|---|---|
| 教科書(Lieberman、Chapman) | 數學份量重,離「我今天要調哪個旋鈕」很遠 |
| 機台廠商 training slides | 片段、綁定特定機台、缺乏物理脈絡 |
| 網路中文資料 | 零碎、錯誤率高、幾乎沒有互動教材 |

結果是很多工程師能背下 recipe,卻說不出「為什麼壓力調低 profile 會變直」。本網站要補的就是**中間那層因果鏈**。

## 目標讀者

**主要對象**:蝕刻 / 薄膜 / 擴散製程工程師,0~5 年年資。

**先備知識假設**:
- 大學普通物理(電磁學基礎、氣體動力論概念)
- 大學普通化學(鍵能、反應速率概念)
- **不假設**任何電漿物理、真空工程、電漿化學背景

**次要對象**:設備工程師、整合工程師、製程助理工程師、轉調至電漿製程的資深工程師。

## 四階段架構

| 階段 | 名稱 | 時數 | 模組數 | 核心問題 |
|---|---|---|---|---|
| **L1** | 初階:電漿是什麼 | 8 h | 6 | 電漿由什麼組成?為什麼會發光?為什麼離子會往下打? |
| **L2** | 中階:氣體、定律與電漿源 | 16 h | 6 | 為什麼這道製程選這支氣體?五個旋鈕各自在動什麼? |
| **L3** | 進階:製程應用與整合 | 20 h | 6 | 蝕刻/沉積怎麼做出來的?profile 歪掉是誰的錯? |
| **L4** | 專家:診斷、控制與前瞻 | 16 h | 6 | 怎麼看穿腔體裡發生什麼事?怎麼把機台調成一模一樣? |

完整課綱見 [`docs/00-curriculum-map.md`](docs/00-curriculum-map.md)。

## 規劃文件導覽

| 文件 | 你想知道什麼時看它 |
|---|---|
| [`docs/00-curriculum-map.md`](docs/00-curriculum-map.md) | 課程總地圖、模組依賴、能力矩陣 |
| [`docs/01-level1-foundation.md`](docs/01-level1-foundation.md) | L1 初階逐章大綱 |
| [`docs/02-level2-intermediate.md`](docs/02-level2-intermediate.md) | L2 中階逐章大綱(含氣體選用核心章) |
| [`docs/03-level3-advanced.md`](docs/03-level3-advanced.md) | L3 進階逐章大綱 |
| [`docs/04-level4-expert.md`](docs/04-level4-expert.md) | L4 專家逐章大綱 |
| [`docs/05-animation-spec.md`](docs/05-animation-spec.md) | 28 個互動元件的實作規格 |
| [`docs/06-site-architecture.md`](docs/06-site-architecture.md) | 網站資訊架構、頁面模板、進度追蹤 |
| [`docs/07-design-system.md`](docs/07-design-system.md) | 色彩 token、排版、公式呈現、深色模式 |
| [`docs/08-assessment.md`](docs/08-assessment.md) | 評量與認證設計、題庫規格 |
| [`docs/09-content-style-guide.md`](docs/09-content-style-guide.md) | 撰稿規範、術語處理、審閱流程 |
| [`docs/10-glossary.md`](docs/10-glossary.md) | 中英術語對照表 |
| [`docs/11-build-roadmap.md`](docs/11-build-roadmap.md) | 實作里程碑與工作分解 |

## 技術決策摘要

| 項目 | 決策 | 理由 |
|---|---|---|
| 前端框架 | **無框架,純靜態多頁 HTML** | 教材壽命長(5~10 年),框架會過時;工程師可離線帶進無網路的無塵室外辦公區 |
| 動畫 | **原生 Canvas 2D + SVG + CSS** | 零依賴、零 CDN、載入快;粒子模擬用 Canvas,曲線與結構圖用 SVG |
| 圖表庫 | **不使用**(D3/Plotly/Chart.js 皆不引入) | 本站曲線多為物理模型即時計算,自繪 SVG 反而更可控 |
| 數學公式 | **純 HTML + CSS**(不用 KaTeX/MathJax) | 避免 CDN 依賴與 FOUC;本站公式複雜度以 HTML 上下標即可涵蓋 |
| 內容儲存 | **JS 資料模組**(氣體庫/術語庫/題庫/缺陷庫) | 頁面由資料驅動,同一份氣體資料同時餵給百科、決策樹、章節內文 |
| 進度追蹤 | **localStorage,無後端無帳號** | 降低導入門檻;企業版可後續加掛 LMS 匯出 |
| 語言 | **繁體中文為主,英文術語並列** | 符合台灣廠內工程師閱讀與跨國溝通習慣 |

### 撰碼限制(即使獨立部署也遵守)

所有 JS/CSS 必須是**外部檔案**,不使用 inline `<script>` / `<style>` 區塊、不使用 `onclick=` 屬性、不使用 `eval`。這讓網站在嚴格 CSP 環境下也能直接部署。

## 與 RepairTracking V161 的關係

**完全獨立。** 本目錄不接入 V161 的 `core/router.js`、`build/bundle-manifest.js`、`features/`,也不修改 `V161_Desktop.html` / `V161_Mobile.html`。V161 的品質門(`tools/quality-gate.cjs`)不掃描本目錄,兩者互不影響。

之所以暫放於同一個 repo,純粹是版控便利;未來可原樣搬遷至獨立 repo,不需任何改動。

## 現況與下一步

- [x] 課綱規劃
- [x] 動畫規格
- [x] 資訊架構與設計系統
- [x] 評量設計
- [x] 術語表
- [ ] Phase 0:網站骨架
- [ ] Phase 1~4:內容與動畫實作(見 [`docs/11-build-roadmap.md`](docs/11-build-roadmap.md))
