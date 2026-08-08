import assert from "node:assert/strict";
import { META_CSP, validateHtmlSecurity } from "./lib/html-security.mjs";

const csp = `<meta http-equiv="Content-Security-Policy" content="${META_CSP}">`;
const referrer = '<meta name="referrer" content="no-referrer">';
const resource = '<script src="/assets/js/app.js"></script><link rel="stylesheet" href="/assets/css/base.css">';
const page = (head) => `<!doctype html><html><head>${head}</head><body></body></html>`;

assert.deepEqual(validateHtmlSecurity(page(`${csp}${referrer}${resource}`)), []);

const commentOnly = validateHtmlSecurity(page(`<!-- ${csp}${referrer} -->${resource}`));
assert(commentOnly.some((failure) => failure.includes("CSP meta")));
assert(commentOnly.some((failure) => failure.includes("referrer meta")));

const late = validateHtmlSecurity(page(`${resource}${csp}${referrer}`));
assert(late.some((failure) => failure.includes("CSP meta 必須早於")));
assert(late.some((failure) => failure.includes("referrer meta 必須早於")));

const duplicate = validateHtmlSecurity(page(`${csp}${csp}${referrer}${referrer}${resource}`));
assert(duplicate.some((failure) => failure.includes("恰有一個有效 CSP meta，目前 2")));
assert(duplicate.some((failure) => failure.includes("恰有一個 referrer meta，目前 2")));

console.log("HTML security mutation fixture 通過：comment-only、晚置與重複 meta 均被拒絕。");
