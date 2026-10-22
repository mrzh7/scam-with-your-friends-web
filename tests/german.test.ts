import {afterEach,expect,it,vi} from 'vitest';
import {detectLocale,normalizeLocale,validPreference,setLanguage,getLocale,t,languageTags} from '../src/i18n';
import {createRecognitionSession,type Recognizer} from '../src/game/speechInput';
import {generateDialogue} from '../worker/dialogue';
import {synthesizeSpeech} from '../worker/speech';
import type {Call} from '../src/game/engine';
import type {Env} from '../worker/auth';
afterEach(()=>{setLanguage('auto');vi.unstubAllGlobals();});
it('detects German regional tags and persists an explicit German preference',()=>{
 expect(detectLocale(['de-DE','pt-PT','en-US'])).toBe('de');expect(normalizeLocale('de_AT')).toBe('de');expect(validPreference('de')).toBe('de');
 const storage=new Map();vi.stubGlobal('localStorage',{setItem:(k:string,v:string)=>storage.set(k,v)});vi.stubGlobal('navigator',{languages:['en-US']});setLanguage('de');expect(getLocale()).toBe('de');expect(storage.get('swyf-language')).toBe('de');
 expect(t('打开 {0}',['GAME-TEST-123'])).toContain('GAME-TEST-123');expect(t('网站管理')).toMatch(/[A-Za-zÄÖÜäöüß]/);expect(t('网站管理')).not.toMatch(/[\u3400-\u9fff]/);
});
it('uses de-DE for browser speech recognition',()=>{
 setLanguage('de');const recognizer:Recognizer={lang:'',interimResults:false,continuous:false,onstart:null,onend:null,onerror:null,onresult:null,start(){},stop(){},abort(){}};
 const session=createRecognitionSession(recognizer,{active(){},text(){},error(){},done(){}});expect(recognizer.lang).toBe(languageTags.de);expect(recognizer.lang).toBe('de-DE');session.cancel();
});
it('requests German AI replies and preserves the game snapshot',async()=>{
 const call:Call={id:1,person:0,scheme:'credit',status:'active',trust:40,patience:80,turn:0,revealed:false,code:'GAME-CARD-123',transcript:[]};const before=JSON.stringify(call);
 const fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>{const payload=JSON.parse(String(init?.body));expect(payload.messages[0].content).toContain('All spoken replies must be in German');expect(payload.messages[0].content).toContain('Ich habe den Brief hier.');return Response.json({choices:[{message:{content:JSON.stringify({reply:'Ich habe den Brief hier, ich schaue kurz.',attitude:'neutral'})}}]});}) as typeof fetch;
 expect((await generateDialogue({AI_MODEL:'test',AI_API_KEY:'test'} as Env,call,'Schauen Sie den Brief an.',fetcher,'de')).reply).toContain('Brief');expect(JSON.stringify(call)).toBe(before);
});
it('uses German in MiniMax requests',async()=>{
 const fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>{expect(JSON.parse(String(init?.body)).language_boost).toBe('German');return new Response('data: {"data":{"audio":"0000"}}\n\n',{headers:{'Content-Type':'text/event-stream'}});}) as typeof fetch;
 const response=await synthesizeSpeech({TTS_PROVIDER:'minimax',TTS_API_KEY:'test'} as Env,{text:'Hallo',person:0,locale:'de'},undefined,fetcher);await response.arrayBuffer();
});
