/* file:// WebGL and electrical-state acceptance; HTTP(S) blocked. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const dep=process.env.LAB_KIT_NODE_MODULES||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=require(dep?path.join(dep,'playwright'):'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.LAB_KIT_CHROMIUM?{executablePath:process.env.LAB_KIT_CHROMIUM}:{}),args:['--no-sandbox','--single-process','--no-zygote','--in-process-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>{requests.push(r.request().url());r.abort();});
 await page.goto(pathToFileURL(path.resolve(__dirname,'../../models/three-pin-plug.html')).href);await page.waitForFunction(()=>window.demo);
 // Optional host font injection only for screenshot QA on minimal Linux runtimes.
 if(process.env.LAB_KIT_FONT_CSS){const file=process.env.LAB_KIT_FONT_CSS;let css=fs.readFileSync(file,'utf8').replace(/url\(([^)]+)\)/g,(_,p)=>'url(data:font/woff2;base64,'+fs.readFileSync(path.resolve(path.dirname(file),p)).toString('base64')+')');await page.addStyleTag({content:css+':root{font-family:"Noto Sans SC",sans-serif}'});await page.evaluate(()=>document.fonts.ready);}
 const state=()=>page.evaluate(()=>demo.solveGrounding());
 await page.click('#ground-mode');let q=await state();assert.equal(q.pe,true);assert.equal(q.voltage,0);assert.equal(q.bodyCurrent,0);assert.equal(q.earthCurrent,.22);
 await page.screenshot({path:process.env.PLUG_SAFE_SHOT||'/tmp/plug-ground-safe.png'});
 await page.check('#pe-broken');q=await state();assert.ok(Math.abs(q.bodyCurrent-220/3000)<1e-12);assert.ok(Math.abs(q.voltage-220*2/3)<1e-10);assert.equal(q.earthCurrent,0);
 await page.screenshot({path:process.env.PLUG_DANGER_SHOT||'/tmp/plug-ground-danger.png'});
 await page.uncheck('#touch-case');q=await state();assert.equal(q.bodyCurrent,0);assert.equal(q.voltage,220);
 await page.uncheck('#fault');q=await state();assert.equal(q.voltage,0);assert.equal(q.bodyCurrent,0);
 await page.check('#fault');await page.check('#touch-case');await page.uncheck('#pe-broken');
 for(const [p,pe,live] of [[0,false,false],[22/32-1e-6,false,false],[22/32,true,false],[25/32-1e-6,true,false],[25/32,true,true],[1,true,true]]){await page.evaluate(p=>demo.setProgress(p),p);q=await state();assert.equal(q.pe,pe);assert.equal(q.live,live);assert.equal(q.bodyCurrent,0);assert.equal(q.earthCurrent,live?.22:0);}
 await page.click('#structure-mode');assert.equal(await page.locator('#ground-readout').isVisible(),false);await page.click('#ground-mode');assert.equal(await page.locator('#ground-readout').isVisible(),true);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'/tmp/plug-ground-mobile.png',fullPage:true});
 await page.click('#reset');assert.equal(await page.evaluate(()=>demo.getState().progress),0);assert.equal(await page.locator('#ground-readout').isVisible(),false);
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);console.log('PASS: offline WebGL; grounded/floating/touch/no-fault states; exact PE/L contact boundaries; mode/reset; narrow layout; no page errors or network requests.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
