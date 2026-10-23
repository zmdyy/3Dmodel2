// Capture the real WebGL canvas at 960×540. Hide UI; do not rebuild geometry.
const { chromium } = require('playwright');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');

(async () => {
  const root = path.resolve(__dirname, '..');
  const outJpg = path.join(root, 'assets/covers/archimedes-principle-scene.jpg');
  const launchOpts = {
    headless: true,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  };
  if (process.env.CHROMIUM_PATH || process.env.COVER_CHROMIUM) {
    launchOpts.executablePath = process.env.CHROMIUM_PATH || process.env.COVER_CHROMIUM;
  } else {
    launchOpts.channel = 'msedge';
  }
  const browser = await chromium.launch(launchOpts);
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(root, 'models/archimedes-principle.html')).href);
    await page.waitForFunction(() => typeof THREE !== 'undefined' && document.querySelector('#view'));
    await page.addStyleTag({ content: `
      html,body{margin:0!important;overflow:hidden!important;width:960px!important;height:540px!important}
      .top,.tabs,aside,.caption,#readinset,.label,.scene-tools,.gesture,.error,dialog{display:none!important}
      .layout,.stage{display:block!important;position:absolute!important;inset:0!important;width:960px!important;height:540px!important;min-height:0!important;border:0!important}
      #view{width:960px!important;height:540px!important}
    ` });
    await page.evaluate(() => new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 600)));
    }));
    await page.locator('#view').screenshot({ path: outJpg, type: 'jpeg', quality: 92 });
    if (errors.length) throw new Error(errors.join('\n'));
    const stat = fs.statSync(outJpg);
    if (!stat.size) throw new Error('Empty screenshot');
    console.log('Created assets/covers/archimedes-principle-scene.jpg (960×540) from the 3D scene.', stat.size);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
