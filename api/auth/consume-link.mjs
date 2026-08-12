import { createHash } from "node:crypto";
import { getFirebaseServices, isPremtekEmail } from "../_firebase-admin.mjs";

export default async function handler(request, result) {
  if (request.method !== "POST") return result.status(405).json({ error: "僅接受 POST。" });
  const token = typeof request.body?.token === "string" ? request.body.token.trim() : "";
  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLocaleLowerCase() : "";
  if (!/^[a-f0-9]{64}$/.test(token) || !isPremtekEmail(email)) {
    return result.status(400).json({ error: "登入連結或公司信箱無效，請重新寄送。" });
  }

  try {
    const { auth, db, FieldValue } = getFirebaseServices();
    const linkRef = db.collection("magicLoginLinks").doc(digest(token));
    const uid = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(linkRef);
      const link = snapshot.data();
      if (!snapshot.exists || link.usedAt || link.expiresAtMs < Date.now() || link.email !== email) return null;
      transaction.update(linkRef, { usedAt: FieldValue.serverTimestamp() });
      return link.uid;
    });
    if (!uid) return result.status(400).json({ error: "登入連結已失效，請重新寄送。" });
    await auth.updateUser(uid, { emailVerified: true });
    const customToken = await auth.createCustomToken(uid);
    return result.status(200).json({ customToken });
  } catch (error) {
    console.error("登入連結兌換失敗", { code: error?.code || "unknown" });
    return result.status(503).json({ error: "登入連結暫時無法使用，請稍後重新寄送。" });
  }
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
