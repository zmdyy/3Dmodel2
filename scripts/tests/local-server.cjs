// Start start-local.cmd (or scripts/serve-local.ps1), then pass its printed URL.
// Uses only Node built-ins. Tests the real server, including bytes and headers.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = new URL(process.argv[2]);
assert.equal(base.hostname, '127.0.0.1');
const root = path.resolve(__dirname, '../..');
function request(target, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({hostname: base.hostname, port: base.port, path: target, method}, res => {
      const chunks = [];
      res.on('data', data => chunks.push(data));
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks)}));
      res.on('error', reject);
    });
    req.setTimeout(20000, () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
    req.end();
  });
}
(async () => {
  const files = [
    ['index.html', 'text/html'],
    ['models/dz47-1p-v52.glb', 'model/gltf-binary'],
    ['assets/models/piston-pump-v2.glb', 'model/gltf-binary'],
    ['shared/water-wheel/main.js', 'text/javascript'],
    ['shared/vendor/three-r160/build/three.module.js', 'text/javascript'],
    ['shared/textures/earth-atmos-r144.jpg', 'image/jpeg'],
    ['shared/textures/earth-clouds-r144.png', 'image/png']
  ];
  // Concurrent model, module and texture loads, matching how browsers load cases.
  await Promise.all(files.map(async ([file, mime]) => {
    const res = await request('/' + file + '?local-test=1');
    assert.equal(res.status, 200, file);
    assert.ok(res.headers['content-type'].startsWith(mime), file);
    assert.deepEqual(res.body, fs.readFileSync(path.join(root, file)), file);
  }));
  const home = await request('/');
  assert.deepEqual(home.body, fs.readFileSync(path.join(root, 'index.html')));
  const head = await request('/models/dz47-1p-v52.glb', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  assert.equal(Number(head.headers['content-length']), fs.statSync(path.join(root, 'models/dz47-1p-v52.glb')).size);
  for (const target of ['/.git/config', '/%2e%2e/README.md', '/%2e%2e%5cREADME.md', '/index.html%3afoo']) {
    assert.equal((await request(target)).status, 403, target);
  }
  assert.equal((await request('/not-a-real-file')).status, 404);
  assert.equal((await request('/', 'POST')).status, 405);
  console.log('PASS: real local server; concurrent GLB/module/texture bytes and MIME; query strings; index; HEAD; 403/404/405');
})().catch(error => { console.error(error); process.exitCode = 1; });
