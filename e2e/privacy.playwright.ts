import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.env.VITE_BASE_PATH || "/";
const out = process.env.PRIVACY_SCREENSHOTS || "docs/website25-screenshots/final";
mkdirSync(out, { recursive: true });
let errors: string[];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
});
test.afterEach(() => expect(errors).toEqual([]));

test("privacy notice: nineteen topics, metadata, glass, keyboard anchors and readable images", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(base + "tietosuoja/");
  await expect(page.locator(".privacy-section")).toHaveCount(19);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page).toHaveTitle("Tietosuojaseloste | KH-Tech Oy");
  await expect(page.locator("html")).toHaveAttribute("lang", "fi");
  expect(await page.locator('link[rel="canonical"]').evaluate((link: HTMLLinkElement) => link.href)).toBe(new URL(base + "tietosuoja/", page.url()).href);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /henkilötietojasi/);
  await expect(page.locator('meta[name="robots"][content*=noindex]')).toHaveCount(0);
  for (const value of ["KH-Tech Oy", "3413645-9", "Laiturikatu 14 C 49, 08100 Lohja", "Tomi Honka", "tomi.honka@kh-tech.fi", "040 073 6199"])
    await expect(page.locator(".privacy-notice")).toContainText(value);
  await expect(page.locator(".privacy-notice")).not.toContainText(/esittelytilassa|TODO|\[yrityksen/);
  await expect(page.locator("#siirrot")).toContainText("ei ole vielä vahvistettu");
  await expect(page.locator("#sailytys")).toContainText("eivät vanhene automaattisesti");
  await expect(page.locator("#lahteet")).toContainText("ensimmäisen luovutuksen yhteydessä");
  const hero = page.locator(".page-hero--privacy"), image = hero.locator(".section-background img");
  await image.evaluate((image: HTMLImageElement) => image.decode());
  await expect(image).toHaveAttribute("loading", "eager");
  await expect(image).toHaveAttribute("fetchpriority", "high");
  const visual = await hero.evaluate(element => {
    const image = element.querySelector("img") as HTMLImageElement;
    const panel = element.querySelector(".kh-glass")!;
    const s = getComputedStyle(panel), box = element.getBoundingClientRect(), p = panel.getBoundingClientRect();
    const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
    const luminance = (values: number[]) => values.slice(0, 3).reduce((sum, value, i) => {
      const v = value / 255;
      return sum + [.2126, .7152, .0722][i] * (v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    }, 0);
    const bg = rgb(s.backgroundColor), alpha = bg[3] ?? 1;
    const maxBg = luminance(bg.slice(0, 3).map(value => value * alpha + 255 * (1 - alpha)));
    const contrast = Math.min(...[...panel.querySelectorAll("h1,p,.eyebrow")].map(text => (luminance(rgb(getComputedStyle(text).color)) + .05) / (maxBg + .05)));
    const scale = Math.max(box.width / image.naturalWidth, box.height / image.naturalHeight);
    const [px, py] = getComputedStyle(image).objectPosition.split(" ").map(value => parseFloat(value) / 100);
    const x = box.left + (box.width - image.naturalWidth * scale) * px + 1490 / 1672 * image.naturalWidth * scale;
    const y = box.top + (box.height - image.naturalHeight * scale) * py + 480 / 941 * image.naturalHeight * scale;
    return { width: box.width, left: box.left, contrast, blur: s.backdropFilter, src: image.currentSrc, panelInside: p.left >= 0 && p.right <= innerWidth, cabinetVisible: x >= 0 && x <= innerWidth && y >= box.top && y <= box.bottom && !(x >= p.left && x <= p.right && y >= p.top && y <= p.bottom) };
  });
  expect(visual.width).toBe(test.info().project.use.viewport!.width);
  expect(visual.left).toBe(0);
  expect(visual.panelInside).toBe(true);
  expect(visual.cabinetVisible, "The cabinet lock remains visible outside the glass").toBe(true);
  expect(visual.contrast).toBeGreaterThanOrEqual(4.5);
  expect(visual.blur).toContain("blur(");
  expect(visual.src).toContain(base + "website/privacy-");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const name = test.info().project.name;
  await page.screenshot({ path: `${out}/${name}-privacy-fold.png`, animations: "disabled" });
  await hero.screenshot({ path: `${out}/${name}-privacy-hero.png`, animations: "disabled" });
  for (const id of ["tallennus", "oikeudet"]) {
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
    await page.locator("#" + id).evaluate(element => element.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: `${out}/${name}-privacy-${id}.png`, animations: "disabled" });
  }
  const summary = page.locator(".privacy-index summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".privacy-index nav a")).toHaveCount(19);
  const ids = await page.locator(".privacy-index a").evaluateAll(links => links.map(link => link.getAttribute("href")!.slice(1)));
  expect(new Set(ids).size).toBe(19);
  for (const id of ids) await expect(page.locator("#" + id)).toHaveCount(1);
  await page.locator('.privacy-index a[href="#rekisterinpitaja"]').focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#rekisterinpitaja$/);
  await expect(page.locator("#rekisterinpitaja")).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.locator("html").evaluate(element => getComputedStyle(element).scrollBehavior)).toBe("auto");
  const fallback = await page.addStyleTag({ content: ".page-hero--privacy .kh-glass{background:rgba(12,25,35,.94)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}" });
  await hero.screenshot({ path: `${out}/${name}-privacy-fallback.png`, animations: "disabled" });
  await fallback.evaluate(element => element.remove());
  await page.reload();
  await expect(page.locator(".privacy-section")).toHaveCount(19);
});

test("public data flows: no report links, cookies, contact transmission or unsolicited game storage", async ({ page, context }) => {
  const requests: string[] = [], posts: string[] = [];
  page.on("request", request => { requests.push(request.url()); if (request.method() === "POST") posts.push(request.url()); });
  for (const path of ["", "palvelut/", "yritys/", "yhteystiedot/", "tietosuoja/", "peli/"]) {
    await page.goto(base + path);
    await page.locator(path === "peli/" ? ".pr-title-card" : "main h1").waitFor();
    await expect(page.locator(`a[href*="${base}report"]`)).toHaveCount(0);
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
    expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
  }
  await page.getByRole("button", { name: "Asetukset ja kenttäkoodi", exact: true }).click();
  await expect(page.locator('.pr-storage-note')).toContainText("ohjainasetus muistetaan tällä laitteella");
  await expect(page.getByRole("link", { name: "Tietosuoja", exact: true })).toHaveAttribute("href", base + "tietosuoja/");
  await page.locator('.pr-deadzone input').focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < 7; i++) await page.keyboard.press("ArrowRight");
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(["kht-game2-deadzone"]);
  await page.reload();
  await page.getByRole("button", { name: "Asetukset ja kenttäkoodi", exact: true }).click();
  await expect(page.locator('.pr-deadzone input')).toHaveValue("0.2");
  expect(await page.evaluate(() => localStorage.getItem("kht-game2-progress"))).toBeNull();
  await page.goto(base + "yhteystiedot/");
  await expect(page.locator('.contact-form [type="checkbox"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Verkkolähetys ei ole käytössä", exact: true })).toBeDisabled();
  await page.locator('[name="name"]').fill("Tietosuojatesti");
  await page.locator('[name="phone"]').fill("0401234567");
  await page.locator('textarea[name="description"]').fill("Testitieto, ei oikea yhteydenotto.");
  await page.locator('.contact-form').evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(page.getByRole("status")).toContainText("Pyyntöä ei lähetetty");
  await page.getByRole("link", { name: "Lue tietosuojaseloste", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(base + "tietosuoja/"));
  await expect(page.locator(".privacy-section")).toHaveCount(19);
  expect(posts).toEqual([]);
  expect(requests.filter(url => !url.startsWith("http://127.0.0.1:") && !url.startsWith("data:") && !url.startsWith("blob:"))).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(async () => (await indexedDB.databases()).map(db => db.name))).toEqual([]);
});

test("NFC direct URL retains manifest and requires configured employee authentication", async ({ page }) => {
  const posts: string[]=[];page.on("request",request=>{if(request.method()==="POST")posts.push(request.url());});
  await page.goto(base+"report/");await expect(page.locator(".access-login")).toBeVisible();await expect(page.locator(".report-form")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content","noindex,nofollow");
  const manifest=await page.evaluate(async base=>{const response=await fetch(base+"manifest.webmanifest");return {data:await response.json(),url:response.url};},base);
  expect(new URL(manifest.data.start_url,manifest.url).pathname).toBe(base+"report/");expect(manifest.data.lang).toBe("fi");
  await page.reload();await expect(page.locator(".access-login")).toBeVisible();expect(posts).toEqual([]);
});
