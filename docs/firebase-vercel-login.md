# Firebase 與 Vercel 登入管理

Plasma Academy 保持公開閱讀。只有 @premtek.com.tw 公司信箱可登入、保存個人裝置進度，並由管理者查看集中登入紀錄。

## Firebase 專案

- 專案 ID：`plasma-academy-p0-ab013`
- Cloud Firestore 已在 `asia-east1`（台灣）建立 Standard 資料庫，並啟用刪除保護。
- Firestore 規則：所有瀏覽器直接讀寫一律拒絕；僅 Vercel API 的 Firebase Admin SDK 可讀寫。
- Authentication 已啟用 Email/Password；網站程式會拒絕非 `@premtek.com.tw` 信箱。

登入資料結構：

- `users/{uid}`：公司信箱、顯示名稱、首次登入、最近登入與登入次數。
- `loginEvents/{uid}_{authTime}`：每一個 Firebase 工作階段的登入時間。
- `adminEvents/*`：管理者讀取或匯出紀錄的時間與公司信箱。

## Firebase Console 設定

1. 在 Authentication 的 Settings 將 Vercel 正式網域與 Preview 網域加入 Authorized domains。
2. 將 `.env.example` 的 `NEXT_PUBLIC_FIREBASE_*` 值填入 Vercel 的 Production 與 Preview 環境變數。
3. 建立最小權限 Firebase service account JSON，完整 JSON 存入 Vercel 的 `FIREBASE_ADMIN_SERVICE_ACCOUNT` 私密環境變數。
4. 設定 `ADMIN_EMAIL` 為唯一可開啟 `/admin/` 的 `@premtek.com.tw` 公司信箱。

若要使用 GitHub 登入，另行建立 GitHub OAuth App 並在 Firebase 啟用 GitHub provider。OAuth Client Secret 只儲存在 Firebase，不能放進 GitHub 或 Vercel 前端變數。

GitHub OAuth 的 callback URL 以 Firebase Console 顯示的 `https://<project>.firebaseapp.com/__/auth/handler` 為準；Client Secret 只儲存在 Firebase，不能放進 GitHub 或 Vercel 前端變數。

## 部署順序

1. `firebase deploy --project plasma-academy-p0-ab013`
2. 在 Vercel 匯入 `cthperry/plasma-academy`，選擇本專案根目錄。
3. 設定上述 Vercel 環境變數並部署 Preview。
4. 使用 @premtek.com.tw 帳號登入，確認 `/api/auth/login-event` 建立資料。
5. 以 `ADMIN_EMAIL` 帳號開啟 `/admin/`，確認查詢與 CSV 匯出。
