import { describe, expect, it, vi } from 'vitest';
import { parseDialogueResponse } from '../worker/dialogueResponse';
import { generateDialogue } from '../worker/dialogue';
import { gameReducer, newGame, applyDialogue } from '../src/game/engine';
import type { Env } from '../worker/auth';

const payload = (content: unknown, finish_reason = 'stop') => ({ choices: [{ finish_reason, message: { content } }] });
const valid = '{"reply":"我们先核对游戏任务。","attitude":"positive"}';
const env = { AI_API_KEY: 'test-only', AI_MODEL: 'deepseek-flash', AI_BASE_URL: 'https://api.deepseek.com' } as Env;
function active() { let state = gameReducer(newGame(123), { type: 'start' }); for (let i = 0; i < 3; i++) state = gameReducer(state, { type: 'tick' }); return gameReducer(state, { type: 'accept' }); }

describe('Provider reply parsing', () => {
 it.each([valid, '\uFEFF' + valid, '```json\n' + valid + '\n```', [{ type: 'text', text: valid }]])('accepts complete JSON with supported text wrappers', content => {
  expect(parseDialogueResponse(payload(content))).toEqual({ reply: '我们先核对游戏任务。', attitude: 'positive' });
 });
 it.each(['', ' '.repeat(35), null])('identifies empty output', content => {
  expect(() => parseDialogueResponse(payload(content))).toThrow('空内容');
 });
 it('rejects truncated replies even if the fragment happens to parse', () => {
  expect(() => parseDialogueResponse(payload(valid, 'length'))).toThrow('截断');
 });
 it('does not use hidden reasoning as dialogue', () => {
  expect(() => parseDialogueResponse({ choices: [{ message: { content: null, reasoning_content: valid } }] })).toThrow('空内容');
 });
 it.each(['正常对白，没有 JSON', valid + '\n另一段文本', '{"reply":"嗨","attitude":["positive"]}', '{"reply":"嗨","attitude":"invented"}', 'null', '[]', '{"reply":1,"attitude":"positive"}'])('does not fabricate fields for invalid content', content => {
  expect(() => parseDialogueResponse(payload(content))).toThrow();
 });
 it('does not expose upstream error bodies or bypass refusals', () => {
  expect(() => parseDialogueResponse({ error: { message: 'secret-provider-internals' } })).toThrow('AI 服务没有返回有效');
  expect(() => parseDialogueResponse(payload(valid, 'content_filter'))).toThrow('换一种');
 });
});

describe('Bounded DeepSeek recovery', () => {
 it('keeps spoken history as context data rather than model-format examples', async () => {
  const state = active(); state.call!.transcript.push({ who: 'you', text: '先听我说' }, { who: 'caller', text: '纯文本历史回复。' });
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
   const body = JSON.parse(String(init?.body));
   expect(body.messages.some((m: { role: string }) => m.role === 'assistant')).toBe(false);
   expect(body.messages.at(-1).content).toContain('"current_reply":"继续核对"');
   expect(body.messages.at(-1).content).toContain('纯文本历史回复。');
   return Response.json(payload(valid));
  }) as unknown as typeof fetch;
  await generateDialogue(env, state.call!, '继续核对', fetcher);
 });
 it('recovers from the observed whitespace-only reply once, without changing game state twice', async () => {
  const state = active(); let calls = 0;
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
   const body = JSON.parse(String(init?.body));
   expect(body.thinking).toEqual({ type: 'disabled' });
   expect(body.response_format.type).toBe(calls === 0 ? 'json_object' : 'text');
   if (calls++) { expect(body.max_tokens).toBeGreaterThan(768); expect(body.messages[0].content).toContain('上一次输出'); return Response.json(payload('```json\n' + valid + '\n```')); }
   return Response.json(payload(' '.repeat(35)));
  }) as unknown as typeof fetch;
  const result = await generateDialogue(env, state.call!, '继续核对', fetcher);
  expect(calls).toBe(2); expect(state.call!.revision).toBeUndefined();
  const next = applyDialogue(state, '继续核对', result);
  expect(next.call!.revision).toBe(1); expect(next.call!.trust).toBe(56); expect(next.balance).toBe(state.balance);
  expect(applyDialogue(next, '重复结果', result)).toBe(next);
 });
 it('stops after two empty responses with an actionable reason', async () => {
  const fetcher = vi.fn(async () => Response.json(payload(' '.repeat(37)))) as unknown as typeof fetch;
  await expect(generateDialogue(env, active().call!, '你好', fetcher)).rejects.toThrow('空内容。 已自动重试一次');
  expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it('does not retry authentication failures, refusals or missing envelopes', async () => {
  for (const response of [new Response('', { status: 401 }), Response.json(payload('', 'content_filter')), Response.json({ error: { message: 'redacted' } })]) {
   const fetcher = vi.fn(async () => response) as unknown as typeof fetch;
   await expect(generateDialogue(env, active().call!, '你好', fetcher)).rejects.toThrow();
   expect(fetcher).toHaveBeenCalledOnce();
  }
 });
 it('does not grant trust when both attempts have invalid attitude', async () => {
  const state = active(), before = structuredClone(state);
  const fetcher = vi.fn(async () => Response.json(payload('{"reply":"好","attitude":"invented","money":999999}'))) as unknown as typeof fetch;
  await expect(generateDialogue(env, state.call!, '你好', fetcher)).rejects.toThrow('未通过验证');
  expect(state).toEqual(before); expect(fetcher).toHaveBeenCalledTimes(2);
 });
});
