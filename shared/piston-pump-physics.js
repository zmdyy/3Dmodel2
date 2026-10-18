// Qualitative low-speed chamber model. Water amounts use cylinder-area-equivalent metres.
// No pressure readouts or physical leakage calibration are claimed by the UI.
export class PumpExperiment {
 constructor(mode='dry'){this.reset(mode);}
 pose(phase=this.phase){const theta=Math.PI/6*Math.cos(phase),x=.15-.15*Math.cos(theta),z=1.31-.15*Math.sin(theta),slider=z-Math.sqrt(.15**2-x*x);return {theta,x,z,slider,piston:slider-.4,capacity:slider-.4-.020-.365};}
 reset(mode='dry'){
  this.mode=mode;this.phase=0;this.time=0;this.playing=false;this.paused=false;this.singleEnd=null;this.pouring=false;this.pourTime=0;this.wet=mode==='wet'?1:0;this.H=mode==='wet'?.2636477:0;this.L=mode==='wet'?this.pose().capacity:0;this.pipeLevel=mode==='wet'?.345:.095;this.gas=.0;this.gas=this.gasVolume();this.pressure=1;this.valveA=0;this.valveB=0;this.seep=0;this.exhaust=0;this.intake=0;this.outflow=0;this.totalOut=0;this.totalSeep=0;this.totalWell=0;this.totalPour=0;this.initialWater=this.H+this.L+this.pipeWater();this.strokes=0;this.lastCapacity=this.pose().capacity;this.hasOutput=false;
 }
 gasVolume(){return Math.max(.000001,this.pose().capacity-this.L)+.105*Math.max(0,.345-this.pipeLevel);}
 pipeWater(){return .105*Math.max(0,this.pipeLevel-.095);}
 balance(){return this.H+this.L+this.pipeWater()+this.totalOut-this.initialWater-this.totalPour-this.totalWell;}
 addWater(){if(this.wet>.99||this.pouring||this.mode==='wet')return false;this.pouring=true;this.pourTime=0;this.playing=false;this.singleEnd=null;this.paused=false;return true;}
 pressOnce(){if(this.pouring)return;this.paused=false;this.playing=false;this.singleEnd=this.phase+2*Math.PI;}
 togglePlay(){if(this.pouring){this.paused=!this.paused;return;}if(this.playing){this.playing=false;this.paused=true;}else{this.playing=true;this.singleEnd=null;this.paused=false;}}
 step(dt){
  if(this.paused)return;this.time+=dt;this.seep=0;this.exhaust=0;this.intake=0;this.outflow=0;
  const prev=this.pose(),oldPhase=this.phase;let moving=!this.pouring&&(this.playing||this.singleEnd!==null);
  if(moving){this.phase+=dt*Math.PI/2;if(this.singleEnd!==null&&this.phase>=this.singleEnd){this.phase=this.singleEnd;this.singleEnd=null;moving=false;}this.strokes+=Math.floor(this.phase/(2*Math.PI))-Math.floor(oldPhase/(2*Math.PI));}
  const p=this.pose(),delta=p.capacity-prev.capacity,up=Math.sin(this.phase)>0,turn=Math.abs(Math.sin(this.phase));
  if(this.pouring){const inc=Math.min(dt,8-this.pourTime)*.045/8;this.H+=inc;this.totalPour+=inc;this.pourTime=Math.min(8,this.pourTime+dt);this.wet=this.pourTime/8;if(this.pourTime>=8)this.pouring=false;}
  // Priming water can seep through an imperfect cup. Air displacement during
  // wetting is treated as venting, rather than silently compressing trapped air.
  if(this.H>0&&(this.pouring||!moving||up)){
   const rate=(.004*(1-this.wet)+.0005*this.wet)*(this.H/(this.H+.008));const amount=Math.min(this.H,rate*dt,Math.max(0,p.capacity-this.L));this.H-=amount;this.L+=amount;this.seep=amount/dt;this.totalSeep+=amount;
  }
  if(this.pouring||(!moving&&this.wet<1)){this.pressure=1;this.gas=this.gasVolume();}
  else if(moving){
   const gv=this.gasVolume();let pg=this.gas/gv;
   if(this.wet<.99){this.gas+=(gv-this.gas)*(1-Math.exp(-dt/.018));pg=this.gas/gv;this.valveA=up?0:Math.min(1,turn*5);this.valveB=0;}
   else if(up){
    this.valveA=0;
    if(p.capacity-this.L<.00002&&this.pipeLevel>=.3449){
     const amount=Math.max(0,p.capacity-this.L);this.L+=amount;this.totalWell+=amount;this.intake=amount/dt;pg=.965;
    }else{
     const head=.098*Math.max(0,this.pipeLevel-.095),drive=Math.max(0,1-head-pg-.0005),rate=.75*Math.sqrt(drive),amount=rate*dt;
     let remaining=amount;const pipeAdd=Math.min(remaining,.105*(.345-this.pipeLevel));this.pipeLevel+=pipeAdd/.105;remaining-=pipeAdd;const chamberAdd=Math.min(remaining,Math.max(0,p.capacity-this.L));this.L+=chamberAdd;const actual=pipeAdd+chamberAdd;this.totalWell+=actual;this.intake=actual/dt;pg=this.gas/this.gasVolume();
    }
    this.valveB=this.intake>1e-7?Math.min(1,turn*6):0;
   }else{
    this.valveB=0;const threshold=1+.098*this.H+.0008;
    if(pg>threshold){const vent=this.gas-threshold*this.gasVolume();this.gas-=vent;this.exhaust=Math.max(0,vent/dt);pg=threshold;}
    const displaced=Math.max(0,this.L-p.capacity);this.L-=displaced;this.H+=displaced;
    this.valveA=(this.exhaust>1e-7||displaced>1e-8)?Math.min(1,turn*6):0;
   }
   this.pressure+=(pg-this.pressure)*(1-Math.exp(-dt/.08));
  }else{this.valveA*=Math.exp(-dt/.12);this.valveB*=Math.exp(-dt/.12);this.pressure+=(1-this.pressure)*(1-Math.exp(-dt/.6));}
  const maxH=Math.max(0,.970-(p.piston+.020));if(this.H>maxH){const amount=this.H-maxH;this.H-=amount;this.totalOut+=amount;this.outflow=amount/dt;if(amount>1e-8)this.hasOutput=true;}
  this.lastCapacity=p.capacity;
 }
 get stage(){return this.pouring?'加入引水':this.hasOutput?'已经出水':this.wet>.99?'已加引水':this.wet>0?'润湿中':'未加引水';}
}
