// Genera todo el arte y el sonido del juego y lo deja dentro del proyecto de Xcode.
// Uso: node tools/assetgen/generate.mjs   (requiere Playwright + Chromium y Python 3 con Pillow)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const ART = path.join(root, 'MetalHive/Resources/Art');
const SND = path.join(root, 'MetalHive/Resources/Sound');
const ICON = path.join(root, 'MetalHive/Assets.xcassets/AppIcon.appiconset');

const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const f = path.join(here, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(here) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('ERROR en la página:', e.message));
await page.goto(`http://localhost:${port}/gen.html`);
await page.waitForFunction(() => window.ready === true);

for (const d of [ART, SND, ICON]) fs.mkdirSync(d, { recursive: true });
const write = (dir, files) => {
  for (const [name, data] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), Buffer.from(data, 'base64'));
};

console.log('Arte…');
const art = await page.evaluate(() => window.genArt());
const icon = art['__icon.png']; delete art['__icon.png'];
for (const f of fs.readdirSync(ART)) fs.unlinkSync(path.join(ART, f));
write(ART, art);
const tmpIcon = path.join(here, '.icon-1024.png');
fs.writeFileSync(tmpIcon, Buffer.from(icon, 'base64'));
execFileSync('python3', [path.join(here, 'icons.py'), tmpIcon, ICON], { stdio: 'inherit' });
fs.unlinkSync(tmpIcon);
console.log(`  ${Object.keys(art).length} imágenes`);

console.log('Sonido…');
const snd = await page.evaluate(() => window.genSound());
for (const f of fs.readdirSync(SND)) fs.unlinkSync(path.join(SND, f));
write(SND, snd);
console.log(`  ${Object.keys(snd).length} archivos de audio`);

await browser.close();
server.close();
