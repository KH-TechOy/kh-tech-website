import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { mkdirSync } from "node:fs";
const base = process.env.VITE_BASE_PATH || "/kh-tech-website/";
const password = "Emulator-only_42!";
const output = ".playwright-artifacts/report20b1/screenshots";
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
  const result = await response.json();
  expect(response.ok(), JSON.stringify(result)).toBe(true);
  return result;
}
const order = (schedule = "") => ({
  action: "createOrder",
  id: "KHT-20261112-123ABC",
  requestId: crypto.randomUUID(),
  customer: "B.1 asiakas",
  address: "Testikatu 5",
  description: "Korjaa liitos",
  schedule,
  quotationReference: "",
  assignedTo: ["employee"],
});
async function openReport(page: Page) {
  await page
    .getByRole("button", { name: "Avaa raportti", exact: true })
    .click();
  await expect(page.locator("input[name=customer]")).toHaveValue("B.1 asiakas");
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
  if (name === "workflow-admin-bottom")
    await page.locator("[data-workflow=bottom]").screenshot({
      path: `${output}/${test.info().project.name}-workflow-panel.png`,
    });
  if (name === "material-dropdown")
    await page.locator(".catalog-picker").screenshot({
      path: `${output}/${test.info().project.name}-dropdown-panel.png`,
    });
}
test("new work-order drafts survive navigation, reload and logout and remain UID isolated; empty schedule is optional", async ({
  page,
}) => {
  await login(page, "admin");
  await page.locator(".work-order-form>summary").click();
  await page
    .getByLabel("Asiakkaan nimi", { exact: true })
    .fill("Keskeneräinen asiakas");
  await page
    .getByLabel("Kohteen osoite", { exact: true })
    .fill("Luonnoskatu 1");
  await page
    .getByLabel("Työtilauksen kuvaus", { exact: true })
    .fill("Pitkä kuvaus säilyy ennen oikean tilauksen luomista.");
  await page.getByRole("button", { name: "Työntekijät", exact: true }).click();
  await page.getByRole("button", { name: "Etusivu", exact: true }).click();
  await expect(page.getByLabel("Asiakkaan nimi", { exact: true })).toHaveValue(
    "Keskeneräinen asiakas",
  );
  await page.reload();
  await expect(
    page.getByLabel("Työtilauksen kuvaus", { exact: true }),
  ).toHaveValue("Pitkä kuvaus säilyy ennen oikean tilauksen luomista.");
  await expect(page.locator(".work-cards>li")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Kirjaudu ulos", exact: true })
    .click();
  await login(page, "other");
  expect(
    await page.evaluate(() => document.querySelector(".work-order-form")),
  ).toBeNull();
  await page
    .getByRole("button", { name: "Kirjaudu ulos", exact: true })
    .click();
  await login(page, "admin");
  await expect(page.getByLabel("Asiakkaan nimi", { exact: true })).toHaveValue(
    "Keskeneräinen asiakas",
  );
  await capture(page, "order-draft");
  await page
    .getByRole("button", { name: "Luo työtilaus", exact: true })
    .click();
  await expect(page.locator(".work-cards>li")).toContainText("Ajankohta avoin");
  await page.reload();
  await expect(page.locator(".work-cards>li")).toContainText(
    "Keskeneräinen asiakas",
  );
  await page.locator(".work-order-form>summary").click();
  await expect(page.getByLabel("Asiakkaan nimi", { exact: true })).toHaveValue(
    "",
  );
});

test("work-order editing recovers its own draft and preserves Finnish wall-clock schedules across DST", async ({
  page,
  request,
}) => {
  const data = order("2026-11-12T09:05");
  await api(request, "admin", data);
  await login(page, "admin");
  await expect(page.locator(".work-cards>li")).toContainText(
    "12.11.2026 09:05",
  );
  await page
    .getByRole("button", { name: "Muokkaa työtilausta", exact: true })
    .click();
  await expect(page.locator(".work-order-form>summary")).toHaveText(
    "Muokkaa työtilausta ja vastuuhenkilöitä",
  );
  await page
    .getByLabel("Työtilauksen kuvaus", { exact: true })
    .fill("Muokkaus säilytettävä erillään uudesta tilauksesta.");
  await page
    .getByLabel("Sovittu päivämäärä (pp.kk.vvvv)", { exact: true })
    .fill("29032026");
  await page
    .getByLabel("Sovittu kellonaika (HH:mm)", { exact: true })
    .fill("0330");
  await page
    .getByRole("button", { name: "Tallenna työtilaus", exact: true })
    .click();
  await expect(page.locator(".work-order-form")).toContainText("kesäaikaan");
  await page
    .getByLabel("Sovittu päivämäärä (pp.kk.vvvv)", { exact: true })
    .fill("25.10.2026");
  await page.reload();
  await page
    .locator(".work-recoveries")
    .filter({ hasText: "Keskeneräiset työtilausmuokkaukset" })
    .locator("summary")
    .click();
  await page
    .getByRole("button", { name: "Jatka työtilauksen muokkausta", exact: true })
    .click();
  await expect(
    page.getByLabel("Työtilauksen kuvaus", { exact: true }),
  ).toHaveValue("Muokkaus säilytettävä erillään uudesta tilauksesta.");
  await expect(
    page.getByLabel("Sovittu päivämäärä (pp.kk.vvvv)", { exact: true }),
  ).toHaveValue("25.10.2026");
  await page
    .getByRole("button", { name: "Tallenna työtilaus", exact: true })
    .click();
  await expect(page.locator(".work-cards>li")).toContainText(
    "25.10.2026 03:30",
  );
  const loaded = await api(request, "admin", { action: "load", id: data.id });
  expect(loaded.report.schedule).toBe("2026-10-25T03:30");
  await expect(
    page.getByRole("button", {
      name: "Jatka työtilauksen muokkausta",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Muokkaa työtilausta", exact: true })
    .click();
  await expect(page.locator(".work-order-form>summary")).toHaveText(
    "Muokkaa työtilausta ja vastuuhenkilöitä",
  );
  await expect(
    page.getByLabel("Työtilauksen kuvaus", { exact: true }),
  ).toHaveValue("Muokkaus säilytettävä erillään uudesta tilauksesta.");
  await page
    .getByLabel("Työtilauksen kuvaus", { exact: true })
    .fill("Toinen vahvistettu muokkaus.");
  await page
    .getByRole("button", { name: "Tallenna työtilaus", exact: true })
    .click();
  await expect(page.locator(".work-order-form>summary")).toHaveText(
    "Luo työtilaus",
  );
  expect(
    (await api(request, "admin", { action: "load", id: data.id })).report.form
      .description,
  ).toBe("Toinen vahvistettu muokkaus.");
});

test("catalog create and edit drafts recover raw prices and require confirmation to discard", async ({
  page,
}) => {
  await login(page, "admin");
  await page
    .getByRole("button", { name: "Materiaaliluettelo", exact: true })
    .click();
  const form = page.locator(".catalog-admin");
  await form.getByLabel("Nimi", { exact: true }).fill("Luonnosliitin");
  await form.getByLabel("Tuotekoodi", { exact: true }).fill("B1-50");
  const selling = form.getByLabel("Myyntihinta alv 0 % (€)", { exact: true });
  await selling.fill("");
  await page.reload();
  await page
    .getByRole("button", { name: "Materiaaliluettelo", exact: true })
    .click();
  await expect(selling).toHaveValue("");
  await expect(form.getByLabel("Nimi", { exact: true })).toHaveValue(
    "Luonnosliitin",
  );
  await selling.pressSequentially("50,25");
  await form
    .getByLabel("Ostohinta alv 0 % (€), valinnainen", { exact: true })
    .fill("20,10");
  await form
    .getByRole("button", { name: "Tallenna materiaali", exact: true })
    .click();
  await expect(form.getByRole("status")).toContainText(
    "Materiaali tallennettu",
  );
  await form
    .getByRole("button", { name: "Muokkaa materiaalia", exact: true })
    .click();
  await expect(selling).toHaveValue("50,25");
  await form.getByLabel("Nimi", { exact: true }).fill("Muokattu liitin");
  await page.getByRole("button", { name: "Työntekijät", exact: true }).click();
  await page.getByRole("button", { name: "Etusivu", exact: true }).click();
  await page
    .getByRole("button", { name: "Materiaaliluettelo", exact: true })
    .click();
  await expect(form.getByLabel("Nimi", { exact: true })).toHaveValue(
    "Muokattu liitin",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Materiaaliluettelo", exact: true })
    .click();
  await expect(
    form.getByLabel("Ostohinta alv 0 % (€), valinnainen", { exact: true }),
  ).toHaveValue("20,1");
  await form
    .getByRole("button", { name: "Tallenna materiaali", exact: true })
    .click();
  await expect(form.locator(".work-cards")).toContainText("Muokattu liitin");
  await form
    .getByLabel("Nimi", { exact: true })
    .fill("Älä poista ilman vahvistusta");
  page.once("dialog", (dialog) => dialog.dismiss());
  await form
    .getByRole("button", { name: "Uusi materiaali", exact: true })
    .click();
  await expect(form.getByLabel("Nimi", { exact: true })).toHaveValue(
    "Älä poista ilman vahvistusta",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await form
    .getByRole("button", { name: "Uusi materiaali", exact: true })
    .click();
  await expect(form.getByLabel("Nimi", { exact: true })).toHaveValue("");
  await capture(page, "catalog");
});

test("top and bottom workflows share comments, errors, loading and one submission; permissions and lifecycle remain enforced", async ({
  page,
  request,
  browser,
}) => {
  const data = order();
  await api(request, "admin", data);
  await login(page, "employee");
  await openReport(page);
  const top = page.locator("[data-workflow=top]"),
    bottom = page.locator("[data-workflow=bottom]");
  await expect(bottom).toBeVisible();
  expect(
    await bottom.evaluate(
      (node) =>
        !!(
          document
            .querySelector("#viimeistely")!
            .compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING
        ),
    ),
  ).toBe(true);
  await expect(
    bottom.getByRole("button", { name: "Peru työtilaus", exact: true }),
  ).toHaveCount(0);
  let failed = false;
  await page.route("**/work", async (route) => {
    if (route.request().postDataJSON()?.action === "transition" && !failed) {
      failed = true;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"error":"unavailable"}',
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    } else await route.continue();
  });
  await bottom
    .getByRole("button", { name: "Lähetä tarkastettavaksi", exact: true })
    .click();
  await expect(top.getByRole("alert")).toHaveText(
    "Palveluun ei saada yhteyttä. Tarkista verkkoyhteys ja yritä uudelleen.",
  );
  await expect(bottom.getByRole("alert")).toHaveText(
    (await top.getByRole("alert").textContent()) || "",
  );
  await page.unroute("**/work");
  let transitions = 0,
    release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/work", async (route) => {
    if (route.request().postDataJSON()?.action === "transition") {
      transitions++;
      await gate;
    }
    await route.continue();
  });
  await bottom
    .getByRole("button", { name: "Lähetä tarkastettavaksi", exact: true })
    .click();
  await expect(
    top.getByRole("button", { name: "Lähetä tarkastettavaksi", exact: true }),
  ).toBeDisabled();
  await top
    .getByRole("button", { name: "Lähetä tarkastettavaksi", exact: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect.poll(() => transitions).toBe(1);
  release();
  await expect(bottom.locator(".work-status")).toHaveText("Tarkastettavana");
  await expect(top.locator(".work-status")).toHaveText("Tarkastettavana");
  const adminContext = await browser.newContext({
    viewport: page.viewportSize()!,
  });
  try {
    const admin = await adminContext.newPage();
    await login(admin, "admin");
    await openReport(admin);
    const aTop = admin.locator("[data-workflow=top]"),
      aBottom = admin.locator("[data-workflow=bottom]");
    await aTop
      .getByLabel("Kommentti palautukseen tai perumiseen", { exact: true })
      .fill("Lisää mittaustulos.");
    await expect(
      aBottom.getByLabel("Kommentti palautukseen tai perumiseen", {
        exact: true,
      }),
    ).toHaveValue("Lisää mittaustulos.");
    await admin.evaluate(() => dispatchEvent(new Event("online")));
    await expect(
      aBottom.getByLabel("Kommentti palautukseen tai perumiseen", {
        exact: true,
      }),
    ).toHaveValue("Lisää mittaustulos.");
    await admin.reload();
    await openReport(admin);
    await expect(
      aTop.getByLabel("Kommentti palautukseen tai perumiseen", { exact: true }),
    ).toHaveValue("Lisää mittaustulos.");
    await aTop
      .getByRole("button", { name: "Palauta korjattavaksi", exact: true })
      .click();
    await expect(bottom.locator(".work-status")).toHaveText(
      "Palautettu korjattavaksi",
    );
    await expect(bottom.locator(".work-comment")).toContainText(
      "Lisää mittaustulos.",
    );
    await page.locator("textarea[name=tasks]").fill("Mittaus tehty.");
    await top
      .getByRole("button", { name: "Lähetä tarkastettavaksi", exact: true })
      .click();
    await expect(bottom.locator(".work-status")).toHaveText("Tarkastettavana");
    await aBottom
      .getByLabel("Kommentti palautukseen tai perumiseen", { exact: true })
      .fill("Asiakas perui työn.");
    await capture(admin, "workflow-admin-bottom");
    admin.once("dialog", (dialog) => dialog.accept());
    await aBottom
      .getByRole("button", { name: "Peru työtilaus", exact: true })
      .click();
    await expect(bottom.locator(".work-status")).toHaveText("Peruttu");
    await expect(
      top.getByRole("button", { name: "Lähetä tarkastettavaksi", exact: true }),
    ).toHaveCount(0);
  } finally {
    await adminContext.close();
  }
});

test("material dropdown supports blank opening, product search, keyboard and touch; manual entry and price permissions remain", async ({
  page,
  request,
}) => {
  await api(request, "admin", {
    action: "material",
    id: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
    revision: 0,
    name: "B1 kupariliitin",
    code: "B1-K1",
    unit: "kpl",
    sellingCents: 1250,
    purchaseCents: 400,
    active: true,
  });
  await api(request, "admin", {
    action: "material",
    id: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
    revision: 0,
    name: "Ei valittavissa",
    code: "INACTIVE",
    unit: "m",
    sellingCents: 500,
    purchaseCents: null,
    active: false,
  });
  await api(request, "admin", order());
  await login(page, "employee");
  await openReport(page);
  const toggle = page.getByRole("button", {
    name: "Näytä luettelomateriaalit",
    exact: true,
  });
  if (test.info().project.name === "mobile") await toggle.tap();
  else await toggle.click();
  const options = page.getByRole("listbox", { name: "Luettelomateriaalit" });
  await expect(options).toContainText("B1 kupariliitin");
  await expect(options).not.toContainText("Ei valittavissa");
  const search = page.getByRole("combobox", {
    name: "Hae materiaalia luettelosta",
  });
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(page.getByLabel("Materiaali 1", { exact: true })).toHaveValue(
    "B1 kupariliitin",
  );
  await expect(page.getByLabel("Yksikköhinta 1", { exact: true })).toHaveCount(
    0,
  );
  await search.fill("B1-K1");
  const result = page.getByRole("button", { name: /B1 kupariliitin ·/ });
  if (test.info().project.name === "mobile") await result.tap();
  else await result.click();
  await expect(page.getByLabel("Materiaali 2", { exact: true })).toHaveValue(
    "B1 kupariliitin",
  );
  await page
    .getByRole("button", { name: "Lisää materiaali", exact: true })
    .click();
  await page.getByLabel("Materiaali 3", { exact: true }).fill("Käsin syötetty");
  await page.getByLabel("Määrä 3", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Tallenna luonnos", exact: true })
    .click();
  await expect(page.locator(".cloud-toolbar")).toContainText(
    "Tekstiluonnos tallennettu pilveen",
  );
  await search.fill("kupari");
  await capture(page, "material-dropdown");
  await search.press("Escape");
  await expect(options).toHaveCount(0);
});

test("price editing selects zero, accepts commas and empty partial text without premature cloud writes; blur and refresh preserve committed cents", async ({
  page,
  request,
}) => {
  const data = order();
  await api(request, "admin", data);
  await login(page, "admin");
  await openReport(page);
  await page
    .getByLabel("Materiaali 1", { exact: true })
    .fill("Käsin hinnoiteltu");
  await page.getByLabel("Määrä 1", { exact: true }).fill("2");
  const price = page.getByLabel("Yksikköhinta 1", { exact: true });
  await price.focus();
  await price.pressSequentially("50");
  await expect(price).toHaveValue("50");
  await price.press("Tab");
  await expect(page.locator(".material-price")).toContainText("100,00");
  await page
    .getByRole("button", { name: "Tallenna luonnos", exact: true })
    .click();
  await expect(page.locator(".cloud-toolbar")).toContainText(
    "Tekstiluonnos tallennettu pilveen",
  );
  await price.fill("");
  await expect(price).toHaveValue("");
  await page.waitForTimeout(2200);
  expect(
    (await api(request, "admin", { action: "load", id: data.id })).report.form
      .materials[0].unitPriceCents,
  ).toBe(5000);
  await price.fill("-5");
  await price.press("Tab");
  expect(
    await price.evaluate((input: HTMLInputElement) => input.validity.valid),
  ).toBe(false);
  await price.fill("50,25");
  await price.press("Tab");
  await expect(page.locator(".material-price")).toContainText("100,50");
  await page.getByLabel("Tuntihinta (€)", { exact: true }).fill("60,50");
  await page.getByLabel("Tuntihinta (€)", { exact: true }).press("Tab");
  await page
    .getByRole("button", { name: "Tallenna luonnos", exact: true })
    .click();
  await expect(page.locator(".cloud-toolbar")).toContainText(
    "Tekstiluonnos tallennettu pilveen",
  );
  const loaded = await api(request, "admin", { action: "load", id: data.id });
  expect(loaded.report.form.materials[0].unitPriceCents).toBe(5025);
  expect(loaded.report.billing.hourRateCents).toBe(6050);
  await page.getByLabel("Muut kulut (€)", { exact: true }).fill("9,95");
  await page.reload();
  await openReport(page);
  await expect(page.getByLabel("Muut kulut (€)", { exact: true })).toHaveValue(
    "9,95",
  );
  await expect(page.locator("input[name=date]")).toHaveValue(
    /\d{2}\.\d{2}\.\d{4}/,
  );
  await expect(page.locator("input[name=start]")).toHaveAttribute(
    "placeholder",
    "HH:mm",
  );
  await capture(page, "price-inputs");
  await page
    .getByRole("button", { name: "Tallenna luonnos", exact: true })
    .click();
  await expect(page.locator(".cloud-toolbar")).toContainText(
    "Tekstiluonnos tallennettu pilveen",
  );
  await page
    .getByRole("button", { name: "Takaisin tehtäviin", exact: true })
    .click();
});

test("form persistence errors keep live input and retry succeeds without creating a real work order", async ({
  page,
}) => {
  let creations = 0;
  page.on("request", (request) => {
    if (
      request.url().endsWith("/work") &&
      request.method() === "POST" &&
      request.postDataJSON()?.action === "createOrder"
    )
      creations++;
  });
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    (window as any).__failFormWrite = true;
    Storage.prototype.setItem = function (key, value) {
      if (
        key.startsWith("kht-report-forms:") &&
        (window as any).__failFormWrite
      )
        throw new DOMException("quota", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await login(page, "admin");
  await page.locator(".work-order-form>summary").click();
  await page
    .getByLabel("Asiakkaan nimi", { exact: true })
    .fill("Säilytä virheessä");
  await page
    .getByLabel("Työtilauksen kuvaus", { exact: true })
    .fill("Syöte ei saa kadota.");
  await expect(page.locator(".work-order-form")).toContainText(
    "Lomakeluonnoksen tallennus epäonnistui",
  );
  await page.getByRole("button", { name: "Työntekijät", exact: true }).click();
  await page.getByRole("button", { name: "Etusivu", exact: true }).click();
  await expect(page.getByLabel("Asiakkaan nimi", { exact: true })).toHaveValue(
    "Säilytä virheessä",
  );
  await page.evaluate(() => {
    (window as any).__failFormWrite = false;
  });
  await page
    .getByRole("button", {
      name: "Yritä luonnoksen tallennusta uudelleen",
      exact: true,
    })
    .click();
  await expect(page.locator(".work-order-form")).toContainText(
    "Lomakeluonnos tallennettu tähän välilehteen",
  );
  expect(creations).toBe(0);
  await expect(
    page.locator(".work-cards>li").filter({ hasText: "Säilytä virheessä" }),
  ).toHaveCount(0);
});

test("supported status badges retain text labels and at least 4.5:1 contrast", async ({
  page,
  request,
}) => {
  await api(request, "admin", order());
  await login(page, "admin");
  const samples = await page.locator(".work-space").evaluate((root) => {
    const statuses = {
      NEW: "Uusi",
      IN_PROGRESS: "Työn alla",
      PENDING_REVIEW: "Tarkastettavana",
      RETURNED: "Palautettu korjattavaksi",
      APPROVED: "Hyväksytty",
      CANCELLED: "Peruttu",
    };
    const lum = (color: string) =>
      color
        .match(/\d+/g)!
        .slice(0, 3)
        .map(Number)
        .map((n) => {
          const v = n / 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        })
        .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    return Object.entries(statuses).map(([status, text]) => {
      const badge = document.createElement("span");
      badge.className = "work-status status-" + status;
      badge.textContent = text;
      root.append(badge);
      const style = getComputedStyle(badge),
        fg = lum(style.color),
        bg = lum(style.backgroundColor);
      const result = {
        status,
        text: badge.textContent,
        contrast: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05),
      };
      badge.remove();
      return result;
    });
  });
  for (const sample of samples) {
    expect(sample.text).toBeTruthy();
    expect(sample.contrast, sample.status).toBeGreaterThanOrEqual(4.5);
  }
});

test("employee forms recover unfinished text and late success cannot clear newer input after navigation", async ({
  page,
}) => {
  await login(page, "admin");
  await page.getByRole("button", { name: "Työntekijät", exact: true }).click();
  const creation = page.locator(".access-employees>form");
  await creation
    .getByLabel("Nimi", { exact: true })
    .fill("Keskeneräinen työntekijä");
  await creation
    .getByLabel("Sähköposti", { exact: true })
    .fill("unfinished@example.test");
  await page.getByRole("button", { name: "Etusivu", exact: true }).click();
  await page.getByRole("button", { name: "Työntekijät", exact: true }).click();
  await expect(creation.getByLabel("Nimi", { exact: true })).toHaveValue(
    "Keskeneräinen työntekijä",
  );
  const employee = page
    .locator(".access-user-list li")
    .filter({ hasText: "employee@example.test" });
  await employee
    .getByRole("button", { name: "Muokkaa nimeä", exact: true })
    .click();
  await employee
    .getByLabel("Näyttönimi", { exact: true })
    .fill("Jari keskeneräinen");
  await page.reload();
  await page.getByRole("button", { name: "Työntekijät", exact: true }).click();
  await expect(creation.getByLabel("Sähköposti", { exact: true })).toHaveValue(
    "unfinished@example.test",
  );
  await expect(employee.getByLabel("Näyttönimi", { exact: true })).toHaveValue(
    "Jari keskeneräinen",
  );
  await expect(page.locator(".access-user-list")).not.toContainText(
    "unfinished@example.test",
  );
  let releaseName!: () => void;
  const nameGate = new Promise<void>((resolve) => {
    releaseName = resolve;
  });
  await page.route("**/employees/action", async (route) => {
    await nameGate;
    await route.continue();
  });
  try {
    const sent = page.waitForRequest((request) =>
      request.url().endsWith("/employees/action"),
    );
    await employee
      .getByRole("button", { name: "Tallenna nimi", exact: true })
      .click();
    await sent;
    await page.getByRole("button", { name: "Etusivu", exact: true }).click();
    await page
      .getByRole("button", { name: "Työntekijät", exact: true })
      .click();
    await employee
      .getByLabel("Näyttönimi", { exact: true })
      .fill("Uudempi nimiluonnos");
    const completed = page.waitForResponse(
      (response) =>
        response.url().endsWith("/employees") &&
        response.request().method() === "GET",
    );
    releaseName();
    await completed;
    await expect(
      employee.getByLabel("Näyttönimi", { exact: true }),
    ).toHaveValue("Uudempi nimiluonnos");
  } finally {
    releaseName();
  }
  let releaseCreate!: () => void;
  const createGate = new Promise<void>((resolve) => {
    releaseCreate = resolve;
  });
  await page.route("**/employees", async (route) => {
    if (route.request().method() === "POST") await createGate;
    await route.continue();
  });
  try {
    const sent = page.waitForRequest(
      (request) =>
        request.url().endsWith("/employees") && request.method() === "POST",
    );
    await creation
      .getByRole("button", { name: "Luo työntekijä", exact: true })
      .click();
    await sent;
    await page.getByRole("button", { name: "Etusivu", exact: true }).click();
    await page
      .getByRole("button", { name: "Työntekijät", exact: true })
      .click();
    await creation
      .getByLabel("Nimi", { exact: true })
      .fill("Uudempi työntekijäluonnos");
    await creation
      .getByLabel("Sähköposti", { exact: true })
      .fill("newer-unfinished@example.test");
    const completed = page.waitForResponse(
      (response) =>
        response.url().endsWith("/employees") &&
        response.request().method() === "GET",
    );
    releaseCreate();
    await completed;
    await expect(creation.getByLabel("Nimi", { exact: true })).toHaveValue(
      "Uudempi työntekijäluonnos",
    );
    await expect(
      creation.getByLabel("Sähköposti", { exact: true }),
    ).toHaveValue("newer-unfinished@example.test");
  } finally {
    releaseCreate();
  }
});
