// 地形：河谷 + 近岸石砌驳岸 + 等高线梯田（田面/田埂/田坎）+ 远山
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

const PN = new ImprovedNoise();
const noise = (x, z) => PN.noise(x, z, 0.371);
function fbm(x, z, oct = 4) {
  let a = 0.5, f = 1, s = 0;
  for (let i = 0; i < oct; i++) {
    s += a * noise(x * f, z * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
}
function ridged(x, z, oct = 5) {
  let a = 0.55, f = 1, s = 0, w = 1;
  for (let i = 0; i < oct; i++) {
    let n = 1 - Math.abs(noise(x * f + 11.3, z * f - 7.1) * 1.4);
    n = Math.max(0, n);
    n *= n;
    n *= w;
    w = Math.min(1, Math.max(0, n * 1.7));
    s += n * a;
    f *= 2.07;
    a *= 0.5;
  }
  return s;
}
export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// 梯田参数
export const TER = {
  BOTTOM: 2.5, // 最低一级田面高程
  STEP: 0.8, // 每级高差
  NLEV: 10,
  WF: 0.2, // 田坎（陡坎）占每级宽度比例
  RF: 0.13, // 田埂宽度比例
  RIDGE: 0.2, // 田埂高出田面
  WATER: 0.09, // 田水深
  X0: -46,
  X1: 74,
};
TER.TOP = TER.BOTTOM + (TER.NLEV - 1) * TER.STEP;
export const levelY = (k) => TER.BOTTOM + k * TER.STEP;
export const waterY = (k) => levelY(k) + TER.WATER;

// 河道（水面 y=0，河水沿 +X 方向流）
function meander(x) {
  return 26 * Math.sin(x * 0.0062 + 0.4) * smoothstep(70, 220, Math.abs(x));
}
export function nearBankZ(x) {
  const f = Math.exp(-((x / 16) ** 2));
  return 3.4 + (1 - f) * (2.4 * Math.sin(x * 0.031 + 0.6) + 1.6 * Math.sin(x * 0.0113 + 2.0)) + meander(x);
}
export function farBankZ(x) {
  return -15.5 + 3.5 * Math.sin(x * 0.017 + 1.2) + 1.8 * Math.sin(x * 0.043) + meander(x);
}

// 近岸山坡的“原始高程”，梯田等高线由它量化而来
export function nearRaw(x, z) {
  const s = z - nearBankZ(x);
  const steep = Math.exp(-((x / 13) ** 2));
  const bankW = 3.2 - 2.3 * steep;
  const bank = 2.3 * smoothstep(0, bankW, s);
  const sl = Math.max(0, s - bankW);
  const spur = 1.9 * Math.exp(-(((x - 3) / 24) ** 2)) * smoothstep(2, 12, s);
  const gully = -1.6 * Math.exp(-(((x + 24) / 9) ** 2)) * smoothstep(3, 14, s);
  const warp = 1.1 * fbm(x * 0.028 + 3.1, z * 0.034 - 1.7, 3) * smoothstep(2, 9, s);
  const tilt = -0.012 * x * smoothstep(3, 10, s);
  return bank + 0.28 * sl + spur + gully + warp + tilt;
}

const OUT = { h: 0, k: -9, u: 0, zw: 0, cls: 0, raw: 0 };
// cls: 0 河床 1 自然地面 2 田面 3 田埂 4 田坎 5 驳岸
export function sample(x, z, out = OUT) {
  const zN = nearBankZ(x), zF = farBankZ(x);
  out.k = -9;
  out.u = 0;
  out.zw = 0;
  out.raw = 0;
  if (z < zN && z > zF) {
    const inside = Math.min(zN - z, z - zF);
    let bed = -1.85 * smoothstep(0, 5.5, inside);
    bed += 0.22 * fbm(x * 0.15, z * 0.15, 3) * smoothstep(0, 2.5, inside);
    bed -= 0.55 * Math.exp(-((x * x) / 110 + ((z - 0.2) ** 2) / 9)); // 水车下方冲刷坑
    out.h = bed;
    out.cls = 0;
    return out;
  }
  if (z >= zN) {
    const s = z - zN;
    const raw = nearRaw(x, z);
    out.raw = raw;
    const e = Math.max(0, raw - (TER.TOP + 0.6));
    const mount = 0.55 * e + 0.012 * e * e + 70 * ridged(x * 0.0055, z * 0.0055) * smoothstep(45, 220, s);
    const rough = (0.25 + 0.02 * Math.min(s, 120)) * fbm(x * 0.11, z * 0.11, 3) * smoothstep(1, 4, s);
    const hNat = Math.min(raw + mount + rough, TER.TOP + 0.35);

    const wx = smoothstep(TER.X0, TER.X0 + 1.6, x) * (1 - smoothstep(TER.X1 - 1.6, TER.X1, x));
    const wTop = 1 - smoothstep(TER.TOP + TER.STEP * 0.55, TER.TOP + TER.STEP * 0.95, raw);
    const zw = wx * wTop;
    out.zw = zw;
    if (zw <= 0.0001) {
      out.h = hNat;
      out.cls = s < 1.2 && Math.abs(x) < 13 ? 5 : 1;
      return out;
    }
    // 量化成梯级
    const q = (raw - TER.BOTTOM) / TER.STEP;
    let k = Math.floor(q);
    let u = q - k;
    let T, cls;
    if (k < -1) {
      T = raw;
      cls = 1;
      k = -9;
    } else if (k === -1) {
      T = raw + (levelY(0) + TER.RIDGE - raw) * smoothstep(1 - TER.WF, 1, u);
      cls = u > 1 - TER.WF ? 4 : 1;
    } else {
      if (k >= TER.NLEV - 1) {
        u = (raw - TER.TOP) / TER.STEP;
        k = TER.NLEV - 1;
      }
      const L = levelY(k);
      if (u > 1 - TER.WF && k < TER.NLEV - 1) {
        T = L + (TER.STEP + TER.RIDGE) * smoothstep(1 - TER.WF, 1, u);
        cls = 4;
      } else {
        T = L + TER.RIDGE * (1 - smoothstep(TER.RF * 0.45, TER.RF, u));
        cls = u < TER.RF ? 3 : 2;
        if (cls === 2) T += 0.012 * noise(x * 1.7, z * 1.7);
      }
    }
    out.k = k;
    out.u = u;
    const distOut = Math.max(TER.X0 - x, x - TER.X1, 0);
    const berm = (1 - wx) * 0.9 * (1 - smoothstep(4, 14, distOut));
    out.h = zw * T + (1 - zw) * (hNat + berm);
    out.cls = zw > 0.5 ? cls : 1;
    return out;
  }
  // 对岸
  const s = zF - z;
  const mount = 85 * ridged(x * 0.005 + 5.0, z * 0.005) * smoothstep(35, 230, s);
  let h = 1.7 * smoothstep(0, 5, s) + 0.1 * s + 0.0035 * s * s * smoothstep(20, 80, s) + mount;
  h += (0.3 + 0.02 * Math.min(s, 120)) * fbm(x * 0.09, z * 0.09, 4) * smoothstep(1, 5, s);
  out.h = h;
  out.cls = 1;
  return out;
}

export function heightAt(x, z) {
  return sample(x, z, OUT).h;
}

// ———— 颜色 ————
const C = {
  bed: new THREE.Color('#5d5444'),
  sand: new THREE.Color('#8f8266'),
  grass: new THREE.Color('#5c7236'),
  grass2: new THREE.Color('#47592b'),
  forest: new THREE.Color('#34432a'),
  mud: new THREE.Color('#4a4128'),
  ridge: new THREE.Color('#5d7634'),
  wall: new THREE.Color('#6b5a3a'),
  wallGrass: new THREE.Color('#566b33'),
  rock: new THREE.Color('#77736a'),
  mason: new THREE.Color('#7a7468'),
};
const tmpC = new THREE.Color();

function colorFor(info, x, z, ny, h, out) {
  const n = fbm(x * 0.07, z * 0.07, 3);
  const n2 = noise(x * 0.6, z * 0.6);
  switch (info.cls) {
    case 0: {
      // 河床：深处偏暗，岸边浅沙
      const t = smoothstep(-0.7, 0.05, h);
      out.copy(C.bed).lerp(C.sand, t * 0.8);
      out.multiplyScalar(0.9 + 0.2 * n2);
      break;
    }
    case 2:
      out.copy(C.mud).multiplyScalar(0.9 + 0.25 * n);
      break;
    case 3:
      out.copy(C.ridge).lerp(C.grass2, 0.5 + 0.5 * n2);
      break;
    case 4:
      out.copy(C.wall).lerp(C.wallGrass, smoothstep(-0.2, 0.4, n + 0.35 * n2));
      break;
    case 5:
      out.copy(C.mason);
      break;
    default: {
      // 自然坡面：草地 → 林地 → 陡处岩石；岸边带沙
      out.copy(C.grass).lerp(C.grass2, smoothstep(-0.3, 0.4, n));
      out.lerp(C.forest, smoothstep(12, 40, h) * 0.8);
      const steep = 1 - smoothstep(0.55, 0.8, ny);
      out.lerp(C.rock, steep * 0.85);
      out.lerp(C.sand, (1 - smoothstep(0.05, 0.6, h)) * 0.7);
      // 高山更偏青灰
      out.lerp(tmpC.set('#5d6a5a'), smoothstep(60, 160, h) * 0.6);
    }
  }
  return out;
}

// 可变间距的一维采样
function axisSamples(min, max, denseMin, denseMax, dense, grow) {
  const a = [];
  for (let v = denseMin; v <= denseMax + 1e-6; v += dense) a.push(+v.toFixed(4));
  let step = dense, v = denseMin;
  while (v > min) {
    step *= grow;
    v -= step;
    a.unshift(Math.max(v, min));
  }
  step = dense;
  v = denseMax;
  while (v < max) {
    step *= grow;
    v += step;
    a.push(Math.min(v, max));
  }
  return a;
}

function gridGeometry(xs, zs, heightFn, colorPass, lowerFn) {
  const nx = xs.length, nz = zs.length;
  const pos = new Float32Array(nx * nz * 3);
  const uv = new Float32Array(nx * nz * 2);
  const infoK = new Int8Array(nx * nz);
  const infoZ = new Float32Array(nx * nz);
  const info = { h: 0, k: 0, u: 0, zw: 0, cls: 0 };
  const cls = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = xs[i], z = zs[j];
      sample(x, z, info);
      let h = info.h;
      if (lowerFn) h -= lowerFn(x, z);
      const id = j * nx + i;
      pos[id * 3] = x;
      pos[id * 3 + 1] = h;
      pos[id * 3 + 2] = z;
      uv[id * 2] = x * 0.22;
      uv[id * 2 + 1] = z * 0.22;
      infoK[id] = info.zw > 0.7 ? info.k : -9;
      infoZ[id] = info.zw;
      cls[id] = info.cls;
    }
  }
  const idx = [];
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      // 交替对角线减少条纹
      if ((i + j) & 1) idx.push(a, c, b, b, c, d);
      else idx.push(a, c, d, a, d, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(nx * nz > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  g.computeVertexNormals();
  // 颜色
  const col = new Float32Array(nx * nz * 3);
  const nrm = g.attributes.normal.array;
  const c = new THREE.Color();
  for (let id = 0; id < nx * nz; id++) {
    const x = pos[id * 3], h = pos[id * 3 + 1], z = pos[id * 3 + 2];
    colorFor({ cls: cls[id] }, x, z, nrm[id * 3 + 1], h, c);
    col[id * 3] = c.r;
    col[id * 3 + 1] = c.g;
    col[id * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return { geometry: g, nx, nz, infoK, infoZ, cls, pos };
}

// 梯田高精度块范围（与外围网格对齐到整数米）
export const PATCH = { x0: -36, x1: 40, z0: 1, z1: 43, d: 0.5 };

export function buildTerrain(detailTex) {
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: detailTex,
    roughness: 0.96,
    metalness: 0,
  });

  // 外围大地形（含远山）
  const xs = axisSamples(-36, 40, -36, 40, 1, 1.06);
  const zs = axisSamples(-19, 43, -19, 43, 1, 1.06);
  const lower = (x, z) => {
    if (x > PATCH.x0 + 0.01 && x < PATCH.x1 - 0.01 && z > PATCH.z0 + 0.01 && z < PATCH.z1 - 0.01) return 3.0;
    return 0;
  };
  const outer = gridGeometry(xs, zs, null, null, lower);
  const outerMesh = new THREE.Mesh(outer.geometry, mat);
  outerMesh.receiveShadow = true;
  outerMesh.name = 'terrain-outer';

  // 梯田高精度块
  const pxs = [], pzs = [];
  for (let x = PATCH.x0; x <= PATCH.x1 + 1e-6; x += PATCH.d) pxs.push(+x.toFixed(3));
  for (let z = PATCH.z0; z <= PATCH.z1 + 1e-6; z += PATCH.d) pzs.push(+z.toFixed(3));
  const patch = gridGeometry(pxs, pzs);
  const patchMesh = new THREE.Mesh(patch.geometry, mat);
  patchMesh.receiveShadow = true;
  patchMesh.name = 'terrain-terraces';

  // 梯田水面：同一级、且在梯田区内的三角形
  const wPos = [];
  const { nx, nz, infoK } = patch;
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      const k = infoK[a];
      if (k < 0) continue;
      if (infoK[b] !== k || infoK[c] !== k || infoK[d] !== k) continue;
      const y = waterY(k);
      const xa = pxs[i], xb = pxs[i + 1], za = pzs[j], zc = pzs[j + 1];
      wPos.push(xa, y, za, xa, y, zc, xb, y, zc, xa, y, za, xb, y, zc, xb, y, za);
    }
  }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3));
  const nrm = new Float32Array(wPos.length);
  for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
  wg.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));

  return { outerMesh, patchMesh, terraceWaterGeometry: wg, material: mat };
}

// 稻株位置：田面内部，横平竖直的插秧行列
export function ricePositions(spacing = 0.4) {
  const out = [];
  const info = { h: 0, k: 0, u: 0, zw: 0, cls: 0 };
  let seed = 12345;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let x = PATCH.x0 + 1; x < PATCH.x1 - 1; x += spacing) {
    for (let z = PATCH.z0 + 0.5; z < PATCH.z1 - 0.5; z += spacing) {
      const jx = x + (r() - 0.5) * 0.06, jz = z + (r() - 0.5) * 0.06;
      sample(jx, jz, info);
      if (info.zw < 0.995 || info.k < 0 || info.cls !== 2) continue;
      if (info.u < TER.RF + 0.05) continue;
      if (info.k < TER.NLEV - 1 && info.u > 1 - TER.WF - 0.04) continue;
      if (info.k === TER.NLEV - 1 && info.u > 0.45) continue;
      // 渡槽下方留出检修小路
      if (Math.abs(jx - 1.4) < 0.7) continue;
      out.push(jx, levelY(info.k), jz, r());
    }
  }
  return out;
}

// 沿等高线和下坡方向，规划“田间跌水口”串联路径
export function planCascade(x0, z0) {
  const info = { h: 0, k: 0, u: 0, zw: 0, cls: 0 };
  const grad = (x, z) => {
    const e = 0.3;
    return [(nearRaw(x + e, z) - nearRaw(x - e, z)) / (2 * e), (nearRaw(x, z + e) - nearRaw(x, z - e)) / (2 * e)];
  };
  const notches = [];
  let x = x0, z = z0;
  sample(x, z, info);
  let k = info.k;
  let side = 1;
  let seed = 77;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let iter = 0; iter < 14 && k > 0; iter++) {
    // 先沿等高线在本级田内走一段
    const walk = 3 + r() * 6;
    for (let t = 0; t < walk; t += 0.25) {
      const [gx, gz] = grad(x, z);
      const gl = Math.hypot(gx, gz) || 1;
      const cx = (-gz / gl) * side, cz = (gx / gl) * side;
      const nx = x + cx * 0.25, nz = z + cz * 0.25;
      sample(nx, nz, info);
      if (info.k !== k || info.zw < 0.995 || nx < TER.X0 + 4 || nx > TER.X1 - 4) {
        side = -side;
        break;
      }
      // 保持在田块中部
      const du = (info.u - 0.45) * 0.3;
      x = nx - (gx / gl) * du;
      z = nz - (gz / gl) * du;
    }
    side = r() < 0.6 ? -side : side;
    // 下坡越过田埂
    let top = null;
    let found = false;
    for (let t = 0; t < 12; t += 0.08) {
      const [gx, gz] = grad(x, z);
      const gl = Math.hypot(gx, gz) || 1;
      const dx = -gx / gl, dz = -gz / gl;
      x += dx * 0.08;
      z += dz * 0.08;
      sample(x, z, info);
      if (!top && info.k === k && info.u < TER.RF * 0.5) top = { x, z, dx, dz };
      if (info.k === k - 1 && info.u < 1 - TER.WF - 0.05) {
        found = true;
        break;
      }
    }
    if (!found || !top) break;
    notches.push({
      top: new THREE.Vector3(top.x, waterY(k), top.z),
      bottom: new THREE.Vector3(x, waterY(k - 1), z),
      dir: new THREE.Vector3(top.dx, 0, top.dz),
      k,
    });
    k -= 1;
  }
  return notches;
}
