// Generated from docs/website_bg_*.png before Vite scans imports, in dev and build.
// Each referenced WebP gets Vite's content hash and the configured deployment base.
const images = import.meta.glob<string>("./generated/website/*.webp", {
  eager: true,
  query: "?url&no-inline",
  import: "default",
});
export function websiteBackground(image: string, suffix: string) {
  const asset = images[`./generated/website/${image}${suffix}.webp`];
  if (!asset)
    throw new Error(`Missing generated website background: ${image}${suffix}`);
  return asset;
}
