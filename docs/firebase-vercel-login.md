# Firebase 與 Vercel 登入管理

Plasma Academy 保持公開閱讀。只有 @premtek.com.tw 公司信箱可登入、保存個人裝置進度，並由管理者查看集中登入紀錄。

## Firebase 專案

- 專案 ID：`plasma-academy-p0`
- 預定 Firestore 區域：`asia-east1`（台灣）；建立資料庫前必須先啟用 Cloud Firestore API。
- Firestore 規則：所有瀏覽器直接讀寫一律拒絕；僅 Vercel API 的 Firebase Admin SDK 可讀寫。

登入資料結構：

- `users/{uid}`：公司信箱、顯示名稱、首次登入、最近登入與登入次數。
- `loginEvents/{uid}_{authTime}`：每一個 Firebase 工作階段的登入時間。
- `adminEvents/*`：管理者讀取或匯出紀錄的時間與公司信箱。

## Firebase Console 設定

1. 啟用 Cloud Firestore API 並建立 Standard Firestore，區域選擇 `asia-east1`。
2. 在 Authentication 的 Sign-in method 啟用 Email/Password；若要使用 GitHub，建立 GitHub OAuth App 並在 Firebase 啟用 GitHub provider。
3. 在 Authentication 的 Settings 將 Vercel 正式網域與 Preview 網域加入 Authorized domains。
4. 建立 Web App 設定，將 Firebase Web App 公開設定填入 Vercel 的 `NEXT_PUBLIC_FIREBASE_*` 變數。
5. 建立最小權限 Firebase service account JSON，完整 JSON 存入 Vercel 的 `FIREBASE_ADMIN_SERVICE_ACCOUNT` 私密環境變數。
6. 設定 `ADMIN_EMAIL` 為唯一可開啟 `/admin/` 的 @premtek.com.tw 公司信箱。

GitHub OAuth 的 callback URL 以 Firebase Console 顯示的 `https://<project>.firebaseapp.com/__/auth/handler` 為準；Client Secret 只儲存在 Firebase，不能放進 GitHub 或 Vercel 前端變數。

## 部署順序

1. `firebase deploy --only firestore:rules --project plasma-academy-p0`
2. 在 Vercel 匯入 `cthperry/plasma-academy`，選擇本專案根目錄。
3. 設定上述 Vercel 環境變數並部署 Preview。
4. 使用 @premtek.com.tw 帳號登入，確認 `/api/auth/login-event` 建立資料。
5. 以 `ADMIN_EMAIL` 帳號開啟 `/admin/`，確認查詢與 CSV 匯出。
