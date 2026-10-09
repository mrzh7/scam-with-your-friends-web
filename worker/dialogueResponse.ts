import type { DialogueResult } from '../src/game/engine';
type Reply = Pick<DialogueResult, 'reply' | 'attitude'>;
export class DialogueResponseError extends Error {
 constructor(public kind: 'language' | 'empty' | 'truncated' | 'format' | 'invalid' | 'role' | 'identifier' | 'refused' | 'upstream', message: string, public retryable = true) { super(message); this.name = 'DialogueResponseError'; }
}
const object = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
export function parseDialogueResponse(payload: unknown): Reply {
 const data = object(payload), choice = object(Array.isArray(data?.choices) ? data.choices[0] : null), message = object(choice?.message);
 if (data?.error || !choice || !message) throw new DialogueResponseError('upstream', 'AI 服务没有返回有效的对话响应。', false);
 if (choice.finish_reason === 'content_filter' || message.refusal) throw new DialogueResponseError('refused', 'AI 未能回答这条内容，请换一种游戏内的说法。', false);
 if (choice.finish_reason === 'length') throw new DialogueResponseError('truncated', 'AI 回复被长度上限截断。');
 if (choice.finish_reason === 'insufficient_system_resource') throw new DialogueResponseError('upstream', 'AI 服务暂时繁忙。');
 // Some compatible services wrap text in content blocks. Never use reasoning_content.
 let content = message.content;
 if (Array.isArray(content)) content = content.map(part => { const block = object(part); return block?.type === 'text' && typeof block.text === 'string' ? block.text : ''; }).join('');
 if (content == null || typeof content === 'string' && !content.trim()) throw new DialogueResponseError('empty', 'AI 返回了空内容。');
 if (typeof content !== 'string' || content.length > 12000) throw new DialogueResponseError('format', 'AI 返回格式不正确。');
 const text = content.trim().replace(/^\uFEFF/, '');
 // Accept only a single JSON code fence, not arbitrary prose or truncated objects.
 const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text);
 let parsed: unknown;
 try { parsed = JSON.parse(fenced ? fenced[1] : text); } catch { throw new DialogueResponseError('format', 'AI 返回格式不正确。'); }
 const result = object(parsed);
 if (!result || typeof result.reply !== 'string' || !result.reply.trim() || result.reply.length > 360 || typeof result.attitude !== 'string' || !['positive', 'neutral', 'negative'].includes(result.attitude)) throw new DialogueResponseError('invalid', 'AI 返回内容未通过验证。');
 return { reply: result.reply.trim(), attitude: result.attitude as Reply['attitude'] };
}
