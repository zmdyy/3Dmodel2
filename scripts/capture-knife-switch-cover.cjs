// Capture the existing model; only hide interface and enlarge its canvas.
const {chromium}=require('playwright');
const path=require('path');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.join(root,'models/porcelain-knife-switch.html'));
  await page.waitForFunction(()=>window.switchModel);
  await page.addStyleTag({content:'header,aside,.toolbar,.hint,.badge,.label,#error{display:none!important}html,body,main,#stage{position:fixed!important;inset:0!important;width:960px!important;height:540px!important;margin:0!important;border:0!important;display:block!important}'});
  await page.waitForTimeout(800);
  await page.locator('#stage').screenshot({path:path.join(root,'assets/covers/porcelain-knife-switch-scene.jpg'),type:'jpeg',quality:93});
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('Captured existing switch model: 960×540; no page errors.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
