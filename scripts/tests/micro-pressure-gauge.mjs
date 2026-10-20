import assert from 'node:assert/strict';
import {openEquilibrium,flowEquilibrium,TEST_LIQUIDS,LIQUIDS,P0,G,AIR_VOLUME,OPEN_AREA,BORE_AREA,equilibrium,MEMBRANES} from '../../shared/micro-pressure-physics.js';
let count=0;for(const test of Object.keys(TEST_LIQUIDS))for(const working of Object.keys(LIQUIDS)){
 let prior=0;for(let i=0;i<=140;i++){const d=i/1000,r=openEquilibrium(d,working,test),rho=LIQUIDS[working].rho,rt=TEST_LIQUIDS[test].rho;
 assert(Math.abs(rt*G*r.H-rho*G*r.h)<1e-8);assert(Math.abs(r.H+r.rise-d)<1e-12);assert(Math.abs((P0+r.gasPressure)*r.airVolume-P0*AIR_VOLUME)<1e-8);
 assert(Math.abs(r.airVolume-(AIR_VOLUME-OPEN_AREA*r.rise+BORE_AREA*r.h/2))<1e-12);
 assert(r.H<=d+1e-12&&r.rise>=-1e-12&&r.rise<.22);assert(r.h>=prior-1e-12);assert(.18-r.h/2>.052&&.18+r.h/2<.35);prior=r.h;count++;
 }
}
for(const working of Object.keys(LIQUIDS))for(let speed=0;speed<=35;speed+=.5){const r=flowEquilibrium(speed,working);assert(r.h<=0);assert(Math.abs(r.gasPressure+.5*1.2*(speed**2-r.outlet**2))<1e-8);assert(.18+r.h/2>.052&&.18-r.h/2<.35);count++;}
for(const test of ['water','brine','oil'])for(const liquid of Object.keys(LIQUIDS))for(const membrane of Object.keys(MEMBRANES)){const r=equilibrium(.14,liquid,membrane,0,0,TEST_LIQUIDS[test].rho);assert(Math.abs(r.external-TEST_LIQUIDS[test].rho*G*.14)<1e-8);assert(r.deflection<.014);count++;}
// Integrator must converge across the largest positive and negative readings without overshooting the tube limits.
for(const target of [openEquilibrium(.14,'oil','dense').h,flowEquilibrium(35,'oil').h]){let h=0,v=0;for(let i=0;i<600;i++){const dt=1/60;v+=(144*(target-h)-24*v)*dt;h+=v*dt;assert(.18-Math.abs(h)/2>.052&&.18+Math.abs(h)/2<.35);}assert(Math.abs(h-target)<1e-9);}
console.log(`${count} physics states passed: hydrostatics, Boyle law, displaced volumes, density settings, flow signs, tube bounds and settling.`);
for(const test of Object.keys(TEST_LIQUIDS)){const r=openEquilibrium(.14,'water',test);console.log(test,{d_cm:14,H_cm:r.H*100,rise_cm:r.rise*100,dh_cm:r.h*100});}
