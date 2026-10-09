import {getLocale,languageTags} from '../i18n';
export interface Recognizer {
 lang: string; interimResults: boolean; continuous: boolean;
 onstart: (() => void) | null; onend: (() => void) | null;
 onerror: ((e: { error: string }) => void) | null;
 onresult: ((e: { resultIndex?: number; results: { isFinal?: boolean; [index: number]: { transcript: string } }[] }) => void) | null;
 start(): void; stop(): void; abort(): void;
}
export function recognitionError(code: string) {
 const errors: Record<string, string> = {
  'not-allowed': '麦克风权限被拒绝。请在浏览器的网站权限中允许麦克风，再重试。',
  'service-not-allowed': '当前浏览器禁止语音识别服务。可在 Chrome 或 Edge 中打开本页重试。',
  network: '语音识别服务连接失败。麦克风可能正常，但浏览器的识别服务不可达。',
  'audio-capture': '没有可用的麦克风，请检查设备是否连接或被其他应用独占。',
  'no-speech': '没有听到清晰语音，可以重新说一次。',
  'language-not-supported': '此浏览器的识别服务不支持当前语言。',
  unsupported: '当前浏览器不支持语音识别。可在 Chrome 或 Edge 中打开本页重试。',
  timeout: '语音识别未及时响应，已停止本次录音。',
 };
 return (errors[code] || '语音识别暂时不可用。') + ' 文字输入仍可使用。';
}
export function createRecognitionSession(recognizer: Recognizer, callbacks: { active(value: boolean): void; text(value: string): void; interim?(value: string): void; error(value: string): void; done(): void }) {
 let closed = false, finished = false, received = false;
 let watchdog: ReturnType<typeof setTimeout>;
 const finish = () => { if (finished) return; finished = true; clearTimeout(watchdog); callbacks.active(false); callbacks.done(); };
 const detach = () => { recognizer.onstart = recognizer.onend = recognizer.onerror = recognizer.onresult = null; };
 recognizer.lang = languageTags[getLocale()]; recognizer.interimResults = true; recognizer.continuous = false;
 recognizer.onstart = () => { if (!closed && !finished) callbacks.active(true); };
 recognizer.onresult = e => { if (closed || finished) return; const parts: string[] = []; for (let i = e.resultIndex || 0; i < e.results.length; i++) if (e.results[i].isFinal !== false) parts.push(e.results[i][0]?.transcript || ''); const partial = Array.from(e.results).filter(r=>r.isFinal===false).map(r=>r[0]?.transcript||'').join('').trim().slice(0,200); callbacks.interim?.(partial); const value = parts.join('').trim().slice(0,200); if (value) { received=true; callbacks.text(value); } };
 recognizer.onerror = e => { if (closed || finished) return; if (e.error !== 'aborted') callbacks.error(recognitionError(e.error)); finish(); detach(); try { recognizer.abort(); } catch {} };
 recognizer.onend = () => { if(!closed&&!finished&&!received) callbacks.error(recognitionError('no-speech')); finish(); detach(); };
 watchdog = setTimeout(() => { if (!finished && !closed) { callbacks.error(recognitionError('timeout')); finish(); detach(); try { recognizer.abort(); } catch {} } }, 20000);
 callbacks.active(true);
 try { recognizer.start(); } catch { callbacks.error(recognitionError('service-not-allowed')); finish(); detach(); }
 return { stop() { if (!closed && !finished) { try { recognizer.stop(); } catch { finish(); } } }, cancel() { closed = true; finish(); detach(); try { recognizer.abort(); } catch {} } };
}
