// PCM chunks can end halfway through a signed 16-bit sample.
export class PcmDecoder {
 private carry: number | null = null;
 decode(bytes: Uint8Array) {
  const input = this.carry === null ? bytes : new Uint8Array(bytes.length+1);
  if(this.carry!==null){input[0]=this.carry;input.set(bytes,1);}
  this.carry = input.length % 2 ? input[input.length-1] : null;
  const samples = new Float32Array(Math.floor(input.length / 2));
  for (let i=0;i<samples.length;i++) { const value = input[i*2] | input[i*2+1]<<8; samples[i] = (value >= 32768 ? value-65536 : value)/32768; }
  return samples;
 }
 finish() { if (this.carry !== null) throw new Error('语音数据不完整，请重新播放。'); }
}
export function speechLevel(samples: Float32Array) { let sum=0; for (const value of samples) sum += value*value; const rms=Math.sqrt(sum / Math.max(1,samples.length)); return rms < .009 ? 0 : Math.min(1,rms*5); }
let context: AudioContext | null = null;
export function unlockSpeechAudio() { if (!context || context.state === 'closed') context = new AudioContext(); void context.resume().catch(()=>{}); return context; }
export async function playPcmStream(response: Response, signal: AbortSignal, level: (value:number)=>void, volume=.75) {
 signal.throwIfAborted();
 const ctx=unlockSpeechAudio();
 if(ctx.state!=='running'){let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([ctx.resume(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('浏览器暂停了声音，请点击“播放语音”重试。')),1500);})]);}finally{clearTimeout(timer);}}
 signal.throwIfAborted();
 if (ctx.state !== 'running') throw new Error('浏览器暂停了声音，请点击“播放语音”重试。');
 if (!response.body || response.headers.get('X-Audio-Format') !== 'pcm_s16le' || response.headers.get('X-Audio-Sample-Rate') !== '24000') throw new Error('语音服务返回了不支持的音频格式。');
 const analyser=ctx.createAnalyser(), gain=ctx.createGain(); analyser.fftSize=512; gain.gain.value=volume; analyser.connect(gain); gain.connect(ctx.destination);
 const samples=new Float32Array(analyser.fftSize), sources=new Set<AudioBufferSourceNode>(), decoder=new PcmDecoder();
 const reader=response.body.getReader(); let next=ctx.currentTime+.045, cancelled=false, total=0;
 const stop=()=>{ cancelled=true; for (const source of sources) { try { source.stop(); } catch {} source.disconnect(); } sources.clear(); void reader.cancel().catch(()=>{}); };
 signal.addEventListener('abort',stop,{once:true});
 const timer=setInterval(()=>{ if (!cancelled && ctx.state==='running') { analyser.getFloatTimeDomainData(samples); level(speechLevel(samples)); } else level(0); },35);
 try {
  while (!signal.aborted) {
   const {done,value}=await reader.read(); signal.throwIfAborted(); if (done) break;
   total+=value.length; if (total>4_000_000) throw new Error('语音过长，已停止播放。');
   const pcm=decoder.decode(value); if (!pcm.length) continue;
   const buffer=ctx.createBuffer(1,pcm.length,24000); buffer.copyToChannel(pcm,0);
   const source=ctx.createBufferSource(); source.buffer=buffer; source.connect(analyser); sources.add(source);
   source.onended=()=>{sources.delete(source);source.disconnect();};
   next=Math.max(next,ctx.currentTime+.025); source.start(next); next+=buffer.duration;
  }
  if (signal.aborted) throw new DOMException('Stopped','AbortError');
  decoder.finish(); if (!total) throw new Error('没有收到语音。');
  await new Promise<void>(resolve=>{ const finishTimer=setInterval(()=>{ if (!sources.size || signal.aborted) {clearInterval(finishTimer);resolve();} },35); });
  if(signal.aborted)throw new DOMException('Stopped','AbortError');
 } finally { stop(); clearInterval(timer); signal.removeEventListener('abort',stop); analyser.disconnect(); gain.disconnect(); reader.releaseLock(); level(0); }
}
