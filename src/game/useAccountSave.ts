import { useEffect, useRef, useState } from 'react';
import { AccountSaveQueue, type SaveNotice } from './accountSave';
import type { GameState } from './engine';
import type { SaveSettings } from './storage';
export function useAccountSave(userId: string, state: GameState, settings: SaveSettings, revision: number, dirty: boolean) {
 const [notice, setNotice] = useState<SaveNotice>({ status: dirty ? 'pending' : 'saved', message: dirty ? '恢复了尚未同步的本机进度' : '账号进度已载入' });
 const queue = useRef<AccountSaveQueue | null>(null);
 if (!queue.current) queue.current = new AccountSaveQueue(userId, state, settings, revision, dirty, value => queueMicrotask(() => setNotice(value)));
 useEffect(() => { queue.current!.update(state, settings); }, [state, settings.sound, settings.wallpaper, settings.language]);
 useEffect(() => {
  queue.current!.activate();
  const timer = setInterval(() => { void queue.current!.flush().catch(() => {}); }, 5000);
  const save = () => { void queue.current!.flush(true).catch(() => {}); };
  const visibility = () => { if (document.hidden) save(); };
  window.addEventListener('pagehide', save); window.addEventListener('online', save); document.addEventListener('visibilitychange', visibility);
  if (dirty) void queue.current!.flush().catch(() => {});
  return () => { clearInterval(timer); window.removeEventListener('pagehide', save); window.removeEventListener('online', save); document.removeEventListener('visibilitychange', visibility); queue.current!.dispose(); };
 }, []);
 return { notice, flush: () => queue.current!.flush(), replace: (state: GameState, settings: SaveSettings, revision: number) => queue.current!.replace(state, settings, revision) };
}
