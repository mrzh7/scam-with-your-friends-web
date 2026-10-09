import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('../worker/room',()=>({OfficeRoom:class{}}));
import app from '../worker/index';
import {accountDatabase} from './account-db';
import {digest,passwordHash,sessionCookie,type Env} from '../worker/auth';
import {requestVerification} from '../worker/email';
import {startOAuth,resolveIdentity} from '../worker/oauth';
let db:ReturnType<typeof accountDatabase>,env:Env,mail:ReturnType<typeof vi.fn>;
const origin='https://game.example.com';
const req=(path='/api/auth/register',body?:unknown,cookie='')=>new Request(origin+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});
const context={waitUntil:()=>{}} as unknown as ExecutionContext;
const registration={email:'owner@example.test',name:'Owner',locale:'en'};
const token=()=>JSON.parse(String(mail.mock.calls.at(-1)![1].body)).text.match(/verify-email=([a-f0-9]{64})/)[1] as string;
async function register(){return app.fetch(req('/api/auth/register',registration),env,context);}
async function confirm(value=token()){return app.fetch(req('/api/auth/verification/confirm',{token:value,password:'Owner-selected-password'}),env,context);}
beforeEach(()=>{db=accountDatabase();env={...db.env,AUTH_ORIGIN:origin,RESEND_API_KEY:'test-mail-secret',EMAIL_FROM:'SCAM GAME <noreply@game.example.com>'};mail=vi.fn(async()=>Response.json({id:'mail-id'}));vi.stubGlobal('fetch',mail);});
afterEach(()=>{db.sqlite.close();vi.unstubAllGlobals();});
describe('Email ownership verification',()=>{
 it.each([
  ['en','Verify your email','Open this link'],
  ['zh','验证邮箱','打开以下链接'],
  ['pt','Confirme seu e-mail','Abra este link'],
  ['ja','メールアドレスの確認','以下のリンク'],
  ['es','Verifica tu correo','Abre este enlace']
 ])('sends the subject and body in the selected %s language without old branding',async(locale,subject,body)=>{
  const r=await app.fetch(req('/api/auth/register',{...registration,locale}),env,context);expect(r.status).toBe(202);
  const payload=JSON.parse(mail.mock.calls[0][1].body);expect(payload.subject).toBe(subject);expect(payload.text).toContain(body);expect(JSON.stringify(payload)).not.toContain('Kolkata OS');
 });
 it('uses the newly selected language when resending',async()=>{
  await register();db.sqlite.prepare('UPDATE email_verifications SET sent_at=0').run();
  const r=await app.fetch(req('/api/auth/verification/send',{email:registration.email,locale:'es'}),env,context);expect(r.status).toBe(202);
  const payload=JSON.parse(mail.mock.calls.at(-1)![1].body);expect(payload.subject).toBe('Verifica tu correo');expect(payload.text).toContain('Abre este enlace');
 });
 it('registers a pending user, sends an English link, and never returns a token or a game session',async()=>{const r=await register();expect(r.status).toBe(202);expect(r.headers.get('set-cookie')).toBeNull();expect(await r.text()).not.toContain('verify-email=');const u=db.sqlite.prepare('SELECT * FROM users').get()!;expect(u.password_hash).toBeNull();expect(u.email_verified_at).toBeNull();expect(mail.mock.calls[0][0]).toBe('https://api.resend.com/emails');const payload=JSON.parse(mail.mock.calls[0][1].body);expect(payload.to).toEqual(['owner@example.test']);expect(payload.text).toContain(origin+'/#verify-email=');expect(payload.subject).toBe('Verify your email');expect(db.sqlite.prepare('SELECT token_hash FROM email_verifications').get()!.token_hash).toBe(await digest(token()));});
 it('verifies once, sets the owner-selected password, then allows login and game access',async()=>{await register();const value=token();const confirmed=await confirm(value);expect(confirmed.status).toBe(200);expect(confirmed.headers.get('set-cookie')).toContain('Max-Age=0');expect((await confirm(value)).status).toBe(400);const u=db.sqlite.prepare('SELECT * FROM users').get()!;expect(u.email_verified_at).toBeGreaterThan(0);expect(u.password_hash).toBe(await passwordHash('Owner-selected-password',String(u.salt)));const r=await app.fetch(req('/api/auth/login',{email:registration.email,password:'Owner-selected-password'}),env,context);expect(r.status).toBe(200);const cookie=r.headers.get('set-cookie')!.split(';')[0];expect((await app.fetch(req('/api/save',undefined,cookie),env,context)).status).toBe(200);});
 it('blocks pending sessions from every game API and OAuth identity linking',async()=>{await register();const u=db.sqlite.prepare('SELECT * FROM users').get()!;const cookie=(await sessionCookie(String(u.id),req(),env)).split(';')[0];for(const p of ['/api/save','/api/account/rooms','/api/auth/identities','/api/rooms','/api/dialogue','/api/speech','/api/voice/ice'])expect((await app.fetch(req(p,undefined,cookie),env,context)).status,p).toBe(403);const me=await app.fetch(req('/api/auth/me',undefined,cookie),env,context);expect((await me.json() as any).user.emailVerified).toBe(false);expect((await startOAuth(req('/api/auth/google/start',{},cookie),{...env,GOOGLE_CLIENT_ID:'id',GOOGLE_CLIENT_SECRET:'secret'},'google',true)).status).toBe(403);});
 it('preserves existing account IDs and progress while revoking old sessions and replacing a preselected password',async()=>{db.sqlite.prepare('INSERT INTO users(id,email,name,password_hash,salt,created_at) VALUES (?,?,?,?,?,?)').run('existing',registration.email,'Original','attacker-hash','old',1);db.sqlite.prepare('INSERT INTO saves(user_id,state_json,revision,updated_at) VALUES (?,?,?,?)').run('existing','{"balance":321}',7,1);const cookie=await sessionCookie('existing',req(),env);await register();expect((await confirm()).status).toBe(200);const u=db.sqlite.prepare('SELECT * FROM users').get()!;expect(u.id).toBe('existing');expect(u.name).toBe('Original');expect(u.password_hash).not.toBe('attacker-hash');expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM sessions').get()!.n).toBe(0);expect(db.sqlite.prepare('SELECT state_json,revision FROM saves').get()).toMatchObject({state_json:'{"balance":321}',revision:7});expect(cookie).toContain('HttpOnly');});
 it('does not create accounts or pretend to send mail without delivery configuration',async()=>{env.RESEND_API_KEY='';expect((await register()).status).toBe(503);expect(mail).not.toHaveBeenCalled();expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM users').get()!.n).toBe(0);});
 it('reports delivery failure and permits a retry without an invalid cooldown token',async()=>{mail.mockResolvedValueOnce(new Response(null,{status:403}));expect((await register()).status).toBe(502);expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM email_verifications').get()!.n).toBe(0);expect((await register()).status).toBe(202);});
 it('rejects malformed provider success responses',async()=>{mail.mockResolvedValueOnce(Response.json({}));expect((await register()).status).toBe(502);});
 it('enforces an atomic resend cooldown and invalidates old links after resending',async()=>{await register();const old=token();await register();expect(mail).toHaveBeenCalledTimes(1);db.sqlite.prepare('UPDATE email_verifications SET sent_at=0').run();await register();expect(mail).toHaveBeenCalledTimes(2);expect((await confirm(old)).status).toBe(400);expect((await confirm()).status).toBe(200);});
 it('never lets an expired or forged token verify a user',async()=>{await register();db.sqlite.prepare('UPDATE email_verifications SET expires_at=0').run();expect((await confirm()).status).toBe(400);expect((await confirm('a'.repeat(64))).status).toBe(400);expect(db.sqlite.prepare('SELECT email_verified_at FROM users').get()!.email_verified_at).toBeNull();});
 it('allows only one concurrent confirmation',async()=>{await register();const value=token();const results=await Promise.all([confirm(value),confirm(value)]);expect(results.map(r=>r.status).sort()).toEqual([200,400]);});
 it('does not reset a verified account via registration or resend',async()=>{await register();await confirm();const before=db.sqlite.prepare('SELECT * FROM users').get();expect((await register()).status).toBe(202);expect(mail).toHaveBeenCalledTimes(1);expect(db.sqlite.prepare('SELECT * FROM users').get()).toEqual(before);});
 it('uses the same generic response for a resend to unknown and verified addresses',async()=>{const r=await requestVerification(req(),env,{email:'unknown@example.test'});expect(r.status).toBe(202);expect(mail).not.toHaveBeenCalled();});
 it('rate-limits delivery requests',async()=>{for(let i=0;i<3;i++)expect((await register()).status).toBe(202);expect((await register()).status).toBe(429);});
 it('rejects cross-origin confirmation and does not send mail',async()=>{const r=await app.fetch(new Request(origin+'/api/auth/register',{method:'POST',headers:{Origin:'https://evil.example'},body:JSON.stringify(registration)}),env,context);expect(r.status).toBe(403);expect(mail).not.toHaveBeenCalled();});
 it('does not require a second email challenge for a Google-only account',async()=>{const u=await resolveIdentity(env,'google',{subject:'google-owner',name:'Google Owner',email:'google@example.test',unionId:null},null);const cookie=(await sessionCookie(u.id,req(),env)).split(';')[0];const me=await app.fetch(req('/api/auth/me',undefined,cookie),env,context);expect((await me.json() as any).user.emailVerified).toBe(true);expect((await app.fetch(req('/api/save',undefined,cookie),env,context)).status).toBe(200);});
});
