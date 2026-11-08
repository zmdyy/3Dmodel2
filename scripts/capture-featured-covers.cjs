const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const deps = process.env.COVER_NODE_MODULES;
const { chromium } = require(path.join(deps, 'playwright'));
const sharp = require(path.join(deps, 'sharp'));

async function main() {
  assert.equal(process.env.GITHUB_REF, 'refs/heads/verify/wheel-axle-cover');
  const browser = await chromium.launch({
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve('models/wheel-axle.html')).href);
    await page.waitForFunction(() => window.__WA?.renderer.info.render.triangles > 1000);
    const state = await page.evaluate(() => ({
      revision: THREE.REVISION,
      webgl: __WA.renderer.getContext().getParameter(__WA.renderer.getContext().VERSION)
    }));
    assert.equal(state.revision, '160');
    assert.match(state.webgl, /WebGL/);
    const svg = page.locator('#wheelSvg');
    for (const id of ['screwdriver', 'wrench', 'faucet', 'windlass']) {
      await page.locator('[data-st="' + id + '"]').click();
      assert(await svg.isVisible(), id);
      await page.locator('#turn').evaluate(input => {
        input.value = '640';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      assert.equal(await page.evaluate(id => __WA.stations[id].t, id), .64);
      if (id === 'screwdriver') {
        await page.locator('#btnThread').click();
        assert(await page.evaluate(() => __WA.threadMode()));
      }
      if (id === 'faucet') {
        await page.locator('#btnCut').click();
        assert(await page.locator('#faucetGuide').isVisible());
        await page.locator('#btnCut').click();
      }
    }
    await page.addStyleTag({ content: '#stageToolbar,#panel,#labels,#leaders,.hint {display:none!important} :root {--scene-width:100%!important;--scene-height:100%!important;--toolbar-height:0px!important}' });
    await page.evaluate(() => {
      window.dispatchEvent(new Event('resize'));
      __WA.select('windlass', true);
      __WA.turn(.68);
      __WA.fly('windlass', true);
    });
    await page.waitForTimeout(500);
    assert.deepEqual(errors, []);
    const image = await page.screenshot({ type: 'jpeg', quality: 90 });
    const stats = await sharp(image).stats();
    assert(stats.channels.some(channel => channel.stdev > 20), 'Expected a rendered model');
    const dimensions = await sharp(image).metadata();
    assert.equal(dimensions.width, 960);
    assert.equal(dimensions.height, 540);
    fs.mkdirSync('cover-captures/featured', { recursive: true });
    fs.writeFileSync('cover-captures/featured/wheel-axle-scene.jpg', image);
    const output = 'assets/covers/wheel-axle-scene.jpg';
    fs.writeFileSync(output, image);
    execFileSync('git', ['config', 'user.name', 'github-actions[bot]']);
    execFileSync('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
    execFileSync('git', ['add', output]);
    execFileSync('git', ['commit', '-m', 'Capture actual wheel and axle WebGL scene']);
    execFileSync('git', ['push', 'origin', 'HEAD:refs/heads/verify/wheel-axle-cover'], { stdio: 'inherit' });
    console.log('Four scenes, controls, and actual cover verified:', JSON.stringify(state), image.length);
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
