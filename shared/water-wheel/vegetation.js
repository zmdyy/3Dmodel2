import * as THREE from 'three';
import {ricePositions} from './terrain.js';
export function buildVegetation(scene){
 const pos=ricePositions(1.25);
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute([-.16,0,0,0,.7,0,.06,0,0, 0,0,-.16,0,.65,0,0,0,.08],3));
 geo.computeVertexNormals();
 const rice=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({color:'#688443',roughness:1,side:THREE.DoubleSide}),pos.length/4);
 const mat=new THREE.Matrix4();
 for(let i=0;i<pos.length;i+=4){mat.makeRotationY(pos[i+3]*6.28);mat.setPosition(pos[i],pos[i+1]+.07,pos[i+2]);rice.setMatrixAt(i/4,mat);}
 rice.computeBoundingSphere(); scene.add(rice);return {rice};
}
