import {emailVerified,requestVerification,verifyEmail} from './email';
import {normalizeLocale} from '../src/i18n/locales';
import {adminSettings,isAdministrator,runtimeEnv,reservedAdminEmail} from './admin';
import { accountsEnabled, currentPlayer, anonymousSession, currentUser, digest, passwordHash, constantEqual, publicUser, rateLimit, sessionCookie, type Env, type UserRow } from './auth';
import { parseSave } from '../src/game/engine';
import { aiConfigured, generateDialogue, probeAI } from './dialogue';
import { iceConfiguration } from './rtc';
import { speechConfiguration, synthesizeSpeech } from './speech';
import { finishOAuth, startOAuth, providerConfiguration, type Provider } from './oauth';
import { readSave, writeSave } from './saves';
export { OfficeRoom } from './room';
const json = (value: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
async function body(request: Request) { const reader = request.body?.getReader(); if (!reader) throw new SyntaxError('No body'); const chunks: Uint8Array[] = []; let length = 0; while (true) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength; if (length > 100000) { await reader.cancel(); throw new Error('BODY_TOO_LARGE'); } chunks.push(value); } const all = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.byteLength; } const value = JSON.parse(new TextDecoder().decode(all)); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SyntaxError('Expected object'); return value; }
export default {
 async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url); const path = url.pathname;
  if (path === '/admin' || path.startsWith('/admin/')) { if (!await isAdministrator(request,env)) return new Response('Access denied',{status:403,headers:{'Cache-Control':'no-store'}}); const response=await env.ASSETS.fetch(request);const headers=new Headers(response.headers);headers.set("Cache-Control","private, no-store");headers.set("Vary","Cookie");return new Response(response.body,{status:response.status,headers}); }
  if (!path.startsWith('/api/')) return new Response('Not found', { status: 404 });
  const oauthCallback = request.method === 'GET' && path.match(/^\/api\/auth\/(google|wechat)\/callback$/);
  // OAuth returns by top-level cross-site navigation; its one-time state and
  // browser-bound cookie are checked in finishOAuth instead of this origin gate.
  if (!oauthCallback && request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) return json({ error: '不允许跨站请求' }, 403);
  if (!oauthCallback && request.headers.get('Sec-Fetch-Site') === 'cross-site') return json({ error: '不允许跨站请求' }, 403);
  if (Number(request.headers.get('Content-Length')) > 100000) return json({ error: '请求过大' }, 413);
  try {
   if (path === '/api/admin/settings') return adminSettings(request,env);
   if (path === '/api/config' || path === '/api/dialogue' || path === '/api/speech' || path === '/api/ai/test') env = await runtimeEnv(env);
   const withAccounts = accountsEnabled(env);
   if (path === '/api/session/anonymous' && request.method === 'POST') return anonymousSession(request,env);
   if (!withAccounts && path.startsWith('/api/auth/') && !['/api/auth/me','/api/auth/providers'].includes(path)) return json({error:'Account system is disabled.',code:'ACCOUNTS_DISABLED'},404);
   if (oauthCallback) return finishOAuth(request, env, oauthCallback[1] as Provider);
   if (path === '/api/auth/providers' && request.method === 'GET') return json(withAccounts ? providerConfiguration(env) : {google:false,wechat:false});
   const oauthStart = path.match(/^\/api\/auth\/(google|wechat)\/start$/);
   if (oauthStart && request.method === 'POST') { const data = await body(request); return startOAuth(request, env, oauthStart[1] as Provider, data.link === true); }
   if (path === '/api/health') return json({ ok: true, runtime: 'cloudflare-workers', version: '0.2.0' });
   if (path === '/api/config' && request.method === 'GET') return json({ accountsEnabled: withAccounts, ai: aiConfigured(env), model: null, missing: [], speech: {provider:speechConfiguration(env).provider, available:speechConfiguration(env).available}, relay: !!(env.TURN_KEY_ID && env.TURN_API_TOKEN) });
   if (path === '/api/ai/test' && request.method === 'POST') {
    const user = await currentUser(request, env); if (!user) return json({ error: '请先登录。' }, 401); if (!await isAdministrator(request,env)) return json({error:'Administrator access required.'},403);
    if (!aiConfigured(env)) return json({ error: 'AI 尚未配置密钥与模型。' }, 503);
    if (!await rateLimit(request, env, 'ai-test:' + user.id, 10)) return json({ error: '连接测试过于频繁，请稍后再试。' }, 429);
    try { return json(await probeAI(env)); } catch (e) { return json({ error: e instanceof Error ? e.message : 'AI 连接测试失败。' }, 502); }
   }
   if (path === '/api/auth/register' && request.method === 'POST') {
    const data=await body(request);if(reservedAdminEmail(String(data.email||''),env))return json({error:'Use the verified Google identity for this account.'},403);
    return requestVerification(request,env,data,true);
   }
   if(path==='/api/auth/verification/send'&&request.method==='POST')return requestVerification(request,env,await body(request));
   if(path==='/api/auth/verification/confirm'&&request.method==='POST')return verifyEmail(request,env,await body(request));
   if (path === '/api/auth/login' && request.method === 'POST') {
    if (!await rateLimit(request, env, 'login', 20)) return json({ error: '尝试过于频繁，请 10 分钟后再试。' }, 429);
    const data = await body(request); const password = String(data.password || ''); if (password.length > 128) return json({ error: '邮箱或密码不正确。' }, 401);
    const user = await env.DB.prepare('SELECT * FROM users WHERE email=? AND guest=0').bind(String(data.email || '').trim().toLowerCase()).first<UserRow>();
    const hash = await passwordHash(password, user?.salt || 'dummy-salt-timing-normalization');
    if (!user?.password_hash || !constantEqual(hash, user.password_hash)) return json({ error: '邮箱或密码不正确。' }, 401);
    ctx.waitUntil(env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()), env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(Date.now())]));
    return json({ user: publicUser(user) }, 200, { 'Set-Cookie': await sessionCookie(user.id, request, env) });
   }
   if (path === '/api/auth/logout' && request.method === 'POST') {
    const previous = await currentUser(request, env), token = request.headers.get('Cookie')?.match(/(?:^|;\s*)swyf_session=([^;]+)/)?.[1];
    if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();
    if (previous?.session_hash) {
     const rooms = await env.DB.prepare('SELECT room_code FROM room_saves WHERE user_id=?').bind(previous.id).all<{ room_code: string }>();
     ctx.waitUntil(Promise.allSettled(rooms.results.map(room => env.ROOMS.get(env.ROOMS.idFromName(room.room_code)).fetch(new Request('https://room/revoke', { method: 'POST', body: JSON.stringify({ sessionHash: previous.session_hash }) })))));
    }
    return json({ ok: true }, 200, { 'Set-Cookie': `swyf_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${url.protocol === 'https:' ? '; Secure' : ''}` });
   }
   const user = await currentPlayer(request, env);
   if (path === '/api/auth/me' && request.method === 'GET') return json({ accountsEnabled: withAccounts, user: user ? {...publicUser(user),anonymous:!withAccounts} : null });
   if (!user) return json({ error: '请先注册或登录后再玩游戏。', code: 'AUTH_REQUIRED' }, 401);
   if (!emailVerified(user)) return json({error:'请先验证邮箱，再开始游戏。',code:'EMAIL_VERIFICATION_REQUIRED'},403);
   if (path === '/api/auth/identities' && request.method === 'GET') {
    const identities = await env.DB.prepare('SELECT provider FROM auth_identities WHERE user_id=?').bind(user.id).all<{ provider: string }>();
    return json({ providers: identities.results.map(row => row.provider), password: !!user.password_hash });
   }
   if (path === '/api/account/rooms' && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT room_code,state_json,updated_at FROM room_saves WHERE user_id=? ORDER BY updated_at DESC LIMIT 20').bind(user.id).all<{ room_code: string; state_json: string; updated_at: number }>();
    return json({ rooms: rows.results.map(row => { const state = parseSave(JSON.parse(row.state_json)); return { code: row.room_code, day: state?.day, balance: state?.balance, phase: state?.phase, updatedAt: row.updated_at }; }) });
   }
   if (path === '/api/session' && request.method === 'POST') {
    return json({ ok: true, userId: user.id });
   }
   if (path === '/api/dialogue' && request.method === 'POST') {
    if (!user) return json({ error: '请先建立游戏会话。' }, 401);
    if (!aiConfigured(env)) return json({ error: 'AI 尚未配置：需要服务端密钥与模型名称。' }, 503);
    if (!await rateLimit(request, env, `dialogue-${user.id}`, 60)) return json({ error: 'AI 对话额度暂时用完，10 分钟后恢复。' }, 429);
    const data = await body(request); const state = parseSave(data.state);
    if (!state?.call || state.call.status !== 'active' || state.phase !== 'playing' || state.event || typeof data.text !== 'string' || !data.text.trim() || data.text.length > 200) return json({ error: '通话状态或应答内容无效。' }, 400);
    try { return json(await generateDialogue(env, state.call, data.text, fetch, normalizeLocale(data.locale))); } catch (e) { return json({ error: e instanceof Error ? e.message : 'AI 暂时不可用。' }, 502); }
   }
   if (path === '/api/speech' && request.method === 'POST') {
    if (!user) return json({error:'请先建立游戏会话。'},401);
    if (!speechConfiguration(env).available) return json({error:'语音：尚未配置云端 TTS。'},503);
    if (!await rateLimit(request,env,`speech-${user.id}`,90)) return json({error:'语音合成过于频繁，请稍后重试。'},429);
    const data = await body(request);
    if (typeof data.text !== 'string' || data.text.length > 1200 || !data.text.trim() || !Number.isInteger(data.person) || data.person < 0 || data.person > 7) return json({error:'语音文本或角色无效。'},400);
    try { return await synthesizeSpeech(env,{text:data.text,person:data.person,speed:data.speed,locale:normalizeLocale(data.locale)},request.signal); } catch (e) { return json({error:e instanceof Error ? e.message : '语音暂不可用。'},502); }
   }
   if (path === '/api/voice/ice' && request.method === 'GET') {
    if (!user) return json({ error: '请先加入办公室。' }, 401);
    if (!await rateLimit(request, env, `ice-${user.id}`, 12)) return json({ error: '语音连接请求过于频繁。' }, 429);
    try { return json(await iceConfiguration(env)); } catch (e) { return json({ error: e instanceof Error ? e.message : '中继服务暂时不可用。' }, 502); }
   }
   if (path === '/api/save') {
    if (request.method === 'GET') return json(await readSave(env, user.id));
    if (request.method === 'PUT') { const result = await writeSave(env, user, await body(request)); return json(result.body, result.status); }
   }
   if (path === '/api/rooms' && request.method === 'POST') {
    if (!await rateLimit(request, env, 'room', 20)) return json({ error: '创建房间过于频繁。' }, 429);
    const data = await body(request); const name = String(data.name || user.name).trim().slice(0, 24) || user.name;
    const joining = typeof data.code === 'string' && data.code.length > 0; const code = joining ? data.code.toUpperCase() : Array.from(crypto.getRandomValues(new Uint8Array(6)), n => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n % 32]).join('');
    if (!/^[A-Z2-9]{6}$/.test(code)) return json({ error: '请输入六位房间码。' }, 400);
    const stub = env.ROOMS.get(env.ROOMS.idFromName(code)); const response = await stub.fetch(new Request(`https://room/${joining ? 'join' : 'create'}`, { method: 'POST', body: JSON.stringify({ id: user.id, name, code }) }));
    const payload = await response.json(); return json(payload, response.status);
   }
   const match = path.match(/^\/api\/rooms\/([A-Z2-9]{6})\/socket$/);
   if (match && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') { const headers = new Headers(request.headers); headers.set('X-Player-Id', user.id); headers.set('X-Session-Hash', user.session_hash!); headers.set('X-Session-Expires', String(user.session_expires_at)); const stub = env.ROOMS.get(env.ROOMS.idFromName(match[1])); return stub.fetch(new Request(request, { headers })); }
   return json({ error: '未找到此接口。' }, 404);
  } catch (e) { if (e instanceof SyntaxError) return json({ error: 'JSON 格式无效。' }, 400); if (String(e).includes('BODY_TOO_LARGE')) return json({ error: '请求过大。' }, 413); console.error('API error', e instanceof Error ? e.message : 'Unknown error'); return json({ error: '服务暂不可用。请确认数据库迁移已执行。' }, 503); }
 },
} satisfies ExportedHandler<Env>;
