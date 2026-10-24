(()=>{'use strict';
const $=id=>document.getElementById(id);
const THREE=window.THREE;
window.__dz47BootStarted=true;
console.info('[DZ47] V53 app entry');
if(!THREE){$('empty').hidden=true;$('loading').hidden=true;$('error').textContent='Three.js 未能加载，请检查共享引擎文件。';$('error').hidden=false;return;}
const CANVAS=$('view'), STAGE=$('stage');
let renderer,scene,camera,ambient,dir,root,loaded,clip;
let objects=[],highlights=[],raycast=new THREE.Raycaster(),mouse=new THREE.Vector2();
let activeGroup='all',look='three',pivot=new THREE.Vector3(0,0,0),dist=2.3,yaw=.55,pitch=.25;
let playing=false,segmentEnd=220,frame=1,lastTick=performance.now(),speed=1,explode=0,showOutline=false;
let sourceGLB=null,modelFileName='',cacheModels=[],drag=null,dragSteps=0;
const stages=[{id:'closed',label:'正常合闸',frame:1,info:'锁扣保持，银触点相接，主储能弹簧处于拉伸状态。'},
{id:'manual',label:'手动分闸',from:1,frame:42,info:'手柄通过 U 形连杆带动动触点支架旋开。'},
{id:'reclose',label:'重新合闸',from:42,frame:74,info:'通过手柄重新扣合锁扣，触点闭合。'},
{id:'overload',label:'过载加热',from:74,frame:95,info:'双金属片随模拟升温逐渐弯曲，触点暂时保持闭合。'},
{id:'thermal',label:'热脱扣',from:95,frame:114,info:'双金属片推动脱扣杆，释放锁扣并打开触点。'},
{id:'reset1',label:'故障后复位',from:114,frame:146,info:'教学演示中的手动复位动作，不代表故障会自动清除。'},
{id:'magnetic',label:'短路磁脱扣',from:146,frame:178,info:'短路大电流情境下，电磁铁芯推动锁扣并快速断开触点。'},
{id:'reset2',label:'再次复位',from:178,frame:215,info:'检查故障已排除后，人工复位合闸。'}];
const guideSteps=[
 {title:'先认清四个位置',body:'不用一次看懂所有零件。先找手柄、触点、线圈、灭弧室。它们各有不同任务。',question:'观察：橙色手柄在左，银色触点在上部，铜色线圈在下方，右侧是灭弧栅片。',frame:1,end:1,action:'先找零件',zoom:['O01','O06','M02','A02'],pins:[['O01','① 手柄'],['C07','② 动触点'],['M02','③ 线圈'],['A02','④ 灭弧室']]},
 {title:'真正接通电路的是触点',body:'接通电路的不是橙色塑料手柄，而是两片接触的银色触点。合闸时相接，分闸时分离。',question:'观察：点击「看触点打开」，看右侧的触点从哪里分离。',frame:1,end:42,action:'▶ 看触点打开',zoom:['C02','C07','O06'],pins:[['C02','静触点'],['C07','动触点'],['O07','转轴']]},
 {title:'手柄怎样带动触点',body:'手柄转动 → U形连杆传递运动 → 触点支架绕销轴转动 → 两片银触点分开。蓝杆之类的机械传动件不负责导电。',question:'观察：跟着橙色手柄看 U 形连杆和触点支架是否一起动。',frame:1,end:42,action:'▶ 看手动分闸',zoom:['O01','O04','O06','C07'],pins:[['O01','手柄'],['O04 V2','U形连杆'],['O06','活动触点臂']]},
 {title:'过载：从弯曲到锁扣释放',body:'从固定下端开始观察：上端逐渐偏移 → 接触感温拨片 → 拨杆绕真实支点摆动 → 推动锁扣 → 弹簧帮助触点分离。',question:'下方六个小步骤可以逐帧验证连接关系，橙色曲线同步放大显示形变。',frame:74,end:114,action:'▶ 慢速看完整过载',zoom:['B01','B02','TREL V3','TREL V4','O10','O09','S01'],pins:[['B01','双金属片'],['TREL V4 | Bimetal sensing nib','感温触点'],['TREL V3 | Independent lever axle','拨杆轴承'],['O10','锁扣']]},
 {title:'短路：电磁机构迅速触发',body:'短路时电流急剧增大，线圈产生很强的磁作用，使铁芯和撞杆快速触发同一套锁扣。',question:'观察：铜色线圈 → 铁芯与撞杆 → 锁扣 → 触点打开。',frame:146,end:178,action:'▶ 看短路脱扣',zoom:['M02','M04','MREL V3','O10'],pins:[['M02','电磁线圈'],['M04','活动铁芯'],['O10','锁扣']]},
 {title:'分闸以后发生什么',body:'触点分离时可能产生电弧，旁边的金属灭弧栅片有助于熄弧；故障排除后，才可以人工复位。',question:'观察：灭弧栅片位于触点旁边。本模型展示零件位置，尚不模拟真实电弧形成和熄灭。',frame:178,end:215,action:'▶ 看复位过程',zoom:['A02','C07','O06'],pins:[['A02','灭弧栅片'],['C07','动触点']]}
];
let guideIndex=0,guidePins=[],guideFocusNames=[];
const groups=[
{id:'shell',name:'外壳与支座',codes:['H01','H02','H03','H04','H05','H06','H07','H08'],hint:'注塑外壳、固定座、端子和安装零件。'},
{id:'terminal',name:'接线端子',codes:['T01','T02','T03','T04'],hint:'进出线压线框、铜连接端子与压紧螺钉。'},
{id:'handle',name:'手柄与连杆',codes:['O01','O02','O03','O04','O05','RIG | Handle'],hint:'手柄绕固定轴转动，U形连杆传递机械位移，不承担导电功能。'},
{id:'contact',name:'动静触点',codes:['O06','O07','O08','O09','C01','C02','C05','C06','C07','C10','C11','C12','RIG | Moving'],hint:'动触点支架绕轴打开，银合金触点在闭合时接触。'},
{id:'latch',name:'锁扣与储能弹簧',codes:['O10','O11','S01','S02','S03','RIG | Toggle'],hint:'锁扣保持触点闭合；松开锁扣，弹簧可释放储能使触点分离。'},
{id:'thermal',name:'热脱扣',codes:['B01','B02','TREL','RIG | Bimetal'],hint:'双金属片受热弯曲，通过拨杆触发锁扣。'},
{id:'magnetic',name:'磁脱扣',codes:['M01','M02','M03','M04','M05','MREL','O12','O13','O14','RIG | Magnetic'],hint:'电磁线圈、铁芯与撞杆实现快速脱扣。'},
{id:'arc',name:'灭弧室',codes:['A01','A02','A03','A04'],hint:'灭弧栅片及支架，用于分割冷却触点分离时的电弧。'},
{id:'conduct',name:'导电连接',codes:['C03','C04','C08','C09','C13'],hint:'铜排、铜编织带和绕组引出线构成连续导电路径。'}
];
function groupFor(name){if(!name)return null;for(const g of groups){if(g.codes.some(c=>name.startsWith(c+' ')||name===c||name.startsWith(c+' |')||name.startsWith(c+' V')))return g.id;}return null;}
function findGroup(obj){let o=obj;while(o && o!==loaded?.root){if(o.userData?.originName){const g=groupFor(o.userData.originName);if(g)return g;}const g=groupFor(o.name);if(g)return g;o=o.parent;}return null;}
function nameDesc(name){if(/O04|U-link|U形/i.test(name))return '操作连杆：连接手柄和活动触点支架，通过销轴传动，不能导电。';if(/S01|弹簧/i.test(name))return '主储能弹簧：固定端挂在外壳支架上，活动端连接触点支架。';if(/O10|锁扣/i.test(name))return '锁扣机构：将触点保持在闭合位置，接到热磁脱扣机构的作用后释放。';if(/B01|B02|双金属/i.test(name))return '双金属片：过载电流产生热量时逐渐弯曲，推动脱扣杆。';if(/M02|线圈/i.test(name))return '电磁脱扣线圈：短路大电流时推动铁芯及脱扣机构。';if(/C02|C07|触点/i.test(name))return '电接触：闭合时触点接触导电，打开时触点分离。';let g=groups.find(g=>g.id===findGroupFromName(name));return g?.hint||'可旋转模型，切换局部查看其安装位置。';}
function findGroupFromName(n){return groupFor(n);}
function init(){scene=new THREE.Scene();scene.background=new THREE.Color(0xe1e9e2);
  camera=new THREE.PerspectiveCamera(35,1,.005,100);
  try{renderer=new THREE.WebGLRenderer({canvas:CANVAS,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});}
  catch(e){console.warn('WebGL unavailable:',e);renderer={shadowMap:{},setPixelRatio(){},setSize(){},render(){}};notify('当前浏览器没有可用的 WebGL 图形环境。模型仍可导入并打包，但三维画面需要在开启硬件加速的 Chrome/Edge 中查看。');}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.42;
  ambient=new THREE.HemisphereLight(0xf9fff7,0x8ba398,2.15);scene.add(ambient);
  dir=new THREE.DirectionalLight(0xfff5e8,3.1);dir.position.set(-2,5,6);dir.castShadow=true;dir.shadow.mapSize.set(1024,1024);scene.add(dir);
  let fill=new THREE.DirectionalLight(0xbcdff0,1.25);fill.position.set(4,1,-4);scene.add(fill);
  let floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xc8d7cd,roughness:.94,metalness:0}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.4;floor.receiveShadow=true;floor.name='ground';scene.add(floor);
  function resize(){const r=STAGE.getBoundingClientRect();camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();renderer.setSize(r.width,r.height,false);}
  new ResizeObserver(resize).observe(STAGE);resize();setCamera();requestAnimationFrame(loop);
}
function setCamera(){const cp=Math.cos(pitch),sp=Math.sin(pitch);camera.position.set(pivot.x+dist*Math.sin(yaw)*cp,pivot.y+dist*sp,pivot.z+dist*Math.cos(yaw)*cp);camera.lookAt(pivot);}
function modelBounds(){if(!root)return null;root.updateMatrixWorld(true);return new THREE.Box3().setFromObject(root);}
function fit(){const b=modelBounds();if(!b)return;const size=b.getSize(new THREE.Vector3());pivot.copy(b.getCenter(new THREE.Vector3()));const max=Math.max(size.x,size.y,size.z,.1);dist=Math.max(.3,max/(2*Math.tan(camera.fov*Math.PI/360)) * 1.25);setCamera();}
function setLook(n){look=n;document.querySelectorAll('[data-look]').forEach(x=>x.classList.toggle('active',x.dataset.look===n));if(n==='front'){yaw=0;pitch=0;}else if(n==='three'){yaw=.55;pitch=.3;}else if(n==='side'){yaw=Math.PI/2;pitch=.05;}else if(n==='top'){yaw=0;pitch=1.32;}fit();}
function groupName(o){let current=o;while(current && current!==root){const g=groupFor(current.name)||groupFor(current.userData.originName);if(g)return g;current=current.parent;}return null;}
function markParts(){objects=[];const groupCounts={};root.traverse(o=>{if(o.isMesh){o.userData.group=groupName(o);objects.push(o);if(o.userData.group)groupCounts[o.userData.group]=(groupCounts[o.userData.group]||0)+1;}});
  const n=objects.length;const tags=Object.entries(groupCounts).map(([g,c])=>`${groups.find(x=>x.id===g)?.name||g} ${c}`).join(' · ');
  $('modelInfo').textContent=`实际读取 ${n} 个网格 · ${clip?.tracks.length||0} 条动画轨道`; $('modelStatus').textContent=tags||'模型已加载';}
function clearModel(){if(root){scene.remove(root);root.traverse(o=>{if(o.geometry)o.geometry.dispose();});}loaded?.revoke?.();root=null;loaded=null;clip=null;objects=[];highlights=[];}
function undoHighlight(){for(const o of highlights){if(o.material?.emissive && o.userData._originalEmissive!==undefined){o.material.emissive.setHex(o.userData._originalEmissive);o.material.emissiveIntensity=o.userData._originalIntensity||1;}}highlights=[];}
function selectMesh(o){undoHighlight();if(!o)return;const owner=o.parent;const nm=o.userData.originName||owner?.name||o.name;
  $('selectedTitle').textContent=nm.replace(/^(RIG\s*\|\s*|DZ47\s*\|\s*)/,'');$('selectedText').textContent=nameDesc(nm);
  if(o.material && o.material.emissive){if(!o.userData._ownMaterial){o.material=o.material.clone();o.userData._ownMaterial=true;}o.userData._originalEmissive=o.material.emissive.getHex();o.userData._originalIntensity=o.material.emissiveIntensity;o.material.emissive.setHex(0x295d46);o.material.emissiveIntensity=.5;highlights=[o];}
}
function updateVisibility(){if(!root)return;
  objects.forEach(o=>{const group=o.userData.group;
    const chk=$('part-'+group);const enabled=!chk||chk.checked;
    o.visible=enabled && (activeGroup==='all'||group===activeGroup) && !(o.userData.originName||o.name).startsWith('H08 |');
  });
  document.querySelectorAll('[data-focus-group]').forEach(b=>b.classList.toggle('active',b.dataset.focusGroup===activeGroup));
}
function focus(group){activeGroup=group;updateVisibility();if(group==='all'){setLook('three');return;}
  const selected=objects.filter(o=>o.userData.group===group&&o.visible);if(!selected.length)return;
  const b=new THREE.Box3();selected.forEach(o=>b.expandByObject(o));pivot.copy(b.getCenter(new THREE.Vector3()));const ext=b.getSize(new THREE.Vector3()).length();dist=Math.max(.45,ext*2.7);setCamera();}
function updateExplode(amount){explode=amount;if(!loaded)return;loaded.nodes.forEach(o=>{
  const g=groupFor(o.name);if(!g)return;
  if(!o.userData.restTransform)o.userData.restTransform=o.position.clone();
  o.position.z+=0; // applied from base position after evaluating animation below
 });
}
function afterAnimation(){if(!loaded)return;for(const n of loaded.nodes){const g=groupFor(n.name);if(!g)continue;
  const idx=groups.findIndex(gr=>gr.id===g);n.position.z+=explode*((idx-3.5)/8)*.085;
}}
function setFrame(value){frame=Math.max(1,Math.min(220,Number(value)));if(loaded && clip){loaded.nodes.forEach(n=>n.position.copy(n.userData.basePosition));LocalGLB.apply(clip,frame/24,THREE);afterAnimation();}
  $('progress').value=String(Math.round(frame));$('frameText').textContent=String(Math.round(frame));
  if(guideIndex===3)heatResult();
  let closest=stages.reduce((a,b)=>Math.abs(b.frame-frame)<Math.abs(a.frame-frame)?b:a);$('currentState').textContent=closest.label;
}
function selectStage(id){const st=stages.find(x=>x.id===id);if(!st)return;
  $('stageHelp').textContent=st.info;
  $('stageBtns').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x.dataset.stage===st.id));
  if(st.from!==undefined){setFrame(st.from);segmentEnd=st.frame;playing=true;}else{setFrame(st.frame);playing=false;}
  syncPlayButton();}
function syncPlayButton(){$('play').textContent=playing?'暂停':'播放';$('play').classList.toggle('active',playing);}
function notify(msg){$('empty').hidden=true;$('loading').hidden=true;$('error').textContent=msg;$('error').hidden=false;}
function clearNotify(){$('error').hidden=true;}
async function loadBlob(arrayBuffer,name){if(renderer instanceof THREE.WebGLRenderer)clearNotify();$('loading').hidden=false;$('status').textContent='解析 GLB 网格及动画…';
  try{const parsed=await LocalGLB.parse(arrayBuffer,THREE);
    if(!parsed.clips?.length)throw Error('模型未包含关键帧动画，请核查 V52 GLB');
    clearModel();loaded=parsed;clip=parsed.clips[0];root=parsed.root;sourceGLB=arrayBuffer;modelFileName=name;
    loaded.nodes.forEach(n=>{n.userData.basePosition=n.position.clone();});
    scene.add(root);root.scale.setScalar(12); // Blender scene uses metre scale; 12x is a viewing scale only
    markParts();updateHeatDeformation();frame=1;setFrame(1);fit();setLook('three');updateVisibility();
    $('empty').hidden=true;$('loading').hidden=true;$('bundle').disabled=false;
    $('infoBadge').textContent='单极 V53 · 模型已加载';$('infoBadge').style.background='#dcefe0';
    chooseGuide(0);
    $('sourceName').textContent=name;return true;
  }catch(err){$('loading').hidden=true;notify('模型加载失败：'+(err?.message||String(err)));console.error(err);return false;}
}
function loop(t){requestAnimationFrame(loop);const dt=Math.min((t-lastTick)/1000,.1);lastTick=t;
  if(playing && loaded && clip){const newFrame=frame+dt*24*speed*(guideIndex===3?.42:1);
    if(newFrame>=segmentEnd){playing=false;setFrame(segmentEnd);syncPlayButton();}else setFrame(newFrame);
  }
  if(renderer){renderer.render(scene,camera);}updateGuidePins();
}
function mouseControls(){let clickX=0,clickY=0;
  CANVAS.addEventListener('pointerdown',e=>{if(e.button!==0&&e.button!==2)return;CANVAS.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,button:e.button,pan:e.button===2||e.shiftKey,lastX:e.clientX,lastY:e.clientY};clickX=e.clientX;clickY=e.clientY;dragSteps=0;});
  CANVAS.addEventListener('contextmenu',e=>e.preventDefault());
  CANVAS.addEventListener('pointermove',e=>{if(!drag)return;
    const dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;drag.lastX=e.clientX;drag.lastY=e.clientY;dragSteps+=Math.abs(dx)+Math.abs(dy);
    if(drag.pan){const scale=dist*Math.tan(camera.fov*Math.PI/360)*2/STAGE.clientHeight;const xDir=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0);const yDir=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);pivot.addScaledVector(xDir,-dx*scale).addScaledVector(yDir,dy*scale);}
    else{yaw-=dx*.008;pitch=Math.max(-1.35,Math.min(1.35,pitch-dy*.008));}
    setCamera();});
  CANVAS.addEventListener('pointerup',e=>{if(!drag)return;if(dragSteps<8&&e.button===0&&root){const rect=CANVAS.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height*2-1));raycast.setFromCamera(mouse,camera);
    const hits=raycast.intersectObjects(objects.filter(o=>o.visible),false);if(hits.length)selectMesh(hits[0].object);
  }drag=null;});
  CANVAS.addEventListener('wheel',e=>{e.preventDefault();dist=Math.max(.25,Math.min(25,dist*Math.exp(e.deltaY*.001)));setCamera();},{passive:false});
}
function bind(){document.querySelectorAll('[data-look]').forEach(btn=>btn.addEventListener('click',()=>setLook(btn.dataset.look)));
  document.querySelectorAll('[data-focus-group]').forEach(btn=>btn.addEventListener('click',()=>focus(btn.dataset.focusGroup)));
  $('resetView').onclick=()=>{activeGroup='all';updateVisibility();setLook('three');};
  $('fullScreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await STAGE.requestFullscreen();}catch(e){notify('无法进入全屏：'+e.message);}};
  $('showModel').onclick=()=>$('modelPicker').click();$('emptyChoose').onclick=()=>$('modelPicker').click();
  $('modelPicker').onchange=async e=>{const f=e.target.files?.[0];if(f)await loadBlob(await f.arrayBuffer(),f.name);e.target.value='';};
  $('progress').addEventListener('input',e=>{playing=false;syncPlayButton();setFrame(+e.target.value);});
  $('play').onclick=()=>{if(!loaded){notify('请先导入 V51 GLB 模型');return;}if(frame>=segmentEnd){segmentEnd=220;setFrame(1);}playing=!playing;syncPlayButton();};
  $('replay').onclick=()=>{playing=false;segmentEnd=220;setFrame(1);syncPlayButton();};
  $('speed').onchange=e=>{speed=+e.target.value;};
  $('stageBtns').addEventListener('click',e=>{const b=e.target.closest('[data-stage]');if(b)selectStage(b.dataset.stage);});
  $('explode').addEventListener('input',e=>{explode=Number(e.target.value)/100;setFrame(frame);});
  groups.forEach(g=>{const label=document.createElement('div');label.className='checkline';label.innerHTML=`<label><input type="checkbox" id="part-${g.id}" checked><span>${g.name}</span></label><button class="smallbtn" data-focus-group="${g.id}" style="padding:3px 7px;font-size:10px">查看</button>`;
    $('groups').append(label);label.querySelector('input').addEventListener('change',updateVisibility);label.querySelector('button').onclick=()=>focus(g.id);});
  $('showAll').onclick=()=>{activeGroup='all';groups.forEach(g=>$('part-'+g.id).checked=true);updateVisibility();setLook('three');};
  $('hideShell').onclick=()=>{let box=$('part-shell');box.checked=!box.checked;updateVisibility();};
  $('savePNG').onclick=()=>{if(!root){notify('先加载模型');return;}if(!(renderer instanceof THREE.WebGLRenderer)){notify('没有 WebGL 图形环境，无法导出 3D 截图');return;}renderer.render(scene,camera);
    CANVAS.toBlob(blob=>{if(blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='DZ47_单极结构_'+Math.round(frame)+'帧.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);}},'image/png');};
  $('bundle').onclick=exportSelf;
  window.addEventListener('dragenter',e=>{if([...e.dataTransfer?.types||[]].includes('Files'))$('dropOverlay').hidden=false;});
  window.addEventListener('dragover',e=>e.preventDefault());
  window.addEventListener('dragleave',e=>{if(!e.relatedTarget || !document.body.contains(e.relatedTarget))$('dropOverlay').hidden=true;});
  window.addEventListener('drop',async e=>{e.preventDefault();$('dropOverlay').hidden=true;const f=e.dataTransfer?.files?.[0];if(f){if(!f.name.toLowerCase().endsWith('.glb')){notify('请拖入 .glb 模型文件');return;}await loadBlob(await f.arrayBuffer(),f.name);}});
}
async async function exportSelf(){
 if(!sourceGLB)return;
 $('bundleNote').textContent='正在准备离线文件…';
 try{
  const list=['../shared/vendor/three-r160.min.js?v=20261024-v53','dz47-loader.js?v=20261024-v53','dz47-app.js?v=20261024-v53'];
  const codes=await Promise.all(list.map(async x=>{const r=await fetch(x,{cache:'no-store'});if(!r.ok)throw Error(x+' HTTP '+r.status);return r.text();}));
  const bytes=new Uint8Array(sourceGLB);let b='';
  for(let i=0;i<bytes.length;i+=8192)b+=String.fromCharCode.apply(null,bytes.subarray(i,i+8192));
  const d=document.documentElement.cloneNode(true);
  d.querySelector('#guidePins')?.replaceChildren();
  d.querySelector('#error').hidden=true;d.querySelector('#loading').hidden=true;d.querySelector('#empty').hidden=true;
  d.querySelectorAll('script[src]').forEach(e=>e.remove());
  const model=document.createElement('script');model.id='embedded-model';model.type='application/octet-stream';model.textContent=btoa(b);d.querySelector('body').appendChild(model);
  for(const code of codes){const sc=document.createElement('script');sc.textContent=code.replace(/<\/script/gi,'<\\/script');d.querySelector('body').appendChild(sc);}
  const u=URL.createObjectURL(new Blob(['<!doctype html>\n'+d.outerHTML],{type:'text/html;charset=utf-8'}));
  const a=document.createElement('a');a.href=u;a.download='DZ47_单极空气开关_V53_离线版.html';a.click();setTimeout(()=>URL.revokeObjectURL(u),5000);
  $('bundleNote').textContent='已生成完整离线 HTML。';
 }catch(e){notify('离线打包失败：'+e.message);}
}

function guideMesh(prefix){return objects.find(o=>(o.userData.originName||o.name).startsWith(prefix))||null;}
function guideCamera(step){if(!root)return;activeGroup='all';updateVisibility();
  yaw=.17;pitch=.13;const nodes=(step.zoom||[]).map(guideMesh).filter(Boolean);
  if(step===guideSteps[0]||nodes.length<1){fit();setCamera();return;}
  const b=new THREE.Box3();nodes.forEach(o=>b.expandByObject(o));
  const x=b.getSize(new THREE.Vector3()), m=Math.max(x.x,x.y,x.z,.22);
  pivot.copy(b.getCenter(new THREE.Vector3()));dist=Math.max(.48,m/(2*Math.tan(camera.fov*Math.PI/360))*1.65);setCamera();}
function emphasizeGuide(step){
  if(!root)return;
  const enabled=$('guideEmphasis').checked && guideIndex!==0;
  const support={
    1:['O03','O07','O05','H07','H01','H02','C02','C07'],
    2:['O03','O04 |','O05 |','O07','H07','O02','O09','H01'],
    3:['B02','TREL V3','TREL V4','O11','O09','O07','S02','H07','H01','H02','C03','C02','C07','O06','S01 V2'],
    4:['O11','O09','O12','H07','H01','MREL V3','O13','C02'],
    5:['O07','O09','S01 V2','H07','H01']
  };
  const supports=support[guideIndex]||[];
  objects.forEach(o=>{
    if(!o.userData.guideMaterial){o.userData.guideMaterial=o.material.clone();}
    const mat=o.userData.guideMaterial;
    if(o.material!==mat)o.material=mat;
    const nm=o.userData.originName||o.name;
    const yes=(step.zoom||[]).some(pre=>nm.startsWith(pre));
    const belongs=supports.some(pre=>nm.startsWith(pre));
    // Mechanical pins, housings and pivot supports remain visible when their rod is highlighted.
    // Previously only the rod was opaque, making its pins and bearing look detached.
    const opacity=enabled?yes?1:belongs?.82:.10:1;
    mat.opacity=opacity;
    mat.transparent=opacity<.999;
    mat.depthWrite=opacity>.7;
    if(mat.emissive){mat.emissive.setHex(yes&&enabled?0x183b28:0x000000);mat.emissiveIntensity=yes&&enabled?.22:0;}
    mat.needsUpdate=true;
  });
}
function buildGuidePins(step){$('guidePins').replaceChildren();guidePins=[];if(!root)return;
  (step.pins||[]).forEach(([key,label],idx)=>{const obj=guideMesh(key);if(!obj)return;
    const pin=document.createElement('button');pin.type='button';pin.className='guide-pin';pin.textContent=label;
    pin.title='点击定位：'+label;pin.onclick=()=>{selectMesh(obj);const b=new THREE.Box3().setFromObject(obj);pivot.copy(b.getCenter(new THREE.Vector3()));dist=Math.max(.6,dist*.78);setCamera();};
    $('guidePins').append(pin);guidePins.push({obj,pin,idx});});}
function updateGuidePins(){if(!root||!guidePins.length)return;
  const rect=STAGE.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const visible=[];for(const x of guidePins){if(!x.obj.visible){x.pin.hidden=true;continue;}
    const center=new THREE.Box3().setFromObject(x.obj).getCenter(new THREE.Vector3());
    const pos=center.clone().project(camera);const front=pos.z>-1&&pos.z<1;
    const px=(pos.x+1)*.5*rect.width,py=(1-pos.y)*.5*rect.height;
    if(!front||px<55||px>rect.width-55||py<80||py>rect.height-55){x.pin.hidden=true;continue;}
    x.pin.hidden=false;visible.push({x,px,py});}
  const maxY=rect.height-85;visible.forEach(({x,px,py},i)=>{let offset=0;
    // stagger close projected labels without disconnecting them from their parts
    for(let j=0;j<i;j++)if(Math.abs(px-visible[j].px)<100&&Math.abs(py-visible[j].py+offset)<42)offset+=37;
    x.pin.style.left=px+'px';x.pin.style.top=Math.min(maxY,Math.max(90,py-9+offset))+'px';});}
const heatChapters=[
 {frame:74,label:'① 冷态固定',tip:'下端用导电夹片固定。请找下端根部，上端自由，不是整根转动。'},
 {frame:85,label:'② 逐渐弯曲',tip:'根部位移保持为零，中间弯曲，上端位移开始变大。'},
 {frame:92,label:'③ 接近拨片',tip:'自由端继续移动，正在靠近热脱扣拨片，注意两者尚未完全接触。'},
 {frame:95,label:'④ 推到拨片',tip:'双金属片自由端开始接触拨片，拨片围绕其固定支点转动。'},
 {frame:101,label:'⑤ 推动锁扣',tip:'拨杆把位移传到上方锁扣，锁扣开始释放主机构。'},
 {frame:114,label:'⑥ 触点断开',tip:'主弹簧释放储能，活动触点离开固定触点，主电路断开。'}
];
let heatChapter=0;
function heatResult(){
 if(!$('heatSequence'))return;
 const f=frame;
 let step=0;heatChapters.forEach((ch,i)=>{if(f>=ch.frame)step=i;});
 heatChapter=step;
 [...$('heatGrid').children].forEach((b,i)=>b.classList.toggle('active',i===step));
 $('heatReadout').textContent=heatChapters[step].tip;
 // Enlarged didactic deformation plot. The physical 3D bimetal curves via 24 subdivisions.
 const displacement=clip?.tracks.find(t=>t.path==='weights'&&t.node.name.startsWith('B01'));
 let w=0;
 if(displacement){const target=displacement.node;target.traverse(o=>{if(o.isMesh&&o.morphTargetInfluences?.length)w=o.morphTargetInfluences[0]||0;});}
 const ex=w*50;
 const b=`M75 86 Q${75+ex*.25} 53 ${75+ex} 16`;
 $('bimetalBent').setAttribute('d',b);
 $('bimetalTip').setAttribute('cx',75+ex);
 $('heatProgressLabel').textContent=w<.01?'冷态':Math.round(w*100)+'% 加热变形';
}
function focusHeatChapter(i){
  if(!root || guideIndex!==3)return;
  const chapterParts=[
    ['B01','B02','TREL V4 | Bimetal sensing nib'],
    ['B01','B02','TREL V4 | Bimetal sensing nib'],
    ['B01','TREL V4 | Bimetal sensing nib','TREL V3 | Independent lever axle'],
    ['B01','TREL V4 | Bimetal sensing nib','TREL V3 | Independent lever axle'],
    ['TREL V4 | Mechanical pawl release nose','O10','O11'],
    ['C02','C07','O06','S01 V2']
  ][i]||[];
  const targets=chapterParts.map(guideMesh).filter(Boolean);
  if(!targets.length)return;
  const bound=new THREE.Box3();targets.forEach(o=>bound.expandByObject(o));
  const boxSize=bound.getSize(new THREE.Vector3());
  pivot.copy(bound.getCenter(new THREE.Vector3()));
  const radius=Math.max(boxSize.x,boxSize.y,boxSize.z,.11);
  yaw=.23;pitch=.08;
  dist=Math.max(.45,radius/(2*Math.tan(camera.fov*Math.PI/360))*1.45);setCamera();
}
function selectHeat(i){
 heatChapter=i;playing=false;segmentEnd=220;syncPlayButton();
 const ch=heatChapters[i];setFrame(ch.frame);
 $('stageHelp').textContent=ch.tip;
 if(root && guideIndex===3){focusHeatChapter(i);buildGuidePins(guideSteps[3]);updateGuidePins();}
}
function updateHeatDeformation(){
 if(!loaded)return;
 const factor=+($('deformScale')?.value||1);
 objects.filter(o=>(o.userData.originName||o.name).startsWith('B01')||(o.userData.originName||o.name).startsWith('B02')).forEach(o=>{
   const geom=o.geometry;if(!geom?.morphAttributes?.position?.length)return;
   if(!geom.userData.sourceMorphDeltas)geom.userData.sourceMorphDeltas=geom.morphAttributes.position[0].array.slice();
   const dest=geom.morphAttributes.position[0].array;const original=geom.userData.sourceMorphDeltas;
   for(let k=0;k<dest.length;k++)dest[k]=original[k]*factor;
   geom.morphAttributes.position[0].needsUpdate=true;
   geom.computeBoundingSphere();
 });
}
function chooseGuide(index){guideIndex=Math.max(0,Math.min(guideSteps.length-1,index));const step=guideSteps[guideIndex];
  playing=false;segmentEnd=220;syncPlayButton();setFrame(step.frame);
  $('guideCount').textContent=`第 ${guideIndex+1} / ${guideSteps.length} 步`;
  $('guideTitle').textContent=step.title;$('guideBody').textContent=step.body;$('guideQuestion').textContent=step.question;
  $('guideAction').textContent=step.action;
  $('heatSequence').hidden=guideIndex!==3;
  $('jointHint').classList.toggle('active',guideIndex===3);
  $('jointHint').textContent=guideIndex===3?'传力链：双金属片 → 感温拨杆（绕轴摆动） → 锁扣 → 动触点支架。金色标签标注的是实体零件。':'';
  if(guideIndex===3)heatResult();
  $('guidePrev').disabled=guideIndex===0;$('guideNext').textContent=guideIndex===guideSteps.length-1?'回到第1步':'下一步 →';
  document.querySelectorAll('.guide-dots button').forEach((el,i)=>el.classList.toggle('active',i===guideIndex));
  $('currentState').textContent=step.title;$('stageHelp').textContent=step.question;
  if(root){guideCamera(step);emphasizeGuide(step);buildGuidePins(step);updateGuidePins();}
}
function playGuide(){if(!root){notify('模型还没有加载完成，请重新打开 HTML');return;}
  const step=guideSteps[guideIndex];if(step.end<=step.frame){if(guideIndex<guideSteps.length-1)chooseGuide(guideIndex+1);return;}
  setFrame(step.frame);segmentEnd=step.end;playing=true;syncPlayButton();
  if(guideIndex===3){lastTick=performance.now();}}
function bindGuide(){
  for(let i=0;i<guideSteps.length;i++){const btn=document.createElement('button');btn.type='button';btn.title=`第${i+1}步 ${guideSteps[i].title}`;
    btn.onclick=()=>chooseGuide(i);$('guideDots').append(btn);}
  $('guidePrev').onclick=()=>chooseGuide(guideIndex-1);
  $('guideNext').onclick=()=>chooseGuide(guideIndex===guideSteps.length-1?0:guideIndex+1);
  $('guideAction').onclick=playGuide;
  $('guideEmphasis').onchange=()=>{if(root)emphasizeGuide(guideSteps[guideIndex]);};
  heatChapters.forEach((st,i)=>{let btn=document.createElement('button');btn.type='button';btn.className='choice';btn.textContent=st.label;btn.onclick=()=>selectHeat(i);$('heatGrid').append(btn);});
  $('deformScale').onchange=updateHeatDeformation;
  chooseGuide(0);
}

async function main(){
 $('empty').hidden=true;$('loading').hidden=false;
 try{
  $('status').textContent='正在初始化三维场景…';init();mouseControls();bind();bindGuide();
  $('status').textContent='正在读取 V52 模型…';
  let buffer;
  const embed=$('embedded-model')?.textContent.trim()||'';
  if(embed.length>100){
   const raw=atob(embed),arr=new Uint8Array(raw.length);
   for(let i=0;i<raw.length;i++)arr[i]=raw.charCodeAt(i);
   buffer=arr.buffer;
  }else{
   let response;try{response=await fetch('dz47-1p-v52.glb?v=20261024-v53',{cache:'no-store'});}
   catch(e){throw Error('模型文件请求失败：'+(e?.message||e));}
   if(!response.ok)throw Error('模型文件 HTTP '+response.status);
   buffer=await response.arrayBuffer();
  }
  if(buffer.byteLength<200000)throw Error('模型长度异常：'+buffer.byteLength);
  $('status').textContent='正在解析网格与动画…';
  const ok=await loadBlob(buffer,'DZ47_1P_V52_geometry_fixed.glb');
  if(!ok)throw Error('模型解析未完成');
  console.info('[DZ47] model ready',objects.length,'meshes',clip?.tracks.length||0,'tracks');
 }catch(e){console.error('[DZ47] startup failed',e);notify('DZ47 模型加载失败：'+(e?.message||String(e)));}
}
main();
})();
