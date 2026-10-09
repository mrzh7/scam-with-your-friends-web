import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { startOAuth, finishOAuth, exchangeIdentity, providerConfiguration, resolveIdentity, authOrigin, type Provider } from '../worker/oauth';
import { currentUser, digest, sessionCookie, type Env } from '../worker/auth';
import { readSave, writeSave } from '../worker/saves';
import { accountDatabase } from './account-db';
let database: ReturnType<typeof accountDatabase>, env: Env;
let pair: Awaited<ReturnType<typeof generateKeyPair>>, keys: ReturnType<typeof createLocalJWKSet>;
beforeAll(async () => { pair=await generateKeyPair('RS256'); keys=createLocalJWKSet({keys:[{...await exportJWK(pair.publicKey), kid:'test-key', alg:'RS256'}]}); });
beforeEach(() => { database=accountDatabase(); env={...database.env, AUTH_ORIGIN:'https://game.example', GOOGLE_CLIENT_ID:'test-client', GOOGLE_CLIENT_SECRET:'test-secret', WECHAT_APP_ID:'wx-test-app', WECHAT_APP_SECRET:'wx-test-secret'}; });
afterEach(() => database.sqlite.close());
async function flow(provider: Provider = 'google', cookie='', link=false) {
 const response=await startOAuth(new Request('https://game.example/api/auth/'+provider+'/start',{method:'POST',headers:{Cookie:cookie}}),env,provider,link);
 const url=new URL((await response.json() as {url:string}).url);
 const flowCookie=response.headers.get('set-cookie')!.split(';')[0];
 const row=database.sqlite.prepare('SELECT * FROM oauth_states WHERE state_hash=?').get(await digest(url.searchParams.get('state')!))!;
 const callback=new Request('https://game.example/api/auth/'+provider+'/callback?code=test-code&state='+url.searchParams.get('state'),{headers:{Cookie:[flowCookie,cookie].filter(Boolean).join('; '),'Sec-Fetch-Site':'cross-site'}});
 return {url,flowCookie,row,callback};
}
async function token(nonce: string, claims: Record<string,unknown> = {}) { return new SignJWT({nonce, name:'Test Employee', email:'person@example.test', email_verified:true, ...claims}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer(String(claims.iss || 'https://accounts.google.com')).setAudience(String(claims.aud || env.GOOGLE_CLIENT_ID)).setSubject(String(claims.sub || 'google-person')).setIssuedAt().setExpirationTime(typeof claims.exp === 'number' ? claims.exp : '5m').sign(pair.privateKey); }
function session(response: Response) { return response.headers.getSetCookie().find(c=>c.startsWith('swyf_session='))!.split(';')[0]; }
const loggedIn = (cookie:string) => currentUser(new Request('https://game.example/api/auth/me',{headers:{Cookie:cookie}}),env);
async function googleLogin(claims: Record<string,unknown>={}) {
 const f=await flow(); const jwt=await token(String(f.row.nonce),claims);
 const response=await finishOAuth(f.callback,env,'google',vi.fn(async()=>Response.json({id_token:jwt})) as typeof fetch,keys);
 return {response,cookie:session(response)};
}
const wechatFetch = () => vi.fn(async(url: RequestInfo | URL) => String(url).includes('/oauth2/') ? Response.json({access_token:'test-access',openid:'wx-person',unionid:'wx-union',scope:'snsapi_login'}) : Response.json({openid:'wx-person',unionid:'wx-union',nickname:'微信测试员工'})) as typeof fetch;
describe('OAuth identity and callback lifecycle',()=>{
 it('uses PKCE, nonce, browser-bound state and secure HttpOnly cookies without leaking secrets',async()=>{
  const f=await flow(); expect(f.url.origin).toBe('https://accounts.google.com'); expect(f.url.searchParams.get('code_challenge_method')).toBe('S256'); expect(f.url.searchParams.get('nonce')).toBe(f.row.nonce); expect(f.url.searchParams.get('redirect_uri')).toBe('https://game.example/api/auth/google/callback');
  expect(f.url.href).not.toContain('test-secret'); expect(f.row.binding_hash).not.toBe(f.flowCookie.split('=')[1]); expect(providerConfiguration(env)).toEqual({google:true,wechat:true});
 });
 it('creates one persistent user ID across repeated Google logins and preserves their save',async()=>{
  const first=await googleLogin(), user=await loggedIn(first.cookie); expect(user?.guest).toBe(0);
  const saved=await readSave(env,user!.id); await writeSave(env,user!,{userId:user!.id,revision:saved.revision,state:{...saved.state,balance:570}});
  const second=await googleLogin(); expect((await loggedIn(second.cookie))?.id).toBe(user!.id); expect((await readSave(env,user!.id)).state.balance).toBe(570); expect(database.sqlite.prepare('SELECT count(*) AS n FROM users').get()!.n).toBe(1);
 });
 it('links WeChat to a logged-in Google account and both providers reach the same progress',async()=>{
  const google=await googleLogin(), user=await loggedIn(google.cookie), f=await flow('wechat',google.cookie,true);
  expect(f.url.origin).toBe('https://open.weixin.qq.com'); expect(f.url.searchParams.get('scope')).toBe('snsapi_login');
  const result=await finishOAuth(f.callback,env,'wechat',wechatFetch(),keys); expect(result.headers.get('location')).toContain('auth=linked');
  expect((await loggedIn(session(result)))!.id).toBe(user!.id);
  const next=await flow('wechat'); const login=await finishOAuth(next.callback,env,'wechat',wechatFetch(),keys); expect((await loggedIn(session(login)))!.id).toBe(user!.id);
  expect(database.sqlite.prepare('SELECT union_id FROM auth_identities WHERE provider=?').get('wechat')!.union_id).toBe('wx-union');
 });
 it('does not silently merge with an email/password account based on matching email',async()=>{
  database.sqlite.prepare('INSERT INTO users(id,email,name,guest,created_at) VALUES (?,?,?,0,?)').run('password-owner','person@example.test','Original',Date.now());
  const login=await googleLogin(); expect((await loggedIn(login.cookie))!.id).not.toBe('password-owner');
 });
 it('does not store an unverified provider email as a profile email',async()=>{
  const login=await googleLogin({email_verified:false}); expect((await loggedIn(login.cookie))!.profile_email).toBeNull();
 });
 it.each(['missing-cookie','wrong-cookie','wrong-state','expired','wrong-provider'])('rejects %s before contacting a provider',async(mode)=>{
  const f=await flow(); let cookie=f.flowCookie, url=f.callback.url;
  if(mode==='missing-cookie')cookie=''; if(mode==='wrong-cookie')cookie='swyf_oauth_google='+'a'.repeat(64); if(mode==='wrong-state')url=url.replace(/state=[^&]+/,'state='+'b'.repeat(64));
  if(mode==='expired')database.sqlite.prepare('UPDATE oauth_states SET expires_at=0').run();
  const fetcher=vi.fn(); const result=await finishOAuth(new Request(url,{headers:{Cookie:cookie}}),env,mode==='wrong-provider'?'wechat':'google',fetcher,keys);
  expect(result.headers.get('location')).toContain('auth_error=expired'); expect(fetcher).not.toHaveBeenCalled();
 });
 it('consumes a state only once and clears its cookie',async()=>{
  const f=await flow(), jwt=await token(String(f.row.nonce)), fetcher=vi.fn(async()=>Response.json({id_token:jwt}));
  const first=await finishOAuth(f.callback,env,'google',fetcher,keys); expect(first.headers.getSetCookie()[0]).toContain('Max-Age=0');
  const again=await finishOAuth(f.callback,env,'google',fetcher,keys); expect(again.headers.get('location')).toContain('auth_error=expired'); expect(fetcher).toHaveBeenCalledOnce();
 });
 it.each([{nonce:'wrong'}, {aud:'attacker'}, {iss:'https://attacker.example'}, {exp:1}])('rejects invalid Google claims %j',async claims=>{
  const f=await flow(), jwt=await token(String(f.row.nonce),claims);
  const result=await finishOAuth(f.callback,env,'google',async()=>Response.json({id_token:jwt}),keys);
  expect(result.headers.get('location')).toContain('auth_error=failed'); expect(database.sqlite.prepare('SELECT count(*) n FROM users').get()!.n).toBe(0);
 });
 it('verifies the Google signature rather than decoding untrusted token claims',async()=>{
  const f=await flow(), jwt=await token(String(f.row.nonce)), parts=jwt.split('.'); parts[2]=(parts[2][0]==='A'?'B':'A')+parts[2].slice(1);
  const result=await finishOAuth(f.callback,env,'google',async()=>Response.json({id_token:parts.join('.')}),keys); expect(result.headers.get('location')).toContain('auth_error=failed');
 });
 it('rejects inconsistent WeChat userinfo identities',async()=>{
  const f=await flow('wechat'), fetcher=vi.fn(async(url:RequestInfo|URL)=>String(url).includes('/oauth2/')?Response.json({access_token:'test',openid:'owner',scope:'snsapi_login'}):Response.json({openid:'someone-else'}));
  const result=await finishOAuth(f.callback,env,'wechat',fetcher,keys); expect(result.headers.get('location')).toContain('auth_error=failed');
 });
 it('checks that code exchange stays server-side and uses the exact registered callback and verifier',async()=>{
  const f=await flow(), jwt=await token(String(f.row.nonce));
  const fetcher=vi.fn(async(_url:unknown, init?:RequestInit)=>{const params=new URLSearchParams(String(init?.body));expect(params.get('client_secret')).toBe('test-secret');expect(params.get('code_verifier')).toBe(f.row.verifier);expect(params.get('redirect_uri')).toBe(f.row.redirect_uri);return Response.json({id_token:jwt});}) as typeof fetch;
  await exchangeIdentity('google','test-code',f.row as never,env,fetcher,keys);
 });
 it('refuses linking when the initiating login session has been logged out',async()=>{
  const login=await googleLogin(), f=await flow('wechat',login.cookie,true); database.sqlite.prepare('DELETE FROM sessions').run();
  const fetcher=vi.fn(); const result=await finishOAuth(f.callback,env,'wechat',fetcher,keys); expect(result.headers.get('location')).toContain('auth_error=expired'); expect(fetcher).not.toHaveBeenCalled();
 });
 it('refuses moving a provider identity already owned by a different user',async()=>{
  const first=await googleLogin(), firstUser=await loggedIn(first.cookie);
  database.sqlite.prepare('INSERT INTO users(id,name,guest,created_at) VALUES (?,?,0,?)').run('other','Other',Date.now());
  await expect(resolveIdentity(env,'google',{subject:'google-person',name:'Other',email:null,unionId:null},'other')).rejects.toThrow('identity_conflict');
  expect((await loggedIn(first.cookie))!.id).toBe(firstUser!.id);
 });
 it('requires an existing authenticated session to link and rejects unsafe callback origins',async()=>{
  expect((await startOAuth(new Request('https://game.example/api/auth/google/start',{method:'POST'}),env,'google',true)).status).toBe(401);
  expect(()=>authOrigin(new Request('https://game.example'),{...env,AUTH_ORIGIN:'https://game.example/elsewhere'})).toThrow();
  expect(()=>authOrigin(new Request('http://public.example'),{...env,AUTH_ORIGIN:undefined})).toThrow();
  expect((await startOAuth(new Request('https://game.example'),{...env,GOOGLE_CLIENT_SECRET:''},'google')).status).toBe(503);
 });
 it('rejects legacy guest sessions as authenticated users',async()=>{
  database.sqlite.prepare('INSERT INTO users(id,name,guest,created_at) VALUES (?,?,1,?)').run('old-guest','Guest',Date.now());
  const cookie=(await sessionCookie('old-guest',new Request('https://game.example'),env)).split(';')[0]; expect(await loggedIn(cookie)).toBeNull();
 });
});
