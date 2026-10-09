
import { createVoicePeer } from '/src/game/rtcPeer.ts';
const button = document.getElementById('run'), output = document.getElementById('output');
button.onclick = async () => {
 button.disabled = true; output.textContent = '正在创建双向音频连接…';
 const context = new AudioContext(); await context.resume(); const tracks = [], oscillators = [], peers = [], problems = [];
 const source = frequency => { const oscillator = context.createOscillator(), gain = context.createGain(), destination = context.createMediaStreamDestination(); oscillator.frequency.value = frequency; gain.gain.value = .15; oscillator.connect(gain).connect(destination); oscillator.start(); oscillators.push(oscillator); tracks.push(...destination.stream.getTracks()); return destination.stream; };
 const meters = [], receivers = []; let offers = 0;
 try {
  for (let i = 0; i < 2; i++) peers.push(createVoicePeer({stream:source(330+i*110),configuration:{iceServers:[]},polite:i===0,
   signal: message => { if (message.description?.type === 'offer') offers++; setTimeout(() => peers[1-i]?.receive(message), 20); },
   onStream: stream => { const receiver = new Audio(); receiver.volume = 0; receiver.srcObject = stream; receivers.push(receiver); void receiver.play().catch(e => problems.push(e.message)); const meter = context.createAnalyser(); meter.fftSize = 256; const silent = context.createGain(); silent.gain.value = 0; context.createMediaStreamSource(stream).connect(meter).connect(silent).connect(context.destination); meters[i] = meter; },
   onState: state => { output.textContent = `端 ${i+1}: ${state} · 已发起 ${offers} 个 offer`; }, onError: message => problems.push(message)
  }));
  const start = Date.now(); while (peers.some(p => p.pc.connectionState !== 'connected')) { if (Date.now()-start>15000) throw new Error('连接超时'); await new Promise(r=>setTimeout(r,100)); }
  await new Promise(r=>setTimeout(r,1700));
  const samples = [];
  for (let i=0;i<2;i++) { const stats=await peers[i].pc.getStats(); let bytes=0, energy=0; stats.forEach(s=>{if(s.type==='inbound-rtp'&&s.kind==='audio'){bytes+=s.bytesReceived||0;energy+=s.totalAudioEnergy||0;}}); const values=new Float32Array(256); meters[i].getFloatTimeDomainData(values); const rms=Math.sqrt(values.reduce((n,v)=>n+v*v,0)/values.length); if(bytes<100||(energy<=0&&rms<.001))throw new Error(`端 ${i+1} 未收到有效音频: bytes=${bytes}, energy=${energy}, rms=${rms}, context=${context.state}`); samples.push(`PASS 端 ${i+1}: ${bytes} bytes · decoded energy ${energy.toFixed(5)} · RMS ${rms.toFixed(4)}`); }
  tracks.forEach(t=>t.enabled=false); await new Promise(r=>setTimeout(r,1000)); for(const meter of meters) { const values=new Float32Array(256); meter.getFloatTimeDomainData(values); const rms=Math.sqrt(values.reduce((n,v)=>n+v*v,0)/values.length); if(rms>.005)throw new Error('松开说话后仍有测试音'); } samples.push('PASS 松开说话后双端静音');
  if(problems.length)throw new Error(problems.join('; ')); if(offers<2)throw new Error('未覆盖同时发起协商');
  peers.forEach(p=>p.close()); if(peers.some(p=>p.pc.signalingState!=='closed'))throw new Error('连接未关闭');
  output.textContent = [...samples, `PASS ${offers} 个 offer 同时协商成功`, 'PASS 连接关闭与音轨清理', '全部通过 · 实际游戏传输模块'].join('\n');
 } catch(error) { output.textContent='FAIL '+error.message; }
 finally { receivers.forEach(a=>{a.pause();a.srcObject=null;}); peers.forEach(p=>p.close()); oscillators.forEach(o=>o.stop()); tracks.forEach(t=>t.stop()); await context.close(); button.disabled=false; }
};
