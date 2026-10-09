import {languageInstruction,type Locale} from '../src/i18n/locales';
import { callerContext, callerPrompt } from './callerPrompt';
import { validateCallerIdentifiers, validateCallerRole } from './callerRole';
import type { Call, DialogueResult } from '../src/game/engine';
import type { Env } from './auth';
import { DialogueResponseError, parseDialogueResponse } from './dialogueResponse';
import { callOpening } from '../src/game/dialogueContent';

export function aiConfiguration(env: Env) {
 const missing: string[] = [];
 if (!(env.AI_API_KEY || env.OPENROUTER_API_KEY)?.trim()) missing.push('API Key');
 if (!env.AI_MODEL?.trim()) missing.push('模型 ID');
 return { ai: missing.length === 0, model: env.AI_MODEL?.trim() || null, missing };
}
export const aiConfigured = (env: Env) => aiConfiguration(env).ai;
export async function probeAI(env: Env, fetcher: typeof fetch = fetch) {
 const call: Call = { id: 1, person: 3, scheme: 'credit', status: 'active', trust: 40, patience: 120, turn: 0, revealed: false, code: 'GAME-CARD-TEST', transcript: [{ who: 'caller', text: callOpening(3, 'credit') }] };
 await generateDialogue(env, call, '这是连接测试，请用一句中文确认你能理解当前的游戏卡片任务。', fetcher);
 return { ok: true, model: env.AI_MODEL };
}
export async function generateDialogue(env: Env, call: Call, text: string, fetcher: typeof fetch = fetch, locale:Locale = 'zh'): Promise<DialogueResult> {
 if (!aiConfigured(env)) throw new Error('AI 尚未配置。请设置 AI_MODEL 和 OPENROUTER_API_KEY（或 AI_API_KEY）。');
 const base = (env.AI_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
 if (!/^https:\/\//.test(base)) throw new Error('AI 服务地址必须使用 HTTPS。');
 const deepSeek = new URL(base).hostname === 'api.deepseek.com';
 const requestBody = {
  model: env.AI_MODEL, temperature: .8, max_tokens: 768,
  ...(deepSeek ? { thinking: { type: 'disabled' } } : {}),
  ...(new URL(base).hostname === 'openrouter.ai' ? { provider: { require_parameters: true } } : {}),
  // Spoken history has no JSON envelope. Supply explicitly named speakers as
  // context data for every provider, never as examples of the output format.
  messages: [{ role: 'system', content: callerPrompt(call,locale) + "\n" + languageInstruction(locale) }, { role: 'user', content: callerContext(call, text) }],
  response_format: deepSeek ? { type: 'json_object' } : { type: 'json_schema', json_schema: { name: 'caller_response', strict: true, schema: { type: 'object', properties: { reply: { type: 'string' }, attitude: { type: 'string', enum: ['positive', 'neutral', 'negative'] } }, required: ['reply', 'attitude'], additionalProperties: false } } },
 };
 const signal = AbortSignal.timeout(22000);
 let previousKind: DialogueResponseError['kind'] | undefined;
 for (let attempt = 0; attempt < 2; attempt++) {
  const correction = previousKind === 'language'
   ? '\nYour previous reply used the wrong language. Rewrite it in the requested output language, without Chinese words, preserving the caller role and JSON format.'
   : previousKind === 'role'
   ? '\n上一次输出把顾客与接线员身份说反了。找资料的是你这个顾客，接线员正在等你；请继续你自己找资料的动作，不要让接线员找完念给你。以顾客第一人称重新回答，保持 reply / attitude 的 JSON 结构，不输出解释。'
   : previousKind === 'identifier'
   ? '\n上一次输出编造了编号。请重新以顾客身份回应，reply 只说你找到资料或正在查看，不报任何字母、数字或编号内容，不解释后台规则。保留 reply / attitude 的 JSON 结构。'
   : '\n上一次输出为空、被截断或不符合结构。请重新回答同一句玩家对白。只生成一个完整 JSON 对象，reply 控制在80字内，attitude 必须为 positive、neutral 或 negative。立即以 { 开头、以 } 结束，不要输出空白或解释。';
  const messages = requestBody.messages.map((message, index) => attempt && index === 0 ? { ...message, content: message.content + correction + "\n" + languageInstruction(locale) } : message);
  let response: Response;
  try {
   // DeepSeek JSON Output can return whitespace with finish_reason=stop.
   // One unconstrained-format retry still has to pass exactly the same parser.
   const response_format = attempt && deepSeek && previousKind === 'empty' ? { type: 'text' } : requestBody.response_format;
   response = await fetcher(`${base}/chat/completions`, { method: 'POST', signal, headers: { Authorization: `Bearer ${env.AI_API_KEY || env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'Kolkata OS Fictional Game' }, body: JSON.stringify({ ...requestBody, messages, response_format, max_tokens: attempt ? 1200 : requestBody.max_tokens }) });
  } catch { throw new Error(signal.aborted ? 'AI 响应超时，请重试本条应答。' : 'AI 网络连接失败，请重试本条应答。'); }
 if (!response.ok) { if (response.status === 401 || response.status === 403) throw new Error('AI 服务鉴权失败，请检查服务端密钥。'); if (response.status === 402) throw new Error('AI 服务余额不足，请在服务商处检查账户额度。'); if (response.status === 400 || response.status === 404) throw new Error(deepSeek ? 'AI 模型或请求格式不受支持，请核对 DeepSeek 官方模型 ID。' : 'AI 模型或输出格式不受支持，请检查模型 ID，并选择支持 JSON Schema 的模型。'); if (response.status === 429) throw new Error('AI 服务限流，请稍后重试。'); throw new Error(`AI 服务请求失败（${response.status}）。`); }
  try {
   let payload: unknown;
   try { payload = await response.json(); } catch { throw new DialogueResponseError('upstream', signal.aborted ? 'AI 响应超时，请重试本条应答。' : 'AI 服务返回了无法识别的响应。', false); }
   const result = parseDialogueResponse(payload);
   if (['en','pt','es'].includes(locale) && /[\u3400-\u9fff]/.test(result.reply)) throw new DialogueResponseError('language','AI replied in the wrong language. Please retry.');
   validateCallerRole(call, text, result.reply);
   validateCallerIdentifiers(call, result.reply);
   return { callCode: call.code, callId: call.id, turn: call.revision || 0, ...result };
  } catch (e) {
   if (e instanceof DialogueResponseError && e.retryable) {
    if (attempt === 0 && !signal.aborted) { previousKind = e.kind; continue; }
    throw new Error(`${e.message} 已自动重试一次，请重试本条应答。`);
   }
   throw e;
  }
 }
 throw new Error('AI 暂时无法响应，请重试本条应答。');
}
