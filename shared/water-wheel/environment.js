import * as THREE from 'three';
export class Environment {
 constructor(renderer,scene){
  scene.background=new THREE.Color('#e0e8df');
  this.sun=new THREE.DirectionalLight('#fff2da',2.8);
  this.sun.position.set(-18,42,-24); this.sun.castShadow=true;
  this.sun.shadow.mapSize.set(1024,1024);
  Object.assign(this.sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:110});
  this.sun.shadow.normalBias=.05;
  scene.add(this.sun,new THREE.HemisphereLight('#d5e6f1','#8e8e68',2));
 }
 setHour(){} update(){}
}
