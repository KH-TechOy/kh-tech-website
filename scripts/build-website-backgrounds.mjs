import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const backgroundImages = [
  {
    number: 1,
    name: "hero",
    widths: [960, 1280, 1774],
    crop: [1010, 210, 1740, 887],
  },
  {
    number: 2,
    name: "company",
    widths: [960, 1280, 1774],
    crop: [0, 110, 1080, 887],
  },
  {
    number: 3,
    name: "game",
    widths: [960, 1280, 1774],
    crop: [40, 110, 920, 887],
  },
  {
    number: 4,
    name: "services",
    widths: [800, 1200, 1672],
    crop: [940, 80, 1672, 941],
  },
  {
    number: 5,
    name: "about",
    widths: [800, 1200, 1672],
    crop: [890, 70, 1672, 941],
  },
  {
    number: 6,
    name: "contact",
    widths: [800, 1200, 1672],
    crop: [990, 190, 1672, 941],
  },
  { number: 7, name: "privacy", widths: [800, 1200, 1672], crop: null },
];
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Pure resize/compression of supplied originals; no artwork generation or source writes. */
export async function buildWebsiteBackgrounds(
  root = projectRoot,
  definitions = backgroundImages,
) {
  const output = resolve(root, "src/generated/website");
  await mkdir(output, { recursive: true });
  const manifestPath = resolve(output, "manifest.json");
  const sources = await Promise.all(
    definitions.map(async (spec) => {
      const source = `docs/website_bg_${spec.number}.png`;
      const bytes = await readFile(resolve(root, source)); // Missing sources fail the build.
      return { spec, source, bytes, sha256: hash(bytes) };
    }),
  );
  const fingerprint = hash(
    JSON.stringify({
      sharp: sharp.versions,
      quality: 84,
      effort: 6,
      sources: sources.map(({ spec, source, sha256 }) => ({
        ...spec,
        source,
        sha256,
      })),
    }),
  );
  try {
    const previous = JSON.parse(await readFile(manifestPath, "utf8"));
    if (
      previous.fingerprint === fingerprint &&
      (
        await Promise.all(
          previous.images.flatMap((image) =>
            image.outputs.map(
              async (asset) =>
                hash(await readFile(resolve(output, asset.file))) ===
                asset.sha256,
            ),
          ),
        )
      ).every(Boolean)
    )
      return previous;
  } catch {
    /* A clean checkout or an invalid generated cache must regenerate. */
  }
  const images = [];
  for (const { spec, source, bytes, sha256 } of sources) {
    const metadata = await sharp(bytes).metadata();
    const outputs = [];
    for (const mobile of spec.crop ? [false, true] : [false]) {
      for (const width of mobile ? [480, 720] : spec.widths) {
        let image = sharp(bytes).removeAlpha();
        if (mobile) {
          const [left, top, right, bottom] = spec.crop;
          image = image.extract({
            left,
            top,
            width: Math.min(right, metadata.width) - left,
            height: Math.min(bottom, metadata.height) - top,
          });
        }
        const { data, info } = await image
          .resize({ width })
          .webp({ quality: 84, effort: 6 })
          .toBuffer({ resolveWithObject: true });
        const file = `${spec.name}${mobile ? "-mobile" : ""}-${width}.webp`;
        await writeFile(resolve(output, file), data);
        outputs.push({
          file,
          width: info.width,
          height: info.height,
          bytes: data.length,
          sha256: hash(data),
        });
      }
    }
    images.push({
      source,
      name: spec.name,
      sha256,
      width: metadata.width,
      height: metadata.height,
      mobileCrop: spec.crop,
      outputs,
    });
  }
  const manifest = { fingerprint, quality: 84, images };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = await buildWebsiteBackgrounds();
  console.log(
    `Optimized ${result.images.length} supplied backgrounds (${result.images.flatMap((image) => image.outputs).length} WebP variants).`,
  );
}
