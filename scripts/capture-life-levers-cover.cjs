// Real default WebGL scene, only UI hidden and framing fitted to 16:9.
const {chromium}=require('playwright');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||process.env.COVER_CHROMIUM,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
 try {
  const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(root,'models/life-levers.html')).href);
  await page.waitForFunction(()=>window.leverLab);
  await page.addStyleTag({content:'html,body{margin:0!important;width:960px!important;height:540px!important;overflow:hidden!important} header,nav,aside,#footer,#tools,#tag,#labels,#fail{display:none!important} #app,#stage{display:block!important;position:absolute!important;inset:0!important;width:960px!important;height:540px!important;min-height:0!important} #view{width:960px!important;height:540px!important}'});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{document.getElementById('home').click();resolve()}))));
  await page.evaluate(()=>{const r=leverLab.renderer,sz=r.getSize(new THREE.Vector2());r.setSize(1,1,false);for(let i=0;i<121;i++)r.render(leverLab.scene,leverLab.camera);r.setSize(sz.x,sz.y,false);r.render(leverLab.scene,leverLab.camera)});
  await page.locator('#view').screenshot({path:path.join(root,'assets/covers/life-levers-scene.jpg'),type:'jpeg',quality:92});
  if(errors.length)throw Error(errors.join('\n'));
  console.log('Captured real life-levers WebGL cover (960×540).');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
