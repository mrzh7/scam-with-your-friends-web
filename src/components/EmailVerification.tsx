import {useState} from 'react';
import {t,getLocale,literal} from '../i18n';
import {api} from '../game/storage';
export function EmailVerification({token,email,onBack,onVerified}:{token:string|null;email:string;onBack:()=>void;onVerified:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState(false);
 return <section className="email-verification">
  <h2>{t(token?'验证邮箱并设置密码':'请检查你的邮箱')}</h2>
  <p>{t(token?'请设置你自己的密码，完成邮箱验证后再登录。':'如果该邮箱尚未验证，你将收到一封验证邮件。链接 24 小时内有效，请同时检查垃圾邮件。')}</p>
  {email&&<p>{t('邮箱：{0}',[literal(email)])}</p>}
  {token?<form onSubmit={async e=>{e.preventDefault();const data=new FormData(e.currentTarget),password=String(data.get('password')||'');if(password!==data.get('confirm')){setError('两次输入的密码不一致。');return;}setBusy(true);setError('');try{await api('/auth/verification/confirm','POST',{token,password});onVerified();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
   <label>{t('设置密码')}<input type="password" name="password" autoComplete="new-password" required minLength={10} maxLength={128}/></label>
   <label>{t('再次输入密码')}<input type="password" name="confirm" autoComplete="new-password" required minLength={10} maxLength={128}/></label>
   <button className="yellow full" disabled={busy}>{t(busy?'正在办理…':'验证邮箱并设置密码')}</button>
  </form>:null}
  <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');setSent(false);try{const data=Object.fromEntries(new FormData(e.currentTarget));await api('/auth/verification/send','POST',{...data,locale:getLocale()});setSent(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
   <label>{t('邮箱')}<input name="email" type="email" defaultValue={email} required maxLength={254} autoComplete="email"/></label>
   <button className="blue full" disabled={busy}>{t('重新发送验证邮件')}</button>
  </form>
  {sent&&<p role="status">{t('如果该邮箱尚未验证，验证邮件已提交发送。请等待至少一分钟后再重发。')}</p>}
  {error&&<p className="form-error" role="alert">{t(error)}</p>}
  <button className="switch-auth" disabled={busy} onClick={onBack}>{t('返回登录')}</button>
 </section>;
}

