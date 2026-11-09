import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
const base = process.env.VITE_BASE_PATH || "/";
const ref = "KHT-20261109-A7F3C9D82E14";
const api = "https://contact-api.example.test/contact";
async function challenge(page: Page) {
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", route => route.fulfill({ contentType: "application/javascript", body: `window.turnstile={render(el,opts){const button=document.createElement('button');button.type='button';button.textContent='Test fixture: solve challenge';button.onclick=()=>opts.callback('test-token');el.appendChild(button);return 'widget'},remove(){document.querySelectorAll('[aria-label="Lomakkeen turvatarkistus"] button').forEach(el=>el.remove())}};` }));
}
async function solve(page: Page) {
  await page.locator(".contact-challenge").waitFor();
  const start = page.getByRole("button", { name: "Tee turvatarkistus", exact: true });
  if (await start.isVisible()) await start.click();
  await page.getByRole("button", { name: "Test fixture: solve challenge", exact: true }).click();
}
async function fill(page: Page) {
  await page.goto(base + "yhteystiedot/?palvelu=huolto");
  await page.locator("input[name=name]").fill("Aino Testaaja");
  await page.locator("input[name=phone]").fill("0401234567");
  await page.locator("textarea[name=description]").fill("Synteettinen testipyyntö. Ei oikea asiakastyö.");
}
async function screenshot(page: Page, name: string) {
  const dir = `docs/contact30-screenshots/${base === "/" ? "root" : "pages"}`;
  mkdirSync(dir, { recursive: true });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: `${dir}/${test.info().project.name}-${name}.png`, fullPage: true, animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
test.beforeEach(async ({ page }) => { await challenge(page); await page.emulateMedia({ reducedMotion: "reduce" }); });
test("validation, real response requirement, loading lock and matching reference (substituted service)", async ({ page }) => {
  let calls = 0;
  let release!: () => void;
  const waitForInspection = new Promise<void>(resolve => { release = resolve; });
  await page.route(api, async route => {
    calls++;
    const body = route.request().postDataJSON();
    expect(body.data.service).toBe("LVI-huolto"); expect(body.data.consent).toBeUndefined();
    expect(body.requestKey).toMatch(/^v1\.\d{13}\./);
    await waitForInspection;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: "sent", reference: ref }) });
  });
  await page.goto(base + "yhteystiedot/?palvelu=huolto");
  await solve(page);
  await page.getByRole("button", { name: "Lähetä pyyntö", exact: true }).click();
  await expect(page.locator(".error-summary")).toBeFocused(); expect(calls).toBe(0);
  await page.locator("input[name=name]").fill("Aino Testaaja");
  await page.locator("input[name=phone]").fill("0401234567");
  await page.locator("textarea[name=description]").fill("Synteettinen testipyyntö.");
  await page.getByRole("button", { name: "Lähetä pyyntö", exact: true }).click();
  await expect(page.locator(".contact-form")).toHaveAttribute("aria-busy", "true");
  await page.locator(".contact-form").evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit(); });
  release();
  await expect(page.locator(".contact-confirmation")).toContainText(ref);
  await expect(page.locator(".contact-confirmation")).toBeFocused();
  expect(calls).toBe(1);
  await expect(page.locator(".contact-confirmation")).toContainText("ei takaa viestin saapumista");
  await expect(page.locator("input[name=name]")).toBeDisabled();
  expect(await page.evaluate(() => sessionStorage.getItem("kht-contact-pending"))).not.toContain("Aino");
  await screenshot(page, "confirmed-fixture");
  await page.getByRole("button", { name: "Uusi yhteydenotto", exact: true }).click();
  await expect(page.locator("input[name=name]")).toBeEnabled();
  expect(await page.evaluate(() => sessionStorage.getItem("kht-contact-pending"))).toBeNull();
});
test("lost response survives reload and status lookup never resends the customer's message", async ({ page }) => {
  const bodies: any[] = [];
  await page.route(api + "**", async route => {
    bodies.push(route.request().postDataJSON());
    if (route.request().url() === api) await route.abort("failed");
    else await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: "sent", reference: ref }) });
  });
  await fill(page); await solve(page);
  await page.getByRole("button", { name: "Lähetä pyyntö", exact: true }).click();
  await expect(page.locator(".form-status")).toContainText("Lähetystä ei voitu vahvistaa");
  await expect(page.locator(".contact-confirmation")).toHaveCount(0);
  await screenshot(page, "network-unknown-fixture");
  await page.reload(); await expect(page.locator(".contact-recovery")).toBeVisible();
  await solve(page); await page.getByRole("button", { name: "Tarkista lähetyksen tila", exact: true }).click();
  await expect(page.locator(".contact-confirmation")).toContainText(ref);
  expect(bodies).toHaveLength(2); expect(bodies[0].requestKey).toBe(bodies[1].requestKey); expect(bodies[1].data).toBeUndefined();
});
test("rate, server, malformed and uncertain results do not display success or erase entered data", async ({ page }) => {
  let response: object = { error: "rate_limited" }, code = 429;
  await page.route(api + "**", route => route.fulfill({ status: code, contentType: "application/json", body: JSON.stringify(response) }));
  await fill(page); await solve(page);
  await page.getByRole("button", { name: "Lähetä pyyntö", exact: true }).click();
  await expect(page.locator(".form-status")).toContainText("10 minuuttia");
  await expect(page.locator("input[name=name]")).toHaveValue("Aino Testaaja");
  await expect(page.locator("input[name=name]")).toBeEnabled();
  code = 503; response = { error: "unavailable" }; await solve(page);
  await page.getByRole("button", { name: "Lähetä pyyntö", exact: true }).click();
  await expect(page.locator(".form-status")).toContainText("ei ole käytettävissä");
  code = 200; response = { accepted: true }; await solve(page);
  await page.getByRole("button", { name: "Lähetä pyyntö", exact: true }).click();
  await expect(page.locator(".form-status")).toContainText("ei voitu vahvistaa");
  await expect(page.locator(".contact-confirmation")).toHaveCount(0);
  code = 202; response = { state: "unknown", reference: ref }; await solve(page);
  await page.getByRole("button", { name: "Tarkista lähetyksen tila", exact: true }).click();
  await expect(page.locator(".contact-recovery")).toContainText(ref);
  await expect(page.locator(".contact-confirmation")).toHaveCount(0);
});
test("privacy names configured processors, technical retention and recoverable storage without recipient exposure", async ({ page }) => {
  await page.goto(base + "tietosuoja/");
  await expect(page.locator(".privacy-section")).toHaveCount(19);
  for (const text of ["Cloudflare", "MailApp", "sessionStorage", "48 tunnin"]) await expect(page.locator(".privacy-notice")).toContainText(text);
  await expect(page.locator("#tiedot")).not.toContainText("Verkkolähetys ei ole käytössä");
  expect(await page.locator("body").innerText()).not.toContain("notification@example.test");
  await expect(page.locator(`a[href*="/report/"]`)).toHaveCount(0);
  await screenshot(page, "configured-privacy-fixture");
});
