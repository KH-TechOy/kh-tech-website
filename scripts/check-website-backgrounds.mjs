import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
export async function checkWebsiteBackgrounds(
  base = process.env.VITE_BASE_PATH || "/",
) {
  const manifest = JSON.parse(
    await readFile("src/generated/website/manifest.json", "utf8"),
  );
  const assets = await readdir("dist/assets");
  const chunks = (
    await Promise.all(
      assets
        .filter((name) => name.endsWith(".js"))
        .map((name) => readFile("dist/assets/" + name, "utf8")),
    )
  ).join("\n");
  const worker = await readFile("dist/sw.js", "utf8");
  const images = [];
  for (const image of manifest.images) {
    assert.equal(
      hash(await readFile(image.source)),
      image.sha256,
      "Generated backgrounds must match the current supplied PNG",
    );
    const outputs = [];
    for (const variant of image.outputs) {
      const stem = variant.file.slice(0, -5);
      const matches = assets.filter(
        (name) => name.startsWith(stem + "-") && name.endsWith(".webp"),
      );
      assert.equal(
        matches.length,
        1,
        `One hashed build asset required for ${variant.file}`,
      );
      const file = matches[0],
        url = base + "assets/" + file;
      assert.equal(hash(await readFile("dist/assets/" + file)), variant.sha256);
      assert(
        chunks.includes(url),
        "Website module must reference the actual base-aware image URL",
      );
      assert(
        !worker.includes(file),
        "Public backgrounds must not enlarge the employee PWA precache",
      );
      outputs.push({ ...variant, builtPath: "dist/assets/" + file, url });
    }
    images.push({ ...image, outputs });
  }
  const oldFiles = await readdir("dist/website").catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  assert(
    !oldFiles.some((name) => name.endsWith(".webp")),
    "No obsolete unversioned background duplicates may be deployed",
  );
  return {
    base,
    images,
    variants: images.flatMap((image) => image.outputs).length,
    backgroundPrecache: false,
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = await checkWebsiteBackgrounds();
  await mkdir(".playwright-artifacts/background-cache", { recursive: true });
  await writeFile(
    ".playwright-artifacts/background-cache/assets.json",
    JSON.stringify(result, null, 2),
  );
  console.log(
    `${result.images.length} current PNG sources → ${result.variants} verified hashed WebPs; base ${result.base}; no stale duplicates or background precache.`,
  );
}
