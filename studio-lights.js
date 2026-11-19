import * as T from './assets/vendor/three.module.js';
import { RectAreaLightUniformsLib } from './assets/vendor/addons/lights/RectAreaLightUniformsLib.js';

export function buildLights(scene) {
 RectAreaLightUniformsLib.init();
 const installation=new T.Group();installation.position.set(0,.7,-3.15);scene.add(installation);
 const darkMetal=new T.MeshStandardMaterial({color:0x080d12,metalness:.85,roughness:.3});
 const shell=new T.Mesh(new T.BoxGeometry(2.35,8,.18),darkMetal);installation.add(shell);
 const white=new T.MeshBasicMaterial({color:new T.Color(0xc9efff).multiplyScalar(2.7)});
 const accent=new T.MeshBasicMaterial({color:new T.Color(0xff3b26).multiplyScalar(1.9)});
 // One architectural light installation; asymmetry avoids the three-box look.
 for(const [x,width] of [[-.84,.43],[.72,.72]]) {
  const panel=new T.Mesh(new T.PlaneGeometry(width,7.92),white);panel.position.set(x,0,.1);installation.add(panel);
 }
 const strip=new T.Mesh(new T.PlaneGeometry(.43,7.88),accent);strip.position.set(-.15,0,.105);installation.add(strip);
 const seam=new T.Mesh(new T.PlaneGeometry(.022,7.9),white);seam.position.set(.23,0,.11);installation.add(seam);
 const accentLight=new T.RectAreaLight(0xff3b26,5,.6,7);accentLight.position.set(0,.7,-2.8);accentLight.rotation.y=Math.PI;scene.add(accentLight);
 const rear=new T.RectAreaLight(0x99d9f4,5,3,6);rear.position.set(0,1,-3);rear.rotation.y=Math.PI;scene.add(rear);
 const key=new T.RectAreaLight(0xe6f0f7,4.2,5,3);key.position.set(-3.5,4.5,5);key.lookAt(0,0,0);scene.add(key);
 const fill=new T.RectAreaLight(0xc6d7e5,2.1,2,5);fill.position.set(5,1,1.5);fill.lookAt(0,0,0);scene.add(fill);
 const rim=new T.DirectionalLight(0x86d4ec,2);rim.position.set(-5,1,-2);scene.add(rim);
 scene.add(new T.HemisphereLight(0xc1d7e3,0x090e13,.18));
 const palettes={sound:0xff3b26,work:0x86c9e6,connect:0xffa963};
 let from=new T.Color(palettes.sound),to=from.clone();
 return {
  select(key){from.copy(accentLight.color);to.set(palettes[key]||palettes.sound);},
  blend(progress){accentLight.color.copy(from).lerp(to,progress);accent.color.copy(accentLight.color).multiplyScalar(1.9);},
  compact(small){installation.scale.set(small?.72:1,1,1);}
 };
}
