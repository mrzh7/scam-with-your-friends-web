import {getLocale} from '../i18n';
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { api } from './storage';
import { applyDialogue, type GameState, type DialogueResult } from './engine';
import type { RoomClient } from './useRoom';
export function useDialogue(network: RoomClient, game: GameState, setGame: Dispatch<SetStateAction<GameState>>) {
 const [missing, setMissing] = useState<string[]>(['API Key', '模型 ID']), [testing, setTesting] = useState(false), [configError, setConfigError] = useState('');
 const preference = useRef(true); const initialized = useRef(false);
 const [available, setAvailable] = useState(false), [enabled, updateEnabled] = useState(false), [model, setModel] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
 const refs = useRef({ network, game, setGame }); refs.current = { network, game, setGame }; const pending = useRef(false), alive = useRef(true);
 const request = useRef<AbortController|null>(null), requestVersion=useRef(0);
 useEffect(()=>{requestVersion.current++;request.current?.abort();pending.current=false;setBusy(false);setError('');return()=>{requestVersion.current++;request.current?.abort();};},[game.call?.id,game.call?.status,enabled,network.room?.code]);
 const setEnabled = useCallback((value: boolean) => { preference.current = value; try { localStorage.setItem('swyf-ai-enabled', String(value)); } catch { /* Storage is optional. */ } updateEnabled(value); }, []);
 const check = useCallback(async () => {
  try {
   const config = await api<{ ai: boolean; model: string | null; missing: string[] }>('/config');
   if (alive.current) {
    setAvailable(config.ai); setModel(config.model || ''); setMissing(config.missing || []); setConfigError('');
    if (!initialized.current) { try { preference.current = localStorage.getItem('swyf-ai-enabled') !== 'false'; } catch {} initialized.current = true; }
    updateEnabled(config.ai && preference.current);
   }
   return config.ai;
  } catch { if (alive.current) setConfigError('网站 AI 服务暂不可用，请稍后重试。'); return false; }
 }, []);
 const testAndEnable = useCallback(async () => {
  if (pending.current) return;
  setTesting(true); setConfigError('');
  try { if (await check()) { if (alive.current) setEnabled(true); } else { setConfigError('网站 AI 服务暂不可用，请稍后重试。'); } }
  catch (e) { if (alive.current) { setEnabled(false); setConfigError(e instanceof Error ? e.message : '连接测试失败。'); } }
  finally { if (alive.current) setTesting(false); }
 }, [setEnabled,check]);
 useEffect(() => { alive.current = true; void check(); return () => { alive.current = false; }; }, [check]);
 const send = useCallback(async (text: string) => { const { network, game } = refs.current; if (!text.trim() || pending.current) return;
  if (network.room) { network.dialogue(text); return; }
  pending.current = true; setBusy(true); setError('');const version=++requestVersion.current;const controller=new AbortController();request.current=controller;const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(28000)]);
  try { await api('/session', 'POST', undefined, signal); const result = await api<DialogueResult>('/dialogue', 'POST', { state: game, text: text.slice(0, 200), locale:getLocale() },signal); if (alive.current&&requestVersion.current===version) refs.current.setGame(current => applyDialogue(current, text, result)); }
  catch (e) { if (alive.current&&requestVersion.current===version&&!controller.signal.aborted) setError(signal.aborted?'等待 AI 回复超时，已恢复发送。请重试本条应答。':e instanceof Error ? e.message : 'AI 无法响应，本次通话未被改变。'); }
  finally { if(requestVersion.current===version){pending.current = false; if (alive.current) setBusy(false);} }
 }, []);
 return { available, enabled, setEnabled, model, missing, testing, configError, testAndEnable, busy: network.room ? network.aiBusy : busy, error: network.room ? network.aiError : error, send, check };
}
export type DialogueClient = ReturnType<typeof useDialogue>;
