import {t} from '../i18n';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {CALLERS} from '../game/content';
import {callerProfiles} from '../game/dialogueContent';
import {speechSpeed,type SpeechConfig} from '../game/useCallerSpeech';
export function SpeechSettings({sound,onEnableSound}:{sound:boolean;onEnableSound:()=>void}){
 const request=useRef<AbortController|null>(null);
 useLayoutEffect(()=>{if(!sound)request.current?.abort();return()=>request.current?.abort();},[sound]);
 const [config,setConfig]=useState<SpeechConfig|null>(null),[local,setLocal]=useState(false),[hasKey,setHasKey]=useState(false),[savedProvider,setSavedProvider]=useState('browser');
 const [provider,setProvider]=useState('browser'),[key,setKey]=useState(''),[model,setModel]=useState('speech-2.8-turbo'),[base,setBase]=useState('https://api.minimax.cn/v1'),[voice,setVoice]=useState(''),[voices,setVoices]=useState<string[]>(Array(8).fill(''));
 const [speed,setSpeed]=useState(speechSpeed),[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let alive=true;void(async()=>{
  try{const r=await fetch(import.meta.env.DEV?'/__local/speech':'/api/config',{signal:AbortSignal.timeout(5000)});if(!r.ok)return;const data=await r.json() as SpeechConfig & {local?:boolean;hasKey?:boolean;speech?:SpeechConfig};const c=import.meta.env.DEV?data:data.speech;if(!alive||!c)return;setConfig(c);setLocal(!!data.local);setHasKey(!!data.hasKey);setSavedProvider(c.provider);setProvider(c.provider);setModel(c.model||'speech-2.8-turbo');setBase(c.base||'https://api.minimax.cn/v1');setVoice(c.voice||'');setVoices(Array.from({length:8},(_,i)=>c.voices?.[i]||''));}catch{}
 })();return()=>{alive=false;};},[]);
 const changeSpeed=(value:number)=>{setSpeed(value);try{localStorage.setItem('swyf-speech-speed',String(value));}catch{}window.dispatchEvent(new Event('swyf-speech-settings'));};
 async function save(){if(provider!=='browser'&&!sound){setError('声音已关闭，请先开启声音再测试语音。');return;}const controller=new AbortController();request.current=controller;setSaving(true);setError('');setMessage(provider==='browser'?'正在保存…':'正在生成一小段测试语音…');
  try{const r=await fetch('/__local/speech',{method:'POST',headers:{'Content-Type':'application/json','X-Local-AI-Setup':'1'},body:JSON.stringify({provider,model,base,voice,voices,...(key.trim()?{key:key.trim()}:{})}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(25000)])});const d=await r.json() as {error?:string};controller.signal.throwIfAborted();if(!r.ok)throw new Error(d.error||'语音配置保存失败。');setKey('');setSavedProvider(provider);setHasKey(provider!=='browser');setConfig({provider:provider as SpeechConfig['provider'],available:provider!=='browser',model,base,voice,voices});setMessage('配置已保存，服务正在重新载入。返回通话后点击“播放语音”试听。');setTimeout(()=>window.dispatchEvent(new Event('swyf-speech-settings')),2200);}catch(e){setMessage('');if(!controller.signal.aborted)setError(e instanceof Error&&e.name!=='TimeoutError'?e.message:'语音测试超时，请检查服务配置。');}finally{if(request.current===controller)request.current=null;setSaving(false);}
 }
 return <section className="ai-settings speech-settings" aria-label={t("角色语音设置")}><div className="ai-heading"><h3>{t("角色语音与口型")}</h3><span className={`ai-status ${config?.available?'ready':''}`}>{t(config?.available?'云端语音':'系统语音')}</span></div>
  <p>{t("云端语音边生成边播放，口型跟随音量。系统语音使用当前设备的中文音色，口型为近似节奏。")}</p>
  {!sound&&<p className="speech-muted-note">{t("声音已关闭，已暂停语音合成和付费测试。")}<button type="button" onClick={onEnableSound}>{t("开启声音以试听")}</button></p>}
  <label className="speech-speed">{t("说话速度 ")}<input aria-label={t("说话速度")} type="range" min="0.8" max="1.3" step="0.01" value={speed} onChange={e=>changeSpeed(Number(e.target.value))}/><b>{t(speed.toFixed(2))}×</b></label>
  {local?<form className="ai-config-form" onSubmit={e=>{e.preventDefault();void save();}}>
   <label>{t("语音服务")}<select aria-label={t("语音服务")} value={provider} disabled={saving} onChange={e=>{const p=e.target.value;setProvider(p);setKey('');setModel(p==='elevenlabs'?'eleven_flash_v2_5':'speech-2.8-turbo');setVoice('');setVoices(Array(8).fill(''));}}><option value="browser">{t("系统语音 · 无需密钥")}</option><option value="minimax">{t("MiniMax · 中文角色音色")}</option><option value="elevenlabs">{t("ElevenLabs · 多语言语音")}</option></select></label>
   {provider!=='browser'&&<><p>{t("使用该语音服务独立的 API Key，DeepSeek 对话密钥不能用于合成语音。")}</p><label>{t("语音 API Key")}<input aria-label={t("语音 API Key")} type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} required={!(hasKey&&savedProvider===provider)} placeholder={t(hasKey&&savedProvider===provider?'已保存，留空保留':'粘贴语音服务 API Key')} disabled={saving}/></label>
    {provider==='minimax'&&<label>{t("接入区域")}<select aria-label={t("MiniMax 接入区域")} value={base} onChange={e=>setBase(e.target.value)}><option value="https://api.minimax.cn/v1">{t("中国站 · api.minimax.cn")}</option><option value="https://api.minimaxi.com/v1">{t("中国站兼容地址 · api.minimaxi.com")}</option><option value="https://api.minimax.io/v1">{t("国际站 · api.minimax.io")}</option></select></label>}
    <label>{t("语音模型")}<input aria-label={t("语音模型")} value={model} onChange={e=>setModel(e.target.value)} required disabled={saving}/></label>
    <label>{t("统一音色 ID（可留空）")}<input aria-label={t("默认音色 ID")} value={voice} onChange={e=>setVoice(e.target.value)} placeholder={t(provider==='minimax'?'留空使用八位角色各自的音色':'留空使用 George；可填自己音色库的 ID')}/></label>
    <details><summary>{t("为每位角色指定音色")}</summary><p>{t("单独指定优先于统一音色；留空使用默认值。")}</p>{CALLERS.map((p,i)=><label key={p.name}>{p.name}<input aria-label={t(`${p.name} 音色 ID`)} value={voices[i]} onChange={e=>setVoices(old=>old.map((v,n)=>n===i?e.target.value:v))} placeholder={t(provider==='minimax'?callerProfiles[i].voice:'使用默认音色')}/></label>)}</details>
    <p><a href={provider==='minimax'?'https://platform.minimax.cn/docs/faq/system-voice-id':'https://elevenlabs.io/app/voice-library'} target="_blank" rel="noreferrer">{t("查找音色")}</a> {t(" · 测试会生成一句短语音，可能产生服务商费用。")}</p></>}
   <button className="primary" type="submit" disabled={saving||(provider!=='browser'&&!sound)}>{t(saving?'正在测试…':provider==='browser'?'使用系统语音':'测试语音并保存')}</button>
  </form>:<p>{t("云端语音由服务端配置 TTS_PROVIDER、TTS_API_KEY 和 TTS_MODEL。Cloudflare 使用 Worker 的变量与机密。")}</p>}
  {message&&<p className="ai-feedback" role="status">{t(message)}</p>}{error&&<p className="ai-feedback error" role="alert">{t(error)}</p>}
 </section>;
}
