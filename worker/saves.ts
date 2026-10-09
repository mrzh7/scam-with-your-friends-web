import {locales,type LanguagePreference} from '../src/i18n/locales';
import { newGame, parseSave } from '../src/game/engine';
import type { Env, UserRow } from './auth';
export function parseSettings(value: unknown) {
 if (value === undefined) return undefined;
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_SETTINGS');
 const v = value as Record<string, unknown>;
 if (typeof v.sound !== 'boolean' || !['mountain', 'teal', 'night'].includes(String(v.wallpaper))) throw new Error('INVALID_SETTINGS');
 if(v.language!==undefined&&v.language!=='auto'&&!locales.includes(v.language as never))throw new Error('INVALID_SETTINGS');
 return { sound: v.sound, wallpaper: String(v.wallpaper), ...(v.language!==undefined?{language:v.language as LanguagePreference}:{}) };
}
export async function ensureSave(env: Env, userId: string) {
 await env.DB.prepare('INSERT OR IGNORE INTO saves(user_id,state_json,revision,updated_at) VALUES (?,?,0,?)').bind(userId, JSON.stringify(newGame(crypto.getRandomValues(new Uint32Array(1))[0])), Date.now()).run();
}
export async function readSave(env: Env, userId: string) {
 await ensureSave(env, userId);
 const row = await env.DB.prepare('SELECT state_json,settings_json,revision,updated_at FROM saves WHERE user_id=?').bind(userId).first<{ state_json: string; settings_json: string; revision: number; updated_at: number }>();
 if (!row) throw new Error('Missing save');
 return { userId, state: JSON.parse(row.state_json), settings: JSON.parse(row.settings_json), revision: row.revision, updatedAt: row.updated_at };
}
export async function writeSave(env: Env, user: UserRow, data: Record<string, unknown>) {
 if (data.userId !== user.id) return { status: 409, body: { error: '账号已切换，请重新载入后继续。', code: 'ACCOUNT_CHANGED' } };
 const state = parseSave(data.state);
 if (!state || !Number.isSafeInteger(data.revision) || Number(data.revision) < 0) return { status: 400, body: { error: '存档格式无效。' } };
 let settings; try { settings = parseSettings(data.settings); } catch { return { status: 400, body: { error: '偏好设置格式无效。' } }; }
 await ensureSave(env, user.id);
 const now = Date.now();
 const result = await env.DB.prepare('UPDATE saves SET state_json=?, settings_json=COALESCE(?,settings_json), revision=revision+1, updated_at=? WHERE user_id=? AND revision=? RETURNING revision').bind(JSON.stringify(state), settings ? JSON.stringify(settings) : null, now, user.id, data.revision).first<{ revision: number }>();
 return result ? { status: 200, body: { userId: user.id, revision: result.revision, updatedAt: now } } : { status: 409, body: { error: '另一台设备已经更新进度。请载入云端进度后继续。', code: 'SAVE_CONFLICT' } };
}
