import * as THREE from 'three';
export interface AvatarRig { root: THREE.Group; head: THREE.Group; mouth: THREE.Mesh; eyes: THREE.Mesh[]; arms: THREE.Group[]; legs: THREE.Group[]; badge: THREE.Mesh; update(time: number, state: { waving?: boolean; moving?: number; seated?: boolean; talking?: number; stunned?: boolean; onCall?: boolean; celebrating?: number }): void }
export function createAvatar(index = 0, name = 'STAFF', look?: { hair: string; shirt: string; style: number }): AvatarRig {
 const root = new THREE.Group(), head = new THREE.Group(); const materials: Record<string, THREE.MeshStandardMaterial> = {};
 const mat = (color: string) => materials[color] ||= new THREE.MeshStandardMaterial({ color, roughness: .72 });
 const skin = ['#f28622', '#d66a20', '#f49936', '#ce681d'][index % 4], shirt = look?.shirt || ['#e8a92d', '#188f87', '#4d9433', '#c35b62'][index % 4];
 function box(w: number, h: number, d: number, color: string, parent: THREE.Object3D, x = 0, y = 0, z = 0) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color)); mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh; }
 function ball(r: number, color: string, parent: THREE.Object3D, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), mat(color)); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; parent.add(mesh); return mesh; }
 ball(.4, shirt, root, 0, 1.11, 0, .79, .91, .5); box(.50, .19, .32, '#303b47', root, 0, .75); box(.18, .16, .18, skin, root, 0, 1.52);
 head.position.y = 1.84; root.add(head); ball(.33, skin, head, 0, 0, 0, .95, 1.3, .88);
 const seam = box(.012, .51, .012, '#85692d', root, 0, 1.12, .205);
 seam.rotation.x = -.035;
 for (const side of [-1,1]) { const collar = box(.15, .08, .035, shirt, root, side * .1, 1.44, .15); collar.rotation.z = side * -.6; }
 // Bald, swept hair, mustache and beard variants match the staff's cartoon silhouettes.
 if (index % 4 !== 0 || look) {
  ball(.34, look?.hair || '#33281f', head, 0, .22, -.045, .96, .61, .93);
  for (let i = 0; i < 4; i++) ball(.09, look?.hair || '#33281f', head, -.19 + i * .13, .3, .13, .9, 1.2, 1.25);
 }
 ball(.062, skin, head, 0, -.02, .31, .65, .8, 1.1);
 const eyes: THREE.Mesh[] = [], brows: THREE.Mesh[] = [];
 for (const side of [-1, 1]) {
  eyes.push(ball(.081, '#fff4df', head, side * .133, .045, .275, 1.09, 1.12, .38));
  eyes.push(ball(.032, '#1f2423', head, side * .133, .042, .308, .9, 1.15, .5));
  const brow = ball(.083, '#342920', head, side * .135, .164, .263, 1.15, .29, .33); brow.rotation.z = side * -.13; brows.push(brow);
  ball(.104, '#393635', head, side * .335, .018, -.015, .42, 1.6, 1);
  ball(.087, '#605851', head, side * .37, .018, -.02, .22, 1.55, .87);
 }
 const band = new THREE.Mesh(new THREE.TorusGeometry(.353, .025, 8, 32, Math.PI), mat('#393635')); band.position.set(0, .06, -.02); head.add(band);
 const mic = box(.021, .021, .28, '#34332d', head, .32, -.15, .13); mic.rotation.x = -.2; box(.14, .035, .046, '#34332d', head, .26, -.17, .30);
 const mouth = ball(.095, '#55251e', head, 0, -.185, .266, 1.28, .34, .35);
 const restingTeeth = box(.18, .024, .018, '#fff0c8', head, 0, -.17, .294);
 // A curved, toothy grin is separate from the speech mouth so both reset cleanly.
 const grin = new THREE.Group(); grin.position.set(0, -.16, .325); grin.visible = false; head.add(grin);
 const outline = new THREE.Shape(); outline.moveTo(-.245, .065); outline.quadraticCurveTo(0, -.02, .245, .095); outline.quadraticCurveTo(.19, -.14, .03, -.165); outline.quadraticCurveTo(-.15, -.17, -.245, .065);
 const grinMouth = new THREE.Mesh(new THREE.ShapeGeometry(outline, 20), mat('#462018')); grin.add(grinMouth);
 const teethShape = new THREE.Shape(); teethShape.moveTo(-.207, .044); teethShape.quadraticCurveTo(0, -.015, .204, .063); teethShape.quadraticCurveTo(.16, -.064, .026, -.09); teethShape.quadraticCurveTo(-.13, -.10, -.207, .044);
 const grinTeeth = new THREE.Mesh(new THREE.ShapeGeometry(teethShape, 20), mat('#fff1c9')); grinTeeth.position.z = .006; grin.add(grinTeeth);
 for (const x of [-.12, -.06, .005, .07, .13]) { const line = box(.005, .034, .003, '#947a53', grin, x, -.031 + Math.abs(x) * .18, .009); line.rotation.z = x * -.9; }
 const cheekCreases: THREE.Mesh[] = [];
 for (const side of [-1,1]) { const crease = box(.068, .012, .012, '#a74b1d', head, side * .228, -.088, .292); crease.rotation.z = side * .55; crease.visible = false; cheekCreases.push(crease); }

 if (index % 4 === 2 || index % 4 === 3) for (const side of [-1,1]) { const mustache = ball(.079, '#2b251d', head, side * .063, -.115, .301, 1.15, .34, .4); mustache.rotation.z = side * -.18; }
 if (index % 4 === 3) ball(.19, '#32261d', head, 0, -.29, .16, 1.22, .73, .8);
 if (look) {
  const ring = (radius: number, tube: number, color: string, x: number, y: number, z: number) => { const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 20), mat(color)); mesh.position.set(x, y, z); head.add(mesh); return mesh; };
  if ([0,3,5].includes(look.style)) { for (const side of [-1,1]) ring(.10,.013,'#554336',side*.12,.04,.31); box(.055,.016,.022,'#554336',head,0,.045,.33); }
  if ([0,5].includes(look.style)) ball(.18,look.hair,head,0,.30,-.20,1,.9,1);
  if ([2,4].includes(look.style)) for(const side of [-1,1]) { ball(.17,look.hair,head,side*.29,-.02,-.05,.55,1.8,.9); ring(.045,.009,'#e9c34e',side*.32,-.17,.09); }
  if (look.style === 1) { ring(.43,.065,'#e5ece9',0,0,.06); const visor = ring(.37,.025,'#86ccc6',0,-.01,.28); visor.scale.y=1.1; box(.58,.13,.42,'#e5ece9',root,0,1.40,.06); }
  if (look.style === 3) box(.25,.052,.04,'#8b897b',head,0,-.105,.31);
  if (look.style === 6) { for(const side of [-1,1]) box(.20,.11,.055,'#232933',head,side*.12,.04,.31); box(.08,.024,.045,'#232933',head,0,.07,.33); }
  if (look.style === 7) { box(.68,.055,.48,'#688855',head,0,.31,.02); box(.45,.17,.36,'#688855',head,0,.39,-.03); }
 }
 const arms: THREE.Group[] = [], legs: THREE.Group[] = [];
 for (const side of [-1, 1]) { const arm = new THREE.Group(); arm.position.set(side * .37, 1.36, 0); root.add(arm); ball(.13, shirt, arm, 0, -.12, 0, .94, 1.4, .96); ball(.10, skin, arm, 0, -.39, 0, .82, 2, .8); ball(.1, skin, arm, 0, -.59); arms.push(arm); const leg = new THREE.Group(); leg.position.set(side * .16, .76, 0); root.add(leg); box(.20, .56, .25, '#303b47', leg, 0, -.27); box(.22, .13, .34, '#232d32', leg, 0, -.64, .05); legs.push(leg); }
 const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64; const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#eee5c4'; ctx.fillRect(0, 0, 128, 64); ctx.fillStyle = '#354a4a'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(name.slice(0, 10), 64, 28); ctx.font = '10px sans-serif'; ctx.fillText('KOLKATA STAFF', 64, 47); const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
 const badge = new THREE.Mesh(new THREE.PlaneGeometry(.24, .12), new THREE.MeshStandardMaterial({ map: texture })); badge.position.set(.12, 1.24, .174); root.add(badge);
 let delight = 0, previousTime: number | undefined;
 return { root, head, mouth, eyes, arms, legs, badge, update(t, state) { const walk = state.moving || 0, speech = state.talking || 0, call = state.onCall || false;
  const dt = previousTime === undefined ? 0 : Math.max(0, Math.min(.1, t - previousTime)); previousTime = t;
  const target = state.stunned ? 0 : Math.max(0, Math.min(1, state.celebrating || 0));
  delight += (target - delight) * (1 - Math.exp(-dt * 14));
  const chuckle = Math.sin(t * 17), rub = Math.sin(t * 12);
  root.rotation.z = state.stunned ? chuckle * .22 : Math.sin(t * 1.6 + index) * .012 + delight * chuckle * .025;
  root.rotation.x = delight * -.035;
  head.rotation.y = (speech ? Math.sin(t * 4) * .09 : Math.sin(t * .9 + index) * .04) + delight * Math.sin(t * 5) * .11;
  head.rotation.x = (call ? -.10 + Math.sin(t * 2.4) * .055 : Math.sin(t) * .014) * (1 - delight) + delight * (-.19 + chuckle * .075);
  head.rotation.z = delight * (-.10 + Math.sin(t * 8) * .045);
  mouth.scale.y = .34 + speech * 1.45; mouth.visible = restingTeeth.visible = delight < .08;
  grin.visible = delight >= .08; grin.scale.set(1 + delight * .07, .65 + delight * (.35 + chuckle * .09), 1); grin.rotation.z = delight * -.06;
  cheekCreases.forEach(crease => crease.visible = delight >= .12);
  const blink = (t + index * .8) % 4.3 < .14;
  eyes.forEach(eye => eye.scale.y = blink ? .1 : 1.2 - delight * .77);
  brows.forEach((brow, i) => { const side = i ? 1 : -1; brow.rotation.z = side * -.13 + delight * (i ? .55 : -.52); brow.position.y = .164 + delight * (i ? .018 : -.015); });
  arms.forEach((arm, i) => {
   arm.position.y = (state.seated ? 1.43 : 1.36) + delight * (.035 + chuckle * .012);
   const rest = state.seated ? -1.45 + Math.sin(t * (call ? 6 : 2) + i * 2) * (call ? .055 : .015) : Math.sin(t * 9 + i * Math.PI) * walk * .55;
   arm.rotation.x = rest * (1 - delight) + delight * (-1.84 + (i ? 1 : -1) * rub * .09);
   arm.rotation.z = state.stunned ? (i ? -.7 : .7) : state.waving && i === 1 ? -2.1 + Math.sin(t * 12) * .25 : delight * (i ? -1 : 1) * (.55 + rub * .065);
  });
  legs.forEach((leg, i) => { leg.rotation.x = state.seated ? -1.22 : Math.sin(t * 9 + i * Math.PI) * walk * .65; });
  root.position.y = state.seated ? .13 + delight * (1 + chuckle) * .012 : root.position.y;
 } };
}
export function disposeObject(root: THREE.Object3D) { root.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); for (const material of Array.isArray(o.material) ? o.material : [o.material]) { const m = material as THREE.MeshStandardMaterial; m.map?.dispose(); m.dispose(); } } }); }
