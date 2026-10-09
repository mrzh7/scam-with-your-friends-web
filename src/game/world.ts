import { gameReducer, type GameState } from './engine';

export type Locomotion = 'standing' | 'seated';
export interface Input { forward: number; side: number; yaw: number; pitch: number; sprint: boolean; jump: boolean; seq: number }
export interface Actor { completedCalls?: number; celebrateUntil?: number; phoneTalking?: number; phoneTalkingUntil?: number; onCall?: boolean; speechUntil?: number; speechRevision?: number; speechCall?: number; waveUntil?: number; id: string; name: string; seat: number; x: number; y: number; z: number; yaw: number; pitch: number; vy: number; mode: Locomotion; moving: number; stamina: number; stun: number; held: string | null; talking: number; input: Input; inputAt: number }
export interface Body { id: string; kind: 'ball' | 'box' | 'mug' | 'parcel'; x: number; y: number; z: number; vx: number; vy: number; vz: number; rotation: number; radius: number; heldBy: string | null; owner?: string; order?: number; item?: string }
export interface World { version: 1; time: number; actors: Record<string, Actor>; bodies: Body[]; serial: number; burst: { x: number; z: number; until: number } | null }
export type WorldCommand = { type: 'sit' | 'stand' | 'interact' | 'drop' | 'throw' | 'wave' } | { type: 'use'; item: string };
export const SEATS = [{ x: -4.8, z: 4.25 }, { x: -1.8, z: 4.25 }, { x: 3.3, z: 4.25 }, { x: 6.3, z: 4.25 }];
export const STATIONS = { delivery: { x: 7.9, z: 7.3 }, power: { x: 18.8, z: -5.4 }, coffee: { x: 15, z: -5.4 }, fire: { x: 12.2, z: -4.5 }, meeting: { x: 15.5, z: 4.7 } };
export const EMPTY_INPUT: Input = { forward: 0, side: 0, yaw: Math.PI, pitch: 0, sprint: false, jump: false, seq: 0 };
export const distance = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export function makeWorld(): World { return { version: 1, time: 0, actors: {}, serial: 3, burst: null, bodies: [{ id: 'ball-0', kind: 'ball', x: .7, y: .3, z: 5.2, vx: 0, vy: 0, vz: 0, radius: .26, rotation: 0, heldBy: null }, { id: 'box-1', kind: 'box', x: 7.4, y: .26, z: 6, vx: 0, vy: 0, vz: 0, radius: .25, rotation: 0, heldBy: null }, { id: 'mug-2', kind: 'mug', x: 13.7, y: .16, z: -3.7, vx: 0, vy: 0, vz: 0, radius: .16, rotation: 0, heldBy: null }] }; }
export function addActor(world: World, id: string, name: string, seat: number) { if (world.actors[id]) return; const p = SEATS[seat % 4]; world.actors[id] = { id, name, seat: seat % 4, x: p.x, y: 0, z: 6.3, yaw: Math.PI, pitch: 0, vy: 0, mode: 'standing', moving: 0, stamina: 100, stun: 0, held: null, talking: 0, input: { ...EMPTY_INPUT }, inputAt: 0 }; }
export function isWalkable(x: number, z: number, radius = .28): boolean {
 if (![x, z, radius].every(Number.isFinite)) return false;
 const inside = (x > -9 + radius && x < 9 - radius && z > -8 + radius && z < 9 - radius) || (x > 8 && x < 12 && z > -2.5 + radius && z < 6.5 - radius) || (x > 11 + radius && x < 20 - radius && z > -7 + radius && z < .3 - radius) || (x > 11 + radius && x < 20 - radius && z > 1 - radius && z < 9 - radius);
 if (!inside) return false;
 for (const row of [-4.6, -.7, 3.2]) for (const col of [-4.8, -1.8, 3.3, 6.3]) if (Math.abs(x - col) < 1.43 + radius && Math.abs(z - row) < .80 + radius) return false;
 if (Math.abs(x - 15.5) < 1.4 + radius && Math.abs(z - 4.7) < 2 + radius) return false;
 if (x > 13.1 - radius && x < 17 + radius && z < -4.9 + radius) return false;
 return true;
}
export function sanitizeInput(value: unknown, previous: Input): Input | null { if (!value || typeof value !== 'object') return null; const v = value as Input; if (![v.forward, v.side, v.yaw, v.pitch, v.seq].every(Number.isFinite) || !Number.isSafeInteger(v.seq) || v.seq <= previous.seq || Math.abs(v.forward) > 1 || Math.abs(v.side) > 1 || typeof v.sprint !== 'boolean' || typeof v.jump !== 'boolean') return null; return { forward: v.forward, side: v.side, yaw: v.yaw % (Math.PI * 2), pitch: clamp(v.pitch, -.95, .95), sprint: v.sprint, jump: v.jump, seq: v.seq }; }
export function setInput(world: World, id: string, value: unknown) { const p = world.actors[id]; if (!p) return false; const input = sanitizeInput(value, p.input); if (!input) return false; p.input = input; p.inputAt = world.time; p.yaw = input.yaw; p.pitch = input.pitch; return true; }
export function stepActor(world: World, p: Actor, dt: number) {
 p.stun = Math.max(0, p.stun - dt); const input = p.input; p.yaw = input.yaw; p.pitch = input.pitch;
 if (p.mode === 'seated') { p.moving = 0; return; }
 const live = world.time - p.inputAt < .4 && !p.stun;
 const f = live ? input.forward : 0, side = live ? input.side : 0, norm = Math.max(1, Math.hypot(f, side));
 const moving = Math.hypot(f, side) > .05; const sprint = moving && input.sprint && p.stamina > 2;
 p.stamina = clamp(p.stamina + dt * (sprint ? -19 : 12), 0, 100); const speed = sprint ? 5.4 : 3.1;
 const dx = (Math.sin(p.yaw) * f - Math.cos(p.yaw) * side) / norm * speed * dt, dz = (Math.cos(p.yaw) * f + Math.sin(p.yaw) * side) / norm * speed * dt;
 if (isWalkable(p.x + dx, p.z)) p.x += dx; if (isWalkable(p.x, p.z + dz)) p.z += dz; p.moving = moving ? (sprint ? 1.5 : 1) : 0;
 if (live && input.jump && p.y <= .001 && p.stamina >= 8) { p.vy = 4.3; p.stamina -= 8; } input.jump = false;
 p.vy -= 12 * dt; p.y = Math.max(0, p.y + p.vy * dt); if (!p.y) p.vy = 0;
}
export function stepWorld(world: World, elapsed: number) {
 let remaining = clamp(elapsed, 0, .3);
 while (remaining > .0001) { const dt = Math.min(remaining, .02); remaining -= dt; world.time += dt;
  Object.values(world.actors).forEach(p => stepActor(world, p, dt));
  for (const b of world.bodies) {
   if (b.heldBy) { const p = world.actors[b.heldBy]; if (p) { b.x = p.x + Math.sin(p.yaw) * .7; b.z = p.z + Math.cos(p.yaw) * .7; b.y = p.y + 1.25; b.vx = b.vy = b.vz = 0; continue; } b.heldBy = null; }
   b.vy -= 9.8 * dt; b.y += b.vy * dt;
   if (b.y < b.radius) { b.y = b.radius; b.vy = Math.abs(b.vy) > .7 ? -b.vy * (b.kind === 'ball' ? .65 : .23) : 0; const friction = Math.max(0, 1 - dt * (b.kind === 'ball' ? .9 : 5)); b.vx *= friction; b.vz *= friction; }
   const nx = b.x + b.vx * dt, nz = b.z + b.vz * dt;
   if (isWalkable(nx, b.z, b.radius * .6)) b.x = nx; else b.vx *= -.55;
   if (isWalkable(b.x, nz, b.radius * .6)) b.z = nz; else b.vz *= -.55;
   b.rotation += (Math.abs(b.vx) + Math.abs(b.vz)) * dt * 2;
   for (const p of Object.values(world.actors)) if (distance(p, b) < b.radius + .28 && b.y > .35 && b.y < 1.8 && Math.hypot(b.vx, b.vz) > 3.5) { p.stun = .75; b.vx *= -.35; b.vz *= -.35; }
  }
  for (let i = 0; i < world.bodies.length; i++) for (let j = i + 1; j < world.bodies.length; j++) { const a = world.bodies[i], b = world.bodies[j]; if (a.heldBy || b.heldBy || a.kind === 'parcel' || b.kind === 'parcel') continue; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), r = a.radius + b.radius; if (d > .001 && d < r && Math.abs(a.y - b.y) < r) { const nx = dx / d, nz = dz / d, impulse = Math.max(0, (a.vx - b.vx) * nx + (a.vz - b.vz) * nz) * .65; a.vx -= impulse * nx; a.vz -= impulse * nz; b.vx += impulse * nx; b.vz += impulse * nz; const push = (r - d) / 2; if (isWalkable(a.x - nx * push, a.z - nz * push, .1)) { a.x -= nx * push; a.z -= nz * push; } if (isWalkable(b.x + nx * push, b.z + nz * push, .1)) { b.x += nx * push; b.z += nz * push; } } }
 }
 if (world.burst && world.burst.until < world.time) world.burst = null;
}
export function syncDeliveries(world: World, id: string, game: GameState) {
 if (world.actors[id]) {
  const actor = world.actors[id];
  // Baseline on load; only a newly completed, paid call starts this reaction.
  if (actor.completedCalls !== undefined && game.successes > actor.completedCalls && game.call?.status === 'complete') actor.celebrateUntil = world.time + 5;
  if (actor.completedCalls !== undefined && game.successes < actor.completedCalls) actor.celebrateUntil = undefined;
  actor.completedCalls = game.successes;
  actor.onCall = game.call?.status === 'active'; actor.speechCall = game.call?.id; actor.speechRevision = game.call?.revision;
 }
 const active = new Set((game.deliveries || []).filter(d => d.seconds === 0).map(d => d.id));
 world.bodies = world.bodies.filter(b => b.kind !== 'parcel' || b.owner !== id || active.has(b.order!));
 for (const [index, d] of (game.deliveries || []).entries()) if (d.seconds === 0 && !world.bodies.some(b => b.owner === id && b.order === d.id)) { const offset = Object.keys(world.actors).indexOf(id); world.bodies.push({ id: `parcel-${id}-${d.id}`, kind: 'parcel', owner: id, order: d.id, item: d.item, x: 5.5 + (offset % 2) * 1.65 + (index % 3) * .5, z: 7.8 - Math.floor(offset / 2) * 1.4 - Math.floor(index / 3) * .45, y: .28, vx: 0, vy: 0, vz: 0, radius: .28, rotation: 0, heldBy: null }); }
}
export function nearestBody(world: World, actor: Actor) { return world.bodies.filter(b => !b.heldBy && (b.kind !== 'parcel' || b.owner === actor.id) && distance(actor, b) < 1.65).sort((a, b) => distance(actor, a) - distance(actor, b))[0]; }
export function interactWorld(world: World, id: string, command: WorldCommand, game: GameState): { game: GameState; message: string } {
 const p = world.actors[id]; if (!p) return { game, message: '办公室尚未就绪。' }; const seat = SEATS[p.seat]; let next = game; let message = '';
 if (command.type === 'stand') { if (p.mode === 'seated') { p.mode = 'standing'; p.x = seat.x; p.z = seat.z + .9; p.y = 0; } }
 else if (command.type === 'sit') { if (distance(p, seat) > 1.8 || p.stun) message = '请走到黄色标记的个人工位旁，再按 E 入座。'; else if (p.held) message = '先按 Q 放下手中的物品。'; else { p.mode = 'seated'; p.x = seat.x; p.z = seat.z; p.yaw = Math.PI; p.input = { ...EMPTY_INPUT, seq: p.input.seq, yaw: Math.PI }; } }
 else if (command.type === 'interact') {
  const b = nearestBody(world, p);
  if (b?.kind === 'parcel') { next = gameReducer(game, { type: 'claim', id: b.order! }); if (next !== game) { world.bodies = world.bodies.filter(o => o.id !== b.id); message = '包裹已拆封，物品放入背包。按 I 查看。'; } }
  else if (b && !p.held && p.mode === 'standing') { p.held = b.id; b.heldBy = id; message = '已拾取。左键投掷，Q 放下。'; }
  else if (distance(p, seat) < 1.8) return interactWorld(world, id, { type: 'sit' }, game);
  else if (distance(p, STATIONS.power) < 1.8 && game.event === 'power') { next = gameReducer(game, { type: 'fix' }); message = next.event ? '已重置一组线路，再按 E 继续。' : '供电已恢复。'; }
  else if (distance(p, STATIONS.coffee) < 1.8) { if ((game.inventory?.energy || 0) > 0) return interactWorld(world, id, { type: 'use', item: 'energy' }, game); message = '茶水间补给可在 Scamazon 购买。'; }
  else message = '靠近工位、包裹或物品，按 E 交互。';
 }
 else if (command.type === 'drop' || command.type === 'throw') { const b = world.bodies.find(o => o.id === p.held); if (b) { b.heldBy = null; b.y = p.y + 1.2; const force = command.type === 'throw' ? 8 : 1; b.vx = Math.sin(p.yaw) * force; b.vz = Math.cos(p.yaw) * force; b.vy = command.type === 'throw' ? 2 + Math.sin(p.pitch) * 5 : 0; p.held = null; } }
 else if (command.type === 'wave') { p.waveUntil = world.time + 2; message = '你向同事挥了挥手。'; }
 else if (command.type === 'use') {
  if (command.item === 'repair' && distance(p, STATIONS.power) > 2) return { game, message: '带上维修包，到茶水间配电箱旁使用。' };
  if (command.item === 'ball' && world.bodies.length >= 40) return { game, message: '办公室物品已达上限，篮球仍保留在背包中。' };
  next = gameReducer(game, { type: 'use-item', id: command.item });
  if (next === game) return { game, message: '物品不足，或当前没有适合的使用目标。' };
  if (command.item === 'energy') p.stamina = 100;
  if (command.item === 'ball') { if (world.bodies.length < 40) world.bodies.push({ id: `toy-${++world.serial}`, kind: 'ball', x: p.x + Math.sin(p.yaw) * .7, z: p.z + Math.cos(p.yaw) * .7, y: 1.2, vx: 0, vy: 0, vz: 0, radius: .26, rotation: 0, heldBy: null }); }
  if (command.item === 'airstrike') { world.burst = { x: p.x, z: p.z, until: world.time + 5 }; for (const b of world.bodies) { if (b.kind === 'parcel' || b.heldBy || distance(b, p) > 7) continue; const angle = Math.atan2(b.x - p.x, b.z - p.z); b.vx = Math.sin(angle) * 6; b.vz = Math.cos(angle) * 6; b.vy = 7; } for (const actor of Object.values(world.actors)) if (distance(actor, p) < 6) actor.stun = 2; }
 }
 return { game: next, message };
}
