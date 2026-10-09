import * as THREE from 'three';
import {createAvatar,type AvatarRig} from '../../src/components/avatar';
export function createFilmOffice(){
const scene=new THREE.Scene();scene.background=new THREE.Color('#152e30');scene.fog=new THREE.FogExp2('#34443c',.014);
  const materials: THREE.Material[] = []; const textures: THREE.Texture[] = [];
  const materialCache:Record<string,THREE.MeshStandardMaterial>={};
  function material(color: string, emissive?: string) {const key=color+emissive;if(materialCache[key])return materialCache[key]; const m = new THREE.MeshStandardMaterial({ color, roughness: .82, flatShading: true, emissive: emissive || '#000000', emissiveIntensity: emissive ? .8 : 0 }); materials.push(m); materialCache[key]=m;return m; }
  const wood = material('#c4ad85'), metal = material('#444849'), partition = material('#35566b'), edge = material('#bbb9a7'), black = material('#1d2727'), green = material('#758961'), white = material('#eee7d2');
  function box(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; }
  function sphere(r: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene, sx = 1, sy = 1, sz = 1) { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; parent.add(o); return o; }
  function cylinder(rt: number, rb: number, h: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 12), m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; }
  function label(text: string, width: number, height: number, x: number, y: number, z: number, bg = '#ece2bf', fg = '#38493d', parent: THREE.Object3D = scene) { const c = document.createElement('canvas'); c.width = 768; c.height = 384; const ctx = c.getContext('2d')!; ctx.fillStyle = bg; ctx.fillRect(0, 0, 768, 384); ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.font = 'bold 54px sans-serif'; const lines = text.split('\n'); lines.forEach((line, i) => ctx.fillText(line, 384, 90 + i * 85, 728)); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; textures.push(t); const m = new THREE.MeshStandardMaterial({ map: t, roughness: .9 }); materials.push(m); const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), m); mesh.position.set(x, y, z); parent.add(mesh); return mesh; }
  scene.add(new THREE.HemisphereLight('#ffe8bd', '#465354', 2));
  const sun = new THREE.DirectionalLight('#ffd696', 3.8); sun.position.set(-7, 10, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -14; sun.shadow.camera.right = 14; sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14; sun.shadow.normalBias = .025; scene.add(sun);
  const point = new THREE.PointLight('#ffe4ab', 60, 22, 2); point.position.set(0, 4, 0); scene.add(point);
  for (let color = 0; color < 2; color++) { const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(1, .12, 1), material(color ? '#70746a' : '#7e8175'), 153); const matrix = new THREE.Matrix4(); let n = 0; for (let x = -9; x < 9; x++) for (let z = -8; z < 9; z++) if (Math.abs((x + z) % 2) === color) { matrix.makeTranslation(x + .5, -.1, z + .5); tiles.setMatrixAt(n++, matrix); } tiles.receiveShadow = true; scene.add(tiles); }

  box(18, 5.8, .22, material('#b7b198'), 0, 2.85, -8); box(.22, 5.8, 17, material('#a1a895'), -9, 2.85, .5); box(18, .24, 17, material('#8d907f'), 0, 5.85, .5);
  box(18, .13, .25, metal, 0, 1.5, -7.8);
  box(18, 5.8, .22, material('#a69e84'), 0, 2.85, 9);
  label('WELCOME TO THE SCAMILY\nEVERY CALL COUNTS', 3.2, 1.3, -4.8, 3.1, 8.86, '#353e51', '#e8cc81').rotation.y = Math.PI;
  label('TAKE A BREAK\nTHEN GET BACK TO WORK', 2.4, 1.2, 2, 3.2, 8.86, '#3e5952', '#e6dcba').rotation.y = Math.PI;
  for (let i = 0; i < 4; i++) { box(2.8, 2.5, .12, metal, -6.4 + i * 4.1, 3.25, -7.77); box(2.6, 2.3, .1, material('#d4ab77', '#d6b787'), -6.4 + i * 4.1, 3.25, -7.66); for (let j = 0; j < 8; j++) box(2.6, .045, .06, edge, -6.4 + i * 4.1, 2.3 + j * .29, -7.57); box(.06, 2.4, .06, metal, -6.4 + i * 4.1, 3.25, -7.51); }
  for (let x = -6; x < 9; x += 4) for (let z = -5; z < 8; z += 5) { box(2.1, .15, .4, metal, x, 5.45, z); box(1.95, .04, .28, material('#fff4d5', '#fff1c2'), x, 5.34, z); }
  for (let x = -8; x <= 8; x += 2) box(.018, .03, 16.8, metal, x, 5.69, .5);
  for (let z = -7; z <= 8; z += 2) box(18, .03, .018, metal, 0, 5.69, z);
  const characters: AvatarRig[] = []; const playerRigs = new Map<string, AvatarRig>(); const propMeshes = new Map<string, THREE.Mesh>(); const screens: THREE.Mesh[] = [];
  const screenMats = ['#4b797e', '#9b725a', '#77799d', '#4e8974'].map(c => material(c, c));
  function desk(x: number, z: number, angle: number, index: number) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = angle; scene.add(g);
    box(2.8, .13, 1.5, wood, 0, 1.35, 0, g); for (const a of [-1.22, 1.22]) for (const b of [-.57, .57]) box(.09, 1.35, .09, metal, a, .675, b, g);
    box(2.95, 1.12, .10, partition, 0, 1.88, -.77, g); box(3, .06, .16, edge, 0, 2.47, -.77, g); box(.09, 1.2, 1.54, partition, -1.45, 1.92, -.03, g); box(.14, .06, 1.56, edge, -1.45, 2.53, -.03, g);
    box(1.25, .85, .12, black, 0, 1.99, -.34, g); const screen = box(1.12, .69, .015, screenMats[index % 4], 0, 1.99, -.267, g); screens.push(screen);
    label('Kolkata OS\n● ● ● ●\nWORK HARD. PROBABLY.', 1.03, .54, 0, 1.99, -.252, '#214f53', '#e3d589', g);
    box(.07, .24, .08, black, 0, 1.5, -.34, g); box(.45, .035, .27, black, 0, 1.43, -.33, g);
    box(.86, .055, .30, edge, -.08, 1.46, .35, g); const keycaps = new THREE.InstancedMesh(new THREE.BoxGeometry(.052, .013, .047), white, 48); const keyMatrix = new THREE.Matrix4(); for (let a = 0; a < 12; a++) for (let b = 0; b < 4; b++) { keyMatrix.makeTranslation(-.44 + a * .065, 1.496, .24 + b * .065); keycaps.setMatrixAt(a * 4 + b, keyMatrix); } g.add(keycaps);
    sphere(.115, black, .70, 1.46, .35, g, .72, .45, 1); box(.38, .015, .48, partition, .7, 1.424, .32, g);
    cylinder(.09, .075, .22, material(index % 2 ? '#c5a152' : '#b77b54'), -.83, 1.53, .12, g); cylinder(.075, .075, .007, black, -.83, 1.647, .12, g);
    label('STAY\nAWAKE', .28, .25, .99, 2.09, -.69, '#e8ce72', '#483e2d', g);
    box(.30, .72, .72, edge, 1.07, .47, -.10, g); box(.26, .35, .01, black, 1.07, .57, .265, g);
    const chair = new THREE.Group(); chair.position.set(0, 0, 1.02); g.add(chair); box(.78, .14, .67, black, 0, .70, 0, chair); box(.78, .75, .13, black, 0, 1.09, .37, chair); cylinder(.055, .055, .52, metal, 0, .36, 0, chair); for (let i = 0; i < 5; i++) { const leg = box(.65, .05, .06, black, 0, .15, 0, chair); leg.rotation.y = i / 5 * Math.PI * 2; }
    if (index < 4) { const rig = createAvatar(index, 'EMPLOYEE'); rig.root.position.set(0, 0, 1.05); rig.root.rotation.y = Math.PI; g.add(rig.root); characters.push(rig); }
    if (index >= 8) { label('DESK 0' + (index - 7), .9, .35, 0, 2.28, -.69, '#e8ce72', '#483e2d', g); const ring = new THREE.Mesh(new THREE.RingGeometry(.50, .63, 32), new THREE.MeshBasicMaterial({ color: '#eed275', side: THREE.DoubleSide, transparent: true, opacity: .65 })); ring.rotation.x = -Math.PI / 2; ring.position.set(0, .012, 1.25); g.add(ring); }

  }
  let index = 0; for (let z = -4.6; z <= 4; z += 3.9) { desk(-4.8, z, 0, index++); desk(-1.8, z, 0, index++); desk(3.3, z, 0, index++); desk(6.3, z, 0, index++); }
  const board = label('DAILY TARGETS\n1. SCAM   2. TEAMWORK\n3. DO NOT GET FIRED', 3.4, 1.7, 1.2, 3.4, -7.45); board.material = material('#ebe4c7'); label('DAILY TARGETS\n1. SCAM   2. TEAMWORK\n3. DO NOT GET FIRED', 3.3, 1.6, 1.2, 3.4, -7.43);
  const sign = label('KOLKATA\nCALL CENTER\nEST. SOMETIME RECENTLY', 2.8, 1.4, -8.76, 3.6, -1.3, '#203f3f', '#eacc6b'); sign.rotation.y = Math.PI / 2;
  function plant(x: number, z: number) { cylinder(.27, .19, .48, material('#b19774'), x, .24, z); for (let j = 0; j < 8; j++) { const a = j * .85; const leaf = sphere(.38, green, x + Math.sin(a) * .23, .75 + j % 3 * .16, z + Math.cos(a) * .23, scene, .25, 1.2, .6); leaf.rotation.z = Math.sin(a) * .8; } }
  plant(-8, -7); plant(8, -7); plant(-8, 6); plant(1, -7);
  const wall = material('#aaa68a'), burgundy = material('#81392e');
  box(9, .14, 7.3, material('#858475'), 15.5, -.10, -3.35); box(9, .14, 8, material('#79776b'), 15.5, -.10, 5);
  box(3, .14, 9, material('#7b7c70'), 10.2, -.10, 2);
  box(.2, 5.5, 16, wall, 20, 2.75, 1); box(9, 5.5, .2, wall, 15.5, 2.75, -7); box(9, 5.5, .2, wall, 15.5, 2.75, 9);
  box(.15, 5.5, 5.5, wall, 9, 2.75, -5.25); box(.15, 5.5, 2.5, wall, 9, 2.75, 7.75);
  label('BREAK ROOM / DELIVERY', 4, .65, 15.4, 3.5, -6.84, '#365b58', '#f4df98');
  box(3.9, 1.2, 1.2, wood, 15.1, .6, -5.6); box(.8, .65, .55, black, 15, 1.56, -5.4); cylinder(.16, .16, .27, white, 15, 1.44, -5.05); box(.7, 1.1, .2, metal, 18.8, 1.55, -6.65); label('POWER\nE TO RESET', .7, .5, 18.8, 1.75, -6.5, '#e4c762');
  cylinder(.16, .16, .8, material('#c85037'), 12.2, .4, -4.5); label('FIRE\nSAFETY', .7, .5, 12.2, 1.6, -6.75, '#c85037', '#fff1d0');
  label('SCAMAZON\nPARCEL PICKUP\nPRESS E TO OPEN', 1.5, 1, 7.2, 2.2, 8.72, '#e5bd54', '#354443').rotation.y = Math.PI;
  box(2.8, .18, 4, burgundy, 15.5, 1.3, 4.7); for (const x of [14.4, 16.6]) for (const z of [3.2, 6.2]) box(.12, 1.3, .12, metal, x, .65, z);
  const screen = label('PERFORMANCE REVIEW\nTHE NUMBERS ARE IN.\nPLEASE REMAIN EMPLOYED.', 5, 2.7, 15.5, 3.1, 8.78, '#e4ca73', '#423921'); screen.rotation.y = Math.PI;
  for (let i = 0; i < 6; i++) { const x = i % 2 ? 17.5 : 13.5, z = 3.1 + Math.floor(i / 2) * 1.5; box(.75, .13, .75, black, x, .7, z); box(.12, .8, .75, black, x + (i % 2 ? .4 : -.4), 1.1, z); cylinder(.05, .05, .65, metal, x, .35, z); }
  const meetingLight = new THREE.PointLight('#ffe6a6', 110, 20, 2); meetingLight.position.set(15, 4.7, 1); scene.add(meetingLight);
  const fire = new THREE.Group(); fire.position.set(12.2, .4, -4.5); scene.add(fire); for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.18, .8, 6), material(i % 2 ? '#ffbf42' : '#f67836', '#e9551b')); f.position.set(Math.sin(i * 2) * .2, .3, Math.cos(i * 2) * .2); fire.add(f); }

  for (let i = 0; i < 12; i++) { const paper = box(.28, .005, .4, white, Math.sin(i * 5) * 7, .015, Math.cos(i * 3) * 6); paper.rotation.y = i; }
  const fans: THREE.Group[] = []; for (const x of [-4, 4]) { const f = new THREE.Group(); f.position.set(x, 4.85, 0); scene.add(f); cylinder(.1, .1, .7, metal, x, 5.2, 0); sphere(.19, metal, 0, 0, 0, f, 1, .5, 1); for (let i = 0; i < 3; i++) { const blade = box(1.8, .04, .20, edge, 0, 0, 0, f); blade.rotation.y = i * Math.PI / 3; } fans.push(f); }

return {scene,characters,fans,fire,screens,sun,point,meetingLight};
}
