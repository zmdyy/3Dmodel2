// 附属设施：渡槽、承水槽水面、田间跌水、导流堰、驳岸、河石、茅屋
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { W, beamGeo } from './wheel.js';
import { heightAt, sample, TER, waterY, levelY, planCascade, nearBankZ, farBankZ } from './terrain.js';
import { flowMaterial } from './water.js';
import { rng } from './textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function merge(list) {
  const clean = list.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
    return n;
  });
  return mergeGeometries(clean, false);
}
function worldUV(geo, s = 0.4) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ay > 0.7) uv.setXY(i, x * s, z * s);
    else if (ax > 0.6) uv.setXY(i, z * s, y * s);
    else uv.setXY(i, x * s, y * s);
  }
  return geo;
}

export function findAqueductEnd(x) {
  const info = { h: 0, k: 0, u: 0, zw: 0, cls: 0 };
  for (let z = 6; z < 48; z += 0.05) {
    sample(x, z, info);
    if (info.k === TER.NLEV - 1 && info.zw > 0.99 && info.u > TER.RF + 0.02) return z + 0.6;
  }
  return 26;
}

export function buildStructures(scene, tex, registry, particles) {
  const T = W.trough;
  const out = { update: () => {} };
  const woodMat = new THREE.MeshStandardMaterial({ map: tex.woodOld, color: '#e6d8c0', roughness: 0.88 });
  const stoneMat = new THREE.MeshStandardMaterial({ map: tex.stone, color: '#aaa397', roughness: 0.95 });

  // ———————— 渡槽 ————————
  const ax = T.outletX;
  const z0 = T.z1 - 0.02;
  const zEnd = findAqueductEnd(ax);
  const yS = T.yBot - 0.02;
  const yE = waterY(TER.NLEV - 1) + 0.36;
  const yAt = (z) => yS + ((yE - yS) * (z - z0)) / (zEnd - z0);
  out.aqueduct = { x: ax, z0, z1: zEnd, yS, yE, yAt };
  {
    const g = [];
    const a = V(ax, yS, z0), b = V(ax, yE, zEnd);
    const up = V(0, 1, 0);
    g.push(beamGeo(a, b, 0.54, 0.045, up));
    for (const sx of [-1, 1]) {
      g.push(beamGeo(V(ax + sx * 0.25, yS + 0.17, z0), V(ax + sx * 0.25, yE + 0.17, zEnd), 0.04, 0.32, up));
      // 槽下纵梁
      g.push(beamGeo(V(ax + sx * 0.18, yS - 0.08, z0 + 0.3), V(ax + sx * 0.18, yE - 0.08, zEnd), 0.08, 0.1, up));
    }
    // 槽箍
    for (let z = z0 + 0.6; z < zEnd - 0.2; z += 1.2) {
      const y = yAt(z);
      g.push(beamGeo(V(ax - 0.31, y - 0.04, z), V(ax + 0.31, y - 0.04, z), 0.06, 0.06, V(0, 0, 1)));
      for (const sx of [-1, 1]) g.push(beamGeo(V(ax + sx * 0.29, y - 0.06, z), V(ax + sx * 0.29, y + 0.36, z), 0.05, 0.06, V(0, 0, 1)));
      g.push(beamGeo(V(ax - 0.31, y + 0.35, z), V(ax + 0.31, y + 0.35, z), 0.05, 0.05, V(0, 0, 1)));
    }
    // 排架
    let prevZ = null;
    for (let z = 3.8; z < zEnd - 0.6; z += 2.7) {
      const y = yAt(z) - 0.14;
      g.push(beamGeo(V(ax - 0.75, y, z), V(ax + 0.75, y, z), 0.14, 0.14, V(0, 0, 1)));
      let minG = 1e9;
      for (const sx of [-1, 1]) {
        const fx = ax + sx * 0.75;
        const gy = heightAt(fx, z);
        minG = Math.min(minG, gy);
        g.push(beamGeo(V(ax + sx * 0.5, y, z), V(fx, gy - 0.15, z), 0.13, 0.13, V(0, 0, 1)));
        const ft = new THREE.BoxGeometry(0.4, 0.3, 0.4);
        ft.translate(fx, gy + 0.02, z);
        g.push(ft);
      }
      const hgt = y - minG;
      if (hgt > 2.6) {
        const ym = minG + hgt * 0.45;
        g.push(beamGeo(V(ax - 0.8, ym, z), V(ax + 0.8, ym, z), 0.1, 0.1, V(0, 0, 1)));
        g.push(beamGeo(V(ax - 0.62, ym, z), V(ax + 0.55, y - 0.1, z), 0.07, 0.07, V(0, 0, 1)));
      }
      if (prevZ !== null && hgt > 3.2) {
        // 纵向剪刀撑
        g.push(beamGeo(V(ax, yAt(prevZ) - 0.25, prevZ), V(ax, Math.max(minG + 1.5, yAt(z) - hgt * 0.6), z), 0.07, 0.07, V(1, 0, 0)));
      }
      prevZ = z;
    }
    const aq = new THREE.Mesh(merge(g), woodMat.clone());
    aq.castShadow = true;
    aq.receiveShadow = true;
    const grp = new THREE.Group();
    grp.add(aq);
    scene.add(grp);
    registry.add('aqueduct', grp);
    out.aqueductGroup = grp;
  }

  // 渡槽水流
  const aqFlow = flowMaterial(tex.flow, { speed: 0.75, repeat: 1, opacity: 0.88 });
  {
    const len = Math.hypot(zEnd - z0, yE - yS);
    const geo = new THREE.PlaneGeometry(0.44, len, 1, Math.ceil(len));
    // 局部：x 横向，y 沿槽长
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, (1 - uv.getY(i)) * len * 0.45);
    geo.rotateX(-Math.PI / 2); // y→-z
    geo.rotateY(Math.PI); // 让 +z 为下游
    const m = new THREE.Mesh(geo, aqFlow);
    const ang = Math.atan2(yS - yE, zEnd - z0);
    m.rotation.x = ang;
    m.position.set(ax, (yS + yE) / 2 + 0.1, (z0 + zEnd) / 2);
    m.renderOrder = 2;
    scene.add(m);
    out.aqueductWater = m;
  }
  // 承水槽水面
  const troughFlowL = flowMaterial(tex.flow, { speed: 0.5, opacity: 0.9 });
  {
    const mk = (x0, x1, dirSign) => {
      const geo = new THREE.PlaneGeometry(T.z1 - T.z0 - 0.09, Math.abs(x1 - x0), 1, 4);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, (dirSign > 0 ? 1 - uv.getY(i) : uv.getY(i)) * Math.abs(x1 - x0) * 0.5);
      geo.rotateX(-Math.PI / 2);
      geo.rotateY(Math.PI / 2);
      const m = new THREE.Mesh(geo, troughFlowL);
      m.position.set((x0 + x1) / 2, T.yBot + 0.12, (T.z0 + T.z1) / 2);
      m.renderOrder = 2;
      scene.add(m);
      return m;
    };
    out.troughWater = [mk(T.x0 + 0.05, T.outletX, 1), mk(T.outletX, T.x1 - 0.05, -1)];
  }

  // ———————— 田间跌水 ————————
  const notches = planCascade(ax + 0.6, zEnd + 0.8);
  out.notches = notches;
  const sheetMat = flowMaterial(tex.flow, { speed: 1.4, opacity: 0.75 });
  const sheets = [];
  for (const n of notches) {
    const top = n.top.clone().addScaledVector(n.dir, -0.05);
    top.y = levelY(n.k) + TER.RIDGE * 0.6;
    const bot = n.bottom.clone();
    const mid = top.clone().addScaledVector(n.dir, 0.35);
    mid.y = (top.y + bot.y) / 2;
    const curve = new THREE.QuadraticBezierCurve3(top, mid.clone().setY(top.y - 0.05), V(mid.x, bot.y, mid.z).addScaledVector(n.dir, 0.15));
    const pts = curve.getPoints(10);
    const side = V(-n.dir.z, 0, n.dir.x).multiplyScalar(0.16);
    const pos = [], uvs = [], idx = [];
    pts.forEach((p, i) => {
      pos.push(p.x - side.x, p.y, p.z - side.z, p.x + side.x, p.y, p.z + side.z);
      uvs.push(0, i * 0.12, 1, i * 0.12);
      if (i > 0) {
        const a = (i - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, sheetMat);
    m.renderOrder = 2;
    scene.add(m);
    sheets.push(m);
    n.landing = V(mid.x, bot.y, mid.z).addScaledVector(n.dir, 0.15);
    // 田埂缺口两侧压石
    for (const sd of [-1, 1]) {
      const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), stoneMat);
      st.position.copy(top).addScaledVector(side, sd * 1.5);
      st.position.y = levelY(n.k) + 0.17;
      st.scale.set(1.3, 0.7, 1);
      st.castShadow = true;
      scene.add(st);
    }
  }

  // ———————— 导流堰 ————————
  const weirSegs = [];
  {
    const pts = [V(-34, 0, farBankZ(-34) + 0.5), V(-24, 0, -10.2), V(-14, 0, -5.4), V(-6.4, 0, -2.2)];
    for (let i = 0; i < pts.length - 1; i++) weirSegs.push(new THREE.Vector4(pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z));
    const r = rng(91);
    const base = new THREE.IcosahedronGeometry(1, 1);
    const items = [];
    const curve = new THREE.CatmullRomCurve3(pts);
    const L = curve.getLength();
    for (let s = 0; s < L; s += 0.42) {
      const p = curve.getPointAt(s / L);
      for (let k = 0; k < 2; k++) {
        const sc = 0.35 + r() * 0.4;
        const off = (r() - 0.5) * 1.1;
        const tan = curve.getTangentAt(s / L);
        const nrm = V(-tan.z, 0, tan.x);
        const pos = p.clone().addScaledVector(nrm, off);
        pos.y = Math.max(heightAt(pos.x, pos.z), -1.2) + sc * 0.55 + 0.02 * k;
        if (pos.y > 0.35) pos.y = 0.35;
        const m = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), V(sc * 1.25, sc * 0.75, sc));
        items.push(m);
      }
    }
    const g = rockGeometry(base, 3);
    const mesh = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ map: tex.stone, color: '#b7b1a5', roughness: 0.9 }), items.length);
    items.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    const grp = new THREE.Group();
    grp.add(mesh);
    scene.add(grp);
    registry.add('weir', grp);
    out.weirSegs = weirSegs;
    out.weirMid = curve.getPointAt(0.55);
  }

  // ———————— 石砌驳岸 ————————
  {
    const g = [];
    const x0 = -13.5, x1 = 13.5;
    for (let c = 0; c < 6; c++) {
      const y0 = -1.4 + c * 0.64, y1 = y0 + 0.62;
      const zz = 3.42 - c * 0.04;
      const b = new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.9);
      b.translate((x0 + x1) / 2, (y0 + y1) / 2, zz + 0.45);
      g.push(b);
    }
    // 压顶条石
    const cap = new THREE.BoxGeometry(x1 - x0 + 0.2, 0.18, 1.0);
    cap.translate(0, 2.47, 3.6);
    g.push(cap);
    // 下河石阶
    for (let i = 0; i < 9; i++) {
      const st = new THREE.BoxGeometry(1.4, 0.3, 0.42);
      st.translate(-11.2, 2.3 - i * 0.3, 3.15 - i * 0.36);
      g.push(st);
    }
    const geo = worldUV(merge(g), 0.45);
    const m = new THREE.Mesh(geo, stoneMat);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  }

  // ———————— 每帧更新：入田水流 ————————
  let acc = 0, nAcc = 0;
  const cascade = new Float32Array(notches.length);
  out.cascade = cascade;
  out.update = (dt, pourRate, wheelOmega, streams) => {
    const level = Math.min(1, pourRate / 0.0025);
    aqFlow.uniforms.level.value = level;
    out.aqueductWater.visible = level > 0.005;
    troughFlowL.uniforms.level.value = level;
    out.troughWater.forEach(m => m.visible = level > 0.005);
    for (let i=0;i<cascade.length;i++) {
      cascade[i] += ((i===0 ? level : cascade[i-1]) - cascade[i]) * Math.min(1,dt*0.7);
      sheets[i].visible = cascade[i] > 0.02;
    }
    out.aqueductWater.position.y = (yS + yE) / 2 + 0.05 + 0.07 * level;
    out.troughWater.forEach((m) => (m.position.y = T.yBot + 0.1 + 0.1 * level));
    if (!particles) return;
    if (streams) streams.add(V(ax, yE + 0.12, zEnd + 0.03), V(0, -0.05, 0.95), waterY(TER.NLEV - 1), 0.38, 0.85 * level);
    // 渡槽出口落水
    acc += dt * 160 * level;
    const dz = zEnd - z0, dy = yE - yS;
    const ld = Math.hypot(dz, dy);
    while (acc >= 1) {
      acc -= 1;
      particles.emit(ax + (Math.random() - 0.5) * 0.38, yE + 0.05 + Math.random() * 0.06, zEnd + 0.02, (Math.random() - 0.5) * 0.15, -0.1, 0.9 + Math.random() * 0.4 + (dz / ld) * 0.2, 0.05 + Math.random() * 0.03, waterY(TER.NLEV - 1), 0);
    }
    // 田间跌水口
    nAcc += dt * 26;
    while (nAcc >= 1) {
      nAcc -= 1;
      for (let i=0; i<notches.length; i++) {
        const n = notches[i];
        if (Math.random() > cascade[i]*0.5) continue;
        const sx = (Math.random() - 0.5) * 0.25;
        const l = n.landing;
        particles.emit(l.x + n.dir.z * sx, waterY(n.k - 1) + 0.03, l.z - n.dir.x * sx, n.dir.x * 0.4 + (Math.random() - 0.5) * 0.4, 0.6 + Math.random() * 0.7, n.dir.z * 0.4 + (Math.random() - 0.5) * 0.4, 0.03, waterY(n.k - 1), 1);
      }
    }
  };
  return out;
}

export function rockGeometry(base, seed) {
  const r = rng(seed);
  const g = base.clone();
  const p = g.attributes.position;
  const map = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!map.has(key)) map.set(key, 0.75 + r() * 0.45);
    const k = map.get(key);
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  // 世界 UV
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 0.6 + p.getZ(i) * 0.3, p.getY(i) * 0.6);
  return g;
}

function buildHut(scene, tex, at) {
  const grp = new THREE.Group();
  const y = heightAt(at.x, at.z);
  // 寻找下坡最低角，石基补足高差
  let minY = y, maxY = y;
  for (const [dx, dz] of [[-3, -2.4], [3, -2.4], [-3, 2.4], [3, 2.4]]) {
    const h = heightAt(at.x + dx, at.z + dz);
    minY = Math.min(minY, h);
    maxY = Math.max(maxY, h);
  }
  const floor = maxY + 0.3;
  const stone = new THREE.MeshStandardMaterial({ map: tex.stone, roughness: 0.95 });
  const base = new THREE.BoxGeometry(6.4, floor - minY + 0.4, 5.2);
  base.translate(0, (floor + minY - 0.4) / 2 - floor, 0);
  worldUV(base, 0.5);
  const wall = new THREE.MeshStandardMaterial({ color: '#b9a27a', roughness: 0.95, map: tex.detail });
  const wood = new THREE.MeshStandardMaterial({ map: tex.woodOld, color: '#b0a088', roughness: 0.9 });
  const thatch = new THREE.MeshStandardMaterial({ map: tex.thatch, color: '#c8b88e', roughness: 1, side: THREE.DoubleSide });
  const m1 = new THREE.Mesh(base, stone);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.4, 4.4), wall);
  walls.position.y = 1.2;
  // 木构件
  const wg = [];
  for (const [x, z] of [[-2.8, -2.2], [2.8, -2.2], [-2.8, 2.2], [2.8, 2.2], [0, -2.2], [0, 2.2]]) {
    const b = new THREE.BoxGeometry(0.18, 2.6, 0.18);
    b.translate(x, 1.3, z);
    wg.push(b);
  }
  const door = new THREE.BoxGeometry(1.0, 1.9, 0.08);
  door.translate(-1.2, 0.95, -2.23);
  wg.push(door);
  const win = new THREE.BoxGeometry(0.9, 0.7, 0.08);
  win.translate(1.4, 1.5, -2.23);
  wg.push(win);
  const beams = new THREE.Mesh(merge(wg), wood);
  // 歇山茅草顶
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-3.6, 0);
  roofShape.lineTo(0, 2.3);
  roofShape.lineTo(3.6, 0);
  roofShape.lineTo(3.3, -0.12);
  roofShape.lineTo(0, 2.05);
  roofShape.lineTo(-3.3, -0.12);
  roofShape.closePath();
  const roofG = new THREE.ExtrudeGeometry(roofShape, { depth: 6.6, bevelEnabled: false });
  roofG.translate(0, 0, -3.3);
  roofG.rotateY(Math.PI / 2);
  const ruv = roofG.attributes.uv;
  const rp = roofG.attributes.position;
  for (let i = 0; i < ruv.count; i++) ruv.setXY(i, rp.getZ(i) * 0.4 + rp.getX(i) * 0.4, rp.getY(i) * 0.5);
  const roof = new THREE.Mesh(roofG, thatch);
  roof.position.y = 2.35;
  roof.rotation.y = Math.PI / 2;
  const gable = new THREE.Shape();
  gable.moveTo(-2.25, 0);
  gable.lineTo(0, 2.0);
  gable.lineTo(2.25, 0);
  gable.closePath();
  for (const s of [-1, 1]) {
    const gm = new THREE.Mesh(new THREE.ShapeGeometry(gable), wall);
    gm.position.set(s * 2.79, 2.38, 0);
    gm.rotation.y = Math.PI / 2;
    grp.add(gm);
  }
  grp.add(m1, walls, beams, roof);
  grp.position.set(at.x, floor, at.z);
  grp.rotation.y = 0.25;
  grp.traverse((o) => o.isMesh && ((o.castShadow = true), (o.receiveShadow = true)));
  scene.add(grp);
  return grp;
}
