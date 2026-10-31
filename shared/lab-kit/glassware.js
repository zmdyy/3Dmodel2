/* Archimedes material + lighting recipe. Y up; lengths in metres. */
(function(root){
 'use strict';const K=root.LabKit=root.LabKit||{};
 function requireEngine(T){if(String(T.REVISION)!=='160')throw Error('LabKit 3D resources require Three.js r160');}
 function disposeObject(object){const gs=new Set(),ms=new Set(),ts=new Set();object.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){ms.add(m);for(const v of Object.values(m))if(v&&v.isTexture)ts.add(v);}});gs.forEach(g=>g.dispose());ts.forEach(t=>t.dispose());ms.forEach(m=>m.dispose());object.removeFromParent();}
 function createGlassLab(T,{renderer,scene}){
  requireEngine(T);const lights=new T.Group(),old={background:scene.background,fog:scene.fog,toneMapping:renderer.toneMapping,exposure:renderer.toneMappingExposure,output:renderer.outputColorSpace,shadows:renderer.shadowMap.enabled,shadowType:renderer.shadowMap.type};
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  scene.background=new T.Color('#e7eeee');scene.fog=new T.Fog('#e7eeee',24,55);lights.add(new T.HemisphereLight(0xecf7ff,0x9b9b86,2));
  const key=new T.DirectionalLight(0xfff4dc,2.4);key.position.set(-4,8,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-5,right:5,top:6,bottom:-3,near:1,far:22});key.shadow.bias=-.00035;key.shadow.normalBias=.025;key.shadow.radius=3;lights.add(key,key.target);
  const fill=new T.DirectionalLight(0xe2f2ff,1.05);fill.position.set(4,5,-3);lights.add(fill);scene.add(lights);
  return {lights,dispose(){lights.removeFromParent();key.shadow.dispose();scene.background=old.background;scene.fog=old.fog;renderer.toneMapping=old.toneMapping;renderer.toneMappingExposure=old.exposure;renderer.outputColorSpace=old.output;renderer.shadowMap.enabled=old.shadows;renderer.shadowMap.type=old.shadowType;}};
 }
 function createBeaker(T,{radius=.65,height=1.4,wall=.018,level=1.12}={}){
  requireEngine(T);if(![radius,height,wall,level].every(Number.isFinite)||radius<=0||wall<=0||wall>=radius*.2||height<=wall*3||level<0||level>height-2*wall)throw Error('Invalid beaker dimensions');
  const group=new T.Group();group.name='可复用玻璃容器';
  const glass=new T.MeshPhysicalMaterial({color:'#bdd8df',roughness:.12,metalness:0,transparent:true,opacity:.17,depthWrite:false,side:T.DoubleSide}),rim=new T.MeshStandardMaterial({color:'#849ca4',roughness:.35,metalness:.42}),waterMat=new T.MeshPhysicalMaterial({color:'#64b9d9',roughness:.18,metalness:.02,transparent:true,opacity:.19,depthWrite:false,side:T.DoubleSide}),surfaceMat=new T.MeshStandardMaterial({color:'#87cfe3',roughness:.32,transparent:true,opacity:.4,depthWrite:false,side:T.DoubleSide});
  [glass,rim,waterMat,surfaceMat].forEach(m=>m.userData.noMaterialFinish=true);
  function add(g,m,y,order){const o=new T.Mesh(g,m);o.position.y=y;o.renderOrder=order;group.add(o);return o;}
  const shape=new T.Shape();shape.absarc(0,0,radius,0,Math.PI*2,false);const hole=new T.Path();hole.absarc(0,0,radius-wall,0,Math.PI*2,true);shape.holes.push(hole);const geometry=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:64});geometry.rotateX(-Math.PI/2);
  const shell=add(geometry,glass,0,4);add(new T.CylinderGeometry(radius,radius,wall,64),glass,wall/2,4);for(const y of [wall,height])add(new T.TorusGeometry(radius-wall/2,wall*.5,10,72),rim,y,5).rotation.x=Math.PI/2;
  const water=add(new T.CylinderGeometry(radius-2*wall,radius-2*wall,1,64,1,true),waterMat,0,2),surface=add(new T.CircleGeometry(radius-2*wall,80),surfaceMat,0,3);surface.rotation.x=-Math.PI/2;let current=0,disposed=false;
  const api={group,parts:{shell,water,surface},anchors:{base:[0,0,0],mouth:[0,height,0]},bounds:{radius,height,wall},get level(){return current;},setLevel(v){if(disposed||!Number.isFinite(v)||v<0||v>height-2*wall)throw Error('Invalid water level');current=v;water.visible=surface.visible=v>0;water.scale.y=Math.max(v,1e-6);water.position.y=wall+v/2;surface.position.y=wall+v;},dispose(){if(!disposed){disposed=true;disposeObject(group);}}};api.setLevel(level);return api;
 }
 Object.assign(K,{requireEngine,disposeObject,createGlassLab,createBeaker});
})(typeof window==='undefined'?globalThis:window);
