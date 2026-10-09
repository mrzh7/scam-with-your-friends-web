import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createAvatar} from '../../src/components/avatar';
import {createFilmOffice} from './office';
import {Portrait} from '../../src/components/Portrait';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

// Frame-addressable promotional animation; no accounts, networking or provider APIs.
const W=1920,H=1080,DURATION=48;
const canvas=document.querySelector<HTMLCanvasElement>('#film')!;
const c=canvas.getContext('2d',{alpha:false})!;
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
const camera=new THREE.PerspectiveCamera(47,W/H,.05,120);
const office=createFilmOffice();office.fire.visible=false;office.sun.intensity=3.9;
const dynamic=new Set<THREE.Object3D>([...office.characters.map(v=>v.root),...office.fans,office.fire]);
office.scene.updateMatrixWorld(true);
const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();const remove:THREE.Mesh[]=[];
office.scene.traverse(o=>{if(!(o instanceof THREE.Mesh)||o instanceof THREE.InstancedMesh||Array.isArray(o.material))return;let a:THREE.Object3D|null=o;while(a){if(dynamic.has(a))return;a=a.parent;}const g=o.geometry.clone().applyMatrix4(o.matrixWorld);const list=batches.get(o.material)||[];list.push(g);batches.set(o.material,list);remove.push(o);});
remove.forEach(o=>o.removeFromParent());
for(const [material,geometries] of batches){const geo=mergeGeometries(geometries,false);if(geo){const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;office.scene.add(mesh);}geometries.forEach(g=>g.dispose());}

const studio=new THREE.Scene();studio.background=new THREE.Color('#061d22');studio.fog=new THREE.FogExp2('#061d22',.018);
studio.add(new THREE.HemisphereLight('#c0f0d8','#223741',2.2));
function light(color:number,intensity:number,x:number,y:number,z:number){const l=new THREE.DirectionalLight(color,intensity);l.position.set(x,y,z);studio.add(l);return l;}
const key=light(0xffd393,4,-4,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-9;key.shadow.camera.right=9;key.shadow.camera.top=8;key.shadow.camera.bottom=-8;
light(0x39cbd2,5,5,5,-6);light(0xe8b947,2.6,-7,3,-4);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#102d33',roughness:.36,metalness:.35}));floor.rotation.x=-Math.PI/2;floor.position.y=-.035;floor.receiveShadow=true;studio.add(floor);
const crew=[0,1,2,3].map((i)=>{const rig=createAvatar(i,['THE CLOSER','THE SMOOTH ONE','TECH SUPPORT','THE WILD CARD'][i]);studio.add(rig.root);return rig;});
const phone=new THREE.Group();studio.add(phone);
const dark=new THREE.MeshStandardMaterial({color:'#18343a',roughness:.32,metalness:.32}),ivory=new THREE.MeshStandardMaterial({color:'#f2e6bf',roughness:.46}),gold=new THREE.MeshStandardMaterial({color:'#f4bf4a',roughness:.3,metalness:.45});
function rounded(parent:THREE.Object3D,w:number,h:number,d:number,mat:THREE.Material,x:number,y:number,z:number,r=.08){const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,r),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
rounded(phone,2.3,.34,1.72,ivory,0,.24,0,.14);
rounded(phone,2.02,.23,1.4,dark,0,.46,0,.1);
for(let row=0;row<4;row++)for(let col=0;col<3;col++)rounded(phone,.24,.10,.2,col===2&&row===3?gold:ivory,(col-1)*.32,.615,.02+row*.27,.035);
const receiver=new THREE.Group();phone.add(receiver);receiver.position.set(0,.93,-.5);
rounded(receiver,1.9,.23,.30,dark,0,.12,0,.12);
for(const x of [-.84,.84]){rounded(receiver,.48,.38,.59,dark,x,-.08,0,.12);rounded(receiver,.34,.04,.40,gold,x,-.29,0,.06);}
const cordPoints=Array.from({length:220},(_,i)=>{const u=i/219;return new THREE.Vector3(1.05+Math.sin(u*29*Math.PI)*.1,.42+Math.cos(u*29*Math.PI)*.1,-.35+u*1.9);});
const cord=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cordPoints),200,.03,5,false),dark);phone.add(cord);
const glowRing=new THREE.Mesh(new THREE.TorusGeometry(2.1,.012,8,100),new THREE.MeshBasicMaterial({color:'#63d5bd'}));glowRing.rotation.x=-Math.PI/2;glowRing.position.y=.006;studio.add(glowRing);
const papers=new THREE.Group();office.scene.add(papers);studio.add(new THREE.PointLight('#eec563',15,10));
for(let i=0;i<42;i++){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.24,.005,.34),new THREE.MeshStandardMaterial({color:i%3?'#ebdfb7':'#ecbb52',side:THREE.DoubleSide}));papers.add(mesh);}
const parcels=new THREE.Group();studio.add(parcels);
for(let i=0;i<9;i++){const g=new THREE.Group();rounded(g,.42,.4,.38,new THREE.MeshStandardMaterial({color:i%2?'#b68d52':'#c6a769',roughness:.85}),0,0,0,.015);rounded(g,.07,.405,.385,ivory,0,0,0,.004);parcels.add(g);}

const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=(v:number)=>1-(1-clamp(v))**3;
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const frac=(v:number)=>v-Math.floor(v);
const soft=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
const C={ink:'#071c21',paper:'#f3efdd',gold:'#f5c94e',mint:'#70d6b9',red:'#f2624e'};
const portraits:HTMLImageElement[][]=[];
const fontDefs=[['Display','display'],['Condensed','condensed'],['Body','body']];
await Promise.all(fontDefs.map(async([family,file])=>{const f=new FontFace(family,`url(/marketing/trailer/fonts/${file}.woff2)`);await f.load();document.fonts.add(f);}));
for(let person=0;person<8;person++){
 const frames=[];
 for(let j=0;j<6;j++){const svg=renderToStaticMarkup(React.createElement(Portrait,{person,trust:65,talking:j>0,level:j/5}));const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" '));await img.decode();frames.push(img);}portraits.push(frames);
}
const grain=document.createElement('canvas');grain.width=grain.height=256;const g=grain.getContext('2d')!;const pixels=g.createImageData(256,256);let seed=123;
for(let i=0;i<pixels.data.length;i+=4){seed=(seed*16807)%2147483647;const v=seed%255;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=6;}g.putImageData(pixels,0,0);const noise=c.createPattern(grain,'repeat')!;
function panel(x:number,y:number,w:number,h:number,color:string,r=18){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function text(s:string,x:number,y:number,size:number,color=C.paper,font='Display',align:CanvasTextAlign='left'){c.fillStyle=color;c.font=`${size}px ${font}`;c.textAlign=align;c.textBaseline='alphabetic';c.fillText(s,x,y);}
function label(s:string,x:number,y:number,color=C.mint){text(s,x,y,23,color,'Body');}
function large(lines:string[],x:number,y:number,t:number,size=168,colors=[C.paper,C.gold]){lines.forEach((s,i)=>{const p=ease((t-i*.12)*2.8);c.save();c.globalAlpha=p;c.translate(x,y+i*size*.91+55*(1-p));c.scale(1+.055*(1-p),1);text(s,0,0,size,colors[i%colors.length]);c.restore();});}
function background(t:number){const gr=c.createLinearGradient(0,0,W,H);gr.addColorStop(0,'#06171c');gr.addColorStop(.6,'#102d33');gr.addColorStop(1,'#234b49');c.fillStyle=gr;c.fillRect(0,0,W,H);c.strokeStyle='#6ca39818';c.lineWidth=1;for(let x=-H;x<W;x+=85){c.beginPath();c.moveTo(x+(t*16)%85,0);c.lineTo(x+H+(t*16)%85,H);c.stroke();}}
function sceneShot(scene:THREE.Scene,position:number[],look:number[],fov=47){camera.position.set(position[0],position[1],position[2]);camera.lookAt(look[0],look[1],look[2]);camera.fov=fov;camera.updateProjectionMatrix();renderer.render(scene,camera);c.drawImage(renderer.domElement,0,0);}
function shade(side='left',power=.9){const gr=c.createLinearGradient(side==='left'?0:W,0,side==='left'?W:0,0);gr.addColorStop(0,`rgba(3,18,22,${power})`);gr.addColorStop(.45,`rgba(3,18,22,${power*.5})`);gr.addColorStop(1,'rgba(3,18,22,0)');c.fillStyle=gr;c.fillRect(0,0,W,H);}
function chip(s:string,x:number,y:number,w:number,color=C.gold){panel(x,y,w,49,color,5);text(s,x+w/2,y+34,24,C.ink,'Body','center');}
function ringIcon(x:number,y:number,scale=1){c.save();c.translate(x,y);c.scale(scale,scale);c.strokeStyle=C.mint;c.lineWidth=5;c.beginPath();c.arc(0,0,26,-.8,2.2);c.stroke();c.fillStyle=C.mint;c.fillRect(-26,-5,10,22);c.fillRect(16,-6,10,22);c.restore();}
function signal(x:number,y:number,w:number,t:number,amp=1){c.lineWidth=4;for(let i=0;i<58;i++){const a=(.2+.8*Math.abs(Math.sin(i*.86+t*10)*Math.sin(i*.32-t*7)))*amp; c.strokeStyle=i%5?C.mint:C.gold;c.beginPath();c.moveTo(x+i*w/58,y-22*a);c.lineTo(x+i*w/58,y+22*a);c.stroke();}}
function hud(t:number,kicker:string){label('SWYF / WEB',86,76,C.paper);c.globalAlpha=.65;text(kicker,W-86,76,21,C.paper,'Body','right');c.globalAlpha=1;const len=120; c.fillStyle='#ffffff22';c.fillRect(86,H-71,len,3);c.fillStyle=C.gold;c.fillRect(86,H-71,len*t/DURATION,3);}
function phoneCard(person:number,x:number,y:number,w:number,h:number,t:number,rotate=0){c.save();c.translate(x+w/2,y+h/2);c.rotate(rotate);c.translate(-w/2,-h/2);c.shadowColor='#0008';c.shadowBlur=45;c.shadowOffsetY=22;panel(0,0,w,h,'#e9e7d2');c.shadowBlur=0;c.shadowOffsetY=0;panel(12,12,w-24,46,'#102e32',7);text('INCOMING CALL',30,45,23,C.paper,'Body');c.fillStyle=C.mint;c.beginPath();c.arc(w-31,35,6,0,Math.PI*2);c.fill();const mouth=Math.round((.5+.5*Math.sin(t*16+person))*5);c.drawImage(portraits[person][mouth],24,80,w-48,w-48);text(['DOROTHY','MILES','SHANICE','FRANKLIN','BRITTANY','ELEANOR','DAMIEN','OLIVER'][person],w/2,w+72,42,C.ink,'Display','center');c.save();c.translate(30,h-76);signal(0,0,w-60,t,.8);c.restore();panel(24,h-44,w-48,22,C.mint,8);c.restore();}

function animateWorld(t:number){office.characters.forEach((r,i)=>r.update(t,{seated:true,onCall:true,talking:.17+.14*Math.sin(t*8+i),celebrating:t>34?.5:0}));office.fans.forEach((fan,i)=>fan.rotation.y=t*(i?4:3));office.fire.visible=t>=30&&t<37;office.fire.children.forEach((o,i)=>o.scale.setScalar(.8+Math.sin(t*14+i)*.2));office.point.color.set(t>=30&&t<37?'#fb6c32':'#ffe4ab');office.point.intensity=t>=30&&t<37?80+Math.sin(t*5)*40:60;
 papers.visible=t>=30&&t<37;papers.children.forEach((p,i)=>{const a=t*.55+i*2.39;p.position.set(Math.sin(a)*7,1+frac(t*.15+i*.073)*4,Math.cos(a*.8)*6);p.rotation.set(t+i,t*.6+i,t*.8);});
 crew.forEach((r,i)=>{r.root.visible=true;r.root.position.set((i-1.5)*1.55,0,(i===0||i===3)?-.6:0);r.root.rotation.y=Math.sin(t*.4+i)*.055;r.update(t,{moving:0,waving:i===3&&t<27,talking:i===1?.24+Math.sin(t*9)*.18:0,celebrating:t>=37?1:0});});phone.visible=false;parcels.visible=t>=23&&t<30;parcels.children.forEach((p,i)=>{const a=t*.6+i*.8;p.position.set(Math.sin(a)*5,2.1+Math.cos(a*1.3)*1.2,Math.cos(a)*2.3-1);p.rotation.set(a*.3,a,a*.6);});glowRing.visible=true;glowRing.rotation.z=t*.14;
}

function render(t:number){t=clamp(t,0,47.999);c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.filter='none';background(t);animateWorld(t);
 if(t<4){
  crew.forEach(r=>r.root.visible=false);phone.visible=true;phone.position.set(1.8,.1,0);phone.rotation.y=-.35+t*.16;receiver.rotation.z=Math.sin(t*46)*.035*(t<3.2?1:0);receiver.position.y=.93+(t>2.8?ease((t-2.8)/1.2)*.5:0);sceneShot(studio,[6.9-t*.35,3.8-t*.13,6.4],[.7,.5,0],40);shade('left');label('09:00 AM / FIRST DAY ON THE JOB',116,249);large(['YOUR SHIFT','STARTS NOW.'],110,427,t-.3,171);signal(119,718,550,t,.65);chip('INCOMING CALL',118,807,279,C.mint);
 }else if(t<10){
  const u=(t-4)/6;sceneShot(office.scene,[mix(7.3,5.6,u),mix(4.45,2.5,u),mix(7.2,5.4,u)],[-2,1.8,-2],56);shade('left',.84);label('AN ENTIRE OFFICE. ZERO GOOD IDEAS.',115,260);large(['JUST ANOTHER','NORMAL JOB.'],108,447,t-4.2,154);
  if(t>7.6){c.save();c.translate(648,716);c.rotate(-.09);panel(-8,-72,425,97,C.red,5);text('NOT EVEN CLOSE.',13,0,63,C.ink);c.restore();}
 }else if(t<16){
  background(t);const u=t-10;c.save();c.globalAlpha=.07;text('RING RING RING',-55,603,390,C.mint);c.restore();label('EIGHT CALLERS. A LOT TO EXPLAIN.',116,169);large(['THEY TALK.','YOU IMPROVISE.'],110,361,u,132);
  const idx=u<2?0:u<4?3:1;phoneCard(idx,998+25*Math.sin(u),185,472,692,t,Math.sin(u*.7)*.04);c.save();c.globalAlpha=.34;phoneCard((idx+1)%8,1515,293,300,478,t,-.08);c.restore();
  panel(118,693,671,159,'#25484c',12);text(['"My computer wants a vacation."','"I own three hundred tons of corn?"','"Is there really an ocean on Mars?"'][Math.min(2,Math.floor(u/2))],146,753,29,C.paper,'Body');text('OPTIONAL AI DIALOGUE',146,806,25,C.gold,'Body');
 }else if(t<23){
  background(t);const u=t-16;label('THE DESKTOP IS YOUR PLAYGROUND',116,144);large(['THREE CLUES. ONE PAYDAY.'],110,275,u,115);
  const p=ease(u*2);c.save();c.translate((1-p)*-400,0);phoneCard(0,113,336,386,580,t,-.025);c.restore();
  const px=607,py=350;panel(px,py,1155,545,'#e7e2c8',14);panel(px+12,py+12,1131,52,'#12363a',6);text('CREDIT CARD RECORD  /  FICTIONAL DATA ONLY',px+39,py+49,26,C.paper,'Body');
  const values=['GAME-CARD-042','PIX-318','MOON-27'];const labels=['CARD ID','SECURITY','EXPIRY'];
  values.forEach((v,i)=>{const checked=u>1.2+i*1.25;panel(px+37,py+94+i*120,1080,94,checked?'#bed7b6':'#d8d3b7',6);text(labels[i],px+60,py+130+i*120,20,'#5b7768','Body');text(v,px+270,py+157+i*120,42,C.ink,'Condensed');text(checked?'VERIFIED':'AWAITING CLUE',px+1070,py+155+i*120,24,checked?'#266747':'#7e8a74','Body','right');});
  if(u>4.5){const p=ease((u-4.5)*3);c.save();c.translate(1325,840);c.scale(.8+.2*p,.8+.2*p);c.rotate(-.04);panel(-250,-125,500,196,C.gold,10);text('+$400',0,-15,122,C.ink,'Display','center');text('TASK COMPLETE',0,43,23,C.ink,'Body','center');c.restore();}
 }else if(t<30){
  const u=t-23;sceneShot(studio,[.65*Math.sin(u*.4),2.35,7.1-u*.12],[0,1.2,0],46);const gr=c.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#06191fe8');gr.addColorStop(.5,'#06191f00');gr.addColorStop(1,'#06191f');c.fillStyle=gr;c.fillRect(0,0,W,H);
  text('FOUR FRIENDS.',W/2,194,124,C.paper,'Display','center');text('ONE TERRIBLE PLAN.',W/2,303,124,C.gold,'Display','center');chip('1–4 PLAYER CO-OP',W/2-187,905,374,C.mint);
 }else if(t<37){
  const u=t-30;sceneShot(office.scene,[6.5-u*.5,4.7-u*.26,7.8-u*.22],[.4,1.2,-.6],58+Math.sin(u)*2);shade('left',.78);c.fillStyle=`rgba(170,28,14,${.08+.05*Math.sin(u*4)})`;c.fillRect(0,0,W,H);label('LAST MINUTE. EVERY CALL COUNTS.',116,230,C.red);large(['MAKE QUOTA.','MAKE TROUBLE.'],108,418,u,152);
  const secs=Math.max(1,59-Math.floor(u*8.3));panel(1275,205,486,238,'#151d20df');text('SHIFT ENDS IN',1518,261,22,C.paper,'Body','center');text('00:'+String(secs).padStart(2,'0'),1518,406,142,C.red,'Display','center');
  const earned=250+(u>2?150:0)+(u>4?250:0);panel(120,805,1085,134,'#081c20e8',8);label('TEAM QUOTA',149,847);text('$'+earned+' / $600',1168,853,39,C.gold,'Body','right');panel(150,879,1018,24,'#ffffff22',5);panel(150,879,Math.min(1018,1018*earned/600),24,earned>=600?C.mint:C.gold,5);
 }else if(t<41){
  const u=t-37;crew.forEach((r,i)=>r.root.visible=i===0);crew[0].root.position.set(1.35,0,0);sceneShot(studio,[1.28,1.87,2.35-u*.07],[1.3,1.53,0],48);shade('left',.83);label('A JOB WELL DONE?',115,270);large(['PROMOTION?'],110,457,u,173);if(u>1.4){c.save();c.translate(400,660);c.rotate(-.09);panel(-289,-92,614,112,C.red,4);text('PROBABLY NOT.',-259,-9,86,C.ink);c.restore();}
 }else{
  const u=t-41;crew.forEach((r,i)=>{r.root.position.set(2.7+(i-1.5)*1.1,0,i%2?-.4:0);r.root.rotation.y=-.1;r.root.scale.setScalar(1);});sceneShot(studio,[.4,2.4,7.1-u*.06],[.4,1.22,0],51);shade('left',.96);label('UNOFFICIAL WEB EDITION',114,213,C.mint);const p=ease(u*1.8);c.save();c.translate(109,416+(1-p)*60);c.globalAlpha=p;text('$CAM',0,0,229,C.gold);text('WITH YOUR',6,131,117,C.paper);text('FRIENDS.',0,311,194,C.paper);c.restore();
  chip('PLAY IN YOUR BROWSER',118,816,614,C.gold);text('AI CALLERS  /  CO-OP  /  FIVE LANGUAGES',120,927,25,C.mint,'Body');text('github.com/mrzh7/scam-with-your-friends-web',120,977,24,C.paper,'Body');
 }
 // Optical treatment, safe titles and cuts are all baked into the delivered frames.
 const vignette=c.createRadialGradient(W*.52,H*.47,H*.1,W*.5,H*.5,W*.68);vignette.addColorStop(.4,'#0000');vignette.addColorStop(1,'#0009');c.fillStyle=vignette;c.fillRect(0,0,W,H);
 c.fillStyle=noise;c.save();c.translate(-(Math.floor(t*24)%7)*19,-(Math.floor(t*30)%9)*11);c.fillRect(0,0,W+200,H+200);c.restore();
 c.fillStyle='#051418';c.fillRect(0,0,W,42);c.fillRect(0,H-39,W,39);
 if(t<41)hud(t,'CINEMATIC PROMOTIONAL ANIMATION');
 if(t>=41)text('Fictional scenarios · Based on the web project · Not affiliated with the original game',W-65,H-13,18,'#94b1ab','Body','right');
 for(const cut of [4,10,16,23,30,37,41]){const d=t-cut;if(d>=0&&d<.16){c.fillStyle=`rgba(239,229,193,${(1-d/.16)*.35})`;c.fillRect(0,0,W,H);}}
 const fade=t<.45?1-t/.45:t>47.3?(t-47.3)/.7:0;if(fade>0){c.fillStyle=`rgba(3,13,16,${clamp(fade)})`;c.fillRect(0,0,W,H);}
}
const filmWindow=window as typeof window&{renderFilm:(t:number)=>void;filmReady:boolean;filmDuration:number};
filmWindow.renderFilm=render;filmWindow.filmDuration=DURATION;render(42.5);filmWindow.filmReady=true;
