// Capture the existing model without changing its geometry or materials.
const {chromium}=require('playwright');
const path=require('path');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});page.setDefaultTimeout(120000);
  const errors=[],network=[];page.on('pageerror',e=>errors.push(e.message));await page.route('http**/*',r=>{network.push(r.request().url());return r.abort()});
  await page.goto('file://'+path.join(root,'models/thermometers-thermal-expansion.html'),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.thermo3D);await page.evaluate(()=>document.fonts.ready);
  await page.addStyleTag({content:'.header,.nav,.controls,.worktop,.workbottom,.teaching-overlay,.floor-tag,.engine-info{display:none!important}html,body,#root,.layout,.shell,.workshop,#viewport{position:fixed!important;inset:0!important;width:960px!important;height:540px!important;min-height:0!important;margin:0!important;display:block!important}'});
  await page.evaluate(()=>{cancelAnimationFrame(thermoApp.raf);thermoApp.select(5);thermoApp.actual=160;thermoApp.high=160;thermoApp.setState({target:160,reading:160,burnerOn:true,labels:false},()=>{thermoApp.push();thermo3D.setView('front');thermo3D.zoom(.77)});thermo3D.getRenderer().setPixelRatio(1)});
  await page.waitForTimeout(1000);
  await page.locator('#viewport').screenshot({path:path.join(root,'assets/covers/thermometers-thermal-expansion-scene.jpg'),type:'jpeg',quality:93,timeout:120000});
  if(errors.length||network.length)throw new Error(JSON.stringify({errors,network}));
  console.log('Captured actual thermometer model: 960x540; no errors or external requests.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
