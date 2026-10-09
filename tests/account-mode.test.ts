import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('../worker/room',()=>({OfficeRoom:class{}}));
import app from '../worker/index';
import {accountDatabase} from './account-db';
import {accountsEnabled,type Env} from '../worker/auth';
let db:ReturnType<typeof accountDatabase>,env:Env;
beforeEach(()=>{db=accountDatabase();env={...db.env};delete env.ACCOUNTS_ENABLED;});
afterEach(()=>db.sqlite.close());
const call=(path:string,method='GET',cookie='',payload?:unknown)=>app.fetch(new Request('https://game.example.com/api/'+path,{method,headers:{Cookie:cookie,'Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{})}),env,{waitUntil:vi.fn()} as unknown as ExecutionContext);
async function guest(){const response=await call('session/anonymous','POST','',{});expect(response.status).toBe(200);return {cookie:response.headers.get('set-cookie')!.split(';')[0],user:(await response.json() as any).user};}
it('defaults off, accepts false, and fails closed on an invalid setting',()=>{expect(accountsEnabled(env)).toBe(false);env.ACCOUNTS_ENABLED='false';expect(accountsEnabled(env)).toBe(false);env.ACCOUNTS_ENABLED='tru';expect(accountsEnabled(env)).toBe(true);});
it('creates a reusable browser session without registration and isolates saves',async()=>{const a=await guest(),b=await guest();expect(a.user.anonymous).toBe(true);expect(a.user.id).not.toBe(b.user.id);const reused=await call('session/anonymous','POST',a.cookie);expect((await reused.json() as any).user.id).toBe(a.user.id);const save=await (await call('save','GET',a.cookie)).json() as any;save.state.balance=777;save.settings={sound:true,wallpaper:"mountain"};expect((await call('save','PUT',a.cookie,save)).status).toBe(200);expect((await (await call('save','GET',a.cookie)).json() as any).state.balance).toBe(777);expect((await (await call('save','GET',b.cookie)).json() as any).state.balance).not.toBe(777);});
it('does not expose credentials or allow account registration or admin in guest mode',async()=>{env.AI_API_KEY='test-only-provider-key';const a=await guest();expect(await (await call('config')).text()).not.toContain(env.AI_API_KEY);expect((await call('auth/register','POST',a.cookie,{email:'test@example.com'})).status).toBe(404);expect((await call('admin/settings','GET',a.cookie)).status).toBe(403);});
it('requires a real account after enabling accounts and never accepts the guest cookie as login',async()=>{const a=await guest();env.ACCOUNTS_ENABLED='true';expect((await call('save','GET',a.cookie)).status).toBe(401);expect((await call('save','GET',a.cookie.replace('swyf_guest','swyf_session'))).status).toBe(401);expect((await call('session/anonymous','POST')).status).toBe(401);expect((await (await call('auth/me','GET',a.cookie)).json() as any).user).toBeNull();env.ACCOUNTS_ENABLED='false';expect((await call('save','GET',a.cookie)).status).toBe(200);});
it('rejects cross-site guest creation and unauthenticated save access',async()=>{expect((await call('save')).status).toBe(401);expect((await app.fetch(new Request('https://game.example.com/api/session/anonymous',{method:'POST',headers:{Origin:'https://other.example.com'}}),env,{} as ExecutionContext)).status).toBe(403);});

it('consumes the browser bootstrap JSON body before returning its session',async()=>{
 const request=new Request('https://game.example.com/api/session/anonymous',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 expect((await app.fetch(request,env,{} as ExecutionContext)).status).toBe(200);
 expect(request.bodyUsed).toBe(true);
});
