const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.OPTICS_BROWSER?{executablePath:process.env.OPTICS_BROWSER}:{}),args:['--no-sandbox']});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+path.resolve(__dirname,'../../models/reflection-refraction.html'));await page.waitForFunction(()=>window.OpticsLab);
 const count=await page.evaluate(()=>{const lab=OpticsLab,s=lab.state,near=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]))<1e-8;let count=0;
 for(const mode of ['refract','space'])for(const n of [1.49,1.586])for(const side of [-1,1])for(const angle of [0,15,45,65,85])for(const azimuth of [0,45,90,135,270]){
  Object.assign(s,{mode,spaceKind:'refract',shape:'rect',inside:false,n,side,angle,azimuth,reversePath:false});const f=lab.rectGeometry();
  if(!near(f.exitDir,f.d))throw Error('Exit must be parallel to original incidence');
  for(const p of [f.p,f.secondP])if(Math.abs(p.n1*Math.sin(p.i*Math.PI/180)-p.n2*Math.sin(p.t*Math.PI/180))>1e-8)throw Error('Snell law');
  for(let k=0;k<3;k++)if(f.exitPoint[k]<f.bounds[k][0]-1e-8||f.exitPoint[k]>f.bounds[k][1]+1e-8)throw Error('Ray outside material');
  if(!f.exitPoint.some((x,k)=>f.bounds[k].some(b=>Math.abs(b-x)<1e-8)))throw Error('Exit must lie on a face');
  s.reversePath=true;const r=lab.rectGeometry();if(!near(r.outgoing,f.d.map(x=>-x))||!near(r.segments[0],f.segments[1])||!near(r.segments[1],f.segments[0]))throw Error('Reversible path');count++;
 }
 Object.assign(s,{mode:'refract',shape:'rect',inside:false,angle:45,reversePath:false});lab.sync();return count;});
 assert.equal(count,200);assert.equal(await page.locator('[data-role="interface-normal"]').count(),2);await page.locator('[data-mode="internal"]').click();assert.equal(await page.evaluate(()=>OpticsLab.physics().tir),true);assert.equal(await page.locator('#shapeLabel').isVisible(),false);assert.deepEqual(errors,[]);console.log(`PASS ${count} rectangular optical configurations; UI and total-reflection regression`);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
