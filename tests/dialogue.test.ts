import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, sep } from 'node:path';
import { parseEnv } from 'node:util';
import type { ViteDevServer } from 'vite';
import { localAISetup, mergeAIEnv, validateAIInput, isLocalAIRequest } from '../scripts/localAI';
import { aiConfiguration, generateDialogue, probeAI } from '../worker/dialogue';
import { newGame, gameReducer, type Call } from '../src/game/engine';
import { callOpening } from '../src/game/dialogueContent';
import type { Env } from '../worker/auth';

describe('Task-aware conversations', () => {
 it('gives Franklin a card opening for card verification and corn only for the corn task', () => {
  let g = gameReducer(newGame(42), { type: 'start' }); for (let i = 0; i < 3; i++) g = gameReducer(g, { type: 'tick' });
  g.call = { ...g.call!, person: 3, scheme: 'credit' };
  g = gameReducer(g, { type: 'accept' }); expect(g.call!.transcript[0].text).toContain('账单'); expect(g.call!.transcript[0].text).not.toContain('玉米');
  expect(callOpening(3, 'crypto')).toContain('玉米');
 });
 it('passes the current task, repeated request and prior answers to the model', async () => {
  const call: Call = { id: 7, revision: 2, person: 3, scheme: 'credit', status: 'active', trust: 40, patience: 80, turn: 0, code: 'GAME-CARD-123', revealed: false, transcript: [{ who: 'caller', text: callOpening(3, 'credit') }, { who: 'you', text: '给我卡号' }, { who: 'caller', text: '先告诉我这项验证的用途。' }] };
  const fetcher = vi.fn(async (_url: unknown, request?: RequestInit) => {
   const data = JSON.parse(String(request?.body));
   expect(data.messages[0].content).toContain('三重卡片验证');
   expect(data.messages[0].content).not.toContain('三百吨玉米');
   const context = JSON.parse(data.messages.at(-1).content.split('\n').slice(1).join('\n'));
   expect(context.history.slice(-2)).toEqual([{ speaker: 'you', text: '给我卡号' }, { speaker: 'caller', text: '先告诉我这项验证的用途。' }]);
   expect(context).toMatchObject({ current_speaker: 'you', current_reply: '你需要给我你的卡号', output_speaker: 'caller' });
   expect(data.provider.require_parameters).toBe(true);
   return Response.json({ choices: [{ message: { content: '{"reply":"你还没解释这项游戏验证的用途，我想先确认这一点。","attitude":"neutral"}' } }] });
  }) as unknown as typeof fetch;
  const result = await generateDialogue({ AI_API_KEY: 'test-secret', AI_MODEL: 'test/model' } as Env, call, '你需要给我你的卡号', fetcher);
  expect(result.turn).toBe(2); expect(result.attitude).toBe('neutral');
 });
 it('reports missing configuration without exposing a secret', () => {
  expect(aiConfiguration({ AI_MODEL: '  ' } as Env).missing).toEqual(['API Key', '模型 ID']);
  const config = aiConfiguration({ AI_API_KEY: 'secret-value', AI_MODEL: 'test/model' } as Env);
  expect(config.ai).toBe(true); expect(JSON.stringify(config)).not.toContain('secret-value');
 });
});

describe('Local AI configuration boundaries', () => {
 it.each(['https://api.deepseek.com', 'https://api.deepseek.com/v1/'])('supports DeepSeek JSON Output at %s', async base => {
  const fetcher = vi.fn(async (url: unknown, request?: RequestInit) => {
   expect(url).toBe(base.replace(/\/$/, '') + '/chat/completions');
   const body = JSON.parse(String(request?.body));
   expect(body.response_format).toEqual({ type: 'json_object' });
   expect(body.thinking).toEqual({ type: 'disabled' });
   expect(body.provider).toBeUndefined();
   expect(body.messages[0].content).toContain('只返回 JSON 对象');
   expect(body.messages[0].content).toMatch(/"attitude":"(positive|neutral|negative)"/);
   return Response.json({ choices: [{ message: { content: '{"reply":"连接测试成功。","attitude":"neutral"}' } }] });
  }) as unknown as typeof fetch;
  await expect(probeAI({ AI_API_KEY: 'test-only', AI_MODEL: 'deepseek-flash', AI_BASE_URL: base } as Env, fetcher)).resolves.toEqual({ ok: true, model: 'deepseek-flash' });
 });
 it('validates DeepSeek JSON objects before enabling the connection', async () => {
  const fetcher = (async () => Response.json({ choices: [{ message: { content: '{"reply":"连接测试","attitude":"invented"}' } }] })) as typeof fetch;
  await expect(probeAI({ AI_API_KEY: 'test-only', AI_MODEL: 'deepseek-flash', AI_BASE_URL: 'https://api.deepseek.com' } as Env, fetcher)).rejects.toThrow('未通过验证');
 });
 it('requires a loopback connection and an exact same-origin mutation', () => {
  expect(isLocalAIRequest('localhost:5173', 'http://localhost:5173', '127.0.0.1', true)).toBe(true);
  expect(isLocalAIRequest('localhost:5173', undefined, '127.0.0.1', true)).toBe(false);
  expect(isLocalAIRequest('localhost:5173', 'https://evil.example', '127.0.0.1', true)).toBe(false);
  expect(isLocalAIRequest('evil.example', 'http://evil.example', '127.0.0.1', true)).toBe(false);
  expect(isLocalAIRequest('localhost:5173', 'http://localhost:5173', '192.168.1.5', true)).toBe(false);
 });
 it('rejects invalid models, injected newlines and non-HTTPS endpoints', () => {
  for (const input of [{ key: 'x\nINJECT=y', model: 'm' }, { key: 'x', model: 'm\n' + 'BAD=true' }, { key: 'x', model: 'm', base: 'http://example.test' }]) expect(() => validateAIInput(input)).toThrow();
 });
 it('preserves unrelated TURN settings and replaces old AI keys without duplicates', () => {
  const source = '# keep me\nTURN_API_TOKEN="turn-secret"\nOPENROUTER_API_KEY="old-key"\nAI_MODEL=old\n';
  const output = mergeAIEnv(source, { key: 'new-key', model: 'new/model', base: 'https://example.test/v1' });
  expect(parseEnv(output)).toMatchObject({ TURN_API_TOKEN: 'turn-secret', AI_API_KEY: 'new-key', AI_MODEL: 'new/model' });
  expect(output).toContain('# keep me'); expect(output).not.toContain('old-key');
 });
});

describe('Local setup HTTP lifecycle', () => {
 let root: string, server: Server, origin: string;
 const restart = vi.fn(async () => {});
 const probe = vi.fn(async (env: Env) => { if (env.AI_API_KEY === 'rejected-test-key') throw new Error('AI 服务鉴权失败，请检查服务端密钥。'); return { ok: true, model: env.AI_MODEL }; });
 beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'swyf-ai-test-'));
  const plugin = localAISetup(probe);
  const hook = plugin.configureServer as (server: ViteDevServer) => void;
  hook({ config: { root, logger: { error: vi.fn() } }, restart, middlewares: { use(handler: Parameters<typeof createServer>[1]) { server = createServer(handler); } } } as unknown as ViteDevServer);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + (server.address() as { port: number }).port;
 });
 afterAll(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
  if (!resolve(root).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unexpected test directory');
  await rm(root, { recursive: true, force: true });
 });
 it('keeps missing setup visible; rejects a cross-site write before touching credentials', async () => {
  const initial = await (await fetch(origin + '/__local/ai')).json() as { local: boolean; hasKey: boolean }; expect(initial.local).toBe(true); expect(initial.hasKey).toBe(false);
  const response = await fetch(origin + '/__local/ai', { method: 'POST', headers: { Origin: 'https://elsewhere.example', 'X-Local-AI-Setup': '1' }, body: '{}' });
  expect(response.status).toBe(403); expect(probe).not.toHaveBeenCalled();
 });
 it('keeps existing configuration intact when provider authentication fails', async () => {
  const before = 'TURN_KEY_ID=keep-turn\n'; await writeFile(join(root, '.dev.vars'), before);
  const response = await fetch(origin + '/__local/ai', { method: 'POST', headers: { Origin: origin, 'X-Local-AI-Setup': '1' }, body: JSON.stringify({ key: 'rejected-test-key', model: 'test/model' }) });
  expect(response.status).toBe(400); expect((await response.json() as { error: string }).error).toContain('鉴权失败');
  expect(await readFile(join(root, '.dev.vars'), 'utf8')).toBe(before); expect(restart).not.toHaveBeenCalled();
 });
 it('tests before persisting, reloads the server and never returns a saved key', async () => {
  const response = await fetch(origin + '/__local/ai', { method: 'POST', headers: { Origin: origin, 'X-Local-AI-Setup': '1' }, body: JSON.stringify({ key: 'accepted-test-key', model: 'test/model' }) });
  expect(response.status).toBe(200); expect(await response.json()).toEqual({ saved: true, model: 'test/model' });
  expect(parseEnv(await readFile(join(root, '.dev.vars'), 'utf8'))).toMatchObject({ TURN_KEY_ID: 'keep-turn', AI_API_KEY: 'accepted-test-key' });
  const status = await (await fetch(origin + '/__local/ai')).text(); expect(status).not.toContain('accepted-test-key'); expect(JSON.parse(status).hasKey).toBe(true);
  await new Promise(resolve => setTimeout(resolve, 600)); expect(restart).toHaveBeenCalledOnce();
 });
});
