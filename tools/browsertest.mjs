// Browsertest: meldet ein neues Konto an und macht Bildschirmfotos. Aufruf: node tools/browsertest.mjs [url] [breite] [hoehe]
import { chromium } from 'playwright-core';
const url = process.argv[2] || 'http://127.0.0.1:8787';
const W = +(process.argv[3] || 1400), H = +(process.argv[4] || 860);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const fehler = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') fehler.push(m.type() + ': ' + m.text()); });
p.on('pageerror', (e) => fehler.push('pageerror: ' + e.message));
await p.goto(url);
await p.waitForSelector('#anmeldung:not([hidden])');
await p.screenshot({ path: '/tmp/s0-anmeldung.png' });
const name = process.env.NAME;
if (!name) { await p.click('[data-m=neu]'); }
await p.fill('input[name=name]', name || 't' + Math.floor(Math.random() * 1e6)); await p.fill('input[name=pw]', 'geheim123');
if (!name) await p.fill('input[name=lager]', 'Testfeste');
await p.click('button[type=submit]');
await p.waitForTimeout(2500);
const f = await p.evaluate(() => document.querySelector('.fehler')?.textContent);
if (f) { console.log('Anmeldefehler:', f); process.exit(1); }
await p.waitForFunction(() => !document.querySelector('#spiel').hidden);
await p.waitForTimeout(1500);
await p.screenshot({ path: '/tmp/s1-lager.png' });
const schritte = (process.env.SCHRITTE || 'bauen,armee,forschung').split(',');
for (const s of schritte) {
  await p.click(`[data-u=${s}]`); await p.waitForTimeout(600);
  await p.screenshot({ path: `/tmp/s-${s}.png` });
  await p.click('[data-zu]').catch(() => {}); await p.waitForTimeout(200);
}
console.log('Fehler:', fehler.length ? fehler.join('\n') : 'keine');
await b.close();
