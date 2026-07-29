/* ==========================================================================
   serve.mjs — 本機靜態伺服器(僅供開發預覽)
   用法:node tools/serve.mjs [port]
   ========================================================================== */

import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const PORT = +(process.argv[2] || process.env.PORT || 8080);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};

const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";

  // 路徑穿越防護
  const full = normalize(join(ROOT, p));
  if (!full.startsWith(ROOT)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  if (!existsSync(full) || statSync(full).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>404</h1><p>" + p + "</p>");
    return;
  }

  const bodyBuf = readFileSync(full);
  res.writeHead(200, {
    "Content-Type": MIME[extname(full)] || "application/octet-stream",
    "Content-Length": bodyBuf.length,
    "Cache-Control": "no-store",
    // 與正式部署一致的嚴格 CSP —— 本機就要能抓到違規
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; script-src-attr 'none'; " +
      "style-src-elem 'self'; style-src-attr 'unsafe-inline'; " +
      "img-src 'self' data:; font-src 'self'; connect-src 'self'; " +
      "base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  });
  res.end(bodyBuf);
});

server.listen(PORT, () => {
  console.log(`Plasma Academy → http://localhost:${PORT}/`);
});
