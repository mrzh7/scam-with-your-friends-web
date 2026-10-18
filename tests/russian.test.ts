import {afterEach,expect,it,vi} from 'vitest';
import {detectLocale,normalizeLocale,validPreference,setLanguage,getLocale,t,languageTags} from '../src/i18n';
import {createRecognitionSession,type Recognizer} from '../src/game/speechInput';
import {generateDialogue} from '../worker/dialogue';
import {synthesizeSpeech} from '../worker/speech';
import type {Call} from '../src/game/engine';
import type {Env} from '../worker/auth';
afterEach(()=>{setLanguage('auto');vi.unstubAllGlobals();});
it('detects Russian regional tags and persists an explicit Russian preference',()=>{
 expect(detectLocale(['de-DE','ru-RU','en-US'])).toBe('ru');expect(normalizeLocale('ru_BY')).toBe('ru');expect(validPreference('ru')).toBe('ru');
 const storage=new Map();vi.stubGlobal('localStorage',{setItem:(k:string,v:string)=>storage.set(k,v)});vi.stubGlobal('navigator',{languages:['en-US']});setLanguage('ru');expect(getLocale()).toBe('ru');expect(storage.get('swyf-language')).toBe('ru');
 expect(t('打开 {0}',['GAME-TEST-123'])).toContain('GAME-TEST-123');expect(t('网站管理')).toMatch(/[А-Яа-яЁё]/);
});
it('uses ru-RU for browser speech recognition',()=>{
 setLanguage('ru');const recognizer:Recognizer={lang:'',interimResults:false,continuous:false,onstart:null,onend:null,onerror:null,onresult:null,start(){},stop(){},abort(){}};
 const session=createRecognitionSession(recognizer,{active(){},text(){},error(){},done(){}});expect(recognizer.lang).toBe(languageTags.ru);expect(recognizer.lang).toBe('ru-RU');session.cancel();
});
it('requests Russian AI replies and preserves the game snapshot',async()=>{
 const call:Call={id:1,person:0,scheme:'credit',status:'active',trust:40,patience:80,turn:0,revealed:false,code:'GAME-CARD-123',transcript:[]};const before=JSON.stringify(call);
 const fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>{const payload=JSON.parse(String(init?.body));expect(payload.messages[0].content).toContain('All spoken replies must be in Russian');expect(payload.messages[0].content).toContain('Письмо у меня.');return Response.json({choices:[{message:{content:JSON.stringify({reply:'Письмо у меня, сейчас посмотрю.',attitude:'neutral'})}}]});}) as typeof fetch;
 expect((await generateDialogue({AI_MODEL:'test',AI_API_KEY:'test'} as Env,call,'Посмотрите письмо.',fetcher,'ru')).reply).toContain('Письмо');expect(JSON.stringify(call)).toBe(before);
});
it('uses Russian in MiniMax requests',async()=>{
 const fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>{expect(JSON.parse(String(init?.body)).language_boost).toBe('Russian');return new Response('data: {"data":{"audio":"0000"}}\n\n',{headers:{'Content-Type':'text/event-stream'}});}) as typeof fetch;
 const response=await synthesizeSpeech({TTS_PROVIDER:'minimax',TTS_API_KEY:'test'} as Env,{text:'Здравствуйте',person:0,locale:'ru'},undefined,fetcher);await response.arrayBuffer();
});
