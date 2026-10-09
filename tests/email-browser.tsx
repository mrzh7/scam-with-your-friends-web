import {createRoot} from 'react-dom/client';
import {AccountGate} from '../src/components/AccountGate';
import {newGame} from '../src/game/engine';
import {setLanguage} from '../src/i18n';
import '../src/styles.css';
setLanguage('en');
let user: {id:string;name:string;email:string;emailVerified:boolean}|null=null;
const status=document.getElementById('fixture-events')!;
window.fetch=async(input)=>{
 const p=String(input);if(p==='/api/auth/providers')return Response.json({google:true,wechat:true});
 if(p==='/api/auth/me')return Response.json({user});
 if(p==='/api/auth/register'||p==='/api/auth/verification/send'){status.textContent='verification-requested';return Response.json({ok:true,verificationRequired:true},{status:202});}
 if(p==='/api/auth/verification/confirm'){status.textContent='verification-confirmed';return Response.json({ok:true});}
 if(p==='/api/auth/logout'){user=null;return Response.json({ok:true});}
 if(p==='/api/auth/login'){user={id:'qa-only',name:'QA',email:'qa@example.test',emailVerified:false};return Response.json({user});}
 if(p==='/api/save')return Response.json({userId:'qa-only',state:newGame(42),revision:0,settings:{}});
 return Response.json({error:'Unexpected fixture call'},{status:500});
};
createRoot(document.getElementById('root')!).render(<AccountGate>{()=> <p>GAME MOUNTED</p>}</AccountGate>);
