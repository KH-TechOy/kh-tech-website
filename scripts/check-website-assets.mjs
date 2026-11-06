import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex"),
  official = [];
for (const [source, target] of [
  ["docs/kh-tech-logo-musta.png", "brand/kh-tech-logo.png"],
  ["docs/favicon-kh-tech.png", "brand/kh-tech-icon.png"],
]) {
  const original = await readFile(source);
  assert(original.equals(await readFile("public/" + target)));
  assert(original.equals(await readFile("dist/" + target)));
  official.push({
    source,
    target,
    sha256: hash(original),
    bytes: original.length,
  });
}
const embedded = await readFile("src/brand-logo-data.ts", "utf8"),
  value = JSON.parse(embedded.match(/brandLogoData\s*=\s*(".*");/)[1]);
assert(
  (await readFile("docs/kh-tech-logo-musta.png")).equals(
    Buffer.from(value.split(",")[1], "base64"),
  ),
);
for (const size of [192, 512]) {
  const bytes = await readFile("public/brand/icon-" + size + ".png");
  assert.equal(bytes.readUInt32BE(16), size);
  assert.equal(bytes.readUInt32BE(20), size);
}
async function files(root) {
  return (
    await Promise.all(
      (await readdir(root, { withFileTypes: true })).map((entry) =>
        entry.isDirectory()
          ? files(root + "/" + entry.name)
          : [root + "/" + entry.name],
      ),
    )
  ).flat();
}
const built = await files("dist");
assert(
  !built.some((path) => /character-reference|\/docs\/|\/e2e\//i.test(path)),
);
for (const path of built.filter((path) => /\.(?:js|html|css)$/.test(path))) {
  const text = await readFile(path, "utf8");
  assert(
    !/RECIPIENT_EMAIL|STAFF_PASSWORD|internal@example\.test|kh-tech-character-reference/.test(
      text,
    ),
    "Internal configuration or reference photo path in " + path,
  );
}
const worker = await readFile("dist/sw.js", "utf8");
assert(!worker.includes("__BUILD_REVISION__"));
assert(/assets\/pdf-/.test(worker));
assert(!worker.includes("/* BUILD_PRECACHE */"));
await mkdir("docs/website2-checks", { recursive: true });
await writeFile(
  "docs/website2-checks/brand-assets.json",
  JSON.stringify(
    {
      official,
      pdfEmbedsOriginalPng: true,
      pwaIconSizes: [192, 512],
      privateReferencesInDist: false,
      internalConfigurationInDist: false,
      reportPdfPrecached: true,
    },
    null,
    2,
  ),
);
console.log(
  "Branding, PDF logo bytes, PWA icons, offline bundle and production exclusions passed.",
);
