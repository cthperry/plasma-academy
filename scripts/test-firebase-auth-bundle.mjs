import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { staticModuleSpecifiers } from "./lib/module-dependencies.mjs";

const bundle = await readFile("dist/client/assets/js/firebase-auth.bundle.js", "utf8");
const dependencies = await staticModuleSpecifiers(bundle);

assert.ok(
  dependencies.includes("./auth-store.js"),
  "Firebase 登入 bundle 必須共用外部 auth-store.js，否則管理頁無法取得登入權杖。"
);

console.log("Firebase 登入 bundle 共用驗證通過：管理頁與登入流程使用同一份 auth-store。 ");
