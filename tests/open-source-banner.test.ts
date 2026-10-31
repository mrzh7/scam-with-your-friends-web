import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import messages from '../src/openSourceMessages.json';
import { locales } from '../src/i18n/locales';

// Guard: the demo site must always show the open-source banner (see docs/DEPLOYMENT.md).
describe('open-source banner', () => {
  it('is rendered by App and links to the exact repo URL', () => {
    expect(readFileSync('src/App.tsx', 'utf8')).toContain('<OpenSourceBanner/>');
    expect(readFileSync('src/OpenSourceBanner.tsx', 'utf8')).toContain("'https://github.com/mrzh7/scam-with-your-friends-web'");
  });
  it('has copy for every supported locale', () => {
    for (const locale of locales) expect(Object.keys(messages)).toContain(locale);
  });
});
