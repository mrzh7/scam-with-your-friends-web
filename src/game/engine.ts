import { CALLERS, DAYS, SCHEMES, SHOP, type Scheme, type Tone } from './content';
import { callOpening } from './dialogueContent';
export interface Line { who: 'caller' | 'you' | 'system'; text: string }
export interface Call { revision?: number; id: number; person: number; scheme: Scheme; status: 'ringing' | 'active' | 'complete'; trust: number; patience: number; turn: number; revealed: boolean; code: string; transcript: Line[]; verifiedFields?: number }
export interface Highlight { day: number; callId: number; person: number; quote: string; response: string; trust: number; success: boolean }
export interface Delivery { id: number; item: string; seconds: number }
export interface LedgerEntry { day: number; amount: number; balance: number; label: string }
export interface DialogueResult { callCode: string; callId: number; turn: number; reply: string; attitude: 'positive' | 'neutral' | 'negative' }
export interface GameState { inventory?: Record<string, number>; deliveries?: Delivery[]; orderSerial?: number; ledger?: LedgerEntry[]; achievements?: string[]; streak?: number; highlights?: Highlight[]; version: 1; seed: number; phase: 'ready' | 'playing' | 'review' | 'fired' | 'won'; day: number; seconds: number; balance: number; earned: number; lifetime: number; successes: number; failed: number; risk: number; serial: number; wait: number; call: Call | null; upgrades: string[]; event: string | null; eventTriggered: boolean; eventSteps: number; log: string[]; history: { day: number; earned: number; quota: number; passed: boolean }[]; notice: string }
export type Action = { type: 'start' | 'tick' | 'accept' | 'hangup' | 'review' | 'next' | 'clear-notice' | 'fix' } | { type: 'reply'; tone: Tone; text?: string } | { type: 'verify'; code: string; file?: string } | { type: 'verify-credit'; field: number; value: string } | { type: 'buy' | 'use-item'; id: string } | { type: 'claim'; id: number } | { type: 'gamble'; bet: number };
export const creditFields = (c: Call) => [c.code, `PIX-${c.code.slice(-3).split('').reverse().join('')}`, `MOON-${String(1 + c.id % 12).padStart(2, '0')}`];
export const dayConfig = (day: number) => DAYS[Math.min(Math.max(day - 1, 0), DAYS.length - 1)];
export function newGame(seed = Date.now() % 2147483647): GameState { return { version: 1, inventory: { energy: 1, repair: 1 }, deliveries: [], orderSerial: 0, ledger: [], achievements: [], streak: 0, highlights: [], seed: seed || 1, phase: 'ready', day: 1, seconds: 360, balance: 80, earned: 0, lifetime: 0, successes: 0, failed: 0, risk: 0, serial: 0, wait: 3, call: null, upgrades: [], event: null, eventTriggered: false, eventSteps: 0, log: ['Kolkata OS 已就绪。欢迎入职。'], history: [], notice: '' }; }
function random(s: GameState) { s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0; return s.seed / 4294967296; }
function log(s: GameState, text: string) { s.notice = text; s.log = [text, ...s.log].slice(0, 30); }
function endCall(s: GameState, failed = false) { if (failed && s.call?.status !== 'complete') { s.failed++; s.streak = 0; s.risk = Math.min(100, s.risk + 5); } s.call = null; s.wait = 4; }
function review(s: GameState) { const quota = dayConfig(s.day).quota; const passed = s.earned >= quota; s.phase = passed ? (s.day === 7 ? 'won' : 'review') : 'fired'; s.history.push({ day: s.day, earned: s.earned, quota, passed }); s.call = null; s.event = null; if (s.phase === 'won') award(s, 'survivor'); }
export function gameReducer(state: GameState, action: Action): GameState {
  const s: GameState = structuredClone(state);
  s.inventory ||= {}; s.deliveries ||= []; s.orderSerial ||= 0; s.ledger ||= []; s.achievements ||= []; s.streak ||= 0;
  if (action.type === 'clear-notice') { s.notice = ''; return s; }
  if (action.type === 'start' && s.phase === 'ready') { s.phase = 'playing'; return s; }
  if (action.type === 'next' && s.phase === 'review') { s.day++; s.seconds = dayConfig(s.day).seconds; s.phase = 'playing'; s.earned = 0; s.eventTriggered = false; s.eventSteps = 0; s.risk = Math.max(0, s.risk - 15); s.wait = 3; log(s, `第 ${s.day} 天：${dayConfig(s.day).name}`); return s; }
  if (s.phase !== 'playing') return state;
  if (action.type === 'tick') {
    s.deliveries.forEach(d => { if (d.seconds > 0) { d.seconds--; if (d.seconds === 0) log(s, 'Scamazon 包裹已到收货区。离开工位，走到包裹旁按 E 拆封。'); } });
    s.seconds = Math.max(0, s.seconds - 1);
    if (!s.seconds) { review(s); return s; }
    if (!s.eventTriggered && s.day > 1 && s.seconds < dayConfig(s.day).seconds * 0.62) {
      s.eventTriggered = true; const incident = dayConfig(s.day).event;
      if ((incident === 'virus' && s.upgrades.includes('antivirus')) || (incident === 'raid' && s.upgrades.includes('shield'))) { if (incident === 'raid') s.upgrades = s.upgrades.filter(x => x !== 'shield'); log(s, incident === 'raid' ? '防暴盾拦截了突袭，现已消耗。' : 'Malwarebits Pro 已自动拦截病毒。'); }
      else { s.event = incident; s.eventSteps = 0; log(s, incident === 'fire' ? '办公室出现火情！使用灭火器或在安全中心逐步处理。' : incident === 'power' ? '电路过载！请重启办公室电源。' : incident === 'raid' ? '突袭检查！请立即整理办公室。' : '检测到可疑程序！打开 Malwarebits 清理。'); }
    }
    if (s.call) {
      if (s.call.status === 'ringing') { s.call.patience--; if (s.call.patience <= 0) { log(s, '错过了一个来电。下一位正在排队。'); endCall(s, true); } }
      else if (s.call.status === 'active') { s.call.patience--; if (s.event) s.call.patience--; if (s.call.patience <= 0) { log(s, '对方等得太久，挂断了电话。'); endCall(s, true); } }
      else { s.wait--; if (s.wait <= 0) endCall(s); }
    } else if (!s.event) {
      s.wait--;
      if (s.wait <= 0) {
        const unlocked = (Object.keys(SCHEMES) as Scheme[]).filter(k => SCHEMES[k].day <= s.day);
        const person = s.serial === 0 ? 0 : Math.floor(random(s) * CALLERS.length);
        const pick = random(s); const scheme = s.serial === 0 ? 'identity' : unlocked[Math.floor(pick * unlocked.length)];
        s.serial++; s.call = { id: s.serial, person, scheme, status: 'ringing', trust: 40 + (s.upgrades.includes('headset') ? 10 : 0), patience: 25, turn: 0, revealed: false, code: `GAME-${SCHEMES[scheme].code}-${String(100 + Math.floor(random(s) * 900))}`, transcript: [] };
      }
    }
    return s;
  }
  if (action.type === 'accept' && s.call?.status === 'ringing') { s.call.status = 'active'; s.call.patience = Math.max(45, 115 - s.day * 3 - Math.floor(s.risk / 4)) + (s.upgrades.includes('coffee') ? 30 : 0); s.call.transcript = [{ who: 'caller', text: callOpening(s.call.person, s.call.scheme) }]; return s; }
  if (action.type === 'hangup' && s.call) { endCall(s, true); return s; }
  if (action.type === 'reply' && s.call?.status === 'active' && !s.event) {
    const call = s.call; call.revision = (call.revision || 0) + 1; const person = CALLERS[call.person]; const correct = action.tone === person.tone;
    call.trust = Math.max(0, Math.min(100, call.trust + (correct ? 16 + (s.upgrades.includes('script') ? 5 : 0) : -18)));
    const text = (action.text || ({ warm: '别着急，我们慢慢来。我在听。', confident: '我会按流程处理，请打开任务面板。', playful: '先别让电脑辞职，我们还能抢救一下。' })[action.tone]).slice(0, 200);
    call.transcript.push({ who: 'you', text });
    if (correct) call.turn++;
    if (call.turn >= 3 && call.trust >= 55) { call.revealed = true; call.transcript.push({ who: 'caller', text: `${person.good[2]} ${call.scheme === 'credit' ? `卡号：${creditFields(call)[0]}；安全口令：${creditFields(call)[1]}；到期标记：${creditFields(call)[2]}` : `任务编号：${call.code}`}。` }); }
    else call.transcript.push({ who: 'caller', text: correct ? person.good[Math.min(call.turn - 1, 1)] : person.bad });
    call.transcript = call.transcript.slice(-20);
    s.highlights = [...(s.highlights || []), { day: s.day, callId: call.id, person: call.person, quote: text, response: call.transcript.at(-1)!.text, trust: call.trust, success: false }].slice(-30);
    if (call.trust === 0) { log(s, `${person.name} 不再相信你，挂断了电话。`); endCall(s, true); }
    return s;
  }
  if (action.type === 'verify' && s.call?.status === 'active' && !s.event) {
    const c = s.call;
    if (c.scheme === 'credit') { log(s, '卡片需要分别完成三项验证。'); return s; }
    if (!c.revealed || c.trust < 55) { log(s, '先让来电者信任你并提供任务编号。'); return s; }
    if (action.code.trim().toUpperCase() !== c.code || (c.scheme === 'remote' && action.file !== 'mission.txt')) { c.trust = Math.max(0, c.trust - 12); log(s, '编号或文件不匹配。重新检查通话记录。'); if (c.trust === 0) endCall(s, true); return s; }
    completeCall(s); return s;
  }
  if (action.type === 'verify-credit' && s.call?.status === 'active' && s.call.scheme === 'credit' && !s.event) {
    const c = s.call; const step = c.verifiedFields || 0;
    if (!c.revealed || c.trust < 55) { log(s, '先完成通话并取得三个验证信息。'); return s; }
    if (action.field !== step || step >= 3) return state;
    if (action.value.trim().toUpperCase() !== creditFields(c)[step]) { c.trust = Math.max(0, c.trust - 12); log(s, '此项信息不匹配，请核对通话记录。'); if (c.trust === 0) endCall(s, true); return s; }
    c.verifiedFields = step + 1;
    if (c.verifiedFields === 3) completeCall(s); else log(s, `卡片验证通过 ${c.verifiedFields}/3 项。`);
    return s;
  }
  if (action.type === 'buy') {
    const item = SHOP.find(x => x.id === action.id);
    if (!item || s.balance < item.price || s.deliveries.length >= 8 || (!item.repeatable && (s.upgrades.includes(item.id) || (s.inventory[item.id] || 0) > 0 || s.deliveries.some(d => d.item === item.id)))) return state;
    transact(s, -item.price, `购买：${item.name}`); award(s, 'buyer');
    if (item.delivery) { s.deliveries.push({ id: ++s.orderSerial, item: item.id, seconds: 5 }); log(s, `${item.name} 已下单，5 秒后送到办公室收货区。`); }
    else { s.upgrades.push(item.id); log(s, `${item.name} 已安装。`); }
    return s;
  }
  if (action.type === 'claim') { const order = s.deliveries.find(d => d.id === action.id && d.seconds === 0); if (!order || (s.inventory[order.item] || 0) >= 99) return state; s.inventory[order.item] = (s.inventory[order.item] || 0) + 1; s.deliveries = s.deliveries.filter(d => d.id !== order.id); log(s, '包裹已拆封，请在背包中使用或安装。'); return s; }
  if (action.type === 'use-item') {
    const item = SHOP.find(x => x.id === action.id); if (!item || !item.delivery || !s.inventory[item.id]) return state;
    if ((item.id === 'repair' && s.event !== 'power') || (item.id === 'extinguisher' && s.event !== 'fire')) return state;
    if (['headset', 'coffee', 'plant', 'shield'].includes(item.id)) { if (s.upgrades.includes(item.id)) return state; s.upgrades.push(item.id); }
    s.inventory[item.id]--;
    if (item.id === 'plant') s.risk = Math.max(0, s.risk - 15);
    if (item.id === 'energy' && s.call?.status === 'active') s.call.patience = Math.min(180, s.call.patience + 25);
    if (item.id === 'repair' || item.id === 'extinguisher') { s.event = null; s.eventSteps = 0; s.risk = Math.max(0, s.risk - 10); award(s, 'fixer'); }
    log(s, `${item.name} 已使用。`); return s;
  }
  if (action.type === 'fix' && s.event) { s.eventSteps++; if (s.eventSteps >= 3) { s.event = null; s.risk = Math.max(0, s.risk - 10); award(s, 'fixer'); log(s, '故障已解决。老板说这不算带薪休息。'); } return s; }
  if (action.type === 'gamble' && Number.isInteger(action.bet) && action.bet >= 10 && action.bet <= 100 && s.balance >= action.bet) { const factor = random(s) < 0.35 ? 2 : 0; transact(s, action.bet * (factor - 1), 'Rainbit 娱乐'); log(s, factor ? `Rainbit：赢得 $${action.bet * factor}！娱乐收益不计入业绩。` : `Rainbit：损失 $${action.bet}。老板在看着你。`); return s; }
  if (action.type === 'review') { review(s); return s; }
  return state;
}
export function parseSave(value: unknown): GameState | null {
  if (!value || typeof value !== 'object') return null;
  const s = value as GameState;
  if (s.version !== 1 || !['ready', 'playing', 'review', 'fired', 'won'].includes(s.phase) || !Number.isInteger(s.day) || s.day < 1 || s.day > 7) return null;
  for (const key of ['seconds', 'balance', 'earned', 'lifetime', 'successes', 'failed', 'risk', 'serial', 'wait', 'eventSteps'] as const) if (!Number.isFinite(s[key]) || s[key] < 0 || s[key] > 1e9) return null;
  if (!Number.isInteger(s.seed) || s.seed < 0 || s.seed > 4294967295 || s.seconds > 420 || s.risk > 100 || s.eventSteps > 3) return null;
  if (!Array.isArray(s.upgrades) || s.upgrades.some(v => typeof v !== 'string' || !SHOP.some(x => x.id === v)) || !Array.isArray(s.history) || !Array.isArray(s.log) || s.log.some(x => typeof x !== 'string') || typeof s.notice !== 'string' || typeof s.eventTriggered !== 'boolean') return null;
  if (s.event !== null && !['virus', 'power', 'raid', 'fire'].includes(s.event)) return null;
  if (s.call) { const c = s.call; if (!Number.isInteger(c.person) || !CALLERS[c.person] || !SCHEMES[c.scheme] || !['ringing', 'active', 'complete'].includes(c.status) || typeof c.code !== 'string' || typeof c.revealed !== 'boolean' || !Array.isArray(c.transcript) || c.transcript.some(l => !l || !['caller', 'you', 'system'].includes(l.who) || typeof l.text !== 'string')) return null; for (const k of ['trust', 'patience', 'turn', 'id'] as const) if (!Number.isFinite(c[k]) || c[k] < 0 || c[k] > 1e5) return null; }
  if (s.history.some(h => !h || !Number.isFinite(h.day) || !Number.isFinite(h.earned) || !Number.isFinite(h.quota) || typeof h.passed !== 'boolean')) return null;
  if (s.streak !== undefined && (!Number.isSafeInteger(s.streak) || s.streak < 0 || s.streak > 1e6)) return null;
  if (s.call?.revision !== undefined && (!Number.isSafeInteger(s.call.revision) || s.call.revision < 0 || s.call.revision > 1e6)) return null;
  if (s.call?.verifiedFields !== undefined && (!Number.isInteger(s.call.verifiedFields) || s.call.verifiedFields < 0 || s.call.verifiedFields > 3)) return null;
  if (s.inventory && (typeof s.inventory !== 'object' || Array.isArray(s.inventory) || Object.entries(s.inventory).some(([k, v]) => !SHOP.some(i => i.id === k) || !Number.isInteger(v) || v < 0 || v > 99))) return null;
  if (s.deliveries && (!Array.isArray(s.deliveries) || s.deliveries.length > 8 || s.deliveries.some(d => !d || !Number.isSafeInteger(d.id) || d.id < 1 || !SHOP.some(i => i.id === d.item && i.delivery) || !Number.isInteger(d.seconds) || d.seconds < 0 || d.seconds > 5))) return null;
  if (s.orderSerial !== undefined && (!Number.isSafeInteger(s.orderSerial) || s.orderSerial < 0 || s.orderSerial > 1e6)) return null;
  if (s.deliveries && (new Set(s.deliveries.map(d => d.id)).size !== s.deliveries.length || s.deliveries.some(d => d.id > (s.orderSerial || 0)))) return null;
  if (s.ledger && (!Array.isArray(s.ledger) || s.ledger.length > 60 || s.ledger.some(l => !l || !Number.isFinite(l.amount) || !Number.isFinite(l.balance) || l.balance < 0 || typeof l.label !== 'string' || l.label.length > 80 || !Number.isInteger(l.day) || l.day < 1 || l.day > 7))) return null;
  if (s.achievements && (!Array.isArray(s.achievements) || s.achievements.some(a => !['first', 'streak', 'buyer', 'fixer', 'survivor'].includes(a)))) return null;
  if (s.highlights !== undefined && (!Array.isArray(s.highlights) || s.highlights.length > 30 || s.highlights.some(h => !h || !Number.isInteger(h.day) || h.day < 1 || h.day > 7 || !Number.isInteger(h.callId) || !Number.isInteger(h.person) || !CALLERS[h.person] || typeof h.quote !== 'string' || h.quote.length > 200 || typeof h.response !== 'string' || h.response.length > 500 || !Number.isFinite(h.trust) || h.trust < 0 || h.trust > 100 || typeof h.success !== 'boolean'))) return null;
  return { ...structuredClone(s), highlights: structuredClone(s.highlights || []), inventory: { ...s.inventory }, deliveries: structuredClone(s.deliveries || []), ledger: structuredClone(s.ledger || []), orderSerial: s.orderSerial || 0, achievements: [...s.achievements || []], streak: s.streak || 0 };
}
function completeCall(s: GameState) {
  const c = s.call!; const payout = Math.round(SCHEMES[c.scheme].payout * (s.upgrades.includes('bonus') ? 1.2 : 1));
  transact(s, payout, `${SCHEMES[c.scheme].title}：任务 #${c.id}`); s.earned += payout; s.lifetime += payout; s.successes++; c.status = 'complete'; s.wait = 5;
  s.streak = (s.streak || 0) + 1; award(s, 'first'); if (s.streak >= 3) award(s, 'streak'); if (s.upgrades.includes('plant')) s.risk = Math.max(0, s.risk - 2);
  s.highlights?.filter(h => h.callId === c.id).forEach(h => { h.success = true; });
  log(s, `任务完成！+$${payout} 已计入今日业绩。`);
}
function transact(s: GameState, amount: number, label: string) { s.balance += amount; s.ledger = [{ day: s.day, amount, balance: s.balance, label }, ...(s.ledger || [])].slice(0, 60); }
function award(s: GameState, id: string) { s.achievements ||= []; if (!s.achievements.includes(id)) s.achievements.push(id); }
export function applyDialogue(state: GameState, text: string, result: DialogueResult): GameState {
 const current = state.call; if (state.phase !== 'playing' || !current || current.status !== 'active' || state.event || current.id !== result.callId || (current.revision || 0) !== result.turn || current.code !== result.callCode || !['positive', 'neutral', 'negative'].includes(result.attitude) || typeof result.reply !== 'string' || !result.reply.trim() || result.reply.length > 360) return state;
 const s = structuredClone(state), c = s.call!; const delta = result.attitude === 'positive' ? 16 + (s.upgrades.includes('script') ? 5 : 0) : result.attitude === 'negative' ? -18 : 0;
 c.revision = (c.revision || 0) + 1; c.trust = Math.max(0, Math.min(100, c.trust + delta)); if (delta > 0) c.turn++;
 let reply = result.reply; if (c.turn >= 3 && c.trust >= 55) { c.revealed = true; reply += c.scheme === 'credit' ? ` 卡号 ${creditFields(c)[0]}；安全口令 ${creditFields(c)[1]}；到期标记 ${creditFields(c)[2]}。` : ` 任务编号：${c.code}。`; }
 c.transcript.push({ who: 'you', text: text.slice(0, 200) }, { who: 'caller', text: reply }); c.transcript = c.transcript.slice(-20);
 s.highlights = [...(s.highlights || []), { day: s.day, callId: c.id, person: c.person, quote: text.slice(0, 200), response: reply, trust: c.trust, success: false }].slice(-30);
 if (c.trust === 0) { log(s, '对方失去信任并结束了通话。'); endCall(s, true); } return s;
}
export function inferTone(text: string): Tone { if (/哈哈|笑|猫|辞职|宇宙|鹦鹉|冰箱|饼干|haha|joke/i.test(text)) return 'playful'; if (/流程|任务|编号|方案|指令|准备|步骤|code|step/i.test(text)) return 'confident'; return 'warm'; }
