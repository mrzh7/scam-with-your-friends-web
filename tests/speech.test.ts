import {describe,it,expect,vi,afterEach} from 'vitest';
import {speechConfiguration,validateSpeechInput,synthesizeSpeech,minimaxAudio} from '../worker/speech';
import {mergeSpeechEnv} from '../scripts/localSpeech';
import {parseEnv} from 'node:util';
import type {Env} from '../worker/auth';
import {PcmDecoder,speechLevel} from '../src/game/pcmSpeech';
import {createRecognitionSession,recognitionError,type Recognizer} from '../src/game/speechInput';
import {callerPrompt} from '../worker/callerPrompt';
import {callerProfiles,callOpening} from '../src/game/dialogueContent';
import type {Call} from '../src/game/engine';

function sse(blocks:string[]){return new ReadableStream<Uint8Array>({start(c){for(const b of blocks)c.enqueue(new TextEncoder().encode(b));c.close();}});}
describe('Cloud speech protocol',()=>{
 it('never exposes the provider secret in public configuration',()=>{const c=speechConfiguration({TTS_PROVIDER:'minimax',TTS_API_KEY:'hidden-value'} as Env);expect(c.available).toBe(true);expect(JSON.stringify(c)).not.toContain('hidden-value');});
 it('keeps AI and TURN secrets intact and prevents reusing a different provider key',()=>{const before='AI_API_KEY="ai-secret"\nTURN_API_TOKEN="turn-secret"\nTTS_PROVIDER=minimax\nTTS_API_KEY=old-voice-key\n';const input=validateSpeechInput({provider:'elevenlabs',key:'new-voice-key'});expect(parseEnv(mergeSpeechEnv(before,input))).toMatchObject({AI_API_KEY:'ai-secret',TURN_API_TOKEN:'turn-secret',TTS_API_KEY:'new-voice-key',TTS_PROVIDER:'elevenlabs'});expect(()=>mergeSpeechEnv(before,validateSpeechInput({provider:'elevenlabs'}))).toThrow(/独立/);});
 it.each([{provider:'unknown'},{provider:'minimax',base:'https://evil.example'},{provider:'minimax',key:'key\nINJECT=1'},{provider:'minimax',voices:['too short']},{provider:'minimax',voice:'bad\nvoice'}])('rejects invalid speech configuration %j',input=>expect(()=>validateSpeechInput(input)).toThrow());
 it('decodes SSE split across network boundaries without duplicating the final audio',async()=>{const chunks=[];for await(const c of minimaxAudio(sse(['data: {"data":{"audio":"000001','00"}}\r','\n\r\n', 'data: {"data":{"audio":"ff7f","status":1}}\n\ndata: {"data":{"status":2},"base_resp":{"status_code":0}}\n\n'])))chunks.push(...c);expect(chunks).toEqual([0,0,1,0,255,127]);});
 it.each(['data: {"base_resp":{"status_code":1008}}\n\n','data: {"data":{"audio":"xyz"}}\n\n','data: broken\n\n'])('rejects provider errors and corrupt SSE',async data=>{await expect((async()=>{for await(const _ of minimaxAudio(sse([data]))){} })()).rejects.toThrow(/语音/);});
 it('uses per-character MiniMax PCM streaming and excludes aggregate duplication',async()=>{const fetcher=vi.fn(async(url:unknown,init?:RequestInit)=>{expect(url).toBe('https://api.minimax.cn/v1/t2a_v2');const d=JSON.parse(String(init?.body));expect(d).toMatchObject({model:'speech-2.8-turbo',stream:true,stream_options:{exclude_aggregated_audio:true},audio_setting:{format:'pcm',channel:1,sample_rate:24000}});expect(d.voice_setting.voice_id).toBe(callerProfiles[3].voice);return new Response(sse(['data: {"data":{"audio":"0000ff7f"}}\n\n']),{headers:{'Content-Type':'text/event-stream'}});}) as typeof fetch;const r=await synthesizeSpeech({TTS_PROVIDER:'minimax',TTS_API_KEY:'test'} as Env,{text:'账单上多了一笔。',person:3},undefined,fetcher);expect(r.headers.get('X-Audio-Sample-Rate')).toBe('24000');expect([...new Uint8Array(await r.arrayBuffer())]).toEqual([0,0,255,127]);});
 it('uses ElevenLabs streaming and a configured voice without returning secrets',async()=>{const fetcher=vi.fn(async(url:unknown,init?:RequestInit)=>{expect(String(url)).toContain('/custom-voice/stream?output_format=pcm_24000');expect(JSON.parse(String(init?.body))).toMatchObject({model_id:'eleven_flash_v2_5',language_code:'zh'});return new Response(new Uint8Array([0,0,255,127]),{headers:{'Content-Type':'audio/pcm'}});}) as typeof fetch;const r=await synthesizeSpeech({TTS_PROVIDER:'elevenlabs',TTS_API_KEY:'secret-test',TTS_VOICE:'custom-voice'} as Env,{text:'喂，你好。',person:0},undefined,fetcher);expect(await r.arrayBuffer()).toHaveProperty('byteLength',4);expect(JSON.stringify([...r.headers])).not.toContain('secret-test');});
 it('rejects authentication errors before returning a successful audio response',async()=>{await expect(synthesizeSpeech({TTS_PROVIDER:'elevenlabs',TTS_API_KEY:'test'} as Env,{text:'你好',person:0},undefined,vi.fn(async()=>new Response('provider-private-detail',{status:401})) as typeof fetch)).rejects.toThrow('密钥或音色权限');});
});
describe('PCM playback data',()=>{
 it('handles odd chunk boundaries and signed little-endian samples',()=>{const d=new PcmDecoder();const result=[...d.decode(new Uint8Array([0])),...d.decode(new Uint8Array([0,0,64,0])),...d.decode(new Uint8Array([128,255,127]))];d.finish();expect(result).toEqual([0,.5,-1,32767/32768]);});
 it('rejects half a sample at the end',()=>{const d=new PcmDecoder();d.decode(new Uint8Array([1]));expect(()=>d.finish()).toThrow(/不完整/);});
 it('closes the mouth on real silence and follows amplitude',()=>{expect(speechLevel(new Float32Array(64))).toBe(0);expect(speechLevel(new Float32Array([.1,-.1]))).toBeCloseTo(.5);expect(speechLevel(new Float32Array([1]))).toBe(1);});
});
function recognizer():Recognizer {return {lang:'',interimResults:false,continuous:false,onstart:null,onend:null,onerror:null,onresult:null,start:vi.fn(),stop:vi.fn(),abort:vi.fn()};}
describe('Speech recognition recovery',()=>{
 afterEach(()=>vi.useRealTimers());
 it.each(['not-allowed','service-not-allowed','audio-capture','network','no-speech'])('releases listening state and returns to typing after %s',code=>{const r=recognizer(),c={active:vi.fn(),text:vi.fn(),error:vi.fn(),done:vi.fn()};createRecognitionSession(r,c);r.onerror!({error:code});expect(c.active).toHaveBeenLastCalledWith(false);expect(c.done).toHaveBeenCalledOnce();expect(c.error).toHaveBeenCalledWith(recognitionError(code));expect(c.error.mock.calls[0][0]).toContain('文字输入仍可使用');expect(c.text).not.toHaveBeenCalled();expect(r.abort).toHaveBeenCalled();});
 it('ignores late recognition results after a call is cancelled',()=>{const r=recognizer(),c={active:vi.fn(),text:vi.fn(),error:vi.fn(),done:vi.fn()};const session=createRecognitionSession(r,c),late=r.onresult!;session.cancel();late({results:[{0:{transcript:'must not send'}}]});expect(c.text).not.toHaveBeenCalled();});
 it('keeps final text separate from interim recognition',()=>{const r=recognizer(),c={active:vi.fn(),text:vi.fn(),error:vi.fn(),done:vi.fn()};const session=createRecognitionSession(r,c);r.onresult!({results:[{isFinal:false,0:{transcript:'interim'}}]});expect(c.text).not.toHaveBeenCalled();r.onresult!({results:[{isFinal:true,0:{transcript:'这笔订单是什么？'}}]});expect(c.text).toHaveBeenCalledWith('这笔订单是什么？');session.cancel();});
 it('shows interim feedback without submitting it and reports an empty session',()=>{const r=recognizer(),c={active:vi.fn(),text:vi.fn(),interim:vi.fn(),error:vi.fn(),done:vi.fn()};createRecognitionSession(r,c);expect(r.interimResults).toBe(true);r.onresult!({results:[{isFinal:false,0:{transcript:'hello'}}]});expect(c.interim).toHaveBeenCalledWith('hello');expect(c.text).not.toHaveBeenCalled();r.onend!();expect(c.error).toHaveBeenCalledWith(recognitionError('no-speech'));expect(c.done).toHaveBeenCalledOnce();});
 it('times out a recognizer that never finishes',()=>{vi.useFakeTimers();const r=recognizer(),c={active:vi.fn(),text:vi.fn(),error:vi.fn(),done:vi.fn()};createRecognitionSession(r,c);vi.advanceTimersByTime(20001);expect(c.done).toHaveBeenCalledOnce();expect(c.active).toHaveBeenLastCalledWith(false);expect(r.abort).toHaveBeenCalled();});
});
describe('Caller role boundaries',()=>{
 it('writes eight distinct lives and voices, and keeps game mechanics out of openings',()=>{expect(new Set(callerProfiles.map(p=>p.life)).size).toBe(8);expect(new Set(callerProfiles.map(p=>p.voice)).size).toBe(8);for(let person=0;person<8;person++){expect(callOpening(person,'credit')).not.toMatch(/游戏|验证标记|信任|任务/);expect(callerPrompt({person,scheme:'credit',trust:40,revision:0,revealed:false} as Call)).toContain('你是遇到问题、打电话求助的普通顾客');}});
});

describe('Speech cancellation and cost control',()=>{
 it.each(['minimax','elevenlabs'])('does not contact %s for an already cancelled synthesis',async provider=>{
  const controller=new AbortController();controller.abort();const fetcher=vi.fn();
  await expect(synthesizeSpeech({TTS_PROVIDER:provider,TTS_API_KEY:'test'} as Env,{text:'你好',person:0},controller.signal,fetcher)).rejects.toMatchObject({name:'AbortError'});
  expect(fetcher).not.toHaveBeenCalled();
 });
 it('aborts the provider fetch when the client cancels its audio response',async()=>{
  let upstream:AbortSignal|undefined;
  const fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>{
   upstream=init?.signal as AbortSignal;
   return new Response(new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array([0,0,0,0]));upstream!.addEventListener('abort',()=>c.error(new DOMException('Stopped','AbortError')),{once:true});}}),{headers:{'Content-Type':'audio/pcm'}});
  }) as typeof fetch;
  const response=await synthesizeSpeech({TTS_PROVIDER:'elevenlabs',TTS_API_KEY:'test'} as Env,{text:'你好',person:0},undefined,fetcher);
  const reader=response.body!.getReader();expect((await reader.read()).value).toHaveLength(4);
  await reader.cancel();expect(upstream?.aborted).toBe(true);
 });
});
