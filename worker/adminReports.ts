import {isAdministrator} from './admin';
import type {Env} from './auth';
import type {AdminStats, AdminUser, AdminUsers} from '../src/game/adminReports';

const DAY = 86400000;
const headers = {'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff'};
const json = (data: unknown, status = 200) => Response.json(data, {status, headers});
// Initial single-player saves (revision 0) are created by reads, not gameplay.
// Room snapshots and successful single-player writes count once per account.
const activity = `WITH activity AS (
 SELECT user_id, MAX(updated_at) AS last_save_at FROM (
  SELECT user_id, updated_at FROM saves WHERE revision > 0
  UNION ALL SELECT user_id, updated_at FROM room_saves
 ) GROUP BY user_id
)`;
const email = `COALESCE(u.email, u.profile_email,
 (SELECT verified_email FROM auth_identities WHERE user_id=u.id AND provider='google'))`;

function integer(value: string | null, fallback: number, max: number) {
 if (value === null) return fallback;
 if (!/^[1-9]\d*$/.test(value) || Number(value) > max) return null;
 return Number(value);
}

export async function adminReports(request: Request, env: Env, report: 'users' | 'stats') {
 if (!await isAdministrator(request, env)) return json({error: 'Administrator access required.'}, 403);
 if (request.method !== 'GET') return new Response(null, {status: 405, headers: {...headers, Allow: 'GET'}});
 return report === 'users' ? users(request, env) : stats(env);
}

async function users(request: Request, env: Env) {
 const params = new URL(request.url).searchParams;
 const page = integer(params.get('page'), 1, 1000000);
 const pageSize = integer(params.get('pageSize'), 25, 100);
 const query = (params.get('q') || '').trim();
 if (page === null || pageSize === null || query.length > 100) return json({error: 'Invalid user search or pagination.'}, 400);
 // Treat SQL wildcard characters as literal search text.
 const pattern = '%' + query.replace(/[\\%_]/g, '\\$&') + '%';
 const filter = `u.guest=0${query ? ` AND (u.id LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\' OR ${email} LIKE ? ESCAPE '\\')` : ''}`;
 const bindings = query ? [pattern, pattern, pattern] : [];
 type Row = Omit<AdminUser, 'providers' | 'hasSave'> & {hasSave: number; passwordLogin: number; google: number; wechat: number};
 const results = await env.DB.batch([
  env.DB.prepare(`SELECT COUNT(*) AS total FROM users u WHERE ${filter}`).bind(...bindings),
  env.DB.prepare(`${activity}
   SELECT u.id, u.name, ${email} AS email, u.created_at AS createdAt,
    a.last_save_at AS lastSaveAt,
    (EXISTS(SELECT 1 FROM saves WHERE user_id=u.id) OR EXISTS(SELECT 1 FROM room_saves WHERE user_id=u.id)) AS hasSave,
    (SELECT COUNT(*) FROM room_saves WHERE user_id=u.id) AS roomCount,
    (u.password_hash IS NOT NULL) AS passwordLogin,
    EXISTS(SELECT 1 FROM auth_identities WHERE user_id=u.id AND provider='google') AS google,
    EXISTS(SELECT 1 FROM auth_identities WHERE user_id=u.id AND provider='wechat') AS wechat
   FROM users u LEFT JOIN activity a ON a.user_id=u.id WHERE ${filter}
   ORDER BY u.created_at DESC, u.id ASC LIMIT ? OFFSET ?`).bind(...bindings, pageSize, (page - 1) * pageSize),
 ]);
 const rows = results[1].results as unknown as Row[];
 return json({
  users: rows.map(({passwordLogin, google, wechat, hasSave, ...row}) => ({...row, hasSave: !!hasSave,
   providers: [...(passwordLogin ? ['email'] : []), ...(google ? ['google'] : []), ...(wechat ? ['wechat'] : [])],
  })),
  total: (results[0].results[0] as {total: number}).total, page, pageSize,
 } satisfies AdminUsers);
}

async function stats(env: Env) {
 const now = Date.now();
 const today = Math.floor(now / DAY) * DAY;
 const start = today - 29 * DAY;
 const results = await env.DB.batch([
  env.DB.prepare(`${activity}
   SELECT COUNT(*) AS totalUsers,
    COALESCE(SUM(u.created_at BETWEEN ? AND ?),0) AS newUsers24h,
    COALESCE(SUM(u.created_at BETWEEN ? AND ?),0) AS newUsers7d,
    COALESCE(SUM(u.created_at BETWEEN ? AND ?),0) AS newUsers30d,
    COALESCE(SUM(a.last_save_at BETWEEN ? AND ?),0) AS activeUsers24h,
    COALESCE(SUM(a.last_save_at BETWEEN ? AND ?),0) AS activeUsers7d,
    COALESCE(SUM(a.last_save_at BETWEEN ? AND ?),0) AS activeUsers30d,
    COALESCE(SUM(EXISTS(SELECT 1 FROM saves WHERE user_id=u.id) OR EXISTS(SELECT 1 FROM room_saves WHERE user_id=u.id)),0) AS savedUsers
   FROM users u LEFT JOIN activity a ON a.user_id=u.id WHERE u.guest=0`)
   .bind(now - DAY, now, now - 7 * DAY, now, now - 30 * DAY, now,
    now - DAY, now, now - 7 * DAY, now, now - 30 * DAY, now),
  env.DB.prepare(`SELECT COUNT(DISTINCT r.room_code) AS savedRooms FROM room_saves r JOIN users u ON u.id=r.user_id WHERE u.guest=0`),
  env.DB.prepare(`SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS date, COUNT(*) AS count
   FROM users WHERE guest=0 AND created_at BETWEEN ? AND ? GROUP BY date ORDER BY date`).bind(start, now),
 ]);
 const counts = new Map((results[2].results as unknown as {date: string; count: number}[]).map(row => [row.date, row.count]));
 const registrations = Array.from({length: 30}, (_, i) => {
  const date = new Date(start + i * DAY).toISOString().slice(0, 10);
  return {date, count: counts.get(date) || 0};
 });
 return json({
  ...results[0].results[0] as Omit<AdminStats, 'generatedAt' | 'savedRooms' | 'registrations'>, generatedAt: now,
  savedRooms: (results[1].results[0] as {savedRooms: number}).savedRooms, registrations,
 } satisfies AdminStats);
}
