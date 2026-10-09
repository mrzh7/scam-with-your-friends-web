import {randomUUID,pbkdf2Sync} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {writeFileSync,unlinkSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base)) throw new Error('Smoke tests may only target localhost.');
// Verified fixtures are inserted only into local D1; no production bypass endpoint exists.
function seedVerified(email,password,name){
 const id=randomUUID(),salt=randomUUID(),hash=pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex');
 const sqlValue=value=>"'"+String(value).replaceAll("'","''")+"'";
 mkdirSync('.local-config',{recursive:true});const file=resolve('.local-config/smoke-seed-'+id+'.sql');
 writeFileSync(file,'INSERT INTO users(id,email,name,password_hash,salt,guest,created_at,email_verified_at) VALUES ('+[id,email,name,hash,salt,0,Date.now(),Date.now()].map(sqlValue).join(',')+');');
 try{execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','wrangler.jsonc','--file',file],{stdio:'pipe',env:{...process.env,XDG_CONFIG_HOME:resolve('.local-config'),WRANGLER_LOG_PATH:resolve('.wrangler/logs')}});}finally{unlinkSync(file);}
}
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
function client() { let cookie = ''; return { async request(path, method = 'GET', data, extra = {}) { const response = await fetch(`${base}/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extra }, body: data === undefined ? undefined : JSON.stringify(data) }); const set = response.headers.get('set-cookie'); if (set) cookie = set.split(';')[0]; const json = await response.json(); return { status: response.status, json, headers: response.headers }; }, socket(code) { return new WebSocket(`${base.replace('http', 'ws')}/api/rooms/${code}/socket`, { headers: { Cookie: cookie } }); } }; }
const alice = client(), bob = client(), anon = client();
const newState = { version: 1, seed: 4000000000, phase: 'ready', day: 1, seconds: 360, balance: 80, earned: 0, lifetime: 0, successes: 0, failed: 0, risk: 0, serial: 0, wait: 3, call: null, upgrades: [], event: null, eventTriggered: false, eventSteps: 0, log: [], history: [], notice: '' };
let checks = 0; const check = (label, assertion) => { assertion(); checks++; console.log('PASS '+label); };
check('health', () => {}); assert.equal((await anon.request('/health')).status, 200);
check('unauthenticated saves rejected', () => {}); assert.equal((await anon.request('/save')).status, 401);
check('cross-origin writes rejected', () => {}); assert.equal((await anon.request('/auth/register', 'POST', {}, { Origin: 'https://untrusted.example' })).status, 403);
check('invalid registration rejected', () => {}); assert.equal((await anon.request('/auth/register', 'POST', { email: 'bad', password: 'short', name: 'bad' })).status, 400);
const email = `swyf-smoke-${suffix}@example.test`, password = `Test-only-${suffix}`;
for (const path of ['/session','/rooms','/dialogue','/speech','/ai/test']) { assert.equal((await anon.request(path,'POST',{})).status,401); check('anonymous blocked: '+path,()=>{}); }
assert.equal((await anon.request('/auth/providers')).status,200);
seedVerified(email,password,'Smoke Alice');
const registered = await alice.request('/auth/login', 'POST', { email, password });
const aliceId = registered.json.user.id;
check('verified login + HttpOnly cookie', () => { assert.equal(registered.status, 200); assert.match(registered.headers.get('set-cookie'), /HttpOnly/); });
check('session identity', () => {}); assert.equal((await alice.request('/auth/me')).json.user.name, 'Smoke Alice');
for (const path of ['/admin/settings','/ai/test']) { assert.equal((await alice.request(path,path==='/ai/test'?'POST':'GET')).status,403); check('ordinary account blocked: '+path,()=>{}); }
const speechConfig = (await anon.request('/config')).json.speech;
check('speech configuration keeps credentials server-side', () => { assert.ok(['browser','minimax','elevenlabs'].includes(speechConfig.provider)); assert.equal(speechConfig.TTS_API_KEY,undefined); assert.equal(speechConfig.key,undefined); });
check('speech requires a session and rejects unconfigured or invalid synthesis', () => {}); assert.equal((await anon.request('/speech','POST',{text:'test',person:0})).status,401); assert.equal((await alice.request('/speech','POST',{text:'x'.repeat(1201),person:0})).status,speechConfig.available?400:503);
const saved = await alice.request('/save', 'PUT', { userId: aliceId, state: newState, revision: 0 }); check('first save', () => { assert.equal(saved.status, 200); assert.equal(saved.json.revision, 1); });
check('save read and validation', () => {}); assert.equal((await alice.request('/save')).json.state.seed, 4000000000); assert.equal((await alice.request('/save', 'PUT', { userId: aliceId, state: { ...newState, day: 100 }, revision: 1 })).status, 400);
check('optimistic concurrency', () => {}); assert.equal((await alice.request('/save', 'PUT', { userId: aliceId, state: newState, revision: 0 })).status, 409); assert.equal((await alice.request('/save', 'PUT', { userId: aliceId, state: { ...newState, balance: 200 }, revision: 1 })).json.revision, 2);
await alice.request('/auth/logout', 'POST'); assert.equal((await alice.request('/save')).status, 401);
assert.equal((await alice.request('/auth/login', 'POST', { email, password: 'wrong-password' })).status, 401);
check('logout, wrong-password rejection, login', () => {}); assert.equal((await alice.request('/auth/login', 'POST', { email, password })).status, 200);
const bobEmail='swyf-bob-'+suffix+'@example.test';
seedVerified(bobEmail,password,'Smoke Bob');
const bobRegistered=await bob.request('/auth/login','POST',{email:bobEmail,password});assert.equal(bobRegistered.status,200);
const bobId=bobRegistered.json.user.id;
const relogged=await alice.request('/auth/me');check('stable user ID after logout and login',()=>assert.equal(relogged.json.user.id,aliceId));
check('account save isolation',()=>{}); assert.equal((await bob.request('/save')).json.state.balance,80); assert.equal((await bob.request('/save','PUT',{userId:aliceId,state:newState,revision:0})).status,409);
assert.equal((await bob.request('/rooms', 'POST', { name: 'Bob', code: 'AAAAAA' })).status, 404);
const room = await alice.request('/rooms', 'POST', { name: 'Alice' }); assert.equal(room.status, 200); const code = room.json.code;
assert.equal((await bob.request('/rooms', 'POST', { name: 'Bob', code })).status, 200);
const wsA = alice.socket(code), wsB = bob.socket(code); let stateA, stateB; const signals = [], dialogueStatuses = [];
function receive(old, data) { if (data.type === 'state') return data; if (data.type === 'world' && old) return { ...old, world: data.world }; return old; }
wsA.on('message', m => { const d = JSON.parse(m.toString()); if (d.type === 'dialogue-status') dialogueStatuses.push(d); stateA = receive(stateA, d); }); wsB.on('message', m => { const d = JSON.parse(m.toString()); if (d.type === 'signal') signals.push(d); stateB = receive(stateB, d); });
let seqA = 0, seqB = 0;
function input(ws, forward = 0, side = 0) { ws.send(JSON.stringify({ type: 'input', input: { forward, side, yaw: Math.PI, pitch: 0, sprint: false, jump: false, seq: ws === wsA ? ++seqA : ++seqB } })); }
async function walk(ws, forward, side, milliseconds) { const timer = setInterval(() => input(ws, forward, side), 70); input(ws, forward, side); await new Promise(r => setTimeout(r, milliseconds)); clearInterval(timer); input(ws); await new Promise(r => setTimeout(r, 160)); }
async function command(ws, command) { ws.send(JSON.stringify({ type: 'world-command', command })); await new Promise(r => setTimeout(r, 220)); }

wsA.on('error', e => console.error('Alice socket error', e.message)); wsB.on('error', e => console.error('Bob socket error', e.message));
async function until(predicate, label, ms = 12000) { const start = Date.now(); while (!predicate()) { if (Date.now() - start > ms) throw new Error(`Timeout: ${label}`); await new Promise(r => setTimeout(r, 100)); } }
async function send(ws, action) { ws.send(JSON.stringify({ type: 'action', action })); await new Promise(r => setTimeout(r, 180)); }
try {
 await until(() => stateA?.players.length === 2 && stateB?.players.length === 2, 'both participants');
 check('two actual WebSocket participants', () => assert.notEqual(stateA.self, stateB.self));
 await send(wsB, { type: 'start' }); check('non-host cannot start', () => assert.equal(stateA.game.phase, 'ready'));
 await send(wsA, { type: 'start' }); await until(() => stateA?.game.call?.status === 'ringing' && stateB?.game.call?.status === 'ringing', 'server clock + incoming calls');
 const clockBefore = stateA.game.seconds;
 const invalidControlTimer = setInterval(() => { wsA.send(JSON.stringify({ type: 'action', action: { type: 'start' } })); wsA.send(JSON.stringify({ type: 'action', action: { type: 'next' } })); }, 100);
 await new Promise(r => setTimeout(r, 1600)); clearInterval(invalidControlTimer);
 check('repeated host start or next cannot freeze the server clock', () => assert.ok(stateA.game.seconds < clockBefore));
 await send(wsA, { type: 'accept' }); check('standing player cannot work from a remote desk', () => assert.equal(stateA.game.call.status, 'ringing'));
 wsA.send(JSON.stringify({ type: 'dialogue', text: '独立接口测试，不应请求模型。' }));
 await until(() => dialogueStatuses.length > 0, 'invalid dialogue releases waiting UI');
 check('invalid dialogue returns actionable status without calling AI', () => { assert.equal(dialogueStatuses.at(-1).busy, false); assert.match(dialogueStatuses.at(-1).error, /入座/); assert.equal(stateA.game.call.status, 'ringing'); });
 const startZ = stateA.world.actors[stateA.self].z;
 await walk(wsA, 1, 0, 240);
 await until(() => Math.abs(stateB.world.actors[stateA.self].z - stateA.world.actors[stateA.self].z) < .01, 'same position on both clients');
 check('authoritative movement shared with both clients', () => { assert.ok(stateA.world.actors[stateA.self].z < startZ - .3); assert.ok(stateA.world.actors[stateA.self].z > startZ - 1.2); });
 await command(wsA, { type: 'sit' }); await walk(wsB, 1, 0, 240); await command(wsB, { type: 'sit' });
 check('personal seats synchronize', () => { assert.equal(stateA.world.actors[stateA.self].mode, 'seated'); assert.equal(stateA.world.actors[stateB.self].mode, 'seated'); });
 wsA.send(JSON.stringify({type:'phone-speech',level:.73}));
 await until(()=>stateB.world.actors[stateA.self].phoneTalking===.73,'phone microphone amplitude');
 check('phone microphone amplitude is separate from team audio membership',()=>{assert.equal(stateB.world.actors[stateA.self].phoneTalking,.73);assert.equal(stateB.players.find(p=>p.id===stateA.self).voice,false);});
 wsA.send(JSON.stringify({type:'phone-speech',level:0}));
 await until(()=>stateB.world.actors[stateA.self].phoneTalking===0,'phone microphone closes mouth');
 for (const ws of [wsA, wsB]) ws.send(JSON.stringify({ type: 'voice-state', enabled: true, level: .6 }));
 await until(() => stateB.players.every(p => p.voice), 'voice presence');
 wsA.send(JSON.stringify({ type: 'signal', to: stateB.self, signal: { description: { type: 'offer', sdp: 'test-offer' } } }));
 await until(() => signals.length === 1, 'scoped voice signaling');
 check('voice signaling and mouth amplitude synchronized', () => { assert.equal(signals[0].from, stateA.self); assert.equal(stateB.world.actors[stateA.self].talking, .6); });
 wsA.send(JSON.stringify({ type: 'signal', to: 'outside-room', signal: { description: { type: 'offer', sdp: 'must-not-broadcast' } } }));
 wsB.send(JSON.stringify({ type: 'voice-state', enabled: false })); await new Promise(r => setTimeout(r, 180));
 wsA.send(JSON.stringify({ type: 'signal', to: stateB.self, signal: { description: { type: 'offer', sdp: 'muted-recipient' } } })); await new Promise(r => setTimeout(r, 180));
 check('unconsented and cross-room signaling blocked', () => assert.equal(signals.length, 1));
 check('voice ICE authenticated endpoint', () => {}); assert.equal((await alice.request('/voice/ice')).status, 200); assert.equal((await anon.request('/voice/ice')).status, 401);
 await send(wsA, { type: 'accept' }); for (let i = 0; i < 3; i++) await send(wsA, { type: 'reply', tone: 'warm' });
 assert.equal(stateA.game.call.revealed, true); await send(wsA, { type: 'verify', code: stateA.game.call.code });
 await until(() => stateA.total === 250 && stateB.total === 250, 'shared earnings');
 check('server-validated task and shared quota', () => { assert.equal(stateA.game.balance, 330); assert.equal(stateB.game.balance, 80); });
 await send(wsA, { type: 'verify', code: stateA.game.call.code }); check('duplicate payout blocked', () => assert.equal(stateA.total, 250));
 await send(wsB, { type: 'tick' }); check('client clock manipulation blocked', () => assert.ok(stateB.game.seconds > 320));
 await send(wsA, { type: 'buy', id: 'headset' });
 check('purchase debits wallet and creates a delivery', () => { assert.equal(stateA.game.balance, 130); assert.equal(stateA.game.deliveries[0].item, 'headset'); assert.ok(!stateA.game.upgrades.includes('headset')); });
 await send(wsA, { type: 'claim', id: 1 }); check('remote parcel claim bypass blocked', () => assert.equal(stateA.game.inventory.headset, undefined));
 await until(() => stateB.world.bodies.some(b => b.kind === 'parcel' && b.owner === stateA.self), 'shared physical delivery');
 await command(wsA, { type: 'stand' });
 await walk(wsA, -1, 0, 680);
 await walk(wsA, 0, 1, 3440);
 await command(wsA, { type: 'interact' });
 await until(() => stateA.game.inventory.headset === 1, 'parcel physically claimed');
 await command(wsA, { type: 'use', item: 'headset' });
 check('walk, collect and equip on authoritative server', () => { assert.ok(stateA.game.upgrades.includes('headset')); assert.equal(stateA.game.inventory.headset, 0); assert.ok(!stateB.world.bodies.some(b => b.kind === 'parcel')); assert.equal(stateB.game.balance, 80); });
 wsA.send(JSON.stringify({ type: 'chat', text: 'Test room message' })); await until(() => stateB.chats.some(c => c.text === 'Test room message'), 'chat'); check('chat broadcast', () => {});
 await send(wsA, { type: 'review' }); await until(() => stateB.game.phase === 'fired', 'shared performance review'); check('shared failure verdict', () => assert.equal(stateA.game.history.at(-1).earned, 250));
 const ownRooms=await alice.request('/account/rooms'); const bobRooms=await bob.request('/account/rooms');
 check('room progress permanently associated with each account',()=>{assert.equal(ownRooms.json.rooms.find(r=>r.code===code).balance,130);assert.equal(bobRooms.json.rooms.find(r=>r.code===code).balance,80);assert.equal(stateA.self,aliceId);assert.equal(stateB.self,bobId);});
 let closedCode; wsA.on('close',code=>{closedCode=code;});await alice.request('/auth/logout','POST');await until(()=>closedCode===4001,'logout revokes active socket');check('logout immediately revokes active gameplay connection',()=>{});
 await until(() => stateB.host === stateB.self, 'host reassignment'); check('host reassignment on disconnect', () => {});
 assert.equal((await alice.request('/auth/login','POST',{email,password})).status,200);assert.equal((await alice.request('/rooms','POST',{code})).status,200);
 const resumed=alice.socket(code); try {const snapshot=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('resume timeout')),8000);resumed.on('message',m=>{const value=JSON.parse(m.toString());if(value.type==='state'){clearTimeout(timeout);resolve(value);}});resumed.on('error',reject);});check('same account resumes the same room, balance and equipment',()=>{assert.equal(snapshot.self,aliceId);assert.equal(snapshot.game.balance,130);assert.ok(snapshot.game.upgrades.includes('headset'));});} finally {resumed.close();}

 console.log(`\n${checks} API / WebSocket checks passed.`);
} finally { wsA.close(); wsB.close(); }
