// Авторские геометрические визуализации товаров; не инженерные CAD-модели Apple.
import * as T from './assets/vendor/three.module.js';
const metal = (color, roughness=.27) => new T.MeshStandardMaterial({color,metalness:.88,roughness});
const silver=metal('#d8dadd'), chrome=metal('#edf3f5',.15), graphite=metal('#73787f'), black=new T.MeshStandardMaterial({color:'#101316',roughness:.5});
function round(w,h,r) { const s=new T.Shape(),x=-w/2,y=-h/2; s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s; }
function body(parent,w,h,d,r,mat,x=0,y=0,z=0) { const geo=new T.ExtrudeGeometry(round(w,h,r),{depth:d,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:Math.min(.035,d/3,w/6,h/6),bevelThickness:Math.min(.035,d/3,w/6,h/6),curveSegments:16});geo.translate(0,0,-d/2); if(mat.map&&mat.isMeshBasicMaterial){const uv=geo.getAttribute('uv'),pos=geo.getAttribute('position');for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/w+.5,pos.getY(i)/h+.5);uv.needsUpdate=true;} const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m; }
function tube(parent,pts,r,mat){ const m=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),80,r,12,false),mat);parent.add(m);return m; }
function cyl(parent,r,d,mat,x,y,z){const m=new T.Mesh(new T.CylinderGeometry(r,r,d,48),mat);m.rotation.x=Math.PI/2;m.position.set(x,y,z);parent.add(m);return m;}
function cloth(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#b7bdbb';x.fillRect(0,0,128,128);for(let i=0;i<128;i+=4){x.fillStyle='#737b78';x.fillRect(i,0,1,128);x.fillRect(0,i,128,1);x.fillStyle='#d1d7d4';x.fillRect(i+1,0,1,128);}const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(5,2);return new T.MeshStandardMaterial({color:'#c9cecb',map:t,bumpMap:t,bumpScale:.015,roughness:.93,side:T.DoubleSide});}
export function headphones(){
 const g=new T.Group(),fabric=cloth();
 for(const z of [-.19,.19]) {const pts=[];for(let i=0;i<=50;i++){const a=Math.PI*i/50;pts.push([1.02*Math.cos(a),.38+1.42*Math.sin(a),z]);}tube(g,pts,.058,fabric);}
 // Сетчатое полотно между двумя дугами оголовья.
 const vertices=[],uv=[],indices=[];for(let i=0;i<=64;i++){const a=Math.PI*i/64;for(const z of [-.18,.18]){vertices.push(1.02*Math.cos(a),.38+1.42*Math.sin(a)-.03*Math.sin(a),z);uv.push(i/64,z<0?0:1);}if(i<64){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();g.add(new T.Mesh(geo,fabric));
 for(const sign of [-1,1]){
  tube(g,[[sign*1.02,.52,0],[sign*1.02,.2,0],[sign*.96,-.05,0]],.042,chrome);
  const cup=new T.Group();cup.position.set(sign*.96,-.47,0);cup.rotation.set(0,sign*.2,sign*-.09);g.add(cup);
  body(cup,.79,1.18,.26,.32,silver,0,0,.02);
  body(cup,.75,1.13,.07,.3,metal('#e5e7e8',.35),0,0,.185);
  const ring=round(.74,1.10,.29),hole=round(.43,.75,.2);ring.holes.push(new T.Path(hole.getPoints(40).reverse()));
  const cushionGeo=new T.ExtrudeGeometry(ring,{depth:.16,bevelEnabled:true,bevelThickness:.06,bevelSize:.05,bevelSegments:4,curveSegments:20});cushionGeo.translate(0,0,-.38);cup.add(new T.Mesh(cushionGeo,fabric));body(cup,.48,.8,.015,.2,black,0,0,-.19);
  // Кнопки, Digital Crown и микрофонные отверстия.
  if(sign===1){const crown=cyl(cup,.065,.065,chrome,.2,.60,.03);crown.rotation.x=0;body(cup,.16,.035,.07,.016,silver,-.15,.6,.035);}
  for(let n=0;n<4;n++)body(cup,.012,.045,.006,.005,black,-.10+n*.065,-.50,.17);
 }
 g.position.y=-.22;g.rotation.z=-.09;return g;
}
function screenTexture(){const c=document.createElement('canvas');c.width=1024;c.height=640;const x=c.getContext('2d');const gr=x.createLinearGradient(0,0,1024,640);gr.addColorStop(0,'#061927');gr.addColorStop(.5,'#296b83');gr.addColorStop(1,'#031019');x.fillStyle=gr;x.fillRect(0,0,1024,640);for(let i=0;i<8;i++){x.beginPath();x.ellipse(550+i*42,320,90+i*30,480,-.6,0,Math.PI*2);x.strokeStyle=`rgba(145,231,246,${.3-i*.026})`;x.lineWidth=18;x.stroke();}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return new T.MeshBasicMaterial({map:t});}
export function laptop(){const g=new T.Group();
 const base=body(g,3.05,2.05,.09,.14,graphite,0,-.66,.3);base.rotation.x=-Math.PI/2;
 const keys=new T.Group();keys.position.set(0,-.595,.07);keys.rotation.x=-Math.PI/2;g.add(keys);
 body(keys,2.48,.89,.01,.04,black,0,.27,0);
 for(let row=0;row<5;row++)for(let col=0;col<13;col++)body(keys,.145,.105,.015,.015,metal('#272b31',.65),(col-6)*.181,.61-row*.154,.015);
 body(keys,1.04,.6,.009,.055,metal('#90969d',.42),0,-.52,.012);
 for(const sign of [-1,1])for(let i=0;i<11;i++)body(keys,.10,.009,.008,.004,black,sign*1.36,.64-i*.075,.011);
 const lid=new T.Group();lid.position.set(0,-.61,-.68);lid.rotation.x=-.17;g.add(lid);
 body(lid,3.04,1.94,.085,.12,graphite,0,.97,0);body(lid,2.92,1.82,.012,.085,black,0,.97,.09);
 body(lid,2.78,1.67,.003,.06,screenTexture(),0,.99,.106);body(lid,.29,.095,.007,.023,black,0,1.79,.115);
 cyl(lid,.012,.005,metal('#153345',.08),0,1.79,.125);
 for(const x of [-1.1,1.1]){const hinge=cyl(g,.055,.6,graphite,x,-.64,-.66);hinge.rotation.z=Math.PI/2;}
 // Боковые разъёмы и резиновые ножки видны при повороте ноутбука.
 for(const sign of [-1,1])for(const z of [-.25,.10,.45]){const port=body(g,.19,.038,.006,.012,black,sign*1.56,-.66,z);port.rotation.y=Math.PI/2;}
 for(const x of [-1.05,1.05])for(const z of [-.35,.96]){const foot=cyl(g,.12,.025,black,x,-.736,z);foot.rotation.x=0;}
 g.rotation.set(.16,-.34,0);g.scale.setScalar(1.05);return g;}
export function phone(){const g=new T.Group(),blue=metal('#a0b5c6',.33);
 body(g,1.32,2.68,.16,.19,chrome);body(g,1.28,2.64,.015,.17,blue,0,0,-.13);
 body(g,1.26,2.62,.016,.18,black,0,0,.13);body(g,1.17,2.52,.004,.14,screenTexture(),0,0,.15);body(g,.56,.14,.01,.065,black,0,1.20,.16);
 body(g,.75,.79,.085,.14,blue,.20,.83,-.18);
 for(const [x,y]of[[.38,1.03],[.05,.83],[.38,.63]]){cyl(g,.155,.065,chrome,x,y,-.23);cyl(g,.132,.07,black,x,y,-.242);cyl(g,.093,.075,metal('#122e40',.08),x,y,-.252);cyl(g,.033,.078,metal('#243956',.12),x-.025,y+.025,-.26);}
 cyl(g,.046,.018,new T.MeshStandardMaterial({color:'#f8ebd0'}),.045,1.105,-.25);cyl(g,.041,.018,black,.045,.58,-.25);
 for(const y of [.56,.19])body(g,.016,.24,.05,.006,chrome,-.684,y,0);
 body(g,.016,.38,.05,.006,chrome,.684,.38,0);
 for(let i=0;i<6;i++){const m=cyl(g,.009,.01,black,-.45+i*.045,-1.37,0);m.rotation.x=0;}
 const port=body(g,.18,.008,.055,.004,black,0,-1.374,0);
 g.rotation.set(.05,Math.PI+.4,-.10);g.scale.setScalar(1.05);return g;}

export { body, cyl, round, screenTexture };
