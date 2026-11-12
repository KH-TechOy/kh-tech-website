import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { mkdirSync } from "node:fs";
const base = process.env.VITE_BASE_PATH || "/kh-tech-website/";
const password = "Emulator-only_42!";
const output = ".playwright-artifacts/report20b/screenshots";
mkdirSync(output, { recursive: true });
test.beforeEach(async ({ request }) => {
  expect((await request.post("http://127.0.0.1:8788/__reset")).ok()).toBe(true);
});
async function login(page: Page, uid: string) {
  await page.goto(base + "report/");
  await page
    .getByLabel("Sähköposti", { exact: true })
    .fill(uid + "@example.test");
  await page.getByLabel("Salasana", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Kirjaudu sisään", exact: true })
    .click();
  await expect(page.locator(".access-dashboard")).toBeVisible();
}
async function api(request: APIRequestContext, uid: string, data: object) {
  const auth = await request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator",
    {
      data: { email: uid + "@example.test", password, returnSecureToken: true },
    },
  );
  const response = await request.post("http://127.0.0.1:8788/work", {
    headers: {
      Origin: "http://127.0.0.1:5188",
      Authorization: "Bearer " + (await auth.json()).idToken,
    },
    data,
  });
  expect(response.ok(), JSON.stringify(await response.json())).toBe(true);
  return response.json();
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
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${output}/${test.info().project.name}-${name}-fold.png`,
  });
  if (name === "employee-editor")
    await page.locator("#materiaalit").screenshot({
      path: `${output}/${test.info().project.name}-materials.png`,
    });
}
const order = () => ({
  action: "createOrder",
  id: "KHT-20261111-123ABC",
  requestId: crypto.randomUUID(),
  customer: "Taloyhtiö Testi",
  address: "Testikatu 4",
  description: "Vaihda liitin",
  schedule: "2026-11-12T10:00",
  quotationReference: "",
  assignedTo: ["employee"],
});

test("Admin creates, filters, edits and reassigns orders; catalog purchase prices stay in Admin management", async ({
  page,
}) => {
  await login(page, "admin");
  await page
    .getByRole("button", { name: "Materiaaliluettelo", exact: true })
    .click();
  await page
    .locator(".catalog-admin")
    .getByLabel("Nimi", { exact: true })
    .fill("Kupariliitin");
  await page.getByLabel("Tuotekoodi", { exact: true }).fill("K-1");
  await page
    .getByLabel("Myyntihinta alv 0 % (€)", { exact: true })
    .fill("12.34");
  await page
    .getByLabel("Ostohinta alv 0 % (€), valinnainen", { exact: true })
    .fill("4.20");
  await page
    .getByRole("button", { name: "Tallenna materiaali", exact: true })
    .click();
  await expect(
    page.locator(".catalog-admin").getByRole("status"),
  ).toContainText("tallennettu");
  await page.locator(".work-order-form>summary").click();
  await page.getByLabel("Asiakkaan nimi", { exact: true }).fill("Testiasiakas");
  await page.getByLabel("Kohteen osoite", { exact: true }).fill("Testikatu 7");
  await page
    .getByLabel("Työtilauksen kuvaus", { exact: true })
    .fill("Korjaa vesiliitos");
  await page
    .getByLabel("Sovittu päivämäärä (pp.kk.vvvv)", { exact: true })
    .fill("12.11.2026");
  await page.getByLabel('Sovittu kellonaika (HH:mm)', { exact: true }).fill('09:00');
  await page.getByRole("checkbox", { name: "employee", exact: true }).check();
  await page
    .getByRole("button", { name: "Luo työtilaus", exact: true })
    .click();
  const card = page.locator(".work-cards>li").filter({
    has: page.getByRole("heading", { name: "Testiasiakas", exact: true }),
  });
  await expect(card).toContainText("Uusi");
  await card
    .getByRole("button", { name: "Muokkaa työtilausta", exact: true })
    .click();
  await expect(page.locator(".work-order-form>summary")).toHaveText(
    "Muokkaa työtilausta ja vastuuhenkilöitä",
  );
  await expect(
    page.getByRole("checkbox", { name: "employee", exact: true }),
  ).toBeChecked();
  await page.getByRole("checkbox", { name: "employee", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "other", exact: true }).check();
  await page
    .getByRole("button", { name: "Tallenna työtilaus", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Työntekijä", exact: true })
    .selectOption("employee");
  await expect(card).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Työntekijä", exact: true })
    .selectOption("other");
  await expect(card).toBeVisible();
  await page.getByLabel("Työn päivämäärä", { exact: true }).fill("2026-11-13");
  await expect(card).toHaveCount(0);
  await page.getByLabel("Työn päivämäärä", { exact: true }).fill("2026-11-12");
  await expect(card).toBeVisible();
  await page
    .getByRole("combobox", { name: "Tila", exact: true })
    .selectOption("IN_PROGRESS");
  await expect(card).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Tila", exact: true })
    .selectOption("NEW");
  await expect(card).toBeVisible();
  await capture(page, "admin-dashboard");
  await page
    .getByRole("button", { name: "Muokkaa materiaalia", exact: true })
    .click();
  await expect(
    page.getByLabel("Ostohinta alv 0 % (€), valinnainen", { exact: true }),
  ).toHaveValue("4,2");
  await page.getByRole("checkbox", { name: "Käytössä", exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Tallenna materiaali", exact: true })
    .click();
  await expect(page.locator(".catalog-admin")).toContainText(
    "Poistettu käytöstä",
  );
});

test("assigned prefill, catalog selection, autosave, submit and Admin return comments work across accounts", async ({
  page,
  request,
  browser,
}) => {
  const itemId = crypto.randomUUID();
  await api(request, "admin", {
    action: "material",
    id: itemId,
    requestId: crypto.randomUUID(),
    revision: 0,
    name: "Kupariliitin",
    code: "K-1",
    unit: "kpl",
    sellingCents: 1234,
    purchaseCents: 420,
    active: true,
  });
  const data = order();
  await api(request, "admin", data);
  await login(page, "employee");
  await expect(
    page.getByRole("button", { name: "Työntekijät", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Avaa raportti", exact: true })
    .click();
  await expect(page.locator("input[name=customer]")).toHaveValue(
    "Taloyhtiö Testi",
  );
  await page
    .getByLabel("Hae materiaalia luettelosta", { exact: true })
    .fill("K-1");
  await page.getByRole("button", { name: /Kupariliitin ·/ }).click();
  await page.getByRole("textbox", { name: "Määrä 1", exact: true }).fill("3");
  await page
    .locator("textarea[name=tasks]")
    .fill("Liitin vaihdettu ja koeponnistettu");
  await page.locator("input[name=hours]").fill("2.5");
  await page
    .getByRole("button", { name: "Tallenna luonnos", exact: true })
    .click();
  await expect(page.locator(".cloud-toolbar")).toContainText(
    "Tekstiluonnos tallennettu pilveen",
  );
  await expect(
    page.getByLabel("Ostohinta alv 0 % (€), valinnainen", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Esikatsele raportti", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Laskutuksen valmistelu (ei lasku)",
  );
  await expect(
    page.getByRole("dialog").locator(".billing-totals"),
  ).toContainText("37,02");
  await page.keyboard.press("Escape");
  await capture(page, "employee-editor");
  if (test.info().project.name === "mobile") {
    await page.setViewportSize({ width: 844, height: 390 });
    await capture(page, "employee-landscape");
    await expect(page.locator("textarea[name=tasks]")).toHaveValue(
      "Liitin vaihdettu ja koeponnistettu",
    );
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await page
    .locator('[data-workflow=top]')
    .getByRole("button", { name: "Lähetä tarkastettavaksi", exact: true })
    .click();
  await expect(page.locator(".cloud-toolbar")).toContainText("Tarkastettavana");
  await expect(page.locator("textarea[name=tasks]")).toBeDisabled();
  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const adminPage = await adminContext.newPage();
  await login(adminPage, "admin");
  await adminPage
    .getByRole("button", { name: "Avaa raportti", exact: true })
    .click();
  await adminPage.getByLabel("Tuntihinta (€)", { exact: true }).fill("60");
  await adminPage.getByLabel("Matka (km)", { exact: true }).fill("10");
  await adminPage
    .getByLabel("Kilometriveloitus (€)", { exact: true })
    .fill("1");
  await adminPage.getByLabel("Muut kulut (€)", { exact: true }).fill("5");
  await adminPage.getByLabel("ALV (%)", { exact: true }).fill("25.5");
  await adminPage
    .getByRole("button", { name: "Tallenna luonnos", exact: true })
    .click();
  await expect(adminPage.locator(".cloud-toolbar")).toContainText(
    "Tekstiluonnos tallennettu pilveen",
  );
  await expect(adminPage.locator(".billing-totals")).toContainText("202,02");
  await adminPage
    .locator('[data-workflow=top]')
    .getByLabel("Kommentti palautukseen tai perumiseen", { exact: true })
    .fill("Täydennä mittaustulos");
  await adminPage
    .locator('[data-workflow=top]')
    .getByRole("button", { name: "Palauta korjattavaksi", exact: true })
    .click();
  await expect(page.locator(".cloud-toolbar .work-comment")).toContainText(
    "Täydennä mittaustulos",
  );
  await expect(page.locator("textarea[name=tasks]")).toBeEnabled();
  await page.locator("textarea[name=tasks]").fill("Mittaus 4 bar");
  await page
    .getByRole("button", { name: "Tallenna luonnos", exact: true })
    .click();
  await expect(page.locator(".cloud-toolbar")).toContainText(
    "Tekstiluonnos tallennettu pilveen",
  );
  const loaded = await api(request, "employee", {
    action: "load",
    id: data.id,
  });
  expect(loaded.report.form.materials[0].unitPriceCents).toBe(1234);
  await adminContext.close();
});

test("offline recovery and concurrent browser sessions preserve new input and require explicit conflict resolution", async ({
  page,
  request,
  browser,
  context,
}) => {
  const data = order();
  await api(request, "admin", data);
  await login(page, "employee");
  await page
    .getByRole("button", { name: "Avaa raportti", exact: true })
    .click();
  await expect(page.locator("input[name=customer]")).toHaveValue(
    "Taloyhtiö Testi",
  );
  const secondContext = await browser.newContext();
  const second = await secondContext.newPage();
  await login(second, "employee");
  await second
    .getByRole("button", { name: "Avaa raportti", exact: true })
    .click();
  await expect(second.locator("input[name=customer]")).toHaveValue(
    "Taloyhtiö Testi",
  );
  await second
    .locator("textarea[name=notes]")
    .fill("Toisen istunnon keskeneräinen");
  await page.locator("textarea[name=notes]").fill("Ensimmäisen tallennus");
  await page
    .getByRole("button", { name: "Tallenna luonnos", exact: true })
    .click();
  await expect(second.locator(".work-conflict")).toBeVisible();
  await expect(second.locator("textarea[name=notes]")).toHaveValue(
    "Toisen istunnon keskeneräinen",
  );
  second.once("dialog", (dialog) => dialog.accept());
  await second
    .getByRole("button", {
      name: "Säilytä paikallinen teksti pilvessä",
      exact: true,
    })
    .click();
  await expect(second.locator(".work-conflict")).toHaveCount(0);
  await expect(page.locator("textarea[name=notes]")).toHaveValue(
    "Toisen istunnon keskeneräinen",
  );
  await context.setOffline(true);
  await page.locator("textarea[name=notes]").fill("Offline uusi tieto");
  await page.waitForTimeout(2300);
  await expect(page.locator(".cloud-toolbar")).toContainText("Offline");
  await context.setOffline(false);
  await expect(page.locator(".cloud-toolbar")).toContainText(
    "Tekstiluonnos tallennettu pilveen",
  );
  await expect(page.locator("textarea[name=notes]")).toHaveValue(
    "Offline uusi tieto",
  );
  await expect(second.locator("textarea[name=notes]")).toHaveValue(
    "Offline uusi tieto",
  );
  await capture(page, "recovered");
  await secondContext.close();
});

test("a personal report that never reached cloud survives refresh and local deletion keeps its cloud copy", async ({
  page,
  request,
}) => {
  await login(page, "employee");
  await page
    .getByRole("button", { name: "Aloita oma raportti", exact: true })
    .click();
  await expect(page.locator(".report-form")).toBeVisible();
  await page.route("**/work", (route) =>
    route.request().postDataJSON()?.action === "save"
      ? route.abort()
      : route.continue(),
  );
  await page.locator("input[name=customer]").fill("Offline oma työ");
  await page
    .locator("textarea[name=notes]")
    .fill("Palautettava paikallinen tieto");
  const id = await page.locator(".report-id strong").innerText();
  await page
    .getByRole("button", { name: "Tallenna luonnos", exact: true })
    .click();
  await expect(page.locator(".report-save")).toContainText(
    "Luonnos tallennettu",
  );
  await page.reload();
  await expect(page.locator(".access-dashboard")).toBeVisible();
  await page.locator(".work-recoveries>summary").click();
  await page
    .getByRole("button", { name: "Jatka paikallista kopiota", exact: true })
    .click();
  await expect(page.locator(".report-id strong")).toHaveText(id);
  await expect(page.locator("textarea[name=notes]")).toHaveValue(
    "Palautettava paikallinen tieto",
  );
  await page.unroute("**/work");
  await page
    .getByRole("button", { name: "Tallenna luonnos", exact: true })
    .click();
  await expect(page.locator(".cloud-toolbar")).toContainText(
    "Tekstiluonnos tallennettu pilveen",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Poista paikallinen luonnos", exact: true })
    .click();
  await expect(page.locator(".access-dashboard")).toBeVisible();
  const stored = await api(request, "employee", { action: "load", id });
  expect(stored.report.form.notes).toBe("Palautettava paikallinen tieto");
  await page
    .getByRole("button", { name: "Kirjaudu ulos", exact: true })
    .click();
  await login(page, "other");
  await expect(page.locator(".work-recoveries")).toHaveCount(0);
  await expect(page.locator(".work-cards")).not.toContainText(
    "Offline oma työ",
  );
});
