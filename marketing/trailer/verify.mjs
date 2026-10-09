import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';

// Delivery check for our locally generated player and video files only.
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5181/marketing/trailer/watch.html');
  await page.waitForFunction(() => document.querySelector('video').readyState >= 1);
  const results = [];
  for (const lang of ['en','zh-CN']) {
    if (lang !== 'en') {
      await page.locator(`[data-lang="${lang}"]`).click();
      await page.waitForFunction(() => document.querySelector('video').currentSrc.includes('zh-CN') && document.querySelector('video').readyState >= 1);
    }
    const metadata = await page.locator('video').evaluate(v => ({ width:v.videoWidth, height:v.videoHeight, duration:v.duration, error:v.error?.message ?? null }));
    assert.equal(metadata.width,1920); assert.equal(metadata.height,1080); assert(Math.abs(metadata.duration-48)<.05); assert.equal(metadata.error,null);
    await page.locator('video').evaluate(v => new Promise((yes,no) => {
      v.addEventListener('error', () => no(new Error(v.error?.message)), {once:true});
      v.addEventListener('seeked', yes, {once:true}); v.currentTime=43.2;
    }));
    await page.screenshot({path:`marketing/trailer/.renders/player-${lang}.png`});
    const playback = await page.locator('video').evaluate(async v => {
      v.muted=true;await v.play();const before=v.currentTime;await new Promise(resolve=>setTimeout(resolve,450));v.pause();return {advances:v.currentTime>before,decodedFrames:v.getVideoPlaybackQuality().totalVideoFrames,error:v.error?.message??null};
    });
    assert(playback.advances);assert(playback.decodedFrames>0);assert.equal(playback.error,null);
    results.push({lang,...metadata,...playback});
  }
  assert.deepEqual(errors,[]);
  await writeFile('marketing/trailer/.renders/playback-check.json',JSON.stringify({results,errors},null,2));
  console.log(JSON.stringify({results,errors}));
} finally { await browser.close(); }
