import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const [w, h, n] of [[1300, 820, 'pc'], [390, 844, 'handy'], [1024, 768, 'tablet']]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: n !== 'pc' });
  const fehler = []; p.on('pageerror', (e) => fehler.push(e.message));
  await p.goto('http://127.0.0.1:8787'); await p.waitForTimeout(800);
  await p.click('[data-m=neu]'); await p.fill('input[name=name]', 'n' + n + Date.now() % 100000); await p.fill('input[name=pw]', 'geheim123'); await p.click('button[type=submit]');
  await p.waitForFunction(() => !document.querySelector('#spiel').hidden); await p.waitForTimeout(1500);
  await p.screenshot({ path: `/tmp/t-${n}.png` });
  console.log(n, 'Fehler:', fehler.join(' | ') || 'keine');
  await p.close();
}
await b.close();
