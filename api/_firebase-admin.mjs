import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const permittedDomain = "premtek.com.tw";

export function getFirebaseServices() {
  if (!getApps().length) {
    const serviceAccount = parseServiceAccount();
    initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
  }
  return { auth: getAuth(), db: getFirestore(), FieldValue };
}

export async function requirePremtekUser(request) {
  const token = bearerToken(request);
  if (!token) return { error: response(401, "請先登入公司帳號。") };
  try {
    const { auth } = getFirebaseServices();
    const user = await auth.verifyIdToken(token, true);
    if (!isPremtekEmail(user.email)) return { error: response(403, "僅接受 @premtek.com.tw 公司信箱。") };
    return { user };
  } catch (_) {
    return { error: response(401, "登入工作階段無效，請重新登入。") };
  }
}

export async function requireAdministrator(request) {
  const result = await requirePremtekUser(request);
  if (result.error) return result;
  const allowedEmail = String(process.env.ADMIN_EMAIL || "").trim().toLocaleLowerCase();
  if (!allowedEmail || result.user.email.toLocaleLowerCase() !== allowedEmail) {
    return { error: response(403, "此帳號沒有管理登入紀錄的權限。") };
  }
  return result;
}

export function isPremtekEmail(email) {
  return typeof email === "string" && email.trim().toLocaleLowerCase().endsWith(`@${permittedDomain}`);
}

export function response(status, error) {
  return { status, headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify({ error }) };
}

function bearerToken(request) {
  const value = request.headers.authorization || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function parseServiceAccount() {
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT 尚未設定。");
  try {
    return JSON.parse(raw);
  } catch (_) {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT 必須是有效 JSON。");
  }
}
