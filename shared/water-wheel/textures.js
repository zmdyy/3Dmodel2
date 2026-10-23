// 程序化纹理：全部用 Canvas 现场绘制，不依赖任何外部图片
import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function finish(c, { srgb = true, repeat = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

// 老木头：纵向木纹（沿 V 方向），带节疤与风化斑
export function woodTexture({ base = '#77583a', dark = '#3f2a18', light = '#a58260', seed = 3, weather = 0.5 } = {}) {
  const w = 256, h = 1024;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  // 宽色带
  for (let i = 0; i < 18; i++) {
    const x = r() * w, bw = 8 + r() * 40;
    g.globalAlpha = 0.08 + r() * 0.12;
    g.fillStyle = r() < 0.5 ? dark : light;
    g.fillRect(x, 0, bw, h);
  }
  // 细木纹
  for (let i = 0; i < 260; i++) {
    let x = r() * w;
    g.strokeStyle = r() < 0.6 ? dark : light;
    g.globalAlpha = 0.06 + r() * 0.25;
    g.lineWidth = 0.4 + r() * 1.8;
    g.beginPath();
    g.moveTo(x, 0);
    const wob = 0.6 + r() * 1.5;
    for (let y = 0; y <= h; y += 12) {
      x += (r() - 0.5) * wob;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // 节疤
  for (let i = 0; i < 5; i++) {
    const x = r() * w, y = r() * h, rr = 4 + r() * 9;
    const grd = g.createRadialGradient(x, y, 0, x, y, rr * 2.6);
    grd.addColorStop(0, 'rgba(35,20,10,0.9)');
    grd.addColorStop(0.35, 'rgba(60,38,20,0.5)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 1;
    g.fillStyle = grd;
    g.beginPath();
    g.ellipse(x, y, rr * 1.2, rr * 3, 0, 0, Math.PI * 2);
    g.fill();
  }
  // 风化：灰白斑与水渍
  for (let i = 0; i < 90 * weather; i++) {
    const x = r() * w, y = r() * h, rr = 10 + r() * 60;
    const grd = g.createRadialGradient(x, y, 0, x, y, rr);
    const grey = r() < 0.55;
    grd.addColorStop(0, grey ? 'rgba(150,140,125,0.22)' : 'rgba(30,25,15,0.22)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  // 细裂纹
  g.globalAlpha = 0.5;
  g.strokeStyle = '#24170c';
  for (let i = 0; i < 14; i++) {
    let x = r() * w, y = r() * h;
    g.lineWidth = 0.6 + r();
    g.beginPath();
    g.moveTo(x, y);
    const len = 40 + r() * 160;
    for (let k = 0; k < len; k += 6) {
      x += (r() - 0.5) * 1.2;
      y += 6;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  return finish(c);
}

// 竹材：纵向纤维 + 色差
export function bambooTexture({ seed = 7 } = {}) {
  const w = 128, h = 512;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const r = rng(seed);
  const grd = g.createLinearGradient(0, 0, w, 0);
  grd.addColorStop(0, '#a99a5a');
  grd.addColorStop(0.5, '#c2b06a');
  grd.addColorStop(1, '#a3925a');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) {
    const x = r() * w;
    g.globalAlpha = 0.05 + r() * 0.18;
    g.strokeStyle = r() < 0.5 ? '#6f6232' : '#e0d08e';
    g.lineWidth = 0.5 + r() * 1.2;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + (r() - 0.5) * 3, h);
    g.stroke();
  }
  for (let i = 0; i < 30; i++) {
    const x = r() * w, y = r() * h, rr = 6 + r() * 30;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, r() < 0.5 ? 'rgba(80,90,40,0.25)' : 'rgba(90,70,40,0.25)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 1;
    g.fillStyle = gr;
    g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  return finish(c);
}

// 砌石：带灰缝的块石
export function stoneTexture({ seed = 11, blocky = true, tint = [128, 124, 116] } = {}) {
  const w = 512, h = 512;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const r = rng(seed);
  g.fillStyle = '#4c4840';
  g.fillRect(0, 0, w, h);
  if (blocky) {
    let y = 0;
    while (y < h) {
      const rowH = 50 + r() * 50;
      let x = -r() * 60;
      while (x < w) {
        const bw = 70 + r() * 110;
        const v = (r() - 0.5) * 40;
        const col = `rgb(${tint[0] + v | 0},${tint[1] + v | 0},${tint[2] + v * 0.8 | 0})`;
        g.fillStyle = col;
        const pad = 3 + r() * 3;
        roundRect(g, x + pad, y + pad, bw - pad * 2, rowH - pad * 2, 10);
        g.fill();
        // 块面斑驳
        for (let k = 0; k < 10; k++) {
          const sx = x + r() * bw, sy = y + r() * rowH, sr = 4 + r() * 16;
          const gr = g.createRadialGradient(sx, sy, 0, sx, sy, sr);
          gr.addColorStop(0, r() < 0.5 ? 'rgba(30,30,25,0.25)' : 'rgba(200,195,180,0.18)');
          gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr;
          g.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
        }
        x += bw;
      }
      y += rowH;
    }
    // 苔藓
    for (let k = 0; k < 40; k++) {
      const sx = r() * w, sy = r() * h, sr = 8 + r() * 30;
      const gr = g.createRadialGradient(sx, sy, 0, sx, sy, sr);
      gr.addColorStop(0, 'rgba(70,95,40,0.35)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    }
  } else {
    noiseFill(g, w, h, r, tint);
  }
  return finish(c);
}

function roundRect(g, x, y, w, h, rad) {
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad);
  g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad);
  g.arcTo(x, y, x + w, y, rad);
  g.closePath();
}

function noiseFill(g, w, h, r, tint) {
  const img = g.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) {
    const v = (r() - 0.5) * 50;
    img.data[i * 4] = tint[0] + v;
    img.data[i * 4 + 1] = tint[1] + v;
    img.data[i * 4 + 2] = tint[2] + v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

// 麻绳：斜向捻纹
export function ropeTexture() {
  const w = 64, h = 64;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = '#8a7650';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#4e4026';
  g.lineWidth = 3;
  for (let i = -w; i < w * 2; i += 10) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + h, h);
    g.stroke();
  }
  g.strokeStyle = 'rgba(220,200,150,0.4)';
  g.lineWidth = 1.5;
  for (let i = -w + 4; i < w * 2; i += 10) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + h, h);
    g.stroke();
  }
  return finish(c);
}

// 茅草
export function thatchTexture() {
  const w = 256, h = 256;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const r = rng(21);
  g.fillStyle = '#7d6a42';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) {
    const x = r() * w, y = r() * h, l = 20 + r() * 50;
    g.strokeStyle = r() < 0.5 ? 'rgba(170,150,95,0.6)' : 'rgba(70,55,30,0.6)';
    g.lineWidth = 0.6 + r() * 1.2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 6, y + l);
    g.stroke();
  }
  return finish(c);
}

// 地表细节灰度噪声（乘在顶点色上）
export function detailTexture() {
  const w = 512, h = 512;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const r = rng(5);
  const img = g.createImageData(w, h);
  // 多层可平铺值噪声
  const layers = [
    { n: 8, a: 0.45 },
    { n: 32, a: 0.3 },
    { n: 128, a: 0.25 },
  ];
  const vals = new Float32Array(w * h);
  for (const L of layers) {
    const grid = [];
    for (let i = 0; i < L.n * L.n; i++) grid.push(r());
    const cell = w / L.n;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const gx = x / cell, gy = y / cell;
        const x0 = Math.floor(gx), y0 = Math.floor(gy);
        const fx = gx - x0, fy = gy - y0;
        const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
        const a = grid[(y0 % L.n) * L.n + (x0 % L.n)];
        const b = grid[(y0 % L.n) * L.n + ((x0 + 1) % L.n)];
        const cc = grid[((y0 + 1) % L.n) * L.n + (x0 % L.n)];
        const d = grid[((y0 + 1) % L.n) * L.n + ((x0 + 1) % L.n)];
        vals[y * w + x] += L.a * ((a * (1 - sx) + b * sx) * (1 - sy) + (cc * (1 - sx) + d * sx) * sy);
      }
    }
  }
  for (let i = 0; i < w * h; i++) {
    const v = Math.max(0, Math.min(255, (0.8 + (vals[i] - 0.5) * 0.75) * 255 + (r() - 0.5) * 30));
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return finish(c, { srgb: false });
}

// 可平铺的水面法线贴图（由整数频率正弦波叠加，保证无缝）
export function waterNormalTexture(size = 256, seed = 9) {
  const r = rng(seed);
  const waves = [];
  for (let i = 0; i < 28; i++) {
    const kx = Math.round((r() - 0.5) * 14);
    const ky = Math.round((r() - 0.5) * 14);
    if (kx === 0 && ky === 0) continue;
    const amp = 1 / Math.pow(Math.hypot(kx, ky), 1.25);
    waves.push({ kx, ky, amp, ph: r() * Math.PI * 2 });
  }
  const hgt = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      for (const wv of waves) v += wv.amp * Math.sin(((wv.kx * x + wv.ky * y) / size) * Math.PI * 2 + wv.ph);
      hgt[y * size + x] = v;
    }
  }
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const s = 2.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = hgt[y * size + ((x - 1 + size) % size)];
      const rr = hgt[y * size + ((x + 1) % size)];
      const d = hgt[((y - 1 + size) % size) * size + x];
      const u = hgt[((y + 1) % size) * size + x];
      let nx = (l - rr) * s, ny = (d - u) * s, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      const i = (y * size + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return finish(c, { srgb: false });
}

// 柔和圆点（粒子、雾）
export function softSprite(size = 64, inner = 0.0) {
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, size * inner * 0.5, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return finish(c, { repeat: false });
}

// 云雾片
export function mistTexture() {
  const w = 512, h = 256;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const r = rng(33);
  for (let i = 0; i < 60; i++) {
    const x = w * 0.15 + r() * w * 0.7, y = h * 0.3 + r() * h * 0.4, rr = 30 + r() * 90;
    const grd = g.createRadialGradient(x, y, 0, x, y, rr);
    grd.addColorStop(0, 'rgba(255,255,255,0.16)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  }
  return finish(c, { repeat: false });
}

// 竹叶簇（带透明）
export function bambooLeafTexture() {
  const w = 256, h = 256;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const r = rng(44);
  for (let i = 0; i < 70; i++) {
    const x = 20 + r() * (w - 40), y = 20 + r() * (h - 40);
    const ang = (r() - 0.5) * 1.6 + Math.PI / 2;
    const len = 34 + r() * 30, wid = 5 + r() * 4;
    const v = r();
    g.fillStyle = `rgb(${60 + v * 50 | 0},${105 + v * 50 | 0},${35 + v * 25 | 0})`;
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(wid, len * 0.4, 0, len);
    g.quadraticCurveTo(-wid, len * 0.4, 0, 0);
    g.fill();
    g.restore();
  }
  const t = finish(c, { repeat: false });
  return t;
}

// 流水条纹（渡槽、跌水）
export function flowTexture() {
  const w = 64, h = 256;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const r = rng(55);
  g.fillStyle = '#6f9fb0';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) {
    const x = r() * w, y = r() * h, l = 10 + r() * 50;
    g.strokeStyle = `rgba(235,248,255,${0.15 + r() * 0.45})`;
    g.lineWidth = 0.6 + r() * 1.8;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 3, y + l);
    g.stroke();
    // wrap
    g.beginPath();
    g.moveTo(x, y - h);
    g.lineTo(x + (r() - 0.5) * 3, y - h + l);
    g.stroke();
  }
  return finish(c);
}

// 阔叶树叶簇（透明卡片）
export function leafClusterTexture({ seed = 61, hue = [62, 92, 38], spread = 40 } = {}) {
  const w = 256, h = 256;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const r = rng(seed);
  for (let i = 0; i < 260; i++) {
    const ang = r() * Math.PI * 2;
    const rad = Math.pow(r(), 0.6) * 112;
    const x = 128 + Math.cos(ang) * rad, y = 128 + Math.sin(ang) * rad;
    const v = r();
    const dark = 1 - rad / 160;
    const R = (hue[0] + v * spread * 0.8) * (0.65 + 0.45 * (1 - dark));
    const G = (hue[1] + v * spread) * (0.65 + 0.45 * (1 - dark));
    const B = (hue[2] + v * spread * 0.4) * (0.65 + 0.45 * (1 - dark));
    g.fillStyle = `rgb(${R | 0},${G | 0},${B | 0})`;
    g.save();
    g.translate(x, y);
    g.rotate(r() * Math.PI * 2);
    const L = 9 + r() * 9, Wd = 4 + r() * 3;
    g.beginPath();
    g.moveTo(0, -L);
    g.quadraticCurveTo(Wd, 0, 0, L);
    g.quadraticCurveTo(-Wd, 0, 0, -L);
    g.fill();
    g.restore();
  }
  return finish(c, { repeat: false });
}

// 杉树枝（针叶羽状）
export function firBranchTexture({ seed = 71 } = {}) {
  const w = 128, h = 256;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const r = rng(seed);
  // 主枝从底部中点向上
  g.strokeStyle = '#3b2e1e';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(64, 256);
  g.quadraticCurveTo(66, 120, 64, 6);
  g.stroke();
  for (let i = 0; i < 46; i++) {
    const t = i / 46;
    const y = 250 - t * 240;
    const len = (1 - t * 0.75) * 56 * (0.7 + r() * 0.4);
    for (const s of [-1, 1]) {
      g.strokeStyle = '#33502a';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(64, y);
      const ex = 64 + s * len, ey = y - len * 0.35;
      g.lineTo(ex, ey);
      g.stroke();
      // 针叶
      for (let k = 0; k < len; k += 3) {
        const px = 64 + s * k, py = y - k * 0.35;
        const v = r();
        g.strokeStyle = `rgb(${(38 + v * 30) | 0},${(70 + v * 40) | 0},${(34 + v * 20) | 0})`;
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px + s * 4 + (r() - 0.5) * 3, py - 7 - r() * 4);
        g.moveTo(px, py);
        g.lineTo(px + s * 4 + (r() - 0.5) * 3, py + 5 + r() * 3);
        g.stroke();
      }
    }
  }
  return finish(c, { repeat: false });
}
