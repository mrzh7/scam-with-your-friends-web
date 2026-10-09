import {useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {playPcmStream,unlockSpeechAudio} from '../src/game/pcmSpeech';
import {CallerPortrait} from '../src/components/CallerPortrait';
import {SpeechSettings} from '../src/components/SpeechSettings';
import '../src/styles.css';
function Fixture(){
 const [level,setLevel]=useState(0),[status,setStatus]=useState('待测试'),[stats,setStats]=useState(''),[settings,setSettings]=useState(false);const abort=useRef<AbortController|null>(null);
 async function play(){
  abort.current?.abort();const controller=new AbortController();abort.current=controller;unlockSpeechAudio();setStatus('播放中');setStats('');let peak=0,early=false,silence=false,done=false;
  const stream=new ReadableStream<Uint8Array>({async start(c){try{for(let part=0;part<20;part++){if(controller.signal.aborted){c.close();return;}const data=new Uint8Array(4800),view=new DataView(data.buffer);for(let i=0;i<2400;i++){const sample=part<5||part>=10&&part<15?Math.sin(i/24000*Math.PI*2*220)*.15:0;view.setInt16(i*2,Math.round(sample*32767),true);}c.enqueue(data);await new Promise(r=>setTimeout(r,90));}done=true;c.close();}catch{}}});
  try{await playPcmStream(new Response(stream,{headers:{'X-Audio-Format':'pcm_s16le','X-Audio-Sample-Rate':'24000'}}),controller.signal,n=>{setLevel(n);peak=Math.max(peak,n);if(n>.1&&!done)early=true;if(peak>.1&&n===0&&!done)silence=true;},0);setStatus('测试完成');setStats(`峰值 ${peak.toFixed(3)}；完整流结束前发声 ${early}；句间静音归零 ${silence}`);}catch(e){setStatus(controller.signal.aborted?'已停止':String(e));}finally{setLevel(0);}
 }
 return <main style={{width:410,maxWidth:'95vw',margin:'30px auto',padding:20,background:'#f6f5ed'}}><h2>实际 Web Audio + 生产口型</h2><p>合成两段测试音，输出音量为零；不调用服务、不访问麦克风。</p><div style={{height:180}}><CallerPortrait person={3} talking={level>.025} level={level} trust={60}/></div><p role="status">{status}；当前口型 {level.toFixed(3)}</p><p>{stats}</p><button onClick={play}>播放同步测试</button> <button onClick={()=>abort.current?.abort()}>停止</button><hr/><button onClick={()=>setSettings(v=>!v)}>查看真实语音设置</button>{settings&&<SpeechSettings sound={false} onEnableSound={()=>{}}/>}</main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
