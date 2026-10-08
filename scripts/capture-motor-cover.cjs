// Requires Playwright and Chromium. Run from the repository root.
const { chromium } = require('playwright');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(root, 'models/motor-principles.html')).href);
    await page.waitForFunction(() => window.motorDemo && window.selectExperiment);
    await page.evaluate(() => { window.selectExperiment('motor'); window.motorDemo.reset(); });
    await page.addStyleTag({ content: `
      .experiment-nav,header,.panel,.contacts,.topline,.legend{display:none!important}
      #motorApp{height:100vh!important;min-height:0!important}
      #motorApp .layout{display:block!important;padding:0!important;height:100vh!important}
      #motorApp .visual,#motorApp .stage{height:100vh!important;min-height:0!important}
      #motorApp .stage{border:0!important;border-radius:0!important}
    ` });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.locator('#motorApp #scene').screenshot({ path: path.join(root, 'assets/covers/motor-principles.png') });
    if (errors.length) throw new Error(errors.join('\n'));
    if (!fs.statSync(path.join(root, 'assets/covers/motor-principles.png')).size) throw new Error('Empty screenshot');
    console.log('Created assets/covers/motor-principles.png (960×540) from the 3D scene.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
