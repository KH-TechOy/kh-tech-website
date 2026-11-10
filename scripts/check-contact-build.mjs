import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const js = (await readdir("dist/assets")).filter(name => name.endsWith(".js"));
const forbidden = ["RELAY_SECRET", "RATE_SECRET", "TURNSTILE_SECRET", "RECIPIENT_EMAIL", "script.google.com/macros/s/", "contact-api.example.test", "browser-fixture-site-key", "notification@example.test"];
for (const name of js) {
  const text = await readFile("dist/assets/" + name, "utf8");
  for (const value of forbidden) assert(!text.includes(value), `Unexpected server configuration or test fixture in ${name}`);
}
const checks = process.env.CONTACT_CHECKS || "docs/contact31-checks";
await mkdir(checks, { recursive: true });
await writeFile(checks + "/build-exclusions.json", JSON.stringify({ checkedJavaScriptFiles: js.length, serverConfigurationAndFixtureStringsAbsent: true, note: "Static exclusion check; not a general secret scanner or delivery test." }, null, 2) + "\n");
console.log("Contact production assets exclude server configuration and browser test fixtures.");
