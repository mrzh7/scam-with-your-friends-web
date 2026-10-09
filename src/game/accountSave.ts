import { api, ApiError, saveAccountCache, type SaveSettings, type AccountCache } from './storage';
import type { GameState } from './engine';
export interface SaveNotice { status: 'saved' | 'pending' | 'saving' | 'error' | 'conflict'; message: string; localError?: boolean }
type SaveResponse = { userId: string; revision: number };
type Sender = (value: AccountCache, keepalive: boolean) => Promise<SaveResponse>;
export class AccountSaveQueue {
 private value: AccountCache;
 private acknowledged: string;
 private pending: Promise<void> | null = null;
 private blocked = false;
 private disposed = false;
 constructor(userId: string, state: GameState, settings: SaveSettings, revision: number, dirty: boolean, private notify: (notice: SaveNotice) => void, private send: Sender = (value, keepalive) => api('/save', 'PUT', value, undefined, keepalive)) {
  this.value = { userId, state, settings, revision, dirty }; this.acknowledged = dirty ? '' : this.fingerprint(); this.cache();
 }
 private fingerprint() { return JSON.stringify({ state: this.value.state, settings: this.value.settings }); }
 private emit(notice: SaveNotice) { if (!this.disposed) this.notify(notice); }
 private cache() { const ok = saveAccountCache(this.value); if (!ok) this.emit({ status: 'error', message: '本机备份空间不足，请保持联网并导出存档。', localError: true }); }
 update(state: GameState, settings: SaveSettings) {
  this.value = { ...this.value, state, settings }; this.value.dirty = this.fingerprint() !== this.acknowledged; this.cache();
  if (this.value.dirty && !this.pending && !this.blocked) this.emit({ status: 'pending', message: '进度已保留在本机，等待自动同步…' });
 }
 async flush(keepalive = false): Promise<void> {
  if (this.blocked) throw new ApiError('请先载入云端进度，或导出本机副本。', 409);
  if (this.pending) { await this.pending; if (this.value.dirty && !keepalive) return this.flush(); return; }
  if (!this.value.dirty) return;
  const snapshot = { ...this.value }, fingerprint = this.fingerprint();
  this.emit({ status: 'saving', message: '正在保存到账号…' });
  this.pending = (async () => {
   try {
    const response = await this.send(snapshot, keepalive);
    if (response.userId !== this.value.userId || !Number.isSafeInteger(response.revision) || response.revision <= snapshot.revision) throw new ApiError('账号或存档版本已变化，请重新载入。', 409);
    this.value.revision = response.revision; this.acknowledged = fingerprint; this.value.dirty = this.fingerprint() !== fingerprint; this.cache();
    this.emit({ status: this.value.dirty ? 'pending' : 'saved', message: this.value.dirty ? '继续同步新进度…' : '进度已自动保存到账号' });
   } catch (error) {
    if (error instanceof ApiError && error.status === 409) this.blocked = true;
    this.emit({ status: this.blocked ? 'conflict' : 'error', message: error instanceof Error ? error.message : '暂时无法同步，已保留本机备份。' }); throw error;
   } finally { this.pending = null; }
  })();
  return this.pending;
 }
 replace(state: GameState, settings: SaveSettings, revision: number) {
  if (this.pending) throw new Error('正在保存，请稍后再载入。');
  this.value = { ...this.value, state, settings, revision, dirty: false }; this.acknowledged = this.fingerprint(); this.blocked = false; this.cache(); this.emit({ status: 'saved', message: '已载入账号的云端进度' });
 }
 activate() { this.disposed = false; }
 dispose() { this.disposed = true; }
}
