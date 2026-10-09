import {t} from '../i18n';
import { useEffect, useState } from 'react';
import type { DialogueClient } from '../game/useDialogue';

export function AISettings({ dialogue }: { dialogue: DialogueClient }) {
 const [editing, setEditing] = useState(!dialogue.available), [local, setLocal] = useState(false), [hasKey, setHasKey] = useState(false);
 const [key, setKey] = useState(''), [model, setModel] = useState(dialogue.model), [base, setBase] = useState('https://openrouter.ai/api/v1');
 const [saving, setSaving] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
 useEffect(() => {
  if (!import.meta.env.DEV) return;
  const controller = new AbortController();
  void fetch('/__local/ai', { signal: controller.signal }).then(async r => {
   if (!r.ok || !r.headers.get('content-type')?.includes('application/json')) return;
   const data = await r.json() as { local: boolean; hasKey: boolean; model: string | null; base: string };
   setLocal(data.local); setHasKey(data.hasKey); setModel(data.model || ''); setBase(data.base);
  }).catch(() => {});
  return () => controller.abort();
 }, []);
 async function save() {
  setSaving(true); setError(''); setMessage('正在向服务商发送测试请求…');
  try {
   const response = await fetch('/__local/ai', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Local-AI-Setup': '1' }, body: JSON.stringify({ ...(key.trim() ? { key: key.trim() } : {}), model: model.trim(), base: base.trim() }), signal: AbortSignal.timeout(25000) });
   const data = await response.json() as { error?: string };
   if (!response.ok) throw new Error(data.error || '配置保存失败。');
   setKey(''); setHasKey(true); setMessage('连接测试通过，已保存。正在等待服务重启…');
   // The Vite page may reconnect or reload; only store the non-secret mode preference.
   localStorage.setItem('swyf-ai-enabled', 'true');
   await new Promise(resolve => setTimeout(resolve, 1800));
   let ready = false;
   for (let i = 0; i < 12; i++) { if (await dialogue.check()) { ready = true; break; } await new Promise(resolve => setTimeout(resolve, 900)); }
   if (ready) { dialogue.setEnabled(true); setEditing(false); setMessage('AI 已启用，可以自由输入或说话。'); }
   else setMessage('测试通过且配置已保存。服务仍在重启，请稍后点击“重新检查配置”。');
  } catch (e) { setMessage(''); setError(e instanceof Error && e.name !== 'TimeoutError' ? e.message : '连接测试超时，请检查网络或服务地址。'); }
  finally { setSaving(false); }
 }
 const deepSeek = /^https:\/\/api\.deepseek\.com(?:[/:]|$)/i.test(base.trim());
 return <section className="ai-settings" aria-label={t("AI 自由对话设置")}>
  <div className="ai-heading"><h3>{t("AI 自由对话")}</h3><span className={dialogue.enabled ? 'ai-status ready' : 'ai-status'}>{t(dialogue.enabled ? '已启用' : dialogue.available ? '已配置 · 未启用' : '尚未配置')}</span></div>
  <p>{t(dialogue.available ? `当前模型：${dialogue.model}` : `缺少：${dialogue.missing.join('、') || '服务配置'}。配置后才能理解自由输入的文字与语音。`)}</p>
  <div className="ai-actions">
   <button className="primary" disabled={saving || dialogue.testing} onClick={() => { setError(''); setMessage(''); if (dialogue.enabled) dialogue.setEnabled(false); else if (dialogue.available) void dialogue.testAndEnable(); else setEditing(true); }}>{t(dialogue.testing ? '正在测试连接…' : dialogue.enabled ? '关闭 AI 对话' : dialogue.available ? '测试并启用 AI' : '配置并启用 AI')}</button>
   <button disabled={saving || dialogue.testing} onClick={() => { void dialogue.check(); }}>{t("重新检查配置")}</button>
   {local && dialogue.available && <button disabled={saving} onClick={() => setEditing(!editing)}>{t("修改配置")}</button>}
  </div>
  {editing && (local ? <form className="ai-config-form" onSubmit={e => { e.preventDefault(); void save(); }}>
   <label>{t("服务地址")}<input aria-label={t("AI 服务地址")} type="url" required value={base} onChange={e => setBase(e.target.value)} disabled={saving}/></label>
   <label>{t("API Key")}<input aria-label={t("AI API Key")} type="password" autoComplete="off" spellCheck={false} required={!hasKey} value={key} onChange={e => setKey(e.target.value)} placeholder={t(hasKey ? '已保存，留空保留现有密钥' : '粘贴服务商的 API Key')} disabled={saving}/></label>
   <label>{t("模型 ID")}<input aria-label={t("AI 模型 ID")} required maxLength={160} autoComplete="off" value={model} onChange={e => setModel(e.target.value)} placeholder={t("从服务商复制模型 ID")} disabled={saving}/></label>
   <p>{deepSeek ? <>{t("DeepSeek 官方地址：https://api.deepseek.com；模型可填 deepseek-flash。程序已适配 JSON Output。")}<a href="https://api-docs.deepseek.com/quick_start/pricing/" target="_blank" rel="noreferrer">{t("官方模型说明")}</a></> : <>{t("默认使用 OpenRouter。选择支持 Structured Outputs / JSON Schema 的模型。")}<a href="https://openrouter.ai/settings/keys" target="_blank" rel="noreferrer">{t("管理 API Key")}</a> · <a href="https://openrouter.ai/models?supported_parameters=structured_outputs" target="_blank" rel="noreferrer">{t("查看模型")}</a></>}</p>
   <button className="primary" type="submit" disabled={saving}>{t(saving ? '正在测试与保存…' : '测试连接并保存启用')}</button>
   <small>{t("此表单仅在本机开发环境可用。密钥保存在本机 .dev.vars，浏览器不保存密钥。测试会发送一次简短的模型请求。")}</small>
  </form> : <div className="ai-host-setup"><p>{t("请在服务端配置 ")}<code>{t("AI_MODEL")}</code> {t(" 和 ")}<code>{t("OPENROUTER_API_KEY")}</code>{t("（或 ")}<code>{t("AI_API_KEY")}</code>）。</p><p>{t(import.meta.env.DEV ? '本地配置入口尚未连接。请重启 npm run dev，或参考 .dev.vars.example 填写 .dev.vars 后重启。' : 'Cloudflare 部署：在 Worker 的「设置 → 变量和机密」中填写并重新部署，再点击重新检查配置。')}</p></div>)}
  {(message || saving) && <p className="ai-feedback" role="status">{t(message)}</p>}
  {(error || dialogue.configError) && <p className="ai-feedback error" role="alert">{t(error || dialogue.configError)}</p>}
 </section>;
}
