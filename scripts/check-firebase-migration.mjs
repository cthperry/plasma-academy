import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = await Promise.all([
  readFile("firestore.rules", "utf8"),
  readFile("api/_firebase-admin.mjs", "utf8"),
  readFile("api/auth/login-event.mjs", "utf8"),
  readFile("api/auth/send-link.mjs", "utf8"),
  readFile("api/auth/consume-link.mjs", "utf8"),
  readFile("api/admin/records.mjs", "utf8"),
  readFile("src/assets/js/firebase-auth.js", "utf8"),
  readFile("src/templates/page-shell.mjs", "utf8"),
  readFile("vercel.json", "utf8")
]);
const [rules, admin, loginEvent, sendLink, consumeLink, records, client, shell, vercel] = files;
assert.match(rules, /allow read, write: if false/);
assert.match(admin, /ADMIN_EMAIL/);
assert.match(admin, /premtek\.com\.tw/);
assert.match(loginEvent, /runTransaction/);
assert.match(loginEvent, /loginEvents/);
assert.match(sendLink, /BREVO_API_KEY/);
assert.match(sendLink, /magicLoginLinks/);
assert.match(sendLink, /magicLoginRateLimits/);
assert.match(consumeLink, /createCustomToken/);
assert.match(consumeLink, /usedAt/);
assert.match(consumeLink, /customToken, uid/);
assert.match(records, /adminEvents/);
assert.match(client, /premtek\.com\.tw/);
assert.match(client, /signInWithCustomToken/);
assert.match(client, /\/api\/auth\/send-link/);
assert.match(client, /\/api\/auth\/consume-link/);
assert.match(client, /data-auth-email-link-complete-button/);
assert.doesNotMatch(client, /data-auth-email-link-complete-email/);
assert.match(client, /loginAuditPending/);
assert.match(client, /loginAuditUid/);
assert.ok(client.indexOf("await recordLogin(idToken)") < client.indexOf('setAuthState("authenticated")'));
assert.match(shell, /data-auth-gate/);
assert.match(shell, /data-auth-email-link/);
assert.match(shell, /data-auth-email-link-complete-button/);
assert.doesNotMatch(shell, /data-auth-email-link-complete-email/);
assert.match(shell, /data-auth-protected/);
assert.match(shell, /identitytoolkit\.googleapis\.com/);
assert.match(shell, /securetoken\.googleapis\.com/);
assert.equal(JSON.parse(vercel).outputDirectory, "dist/client");
console.log("Firebase/Vercel 移植檢查通過：網域限制、集中登入紀錄、管理稽核與靜態輸出皆已設定。 ");
