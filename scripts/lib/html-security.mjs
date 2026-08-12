import { parse } from "parse5";

export const META_CSP = "default-src 'self'; script-src 'self'; script-src-attr 'none'; style-src-elem 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebaseinstallations.googleapis.com; base-uri 'self'; form-action 'self'";

const executableChecks = [
  [/<script\b(?![^>]*\bsrc=)[^>]*>/gi, "inline script"],
  [/<style\b/gi, "inline style element"],
  [/\sstyle\s*=/gi, "inline style attribute"],
  [/\son[a-z]+\s*=/gi, "inline event handler"],
  [/\beval\s*\(/g, "eval"],
  [/\bnew\s+Function\b/g, "new Function"]
];

export function validateHtmlSecurity(html, label = "HTML") {
  const failures = [];
  const document = parse(html, { sourceCodeLocationInfo: true });
  const head = findElement(document, "head");
  if (!head) return [`${label} 缺少 head。`];

  const nodes = descendants(head);
  const cspNodes = nodes.filter((node) => node.tagName === "meta" && attribute(node, "http-equiv")?.toLowerCase() === "content-security-policy");
  const referrerNodes = nodes.filter((node) => node.tagName === "meta" && attribute(node, "name")?.toLowerCase() === "referrer");
  if (cspNodes.length !== 1) failures.push(`${label} 必須恰有一個有效 CSP meta，目前 ${cspNodes.length}。`);
  if (referrerNodes.length !== 1) failures.push(`${label} 必須恰有一個 referrer meta，目前 ${referrerNodes.length}。`);
  if (cspNodes.length === 1 && attribute(cspNodes[0], "content") !== META_CSP) failures.push(`${label} 的 CSP meta 內容不一致。`);
  if (referrerNodes.length === 1 && attribute(referrerNodes[0], "content")?.toLowerCase() !== "no-referrer") failures.push(`${label} 的 referrer meta 必須是 no-referrer。`);

  const firstGovernedResource = nodes
    .filter((node) => node.tagName === "script" || (node.tagName === "link" && /(?:^|\s)(?:stylesheet|preload|modulepreload)(?:\s|$)/i.test(attribute(node, "rel") ?? "")))
    .map((node) => node.sourceCodeLocation?.startOffset)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];
  for (const [name, entries] of [["CSP", cspNodes], ["referrer", referrerNodes]]) {
    if (entries.length === 1 && Number.isFinite(firstGovernedResource) && entries[0].sourceCodeLocation?.startOffset > firstGovernedResource) {
      failures.push(`${label} 的 ${name} meta 必須早於第一個 script、stylesheet 或 preload。`);
    }
  }

  for (const [pattern, description] of executableChecks) {
    pattern.lastIndex = 0;
    if (pattern.test(html)) failures.push(`${label} 含有禁止的 ${description}。`);
  }
  return failures;
}

function findElement(node, tagName) {
  if (node.tagName === tagName) return node;
  for (const child of node.childNodes ?? []) {
    const found = findElement(child, tagName);
    if (found) return found;
  }
  return null;
}

function descendants(node) {
  return (node.childNodes ?? []).flatMap((child) => [child, ...descendants(child)]);
}

function attribute(node, name) {
  return node.attrs?.find((entry) => entry.name === name)?.value;
}
