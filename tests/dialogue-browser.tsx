// Dev-only fixture: real PhoneApp and reducer, with deterministic transport failure.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PhoneApp } from '../src/components/PhoneApp';
import { newGame, gameReducer, applyDialogue } from '../src/game/engine';
import '../src/styles.css';
import type {Recognizer} from '../src/game/speechInput';
function Fixture() {
 const [game, setGame] = useState(() => { let g = gameReducer(newGame(1), { type: 'start' }); for (let i = 0; i < 3; i++) g = gameReducer(g, { type: 'tick' }); return gameReducer(g, { type: 'accept' }); });
 const [micFailure,setMicFailure]=useState('not-allowed');
 const [attempts, setAttempts] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState(''), [enabled, setEnabled] = useState(true);
 return <main style={{ width: 370, maxWidth: '100%', margin: '20px auto' }}><p style={{ padding: 12, background: '#fff' }}>UI 回归夹具：第一次失败、第二次成功，不调用服务。<br/>发送次数：{attempts}；已应用轮数：{game.call?.revision || 0}</p>
  <div style={{background:'#fff',padding:12}}><label>模拟语音错误<select aria-label="模拟语音错误" value={micFailure} onChange={e=>setMicFailure(e.target.value)}><option value="not-allowed">权限拒绝</option><option value="network">识别服务断网</option><option value="service-not-allowed">浏览器禁止服务</option></select></label><button onClick={()=>setGame(g=>({...g,event:g.event?null:'virus'}))}>切换病毒事件</button></div>
  <PhoneApp recognitionFactory={()=>{const r:Recognizer={lang:'',interimResults:false,continuous:false,onstart:null,onend:null,onerror:null,onresult:null,start(){setTimeout(()=>r.onerror?.({error:micFailure}),80);},stop(){r.onend?.();},abort(){}};return r;}} game={game} sound={false} dispatch={action => setGame(g => gameReducer(g, action))} openTool={() => {}} onConfigureAI={() => setEnabled(true)} dialogue={{
   available: true, enabled, setEnabled, model: 'UI-only', missing: [], testing: false, configError: '', testAndEnable: async () => {}, check: async () => true, busy, error,
   send: async text => {
    setBusy(true); setError(''); setAttempts(n => n + 1);
    await new Promise(resolve => setTimeout(resolve, 2500));
    if (!attempts) setError('AI 返回了空内容。 已自动重试一次，请重试本条应答。');
    else setGame(g => applyDialogue(g, text, { callCode: g.call!.code, callId: g.call!.id, turn: g.call!.revision || 0, attitude: 'positive', reply: '收到，这次我们继续核对游戏档案。' }));
    setBusy(false);
   },
  }}/>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
