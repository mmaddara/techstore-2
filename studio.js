import * as T from './assets/vendor/three.module.js';
import { Reflector } from './assets/vendor/Reflector.js';
// Матовый каменный пол: размытое отражение и нерегулярная микрофактура.
export function studioFloor(){
 const shader={uniforms:T.UniformsUtils.clone(Reflector.ReflectorShader.uniforms),vertexShader:Reflector.ReflectorShader.vertexShader,fragmentShader:Reflector.ReflectorShader.fragmentShader};
 shader.vertexShader=shader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec3 vWorld;').replace('vUv = textureMatrix','vWorld = (modelMatrix * vec4(position,1.0)).xyz; vUv = textureMatrix');
 shader.fragmentShader=shader.fragmentShader.replace('varying vec4 vUv;',`varying vec4 vUv; varying vec3 vWorld;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}`);
 shader.fragmentShader=shader.fragmentShader.replace('vec4 base = texture2DProj( tDiffuse, vUv );',`vec2 uv=vUv.xy/vUv.w;float grain=noise(vWorld.xz*75.0);float spread=.003+noise(vWorld.xz*9.0)*.006; uv+=vec2(noise(vWorld.xz*31.0)-.5,noise(vWorld.zx*24.0)-.5)*.0018;
 vec4 base=texture2D(tDiffuse,uv)*.2;
 base+=texture2D(tDiffuse,uv+vec2(spread,0))*.2;base+=texture2D(tDiffuse,uv-vec2(spread,0))*.2;
 base+=texture2D(tDiffuse,uv+vec2(0,spread*2.0))*.2;base+=texture2D(tDiffuse,uv-vec2(0,spread*2.0))*.2;
 float pool=exp(-length(vWorld.xz-vec2(0,-1))*.22);vec3 stone=vec3(.017,.025,.029)*(0.7+grain*.6)*pool;`);
 shader.fragmentShader=shader.fragmentShader.replace('vec4( blendOverlay( base.rgb, color ), 1.0 )','vec4(stone + base.rgb * (.09 + grain * .055),1.0)');
 const floor=new Reflector(new T.PlaneGeometry(40,40),{shader,textureWidth:768,textureHeight:768,clipBias:.005});floor.rotation.x=-Math.PI/2;floor.position.y=-1.87;return floor;
}
export function backdrop(){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const x=canvas.getContext('2d');x.fillStyle='#080b0d';x.fillRect(0,0,1024,512);const light=x.createRadialGradient(512,390,20,512,300,490);light.addColorStop(0,'#263c41');light.addColorStop(.45,'#13252b');light.addColorStop(1,'#080b0d');x.fillStyle=light;x.fillRect(0,0,1024,512);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const wall=new T.Mesh(new T.PlaneGeometry(32,12),new T.MeshBasicMaterial({map:texture}));wall.position.set(0,2,-5);return wall;}
