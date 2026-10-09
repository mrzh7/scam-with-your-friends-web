import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useCallerSpeech} from '../src/game/useCallerSpeech';
import {SoundControl} from '../src/components/SoundControl';
import {SpeechSettings} from '../src/components/SpeechSettings';
import type {Call} from '../src/game/engine';
import '../src/styles.css';

// Isolated fixture: every fetch is handled here; no credentials or paid services are used.
const stats={sessions:0,tts:0,cancelled:0,settingsPosts:0};
const pending:(()=>void)[]=[];
let changed=()=>{};
const config={provider:'minimax',available:true,model:'fixture',voice:'',voices:[],base:'https://api.minimax.cn/v1'};
window.fetch=async(input,init)=>{
 const url=String(input);
 if(url==='/api/config')return Response.json({speech:config});
 if(url==='/__local/speech'&&(!init?.method||init.method==='GET'))return Response.json({...config,local:true,hasKey:true});
 if(url==='/__local/speech'){stats.settingsPosts++;changed();throw Error('A muted settings test must never request synthesis');}
 if(url==='/api/session'){stats.sessions++;changed();return new Promise<Response>(resolve=>pending.push(()=>resolve(Response.json({ok:true}))));}
 if(url==='/api/speech'){
  stats.tts++;changed();
  const stream=new ReadableStream<Uint8Array>({start(controller){
   controller.enqueue(new Uint8Array(4800));
   init?.signal?.addEventListener('abort',()=>{stats.cancelled++;changed();try{controller.error(new DOMException('Stopped','AbortError'));}catch{}},{once:true});
  }});
  return new Response(stream,{headers:{'X-Audio-Format':'pcm_s16le','X-Audio-Sample-Rate':'24000'}});
 }
 throw Error('Unexpected fixture request: '+url);
};
function Fixture(){
 const [sound,setSound]=useState(false),[revision,setRevision]=useState(0),[,render]=useState(0);
 changed=()=>render(n=>n+1);
 const call:Call={id:1,person:0,scheme:'identity',status:'active',trust:40,patience:100,turn:0,revealed:false,code:'GAME-ID-123',revision,transcript:[{who:'caller',text:'我收到一封通知，请帮我核对一下。'+revision}]};
 const speech=useCallerSpeech(call,sound,false);
 return <main style={{maxWidth:600,margin:'30px auto 220px',padding:25,background:'#f6f5ed'}}>
  <h1>静音与合成请求验收</h1><p>使用生产声音组件与朗读 Hook。所有请求由本页截获，不调用语音服务。</p>
  <p role="status">声音：{sound?'开启':'关闭'}；会话请求：{stats.sessions}；TTS 请求：{stats.tts}；已中止：{stats.cancelled}；设置测试：{stats.settingsPosts}</p>
  <p>准备声音：{String(speech.loading)}；口型：{speech.level.toFixed(3)}</p>
  <button onClick={()=>setRevision(n=>n+1)}>下一句顾客对白</button>{' '}
  <button onClick={()=>{pending.splice(0).forEach(release=>release());}}>完成等待中的会话</button>{' '}
  <button onClick={speech.replay}>重播当前句</button>
  <SpeechSettings sound={sound} onEnableSound={()=>setSound(true)}/>
  <footer className="taskbar" style={{position:'fixed'}}><div className="taskbar-apps">Kolkata OS · 验收桌面</div><div className="system-tray"><SoundControl sound={sound} onChange={setSound}/><div className="system-tray-clock">09:00<small>DAY 1 · MONDAY</small></div></div></footer>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
