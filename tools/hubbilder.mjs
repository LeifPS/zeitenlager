// Erzeugt Icon und Screenshots für den Hub-Eintrag (hub-eintrag/)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 512, height: 512 } });
await p.setContent(`<body style="margin:0;background:transparent">${fs.readFileSync('public/favicon.svg', 'utf8').replace('<svg ', '<svg width="512" height="512" ')}</body>`);
await p.screenshot({ path: 'hub-eintrag/icon.png', omitBackground: true });
const q = await b.newPage({ viewport: { width: 1600, height: 900 } });
await q.goto(process.env.URL || 'http://127.0.0.1:8787');
await q.waitForTimeout(800);
await q.fill('input[name=name]', process.env.NAME || 'tester'); await q.fill('input[name=pw]', 'geheim123'); await q.click('button[type=submit]');
await q.waitForFunction(() => !document.querySelector('#spiel').hidden); await q.waitForTimeout(1500);
fs.mkdirSync('hub-eintrag/shots', { recursive: true });
await q.screenshot({ path: 'hub-eintrag/shots/1.png' });
await q.click('[data-u=forschung]'); await q.waitForTimeout(700); await q.screenshot({ path: 'hub-eintrag/shots/2.png' }); await q.click('[data-zu]');
await q.click('[data-u=bauen]'); await q.waitForTimeout(500); await q.click('[data-kat=militaer]'); await q.waitForTimeout(500); await q.screenshot({ path: 'hub-eintrag/shots/3.png' }); await q.click('[data-zu]');
await q.click('[data-u=karte]'); await q.waitForTimeout(900); await q.screenshot({ path: 'hub-eintrag/shots/4.png' });
await b.close();
