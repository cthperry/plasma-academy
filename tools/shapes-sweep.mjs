/* 開發用探測工具:把預設跑到終點再量。不進品質門。 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of [
  "src/data/defects.js",
  "src/js/lab/profile-engine.js",
  "src/js/lab/profile-shapes.js",
]) {
  vm.runInContext(readFileSync(join(ROOT, f), "utf8"), sandbox, { filename: f });
}
const PA = sandbox.window.PA;
const S = PA.profileShapes;

export const VERTICAL = { ion: 350, spread: 3, passiv: 45, radical: 55, reflect: 20, multi: false };
const ORDER = ["undercut", "taper", "bowing", "microtrench", "footing", "faceting", "etch-stop"];

export function measure(p, opts) {
  const sim = S.start({ multi: false, ...p });
  S.runToEndpoint(sim, opts);
  const m = S.metrics(sim);
  return {
    steps: sim.steps,
    endpoint: sim.endpoint,
    depthPct: m.depthPct,
    top: m.top,
    mid: m.mid,
    bot: m.bot,
    utr: S.microtrenchDepth(sim),
    shape: S.classify(sim),
  };
}

if (process.argv[1].endsWith("shapes-sweep.mjs")) {
  const rows = [["vertical", VERTICAL]].concat(
    ORDER.map((id) => [id, PA.defects.byId(id).profile])
  );
  console.log(
    "\npreset".padEnd(14) + "步數".padStart(7) + "深%".padStart(6) + "頂%".padStart(7) +
    "中%".padStart(7) + "底%".padStart(7) + "µtr".padStart(6) + "  判定"
  );
  for (const [name, p] of rows) {
    const r = measure(p);
    console.log(
      name.padEnd(13) +
        String(r.endpoint == null ? "—" : r.steps).padStart(7) +
        r.depthPct.toFixed(0).padStart(6) +
        r.top.toFixed(0).padStart(7) +
        r.mid.toFixed(0).padStart(7) +
        r.bot.toFixed(0).padStart(7) +
        String(r.utr).padStart(6) +
        "  " + r.shape
    );
  }

  const as = S.start({ ...PA.defects.byId("arde").profile, multi: true });
  S.runToEndpoint(as, { maxSteps: 2500 });
  console.log("\nARDE 各開口深度:", S.depthsPerOpening(as).map((d) => d.depth).join(" / "),
    `(步數 ${as.steps})`);
}
