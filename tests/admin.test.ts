vi.mock('../worker/room',()=>({OfficeRoom:class{}}));

import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {accountDatabase} from './account-db';
import {adminSettings,isAdministrator,runtimeEnv} from '../worker/admin';
import {sessionCookie,digest,type Env} from '../worker/auth';
import {resolveIdentity} from '../worker/oauth';
let db:ReturnType<typeof accountDatabase>,env:Env,cookie:string;
beforeEach(async()=>{db=accountDatabase();env={...db.env,ADMIN_EMAIL:"admin@example.com",SITE_SETTINGS_KEY:btoa(String.fromCharCode(...new Uint8Array(32).fill(7))),AI_API_KEY:'old-private-key',AI_MODEL:'old-model',AI_BASE_URL:'https://provider.example/v1'};db.sqlite.prepare('INSERT INTO users(id,name,email,guest,created_at) VALUES (?,?,?,?,?)').run('admin','Employee','admin@example.com',0,Date.now());cookie=(await sessionCookie('admin',new Request('https://game.example'),env)).split(';')[0];});
afterEach(()=>{vi.unstubAllGlobals();db.sqlite.close();});
const request=(method='GET',body?:unknown,token=cookie,origin='https://game.example')=>new Request('https://game.example/api/admin/settings',{method,headers:{Cookie:token,Origin:origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
async function verify(){await resolveIdentity(env,'google',{subject:'google-subject',name:'Admin',email:'admin@example.com',unionId:null},'admin');}
describe('Server-only administrator authorization',()=>{
 it('rejects missing, forged and unverified-email sessions',async()=>{for(const token of ['', 'swyf_session=forged',cookie]){expect(await isAdministrator(request('GET',undefined,token),env)).toBe(false);expect((await adminSettings(request('GET',undefined,token),env)).status).toBe(403);}});
 it('requires a Google identity with the exact verified email, not a WeChat profile',async()=>{await resolveIdentity(env,'wechat',{subject:'wechat-subject',name:'Admin',email:'admin@example.com',unionId:null},'admin');expect(await isAdministrator(request(),env)).toBe(false);await verify();expect(await isAdministrator(request(),env)).toBe(true);});
 it('rejects expired and revoked sessions even with the right identity',async()=>{await verify();db.sqlite.prepare('UPDATE sessions SET expires_at=0').run();expect(await isAdministrator(request(),env)).toBe(false);});
 it('revokes the privilege when Google no longer verifies that email',async()=>{await verify();await resolveIdentity(env,'google',{subject:'google-subject',name:'Admin',email:null,unionId:null},null);expect(await isAdministrator(request(),env)).toBe(false);});
 it('rejects cross-origin writes without touching upstream providers',async()=>{await verify();const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);expect((await adminSettings(request('PUT',{section:'ai'},cookie,'https://evil.example'),env)).status).toBe(403);expect(fetcher).not.toHaveBeenCalled();});
 it('returns metadata but never credentials or the employee permanent ID',async()=>{await verify();const r=await adminSettings(request(),env),body=await r.text();expect(r.status).toBe(200);expect(body).toContain('"hasKey":true');expect(body).not.toContain('old-private-key');expect(body).not.toContain('userId');});
 it('encrypts configuration and retains a blank key on update',async()=>{await verify();vi.stubGlobal('fetch',vi.fn(async()=>Response.json({choices:[{message:{content:JSON.stringify({reply:'你好，我正在看通知。',attitude:'neutral'})}}]})));const r=await adminSettings(request('PUT',{section:'ai',base:'https://provider.example/v1',model:'new-model'}),env);expect(r.status).toBe(200);const stored=String(db.sqlite.prepare('SELECT payload FROM site_settings').get()!.payload);expect(stored).not.toContain('old-private-key');expect(stored).not.toContain('new-model');expect(await runtimeEnv(env)).toMatchObject({AI_API_KEY:'old-private-key',AI_MODEL:'new-model'});});
 it('does not replace a working configuration when upstream validation fails',async()=>{await verify();vi.stubGlobal('fetch',vi.fn(async()=>new Response(null,{status:401})));expect((await adminSettings(request('PUT',{section:'ai',base:'https://provider.example/v1',model:'bad',key:'bad-key'}),env)).status).toBe(400);expect((await runtimeEnv(env)).AI_MODEL).toBe('old-model');});
 it('denies another logged-in user even when the administrator cookie exists elsewhere',async()=>{await verify();db.sqlite.prepare('INSERT INTO users(id,name,guest,created_at) VALUES (?,?,0,?)').run('ordinary','Other',Date.now());const token=(await sessionCookie('ordinary',new Request('https://game.example'),env)).split(';')[0];expect(await isAdministrator(request('GET',undefined,token),env)).toBe(false);expect(await isAdministrator(request(),env)).toBe(true);});
 it('loses authorization immediately on cookie revocation',async()=>{await verify();await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(cookie.split('=')[1])).run();expect((await adminSettings(request(),env)).status).toBe(403);});
});


it('serves private administrator HTML only after checking the session',async()=>{
 const {default:worker}=await import('../worker/index');
 const assets=vi.fn(async()=>new Response('<html>Admin application</html>',{headers:{'Cache-Control':'public, max-age=3600'}}));
 env.ASSETS={fetch:assets} as unknown as Fetcher;
 const ctx={waitUntil:vi.fn()} as unknown as ExecutionContext;
 expect((await worker.fetch(new Request('https://game.example/admin'),env,ctx)).status).toBe(403);expect(assets).not.toHaveBeenCalled();
 await verify();const response=await worker.fetch(new Request('https://game.example/admin',{headers:{Cookie:cookie}}),env,ctx);
 expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toBe('private, no-store');expect(response.headers.get('Vary')).toBe('Cookie');expect(await response.text()).toContain('Admin application');expect(assets).toHaveBeenCalledTimes(1);
});
it('does not grant administrator access to a different verified Google email',async()=>{
 await resolveIdentity(env,'google',{subject:'different-google',name:'Other',email:'other@gmail.com',unionId:null},'admin');expect(await isAdministrator(request(),env)).toBe(false);
});
it('prevents concurrent successful provider tests from overwriting each other',async()=>{
 await verify();vi.stubGlobal('fetch',vi.fn(async()=>Response.json({choices:[{message:{content:JSON.stringify({reply:'我正在查看通知。',attitude:'neutral'})}}]})));
 const responses=await Promise.all(['one','two'].map(model=>adminSettings(request('PUT',{section:'ai',base:'https://provider.example/v1',model}),env)));
 expect(responses.map(r=>r.status).sort()).toEqual([200,400]);
});


it('fails closed when the administrator email is missing',async()=>{await verify();delete env.ADMIN_EMAIL;expect(await isAdministrator(request(),env)).toBe(false);});
it('does not reserve an empty email when no administrator is configured',async()=>{const {reservedAdminEmail}=await import('../worker/admin');delete env.ADMIN_EMAIL;expect(reservedAdminEmail('',env)).toBe(false);});
