#!/usr/bin/env node
/* Site check: loads the site in headless Chrome, the way a visitor would, and
 * fails if anything is broken. Run it after every edit:
 *
 *   node tools/check-site.js                         # this folder
 *   node tools/check-site.js https://dialed-records.com   # the live site
 *
 * It checks that:
 *   - main.js parses, and the page runs with no errors
 *   - every image and file the page asks for from the site exists
 *   - the data in main.js has the right shape (dates, links, order, artwork)
 *   - the releases, events, merch and gallery actually render
 *
 * Needs puppeteer-core (`npm install puppeteer-core@25.15.0`, found through
 * NODE_PATH) and Chrome or Chromium; set CHROME_PATH if it isn't found.
 * Exits 0 when the site is fine, 1 with a plain list of problems when not.
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const target = process.argv[2];
const problems = [];
const problem = msg => problems.push(msg);

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  return candidates.find(p => p && fs.existsSync(p));
}

/* A tiny static server, so the local check sees exactly what Vercel serves. */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };

function serve() {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/* ─── The data in main.js ─── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const isUrl = v => typeof v === 'string' && /^https:\/\/[^\s"'<>]+$/.test(v);
const isText = v => typeof v === 'string' && !/[<>]/.test(v);
const isDay = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

function checkData(d, exists) {
  const image = (where, file) => {
    if (typeof file !== 'string' || !file) return problem(`${where}: no image`);
    if (exists && !exists(file)) problem(`${where}: image ${file} isn't in the repo`);
  };

  // RELEASES
  if (!Array.isArray(d.RELEASES) || !d.RELEASES.length) problem('RELEASES is empty or missing');
  const catalogs = new Set();
  (d.RELEASES || []).forEach((r, i) => {
    const where = `RELEASES[${i}] (${r && r.catalog})`;
    for (const k of ['catalog', 'title', 'artist']) if (!r[k] || !isText(r[k])) problem(`${where}: bad or missing ${k}`);
    if (catalogs.has(r.catalog)) problem(`${where}: catalog ${r.catalog} is listed twice`);
    catalogs.add(r.catalog);
    image(where, r.image);
    if (r.beatport && !isUrl(r.beatport)) problem(`${where}: link isn't an https URL`);
  });

  // FEATURED
  const f = d.FEATURED;
  if (f) {
    if (!catalogs.has(f.catalog)) problem(`FEATURED.catalog ${f.catalog} isn't in RELEASES`);
    image('FEATURED', f.image);
    if (f.out && !isDay(f.out)) problem(`FEATURED.out "${f.out}" isn't YYYY-MM-DD`);
    if (f.until && !isDay(f.until)) problem(`FEATURED.until "${f.until}" isn't YYYY-MM-DD`);
    if (isDay(f.out) && isDay(f.until) && f.until <= f.out) problem('FEATURED.until is on or before FEATURED.out');
    if (f.label && !isText(f.label)) problem('FEATURED.label has < or >');
  }

  // EVENTS
  if (!Array.isArray(d.EVENTS)) problem('EVENTS is missing');
  let prev = null;
  (d.EVENTS || []).forEach((e, i) => {
    const where = `EVENTS[${i}] (${e && String(e.date).replace('\n', ' ')})`;
    const m = /^([A-Z][a-z]{2}) (\d{1,2})\n(\d{4})$/.exec(e.date || '');
    if (!m || !MONTHS.includes(m[1]) || +m[2] < 1 || +m[2] > 31) {
      problem(`${where}: date must look like 'Dec 3\\n2026'`);
    } else {
      const when = new Date(+m[3], MONTHS.indexOf(m[1]), +m[2]);
      if (prev && when < prev) problem(`${where}: EVENTS are out of date order`);
      prev = when;
    }
    for (const k of ['name', 'subtitle', 'venue']) if (typeof e[k] !== 'string' || !e[k] || !isText(e[k])) problem(`${where}: bad or missing ${k}`);
    if (typeof e.lineup !== 'string' || !isText(e.lineup)) problem(`${where}: lineup must be text ('' to hide it)`);
    for (const k of ['link', 'recap']) {
      if (typeof e[k] !== 'string') problem(`${where}: ${k} must be a string ('' for none)`);
      else if (e[k] && !isUrl(e[k])) problem(`${where}: ${k} isn't an https URL`);
    }
  });

  // MERCH and GALLERY
  (d.MERCH || []).forEach((m, i) => {
    const where = `MERCH[${i}] (${m && m.name})`;
    if (!m.name || !isText(m.name)) problem(`${where}: bad or missing name`);
    if (!isUrl(m.link)) problem(`${where}: link isn't an https URL`);
    image(where, m.image);
  });
  (d.GALLERY || []).forEach((g, i) => {
    image(`GALLERY[${i}]`, g.image);
    if (!isUrl(g.url)) problem(`GALLERY[${i}]: url isn't an https URL`);
  });
}

/* ─── The page ─── */

async function main() {
  const local = !target;
  if (local) {
    try {
      execFileSync(process.execPath, ['--check', path.join(ROOT, 'main.js')], { stdio: 'pipe' });
    } catch (e) {
      problem(`main.js doesn't parse:\n${String(e.stderr || e.message).trim()}`);
      return;
    }
  }

  // The workflows install it next to the repo, in ../check-deps, so it's
  // never committed by accident.
  let puppeteer;
  for (const where of ['puppeteer-core', path.join(ROOT, '..', 'check-deps', 'node_modules', 'puppeteer-core')]) {
    try { puppeteer = require(where); break; } catch (e) { /* try the next */ }
  }
  if (!puppeteer) {
    console.error('Site check needs puppeteer-core: npm install --prefix ../check-deps puppeteer-core@25.15.0');
    process.exit(2);
  }
  const executablePath = findChrome();
  if (!executablePath) {
    console.error('Site check needs Chrome or Chromium. Set CHROME_PATH.');
    process.exit(2);
  }

  const server = local ? await serve() : null;
  const base = local ? `http://127.0.0.1:${server.address().port}/` : target.replace(/\/?$/, '/');
  const origin = new URL(base).origin;
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    page.on('pageerror', err => problem(`The page threw an error: ${err.message.split('\n')[0]}`));
    page.on('console', msg => {
      // Missing files are reported below, with their names; other console errors are code errors.
      if (msg.type() === 'error' && !/Failed to load resource/i.test(msg.text())) problem(`Console error: ${msg.text().slice(0, 300)}`);
    });
    page.on('response', res => {
      const url = res.url();
      if (url.startsWith(origin) && res.status() >= 400) problem(`Missing file: ${url.slice(origin.length)} (${res.status()})`);
    });
    page.on('requestfailed', req => {
      if (req.url().startsWith(origin)) problem(`Couldn't load ${req.url().slice(origin.length)}: ${req.failure() && req.failure().errorText}`);
    });

    const res = await page.goto(base, { waitUntil: 'networkidle2', timeout: 45000 });
    if (!res || res.status() >= 400) problem(`The home page returned ${res ? res.status() : 'nothing'}`);

    // Top-level consts in main.js are visible to page scripts by name.
    const data = await page.evaluate(() => {
      const grab = name => { try { return eval(name); } catch (e) { return undefined; } }; // eslint-disable-line no-eval
      return {
        FEATURED: grab('FEATURED'), RELEASES: grab('RELEASES'), EVENTS: grab('EVENTS'),
        MERCH: grab('MERCH'), GALLERY: grab('GALLERY'),
        counts: {
          releases: document.querySelectorAll('.releases-grid > *').length,
          events: document.querySelectorAll('.events-list .event-item, .events-list .events-empty').length,
          merch: document.querySelectorAll('.merch-grid > *').length,
          gallery: document.querySelectorAll('.gallery-track > *').length,
        },
      };
    });

    const exists = local ? file => fs.existsSync(path.join(ROOT, file)) : null; // live: the response check covers it
    checkData(data, exists);

    const c = data.counts;
    if (data.RELEASES && data.RELEASES.length && !c.releases) problem("The releases grid didn't render");
    if (data.EVENTS && !c.events) problem("The events list didn't render");
    if (data.MERCH && data.MERCH.length && !c.merch) problem("The merch grid didn't render");
    if (data.GALLERY && data.GALLERY.length && !c.gallery) problem("The gallery didn't render");
  } finally {
    await browser.close();
    if (server) server.close();
  }
}

main()
  .catch(e => problem(`The check itself crashed: ${e.message}`))
  .finally(() => {
    const unique = [...new Set(problems)];
    if (unique.length) {
      console.log(`Site check failed (${target || 'local files'}):`);
      for (const p of unique) console.log(`  - ${p}`);
      process.exit(1);
    }
    console.log(`Site check passed (${target || 'local files'}).`);
    process.exit(0);
  });
