// Reproduce actual V11 psychrometer Three.js scene cover; no fabricated illustration.
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const browser=await chromium.launch({headless:false,executablePath:process.env.CHROMIUM_PATH||undefined,
   args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',err=>errors.push(String(err)));
  const html=fs.readFileSync(path.join(root,'models/wet-dry-bulb-psychrometer.html'),'utf8');
  await page.setContent(html,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>!!document.querySelector('#threeStage canvas'),{timeout:20000});
  await page.evaluate(()=>{const stage=document.querySelector('.stage');stage.style.cssText='position:fixed;top:0;left:0;width:960px;height:540px;min-width:960px;min-height:540px;max-width:960px;max-height:540px;z-index:9999;overflow:hidden';document.body.style.margin='0';});
  await page.waitForTimeout(1500);
  await page.evaluate(()=>{window.__psychrometerViewSet?.('home');for(const q of ['.stage-top','.stage-status','.stage-bottom','.scene-hint','.callout'])document.querySelectorAll(q).forEach(x=>x.style.display='none');});
  await page.mouse.move(480,260);await page.mouse.wheel(0,-160);
  await page.waitForTimeout(1200);
  const canvas=page.locator('#threeStage canvas');
  if(!await page.evaluate(()=>!!document.querySelector('#threeStage canvas')?.getContext('webgl2')))throw Error('WebGL2 context unavailable');
  if(errors.length)throw Error('Page errors: '+errors.join(' | '));
  const out=path.join(root,'assets/covers/wet-dry-bulb-psychrometer-scene.jpg');
  await canvas.screenshot({path:out,type:'jpeg',quality:90});
  console.log('Captured true WebGL cover: '+out);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
