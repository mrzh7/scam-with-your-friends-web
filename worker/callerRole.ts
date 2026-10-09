import { creditFields, type Call } from '../src/game/engine';
import { DialogueResponseError } from './dialogueResponse';

// A narrow guard for the observed inversion: the caller was finding their own
// document, the operator agreed to wait, but the caller now asks them to read it.
// This is not a general semantic judge; unrelated questions must remain allowed.
export function validateCallerRole(call: Call, operatorText: string, reply: string) {
 const previous = [...call.transcript].reverse().find(line => line.who === 'caller')?.text || '';
 const callerWasLooking = /(?:通知|编号|卡片|账单|收据|账本)/.test(previous)
  && /(?:我[^。！？]{0,10}(?:找|翻|看)|(?:编号|通知|账单|收据)[^。！？]{0,8}(?:找|翻)|等我)/.test(previous);
 const operatorIsWaiting = /(?:谢谢|不着急|不急|慢慢|我等|等你|按你的节奏|你找|您找|我在听|好的)/.test(operatorText)
  && !/(?:我[^。！？]{0,10}(?:找|翻|查|念|读)|(?:帮我|替我))/.test(operatorText);
 // Quoting an earlier request to clarify it is not issuing that request.
 const spoken = reply.replace(/“[^”]*”|「[^」]*」|"[^"]*"/g, '');
 const reversedLookup = /(?:你|您)[^。！？]{0,8}(?:找|翻)[^。！？]{0,10}(?:编号|通知|账单|收据)/.test(spoken)
  || /(?:找到了?|查到了?|找到后|查到后)[^。！？]{0,12}(?:念|读|报|告诉|发)[^。！？]{0,4}给我/.test(spoken);
 if (callerWasLooking && operatorIsWaiting && reversedLookup) {
  throw new DialogueResponseError('role', 'AI 把来电者与接线员身份说反了。');
 }
}

// Keep concrete identifier strings under game authority. Ordinary counts and
// times in dialogue are allowed; this is not a validator for all invented facts.
export function validateCallerIdentifiers(call: Call, reply: string) {
 const allowed = new Set(call.revealed ? (call.scheme === 'credit' ? creditFields(call) : [call.code]).map(code => code.toUpperCase()) : []);
 const identifiers = [
  ...[...reply.matchAll(/\b(?:[A-Z]{1,12}-)+(?:[A-Z0-9]+-)*[A-Z0-9]+\b/gi)].filter(match=>/[0-9]/.test(match[0])||match[0]===match[0].toUpperCase()),
  ...reply.matchAll(/(?:编号|卡号|安全口令|到期标记|通知号|订单号)\s*(?:应该|好像)?\s*(?:是|为|[：:])?\s*([A-Z0-9][A-Z0-9 -]*)/gi),
 ];
 if (identifiers.some(match => !allowed.has((match[1] ?? match[0]).trim().toUpperCase()))) {
  throw new DialogueResponseError('identifier', 'AI 提供了未经确认的编号。');
 }
}
