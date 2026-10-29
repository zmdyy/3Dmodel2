// Capture homepage card covers from the real running scenes.
// Output is derived from actual Chromium/WebGL canvases, not illustrative artwork.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const sharp = require(path.join(process.env.COVER_NODE_MODULES || '../node_modules', 'sharp'));
const {chromium} = require(path.join(process.env.COVER_NODE_MODULES || '../node_modules', 'playwright'));
const root=path.resolve(__dirname,'..');
const output=path.join(root,'assets','covers');
const evidence=path.join(root,'cover-captures','featured');
fs.mkdirSync(output,{recursive:true});fs.mkdirSync(evidence,{recursive:true});
const models=[
 {id:'water-boiling',output:'water-boiling-scene.jpg'},
 {id:'light-spectrum-color-vision',output:'light-spectrum-color-vision-scene.jpg'},
 {id:'qiantang-bridge-complete',catalogId:'qiantang-caisson',output:'qiantang-bridge-complete-scene.jpg'},
];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.json':'application/json','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  let filepath;
  try{filepath=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}
  catch(_){res.writeHead(400).end();return;}
  if(!filepath.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(filepath,(err,data)=>{
    if(err){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',mime[path.extname(filepath)]||'application/octet-stream');
    res.end(data);
  });
});
async function capture(browser,model){
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
  const log=[];
  page.on('pageerror',e=>log.push('pageerror: '+e.message));
  page.on('console',e=>{if(e.type()==='error') log.push('console: '+e.text().slice(0,260))});
  const url='http://127.0.0.1:8765/models/'+model.id+'.html';
  try{
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForTimeout(9000);
    const candidates=[];
    for(const frame of page.frames()){
      let count=0;
      try{count=await frame.locator('canvas').count();}
      catch(_){continue;}
      for(let index=0;index<Math.min(count,20);index++){
        const locator=frame.locator('canvas').nth(index);
        try{
          if(!(await locator.isVisible()))continue;
          const rect=await locator.boundingBox();
          if(!rect||rect.width<380||rect.height<240)continue;
          const score=rect.width*rect.height;
          candidates.push({locator,score,rect,frame:frame.url(),index});
        }catch(_){}
      }
    }
    candidates.sort((a,b)=>b.score-a.score);
    console.log(model.id+' canvases='+JSON.stringify(candidates.map(({score,rect,frame,index})=>({score,rect,frame,index}))));
    let raw;
    if(candidates.length){
      await page.waitForTimeout(700);
      raw=await candidates[0].locator.screenshot({timeout:60000,animations:'disabled'});
    }else{
      // Fallback: still an actual rendered webpage, never a fabricated image.
      const stage=page.locator('#viewport, .stage, .scene, #scene, .viewport').first();
      if(await stage.count()&&await stage.isVisible()){
        raw=await stage.screenshot({timeout:60000,animations:'disabled'});
      }else{
        raw=await page.screenshot({clip:{x:0,y:75,width:1150,height:690},timeout:60000});
      }
      log.push('No large WebGL canvas; captured actual page region.');
    }
    const name=model.output;
    const dest=path.join(output,name);
    await sharp(raw).resize(960,540,{fit:'cover',position:'centre'}).jpeg({quality:88,mozjpeg:true}).toFile(dest);
    const stat=await sharp(dest).stats();
    const entropy=stat.entropy||0;
    const fileSize=fs.statSync(dest).size;
    console.log(model.id+' image bytes='+fileSize+' entropy='+entropy.toFixed(3)+' errors='+JSON.stringify(log.slice(0,8)));
    if(fileSize<8000||entropy<0.35)throw Error('Scene capture appears blank: '+model.id+' '+fileSize+' bytes, entropy '+entropy);
    fs.copyFileSync(dest,path.join(evidence,name));
    return {id:model.id,output:name,bytes:fileSize,entropy,errors:log};
  }catch(e){
    await page.screenshot({path:path.join(evidence,model.id+'-failure.png'),fullPage:true}).catch(()=>{});
    fs.writeFileSync(path.join(evidence,model.id+'-failure.txt'),e.stack+'\n'+log.join('\n'));
    throw e;
  }finally{await page.close();}
}
(async()=>{
  await new Promise(resolve=>server.listen(8765,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
  try{
    const result=[];
    for(const model of models)result.push(await capture(browser,model));
    const catalogPath=path.join(root,'catalog.js');
    const source=fs.readFileSync(catalogPath,'utf8');
    const data=JSON.parse(source.replace(/^\s*window\.MODEL_CATALOG\s*=\s*/,'').replace(/;\s*$/,''));
    for(const model of models){
      const item=data.find(x=>x.id===(model.catalogId||model.id));
      if(!item)throw Error('Catalog entry missing: '+(model.catalogId||model.id));
      item.cover='assets/covers/'+model.output+'?v=20261029-featured';
    }
    fs.writeFileSync(catalogPath,'window.MODEL_CATALOG = '+JSON.stringify(data,null,2)+';\n');
    fs.writeFileSync(path.join(evidence,'manifest.json'),JSON.stringify(result,null,2));
    console.log('READY_FOR_COMMIT='+JSON.stringify(result));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
