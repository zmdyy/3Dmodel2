/* Restored from the accepted LabKit design. Camera behavior adapted from
 * shenzhong-e15 V26: spherical pose, shortest-angle/log-distance interpolation. */
(function(root){
 'use strict';const K=root.LabKit=root.LabKit||{};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),copy=p=>({target:[...p.target],dist:p.dist,yaw:p.yaw,pitch:p.pitch});
 function check(p){if(!p||!Array.isArray(p.target)||p.target.length!==3||![...p.target,p.dist,p.yaw,p.pitch].every(Number.isFinite)||p.dist<=0)throw Error('Invalid camera pose');return copy(p);}
 function lerpPose(a,b,t){return {target:a.target.map((v,i)=>v+(b.target[i]-v)*t),dist:Math.exp(Math.log(a.dist)+(Math.log(b.dist)-Math.log(a.dist))*t),yaw:a.yaw+Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw))*t,pitch:a.pitch+(b.pitch-a.pitch)*t};}
 function cameraEye(p){return [p.target[0]+p.dist*Math.cos(p.pitch)*Math.sin(p.yaw),p.target[1]+p.dist*Math.sin(p.pitch),p.target[2]+p.dist*Math.cos(p.pitch)*Math.cos(p.yaw)];}
 function fitPose({target=[0,0,0],size,yaw=.5,pitch=.2,fov=34,aspect=1,fill=.8}){
  if(!size||size.length!==3||!size.every(v=>Number.isFinite(v)&&v>0)||!(fov>0&&fov<180&&aspect>0&&fill>0&&fill<=1))throw Error('Invalid camera fit');
  const r=[Math.cos(yaw),0,-Math.sin(yaw)],u=[-Math.sin(pitch)*Math.sin(yaw),Math.cos(pitch),-Math.sin(pitch)*Math.cos(yaw)],f=[-Math.cos(pitch)*Math.sin(yaw),-Math.sin(pitch),-Math.cos(pitch)*Math.cos(yaw)];
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),tan=Math.tan(fov*Math.PI/360);let dist=0;
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){const v=[x*size[0]/2,y*size[1]/2,z*size[2]/2],front=dot(v,f);dist=Math.max(dist,Math.abs(dot(v,r))/(tan*aspect*fill)-front,Math.abs(dot(v,u))/(tan*fill)-front);}
  return check({target,dist:dist+Math.max(...size)*.01,yaw,pitch});
 }
 function sampleShots(shots,progress,state={}){
  if(!shots.length||!Number.isFinite(progress))throw Error('Shots and finite progress required');let i=0;while(i<shots.length-2&&progress>shots[i+1].at)i++;
  const a=shots[i],b=shots[Math.min(i+1,shots.length-1)],resolve=s=>check(typeof s.pose==='function'?s.pose(state):s.pose);
  let t=b.at===a.at?0:clamp((progress-a.at)/(b.at-a.at),0,1);t=t*t*(3-2*t);return lerpPose(resolve(a),resolve(b),t);
 }
 function createNavigation({element,pose,apply,fov=34,minDistance=.03,maxDistance=1000,onManual=()=>{},onChange=()=>{}}){
  let current=check(pose),goal=null,automatic=false,transition=null;const pointers=new Map(),listeners=[],oldTouch=element.style.touchAction;element.style.touchAction='none';
  const emit=()=>{apply(copy(current),cameraEye(current));onChange(copy(current));};
  const manual=()=>{automatic=false;goal=transition=null;onManual();};
  const metrics=()=>{const a=[...pointers.values()];return {x:a.reduce((s,p)=>s+p.x,0)/a.length,y:a.reduce((s,p)=>s+p.y,0)/a.length,distance:a.length>1?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0};};
  function pan(dx,dy){const k=2*current.dist*Math.tan(fov*Math.PI/360)/Math.max(1,element.clientHeight),y=current.yaw,p=current.pitch,r=[Math.cos(y),0,-Math.sin(y)],u=[-Math.sin(p)*Math.sin(y),Math.cos(p),-Math.sin(p)*Math.cos(y)];current.target=current.target.map((v,i)=>v+(-r[i]*dx+u[i]*dy)*k);}
  function listen(t,h,o){element.addEventListener(t,h,o);listeners.push([t,h,o]);}
  listen('pointerdown',e=>{if(e.button!==0&&e.button!==2)return;manual();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,pan:e.button===2||e.shiftKey});element.setPointerCapture(e.pointerId);});
  listen('pointermove',e=>{const prev=pointers.get(e.pointerId);if(!prev)return;const a=metrics();pointers.set(e.pointerId,{...prev,x:e.clientX,y:e.clientY});const b=metrics();
   if(pointers.size>1){if(a.distance>2&&b.distance>2)current.dist=clamp(current.dist*a.distance/b.distance,minDistance,maxDistance);pan(b.x-a.x,b.y-a.y);}
   else if(prev.pan||e.shiftKey)pan(b.x-a.x,b.y-a.y);else{current.yaw-=(b.x-a.x)*.006;current.pitch=clamp(current.pitch+(b.y-a.y)*.006,-1.5,1.5);}emit();});
  for(const t of ['pointerup','pointercancel','lostpointercapture'])listen(t,e=>pointers.delete(e.pointerId));
  listen('contextmenu',e=>e.preventDefault());listen('wheel',e=>{e.preventDefault();manual();current.dist=clamp(current.dist*Math.exp(e.deltaY*.001),minDistance,maxDistance);emit();},{passive:false});emit();
  return {get pose(){return copy(current);},get automatic(){return automatic;},setPose(p){manual();current=check(p);emit();},follow(p,{jump=false}={}){goal=check(p);if(jump||!automatic)transition={from:copy(current),elapsed:0};automatic=true;},update(dt){if(!automatic||!goal)return;dt=clamp(dt,0,.1);if(transition){transition.elapsed+=dt;let t=clamp(transition.elapsed/.95,0,1);t=t*t*(3-2*t);current=lerpPose(transition.from,goal,t);if(t>=1)transition=null;}else current=lerpPose(current,goal,1-Math.exp(-dt/.115));emit();},stop:manual,dispose(){for(const [t,h,o]of listeners)element.removeEventListener(t,h,o);pointers.clear();element.style.touchAction=oldTouch;}};
 }
 Object.assign(K,{lerpPose,cameraEye,fitPose,sampleShots,createNavigation});
})(typeof window==='undefined'?globalThis:window);
