import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const assets = (await readdir("dist/assets"))
  .filter((name) => !/^(engine-|GamePage-|generation\.worker-)/.test(name))
  .sort();
const hash = createHash("sha256").update(assets.join("\n"));
const source = await readFile("public/sw.js", "utf8");
hash.update(source);
for (const name of [
  "index.html",
  "report/index.html",
  "manifest.webmanifest",
  "brand/kh-tech-logo.png",
  "brand/icon-192.png",
  "brand/icon-512.png",
])
  hash.update(await readFile("dist/" + name));
const revision = hash.digest("hex").slice(0, 12);
const marker = /\/\* BUILD_PRECACHE \*\/\s*\[\]/;
if (!marker.test(source)) throw new Error("Offline precache marker is missing");
const worker = source
  .replace("__BUILD_REVISION__", revision)
  .replace(marker, JSON.stringify(assets.map((name) => "./assets/" + name)));
await writeFile("dist/sw.js", worker);
console.log(
  "Report offline shell prepared: " +
    assets.length +
    " hashed assets; revision " +
    revision +
    ".",
);
