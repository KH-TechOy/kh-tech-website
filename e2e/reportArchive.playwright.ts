import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
const base = "/kh-tech-website/",
  id = "KHT-20261112-C0FFEE",
  password = "Emulator-only_42!";
const screenshots = ".playwright-artifacts/report20c/screenshots";
mkdirSync(screenshots, { recursive: true });
test.beforeEach(async ({ request }) => {
  expect((await request.post("http://127.0.0.1:8788/__reset")).ok()).toBe(true);
});
async function api(
  request: APIRequestContext,
  uid: string,
  data: object,
  path = "/work",
) {
  const auth = await request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator",
    {
      data: { email: uid + "@example.test", password, returnSecureToken: true },
    },
  );
  const response = await request.post("http://127.0.0.1:8788" + path, {
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
async function fixture(request: APIRequestContext, pending = false) {
  let r = (
    await api(request, "admin", {
      action: "createOrder",
      id,
      requestId: crypto.randomUUID(),
      customer: "C-vaiheen testiasiakas",
      address: "Testikatu 1",
      description: "Liitoksen korjaus",
      assignedTo: ["employee"],
      schedule: "",
      quotationReference: "",
    })
  ).report;
  r = (
    await api(request, "admin", {
      action: "save",
      id,
      revision: r.revision,
      requestId: crypto.randomUUID(),
      form: {
        ...r.form,
        hours: "2",
        materials: [
          { name: "Liitin", quantity: "2", unit: "kpl", unitPriceCents: 2500 },
        ],
      },
      billing: {
        hourRateCents: 10000,
        travelRateCents: 100,
        travelKm: 10,
        otherCents: 1600,
        otherDescription: "Testikulut",
        vatBasisPoints: 2550,
      },
      operations: {
        travelKm: 10,
        otherCents: 1600,
        otherDescription: "Testikulut",
      },
    })
  ).report;
  if (pending)
    r = (
      await api(request, "employee", {
        action: "transition",
        id,
        revision: r.revision,
        requestId: crypto.randomUUID(),
        status: "PENDING_REVIEW",
      })
    ).report;
  return r;
}
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
async function open(page: Page) {
  await page
    .getByRole("button", { name: "Avaa raportti", exact: true })
    .click();
  await expect(page.locator("input[name=customer]")).toHaveValue(
    "C-vaiheen testiasiakas",
  );
}
async function capture(page: Page, name: string) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${screenshots}/${test.info().project.name}-${name}.png`,
    fullPage: true,
  });
  await page
    .locator(
      name === "employee-signature" ? ".signature-pad" : "[data-workflow=top]",
    )
    .screenshot({
      path: `${screenshots}/${test.info().project.name}-${name}-panel.png`,
    });
}
async function draw(page: Page, kind: "mouse" | "touch" | "pen") {
  const pad = page.locator(".signature-surface");
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  const x = box.x + box.width * 0.18,
    y = box.y + box.height * 0.5;
  if (kind === "mouse") {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + box.width * 0.35, y - box.height * 0.18, {
      steps: 12,
    });
    await page.mouse.up();
  } else {
    const cdp = await page.context().newCDPSession(page);
    if (kind === "touch") {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });
      for (let i = 1; i <= 12; i++)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            {
              x: x + box.width * 0.025 * i,
              y: y + Math.sin(i) * box.height * 0.12,
            },
          ],
        });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } else {
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x,
        y,
        button: "left",
        buttons: 1,
        clickCount: 1,
        pointerType: "pen",
      });
      for (let i = 1; i <= 12; i++)
        await cdp.send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: x + box.width * 0.025 * i,
          y: y + Math.sin(i) * box.height * 0.12,
          button: "left",
          buttons: 1,
          pointerType: "pen",
        });
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: x + box.width * 0.3,
        y,
        button: "left",
        buttons: 0,
        pointerType: "pen",
      });
    }
    await cdp.detach();
  }
}
test("mouse, touch and pen signature, explicit replacement, cloud restoration, operational edits and financial privacy", async ({
  page,
  request,
}) => {
  await fixture(request);
  await login(page, "employee");
  await open(page);
  await expect(
    page.getByRole("button", { name: "Esikatsele raportti", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Luo ja lataa PDF", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".billing-summary")).toHaveCount(0);
  await page.getByLabel("Matka (km)", { exact: true }).fill("10");
  await page.getByLabel("Muut kulut (€)", { exact: true }).fill("16");
  await page
    .getByLabel("Muiden kulujen selite", { exact: true })
    .fill("Testikulut");
  await draw(page, "mouse");
  await expect(page.locator(".signature-surface g path")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Peru viimeinen viiva", exact: true })
    .click();
  await expect(page.locator(".signature-surface g path")).toHaveCount(0);
  await draw(page, "touch");
  await draw(page, "pen");
  await expect(page.locator(".signature-surface g path")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Tyhjennä allekirjoitus", exact: true })
    .click();
  await draw(page, "mouse");
  const path = await page
    .locator(".signature-surface g path")
    .getAttribute("d");
  await page
    .getByRole("button", { name: "Vahvista allekirjoitus", exact: true })
    .click();
  await expect(page.locator(".signature-pad")).toContainText(
    "Allekirjoitus tallennettu",
  );
  await draw(page, "mouse");
  await expect(page.locator(".signature-surface g path")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Tallenna luonnos", exact: true })
    .click();
  await expect(page.locator(".cloud-toolbar")).toContainText(
    "Tekstiluonnos tallennettu pilveen",
  );
  const loaded = (await api(request, "employee", { action: "load", id }))
    .report;
  expect(loaded).not.toHaveProperty("billing");
  expect(loaded.signature.strokes).toHaveLength(1);
  expect(loaded.operations.otherCents).toBe(1600);
  await page.reload();
  await open(page);
  await expect(page.locator(".signature-surface g path")).toHaveAttribute(
    "d",
    path!,
  );
  const resize =
    test.info().project.name === "mobile"
      ? { width: 844, height: 390 }
      : { width: 600, height: 900 };
  await page.setViewportSize(resize);
  await expect(page.locator(".signature-surface g path")).toHaveAttribute(
    "d",
    path!,
  );
  await page.setViewportSize(test.info().project.use.viewport!);
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Korvaa allekirjoitus", exact: true })
    .click();
  await expect(page.locator(".signature-surface g path")).toHaveCount(1);
  await page.locator(".signature-pad").scrollIntoViewIfNeeded();
  await capture(page, "employee-signature");
  await page
    .locator("[data-workflow=bottom]")
    .getByRole("button", { name: "Lähetä tarkastettavaksi", exact: true })
    .click();
  await expect(page.locator(".cloud-toolbar")).toContainText("Tarkastettavana");
  // The browser's only Apps Script call is intercepted and executed in the isolated MailApp VM.
  let sentBase64 = "";
  await page.route(
    "https://script.google.com/macros/s/local-report-relay-fixture/exec",
    async (route) => {
      sentBase64 = route.request().postDataJSON().photos[0];
      const r = await request.post("http://127.0.0.1:8788/__photo-relay", {
        data: route.request().postDataJSON(),
      });
      await route.fulfill({
        status: 200,
        body: await r.text(),
        contentType: "text/plain",
      });
    },
  );
  await page
    .getByLabel("Lisää paikallisia toimituskuvia")
    .setInputFiles("e2e/fixtures/before.jpg");
  await page
    .getByRole("button", { name: "Lähetä paikalliset työkuvat", exact: true })
    .click();
  await expect(page.locator(".photo-delivery")).toContainText(
    "Hyväksytty lähetykseen",
  );
  await expect(
    page.getByRole("link", { name: "Lataa toimitusversio 1", exact: true }),
  ).toHaveAttribute("href", "data:image/jpeg;base64," + sentBase64);
});
test("Admin approval locks exact financial snapshot; archive acceptance, file verification, deletion and portable import", async ({
  page,
  request,
}) => {
  await fixture(request, true);
  await login(page, "admin");
  await open(page);
  await expect(page.locator(".billing-totals")).toContainText("346,38");
  await page
    .getByRole("button", { name: "Esikatsele raportti", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("346,38");
  await page.keyboard.press("Escape");
  page.on("dialog", (d) => d.accept());
  await page
    .locator("[data-workflow=top]")
    .getByRole("button", { name: "Hyväksy raportti", exact: true })
    .click();
  await expect(page.locator(".cloud-toolbar")).toContainText("Hyväksytty");
  await expect(page.locator("input[name=customer]")).toBeDisabled();
  const top = page.locator("[data-workflow=top]");
  await expect(top.locator(".archive-preservation")).toContainText(
    "Arkistoa ei ole vahvistettu",
  );
  await expect(top.locator(".retention-eligibility")).toContainText(
    "Poisto estetty: PDF- ja .khtreport-kopioita ei ole itsenäisesti varmennettu",
  );
  await expect(
    top.getByRole("button", { name: "Lataa lopullinen PDF", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Luo ja lataa PDF", exact: true }),
  ).toHaveCount(0);
  let waiting = page.waitForEvent("download");
  await top
    .getByRole("button", { name: "Lataa lopullinen PDF", exact: true })
    .click();
  const pdf = await waiting;
  const pdfPath = (await pdf.path())!;
  expect(readFileSync(pdfPath).subarray(0, 4).toString()).toBe("%PDF");
  waiting = page.waitForEvent("download");
  await top
    .getByRole("button", { name: "Lataa .khtreport", exact: true })
    .click();
  const portable = await waiting;
  const portablePath = (await portable.path())!;
  const contents = readFileSync(portablePath, "utf8");
  expect(JSON.parse(contents).totals).toMatchObject({
    net: 27600,
    vat: 7038,
    gross: 34638,
  });
  await top
    .getByText("Arkistointi ja vastaanoton varmennus", { exact: true })
    .click();
  await top
    .getByRole("button", { name: "Lähetä arkistosähköposti", exact: true })
    .click();
  await expect(top).toContainText("Hyväksytty lähetykseen");
  await expect(
    top.getByRole("button", {
      name: "Poista arkistoitu raportti pilvestä",
      exact: true,
    }),
  ).toBeDisabled();
  await top
    .getByLabel("Vastaanotetut PDF- ja .khtreport-tiedostot")
    .setInputFiles([
      {
        name: pdf.suggestedFilename(),
        mimeType: "application/pdf",
        buffer: readFileSync(pdfPath),
      },
      {
        name: portable.suggestedFilename(),
        mimeType: "application/vnd.kh-tech.report+json",
        buffer: Buffer.from(contents),
      },
    ]);
  await top.getByLabel("Arkiston sijainti").selectOption("download");
  await top.getByLabel("Kirjoita vahvistukseksi raporttitunnus " + id).fill(id);
  await top.getByRole("checkbox").check();
  await top
    .getByRole("button", { name: "Vahvista arkiston vastaanotto", exact: true })
    .click();
  await expect(top).toContainText("Arkiston vastaanotto varmennettu");
  await expect(top.locator(".archive-preservation")).toContainText(
    "Raportti säilyy Firestoressa",
  );
  await expect(top.locator(".retention-eligibility")).toContainText(
    "kelpoinen erikseen vahvistettavaan Admin-poistoon",
  );
  await expect(
    page.locator("[data-workflow=bottom] .retention-eligibility"),
  ).toContainText("kelpoinen erikseen vahvistettavaan Admin-poistoon");
  expect(
    (await api(request, "admin", { action: "load", id })).report.status,
  ).toBe("APPROVED");
  await capture(page, "admin-archive-confirmed");
  await top
    .getByRole("button", {
      name: "Poista arkistoitu raportti pilvestä",
      exact: true,
    })
    .click();
  await expect(page.locator(".work-heading")).toBeVisible();
  await expect(page.locator(".work-cards>li")).toHaveCount(0);
  await page.locator(".archive-import>summary").click();
  await page.getByLabel("Tuo .khtreport", { exact: true }).setInputFiles({
    name: "test.khtreport",
    mimeType: "application/json",
    buffer: Buffer.from(contents),
  });
  await expect(page.locator(".archive-import")).toContainText("346,38");
  await page
    .getByRole("button", {
      name: "Luo tuodusta uusi muokattava kopio",
      exact: true,
    })
    .click();
  await expect(page.locator(".work-cards>li")).toHaveCount(1);
});
