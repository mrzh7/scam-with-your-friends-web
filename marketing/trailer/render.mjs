import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';

const dir = resolve('marketing/trailer/.renders');
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
page.on('console', msg => { if (msg.type() === 'error') console.error('CONSOLE:', msg.text()); });
await page.goto('http://127.0.0.1:5181/marketing/trailer/index.html', { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForFunction(() => window.filmReady, null, { timeout: 120000 });

if (!process.argv.includes('--full')) {
  for (const t of [2, 6, 8.8, 11.5, 14.5, 18.5, 21.8, 25.5, 28.5, 32.5, 35.8, 39.4, 43.5, 46.5]) {
    const data = await page.evaluate(t => { window.renderFilm(t); return document.querySelector('#film').toDataURL('image/png').split(',')[1]; }, t);
    await writeFile(resolve(dir, `frame-${String(t).replace('.', '-')}.png`), Buffer.from(data, 'base64'));
    console.log(`Preview ${t}s`);
  }
} else {
  const ffmpeg = process.env.FFMPEG || 'ffmpeg';
  const encoder = spawn(ffmpeg, ['-hide_banner','-loglevel','warning','-y','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',resolve(dir,'silent.mp4')], { stdio: ['pipe','inherit','inherit'], windowsHide: true });
  let encodeError;
  encoder.on('error', e => { encodeError = e; });
  const completed = once(encoder, 'close');
  const start = Date.now();
  for (let frame = 0; frame < 1440; frame++) {
    if (encodeError) throw encodeError;
    const data = await page.evaluate(t => { window.renderFilm(t); return document.querySelector('#film').toDataURL('image/jpeg', .96).split(',')[1]; }, frame / 30);
    if (!encoder.stdin.write(Buffer.from(data, 'base64'))) await once(encoder.stdin, 'drain');
    if (frame % 60 === 0) console.log(`Frame ${frame}/1440 (${(100*frame/1440).toFixed(1)}%) ${(Date.now()-start)/1000}s`);
  }
  encoder.stdin.end();
  const [code] = await completed;
  if (code !== 0) throw new Error(`ffmpeg failed: ${code}`);
  console.log('1080p / 30 fps / 48 seconds rendered.');
}
await browser.close();
