/* 3Dmodel2 / material-finish v1.0
 * A lightweight, non-destructive surface finish layer for the existing Three.js scenes.
 * Keeps glass, optical mirrors, transparent parts, emissive light and educational overlays intact.
 * No external assets; textures are deterministic and reused across all materials.
 */
(function () {
  'use strict';
  var T = window.THREE;
  if (!T || !T.WebGLRenderer || T.WebGLRenderer.prototype.__materialFinishV1) return;
  var config = window.MaterialFinish3D = { enabled: true, preset: 'used-matte', version: '1.0' };
  var seen = new WeakSet(), textures = Object.create(null);
  function hash(x,y,s) {
    var a = Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;
    return a-Math.floor(a);
  }
  function texture(kind) {
    if (textures[kind]) return textures[kind];
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var ctx = c.getContext('2d'); if (!ctx) return null;
    var img = ctx.createImageData(128,128), d=img.data;
    for(var y=0;y<128;y++) for(var x=0;x<128;x++){
      var n=hash(x,y,kind==='metal'?7:19);
      var broad=hash(Math.floor(x/8),Math.floor(y/9),13);
      var brush=kind==='metal'?Math.sin(y*1.54+Math.sin(x*.18)*.26)*.07:0;
      var wear=(n-.5)*.13+(broad-.5)*.08+brush;
      var v=Math.round(Math.max(204,Math.min(255,237+wear*85)));
      var i=(y*128+x)*4;d[i]=v;d[i+1]=v;d[i+2]=v;d[i+3]=255;
    }
    ctx.putImageData(img,0,0);
    var tex = new T.CanvasTexture(c);
    tex.wrapS=tex.wrapT=T.RepeatWrapping;
    tex.repeat.set(kind==='metal'?3:2,kind==='metal'?4:2);
    tex.anisotropy=2;
    textures[kind]=tex;
    return tex;
  }
  function enhance(mat) {
    if (!mat || seen.has(mat)) return;
    seen.add(mat);
    if (!(mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial)) return;
    if (mat.userData && mat.userData.noMaterialFinish) return;
    if (mat.transparent || (mat.opacity!==undefined && mat.opacity<.98) ||
        (mat.transmission||0)>.001 || mat.alphaMap || mat.wireframe) return;
    if (mat.roughness===undefined || mat.roughness<.085) return; // preserve mirrors
    if (mat.emissive && mat.emissive.getHex && mat.emissive.getHex()!==0x000000 &&
        (mat.emissiveIntensity||1)>.35) return; // preserve light sources
    var metal=mat.metalness||0, original=mat.roughness, kind='matte';
    if (metal>=.72) {
      kind='metal';
      mat.roughness=Math.max(original,.69);
      if (typeof mat.envMapIntensity==='number') mat.envMapIntensity=Math.min(mat.envMapIntensity,.78);
    } else if (metal>=.30) {
      kind='metal';
      mat.roughness=Math.max(original,.68);
      if (typeof mat.envMapIntensity==='number') mat.envMapIntensity=Math.min(mat.envMapIntensity,.72);
    } else if (metal>=.08) {
      mat.roughness=Math.max(original,.70);
      if (typeof mat.envMapIntensity==='number') mat.envMapIntensity=Math.min(mat.envMapIntensity,.65);
    } else {
      mat.roughness=Math.max(original,.73);
      if (typeof mat.envMapIntensity==='number') mat.envMapIntensity=Math.min(mat.envMapIntensity,.62);
    }
    // Existing imagery and fine surface maps always win over synthesized textures.
    if (!mat.map && !mat.roughnessMap && !mat.normalMap) {
      var grain=texture(kind);
      if (grain) {
        mat.roughnessMap=grain;
        if(!mat.bumpMap && !mat.displacementMap){
          mat.bumpMap=grain; mat.bumpScale=kind==='metal'?.0025:.0015;
        }
        mat.needsUpdate=true;
      }
    }
    if (mat.isMeshPhysicalMaterial) {
      if (mat.clearcoat>.24) mat.clearcoat=.20;
      if (mat.clearcoat>0) mat.clearcoatRoughness=Math.max(mat.clearcoatRoughness||0,.50);
    }
    if (!mat.userData) mat.userData={};
    mat.userData.materialFinish3D={version:'1.0',originalRoughness:original,category:kind};
  }
  function inspect(scene) {
    if (!scene || !scene.isObject3D || typeof scene.traverse!=='function') return;
    scene.traverse(function(obj) {
      if (!(obj.isMesh || obj.isInstancedMesh)) return;
      var m=obj.material;
      if (Array.isArray(m)) for(var i=0;i<m.length;i++) enhance(m[i]);
      else enhance(m);
    });
  }
  var nativeRender=T.WebGLRenderer.prototype.render;
  var frame=0;
  T.WebGLRenderer.prototype.render=function(scene,camera){
    if (config.enabled && (++frame<=2 || frame%120===0)) {
      try { inspect(scene); } catch (err) {
        if (!config.warned) {config.warned=true;console.warn('[MaterialFinish3D]',err);}
      }
    }
    return nativeRender.apply(this,arguments);
  };
  T.WebGLRenderer.prototype.__materialFinishV1=true;
})();