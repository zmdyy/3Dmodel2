import * as THREE from './vendor/three-r165/three.module.js';
import {GLTFLoader} from './vendor/three-r165/addons/loaders/GLTFLoader.js';

// Evaluated geometry exported from the user's reviewed Blender assembly.
// Scene/physics coordinates use the original teaching dimensions; Blender used 0.18 m/unit.
const SCALE=1/.18;
const FINISH={
 'Satin machined aluminium':[[.26,.31,.35],.75,.48],
 'Brushed stainless steel':[[.32,.38,.41],.83,.39],
 'Blue grey powder coated frame':[[.075,.14,.205],.28,.67],
 'Grey enamel cheeks':[[.28,.35,.39],.45,.58],
 'Oil bronze bush':[[.38,.25,.115],.7,.48],
 'Dark rubber':[[.035,.047,.05],0,.86],
 'Woven natural cord':[[.14,.09,.040],0,.92],
 'Cord plies':[[.24,.16,.075],0,.94],
 'Fluorescent rotation witness':[[.75,.88,.025],0,.68],
 'Oxidised steel masses':[[.15,.19,.215],.7,.59],
 'Engraved dark lettering':[[.025,.04,.055],0,.8],
 'Instrument plate':[[.84,.86,.77],.12,.7],
 'Warm worn laboratory board':[[.48,.31,.17],0,.82]
};
function grainTexture(){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),im=x.createImageData(128,128);let seed=3417;
 for(let i=0;i<im.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const q=118+(seed%22);im.data[i]=im.data[i+1]=im.data[i+2]=q;im.data[i+3]=255;}x.putImageData(im,0,0);
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(8,8);return t;
}
function woodTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.fillStyle='#bca98d';x.fillRect(0,0,512,512);let seed=821;
 for(let i=0;i<1800;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const y=seed%512;seed=(Math.imul(seed,1664525)+1013904223)>>>0;x.fillStyle='rgba(103,82,58,.035)';x.fillRect(seed%512,y,50+seed%200,.3+seed%8/10);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
// Some revolved Blender parts were exported with inward winding. Front-face
// culling then exposed the far wall, making opaque metal look like glass.
function orientClosedGeometry(geometry){
 if(geometry.userData.outwardChecked)return;
 geometry.userData.outwardChecked=true;
 const p=geometry.attributes.position,index=geometry.index;if(!index)return;
 let volume6=0;
 for(let i=0;i<index.count;i+=3){
  const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
  volume6+=p.getX(a)*(p.getY(b)*p.getZ(c)-p.getZ(b)*p.getY(c))+p.getY(a)*(p.getZ(b)*p.getX(c)-p.getX(b)*p.getZ(c))+p.getZ(a)*(p.getX(b)*p.getY(c)-p.getY(b)*p.getX(c));
 }
 if(volume6>=-6e-9)return;
 for(let i=0;i<index.count;i+=3){const b=index.getX(i+1);index.setX(i+1,index.getX(i+2));index.setX(i+2,b);}index.needsUpdate=true;
 const normals=geometry.attributes.normal;
 if(normals){for(let i=0;i<normals.count;i++)normals.setXYZ(i,-normals.getX(i),-normals.getY(i),-normals.getZ(i));normals.needsUpdate=true;}
 geometry.userData.correctedInwardWinding=true;
}
export async function createPrecisionLab({rigRoot}){
 const gltf=await new GLTFLoader().loadAsync(new URL('../assets/models/pulley-precision-v1.glb',import.meta.url).href);
 const root=new THREE.Group();root.name='Blender precision laboratory';rigRoot.add(root);
 const states=new Map(),materials=new Map(),grain=grainTexture(),woodGrain=woodTexture();gltf.scene.updateMatrixWorld(true);
 const materialFor=key=>{
  if(materials.has(key))return materials.get(key);
  const [rgb,metalness,roughness]=FINISH[key]||FINISH['Brushed stainless steel'];
  const material=new THREE.MeshStandardMaterial({color:new THREE.Color(...rgb),metalness,roughness});
  if(key==='Warm worn laboratory board'){material.color.setRGB(1,1,1);material.map=woodGrain;material.bumpMap=woodGrain;material.bumpScale=.003;}
  else if(!/lettering|plate|witness/.test(key)){material.bumpMap=grain;material.bumpScale=.0007;}
  material.name=key;materials.set(key,material);return material;
 };
 const configs=['fixed','moving','tackle2','tackle3','tackle4'];
 const wheelLayout={fixed:{fixed1:[0,4.8]},moving:{moving1:[0,1.75]},tackle2:{fixed1:[0,4.8],moving1:[0,1.75]},tackle3:{fixed1:[0,4.8],moving1:[0,1.75]},tackle4:{fixed1:[0,4],fixed2:[0,4.8],moving1:[0,2.55],moving2:[0,1.75]}};
 const handFor=key=>key==='fixed'?new THREE.Vector3(.34,2.8,0):key==='moving'?new THREE.Vector3(.34,2.17,0):key==='tackle3'?new THREE.Vector3(.31,2.17,0):key==='tackle2'?new THREE.Vector3(.4,3.4,0):new THREE.Vector3(.43,3.4,0);
 for(const key of configs){
  const group=new THREE.Group();group.name=key;group.visible=false;root.add(group);
  const moving=new THREE.Group(),payload=new THREE.Group(),grip=new THREE.Group();group.add(moving,payload,grip);grip.position.copy(handFor(key));
  const wheels=new Map();for(const [id,xy]of Object.entries(wheelLayout[key])){const carrier=new THREE.Group(),rotating=new THREE.Group();group.add(carrier);carrier.position.set(...xy,0);carrier.add(rotating);wheels.set(id,{carrier,rotating});}
  states.set(key,{group,moving,payload,grip,wheels,meshes:[],fronts:[],explode:[],massLabels:[],massParts:[],baseHand:handFor(key)});
 }
 const candidates=[];gltf.scene.traverse(o=>{if(o.isMesh)candidates.push(o);});
 for(const o of candidates){
  const d=o.userData,st=states.get(d.config);if(!st)continue;
  // glTF's exporter has already converted Blender Z-up to browser Y-up.
  const world=o.matrixWorld.clone();world.premultiply(new THREE.Matrix4().makeScale(SCALE,SCALE,SCALE));
  o.removeFromParent();o.matrix.copy(world);o.matrix.decompose(o.position,o.quaternion,o.scale);
  orientClosedGeometry(o.geometry);o.material=materialFor(d.materialKey);o.castShadow=o.receiveShadow=true;o.userData.precision=true;
  let parent=st.group;
  if(d.role==='wheel'){const w=st.wheels.get(d.wheelKey);parent=d.rotating?w.rotating:w.carrier;}
  else if(d.role==='moving')parent=st.moving;
  else if(d.role==='payload')parent=st.payload;
  else if(d.role==='grip')parent=st.grip;
  st.group.updateMatrixWorld(true);parent.updateMatrixWorld(true);
  o.applyMatrix4(parent.matrixWorld.clone().invert());parent.add(o);o.userData.basePosition=o.position.clone();o.userData.baseScale=o.scale.clone();st.meshes.push(o);
  if(d.role==='payload'&&/Slotted steel mass|Weight carrier bottom|Weight hanger stem/.test(d.sourceName))st.massParts.push(o);
  if(/Front cheek/.test(d.sourceName)||(/Common two wheel/.test(d.sourceName)&&o.position.z>0)){
   o.material=o.material.clone();st.fronts.push(o);
   if(/Common two wheel/.test(d.sourceName))st.explode.push([o,.85]);
  }
  if(d.sourceName.startsWith('Mass marking')){
   // Change the actual mass markings with the mass control, rather than leaving three false 1 kg stamps.
   const c=document.createElement('canvas');c.width=512;c.height=192;const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
   const label=new THREE.Mesh(new THREE.PlaneGeometry(.43,.145),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
   o.updateWorldMatrix(true,false);const center=new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());parent.worldToLocal(center);label.position.copy(center);label.position.z+=.002;label.userData.part='load';label.userData.precision=true;parent.add(label);o.visible=false;
   label.userData.basePosition=label.position.clone();label.userData.baseScale=label.scale.clone();st.massParts.push(label);st.massLabels.push({canvas:c,texture});
  }
  if(d.role==='wheel'&&!d.rotating){
   if(d.part==='bush')st.explode.push([o,.42]);
   else if(d.part==='axle')st.explode.push([o,1.45]);
   else if(/Front cheek/.test(d.sourceName))st.explode.push([o,.85]);
  }
 }
 for(const st of states.values()){
  const stem=st.massParts.find(o=>o.userData.sourceName?.startsWith('Weight hanger stem'));
  stem.updateMatrix();stem.geometry.computeBoundingBox();const bounds=stem.geometry.boundingBox.clone().applyMatrix4(stem.matrix);
  st.massAnchor=new THREE.Vector3(stem.position.x,bounds.max.y,0);
 }
 let active=null;
 return {
  root,states,
  activate(kind,n){const key=kind==='tackle'?'tackle'+n:kind;for(const [id,s]of states)s.group.visible=id===key;active=states.get(key);return active;},
  sync(path,h,{exploded=false,transparent=false,mass=3}={}){
   if(!active)return;
   active.moving.position.y=active.payload.position.y=h;
   for(const contact of path.contacts){const w=active.wheels.get(contact.node.key);w.carrier.position.set(contact.node.x,contact.node.y,0);w.rotating.rotation.z=path.rotations.find(r=>r.key===contact.node.key).theta;}
   active.grip.position.set(path.hand.x,path.hand.y,0);
   // Both up- and down-pulling assemblies keep the rope outside the eye aperture.
   const initialUp=active.group.name==='moving'||active.group.name==='tackle3';
   active.grip.rotation.z=Math.atan2(-path.pull.x,path.pull.y)+(initialUp?0:Math.PI);
   for(const o of active.fronts){o.material.transparent=transparent;o.material.opacity=transparent?.23:1;o.material.depthWrite=!transparent;o.castShadow=!transparent;}
   for(const [o,offset]of active.explode)o.position.z=o.userData.basePosition.z+(exploded?offset:0);
   if(active.lastMass!==mass){
    // Three equal-density masses: volume follows the selected total mass.
    // Keep the stem's upper attachment fixed, with the eye and hook unchanged.
    const factor=Math.sqrt(mass/3),anchor=active.massAnchor,stretch=new THREE.Vector3(factor,1,factor);
    for(const o of active.massParts){o.position.copy(o.userData.basePosition).sub(anchor).multiply(stretch).add(anchor);o.scale.copy(o.userData.baseScale).multiply(stretch);}
    for(const label of active.massLabels){const x=label.canvas.getContext('2d');x.clearRect(0,0,512,192);x.fillStyle='#fff5da';x.textAlign='center';x.textBaseline='middle';x.font='bold 112px sans-serif';x.fillText((Math.abs(mass/3-Number((mass/3).toFixed(2)))>.00001?'≈':'')+Number((mass/3).toFixed(2))+' kg',256,96,490);label.texture.needsUpdate=true;}
    active.lastMass=mass;active.massScale=factor;
   }
  },
  get active(){return active;},
  get diagnostics(){return {source:'Blender GLB',config:active?.group.name,meshCount:active?.meshes.length,mass:active?.lastMass,massScale:active?.massScale,correctedMeshes:active?.meshes.filter(o=>o.geometry.userData.correctedInwardWinding).length,opaqueWheels:active?[...active.wheels.values()].every(w=>w.rotating.children.every(o=>!o.material.transparent&&o.material.opacity===1)):true,wheelCount:active?.wheels.size,movingY:active?.moving.position.y,grip:active?.grip.position.toArray(),wheels:active?[...active.wheels].map(([id,w])=>({id,center:w.carrier.position.toArray(),rotation:w.rotating.rotation.z,carrierRotation:w.carrier.rotation.z})):[]};}
 };
}
