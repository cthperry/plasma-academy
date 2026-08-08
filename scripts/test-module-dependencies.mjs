import assert from "node:assert/strict";
import { staticModuleSpecifiers } from "./lib/module-dependencies.mjs";

const source = `
  import "./side-effect.js";
  import value from "./value.js";
  export { helper } from "./helper.js";
  export * from "./all.js";
  const ignoredString = 'import "./string-only.js"';
  // import "./comment-only.js";
  const lazy = import("./lazy.js");
`;

assert.deepEqual(
  await staticModuleSpecifiers(source),
  ["./side-effect.js", "./value.js", "./helper.js", "./all.js"],
  "首載依賴解析必須包含 static import/re-export，且排除註解、字串與 dynamic import。"
);

console.log("ECMAScript 靜態依賴解析測試通過：import/re-export 完整，動態與偽字串排除。 ");
