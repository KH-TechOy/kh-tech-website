// Operator-run only. Dry run is the default; never part of build or deployment.
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const outfile = resolve(".playwright-artifacts/report/finance-migration.mjs");
await build({
  entryPoints: ["scripts/report-finance-migration.ts"],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
});
await import(pathToFileURL(outfile).href);
