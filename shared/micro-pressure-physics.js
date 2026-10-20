// Ideal hydrostatics coupled to an isothermal trapped-air volume and a linear diaphragm.
export const LIQUIDS={oil:{name:'轻质油',rho:800},water:{name:'水',rho:1000},glycerol:{name:'甘油',rho:1260}};
export const MEMBRANES={soft:{name:'较强 · 较易形变',stiffness:40000},stiff:{name:'较弱 · 较难形变',stiffness:280000}};
export const BORE_AREA=Math.PI*.0064**2,EFFECTIVE_AREA=Math.PI*.0315**2/2,AIR_VOLUME=80e-6,P0=101325,G=9.8;
export function diaphragmAt(h,rho,bias=0){const dp=rho*G*h;return (BORE_AREA*h/2+AIR_VOLUME*(dp-bias)/(P0+dp))/EFFECTIVE_AREA;}
export function equilibrium(depth,liquid='water',membrane='soft',bias=0,manual=0,testDensity=1000){
 const rho=LIQUIDS[liquid].rho,k=MEMBRANES[membrane].stiffness,external=testDensity*G*Math.max(0,depth)+manual;let lo=0,hi=Math.max(external,bias);
 for(let i=0;i<60;i++){const dp=(lo+hi)/2,h=dp/(rho*G),restoring=k*diaphragmAt(h,rho,bias);if(dp+restoring>external)hi=dp;else lo=dp;}
 const gasPressure=(lo+hi)/2,h=gasPressure/(rho*G);return {h,gasPressure,external,deflection:diaphragmAt(h,rho,bias)};
}

export function meanWetHead(depth,orientation='front'){
 if(orientation!=='front')return Math.max(0,depth);
 const r=.0315;if(depth>=r)return depth;if(depth<=-r)return 0;
 let total=0;const nr=24,na=72;for(let i=0;i<nr;i++){const radius=r*Math.sqrt((i+.5)/nr);for(let j=0;j<na;j++)total+=Math.max(0,depth-radius*Math.sin((j+.5)*Math.PI*2/na));}return total/(nr*na);
}

export const TEST_LIQUIDS={water:{name:'清水',rho:1000,color:0x70b6ce},brine:{name:'浓盐水',rho:1200,color:0x83c0b6},oil:{name:'轻质油',rho:800,color:0xd6b86b},dense:{name:'高密度教学液体',rho:3000,color:0x9a99ce}};
export const OPEN_AREA=Math.PI*.006**2;
export function openEquilibrium(depth,working='water',test='water'){
 const d=Math.max(0,depth),rho=LIQUIDS[working].rho,rt=TEST_LIQUIDS[test].rho;let lo=0,hi=rt*G*d;
 for(let i=0;i<70;i++){const dp=(lo+hi)/2,h=dp/(rho*G),rise=(AIR_VOLUME*dp/(P0+dp)+BORE_AREA*h/2)/OPEN_AREA;if(dp/(rt*G)+rise>d)hi=dp;else lo=dp;}
 const gasPressure=(lo+hi)/2,h=gasPressure/(rho*G),H=gasPressure/(rt*G),rise=d-H;
 return {h,H,rise,gasPressure,airVolume:AIR_VOLUME-OPEN_AREA*rise+BORE_AREA*h/2};
}
export function flowEquilibrium(speed,working='water'){
 const outlet=speed/4,gasPressure=-.5*1.2*(speed**2-outlet**2);
 return {h:gasPressure/(LIQUIDS[working].rho*G),gasPressure,outlet};
}
