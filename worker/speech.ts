import {normalizeLocale,type Locale} from '../src/i18n/locales';
import type { Env } from './auth';
import { callerProfiles } from '../src/game/dialogueContent';

export const speechDefaults = { minimax: 'speech-2.8-turbo', elevenlabs: 'eleven_flash_v2_5' };
export const minimaxBases = ['https://api.minimax.cn/v1', 'https://api.minimax.io/v1', 'https://api.minimaxi.com/v1'];
export function speechConfiguration(env: Env) {
 const provider = env.TTS_PROVIDER === 'minimax' || env.TTS_PROVIDER === 'elevenlabs' ? env.TTS_PROVIDER : 'browser';
 let voices: string[] = []; try { const parsed: unknown = JSON.parse(env.TTS_VOICES || '[]'); if (Array.isArray(parsed)) voices = parsed.slice(0,8).map(v => typeof v === 'string' ? v : ''); } catch {}
 return { provider, available: provider !== 'browser' && !!env.TTS_API_KEY?.trim(), model: provider === 'browser' ? '' : env.TTS_MODEL || speechDefaults[provider], base: env.TTS_BASE_URL || minimaxBases[0], voices, voice: env.TTS_VOICE || '', sampleRate: 24000 };
}
export function validateSpeechInput(value: unknown) {
 const v = value as Record<string, unknown>;
 if (!v || !['browser','minimax','elevenlabs'].includes(String(v.provider))) throw new Error('语音：请选择服务商。');
 if (v.key !== undefined && (typeof v.key !== 'string' || !/^[!-~]{1,1024}$/.test(v.key))) throw new Error('语音：密钥不可包含空格或换行。');
 const provider = v.provider as 'browser' | 'minimax' | 'elevenlabs';
 const model = String(v.model || (provider === 'browser' ? '' : speechDefaults[provider]));
 if (provider !== 'browser' && !/^[\w.-]{1,100}$/.test(model)) throw new Error('语音：模型 ID 无效。');
 const base = String(v.base || minimaxBases[0]).replace(/\/$/, '');
 if (provider === 'minimax' && !minimaxBases.includes(base)) throw new Error('语音：请选择 MiniMax 官方接入地址。');
 const validVoice = (s: unknown) => typeof s === 'string' && s.length <= 150 && !/[\r\n\x00-\x1f]/.test(s);
 if (!validVoice(v.voice || '') || (v.voices !== undefined && (!Array.isArray(v.voices) || v.voices.length !== 8 || !v.voices.every(validVoice)))) throw new Error('语音：音色 ID 无效。');
 return { provider, key: v.key as string | undefined, model, base, voice: String(v.voice || ''), voices: (v.voices || Array(8).fill('')) as string[] };
}
export async function* minimaxAudio(body: ReadableStream<Uint8Array>): AsyncGenerator<Uint8Array> {
 const reader = body.getReader(), decoder = new TextDecoder(); let pending = '', size = 0;
 const parse = (block: string) => {
  const data = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
  if (!data || data === '[DONE]') return;
  let value: { base_resp?: { status_code?: number }; data?: { audio?: string } };
  try { value = JSON.parse(data); } catch { throw new Error('语音：服务返回了无效音频数据。'); }
  if (value.base_resp?.status_code) throw new Error('语音：合成失败，请检查服务额度、模型和音色。');
  const hex = value.data?.audio;
  if (hex === undefined || hex === '') return;
  if (typeof hex !== 'string' || hex.length % 2 || !/^[0-9a-f]+$/i.test(hex)) throw new Error('语音：音频编码无效。');
  size += hex.length / 2; if (size > 4_000_000) throw new Error('语音：音频过长。');
  return Uint8Array.from(hex.match(/.{2}/g)!, pair => parseInt(pair,16));
 };
 try {
  while (true) {
   const {done,value} = await reader.read();
   pending += done ? decoder.decode() : decoder.decode(value, {stream:true});
   if (pending.length > 8_000_000) throw new Error('语音：数据块过长。');
   pending = pending.replace(/\r\n/g, '\n');
   let boundary: number;
   while ((boundary = pending.indexOf('\n\n')) >= 0) { const block = pending.slice(0,boundary); pending = pending.slice(boundary+2); const audio = parse(block); if (audio) yield audio; }
   if (done) { if (pending.trim()) { const audio = parse(pending); if (audio) yield audio; } break; }
  }
 } finally { await reader.cancel().catch(()=>{}); reader.releaseLock(); }
}
async function* rawAudio(body: ReadableStream<Uint8Array>) {
 const reader = body.getReader(); let size = 0;
 try { while (true) { const {done,value} = await reader.read(); if (done) break; size += value.length; if (size > 4_000_000) throw new Error('语音：音频过长。'); yield value; } } finally { await reader.cancel().catch(()=>{}); reader.releaseLock(); }
}
export async function synthesizeSpeech(env: Env, input: {text: string; person: number; speed?: number; locale?: Locale}, signal?: AbortSignal, fetcher: typeof fetch = fetch) {
 signal?.throwIfAborted();
 const config = speechConfiguration(env);
 if (!config.available) throw new Error('语音：尚未配置云端 TTS，仍可使用系统语音。');
 if (typeof input.text !== 'string' || !input.text.trim() || input.text.length > 1200 || !Number.isInteger(input.person) || !callerProfiles[input.person]) throw new Error('语音：文本或角色无效。');
 const speed = Math.max(.8, Math.min(1.3, Number.isFinite(input.speed) ? input.speed! : 1.1));
 const profile = callerProfiles[input.person];
 const voice = config.voices[input.person] || config.voice || (config.provider === 'minimax' ? profile.voice : 'JBFqnCBsd6RMkjVDRZzb');
 let url: string, headers: Record<string,string>, body: unknown;
 if (config.provider === 'minimax') {
  if (!minimaxBases.includes(config.base)) throw new Error('语音：MiniMax 接入地址无效。');
  url = config.base + '/t2a_v2'; headers = {Authorization:`Bearer ${env.TTS_API_KEY}`, 'Content-Type':'application/json'};
  body = {model:config.model, text:input.text, stream:true, stream_options:{exclude_aggregated_audio:true}, language_boost:({en:'English',zh:'Chinese',pt:'Portuguese',ja:'Japanese',es:'Spanish'}[input.locale || 'zh']), voice_setting:{voice_id:voice, speed:Math.min(1.3,speed*profile.rate), vol:1, pitch:0}, audio_setting:{sample_rate:24000,format:'pcm',channel:1}};
 } else {
  url = 'https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voice) + '/stream?output_format=pcm_24000';
  headers = {'xi-api-key':env.TTS_API_KEY!, 'Content-Type':'application/json'};
  body = {model_id:config.model, text:input.text, language_code:normalizeLocale(input.locale || 'zh'), voice_settings:{stability:.45, similarity_boost:.75, speed:Math.min(1.2,speed*profile.rate)}};
 }
 const upstream=new AbortController();
 let response: Response;
 try { response = await fetcher(url, {method:'POST', headers, body:JSON.stringify(body), signal:AbortSignal.any([upstream.signal, AbortSignal.timeout(20000), ...(signal ? [signal] : [])])}); } catch { throw new Error('语音：服务连接失败或超时。'); }
 if (!response.ok) { await response.body?.cancel(); throw new Error(response.status === 401 || response.status === 403 ? '语音：服务密钥或音色权限无效。' : response.status === 429 ? '语音：服务限流，请稍后重试。' : '语音：服务请求失败，请检查额度、模型和音色。'); }
 if (!response.body) throw new Error('语音：服务返回空内容。');
 const type = response.headers.get('Content-Type') || '';
 if (config.provider === 'minimax' ? !type.includes('text/event-stream') : !/audio|octet-stream/.test(type)) { await response.body.cancel(); throw new Error('语音：服务没有返回音频流，请检查服务配置。'); }
 const iterator = config.provider === 'minimax' ? minimaxAudio(response.body) : rawAudio(response.body);
 // Read the first real audio chunk before returning HTTP 200 so provider errors remain visible.
 let first: IteratorResult<Uint8Array>;
 try { first = await iterator.next(); } catch { throw new Error('语音：合成失败，请检查服务额度、模型和音色。'); }
 if (first.done || !first.value.length) throw new Error('语音：服务未生成音频。');
 let initial: Uint8Array | undefined = first.value;
 const stream = new ReadableStream<Uint8Array>({
  async pull(controller) { try { if (initial) { controller.enqueue(initial); initial = undefined; return; } const chunk = await iterator.next(); if (chunk.done) controller.close(); else controller.enqueue(chunk.value); } catch { controller.error(new Error('语音流中断。')); } },
  async cancel() { upstream.abort(); await iterator.return(undefined); },
 });
 return new Response(stream, {headers:{'Content-Type':'application/octet-stream','X-Audio-Format':'pcm_s16le','X-Audio-Sample-Rate':'24000','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export async function probeSpeech(env: Env, signal?: AbortSignal) {
 const response = await synthesizeSpeech(env, {text:'喂，你好。我有个问题想问一下。',person:0},signal);
 const audio = await response.arrayBuffer(); if (audio.byteLength < 100) throw new Error('语音：服务未生成有效音频。');
}
