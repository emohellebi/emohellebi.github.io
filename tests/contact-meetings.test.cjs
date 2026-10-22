// CONTACT_DOCS=/path/to/rendered/docs CONTACT_QA=/path/to/screenshots node tests/contact-meetings.test.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');

const docs = path.resolve(process.env.CONTACT_DOCS || path.join(__dirname, '../docs'));
const qa = process.env.CONTACT_QA;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

(async () => {
  if (qa) await fs.mkdir(qa, { recursive: true });
  const server = http.createServer(async (req, res) => {
    try {
      let file = path.resolve(docs, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      assert(file.startsWith(docs + path.sep) || file === docs);
      if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      res.end(await fs.readFile(file));
    } catch { res.statusCode = 404; res.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const errors = [], missing = [];
  const shot = async (page, name) => {
    await page.waitForTimeout(350); // Let theme and anchor-scroll transitions settle.
    if (qa) await page.screenshot({ path: path.join(qa, name + '.png'), fullPage: true });
  };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) missing.push(r.url()); });
    await page.goto(base + '/');
    const zoomNav = page.locator('#quarto-header a').filter({ has: page.locator('.bi-camera-video') });
    const calendarNav = page.locator('#quarto-header a').filter({ has: page.locator('.bi-calendar-event') });
    assert.equal(await zoomNav.count(), 1);
    assert.equal(await calendarNav.count(), 1);
    assert(await zoomNav.evaluate(el => !!el.parentElement.nextElementSibling?.querySelector('.bi-calendar-event')), 'Calendar immediately follows Zoom');
    await zoomNav.click();
    await page.waitForURL(base + '/contact-me/zoom/');
    assert(await page.getByText('Please enter the Zoom meeting link I gave you in class', { exact: false }).isVisible());
    await shot(page, 'zoom-desktop');

    const field = page.locator('#zoom-meeting-link');
    const submit = page.getByRole('button', { name: 'Continue to Zoom' });
    const bad = [
      '', '12345678901', 'not a link', 'javascript:alert(1)',
      'http://zoom.us/j/12345678901', 'https://zoom.us.evil.example/j/12345678901',
      'https://evilzoom.us/j/12345678901', 'https://zoom.us@evil.example/j/12345678901',
      'https://evil.example@zoom.us/j/12345678901', 'https://zoom.us:444/j/12345678901',
      'https://zoom.us/', 'https://zoom.us/signin', 'https://zoom.us/j/123',
      'https://zoom.us/redirect?url=https://evil.example', '//zoom.us/j/12345678901'
    ];
    for (const value of bad) {
      await field.fill(value);
      await submit.click();
      assert.equal(page.url(), base + '/contact-me/zoom/');
      assert.equal(await field.getAttribute('aria-invalid'), 'true', value);
      assert(await page.locator('#zoom-link-error').innerText(), value);
      assert(await field.evaluate(el => el === document.activeElement));
    }
    await shot(page, 'zoom-validation');
    await field.fill('https://uark.zoom.us/j/12345678901?pwd=TEST_ONLY');
    assert.equal(await field.getAttribute('aria-invalid'), null);
    assert.equal(await page.locator('#zoom-link-error').innerText(), '');
    assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).filter(k => /zoom|meeting/i.test(k))), []);
    assert.deepEqual(await page.evaluate(() => Object.keys(sessionStorage).filter(k => /zoom|meeting/i.test(k))), []);
    await page.reload();
    assert.equal(await field.inputValue(), '', 'Invitation is not restored on reload');

    // Mock external destinations: tests never join a real meeting or call Zoom.
    const visits = [];
    await page.route(/^https:\/\/(?:[a-z0-9-]+\.)*zoom\.(?:us|com)\//, route => {
      visits.push({ url: route.request().url(), referer: route.request().headers().referer });
      return route.fulfill({ contentType: 'text/html', body: '<p>Mock Zoom destination</p>' });
    });
    for (const value of [
      'https://uark.zoom.us/j/12345678901?pwd=TEST_ONLY',
      'https://us02web.zoom.us/j/123456789?pwd=TEST%2BONLY',
      'https://zoom.us/my/example.teacher',
      'https://zoom.com/wc/join/1234567890?pwd=TEST_ONLY'
    ]) {
      await page.goto(base + '/contact-me/zoom/');
      await field.fill(value);
      await submit.click();
      await page.waitForURL(value);
      assert.equal(visits.at(-1).url, value, 'Keep complete invitation, including passcode');
      assert.equal(visits.at(-1).referer, undefined);
    }
    assert.equal(visits.length, 4);
    await page.goto(base + '/contact-me/zoom/');
    await page.getByRole('link', { name: 'request a meeting by email', exact: true }).click();
    await page.waitForURL(base + '/contact-me/#request-meeting');
    const draft = new URL(await page.locator('#meeting-request-email').getAttribute('href'));
    assert.equal(draft.protocol, 'mailto:');
    assert.equal(draft.pathname, 'ezmo@uark.edu');
    assert.equal(draft.searchParams.get('subject'), 'Meeting request');
    assert.match(draft.searchParams.get('body'), /time zone/);
    assert.match(draft.searchParams.get('body'), /Topic or course/);
    assert.match(await page.locator('#request-meeting').innerText(), /confirmed only after I reply/);
    assert(await page.locator('#request-meeting').evaluate(el => {
      const [left, right] = [...el.children].map(child => child.getBoundingClientRect());
      return left.left < right.left && left.bottom > right.top && right.bottom > left.top;
    }), 'Anchor navigation must not add a blank grid cell');
    assert(await page.locator('#contact-copy-email').isVisible());
    assert.equal(await page.locator('form').count(), 0, 'No fake submission form on the request page');
    await page.evaluate(() => scrollTo(0, 0));
    await shot(page, 'contact-desktop');

    await page.locator('a[href$="#command-palette"]').first().click();
    await page.locator('#command-palette-input').fill('request');
    await page.locator('#site-command-palette').getByRole('link', { name: 'Request a meeting', exact: true }).click();
    assert.equal(await page.locator('#site-command-palette').isHidden(), true);

    for (const width of [390, 320, 820]) {
      await page.setViewportSize({ width, height: 844 });
      for (const [name, url] of [['contact', '/contact-me/#request-meeting'], ['zoom', '/contact-me/zoom/']]) {
        await page.goto(base + url);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name} overflow at ${width}`);
        await shot(page, `${name}-${width}`);
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('.quarto-color-scheme-toggle').first().click();
    await shot(page, 'zoom-dark');
    await page.goto(base + '/contact-me/');
    await shot(page, 'contact-dark');
    const nojs = await browser.newPage({ javaScriptEnabled: false });
    await nojs.goto(base + '/contact-me/zoom/');
    assert(await nojs.locator('#zoom-join-form').isHidden());
    assert(await nojs.locator('noscript p').isVisible());
    await nojs.close();
    assert.deepEqual(errors, [], 'No page JavaScript errors');
    assert.deepEqual(missing, [], 'No missing local assets');
    console.log('PASS: navigation, email template, safe Zoom links, privacy, no-JS fallback, responsive layouts and light/dark previews.');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
