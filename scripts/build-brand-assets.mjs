import { readFile, writeFile, mkdir } from "node:fs/promises";
const logo = await readFile("docs/kh-tech-logo-musta.png"),
  icon = await readFile("docs/favicon-kh-tech.png");
await mkdir("public/brand", { recursive: true });
await writeFile("public/brand/kh-tech-logo.png", logo);
await writeFile("public/brand/kh-tech-icon.png", icon);
await writeFile(
  "src/brand-logo-data.ts",
  "// Generated from the supplied original PNG by scripts/build-brand-assets.mjs.\nexport const brandLogoData = " +
    JSON.stringify("data:image/png;base64," + logo.toString("base64")) +
    ";\n",
);
console.log(
  "Official branding copied verbatim; original PNG embedded for local/offline PDF.",
);
