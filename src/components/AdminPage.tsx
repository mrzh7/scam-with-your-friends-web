import {CALLERS} from '../game/content';
import {t} from '../i18n';
import {LanguageSelector,useLocale} from '../i18n/LanguageSelector';
import {useEffect,useState} from 'react';
import {api,ApiError} from '../game/storage';
type Settings={ai:{base:string;model:string;hasKey:boolean};speech:{provider:string;base:string;model:string;voice:string;voices:string[];hasKey:boolean};storageReady:boolean};
export default function AdminPage(){ useLocale();
 const [settings,setSettings]=useState<Settings|null>(null),[error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const [aiKey,setAIKey]=useState(''),[ttsKey,setTTSKey]=useState('');
 useEffect(()=>{void api<Settings>('/admin/settings').then(setSettings).catch(()=>setError('管理员身份验证失败。'));},[]);
 async function save(section:'ai'|'speech'){
  if(!settings)return;setBusy(true);setError('');setStatus('正在测试并保存…');
  try{await api('/admin/settings','PUT',{section,...settings[section],...(section==="speech"?{voices:settings.speech.voices.length===8?settings.speech.voices:Array(8).fill("")}:{}),...(section==='ai'?(aiKey?{key:aiKey}:{}):(ttsKey?{key:ttsKey}:{}))});setAIKey('');setTTSKey('');setSettings(await api<Settings>('/admin/settings'));setStatus('网站配置已保存并生效。');}catch(e){if(e instanceof ApiError&&(e.status===401||e.status===403))setSettings(null);setStatus('');setError((e as Error).message);}finally{setBusy(false);}
 }
 if(!settings)return <main className="admin-page"><h1>{t(error||'正在验证管理员身份…')}</h1></main>;
 return <main className="admin-page"><LanguageSelector/><h1>{t("网站服务管理")}</h1><p>{t("此处配置对整个网站生效。已保存的密钥不会回传。")}</p>{!settings.storageReady&&<p role="alert">{t("请先在服务器配置 SITE_SETTINGS_KEY。")}</p>}
 <form onSubmit={e=>{e.preventDefault();void save('ai');}}><h2>{t("AI 对话服务")}</h2>
 <label>{t("服务地址")}<input type="url" required value={settings.ai.base} onChange={e=>setSettings({...settings,ai:{...settings.ai,base:e.target.value}})}/></label>
 <label>{t("模型 ID")}<input required value={settings.ai.model} onChange={e=>setSettings({...settings,ai:{...settings.ai,model:e.target.value}})}/></label>
 <label>{t("API Key")}<input type="password" autoComplete="off" value={aiKey} required={!settings.ai.hasKey} placeholder={t("留空保留现有密钥")} onChange={e=>setAIKey(e.target.value)}/></label>
 <button disabled={busy||!settings.storageReady}>{t("测试并保存 AI 配置")}</button></form>
 <form onSubmit={e=>{e.preventDefault();void save('speech');}}><h2>{t("角色语音服务")}</h2>
 <label>{t("语音服务")}<select value={settings.speech.provider} onChange={e=>setSettings({...settings,speech:{...settings.speech,provider:e.target.value,model:e.target.value==='elevenlabs'?'eleven_flash_v2_5':'speech-2.8-turbo'}})}><option value="browser">{t("系统语音")}</option><option value="minimax">{t("MiniMax")}</option><option value="elevenlabs">{t("ElevenLabs")}</option></select></label>
 <label>{t("服务地址")}<input type="url" value={settings.speech.base} onChange={e=>setSettings({...settings,speech:{...settings.speech,base:e.target.value}})}/></label>
 <label>{t("模型 ID")}<input value={settings.speech.model} onChange={e=>setSettings({...settings,speech:{...settings.speech,model:e.target.value}})}/></label>
 <label>{t("音色 ID")}<input value={settings.speech.voice} onChange={e=>setSettings({...settings,speech:{...settings.speech,voice:e.target.value}})}/></label>
 <label>{t("API Key")}<input type="password" autoComplete="off" value={ttsKey} placeholder={t("留空保留现有密钥")} onChange={e=>setTTSKey(e.target.value)}/></label>
 {CALLERS.map((caller,i)=><label key={caller.name}>{t("{0} 音色 ID",[caller.name])}<input value={settings.speech.voices[i]||""} onChange={e=>{const voices=Array.from({length:8},(_,n)=>settings.speech.voices[n]||"");voices[i]=e.target.value;setSettings({...settings,speech:{...settings.speech,voices}});}}/></label>)}<button disabled={busy||!settings.storageReady}>{t("测试并保存语音配置")}</button></form>{status&&<p role="status">{t(status)}</p>}{error&&<p role="alert">{t(error)}</p>}</main>;
}
