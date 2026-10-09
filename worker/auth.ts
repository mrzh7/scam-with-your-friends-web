export interface Env { ACCOUNTS_ENABLED?: string; ADMIN_EMAIL?: string; ASSETS: Fetcher; RESEND_API_KEY?: string; EMAIL_FROM?: string; SITE_SETTINGS_KEY?: string; DB: D1Database; ROOMS: DurableObjectNamespace; OPENROUTER_API_KEY?: string; AI_API_KEY?: string; AI_MODEL?: string; AI_BASE_URL?: string; TURN_KEY_ID?: string; TURN_API_TOKEN?: string; TTS_PROVIDER?: string; TTS_API_KEY?: string; TTS_MODEL?: string; TTS_BASE_URL?: string; TTS_VOICE?: string; TTS_VOICES?: string; AUTH_ORIGIN?: string; GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string; WECHAT_APP_ID?: string; WECHAT_APP_SECRET?: string; }
export interface UserRow { id: string; name: string; email: string | null; profile_email?: string | null; email_verified_at?: number | null; password_hash: string | null; salt: string | null; guest: number; session_hash?: string; session_expires_at?: number }
const encoder = new TextEncoder();
export async function digest(value: string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))), n => n.toString(16).padStart(2, '0')).join(''); }
export async function passwordHash(password: string, salt: string) { const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']); return Array.from(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 100000 }, key, 256)), n => n.toString(16).padStart(2, '0')).join(''); }
export function constantEqual(a: string, b: string) { if (a.length !== b.length) return false; let result = 0; for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i); return result === 0; }
export async function currentUser(request: Request, env: Env) { const token = request.headers.get('Cookie')?.match(/(?:^|;\s*)swyf_session=([^;]+)/)?.[1]; if (!token) return null; return env.DB.prepare('SELECT u.*, s.token_hash AS session_hash, s.expires_at AS session_expires_at FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token_hash = ? AND s.expires_at > ? AND u.guest=0').bind(await digest(token), Date.now()).first<UserRow>(); }
export async function sessionCookie(userId: string, request: Request, env: Env, anonymous = false) { const token = `${crypto.randomUUID()}${crypto.randomUUID()}`; const days = anonymous ? 365 : 30; await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)').bind(await digest(token), userId, Date.now() + days * 86400000).run(); const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''; return `${anonymous ? 'swyf_guest' : 'swyf_session'}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${days * 86400}${secure}`; }
export async function rateLimit(request: Request, env: Env, bucket: string, limit = 20) { const ip = request.headers.get('CF-Connecting-IP') || 'local'; const key = `${bucket}:${await digest(ip)}:${Math.floor(Date.now() / 600000)}`; const row = await env.DB.prepare('INSERT INTO rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key, Date.now() + 600000).first<{ count: number }>(); return (row?.count || 0) <= limit; }
export const publicUser = (u: UserRow) => ({ id: u.id, name: u.name, email: u.email || u.profile_email || '', emailVerified: !u.email || !!u.email_verified_at });

/** Missing/false disables accounts; unexpected values fail closed to login mode. */
export function accountsEnabled(env: Env) { return ![undefined, '', 'false', '0'].includes(env.ACCOUNTS_ENABLED?.trim().toLowerCase()); }
export async function currentPlayer(request: Request, env: Env) {
 if (accountsEnabled(env)) return currentUser(request, env);
 const token = request.headers.get('Cookie')?.match(/(?:^|;\s*)swyf_guest=([^;]+)/)?.[1];
 if (!token) return null;
 return env.DB.prepare('SELECT u.*, s.token_hash AS session_hash, s.expires_at AS session_expires_at FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>? AND u.guest=1').bind(await digest(token),Date.now()).first<UserRow>();
}
export async function anonymousSession(request: Request, env: Env) {
 if (accountsEnabled(env)) return Response.json({error:'Accounts are enabled.',code:'AUTH_REQUIRED'},{status:401});
 const existing = await currentPlayer(request,env);
 if (existing) return Response.json({user:{...publicUser(existing),anonymous:true}},{headers:{'Cache-Control':'no-store'}});
 if (!await rateLimit(request,env,'anonymous-session',20)) return Response.json({error:'Too many new sessions. Please try again later.'},{status:429});
 const id=crypto.randomUUID();
 await env.DB.prepare('INSERT INTO users(id,name,guest,created_at) VALUES (?,?,1,?)').bind(id,'Guest Employee',Date.now()).run();
 const user:UserRow={id,name:'Guest Employee',email:null,password_hash:null,salt:null,guest:1};
 return Response.json({user:{...publicUser(user),anonymous:true}},{headers:{'Cache-Control':'no-store','Set-Cookie':await sessionCookie(id,request,env,true)}});
}
