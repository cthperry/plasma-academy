# Firebase 與 Vercel 登入管理

Plasma Academy 採登入優先流程。使用者必須以 `@premtek.com.tw` 公司信箱登入，才會顯示課程介面與個人裝置進度；管理者可查看集中登入紀錄。

此登入首畫面是為了確保使用紀錄完整，不將已部署的靜態課程檔案視作保密內容。

## Firebase 專案

- 專案 ID：`plasma-academy-p0-ab013`
- Cloud Firestore 已在 `asia-east1`（台灣）建立 Standard 資料庫，並啟用刪除保護。
- Firestore 規則：所有瀏覽器直接讀寫一律拒絕；僅 Vercel API 的 Firebase Admin SDK 可讀寫。
- Authentication 使用 Firebase Custom Token；Email/Password 已關閉，避免密碼登入繞過一次性連結流程。
- Brevo 由 Vercel 後端寄送一次性登入連結。連結僅能使用一次、有效 15 分鐘，並以公司信箱與來源位址節流。

登入資料結構：

- `users/{uid}`：公司信箱、顯示名稱、首次登入、最近登入與登入次數。
- `loginEvents/{uid}_{authTime}`：每一個 Firebase 工作階段的登入時間。
- `adminEvents/*`：管理者讀取或匯出紀錄的時間與公司信箱。

## Firebase Console 設定

1. 在 Authentication 的 Settings 將 Vercel 正式網域與 Preview 網域加入 Authorized domains。
2. 將 `.env.example` 的 `NEXT_PUBLIC_FIREBASE_*` 值填入 Vercel 的 Production 與 Preview 環境變數。
3. 建立最小權限 Firebase service account JSON，完整 JSON 存入 Vercel 的 `FIREBASE_ADMIN_SERVICE_ACCOUNT` 私密環境變數。
4. 設定 `ADMIN_EMAIL` 為唯一可開啟 `/admin/` 的 `@premtek.com.tw` 公司信箱。
5. 設定私密環境變數 `BREVO_API_KEY`、`BREVO_SENDER_EMAIL` 與 `AUTH_MAGIC_LINK_URL`。最後一項固定為正式網站的 HTTPS 根網址。

## 部署順序

1. `firebase deploy --project plasma-academy-p0-ab013`
2. 在 Vercel 匯入 `cthperry/plasma-academy`，選擇本專案根目錄。
3. 設定上述 Vercel 環境變數並部署 Preview。
4. 使用 @premtek.com.tw 信箱寄送登入連結、開啟連結並完成登入，確認 `/api/auth/login-event` 建立資料。
5. 以 `ADMIN_EMAIL` 帳號開啟 `/admin/`，確認查詢與 CSV 匯出。
