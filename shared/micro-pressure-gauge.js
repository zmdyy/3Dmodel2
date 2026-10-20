import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {LIQUIDS,MEMBRANES,equilibrium,diaphragmAt,meanWetHead,TEST_LIQUIDS,openEquilibrium,flowEquilibrium,G} from './micro-pressure-physics.js';
const $=id=>document.getElementById(id),state={depth:-.065,orientation:'front',h:equilibrium(0,'water','soft',8000).h,velocity:0,records:{},settled:false,liquid:'water',membrane:'soft',deflection:0,view:'whole',bias:8000,vent:false,press:false,section:false};
function targetReading(){return state.vent?{h:0}:equilibrium(meanWetHead(state.depth,state.orientation),state.liquid,state.membrane,state.bias,state.press?1200:0);}
const scene=new THREE.Scene();scene.background=new THREE.Color('#eaf0eb');const host=$('viewport');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.append(renderer.domElement);
let camera=new THREE.PerspectiveCamera(35,1,.002,8);const controls=Navigation3D.configureOrbit(new OrbitControls(camera,renderer.domElement));controls.rotateSpeed=.7;controls.enableDamping=true;controls.dampingFactor=.12;controls.screenSpacePanning=true;controls.minDistance=.08;controls.maxDistance=1.7;
const hemi=new THREE.HemisphereLight(0xf5fbff,0x657568,.8);scene.add(hemi);const key=new THREE.DirectionalLight(0xfff5e9,2.6);key.position.set(-.3,.7,.5);key.target.position.set(0,.2,0);scene.add(key,key.target);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-.4,right:.4,top:.4,bottom:-.4,near:.02,far:2});key.shadow.bias=-.00004;key.shadow.normalBias=.00015;const fill=new THREE.DirectionalLight(0xdcecff,.8);fill.position.set(.4,.4,-.3);scene.add(fill);
const studio=new THREE.Scene();studio.background=new THREE.Color(0x46534f);for(const [x,y,z,w,h] of [[-2,2,1,2,3],[2,2,1,1.3,3],[0,3,-2,3,2]]){const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(2.5,2.5,2.4),side:THREE.DoubleSide}));o.position.set(x,y,z);o.lookAt(0,0,0);studio.add(o);}const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(studio,.03);scene.environment=env.texture;pmrem.dispose();
const steel=new THREE.MeshStandardMaterial({color:0x8e999c,metalness:.83,roughness:.36});const dark=new THREE.MeshStandardMaterial({color:0x34474b,metalness:.65,roughness:.63});const rubber=new THREE.MeshStandardMaterial({color:0x973f35,roughness:.83});const brass=new THREE.MeshStandardMaterial({color:0x9a713f,metalness:.72,roughness:.42});const hosemat=new THREE.MeshStandardMaterial({color:0xa5794c,roughness:.80,metalness:0});
const glass=new THREE.MeshPhysicalMaterial({color:0xc9e8ee,roughness:.16,metalness:0,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide});const watermat=new THREE.MeshPhysicalMaterial({color:0x70b6ce,transparent:true,opacity:.16,roughness:.18,metalness:0,depthWrite:false,side:THREE.DoubleSide});const waterTopMat=new THREE.MeshStandardMaterial({color:0x95c9d9,transparent:true,opacity:.35,roughness:.30,metalness:0,depthWrite:false,side:THREE.DoubleSide});const red=new THREE.MeshStandardMaterial({color:0xf51624,roughness:.62,metalness:0,emissive:0x620008,emissiveIntensity:.16});const ink=new THREE.MeshBasicMaterial({color:0x2e4149});const dimmat=new THREE.LineBasicMaterial({color:0x155f58,depthTest:false});
const apparatus=new THREE.Group();scene.add(apparatus);
function mesh(g,m,parent=apparatus){const o=new THREE.Mesh(g,m);parent.add(o);o.castShadow=!m.transparent;o.receiveShadow=!m.transparent;return o;}
function cylinder(r,h,m,pos,parent=apparatus){const o=mesh(new THREE.CylinderGeometry(r,r,h,48),m,parent);o.position.set(...pos);return o;}
function box(size,m,pos,parent=apparatus){const o=mesh(new THREE.BoxGeometry(...size),m,parent);o.position.set(...pos);return o;}
function ring(r,t,m,pos,rotation=[Math.PI/2,0,0],parent=apparatus){const o=mesh(new THREE.TorusGeometry(r,t,10,72),m,parent);o.position.set(...pos);o.rotation.set(...rotation);return o;}
function line(points,material=ink,parent=apparatus){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),o=new THREE.Line(g,material);parent.add(o);return o;}
function label(text,pos,size=.010,color='#2e454b',parent=apparatus){const c=document.createElement('canvas');c.width=1024;c.height=192;const x=c.getContext('2d');x.font='700 110px "Microsoft YaHei", sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle=color;x.fillText(text,512,96);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;const o=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,toneMapped:false}));o.position.set(...pos);o.scale.set(size*1024/192,size,1);parent.add(o);return o;}
// Open cylindrical vessel: real wall and base, with a distinct rim and water surface.
const VX=-.12,WB=.028,WS=.205,VR=.066;
const vesselShape=new THREE.Shape();vesselShape.absarc(0,0,VR,0,Math.PI*2,false);const hole=new THREE.Path();hole.absarc(0,0,VR-.0018,0,Math.PI*2,true);vesselShape.holes.push(hole);const vg=new THREE.ExtrudeGeometry(vesselShape,{depth:.234,bevelEnabled:false,curveSegments:64});vg.rotateX(-Math.PI/2);const vessel=mesh(vg,glass);vessel.position.set(VX,.024,0);vessel.renderOrder=4;
cylinder(VR,.003,glass,[VX,.025,0]).renderOrder=4;ring(VR,.0012,glass,[VX,.258,0]).renderOrder=5;ring(VR,.0011,glass,[VX,.026,0]).renderOrder=5;
const volume=cylinder(VR-.0022,WS-WB,watermat,[VX,(WS+WB)/2,0]);volume.renderOrder=3;
const top=mesh(new THREE.CircleGeometry(VR-.0023,80),waterTopMat);top.rotation.x=-Math.PI/2;top.position.set(VX,WS,0);top.renderOrder=5;
ring(VR-.0023,.0007,new THREE.MeshBasicMaterial({color:0x83b7c8,transparent:true,opacity:.65}),[VX,WS,0]).renderOrder=6;
label('水面',[VX-.005,WS+.011,.015],.008,'#487f8f');
const probe=new THREE.Group();apparatus.add(probe);
const cupProfile=[[0,-.016],[.035,-.016],[.035,0],[.0315,0],[.0315,-.014],[0,-.014]].map(p=>new THREE.Vector2(...p));
function cupGeometry(half=false){const g=new THREE.LatheGeometry(cupProfile,96,half?Math.PI:0,half?Math.PI:Math.PI*2);g.rotateX(Math.PI/2);return g;}
const body=mesh(cupGeometry(),brass,probe),sectionBody=mesh(cupGeometry(true),brass,probe);sectionBody.visible=false;
const cutFaces=new THREE.Group();probe.add(cutFaces);cutFaces.visible=false;
for(const sign of [-1,1]){const shape=new THREE.Shape(cupProfile),g=new THREE.ShapeGeometry(shape);const a=g.attributes.position;for(let i=0;i<a.count;i++){const r=a.getX(i),z=a.getY(i);a.setXYZ(i,0,sign*r,z);}g.computeVertexNormals();mesh(g,new THREE.MeshStandardMaterial({color:0xc08b55,metalness:.65,roughness:.56,side:THREE.DoubleSide}),cutFaces);}
const fullRim=ring(.0335,.0024,rubber,[0,0,-.001],[0,0,0],probe);
const halfRim=mesh(new THREE.TorusGeometry(.0335,.0024,10,72,Math.PI),rubber,probe);halfRim.rotation.z=Math.PI/2;halfRim.position.z=-.001;halfRim.visible=false;
const diaphragmGeometry=new THREE.RingGeometry(.00001,.0315,96,14),halfDiaphragmGeometry=new THREE.RingGeometry(.00001,.0315,64,14,Math.PI/2,Math.PI);
const filmMat=rubber.clone();filmMat.side=THREE.DoubleSide;
const diaphragm=mesh(diaphragmGeometry,filmMat,probe),halfDiaphragm=mesh(halfDiaphragmGeometry,filmMat,probe);halfDiaphragm.visible=false;diaphragm.position.z=halfDiaphragm.position.z=.0001;
const restOutline=new THREE.Group();probe.add(restOutline);restOutline.visible=false;
const dashMaterial=new THREE.LineDashedMaterial({color:0x1e505b,dashSize:.0018,gapSize:.0011,depthTest:false});
for(const points of [Array.from({length:97},(_,i)=>[.0315*Math.cos(i*Math.PI/48),.0315*Math.sin(i*Math.PI/48),.0006]),[[0,-.0315,.0006],[0,.0315,.0006]],[[-.0315,0,.0006],[.0315,0,.0006]]]){const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),dashMaterial);l.computeLineDistances();l.renderOrder=16;restOutline.add(l);}
const sectionBolts=[];
const nozzle=cylinder(.0045,.017,brass,[0,0,-.023],probe);nozzle.rotation.x=Math.PI/2;
// A membrane crosshair provides an unambiguous depth reference, in every orientation.
const centerDot=mesh(new THREE.SphereGeometry(.0011,12,8),new THREE.MeshBasicMaterial({color:0xffc36f}),probe);centerDot.position.z=.0007;
for(let i=0;i<8;i++){const a=i*Math.PI/4,o=cylinder(.0015,.004,steel,[.033*Math.cos(a),.033*Math.sin(a),.001],probe);o.rotation.x=Math.PI/2;sectionBolts.push(o);}
let hose=null;
function updateProbe(){const y=WS-state.depth;const shift=new THREE.Vector3(0,0,state.deflection).applyAxisAngle(new THREE.Vector3(1,0,0),state.orientation==='up'?-Math.PI/2:state.orientation==='down'?Math.PI/2:0);probe.position.set(VX,y,.012).add(shift);probe.rotation.x=state.orientation==='up'?-Math.PI/2:state.orientation==='down'?Math.PI/2:0;probe.updateMatrixWorld(true);
 const start=probe.localToWorld(new THREE.Vector3(0,0,-.031)),next=probe.localToWorld(new THREE.Vector3(0,0,-.0325));
 const pts=[start,next,new THREE.Vector3(VX,.272,-.032),new THREE.Vector3(-.067,.421,-.032),new THREE.Vector3(.115,.437,-.018),new THREE.Vector3(.26,.394,0),new THREE.Vector3(.26,state.vent?.374:.35,0)];
 const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,false,'centripetal'),120,.0039,10,false);
 if(!hose){hose=mesh(g,hosemat);}else{hose.geometry.dispose();hose.geometry=g;}
 $('depthRead').textContent=state.depth<0?'未浸入':(state.depth*100).toFixed(1);$('depthUnit').textContent=state.depth<0?'':'cm';depthMarker.visible=state.depth>0;$('orientationTitle').textContent={up:'甲 · 橡皮膜朝上',front:'乙 · 橡皮膜侧向',down:'丙 · 橡皮膜朝下'}[state.orientation];
}
// The U tube uses a circular glass wall with an actual air bore.
const L=.298,R=.03,total=2*L+Math.PI*R;
class UCurve extends THREE.Curve{getPoint(t,target=new THREE.Vector3()){let d=t*total;if(d<L)return target.set(.20,.35-d,0);d-=L;if(d<Math.PI*R){const a=Math.PI+d/R;return target.set(.23+R*Math.cos(a),.052+R*Math.sin(a),0);}return target.set(.26,.052+d-Math.PI*R,0);}}
const ushape=new THREE.Shape();ushape.absarc(0,0,.0085,0,Math.PI*2,false);const uhole=new THREE.Path();uhole.absarc(0,0,.0068,0,Math.PI*2,true);ushape.holes.push(uhole);const utube=mesh(new THREE.ExtrudeGeometry(ushape,{steps:180,bevelEnabled:false,extrudePath:new UCurve(),curveSegments:20}),glass);utube.renderOrder=4;
// Wide ivory scale, raised solid ticks and large high-resolution numbers.
box([.041,.324,.003],new THREE.MeshStandardMaterial({color:0xf6f1df,roughness:.9}),[.23,.19,-.013]);
const scaleGroup=new THREE.Group();apparatus.add(scaleGroup);
for(let mm=-140;mm<=150;mm+=5){const y=.18+mm/1000,major=mm%10===0;
 box([major?.016:.009,major?.00075:.0005,.00045],ink,[major?.222:.2185,y,.0008],scaleGroup);
 if(major)label(String(Math.abs(mm/10)),[.2415,y,.002],.014,'#152d35',scaleGroup);
}
label('cm',[.232,.352,.002],.012,'#213d42');label('开口',[.190,.382,.008],.027,'#234b58');label('连接探头',[.302,.382,.012],.027,'#806647');
for(const y of [.30]){ring(.0093,.0012,steel,[.20,y,0]);ring(.0093,.0012,steel,[.26,y,0]);}
cylinder(.010,.020,hosemat,[.26,.351,0]);
// Liquid consists of the bottom bend plus two columns: yL + yR is constant.
const arcpoints=[];for(let i=0;i<=64;i++){let a=Math.PI+Math.PI*i/64;arcpoints.push(new THREE.Vector3(.23+R*Math.cos(a),.052+R*Math.sin(a),0));}mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcpoints),72,.0064,20,false),red);
const leftFluid=cylinder(.0064,1,red,[.20,0,0]),rightFluid=cylinder(.0064,1,red,[.26,0,0]);
const leftTop=mesh(new THREE.SphereGeometry(.0064,32,16),red),rightTop=mesh(new THREE.SphereGeometry(.0064,32,16),red);leftTop.scale.y=rightTop.scale.y=.25;
const heightMarker=new THREE.Group();apparatus.add(heightMarker);const dimg=new THREE.BufferGeometry(),dimline=new THREE.LineSegments(dimg,dimmat);heightMarker.add(dimline);const heightLabel=label('Δh',[.345,.18,.009],.030,'#12564f',heightMarker);heightLabel.material.depthTest=false;heightLabel.renderOrder=20;
const depthMarker=new THREE.Group();apparatus.add(depthMarker);const depthGeom=new THREE.BufferGeometry(),depthLine=new THREE.LineSegments(depthGeom,new THREE.LineBasicMaterial({color:0x527d89,transparent:true,opacity:.7,depthTest:false}));depthMarker.add(depthLine);label('h',[-.018,.19,.055],.030,'#527d89',depthMarker);
function dimensionalSegments(parent,count,color){const material=new THREE.MeshBasicMaterial({color,depthTest:false});return Array.from({length:count},()=>{const o=mesh(new THREE.CylinderGeometry(.00042,.00042,1,8),material,parent);o.renderOrder=12;return o;});}
const hSegments=dimensionalSegments(heightMarker,7,0x155f58),dSegments=dimensionalSegments(depthMarker,3,0x3d6c7b);dimline.visible=false;depthLine.visible=false;
function positionSegments(objects,points){for(let i=0;i<objects.length;i++){const a=new THREE.Vector3(...points[i*2]),b=new THREE.Vector3(...points[i*2+1]),d=b.clone().sub(a);objects[i].position.copy(a).add(b).multiplyScalar(.5);objects[i].scale.y=d.length();objects[i].quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());}}
function updateLiquid(){const yL=.18+state.h/2,yR=.18-state.h/2;
 for(const [o,y,x,cap] of [[leftFluid,yL,.20,leftTop],[rightFluid,yR,.26,rightTop]]){o.scale.y=y-.052;o.position.y=(y+.052)/2;cap.position.set(x,y,0);}
 const pts=[[.20,yL,.011],[.322,yL,.011],[.26,yR,.011],[.322,yR,.011],[.315,yL,.011],[.315,yR,.011],[.310,yL-.006,.011],[.315,yL,.011],[.320,yL-.006,.011],[.315,yL,.011],[.310,yR+.006,.011],[.315,yR,.011],[.320,yR+.006,.011],[.315,yR,.011]];
 positionSegments(hSegments,pts);dimg.setFromPoints(pts.map(p=>new THREE.Vector3(...p)));heightLabel.position.y=.18;depthGeom.setFromPoints([[VX+.025,WS,.052],[-.035,WS,.052],[-.04,WS,.052],[-.04,WS-state.depth,.052],[-.045,WS-state.depth,.052],[VX+.005,WS-state.depth,.052]].map(p=>new THREE.Vector3(...p)));
 positionSegments(dSegments,[[VX+.025,WS,.052],[-.035,WS,.052],[-.04,WS,.052],[-.04,WS-state.depth,.052],[-.045,WS-state.depth,.052],[VX+.005,WS-state.depth,.052]]); depthMarker.children[1].position.y=WS-state.depth/2;
 $('heightRead').textContent=(state.h*100).toFixed(1);$('pressureRead').textContent=Math.round(1000*9.8*Math.max(0,state.depth));
 state.settled=Math.abs(state.h-targetReading().h)<.00025&&Math.abs(state.velocity)<.0007;$('record').disabled=!state.settled||state.depth<.035||state.vent||state.bias>.1;$('status').textContent=state.vent?'接头已打开：液面回到同一高度。':state.bias>.1?'请先打开接头调平，再接回软管。':state.depth<.035?'比较方向前，请将整张膜浸没。':state.settled?'液面已稳定，可记录。':'液面正在变化…';$('prepStatus').textContent=state.vent?'接头打开':state.bias>.1?'尚未调平':'已调平';$('zero').textContent=state.vent?'接回软管':'打开接头调平';$('depth').disabled=state.vent;$('pressMembrane').disabled=state.depth>-.035||state.vent;
 // Hold the deformed membrane centre at the selected depth, including up/down orientation.
 const w=state.vent?0:diaphragmAt(state.h,LIQUIDS[state.liquid].rho,state.bias);if(Math.abs(w-state.deflection)>.00004){state.deflection=w;updateProbe();}
 centerDot.position.z=-w+.0007;
 for(const geom of [diaphragmGeometry,halfDiaphragmGeometry]){const a=geom.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),r2=(x*x+y*y)/(.0315*.0315);a.setZ(i,-w*Math.max(0,1-r2));}a.needsUpdate=true;geom.computeVertexNormals();}

}
const floor=mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshStandardMaterial({color:0xe4e9e0,roughness:1}),scene);floor.rotation.x=-Math.PI/2;floor.position.y=-.003;floor.receiveShadow=true;floor.castShadow=false;
const views={whole:{p:[.34,.30,.82],t:[.01,.225,0]},front:{p:[.269,.18,.50],t:[.269,.18,0]},probe:{p:[.025,.26,.36],t:[-.12,.135,.01]}};
function view(n){state.view=n;camera.position.fromArray(views[n].p);controls.target.fromArray(views[n].t);if(n==='probe'){controls.target.copy(probe.position);camera.position.copy(probe.position).add(new THREE.Vector3(.12,.04,.16).applyQuaternion(probe.quaternion));}const aspect=Math.max(.4,host.clientWidth/Math.max(1,host.clientHeight)),extent=n==='probe'?[.12,.12]:n==='front'?[.205,.245]:[.58,.45],distance=1.12*Math.max(extent[1],extent[0]/aspect)/(2*Math.tan(THREE.MathUtils.degToRad(35/2)));camera.position.sub(controls.target).normalize().multiplyScalar(distance).add(controls.target);controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===n));}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));
$('sectionProbe').onclick=()=>{state.section=!state.section;body.visible=diaphragm.visible=fullRim.visible=!state.section;sectionBody.visible=halfDiaphragm.visible=halfRim.visible=cutFaces.visible=restOutline.visible=state.section;sectionBolts.forEach(o=>o.visible=!state.section||o.position.x<=0);$('sectionProbe').classList.toggle('active',state.section);$('sectionNote').hidden=!state.section;if(state.section)view('probe');};
$('checkPrep').onclick=()=>$('prepDialog').showModal();$('closePrep').onclick=()=>{state.press=false;$('prepDialog').close();};
$('pressMembrane').onpointerdown=e=>{if(e.currentTarget.disabled)return;state.press=true;e.currentTarget.setPointerCapture(e.pointerId);};
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('pressMembrane').addEventListener(event,()=>state.press=false);
$('pressMembrane').onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();state.press=true;}};$('pressMembrane').onkeyup=()=>state.press=false;
$('prepDialog').addEventListener('close',()=>state.press=false);
$('zero').onclick=()=>{if(state.depth>-.035){$('prepMessage').textContent='先把探头移到水面上方，使整张膜离开水。';return;}if(state.vent&&Math.abs(state.h)>.00025){$('prepMessage').textContent='请先等待两侧液面等高，再接回软管。';return;}state.vent=!state.vent;state.press=false;if(state.vent)state.bias=0;updateProbe();$('prepMessage').textContent=state.vent?'接头已打开，与大气相通；待液面等高后接回软管。':'已接回软管，可以入水实验。';};
$('showRecords').onclick=()=>$('recordsDialog').showModal();$('closeRecords').onclick=()=>$('recordsDialog').close();
$('depth').oninput=e=>{state.depth=+e.target.value/100;state.press=false;updateProbe();if(state.view==='probe')view('probe');};document.querySelectorAll('[data-orient]').forEach(b=>b.onclick=()=>{state.orientation=b.dataset.orient;document.querySelectorAll('[data-orient]').forEach(q=>q.classList.toggle('active',q===b));updateProbe();if(state.view==='probe')view('probe');});
$('showHeight').onchange=e=>heightMarker.visible=e.target.checked;$('showPressure').onchange=e=>$('pressureStat').hidden=!e.target.checked;
$('liquid').onchange=e=>{state.liquid=e.target.value;};$('membrane').onchange=e=>{state.membrane=e.target.value;};
const orientNames={up:'甲 · 朝上',front:'乙 · 侧向',down:'丙 · 朝下'};
function renderRecords(){ $('records').innerHTML=['up','front','down'].map(k=>{const r=state.records[k];return `<tr><td>${orientNames[k]}</td><td>${r?(r.depth*100).toFixed(1):'—'}</td><td>${r?(r.h*100).toFixed(1):'—'}</td><td>${r?LIQUIDS[r.liquid].name:'—'}</td><td>${r?r.membrane==='soft'?'较易':'较难':'—'}</td></tr>`;}).join('');
 const a=Object.values(state.records),same=a.length===3&&a.every(r=>Math.abs(r.depth-a[0].depth)<.0005&&r.liquid===a[0].liquid&&r.membrane===a[0].membrane);
 $('conclusion').textContent=a.length===3?(same?'深度、管液与膜相同，三个朝向的液面高度差相同。':'请保持深度、U形管液体和橡皮膜相同，再比较方向。'):'';
}
$('record').onclick=()=>{if(!state.settled||state.depth<.035||state.vent||state.bias>.1)return;state.records[state.orientation]={depth:state.depth,h:state.h,liquid:state.liquid,membrane:state.membrane};renderRecords();};$('clear').onclick=()=>{state.records={};renderRecords();};$('reset').onclick=()=>{state.depth=-.065;state.bias=8000;state.vent=false;state.press=false;state.orientation='front';state.liquid='water';state.membrane='soft';$('liquid').value='water';$('membrane').value='soft';state.records={};$('depth').value=-6.5;document.querySelectorAll('[data-orient]').forEach(b=>b.classList.toggle('active',b.dataset.orient==='front'));renderRecords();updateProbe();view('whole');};
const resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();});resize.observe(host);view('whole');renderRecords();updateProbe();
let visualTick=null;
let last=performance.now(),readTimer=0;function animate(now){requestAnimationFrame(animate);let dt=Math.min(.04,(now-last)/1000);last=now;const target=targetReading().h,omega=12,acc=omega*omega*(target-state.h)-2*omega*state.velocity;state.velocity+=acc*dt;state.h+=state.velocity*dt;if(Math.abs(target-state.h)<.000002&&Math.abs(state.velocity)<.00001){state.h=target;state.velocity=0;}if(now-readTimer>25){updateLiquid();readTimer=now;}if(visualTick)visualTick(now);else controls.update();renderer.render(scene,camera);}updateLiquid();requestAnimationFrame(animate);
window.manometerLab={state,scene,camera,controls,updateProbe,updateLiquid};

// Three independent apparatus modes share the same calibrated U-manometer.
Object.assign(state,{mode:'membrane',test:'water',speed:0,openH:0,openRise:0,extensionRecords:{membrane:[],open:[],flow:[]}});
const membraneTarget=targetReading,membraneProbe=updateProbe,membraneLiquid=updateLiquid,baseView=view;
const vesselObjects=apparatus.children.slice(0,apparatus.children.indexOf(probe));
const titles={membrane:'橡皮膜探头',open:'拓展 · 开口玻璃管',flow:'拓展 · 流速与压强'};
const originalOrientationCard=document.querySelector('.orientation').closest('.card'),depthCard=$('depth').closest('.card'),readCard=$('heightRead').closest('.card');
const membraneWrap=$('membrane').parentElement,depthCaption=depthCard.querySelector('.row > span'),depthHeading=depthCard.querySelector('h3'),readHint=readCard.querySelector('.hint');
const openGroup=new THREE.Group(),flowGroup=new THREE.Group(),openDimensions=new THREE.Group();apparatus.add(openGroup,flowGroup,openDimensions);openGroup.visible=flowGroup.visible=openDimensions.visible=false;
function hollowCylinder(inner,outer,length,material,parent){const shape=new THREE.Shape();shape.absarc(0,0,outer,0,Math.PI*2,false);const hole=new THREE.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);const g=new THREE.ExtrudeGeometry(shape,{depth:length,bevelEnabled:false,curveSegments:48});g.rotateX(-Math.PI/2);return mesh(g,material,parent);}
const openTube=hollowCylinder(.006,.0078,.22,glass,openGroup);openTube.renderOrder=7;
const insideLiquid=cylinder(.0059,1,watermat.clone(),[0,0,0],openGroup);insideLiquid.renderOrder=6;
const insideTop=mesh(new THREE.CircleGeometry(.0059,48),waterTopMat.clone(),openGroup);insideTop.rotation.x=-Math.PI/2;insideTop.renderOrder=8;
const mouthRing=ring(.0069,.0008,glass,[0,0,0],[Math.PI/2,0,0],openGroup);
const openCap=hollowCylinder(.0026,.0078,.002,glass,openGroup);openCap.position.y=.219;const openNeck=hollowCylinder(.0026,.0045,.014,brass,openGroup);openNeck.position.y=.22;
const mouthLabel=label('开放管口',[VX-.045,.25,.03],.012,'#436779',openDimensions);
const interfaceLabel=label('管内液面',[VX-.048,.22,.03],.012,'#436779',openDimensions);
const dLabel=label('d',[VX-.087,.17,.035],.027,'#537a90',openDimensions),HLabel=label('H',[VX+.067,.17,.035],.027,'#9a652f',openDimensions);
const openD=dimensionalSegments(openDimensions,3,0x537a90),openH=dimensionalSegments(openDimensions,3,0x9a652f);
const portLabel=label('侧向取压口',[-.085,.175,.015],.012,'#426b74',flowGroup);
// Diffuser to an atmospheric outlet: throat area is one quarter of outlet area.
const flowProfile=[[-.245,.018],[-.19,.018],[-.125,.009],[-.075,.009],[-.01,.018],[.045,.018]];
const flowSkin=[];for(const [x,r] of flowProfile)flowSkin.push(new THREE.Vector2(r,x+.245));for(const [x,r] of [...flowProfile].reverse())flowSkin.push(new THREE.Vector2(r-.0011,x+.245));
const flowTube=mesh(new THREE.LatheGeometry(flowSkin,64),glass,flowGroup);flowTube.rotation.z=-Math.PI/2;flowTube.position.set(-.245,.12,0);flowTube.renderOrder=7;
const takeoff=hollowCylinder(.0024,.0037,.025,glass,flowGroup);takeoff.position.set(-.095,.129,0);takeoff.renderOrder=7;
label('进气 →',[-.243,.080,.015],.015,'#377d96',flowGroup);label('出口通大气',[.028,.080,.015],.013,'#377d96',flowGroup);
label('粗管',[-.18,.158,.015],.013,'#377d96',flowGroup);label('喉部',[-.095,.092,.015],.013,'#377d96',flowGroup);
const airArrows=Array.from({length:16},()=>{const arrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.018,0x178db1,.007,.004);flowGroup.add(arrow);return arrow;});
function setText(o,text){if(o.userData.text===text)return;o.userData.text=text;const c=o.material.map.image,x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.font='700 110px "Microsoft YaHei", sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#285c65';x.fillText(text,512,96);o.material.map.needsUpdate=true;}
function replaceHose(points){const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal'),110,.0039,10,false);hose.geometry.dispose();hose.geometry=g;}
targetReading=function(){if(state.mode==='membrane')return state.vent?{h:0}:equilibrium(meanWetHead(state.depth,state.orientation),state.liquid,state.membrane,state.bias,state.press?1200:0,TEST_LIQUIDS[state.test].rho);if(state.vent)return {h:0,H:0,rise:0};return state.mode==='open'?openEquilibrium(state.depth,state.liquid,state.test):flowEquilibrium(state.speed,state.liquid);};
updateProbe=function(){if(state.mode==='membrane'){membraneProbe();return;}probe.visible=false;depthMarker.visible=false;
 if(state.mode==='open'){const bottom=WS-state.depth;openGroup.position.set(VX,bottom,.012);const startY=bottom+.22;replaceHose([[VX,startY+.007,.012],[VX,startY+.024,.012],[-.068,.54,-.025],[.13,.55,-.018],[.26,.41,0],[.26,state.vent?.374:.35,0]]);$('depthRead').textContent=state.depth<0?'未浸入':(state.depth*100).toFixed(1);$('depthUnit').textContent=state.depth<0?'':'cm';$('orientationTitle').textContent='开放管口 · 空气传压';
 }else{replaceHose([[-.095,.154,0],[-.095,.176,0],[-.04,.39,-.03],[.15,.44,-.025],[.26,.39,0],[.26,.35,0]]);$('orientationTitle').textContent='气流侧向取压 · 比较静压';}
};
function updateOpenGeometry(){const result=openEquilibrium(state.depth,state.liquid,state.test),rt=TEST_LIQUIDS[state.test].rho,rw=LIQUIDS[state.liquid].rho;
 // One physical progress variable: infer interface from current gas pressure, so the pressure law is maintained during settling.
 const H=state.vent?0:Math.min(Math.max(0,state.depth),Math.max(0,rw*state.h/rt)),rise=Math.max(0,state.depth-H),bottom=WS-state.depth;
 state.openH=H;state.openRise=rise;insideLiquid.visible=insideTop.visible=state.depth>0&&rise>1e-6;insideLiquid.scale.y=Math.max(.000001,rise);insideLiquid.position.set(0,rise/2,0);insideTop.position.set(0,rise,0);
 openDimensions.visible=state.depth>0;const z=.037,left=VX-.075,right=VX+.056,interfaceY=WS-H;
 positionSegments(openD,[[VX,bottom,z],[left,bottom,z],[left,bottom,z],[left,WS,z],[left,WS,z],[VX-.015,WS,z]]);
 positionSegments(openH,[[VX+.008,interfaceY,z],[right,interfaceY,z],[right,interfaceY,z],[right,WS,z],[right,WS,z],[VX+.014,WS,z]]);
 dLabel.position.y=WS-state.depth/2;HLabel.position.y=WS-H/2;mouthLabel.position.y=bottom-.014;interfaceLabel.position.y=interfaceY+.010;
 $('extensionRead').textContent=`d = ${(Math.max(0,state.depth)*100).toFixed(2)} cm　H = ${(H*100).toFixed(2)} cm`;
 $('anomaly').textContent=state.depth<=0?'管口尚未浸入，空气与大气相通，U形管两侧应等高。':!state.settled?'液面尚在变化，请等待稳定后记录。':`液体进入管内 ${(rise*100).toFixed(2)} cm，因此 H 小于 d。若误用 d 计算表压，会比实际读数高约 ${Math.round(rt*G*rise)} Pa。`;
 if(state.test==='dense')$('anomaly').textContent+=' 高密度液体为教学设定：3000 kg/m³。';
 return result;
}
function updateCommon(){const yL=.18+state.h/2,yR=.18-state.h/2;for(const [o,y,x,cap] of [[leftFluid,yL,.20,leftTop],[rightFluid,yR,.26,rightTop]]){o.scale.y=y-.052;o.position.y=(y+.052)/2;cap.position.set(x,y,0);}
 const high=Math.max(yL,yR),low=Math.min(yL,yR);positionSegments(hSegments,[[.20,yL,.011],[.322,yL,.011],[.26,yR,.011],[.322,yR,.011],[.315,high,.011],[.315,low,.011],[.310,high-.006,.011],[.315,high,.011],[.320,high-.006,.011],[.315,high,.011],[.310,low+.006,.011],[.315,low,.011],[.320,low+.006,.011],[.315,low,.011]]);
 $('heightRead').textContent=(Math.abs(state.h)*100).toFixed(2);state.settled=Math.abs(state.h-targetReading().h)<.000025&&Math.abs(state.velocity)<.0001;
 $('pressureRead').textContent=Math.round(LIQUIDS[state.liquid].rho*G*state.h);$('pressureStat').querySelector('span').textContent='连接侧相对大气压';
 $('record').disabled=!state.settled||state.vent||(state.mode==='open'&&state.depth<0);$('status').textContent=state.vent?'接头打开，等待液面等高后接回。':state.settled?'液面已稳定，可以记录。':'液面正在变化…';$('prepStatus').textContent=state.vent?'接头打开':'已调平';$('depth').disabled=state.vent;$('zero').textContent=state.vent?'接回软管':'打开接头调平';
}
updateLiquid=function(){if(state.mode==='membrane'){membraneLiquid();$('pressureRead').textContent=Math.round(TEST_LIQUIDS[state.test].rho*G*Math.max(0,state.depth));$('pressureStat').querySelector('span').textContent='膜中心液体表压';return;}updateCommon();if(state.mode==='open')updateOpenGeometry();else{$('extensionRead').textContent=`喉部 ${state.speed.toFixed(1)} m/s　出口 ${(state.speed/4).toFixed(1)} m/s`;$('anomaly').textContent='喉部流速比出口大，静压低于出口大气压。右侧连接取压口：右侧液面升高，左侧降低。示意气流动画放慢显示。';}};
view=function(n){baseView(n);if(n==='whole'&&state.mode==='open'){controls.target.set(.015,.29,0);camera.position.copy(controls.target).add(new THREE.Vector3(.31,.08,.88));controls.update();}if(n==='probe'&&state.mode==='open'){controls.target.set(VX,WS-Math.max(0,state.openH)/2,.012);camera.position.copy(controls.target).add(new THREE.Vector3(.02,.02,.30));controls.update();}if(n==='probe'&&state.mode==='flow'){controls.target.set(-.095,.12,0);camera.position.set(-.07,.15,.31);controls.update();}};
function tintTest(){const t=TEST_LIQUIDS[state.test];watermat.color.setHex(t.color);waterTopMat.color.setHex(t.color);insideLiquid.material.color.setHex(t.color);insideTop.material.color.setHex(t.color);document.querySelector('.legend').innerHTML=`<i></i>待测：${t.name}<i></i>U形管：${LIQUIDS[state.liquid].name}`;}
function selectMode(mode){state.mode=mode;state.depth=-.065;state.h=0;state.velocity=0;state.deflection=0;state.vent=false;state.press=false;state.bias=mode==='membrane'?8000:0;state.speed=0;state.orientation='front';if(mode!=='open'&&state.test==='dense'){state.test='water';$('testLiquid').value='water';}$('depth').value=-6.5;$('speed').value=0;$('speedRead').textContent='0 m/s';probe.visible=mode==='membrane';openGroup.visible=mode==='open';flowGroup.visible=mode==='flow';openDimensions.visible=false;vesselObjects.forEach(o=>o.visible=mode!=='flow');originalOrientationCard.hidden=mode!=='membrane';depthCard.hidden=mode==='flow';membraneWrap.hidden=mode!=='membrane';$('testWrap').hidden=mode==='flow';$('speedWrap').hidden=mode!=='flow';$('denseOption').hidden=mode!=='open';$('sectionProbe').hidden=mode!=='membrane';$('sectionNote').hidden=mode!=='membrane'||!state.section;$('extensionCard').hidden=mode==='membrane';$('explain').hidden=mode==='flow';$('checkPrep').hidden=mode==='flow';$('prepStatus').hidden=mode==='flow';$('pressMembrane').hidden=mode!=='membrane';$('pressMembrane').disabled=false;
 depthHeading.textContent=mode==='open'?'① 开放管口浸入深度 d':'① 探头深度';depthCaption.textContent=mode==='open'?'玻璃管下端到槽内液面':'橡皮膜中心到液面';readHint.textContent=mode==='flow'?'左侧通大气，右侧连接喉部的侧向取压口。':'左侧通大气，右侧通过软管连接探头。';document.querySelector('.intro small').textContent=titles[mode];document.querySelector('.intro p').textContent=mode==='open'?'下端开放 · 上端密封连接 · 同时观察 d、H 与 Δh':mode==='flow'?'透明收缩管 · 侧向取压 · 出口通大气':'先检查气密性并调平，再浸入液体';$('record').closest('.card').querySelector('h3').textContent=mode==='membrane'?'④ 同深度比较':'④ 探究数据';$('showRecords').textContent=mode==='membrane'?'查看比较记录':'记录与图像';
 document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));document.querySelectorAll('[data-orient]').forEach(b=>b.classList.toggle('active',b.dataset.orient==='front'));state.records={};tintTest();updateProbe();updateLiquid();view('whole');renderLabRecords();}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>selectMode(b.dataset.mode));
$('testLiquid').onchange=e=>{state.test=e.target.value;tintTest();};$('speed').oninput=e=>{state.speed=+e.target.value;$('speedRead').textContent=state.speed.toFixed(1)+' m/s';};$('liquid').onchange=e=>{state.liquid=e.target.value;tintTest();};
const oldZero=$('zero').onclick;$('zero').onclick=()=>{if(state.mode==='membrane'){oldZero();return;}if(state.depth>0){$('prepMessage').textContent='先将管口完全移出液体，待管内液体排出，再调零。';return;}if(state.vent&&Math.abs(state.h)>.000025){$('prepMessage').textContent='请等待两侧液面等高。';return;}state.vent=!state.vent;state.bias=0;updateProbe();$('prepMessage').textContent=state.vent?'接头打开，待两侧液面等高后接回。':'已接回：缓慢浸入并停住，观察 Δh 是否稳定；理想装置无漏气。';};
$('checkPrep').onclick=()=>{$('prepDialog').querySelector('p').textContent=state.mode==='membrane'?'让整张橡皮膜离开液体，按住橡皮膜，观察液面差能否保持；松手后观察是否恢复。':'开口管不能按膜检查：先在空气中调零，再缓慢浸入并停住。液面差稳定保持，说明模型中的连接气密。移出后液体排出，两侧回零。';$('prepMessage').textContent=state.mode==='open'?'管口露出液面后与大气相通；浸入后液体封住下端，管内保留空气。':'初始两侧不等高，检查后打开接头调平。';$('prepDialog').showModal();};
$('explain').onclick=()=>$('explainDialog').showModal();$('closeExplain').onclick=()=>$('explainDialog').close();
const palette=['#156d67','#c15e3a','#7762a8','#326aaf','#b18a21','#ae507c'];
function groupKey(r){return r.test+'|'+r.liquid;}
function renderLabRecords(){const mode=state.mode,rows=state.extensionRecords[mode];$('recordsDialog').querySelector('h2').textContent=mode==='membrane'?'同一深度，比较朝向':mode==='open'?'开口玻璃管 · 数据与图像':'流速与静压 · 数据与图像';$('plotTools').hidden=mode==='membrane';$('recordsPlot').hidden=mode==='membrane';$('plotAxis').parentElement.hidden=mode==='flow';$('plotTrend').parentElement.hidden=mode==='flow';
 const head=mode==='membrane'?['序号','朝向','深度/cm','Δh/cm','待测液体','测压液体','膜','操作']:mode==='open'?['序号','待测液体 / kg·m⁻³','测压液体 / kg·m⁻³','d/cm','H/cm','Δh/cm','操作']:['序号','喉部/m·s⁻¹','出口/m·s⁻¹','连接侧表压/Pa','Δh/cm','测压液体','操作'];$('recordTable').querySelector('thead').innerHTML='<tr>'+head.map(h=>`<th>${h}</th>`).join('')+'</tr>';
 $('records').innerHTML=rows.map((r,i)=>{const t=TEST_LIQUIDS[r.test],l=LIQUIDS[r.liquid],v=mode==='open'?[i+1,`${t.name} / ${t.rho}`,`${l.name} / ${l.rho}`,(r.d*100).toFixed(2),(r.H*100).toFixed(2),(Math.abs(r.h)*100).toFixed(2)]:mode==='flow'?[i+1,r.speed.toFixed(1),(r.speed/4).toFixed(1),r.pressure.toFixed(1),(Math.abs(r.h)*100).toFixed(2),l.name]:[i+1,orientNames[r.orientation],(r.d*100).toFixed(1),(r.h*100).toFixed(2),t.name,l.name,r.membrane==='soft'?'较易':'较难'];return '<tr>'+v.map(a=>`<td>${a}</td>`).join('')+`<td><button data-delete="${i}">删除</button></td></tr>`;}).join('');
 $('records').querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{rows.splice(+b.dataset.delete,1);renderLabRecords();});$('conclusion').textContent=mode==='open'?'比较图像时保持待测液体与测压液体相同。同组 Δh—H 应成正比；d 与 H 的差值是进入玻璃管的液柱高度。':mode==='flow'?'连接侧表压为负值：右侧液面更高。不同测压液体分别成组。':'同深度、同待测液体、同测压液体及同膜时，再比较三个朝向。';$('recordsDialog').querySelector('p.hint').textContent=mode==='open'?'高密度液体为教学设定。趋势线为物理模型预测，记录点取稳定后的读数。数据仅保存在本次打开的页面，可导出 CSV。':mode==='flow'?'理想低速稳态气流，忽略损失；喉部与出口面积比 1∶4，出口静压为大气压。':'橡皮膜参数为教学示意。记录保留在当前页面，切换实验不会删除。';drawPlot();}
function drawPlot(){if(state.mode==='membrane')return;const rows=state.extensionRecords[state.mode],axis=$('plotAxis').value,flow=state.mode==='flow',groups=[...new Set(rows.map(groupKey))];let xmax=flow?35:axis==='H'?Math.max(1,...rows.map(r=>r.H*100))*1.15:14,ymax=Math.max(2,...rows.map(r=>Math.abs(r.h)*100))*1.15;const px=x=>64+x/xmax*600,py=y=>210-y/ymax*168;let svg='<rect width="860" height="260" fill="#f7faf6"/>';
 for(let i=0;i<=4;i++){const x=xmax*i/4,y=ymax*i/4;svg+=`<path d="M${px(x)} 42V210 M64 ${py(y)}H664" stroke="#dce5df"/><text x="${px(x)}" y="230" text-anchor="middle" font-size="12" fill="#425f60">${x.toFixed(1)}</text><text x="55" y="${py(y)+4}" text-anchor="end" font-size="12" fill="#425f60">${y.toFixed(1)}</text>`;}
 svg+='<path d="M64 37V210H674" fill="none" stroke="#4c6f70"/><text x="16" y="22" font-size="13" fill="#28585b">Δh / cm</text>'+`<text x="500" y="253" font-size="13" fill="#28585b">${flow?'喉部速度 / m·s⁻¹':axis==='d'?'管口深度 d / cm':'实际测压深度 H / cm'}</text>`;
 groups.forEach((key,gi)=>{const color=palette[gi%palette.length],rs=rows.filter(r=>groupKey(r)===key),sample=rs[0];if(!flow&&$('plotTrend').checked){const pts=[];for(let i=0;i<=100;i++){const d=.14*i/100,r=openEquilibrium(d,sample.liquid,sample.test),x=axis==='d'?d*100:r.H*100,y=r.h*100;if(y<=ymax&&x<=xmax)pts.push(`${px(x)},${py(y)}`);}svg+=`<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="6 4"/>`;}
 rs.forEach(r=>{const x=flow?r.speed:100*(axis==='d'?r.d:r.H),y=Math.abs(r.h)*100;svg+=`<circle cx="${px(x)}" cy="${py(y)}" r="4.5" fill="${color}"><title>${x.toFixed(2)}, ${y.toFixed(2)}</title></circle>`;});svg+=`<circle cx="690" cy="${50+gi*30}" r="4" fill="${color}"/><text x="701" y="${54+gi*30}" font-size="11" fill="#355a5b">${flow?'空气':TEST_LIQUIDS[sample.test].name} / ${LIQUIDS[sample.liquid].name}</text>`;});if(!rows.length)svg+='<text x="230" y="110" fill="#6f8784" font-size="15">先记录几组稳定读数，再比较图像。</text>';$('recordsPlot').innerHTML=svg;}
$('record').onclick=()=>{if($('record').disabled)return;const rows=state.extensionRecords[state.mode];rows.push({d:Math.max(0,state.depth),H:state.mode==='open'?state.openH:0,h:state.h,test:state.test,liquid:state.liquid,membrane:state.membrane,orientation:state.orientation,speed:state.speed,pressure:LIQUIDS[state.liquid].rho*G*state.h});$('status').textContent=`已记录第 ${rows.length} 组；可改变参数继续记录。`;renderLabRecords();};
$('showRecords').onclick=()=>{renderLabRecords();$('recordsDialog').showModal();};$('clear').onclick=()=>{state.extensionRecords[state.mode]=[];renderLabRecords();};$('reset').onclick=()=>selectMode(state.mode);$('plotAxis').onchange=drawPlot;$('plotTrend').onchange=drawPlot;
$('exportCSV').onclick=()=>{const rows=state.extensionRecords[state.mode],csv=['实验,待测液体,待测密度kg/m3,测压液体,测压密度kg/m3,d_cm,H_cm,Delta_h_cm,喉部速度m/s,连接侧表压Pa',...rows.map(r=>[titles[state.mode],TEST_LIQUIDS[r.test].name,TEST_LIQUIDS[r.test].rho,LIQUIDS[r.liquid].name,LIQUIDS[r.liquid].rho,(r.d*100).toFixed(4),(r.H*100).toFixed(4),(Math.abs(r.h)*100).toFixed(4),r.speed,r.pressure.toFixed(3)].join(','))].join('\r\n'),url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='微小压强计_'+state.mode+'_记录.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};
let airLast=performance.now(),airPhase=0;function airAnimation(now){requestAnimationFrame(airAnimation);const dt=Math.min(.05,(now-airLast)/1000);airLast=now;if(state.mode!=='flow')return;airPhase+=dt*state.speed*.025;airArrows.forEach((a,i)=>{const x=-.235+((airPhase+i/16)%1)*.27;a.position.set(x,.12+(i%3-1)*.004,.002);a.visible=state.speed>0;a.setLength(x>-.13&&x<-.065?.025:.016,.007,.004);});}requestAnimationFrame(airAnimation);
selectMode('membrane');Object.assign(window.manometerLab,{updateProbe,updateLiquid,selectMode,openEquilibrium,flowEquilibrium,TEST_LIQUIDS,drawPlot});

// Visual aids are deliberately separate from the physical deformation and pressure model.
state.deformationScale=5;state.displayDeflection=0;state.displayLimited=false;
const physicalLiquidUpdate=updateLiquid,existingView=view,existingSelectMode=selectMode;
const perspectiveCamera=camera,sectionCamera=new THREE.OrthographicCamera(-.07,.07,.048,-.048,.002,8);sectionCamera.zoom=1;
let sectionAspect=0,cameraFlight=null;
function fitSectionProjection(){const aspect=Math.max(.2,host.clientWidth/Math.max(1,host.clientHeight));if(aspect===sectionAspect)return;sectionAspect=aspect;const halfHeight=Math.max(.048,.044/aspect);sectionCamera.left=-halfHeight*aspect;sectionCamera.right=halfHeight*aspect;sectionCamera.top=halfHeight;sectionCamera.bottom=-halfHeight;sectionCamera.updateProjectionMatrix();}
function useCamera(next){camera=next;controls.object=next;window.manometerLab.camera=next;}

function finishFlight(){if(!cameraFlight)return;const f=cameraFlight;camera.position.copy(f.endPosition);camera.quaternion.copy(f.endQuaternion);camera.up.copy(f.endUp);controls.target.copy(f.endTarget);
 if(f.orthographic){sectionCamera.position.copy(f.endPosition);sectionCamera.quaternion.copy(f.endQuaternion);sectionCamera.up.copy(f.endUp);sectionCamera.zoom=1;sectionAspect=0;fitSectionProjection();useCamera(sectionCamera);}
 controls.enableRotate=!f.orthographic;controls.enableDamping=false;controls.update();controls.enableDamping=true;controls.enabled=true;cameraFlight=null;}

function sectionCameraPose(){probe.updateMatrixWorld(true);const target=probe.localToWorld(new THREE.Vector3(0,0,-.006)),up=new THREE.Vector3(0,1,0).applyQuaternion(probe.quaternion),direction=new THREE.Vector3(1,0,0).applyQuaternion(probe.quaternion);const aspect=Math.max(.4,host.clientWidth/Math.max(1,host.clientHeight));const distance=Math.max(.086,.072/aspect)*1.12/(2*Math.tan(THREE.MathUtils.degToRad(perspectiveCamera.fov/2)));return {target,up,position:target.clone().addScaledVector(direction,distance)};}
view=function(n){
 const startPosition=camera.position.clone(),startTarget=controls.target.clone(),startQuaternion=camera.quaternion.clone();if(camera!==perspectiveCamera){perspectiveCamera.position.copy(camera.position);perspectiveCamera.quaternion.copy(camera.quaternion);useCamera(perspectiveCamera);}controls.enableRotate=true;cameraFlight=null;camera.up.set(0,1,0);controls.enableDamping=false;controls.update();
 if(n==='probe'&&state.mode==='membrane'&&state.section){const pose=sectionCameraPose();state.view=n;camera.position.copy(pose.position);camera.up.copy(pose.up);controls.target.copy(pose.target);camera.lookAt(pose.target);document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===n));}
 else existingView(n);
 const endPosition=camera.position.clone(),endTarget=controls.target.clone(),endUp=camera.up.clone();camera.lookAt(endTarget);const endQuaternion=camera.quaternion.clone();camera.position.copy(startPosition);camera.quaternion.copy(startQuaternion);controls.target.copy(startTarget);camera.up.set(0,1,0).applyQuaternion(startQuaternion);controls.enabled=false;controls.enableDamping=true;
 cameraFlight={start:performance.now(),duration:1050,startPosition,startTarget,startQuaternion,endPosition,endTarget,endQuaternion,endUp,orthographic:n==='probe'&&state.mode==='membrane'&&state.section};syncSectionVisibility();
};
function syncSectionVisibility(){const closeSection=state.mode==='membrane'&&state.section&&state.view==='probe';vesselObjects.forEach(o=>o.visible=state.mode!=='flow'&&!closeSection);$('sectionNote').hidden=state.mode!=='membrane'||!state.section;}
function updateAmplifiedMembrane(){if(state.mode!=='membrane')return;const physical=state.vent?0:diaphragmAt(state.h,LIQUIDS[state.liquid].rho,state.bias),wanted=physical*state.deformationScale,shown=THREE.MathUtils.clamp(wanted,-.011,.011);state.displayDeflection=state.section?shown:physical;state.displayLimited=state.section&&Math.abs(wanted)>.011;
 const w=state.section?shown:physical,a=halfDiaphragmGeometry.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),r2=(x*x+y*y)/(.0315**2);a.setZ(i,-w*Math.max(0,1-r2));}a.needsUpdate=true;halfDiaphragmGeometry.computeVertexNormals();centerDot.position.z=-w+.0007;
 const sense=physical>=0?'内凹':'外凸';$('deformationRead').textContent=`实际${sense} ${(Math.abs(physical)*1000).toFixed(2)} mm`+(state.displayLimited?` · 显示已限幅，有效 ×${(Math.abs(shown/physical)).toFixed(1)}`:'');
}
updateLiquid=function(){physicalLiquidUpdate();updateAmplifiedMembrane();syncSectionVisibility();};
const sectionToggle=$('sectionProbe').onclick;$('sectionProbe').onclick=()=>{sectionToggle();updateAmplifiedMembrane();syncSectionVisibility();if(!state.section)view('probe');};
$('deformationScale').onchange=e=>{state.deformationScale=+e.target.value;updateAmplifiedMembrane();};$('deformationHelp').onclick=()=>$('deformationDialog').showModal();$('closeDeformationHelp').onclick=()=>$('deformationDialog').close();
selectMode=function(mode){finishFlight();existingSelectMode(mode);syncSectionVisibility();};
visualTick=function(now){if(cameraFlight){const f=cameraFlight,t=THREE.MathUtils.clamp((now-f.start)/f.duration,0,1),u=t*t*(3-2*t);camera.position.lerpVectors(f.startPosition,f.endPosition,u);controls.target.lerpVectors(f.startTarget,f.endTarget,u);camera.quaternion.slerpQuaternions(f.startQuaternion,f.endQuaternion,u);camera.up.set(0,1,0).applyQuaternion(camera.quaternion);if(t>=1)finishFlight();}else{controls.update();if(camera===sectionCamera)fitSectionProjection();}};
// Glass centres stay clear; Fresnel shading adds a stronger, view-dependent edge.
glass.color.setHex(0x8cb6c3);glass.roughness=.21;glass.opacity=.24;glass.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
 float edgeStrength=pow(1.0-abs(dot(normal,normalize(vViewPosition))),2.4);
 diffuseColor.a=0.085+0.58*edgeStrength;
 outgoingLight=mix(outgoingLight,vec3(0.16,0.31,0.36),edgeStrength*0.46);
 #include <opaque_fragment>
 `);};glass.customProgramCacheKey=()=> 'manometer-clear-glass-fresnel-v1';glass.needsUpdate=true;
watermat.opacity=.095;waterTopMat.opacity=.25;
const glassRimMaterial=new THREE.MeshStandardMaterial({color:0x6a96a4,roughness:.48,metalness:.08,transparent:true,opacity:.64,depthWrite:false});
// Give exposed mouths two distinct lips so their wall thickness is legible.
for(const x of [.20,.26]){ring(.0082,.00045,glassRimMaterial,[x,.35,0]);ring(.0069,.00032,glassRimMaterial,[x,.35,0]);}
for(const y of [0,.22]){ring(.0075,.00042,glassRimMaterial,[0,y,0],[Math.PI/2,0,0],openGroup);ring(.0062,.00028,glassRimMaterial,[0,y,0],[Math.PI/2,0,0],openGroup);}
for(const [x,r] of [[-.245,.018],[.045,.018]]){ring(r-.0003,.0005,glassRimMaterial,[x,.12,0],[0,Math.PI/2,0],flowGroup);ring(r-.0011,.0003,glassRimMaterial,[x,.12,0],[0,Math.PI/2,0],flowGroup);}
const vesselRims=new THREE.Group();apparatus.add(vesselRims);ring(VR,.0006,glassRimMaterial,[VX,.258,0],[Math.PI/2,0,0],vesselRims);ring(VR-.0018,.00035,glassRimMaterial,[VX,.258,0],[Math.PI/2,0,0],vesselRims);ring(VR,.00045,glassRimMaterial,[VX,.026,0],[Math.PI/2,0,0],vesselRims);vesselObjects.push(vesselRims);
hemi.intensity=1.05;fill.intensity=1.0;key.intensity=2.35;
updateAmplifiedMembrane();Object.assign(window.manometerLab,{view,updateLiquid,selectMode,sectionCameraPose,visualTick,finishFlight,glass,probe,halfDiaphragmGeometry,diaphragmGeometry,vesselObjects});

// One diameter in the cut plane: no circular or perpendicular guides can project as offset curves.
for(const child of [...restOutline.children]){restOutline.remove(child);child.geometry.dispose();}
const restBaseline=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(.00002,-.0315,.0006),new THREE.Vector3(.00002,.0315,.0006)]),dashMaterial);restBaseline.computeLineDistances();restBaseline.renderOrder=18;restOutline.add(restBaseline);
$('labHelp').onclick=()=>$('labHelpDialog').showModal();$('closeLabHelp').onclick=()=>$('labHelpDialog').close();
const compactSelectMode=selectMode;selectMode=function(mode){compactSelectMode(mode);depthHeading.textContent=mode==='open'?'管口深度 d':'探头深度 h';depthCaption.textContent=mode==='open'?'管口到槽内液面':'橡皮膜中心到液面';readCard.querySelector('h3').textContent='液面差 Δh';originalOrientationCard.querySelector('h3').textContent='橡皮膜朝向';$('record').closest('.card').querySelector('h3').textContent='数据记录';$('explain').textContent='探究提示 ?';$('checkPrep').textContent='气密性 / 调零';};
selectMode('membrane');Object.assign(window.manometerLab,{camera,view,selectMode,restBaseline,restOutline,sectionCamera,perspectiveCamera});
