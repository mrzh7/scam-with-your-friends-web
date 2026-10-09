
import {createRoot} from 'react-dom/client';
import App from '../src/App';
import {newGame,gameReducer} from '../src/game/engine';
import '../src/styles.css';
const user={id:'qa-permanent-id-should-never-be-visible',name:'QA Employee',email:'qa@example.test'};
let revision=0,state=gameReducer(newGame(42),{type:'start'}),settings={sound:false,wallpaper:'mountain'};
window.fetch=async(input,init)=>{
 const path=String(input).replace(/^https?:\/\/[^/]+/,'');
 if(path==='/api/auth/me')return Response.json({user:location.search.includes('login')?null:user});
 if(path==='/api/auth/providers')return Response.json({google:false,wechat:false});
 if(path==='/api/auth/identities')return Response.json({providers:[],password:true});
 if(path==='/api/account/rooms')return Response.json({rooms:[]});
 if(path==='/api/config')return Response.json({ai:true,model:null,missing:[],speech:{provider:'browser',available:false}});
 if(path==='/api/save'){if(init?.method==='PUT'){const body=JSON.parse(String(init.body));state=body.state;settings=body.settings;revision++;}return Response.json({userId:user.id,state,settings,revision});}
 return Response.json({error:'Unexpected fixture request: '+path},{status:500});
};
createRoot(document.getElementById('root')!).render(<App/>);

