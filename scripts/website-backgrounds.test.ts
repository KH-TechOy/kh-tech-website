import { afterEach, expect, test } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, dirname, basename } from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { build } from "vite";
import { buildWebsiteBackgrounds } from "./build-website-backgrounds.mjs";

const fixtures: string[] = [];
afterEach(async () => {
  for (const root of fixtures.splice(0)) {
    if (
      dirname(root) !== resolve(tmpdir()) ||
      !basename(root).startsWith("kh-background-")
    )
      throw new Error("Unsafe test cleanup path");
    await rm(root, { recursive: true, force: true });
  }
});
test("replacing a PNG at the same filename changes built URLs and SW revision without touching user storage", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "kh-background-"));
  fixtures.push(root);
  await mkdir(resolve(root, "docs"));
  await mkdir(resolve(root, "public"));
  await mkdir(resolve(root, "dist/report"), { recursive: true });
  await mkdir(resolve(root, "dist/brand"));
  const swSource = await readFile("public/sw.js");
  await writeFile(resolve(root, "public/sw.js"), swSource);
  for (const name of [
    "index.html",
    "report/index.html",
    "manifest.webmanifest",
    "brand/kh-tech-logo.png",
    "brand/icon-192.png",
    "brand/icon-512.png",
  ])
    await writeFile(resolve(root, "dist", name), "fixture");
  const imageFile = resolve(root, "docs/website_bg_1.png");
  const specs = [{ number: 1, name: "hero", widths: [64, 96], crop: null }];
  async function compile(colour: string, base: string) {
    const png = await sharp({
      create: { width: 96, height: 48, channels: 3, background: colour },
    })
      .png()
      .toBuffer();
    await writeFile(imageFile, png);
    const manifest = await buildWebsiteBackgrounds(root, specs);
    expect(await readFile(imageFile)).toEqual(png);
    await writeFile(
      resolve(root, "entry.js"),
      'export const images = import.meta.glob("./src/generated/website/*.webp", {eager:true, query:"?url", import:"default"});',
    );
    const output = await build({
      configFile: false,
      root,
      publicDir: false,
      base,
      logLevel: "silent",
      build: {
        outDir: "dist",
        emptyOutDir: false,
        assetsInlineLimit: 0,
        rollupOptions: {
          input: resolve(root, "entry.js"),
          preserveEntrySignatures: "strict",
        },
      },
    });
    const result = Array.isArray(output) ? output[0] : output;
    const images = result.output
      .filter(
        (asset) => asset.type === "asset" && asset.fileName.endsWith(".webp"),
      )
      .map((asset) => asset.fileName)
      .sort();
    const js = result.output
      .filter((asset) => asset.type === "chunk")
      .map((asset) => asset.code)
      .join("");
    expect(images).toHaveLength(2);
    for (const file of images) expect(js).toContain(base + file);
    execFileSync(
      process.execPath,
      [resolve("scripts/build-offline-shell.mjs")],
      { cwd: root, stdio: "pipe" },
    );
    const sw = await readFile(resolve(root, "dist/sw.js"), "utf8");
    for (const file of images) expect(sw).not.toContain(file);
    expect(await readFile(resolve(root, "public/sw.js"))).toEqual(swSource);
    expect(sw).not.toMatch(/sessionStorage|localStorage|indexedDB|skipWaiting/);
    return { images, sw, manifest };
  }
  const before = await compile("#a51c30", "/kh-tech-website/");
  const after = await compile("#184d8c", "/kh-tech-website/");
  expect(after.manifest.images[0].sha256).not.toBe(
    before.manifest.images[0].sha256,
  );
  expect(after.images.every((file) => !before.images.includes(file))).toBe(
    true,
  );
  expect(after.sw).not.toBe(before.sw);
  const rootDomain = await compile("#184d8c", "/");
  expect(rootDomain.images).toEqual(after.images);
}, 30000);

test("missing or corrupt supplied artwork fails instead of deploying an old generated background", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "kh-background-"));
  fixtures.push(root);
  await mkdir(resolve(root, "docs"));
  const specs = [{ number: 1, name: "hero", widths: [64], crop: null }];
  await expect(buildWebsiteBackgrounds(root, specs)).rejects.toThrow();
  await writeFile(resolve(root, "docs/website_bg_1.png"), "not an image");
  await expect(buildWebsiteBackgrounds(root, specs)).rejects.toThrow();
});
