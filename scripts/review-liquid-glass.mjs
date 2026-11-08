import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const pass = process.env.GLASS_PASS || 'final';
const base = process.env.VITE_BASE_PATH || '/';
const production = process.env.WEBSITE_PRODUCTION === '1';
const out = process.env.GLASS_SCREENSHOTS || `docs/website23-screenshots/${pass}`;
const checks = 'docs/website23-checks';
const origin = 'http://127.0.0.1:5184';
const sections = ['hero', 'company-section', 'game-teaser'];
const copies = ['hero-copy', 'company-copy', 'game-teaser-copy'];
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...(production ? ['preview'] : []), '--host', '127.0.0.1', '--port', '5184', '--strictPort'], { windowsHide: true, env: process.env, stdio: 'pipe' });
let logs = '', browser;
server.stdout.on('data', data => { logs += data; });
server.stderr.on('data', data => { logs += data; });
const results = [];
try {
  if (pass !== 'before') {
    const manifest = JSON.parse(await readFile(`${checks}/background-assets.json`, 'utf8'));
    for (const asset of manifest.images) {
      assert.equal(createHash('sha256').update(await readFile(asset.source)).digest('hex'), asset.sha256, 'Supplied original PNG must remain unchanged');
      if (production) for (const output of asset.outputs) {
        assert((await readFile(output.path)).equals(await readFile(output.path.replace('public/', 'dist/'))), 'Production assets must match optimized sources');
      }
    }
  }
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(origin + base)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
    if (i === 99) throw new Error(logs);
  }
  await mkdir(out, { recursive: true });
  await mkdir(checks, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.GAME_BROWSER_EXECUTABLE ? { executablePath: process.env.GAME_BROWSER_EXECUTABLE } : {}) });
  for (const [name, width, height] of [['mobile', 390, 844], ['tablet', 768, 1024], ['desktop', 1440, 900], ...(pass === 'final' ? [['small-mobile', 320, 740], ['wide', 1920, 1080]] : [])]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 600, hasTouch: width < 600 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(origin + base);
    await page.locator('.hero h1').waitFor();
    const loading = await page.locator('.section-background img').evaluateAll(images => images.map(image => ({ loading: image.loading, priority: image.fetchPriority })));
    if (pass !== 'before') assert.deepEqual(loading, [{ loading: 'eager', priority: 'high' }, { loading: 'lazy', priority: 'auto' }, { loading: 'lazy', priority: 'auto' }]);
    const copy = await page.evaluate(classes => classes.map(cls => {
      const element = document.querySelector('.' + cls);
      return { text: element.textContent.replace(/\s+/g, ' ').trim(), links: Array.from(element.querySelectorAll('a')).map(a => ({ text: a.textContent, href: a.getAttribute('href') })) };
    }), copies);
    const details = [];
    for (const cls of sections) {
      const section = page.locator('.' + cls);
      await section.scrollIntoViewIfNeeded();
      await section.locator('img').evaluateAll(images => images.forEach(image => { image.loading = 'eager'; }));
      await page.waitForFunction(selector => Array.from(document.querySelectorAll(selector + ' img')).every(image => image.complete && image.naturalWidth > 0), '.' + cls);
      await page.waitForTimeout(180);
      await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
      await section.screenshot({ path: `${out}/${name}-${cls}.png`, animations: 'disabled' });
      const data = await section.evaluate(element => {
        const image = element.querySelector('.section-background img');
        const panel = element.querySelector('.kh-glass');
        const box = element.getBoundingClientRect();
        const style = panel && getComputedStyle(panel);
        let minimumContrast = null, focalVisible = null;
        if (panel && image) {
          const rgb = value => value.match(/[\d.]+/g).map(Number);
          const luminance = values => values.slice(0, 3).reduce((sum, channel, i) => {
            const v = channel / 255;
            return sum + [0.2126, 0.7152, 0.0722][i] * (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
          }, 0);
          const bg = rgb(style.backgroundColor), alpha = bg[3] ?? 1;
          // Conservative lower bound: a pure white image behind the dark glass.
          const maximumBackground = luminance(bg.slice(0, 3).map(channel => channel * alpha + 255 * (1 - alpha)));
          minimumContrast = Math.min(...Array.from(panel.querySelectorAll('h1,h2,p,.eyebrow,.hero-note,.text-link')).map(text => (luminance(rgb(getComputedStyle(text).color)) + 0.05) / (maximumBackground + 0.05)));
          const mobile = innerWidth <= 600;
          const focal = element.classList.contains('hero') ? (mobile ? [320 / 730, 160 / 677] : [1330 / 1774, 370 / 887]) : element.classList.contains('company-section') ? (mobile ? [430 / 1080, 130 / 777] : [430 / 1774, 240 / 887]) : (mobile ? [370 / 880, 240 / 777] : [410 / 1774, 350 / 887]);
          const scale = Math.max(box.width / image.naturalWidth, box.height / image.naturalHeight);
          const [px, py] = getComputedStyle(image).objectPosition.split(' ').map(value => parseFloat(value) / 100);
          const x = box.left + (box.width - image.naturalWidth * scale) * px + focal[0] * image.naturalWidth * scale;
          const y = box.top + (box.height - image.naturalHeight * scale) * py + focal[1] * image.naturalHeight * scale;
          const p = panel.getBoundingClientRect();
          focalVisible = x >= box.left && x <= box.right && y >= box.top && y <= box.bottom && !(x >= p.left && x <= p.right && y >= p.top && y <= p.bottom);
        }
        return { width: box.width, left: box.left, height: box.height, minimumContrast, focalVisible, image: image && { src: image.currentSrc, width: image.naturalWidth, height: image.naturalHeight, loading: image.loading, objectPosition: getComputedStyle(image).objectPosition }, panel: panel && { blur: style.backdropFilter, background: style.backgroundColor, radius: style.borderRadius, color: style.color }, links: Array.from(element.querySelectorAll('a')).map(a => ({ href: a.href, height: a.getBoundingClientRect().height })) };
      });
      if (pass !== 'before') {
        assert.equal(data.width, width, `${cls} must be full viewport width`);
        assert.equal(data.left, 0);
        assert(data.image.src.includes(base + 'website/'));
        assert.match(data.panel.blur, /blur/);
        assert.equal(await section.locator('.kh-glass').count(), 1);
        assert(data.minimumContrast >= 4.5, `${cls}: normal text contrast >= 4.5:1 even over white`);
        assert(data.focalVisible, `${cls}: focal subject is visible outside the glass panel`);
        assert(data.links.every(link => link.height >= 44), `${cls}: touch target size`);
        assert(data.links.every(link => link.height <= 80), `${cls}: buttons should retain their usual compact height`);
      }
      details.push({ section: cls, ...data });
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    assert(!overflow, `${name}: horizontal overflow`);
    if (pass !== 'before') {
      const baseline = JSON.parse(await readFile(`${checks}/before.json`, 'utf8'));
      const original = baseline.results.find(result => result.name === (name === 'small-mobile' ? 'mobile' : name === 'wide' ? 'desktop' : name)).copy;
      const normalize = value => JSON.stringify(value).replaceAll('/kh-tech-website/', '/');
      assert.equal(normalize(copy), normalize(original), 'Original HTML copy and CTA links must be preserved');
      assert.equal(await page.locator('.hero-art,.company-mark,.game-promo-art').count(), 0);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.locator('html').evaluate(element => getComputedStyle(element).scrollBehavior), 'auto');
      // Simulate browsers without backdrop-filter; the opaque fallback must remain readable.
      const css = await page.addStyleTag({ content: '.kh-glass {backdrop-filter:none!important;-webkit-backdrop-filter:none!important;background:rgba(12,25,35,.94)!important}' });
      if (name === 'mobile') await page.locator('.game-teaser').screenshot({ path: `${out}/mobile-fallback.png`, animations: 'disabled' });
      await css.evaluate(element => element.remove());
      for (const [selector, path, ready] of [['.hero .primary', 'yhteystiedot/', '.contact-form'], ['.company-copy .text-link', 'yritys/', 'h1'], ['.game-teaser-copy .button', 'peli/', '.pr-title-card']]) {
        await page.locator(selector).click();
        await page.locator(ready).waitFor();
        assert.equal(new URL(page.url()).pathname, base + path);
        await page.goBack();
        await page.locator('.hero h1').waitFor();
      }
    }
    assert.deepEqual(errors, []);
    results.push({ name, width, height, copy, loading, overflow, details, errors });
    await page.close();
  }
  await writeFile(`${checks}/${pass}${production ? (base === '/' ? '-root' : '-pages') : ''}.json`, JSON.stringify({ base, production, pass, environment: 'Chromium desktop and touch viewport emulation; no physical phone', results }, null, 2));
  console.log(`Liquid Glass ${pass}: ${results.length} viewports passed, base ${base}`);
} finally {
  await browser?.close();
  server.kill();
}
