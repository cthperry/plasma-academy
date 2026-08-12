import { build } from "esbuild";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const config = readFirebaseConfig(process.env);
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLocaleLowerCase() || null;
const outdir = path.resolve("dist/client/assets/js");
await mkdir(outdir, { recursive: true });

const result = await build({
  entryPoints: [path.resolve("src/assets/js/firebase-auth.js")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  write: false,
  define: {
    __PLASMA_FIREBASE_CONFIG__: JSON.stringify(config),
    __PLASMA_ADMIN_EMAIL__: JSON.stringify(adminEmail)
  },
  minify: true,
  legalComments: "none"
});
await writeFile(path.join(outdir, "firebase-auth.bundle.js"), result.outputFiles[0].contents);
await rm(path.join(outdir, "firebase-auth.js"), { force: true });

function readFirebaseConfig(env) {
  const config = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID
  };
  return Object.values(config).every(Boolean) ? config : null;
}
