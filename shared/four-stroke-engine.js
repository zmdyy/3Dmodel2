import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const $=id=>document.getElementById(id), state={angle:90,playing:false,speed:1,loop:false,loopStroke:0,mode:'observe',answers:{},lastStroke:-1,hold:0,ready:false};
const names=['吸气','压缩','做功','排气'];
const captions=['混合物进入气缸','混合物被压缩，粒子变得密集','燃烧后的高温燃气推动活塞','燃烧后的气体从排气门排出'];
const energyKeys=['flow','compress','power','flow'];
const energyTexts=[`<p style="margin:0">吸入空气与燃油的混合物</p><p class="note">活塞下行，气缸容积增大。此处重点观察进气过程。</p>`,`<div class="energy"><strong>机械能</strong><span>→</span><strong>内能</strong></div><p class="note">活塞对混合气做功，气体内能增加。</p>`,`<div class="energy"><strong>内能</strong><span>→</span><strong>机械能</strong></div><p class="note">高温燃气膨胀，对活塞做功。</p><p class="note">此前点火燃烧：燃料的化学能转化为内能。</p>`,`<p style="margin:0">将燃烧后的气体排出</p><p class="note">活塞上行，需要机械功推动废气排出，不能理解为“没有能量变化”。</p>`];
function index(a=state.angle){return Math.min(3,Math.floor(a/180));}
function notify(s){$('toast').textContent=s;$('toast').style.opacity=1;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').style.opacity=0,1000);}
function clearAnswers(){state.answers={};document.querySelectorAll('.options button').forEach(b=>b.classList.remove('selected'));$('result').textContent='';}
function setAngle(a){const before=index();state.angle=Math.max(0,Math.min(720,a));if(state.loop)state.loopStroke=index();if(before!==index()&&state.mode==='quiz')clearAnswers();update();}
function togglePlaying(v){state.playing=v;$('play').textContent=v?'❚❚ 暂停':'▶ 播放';}
function updateUI(){const i=index(),quiz=state.mode==='quiz';$('progress').value=state.angle;$('angleRead').textContent=`${state.angle.toFixed(0)}° / 720°`;$('angleRead').classList.toggle('hidden',!$('showAngle').checked);$('ticks').classList.toggle('hidden',!$('showAngle').checked);$('progressLabel').textContent=state.loop?`仅循环${quiz?'所选':names[state.loopStroke]}冲程 · 到终点后重新开始`:'拖动观察一个完整循环';
$('stageNumber').textContent=quiz?'观察模型，再作判断':`第 ${i+1} / 4 冲程`;$('strokeName').textContent=quiz?'这是哪个冲程？':names[i]+'冲程';$('strokeCaption').textContent=quiz?'留意活塞、气门和气体':captions[i];
document.querySelectorAll('[data-stroke]').forEach((b,k)=>{b.classList.toggle('active',i===k);b.textContent=quiz?['阶段 A','阶段 B','阶段 C','阶段 D'][k]:names[k];});
if(state.lastStroke!==i){if(quiz)clearAnswers();state.lastStroke=i;}
$('pistonState').textContent=i%2===0?'向下运动 ↓':'向上运动 ↑';
const local=state.angle-i*180,atEnd=local<.01||local>179.99;
$('intakeState').textContent=i===0&&!atEnd?'打开':'关闭';$('exhaustState').textContent=i===3&&!atEnd?'打开':'关闭';$('energyContent').innerHTML=energyTexts[i];}
$('play').onclick=()=>togglePlaying(!state.playing);$('speed').onchange=e=>state.speed=+e.target.value;
$('progress').oninput=e=>{togglePlaying(false);setAngle(+e.target.value)};
$('loop').onchange=e=>{state.loop=e.target.checked;state.loopStroke=index();updateUI()};
$('next').onclick=()=>{togglePlaying(false);setAngle(((index()+1)%4)*180);notify('已到下一冲程起点')};
$('reset').onclick=()=>{togglePlaying(false);setAngle(0);state.hold=0;clearAnswers()};
document.querySelectorAll('[data-stroke]').forEach(b=>b.onclick=()=>{togglePlaying(false);setAngle(+b.dataset.stroke*180)});
function mode(m){state.mode=m;togglePlaying(false);$('observe').classList.toggle('active',m==='observe');$('quiz').classList.toggle('active',m==='quiz');$('observePanel').classList.toggle('hidden',m!=='observe');$('quizPanel').classList.toggle('hidden',m!=='quiz');$('cycleSummary').classList.toggle('hidden',m==='quiz');$('cycleSummary').open=false;$('showAngle').checked=m==='observe';$('sideTitle').textContent=m==='observe'?'观察这个冲程':'试着判断';$('sideTag').textContent=m==='observe'?'与模型同步':'先观察，再提交';clearAnswers();updateUI();}
$('observe').onclick=()=>mode('observe');$('quiz').onclick=()=>mode('quiz');$('showAngle').onchange=updateUI;
document.querySelectorAll('.options button').forEach(b=>b.onclick=()=>{const p=b.closest('[data-q]');state.answers[p.dataset.q]=b.dataset.value;p.querySelectorAll('button').forEach(q=>q.classList.toggle('selected',q===b));$('result').textContent='';});
$('check').onclick=()=>{const a=state.answers,i=index();if(!a.stroke||!a.turn||!a.energy){$('result').className='result bad';$('result').textContent='请先完成三个选择。';return;}const ok=+a.stroke===i&&+a.turn===.5&&a.energy===energyKeys[i];$('result').className='result '+(ok?'good':'bad');$('result').textContent=ok?`判断正确！这是${names[i]}冲程，曲轴转半圈。${i===1?'活塞对气体做功，机械能转化为内能。':i===2?'燃气对活塞做功，内能转化为机械能。':'此冲程主要观察气体的进出。'}`:`再观察一次：${i===0?'进气门打开、活塞下行，混合物正在进入。':i===1?'两个气门关闭，活塞上行，混合物被压缩。':i===2?'两个气门关闭，燃烧后的气体推动活塞下行。':'排气门打开、活塞上行，气体正在排出。'}曲轴从冲程起点到终点转过180°。`;};
$('newQuestion').onclick=()=>{let i=(index()+1+Math.floor(Math.random()*3))%4;setAngle(i*180+90);clearAnswers();togglePlaying(false)};
const container=$('viewport'),scene=new THREE.Scene();scene.background=new THREE.Color('#eaf0eb');const camera=new THREE.PerspectiveCamera(34,1,.003,6);const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;container.append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.12;controls.rotateSpeed=.7;controls.screenSpacePanning=true;controls.minDistance=.075;controls.maxDistance=1.6;controls.target.set(0,.175,-.01);controls.enablePan=true;
scene.add(new THREE.HemisphereLight(0xf1f5f7,0x444c48,.55));const key=new THREE.DirectionalLight(0xfff5e8,2.25);key.position.set(-.3,.6,.6);scene.add(key);const fill=new THREE.DirectionalLight(0xdce8ff,.60);fill.position.set(.4,.3,.2);scene.add(fill);const back=new THREE.DirectionalLight(0xffffff,1.45);back.position.set(.2,.5,-.4);scene.add(back);key.target.position.set(0,.17,0);scene.add(key.target);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-.23,right:.23,top:.24,bottom:-.24,near:.02,far:1.5});key.shadow.bias=-.000035;key.shadow.normalBias=.00015;key.shadow.radius=3;
// Soft studio environment keeps satin metal legible without mirror-like reflections.
const studio=new THREE.Scene();studio.background=new THREE.Color(0x2d353b);
const panelMat=new THREE.MeshBasicMaterial({color:new THREE.Color(3.2,3.1,2.9),side:THREE.DoubleSide});
for(const [x,y,z,sx,sy] of [[-2,2,1,1.4,3],[2,1,1,.8,2],[0,3,-1,2.5,1.4]]){const p=new THREE.Mesh(new THREE.PlaneGeometry(sx,sy),panelMat);p.position.set(x,y,z);p.lookAt(0,0,0);studio.add(p);}
const pmrem=new THREE.PMREMGenerator(renderer);const studioMap=pmrem.fromScene(studio,.025);scene.environment=studioMap.texture;pmrem.dispose();
const floor=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),new THREE.MeshStandardMaterial({color:0xe1e7df,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.006;floor.receiveShadow=true;scene.add(floor);
const viewPresets={whole:{pos:[.31,.30,.65],target:[0,.177,-.012]},front:{pos:[0,.225,.49],target:[0,.22,0]},valve:{pos:[-.12,.278,.285],target:[-.040,.249,0]}};
function setView(name){const p=viewPresets[name];camera.position.fromArray(p.pos);controls.target.fromArray(p.target);controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));setView('whole');

// glTF preserves colour, metalness and roughness, but not Blender's procedural bump nodes.
// Reintroduce very shallow machining / cast surface relief, with no change to base colour.
function addMachiningGrain(m){
 if(m.userData.labGrain||!(m.metalness>.1))return;
 m.userData.labGrain=true;
 const cast=/Cast iron|section|enamel|Stand/.test(m.name),depth=cast?.000018:.000006;
 m.onBeforeCompile=shader=>{
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLabSurface;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLabSurface = position;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 vLabSurface;
 float labHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
 float labNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(labHash(i),labHash(i+vec3(1,0,0)),f.x),mix(labHash(i+vec3(0,1,0)),labHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(labHash(i+vec3(0,0,1)),labHash(i+vec3(1,0,1)),f.x),mix(labHash(i+vec3(0,1,1)),labHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 float labHeight=labNoise(vLabSurface*${cast?1600:3300}.0)*${depth.toFixed(8)};
 vec3 labQx=dFdx(-vViewPosition),labQy=dFdy(-vViewPosition);
 vec3 labRx=cross(labQy,normal),labRy=cross(normal,labQx);
 float labDet=dot(labQx,labRx);
 normal=normalize(abs(labDet)*normal-sign(labDet)*(dFdx(labHeight)*labRx+dFdy(labHeight)*labRy));
 `);
 };
 m.customProgramCacheKey=()=>cast?'lab-cast-grain-v1':'lab-machined-grain-v1';
}

let mixer=null,model=null;
new GLTFLoader().load(new URL('../assets/models/four-stroke-engine.glb',import.meta.url).href,g=>{model=g.scene;scene.add(model);model.traverse(o=>{if(o.isMesh){o.frustumCulled=true;o.castShadow=true;o.receiveShadow=true;for(const m of (Array.isArray(o.material)?o.material:[o.material])){if(m){if(m.name.startsWith('Cast iron |')){m.color.setRGB(.12,.235,.25);m.metalness=.55;m.roughness=.68;}m.envMapIntensity=1.05;addMachiningGrain(m);}}}});mixer=new THREE.AnimationMixer(model);g.animations.forEach(c=>{for(const t of c.tracks){const n=t.getValueSize();t.times=new Float32Array([...t.times].map(x=>Math.max(0,x-1/30)).concat([8]));t.values=new Float32Array([...t.values,...t.values.slice(0,n)]);}c.resetDuration();mixer.clipAction(c).play();});state.ready=true;$('loading').remove();update();},undefined,e=>{$('loading').innerHTML='<strong>模型加载失败</strong><span>请重新打开文件，或在最新版 Edge / Chrome 中打开。</span>';console.error(e)});
// All effects share the crank angle used by the imported mechanical animation.
const gas=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.00095,1),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.75,metalness:0,emissive:0x0b161b,emissiveIntensity:.2}),180);gas.instanceMatrix.setUsage(THREE.DynamicDrawUsage);gas.frustumCulled=false;scene.add(gas);
let seed=20261019;function rng(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
const parts=Array.from({length:180},(_,i)=>{let r=Math.sqrt(rng())*.026,a=rng()*Math.PI;return {x:r*Math.cos(a),y:r*Math.sin(a),q:.04+rng()*.92,birth:1+rng()*43,exit:184+rng()*40,fuel:i%5===0}});
const dummy=new THREE.Object3D(),col=new THREE.Color(),air=new THREE.Color('#2399f0'),fuel=new THREE.Color('#f5c33f'),fire=new THREE.Color('#ff6e15'),waste=new THREE.Color('#17242c');
const intakePath=[[-.13,-.001,.238],[-.09,-.001,.238],[-.057,-.001,.240],[-.064,-.001,.249],[-.069,-.001,.253],[-.0713,-.001,.258],[-.073,-.001,.263],[-.054,-.001,.265],[-.025,-.001,.264],[0,-.001,.252]];
const exhaustPath=[[0,-.001,.252],[.025,-.001,.264],[.054,-.001,.265],[.073,-.001,.263],[.0713,-.001,.258],[.069,-.001,.253],[.064,-.001,.249],[.057,-.001,.240],[.09,-.001,.238],[.13,-.001,.238]];
const fromB=p=>new THREE.Vector3(p[0],p[2],-p[1]);
function path(ps,t){t=THREE.MathUtils.clamp(t,0,.999999)*(ps.length-1);let k=Math.floor(t);return fromB(ps[k]).lerp(fromB(ps[k+1]),t-k);}
// Arc-length sampling gives the same flow speed in straight sections and around the valve.
const flow=new THREE.Group();scene.add(flow);const flows=[];
const intakeCurve=new THREE.CatmullRomCurve3(intakePath.map(fromB),false,'centripetal');
const exhaustCurve=new THREE.CatmullRomCurve3(exhaustPath.map(fromB),false,'centripetal');
const arrowGeo=new THREE.CylinderGeometry(.00105,.00105,.0065,10);
const tipGeo=new THREE.ConeGeometry(.0031,.006,12);
for(let side=0;side<2;side++)for(let i=0;i<7;i++){
 const material=new THREE.MeshStandardMaterial({color:side?0x354651:0x087ce1,roughness:.42,metalness:.15,emissive:side?0x101b25:0x03477b,emissiveIntensity:.45});
 const arrow=new THREE.Group(),shaft=new THREE.Mesh(arrowGeo,material),tip=new THREE.Mesh(tipGeo,material);
 shaft.position.y=-.003;tip.position.y=.003;arrow.add(shaft,tip);flow.add(arrow);
 flows.push({arrow,side,i,material});
}
// Spatial electrical discharge: a white core, blue sheath, branching arcs and a soft local halo.
const spark=new THREE.Group();scene.add(spark);const sparkVariants=[];
const sparkmat=new THREE.MeshBasicMaterial({color:0xf5fcff,toneMapped:false});
const sheathMat=new THREE.MeshBasicMaterial({color:0x458aff,transparent:true,opacity:.46,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
function electricTube(points,parent,r=.00022){
 const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');
 const core=new THREE.Mesh(new THREE.TubeGeometry(curve,18,r,6,false),sparkmat);
 const sheath=new THREE.Mesh(new THREE.TubeGeometry(curve,18,r*2.7,6,false),sheathMat);
 parent.add(core,sheath);
}
for(let v=0;v<4;v++){
 const group=new THREE.Group();spark.add(group);sparkVariants.push(group);
 const start=new THREE.Vector3(0,.2680,.0002),end=new THREE.Vector3(.0017,.2666,.0002);
 const bridge=[start];for(let j=1;j<5;j++){const p=start.clone().lerp(end,j/5);p.x+=Math.sin(j*2.7+v)*.0005;p.z+=Math.cos(j*2.1+v)*.0008;bridge.push(p);}bridge.push(end);electricTube(bridge,group,.00030);
 for(let k=0;k<6;k++){
  const a=k*Math.PI/3+v*.34,origin=new THREE.Vector3(.0005,.2670,.001);
  const end=new THREE.Vector3(Math.cos(a)*(.0048+.001*(k%2)),.2659+Math.sin(a)*.0014,.002+Math.sin(a*1.7+v)*.004);
  const points=[origin];for(let j=1;j<5;j++){const p=origin.clone().lerp(end,j/4);if(j<4){p.x+=Math.sin(j*6+k+v)*.0008;p.y+=Math.cos(j*5+k)*.00045;p.z+=Math.sin(j*3+v)*.0008;}points.push(p);}electricTube(points,group,.00018);
  if(k%2===0){const fork=points[2].clone(),tip=end.clone().add(new THREE.Vector3(.0015*Math.sin(k),-.001,.0016));electricTube([fork,fork.clone().lerp(tip,.5).add(new THREE.Vector3(.0006,0,-.0006)),tip],group,.00012);}
 }
}
const haloCanvas=document.createElement('canvas');haloCanvas.width=haloCanvas.height=128;const hc=haloCanvas.getContext('2d');const gradient=hc.createRadialGradient(64,64,1,64,64,64);gradient.addColorStop(0,'rgba(235,250,255,1)');gradient.addColorStop(.14,'rgba(125,190,255,.8)');gradient.addColorStop(.45,'rgba(45,110,255,.22)');gradient.addColorStop(1,'rgba(20,70,255,0)');hc.fillStyle=gradient;hc.fillRect(0,0,128,128);
const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(haloCanvas),transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));halo.position.set(.0004,.2667,.004);halo.scale.set(.018,.012,1);spark.add(halo);
const sparklight=new THREE.PointLight(0x87bbff,0,.065,2);sparklight.position.set(0,.266,.007);scene.add(sparklight);
const flames=new THREE.Group();scene.add(flames);const tongues=[];const flameMat=new THREE.MeshBasicMaterial({color:0xff8732,toneMapped:false,transparent:true,opacity:.78,depthWrite:false,side:THREE.DoubleSide});
for(let i=0;i<24;i++){const mesh=new THREE.Mesh(new THREE.ConeGeometry(.0016,1,7),flameMat);flames.add(mesh);tongues.push({mesh,x:(rng()-.5)*.043,z:-rng()*.014,phase:rng()*6.28});}
const burnlight=new THREE.PointLight(0xff671b,0,.14,2);burnlight.position.set(0,.25,.013);scene.add(burnlight);
// Reference mark on the crankshaft and a stationary reference at twelve o'clock.
const markmat=new THREE.MeshBasicMaterial({color:0xc76b2b});const mark=new THREE.Mesh(new THREE.SphereGeometry(.002,10,8),markmat);scene.add(mark);const fixed=new THREE.Mesh(new THREE.ConeGeometry(.002,.005,8),new THREE.MeshBasicMaterial({color:0x243e40}));fixed.position.set(0,.134,.057);fixed.rotation.z=Math.PI;scene.add(fixed);
function updateEffects(){const f=state.angle/3+1,th=state.angle*Math.PI/180,x=.03*Math.sin(th),crown=.128+.03*Math.cos(th)+Math.sqrt(.01-x*x),low=crown+.0012,high=.2662;
 gas.visible=$('particles').checked;
 for(let i=0;i<180;i++){const p=parts[i],pos=new THREE.Vector3(p.x,low+p.q*Math.max(.001,high-low),-p.y);let visible=true;col.copy(p.fuel?fuel:air);
  if(f<=61){const t=(f-p.birth)/13;if(t<0)visible=false;else if(t<1){const ps=[[-.108,.004,.238],[-.082,.004,.238],[-.057,.004,.240],[-.064,.004,.249],[-.069,.004,.253],[-.0713,.004,.258],[-.073,.004,.263],[-.054,.004,.265],[-.028,p.y,.265],[p.x,p.y,pos.y]];pos.copy(path(ps,t));}}
  else if(f>121&&f<=181){const arrival=122+13*Math.sqrt((p.x/.03)**2+(p.y/.03)**2+(1-p.q)**2)/1.65;if(f>=arrival)col.copy(fire).lerp(waste,Math.min(1,(f-arrival)/15));}
  else if(f>181){col.copy(waste);const t=(f-p.exit)/13;if(t>=1)visible=false;else if(t>=0){const ps=[[p.x,p.y,pos.y],[.025,p.y,.265],[.057,.004,.265],[.073,.004,.263],[.0713,.004,.258],[.069,.004,.253],[.064,.004,.249],[.057,.004,.240],[.083,.004,.238],[.112,.004,.238],[.137,.004,.245]];pos.copy(path(ps,t));}}
  dummy.position.copy(pos);dummy.scale.setScalar(visible?(p.fuel?1:.85):0);dummy.updateMatrix();gas.setMatrixAt(i,dummy.matrix);gas.setColorAt(i,col);
 }gas.instanceMatrix.needsUpdate=true;if(gas.instanceColor)gas.instanceColor.needsUpdate=true;
 for(const q of flows){
  const lo=q.side?188:8,hi=q.side?235:55,curve=q.side?exhaustCurve:intakeCurve,t=(((f-lo)/70+q.i/7)%1+1)%1;
  const fade=Math.min(1,t/.065,(1-t)/.065),valveFade=Math.min(1,(f-lo)/3,(hi-f)/3);
  q.arrow.visible=$('arrows').checked&&f>=lo&&f<=hi;
  q.arrow.position.copy(curve.getPointAt(t));q.arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),curve.getTangentAt(t).normalize());
  q.arrow.scale.setScalar(Math.max(0,fade*valveFade));
 }
 spark.visible=f>=119&&f<=130;
 const sparkPhase=Math.floor(f*2.5)%4,pulse=.75+.25*Math.sin(f*14);
 sparkVariants.forEach((v,k)=>v.visible=k===sparkPhase);
 halo.material.opacity=.68+.22*pulse;halo.scale.set(.018*pulse,.012*pulse,1);sparklight.intensity=spark.visible?.012*pulse:0;
 const active=f>=123&&f<=164,env=active?Math.sin(Math.PI*(f-123)/41):0;flames.visible=active;
 tongues.forEach(({mesh,x,z,phase})=>{const h=Math.max(.001,.265-low)*env*(.45+.45*Math.abs(Math.sin(f*.7+phase)));mesh.position.set(x,low+h/2,z);mesh.scale.set(1,h,1);mesh.rotation.z=Math.sin(f*.4+phase)*.13});burnlight.intensity=env*.004;
 mark.position.set(.012*Math.sin(th),.11+.012*Math.cos(th),.055);
}
function update(){if(mixer)mixer.setTime(Math.min(7.99999,state.angle/90));updateEffects();updateUI();}
$('particles').onchange=updateEffects;$('arrows').onchange=updateEffects;
const resize=new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()});resize.observe(container);
let last=performance.now(),lastText=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.06,(now-last)/1000);last=now;
 if(state.ready&&state.playing&&now>=state.hold){let next=state.angle+dt*90*state.speed;
  if(state.loop){const start=state.loopStroke*180,end=start+180;if(next>=end){state.angle=start;state.hold=now+400;notify('重新播放当前冲程')}else state.angle=Math.max(start,next);}
  else{if(next>=720){state.angle=0;notify('开始下一个工作循环')}else state.angle=next;}
  if(mixer)mixer.setTime(Math.min(7.99999,state.angle/90));updateEffects();if(now-lastText>65){updateUI();lastText=now;}
 }
 controls.update();renderer.render(scene,camera);
}updateUI();requestAnimationFrame(frame);
window.engineLab={state,setAngle,update,mode,renderer,scene,camera,controls};
