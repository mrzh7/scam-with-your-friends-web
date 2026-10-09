import type {LanguagePreference} from '../i18n/locales';
import { parseSave, type GameState } from './engine';
export interface Account { anonymous?: boolean; id: string; name: string; email: string; emailVerified?: boolean }
export interface SaveSettings { sound: boolean; wallpaper: string; language?: LanguagePreference }
export const defaultSettings: SaveSettings = { sound: false, wallpaper: 'mountain' };
export interface AccountCache { userId: string; state: GameState; settings: SaveSettings; revision: number; dirty: boolean }
const key = (id: string) => 'kolkata-account-v2:' + id;
export function loadLegacySave(): GameState | null { try { return parseSave(JSON.parse(localStorage.getItem('kolkata-save-v1') || 'null')); } catch { return null; } }
export function loadAccountCache(userId: string, recovery = false): AccountCache | null {
 try { const v = JSON.parse(localStorage.getItem(key(userId) + (recovery ? ':recovery' : '')) || 'null'); const state = parseSave(v?.state); return v?.userId === userId && state && Number.isSafeInteger(v.revision) ? { ...v, state } : null; } catch { return null; }
}
export function saveAccountCache(value: AccountCache, recovery = false) { try { localStorage.setItem(key(value.userId) + (recovery ? ':recovery' : ''), JSON.stringify(value)); return true; } catch { return false; } }
export function exportSave(state: GameState) { const url = URL.createObjectURL(new Blob([JSON.stringify({ format: 'kolkata-save', savedAt: new Date().toISOString(), state }, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'kolkata-day-' + state.day + '.json'; a.click(); URL.revokeObjectURL(url); }
export class ApiError extends Error { constructor(message: string, public status: number, public code?: string) { super(message); } }
export async function api<T>(path: string, method = 'GET', body?: unknown, signal: AbortSignal = AbortSignal.timeout(28000), keepalive = false): Promise<T> {
 const response = await fetch('/api' + path, { method, signal, keepalive, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
 let data: unknown; try { data = await response.json(); } catch { throw new ApiError('服务器暂不可用，请稍后重试。', response.status); }
 if (!response.ok) {
  const error = data as { error?: string; code?: string };
  if (response.status === 401 && !['/auth/login', '/auth/register'].includes(path) && typeof window !== 'undefined') window.dispatchEvent(new Event('swyf-auth-required'));
  throw new ApiError(error.error || '请求失败', response.status, error.code);
 }
 return data as T;
}
