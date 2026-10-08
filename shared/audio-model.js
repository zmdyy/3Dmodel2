(() => {
'use strict';
const T=THREE, mic=document.body.dataset.model==='microphone', $=id=>document.getElementById(id);
const title=mic?'动圈式话筒':'扬声器结构与振动';
const canvas=$('scene'),stage=$('stage');
let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});}catch(e){$('error').hidden=false;$('error').textContent='无法启动 3D 场景，请在支持 WebGL 的浏览器中打开。';return;}
if(T.ColorManagement)T.ColorManagement.legacyMode=false;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
const scene=new T.Scene();scene.background=new T.Color(0xeef3f9);
const camera=new T.PerspectiveCamera(38,1,.05,160);
scene.add(new T.HemisphereLight(0xffffff,0x8c9eb0,.95));
for(const [color,intensity,pos] of [[0xfff6e9,1.35,[5,8,9]],[0xd6e6ff,.65,[-6,3,4]],[0xffffff,.8,[2,5,-8]]]){const l=new T.DirectionalLight(color,intensity);l.position.set(...pos);scene.add(l);}
// A studio environment makes polished metal readable, without external image requests.
const studio=new T.Scene();studio.background=new T.Color(0x91a3b9);
for(const [pos,size,color] of [[[0,5,0],[10,.15,8],0xffffff],[[0,1,6],[9,5,.1],0xf6fbff],[[-5,0,0],[.1,7,7],0x647d9e],[[5,2,-4],[.1,5,6],0xffffff]]){const m=new T.Mesh(new T.BoxGeometry(...size),new T.MeshBasicMaterial({color}));m.position.set(...pos);studio.add(m);}
const pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(studio,.05);scene.environment=env.texture;pmrem.dispose();
const root=new T.Group();scene.add(root);
const parts=[],selectable=[],labels=[];
const state={mode:'section',explode:0,explodeTarget:0,playing:true,phase:0,amp:.55,freq:1.2,showLabels:true,showFlow:true,showField:true,selected:null,step:1,flowTravel:0};
let seed=9137;function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
function texture(type){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#888';ctx.fillRect(0,0,256,256);for(let i=0;i<10000;i++){const v=110+rand()*50;ctx.fillStyle=`rgb(${v},${v},${v})`;const x=rand()*256,y=rand()*256;if(type==='paper'){ctx.fillRect(x,y,1+rand()*6,.6);}else if(type==='steel'){ctx.fillRect(x,y,1,12+rand()*25);}else ctx.fillRect(x,y,1.5,1.5);}const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;return tex;}
const paperTex=texture('paper'),steelTex=texture('steel'),grainTex=texture('grain');
const materials={
 steel:new T.MeshStandardMaterial({color:0xb9c5cf,metalness:.95,roughness:.28,bumpMap:steelTex,bumpScale:.009}),
 basket:new T.MeshStandardMaterial({color:0x273342,metalness:.6,roughness:.44,bumpMap:grainTex,bumpScale:.012}),
 magnet:new T.MeshStandardMaterial({color:0x4b4d50,metalness:.05,roughness:.9,bumpMap:grainTex,bumpScale:.025}),
 paper:new T.MeshStandardMaterial({color:0x54565b,roughness:.98,metalness:0,bumpMap:paperTex,bumpScale:.035,side:T.DoubleSide}),
 rubber:new T.MeshStandardMaterial({color:0x202932,roughness:.8,metalness:0}),
 spider:new T.MeshStandardMaterial({color:0xb88847,roughness:.92,bumpMap:paperTex,bumpScale:.022,side:T.DoubleSide}),
 copper:new T.MeshPhysicalMaterial({color:0xc98248,metalness:.78,roughness:.26,clearcoat:.35,clearcoatRoughness:.22}),
 former:new T.MeshStandardMaterial({color:0xd6b875,roughness:.68,metalness:.06,side:T.DoubleSide}),
 film:new T.MeshPhysicalMaterial({color:0xe1e8ed,metalness:.22,roughness:.36,clearcoat:.42,side:T.DoubleSide}),
 black:new T.MeshStandardMaterial({color:0x22303b,roughness:.5,metalness:.45,bumpMap:grainTex,bumpScale:.012}),
 mesh:new T.MeshStandardMaterial({color:0xacbac6,roughness:.32,metalness:.94}),
 red:new T.MeshStandardMaterial({color:0xb43431,roughness:.5}), wire:new T.MeshStandardMaterial({color:0x3c3330,roughness:.45,metalness:.45})
};
function part(id,name,material,desc,relation,anchor,shift){const p={id,name,material,desc,relation,anchor:new T.Vector3(...anchor),shift,group:new T.Group(),surfaces:[],move:0};p.group.userData.part=p;root.add(p.group);parts.push(p);return p;}
function add(p,geo,mat,pos,rot,half=false){const mesh=new T.Mesh(geo,mat.clone());if(pos)mesh.position.set(...pos);if(rot)mesh.rotation.set(...rot);mesh.userData.part=p;mesh.userData.baseEmissive=mesh.material.emissive?.clone();p.group.add(mesh);selectable.push(mesh);if(half)p.surfaces.push(mesh);return mesh;}
// Revolved thick profiles use an actual half geometry with closed, contrasting cut faces.
// Axial coordinate x, radius r. In section mode the near half (z>0) is removed.
function revolveGeo(profile,half){const n=half?64:96,theta0=half?Math.PI:0,angle=half?Math.PI:2*Math.PI,positions=[],uvs=[],indices=[],len=profile.length;
 for(let j=0;j<=n;j++){const a=theta0+angle*j/n;for(let k=0;k<len;k++){const [x,r]=profile[k];positions.push(x,r*Math.cos(a),r*Math.sin(a));uvs.push(j/n*3,k/len*3);}}
 for(let j=0;j<n;j++)for(let k=0;k<len-1;k++){const a=j*len+k,b=a+len;indices.push(a,b,a+1,b,b+1,a+1);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;}
function capGeo(profile){const contour=profile.slice(0,-1).map(([x,r])=>new T.Vector2(x,r)),faces=T.ShapeUtils.triangulateShape(contour,[]),out=[];for(const sign of [-1,1])for(const face of faces)for(const idx of face){const [x,r]=profile[idx];out.push(x,sign*r,0);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(out,3));geo.computeVertexNormals();return geo;}
function revolved(p,profile,material){const full=add(p,revolveGeo(profile,false),material,null,null,true),cut=add(p,revolveGeo(profile,true),material,null,null,true);full.userData.variant='full';cut.userData.variant='cut';cut.material.side=T.DoubleSide;
 const mat=new T.MeshStandardMaterial({color:material.color.clone(),roughness:.90,metalness:.04,side:T.DoubleSide});const caps=add(p,capGeo(profile),mat,null,null,true);caps.userData.variant='cap';return full;}
function ring(p,x,ro,ri,len,mat){revolved(p,[[x-len/2,ri],[x-len/2,ro],[x+len/2,ro],[x+len/2,ri],[x-len/2,ri]],mat);}
function solid(p,x,r,len,mat){ring(p,x,r,0,len,mat);}
function tubeMesh(p,points,r,mat){const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)));return add(p,new T.TubeGeometry(curve,Math.max(24,points.length*4),r,7,false),mat);}
function torus(p,x,r,t,mat){const mesh=add(p,new T.TorusGeometry(r,t,10,96),mat,[x,0,0],[0,Math.PI/2,0]);mesh.userData.clip=true;return mesh;}
const front=mic?1.22:3.68,outer=mic?1.82:3.9;
const body=part('body',mic?'金属外壳':'盆架',mic?'喷涂金属':'冲压钢架',mic?'外壳容纳拾音单元，并将输出导线引到尾部插座。它不会随声音振动。':'盆架固定磁路和振动系统，开口让纸盆背面的空气可以流动。','固定件，不与音圈一起运动。',mic?[-6.0,.9,0]:[2.6,3.4,0],-2.2);
if(mic){revolved(body,[[-10.5,0],[-10.5,.56],[-10.32,.66],[-2.35,1.02],[-2.15,1.06],[-2.15,.72],[-10.5,.38]],materials.black);revolved(body,[[-2.35,1.01],[-1.8,1.93],[1.20,1.98],[1.20,1.88],[-1.76,1.83],[-2.35,.91],[-2.35,1.01]],materials.black);ring(body,-10.39,.61,.38,.18,materials.steel);for(let i=0;i<3;i++)add(body,new T.CylinderGeometry(.055,.055,.23,10),materials.steel,[-10.54,.21*Math.cos(i*2*Math.PI/3),.21*Math.sin(i*2*Math.PI/3)],[0,0,Math.PI/2]);}
else{ring(body,front+.09,4.15,3.82,.18,materials.basket);ring(body,.22,1.6,1.46,.18,materials.basket);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;const shape=new T.Shape();shape.moveTo(.15,1.48);shape.lineTo(.4,1.46);shape.lineTo(3.71,3.88);shape.lineTo(3.7,4.02);shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:.17,bevelEnabled:true,bevelSize:.03,bevelThickness:.03,bevelSegments:2,steps:1});g.translate(0,0,-.085);const m=add(body,g,materials.basket);m.rotation.x=a;m.userData.clip=true;
 const bolt=add(body,new T.CylinderGeometry(.095,.095,.10,6),materials.steel,[front+.22,4.02*Math.cos(a),4.02*Math.sin(a)],[0,0,Math.PI/2]);bolt.userData.clip=true;}}
const back=part('pole','极柱与后夹板','导磁钢','后夹板和中心极柱把磁通引向磁隙；极柱与外侧极板之间留出环形间隙。','极柱固定，音圈围在它的外侧。',[-1.55,.52,0],-1.35);
solid(back,-1.65,mic?1.66:1.88,.27,materials.steel);solid(back,-.88,.67,1.65,materials.steel);
const magnet=part('magnet','永久磁体','铁氧体','环形永久磁体提供磁场，深灰色粗糙表面与银色导磁钢件区分。','永久磁体固定；不是铜色音圈。',[-1.12,1.72,0],-.85);
ring(magnet,-1.14,mic?1.62:1.82,.88,.74,materials.magnet);
const plate=part('plate','前极板','导磁钢','前极板的内孔包围中心极柱，形成狭窄环形磁隙。','音圈位于内孔与极柱之间，并沿轴线往复。',[-.57,1.45,0],-.35);
ring(plate,-.61,mic?1.67:1.9,.96,.36,materials.steel);
const coil=part('coil',mic?'动圈':'音圈','漆包铜线 + 骨架',mic?'动圈粘接在膜片背部。声音使膜片与动圈一起运动，线圈在磁隙中运动时产生感应电动势。':'漆包铜线绕在线圈骨架上。通入交流电后，磁隙中的音圈受力，推动与它连接的纸盆。','铜线、骨架与振膜连接为一个振动系统。',[-.58,.82,0],1.0);coil.move=1;
ring(coil,mic?.34:.04,.78,.735,mic?2.20:1.60,materials.former);
const helixPts=[],turns=22;for(let i=0;i<=turns*24;i++){const u=i/(turns*24),a=u*turns*Math.PI*2;helixPts.push(new T.Vector3(-.99+u*.80,.824*Math.cos(a),.824*Math.sin(a)));}
const helixCurve=new T.CatmullRomCurve3(helixPts),helix=add(coil,new T.TubeGeometry(helixCurve,turns*24,.027,6,false),materials.copper);helix.userData.clip=true;
const diaphragm=part('diaphragm',mic?'膜片':'锥形纸盆',mic?'轻薄高分子膜':'纸纤维',mic?'轻薄膜片接收声压变化，中央隆起与环形波纹提高刚度和顺应性。':'锥形纸盆与音圈骨架粘接，把音圈的小幅轴向运动传到较大的辐射面，推动空气。',mic?'膜片推动线圈：声音 → 振动 → 电信号。':'音圈推动纸盆：电信号 → 振动 → 声音。',[front,outer*.7,0],2.05);diaphragm.move=1;
if(mic){const profile=[];for(let i=0;i<=36;i++){const r=i/36*1.70;profile.push([1.48-.30*(r/1.70)**2+.03*Math.sin(r*32)*(r>1.18?1:0),r]);}for(let i=36;i>=0;i--){const r=i/36*1.70;profile.push([1.46-.30*(r/1.70)**2+.03*Math.sin(r*32)*(r>1.18?1:0),r]);}profile.push(profile[0]);revolved(diaphragm,profile,materials.film);}
else{revolved(diaphragm,[[.72,.78],[3.59,3.72],[3.64,3.72],[.77,.78],[.72,.78]],materials.paper);
 for(let i=0;i<3;i++){const r=2.75+i*.27,x=.72+(r-.78)/(3.72-.78)*(3.59-.72);const m=torus(diaphragm,x,r,.025,materials.paper);m.userData.clip=true;}}
const surround=part('surround',mic?'膜片悬边':'柔性悬边',mic?'柔性薄膜':'橡胶','悬边的外缘固定在框架上，内缘随振膜运动；它弯曲变形而非整圈平移。','允许轴向振动，并保持振膜居中。',[front,outer,0],2.05);
const rIn=mic?1.70:3.72,rOut=mic?1.91:4.04;
const suspensionProfile=[];for(let i=0;i<=24;i++){const u=i/24;suspensionProfile.push([front+.14*Math.sin(u*Math.PI),rIn+(rOut-rIn)*u]);}for(let i=24;i>=0;i--){const u=i/24;suspensionProfile.push([front+.14*Math.sin(u*Math.PI)-.05,rIn+(rOut-rIn)*u]);}suspensionProfile.push(suspensionProfile[0]);revolved(surround,suspensionProfile, mic?materials.film:materials.rubber);
let spider=null,dust=null,grille=null;
if(!mic){spider=part('spider','定心支片','浸渍织物','环形波纹织物固定音圈骨架，限制侧向偏移。内缘随音圈移动，外缘固定在盆架上。','与悬边共同保持音圈在磁隙中居中。',[.46,1.32,0],.8);const prof=[];for(let i=0;i<=48;i++){const u=i/48;prof.push([.5+.065*Math.sin(u*Math.PI*12),.78+.82*u]);}for(let i=48;i>=0;i--){const u=i/48;prof.push([.47+.065*Math.sin(u*Math.PI*12),.78+.82*u]);}prof.push(prof[0]);revolved(spider,prof,materials.spider);
 dust=part('dust','防尘帽','纸纤维','封闭纸盆中央，防止尘埃进入磁隙。剖面中切开防尘帽，才能看到后面的骨架和音圈。','与纸盆一起运动。',[1.36,.55,0],2.05);dust.move=1;const dustProfile=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI/2;dustProfile.push([.98+.68*Math.cos(a),1.05*Math.sin(a)]);}for(let i=24;i>=0;i--){const a=i/24*Math.PI/2;dustProfile.push([.95+.68*Math.cos(a),1.05*Math.sin(a)]);}dustProfile.push(dustProfile[0]);revolved(dust,dustProfile,materials.paper);}
else{grille=part('grille','金属网罩','编织钢丝','交叉编织的网罩保护膜片。内部另有黑色防风层；观察内部时可切开或移走网罩。','保护件固定，不参与动圈振动。',[2.13,1.68,0],3.2);
 // Actual crossing wire strands, rather than wireframe triangles.
 for(let j=0;j<22;j++){const a=j/22*Math.PI*2,pts=[];for(let i=0;i<=28;i++){const t=i/28*Math.PI/2,r=1.98*Math.sin(t);pts.push([1.22+1.12*Math.cos(t),r*Math.cos(a),r*Math.sin(a)]);}const m=tubeMesh(grille,pts,.016,materials.mesh);m.userData.clip=true;}
 for(let j=1;j<=20;j++){const t=j/21*Math.PI/2,x=1.22+1.12*Math.cos(t),r=1.98*Math.sin(t);torus(grille,x,r,.016,materials.mesh);}
 ring(grille,1.20,2.04,1.88,.18,materials.steel);
 const foam=materials.rubber.clone();foam.color.set(0x18212a);foam.transparent=true;foam.opacity=.42;foam.depthWrite=false;
 const prof=[];for(let i=0;i<=30;i++){const t=i/30*Math.PI/2;prof.push([1.20+1.03*Math.cos(t),1.88*Math.sin(t)]);}for(let i=30;i>=0;i--){const t=i/30*Math.PI/2;prof.push([1.20+1.00*Math.cos(t),1.84*Math.sin(t)]);}prof.push(prof[0]);revolved(grille,prof,foam);}
// Merge grille strands into one draw call while retaining woven geometry and selection.
if(grille){const strands=grille.group.children.filter(m=>m.isMesh&&m.userData.clip&&m.material.color.equals(materials.mesh.color)),positions=[],normals=[],uvs=[],indices=[];let offset=0;for(const m of strands){m.updateMatrix();const g=m.geometry.clone().applyMatrix4(m.matrix),a=g.attributes;positions.push(...a.position.array);normals.push(...a.normal.array);uvs.push(...a.uv.array);for(const idx of g.index.array)indices.push(idx+offset);offset+=a.position.count;g.dispose();m.geometry.dispose();m.material.dispose();grille.group.remove(m);selectable.splice(selectable.indexOf(m),1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);const m=add(grille,g,materials.mesh);m.userData.clip=true;}
const leads=part('leads',mic?'输出导线':'接线端与软导线','铜导体 + 绝缘层',mic?'动圈两端接到输出插座；接入外部负载构成回路时，才有感应电流。':'软导线把外接电信号送到音圈；弯曲余量允许纸盆振动。','红色箭头表示电流方向，不表示电子的运动方向。',mic?[-7,-.9,0]:[-.5,-2.2,0],-.3);
const leadPaths=mic?[[[-10.5,-.3,.3],[-7.4,-.42,.4],[-4.2,-.65,.6],[-1.25,-1.05,.6],[-.99,.824,0]],[[-.19,.824,0],[-.7,-1,-.6],[-4.2,-.65,-.6],[-7.4,-.42,-.4],[-10.5,-.3,-.3]]]:[[[-.65,-2.3,.45],[-.1,-2.1,.5],[.5,-1.6,.55],[.15,-1.1,.4],[-.99,.824,0]],[[-.19,.824,0],[.42,-1.15,-.4],[.5,-1.6,-.55],[-.1,-2.1,-.5],[-.65,-2.3,-.45]]];
const wireRecords=[];
for(let k=0;k<2;k++){const curve=new T.CatmullRomCurve3(leadPaths[k].map(v=>new T.Vector3(...v)));const mesh=add(leads,new T.TubeGeometry(curve,48,.038,7,false),k?materials.wire:materials.red);wireRecords.push({mesh,base:mesh.geometry.attributes.position.array.slice(),curve});}
if(!mic)for(const z of [-.45,.45])add(leads,new T.BoxGeometry(.25,.28,.20),materials.steel,[-.65,-2.3,z]);
// Stable geometries: deform lead vertices in place; no new meshes, curves or tubes per frame.
const sectionPlane=new T.Plane(new T.Vector3(0,0,-1),0);renderer.localClippingEnabled=true;
const fieldG=new T.Group();root.add(fieldG);const forceG=new T.Group();root.add(forceG);
for(const a of [Math.PI*.65,Math.PI,Math.PI*1.35]){const ar=new T.ArrowHelper(new T.Vector3(0,-Math.cos(a),-Math.sin(a)),new T.Vector3(-.60,.94*Math.cos(a),.94*Math.sin(a)),.25,0x2d82d1,.075,.045);fieldG.add(ar);}
const force=new T.ArrowHelper(new T.Vector3(1,0,0),new T.Vector3(-.55,-1.20,.08),.65,0x218976,.18,.10);forceG.add(force);
const gapMat=new T.MeshBasicMaterial({color:0x59b6f5,transparent:true,opacity:.12,side:T.DoubleSide,depthWrite:false});
const gap=new T.Mesh(revolveGeo([[-.79,.68],[-.79,.95],[-.43,.95],[-.43,.68],[-.79,.68]],true),gapMat);root.add(gap);
const FLOW=window.CurrentFlowStyle,flowMat=FLOW.createMaterial(T),flowGeo=FLOW.createGeometry(T),flowAxis=FLOW.createAxis(T),flows=[];
const flowSpecs=[{curve:wireRecords[0].curve,parent:leads.group,n:8,wire:0},{curve:helixCurve,parent:coil.group,n:10},{curve:wireRecords[1].curve,parent:leads.group,n:8,wire:1}];
for(const spec of flowSpecs){spec.length=spec.curve.getLength();spec.arrows=[];spec.instanced=new T.InstancedMesh(flowGeo,flowMat,spec.n);spec.instanced.instanceMatrix.setUsage(T.DynamicDrawUsage);spec.instanced.frustumCulled=false;spec.instanced.renderOrder=6;spec.parent.add(spec.instanced);for(let i=0;i<spec.n;i++)spec.arrows.push(new T.Object3D());flows.push(spec);}
const soundG=new T.Group();root.add(soundG);const waves=[];
for(let i=0;i<4;i++){const m=new T.Mesh(new T.TorusGeometry(1,.013,6,64),new T.MeshBasicMaterial({color:0x6594c7,transparent:true,opacity:.25,depthWrite:false}));m.rotation.y=Math.PI/2;soundG.add(m);waves.push(m);}
const colors={body:'#4e6173',pole:'#8a9eaf',magnet:'#4c5055',plate:'#91a6b8',coil:'#c38147',diaphragm:mic?'#aebdca':'#65676b',surround:'#353f4b',spider:'#b88847',dust:'#65676b',grille:'#9baeba',leads:'#b04c43'};
$('parts').innerHTML=parts.map(p=>`<button class="part-btn" data-part="${p.id}"><i style="background:${colors[p.id]}"></i>${p.name}</button>`).join('');
for(const p of parts){const b=document.createElement('button');b.className='label';b.textContent=p.name;b.addEventListener('click',()=>select(p.id));$('labels').appendChild(b);const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('stroke','#94a8bc');line.setAttribute('stroke-width','1.2');$('leaders').appendChild(line);labels.push({p,b,line});}
$('parts').addEventListener('click',e=>{const b=e.target.closest('[data-part]');if(b)select(b.dataset.part);});
function select(id){if(state.mode==='full'&&['coil','pole','plate','spider',...(mic?['magnet','diaphragm','surround','leads']:[])].includes(id))mode('section');state.selected=id;const p=parts.find(p=>p.id===id);$('description').innerHTML=`<b>${p.name}</b><p>${p.desc}</p><small>${p.material} · ${p.relation}</small>`;document.querySelectorAll('[data-part]').forEach(b=>{b.classList.toggle('active',b.dataset.part===id);b.setAttribute('aria-pressed',String(b.dataset.part===id));});for(const q of parts)q.group.traverse(m=>{if(m.isMesh&&m.material.emissive){m.material.emissive.set(q.id===id?0x3b2410:0x000000);m.material.emissiveIntensity=q.id===id?.28:0;}});}
function syncMode(){leads.group.visible=!mic||state.mode!=='full';for(const p of parts){for(const m of p.surfaces)m.visible=state.mode==='section'?m.userData.variant!=='full':m.userData.variant==='full';p.group.traverse(m=>{if(m.isMesh&&m.userData.clip)m.material.clippingPlanes=state.mode==='section'?[sectionPlane]:[];});}gap.visible=state.mode==='section';state.explodeTarget=state.mode==='explode'?1:0;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===state.mode);b.setAttribute('aria-pressed',String(b.dataset.view===state.mode));});$('modeBadge').textContent=state.mode==='section'?'半剖面 · 磁隙和音圈可见':state.mode==='explode'?'分解示意 · 部件间距放大':'完整装配 · 外观观察';}
function mode(v){state.mode=v;syncMode();}
$('views').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b){mode(b.dataset.view);state.step=-1;syncGuide();if(state.mode==='explode')preset('explode');}});
function syncGuide(){document.querySelectorAll('[data-step]').forEach(b=>b.classList.toggle('active',+b.dataset.step===state.step));}
$('guide').addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(!b)return;state.step=+b.dataset.step;syncGuide();if(state.step===0){mode('full');preset('front');select(mic?'grille':'diaphragm');}else if(state.step===1){mode('section');preset('detail');select('coil');}else if(state.step===2){mode('explode');preset('explode');select(mic?'diaphragm':'spider');}else{mode('section');preset('default');state.playing=true;syncPlay();select(mic?'diaphragm':'coil');}});
$('ampRange').oninput=e=>{state.amp=+e.target.value/100;$('ampValue').textContent=e.target.value+'%';};$('freqRange').oninput=e=>{state.freq=+e.target.value/10;$('freqValue').textContent=state.freq.toFixed(1)+' Hz';};
function syncPlay(){$('btnPlay').textContent=state.playing?'暂停振动':'开始振动';$('btnPlay').classList.toggle('active',state.playing);$('btnPlay').setAttribute('aria-pressed',String(state.playing));}
$('btnPlay').onclick=()=>{state.playing=!state.playing;syncPlay();};$('btnResetMotion').onclick=()=>{state.phase=0;state.flowTravel=0;state.playing=false;syncPlay();};
for(const [id,key] of [['btnLabels','showLabels'],['btnFlow','showFlow'],['btnField','showField']])$(id).onclick=()=>{state[key]=!state[key];$(id).classList.toggle('active',state[key]);$(id).setAttribute('aria-pressed',String(state[key]));};
// Same orbital response as the retained three demos, with full vertical rotation range.
const view={theta:.27,phi:1.20,dist:mic?19.4:18,distTarget:mic?19.4:18,target:new T.Vector3(mic?-3.65:1,0,0),targetGoal:new T.Vector3(mic?-3.65:1,0,0)};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function preset(which){const conf=which==='detail'?{theta:.10,phi:1.35,dist:6.0,target:[-.45,0,0]}:which==='front'?{theta:Math.PI/2-.15,phi:1.3,dist:mic?18.4:16,target:[mic?-3.65:1.25,0,0]}:which==='explode'?{theta:.18,phi:1.25,dist:mic?25:24,target:[mic?-3.65:.9,0,0]}:{theta:.27,phi:1.20,dist:mic?19.4:18,target:[mic?-3.65:1,0,0]};view.theta=conf.theta;view.phi=conf.phi;view.distTarget=conf.dist;view.targetGoal.set(...conf.target);}
$('btnResetView').onclick=()=>preset('default');$('btnSide').onclick=()=>{view.theta=0;view.phi=Math.PI/2;view.distTarget=mic?19.4:18;view.targetGoal.set(mic?-3.65:1,0,0);};$('btnFocus').onclick=()=>{const p=parts.find(p=>p.id===state.selected);if(!p)return;const box=new T.Box3().setFromObject(p.group),size=new T.Vector3();box.getSize(size);box.getCenter(view.targetGoal);view.distTarget=clamp(size.length()*1.5,4.8,24);view.theta=.14;view.phi=1.3;};
const pointers=new Map();let dragMode=null,pinchDist=0,pinchStart=0,down=null;
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.style.cursor='grabbing';down={x:e.clientX,y:e.clientY};if(pointers.size===1)dragMode=(e.button===2||e.shiftKey)?'pan':'orbit';else{dragMode='pinch';const [a,b]=Array.from(pointers.values());pinchDist=Math.hypot(a.x-b.x,a.y-b.y);pinchStart=view.distTarget;}e.preventDefault();});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const prev=pointers.get(e.pointerId),dx=e.clientX-prev.x,dy=e.clientY-prev.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(dragMode==='pinch'&&pointers.size===2){const [a,b]=Array.from(pointers.values()),d=Math.hypot(a.x-b.x,a.y-b.y);if(d>0)view.distTarget=clamp(pinchStart*pinchDist/d,4.8,38);}else if(dragMode==='orbit'){view.theta-=dx*.0055;view.phi=clamp(view.phi-dy*.005,.10,Math.PI-.10);}else if(dragMode==='pan'){const s=view.dist*.0016,right=new T.Vector3().setFromMatrixColumn(camera.matrix,0),up=new T.Vector3().setFromMatrixColumn(camera.matrix,1);view.target.addScaledVector(right,-dx*s).addScaledVector(up,dy*s);view.targetGoal.copy(view.target);}e.preventDefault();});
const raycaster=new T.Raycaster(),ndc=new T.Vector2();
function endPointer(e){if(down&&e.type==='pointerup'&&e.button===0&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<5){const rect=canvas.getBoundingClientRect();ndc.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);raycaster.setFromCamera(ndc,camera);const hit=raycaster.intersectObjects(selectable).find(h=>h.object.visible&&h.object.parent.visible&&!(state.mode==='section'&&h.point.z>.01));if(hit)select(hit.object.userData.part.id);}pointers.delete(e.pointerId);down=null;if(!pointers.size){dragMode=null;canvas.style.cursor='grab';}else if(pointers.size===1)dragMode='orbit';}
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('wheel',e=>{e.preventDefault();view.distTarget=clamp(view.distTarget*Math.exp(e.deltaY*.0011),4.8,38);},{passive:false});canvas.addEventListener('contextmenu',e=>e.preventDefault());
function panelVisible(on){$('panel').classList.toggle('hidden',!on);$('openPanel').hidden=on;}$('closePanel').onclick=()=>panelVisible(false);$('openPanel').onclick=()=>panelVisible(true);panelVisible(innerWidth>900);
function resize(){const r=stage.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(stage);resize();
$('btnShot').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.download=title+'.png';a.href=canvas.toDataURL('image/png');a.click();};
function updateLabels(){const w=stage.clientWidth,h=stage.clientHeight,projected=[];
 for(const item of labels){const anchor=item.p.anchor.clone().add(item.p.group.position),v=anchor.clone().project(camera);const ax=(v.x*.5+.5)*w,ay=(-v.y*.5+.5)*h;const internal=state.mode==='full'&&(mic?!['body','grille'].includes(item.p.id):['coil','pole','plate','spider'].includes(item.p.id));const visible=state.showLabels&&!internal&&v.z>-1&&v.z<1&&ax>8&&ax<w-8&&ay>110&&ay<h-120;item.b.hidden=!visible;item.line.style.display=visible?'':'none';if(visible)projected.push({...item,ax,ay});}
 projected.sort((a,b)=>a.ay-b.ay);const columns=[[],[]];for(const item of projected){const side=item.ax>w/2?1:0;columns[side].push(item);}
 for(let side=0;side<2;side++){const list=columns[side];const gapY=34,minY=130,maxY=h-135;let last=minY-gapY;for(const it of list){it.ly=Math.max(it.ay,last+gapY);last=it.ly;}const overflow=Math.max(0,last-maxY);for(let i=list.length-1;i>=0;i--){const it=list[i];it.ly=Math.max(minY+i*gapY,it.ly-overflow);const x=clamp(it.ax+(side?90:-90),80,w-90);it.b.style.left=x+'px';it.b.style.top=it.ly+'px';it.b.classList.toggle('selected',it.p.id===state.selected);it.line.setAttribute('x1',it.ax);it.line.setAttribute('y1',it.ay);it.line.setAttribute('x2',x);it.line.setAttribute('y2',it.ly);}}
}
const plot=$('plot'),ctx=plot.getContext('2d');function drawPlot(){const w=plot.width,h=plot.height;ctx.clearRect(0,0,w,h);ctx.strokeStyle='#cfdaea';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();for(let line=0;line<2;line++){ctx.strokeStyle=line?'#288779':'#df5848';ctx.lineWidth=2;ctx.beginPath();for(let x=0;x<w;x++){const p=state.phase-(w-x)/w*Math.PI*4,sig=line?Math.sin(p):mic?-Math.cos(p):Math.sin(p),y=h/2-sig*state.amp*30;if(x)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.stroke();}ctx.fillStyle='#df5848';ctx.font='13px sans-serif';ctx.fillText(mic?'感应电压':'电流 / 受力',10,17);ctx.fillStyle='#288779';ctx.fillText(mic?'膜片位移':'纸盆位移（示意）',145,17);}
const q=new T.Quaternion(),tmp=new T.Vector3();let last=0,frameCount=0;
function animate(ms){requestAnimationFrame(animate);const dt=Math.min(.05,(ms-last)*.001||.016);last=ms;if(state.playing){state.phase+=dt*state.freq*2*Math.PI;state.flowTravel+=dt*FLOW.speed;}view.dist+=(view.distTarget-view.dist)*(1-Math.exp(-10*dt));view.target.lerp(view.targetGoal,1-Math.exp(-9*dt));const orbitDistance=view.dist*Math.max(1,1/camera.aspect);camera.position.set(view.target.x+orbitDistance*Math.sin(view.phi)*Math.sin(view.theta),view.target.y+orbitDistance*Math.cos(view.phi),view.target.z+orbitDistance*Math.sin(view.phi)*Math.cos(view.theta));camera.lookAt(view.target);
 state.explode+=(state.explodeTarget-state.explode)*(1-Math.exp(-7*dt));const displacement=.135*state.amp*Math.sin(state.phase),signal=state.amp*(mic?-Math.cos(state.phase):Math.sin(state.phase));
 for(const p of parts){p.group.position.x=p.shift*state.explode+(p.move?displacement:0);}
 // Deform suspension surfaces: moving inner edge, fixed outer edge.
 for(const p of [surround,spider].filter(Boolean))for(const mesh of p.surfaces){if(!mesh.userData.base)mesh.userData.base=mesh.geometry.attributes.position.array.slice();const base=mesh.userData.base,attr=mesh.geometry.attributes.position;const inner=p===surround?rIn:.78,outerR=p===surround?rOut:1.60;for(let i=0;i<attr.count;i++){const r=Math.hypot(base[i*3+1],base[i*3+2]),u=clamp((outerR-r)/(outerR-inner),0,1);attr.array[i*3]=base[i*3]+displacement*u;}attr.needsUpdate=true;}
 for(let k=0;k<wireRecords.length;k++){const rec=wireRecords[k],a=rec.mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){const u=Math.floor(i/8)/48,blend=k?1-u:u;a.array[i*3]=rec.base[i*3]+(coil.group.position.x-leads.group.position.x)*blend*blend;}a.needsUpdate=true;}
 fieldG.visible=state.showField&&state.mode==='section';forceG.visible=!mic&&state.showField&&state.mode!=='explode'&&Math.abs(signal)>.025;gap.visible=state.mode==='section';force.setDirection(tmp.set(signal>=0?1:-1,0,0));force.setLength(.5+Math.abs(signal),.18,.1);forceG.position.x=displacement;
 for(const spec of flows){spec.instanced.visible=state.showFlow&&Math.abs(signal)>.025&&state.mode!=='explode';for(let i=0;i<spec.n;i++){const m=spec.arrows[i];m.visible=state.showFlow&&Math.abs(signal)>.025&&state.mode!=='explode';if(!m.visible)continue;const sign=signal>=0?1:-1;let u=(i/spec.n+state.flowTravel/spec.length*sign)%1;if(u<0)u+=1;m.position.copy(spec.curve.getPointAt(u));if(spec.wire!==undefined){const blend=spec.wire?1-u:u;m.position.x+=(coil.group.position.x-leads.group.position.x)*blend*blend;}m.quaternion.copy(q.setFromUnitVectors(flowAxis,spec.curve.getTangentAt(u).normalize().multiplyScalar(sign)));m.updateMatrix();spec.instanced.setMatrixAt(i,m.matrix);}spec.instanced.instanceMatrix.needsUpdate=true;}
 soundG.visible=state.mode!=='explode';for(let i=0;i<waves.length;i++){const u=((state.phase/(Math.PI*2)*.35+i/4)%1+1)%1,w=waves[i];w.position.x=front+1+(mic?1-u:u)*3;w.scale.setScalar(outer*(.75+u*.30));w.material.opacity=state.amp*.18*(1-u);}
 $('xValue').textContent=Math.abs(displacement)<.002?'平衡位置':displacement>0?'向前偏移':'向后偏移';$('signalValue').textContent=Math.abs(signal)<.025?'接近 0':(signal>0?'正向':'反向')+' · '+Math.abs(signal).toFixed(2);$('workNote').textContent=state.mode==='explode'?'分解图用于辨认装配顺序；实际工作时音圈仍在磁隙内。':mic?(Math.abs(Math.cos(state.phase))<.1?'膜片接近两端：瞬时速度小，感应电压接近零。':'膜片与线圈一起运动；运动方向改变时，感应电压方向改变。'):'交流电方向改变，线圈受力方向改变；纸盆与音圈连成一体。';
 if(++frameCount%3===0){root.updateMatrixWorld(true);updateLabels();drawPlot();}renderer.render(scene,camera);
}
select('coil');syncMode();syncGuide();syncPlay();preset('default');requestAnimationFrame(animate);
// Read-only inspection hook for meaningful browser checks.
window.AudioModel={getState:()=>({model:mic?'microphone':'speaker',mode:state.mode,playing:state.playing,phase:state.phase,amplitude:state.amp,selected:state.selected,geometryCount:renderer.info.memory.geometries,visibleArrows:flows.reduce((n,s)=>n+s.arrows.filter(m=>m.visible).length,0),drawCalls:renderer.info.render.calls,coilCenter:coil.group.position.x-.59,gapCenter:-.61,rotation:{theta:view.theta,phi:view.phi},explode:state.explode}),parts:parts.map(p=>({id:p.id,name:p.name}))};
})();
