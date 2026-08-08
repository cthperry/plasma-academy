import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://plasma-academy-p0.pperry.chatgpt.site";
const client = path.resolve("dist/client");
const sitemapPath = path.join(client, "sitemap.xml");
const robotsPath = path.join(client, "robots.txt");
const failures = [];

for (const file of [sitemapPath, robotsPath, path.join(client, "404.html")]) {
  try {
    await access(file);
  } catch (_) {
    failures.push(`缺少 ${path.relative(client, file)}。`);
  }
}

if (!failures.length) {
  const sitemap = await readFile(sitemapPath, "utf8");
  const robots = await readFile(robotsPath, "utf8");
  const notFound = await readFile(path.join(client, "404.html"), "utf8");
  const listedUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const listedRoutes = listedUrls.map((url) => new URL(url).pathname);
  const actualRoutes = await canonicalRoutes(client);

  if (new Set(listedUrls).size !== listedUrls.length) failures.push("sitemap 含有重複 URL。");
  if (listedUrls.some((url) => !url.startsWith(`${SITE_URL}/`) && url !== `${SITE_URL}/`)) failures.push("sitemap 含有非正式站台 URL。");
  if (listedUrls.some((url) => url.includes("#"))) failures.push("sitemap 不得含 fragment URL。");
  if (listedRoutes.includes("/404.html")) failures.push("sitemap 不得列入 404.html。");
  if (JSON.stringify([...listedRoutes].sort()) !== JSON.stringify([...actualRoutes].sort())) {
    failures.push(`sitemap 與 canonical HTML 不是一對一：sitemap=${listedRoutes.length}，pages=${actualRoutes.length}。`);
  }
  for (const route of listedRoutes) {
    const target = route === "/" ? path.join(client, "index.html") : path.join(client, route, "index.html");
    try {
      await access(target);
    } catch (_) {
      failures.push(`sitemap 路由沒有建置頁面：${route}。`);
    }
  }
  if (!/^User-agent: \*$/m.test(robots) || !/^Allow: \/$/m.test(robots)) failures.push("robots.txt 缺少全站 allow 規則。");
  if (!robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`)) failures.push("robots.txt 的 sitemap URL 不一致。");
  const local404References = [...notFound.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((match) => match[1]).filter((url) => !/^(?:https?:|data:|#)/.test(url));
  if (local404References.some((url) => !url.startsWith("/"))) failures.push("404.html 的本機連結與資產必須全部使用根絕對路徑。");
}

if (failures.length) {
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("sitemap/robots 檢查通過：canonical HTML 一對一、路由存在且 404 已排除。 ");

async function canonicalRoutes(directory) {
  const routes = [];
  await walk(directory);
  return routes;

  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      if (!entry.isFile() || entry.name !== "index.html") continue;
      const relative = path.relative(directory, full).split(path.sep).join("/");
      routes.push(relative === "index.html" ? "/" : `/${relative.slice(0, -"index.html".length)}`);
    }
  }
}
