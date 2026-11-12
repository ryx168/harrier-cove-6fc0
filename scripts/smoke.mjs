// Smoke test for CI: serve site/, fly a scripted takeoff under SwiftShader,
// save stills so the deploy can be eyeballed without a GPU.
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('site');
const out = path.resolve('stills');
fs.mkdirSync(out, { recursive: true });

const server = http.createServer((req, res) => {
  const p = path.join(root, req.url === '/' ? 'index.html' : req.url);
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const sl = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--mute-audio', '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--disable-gpu-compositing', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 780 });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !t.includes('AudioContext') && !t.includes('404')) errors.push(t.slice(0, 300)); });

await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(() => window.K9 && window.THREE, { timeout: 90000 });
await sl(2000);
await page.screenshot({ path: path.join(out, '1_start.png') });
await page.click('#start');
await sl(500);

const K = () => page.evaluate(() => { const A = window.K9.AC; return { ias: Math.round(A.ias), alt: Math.round(A.pos.y), g: +A.g.toFixed(1), ground: A.onGround, crashed: A.crashed }; });

// takeoff: full burner, rotate at 150 kt
await page.keyboard.down('Shift'); await sl(2500); await page.keyboard.up('Shift'); await page.keyboard.press('f');
await page.waitForFunction(() => window.K9.AC.ias > 150, { timeout: 120000 });
await page.keyboard.down('s'); await sl(1400); await page.keyboard.up('s');
await page.waitForFunction(() => !window.K9.AC.onGround, { timeout: 30000 });
await sl(800); await page.keyboard.press('g'); await sl(4000);
await page.screenshot({ path: path.join(out, '2_climb.png') });
const climb = await K();

// into the cloud deck: rain on the canopy
await page.evaluate(() => {
  const K = window.K9, A = K.AC; let best = null;
  for (let i = 0; i < 4000; i++) { const x = (Math.random() - 0.5) * 20000, z = (Math.random() - 0.5) * 20000; const v = K.cloudN(x, z); if (!best || v > best.v) best = { x, z, v }; }
  A.pos.set(best.x, 2250, best.z); A.q.setFromEuler(new K.E(0.1, -34 * Math.PI / 180, 0, 'YXZ'));
  A.vel.set(0, 0, -200).applyQuaternion(A.q); A.onGround = false; A.gear = false; A.thr = 0.85; A.w.set(0, 0, 0);
});
await sl(3000);
await page.screenshot({ path: path.join(out, '3_in_cloud.png') });
const cloud = await page.evaluate(() => ({ rain: +window.K9.env.rain.toFixed(2), cloud: +window.K9.env.cloud.toFixed(2) }));

// above the deck, nose toward the sun: beads and scratch glint
await page.evaluate(() => { const K = window.K9, A = K.AC; A.pos.y = 3400; A.q.setFromEuler(new K.E(0.40, -34 * Math.PI / 180, 0, 'YXZ')); A.vel.set(0, 0, -200).applyQuaternion(A.q); A.w.set(0, 0, 0); });
await sl(2500);
await page.screenshot({ path: path.join(out, '4_glint.png') });

// chase view over the valley
await page.evaluate(() => { const K = window.K9, A = K.AC; A.pos.set(3000, 900, -2000); A.q.setFromEuler(new K.E(0.0, -34 * Math.PI / 180, 0.5, 'YXZ')); A.vel.set(0, 0, -200).applyQuaternion(A.q); A.w.set(0, 0, 0); });
await page.keyboard.press('c'); await sl(2500);
await page.screenshot({ path: path.join(out, '5_chase.png') });

await browser.close(); server.close();

const report = { climb, cloud, errors };
console.log(JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
if (errors.length) { console.error('console errors during smoke run'); process.exit(1); }
if (climb.ground || climb.crashed) { console.error('takeoff failed'); process.exit(1); }
if (cloud.rain < 0.3) { console.error('rain never developed in cloud'); process.exit(1); }
