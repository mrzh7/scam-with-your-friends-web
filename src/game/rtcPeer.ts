import type { Signal } from './useRoom';

export interface VoicePeerOptions {
 stream: MediaStream; configuration: RTCConfiguration; polite: boolean;
 signal(value: Signal): void; onStream(stream: MediaStream): void;
 onState(state: RTCPeerConnectionState): void; onError(message: string): void;
}

// Shared by the voice hook and the native-browser transport acceptance test.
export function createVoicePeer(options: VoicePeerOptions) {
 const pc = new RTCPeerConnection(options.configuration);
 let makingOffer = false, ignoreOffer = false, settingAnswer = false, closed = false, retries = 0;
 const candidates: RTCIceCandidateInit[] = [];
 let queue = Promise.resolve();
 const sendDescription = () => { if (!closed && pc.localDescription) options.signal({ description: pc.localDescription.toJSON() }); };
 const error = (message: string) => { if (!closed) options.onError(message); };
 pc.onicecandidate = event => { if (!closed && event.candidate) options.signal({ candidate: event.candidate.toJSON() }); };
 pc.ontrack = event => options.onStream(event.streams[0] || new MediaStream([event.track]));
 pc.onconnectionstatechange = () => { options.onState(pc.connectionState); if (pc.connectionState === 'failed') { if (retries++ < 1) pc.restartIce(); else error('语音无法穿越当前网络。请配置 TURN 中继后重新连接。'); } };
 pc.onnegotiationneeded = async () => { try { makingOffer = true; await pc.setLocalDescription(); sendDescription(); } catch { error('语音协商失败，请关闭后重新加入语音。'); } finally { makingOffer = false; } };
 options.stream.getTracks().forEach(track => pc.addTrack(track, options.stream));
 async function handle(signal: Signal) {
  if (closed) return;
  try {
   if (signal.description) {
    const ready = !makingOffer && (pc.signalingState === 'stable' || settingAnswer);
    ignoreOffer = !options.polite && signal.description.type === 'offer' && !ready;
    if (ignoreOffer) return;
    settingAnswer = signal.description.type === 'answer';
    try { await pc.setRemoteDescription(signal.description); } finally { settingAnswer = false; }
    for (const candidate of candidates.splice(0)) await pc.addIceCandidate(candidate);
    if (signal.description.type === 'offer') { await pc.setLocalDescription(); sendDescription(); }
   } else if (signal.candidate && !ignoreOffer) {
    if (pc.remoteDescription) await pc.addIceCandidate(signal.candidate);
    else if (candidates.length < 50) candidates.push(signal.candidate);
   }
  } catch { if (!ignoreOffer) error('语音连接出现错误，请重新加入语音。'); }
 }
 return { pc, receive(signal: Signal) { queue = queue.then(() => handle(signal)); return queue; }, close() { if (closed) return; closed = true; candidates.length = 0; pc.onnegotiationneeded = null; pc.onicecandidate = null; pc.onconnectionstatechange = null; pc.ontrack = null; pc.close(); } };
}
