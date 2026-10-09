import {currentUser,type Env} from './auth';
import {probeAI} from './dialogue';
import {probeSpeech,validateSpeechInput,speechConfiguration} from './speech';
const administratorEmail=(env:Env)=>env.ADMIN_EMAIL?.trim().toLowerCase() || '';
export const reservedAdminEmail=(email:string,env:Env)=>!!administratorEmail(env)&&email.trim().toLowerCase()===administratorEmail(env);
export async function isAdministrator(request:Request,env:Env){
 const email=administratorEmail(env);if(!email)return false;
 const user=await currentUser(request,env);if(!user)return false;
 return !!await env.DB.prepare("SELECT user_id FROM auth_identities WHERE user_id=? AND provider='google' AND verified_email=?").bind(user.id,email).first();
}
const fields=['AI_API_KEY','AI_MODEL','AI_BASE_URL','TTS_PROVIDER','TTS_API_KEY','TTS_MODEL','TTS_BASE_URL','TTS_VOICE','TTS_VOICES'] as const;
type Configuration=Partial<Record<typeof fields[number],string>>;
const enc=new TextEncoder(),dec=new TextDecoder();
const bytes=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
async function key(env:Env){if(!env.SITE_SETTINGS_KEY)throw Error('Service configuration storage is not initialized.');const raw=bytes(env.SITE_SETTINGS_KEY);if(raw.length!==32)throw Error('Invalid configuration encryption key.');return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);}
async function read(env:Env):Promise<Configuration>{
 const row=await env.DB.prepare('SELECT payload FROM site_settings WHERE id=1').first<{payload:string}>();if(!row)return {};
 const {iv,data}=JSON.parse(row.payload);
 return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv)},await key(env),bytes(data))));
}
export async function runtimeEnv(env:Env):Promise<Env>{return {...env,...await read(env)};}
async function save(env:Env,data:Configuration,expected:string|null){
 const iv=crypto.getRandomValues(new Uint8Array(12)),encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(env),enc.encode(JSON.stringify(data))));
 const payload=JSON.stringify({iv:btoa(String.fromCharCode(...iv)),data:btoa(String.fromCharCode(...encrypted))});
 const result=await env.DB.prepare('INSERT INTO site_settings(id,payload,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at WHERE site_settings.payload=?').bind(payload,Date.now(),expected).run();
 if(result.meta.changes!==1)throw Error('Configuration changed; reload before saving.');
}
export async function adminSettings(request:Request,env:Env){
 const headers={'Cache-Control':'no-store'};
 if(!await isAdministrator(request,env))return Response.json({error:'Administrator access required.'},{status:403,headers});
 if(request.method==='GET'){
  const active=await runtimeEnv(env),speech=speechConfiguration(active);
  return Response.json({ai:{base:active.AI_BASE_URL||'https://openrouter.ai/api/v1',model:active.AI_MODEL||'',hasKey:!!(active.AI_API_KEY||active.OPENROUTER_API_KEY)},speech:{...speech,hasKey:!!active.TTS_API_KEY},storageReady:!!env.SITE_SETTINGS_KEY},{headers});
 }
 if(request.method!=='PUT')return new Response(null,{status:405,headers});
 // Explicit origin is required for the privileged mutation, even on non-browser requests.
 if(request.headers.get('Origin')!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403,headers});
 const raw=await request.text();if(raw.length>12000)return new Response(null,{status:413,headers});
 try{
  await key(env);
  const expected=await env.DB.prepare('SELECT payload FROM site_settings WHERE id=1').first<{payload:string}>();
  const input=JSON.parse(raw) as Record<string,unknown>,stored=await read(env),active={...env,...stored};
  let update:Configuration;
  if(input.section==='ai'){
   const base=new URL(String(input.base)),model=String(input.model||'').trim(),secret=typeof input.key==='string'?input.key.trim():'';
   if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||!/^[\w./:@+-]{1,160}$/.test(model)||(secret&&!/^[!-~]{1,1024}$/.test(secret)))throw Error('Invalid AI configuration.');
   update={AI_BASE_URL:base.href.replace(/\/$/,''),AI_MODEL:model,AI_API_KEY:secret||active.AI_API_KEY||active.OPENROUTER_API_KEY||''};
   if(!update.AI_API_KEY)throw Error('API key required.');
   await probeAI({...active,...update});
  }else if(input.section==='speech'){
   const v=validateSpeechInput(input);if(v.provider!==active.TTS_PROVIDER&&!v.key&&v.provider!=='browser')throw Error('A new provider requires its own key.');
   update={TTS_PROVIDER:v.provider,TTS_API_KEY:v.key||active.TTS_API_KEY||'',TTS_MODEL:v.model,TTS_BASE_URL:v.base,TTS_VOICE:v.voice,TTS_VOICES:JSON.stringify(v.voices)};
   if(v.provider!=='browser')await probeSpeech({...active,...update},request.signal);
  }else throw Error('Unknown settings section.');
  await save(env,{...stored,...update},expected?.payload??null);return Response.json({ok:true},{headers});
 }catch{return Response.json({error:'Configuration test or save failed. Check the provider, credentials and server storage configuration.'},{status:400,headers});}
}
