import { getFirebaseServices, requireAdministrator } from "../_firebase-admin.mjs";

export default async function handler(request, result) {
  if (request.method !== "GET") return result.status(405).json({ error: "僅接受 GET。" });
  const identity = await requireAdministrator(request);
  if (identity.error) return send(result, identity.error);

  const query = String(request.query.query || "").trim().toLocaleLowerCase();
  const { db, FieldValue } = getFirebaseServices();
  await db.collection("adminEvents").add({
    uid: identity.user.uid,
    email: identity.user.email.toLocaleLowerCase(),
    eventType: "view_login_records",
    occurredAt: FieldValue.serverTimestamp()
  });
  const [userSnapshot, eventSnapshot] = await Promise.all([
    db.collection("users").orderBy("lastLoginAt", "desc").limit(250).get(),
    db.collection("loginEvents").orderBy("recordedAt", "desc").limit(250).get()
  ]);
  const matches = (data) => !query || `${data.displayName || ""} ${data.email || ""}`.toLocaleLowerCase().includes(query);
  return result.status(200).json({
    users: userSnapshot.docs.map((doc) => ({ id: doc.id, ...serialize(doc.data()) })).filter(matches),
    events: eventSnapshot.docs.map((doc) => ({ id: doc.id, ...serialize(doc.data()) })).filter(matches)
  });
}

function serialize(data) {
  return {
    ...data,
    firstLoginAt: toIso(data.firstLoginAt),
    lastLoginAt: toIso(data.lastLoginAt),
    recordedAt: toIso(data.recordedAt),
    occurredAt: toIso(data.occurredAt)
  };
}

function toIso(value) {
  return value && typeof value.toDate === "function" ? value.toDate().toISOString() : null;
}

function send(result, payload) {
  return result.status(payload.status).json(JSON.parse(payload.body));
}
