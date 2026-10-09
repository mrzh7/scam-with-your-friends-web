import type { Call } from '../../src/game/engine';

export function oliverLookupCall(): Call {
 return {
  id: 987, revision: 2, person: 7, scheme: 'identity', status: 'active', trust: 56,
  patience: 120, turn: 1, revealed: false, code: 'GAME-ID-TEST',
  transcript: [
   { who: 'caller', text: '喂，不好意思，店里有点吵。我收到一封通知，说我的资料有问题，要我打这个电话。到底哪里出了问题？' },
   { who: 'you', text: '请您告诉我通知的标题和通知编号' },
   { who: 'caller', text: '通知标题我看看……等一下，鹦鹉别啄那个袋子。标题好像是“身份档案资料补全”，编号我得找找，你问这个是要核对什么？' },
   { who: 'you', text: '我帮您核对是哪里不全' },
   { who: 'caller', text: '哦，是要看哪里没填全啊。那编号应该在通知右上角，我翻一下……你等我两秒。' },
  ],
 };
}
export const oliverCourtesyReply = '谢谢你告诉我，我会按你的节奏来。';
export const reversedOliverReply = '好，我不着急。找到了就念给我，我这边听着。';
export function callerRoleCases() {
 const repaired = oliverLookupCall();
 repaired.transcript.push({ who: 'you', text: oliverCourtesyReply }, { who: 'caller', text: reversedOliverReply });
 repaired.revision = (repaired.revision || 0) + 1;
 return [
  { name: 'original-courtesy', call: oliverLookupCall(), text: oliverCourtesyReply },
  { name: 'waiting-for-caller', call: oliverLookupCall(), text: '没关系，您慢慢找，我等您。' },
  { name: 'recover-existing-inversion', call: repaired, text: '通知在您手上，刚才是您说要找编号，我在等您。' },
 ];
}
