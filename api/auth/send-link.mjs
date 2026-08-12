import { createHash, randomBytes } from "node:crypto";
import { getFirebaseServices, isPremtekEmail } from "../_firebase-admin.mjs";

const linkTtlMs = 15 * 60 * 1000;
const emailWindowMs = 10 * 60 * 1000;
const emailRequestLimit = 3;
const sourceRequestLimit = 10;

export default async function handler(request, result) {
  if (request.method !== "POST") return result.status(405).json({ error: "僅接受 POST。" });
  const email = normalizeEmail(request.body?.email);
  if (!isPremtekEmail(email)) return result.status(400).json({ error: "僅接受 @premtek.com.tw 公司信箱。" });
  if (!isConfigured()) return result.status(503).json({ error: "登入寄信服務尚未設定。" });

  let stage = "firebase";
  try {
    const { auth, db, FieldValue } = getFirebaseServices();
    stage = "rate-limit";
    const rateTargets = [
      { id: `email-${digest(email)}`, limit: emailRequestLimit },
      { id: `source-${digest(clientAddress(request))}`, limit: sourceRequestLimit }
    ];
    const rateAllowed = await reserveRateLimit(db, FieldValue, rateTargets);
    if (!rateAllowed) return result.status(429).json({ error: "登入連結寄送過於頻繁，請 10 分鐘後再試。" });

    stage = "user";
    const user = await findOrCreateUser(auth, email);
    stage = "link";
    const token = randomBytes(32).toString("hex");
    await db.collection("magicLoginLinks").doc(digest(token)).set({
      uid: user.uid,
      email,
      expiresAtMs: Date.now() + linkTtlMs,
      requestedAt: FieldValue.serverTimestamp()
    });
    const loginUrl = new URL(magicLinkUrl());
    loginUrl.searchParams.set("loginToken", token);
    stage = "brevo";
    await sendWithBrevo(email, loginUrl.toString());
    return result.status(202).json({ sent: true });
  } catch (error) {
    console.error("登入連結寄送失敗", {
      stage,
      code: error?.code || "unknown",
      status: error?.status || null,
      message: String(error?.message || "unknown").slice(0, 160)
    });
    return result.status(503).json({ error: "登入連結暫時無法寄送，請稍後再試。" });
  }
}

async function reserveRateLimit(db, FieldValue, targets) {
  const now = Date.now();
  return db.runTransaction(async (transaction) => {
    const refs = targets.map((target) => db.collection("magicLoginRateLimits").doc(target.id));
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
    const allowed = snapshots.every((snapshot, index) => {
      const data = snapshot.data();
      return !data || now - data.windowStartedAtMs >= emailWindowMs || data.requestCount < targets[index].limit;
    });
    if (!allowed) return false;
    snapshots.forEach((snapshot, index) => {
      const data = snapshot.data();
      const reset = !data || now - data.windowStartedAtMs >= emailWindowMs;
      transaction.set(refs[index], {
        windowStartedAtMs: reset ? now : data.windowStartedAtMs,
        requestCount: reset ? 1 : data.requestCount + 1,
        updatedAt: FieldValue.serverTimestamp()
      });
    });
    return true;
  });
}

async function findOrCreateUser(auth, email) {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
    return auth.createUser({ email, emailVerified: false });
  }
}

async function sendWithBrevo(email, loginUrl) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": secretValue(process.env.BREVO_API_KEY),
      accept: "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: { email: process.env.BREVO_SENDER_EMAIL, name: "Plasma Academy" },
      to: [{ email }],
      subject: "Plasma Academy 登入連結",
      htmlContent: `<p>請使用以下一次性連結登入 Plasma Academy：</p><p><a href="${escapeAttribute(loginUrl)}">完成登入</a></p><p>此連結 15 分鐘內有效，且只能使用一次。若非您本人要求，請忽略此信。</p>`
    })
  });
  if (!response.ok) {
    const error = new Error("Brevo rejected the request");
    error.status = response.status;
    throw error;
  }
}

function isConfigured() {
  return Boolean(secretValue(process.env.BREVO_API_KEY) && secretValue(process.env.BREVO_SENDER_EMAIL) && process.env.AUTH_MAGIC_LINK_URL);
}

function magicLinkUrl() {
  const url = new URL(process.env.AUTH_MAGIC_LINK_URL);
  if (url.protocol !== "https:") throw new Error("AUTH_MAGIC_LINK_URL 必須使用 HTTPS。");
  return url.toString();
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLocaleLowerCase() : "";
}

function clientAddress(request) {
  const forwarded = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || "unknown";
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function escapeAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function secretValue(value) {
  const normalized = String(value || "").trim();
  return normalized.length > 1 && ((normalized.startsWith('"') && normalized.endsWith('"')) || (normalized.startsWith("'") && normalized.endsWith("'")))
    ? normalized.slice(1, -1)
    : normalized;
}
