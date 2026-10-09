import {digest,passwordHash,rateLimit,type Env,type UserRow} from './auth';
import {authOrigin} from './oauth';
import {normalizeLocale,type Locale} from '../src/i18n/locales';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export const emailVerified=(user:UserRow)=>!user.email || !!user.email_verified_at;
export const mailConfigured=(env:Env)=>!!(env.RESEND_API_KEY?.trim()&&env.EMAIL_FROM?.trim()&&env.AUTH_ORIGIN?.startsWith('https://'));
const mailText:Record<Locale,[string,string,string]>={
 en:['Verify your email','Open this link to verify your email and set your password. It expires in 24 hours.','If you did not request this, ignore this email.'],
 zh:['验证邮箱','打开以下链接，验证邮箱并设置密码。链接 24 小时内有效。','如果不是你发起的请求，请忽略这封邮件。'],
 pt:['Confirme seu e-mail','Abra este link para confirmar seu e-mail e definir sua senha. Ele expira em 24 horas.','Se você não fez esta solicitação, ignore este e-mail.'],
 ja:['メールアドレスの確認','以下のリンクを開き、メールアドレスを確認してパスワードを設定してください。有効期限は24時間です。','心当たりがない場合は、このメールを無視してください。'],
 es:['Verifica tu correo','Abre este enlace para verificar tu correo y establecer tu contraseña. Caduca en 24 horas.','Si no lo solicitaste, ignora este mensaje.']
};
const queued={ok:true,verificationRequired:true};
export async function sendVerification(request:Request,env:Env,user:UserRow,locale:unknown,fetcher:typeof fetch=fetch){
 if(!user.email||emailVerified(user))return;
 const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join(''),hash=await digest(token),now=Date.now();
 const claimed=await env.DB.prepare('INSERT INTO email_verifications(user_id,token_hash,expires_at,sent_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at,sent_at=excluded.sent_at WHERE email_verifications.sent_at<=? RETURNING user_id').bind(user.id,hash,now+86400000,now,now-60000).first();
 if(!claimed)return;
 try{
  const origin=authOrigin(request,env),link=origin+'/#verify-email='+token;
  const [subject,instructions,ignore]=mailText[normalizeLocale(locale)];
  const response=await fetcher('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'verify-'+hash},body:JSON.stringify({from:env.EMAIL_FROM,to:[user.email],subject,text:instructions+'\n\n'+link+'\n\n'+ignore})});
  if(!response.ok){
   let diagnostic='provider_rejected';
   try{const error=await response.json() as {message?:string};const message=String(error.message||'').toLowerCase();
    if(message.includes('not verified'))diagnostic='domain_not_verified';
    else if(message.includes('testing emails'))diagnostic='sandbox_recipient';
    else if(message.includes('api key')||response.status===401)diagnostic='invalid_api_key';
   }catch{/* Never log upstream bodies or credentials. */}
   console.warn('EMAIL_DELIVERY_REJECTED',response.status,diagnostic);throw Error('MAIL_FAILED');
  }
  const result=await response.json() as {id?:unknown};if(typeof result.id!=='string'||!result.id)throw Error('MAIL_FAILED');
 }catch{
  await env.DB.prepare('DELETE FROM email_verifications WHERE user_id=? AND token_hash=?').bind(user.id,hash).run();
  throw Error('MAIL_FAILED');
 }
}
export async function requestVerification(request:Request,env:Env,data:Record<string,unknown>,register=false){
 const email=String(data.email||'').trim().toLowerCase(),name=String(data.name||'').trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||(register&&(!name||name.length>24)))return json({error:'请输入有效邮箱和员工昵称。'},400);
 if(!mailConfigured(env))return json({error:'邮箱验证服务暂未开放，请使用 Google 登录或稍后再试。',code:'EMAIL_UNAVAILABLE'},503);
 if(new URL(request.url).origin!==authOrigin(request,env))return json({error:'请在正式站点发起登录。'},400);
 if(!await rateLimit(request,env,'email-verification',5)||!await rateLimit(request,env,'email-recipient-'+await digest(email),3))return json({error:'验证邮件请求过于频繁，请稍后重试。'},429);
 // The sender address is canonical server configuration, never a client-provided URL.
 if(register)await env.DB.prepare('INSERT OR IGNORE INTO users(id,email,name,guest,created_at) VALUES (?,?,?,0,?)').bind(crypto.randomUUID(),email,name,Date.now()).run();
 const user=await env.DB.prepare('SELECT * FROM users WHERE email=? AND guest=0').bind(email).first<UserRow>();
 try{if(user)await sendVerification(request,env,user,data.locale);}catch{return json({error:'验证邮件发送失败，请稍后重新发送。',code:'EMAIL_DELIVERY_FAILED'},502);}
 // Do not reveal whether this address already owns a verified account.
 return json(queued,202);
}
export async function verifyEmail(request:Request,env:Env,data:Record<string,unknown>){
 if(!await rateLimit(request,env,'email-confirm',20))return json({error:'验证请求过于频繁，请稍后重试。'},429);
 const token=String(data.token||''),password=String(data.password||'');
 if(!/^[a-f0-9]{64}$/.test(token))return json({error:'验证链接无效或已过期，请重新发送验证邮件。'},400);
 if(password.length<10||password.length>128)return json({error:'密码需要 10–128 位。'},400);
 const tokenHash=await digest(token),now=Date.now(),salt=crypto.randomUUID(),hash=await passwordHash(password,salt);
 // Transaction: consume one token, set an owner-chosen password, revoke all old sessions.
 const results=await env.DB.batch([
  env.DB.prepare('UPDATE users SET email_verified_at=?,password_hash=?,salt=? WHERE email_verified_at IS NULL AND id=(SELECT user_id FROM email_verifications WHERE token_hash=? AND expires_at>?) RETURNING id').bind(now,hash,salt,tokenHash,now),
  env.DB.prepare('DELETE FROM sessions WHERE user_id=(SELECT user_id FROM email_verifications WHERE token_hash=? AND expires_at>?)').bind(tokenHash,now),
  env.DB.prepare('DELETE FROM email_verifications WHERE token_hash=?').bind(tokenHash)
 ]);
 if(!results[0].results.length)return json({error:'验证链接无效或已过期，请重新发送验证邮件。'},400);
 return Response.json({ok:true},{headers:{'Cache-Control':'no-store','Set-Cookie':'swyf_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'+(new URL(request.url).protocol==='https:'?'; Secure':'')}});
}
