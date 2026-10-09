import {EmailVerification} from './EmailVerification';
import {getLocale} from '../i18n';
import {setLanguage} from '../i18n';
import {t} from '../i18n';
import {LanguageSelector} from '../i18n/LanguageSelector';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, defaultSettings, loadAccountCache, saveAccountCache, type Account, type SaveSettings } from '../game/storage';
import { parseSave, type GameState } from '../game/engine';
import { Icon } from './Icon';
export interface AccountSession { user: Account; state: GameState; settings: SaveSettings; revision: number; dirty: boolean; providers: { google: boolean; wechat: boolean } }
export function AccountGate({ children }: { children: (session: AccountSession, logout: () => Promise<void>) => ReactNode }) {
 const [session, setSession] = useState<AccountSession | null>(null), [checking, setChecking] = useState(true), [busy, setBusy] = useState(false);
 const [mode, setMode] = useState<'login' | 'register'>('login'), [error, setError] = useState(''), [notice, setNotice] = useState('');
 const [accountsMode, setAccountsMode] = useState<boolean | null>(null);
 const [providers, setProviders] = useState({ google: false, wechat: false });
 const [verificationEmail,setVerificationEmail]=useState<string|null>(null),[verificationToken,setVerificationToken]=useState<string|null>(()=>new URLSearchParams(location.hash.slice(1)).get('verify-email'));
 const current = useRef(session); current.current = session;
 const version = useRef(0), alive = useRef(true);
 const refresh = useCallback(async () => {
  const generation = ++version.current; setChecking(true);
  try {
   const identity = await api<{ user: Account | null; accountsEnabled?: boolean }>('/auth/me');
   let user = identity.user;
   if (!alive.current || generation !== version.current) return;
   setAccountsMode(identity.accountsEnabled !== false);
   if (identity.accountsEnabled === false) {
    setVerificationToken(null);
    if (!user) user = (await api<{user:Account}>('/session/anonymous','POST',{})).user;
    if (!alive.current || generation !== version.current) return;
   }
   if (!user) { setSession(null); return; }
   if(user.emailVerified===false){setSession(null);setVerificationEmail(user.email);return;}
   setVerificationEmail(null);
   const data = await api<{ userId: string; state: unknown; revision: number; settings: Partial<SaveSettings> }>('/save');
   if (!alive.current || generation !== version.current) return;
   const state = parseSave(data.state); if (data.userId !== user.id || !state || !Number.isSafeInteger(data.revision)) throw new Error('账号进度无法读取，请重试。');
   const cached = loadAccountCache(user.id), recover = !!(cached?.dirty && cached.revision === data.revision);
   if (cached?.dirty && !recover) { saveAccountCache(cached, true); setNotice('云端已有更新，已载入云端进度。本机未同步副本可在设置中导出。'); }
   const savedLanguage=(recover?cached!.settings:data.settings).language;if(savedLanguage)setLanguage(savedLanguage);
   setSession({ user, state: recover ? cached!.state : state, settings: { ...defaultSettings, ...(recover ? cached!.settings : data.settings) }, revision: data.revision, dirty: recover, providers: { google: false, wechat: false } });
  } catch (e) { if (alive.current && generation === version.current) { setSession(null); setError(e instanceof Error ? e.message : '暂时无法登录。'); } }
  finally { if (alive.current && generation === version.current) setChecking(false); }
 }, []);
 const broadcast = (id: string) => { try { localStorage.setItem('swyf-account-change', JSON.stringify({ id, at: Date.now() })); } catch {} };
 useEffect(() => {
  alive.current = true;
  if(new URLSearchParams(location.hash.slice(1)).has('verify-email'))history.replaceState(null,'',location.pathname+location.search);
  const url = new URL(location.href), failure = url.searchParams.get('auth_error');
  const errors: Record<string, string> = { expired: '登录确认已过期，请重新发起登录。', denied: '你取消了授权，可以选择其他登录方式。', failed: '第三方登录未完成，请重试或使用邮箱登录。', not_configured: '此登录方式暂未开放。', identity_conflict: '这个第三方身份已绑定其他账号，或当前账号已绑定同类身份。请使用原账号登录。' };
  if (failure) { setError(errors[failure] || errors.failed); setNotice(errors[failure] || errors.failed); }
  if (url.searchParams.get('auth') === 'linked') setNotice('登录方式已绑定，可使用它登录同一份员工档案。');
  if (url.searchParams.has('auth') || failure) { url.searchParams.delete('auth'); url.searchParams.delete('auth_error'); history.replaceState(null, '', url.pathname + url.search + url.hash); broadcast('changed'); }
  void api<typeof providers>('/auth/providers').then(setProviders).catch(() => {});
  void refresh();
  const required = () => { version.current++; setSession(null); setChecking(false); setError('登录已失效，请重新登录。你的本机备份仍然保留。'); };
  const verify = async () => {
   if (!current.current) return;
   try { const data = await api<{ user: Account | null }>('/auth/me'); if (data.user?.id !== current.current?.user.id || data.user?.emailVerified===false) { setSession(null); await refresh(); } } catch { /* Autosave shows network errors without assigning data to a different account. */ }
  };
  const changed = (event: StorageEvent) => { if (event.key === 'swyf-account-change') { setSession(null); void refresh(); } };
  const timer = setInterval(() => { void verify(); }, 30000);
  window.addEventListener('focus', verify); window.addEventListener('swyf-auth-required', required); window.addEventListener('storage', changed);
  return () => { alive.current = false; version.current++; clearInterval(timer); window.removeEventListener('focus', verify); window.removeEventListener('swyf-auth-required', required); window.removeEventListener('storage', changed); };
 }, [refresh]);
 const logout = async () => { await api('/auth/logout', 'POST'); version.current++; setSession(null); setError(''); setNotice(''); broadcast(''); };
 const social = async (provider: 'google' | 'wechat') => {
  setBusy(true); setError('');
  try { const result = await api<{ url: string }>('/auth/' + provider + '/start', 'POST', {}); location.assign(result.url); } catch (e) { setError((e as Error).message); setBusy(false); }
 };
 if (session && !checking && !verificationToken) return <>{notice && <div className="auth-notice" role="status">{t(notice)}<button onClick={() => setNotice('')} aria-label={t("关闭账号提示")}>×</button></div>}{t(children({ ...session, providers }, logout))}</>;
 if (checking || accountsMode === false || accountsMode === null) return <main className="auth-screen"><LanguageSelector/><section className="auth-card"><h1>{t("正在载入游戏…")}</h1>{error && <p role="alert">{t(error)}</p>}{!checking && <button onClick={() => {setError('');void refresh();}}>{t("重试")}</button>}</section></main>;
 return <main className="auth-screen"><LanguageSelector/>
  <section className="auth-brand"><span className="auth-kicker">{t("KOLKATA CALL CENTER · EMPLOYEE PORTAL")}</span><div className="game-logo"><h1>{t("AI")}<span>{t("CALL")}</span><strong>{t("CENTER")}<span className="logo-dot">.</span></strong></h1></div><p>{t("先领工牌，再来上班。")}</p><small>{t("你的进度、金币、道具和成就，跟着账号走。")}</small><div className="auth-stamp">{t("NOW HIRING")}<br/>{t("QUESTIONABLE TALENT.")}</div></section>
  <section className="auth-card" aria-label={t("注册和登录")}><span className="account-emblem"><Icon name="user" size={28}/></span><small>{t("EMPLOYEE ACCESS")}</small><h1>{t(checking ? '正在核对员工档案…' : mode === 'login' ? '欢迎回来，打工人。' : '领取你的新工牌。')}</h1><p>{t("注册或登录后才能开始游戏。首次第三方登录将自动创建账号。")}</p>
   {notice&&<p role="status">{t(notice)}</p>}
   {checking ? <div role="status" className="auth-loading">{t("正在确认登录并载入账号进度…")}</div> : (verificationToken||verificationEmail!==null)?<EmailVerification token={verificationToken} email={verificationEmail||''} onBack={()=>{setMode('login');setVerificationToken(null);setVerificationEmail(null);void logout();}} onVerified={()=>{setMode('login');setVerificationToken(null);setVerificationEmail(null);setNotice('邮箱验证成功，请使用刚设置的密码登录。');broadcast('changed');void refresh();}}/> : <>
    <div className="social-logins"><button className="google-login" disabled={busy || !providers.google} onClick={() => void social('google')}><b aria-hidden="true">{t("G")}</b>{t("使用 Google 登录")}{!providers.google && <small>{t("暂未开放")}</small>}</button></div>
    <div className="or-divider">{t("或使用邮箱")}</div>
    <form onSubmit={async event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); setBusy(true); setError(''); try { const result = await api<{ user?: Account }>('/auth/' + mode, 'POST', {...data,locale:getLocale()}); if(mode==='register'){setVerificationEmail(String(data.email));}else if(result.user){broadcast(result.user.id);await refresh();} } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>
     {mode === 'register' && <label>{t("员工昵称")}<input name="name" required maxLength={24} autoComplete="nickname" placeholder={t("老板该怎么称呼你")}/></label>}
     <label>{t("邮箱")}<input name="email" type="email" required maxLength={254} autoComplete="email" placeholder={t("you@example.com")}/></label>
     {mode==='login'&&<label>{t("密码")}<input name="password" type="password" required minLength={10} maxLength={128} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={t("至少 10 位")}/></label>}
     <button className="yellow full" disabled={busy}>{t(busy ? '正在办理…' : mode === 'login' ? '登录并载入进度' : '发送验证邮件')}<Icon name="right" size={18}/></button>
     <button type="button" className="switch-auth" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{t(mode === 'login' ? '还没有账号？注册一个' : '已有账号？返回登录')}</button>
    </form>
    <button className="switch-auth" disabled={busy} onClick={()=>{setError('');setVerificationEmail('');}}>{t("重新发送验证邮件")}</button>
   </>}
   {error && <div className="form-error" role="alert">{t(error)}<button className="auth-retry" onClick={() => { setError(''); void refresh(); }}>{t("重新检查登录状态")}</button></div>}
   <footer>{t("非官方网页重制 · 角色与事件均为虚构")}</footer>
  </section>
 </main>;
}
