import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { checkWebsiteBackgrounds } from './check-website-backgrounds.mjs';

const pass = process.env.SUBPAGE_PASS || 'final';
const production = process.env.WEBSITE_PRODUCTION === '1';
const base = process.env.VITE_BASE_PATH || '/';
const out = process.env.SUBPAGE_SCREENSHOTS || `docs/website24-screenshots/${pass}`;
const checks = 'docs/website24-checks', origin = 'http://127.0.0.1:5185';
const routes = ['palvelut', 'yritys', 'yhteystiedot'];
const hash = value => createHash('sha256').update(value).digest('hex');
const normalize = value => value.replaceAll('/kh-tech-website/', '/');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...(production ? ['preview'] : []), '--host', '127.0.0.1', '--port', '5185', '--strictPort'], { windowsHide: true, env: process.env, stdio: 'pipe' });
let browser, logs = '';
server.stdout.on('data', data => { logs += data; });
server.stderr.on('data', data => { logs += data; });
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(origin + base)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
    if (i === 99) throw new Error(logs);
  }
  await mkdir(out, { recursive: true });
  await mkdir(checks, { recursive: true });
  const before = pass === 'before' ? null : JSON.parse(await readFile(`${checks}/before.json`, 'utf8'));
  if (production) await checkWebsiteBackgrounds(base);
  browser = await chromium.launch({ headless: true, ...(process.env.GAME_BROWSER_EXECUTABLE ? { executablePath: process.env.GAME_BROWSER_EXECUTABLE } : {}) });
  const results = [], home = [];
  for (const [name, width, height] of [['mobile', 390, 844], ['tablet', 768, 1024], ['desktop', 1440, 900]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 600, hasTouch: width < 600 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    // Delay images to verify their decoding does not change the hero geometry.
    await page.route(/\.webp(?:\?.*)?$/, async route => { await new Promise(resolve => setTimeout(resolve, 300)); await route.continue(); });
    for (const route of routes) {
      await page.goto(`${origin}${base}${route}/`);
      const hero = page.locator('.page-hero');
      await hero.waitFor();
      const initial = await hero.boundingBox();
      const content = await page.evaluate(() => {
        const hero = document.querySelector('.page-hero');
        const below = [...document.querySelector('main').children].filter(child => child !== hero);
        const style = selector => [...document.querySelectorAll(selector)].map(element => {
          const s = getComputedStyle(element), box = element.getBoundingClientRect();
          return { selector, width: box.width, height: box.height, font: s.font, color: s.color, background: s.backgroundColor, padding: s.padding };
        });
        return { heroText: hero.textContent.replace(/\s+/g, ' ').trim(), below: below.map(element => element.outerHTML).join(''), styles: ['.service-card', '.company-info-card', '.about-grid', '.contact-form', '.contact-aside'].flatMap(style) };
      });
      await hero.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      assert.deepEqual(await hero.boundingBox(), initial, 'Hero image must not shift the layout');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const detail = await hero.evaluate(element => {
        const panel = element.querySelector('.kh-glass'), image = element.querySelector('.section-background img');
        const box = element.getBoundingClientRect();
        if (!panel) return { width: box.width, height: box.height };
        const s = getComputedStyle(panel), p = panel.getBoundingClientRect();
        const luminance = values => values.slice(0, 3).reduce((sum, value, i) => { const v = value / 255; return sum + [.2126, .7152, .0722][i] * (v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); }, 0);
        const rgb = value => value.match(/[\d.]+/g).map(Number), bg = rgb(s.backgroundColor), alpha = bg[3] ?? 1;
        const maxBg = luminance(bg.slice(0, 3).map(value => value * alpha + 255 * (1 - alpha)));
        const contrast = Math.min(...[...panel.querySelectorAll('h1,p,.eyebrow')].map(text => (luminance(rgb(getComputedStyle(text).color)) + .05) / (maxBg + .05)));
        const mobile = innerWidth <= 600;
        const focal = element.classList.contains('page-hero--services') ? (mobile ? [390 / 732, 170 / 861] : [1330 / 1672, 250 / 941]) : element.classList.contains('page-hero--about') ? (mobile ? [450 / 782, 180 / 871] : [1340 / 1672, 250 / 941]) : (mobile ? [470 / 682, 190 / 751] : [1460 / 1672, 380 / 941]);
        const scale = Math.max(box.width / image.naturalWidth, box.height / image.naturalHeight);
        const [px, py] = getComputedStyle(image).objectPosition.split(' ').map(value => parseFloat(value) / 100);
        const x = box.left + (box.width - image.naturalWidth * scale) * px + focal[0] * image.naturalWidth * scale;
        const y = box.top + (box.height - image.naturalHeight * scale) * py + focal[1] * image.naturalHeight * scale;
        const focalVisible = x >= box.left && x <= box.right && y >= box.top && y <= box.bottom && !(x >= p.left && x <= p.right && y >= p.top && y <= p.bottom);
        return { width: box.width, left: box.left, height: box.height, blur: s.backdropFilter, radius: s.borderRadius, contrast, focalVisible, panelInside: p.left >= 0 && p.right <= innerWidth && p.top >= box.top && p.bottom <= box.bottom, image: { src: image.currentSrc, loading: image.loading, priority: image.fetchPriority, position: getComputedStyle(image).objectPosition } };
      });
      const data = { name, width, height, route, heroText: content.heroText, belowHash: hash(normalize(content.below)), belowStyles: content.styles, detail };
      if (before) {
        const original = before.results.find(result => result.name === name && result.route === route);
        assert.equal(data.heroText, original.heroText);
        assert.equal(data.belowHash, original.belowHash, 'All content below the hero must be identical');
        const comparable = styles => styles.map(style => {
          // Explicit user-approved exception: the tablet contact grid now has a separate service-area row.
          if (route === 'yhteystiedot' && name === 'tablet' && style.selector === '.contact-aside') { const { height, ...rest } = style; return rest; }
          return style;
        });
        assert.deepEqual(comparable(data.belowStyles), comparable(original.belowStyles), 'Styles below the hero must be identical, except the approved contact-grid height correction');
        assert.equal(detail.width, width);
        assert.equal(detail.left, 0);
        assert(detail.panelInside);
        assert(detail.focalVisible, 'The primary plumbing subject must remain visible outside the panel');
        assert(detail.contrast >= 4.5);
        assert.match(detail.blur, /blur/);
        assert(detail.image.src.includes(base + (production ? 'assets/' : 'src/generated/website/')));
        assert.equal(detail.image.loading, 'eager');
        assert.equal(detail.image.priority, 'high');
        if (route === 'yhteystiedot') {
          const boxes = await page.locator('.contact-method').evaluateAll(elements => elements.map(element => { const { x, y, width, height } = element.getBoundingClientRect(); return { x, y, width, height }; }));
          assert.equal(boxes.length, 3);
          for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i], b = boxes[j];
            assert(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, 'Phone, email and service-area rows must not overlap');
          }
          data.contactRows = boxes;
        }
      }
      await page.screenshot({ path: `${out}/${name}-${route}.png`, animations: 'disabled' });
      if (before) {
        if (route === 'yhteystiedot' && name === 'mobile') {
          const fallback = await page.addStyleTag({ content: '.page-hero--cinematic .kh-glass {backdrop-filter:none!important;-webkit-backdrop-filter:none!important;background:rgba(12,25,35,.94)!important}' });
          await page.screenshot({ path: `${out}/mobile-contact-fallback.png`, animations: 'disabled' });
          await fallback.evaluate(element => element.remove());
        }
        await page.reload();
        await hero.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
        assert.equal((await hero.textContent()).replace(/\s+/g, ' ').trim(), data.heroText);
        assert.equal(new URL(page.url()).pathname, `${base}${route}/`);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await page.locator('html').evaluate(element => getComputedStyle(element).scrollBehavior), 'auto');
        const next = routes[(routes.indexOf(route) + 1) % routes.length];
        if (width < 600) await page.locator('.menu-toggle').click();
        await page.locator(`.nav a[href="${base}${next}/"]`).click();
        await page.waitForURL(`${origin}${base}${next}/`);
        await page.locator('.page-hero h1').waitFor();
      }
      results.push(data);
    }
    // The homepage's markup and rendered styles must remain unchanged.
    await page.goto(origin + base);
    await page.locator('.hero h1').waitFor();
    const html = normalize(await page.locator('main').innerHTML());
    const styles = await page.locator('.cinematic-section,.kh-glass').evaluateAll(elements => elements.map(element => { const s = getComputedStyle(element), b = element.getBoundingClientRect(); return { width: b.width, height: b.height, padding: s.padding, background: s.backgroundColor, blur: s.backdropFilter, color: s.color }; }));
    const homeData = { name, htmlHash: hash(html), styles };
    if (before) assert.deepEqual(homeData, before.home.find(result => result.name === name), 'Homepage must remain identical');
    home.push(homeData);
    assert.deepEqual(errors, []);
    await page.close();
  }
  await writeFile(`${checks}/${pass}${production ? (base === '/' ? '-root' : '-pages') : ''}.json`, JSON.stringify({ pass, base, production, environment: 'Chromium viewport/touch emulation, not physical devices', results, home, errors: [] }, null, 2));
  console.log(pass === 'before' ? 'Subpage baseline captured: 9 page/viewports and homepage snapshots.' : `Subpage glass ${pass}: 9 page/viewports, image layout, focal subjects, navigation, refresh, copy, contact rows, lower sections and homepage passed (${base}).`);
} finally { await browser?.close(); server.kill(); }
