import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const base = "/kh-tech-website/",
  id = "KHT-20261114-D0C0FE";
const folder = ".playwright-artifacts/report20d/screenshots";
mkdirSync(folder, { recursive: true });
async function api(
  request: APIRequestContext,
  data: object,
  path = "/work",
  uid = "admin",
) {
  const auth = await request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator",
    {
      data: {
        email: uid + "@example.test",
        password: "Emulator-only_42!",
        returnSecureToken: true,
      },
    },
  );
  const r = await request.post("http://127.0.0.1:8788" + path, {
    headers: {
      Origin: "http://127.0.0.1:5188",
      Authorization: "Bearer " + (await auth.json()).idToken,
    },
    data,
  });
  expect(r.ok(), await r.text()).toBe(true);
  return r.json();
}
async function login(page: Page,uid='admin',navigate=true) {
  if(navigate)await page.goto(base + "report/");
  await page
    .getByLabel("Sähköposti", { exact: true })
    .fill(uid+'@example.test');
  await page.getByLabel("Salasana", { exact: true }).fill("Emulator-only_42!");
  await page
    .getByRole("button", { name: "Kirjaudu sisään", exact: true })
    .click();
  await expect(page.locator(".access-dashboard")).toBeVisible();
  await expect(page.locator('.access-retention>summary')).toHaveText('Tallennus ja tietosuoja');
}
async function capture(page: Page, name: string) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: folder + "/" + test.info().project.name + "-" + name + ".png",
    fullPage: true,
  });
}
test.beforeEach(async ({ request }) => {
  expect((await request.post("http://127.0.0.1:8788/__reset")).ok()).toBe(true);
});
test('management report selection is cleared on account change and never selects another users private report',async({page,request})=>{
  await api(request,{action:'createOrder',id,requestId:crypto.randomUUID(),customer:'Ylläpitäjän yksityinen testityö',address:'Testikatu 1',description:'Testityö',assignedTo:['admin'],schedule:'',quotationReference:''});
  await login(page);await page.getByRole('button',{name:'Hallinta',exact:true}).click();await page.getByRole('button',{name:'Näytä tulokset',exact:true}).click();await page.locator('.management-list>li').filter({hasText:'Ylläpitäjän yksityinen testityö'}).getByRole('button',{name:'Avaa raportti',exact:true}).click();await expect(page.locator('input[name=customer]')).toHaveValue('Ylläpitäjän yksityinen testityö');
  await page.getByRole('button',{name:'Kirjaudu ulos',exact:true}).click();await expect(page.locator('.access-login')).toBeVisible();await login(page,'employee',false);await page.getByRole('button',{name:'Raporttieditori',exact:true}).click();await expect(page.locator('input[name=customer]')).toBeEnabled();await expect(page.locator('input[name=customer]')).toHaveValue('');await expect(page.locator('.work-space')).not.toContainText('Ylläpitäjän yksityinen testityö');
});
test("Report D focus, photo placement, summary exports, Admin quotation conversion and retention are usable without overflow", async ({
  page,
  request,
}) => {
  const created = (
    await api(request, {
      action: "createOrder",
      id,
      requestId: crypto.randomUUID(),
      customer: "D-testiasiakas",
      address: "Testikatu 1",
      description: "Testityö",
      assignedTo: ["employee"],
      schedule: "",
      quotationReference: "",
    })
  ).report;
  await api(request, {
    action: "save",
    id,
    revision: created.revision,
    requestId: crypto.randomUUID(),
    form: { ...created.form, hours: "2" },
    billing: {
      hourRateCents: 10000,
      travelKm: 0,
      travelRateCents: 0,
      otherCents: 0,
      otherDescription: "",
      vatBasisPoints: 2550,
    },
  });
  await login(page);
  await page
    .getByRole("button", { name: "Avaa raportti", exact: true })
    .click();
  await expect(page.locator("input[name=customer]")).toHaveValue(
    "D-testiasiakas",
  );
  const input = page.getByRole("combobox", {
    name: "Hae materiaalia luettelosta",
  });
  await input.focus();
  const ring = await input.evaluate((el) => ({
    self: getComputedStyle(el).outlineStyle,
    parent: getComputedStyle(el.parentElement!).outlineStyle,
  }));
  expect(ring.self).toBe("none");
  expect(ring.parent).toBe("solid");
  const layout = await page.locator(".photo-delivery").evaluate((el) => {
    const workspace = document.querySelector(".report-workspace")!;
    const p = el.getBoundingClientRect(),
      w = workspace.getBoundingClientRect();
    return {
      inside: workspace.contains(el),
      below: p.top >= w.bottom - 1,
      width: p.width,
      expected: w.width,
    };
  });
  expect(layout.inside).toBe(false);
  expect(layout.below).toBe(true);
  expect(Math.abs(layout.width - layout.expected)).toBeLessThan(3);
  await page.locator(".photo-delivery").scrollIntoViewIfNeeded();
  await capture(page, "editor-photos");
  await input.scrollIntoViewIfNeeded();
  await input.focus();
  const box = (await page.locator(".catalog-search").boundingBox())!;
  await page.screenshot({
    path: folder + "/" + test.info().project.name + "-focus.png",
    clip: {
      x: box.x - 6,
      y: box.y - 6,
      width: box.width + 12,
      height: box.height + 12,
    },
  });
  await page.getByRole("button", { name: "Yhteenvedot", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Tila", exact: true })
    .selectOption("IN_PROGRESS");
  await page
    .getByRole("button", { name: "Näytä tulokset", exact: true })
    .click();
  await expect(page.locator(".summary-table")).toContainText(id);
  await expect(page.locator(".summary-totals")).toContainText("Töitä");
  await expect(page.locator(".summary-totals")).toContainText("251,00");
  await capture(page, "summary");
  const csv = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Vie Exceliin (CSV)", exact: true })
    .click();
  const csvFile = await csv;
  expect(csvFile.suggestedFilename()).toBe("kh-tech-yhteenveto.csv");
  expect(readFileSync((await csvFile.path())!, "utf8")).toContain("251,00");
  await page
    .getByRole("button", { name: "Esikatsele PDF", exact: true })
    .click();
  await expect(page.locator(".summary-preview iframe")).toBeVisible();
  await page
    .getByRole("button", { name: "Sulje esikatselu", exact: true })
    .click();
  await page.getByRole("button", { name: "Hallinta", exact: true }).click();
  await page
    .getByRole("button", { name: "Tarjouspyynnöt", exact: true })
    .click();
  await page
    .getByText("Tuo tarjouspyyntö sähköpostista", { exact: true })
    .click();
  for (const [label, value] of [
    ["CONTACT-pyyntötunnus", "KHT-20261114-ABCDEF123456"],
    ["Asiakkaan nimi", "Tarjousasiakas"],
    ["Sähköposti", "customer@example.test"],
    ["Työn kuvaus", "Koeputken korjaus"],
  ])
    await page
      .locator(".admin-management")
      .getByLabel(label, { exact: true })
      .fill(value);
  await page
    .getByRole("button", { name: "Tallenna tarjouspyyntö", exact: true })
    .click();
  await expect(page.locator(".management-list")).toContainText(
    "Tarjousasiakas",
  );
  await expect(page.locator('.management-list .work-status')).toHaveText('Uusi');
  await capture(page, "quotation");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Luo työtilaus", exact: true })
    .click();
  await expect(page.locator(".management-list")).toContainText(
    "Työtilaus luotu",
  );
  await page
    .getByRole("button", { name: "Säilytysasetukset", exact: true })
    .click();
  await page.getByLabel("Vähimmäissäilytys päivinä").fill("3650");
  await page
    .getByLabel("Perustelu", { exact: true })
    .fill("Synteettinen omistajan hyväksymä käytäntö");
  await page.locator(".admin-management input[type=checkbox]").check();
  await page
    .getByRole("button", { name: "Tallenna uusi käytäntö", exact: true })
    .click();
  await page.getByText("Käytäntöjen historia", { exact: true }).click();
  await expect(page.locator(".admin-management")).toContainText("3650 päivää");
  const checkLayout=await page.locator('.admin-management label.work-checkbox').evaluate(el=>({display:getComputedStyle(el).display,width:el.querySelector('input')!.getBoundingClientRect().width}));
  expect(checkLayout.display).toBe('flex');expect(checkLayout.width).toBeLessThanOrEqual(24);
  await capture(page, "retention");
});
test("unknown email outcome recovers through an auditable owner receipt, signature PDF remains available, and portable selection clears completely", async ({
  page,
  request,
}) => {
  let r = (
    await api(request, {
      action: "createOrder",
      id,
      requestId: crypto.randomUUID(),
      customer: "D-testiasiakas",
      address: "Testikatu 1",
      description: "Testityö",
      assignedTo: ["employee"],
      schedule: "",
      quotationReference: "",
    })
  ).report;
  r = (
    await api(request, {
      action: "save",
      id,
      revision: r.revision,
      requestId: crypto.randomUUID(),
      form: { ...r.form, hours: "2" },
      signature: {
        version: 1,
        strokes: [{ points: [1000, 4000, 2000, 2500, 4000, 5500, 7000, 3000] }],
        confirmedAt: new Date().toISOString(),
        recordedAt: new Date().toISOString(),
        context: { reportId: id, customer: r.form.customer, date: r.form.date },
      },
    })
  ).report;
  r = (
    await api(request, {
      action: "transition",
      id,
      revision: r.revision,
      requestId: crypto.randomUUID(),
      status: "PENDING_REVIEW",
    })
  ).report;
  r = (
    await api(request, {
      action: "transition",
      id,
      revision: r.revision,
      requestId: crypto.randomUUID(),
      status: "APPROVED",
      confirmedApproval: true,
    })
  ).report;
  expect(r.approval.pdfLayout).toBe(2);
  await login(page);
  await page
    .locator(".work-filters")
    .getByRole("combobox", { name: "Tila", exact: true })
    .selectOption("APPROVED");
  await page
    .locator(".work-cards")
    .getByRole("button", { name: "Avaa raportti", exact: true })
    .click();
  const top = page.locator("[data-workflow=top]");
  await top.getByText("Lataa arkistotiedostot", { exact: true }).click();
  let wait = page.waitForEvent("download");
  await top
    .getByRole("button", { name: "Lataa lopullinen PDF", exact: true })
    .click();
  const pdf = await wait,
    pdfBytes = readFileSync((await pdf.path())!);
  writeFileSync(
    ".playwright-artifacts/report20d/signature-" +
      test.info().project.name +
      ".pdf",
    pdfBytes,
  );
  wait = page.waitForEvent("download");
  await top
    .getByRole("button", { name: "Lataa .khtreport", exact: true })
    .click();
  const portable = await wait,
    portableBytes = readFileSync((await portable.path())!);
  await request.post("http://127.0.0.1:8788/__archive-offline");
  page.once("dialog", (d) => d.accept());
  await top
    .getByRole("button", { name: "Lähetä arkistoon", exact: true })
    .click();
  await expect(top).toContainText("Vaatii tarkistuksen");
  await expect(top).toContainText("R01");
  await expect(
    top.getByRole("button", { name: "Lähetä arkistoon", exact: true }),
  ).toBeDisabled();
  await top
    .locator("summary")
    .filter({ hasText: /^Merkitse arkistoiduksi$/ })
    .click();
  await top
    .getByLabel("Vastaanotetut PDF- ja .khtreport-tiedostot")
    .setInputFiles([
      { name: "original.pdf", mimeType: "application/pdf", buffer: pdfBytes },
      {
        name: "original.khtreport",
        mimeType: "application/json",
        buffer: portableBytes,
      },
    ]);
  await top.getByLabel("Kirjoita vahvistukseksi raporttitunnus " + id).fill(id);
  await top
    .getByLabel(
      "Varmistin molempien tiedostojen saatavuuden ja palautettavuuden.",
    )
    .check();
  await top
    .getByText("Käsin talletetun arkiston vahvistus", { exact: true })
    .click();
  await top
    .getByLabel("Vahvistuksen perustelu")
    .fill("Tarkistin ja tallensin alkuperäistiedostot yrityksen arkistoon");
  await top
    .getByRole("button", {
      name: "Vahvista käsin talletettu arkisto",
      exact: true,
    })
    .click();
  await expect(top).toContainText("Arkistoitu");
  await expect(top).toContainText("Sähköpostin tulos on vielä selvittämättä");
  await top.getByText("Säilytys ja poiston tarkistus", { exact: true }).click();
  await expect(
    top.getByRole("button", {
      name: "Poista arkistoitu raportti pilvestä",
      exact: true,
    }),
  ).toBeDisabled();
  await capture(page, "manual-receipt");
  await page.getByRole("button", { name: "Etusivu", exact: true }).click();
  await page.locator(".archive-import>summary").click();
  await page.getByLabel("Tuo .khtreport", { exact: true }).setInputFiles({
    name: "original.khtreport",
    mimeType: "application/json",
    buffer: portableBytes,
  });
  await expect(page.locator(".archive-import section")).toContainText(id);
  await page
    .getByRole("button", { name: "Tyhjennä valinta", exact: true })
    .click();
  await expect(page.locator(".archive-import section")).toHaveCount(0);
  expect(
    await page.getByLabel("Tuo .khtreport", { exact: true }).inputValue(),
  ).toBe("");
  await capture(page, "import-cleared");
});
