import * as T from './assets/vendor/three.module.js';

// Preserve the authored meshes and maps; use layered physical finishes per part.
function physical(source, settings) {
 const result=new T.MeshPhysicalMaterial();
 T.MeshStandardMaterial.prototype.copy.call(result,source);
 Object.assign(result,settings);result.name=source.name;return result;
}
export function finishLaptop(model) {
 const aluminum=new Set(['zNRfbdNyoCOxSDD','HdeQgqDhVRltuvQ','XvtJEVWVvyDeJRR','WiyOPYJEeiHNVjF']);
 const cache=new Map();
 model.traverse(mesh=>{
  if(!mesh.isMesh)return;const original=mesh.material;
  if(cache.has(original)){mesh.material=cache.get(original);return;}
  let material=original.clone();
  if(aluminum.has(original.name)) {
   material=physical(original,{metalness:.92,roughness:.32,clearcoat:.18,clearcoatRoughness:.38});
   material.color.setRGB(.19,.205,.22);if(material.normalMap)material.normalScale.set(.35,.35);
  } else if(original.name==='quuXrfeUujYrUMo') {
   material.color.set('#dce5ea');material.roughness=.48;material.emissive.set('#8d9ca5');material.emissiveIntensity=.12;
  } else if(original.name==='ItKEDAaOJloGKSH') {
   material.roughness=.47;material.metalness=.12;
  }
  cache.set(original,material);mesh.material=material;
 });
}
export function finishPhone(model) {
 let lensMesh;
 model.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const original=mesh.material,name=original.name;
  let material=physical(original,{clearcoat:.3,clearcoatRoughness:.15});
  if(name==='Back.001'){material.color.set('#d5c5ab');material.metalness=.12;material.roughness=.38;material.clearcoat=.65;material.clearcoatRoughness=.24;}
  if(name==='GOLD.001'){material.color.set('#bba98d');material.metalness=1;material.roughness=.18;material.clearcoat=.4;}
  if(name==='Lenscover.001'){material.color.set('#101a22');material.metalness=.5;material.roughness=.13;material.clearcoat=1;lensMesh=mesh;}
  if(name==='material_11.001'){material.color.set('#253c52');material.opacity=.2;material.depthWrite=false;material.clearcoat=1;material.roughness=.06;}
  if(name==='Display.001'){material.emissiveIntensity=.65;material.roughness=.18;material.clearcoat=1;}
  if(name==='GLASS.001'){material.opacity=.055;material.depthWrite=false;material.roughness=.09;material.clearcoat=1;}
  mesh.material=material;
 });
 if(!lensMesh)return;
 const dark=new T.MeshPhysicalMaterial({color:0x030912,metalness:.32,roughness:.13,clearcoat:1});
 const coating=new T.MeshPhysicalMaterial({color:0x1a344f,metalness:.55,roughness:.09,clearcoat:1,iridescence:.35,iridescenceIOR:1.32});
 const ring=new T.MeshStandardMaterial({color:0x657482,metalness:1,roughness:.23});
 // Lens centres measured from the three rear apertures in the source mesh.
 for(const [y,z] of [[0,0],[4.8473,-8.48715],[-4.89848,-8.48715]]) {
  const optical=new T.Group();optical.name='TechStore layered optical lens';optical.position.set(-.975,y,z);optical.rotation.y=-Math.PI/2;lensMesh.add(optical);
  const well=new T.Mesh(new T.CircleGeometry(1.86,64),dark);optical.add(well);
  const inner=new T.Mesh(new T.CircleGeometry(1.17,64),coating);inner.position.z=.015;optical.add(inner);
  for(const radius of [1.28,1.67,1.86]){const edge=new T.Mesh(new T.TorusGeometry(radius,.022,6,64),ring);edge.position.z=.025;optical.add(edge);}
  const pupil=new T.Mesh(new T.CircleGeometry(.54,48),dark);pupil.position.z=.035;optical.add(pupil);
 }
}
export function finishScreen(map) {
 return new T.MeshPhysicalMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.52,metalness:.05,roughness:.19,clearcoat:1,clearcoatRoughness:.1});
}
