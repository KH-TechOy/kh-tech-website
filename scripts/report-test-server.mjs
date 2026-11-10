import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const outfile = resolve(".playwright-artifacts/report/test-server.mjs");
await build({
  entryPoints: ["report-api/test/server.ts"],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
});
await import(pathToFileURL(outfile).href);
