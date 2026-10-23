/* Run: CHROMIUM_PATH=/path/to/chrome node scripts/check-water-wheel.cjs [--cover] */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const errors = [];
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(root, pathname);
  if (pathname === '/test-font.otf' && process.env.TEST_FONT) file = process.env.TEST_FONT;
  if (file.endsWith(path.sep)) file += 'index.html';
  try {
    res.setHeader('Content-Type', ({'.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.otf':'font/otf'})[path.extname(file)] || 'text/html');
    res.end(fs.readFileSync(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    page.on('pageerror', e => {errors.push(e.message);console.error('PAGE ERROR',e.message)});
    page.on('console', m => {if(m.type()==='error') errors.push(m.text());});
    await page.goto(url + '/models/water-wheel.html');
    await page.waitForFunction(() => window.__app, {timeout:90000});
    if (process.env.TEST_FONT) {
      await page.addStyleTag({content:"@font-face{font-family:TestChinese;src:url('/test-font.otf')}body{font-family:TestChinese,sans-serif!important}:root{--sans:TestChinese,sans-serif;--kai:TestChinese,sans-serif}"});
      await page.evaluate(() => document.fonts.ready);
    }
    await page.waitForTimeout(1400);
    const initial = await page.evaluate(() => {
      const a=__app; return {calls:a.renderer.info.render.calls,triangles:a.renderer.info.render.triangles,particles:a.particles.max,notches:a.st.notches.length,delivered:a.wheel.delivered,rpm:a.wheel.rpm};
    });
    assert(initial.delivered>0); assert.equal(initial.notches,9); assert.equal(initial.particles,1800);
    assert(initial.calls<100); assert(initial.triangles<160000);
    await page.click('#pause');
    const frozen=await page.evaluate(()=>[__app.wheel.angle,__app.wheel.delivered,...__app.st.cascade,__app.particles.pos[0]]);
    await page.waitForTimeout(300);
    assert.deepStrictEqual(await page.evaluate(()=>[__app.wheel.angle,__app.wheel.delivered,...__app.st.cascade,__app.particles.pos[0]]),frozen);
    await page.click('#pause');
    await page.waitForFunction(x=>__app.wheel.angle>x,frozen[0],{timeout:15000});
    await page.click('#pause');
    const hydraulic=await page.evaluate(()=>{
      const a=__app,w=a.wheel;
      const start=w.delivered;
      for(let i=0;i<2400;i++){w.update(.05,2.2,null);a.st.update(.05,w.pourRate,w.omega);}
      const running={delivered:w.delivered-start,flow:w.pourRate,cascade:Math.min(...a.st.cascade)};
      for(let i=0;i<2400;i++){w.update(.05,0,null);a.st.update(.05,w.pourRate,w.omega);}
      const stopped={omega:w.omega,flow:w.pourRate,cascade:Math.max(...a.st.cascade)};
      for(let i=0;i<1200;i++){w.update(.05,2.2,null);a.st.update(.05,w.pourRate,w.omega);}
      return {running,stopped};
    });
    assert(hydraulic.running.delivered>.1); assert(hydraulic.running.cascade>.1);
    assert(hydraulic.stopped.omega<1e-5); assert(hydraulic.stopped.flow<1e-5); assert(hydraulic.stopped.cascade<1e-4);
    await page.selectOption('#quality','clear');
    assert(await page.evaluate(()=>__app.renderer.shadowMap.enabled));
    await page.selectOption('#quality','eco');
    assert(!(await page.evaluate(()=>__app.renderer.shadowMap.enabled)));
    await page.check('#t-track'); assert(await page.evaluate(()=>__app.wheel.tracked===5));
    await page.check('#t-labels'); await page.check('#t-path'); await page.check('#t-flow');
    await page.evaluate(()=>{__app.setMode('structure');const r=__app.renderer.render,l=__app.labelRenderer.render;__app.renderer.render=()=>{};__app.labelRenderer.render=()=>{};for(let i=0;i<100;i++)__app.tick(.05);__app.renderer.render=r;__app.labelRenderer.render=l;__app.tick(.001)});
    assert(await page.evaluate(()=>__app.S.explode>.59));
    await page.evaluate(()=>{__app.setMode('principle');for(let i=0;i<8;i++){__app.gotoStep(i);__app.tick(.05)}});
    assert.equal(await page.locator('#st-index').innerText(),'8 / 8');
    await page.screenshot({path:'/tmp/water-wheel-principle.png'});
    await page.evaluate(()=>{__app.setMode('tour');const r=__app.renderer.render,l=__app.labelRenderer.render;__app.renderer.render=()=>{};__app.labelRenderer.render=()=>{};for(let i=0;i<70;i++)__app.tick(.05);__app.renderer.render=r;__app.labelRenderer.render=l;__app.tick(.001)});
    const theta=await page.evaluate(()=>__app.controls.getAzimuthalAngle());
    await page.mouse.move(800,350);await page.mouse.down();await page.mouse.move(880,350,{steps:8});await page.mouse.up();await page.waitForTimeout(200);
    assert((await page.evaluate(()=>__app.controls.getAzimuthalAngle()))<theta);
    const target=await page.evaluate(()=>__app.controls.target.toArray());
    await page.mouse.move(800,350);await page.mouse.down({button:'right'});await page.mouse.move(860,390,{steps:8});await page.mouse.up({button:'right'});
    assert.notDeepStrictEqual(await page.evaluate(()=>__app.controls.target.toArray()),target);
    const panTarget=await page.evaluate(()=>__app.controls.target.toArray());
    await page.keyboard.down('Shift');await page.mouse.move(800,350);await page.mouse.down();await page.mouse.move(840,370,{steps:5});await page.mouse.up();await page.keyboard.up('Shift');
    assert.notDeepStrictEqual(await page.evaluate(()=>__app.controls.target.toArray()),panTarget);
    await page.evaluate(()=>{__app.setMode('tour');const r=__app.renderer.render,l=__app.labelRenderer.render;__app.renderer.render=()=>{};__app.labelRenderer.render=()=>{};for(let i=0;i<70;i++)__app.tick(.05);__app.renderer.render=r;__app.labelRenderer.render=l;__app.tick(.001)});
    await page.screenshot({path:'/tmp/water-wheel-overview.png'});
    await page.setViewportSize({width:1280,height:720});
    await page.screenshot({path:'/tmp/water-wheel-1280.png'});
    const overflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth>innerWidth,left:document.getElementById('left').getBoundingClientRect().bottom>document.getElementById('energy').getBoundingClientRect().top, footer:document.getElementById('energy').getBoundingClientRect().bottom>document.getElementById('stats').getBoundingClientRect().top}));
    assert(!overflow.page);assert(!overflow.left);assert(!overflow.footer);
    if (process.argv.includes('--cover')) {
      await page.setViewportSize({width:960,height:540});
      await page.evaluate(()=>{document.body.classList.add('ui-off');__app.S.paused=true;});
      await page.waitForTimeout(250);
      await page.locator('#app canvas').screenshot({path:path.join(root,'assets/covers/water-wheel-scene.jpg'),type:'jpeg',quality:90});
    }
    await page.goto(url+'/');
    await page.waitForFunction(()=>window.MODEL_CATALOG);
    const entry=await page.evaluate(()=>MODEL_CATALOG.find(x=>x.id==='water-wheel'));
    assert(entry && entry.category==='力学实验');
    assert(await page.getByText('筒车灌田 · 机械能转化',{exact:false}).count()>0);
    const image=await page.request.get(url+'/'+entry.cover);assert(image.ok());
    assert.equal(errors.length,0,errors.join('\n'));
    console.log(JSON.stringify({initial,hydraulic,errors,verified:'pause/resume, water delivery, zero flow, cascade, quality, tracking, labels, explode, 8 steps, orbit, both pan gestures, 1280 layout, gallery and cover'},null,2));
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
