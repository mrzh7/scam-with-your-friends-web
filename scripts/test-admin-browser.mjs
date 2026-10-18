// Local UI regression checks with synthetic API data; no live accounts or providers.
import fs from 'node:fs';
import {createServer} from 'node:http';
import path from 'node:path';
import {chromium, expect} from '@playwright/test';

const root = path.resolve('dist/client');
if (!fs.existsSync(path.join(root, 'index.html'))) throw Error('Run npm run build before this browser check.');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon'};
const server = createServer((request, response) => {
 const pathname = new URL(request.url, 'http://localhost').pathname;
 const file = path.resolve(root, '.' + (pathname === '/admin' ? '/index.html' : pathname));
 if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {response.writeHead(404).end(); return;}
 response.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
 response.end(fs.readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
 browser = await chromium.launch({channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true});
 const page = await browser.newPage({viewport: {width: 1440, height: 1000}, locale: 'zh-CN'});
 const errors = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.route('https://fonts.googleapis.com/**', route => route.abort());
 await page.route('https://fonts.gstatic.com/**', route => route.abort());
 const now = Date.parse('2026-10-18T12:00:00Z');
 const users = Array.from({length: 51}, (_, i) => ({id: `user-${String(i).padStart(3, '0')}`, name: i === 0 ? '<script>用户 100%_</script>' : `Employee ${i}`,
  email: `employee-${i}@example.com`, providers: i % 2 ? ['google'] : ['email', 'google'], createdAt: now - i * 86400000,
  lastSaveAt: i % 3 ? now - i * 3600000 : null, hasSave: i % 5 !== 0, roomCount: i % 4}));
 const stats = {generatedAt: now, totalUsers: 51, newUsers24h: 3, newUsers7d: 16, newUsers30d: 42,
  activeUsers24h: 12, activeUsers7d: 28, activeUsers30d: 40, savedUsers: 45, savedRooms: 17,
  registrations: Array.from({length: 30}, (_, i) => ({date: new Date(now - (29 - i) * 86400000).toISOString().slice(0, 10), count: i % 7}))};
 const settings = {ai: {base: 'https://provider.example/v1', model: 'existing-model', hasKey: true}, speech: {provider: 'browser', base: '', model: '', voice: '', voices: [], hasKey: false}, storageReady: true};
 let failure = 0, lastUpdate;
 await page.route('**/api/admin/**', async route => {
  const url = new URL(route.request().url());
  if (failure) return route.fulfill({status: failure, json: {error: 'Temporary test failure'}});
  if (url.pathname.endsWith('/stats')) return route.fulfill({json: stats});
  if (url.pathname.endsWith('/users')) {
   const query = (url.searchParams.get('q') || '').toLowerCase();
   const pageNumber = Number(url.searchParams.get('page') || 1), pageSize = Number(url.searchParams.get('pageSize') || 25);
   const filtered = users.filter(user => [user.name, user.email, user.id].some(value => value.toLowerCase().includes(query)));
   return route.fulfill({json: {users: filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize), total: filtered.length, page: pageNumber, pageSize}});
  }
  if (route.request().method() === 'PUT') {lastUpdate = route.request().postDataJSON(); settings.ai.model = lastUpdate.model; return route.fulfill({json: {ok: true}});}
  return route.fulfill({json: settings});
 });
 const output = '.local-config/admin-browser'; fs.mkdirSync(output, {recursive: true});
 await page.goto(`http://127.0.0.1:${server.address().port}/admin`, {waitUntil: 'domcontentloaded'});
 await expect(page.locator('.admin-metrics > div')).toHaveCount(9);
 await expect(page.locator('.admin-bars > div')).toHaveCount(30);
 await page.getByText('查看每日数据', {exact: true}).click();
 await expect(page.locator('.admin-trend tbody tr')).toHaveCount(30);
 await page.getByText('查看每日数据', {exact: true}).click();
 await page.screenshot({path: `${output}/overview-desktop.png`, fullPage: true});

 await page.getByRole('button', {name: '用户列表', exact: true}).click();
 await expect(page.locator('.admin-users-table tbody tr')).toHaveCount(25);
 await expect(page.getByText('<script>用户 100%_</script>', {exact: true})).toBeVisible();
 await expect(page.locator('.admin-users-table script')).toHaveCount(0);
 await page.getByRole('button', {name: '下一页', exact: true}).click();
 await expect(page.locator('.admin-users-table tbody tr').first()).toContainText('Employee 25');
 await expect(page.getByText('第 2 页 / 共 3 页', {exact: true})).toBeVisible();
 await page.getByRole('button', {name: '上一页', exact: true}).click();
 await expect(page.locator('.admin-users-table tbody tr').first()).toContainText('user-000');
 await page.getByLabel('搜索用户', {exact: true}).fill('100%_');
 await page.getByRole('button', {name: '搜索用户', exact: true}).click();
 await expect(page.locator('.admin-users-table tbody tr')).toHaveCount(1);
 await expect(page.getByRole('button', {name: '下一页', exact: true})).toBeDisabled();
 await page.getByLabel('搜索用户', {exact: true}).fill('missing-user');
 await page.getByRole('button', {name: '搜索用户', exact: true}).click();
 await expect(page.getByText('没有匹配的用户。', {exact: true})).toBeVisible();
 await page.getByLabel('搜索用户', {exact: true}).fill('');
 await page.getByRole('button', {name: '搜索用户', exact: true}).click();
 await expect(page.locator('.admin-users-table tbody tr')).toHaveCount(25);
 await page.screenshot({path: `${output}/users-desktop.png`, fullPage: true});

 failure = 503;
 await page.getByRole('button', {name: '刷新数据', exact: true}).click();
 await expect(page.getByRole('alert')).toHaveText('管理数据加载失败，请重试。');
 await expect(page.locator('.admin-users-table')).toHaveCount(0);
 failure = 403;
 await page.getByRole('button', {name: '刷新数据', exact: true}).click();
 await expect(page.getByRole('alert')).toHaveText('管理员身份验证失败。');
 failure = 0;
 await page.getByRole('button', {name: '刷新数据', exact: true}).click();
 await expect(page.locator('.admin-users-table tbody tr')).toHaveCount(25);

 await page.getByRole('button', {name: '网站服务管理', exact: true}).click();
 await page.getByLabel('模型 ID', {exact: true}).first().fill('updated-model');
 await page.getByRole('button', {name: '测试并保存 AI 配置', exact: true}).click();
 await expect(page.getByRole('status')).toHaveText('网站配置已保存并生效。');
 expect(lastUpdate).toMatchObject({section: 'ai', model: 'updated-model', base: settings.ai.base});
 expect(lastUpdate).not.toHaveProperty('key');
 await page.getByRole('button', {name: '运营统计', exact: true}).click();
 await expect(page.locator('.admin-metrics > div')).toHaveCount(9);
 for (const [locale, title] of [['en','Site administration'],['pt','Administração do site'],['ja','サイト管理'],['es','Administración del sitio'],['zh','网站管理']]) {
  await page.locator('.language-selector select').selectOption(locale);
  await expect(page.getByRole('heading', {level: 1})).toHaveText(title);
 }
 await page.setViewportSize({width: 390, height: 844});
 await page.screenshot({path: `${output}/overview-mobile.png`, fullPage: true});
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await page.getByRole('button', {name: '用户列表', exact: true}).click();
 await expect(page.locator('.admin-users-table tbody tr')).toHaveCount(25);
 await page.screenshot({path: `${output}/users-mobile.png`, fullPage: true});
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 expect(await page.locator('.admin-table-wrap').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
 expect(errors).toEqual([]);
 console.log('PASS: overview, 30-day trend, user search, pagination, empty/error/retry states, revoked access, settings save, five locales and mobile layout.');
} finally {
 await browser?.close();
 await new Promise(resolve => server.close(resolve));
}
