import {t} from '../i18n';
import { useEffect, useRef, useState } from 'react';
import { CALLERS, SCHEMES, type Tone } from '../game/content';
import { creditFields, type GameState, type Action } from '../game/engine';
import { Portrait } from './Portrait';
import { Icon } from './Icon';
import { DialogueText } from './DialogueText';
import { CallerPortrait } from './CallerPortrait';
import type { DialogueClient } from '../game/useDialogue';
import {useCallerSpeech} from '../game/useCallerSpeech';
import {useSpeechInput} from '../game/useSpeechInput';
import type {Recognizer} from '../game/speechInput';
export function PhoneApp({ game, dispatch, openTool, sound, dialogue, onConfigureAI, onMicrophoneLevel, recognitionFactory }: { game: GameState; dispatch: (a: Action) => void; openTool: (id: string) => void; sound: boolean; dialogue: DialogueClient; onConfigureAI: () => void; onMicrophoneLevel?: (level:number)=>void; recognitionFactory?:()=>Recognizer }) {
 const [autoSend, setAutoSend] = useState(true), [inputNotice,setInputNotice]=useState('');
 const c = game.call; const [text, setText] = useState(''); const transcript = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
 const [recording,setRecording]=useState(false);
 const speechOutput=useCallerSpeech(c,sound,recording);
 const submitted = useRef<{ id: number; revision: number; text: string } | null>(null);
 const live = useRef({ call: c, enabled: dialogue.enabled, busy: dialogue.busy, event: game.event, send: dialogue.send });
 live.current = { call: c, enabled: dialogue.enabled, busy: dialogue.busy, event: game.event, send: dialogue.send };
 const sendText = (message: string) => {
  const current = live.current;
  if (!current.enabled || current.busy || current.event || !message.trim() || current.call?.status !== 'active') return;
  const value = message.trim().slice(0, 200);
  submitted.current = { id: current.call.id, revision: current.call.revision || 0, text: value };
  speechOutput.stop(); speechInput.cancel(); setInputNotice(''); setText(value); void current.send(value);
 };
 useEffect(() => { submitted.current = null; setText(''); setInputNotice(''); }, [c?.id]);
 useEffect(() => {
  const sent = submitted.current;
  if (sent && c?.id === sent.id && (c.revision || 0) > sent.revision && c.transcript.some(line => line.who === 'you' && line.text === sent.text)) {
   setText(current => current === sent.text ? '' : current); submitted.current = null;
  }
 }, [c?.id, c?.revision, c?.transcript]);
 useEffect(() => { transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: 'smooth' }); }, [c?.revision, c?.transcript.length]);
 const speechInput=useSpeechInput({callKey:`${c?.id}:${c?.status}`,enabled:dialogue.enabled&&c?.status==='active',factory:recognitionFactory,level:onMicrophoneLevel,interrupt:speechOutput.stop,focus:()=>setTimeout(()=>input.current?.focus(),0),result:value=>{setText(value);setInputNotice('');if(autoSend){if(live.current.busy||live.current.event)setInputNotice('识别文字已保留，待当前应答或故障处理完成后可发送。');else sendText(value);}}});
 useEffect(()=>setRecording(speechInput.listening),[speechInput.listening]);
 const speaking=speechOutput.level>.025&&c?.status==='active';
 if (!c) return <div className="phone-idle"><span className="signal-circle"><Icon name="phone" size={42}/></span><h2>{t("线路空闲")}</h2><p>{t("下一位来电者正在路上。")}</p><div className="waiting-dots">● ● ●</div><small>{t("KOLKATA TELECOM · {0}", [dialogue.enabled ? 'AI 自由对话' : '离线剧情模式'])}</small></div>;
 const p = CALLERS[c.person];
 const values = c.scheme === 'credit' ? creditFields(c) : [c.code];
 const hasValues = c.transcript.some(line => values.some(value => line.text.toUpperCase().includes(value.toUpperCase())));
 if (c.status === 'ringing') return <div className="phone-idle ringing"><Portrait person={c.person}/><small>{t("INCOMING CALL")}</small><h2>{p.name}</h2><p>{t(p.role)}</p><div className="ring-actions"><button className="red" onClick={() => dispatch({ type: 'hangup' })}><Icon name="close"/>{t("拒接")}</button><button className="green" onClick={() => dispatch({ type: 'accept' })}><Icon name="phone"/>{t("接听")}</button></div></div>;
 const reply = (tone: Tone) => { if (!dialogue.enabled) { dispatch({ type: 'reply', tone }); return; } const suggestions = { warm: ['别着急，请告诉我最担心的是什么？','谢谢你告诉我，我会按你的节奏来。','好的，先找到你手边的那封通知，我们再继续。'], confident: ['先确认当前任务，请描述遇到的情况。','先别着急操作，你现在屏幕上写的是什么？','明白了，我会按你刚才说的情况继续。'], playful: ['你的电脑还没辞职吧？今天轮到我值班啦。','先给故障放个假，我们慢慢排查它。','好，电脑今天先不辞职。那封通知找到了吗？'] }; sendText(t(suggestions[tone][Math.min(c.turn, 2)])); };
 return <div className="phone-app"><div className="trust-header"><strong>{t("CALLER TRUST")}</strong><b className={c.trust < 40 ? 'danger-text' : ''}>{t(c.trust >= 65 ? 'TRUSTING' : c.trust >= 35 ? 'UNCERTAIN' : 'ANGRY')}</b><div className="trust-track"><span style={{ width: `${c.trust}%`, background: c.trust < 40 ? '#ea655c' : '#65ce89' }}/></div><span className="trust-number">{t(c.trust)}%</span></div>
  <div className="caller-profile"><div className="caller-meta"><strong>{p.name}</strong><small>{t(p.role)}</small></div><div className="portrait-crop"><CallerPortrait person={c.person} talking={speaking} level={speechOutput.level} trust={c.trust}/><span className="live-chip">{t("● VOICE")}</span></div><div className={`waveform ${speaking ? 'speaking' : 'silent'}`}>{Array.from({ length: 35 }, (_, i) => <i key={i} style={{ height: 3 + speechOutput.level * (7 + i * 17 % 22), animation: 'none' }}/>)}</div></div>
  <div className="conversation" ref={transcript} aria-live="polite">{c.transcript.map((l, i) => <div className={`bubble ${l.who}`} key={i}><b>{t(l.who === 'you' ? '你' : p.name.split(' ')[0])}</b><span><DialogueText text={l.who==='you'?l.text:t(l.text)} values={values}/></span></div>)}</div>
  {speechInput.listening && <p role="status">{speechInput.interim || t("正在聆听，请说话…")}</p>}
  {hasValues && <small className="conversation-copy-hint">{t("单击验证信息全选，再复制粘贴到验证窗口。")}</small>}
  {c.status === 'complete' ? <div className="call-success"><Icon name="check"/>{t("任务完成 · 收入已到账")}</div> : <><div className="call-timing"><span><Icon name="clock" size={12}/>{t("耐心 {0}s", [Math.max(0, c.patience)])}</span><span>{t(SCHEMES[c.scheme].name)}</span></div>
   {c.revealed ? <button className="code-reveal" onClick={() => openTool(c.scheme)}><Icon name="check" size={17}/><span>{t(c.code)}<small>{t("打开 {0} 完成任务", [SCHEMES[c.scheme].title])}</small></span><Icon name="right" size={17}/></button> : <div className="reply-options"><button disabled={!!game.event || dialogue.busy} onClick={() => reply('warm')}>{t("耐心倾听 ")}<span>{t("“别着急，我在听。”")}</span></button><button disabled={!!game.event || dialogue.busy} onClick={() => reply('confident')}>{t("专业回应 ")}<span>{t("“我们按流程处理。”")}</span></button><button disabled={!!game.event || dialogue.busy} onClick={() => reply('playful')}>{t("开个玩笑 ")}<span>{t("“电脑也想辞职？”")}</span></button></div>}
   {dialogue.enabled && <form className="reply-input" onSubmit={e => { e.preventDefault(); if (text.trim()) sendText(text); }}><input ref={input} aria-label={t("通话文字")} placeholder={t(dialogue.enabled ? "直接说出你的回应…" : "启用 AI 后可自由输入")} maxLength={200} value={text} onChange={e => setText(e.target.value)}/><button disabled={!dialogue.enabled || !text.trim() || !!game.event || dialogue.busy} aria-label={t("发送应答")}><Icon name="send" size={16}/></button></form>}</>}
  {dialogue.enabled && (game.event || dialogue.busy || inputNotice) && <p className="input-notice" role="status">{t(game.event ? '办公室故障期间暂停发送；你仍可编辑文字。请点击桌面故障提示处理。' : dialogue.busy ? '正在等待对方回复；可先编辑下一句话。' : inputNotice)}</p>}
  <div className="speech-playback"><span>{t(sound ? `${speechOutput.mode}${speechOutput.loading ? t(' · 准备声音…') : speaking ? t(' · 对方说话中') : ''}` : '声音已关闭')}</span>{sound && c.status==='active' && <button onClick={speechOutput.replay} disabled={speechInput.listening}>{t("播放语音")}</button>}</div>
  {speechOutput.error && <p className="mic-error" role="alert">{t(speechOutput.error)}</p>}
  <div className="dialogue-mode"><span>{t(dialogue.enabled ? 'AI 自由对话' : '离线剧情模式')}</span>{dialogue.busy && <b role="status">{t("对方正在思考…")}</b>}{dialogue.enabled && <label><input type="checkbox" checked={autoSend} disabled={!dialogue.enabled} onChange={e => setAutoSend(e.target.checked)}/>{t("语音识别后发送")}</label>}</div>
  {!dialogue.enabled && <div className="offline-explanation"><span>{t("当前仅支持上方剧情选项；自由文字与语音需要 AI。")}</span><button disabled={dialogue.testing} onClick={()=>void dialogue.testAndEnable()}>{t("重新连接 AI")}</button></div>}
  {dialogue.error && submitted.current?.id === c.id && <p className="mic-error" role="alert">{t("{0} 应答已保留。", [dialogue.error])}{dialogue.enabled && c.status === 'active' && <button disabled={dialogue.busy || !!game.event || !text.trim()} onClick={() => sendText(text)}>{t("重新发送")}</button>} {dialogue.available && <button onClick={() => dialogue.setEnabled(false)}>{t("切换离线剧情")}</button>}</p>}
  {dialogue.configError && <p role="alert">{t(dialogue.configError)}</p>}{speechInput.error && <small className="mic-error" role="alert">{t(speechInput.error)}</small>}<div className="call-controls"><button className="red" onClick={() => dispatch({ type: 'hangup' })}><Icon name="phone" size={17}/>{t("挂断电话")}</button><button className={speechInput.listening ? 'red' : 'green'} onClick={dialogue.enabled ? speechInput.start : onConfigureAI} disabled={c.status !== 'active'} aria-label={t("语音输入")} title={t(dialogue.enabled ? "使用浏览器语音识别" : "网站 AI 服务就绪后可使用语音输入")}><Icon name={speechInput.listening ? 'micOff' : 'mic'} size={18}/></button></div>
 </div>;
}
