import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import worker from "../worker/index.js";

const client = path.resolve("dist/client");
const port = Number(process.env.PORT ?? process.argv[2] ?? 4173);

const server = createServer(async (incoming, outgoing) => {
  try {
    const origin = `http://${incoming.headers.host ?? `127.0.0.1:${port}`}`;
    const response = await worker.fetch(new Request(new URL(incoming.url ?? "/", origin), {
      method: incoming.method,
      headers: incoming.headers
    }), { ASSETS: { fetch: serveAsset } });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    outgoing.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    outgoing.end(`本機 Worker adapter 失敗：${error.message}`);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Plasma Academy 本機 Worker：http://127.0.0.1:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

async function serveAsset(request) {
  const pathname = decodeURIComponent(new URL(request.url).pathname);
  const file = path.resolve(client, `.${pathname}`);
  if (!file.startsWith(`${client}${path.sep}`)) return new Response("禁止存取此路徑。", { status: 403 });
  try {
    if (!(await stat(file)).isFile()) throw Object.assign(new Error("不是檔案"), { code: "ENOENT" });
    const body = await readFile(file);
    return new Response(request.method === "HEAD" ? null : body, { headers: { "Content-Type": contentType(file) } });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return new Response("本機資產找不到。", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

function contentType(file) {
  return ({
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8",
    ".webp": "image/webp",
    ".xml": "application/xml; charset=utf-8"
  })[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}
