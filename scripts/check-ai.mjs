// Explicit, bounded live check. Reads the existing local key without printing it.
// Never part of npm test: this makes real model requests when run by the developer.
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { build } from 'esbuild';
const env = parseEnv(await readFile('.dev.vars', 'utf8'));
const bundle = await build({ entryPoints: ['worker/dialogue.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { generateDialogue } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const call = { id: 987, revision: 0, person: 3, scheme: 'credit', status: 'active', trust: 40, patience: 120, turn: 0, revealed: false, code: 'GAME-CARD-TEST', transcript: [{ who: 'caller', text: '账单上有一笔我没买过的东西，钱却扣了。你们能帮我查查吗？' }] };
const tracedFetch = async (url, init) => {
 const response = await fetch(url, init);
 let payload; try { payload = await response.clone().json(); } catch {}
 const choice = payload?.choices?.[0], content = choice?.message?.content;
 let json = false; if (typeof content === 'string') { try { JSON.parse(content); json = true; } catch {} }
 console.log(JSON.stringify({ status: response.status, finish: ['stop','length','content_filter','insufficient_system_resource'].includes(choice?.finish_reason) ? choice.finish_reason : 'other', contentType: typeof content, characters: typeof content === 'string' ? content.length : null, empty: typeof content === 'string' ? !content.trim() : content == null, fenced: typeof content === 'string' && content.trim().startsWith('```'), validJSON: json, reasoningCharacters: typeof choice?.message?.reasoning_content === 'string' ? choice.message.reasoning_content.length : 0, completionTokens: typeof payload?.usage?.completion_tokens === 'number' ? payload.usage.completion_tokens : null }));
 return response;
};
const lines = ['你好，我先了解一下情况。账单和收据都在你手边吗？', '好的，先别着急操作。请看看这笔订单是不是写在你刚才说的那张账单上？', '我明白了。我们就按这张账单上的记录逐项确认，不用急着找其他资料。'];
const count = Math.max(1, Math.min(3, Number(process.argv[2]) || 1));
let cases = lines.map(text => ({ name: 'credit-conversation', call, text }));
if (process.argv.includes('--role-check')) {
 const fixtures = await build({ entryPoints: ['tests/fixtures/caller-role.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
 const { callerRoleCases } = await import('data:text/javascript;base64,' + Buffer.from(fixtures.outputFiles[0].text).toString('base64'));
 cases = callerRoleCases();
}
for (const [index, { name, call, text }] of cases.slice(0, count).entries()) {
 try {
  const result = await generateDialogue(env, call, text, tracedFetch);
  console.log(JSON.stringify({ turn: index + 1, scenario: name, ok: true, attitude: result.attitude, replyCharacters: result.reply.length, ...(process.argv.includes('--show-reply') ? {reply:result.reply} : {}) }));
  call.transcript.push({ who: 'you', text }, { who: 'caller', text: result.reply }); call.revision++;
  if (result.attitude === 'positive') { call.turn++; call.trust = Math.min(100, call.trust + 16); }
 } catch (e) {
  console.log(JSON.stringify({ turn: index + 1, ok: false, error: e instanceof Error && e.message.startsWith('AI ') ? e.message : '网络请求失败或超时' })); process.exitCode = 1; break;
 }
}
