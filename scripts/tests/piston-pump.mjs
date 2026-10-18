import assert from 'node:assert/strict';
import {PumpExperiment} from '../../shared/piston-pump-physics.js';
const advance=(e,s)=>{for(let i=0;i<Math.round(s*120);i++){e.step(1/120);assert(Math.abs(e.balance())<1e-8,'water balance');assert(e.H>=0&&e.L>=0);}};
const dry=new PumpExperiment();dry.playing=true;advance(dry,24);assert.equal(dry.totalOut,0);assert.equal(dry.pipeLevel,.095);assert.equal(dry.valveB,0);
assert(dry.addWater());advance(dry,8);assert.equal(dry.wet,1);assert(dry.L>0&&dry.H<.045,'priming water seeps below cup');assert.equal(dry.totalOut,0);assert(!dry.addWater(),'cannot silently add priming water twice');
dry.playing=true;advance(dry,48);assert(dry.hasOutput&&dry.totalOut>0);dry.paused=true;const snapshot=[dry.phase,dry.H,dry.L,dry.time];advance(dry,1);assert.deepEqual([dry.phase,dry.H,dry.L,dry.time],snapshot,'pause freezes flow and handle');
const wet=new PumpExperiment('wet');wet.pressOnce();advance(wet,1);assert(wet.valveA<.01&&wet.valveB>.1&&wet.totalOut>0,'upstroke: A closed, B open, delivery');advance(wet,2);assert(wet.valveA>.1&&wet.valveB<.01,'downstroke: A open, B closed');advance(wet,1.2);assert.equal(wet.strokes,1);assert.equal(wet.singleEnd,null);
console.log('PASS dry pumping, priming seepage, water conservation, valve sequence, one cycle and pause');
