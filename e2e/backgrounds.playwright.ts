import { expect, test } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
const base = process.env.VITE_BASE_PATH || "/";
const output = ".playwright-artifacts/background-cache/screenshots";
mkdirSync(output, { recursive: true });
const manifest = JSON.parse(
  readFileSync("src/generated/website/manifest.json", "utf8"),
);
const hash = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
test("all six updated backgrounds load current hashed pixels with unchanged glass/layout", async ({
  page,
  request,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
  });
  const routes = [
    [
      "",
      [
        [".hero", "hero"],
        [".company-section", "company"],
      ],
    ],
    ["palvelut/", [[".page-hero", "services"]]],
    ["yritys/", [[".page-hero", "about"]]],
    ["yhteystiedot/", [[".page-hero", "contact"]]],
    ["tietosuoja/", [[".page-hero", "privacy"]]],
  ] as const;
  for (const [path, sections] of routes) {
    await page.goto(base + path);
    for (const [selector, name] of sections) {
      const section = page.locator(selector),
        image = section.locator(".section-background img");
      await section.scrollIntoViewIfNeeded();
      const before = await section.boundingBox();
      await image.evaluate((image: HTMLImageElement) => image.decode());
      expect(await section.boundingBox()).toEqual(before);
      const src = await image.evaluate(
        (image: HTMLImageElement) => image.currentSrc,
      );
      expect(new URL(src).pathname).toMatch(
        new RegExp(
          "^" + base + "assets/" + name + "-(mobile-)?[0-9]+-[^/]+\\.webp$",
        ),
      );
      expect(await section.locator(".kh-glass").count()).toBeGreaterThan(0);
      const response = await request.get(src);
      expect(response.ok()).toBe(true);
      const digest = hash(await response.body());
      const source = manifest.images.find(
        (entry: { name: string }) => entry.name === name,
      );
      expect(
        source.outputs.some(
          (asset: { sha256: string }) => asset.sha256 === digest,
        ),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await section.screenshot({
        path: `${output}/${test.info().project.name}-${name}.png`,
        animations: "disabled",
      });
    }
  }
  expect(failures).toEqual([]);
});
test("old image cache entries cannot override hashed backgrounds; report/user storage survives", async ({
  page,
}) => {
  await page.goto(base + "report/");
  await expect(page.locator(".access-login")).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.evaluate(async (base) => {
    sessionStorage.setItem(
      "kht-report2:cache-test:snapshot",
      '{"customer":"preserve-local-draft"}',
    );
    localStorage.setItem("background-cache-regression", "preserve");
    const unrelated = await caches.open("background-user-data-test");
    await unrelated.put(base + "retained-user-data", new Response("preserve"));
    const old = await caches.open(
      "kh-tech-shell-website2-stale-background-test",
    );
    await old.put(base + "website/hero-1774.webp", new Response("old-image"));
    await new Promise<void>((resolve, reject) => {
      const opening = indexedDB.open("background-cache-regression", 1);
      opening.onupgradeneeded = () =>
        opening.result.createObjectStore("drafts");
      opening.onerror = () => reject(opening.error);
      opening.onsuccess = () => {
        const db = opening.result;
        const tx = db.transaction("drafts", "readwrite");
        tx.objectStore("drafts").put("preserve", "draft");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  }, base);
  await page.goto(base);
  const image = page.locator(".hero .section-background img");
  await image.evaluate((image: HTMLImageElement) => image.decode());
  expect(
    await image.evaluate((image: HTMLImageElement) => image.currentSrc),
  ).toContain(base + "assets/hero-");
  await page.reload();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("kht-report2:cache-test:snapshot"),
    ),
  ).toContain("preserve-local-draft");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("background-cache-regression"),
    ),
  ).toBe("preserve");
  expect(
    await page.evaluate(
      async (base) => (await caches.match(base + "retained-user-data"))?.text(),
      base,
    ),
  ).toBe("preserve");
  expect(
    await page.evaluate(
      () =>
        new Promise<string>((resolve, reject) => {
          const opening = indexedDB.open("background-cache-regression");
          opening.onerror = () => reject(opening.error);
          opening.onsuccess = () => {
            const db = opening.result;
            const reading = db
              .transaction("drafts")
              .objectStore("drafts")
              .get("draft");
            reading.onsuccess = () => {
              db.close();
              resolve(reading.result);
            };
          };
        }),
    ),
  ).toBe("preserve");
});
