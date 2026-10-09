import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { currentUser, digest, rateLimit, sessionCookie, type Env, type UserRow } from './auth';

export type Provider = 'google' | 'wechat';
export interface ProviderProfile { subject: string; name: string; email: string | null; unionId: string | null }
interface OAuthState { provider: Provider; nonce: string; verifier: string; redirect_uri: string; link_user_id: string | null; link_session_hash: string | null }
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), { timeoutDuration: 5000 });
const random = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), v => v.toString(16).padStart(2, '0')).join('');
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
export function authOrigin(request: Request, env: Env) {
 const origin = new URL(env.AUTH_ORIGIN || request.url);
 if (env.AUTH_ORIGIN && (origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password)) throw new Error('AUTH_ORIGIN must be an origin');
 if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname))) throw new Error('HTTPS required');
 return origin.origin;
}
export const providerReady = (provider: Provider, env: Env) => provider === 'google' ? !!(env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim()) : !!(env.WECHAT_APP_ID?.trim() && env.WECHAT_APP_SECRET?.trim());
export function providerConfiguration(env: Env) { return { google: providerReady('google', env), wechat: providerReady('wechat', env) }; }
function flowCookie(provider: Provider, value: string, request: Request) { return `swyf_oauth_${provider}=${value}; HttpOnly; SameSite=Lax; Path=/api/auth/${provider}; Max-Age=${value ? 600 : 0}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`; }

export async function startOAuth(request: Request, env: Env, provider: Provider, link = false) {
 if (!providerReady(provider, env)) return Response.json({ error: '此登录方式尚未配置，请使用邮箱登录。' }, { status: 503, headers });
 const origin = authOrigin(request, env);
 if (origin !== new URL(request.url).origin) return Response.json({ error: '请在正式站点发起登录。' }, { status: 400, headers });
 if (!await rateLimit(request, env, 'oauth-start', 30)) return Response.json({ error: '登录尝试过于频繁，请稍后重试。' }, { status: 429, headers });
 const user = await currentUser(request, env);
 if(link&&user?.email&&!user.email_verified_at)return Response.json({error:'请先验证邮箱，再绑定登录方式。'},{status:403,headers});
 if (link && !user) return Response.json({ error: '请先登录，再绑定其他登录方式。' }, { status: 401, headers });
 const state = random(), binding = random(), nonce = random(), verifier = random(), redirect = `${origin}/api/auth/${provider}/callback`;
 await env.DB.batch([
  env.DB.prepare('DELETE FROM oauth_states WHERE expires_at < ?').bind(Date.now()),
  env.DB.prepare('INSERT INTO oauth_states(state_hash,binding_hash,provider,nonce,verifier,redirect_uri,link_user_id,link_session_hash,expires_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(await digest(state), await digest(binding), provider, nonce, verifier, redirect, link ? user!.id : null, link ? user!.session_hash : null, Date.now() + 600000),
 ]);
 const url = new URL(provider === 'google' ? 'https://accounts.google.com/o/oauth2/v2/auth' : 'https://open.weixin.qq.com/connect/qrconnect');
 url.searchParams.set(provider === 'google' ? 'client_id' : 'appid', provider === 'google' ? env.GOOGLE_CLIENT_ID! : env.WECHAT_APP_ID!);
 url.searchParams.set('redirect_uri', redirect); url.searchParams.set('response_type', 'code'); url.searchParams.set('state', state);
 url.searchParams.set('scope', provider === 'google' ? 'openid email profile' : 'snsapi_login');
 if (provider === 'google') {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  url.searchParams.set('code_challenge', btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'));
  url.searchParams.set('code_challenge_method', 'S256'); url.searchParams.set('nonce', nonce); url.searchParams.set('prompt', 'select_account');
 } else url.hash = 'wechat_redirect';
 return Response.json({ url: url.href }, { headers: { ...headers, 'Set-Cookie': flowCookie(provider, binding, request) } });
}

export async function exchangeIdentity(provider: Provider, code: string, state: OAuthState, env: Env, fetcher: typeof fetch = fetch, keys: JWTVerifyGetKey = googleKeys): Promise<ProviderProfile> {
 const signal = AbortSignal.timeout(15000);
 if (provider === 'google') {
  const response = await fetcher('https://oauth2.googleapis.com/token', { method: 'POST', signal, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, redirect_uri: state.redirect_uri, grant_type: 'authorization_code', code_verifier: state.verifier }) });
  if (!response.ok) throw new Error('Token exchange failed');
  const token = await response.json() as { id_token?: string };
  if (typeof token.id_token !== 'string') throw new Error('Missing ID token');
  const { payload } = await jwtVerify(token.id_token, keys, { issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: env.GOOGLE_CLIENT_ID, algorithms: ['RS256'], requiredClaims: ['sub', 'iat', 'exp', 'nonce'], maxTokenAge: '10m', clockTolerance: 30 });
  if (payload.nonce !== state.nonce || !payload.sub || payload.sub.length > 255 || (payload.azp && payload.azp !== env.GOOGLE_CLIENT_ID)) throw new Error('Invalid identity claims');
  return { subject: payload.sub, name: typeof payload.name === 'string' ? payload.name.slice(0, 24) : 'Google 员工', email: payload.email_verified === true && typeof payload.email === 'string' ? payload.email.toLowerCase().slice(0, 254) : null, unionId: null };
 }
 const tokenUrl = new URL('https://api.weixin.qq.com/sns/oauth2/access_token');
 tokenUrl.search = new URLSearchParams({ appid: env.WECHAT_APP_ID!, secret: env.WECHAT_APP_SECRET!, code, grant_type: 'authorization_code' }).toString();
 const response = await fetcher(tokenUrl, { signal });
 if (!response.ok) throw new Error('Token exchange failed');
 const token = await response.json() as { errcode?: number; access_token?: string; openid?: string; unionid?: string; scope?: string };
 if (token.errcode || !token.access_token || !token.openid || token.openid.length > 255 || !token.scope?.split(',').includes('snsapi_login')) throw new Error('Invalid WeChat token');
 const infoUrl = new URL('https://api.weixin.qq.com/sns/userinfo'); infoUrl.search = new URLSearchParams({ access_token: token.access_token, openid: token.openid, lang: 'zh_CN' }).toString();
 const infoResponse = await fetcher(infoUrl, { signal }); if (!infoResponse.ok) throw new Error('Profile failed');
 const info = await infoResponse.json() as { errcode?: number; openid?: string; nickname?: string; unionid?: string };
 if (info.errcode || info.openid !== token.openid || (token.unionid && info.unionid && token.unionid !== info.unionid)) throw new Error('WeChat identity mismatch');
 return { subject: `${env.WECHAT_APP_ID}:${token.openid}`, name: String(info.nickname || '微信员工').slice(0, 24), email: null, unionId: info.unionid || token.unionid || null };
}

export async function resolveIdentity(env: Env, provider: Provider, profile: ProviderProfile, linkUserId: string | null) {
 const lookup = () => env.DB.prepare('SELECT u.* FROM users u JOIN auth_identities i ON i.user_id=u.id WHERE i.provider=? AND i.subject=? AND u.guest=0').bind(provider, profile.subject).first<UserRow>();
 const rememberEmail = async () => { if (provider === 'google') await env.DB.prepare("UPDATE auth_identities SET verified_email=? WHERE provider='google' AND subject=?").bind(profile.email,profile.subject).run(); };
 let user = await lookup();
 if (user) { if (linkUserId && linkUserId !== user.id) throw new Error('identity_conflict'); await rememberEmail(); return user; }
 const id = linkUserId || crypto.randomUUID(), now = Date.now();
 const identity = env.DB.prepare('INSERT INTO auth_identities(provider,subject,user_id,union_id,created_at) VALUES (?,?,?,?,?)').bind(provider, profile.subject, id, profile.unionId, now);
 try {
  // An email match is not proof of ownership of an existing password account.
  // Explicit authenticated linking is the only cross-provider merge operation.
  await env.DB.batch(linkUserId ? [identity] : [env.DB.prepare('INSERT INTO users(id,name,profile_email,guest,created_at) VALUES (?,?,?,0,?)').bind(id, profile.name.trim() || '新员工', profile.email, now), identity]);
 } catch {
  user = await lookup(); if (user && (!linkUserId || user.id === linkUserId)) { await rememberEmail(); return user; }
  throw new Error('identity_conflict');
 }
 user = await env.DB.prepare('SELECT * FROM users WHERE id=? AND guest=0').bind(id).first<UserRow>();
 if (!user) throw new Error('Identity missing'); await rememberEmail(); return user;
}

export async function finishOAuth(request: Request, env: Env, provider: Provider, fetcher: typeof fetch = fetch, keys: JWTVerifyGetKey = googleKeys) {
 const resultHeaders = new Headers({ ...headers, 'Set-Cookie': flowCookie(provider, '', request) });
 const redirect = (query: string) => { resultHeaders.set('Location', `${new URL(request.url).origin}/?${query}`); return new Response(null, { status: 303, headers: resultHeaders }); };
 try {
  if (!providerReady(provider, env) || authOrigin(request, env) !== new URL(request.url).origin) return redirect('auth_error=not_configured');
  const url = new URL(request.url), state = url.searchParams.get('state') || '';
  const binding = request.headers.get('Cookie')?.match(new RegExp(`(?:^|;\\s*)swyf_oauth_${provider}=([a-f0-9]{64})(?:;|$)`))?.[1];
  if (!/^[a-f0-9]{64}$/.test(state) || !binding) return redirect('auth_error=expired');
  const stored = await env.DB.prepare('DELETE FROM oauth_states WHERE state_hash=? AND binding_hash=? AND provider=? AND expires_at>? RETURNING *').bind(await digest(state), await digest(binding), provider, Date.now()).first<OAuthState>();
  if (!stored || stored.redirect_uri !== `${url.origin}/api/auth/${provider}/callback`) return redirect('auth_error=expired');
  if (url.searchParams.has('error')) return redirect('auth_error=denied');
  const code = url.searchParams.get('code'); if (!code || code.length > 4096) return redirect('auth_error=failed');
  if (stored.link_user_id) { const current = await currentUser(request, env); if (current?.id !== stored.link_user_id || current?.session_hash !== stored.link_session_hash) return redirect('auth_error=expired'); }
  const profile = await exchangeIdentity(provider, code, stored, env, fetcher, keys);
  const user = await resolveIdentity(env, provider, profile, stored.link_user_id);
  resultHeaders.append('Set-Cookie', await sessionCookie(user.id, request, env));
  return redirect(stored.link_user_id ? 'auth=linked' : 'auth=success');
 } catch (e) { return redirect(e instanceof Error && e.message === 'identity_conflict' ? 'auth_error=identity_conflict' : 'auth_error=failed'); }
}
