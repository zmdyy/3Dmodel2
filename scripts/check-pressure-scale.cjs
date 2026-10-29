// Visual and physics acceptance for the pressure-scale 3D exhibit.
// Uses the actual repository HTML in software WebGL, not a mock scene.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const dir=process.env.COVER_NODE_MODULES||'../node_modules';
const {chromium}=require(path.join(dir,'playwright'));
const sharp=require(path.join(dir,'sharp'));
const root=path.resolve(__dirname,'..');
const out=path.join(root,'cover-captures','pressure-scale');
fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.glb':'model/gltf-binary'};
const server=http.createServer((req,res)=>{
  const rel=decodeURIComponent(new URL(req.url,'http://local').pathname);
  const file=path.resolve(root,'.'+rel);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,buf)=>{if(e){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(buf);
  });
});
async function main(){
 await new Promise(r=>server.listen(8767,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1700,height:820},deviceScaleFactor:1});
 page.setDefaultTimeout(35000);
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',e=>{if(e.type()==='error')errors.push(e.text().slice(0,250))});
 const checks=[];
 function check(name,cond,details){checks.push({name,ok:!!cond,details});if(!cond)throw Error('FAIL '+name+' '+JSON.stringify(details));}
 async function setForce(f){await page.locator('#force').evaluate((el,n)=>{el.value=String(n);el.dispatchEvent(new Event('input',{bubbles:true}))},f);
  await page.waitForTimeout(500);
  return await page.evaluate(()=>({...window.pressureScaleState,i:document.getElementById('iText').textContent,v:document.getElementById('vText').textContent,state:document.getElementById('state').textContent}));
 }
 try{
  await page.goto('http://127.0.0.1:8767/models/pressure-scale.html',{waitUntil:'load',timeout:45000});
  await page.waitForFunction(()=>window.pressureScaleState?.R===24,{timeout:30000});
  await page.waitForTimeout(1200);
  check('WebGL 3D canvas rendered',await page.locator('#stage canvas').count()===1);
  check('No fallback error',!(await page.locator('#fallback').isVisible()));
  let st=await page.evaluate(()=>window.pressureScaleState);
  check('0 N: 24 ohms, 0.2 A, 1.2 V',Math.abs(st.R-24)<1e-6&&Math.abs(st.Icalc-.2)<1e-6&&Math.abs(st.Vcalc-1.2)<1e-6,st);
  st=await setForce(300);
  check('300 N: 12 ohms, 1/3 A, 2 V',st.R===12&&Math.abs(st.Icalc-1/3)<1e-6&&Math.abs(st.Vcalc-2)<1e-6,st);
  st=await setForce(600);
  check('600 N boundary: 6 ohms, 0.5 A, 3 V',st.R===6&&Math.abs(st.Icalc-.5)<1e-6&&st.Vcalc===3&&!st.vOver,st);
  st=await setForce(1000);
  check('1000 N: voltage and current over range',st.R===3&&st.vOver&&st.aOver&&st.state.includes('超量程'),st);
  await page.locator('#switchBtn').click();
  st=await page.evaluate(()=>window.pressureScaleState);
  check('Open switch removes readings and current',!st.switchClosed&&(await page.locator('#iText').textContent()).includes('0.000')&&(await page.locator('#vText').textContent()).includes('0.00'),st);
  await page.locator('#reset').click();await page.waitForTimeout(650);
  st=await page.evaluate(()=>window.pressureScaleState);
  check('Reset restores closed, 0 N',st.switchClosed&&st.force===0&&st.R===24,st);
  const curves=await page.evaluate(()=>['resCurve','voltageCurve','overCurve'].map(id=>document.getElementById(id)?.getAttribute('d')?.length||0));
  check('Three working SVG chart lines',curves.every(x=>x>30),curves);
  check('Teaching tab defaults to experiment',!(await page.locator('#panel-operate').evaluate(e=>e.hidden)));
  await page.locator('[data-panel=graphs]').click();
  check('Graphs can be opened',!(await page.locator('#panel-graphs').evaluate(e=>e.hidden)));
  await page.locator('[data-panel=operate]').click();
  await page.locator('#diagramBtn').click();
  check('Circuit button opens wiring tab',!(await page.locator('#panel-wiring').evaluate(e=>e.hidden)));
  check('Corrected SVG circuit available',await page.locator('#diagram').evaluate(el=>el.classList.contains('show')));
  await page.locator('#diagramBtn').click();
  await page.locator('#sensorView').click();await page.waitForTimeout(750);
  await page.locator('#home').click();await page.waitForTimeout(800);
  check('No browser JavaScript errors',errors.length===0,errors.slice(0,6));
  await page.addStyleTag({content:'.toolbar,.hint,.cornernote,#stageReadout{display:none!important}#labels .terminal,#labels .wire{display:none!important}'});
  const stage=page.locator('#stage');
  const image=await stage.screenshot({timeout:30000,animations:'disabled'});
  const coverFile=path.join(root,'assets','covers','pressure-scale-scene.jpg');
  await sharp(image).resize(960,540,{fit:'cover',position:'centre'}).jpeg({quality:90,mozjpeg:true}).toFile(coverFile);
  const stat=await sharp(coverFile).stats();
  const size=fs.statSync(coverFile).size;
  check('Nonblank actual-scene cover',size>16000&&stat.entropy>2.3,{size,entropy:stat.entropy});
  await page.screenshot({path:path.join(out,'full-page.png'),fullPage:true});
  const meta=JSON.parse(fs.readFileSync(path.join(root,'catalog.js'),'utf8').replace(/^\s*window\.MODEL_CATALOG\s*=\s*/,'').replace(/;\s*$/,''));
  const item=meta.find(x=>x.id==='pressure-scale');
  check('Catalog entry found',!!item);
  item.cover='assets/covers/pressure-scale-scene.jpg?v=20261029-v3';
  item.path='models/pressure-scale.html?v=20261029-v3';
  item.subtitle='压敏电阻 · 七线实物接线 · 仪表读数 · 三页教学面板';
  item.summary='Three.js PBR 三维实物接线与压力传感演示：修正传力弹簧结构，展示电表实时示数、R–F 和 U₀–F 图像、600 N 量程边界；使用实验操作、图像分析、实物接线三页教学面板。';
  fs.writeFileSync(path.join(root,'catalog.js'),'window.MODEL_CATALOG = '+JSON.stringify(meta,null,2)+';\n');
  fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({checks,errors,size,entropy:stat.entropy},null,2));
  console.log('PRESSURE_SCALE_ACCEPTED='+JSON.stringify({checks:checks.length,coverBytes:size,entropy:stat.entropy}));
 }catch(e){
  await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});
  fs.writeFileSync(path.join(out,'failure.txt'),e.stack+'\n'+errors.join('\n'));
  throw e;
 }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1});
