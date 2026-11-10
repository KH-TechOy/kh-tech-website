import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
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
  await expect(page.getByRole("button", { name: "Verkkolähetys ei ole käytössä", exact: true })).toBeDisabled();
  // Fault test: even a programmatic form submission must not send data.
  await page.locator('.contact-form').evaluate((form: HTMLFormElement) => form.requestSubmit());
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
  await expect(page.locator('[name=consent]')).toHaveCount(0);
  await page.locator("select[name=method]").selectOption("email");
  await page.locator('.contact-form').evaluate((form: HTMLFormElement) => form.requestSubmit());
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
  await page.locator('.contact-form').evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(page.locator(".form-status")).toContainText(
    "Pyyntöä ei lähetetty",
  );
  expect(posts).toEqual([]);
  await expect(page.locator("input[name=name]")).toHaveValue("Aino Testaaja");
  await layout(page);
  await capture(page, "contact-validation");
});

// Authenticated editor/PDF/legacy coverage now runs in report.playwright.ts against real emulators.
test("report direct URL fails closed when production authentication is unconfigured", async ({page}) => {
  const posts: string[]=[];page.on("request",r=>{if(r.method()==="POST")posts.push(r.url());});
  await page.goto(route("report/"));await expect(page.locator(".access-login")).toBeVisible();
  await expect(page.locator(".report-form")).toHaveCount(0);await expect(page.locator("meta[name=robots]")).toHaveAttribute("content","noindex,nofollow");
  await page.reload();await expect(page.locator(".access-login")).toBeVisible();expect(posts).toEqual([]);await layout(page);await capture(page,"report-closed");
});
test("legacy report is preserved on disk and never disclosed automatically", async ({page}) => {
  await page.goto(route());await page.evaluate(()=>{localStorage.setItem("kht-report-id","KHT-20261105-ABCDEF");localStorage.setItem("kht-report-draft",JSON.stringify({customer:"Private legacy customer"}));});
  await page.goto(route("report/"));await expect(page.locator(".access-login")).toBeVisible();await expect(page.getByText("Private legacy customer",{exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>localStorage.getItem("kht-report-id"))).toBe("KHT-20261105-ABCDEF");
});
test("installed static report shell reloads offline without exposing an unauthenticated editor", async ({page,context}) => {
  test.skip(!production || test.info().project.name!=="desktop","Static service worker requires production build.");
  await page.goto(route("report/"));await expect(page.locator(".access-login")).toBeVisible();
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await context.setOffline(true);await page.reload();await expect(page.locator(".access-login")).toBeVisible();await expect(page.locator(".report-form")).toHaveCount(0);await context.setOffline(false);
});
