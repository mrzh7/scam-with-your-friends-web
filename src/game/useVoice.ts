import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './storage';
import type { RoomClient, Signal } from './useRoom';
import { distance } from './world';
import { createVoicePeer } from './rtcPeer';
interface Peer { transport: ReturnType<typeof createVoicePeer>; audio: HTMLAudioElement }
export function useVoice(network: RoomClient) {
 const net = useRef(network); net.current = network;
 const [enabled, setEnabled] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [relay, setRelay] = useState(false), [openMic, setOpenMic] = useState(false), [pressed, setPressed] = useState(false), [proximity, setProximity] = useState(true), [connections, setConnections] = useState<Record<string, string>>({}), [level, setLevel] = useState(0);
 const stream = useRef<MediaStream | null>(null), context = useRef<AudioContext | null>(null), analyser = useRef<AnalyserNode | null>(null), peers = useRef(new Map<string, Peer>()), config = useRef<RTCConfiguration>({}), generation = useRef(0), talking = useRef(false), active = useRef(false), continuous = useRef(false);
 continuous.current = openMic;
 const updateMic = useCallback((pressed: boolean) => { setPressed(pressed); talking.current = continuous.current || pressed; stream.current?.getAudioTracks().forEach(t => { t.enabled = talking.current; }); }, []);
 const closePeer = useCallback((id: string) => { const p = peers.current.get(id); if (!p) return; p.transport.close(); p.audio.pause(); p.audio.srcObject = null; peers.current.delete(id); }, []);
 const stop = useCallback(() => { generation.current++; active.current = false; talking.current = false; stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; context.current?.close().catch(() => {}); context.current = null; analyser.current = null; for (const id of peers.current.keys()) closePeer(id); net.current.voiceState(false); setEnabled(false); setBusy(false); setPressed(false); setConnections({}); setLevel(0); }, [closePeer]);
 const ensurePeer = useCallback((id: string): Peer => {
  const existing = peers.current.get(id); if (existing) return existing;
  const audio = new Audio(); audio.autoplay = true;
  const transport = createVoicePeer({ stream: stream.current!, configuration: config.current, polite: net.current.room!.self.localeCompare(id) < 0,
   signal: value => net.current.signal(id, value),
   onStream: stream => { audio.srcObject = stream; void audio.play().catch(() => setError('浏览器暂停了声音，点击“恢复声音”继续。')); },
   onState: state => setConnections(old => ({ ...old, [id]: state })),
   onError: message => { if (active.current) setError(message); },
  });
  const peer = { transport, audio }; peers.current.set(id, peer); return peer;
 }, []);
 useEffect(() => network.onSignal((from: string, signal: Signal) => {
  if (!active.current || !net.current.room?.players.some(p => p.id === from && p.online)) return;
  void ensurePeer(from).transport.receive(signal);
 }), [network.onSignal, ensurePeer]);
 const start = useCallback(async () => {
  if (!net.current.room || !net.current.connected || active.current || busy) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) { setError('真人语音需要 HTTPS（或 localhost）和支持 WebRTC 的浏览器。'); return; }
  const epoch = ++generation.current; setBusy(true); setError('');
  let media: MediaStream | null = null;
  try { const ice = await api<{ relay: boolean; iceServers: RTCIceServer[] }>('/voice/ice'); media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); if (epoch !== generation.current) { media.getTracks().forEach(t => t.stop()); return; }
   config.current = { iceServers: ice.iceServers }; setRelay(ice.relay); stream.current = media; media.getAudioTracks().forEach(t => { t.enabled = continuous.current; }); talking.current = continuous.current; active.current = true;
   const audioContext = new AudioContext(); context.current = audioContext; await audioContext.resume(); if (epoch !== generation.current) { await audioContext.close(); return; } const meter = audioContext.createAnalyser(); meter.fftSize = 256; audioContext.createMediaStreamSource(media).connect(meter); analyser.current = meter;
   setEnabled(true); net.current.voiceState(true); setBusy(false);
  } catch (e) { media?.getTracks().forEach(t => t.stop()); if (epoch === generation.current) { stop(); setError(e instanceof Error ? e.name === 'NotAllowedError' ? '麦克风权限未开启。允许后可重新加入语音。' : e.message : '无法开启麦克风。'); } }
 }, [busy, stop]);
 const members = (network.room?.players || []).filter(p => p.id !== network.room?.self && p.online && p.voice).map(p => p.id).sort().join(',');
 useEffect(() => { if (!enabled || !network.connected) return; const ids = members ? members.split(',') : []; ids.forEach(ensurePeer); for (const id of peers.current.keys()) if (!ids.includes(id)) { closePeer(id); setConnections(old => { const next = { ...old }; delete next[id]; return next; }); } }, [enabled, network.connected, members, ensurePeer, closePeer]);
 useEffect(() => { if (!network.connected && enabled) { stop(); setError('房间连接已断开，语音已关闭。重连后重新加入语音。'); } }, [network.connected, enabled, stop]);
 useEffect(() => { stop(); return stop; }, [network.room?.code, stop]);
 useEffect(() => { if (!enabled) return; const bytes = new Uint8Array(256); const timer = setInterval(() => { analyser.current?.getByteTimeDomainData(bytes); let sum = 0; bytes.forEach(v => { sum += ((v - 128) / 128) ** 2; }); const value = talking.current ? Math.min(1, Math.sqrt(sum / bytes.length) * 5) : 0; setLevel(value); net.current.voiceState(true, value); }, 250); const down = (e: KeyboardEvent) => { if (e.code === 'KeyV' && !(e.target as HTMLElement)?.matches('input,textarea,select')) updateMic(true); }; const up = (e: KeyboardEvent) => { if (e.code === 'KeyV') updateMic(false); }; const blur = () => updateMic(false); window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur); return () => { clearInterval(timer); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); }; }, [enabled, updateMic]);
 useEffect(() => { talking.current = openMic || pressed; stream.current?.getAudioTracks().forEach(t => { t.enabled = talking.current; }); }, [openMic, pressed]);
 useEffect(() => { const world = network.room?.world, me = world?.actors[network.room?.self || '']; for (const [id, peer] of peers.current) { const other = world?.actors[id]; peer.audio.volume = proximity && me && other ? Math.max(0, Math.min(1, 1 - distance(me, other) / 18)) : 1; } }, [network.room?.world, proximity]);
 const resume = () => { setError(''); peers.current.forEach(p => { void p.audio.play().catch(() => setError('声音仍被浏览器阻止，请检查站点声音权限。')); }); };
 return { enabled, busy, error, relay, openMic, setOpenMic, pressed, updateMic, proximity, setProximity, connections, level, start, stop, resume };
}
export type VoiceClient = ReturnType<typeof useVoice>;
