// Детализированные авторские модели конкретных товаров каталога.
import * as T from './assets/vendor/three.module.js';
import {body,cyl,screenTexture} from './product-models.js?v=27';
const dark=new T.MeshStandardMaterial({color:'#090c10',roughness:.4});
const rubber=new T.MeshStandardMaterial({color:'#17191b',roughness:.91});
const steel=new T.MeshPhysicalMaterial({color:'#b7c6d0',metalness:1,roughness:.18,clearcoat:.45,clearcoatRoughness:.12});
function grain(){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),pixels=ctx.createImageData(256,256);let seed=1234;for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const v=148+(seed%32);pixels.data.set([v,v,v,255],i);}ctx.putImageData(pixels,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(5,5);return t;}
const micro=grain();
const aluminum=new T.MeshStandardMaterial({color:'#747b83',metalness:.95,roughness:.32,roughnessMap:micro});
function plane(parent,w,h,mat,x,y,z){const mesh=new T.Mesh(new T.PlaneGeometry(w,h),mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
function screw(parent,x,y,z){const head=cyl(parent,.016,.005,steel,x,y,z);const slit=body(parent,.020,.003,.004,.001,dark,x,y,z+.006);return {head,slit};}
function emblem(parent,x,y,z,scale,material){const s=new T.Shape();s.moveTo(0,.28);s.bezierCurveTo(-.24,.44,-.49,.2,-.43,-.09);s.bezierCurveTo(-.40,-.33,-.22,-.59,-.10,-.49);s.bezierCurveTo(0,-.43,.07,-.46,.17,-.49);s.bezierCurveTo(.29,-.50,.42,-.28,.43,-.20);s.bezierCurveTo(.24,-.17,.20,.08,.40,.18);s.bezierCurveTo(.25,.39,.12,.37,0,.28);const leaf=new T.Shape();leaf.moveTo(.02,.38);leaf.bezierCurveTo(.19,.4,.24,.57,.22,.66);leaf.bezierCurveTo(.04,.62,-.03,.50,.02,.38);const m=new T.Mesh(new T.ShapeGeometry([s,leaf],24),material);m.position.set(x,y,z);m.scale.setScalar(scale);parent.add(m);return m;}
function keyboard(parent){
 const tray=body(parent,2.50,.96,.016,.06,dark,0,.25,.015);
 const rows=['esc 1 2 3 4 5 6 7 8 9 0 − =','tab Q W E R T Y U I O P [ ]','⇪ A S D F G H J K L ; ↵','⇧ Z X C V B N M , . / ⇧','fn ⌃ ⌥ ⌘        ⌘ ⌥ ◀ ▼ ▶'].map(r=>r.split(' '));
 const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');x.fillStyle='#aeb5bf';x.font='22px sans-serif';x.textAlign='center';x.textBaseline='middle';
 const keys=[];for(let row=0;row<4;row++)for(let col=0;col<13;col++){const k=body(parent,.16,.135,.022,.021,rubber,(col-6)*.185,.6-row*.179,.037);keys.push(k);x.fillText(rows[row][col]||'',col*78+39,row*100+50);}
 for(let i=0;i<4;i++)body(parent,.17,.13,.023,.022,rubber,-1.12+i*.20,-.12,.037);
 body(parent,.95,.13,.023,.025,rubber,.05,-.12,.037);for(let i=0;i<3;i++)body(parent,.17,.13,.023,.022,rubber,.71+i*.2,-.12,.037);
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;const legends=new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false});
 for(let row=0;row<4;row++)for(let col=0;col<13;col++){const label=plane(parent,.14,.12,legends,(col-6)*.185,.6-row*.179,.068);const uv=label.geometry.attributes.uv;uv.setXY(0,col*78/1024,1-row*100/512);uv.setXY(1,(col+1)*78/1024,1-row*100/512);uv.setXY(2,col*78/1024,1-(row+1)*100/512);uv.setXY(3,(col+1)*78/1024,1-(row+1)*100/512);}
 // Перфорация решёток: настоящие отверстия-углубления, инстансы экономят draw calls.
 const holes=new T.InstancedMesh(new T.CircleGeometry(.0038,6),dark,2*8*47),matrix=new T.Matrix4();let n=0;for(const sign of [-1,1])for(let col=0;col<8;col++)for(let row=0;row<47;row++){matrix.makeTranslation(sign*(1.32+col*.015),-.21+row*.020,.03);holes.setMatrixAt(n++,matrix);}parent.add(holes);
}
export function laptop(){
 const g=new T.Group(),base=body(g,3.12,2.16,.086,.15,aluminum,0,-.65,.36);base.rotation.x=-Math.PI/2;
 const top=new T.Group();top.position.set(0,-.589,.36);top.rotation.x=-Math.PI/2;g.add(top);keyboard(top);
 body(top,1.23,.65,.006,.06,new T.MeshStandardMaterial({color:'#3a4149',metalness:.7,roughness:.42}),0,-.65,.004);
 body(top,1.215,.635,.008,.057,new T.MeshStandardMaterial({color:'#69717c',metalness:.64,roughness:.27}),0,-.65,.010);
 const notch=body(top,.25,.025,.02,.012,dark,0,-1.05,.006);
 const hinge=cyl(g,.065,2.40,dark,0,-.63,-.65);hinge.rotation.set(0,0,Math.PI/2);
 const lid=new T.Group();lid.position.set(0,-.62,-.67);lid.rotation.x=-.20;g.add(lid);
 body(lid,3.12,2.02,.058,.12,aluminum,0,1.01,0);body(lid,3.015,1.914,.009,.085,dark,0,1.01,.057);
 body(lid,2.90,1.79,.004,.055,screenTexture(),0,1.02,.068);body(lid,.30,.09,.006,.02,dark,0,1.86,.08);
 cyl(lid,.012,.006,new T.MeshPhysicalMaterial({color:'#193449',metalness:.8,roughness:.07,clearcoat:1}),0,1.864,.091);
 const logo=emblem(lid,0,1.03,-.047,.34,new T.MeshStandardMaterial({color:'#252b32',metalness:1,roughness:.1,side:T.DoubleSide}));logo.rotation.y=Math.PI;
 // USB-C, MagSafe, HDMI, SD и аудиоразъём по бокам корпуса.
 for(const sign of [-1,1]){
  for(const z of sign<0?[-.38,-.12,.17]:[-.33,.28]){const port=body(g,.15,.026,.011,.011,dark,sign*1.59,-.65,z);port.rotation.y=Math.PI/2;const inner=body(g,.10,.007,.014,.002,steel,sign*1.594,-.65,z);inner.rotation.y=Math.PI/2;}
 }
 const sd=body(g,.29,.012,.015,.004,dark,1.59,-.65,.70);sd.rotation.y=Math.PI/2;
 const jack=cyl(g,.027,.015,dark,-1.59,-.65,.62);jack.rotation.set(0,0,Math.PI/2);
 const underside=new T.Group();underside.position.y=-.72;underside.rotation.x=Math.PI/2;g.add(underside);
 for(const x of [-1.16,1.16])for(const y of [-.54,.98]){cyl(underside,.105,.015,rubber,x,y,.007);screw(underside,x*.97,y*.91,.002);}
 g.rotation.set(.13,-.28,0);return g;
}
export function phone(){
 const g=new T.Group(),backMat=new T.MeshPhysicalMaterial({color:'#829eb3',metalness:.16,roughness:.35,clearcoat:.65,clearcoatRoughness:.3,roughnessMap:micro});
 body(g,1.32,2.68,.134,.20,steel);body(g,1.275,2.635,.012,.18,backMat,0,0,-.108);
 body(g,1.285,2.641,.013,.19,dark,0,0,.109);body(g,1.205,2.546,.004,.16,screenTexture(),0,0,.125);body(g,.49,.115,.007,.045,dark,0,1.207,.137);
 for(const x of [-.10,.07])cyl(g,.020,.006,new T.MeshPhysicalMaterial({color:'#1c2636',roughness:.1,metalness:.6,clearcoat:1}),x,1.216,.146);
 body(g,.25,.009,.006,.004,dark,0,1.295,.131);
 const mount=body(g,.77,.80,.059,.17,backMat,.20,.82,-.163);
 const glass=new T.MeshPhysicalMaterial({color:'#101c2e',metalness:.25,roughness:.07,clearcoat:1,clearcoatRoughness:.025});
 for(const [x,y]of[[.39,1.035],[.06,.82],[.39,.625]]){
  cyl(g,.163,.054,steel,x,y,-.211);cyl(g,.142,.047,dark,x,y,-.242);cyl(g,.119,.046,glass,x,y,-.250);
  cyl(g,.077,.049,new T.MeshStandardMaterial({color:'#152948',metalness:.9,roughness:.13}),x,y,-.254);cyl(g,.043,.05,dark,x,y,-.258);
  const glint=new T.Mesh(new T.CircleGeometry(.022,24),new T.MeshBasicMaterial({color:'#6f8fbe',transparent:true,opacity:.55}));glint.position.set(x-.045,y+.039,-.287);glint.rotation.y=Math.PI;g.add(glint);
 }
 cyl(g,.051,.018,new T.MeshStandardMaterial({color:'#e1ddcb',roughness:.3}),.06,1.105,-.217);cyl(g,.045,.018,dark,.06,.565,-.217);cyl(g,.013,.018,dark,.055,.665,-.217);
 emblem(g,0,-.03,-.123,.27,new T.MeshStandardMaterial({color:'#a9c0d1',metalness:.9,roughness:.18,side:T.DoubleSide})).rotation.y=Math.PI;
 for(const y of [.58,.23])body(g,.012,.24,.042,.005,steel,-.694,y,0);body(g,.012,.37,.042,.005,steel,.694,.39,0);body(g,.015,.10,.043,.005,dark,-.694,.91,0);
 // Диэлектрические вставки, перфорация динамиков и винты у Lightning.
 const band=new T.MeshStandardMaterial({color:'#637c8b',roughness:.6});for(const sign of [-1,1])for(const y of [-1.07,1.07])body(g,.010,.026,.147,.004,band,sign*.686,y,0);
 const bottom=new T.Group();bottom.position.y=-1.382;bottom.rotation.x=Math.PI/2;g.add(bottom);body(bottom,.19,.048,.005,.014,dark,0,0,0);
 for(const sign of [-1,1]){screw(bottom,sign*.15,0,.002);for(let i=0;i<5;i++)cyl(bottom,.012,.006,dark,sign*(.25+i*.045),0,.004);}
 g.rotation.set(.04,Math.PI+.32,-.06);return g;
}
