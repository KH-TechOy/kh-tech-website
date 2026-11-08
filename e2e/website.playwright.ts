import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const base = process.env.VITE_BASE_PATH || "/",
  route = (path = "") => base + path;
const production = process.env.WEBSITE_PRODUCTION === "1",
  variant = production
    ? base === "/"
      ? "production-root"
      : "production-pages"
    : "development";
const out = process.env.WEBSITE_SCREENSHOTS || "docs/website2-screenshots",
  checks = process.env.WEBSITE_CHECKS || "docs/website2-checks";
mkdirSync(out, { recursive: true });
mkdirSync(checks, { recursive: true });
let errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
});
test.afterEach(() => expect(errors, "Uncaught browser errors").toEqual([]));
async function capture(page: Page, name: string) {
  if (name === "home") {
    await page
      .locator("img[loading=lazy]")
      .evaluateAll((images) =>
        images.forEach(
          (image) => ((image as HTMLImageElement).loading = "eager"),
        ),
      );
    await page.waitForFunction(() =>
      Array.from(document.images).every(
        (image) => image.complete && image.naturalWidth > 0,
      ),
    );
  }
  await page.screenshot({
    path: `${out}/${variant}-${test.info().project.name}-${name}.png`,
    fullPage: (await page.getByRole("dialog").count()) === 0,
    animations: "disabled",
  });
  if (name === "home")
    await page.screenshot({
      path: `${out}/${variant}-${test.info().project.name}-home-fold.png`,
      animations: "disabled",
    });
}
async function layout(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "No horizontal overflow",
  ).toBe(true);
  await expect(page.locator("h1")).toHaveCount(1);
}
async function reportFields(page: Page) {
  await page.locator("input[name=customer]").fill("QA / Ääkköset Oy");
  await page
    .locator("input[name=address]")
    .fill("Testikatu 1, ei asiakaskohde");
  await page.locator("input[name=worker]").fill("Testaaja");
  await page
    .locator("textarea[name=description]")
    .fill("Vesikalusteen liitos tarkistettu. Ääkköset: yö, ääni, öljy.");
}

test("official branding, verified services, responsive pages and lazy game loading", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(route());
  await expect(page.locator(".hero h1")).toContainText("Suomalaista");
  await expect(page.locator(".brand-logo").first()).toBeVisible();
  await expect(page.locator(".service-card")).toHaveCount(4);
  await expect(
    page.getByRole("link", { name: "Pyydä tarjous", exact: true }).first(),
  ).toHaveAttribute("href", route("yhteystiedot/"));
  await page.waitForFunction(() =>
    Array.from(document.images)
      .filter((image) => image.loading !== "lazy")
      .every((image) => image.complete && image.naturalWidth > 0),
  );
  await layout(page);
  await capture(page, "home");
  expect(requests.some((url) => /\/engine-|phaser|\/GamePage-/.test(url))).toBe(
    false,
  );
  for (const [path, title] of [
    ["palvelut/", "Putkityöt"],
    ["yritys/", "Osaamista"],
    ["yhteystiedot/", "Miten"],
    ["tietosuoja/", "Tiedä"],
  ]) {
    await page.goto(route(path));
    await expect(page.locator("h1")).toContainText(title);
    await layout(page);
    if (path === "palvelut/" || path === "yhteystiedot/")
      await capture(page, path.slice(0, -1));
    await expect(page).toHaveTitle(/KH-Tech/);
    expect(
      await page.locator("meta[name=description]").getAttribute("content"),
    ).toBeTruthy();
  }
  await page.goto(route("peli/"));
  await page.locator(".pr-title-card").waitFor();
  await expect(page.locator(".pr-canvas canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Pelaa", exact: true }).click();
  await page.getByRole("button", { name: "Työhön!", exact: true }).click();
  await expect(page.locator(".pr-hud")).toBeVisible();
  await layout(page);
  if (production)
    expect(await page.evaluate(() => typeof window.__PIPE_RESCUE__)).toBe(
      "undefined",
    );
});

test("keyboard skip link and mobile navigation work without overflow", async ({
  page,
}) => {
  await page.goto(route());
  await page.locator(".header").waitFor();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Siirry sisältöön" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  if (test.info().project.name === "portrait") {
    const menu = page.getByRole("button", {
      name: "Avaa valikko",
      exact: true,
    });
    await menu.click();
    await expect(
      page.getByRole("navigation", { name: "Päävalikko" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await menu.click();
    await page
      .getByRole("navigation", { name: "Päävalikko" })
      .getByRole("link", { name: "Palvelut", exact: true })
      .click();
  } else
    await page
      .getByRole("navigation", { name: "Päävalikko" })
      .getByRole("link", { name: "Palvelut", exact: true })
      .click();
  await expect(page).toHaveURL(/\/palvelut\/$/);
  await expect(page.locator("h1")).toContainText("Putkityöt");
  if (test.info().project.name === "portrait")
    await page
      .getByRole("button", { name: "Avaa valikko", exact: true })
      .click();
  await expect(
    page
      .getByRole("navigation", { name: "Päävalikko" })
      .getByRole("link", { name: "Palvelut", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await layout(page);
});

test("contact validation, preferred channel and urgency retain entered data without false delivery", async ({
  page,
}) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await page.goto(route("yhteystiedot/?palvelu=huolto"));
  await expect(page.locator("select[name=service]")).toHaveValue("LVI-huolto");
  await page.getByRole("button", { name: "Lähetä pyyntö" }).click();
  await expect(page.locator(".error-summary")).toBeFocused();
  await expect(page.locator("input[name=name]")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.locator("input[name=name]").fill("Aino Testaaja");
  await page.locator("input[name=phone]").fill("0401234567");
  await page
    .locator("textarea[name=description]")
    .fill("Hana vuotaa, toivon arviota korjaustarpeesta.");
  await page.locator("[name=consent]").check();
  await page.locator("select[name=method]").selectOption("email");
  await page.getByRole("button", { name: "Lähetä pyyntö" }).click();
  await expect(page.locator("input[name=email]")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.locator("input[name=email]").fill("aino@example.test");
  await expect(page.locator("textarea[name=description]")).toHaveAttribute(
    "aria-describedby",
    "description-help",
  );
  await page.getByRole("radio", { name: "Kiireellinen", exact: true }).check();
  await expect(page.locator(".urgent-note")).toContainText("040 073 6199");
  await page.getByRole("button", { name: "Lähetä pyyntö" }).click();
  await expect(page.locator(".form-status")).toContainText(
    "Pyyntöä ei lähetetty",
  );
  expect(posts).toEqual([]);
  await expect(page.locator("input[name=name]")).toHaveValue("Aino Testaaja");
  await layout(page);
  await capture(page, "contact-validation");
});

test("report progress, photos, preview, PDF download and draft persistence", async ({
  page,
}) => {
  await page.goto(route("report/"));
  await page.locator(".report-form").waitFor();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "0");
  await page.getByRole("button", { name: "Luo ja lataa PDF" }).click();
  await expect(page.locator(".error-summary")).toBeFocused();
  await reportFields(page);
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "4");
  await page
    .locator("textarea[name=tasks]")
    .fill("Liitos avattu, tiiviste vaihdettu ja toiminta tarkistettu.");
  await page.locator("input[name=hours]").fill("2,5");
  await page
    .getByRole("textbox", { name: "Materiaali 1", exact: true })
    .fill("Tiiviste");
  await page.getByRole("textbox", { name: "Määrä 1", exact: true }).fill("2");
  await page
    .getByLabel("Valitse työkuvia", { exact: true })
    .setInputFiles("e2e/fixtures/before.jpg");
  await expect(page.locator(".photo-thumb")).toHaveCount(1);
  await page.getByLabel("Lisättävien kuvien tyyppi").selectOption("after");
  await page
    .getByLabel("Valitse työkuvia", { exact: true })
    .setInputFiles("e2e/fixtures/after.jpg");
  await expect(page.locator(".photo-thumb")).toHaveCount(2);
  await page
    .getByLabel("Kuvan tyyppi 1", { exact: true })
    .selectOption("during");
  await expect(page.locator(".report-save")).toContainText(
    "Luonnos tallennettu",
  );
  await page.waitForTimeout(550);
  await page.reload();
  await expect(page.locator("input[name=customer]")).toHaveValue(
    "QA / Ääkköset Oy",
  );
  await expect(page.getByLabel("Kuvan tyyppi 1", { exact: true })).toHaveValue(
    "during",
  );
  await capture(page, "report");
  await page.getByRole("button", { name: "Esikatsele raportti" }).click();
  await expect(
    page.getByRole("dialog", { name: "Raportin esikatselu" }),
  ).toBeVisible();
  await expect(page.locator(".report-paper")).toContainText("2,5");
  await capture(page, "report-preview");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Esikatsele raportti" }),
  ).toBeFocused();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Luo ja lataa PDF" }).click();
  const download = await downloadPromise;
  expect(
    readFileSync((await download.path())!)
      .subarray(0, 4)
      .toString(),
  ).toBe("%PDF");
  if (test.info().project.name === "desktop")
    await download.saveAs(`${checks}/${variant}-browser-report.pdf`);
  await page
    .getByRole("button", { name: "Poista kuva 1", exact: true })
    .click();
  await expect(page.locator(".photo-thumb")).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Poista luonnos", exact: true })
    .click();
  await expect(page.locator("input[name=customer]")).toHaveValue("");
  await expect(page.locator(".photo-thumb")).toHaveCount(0);
  await page.waitForTimeout(550);
  expect(
    await page.evaluate(() => localStorage.getItem("kht-report-draft")),
  ).toBeNull();
  await layout(page);
});

test("legacy report migrates safely and blocked storage still permits a local PDF", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "desktop",
    "Data migration and blocked storage checked once.",
  );
  await page.goto(route());
  await page.evaluate(() => {
    localStorage.setItem("kht-report-id", "KHT-20261105-ABCDEF");
    localStorage.setItem(
      "kht-report-draft",
      JSON.stringify({
        customer: "Aiempi luonnos",
        service: "Putkiasennukset",
        address: "Esimerkkikatu 2",
        worker: "Testaaja",
        description: "Aiemman version tiedot säilyvät.",
        photoCategories: [],
        materials: [{ name: "Tiiviste", quantity: "1", unit: "kpl" }],
      }),
    );
  });
  await page.goto(route("report/"));
  await expect(page.locator("input[name=customer]")).toHaveValue(
    "Aiempi luonnos",
  );
  await expect(page.locator(".report-id")).toContainText("KHT-20261105-ABCDEF");
  await expect(page.locator('select[name="service"]')).toHaveValue(
    "Putkiasennukset",
  );
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Storage disabled", "QuotaExceededError");
    };
  });
  await page.reload();
  await page.locator(".report-form").waitFor();
  await expect(page.locator(".error-summary")).toContainText(
    "Automaattinen tallennus ei onnistunut",
  );
  await reportFields(page);
  const result = page.waitForEvent("download");
  await page.getByRole("button", { name: "Luo ja lataa PDF" }).click();
  expect((await result).suggestedFilename()).toContain("KHT-20261105-ABCDEF");
});

test("installed report shell reloads and generates a branded PDF offline", async ({
  page,
  context,
}) => {
  test.skip(
    !production || test.info().project.name !== "desktop",
    "Offline shell is a production-only check.",
  );
  await page.goto(route("report/"));
  await page.locator(".report-form").waitFor();
  await reportFields(page);
  await page.waitForTimeout(650);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cache = await page.evaluate(async () => {
    const keys = await caches.keys();
    const entries = await Promise.all(
      keys.map(async (key) =>
        (await (await caches.open(key)).keys()).map((request) => request.url),
      ),
    );
    return { keys, assets: entries.flat() };
  });
  expect(cache.keys.some((key) => key.includes("website2-"))).toBe(true);
  expect(cache.assets.some((url) => /\/assets\/pdf-/.test(url))).toBe(true);
  const failed: Array<unknown> = [];
  page.on("requestfailed", (request) =>
    failed.push({
      url: request.url(),
      headers: request.headers(),
      error: request.failure(),
    }),
  );
  const cacheHeaders = await page.evaluate(async () => {
    const data = [];
    for (const name of await caches.keys()) {
      const opened = await caches.open(name);
      for (const key of await opened.keys()) {
        const response = await opened.match(key);
        data.push({
          url: key.url,
          requestHeaders: Object.fromEntries(key.headers),
          responseHeaders: Object.fromEntries(response!.headers),
        });
      }
    }
    return data;
  });
  await context.setOffline(true);
  await page.reload();
  try {
    await expect(page.locator("input[name=customer]")).toHaveValue(
      "QA / Ääkköset Oy",
    );
  } catch (error) {
    writeFileSync(
      `${checks}/${variant}-offline-diagnostic.json`,
      JSON.stringify(
        { cache, cacheHeaders, failed, html: await page.content() },
        null,
        2,
      ),
    );
    throw error;
  }
  await expect(page.locator(".report-header img")).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Luo ja lataa PDF" }).click();
  expect((await downloaded).suggestedFilename()).toMatch(/\.pdf$/);
  await capture(page, "offline-report");
  await context.setOffline(false);
  writeFileSync(
    `${checks}/${variant}-offline.json`,
    JSON.stringify(
      { base, offlineReload: true, offlinePdf: true, cache },
      null,
      2,
    ),
  );
});
