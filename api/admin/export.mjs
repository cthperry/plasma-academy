import { getFirebaseServices, requireAdministrator } from "../_firebase-admin.mjs";

export default async function handler(request, result) {
  if (request.method !== "GET") return result.status(405).json({ error: "僅接受 GET。" });
  const identity = await requireAdministrator(request);
  if (identity.error) return send(result, identity.error);
  const { db, FieldValue } = getFirebaseServices();
  await db.collection("adminEvents").add({
    uid: identity.user.uid,
    email: identity.user.email.toLocaleLowerCase(),
    eventType: "export_login_records",
    occurredAt: FieldValue.serverTimestamp()
  });
  const events = await db.collection("loginEvents").orderBy("recordedAt", "desc").limit(5000).get();
  const rows = ["學員,公司信箱,登入時間"].concat(events.docs.map((doc) => {
    const data = doc.data();
    return [data.displayName, data.email, data.recordedAt?.toDate?.()?.toISOString() || ""].map(csvCell).join(",");
  }));
  result.setHeader("content-type", "text/csv; charset=utf-8");
  result.setHeader("content-disposition", "attachment; filename=plasma-academy-login-records.csv");
  return result.status(200).send(`\uFEFF${rows.join("\n")}`);
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function send(result, payload) {
  return result.status(payload.status).json(JSON.parse(payload.body));
}
