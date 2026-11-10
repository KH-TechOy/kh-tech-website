import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
const route = (process.env.VITE_BASE_PATH || "/kh-tech-website/") + "report/";
const password = "Emulator-only_42!";
const output = "docs/report20a-screenshots";
mkdirSync(output, { recursive: true });
test.beforeEach(async ({ request }) => {
  expect((await request.post("http://127.0.0.1:8788/__reset")).ok()).toBe(true);
});
async function login(page: Page, uid = "employee") {
  await page.goto(route);
  await page
    .getByLabel("Sähköposti", { exact: true })
    .fill(uid + "@example.test");
  await page.getByLabel("Salasana", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Kirjaudu sisään", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Avaa raporttieditori", exact: true }),
  ).toBeVisible();
}
async function editor(page: Page) {
  await page
    .getByRole("button", { name: "Avaa raporttieditori", exact: true })
    .click();
  await expect(page.locator(".report-form")).toBeVisible();
}
async function capture(page: Page, name: string) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${output}/${test.info().project.name}-${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
test("NFC login, invalid credentials, password reset, restoration and logout", async ({
  page,
}) => {
  await page.goto(route);
  await expect(page.getByLabel("Sähköposti", { exact: true })).toBeVisible();
  await expect(page.locator(".report-form")).toHaveCount(0);
  await capture(page, "login");
  await page
    .getByLabel("Sähköposti", { exact: true })
    .fill("employee@example.test");
  await page.getByLabel("Salasana", { exact: true }).fill("wrong");
  await page
    .getByRole("button", { name: "Kirjaudu sisään", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("ei kelpaa");
  await page.getByRole("button", { name: "Unohditko salasanasi?" }).click();
  await page
    .getByRole("button", { name: "Lähetä palautusohje", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Jos osoitteella");
  await page.getByRole("button", { name: "Takaisin kirjautumiseen" }).click();
  await page.getByLabel("Salasana", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Kirjaudu sisään", exact: true })
    .click();
  await expect(page.locator(".access-dashboard")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Työntekijät", exact: true }),
  ).toHaveCount(0);
  await capture(page, "employee");
  await page.reload();
  await expect(page.locator(".access-dashboard")).toBeVisible();
  await page.getByRole("button", { name: "Kirjaudu ulos" }).click();
  await expect(page.getByLabel("Salasana", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator(".report-form")).toHaveCount(0);
});
test("authenticated editor keeps photos/preview/PDF, restores a personal draft and clears it on logout", async ({
  page,
}) => {
  await login(page);
  await editor(page);
  await page.locator("input[name=customer]").fill("QA / Ääkköset Oy");
  await page.locator("input[name=address]").fill("Testikatu 1");
  await page.locator("input[name=worker]").fill("Testaaja");
  await page
    .locator("textarea[name=description]")
    .fill("Vesikalusteen liitos tarkistettu.");
  await page
    .getByLabel("Valitse työkuvia", { exact: true })
    .setInputFiles("e2e/fixtures/before.jpg");
  await expect(page.locator(".photo-thumb")).toHaveCount(1);
  await page.waitForTimeout(650);
  await page.reload();
  await editor(page);
  await expect(page.locator("input[name=customer]")).toHaveValue(
    "QA / Ääkköset Oy",
  );
  await expect(page.locator(".photo-thumb")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Esikatsele raportti", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  const waiting = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Luo ja lataa PDF", exact: true })
    .click();
  const download = await waiting;
  expect(
    readFileSync((await download.path())!)
      .subarray(0, 4)
      .toString(),
  ).toBe("%PDF");
  await capture(page, "editor");
  await page.getByRole("button", { name: "Kirjaudu ulos" }).click();
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((k) => k.startsWith("kht-report2:")),
    ),
  ).toEqual([]);
  await login(page, "other");
  await editor(page);
  await expect(page.locator("input[name=customer]")).toHaveValue("");
});
test("admin manages employees, roles and access; last admin is protected", async ({
  page,
}) => {
  await login(page, "admin");
  await page.getByRole("button", { name: "Työntekijät", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Lisää työntekijä" }),
  ).toBeVisible();
  await page.getByLabel("Nimi", { exact: true }).fill("Uusi asentaja");
  await page.getByLabel("Sähköposti", { exact: true }).fill("new@example.test");
  await page
    .getByRole("button", { name: "Luo työntekijä", exact: true })
    .click();
  const row = page
    .locator(".access-user-list li")
    .filter({ hasText: "new@example.test" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Lähetä palautusohje" }).click();
  await expect(page.getByRole("status")).toContainText(
    "hyväksytty sähköpostipalveluun",
  );
  page.on("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "Tee ylläpitäjäksi" }).click();
  await expect(
    row.getByRole("button", { name: "Poista ylläpitäjän oikeudet" }),
  ).toBeVisible();
  await row
    .getByRole("button", { name: "Poista ylläpitäjän oikeudet" })
    .click();
  await expect(
    row.getByRole("button", { name: "Tee ylläpitäjäksi" }),
  ).toBeVisible();
  await row.getByRole("button", { name: "Estä käyttö" }).click();
  await expect(row).toContainText("Käyttö estetty");
  const second = page
    .locator(".access-user-list li")
    .filter({ hasText: "admin2@example.test" });
  await second.getByRole("button", { name: "Estä käyttö" }).click();
  await expect(second).toContainText("Käyttö estetty");
  const self = page
    .locator(".access-user-list li")
    .filter({ hasText: "admin@example.test" });
  await self
    .getByRole("button", { name: "Poista ylläpitäjän oikeudet" })
    .click();
  await expect(page.getByRole("status")).toContainText("Viimeisen aktiivisen");
  await capture(page, "admin");
});
test("legacy draft requires explicit admin import; disabled and unprovisioned accounts have no editor", async ({
  page,
}) => {
  await page.goto(route);
  await page.evaluate(() => {
    localStorage.setItem("kht-report-id", "KHT-20261105-ABCDEF");
    localStorage.setItem(
      "kht-report-draft",
      JSON.stringify({
        customer: "Aiempi luonnos",
        address: "Testikatu",
        worker: "Testaaja",
        description: "Yhteensopivuus",
        materials: [],
      }),
    );
  });
  await login(page);
  await editor(page);
  await expect(page.locator("input[name=customer]")).toHaveValue("");
  await page.getByRole("button", { name: "Kirjaudu ulos" }).click();
  await login(page, "admin");
  await page.getByText("Aiempi paikallinen luonnos", { exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Tuo vanha luonnos omaan istuntoon" })
    .click();
  await expect(page.locator("input[name=customer]")).toHaveValue(
    "Aiempi luonnos",
  );
  await expect(page.locator(".report-id")).toContainText("KHT-20261105-ABCDEF");
  await page.getByRole("button", { name: "Kirjaudu ulos" }).click();
  for (const uid of ["disabled", "outsider"]) {
    await page
      .getByLabel("Sähköposti", { exact: true })
      .fill(uid + "@example.test");
    await page.getByLabel("Salasana", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Kirjaudu sisään", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Käyttöoikeutesi");
    await expect(page.locator(".report-form")).toHaveCount(0);
    if (await page.getByRole("button", { name: "Kirjaudu ulos" }).count())
      await page.getByRole("button", { name: "Kirjaudu ulos" }).click();
  }
});
test("offline locks the editor and preserves the same-user tab draft for reconnection", async ({
  page,
  context,
}) => {
  await login(page);
  await editor(page);
  await page.locator("input[name=customer]").fill("Tallessa verkon yli");
  await page.waitForTimeout(650);
  await context.setOffline(true);
  await expect(page.locator(".report-form")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Verkkoyhteys puuttuu");
  await context.setOffline(false);
  await expect(page.locator(".access-dashboard")).toBeVisible();
  await editor(page);
  await expect(page.locator("input[name=customer]")).toHaveValue(
    "Tallessa verkon yli",
  );
});
test("disabling an already-signed-in employee closes the live editor and purges the tab draft", async ({
  page,
  request,
}) => {
  await login(page);
  await editor(page);
  await page.locator("input[name=customer]").fill("Poistettava istuntoluonnos");
  await page.waitForTimeout(650);
  const auth = await request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator",
    {
      data: { email: "admin@example.test", password, returnSecureToken: true },
    },
  );
  const response = await request.post(
    "http://127.0.0.1:8788/employees/action",
    {
      headers: {
        Origin: "http://127.0.0.1:5188",
        Authorization: "Bearer " + (await auth.json()).idToken,
      },
      data: {
        requestId: crypto.randomUUID(),
        action: "disable",
        uid: "employee",
      },
    },
  );
  expect(response.ok()).toBe(true);
  await expect(page.locator(".report-form")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Käyttöoikeutesi");
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((k) => k.startsWith("kht-report2:")),
    ),
  ).toEqual([]);
});
test("public pages load no Firebase services and expose no report navigation even when auth is configured", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (r) => {
    const parsed = new URL(r.url());
    if (
      parsed.port === "8788" ||
      parsed.port === "9099" ||
      parsed.port === "8085" ||
      /googleapis\.com$/.test(parsed.hostname)
    )
      calls.push(r.url());
  });
  const base = process.env.VITE_BASE_PATH || "/kh-tech-website/";
  for (const path of ["", "tietosuoja/"]) {
    await page.goto(base + path);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('a[href$="/report/"]')).toHaveCount(0);
  }
  await expect(page.locator("#tiedot")).toContainText(
    "Firebase Authentication",
  );
  expect(calls).toEqual([]);
});
