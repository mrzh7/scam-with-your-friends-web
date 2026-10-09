
import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PhoneApp} from '../src/components/PhoneApp';
import {LanguageSelector,useLocale} from '../src/i18n/LanguageSelector';
import {setLanguage} from '../src/i18n';
import {newGame,type Call} from '../src/game/engine';
import {callOpening} from '../src/game/dialogueContent';
import type {DialogueClient} from '../src/game/useDialogue';
import '../src/styles.css';
setLanguage('en');
const requests:{text:string;locale:string}[]=[];
window.fetch=async(input,init)=>{const path=String(input);if(path==='/api/config')return Response.json({speech:{provider:'minimax',available:true}});if(path==='/api/session')return Response.json({ok:true});if(path==='/api/speech'){requests.push(JSON.parse(String(init?.body)));window.dispatchEvent(new Event('qa-speech'));return new Response(new Uint8Array(480),{headers:{'X-Audio-Format':'pcm_s16le','X-Audio-Sample-Rate':'24000'}});}throw Error('Unexpected request');};
const call:Call={id:1,person:0,scheme:'identity',status:'active',trust:40,patience:105,turn:0,revealed:false,code:'GAME-ID-123',transcript:[{who:'caller',text:callOpening(0,'identity')}]};
const dialogue={enabled:true,available:true,busy:false,error:'',configError:'',send:async()=>{},check:async()=>true} as unknown as DialogueClient;
function Fixture(){useLocale();const [sound,setSound]=useState(false),[version,update]=useState(0);useEffect(()=>{const handler=()=>update(v=>v+1);window.addEventListener('qa-speech',handler);return()=>window.removeEventListener('qa-speech',handler);},[]);
 return <main style={{width:450,margin:'20px auto',background:'#183b40',padding:16,color:'white'}}><LanguageSelector/><button onClick={()=>setSound(v=>!v)}>Toggle sound</button><p data-testid="speech-capture">{version>=0?JSON.stringify(requests):''}</p><PhoneApp game={{...newGame(),phase:'playing',call}} dispatch={()=>{}} openTool={()=>{}} sound={sound} dialogue={dialogue} onConfigureAI={()=>{}}/></main>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);

