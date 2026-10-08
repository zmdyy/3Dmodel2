/* 3Dmodel2 | Surface Finish v2.0
 * Real procedural color wear + independent roughness and bump variation.
 * Aim: practical, gently aged matte equipment, NOT polished showroom chrome.
 * Scope: opaque ordinary objects; keep optical glass, mirrors, lighting and teaching rays intact.
 * Requires a preloaded local THREE (r144/r160). No online textures or extra geometry.
 */
(function(){
"use strict";
const THREE=window.THREE;
if(!THREE || !THREE.WebGLRenderer || THREE.WebGLRenderer.prototype.__materialFinishV2) return;
const control=window.MaterialFinish3D={
  version:"2.0", enabled:true, preset:"subtle-used-matte",
  applied:0, skipped:0, refreshed:0, samples:{}
};
const visited=new WeakSet();
const cache=Object.create(null);
function rnd(x,y,seed){const n=Math.sin(x*127.1+y*311.7+seed*74.7)*43758.5453;return n-Math.floor(n);}
function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function isWarmMetal(m){
  if(!m.color)return false;
  const c=m.color;
  return c.r>c.g*1.18 && c.g>c.b*1.09;
}
function surface(type){
  if(cache[type]) return cache[type];
  const N=256,canvases=[],ctxs=[],images=[];
  for(let k=0;k<3;k++){
    const c=document.createElement('canvas');c.width=c.height=N;
    const ctx=c.getContext('2d');if(!ctx)return null;
    canvases.push(c);ctxs.push(ctx);images.push(ctx.createImageData(N,N));
  }
  const metal=type==="steel"||type==="warm";
  const warm=type==="warm", coated=type==="coat";
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const fine=rnd(x,y,3), fine2=rnd(x,y,11);
    const dither=rnd(x*3,y*2,5)-.5;
    const broad=rnd(Math.floor(x/18),Math.floor(y/19),7);
    const streak=metal ? Math.sin(y*.92 + Math.sin(x*.17)*.28)*.032 : 0;
    const pores=(fine>.986 && fine2>.75)? -.21:0;
    const cut=(metal && rnd(Math.floor(y/3),47,8)>.982 && x>28 && x<225)?-.13:0;
    const uneven=(broad-.5)*(coated?.09:metal?.17:.13);
    const nearEdge = coated ? (Math.min(x,N-1-x,y,N-1-y)<8?-.065:0):0;
    const base=metal?.895:coated?.94:.922;
    const color=clamp(base+uneven+(fine-.5)*(metal?.092:.067)+streak+pores+cut+nearEdge,.54,.992);
    const rough=clamp((metal?.87:coated?.92:.94)+(fine-.5)*.13+(broad-.5)*.17+streak*.8, .67,1);
    const bump=clamp(.50+(fine-.5)*.25+(broad-.5)*.13+streak*.3 + pores*.6, .12,.84);
    const i=(y*N+x)*4;
    const rgb=warm ? [color, color*.966, color*.89] : [color,color,color];
    const values=[rgb,[rough,rough,rough],[bump,bump,bump]];
    for(let k=0;k<3;k++){
      images[k].data[i]=Math.round(values[k][0]*255);
      images[k].data[i+1]=Math.round(values[k][1]*255);
      images[k].data[i+2]=Math.round(values[k][2]*255);
      images[k].data[i+3]=255;
    }
  }
  const names=["map","roughnessMap","bumpMap"],res={};
  for(let k=0;k<3;k++){
    ctxs[k].putImageData(images[k],0,0);
    const tex=new THREE.CanvasTexture(canvases[k]);
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.repeat.set(metal?3:2,metal?6:3);
    tex.anisotropy=2;
    if(k===0){
      if(THREE.SRGBColorSpace!==undefined) tex.colorSpace=THREE.SRGBColorSpace;
      if(THREE.sRGBEncoding!==undefined) tex.encoding=THREE.sRGBEncoding;
    }
    res[names[k]]=tex;
  }
  cache[type]=res;
  return res;
}
function enhance(mat,obj){
  if(!mat||visited.has(mat))return;
  visited.add(mat);
  if(!(mat.isMeshStandardMaterial||mat.isMeshPhysicalMaterial)){control.skipped++;return;}
  if(mat.userData&&mat.userData.noMaterialFinish){control.skipped++;return;}
  if(mat.transparent||mat.opacity<.985 || mat.alphaMap || mat.wireframe ||
      (mat.transmission||0)>.001 || typeof mat.roughness!=="number" || mat.roughness<.10){control.skipped++;return;}
  if(mat.emissive && mat.emissive.getHex && mat.emissive.getHex()!==0 && mat.emissiveIntensity>.30){control.skipped++;return;}
  // Texture sampling requires UV coordinates. Geometry without UV can still receive roughness changes.
  const uv=!!(obj && obj.geometry && obj.geometry.attributes && obj.geometry.attributes.uv);
  const metal=mat.metalness||0;
  const type=metal>.56?(isWarmMetal(mat)?"warm":"steel"):(metal>.12?"coat":"poly");
  const originalRoughness=mat.roughness;
  const minimum=metal>.56?.63:metal>.12?.68:.77;
  mat.roughness=Math.max(mat.roughness,minimum);
  if(typeof mat.envMapIntensity==="number")
    mat.envMapIntensity=Math.min(mat.envMapIntensity,metal>.55?.79:.66);
  if(mat.isMeshPhysicalMaterial && (mat.clearcoat||0)>0){
    mat.clearcoat=Math.min(mat.clearcoat,metal>.5?.12:.16);
    mat.clearcoatRoughness=Math.max(mat.clearcoatRoughness||0,.62);
  }
  if(uv){
    const surf=surface(type);
    if(surf){
      // Do not overwrite authored color photography or normal/displacement textures.
      if(!mat.map && !mat.vertexColors)mat.map=surf.map;
      if(!mat.roughnessMap)mat.roughnessMap=surf.roughnessMap;
      if(!mat.normalMap && !mat.bumpMap && !mat.displacementMap){
        mat.bumpMap=surf.bumpMap;
        mat.bumpScale=metal>.56?.006:.003;
      }
      mat.needsUpdate=true;
    }
  }
  mat.userData=mat.userData||{};
  mat.userData.materialFinish3D={version:"2.0",type,roughnessBefore:originalRoughness,roughnessAfter:mat.roughness};
  control.applied++;control.samples[type]=(control.samples[type]||0)+1;
}
function inspect(scene){
  if(!scene||!scene.isObject3D||!scene.traverse)return;
  scene.traverse(function(obj){
    if(!obj.isMesh&&!obj.isInstancedMesh)return;
    const m=obj.material;
    if(Array.isArray(m))m.forEach(x=>enhance(x,obj));else enhance(m,obj);
  });
}
const Base=THREE.WebGLRenderer;
THREE.WebGLRenderer=new Proxy(Base,{
  construct(Target,args,NewTarget){
    const instance=Reflect.construct(Target,args,NewTarget);
    const oldRender=instance.render;
    let frames=0;
    instance.render=function(scene,camera){
      frames++;
      if(control.enabled && (frames<5||frames%120===0)){
        try{inspect(scene);control.refreshed++;}
        catch(e){if(!control.error){control.error=String(e);console.warn("[MaterialFinish3D]",e);}}
      }
      return oldRender.apply(this,arguments);
    };
    return instance;
  }
});
THREE.WebGLRenderer.prototype.__materialFinishV2=true;
})();