const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(path.join(process.env.LAB_KIT_NODE_MODULES, 'playwright'));
const model = path.resolve('models/thermometers-thermal-expansion.html');
const ids = ['lab','wall','clinical','bimetal','gas','metal','bistrip','airplug','airbulb'];
const poses = ['front','side','back','detail','heater'];
const dot = (a,b) => a.reduce((total,n,i) => total + n * b[i], 0);
const diff = (a,b) => a.map((n,i) => n - b[i]);
function same(a,b,tolerance=1e-7) {
  assert.equal(a.length,b.length);
  for(let i=0;i<a.length;i++) assert(Math.abs(a[i]-b[i]) < tolerance, JSON.stringify({ a, b }));
}
async function pose(page) {
  return page.evaluate(() => {
    const c = thermo3D.camera;
    c.updateMatrixWorld(true);
    const m = c.matrixWorld.elements;
    return {eye:c.position.toArray(),right:m.slice(0,3),up:m.slice(4,7),back:m.slice(8,11),rot:c.quaternion.toArray()};
  });
}
async function allPresets(page) {
  return page.evaluate(({ids,poses}) => ids.flatMap(id => {
    thermo3D.select(id);
    return poses.map(type => {
      thermo3D.setView(type);
      const c=thermo3D.camera;
      return [...c.position.toArray(),...c.quaternion.toArray()];
    });
  }), {ids,poses});
}
async function main() {
  const markup = fs.readFileSync(model, 'utf8');
  const navigation = fs.readFileSync('shared/lab-kit/navigation.js','utf8').trimEnd();
  assert(markup.includes('<script id="lab-kit-navigation">\n'+navigation+'\n</script>'));
  const browser = await chromium.launch({ executablePath: process.env.LAB_KIT_CHROMIUM,
    args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'] });
  const errors = [], external = [];
  try {
    async function open(file, options={}) {
      const page=await browser.newPage({viewport:{width:1440,height:900},...options});
      page.on('pageerror',e=>errors.push(e.message));
      await page.route(/^https?:/,r=>{ external.push(r.request().url()); return r.abort(); });
      await page.goto(pathToFileURL(file).href);
      await page.waitForFunction(()=>window.thermo3D?.inspect().triangles>1000);
      return page;
    }
    const previous=await open(process.argv[2]);
    const expected=await allPresets(previous);
    await previous.close();
    const page=await open(model);
    const current=await allPresets(page);
    for(let i=0;i<expected.length;i++) same(current[i],expected[i]);
    await page.close();
    const actual=await open(model);
    const canvas=actual.locator('#viewport canvas');
    const box=await canvas.boundingBox();
    const x=box.x+box.width*.51,y=box.y+box.height*.42;
    async function drag(button,dx,dy,shift=false) {
      await actual.mouse.move(x,y);
      if(shift)await actual.keyboard.down('Shift');
      await actual.mouse.down({button});
      await actual.mouse.move(x+dx,y+dy,{steps:4});
      await actual.mouse.up({button});
      if(shift)await actual.keyboard.up('Shift');
    }
    const tabs=actual.locator('.nav .unit');
    assert.equal(await tabs.count(),9);
    for(let i=0;i<ids.length;i++){
      await tabs.nth(i).click();
      assert.equal(await actual.evaluate(()=>thermo3D.inspect().id),ids[i]);
      const base=await pose(actual);
      await drag('left',36,28);
      const orbit=await pose(actual), orbitalDelta=diff(orbit.eye,base.eye);
      assert(dot(orbitalDelta,base.right)<-.1 && dot(orbitalDelta,base.up)>.1, ids[i]+' orbit direction');
      await drag('right',28,20);
      const panned=await pose(actual),panDelta=diff(panned.eye,orbit.eye);
      same(orbit.rot,panned.rot);
      assert(dot(panDelta,orbit.right)<0 && dot(panDelta,orbit.up)>0 && Math.abs(dot(panDelta,orbit.back))<1e-7);
      await drag('left',28,20,true);
      const shifted=await pose(actual);
      same(panned.rot,shifted.rot);
      same(diff(shifted.eye,panned.eye),panDelta);
      await actual.mouse.wheel(0,-160);
      await actual.waitForFunction(({eye,back})=>thermo3D.camera.position.toArray().reduce((n,v,i)=>n+(v-eye[i])*back[i],0)<-.1,shifted);
      const zoomed=await pose(actual);
      same(shifted.rot,zoomed.rot);
      await actual.mouse.dblclick(x,y);
      same((await pose(actual)).eye,base.eye);
    }
    await actual.close();
    const touch=await open(model,{hasTouch:true,isMobile:true});
    const session=await touch.context().newCDPSession(touch);
    const touchBox=await touch.locator('#viewport canvas').boundingBox();
    const cx=touchBox.x+touchBox.width*.5,cy=touchBox.y+touchBox.height*.40;
    const point=(x,y,id)=>({x,y,id});
    const before=await pose(touch);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(cx-34,cy,1),point(cx+34,cy,2)]});
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(cx-56,cy+22,1),point(cx+72,cy+22,2)]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    const after=await pose(touch),touchDelta=diff(after.eye,before.eye);
    assert(dot(touchDelta,before.back)<-.1 && dot(touchDelta,before.up)>.1,JSON.stringify(touchDelta));
    same(before.rot,after.rot);
    assert.deepEqual(errors,[]);
    assert.deepEqual(external,[]);
    console.log('PASS: 9 views, 45 unchanged camera presets; orbit direction, right/Shift pan, wheel, double-click reset and two-finger pan/pinch; WebGL and no network requests.');
  } finally {await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
