import { getCurrentIdToken, getCurrentUser } from "./auth-store.js";

export function initAdmin() {
  const page = document.querySelector("[data-admin-page]");
  if (!page) return;
  let records = null;
  const render = () => renderPage(page, records);
  const refresh = async () => {
    try {
      records = await fetchRecords();
      setStatus(page, `已載入 ${records.users.length} 位學員的登入紀錄。`);
    } catch (error) {
      records = null;
      setStatus(page, error.message);
    }
    render();
  };
  page.querySelector("[data-admin-search]").addEventListener("input", render);
  page.querySelector("[data-admin-export]").addEventListener("click", exportRecords);
  document.addEventListener("pa:authchange", refresh);
  document.addEventListener("pa:authready", refresh);
  if (document.documentElement.dataset.authState === "pending") {
    setStatus(page, "正在確認登入狀態…");
  } else {
    refresh();
  }
}

async function fetchRecords() {
  const token = getCurrentIdToken();
  if (!token) throw new Error("請先使用授權的公司帳號登入。 ");
  const response = await fetch("/api/admin/records", { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "無法讀取管理紀錄。 ");
  return payload;
}

function renderPage(page, records) {
  const dashboard = page.querySelector("[data-admin-dashboard]");
  dashboard.hidden = !records;
  if (!records) return;
  const query = page.querySelector("[data-admin-search]").value.trim().toLocaleLowerCase();
  const matches = (item) => !query || `${item.displayName || ""} ${item.email || ""}`.toLocaleLowerCase().includes(query);
  const users = records.users.filter(matches);
  const events = records.events.filter(matches);
  page.querySelector("[data-admin-result-count]").textContent = `顯示 ${users.length} 位學員`;
  fillRows(page.querySelector("[data-admin-users]"), users, (user) => [
    user.displayName || "—", user.email || "—", formatDateTime(user.firstLoginAt), formatDateTime(user.lastLoginAt), `${user.loginCount || 0} 次`
  ], 5, "沒有符合搜尋條件的學員。");
  fillRows(page.querySelector("[data-admin-events]"), events, (event) => [
    event.displayName || "—", event.email || "—", formatDateTime(event.recordedAt)
  ], 3, "尚無登入事件。");
}

function fillRows(body, items, cells, colspan, emptyMessage) {
  body.textContent = "";
  if (!items.length) {
    body.innerHTML = `<tr><td colspan="${colspan}">${emptyMessage}</td></tr>`;
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("tr");
    cells(item).forEach((text) => {
      const cell = document.createElement("td");
      cell.textContent = text;
      row.append(cell);
    });
    body.append(row);
  });
}

async function exportRecords() {
  const token = getCurrentIdToken();
  if (!token) return;
  const response = await fetch("/api/admin/export", { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return;
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement("a"), { href: url, download: "plasma-academy-login-records.csv" });
  link.click();
  URL.revokeObjectURL(url);
}

function setStatus(page, message) {
  page.querySelector("[data-admin-status]").textContent = message;
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
}
