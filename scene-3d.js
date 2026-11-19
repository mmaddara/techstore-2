import * as T from './assets/vendor/three.module.js';
import { finishLaptop, finishPhone, finishScreen } from './model-finish.js?v=47';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';
import { GLTFLoader } from './assets/vendor/GLTFLoader.js';
import { studioFloor, backdrop } from './studio.js?v=36';
import { buildLights } from './studio-lights.js?v=47';
import { screenTexture } from './product-models.js?v=27';
import { EffectComposer } from './assets/vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './assets/vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './assets/vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './assets/vendor/addons/postprocessing/OutputPass.js';
import { fitStage } from './scene-layout.js?v=37';
const root=document.querySelector('.experience'),host=document.querySelector('.model-stage'),status=document.querySelector('.model-status');
try {
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setClearColor(0x080b0d,1);
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;
 const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','3D-модель Apple AirPods Max. Стрелки — повернуть, Home — исходный ракурс.');host.append(canvas);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.1,50);camera.position.set(0,.65,7.4);camera.lookAt(0,.1,0);
 const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);scene.environment=env.texture;scene.environmentIntensity=.32;room.dispose();pmrem.dispose();
 const studioRig=buildLights(scene);
 const pivot=new T.Group();scene.add(pivot);
 const loader=new GLTFLoader();
 const assets=await Promise.all(['airpods-max.glb','macbook-pro-14.glb','iphone-13-pro.glb'].map(file=>loader.loadAsync('./assets/models/'+file)));
 function normalize(model,dimension,target){
  model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),scale=target/size[dimension];
  const wrap=new T.Group();model.scale.multiplyScalar(scale);model.position.addScaledVector(center,-scale);wrap.add(model);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{m.envMapIntensity=1;if(m.map)m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());});}});
  return wrap;
 }
 const sound=normalize(assets[0].scene,'y',3.4);
 const mac=assets[1].scene;finishLaptop(mac);finishPhone(assets[2].scene);
 const lid=mac.getObjectByName('Lid');if(lid)lid.rotation.x=-.22;
 mac.traverse(o=>{if(o.isMesh&&o.material?.name==='Screen'){const screen=screenTexture();o.material=finishScreen(screen.map);screen.dispose();}});
 const work=normalize(mac,'x',3.9);work.rotation.set(.10,-.25,0);
 const connect=normalize(assets[2].scene,'y',3.15);connect.rotation.y=Math.PI/2;
 const originals={sound,work,connect},models={};
 Object.entries(originals).forEach(([key,object])=>{const slot=new T.Group();slot.add(object);slot.userData.key=key;models[key]=slot;pivot.add(slot);});
 const localBounds=Object.fromEntries(Object.entries(models).map(([key,model])=>{
  model.updateMatrixWorld(true);const inverse=model.matrixWorld.clone().invert(),points=[];
  model.traverse(mesh=>{if(!mesh.isMesh)return;mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox,matrix=new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);
   for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new T.Vector3(x,y,z).applyMatrix4(matrix));
  });return [key,points];
 }));
 if(new URLSearchParams(location.search).has('debug3d'))canvas.dataset.localBounds=JSON.stringify(Object.fromEntries(Object.entries(localBounds).map(([key,points])=>[key,points.map(p=>p.toArray())])));
 const materials=new Map();
 pivot.traverse(object=>{if(object.isMesh)for(const material of(Array.isArray(object.material)?object.material:[object.material]))if(!materials.has(material))materials.set(material,{opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite});});
 let lastOpacity=1;
 function fadeProducts(opacity){
  if(opacity===lastOpacity)return;lastOpacity=opacity;
  pivot.visible=opacity>0;
  materials.forEach((original,material)=>{material.opacity=original.opacity*opacity;material.transparent=opacity<1||original.transparent;material.depthWrite=opacity<1?false:original.depthWrite;});
 }
 const renderTarget=new T.WebGLRenderTarget(800,600,{type:T.HalfFloatType,samples:4});
 const composer=new EffectComposer(renderer,renderTarget);composer.addPass(new RenderPass(scene,camera));
 const bloom=new UnrealBloomPass(new T.Vector2(800,600),.22,.55,1.0);composer.addPass(bloom);composer.addPass(new OutputPass());
 canvas.dataset.modelSource='gltf';

 scene.add(studioFloor(),backdrop());
 scene.fog=new T.Fog(0x080b0d,9,20);

 const motion=matchMedia('(prefers-reduced-motion: reduce)');let active='sound',yaw=-.65,pitch=0,targetYaw=yaw,targetPitch=0,frame=0,visible=true,drag=null;
 let transition=null,lastFrame=0,pending='sound';
 let paused=false,lastPaint=0;const ambientEpoch=performance.now(),pauseButton=document.querySelector('[data-presentation-pause]');
 const presentation=root.closest('.presentation-home');
 const duration=650,defaultYaw={sound:-.65,work:.05,connect:-.5};
 const smooth=t=>t*t*t*(t*(t*6-15)+10);
 function beginTransition(){transition={start:performance.now(),opacity:lastOpacity,swapped:false};studioRig.select(pending);}
 const priceLabels=[...root.querySelectorAll('[data-model-price]')];let hovered=null;
 function showPrice(key){hovered=key;priceLabels.forEach(el=>el.classList.toggle('is-visible',el.dataset.modelPrice===key));}
 const names={sound:'Apple AirPods Max',work:'MacBook Pro 14',connect:'Apple iPhone 13 Pro'};
 function draw(now){
  frame=0;if(!visible||document.hidden)return;
  const ambient=!!presentation&&!paused&&!motion.matches&&!drag;
  if(ambient&&!transition&&now-lastPaint<32){invalidate();return;}lastPaint=now;
  const elapsed=lastFrame?Math.min(now-lastFrame,64):16.7;lastFrame=now;
  const k=motion.matches?1:1-Math.exp(-elapsed/85);
  yaw+=(targetYaw-yaw)*k;pitch+=(targetPitch-pitch)*k;
  const progress=transition?(motion.matches?1:Math.min((now-transition.start)/duration,1)):1,eased=smooth(progress);
  if(transition){
   // Objects disappear in their own regions before exchanging positions.
   // A straight-line swap would send the wide laptop through its neighbours.
   if(progress<.4)fadeProducts(transition.opacity*(1-smooth(progress/.4)));
   else{
    if(!transition.swapped){fadeProducts(0);active=pending;yaw=targetYaw=defaultYaw[active];pitch=targetPitch=0;transition.swapped=true;}
    fadeProducts(smooth((progress-.4)/.6));
   }
  }
  Object.entries(models).forEach(([key,m])=>{
   const others=Object.keys(models).filter(k=>k!==active);
   const phase=(now-ambientEpoch)/3500+Object.keys(models).indexOf(key)*2;
   m.rotation.set((key===active?pitch:0)+(ambient?Math.sin(phase*.7)*.025:0),(key===active?yaw:(others.indexOf(key)===0?.15:-.35))+(ambient?Math.sin(phase)*.09:0),0);
  });
  const metrics=fitStage(models,localBounds,camera,host.clientWidth,host.clientHeight,active);
  priceLabels.forEach(el=>{const b=metrics[el.dataset.modelPrice];el.style.left=Math.max(60,Math.min(host.clientWidth-60,(b.left+b.right)/2))+'px';el.style.top=(b.bottom+18)+'px';});
  canvas.dataset.animation=ambient?'running':'paused';
  canvas.dataset.bounds=JSON.stringify(Object.fromEntries(Object.entries(metrics).map(([key,b])=>[key,{left:b.left,right:b.right,top:b.top,bottom:b.bottom}])));
  studioRig.blend(eased);composer.render();canvas.dataset.rotation=yaw.toFixed(2);
  if(progress===1)transition=null;
  if(ambient||transition||Math.abs(targetYaw-yaw)+Math.abs(targetPitch-pitch)>.001)invalidate();
 }
 function invalidate(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(draw);}
 function reset(){targetYaw=defaultYaw[active];targetPitch=0;invalidate();}
 function choose(){pending=root.dataset.scene;if(pending!==active||transition)beginTransition();canvas.setAttribute('aria-label',`3D-витрина трёх товаров. Выбран ${names[pending]}. Стрелки — повернуть, Home — исходный ракурс.`);invalidate();}
 new MutationObserver(choose).observe(root,{attributes:true,attributeFilter:['data-scene']});choose();
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.position.z=Math.max(7.8,(w<=768?6:10.6)/(2*Math.tan(Math.PI/10)*camera.aspect));camera.lookAt(0,.1,0);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);scene.fog.near=camera.position.z+1;scene.fog.far=camera.position.z+16;studioRig.compact(w<=768);invalidate();}
 new ResizeObserver(resize).observe(host);resize();
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)invalidate();else{cancelAnimationFrame(frame);frame=0;}},{rootMargin:'100px'}).observe(host);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else invalidate();});
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,yaw:targetYaw,pitch:targetPitch};canvas.setPointerCapture(e.pointerId);canvas.classList.add('is-dragging');});
 const hoverRay=new T.Raycaster();let lastHover=0;
 canvas.addEventListener('pointerleave',()=>showPrice(null));
 canvas.addEventListener('focus',()=>showPrice(active));canvas.addEventListener('blur',()=>showPrice(null));
 canvas.addEventListener('pointermove',e=>{if(!drag){
  if(e.pointerType!=='mouse'||performance.now()-lastHover<65)return;lastHover=performance.now();
  const rect=canvas.getBoundingClientRect();hoverRay.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
  let object=hoverRay.intersectObjects(Object.values(models),true)[0]?.object;while(object&&!object.userData.key)object=object.parent;showPrice(object?.userData.key||null);return;
 }showPrice(null);targetYaw=drag.yaw+(e.clientX-drag.x)*.009;if(e.pointerType==='mouse')targetPitch=T.MathUtils.clamp(drag.pitch+(e.clientY-drag.y)*.005,-.6,.6);invalidate();});
 function release(event){
  if(event?.type==='pointerup' && drag && Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<6){
   const rect=canvas.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
   const hit=ray.intersectObjects(Object.values(models),true)[0];if(hit){let o=hit.object;while(o&&!o.userData.key)o=o.parent;if(o){root.querySelector(`[data-scene-choice="${o.userData.key}"]`).click();showPrice(o.userData.key);}}
  }
  drag=null;canvas.classList.remove('is-dragging');invalidate();
 }
 canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
 function rotate(x,y=0){targetYaw+=x;targetPitch=T.MathUtils.clamp(targetPitch+y,-.6,.6);invalidate();}
 canvas.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')reset();else rotate(e.key==='ArrowLeft'?-.3:e.key==='ArrowRight'?.3:0,e.key==='ArrowUp'?-.15:e.key==='ArrowDown'?.15:0);});
 document.querySelector('[data-model-left]').addEventListener('click',()=>rotate(-.45));document.querySelector('[data-model-right]').addEventListener('click',()=>rotate(.45));document.querySelector('[data-model-reset]').addEventListener('click',reset);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();root.classList.remove('has-3d');status.textContent='3D временно недоступно. Показана фотография.';});
 canvas.addEventListener('webglcontextrestored',()=>{root.classList.add('has-3d');status.textContent='Перетаскивай, чтобы рассмотреть';invalidate();});
 draw(performance.now());root.classList.add('has-3d');status.textContent='Перетаскивай, чтобы рассмотреть';
 motion.addEventListener('change',invalidate);
 if(pauseButton)pauseButton.addEventListener('click',()=>{paused=!paused;pauseButton.setAttribute('aria-pressed',String(paused));pauseButton.textContent=paused?'Продолжить движение':'Остановить движение';invalidate();});
} catch(error){status.textContent='Показана фотография · 3D недоступно в этом браузере';console.warn('TechStore 3D fallback:',error);}
