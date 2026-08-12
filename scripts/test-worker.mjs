import assert from "node:assert/strict";
import worker from "../worker/index.js";

const CSP = "default-src 'self'; script-src 'self'; script-src-attr 'none'; style-src-elem 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebaseinstallations.googleapis.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
const PERMISSIONS = "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()";

const assetRequests = [];
const env = {
  ASSETS: {
    async fetch(request) {
      const url = new URL(request.url);
      assetRequests.push({ pathname: url.pathname, method: request.method, body: request.method === "POST" ? await request.clone().text() : "" });
      if (url.pathname === "/existing/") {
        return new Response("<!doctype html><title>既有頁面</title>", {
          headers: { "Content-Type": "text/html; charset=utf-8", "X-Asset-Source": "stub" }
        });
      }
      if (url.pathname === "/assets/app.js") {
        return new Response("export const ready = true;", {
          headers: { "Content-Type": "text/javascript", "X-Asset-Source": "stub" }
        });
      }
      if (url.pathname === "/assets/diagram.svg") {
        return new Response("<svg xmlns=\"http://www.w3.org/2000/svg\"><style>path{fill:red}</style></svg>", {
          headers: { "Content-Type": "image/svg+xml", "X-Asset-Source": "stub" }
        });
      }
      if (url.pathname === "/404.html") {
        return new Response("<!doctype html><title>找不到頁面</title><h1>找不到這個頁面</h1>", {
          headers: { "Content-Type": "text/html; charset=utf-8", "X-Asset-Source": "stub" }
        });
      }
      return new Response("ASSETS 預設找不到", { status: 404, headers: { "Content-Type": "text/plain" } });
    }
  }
};

const redirect = await worker.fetch(new Request("https://example.test/existing?from=test"), env);
assert.equal(redirect.status, 308, "無副檔名路由必須保留 query 並導向尾斜線版本。");
assert.equal(redirect.headers.get("location"), "https://example.test/existing/?from=test");

const html = await worker.fetch(new Request("https://example.test/existing/"), env);
assert.equal(html.status, 200);
assert.equal(await html.text(), "<!doctype html><title>既有頁面</title>");
assert.equal(html.headers.get("content-security-policy"), CSP);
assert.equal(html.headers.get("x-content-type-options"), "nosniff");
assert.equal(html.headers.get("referrer-policy"), "no-referrer");
assert.equal(html.headers.get("permissions-policy"), PERMISSIONS);
assert.equal(html.headers.get("x-asset-source"), "stub");

const asset = await worker.fetch(new Request("https://example.test/assets/app.js"), env);
assert.equal(asset.status, 200);
assert.equal(await asset.text(), "export const ready = true;");
assert.equal(asset.headers.get("x-asset-source"), "stub");
assert.equal(asset.headers.get("content-security-policy"), null, "HTML CSP 不得加到獨立資產。");

const postAsset = await worker.fetch(new Request("https://example.test/assets/app.js", { method: "POST", body: "payload=保留" }), env);
assert.equal(postAsset.status, 200);
assert.deepEqual(assetRequests.at(-1), { pathname: "/assets/app.js", method: "POST", body: "payload=保留" }, "資產直通必須保留 method 與 body。");

const postRedirect = await worker.fetch(new Request("https://example.test/existing?from=post", { method: "POST", body: "payload=redirect" }), env);
assert.equal(postRedirect.status, 308, "POST canonical redirect 必須使用可保留 method/body 的 308。");
assert.equal(postRedirect.headers.get("location"), "https://example.test/existing/?from=post");

const svg = await worker.fetch(new Request("https://example.test/assets/diagram.svg"), env);
assert.equal(svg.status, 200);
assert.equal(svg.headers.get("content-security-policy"), null, "獨立 SVG 的內部 presentation style 不得被 HTML CSP 阻擋。");
assert.match(await svg.text(), /<style>/);

const missing = await worker.fetch(new Request("https://example.test/not-found/"), env);
assert.equal(missing.status, 404, "自訂 404 內容必須保留 HTTP 404。");
assert.match(await missing.text(), /找不到這個頁面/);
assert.equal(missing.headers.get("content-security-policy"), CSP);
assert.deepEqual(assetRequests.slice(-2).map((entry) => entry.pathname), ["/not-found/", "/404.html"]);

const headMissing = await worker.fetch(new Request("https://example.test/head-missing/", { method: "HEAD" }), env);
assert.equal(headMissing.status, 404);
assert.equal(await headMissing.text(), "", "HEAD 404 不得回傳 response body。");
assert.deepEqual(assetRequests.slice(-2).map(({ pathname, method }) => ({ pathname, method })), [
  { pathname: "/head-missing/", method: "HEAD" },
  { pathname: "/404.html", method: "GET" }
]);

console.log("Worker 契約測試通過：308、HTML headers、method/body 資產直通、HEAD 與自訂 404。 ");
