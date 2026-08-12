import { getFirebaseServices, requirePremtekUser, response } from "../_firebase-admin.mjs";

export default async function handler(request, result) {
  if (request.method !== "POST") return result.status(405).json({ error: "僅接受 POST。" });
  const identity = await requirePremtekUser(request);
  if (identity.error) return send(result, identity.error);

  const { user } = identity;
  const { db, FieldValue } = getFirebaseServices();
  const authTime = Number.isFinite(user.auth_time) ? user.auth_time : Math.floor(Date.now() / 1000);
  const eventRef = db.collection("loginEvents").doc(`${user.uid}_${authTime}`);
  const learnerRef = db.collection("users").doc(user.uid);
  await db.runTransaction(async (transaction) => {
    if ((await transaction.get(eventRef)).exists) return;
    const learner = await transaction.get(learnerRef);
    transaction.set(eventRef, {
      uid: user.uid,
      email: user.email.toLocaleLowerCase(),
      displayName: user.name || user.email,
      authTime,
      recordedAt: FieldValue.serverTimestamp()
    });
    transaction.set(learnerRef, {
      email: user.email.toLocaleLowerCase(),
      displayName: user.name || user.email,
      firstLoginAt: learner.exists ? learner.data().firstLoginAt : FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
      loginCount: FieldValue.increment(1)
    }, { merge: true });
  });
  return result.status(201).json({ recorded: true });
}

function send(result, payload) {
  const parsed = JSON.parse(payload.body);
  return result.status(payload.status).json(parsed);
}
