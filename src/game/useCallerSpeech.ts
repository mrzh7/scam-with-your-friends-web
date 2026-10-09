import {getLocale,languageTags,t} from '../i18n';
import {useLocale} from '../i18n/LanguageSelector';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Call } from './engine';
import { callerProfiles } from './dialogueContent';
import { playPcmStream, unlockSpeechAudio } from './pcmSpeech';
export interface SpeechConfig { provider: 'browser'|'minimax'|'elevenlabs'; available: boolean; model: string; voice: string; voices: string[]; base: string }
export function speechSpeed() { try { const n=Number(localStorage.getItem('swyf-speech-speed')); return n >= .8 && n <= 1.3 ? n : 1.12; } catch { return 1.12; } }
export function chooseSystemVoice(voices: SpeechSynthesisVoice[], person: number, locale=getLocale()) {
 const chinese=voices.filter(v=>v.lang.toLowerCase().startsWith(locale) || locale==='zh' && /^cmn/i.test(v.lang));
 const female=[0,2,4,5].includes(person);
 const score=(v:SpeechSynthesisVoice)=> (/(Natural|Neural|Online)/i.test(v.name)?10:0)+(/CN|Hans/i.test(v.lang)?3:0)+Number(female ? /Xiao|Huihui|Yaoyao|female/i.test(v.name) : /Yun|Kangkang|(?:^|[^a-z])male\b/i.test(v.name)) * 4;
 return chinese.sort((a,b)=>score(b)-score(a))[0];
}
export function useCallerSpeech(call: Call|null, sound: boolean, paused: boolean) {
 const locale=useLocale();
 const [config,setConfig]=useState<SpeechConfig|null>(null), [level,setLevel]=useState(0), [error,setError]=useState(''), [loading,setLoading]=useState(false), [repeat,setRepeat]=useState(0), [speed,setSpeed]=useState(speechSpeed);
 const abort=useRef<AbortController|null>(null), lastPlayed=useRef('');
 const stop=useCallback(()=>{abort.current?.abort(); if ('speechSynthesis' in window) speechSynthesis.cancel();setLevel(0);setLoading(false);},[]);
 useEffect(()=>{
  let active=true;
  const check=()=>{ setSpeed(speechSpeed()); void fetch('/api/config',{signal:AbortSignal.timeout(5000)}).then(r=>r.json() as Promise<{speech?:SpeechConfig}>).then(d=>{if(active)setConfig(d.speech || {provider:'browser',available:false,model:'',voices:[],voice:'',base:''});}).catch(()=>{if(active)setConfig({provider:'browser',available:false,model:'',voices:[],voice:'',base:''});});};
  check(); window.addEventListener('swyf-speech-settings',check); return()=>{active=false;window.removeEventListener('swyf-speech-settings',check);};
 },[]);
 // Stop before paint when the sound switch changes, including while session setup is pending.
 useLayoutEffect(()=>{if(!sound){stop();lastPlayed.current='';}},[sound,stop]);
 const line=call?.transcript.at(-1);
 const key=call ? `${call.id}:${call.revision||0}:${line?.text}` : '';
 useEffect(()=>{
  stop();setError('');
  if (!sound || paused || !config || call?.status!=='active' || line?.who!=='caller') return;
  const playKey=locale+`${key}:${repeat}`;
  // Listening interrupts this line; ending recognition must not restart it over the player.
  if (lastPlayed.current===playKey) return;
  lastPlayed.current=playKey;
  const controller=new AbortController();abort.current=controller;const {signal}=controller; let disposed=false;
  const update=(n:number)=>{if(!disposed)setLevel(n);};
  const native=()=>{
   if (!('speechSynthesis' in window)) {setError('当前浏览器无法朗读，可配置云端语音。');return;}
   const profile=callerProfiles[call.person]; const utterance=new SpeechSynthesisUtterance(t(line.text)); utterance.lang=languageTags[locale]; utterance.rate=speed*profile.rate; utterance.pitch=profile.pitch;utterance.volume=.75;
   const voice=chooseSystemVoice(speechSynthesis.getVoices(),call.person); if(voice)utterance.voice=voice;
   let timer:ReturnType<typeof setInterval>|undefined;let started=0;let boundary=0;
   const end=()=>{clearInterval(timer);if(!disposed){setLoading(false);setLevel(0);}};
   utterance.onstart=()=>{if(disposed)return;setLoading(false);started=performance.now();timer=setInterval(()=>{const elapsed=performance.now()-started;const index=Math.min(line.text.length-1,Math.floor(elapsed*speed/170));const punctuation=/[，。！？、；：,.!?\s]/.test(line.text[index]||''); const pulse=.22+.52*Math.abs(Math.sin(elapsed/75));update(punctuation?0:Math.max(pulse,boundary>performance.now()?.75:0));},40);};
   utterance.onboundary=()=>{boundary=performance.now()+90;};
   utterance.onend=end;utterance.onerror=e=>{end();if(!disposed && !['interrupted','canceled'].includes(e.error))setError('系统语音无法播放，请点击“播放语音”或配置云端语音。');};
   const cleanup=()=>{clearInterval(timer);utterance.onstart=utterance.onend=utterance.onerror=utterance.onboundary=null;speechSynthesis.cancel();};signal.addEventListener('abort',cleanup,{once:true});
   setLoading(true);speechSynthesis.speak(utterance);
   const watchdog=setTimeout(()=>{if(!disposed && !started){cleanup();setLoading(false);setError('系统语音未启动，请点击“播放语音”重试。');}},4000);
   signal.addEventListener('abort',()=>clearTimeout(watchdog),{once:true});
  };
  if (config.available) {
   setLoading(true);
   void (async()=>{
    try {
     unlockSpeechAudio();
     const requestSignal=AbortSignal.any([signal,AbortSignal.timeout(30000)]);
     const session=await fetch('/api/session',{method:'POST',signal:requestSignal}); if(!session.ok)throw new Error('语音会话建立失败。');
     requestSignal.throwIfAborted();
     const response=await fetch('/api/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:t(line.text),person:call.person,speed,locale}),signal:requestSignal});
     if(!response.ok){const data=await response.json() as {error?:string};throw new Error(data.error||'语音服务暂不可用。');}
     if(disposed || requestSignal.aborted){await response.body?.cancel();return;}
     setLoading(false);await playPcmStream(response,requestSignal,update);
    } catch(e){if(!disposed&&!signal.aborted){setLoading(false);setLevel(0);setError(e instanceof Error && e.name!=='TimeoutError'?e.message:'语音响应超时，请重试。');}}
   })();
  } else native();
  return()=>{disposed=true;controller.abort();};
 },[key,call?.status,sound,paused,config,repeat,speed,stop,locale]);
 return {level,loading,error,mode:config?.available?config.provider:'系统语音',cloud:!!config?.available,stop,replay:()=>{if(!sound || paused)return;unlockSpeechAudio();lastPlayed.current='';setRepeat(n=>n+1);}};
}
