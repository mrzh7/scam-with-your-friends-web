vi.mock('../worker/room', () => ({OfficeRoom: class {}}));
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {accountDatabase} from './account-db';
import {sessionCookie, type Env} from '../worker/auth';
import worker from '../worker/index';
import type {AdminStats, AdminUsers} from '../src/game/adminReports';

const DAY = 86400000;
const now = Date.parse('2026-10-18T12:00:00Z');
const administratorEmail = 'admin@example.com';
let db: ReturnType<typeof accountDatabase>, env: Env, cookie: string;
const ctx = {waitUntil: vi.fn()} as unknown as ExecutionContext;
function user(id: string, createdAt = now, guest = 0, name = id, email: string | null = `${id}@example.com`) {
 db.sqlite.prepare('INSERT INTO users(id,name,email,guest,created_at,password_hash,salt) VALUES(?,?,?,?,?,?,?)')
  .run(id, name, email, guest, createdAt, 'never-return-this-hash', 'never-return-this-salt');
}
function save(id: string, updatedAt: number, revision = 1) {
 db.sqlite.prepare('INSERT INTO saves(user_id,state_json,updated_at,revision) VALUES(?,?,?,?)').run(id, '{"private":"save-content"}', updatedAt, revision);
}
function room(id: string, code: string, updatedAt: number) {
 db.sqlite.prepare('INSERT INTO room_saves(user_id,room_code,state_json,updated_at) VALUES(?,?,?,?)').run(id, code, '{}', updatedAt);
}
function request(path: string, token = cookie, method = 'GET', origin = 'https://game.example') {
 return worker.fetch(new Request(`https://game.example/api/admin/${path}`, {method, headers: {Cookie: token, Origin: origin}}), env, ctx);
}
beforeEach(async () => {
 vi.spyOn(Date, 'now').mockReturnValue(now);
 db = accountDatabase();
 env = {...db.env, ...{ADMIN_EMAIL: administratorEmail}};
 user('admin', now - 40 * DAY, 0, 'Admin', administratorEmail);
 db.sqlite.prepare('INSERT INTO auth_identities(provider,subject,user_id,created_at,verified_email) VALUES(?,?,?,?,?)')
  .run('google', 'admin-google', 'admin', now, administratorEmail);
 cookie = (await sessionCookie('admin', new Request('https://game.example'), env)).split(';')[0];
});
afterEach(() => {db.sqlite.close(); vi.restoreAllMocks();});

it.each([undefined, '', 'false', '0'])('keeps reports disabled with ACCOUNTS_ENABLED=%s', async value => {
 env.ACCOUNTS_ENABLED = value;
 const prepare = vi.spyOn(env.DB, 'prepare');
 for (const path of ['users', 'stats']) expect((await request(path)).status).toBe(403);
 expect(prepare).not.toHaveBeenCalled();
});
it('requires ADMIN_EMAIL even when accounts are enabled', async () => {
 delete env.ADMIN_EMAIL;
 for (const path of ['users', 'stats']) expect((await request(path)).status).toBe(403);
});

describe.each(['users', 'stats'])('Admin %s authorization', path => {
 it('denies visitors, forged cookies, ordinary users and expired administrators', async () => {
  for (const token of ['', 'swyf_session=forged']) expect((await request(path, token)).status).toBe(403);
  user('ordinary');
  const ordinary = (await sessionCookie('ordinary', new Request('https://game.example'), env)).split(';')[0];
  expect((await request(path, ordinary)).status).toBe(403);
  db.sqlite.prepare('UPDATE sessions SET expires_at=?').run(now - 1);
  expect((await request(path)).status).toBe(403);
 });
 it('requires the existing verified Google identity and rejects cross-origin requests', async () => {
  expect((await request(path, cookie, 'GET', 'https://other.example')).status).toBe(403);
  db.sqlite.prepare('UPDATE auth_identities SET verified_email=NULL').run();
  expect((await request(path)).status).toBe(403);
 });
 it('is read-only and cannot be cached', async () => {
  const response = await request(path);
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  expect(response.headers.get('Vary')).toBe('Cookie');
  for (const method of ['POST', 'PUT', 'DELETE']) {
   const denied = await request(path, cookie, method);
   expect(denied.status).toBe(405); expect(denied.headers.get('Allow')).toBe('GET');
  }
 });
});

describe('User directory', () => {
 it('paginates in stable registration order, excludes guests, and returns no credentials or save contents', async () => {
  for (let i = 0; i < 28; i++) user(`person-${String(i).padStart(2, '0')}`, now);
  user('anonymous', now, 1);
  save('person-00', now);
  room('person-00', 'ABCDEF', now - 1000);
  room('person-00', 'BCDEFG', now - 2000);
  db.sqlite.prepare('INSERT INTO auth_identities(provider,subject,user_id,created_at) VALUES(?,?,?,?)').run('wechat', 'wx-1', 'person-00', now);
  const first = await (await request('users')).json() as AdminUsers;
  const second = await (await request('users?page=2')).json() as AdminUsers;
  expect(first).toMatchObject({total: 29, page: 1, pageSize: 25});
  expect(first.users).toHaveLength(25); expect(second.users).toHaveLength(4);
  expect(new Set([...first.users, ...second.users].map(row => row.id)).size).toBe(29);
  expect(first.users[0]).toMatchObject({id: 'person-00', providers: ['email', 'wechat'], roomCount: 2, hasSave: true, lastSaveAt: now});
  expect(second.users.at(-1)?.id).toBe('admin');
  const text = JSON.stringify(first);
  for (const secret of ['never-return', 'password_hash', 'salt', 'token_hash', 'save-content', 'state_json', cookie]) expect(text).not.toContain(secret);
 });
 it('searches names, emails and IDs and treats SQL wildcards as literal characters', async () => {
  user('special-id', now, 0, '测试 100%_\\', 'SPECIAL@example.com');
  user('other', now, 0, '100 percent');
  for (const query of ['测试', 'special@EXAMPLE', 'special-id', '%_\\']) {
   const result = await (await request('users?q=' + encodeURIComponent(query))).json() as AdminUsers;
   expect(result.total).toBe(1); expect(result.users[0].id).toBe('special-id');
  }
  const empty = await (await request('users?q=' + encodeURIComponent("' OR 1=1 --"))).json() as AdminUsers;
  expect(empty).toMatchObject({users: [], total: 0});
 });
 it('handles accounts without email or a written save and uses Google verified email as a fallback', async () => {
  user('no-email', now, 0, 'No email', null); save('no-email', now, 0);
  db.sqlite.prepare('INSERT INTO auth_identities(provider,subject,user_id,created_at,verified_email) VALUES(?,?,?,?,?)').run('google', 'fallback', 'no-email', now, 'fallback@example.com');
  const result = await (await request('users?q=fallback')).json() as AdminUsers;
  expect(result.users[0]).toMatchObject({email: 'fallback@example.com', lastSaveAt: null, hasSave: true, roomCount: 0});
 });
 it.each(['page=0', 'page=-1', 'page=1.5', 'page=1000001', 'pageSize=0', 'pageSize=101', 'pageSize=NaN', 'q=' + 'x'.repeat(101)])('validates %s', async query => {
  expect((await request('users?' + query)).status).toBe(400);
 });
 it('returns an empty page beyond the result set', async () => {
  expect(await (await request('users?page=99')).json()).toMatchObject({users: [], total: 1, page: 99});
 });
});

describe('Operations statistics', () => {
 it('deduplicates accounts and rooms, excludes guests, and respects rolling time boundaries', async () => {
  user('a', now - 40 * DAY); save('a', now); room('a', 'SHARED', now);
  user('b', now - 6 * DAY); save('b', now - 6 * DAY); room('b', 'SHARED', now - 3600000);
  user('c', now - 20 * DAY); room('c', 'UNIQUE', now - 12 * DAY);
  user('d', now - 31 * DAY); save('d', now - 31 * DAY);
  user('e', now - DAY); save('e', now - 7 * DAY);
  user('anonymous', now, 1); save('anonymous', now); room('anonymous', 'GUESTS', now);
  save('admin', now, 0);
  const result = await (await request('stats')).json() as AdminStats;
  expect(result).toMatchObject({generatedAt: now, totalUsers: 6, newUsers24h: 1, newUsers7d: 2, newUsers30d: 3,
   activeUsers24h: 2, activeUsers7d: 3, activeUsers30d: 4, savedUsers: 6, savedRooms: 2});
  expect(result.registrations).toHaveLength(30);
  expect(result.registrations.reduce((sum, day) => sum + day.count, 0)).toBe(3);
 });
 it('zero-fills UTC calendar days and includes exact midnight but excludes earlier and future registrations', async () => {
  const start = Date.parse('2026-09-19T00:00:00Z');
  user('midnight', start); user('earlier', start - 1); user('today', now); user('future', now + DAY);
  const result = await (await request('stats')).json() as AdminStats;
  expect(result.registrations[0]).toEqual({date: '2026-09-19', count: 1});
  expect(result.registrations[1]).toEqual({date: '2026-09-20', count: 0});
  expect(result.registrations.at(-1)).toEqual({date: '2026-10-18', count: 1});
  expect(result.newUsers24h).toBe(1);
 });
 it('works without a provider key or saved service settings, with no game activity', async () => {
  const result = await (await request('stats')).json() as AdminStats;
  expect(result).toMatchObject({totalUsers: 1, newUsers24h: 0, activeUsers24h: 0, activeUsers7d: 0, activeUsers30d: 0, savedUsers: 0, savedRooms: 0});
  expect(result.registrations.every(day => day.count === 0)).toBe(true);
 });
 it('does not expose database errors to the browser', async () => {
  db.sqlite.exec('DROP TABLE room_saves');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const response = await request('stats');
  expect(response.status).toBe(503); expect(await response.text()).not.toContain('room_saves');
 });
});
