import {it,expect,vi} from 'vitest';
import {createServer,type Server} from 'node:http';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {parseEnv} from 'node:util';
import type {ViteDevServer} from 'vite';
import type {Env} from '../worker/auth';
import {localSpeechSetup} from '../scripts/localSpeech';
it('tests speech credentials before atomic local persistence and preserves dialogue configuration',async()=>{
 const root=await mkdtemp(join(tmpdir(),'swyf-speech-test-'));let server:Server|undefined;
 const restart=vi.fn(async()=>{}),probe=vi.fn(async(env:Env)=>{if(env.TTS_API_KEY==='rejected-test-key')throw new Error('语音：服务密钥或音色权限无效。');});
 try{
  await writeFile(join(root,'.dev.vars'),'AI_API_KEY="existing-dialogue-secret"\nAI_MODEL=deepseek-flash\nTURN_API_TOKEN="existing-turn-secret"\n');
  const hook=localSpeechSetup(probe).configureServer as (s:ViteDevServer)=>void;
  hook({config:{root,logger:{error:vi.fn()}},restart,middlewares:{use(handler:Parameters<typeof createServer>[1]){server=createServer(handler);}}} as unknown as ViteDevServer);
  await new Promise<void>(done=>server!.listen(0,'127.0.0.1',done));const origin='http://127.0.0.1:'+(server!.address() as {port:number}).port;
  const send=(key:string,from=origin)=>fetch(origin+'/__local/speech',{method:'POST',headers:{Origin:from,'X-Local-AI-Setup':'1'},body:JSON.stringify({provider:'minimax',key})});
  expect((await send('unused-key','https://elsewhere.example')).status).toBe(403);expect(probe).not.toHaveBeenCalled();
  const before=await readFile(join(root,'.dev.vars'),'utf8');expect((await send('rejected-test-key')).status).toBe(400);expect(await readFile(join(root,'.dev.vars'),'utf8')).toBe(before);expect(restart).not.toHaveBeenCalled();
  expect((await send('accepted-test-key')).status).toBe(200);expect(parseEnv(await readFile(join(root,'.dev.vars'),'utf8'))).toMatchObject({AI_API_KEY:'existing-dialogue-secret',TURN_API_TOKEN:'existing-turn-secret',TTS_API_KEY:'accepted-test-key',TTS_PROVIDER:'minimax'});
  const info=await(await fetch(origin+'/__local/speech')).text();expect(info).not.toMatch(/existing-dialogue-secret|accepted-test-key|existing-turn-secret/);expect(JSON.parse(info).available).toBe(true);
  await new Promise(done=>setTimeout(done,600));expect(restart).toHaveBeenCalledOnce();
 }finally{if(server)await new Promise<void>(done=>server!.close(()=>done()));if(!resolve(root).startsWith(resolve(tmpdir())+sep))throw new Error('Unexpected test directory');await rm(root,{recursive:true,force:true});}
});

it('cancels a pending paid probe on disconnect without saving configuration',async()=>{
 const root=await mkdtemp(join(tmpdir(),'swyf-speech-cancel-'));let server:Server|undefined;
 let started!:()=>void,stopped!:()=>void;
 const begun=new Promise<void>(resolve=>{started=resolve;}),cancelled=new Promise<void>(resolve=>{stopped=resolve;});
 const probe=vi.fn(async(_env:Env,signal?:AbortSignal)=>{started();await new Promise<void>((_resolve,reject)=>{signal!.addEventListener('abort',()=>{stopped();reject(new DOMException('Stopped','AbortError'));},{once:true});});});
 const restart=vi.fn(async()=>{});
 try{
  const original='AI_API_KEY="dialogue-test-key"\n';await writeFile(join(root,'.dev.vars'),original);
  const hook=localSpeechSetup(probe).configureServer as (s:ViteDevServer)=>void;
  hook({config:{root,logger:{error:vi.fn()}},restart,middlewares:{use(handler:Parameters<typeof createServer>[1]){server=createServer(handler);}}} as unknown as ViteDevServer);
  await new Promise<void>(done=>server!.listen(0,'127.0.0.1',done));const origin='http://127.0.0.1:'+(server!.address() as {port:number}).port;
  const controller=new AbortController();
  const response=fetch(origin+'/__local/speech',{method:'POST',headers:{Origin:origin,'X-Local-AI-Setup':'1'},body:JSON.stringify({provider:'minimax',key:'probe-test-key'}),signal:controller.signal}).catch(e=>e);
  await begun;controller.abort();await cancelled;await response;
  expect(await readFile(join(root,'.dev.vars'),'utf8')).toBe(original);expect(restart).not.toHaveBeenCalled();
 }finally{if(server)await new Promise<void>(done=>server!.close(()=>done()));if(!resolve(root).startsWith(resolve(tmpdir())+sep))throw new Error('Unexpected test directory');await rm(root,{recursive:true,force:true});}
});
