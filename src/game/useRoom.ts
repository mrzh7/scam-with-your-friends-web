import {getLocale} from '../i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './storage';
import type { Action, GameState } from './engine';
import type { World, Input, WorldCommand } from './world';
export interface Signal { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }
export interface RoomSnapshot { type: 'state'; code: string; self: string; host: string; total: number; game: GameState; world: World; players: { id: string; name: string; earned: number; online: boolean; voice: boolean; talking: number }[]; chats: { name: string; text: string }[] }
export function useRoom() {
 const [room, setRoom] = useState<RoomSnapshot | null>(null), [status, setStatus] = useState(''), [hint, setHint] = useState(''), [connected, setConnected] = useState(false), [aiBusy, setAiBusy] = useState(false), [aiError, setAiError] = useState('');
 const socket = useRef<WebSocket | null>(null), generation = useRef(0), roomCode = useRef(''), handlers = useRef(new Set<(from: string, signal: Signal) => void>());
 const aiTimer=useRef<ReturnType<typeof setTimeout>|null>(null), aiPending=useRef(false);
 const clearAI=useCallback(()=>{if(aiTimer.current)clearTimeout(aiTimer.current);aiPending.current=false;setAiBusy(false);},[]);
 useEffect(()=>()=>{if(aiTimer.current)clearTimeout(aiTimer.current);},[]);
 const raw = useCallback((data: unknown) => { if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(data)); }, []);
 const connect = useCallback((code: string) => {
  const gen = ++generation.current; socket.current?.close(); roomCode.current = code; setStatus('正在连接办公室…'); clearAI();
  const ws = new WebSocket((location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/api/rooms/' + code + '/socket'); socket.current = ws;
  ws.onopen = () => { if (generation.current === gen) { setConnected(true); setStatus(''); } };
  ws.onmessage = e => { if (generation.current !== gen) return; try { const data = JSON.parse(e.data); if (data.type === 'state') setRoom(data); else if (data.type === 'world') setRoom(old => old ? { ...old, world: data.world } : old); else if (data.type === 'error') setStatus(String(data.error)); else if (data.type === 'hint') { setHint(''); queueMicrotask(() => setHint(String(data.message))); } else if (data.type === 'signal') handlers.current.forEach(h => h(data.from, data.signal)); else if (data.type === 'dialogue-status') { if(!data.busy)clearAI();setAiBusy(!!data.busy); setAiError(data.error || ''); } } catch { setStatus('收到无效房间数据。'); } };
  ws.onerror = () => { if (generation.current === gen) setStatus('连接失败，请检查网络后重连。'); };
  ws.onclose = event => { if (generation.current === gen) { if (event.code === 4001) window.dispatchEvent(new Event('swyf-auth-required')); setConnected(false); clearAI(); setStatus('连接已断开。点击重新连接回到同一房间。'); } };
 }, []);
 const join = useCallback(async (name: string, code?: string) => { const result = await api<{ code: string }>('/rooms', 'POST', { name, code }); connect(result.code); }, [connect]);
 const leave = useCallback(() => { generation.current++; socket.current?.close(); socket.current = null; roomCode.current = ''; setRoom(null); setConnected(false); setStatus(''); clearAI(); }, [clearAI]);
 useEffect(() => () => { generation.current++; socket.current?.close(); }, []);
 const send = useCallback((action: Action) => raw({ type: 'action', action }), [raw]);
 const chat = useCallback((text: string) => { if (text.trim()) raw({ type: 'chat', text }); }, [raw]);
 const move = useCallback((input: Input) => raw({ type: 'input', input }), [raw]);
 const worldCommand = useCallback((command: WorldCommand) => raw({ type: 'world-command', command }), [raw]);
 const dialogue = useCallback((text: string) => { if (socket.current?.readyState !== WebSocket.OPEN) { setAiError('房间连接已断开。'); return; } if(aiPending.current)return;aiPending.current=true;setAiBusy(true); setAiError('');aiTimer.current=setTimeout(()=>{clearAI();setAiError('等待 AI 回复超时，请重试本条应答。');},28000); raw({ type: 'dialogue', text, locale:getLocale() }); }, [raw]);
 const phoneSpeech = useCallback((level: number) => raw({type:'phone-speech', level}),[raw]);
 const signal = useCallback((to: string, signal: Signal) => raw({ type: 'signal', to, signal }), [raw]);
 const voiceState = useCallback((enabled: boolean, level = 0) => raw({ type: 'voice-state', enabled, level }), [raw]);
 const onSignal = useCallback((handler: (from: string, signal: Signal) => void) => { handlers.current.add(handler); return () => { handlers.current.delete(handler); }; }, []);
 return { room, status, hint, connected, join, leave, send, chat, move, worldCommand, dialogue, aiBusy, aiError, phoneSpeech, signal, voiceState, onSignal, reconnect: () => { if (roomCode.current) connect(roomCode.current); } };
}
export type RoomClient = ReturnType<typeof useRoom>;

