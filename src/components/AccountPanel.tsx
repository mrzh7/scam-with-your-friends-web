import {t,literal} from '../i18n';
import { useEffect, useState } from 'react';
import { api, type Account } from '../game/storage';
import { Icon } from './Icon';
export function AccountPanel({ account, providers, beforeRedirect, logout, resume, settings }: { account: Account; providers: { google: boolean; wechat: boolean }; beforeRedirect: () => Promise<void>; logout: () => Promise<void>; resume: (code: string) => Promise<void>; settings: () => void }) {
 const [linked, setLinked] = useState<string[]>([]), [rooms, setRooms] = useState<{code: string; day: number; balance: number; phase: string}[]>([]), [error, setError] = useState(''), [busy, setBusy] = useState(false);
 useEffect(() => { let alive = true; void Promise.all([account.anonymous?Promise.resolve({providers:[]}):api<{providers: string[]}>('/auth/identities'), api<{rooms: typeof rooms}>('/account/rooms')]).then(([identities, history]) => { if (alive) { setLinked(identities.providers); setRooms(history.rooms); } }).catch(e => { if (alive) setError(e.message); }); return () => { alive = false; }; }, [account.id,account.anonymous]);
 const action = async (work: () => Promise<void>) => { setBusy(true); setError(''); try { await work(); } catch(e) { setError((e as Error).message); } finally { setBusy(false); } };
 return <div className="modal-content account-content"><span className="account-emblem"><Icon name="user" size={28}/></span><h2>{t("你好，{0}。", [literal(account.name)])}</h2>{account.email && <p>{account.email}</p>}<p>{t(account.anonymous ? "免账户模式：进度绑定当前浏览器，请定期导出备份。" : "进度、金币、背包、订单和成就自动保存在当前账号。")}</p>
  {!account.anonymous && <><div className="account-links">{(['google'] as const).map(provider => <button key={provider} disabled={busy || !providers[provider] || linked.includes(provider)} onClick={() => void action(async () => { await beforeRedirect(); const data = await api<{url: string}>('/auth/' + provider + '/start', 'POST', {link: true}); location.assign(data.url); })}>{t(provider === 'google' ? 'Google' : '微信')} · {t(linked.includes(provider) ? '已绑定' : providers[provider] ? '绑定到当前账号' : '暂未开放')}</button>)}</div><small>{t("绑定后，两种登录方式共用同一份账号进度。")}</small></>}
  <button className="blue full" onClick={settings}>{t("管理进度与备份")}</button>
  {rooms.length > 0 && <section className="account-rooms"><h3>{t("我的多人办公室")}</h3><p>{t("每个房间保留独立的一局进度与金币。")}</p>{rooms.map(room => <button key={room.code} disabled={busy} onClick={() => void action(() => resume(room.code))}><strong>{room.code}</strong><span>{t("第 {0} 天 · {1}", [room.day, '$' + room.balance])}<small>{t("回到这间办公室 →")}</small></span></button>)}</section>}
  {!account.anonymous && <button className="text-danger" disabled={busy} onClick={() => void action(logout)}>{t(busy ? '正在处理…' : '保存并退出账号')}</button>}{error && <p className="form-error" role="alert">{t(error)}</p>}
 </div>;
}
