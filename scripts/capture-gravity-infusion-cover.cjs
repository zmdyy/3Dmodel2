// Capture both actual material states; hide UI only, retain scene geometry and optics.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const dep=process.env.COVER_NODE_MODULES||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=require(dep?path.join(dep,'playwright'):'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.join(root,'cover-captures/gravity-infusion');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.COVER_CHROMIUM?{executablePath:process.env.COVER_CHROMIUM}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:480,height:540},deviceScaleFactor:1}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.route(/^https?:/,r=>{requests.push(r.request().url());return r.abort()});
 await page.goto('file://'+path.join(root,'models/gravity-infusion.html'));await page.waitForFunction(()=>window.ivLab);await page.evaluate(()=>document.fonts.ready);
 await page.addStyleTag({content:'html,body{margin:0!important;overflow:hidden!important;width:480px!important;height:540px!important}.header,.side,.bottom,.caption,.tools,.leaders,.labels,.badge,.hint,.flow-legend{display:none!important}.layout,.left,.stage{display:block!important;position:absolute!important;inset:0!important;width:480px!important;height:540px!important;min-height:0!important}canvas#scene{position:absolute!important;top:0!important;left:0!important;width:480px!important;height:540px!important}'});
 for(const kind of ['glass','bag']){
  await page.evaluate(kind=>ivLab.choose(kind),kind);await page.waitForFunction(()=>!ivLab.cameraTransition);
  await page.evaluate(()=>{const a=ivLab;a.controls.dispatchEvent({type:'start'});a.controls.enableDamping=false;a.controls.target.set(0,1.085,0);a.camera.position.set(.18,1.09,.62);a.controls.update();a.render()});
  await page.waitForTimeout(200);await page.locator('#scene').screenshot({path:path.join(out,kind+'.png')});
 }
 if(errors.length||requests.length)throw Error(JSON.stringify({errors,requests}));
 const target=path.join(root,'assets/covers/gravity-infusion-scene.jpg');
 execFileSync('python3',['-c',"from PIL import Image;import sys;im=Image.new('RGB',(960,540));im.paste(Image.open(sys.argv[1]).convert('RGB'),(0,0));im.paste(Image.open(sys.argv[2]).convert('RGB'),(480,0));im.save(sys.argv[3],quality=94,subsampling=0)",path.join(out,'glass.png'),path.join(out,'bag.png'),target]);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({source:'models/gravity-infusion.html',size:[960,540],states:['glass','bag'],errors,requests},null,2));console.log('PASS actual WebGL cover, both material states, zero external requests, zero browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
