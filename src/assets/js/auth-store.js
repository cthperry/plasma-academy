let currentUser = null;
let currentIdToken = null;

export function getCurrentUser() {
  return currentUser;
}

export function getCurrentIdToken() {
  return currentIdToken;
}

export function setCurrentUser(user, idToken = null) {
  currentUser = user ? {
    id: String(user.id ?? user.uid),
    displayName: String(user.displayName ?? user.email ?? "學員"),
    email: String(user.email ?? "")
  } : null;
  currentIdToken = idToken;
  document.dispatchEvent(new CustomEvent("pa:authchange", { detail: currentUser }));
}

export function clearCurrentUser() {
  setCurrentUser(null, null);
}
