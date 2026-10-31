/* Basic teaching support adapted from Archimedes stand/bracket, not manufacturer CAD. */
(function(root){'use strict';const K=root.LabKit=root.LabKit||{};
 function createStand(T,{height=.62,armLength=.20,clampHeight=.53}={}){
  K.requireEngine(T);if(![height,armLength,clampHeight].every(Number.isFinite)||height<.15||armLength<.05||clampHeight<.04||clampHeight>height)throw Error('Invalid stand dimensions');
  const group=new T.Group(),arm=new T.Group();group.add(arm);const steel=new T.MeshStandardMaterial({color:'#9aa7a5',roughness:.55,metalness:.5}),enamel=new T.MeshStandardMaterial({color:'#929e83',roughness:.78,metalness:.12}),dark=new T.MeshStandardMaterial({color:'#53615e',roughness:.7,metalness:.28});
  function add(g,m,p,x,y,z){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
  add(new T.BoxGeometry(.13,.014,.16),dark,group,0,.007,0);add(new T.CylinderGeometry(.004,.004,height,32),steel,group,0,height/2+.014,0);add(new T.BoxGeometry(armLength,.009,.012),enamel,arm,armLength/2,0,0);add(new T.BoxGeometry(.024,.032,.022),enamel,arm,0,0,0);add(new T.CylinderGeometry(.009,.009,.014,24),dark,arm,0,0,.018).rotation.x=Math.PI/2;add(new T.TorusGeometry(.006,.0015,10,40),steel,arm,armLength,-.01,0);
  let current=clampHeight,disposed=false;const api={group,parts:{arm},bounds:{height,armLength},get clampHeight(){return current;},getMountAnchor(){return [armLength,current-.01,0];},setClampHeight(y){if(disposed||!Number.isFinite(y)||y<.04||y>height)throw Error('Clamp outside pole');current=y;arm.position.y=y;},dispose(){if(!disposed){disposed=true;K.disposeObject(group);}}};api.setClampHeight(clampHeight);return api;
 }K.createStand=createStand;
})(typeof window==='undefined'?globalThis:window);
