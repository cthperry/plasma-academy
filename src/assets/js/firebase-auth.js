import { initializeApp } from "firebase/app";
import { getAuth, onIdTokenChanged, signInWithCustomToken, signOut } from "firebase/auth";
import { clearCurrentUser, setCurrentUser } from "./auth-store.js";
import { ensureCurrentUserProgress } from "./progress-store.js";

const firebaseConfig = __PLASMA_FIREBASE_CONFIG__;
const administratorEmail = __PLASMA_ADMIN_EMAIL__;
const allowedDomain = "premtek.com.tw";

export function initFirebaseAuth() {
  const dialog = document.querySelector("[data-auth-dialog]");
  if (!dialog) return;
  bindDialog(dialog);
  if (!firebaseConfig) {
    setAuthState("locked");
    renderUnavailable(dialog);
    return;
  }

  const auth = getAuth(initializeApp(firebaseConfig));
  onIdTokenChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      clearCurrentUser();
      setAuthState("locked");
      if (!dialog.dataset.magicLinkToken) renderAuth(dialog, null);
      renderProgress(null);
      return;
    }
    if (!isPremtekEmail(firebaseUser.email)) {
      await signOut(auth);
      setAuthState("locked");
      showStatus(dialog, "僅接受 @premtek.com.tw 公司信箱登入。", true);
      return;
    }
    const loginAuditPending = dialog.dataset.loginAuditPending === "true" && dialog.dataset.loginAuditUid === firebaseUser.uid;
    if (loginAuditPending) {
      const idToken = await firebaseUser.getIdToken();
      try {
        await recordLogin(idToken);
      } catch (error) {
        clearCurrentUser();
        setAuthState("locked");
        renderAuth(dialog, null);
        renderProgress(null);
        await signOut(auth);
        showStatus(dialog, error.message || "登入紀錄暫時無法保存，請稍後重新登入。", true);
        return;
      }
      delete dialog.dataset.loginAuditPending;
      delete dialog.dataset.loginAuditUid;
    }
    const idToken = await firebaseUser.getIdToken();
    setCurrentUser({ id: firebaseUser.uid, displayName: firebaseUser.displayName, email: firebaseUser.email }, idToken);
    setAuthState("authenticated");
    ensureCurrentUserProgress();
    renderAuth(dialog, firebaseUser);
    renderProgress(firebaseUser);
    if (loginAuditPending) dialog.close();
  });

  document.querySelectorAll("[data-auth-email-link]").forEach((form) => bindEmailLinkForm(form, dialog));
  dialog.querySelector("[data-auth-email-link-complete-button]").addEventListener("click", () => completeMagicLink(auth, dialog));
  dialog.querySelector("[data-auth-logout]").addEventListener("click", async () => {
    await signOut(auth);
    dialog.close();
  });
  completeMagicLinkFromUrl(auth, dialog);
}

function bindDialog(dialog) {
  document.querySelectorAll("[data-auth-open]").forEach((button) => button.addEventListener("click", () => {
    dialog.showModal();
    dialog.querySelector("[data-auth-email]")?.focus();
  }));
  dialog.querySelector("[data-auth-close]").addEventListener("click", () => dialog.close());
}

async function completeMagicLinkFromUrl(auth, dialog) {
  const token = new URL(window.location.href).searchParams.get("loginToken");
  if (!token) return;
  dialog.showModal();
  dialog.querySelector("[data-auth-signed-out]").hidden = true;
  dialog.querySelector("[data-auth-email-link-complete]").hidden = false;
  dialog.querySelector("[data-auth-email-link-complete-button]").focus();
  dialog.dataset.magicLinkToken = token;
  showStatus(dialog, "請按完成登入以使用此一次性連結。", false);
}

async function completeMagicLink(auth, dialog) {
  const token = dialog.dataset.magicLinkToken;
  if (!token) return showStatus(dialog, "登入連結已失效，請重新寄送。", true);
  try {
    showStatus(dialog, "正在完成登入。", false);
    const response = await fetch("/api/auth/consume-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "登入連結已失效，請重新寄送。");
    delete dialog.dataset.magicLinkToken;
    window.history.replaceState({}, document.title, window.location.pathname);
    dialog.dataset.loginAuditPending = "true";
    dialog.dataset.loginAuditUid = payload.uid;
    await signInWithCustomToken(auth, payload.customToken);
  } catch (error) {
    showStatus(dialog, error.message || "登入連結已失效，請重新寄送。", true);
  }
}

function bindEmailLinkForm(form, dialog) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = form.querySelector("[data-auth-email]").value.trim();
    if (!isPremtekEmail(email)) return showStatus(dialog, "僅接受 @premtek.com.tw 公司信箱登入。", true);
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await requestEmailLink(email);
      submit.textContent = "重新寄送登入連結";
      showStatus(dialog, "登入連結已寄送，請至公司信箱開啟；連結 15 分鐘內有效。", false);
    } catch (error) {
      showStatus(dialog, error.message || "登入連結暫時無法寄送，請稍後再試。", true);
    } finally {
      submit.disabled = false;
    }
  });
}

async function requestEmailLink(email) {
  const response = await fetch("/api/auth/send-link", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "登入連結暫時無法寄送，請稍後再試。");
}

function renderUnavailable(dialog) {
  dialog.querySelector("[data-auth-signed-out]").hidden = true;
  showStatus(dialog, "登入服務尚未設定。完成設定後僅接受 @premtek.com.tw 公司信箱登入。", true);
}

function renderAuth(dialog, firebaseUser) {
  const signedIn = Boolean(firebaseUser);
  const displayName = firebaseUser?.displayName || firebaseUser?.email || "登入";
  document.querySelectorAll("[data-auth-name-display]").forEach((element) => { element.textContent = displayName; });
  dialog.querySelector("[data-auth-signed-out]").hidden = signedIn;
  dialog.querySelector("[data-auth-email-link-complete]").hidden = true;
  dialog.querySelector("[data-auth-session]").hidden = !signedIn;
  dialog.querySelector("[data-auth-admin-link]").hidden = !signedIn || firebaseUser.email.toLocaleLowerCase() !== administratorEmail?.toLocaleLowerCase();
  if (signedIn) {
    dialog.querySelector("[data-auth-session-name]").textContent = displayName;
    dialog.querySelector("[data-auth-session-email]").textContent = firebaseUser.email;
  }
}

function renderProgress(firebaseUser) {
  const panel = document.querySelector("[data-auth-progress]");
  if (!panel) return;
  panel.querySelector("[data-auth-progress-name]").textContent = firebaseUser?.displayName || firebaseUser?.email || "尚未登入";
  panel.querySelector("[data-auth-progress-storage]").textContent = firebaseUser ? "目前裝置上的個人學習進度" : "登入後建立個人學習進度";
}

async function recordLogin(idToken) {
  const response = await fetch("/api/auth/login-event", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "登入紀錄暫時無法保存。");
  }
}

function isPremtekEmail(email) {
  return typeof email === "string" && email.trim().toLocaleLowerCase().endsWith(`@${allowedDomain}`);
}

function showStatus(dialog, message, isError = false) {
  const status = dialog.querySelector("[data-auth-status]");
  status.textContent = message;
  status.dataset.state = isError ? "error" : "success";
  document.querySelectorAll("[data-auth-gate-status]").forEach((element) => {
    element.textContent = message;
    element.dataset.state = isError ? "error" : "success";
  });
}

function setAuthState(state) {
  document.documentElement.dataset.authState = state;
}
