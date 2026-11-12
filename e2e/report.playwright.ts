import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
const route = (process.env.VITE_BASE_PATH || "/kh-tech-website/") + "report/";
const password = "Emulator-only_42!";
const output = process.env.REPORT_SCREENSHOTS || '.playwright-artifacts/report20b/a1-screenshots';
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
test("authenticated editor keeps photos/preview/PDF and isolates retained personal drafts on logout", async ({
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
    .getByRole("textbox", { name: "Materiaali 1", exact: true })
    .fill("Liitin");
  await page.getByRole("textbox", { name: "Määrä 1", exact: true }).fill("3");
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
  await expect(
    page.getByRole("textbox", { name: "Materiaali 1", exact: true }),
  ).toHaveValue("Liitin");
  await expect(
    page.getByRole("textbox", { name: "Määrä 1", exact: true }),
  ).toHaveValue("3");
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
  ).not.toEqual([]);
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
  await row
    .getByRole("button", { name: "Lähetä salasanan asetuslinkki" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "hyväksytty lähetyspalveluun",
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
test("offline preserves the validated local editor and same-user draft for reconnection", async ({
  page,
  context,
}) => {
  await login(page);
  await editor(page);
  await page.locator("input[name=customer]").fill("Tallessa verkon yli");
  await page.waitForTimeout(650);
  await context.setOffline(true);
  await expect(page.locator(".report-form")).toBeVisible();
  await expect(page.locator(".access-message")).toContainText(
    "Verkkoyhteys puuttuu",
  );
  await context.setOffline(false);
  await expect(page.locator(".report-form")).toBeVisible();
  await expect(page.locator("input[name=customer]")).toHaveValue(
    "Tallessa verkon yli",
  );
});
test("disabling an already-signed-in employee closes access and retains a recoverable per-user draft", async ({
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
  ).not.toEqual([]);
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

test("typing, autosave, token refresh and tab visibility preserve the same live input and report ID", async ({
  page,
}) => {
  await login(page);
  await editor(page);
  const customer = page.locator("input[name=customer]"),
    address = page.locator("input[name=address]"),
    description = page.locator("textarea[name=description]");
  const id = await page.locator(".report-id strong").innerText();
  await customer.fill("Ensimmäinen");
  await address.fill("Uusin osoite");
  await description.fill("Keskeneräinen työ");
  await expect(page.locator(".report-save")).toContainText(
    "Tallentamattomia muutoksia",
  );
  const input = await description.elementHandle();
  await page.waitForTimeout(2200);
  await expect(page.locator(".report-save")).toContainText(
    "Luonnos tallennettu",
  );
  await expect(customer).toHaveValue("Ensimmäinen");
  await expect(address).toHaveValue("Uusin osoite");
  // Exercise the real Firebase refresh API and the real visibility validation callback.
  const verified = page.waitForResponse(
    (r) => r.url() === "http://127.0.0.1:8788/session",
  );
  await page.evaluate(async (base) => {
    const { reportFirebase } = await import(
      base + "src/reportAuth/firebase.ts"
    );
    await reportFirebase!.auth.currentUser!.getIdToken(true);
    document.dispatchEvent(new Event("visibilitychange"));
  }, process.env.VITE_BASE_PATH || "/kh-tech-website/");
  await verified;
  expect(await input!.evaluate((el) => el.isConnected)).toBe(true);
  await description.pressSequentially(" ja viimeisin lisäys", { delay: 35 });
  await page.waitForTimeout(2200);
  await expect(description).toHaveValue(
    "Keskeneräinen työ ja viimeisin lisäys",
  );
  await expect(page.locator(".report-id strong")).toHaveText(id);
  await page
    .getByRole("button", { name: "Tallenna luonnos", exact: true })
    .click();
  await expect(page.locator(".report-save")).toContainText(
    "Luonnos tallennettu",
  );
  await page.reload();
  await editor(page);
  await expect(description).toHaveValue(
    "Keskeneräinen työ ja viimeisin lisäys",
  );
  await expect(address).toHaveValue("Uusin osoite");
});

test("save failure and failed background validation never replace newer input; navigation and retry recover it", async ({
  page,
}) => {
  await login(page);
  await editor(page);
  await page.locator("input[name=customer]").fill("Vanha tallennettu");
  await page
    .getByRole("button", { name: "Tallenna luonnos", exact: true })
    .click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as any).__restoreDraftStorage = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("kht-report2:"))
        throw new DOMException("full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await page.locator("input[name=customer]").fill("Uusin tallentamaton");
  await page.locator("textarea[name=notes]").fill("Muistiinpanot säilyvät");
  await page.waitForTimeout(2200);
  await expect(page.locator(".report-save")).toContainText(
    "ei voitu tallentaa",
  );
  await page.route("http://127.0.0.1:8788/session", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "provider_unavailable" }),
    }),
  );
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(page.locator(".access-message")).toBeVisible();
  await expect(page.locator("input[name=customer]")).toHaveValue(
    "Uusin tallentamaton",
  );
  await page.getByRole("button", { name: "Etusivu", exact: true }).click();
  await editor(page);
  await expect(page.locator("textarea[name=notes]")).toHaveValue(
    "Muistiinpanot säilyvät",
  );
  await page.evaluate(() => (window as any).__restoreDraftStorage());
  await page.unroute("http://127.0.0.1:8788/session");
  await page
    .getByRole("button", { name: "Tallenna luonnos", exact: true })
    .click();
  await expect(page.locator(".report-save")).toContainText(
    "Luonnos tallennettu",
  );
  await page.reload();
  await editor(page);
  await expect(page.locator("input[name=customer]")).toHaveValue(
    "Uusin tallentamaton",
  );
});

test("blur saves edited fields and retained draft is only reopened after its own user signs back in", async ({
  page,
}) => {
  await login(page);
  await editor(page);
  await page.locator("input[name=customer]").fill("Oma yksityinen");
  await page.locator("input[name=customer]").blur();
  await expect(page.locator(".report-save")).toContainText(
    "Luonnos tallennettu",
  );
  await page.getByRole("button", { name: "Kirjaudu ulos" }).click();
  await login(page, "other");
  await editor(page);
  await expect(page.locator("input[name=customer]")).toHaveValue("");
  await page.getByRole("button", { name: "Kirjaudu ulos" }).click();
  await login(page);
  await editor(page);
  await expect(page.locator("input[name=customer]")).toHaveValue(
    "Oma yksityinen",
  );
});

test("admin edits their own email-like name and an employee name immediately; invalid name is explained", async ({
  page,
}) => {
  await login(page, "admin");
  await page.getByRole("button", { name: "Työntekijät", exact: true }).click();
  const self = page
    .locator(".access-user-list li")
    .filter({ hasText: "admin@example.test" });
  await self.getByRole("button", { name: "Muokkaa nimeä" }).click();
  await self.getByLabel("Näyttönimi").fill("Tomi");
  await self.getByRole("button", { name: "Tallenna nimi" }).click();
  await expect(page.locator(".access-toolbar strong")).toHaveText("Tomi");
  await expect(self.locator("strong")).toHaveText("Tomi");
  await expect(self).toContainText("admin@example.test");
  const employee = page
    .locator(".access-user-list li")
    .filter({ hasText: "employee@example.test" });
  await employee.getByRole("button", { name: "Muokkaa nimeä" }).click();
  await employee.getByLabel("Näyttönimi").fill("   ");
  await employee.getByRole("button", { name: "Tallenna nimi" }).click();
  await expect(page.locator('.access-employees > .access-message')).toContainText("Anna nimi");
  await employee.getByLabel("Näyttönimi").fill("Jari Asentaja");
  await employee.getByRole("button", { name: "Tallenna nimi" }).click();
  await expect(employee.locator("strong")).toHaveText("Jari Asentaja");
  await capture(page, "edited-names");
});

test("automatic onboarding preserves account on email rejection and offers explicit resend", async ({
  page,
  request,
}) => {
  await login(page, "admin");
  await page.getByRole("button", { name: "Työntekijät", exact: true }).click();
  await request.post("http://127.0.0.1:8788/__email-fail");
  await page.getByLabel("Nimi", { exact: true }).fill("Kutsuttava");
  await page
    .getByLabel("Sähköposti", { exact: true })
    .fill("invited@example.test");
  await page
    .getByRole("button", { name: "Luo työntekijä", exact: true })
    .click();
  const row = page
    .locator(".access-user-list li")
    .filter({ hasText: "invited@example.test" });
  await expect(row).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "Työntekijätili luotiin",
  );
  await expect(row).toContainText("ei hyväksytty");
  await request.post("http://127.0.0.1:8788/__email-ok");
  await row
    .getByRole("button", { name: "Lähetä asetuslinkki uudelleen" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "hyväksytty lähetyspalveluun",
  );
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Asetusviesti hyväksytty");
  await capture(page, "onboarding");
});

test("an unreadable saved draft is not overwritten automatically and replacement requires confirmation", async ({
  page,
}) => {
  await login(page);
  await editor(page);
  await page.locator("input[name=customer]").fill("Aiempi turvassa");
  await page
    .getByRole("button", { name: "Tallenna luonnos", exact: true })
    .click();
  await page.addInitScript(() => {
    if (sessionStorage.getItem("a1-allow-reads") === "1") return;
    const original = Storage.prototype.getItem;
    (window as any).__rawDraft = () =>
      original.call(sessionStorage, "kht-report2:employee:snapshot");
    (window as any).__restoreDraftReads = () => {
      Storage.prototype.getItem = original;
      sessionStorage.setItem("a1-allow-reads", "1");
    };
    Storage.prototype.getItem = function (key) {
      if (key.startsWith("kht-report2:"))
        throw new DOMException("blocked", "SecurityError");
      return original.call(this, key);
    };
  });
  await page.reload();
  await editor(page);
  await expect(page.locator(".error-summary").first()).toContainText(
    "lukeminen epäonnistui",
  );
  await page.locator("input[name=customer]").fill("Uusin syöte");
  await page.waitForTimeout(2200);
  expect(
    await page.evaluate(
      () => JSON.parse((window as any).__rawDraft()).customer,
    ),
  ).toBe("Aiempi turvassa");
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Tallenna luonnos", exact: true })
    .click();
  await expect(page.locator("input[name=customer]")).toHaveValue("Uusin syöte");
  await page.evaluate(() => (window as any).__restoreDraftReads());
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Tallenna luonnos", exact: true })
    .click();
  await expect(page.locator(".report-save")).toContainText(
    "Luonnos tallennettu",
  );
  await page.reload();
  await editor(page);
  await expect(page.locator("input[name=customer]")).toHaveValue("Uusin syöte");
});
