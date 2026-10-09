import {normalizeLocale} from '../src/i18n/locales';
import {runtimeEnv} from './admin';
import { DurableObject } from 'cloudflare:workers';
import { gameReducer, newGame, dayConfig, applyDialogue, parseSave, type Action, type GameState } from '../src/game/engine';
import { makeWorld, addActor, setInput, stepWorld, interactWorld, syncDeliveries, type World, type WorldCommand } from '../src/game/world';
import { generateDialogue } from './dialogue';
import { accountsEnabled, type Env } from './auth';
interface Player { id: string; name: string; game: GameState; lastAction: number; actionCount?: number; voice?: boolean; aiAt?: number; aiCount?: number }
interface Room { code: string; host: string; players: Record<string, Player>; seconds: number; day: number; phase: GameState['phase']; chats: { name: string; text: string }[]; world: World }
export class OfficeRoom extends DurableObject<Env> {
 room: Room | null = null; lastTick = Date.now(); gameAccum = 0; lastSave = 0; pendingAI = new Set<string>(); lastCheckpoint = 0;
 constructor(ctx: DurableObjectState, env: Env) { super(ctx, env); ctx.blockConcurrencyWhile(async () => { this.room = (await ctx.storage.get<Room>('room')) || null; if (this.room) { this.room.world ||= makeWorld(); Object.values(this.room.players).forEach((p, i) => { p.game = parseSave(p.game) || newGame(); addActor(this.room!.world, p.id, p.name, i); p.voice = false; }); } }); }
 async save(checkpoint = false) {
  await this.ctx.storage.put("room", this.room); this.lastSave = Date.now();
  if (this.room && (checkpoint || Date.now() - this.lastCheckpoint >= 5000)) {
   const now = Math.max(Date.now(), this.lastCheckpoint + 1); this.lastCheckpoint = now;
   try { await this.env.DB.batch(Object.values(this.room.players).map(p => this.env.DB.prepare("INSERT INTO room_saves(user_id,room_code,state_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id,room_code) DO UPDATE SET state_json=excluded.state_json,updated_at=excluded.updated_at WHERE excluded.updated_at>room_saves.updated_at").bind(p.id, this.room!.code, JSON.stringify(p.game), now))); }
   catch { this.lastCheckpoint = 0; console.error("Room account checkpoint unavailable; durable room retained"); }
  }
 }
 async authorized(ws: WebSocket) {
  const a = ws.deserializeAttachment(), now = Date.now();
  if (!a?.sessionHash || !a.expiresAt || a.expiresAt <= now) { ws.close(4001, "Login required"); return false; }
  if (a.checkedUntil > now && a.accountsEnabled === accountsEnabled(this.env)) return true;
  const session = await this.env.DB.prepare("SELECT s.user_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.user_id=? AND s.expires_at>? AND u.guest=?").bind(a.sessionHash, a.id, now,accountsEnabled(this.env)?0:1).first();
  if (!session) { ws.close(4001, "Login required"); return false; }
  ws.serializeAttachment({...a, checkedUntil: now + 5000, accountsEnabled: accountsEnabled(this.env)}); return true;
 }
 total() { return Object.values(this.room?.players || {}).reduce((n, p) => n + p.game.earned, 0); }
 connected(id: string) { return this.ctx.getWebSockets().some(w => w.deserializeAttachment()?.id === id && w.readyState === 1); }
 sendTo(id: string, payload: unknown) { for (const w of this.ctx.getWebSockets()) if (w.deserializeAttachment()?.id === id && w.readyState === 1) try { w.send(JSON.stringify(payload)); } catch { /* A closed peer is removed by its close event. */ } }
 error(id: string, error: string) { this.sendTo(id, { type: 'error', error }); }
 broadcast(worldOnly = false) { if (!this.room) return; const r = this.room; for (const ws of this.ctx.getWebSockets()) { const id = ws.deserializeAttachment()?.id, p = r.players[id]; if (!p) continue; try { ws.send(JSON.stringify(worldOnly ? { type: 'world', world: r.world } : { type: 'state', code: r.code, self: id, host: r.host, total: this.total(), game: p.game, world: r.world, players: Object.values(r.players).map(p => ({ id: p.id, name: p.name, earned: p.game.earned, online: this.connected(p.id), voice: !!p.voice, talking: r.world.actors[p.id]?.talking || 0 })), chats: r.chats })); } catch { /* Ignore disconnected sockets. */ } } }
 async schedule() { if (!await this.ctx.storage.getAlarm()) { this.lastTick = Date.now(); await this.ctx.storage.setAlarm(Date.now() + 100); } }
 async fetch(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === "/revoke" && request.method === "POST") { const {sessionHash} = await request.json() as {sessionHash: string}; for (const ws of this.ctx.getWebSockets()) if (ws.deserializeAttachment()?.sessionHash === sessionHash) ws.close(4001, "Logged out"); return Response.json({ok:true}); }
  if (url.pathname === '/create' || url.pathname === '/join') {
   const data = await request.json() as { id: string; name: string; code: string };
   if (!this.room && url.pathname === '/join') return Response.json({ error: '房间不存在，请检查邀请码。' }, { status: 404 });
   if (!this.room) this.room = { code: data.code, host: data.id, players: {}, seconds: 360, day: 1, phase: 'ready', chats: [], world: makeWorld() };
   const r = this.room;
   if (!r.players[data.id] && Object.keys(r.players).length >= 4) return Response.json({ error: '房间已满（最多 4 人）。' }, { status: 409 });
   if (!r.players[data.id] && r.phase !== 'ready') return Response.json({ error: '本局已开始。请等待下一局或创建新房间。' }, { status: 409 });
   r.players[data.id] ||= { id: data.id, name: data.name, game: newGame(crypto.getRandomValues(new Uint32Array(1))[0]), lastAction: 0 };
   addActor(r.world, data.id, data.name, Object.keys(r.players).indexOf(data.id));
   await this.save(true); return Response.json({ code: r.code });
  }
  const id = request.headers.get('X-Player-Id'), sessionHash = request.headers.get("X-Session-Hash"), expiresAt = Number(request.headers.get("X-Session-Expires"));
  if (!id || !sessionHash || !Number.isFinite(expiresAt) || expiresAt <= Date.now() || !this.room?.players[id]) return new Response('Join room first', { status: 403 });
  for (const old of this.ctx.getWebSockets()) if (old.deserializeAttachment()?.id === id) old.close(1000, 'Reconnected');
  const pair = new WebSocketPair(); this.ctx.acceptWebSocket(pair[1]); pair[1].serializeAttachment({ id, sessionHash, expiresAt, checkedUntil: Date.now() + 5000 });
  if (!this.connected(this.room.host)) this.room.host = id;
  this.broadcast(); await this.schedule(); return new Response(null, { status: 101, webSocket: pair[0] });
 }
 async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
  if (typeof message !== 'string' || message.length > 16000 || !this.room) return;
  if (!await this.authorized(ws)) return;
  const id: string = ws.deserializeAttachment()?.id, p = this.room.players[id]; if (!p) return;
  if (Date.now() - p.lastAction >= 1000) { p.lastAction = Date.now(); p.actionCount = 0; }
  if ((p.actionCount = (p.actionCount || 0) + 1) > 100) { this.error(id, '操作过于频繁，请稍后再试。'); return; }
  let data; try { data = JSON.parse(message); } catch { return; } if (!data || typeof data !== 'object') return;
  const r = this.room, actor = r.world.actors[id];
  if (data.type === 'input') { setInput(r.world, id, data.input); return; }
  if (data.type === 'phone-speech') { actor.phoneTalking = Number.isFinite(data.level) ? Math.max(0, Math.min(1,data.level)) : 0; actor.phoneTalkingUntil = r.world.time + .6; return; }
  if (data.type === 'voice-state') { p.voice = data.enabled === true; actor.talking = p.voice && Number.isFinite(data.level) ? Math.max(0, Math.min(1, data.level)) : 0; this.broadcast(); return; }
  if (data.type === 'signal') {
   if (!p.voice || typeof data.to !== 'string' || data.to === id || !r.players[data.to]?.voice || !this.connected(data.to)) return;
   const signal = data.signal;
   if (!signal || typeof signal !== 'object') return;
   if (signal.description && (!['offer', 'answer'].includes(signal.description.type) || typeof signal.description.sdp !== 'string' || signal.description.sdp.length > 12000)) return;
   if (signal.candidate && (typeof signal.candidate.candidate !== 'string' || signal.candidate.candidate.length > 2000)) return;
   if (!signal.description && !signal.candidate) return;
   this.sendTo(data.to, { type: 'signal', from: id, signal }); return;
  }
  if (data.type === 'dialogue') {
   if (r.phase !== 'playing' || actor.mode !== 'seated' || !p.game.call || p.game.call.status !== 'active' || p.game.event || typeof data.text !== 'string' || !data.text.trim() || data.text.length > 200) { this.sendTo(id, { type: 'dialogue-status', busy: false, error: '当前通话不可应答，请确认已入座且通话仍在继续。' }); return; }
   if (this.pendingAI.has(id)) { this.sendTo(id, { type: 'dialogue-status', busy: true, error: '上一条 AI 应答仍在处理中。' }); return; }
   if (Date.now() - (p.aiAt || 0) > 600000) { p.aiAt = Date.now(); p.aiCount = 0; }
   if ((p.aiCount = (p.aiCount || 0) + 1) > 60) { this.sendTo(id, { type: 'dialogue-status', busy: false, error: 'AI 对话额度暂时用完。' }); return; }
   this.pendingAI.add(id); this.sendTo(id, { type: 'dialogue-status', busy: true });
   const expected = structuredClone(p.game.call);
   try { const result = await generateDialogue(await runtimeEnv(this.env), expected, data.text, fetch, normalizeLocale(data.locale)); p.game = applyDialogue(p.game, data.text, result); await this.save(true); this.broadcast(); this.sendTo(id, { type: 'dialogue-status', busy: false }); }
   catch (e) { this.sendTo(id, { type: 'dialogue-status', busy: false, error: e instanceof Error ? e.message : 'AI 暂时不可用。' }); }
   finally { this.pendingAI.delete(id); } return;
  }
  if (data.type === 'world-command') {
   const c = data.command as WorldCommand;
   if (!c || !['sit', 'stand', 'interact', 'drop', 'throw', 'wave', 'use'].includes(c.type) || (c.type === 'use' && typeof c.item !== 'string')) return;
   const result = interactWorld(r.world, id, c, p.game); p.game = result.game; if (result.message) this.sendTo(id, { type: 'hint', message: result.message });
  } else if (data.type === 'chat' && typeof data.text === 'string' && data.text.trim()) r.chats = [...r.chats, { name: p.name, text: data.text.trim().slice(0, 240) }].slice(-30);
  else if (data.type === 'action' && data.action && typeof data.action.type === 'string') {
   const a = data.action as Action;
   if (['start', 'next', 'review'].includes(a.type)) {
    if (id !== r.host || (a.type === 'start' && r.phase !== 'ready') || (a.type === 'next' && r.phase !== 'review')) return;
    if (a.type === 'review') this.finish();
    else { for (const player of Object.values(r.players)) player.game = gameReducer(player.game, a); r.phase = p.game.phase; r.day = p.game.day; r.seconds = p.game.seconds; this.gameAccum = 0; }
   } else if (r.phase === 'playing' && ['accept', 'hangup', 'reply', 'verify', 'verify-credit', 'buy', 'fix', 'gamble', 'clear-notice'].includes(a.type)) {
    if (actor.mode !== 'seated' && a.type !== 'clear-notice' && a.type !== 'hangup') { this.error(id, '请先走到自己的工位并入座。'); return; }
    if (a.type === 'reply' && (!['warm', 'confident', 'playful'].includes(a.tone) || (a.text !== undefined && typeof a.text !== 'string'))) return;
    if (a.type === 'verify' && typeof a.code !== 'string') return;
    if (a.type === 'verify-credit' && (typeof a.value !== 'string' || !Number.isInteger(a.field))) return;
    if (a.type === 'buy' && typeof a.id !== 'string') return;
    if (a.type === 'fix' && p.game.event === 'power') { this.error(id, '停电需要到茶水间配电箱处理。'); return; }
    p.game = gameReducer(p.game, a);
   } else return;
  } else return;
  syncDeliveries(r.world, id, p.game); await this.save(true); this.broadcast();
 }
 finish() { if (!this.room || this.room.phase !== 'playing') return; const r = this.room, total = this.total(), passed = total >= dayConfig(r.day).quota; r.phase = passed ? (r.day === 7 ? 'won' : 'review') : 'fired'; for (const p of Object.values(r.players)) { p.game.phase = r.phase; p.game.seconds = r.seconds; p.game.call = null; p.game.event = null; p.game.history.push({ day: r.day, earned: total, quota: dayConfig(r.day).quota, passed }); if (r.phase === 'won') p.game.achievements = [...new Set([...(p.game.achievements || []), 'survivor'])]; } }
 async alarm() {
  if (!this.room || !this.ctx.getWebSockets().some(w => w.readyState === 1)) return;
  const r = this.room, now = Date.now(), elapsed = Math.min(2, Math.max(0, (now - this.lastTick) / 1000)); this.lastTick = now; stepWorld(r.world, elapsed);
  this.gameAccum += elapsed; let changed = false;
  while (this.gameAccum >= 1) { this.gameAccum--; if (r.phase !== 'playing') continue; r.seconds = Math.max(0, r.seconds - 1); if (!r.seconds) this.finish(); else for (const p of Object.values(r.players)) { p.game.seconds = r.seconds + 1; p.game = gameReducer(p.game, { type: 'tick' }); syncDeliveries(r.world, p.id, p.game); } changed = true; }
  for (const p of Object.values(r.players)) { const a = r.world.actors[p.id]; if (!this.connected(p.id)) { a.input.forward = a.input.side = 0; a.talking = 0; } }
  if (now - this.lastSave > 1000 || changed) await this.save();
  this.broadcast(!changed); await this.ctx.storage.setAlarm(Date.now() + 100);
 }
 async webSocketClose(ws: WebSocket) { const id = ws.deserializeAttachment()?.id; ws.close(); if (!this.room) return; const p = this.room.players[id]; if (p && !this.connected(id)) { p.voice = false; const actor = this.room.world.actors[id]; actor.talking = 0; interactWorld(this.room.world, id, { type: 'drop' }, p.game); } const next = Object.values(this.room.players).find(p => this.connected(p.id)); if (next && !this.connected(this.room.host)) this.room.host = next.id; await this.save(true); this.broadcast(); }
}

