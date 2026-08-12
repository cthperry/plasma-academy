import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onIdTokenChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";
import { clearCurrentUser, setCurrentUser } from "./auth-store.js";
import { ensureCurrentUserProgress } from "./progress-store.js";

const firebaseConfig = __PLASMA_FIREBASE_CONFIG__;
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
  let registrationInProgress = false;
  onIdTokenChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      clearCurrentUser();
      setAuthState("locked");
      renderAuth(dialog, null);
      renderProgress(null);
      return;
    }
    if (!isPremtekEmail(firebaseUser.email)) {
      await signOut(auth);
      setAuthState("locked");
      showStatus(dialog, "僅接受 @premtek.com.tw 公司信箱登入。", true);
      return;
    }
    if (!firebaseUser.emailVerified) {
      clearCurrentUser();
      setAuthState("locked");
      renderAuth(dialog, null);
      renderProgress(null);
      if (!registrationInProgress) {
        await signOut(auth);
        showStatus(dialog, "請先完成公司信箱驗證，再重新登入。", true);
      }
      return;
    }
    const idToken = await firebaseUser.getIdToken();
    setCurrentUser({ id: firebaseUser.uid, displayName: firebaseUser.displayName, email: firebaseUser.email }, idToken);
    setAuthState("authenticated");
    ensureCurrentUserProgress();
    renderAuth(dialog, firebaseUser);
    renderProgress(firebaseUser);
    try {
      await recordLogin(idToken);
    } catch (_) {
      showStatus(dialog, "登入完成，但登入紀錄暫時無法保存。", true);
    }
  });

  dialog.querySelector("[data-auth-login]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = value(dialog, "[data-auth-email]");
    const password = value(dialog, "[data-auth-password]");
    if (!isPremtekEmail(email)) return showStatus(dialog, "僅接受 @premtek.com.tw 公司信箱登入。", true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      dialog.close();
    } catch (error) {
      showStatus(dialog, firebaseErrorMessage(error), true);
    }
  });
  dialog.querySelector("[data-auth-register]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = value(dialog, "[data-auth-register-email]");
    const password = value(dialog, "[data-auth-register-password]");
    const displayName = value(dialog, "[data-auth-display-name]");
    if (!isPremtekEmail(email)) return showStatus(dialog, "僅接受 @premtek.com.tw 公司信箱建立帳號。", true);
    if (!displayName) return showStatus(dialog, "請輸入顯示名稱。", true);
    registrationInProgress = true;
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      await sendEmailVerification(result.user);
      await signOut(auth);
      showStatus(dialog, "驗證信已寄出。完成驗證後，請使用此信箱與密碼登入。", false);
    } catch (error) {
      showStatus(dialog, firebaseErrorMessage(error), true);
    } finally {
      registrationInProgress = false;
    }
  });
  dialog.querySelector("[data-auth-logout]").addEventListener("click", async () => {
    await signOut(auth);
    dialog.close();
  });
}

function bindDialog(dialog) {
  document.querySelectorAll("[data-auth-open], [data-auth-gate-open]").forEach((button) => button.addEventListener("click", () => {
    dialog.showModal();
    dialog.querySelector("[data-auth-email]")?.focus();
  }));
  dialog.querySelector("[data-auth-close]").addEventListener("click", () => dialog.close());
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
  dialog.querySelector("[data-auth-session]").hidden = !signedIn;
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
  if (!response.ok) throw new Error("登入紀錄暫時無法保存。");
}

function value(dialog, selector) {
  return dialog.querySelector(selector).value.trim();
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

function firebaseErrorMessage(error) {
  const code = error?.code;
  if (code === "auth/invalid-credential") return "帳號或密碼不正確。";
  if (code === "auth/email-already-in-use") return "此公司信箱已建立帳號，請直接登入。";
  if (code === "auth/weak-password") return "密碼至少需要 6 個字元。";
  if (code === "auth/operation-not-allowed") return "此登入方式尚未由管理者啟用。";
  return "登入服務暫時無法使用，請稍後再試。";
}
