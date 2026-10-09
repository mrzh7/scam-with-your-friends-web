
import {afterEach,describe,expect,it,vi} from 'vitest';
import {detectLocale,normalizeLocale,locales,languageTags,setLanguage,getLocale,getPreference,t} from '../src/i18n';
import {createRecognitionSession,type Recognizer} from '../src/game/speechInput';
import {generateDialogue} from '../worker/dialogue';
import {synthesizeSpeech} from '../worker/speech';
import {newGame,gameReducer,type Call} from '../src/game/engine';
import type {Env} from '../worker/auth';
import {readFileSync} from 'node:fs';
afterEach(()=>{setLanguage('auto');vi.unstubAllGlobals();});
describe('Localization contracts',()=>{
 it('detects supported browser languages in order, including regional variants',()=>{expect(detectLocale(['de-DE','pt-PT','en-US'])).toBe('pt');expect(detectLocale(['zh-Hant-HK'])).toBe('zh');expect(detectLocale(['ja-JP'])).toBe('ja');expect(detectLocale(['es-MX'])).toBe('es');expect(detectLocale(['fr'])).toBe('en');expect(normalizeLocale('malicious-prompt')).toBe('en');});
 it('honors explicit choice over the browser and persists the preference',()=>{const storage=new Map();vi.stubGlobal('localStorage',{setItem:(k:string,v:string)=>storage.set(k,v)});vi.stubGlobal('navigator',{languages:['ja-JP']});setLanguage('pt');expect(getLocale()).toBe('pt');expect(storage.get('swyf-language')).toBe('pt');setLanguage('auto');expect(getPreference()).toBe('auto');expect(getLocale()).toBe('ja');});
 it('has all messages and unchanged interpolation tokens in every catalog',()=>{const keys=JSON.parse(readFileSync('src/i18n/messages.json','utf8')) as string[];for(const locale of locales){const catalog=JSON.parse(readFileSync('src/i18n/catalogs/'+locale+'.json','utf8'));for(const key of keys){expect(catalog[key],locale+': '+key).toBeTruthy();expect((catalog[key].match(/\{\d+\}/g)||[]).sort(),locale+': '+key).toEqual((key.match(/\{\d+\}/g)||[]).sort());}}});
 it('translates historical game notices and never changes identifiers',()=>{setLanguage('en');expect(t('任务完成！+$120 已计入今日业绩。')).not.toMatch(/[\u3400-\u9fff]/);expect(t(' 卡号 GAME-CARD-123；安全口令 PIX-456；到期标记 MOON-789。')).toContain('GAME-CARD-123');expect(t('Hello João, reference GAME-TEST-123')).toBe('Hello João, reference GAME-TEST-123');expect(t('打开 {0}', ['Phone'])).toBe('Open Phone');});
 it('preserves the game snapshot through language switches',()=>{let game=gameReducer(newGame(42),{type:'start'});game=gameReducer(game,{type:'tick'});const snapshot=JSON.stringify(game);for(const locale of locales){setLanguage(locale);t(game.notice);expect(JSON.stringify(game)).toBe(snapshot);}});
 it('uses the selected speech-recognition locale',()=>{setLanguage('pt');const recognizer:Recognizer={lang:'',interimResults:false,continuous:false,onstart:null,onend:null,onerror:null,onresult:null,start(){},stop(){},abort(){}};const session=createRecognitionSession(recognizer,{active(){},text(){},error(){},done(){}});expect(recognizer.lang).toBe(languageTags.pt);session.cancel();});
 it('passes locale instructions without changing model JSON keys',async()=>{const call:Call={id:1,person:0,scheme:'credit',status:'active',trust:40,patience:80,turn:0,revealed:false,code:'GAME-CARD-123',transcript:[]};const fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>{const payload=JSON.parse(String(init?.body));expect(payload.messages[0].content).toContain('Brazilian Portuguese');return Response.json({choices:[{message:{content:JSON.stringify({reply:'Olá, estou olhando minha carta.',attitude:'neutral'})}}]});}) as typeof fetch;expect((await generateDialogue({AI_MODEL:'test',AI_API_KEY:'test'} as Env,call,'Olá',fetcher,'pt')).reply).toContain('Olá');});
 it('uses Portuguese in MiniMax requests',async()=>{const fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>{expect(JSON.parse(String(init?.body)).language_boost).toBe('Portuguese');return new Response('data: {"data":{"audio":"0000"}}\n\n',{headers:{'Content-Type':'text/event-stream'}});}) as typeof fetch;const r=await synthesizeSpeech({TTS_PROVIDER:'minimax',TTS_API_KEY:'test'} as Env,{text:'Olá',person:0,locale:'pt'},undefined,fetcher);await r.arrayBuffer();});
});


it('translates every composed opening, including the screenshot, in all supported languages',async()=>{
 const {callOpening,callerGreetings,callerSituations}=await import('../src/game/dialogueContent');
 for(const locale of locales){setLanguage(locale);for(let person=0;person<8;person++)for(const scheme of Object.keys(callerSituations) as (keyof typeof callerSituations)[]){
  const source=callOpening(person,scheme),translated=t(source);
  expect(translated).toBe([t(callerGreetings[person]),t(callerSituations[scheme])].join(locale==='zh'||locale==='ja'?'':' '));
  if(['en','pt','es'].includes(locale))expect(translated).not.toMatch(/[\u3400-\u9fff]/);
  if(locale==='zh')expect(translated).toBe(source);
 }}
 setLanguage('en');expect(t(callOpening(0,'identity'))).toContain('Hello');
});
it('retries Chinese model output when English is selected, without changing the call',async()=>{
 const {callOpening}=await import('../src/game/dialogueContent');const call:Call={id:1,person:0,scheme:'identity',status:'active',trust:40,patience:80,turn:0,revealed:false,code:'GAME-ID-123',transcript:[{who:'caller',text:callOpening(0,'identity')}]};
 let count=0;const before=JSON.stringify(call);const fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>{const payload=JSON.parse(String(init?.body));expect(payload.messages[0].content).not.toContain('15—60个中文字符');expect(payload.messages[0].content).toContain('I have the letter here.');return Response.json({choices:[{message:{content:JSON.stringify({reply:count++?'I have the letter right here.':'我手里有那封通知。',attitude:'neutral'})}}]});}) as typeof fetch;
 const result=await generateDialogue({AI_MODEL:'test',AI_API_KEY:'test'} as Env,call,'Could you describe the letter?',fetcher,'en');expect(result.reply).toBe('I have the letter right here.');expect(fetcher).toHaveBeenCalledTimes(2);expect(JSON.stringify(call)).toBe(before);
});

