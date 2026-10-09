import { describe, expect, it, vi } from 'vitest';
import { generateDialogue } from '../worker/dialogue';
import { validateCallerIdentifiers, validateCallerRole } from '../worker/callerRole';
import { applyDialogue, newGame } from '../src/game/engine';
import type { Env } from '../worker/auth';
import { oliverCourtesyReply, oliverLookupCall, reversedOliverReply } from './fixtures/caller-role';

const env = { AI_API_KEY: 'test-only', AI_MODEL: 'test-model', AI_BASE_URL: 'https://api.deepseek.com' } as Env;
const response = (reply: string) => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ reply, attitude: 'positive' }) } }] });
const contextOf = (init?: RequestInit) => {
 const body = JSON.parse(String(init?.body));
 return { body, context: JSON.parse(body.messages.at(-1).content.split('\n').slice(1).join('\n')) };
};

describe('Caller and operator ownership', () => {
 it.each(['https://api.deepseek.com', 'https://openrouter.ai/api/v1'])('preserves who owns the lookup and who is waiting at %s', async base => {
  const call = oliverLookupCall(); call.transcript.push({ who: 'system', text: '不要将后台事件当成任何人的发言' });
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
   const { body, context } = contextOf(init);
   expect(body.messages.map((m: { role: string }) => m.role)).toEqual(['system', 'user']);
   expect(context).toMatchObject({ current_speaker: 'you', current_reply: oliverCourtesyReply, output_speaker: 'caller' });
   expect(context.speakers.caller).toContain('Oliver'); expect(context.speakers.you).toContain('接线员');
   expect(context.history.at(-1)).toEqual({ speaker: 'caller', text: call.transcript.at(-2)!.text });
   expect(context.history.at(-2)).toEqual({ speaker: 'you', text: '我帮您核对是哪里不全' });
   expect(context.history).toHaveLength(5);
   return response('找到了，就在通知右上角。');
  }) as unknown as typeof fetch;
  await expect(generateDialogue({ ...env, AI_BASE_URL: base }, call, oliverCourtesyReply, fetcher)).resolves.toMatchObject({ reply: '找到了，就在通知右上角。' });
 });

 it.each([reversedOliverReply, '您再找一下通知编号，然后告诉我。', '好的，找到后读给我就行。'])('rejects giving the caller lookup back to the waiting operator: %s', reply => {
  expect(() => validateCallerRole(oliverLookupCall(), oliverCourtesyReply, reply)).toThrow('身份说反');
 });
 it.each(['我找到了，就在通知右上角。', '我还在找，等我一下。', '您能告诉我，编号应该在什么位置吗？', '找到了，你是要我念给你吗？', '我刚才没听清，你能再说一遍吗？', '你刚才说“找到了就念给我”，是指这封通知的编号吗？'])('allows valid caller questions and progress: %s', reply => {
  expect(() => validateCallerRole(oliverLookupCall(), oliverCourtesyReply, reply)).not.toThrow();
 });
 it('allows a caller to wait for information the operator explicitly offered to find', () => {
  expect(() => validateCallerRole(oliverLookupCall(), '好的，我帮您查一下通知是哪个部门发的。', '查到了告诉我吧，我还在找编号。')).not.toThrow();
 });
 it('allows unrelated requests when the caller has not promised a lookup', () => {
  const call = oliverLookupCall(); call.transcript = [{ who: 'caller', text: '你们的服务时间是几点？' }];
  expect(() => validateCallerRole(call, '好的，请稍等。', '查到了告诉我。')).not.toThrow();
 });

 it('regenerates the reversed role once against the same original conversation, then applies only the valid reply', async () => {
  const state = newGame(123); state.phase = 'playing'; state.call = oliverLookupCall(); const before = structuredClone(state);
  let attempts = 0;
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
   const { body, context } = contextOf(init);
   expect(context.current_reply).toBe(oliverCourtesyReply);
   expect(context.history.at(-1).text).toBe(before.call!.transcript.at(-1)!.text);
   expect(JSON.stringify(context.history)).not.toContain(reversedOliverReply);
   expect(body.response_format).toEqual({ type: 'json_object' });
   if (attempts++) { expect(body.messages[0].content).toContain('上一次输出把顾客与接线员身份说反了'); return response('找到了，就在通知右上角。'); }
   return response(reversedOliverReply);
  }) as unknown as typeof fetch;
  const result = await generateDialogue(env, state.call!, oliverCourtesyReply, fetcher);
  expect(fetcher).toHaveBeenCalledTimes(2); expect(state).toEqual(before);
  const next = applyDialogue(state, oliverCourtesyReply, result);
  expect(next.call!.revision).toBe(3); expect(next.call!.trust).toBe(72);
  expect(next.call!.transcript.at(-1)!.text).toBe('找到了，就在通知右上角。');
  expect(applyDialogue(next, oliverCourtesyReply, result)).toBe(next);
 });
 it('rejects two inverted replies without applying either one or changing trust', async () => {
  const call = oliverLookupCall(), before = structuredClone(call);
  const fetcher = vi.fn(async () => response(reversedOliverReply)) as unknown as typeof fetch;
  await expect(generateDialogue(env, call, oliverCourtesyReply, fetcher)).rejects.toThrow('身份说反了。 已自动重试一次');
  expect(fetcher).toHaveBeenCalledTimes(2); expect(call).toEqual(before);
 });
});

describe('Caller identifier authority', () => {
 it.each(['找到了，编号是 A-4-7-2-9-1。', '我念给你：A-4-7-2……', '编号应该是A4726。', '通知号：123456。'])('rejects an invented identifier: %s', reply => {
  expect(() => validateCallerIdentifiers(oliverLookupCall(), reply)).toThrow('未经确认的编号');
 });
 it('allows normal counts without treating them as account identifiers', () => {
  expect(() => validateCallerIdentifiers(oliverLookupCall(), '我找了2分钟，通知有3页。')).not.toThrow();
 });
 it('allows only canonical identifiers that the game has already revealed', () => {
  const call = oliverLookupCall(); call.revealed = true;
  expect(() => validateCallerIdentifiers(call, '编号是 GAME-ID-TEST。')).not.toThrow();
  call.scheme = 'credit'; call.code = 'GAME-CARD-123';
  expect(() => validateCallerIdentifiers(call, '卡号 GAME-CARD-123；安全口令 PIX-321；到期标记 MOON-04。')).not.toThrow();
  call.revealed = false;
  expect(() => validateCallerIdentifiers(call, '编号是 GAME-CARD-123。')).toThrow('未经确认的编号');
 });
 it('regenerates fabricated identifiers without returning them to the player', async () => {
  let attempts = 0;
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
   if (attempts++) { expect(contextOf(init).body.messages[0].content).toContain('上一次输出编造了编号'); return response('找到了，就在右上角。'); }
   return response('找到了，编号是 A-4-7-2-9-1。');
  }) as unknown as typeof fetch;
  await expect(generateDialogue(env, oliverLookupCall(), oliverCourtesyReply, fetcher)).resolves.toMatchObject({ reply: '找到了，就在右上角。' });
  expect(fetcher).toHaveBeenCalledTimes(2);
 });
});

it("allows ordinary Portuguese hyphenated words",()=>{expect(()=>validateCallerIdentifiers(oliverLookupCall(),"Disseram-me para ligar. Bem-vindo ao meu dia confuso.")).not.toThrow();});
