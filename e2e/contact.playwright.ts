import { test, expect, type Page, type Route } from "@playwright/test";
import { mkdirSync } from "node:fs";
const base = process.env.VITE_BASE_PATH || "/";
const ref = "KHT-20261110-B5E8D031A942";
const api = "https://contact-api.example.test/contact";
// Browser-test fixture only. No test mode, key or bypass exists in application code.
const fixture = `(() => {
 const widgets=new Map(); let serial=0;
 window.__challengeMode='auto'; window.__renders=[]; window.__executes=[]; window.__removed=[];
 window.__complete=()=>{const last=[...widgets.values()].at(-1);if(last)last.options.callback('fixture-'+crypto.randomUUID())};
 window.turnstile={
  render(el,options){const id='widget-'+(++serial);widgets.set(id,{el,options});window.__renders.push({id,options});return id},
  execute(id){const widget=widgets.get(id);window.__executes.push(id);if(!widget)throw Error('removed widget');const options=widget.options;
   if(window.__challengeMode==='expired'){options['expired-callback']();return}
   if(window.__challengeMode==='failed'){options['error-callback']('test');return}
   if(window.__challengeMode==='hold')return;
   if(window.__challengeMode==='interactive'){
    options['before-interactive-callback']();const panel=document.createElement('div');panel.style.cssText='width:150px;min-height:140px;border:1px solid #b8c7ce;padding:16px;box-sizing:border-box';
    const button=document.createElement('button');button.type='button';button.textContent='Vahvista (testivastine)';button.onclick=()=>options.callback('fixture-'+crypto.randomUUID());panel.appendChild(button);widget.el.appendChild(panel);return;
   }
   queueMicrotask(()=>options.callback('fixture-'+crypto.randomUUID()));
  },
  remove(id){const widget=widgets.get(id);widget?.el.replaceChildren();widgets.delete(id);window.__removed.push(id)}
 };
})();`;
async function fill(page: Page) {
  await page.goto(base + "yhteystiedot/?palvelu=huolto");
  await page.locator("input[name=name]").fill("Aino Testaaja");
  await page.locator("input[name=phone]").fill("0401234567");
  await page.locator("textarea[name=description]").fill("Synteettinen testipyyntö. Ei oikea asiakastyö.");
}
async function accept(route: Route) { await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: "sent", reference: ref }) }); }
async function screenshot(page: Page, name: string) {
  const dir = `${process.env.CONTACT_SCREENSHOTS || "docs/contact31-screenshots"}/${base === "/" ? "root" : "pages"}`;
  mkdirSync(dir, { recursive: true });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: `${dir}/${test.info().project.name}-${name}.png`, fullPage: true, animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
let pageErrors: string[];
test.beforeEach(async ({ page }) => {
  pageErrors = []; page.on("pageerror", error => pageErrors.push(error.message));
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", route => route.fulfill({ contentType: "application/javascript", body: fixture }));
  await page.emulateMedia({ reducedMotion: "reduce" });
});
test.afterEach(() => expect(pageErrors).toEqual([]));

test("one submit starts Managed verification, locks duplicates, displays accepted reference and copies it with Clipboard API", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const bodies: any[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(api, async route => { bodies.push(route.request().postDataJSON()); await gate; await accept(route); });
  await fill(page);
  await expect(page.locator(".contact-form > .notice")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tee turvatarkistus", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => !!window.turnstile)).toBe(false);
  await screenshot(page, "ready-form");
  // Hold execution before token generation to inspect the verification stage.
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", route => route.fulfill({ contentType: "application/javascript", body: fixture + ";window.__challengeMode='hold';" }));
  await page.getByRole("button", { name: "Lähetä pyyntö", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__executes?.length)).toBe(1);
  await expect(page.getByRole("button", { name: "Varmistetaan lähetystä…", exact: true })).toBeDisabled();
  await page.locator(".contact-form").evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit(); });
  expect(bodies).toHaveLength(0);
  await page.evaluate(() => (window as any).__complete());
  await expect(page.getByRole("button", { name: "Lähetetään…", exact: true })).toBeDisabled();
  await expect.poll(() => bodies.length).toBe(1); release();
  await expect(page.locator(".contact-confirmation")).toBeFocused();
  await expect(page.getByRole("heading", { name: "Kiitos yhteydenotostasi!", exact: true })).toBeVisible();
  await expect(page.locator(".contact-confirmation")).toContainText("Pyyntösi on vastaanotettu ja välitetty KH-Techille.");
  await expect(page.locator(".contact-reference")).toHaveText(ref);
  expect(bodies[0].data.method).toBe("phone"); expect(bodies[0].data.email).toBe("");
  expect(bodies[0].data.service).toBe("LVI-huolto"); expect(bodies[0].data.consent).toBeUndefined();
  const options = await page.evaluate(() => { const o=(window as any).__renders[0].options; return { execution:o.execution, appearance:o.appearance, action:o.action, retry:o.retry }; });
  expect(options).toEqual({ execution: "execute", appearance: "interaction-only", action: "contact", retry: "never" });
  await page.bringToFront(); await page.getByRole("button", { name: "Kopioi tunnus", exact: true }).click();
  await expect(page.locator("#contact-copy-feedback")).toHaveText("Tunnus kopioitu.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(ref);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await page.evaluate(() => sessionStorage.getItem("kht-contact-pending"))).not.toContain("Aino");
  await screenshot(page, "accepted-and-copied-fixture");
  await page.getByRole("button", { name: "Uusi yhteydenotto", exact: true }).click();
  await expect(page.locator("input[name=name]")).toBeEnabled(); await expect(page.locator("input[name=name]")).toHaveValue("");
  expect(await page.evaluate(() => sessionStorage.getItem("kht-contact-pending"))).toBeNull();
  expect(bodies).toHaveLength(1);
});

test("phone, email and both require the right inline fields before any challenge or POST", async ({ page }) => {
  const bodies: any[] = [];
  await page.route(api, async route => { bodies.push(route.request().postDataJSON()); await accept(route); });
  for (const method of ["phone", "email", "both"]) {
    await fill(page); await page.locator('select[name="method"]').selectOption(method);
    await page.locator("input[name=phone]").fill("");
    await page.getByRole("button", { name: "Lähetä pyyntö", exact: true }).click();
    await expect(page.locator(".error-summary")).toBeFocused();
    expect(await page.evaluate(() => !!window.turnstile)).toBe(false);
    if (method !== "email") {
      await expect(page.locator("#error-phone")).toHaveText("Anna puhelinnumerosi, jotta voimme soittaa sinulle.");
      await expect(page.locator("input[name=phone]")).toHaveAttribute("required", "");
      await page.locator("input[name=phone]").fill("-----");
      await expect(page.locator("#error-phone")).toHaveText("Tarkista puhelinnumero.");
      await page.locator("input[name=phone]").fill("0401234567");
    } else await expect(page.locator("input[name=phone]")).not.toHaveAttribute("required");
    if (method !== "phone") {
      await expect(page.locator("#error-email")).toHaveText("Anna sähköpostiosoitteesi, jotta voimme vastata sinulle.");
      await expect(page.locator("input[name=email]")).toHaveAttribute("required", "");
      await page.locator("input[name=email]").fill("bad");
      await expect(page.locator("#error-email")).toHaveText("Tarkista sähköpostiosoite.");
      await page.locator("input[name=email]").fill("aino@example.test");
    } else await expect(page.locator("input[name=email]")).not.toHaveAttribute("required");
    await page.getByRole("button", { name: "Lähetä pyyntö", exact: true }).click();
    await expect(page.locator(".contact-confirmation")).toContainText(ref);
    expect(bodies.at(-1).data.method).toBe(method);
    await page.getByRole("button", { name: "Uusi yhteydenotto", exact: true }).click();
  }
  expect(bodies).toHaveLength(3);
  expect(new Set(bodies.map(b => b.token)).size).toBe(3);
});

test("clipboard denial produces accessible feedback without falsely reporting copying", async ({ page }) => {
  await page.route(api, accept); await fill(page);
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new DOMException("Denied", "NotAllowedError")) } }));
  await page.getByRole("button", { name: "Lähetä pyyntö", exact: true }).click();
  await page.getByRole("button", { name: "Kopioi tunnus", exact: true }).click();
  await expect(page.locator("#contact-copy-feedback")).toContainText("Kopiointi ei onnistunut.");
  await expect(page.locator("#contact-copy-feedback")).toHaveAttribute("role", "status");
  await expect(page.locator(".contact-reference")).toHaveText(ref);
  await expect(page.getByRole("button", { name: "Kopioi tunnus", exact: true })).toBeEnabled();
});

test("Managed interactive challenge appears automatically and fits the form", async ({ page }) => {
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", route => route.fulfill({ contentType: "application/javascript", body: fixture + ";window.__challengeMode='interactive';" }));
  await page.route(api, accept); await fill(page);
  await page.getByRole("button", { name: "Lähetä pyyntö", exact: true }).click();
  await expect(page.locator(".contact-challenge")).toContainText("Vahvista lähetys alla olevalla tarkistuksella.");
  await expect(page.locator('[aria-label="Lähetyksen vahvistus"]')).toBeFocused();
  await screenshot(page, "interactive-challenge-fixture");
  await page.getByRole("button", { name: "Vahvista (testivastine)", exact: true }).click();
  await expect(page.locator(".contact-confirmation")).toContainText(ref);
});

test("expired and failed challenges can be retried; consumed backend tokens are discarded", async ({ page }) => {
  const tokens: string[] = [];
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", route => route.fulfill({ contentType: "application/javascript", body: fixture + ";window.__challengeMode='expired';" }));
  await page.route(api, async route => {
    tokens.push(route.request().postDataJSON().token);
    if (tokens.length === 1) await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "challenge" }) });
    else await accept(route);
  });
  await fill(page); await page.getByRole("button", { name: "Lähetä pyyntö", exact: true }).click();
  await expect(page.locator(".form-status")).toContainText("tarkistus vanheni"); expect(tokens).toHaveLength(0);
  expect(await page.evaluate(() => sessionStorage.getItem("kht-contact-pending"))).toBeNull();
  await page.evaluate(() => (window as any).__challengeMode="failed");
  await page.getByRole("button", { name: "Yritä uudelleen", exact: true }).click();
  await expect(page.locator(".form-status")).toContainText("tarkistus ei onnistunut");
  await page.evaluate(() => (window as any).__challengeMode="auto");
  await page.getByRole("button", { name: "Yritä uudelleen", exact: true }).click();
  await expect.poll(() => tokens.length).toBe(1);
  await expect(page.locator("input[name=name]")).toBeEnabled();
  await page.getByRole("button", { name: "Lähetä pyyntö", exact: true }).click();
  await expect(page.locator(".contact-confirmation")).toContainText(ref);
  expect(new Set(tokens).size).toBe(2);
  expect(await page.evaluate(() => (window as any).__removed.length)).toBeGreaterThanOrEqual(4);
});

test("unavailable challenge script fails safely and a fresh load can succeed", async ({ page }) => {
  let scriptCalls = 0, posts = 0;
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", async route => {
    scriptCalls++; if (scriptCalls === 1) await route.abort("failed"); else await route.fulfill({ contentType: "application/javascript", body: fixture });
  });
  await page.route(api, async route => { posts++; await accept(route); });
  await fill(page); await page.getByRole("button", { name: "Lähetä pyyntö", exact: true }).click();
  await expect(page.locator(".form-status")).toContainText("tarkistus ei onnistunut"); expect(posts).toBe(0);
  await page.getByRole("button", { name: "Yritä uudelleen", exact: true }).click();
  await expect(page.locator(".contact-confirmation")).toContainText(ref); expect(posts).toBe(1); expect(scriptCalls).toBe(2);
});

test("timeout and a stale callback cannot release the next verification attempt", async ({ page }) => {
  await page.clock.install();
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", route => route.fulfill({ contentType: "application/javascript", body: fixture + ";window.__challengeMode='hold';" }));
  const tokens: string[] = [];
  await page.route(api, async route => { tokens.push(route.request().postDataJSON().token); await accept(route); });
  await fill(page); await page.getByRole("button", { name: "Lähetä pyyntö", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__executes?.length)).toBe(1);
  await page.clock.fastForward(120_001);
  await expect(page.locator(".form-status")).toContainText("tarkistus vanheni");
  await page.getByRole("button", { name: "Yritä uudelleen", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__executes?.length)).toBe(2);
  await page.evaluate(() => (window as any).__renders[0].options.callback("stale-token"));
  expect(tokens).toHaveLength(0);
  await expect(page.getByRole("button", { name: "Varmistetaan lähetystä…", exact: true })).toBeDisabled();
  await page.evaluate(() => (window as any).__complete());
  await expect(page.locator(".contact-confirmation")).toContainText(ref); expect(tokens).toHaveLength(1); expect(tokens[0]).not.toBe("stale-token");
});

test("lost response survives reload; status recovery uses a fresh challenge without resending the message", async ({ page }) => {
  const bodies: any[] = [];
  await page.route(api + "**", async route => { bodies.push(route.request().postDataJSON()); if (route.request().url() === api) await route.abort("failed"); else await accept(route); });
  await fill(page); await page.getByRole("button", { name: "Lähetä pyyntö", exact: true }).click();
  await expect(page.locator(".form-status")).toContainText("Lähetystä ei voitu vahvistaa");
  await expect(page.locator(".contact-confirmation")).toHaveCount(0);
  await page.reload(); await expect(page.locator(".contact-recovery")).toBeVisible();
  await page.getByRole("button", { name: "Tarkista lähetyksen tila", exact: true }).click();
  await expect(page.locator(".contact-confirmation")).toContainText(ref);
  expect(bodies).toHaveLength(2); expect(bodies[0].requestKey).toBe(bodies[1].requestKey); expect(bodies[1].data).toBeUndefined(); expect(bodies[1].token).not.toBe(bodies[0].token);
});

test("rate, server, malformed and uncertain responses do not display success or erase entered data", async ({ page }) => {
  let response: object = { error: "rate_limited" }, code = 429;
  await page.route(api + "**", route => route.fulfill({ status: code, contentType: "application/json", body: JSON.stringify(response) }));
  await fill(page); await page.getByRole("button", { name: "Lähetä pyyntö", exact: true }).click();
  await expect(page.locator(".form-status")).toContainText("10 minuuttia");
  await expect(page.locator("input[name=name]")).toHaveValue("Aino Testaaja"); await expect(page.locator("input[name=name]")).toBeEnabled();
  code=503; response={error:"unavailable"}; await page.getByRole("button", {name:"Lähetä pyyntö",exact:true}).click();
  await expect(page.locator(".form-status")).toContainText("ei ole käytettävissä");
  code=200; response={accepted:true}; await page.getByRole("button", {name:"Lähetä pyyntö",exact:true}).click();
  await expect(page.locator(".form-status")).toContainText("ei voitu vahvistaa"); await expect(page.locator(".contact-confirmation")).toHaveCount(0);
  code=202; response={state:"unknown",reference:ref}; await page.getByRole("button", {name:"Tarkista lähetyksen tila",exact:true}).click();
  await expect(page.locator(".contact-recovery")).toContainText(ref); await expect(page.locator(".contact-confirmation")).toHaveCount(0);
});

test("privacy describes automatic verification and both required channels without exposing recipient", async ({ page }) => {
  await page.goto(base + "tietosuoja/");
  await expect(page.locator(".privacy-section")).toHaveCount(19);
  await expect(page.locator("#tallennus")).toContainText("lähetyksen tai lähetyksen tilan tarkistuksen yhteydessä");
  await expect(page.locator("#tarpeellisuus")).toContainText("molemmat");
  expect(await page.locator("body").innerText()).not.toContain("notification@example.test");
  await expect(page.locator(`a[href*="/report/"]`)).toHaveCount(0);
});
