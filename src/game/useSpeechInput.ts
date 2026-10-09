import {useLocale} from '../i18n/LanguageSelector';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createRecognitionSession,recognitionError,type Recognizer} from './speechInput';
import {speechLevel} from './pcmSpeech';
export function useSpeechInput(options:{callKey:string;enabled:boolean;result(text:string):void;focus():void;interrupt():void;level?(value:number):void;factory?:()=>Recognizer}) {
 const locale=useLocale();
 const [listening,setListening]=useState(false),[error,setError]=useState(''),[interim,setInterim]=useState('');
 const latest=useRef(options);latest.current=options;
 const session=useRef<ReturnType<typeof createRecognitionSession>|null>(null),generation=useRef(0),disposeMeter=useRef(()=>{});
 const cancel=useCallback(()=>{generation.current++;session.current?.cancel();session.current=null;disposeMeter.current();setListening(false);setInterim('');latest.current.level?.(0);},[]);
 useEffect(()=>{cancel();setError('');return cancel;},[options.callKey,options.enabled,cancel,locale]);
 const start=()=>{
  if(listening){session.current?.stop();return;}
  cancel();setError('');latest.current.interrupt();
  const token=generation.current;
  const w=window as unknown as {SpeechRecognition?:new()=>Recognizer;webkitSpeechRecognition?:new()=>Recognizer};
  const Ctor=w.SpeechRecognition||w.webkitSpeechRecognition;
  if(!options.factory&&!Ctor){setError(recognitionError('unsupported'));latest.current.focus();return;}
  let recognizer:Recognizer;try{recognizer=options.factory?options.factory():new Ctor!();}catch{setError(recognitionError('unsupported'));latest.current.focus();return;}
  let ended=false;
  session.current=createRecognitionSession(recognizer,{
   interim:value=>{if(token===generation.current)setInterim(value);},
   active:value=>{if(token===generation.current)setListening(value);},
   text:value=>{if(token===generation.current&&latest.current.enabled)latest.current.result(value);},
   error:value=>{if(token===generation.current)setError(value);},
   done:()=>{ended=true;disposeMeter.current();latest.current.level?.(0);if(token===generation.current){setListening(false);latest.current.focus();}},
  });
  // Recognition and its level meter never disable the text composer.
  if(!ended&&!options.factory&&!window.matchMedia('(pointer: coarse)').matches&&navigator.mediaDevices?.getUserMedia)void navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}).then(stream=>{
   if(ended||token!==generation.current){stream.getTracks().forEach(t=>t.stop());return;}
   let ctx:AudioContext;
   try{ctx=new AudioContext();}catch{stream.getTracks().forEach(t=>t.stop());return;}
   const analyser=ctx.createAnalyser();analyser.fftSize=512;const source=ctx.createMediaStreamSource(stream);source.connect(analyser);void ctx.resume().catch(()=>{});
   const bytes=new Float32Array(512);const timer=setInterval(()=>{analyser.getFloatTimeDomainData(bytes);latest.current.level?.(speechLevel(bytes));},80);
   disposeMeter.current=()=>{clearInterval(timer);source.disconnect();analyser.disconnect();stream.getTracks().forEach(t=>t.stop());void ctx.close().catch(()=>{});};
  }).catch(()=>{/* Recognition reports the actionable permission/device failure itself. */});
 };
 return {listening,error,interim,start,cancel};
}
