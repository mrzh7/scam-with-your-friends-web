import {readFile,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import type {Plugin} from 'vite';
import type {Env} from '../worker/auth';
import {isLocalAIRequest} from './localAI';
import {speechConfiguration,validateSpeechInput,probeSpeech} from '../worker/speech';
export function mergeSpeechEnv(source:string,input:ReturnType<typeof validateSpeechInput>) {
 const old=parseEnv(source), key=input.key || (old.TTS_PROVIDER===input.provider?old.TTS_API_KEY:'');
 if(input.provider!=='browser'&&!key)throw new Error('语音：请输入该服务商的独立 API Key。');
 const values={TTS_PROVIDER:input.provider,TTS_API_KEY:key||'',TTS_MODEL:input.model,TTS_BASE_URL:input.base,TTS_VOICE:input.voice,TTS_VOICES:JSON.stringify(input.voices)};
 for(const key of Object.keys(values))if(old[key]?.includes('\n'))throw new Error('语音：现有配置包含多行值，请先修正。');
 const retained=source.split(/\r?\n/).filter(line=>!Object.keys(values).some(key=>new RegExp('^\\s*(?:export\\s+)?'+key+'\\s*=').test(line)));
 return retained.join('\n').trimEnd()+'\n\n# Local speech service; never commit secrets.\n'+Object.entries(values).map(([key,value])=>key+'='+JSON.stringify(value)).join('\n')+'\n';
}
export function localSpeechSetup(probe=probeSpeech):Plugin {
 return {name:'local-speech-setup',apply:'serve',enforce:'pre',configureServer(server){let saving=false;
  server.middlewares.use(async(req,res,next)=>{
   if(req.url?.split('?')[0]!=='/__local/speech')return next();
   const reply=(status:number,data:unknown)=>{if(res.destroyed)return;res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
   const mutation=req.method!=='GET';
   if(!isLocalAIRequest(req.headers.host,req.headers.origin,req.socket.remoteAddress,mutation)||(mutation&&req.headers['x-local-ai-setup']!=='1'))return reply(403,{error:'语音设置仅允许本机同源访问。'});
   if(!['GET','POST'].includes(req.method||''))return reply(405,{error:'不支持的请求。'});
   try {
    const path=resolve(server.config.root,'.dev.vars');let source='';try{source=await readFile(path,'utf8');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
    const env=parseEnv(source) as unknown as Env;
    if(!mutation)return reply(200,{local:true,hasKey:!!env.TTS_API_KEY,...speechConfiguration(env)});
    if(saving)return reply(409,{error:'语音配置正在测试，请稍候。'});
    const chunks:Buffer[]=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>8000)return reply(413,{error:'语音配置过长。'});chunks.push(Buffer.from(chunk));}
    const input=validateSpeechInput(JSON.parse(Buffer.concat(chunks).toString('utf8'))),output=mergeSpeechEnv(source,input);
    if(saving)return reply(409,{error:'语音配置正在测试，请稍候。'});saving=true;
    const controller=new AbortController(),disconnect=()=>controller.abort();res.once('close',disconnect);
    try {
     if(input.provider!=='browser')await probe(parseEnv(output) as unknown as Env,controller.signal);
     controller.signal.throwIfAborted();
     let current='';try{current=await readFile(path,'utf8');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
     if(current!==source)return reply(409,{error:'配置已被其他操作修改，请重新打开设置。'});
     controller.signal.throwIfAborted();
     const temp=path+'.speech.tmp';await writeFile(temp,output,{mode:0o600});await rename(temp,path);reply(200,{saved:true});
     setTimeout(()=>{void server.restart().catch(()=>server.config.logger.error('语音配置已保存，请重启开发服务。'));},500);
    }finally{res.removeListener('close',disconnect);saving=false;}
   }catch(e){reply(400,{error:e instanceof Error&&e.message.startsWith('语音：')?e.message:'语音配置或连接测试失败。'});}
  });
 }};
}
