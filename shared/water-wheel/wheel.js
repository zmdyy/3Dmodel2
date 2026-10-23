// 筒车主体建模 + 竹筒盛水/倒水的物理过程
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heightAt } from './terrain.js';

const D2R = Math.PI / 180;

export const W = {
  axleY: 6.3,
  axleR: 0.22,
  rimR: 6.0,
  rimIn: 5.82,
  rimOut: 6.18,
  rimZ: 0.42,
  rimT: 0.13,
  hubZ: 1.0,
  hubR: 0.62,
  hubL: 0.36,
  nSpokes: 16,
  nPaddles: 32,
  nTubes: 32,
  paddleIn: 5.98,
  paddleOut: 6.95,
  paddleHW: 0.46,
  paddleT: 0.045,
  ringR: 3.05,
  tubeRc: 6.45,
  tubeZ: 0.78,
  tubeL: 1.0,
  tubeR: 0.07,
  tubeRin: 0.058,
  alpha: -10 * D2R, // 筒口向轮心方向的内倾角
  beta: 22 * D2R, // 筒口向外侧（承水槽一侧）的偏角
  frameZ: 2.0,
};
W.tubeVol = Math.PI * W.tubeRin * W.tubeRin * (W.tubeL - 0.05); // m³
W.trough = {
  x0: -2.4,
  x1: 3.7,
  z0: 0.74,
  z1: 1.34,
  yBot: W.axleY + 4.15,
  yTop: W.axleY + 4.6,
  outletX: 1.4,
};

const rH = W.hubR - 0.05;
const rR = W.rimIn + 0.05;
export const spokeZ = (r, side) => side * (W.hubZ + ((W.rimZ - W.hubZ) * (r - rH)) / (rR - rH));

// —— 小工具 ——
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
export function beamMatrix(a, b, hint = new THREE.Vector3(0, 0, 1), out = new THREE.Matrix4()) {
  const y = _v1.subVectors(b, a);
  const len = y.length();
  y.normalize();
  const x = _v2.crossVectors(y, hint);
  if (x.lengthSq() < 1e-8) x.crossVectors(y, new THREE.Vector3(1, 0, 0));
  x.normalize();
  const z = _v3.crossVectors(x, y);
  out.makeBasis(x, y, z);
  out.setPosition((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return { m: out, len };
}
export function beamGeo(a, b, w, d, hint) {
  const { m, len } = beamMatrix(a, b, hint);
  const g = new THREE.BoxGeometry(w, len, d);
  g.applyMatrix4(m);
  return g;
}
export function cylGeo(a, b, r, seg = 8, r2 = r) {
  const { m, len } = beamMatrix(a, b);
  const g = new THREE.CylinderGeometry(r2, r, len, seg);
  g.applyMatrix4(m);
  return g;
}
function arcSector(r1, r2, a0, a1, depth, bevel = 0.008, curveSeg = 10) {
  const s = new THREE.Shape();
  s.moveTo(r2 * Math.cos(a0), r2 * Math.sin(a0));
  s.absarc(0, 0, r2, a0, a1, false);
  s.lineTo(r1 * Math.cos(a1), r1 * Math.sin(a1));
  s.absarc(0, 0, r1, a1, a0, true);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: curveSeg,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function merge(list) {
  const clean = list.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
    return n;
  });
  return mergeGeometries(clean, false);
}

// 竹筒：车削出带竹节、开口、内壁的筒身
function bambooTubeGeometry() {
  const L = W.tubeL, R = W.tubeR, Ri = W.tubeRin;
  const pts = [];
  pts.push(new THREE.Vector2(0.0005, 0));
  pts.push(new THREE.Vector2(R * 0.92, 0));
  pts.push(new THREE.Vector2(R * 1.02, 0.012));
  pts.push(new THREE.Vector2(R * 1.1, 0.03)); // 底部竹节
  pts.push(new THREE.Vector2(R * 1.0, 0.05));
  const nodes = [0.36, 0.7];
  let y = 0.06;
  for (const n of nodes) {
    pts.push(new THREE.Vector2(R * 0.985, (y + n) / 2));
    pts.push(new THREE.Vector2(R, n - 0.02));
    pts.push(new THREE.Vector2(R * 1.09, n));
    pts.push(new THREE.Vector2(R, n + 0.018));
    y = n + 0.02;
  }
  pts.push(new THREE.Vector2(R * 0.99, L - 0.01));
  pts.push(new THREE.Vector2(R * 0.97, L));
  pts.push(new THREE.Vector2(Ri, L)); // 管口
  pts.push(new THREE.Vector2(Ri, 0.045));
  pts.push(new THREE.Vector2(0.0005, 0.04));
  const g = new THREE.LatheGeometry(pts, 16);
  // 节处颜色深一些
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const yy = pos.getY(i);
    const rr = Math.hypot(pos.getX(i), pos.getZ(i));
    let c = 1;
    for (const n of [0.03, ...nodes]) c -= 0.32 * Math.exp(-(((yy - n) / 0.012) ** 2));
    if (rr < Ri + 0.002 && yy > 0.04) c *= 0.7; // 内壁偏暗
    col[i * 3] = c;
    col[i * 3 + 1] = c;
    col[i * 3 + 2] = c * 0.95;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

export class WaterWheel {
  constructor(tex, registry) {
    this.registry = registry;
    this.root = new THREE.Group();
    this.root.name = 'waterwheel';
    this.root.position.set(0, W.axleY, 0);
    this.rotor = new THREE.Group();
    this.root.add(this.rotor);
    this.angle = 0;
    this.omega = 0.12;
    this.explode = 0;
    this.tracked = 5;
    this.instanced = []; // {mesh, base[], dirs[]}
    this.statics = []; // {obj, base:Vector3, dir:Vector3}
    this.materials = [];

    // 材质
    const mk = (opts) => {
      const m = new THREE.MeshStandardMaterial(opts);
      this.materials.push(m);
      return m;
    };
    const wood = (color = '#ffffff', rough = 0.86) => mk({ map: tex.wood, color, roughness: rough, metalness: 0 });
    this.mat = {
      axle: wood('#9a8672', 0.75),
      axleIron: mk({ color: '#3a3936', roughness: 0.55, metalness: 0.75 }),
      hub: wood('#a08a72', 0.8),
      hubIron: mk({ color: '#34322e', roughness: 0.5, metalness: 0.8 }),
      spoke: wood('#d8c4a6'),
      ring: wood('#c9b394'),
      rim: wood('#c2aa88'),
      rimIron: mk({ color: '#3d3a35', roughness: 0.6, metalness: 0.7 }),
      tie: wood('#b9a283'),
      paddle: mk({ map: tex.woodDark, color: '#ffffff', roughness: 0.8 }),
      tube: mk({ map: tex.bamboo, vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }),
      tubeWater: mk({ color: '#7fb4c8', roughness: 0.08, metalness: 0.0, emissive: '#0d2a33', transparent: true, opacity: 0.92 }),
      rope: mk({ map: tex.rope, color: '#ffffff', roughness: 1 }),
      peg: wood('#8e7556'),
      bearing: wood('#7d6a55', 0.7),
      bearingIron: mk({ color: '#2f2d2a', roughness: 0.5, metalness: 0.8 }),
      frame: mk({ map: tex.woodOld, color: '#ffffff', roughness: 0.9 }),
      pier: mk({ map: tex.stone, color: '#a8a296', roughness: 0.95 }),
      trough: mk({ map: tex.woodOld, color: '#e0d2bb', roughness: 0.85 }),
    };
    this.mat.tubeWater.userData.keepEmissive = true;

    this.buildRotor();
    this.buildStatics();
    this.buildTrough();

    // 每只竹筒的状态
    this.tubes = [];
    for (let i = 0; i < W.nTubes; i++) {
      this.tubes.push({ fill: 0.2, acc: 0, dripAcc: 0, state: '' });
    }
    this.paddlePrevTip = new Float32Array(W.nPaddles).fill(1);
    this.paddleDripAcc = new Float32Array(W.nPaddles);
    this.delivered = 0; // 累计入槽水量（m³）
    this.spilled = 0;
    this.pourRate = 0; // 实时入槽流量（m³/s，平滑）
    this._pourAcc = 0;
  }

  // ———————————————————— 转动部分 ————————————————————
  buildRotor() {
    const R = this.registry, rotor = this.rotor;
    const reg = (key, obj) => {
      R.add(key, obj);
      return obj;
    };

    // 车轴（随轮转动）
    {
      const len = 2 * (W.frameZ + 0.38);
      const g = new THREE.CylinderGeometry(W.axleR, W.axleR, len, 12, 1);
      g.rotateX(Math.PI / 2);
      const axle = new THREE.Mesh(g, this.mat.axle);
      const irons = [];
      for (const z of [-W.frameZ - 0.3, -W.frameZ + 0.3, W.frameZ - 0.3, W.frameZ + 0.3, -W.hubZ - 0.32, W.hubZ + 0.32]) {
        const t = new THREE.TorusGeometry(W.axleR + 0.005, 0.028, 8, 28);
        t.translate(0, 0, z);
        irons.push(t);
      }
      for (const s of [-1, 1]) {
        const cap = new THREE.CylinderGeometry(W.axleR * 0.8, W.axleR * 0.8, 0.04, 12);
        cap.rotateX(Math.PI / 2);
        cap.translate(0, 0, s * (len / 2 + 0.02));
        irons.push(cap);
      }
      const ironMesh = new THREE.Mesh(merge(irons), this.mat.axleIron);
      const grp = new THREE.Group();
      grp.add(axle, ironMesh);
      grp.traverse((o) => o.isMesh && ((o.castShadow = true), (o.receiveShadow = true)));
      rotor.add(reg('axle', grp));
    }

    // 轮毂
    for (const s of [-1, 1]) {
      const g = new THREE.CylinderGeometry(W.hubR, W.hubR, W.hubL, 28, 1);
      g.rotateX(Math.PI / 2);
      const hub = new THREE.Mesh(g, this.mat.hub);
      const bands = [];
      for (const dz of [-W.hubL / 2 + 0.03, W.hubL / 2 - 0.03]) {
        const t = new THREE.TorusGeometry(W.hubR + 0.004, 0.026, 8, 40);
        t.translate(0, 0, dz);
        bands.push(t);
      }
      // 铁楔与铆钉
      for (let i = 0; i < W.nSpokes; i++) {
        const a = ((i + 0.5) / W.nSpokes) * Math.PI * 2;
        const b = new THREE.BoxGeometry(0.05, 0.04, 0.05);
        b.translate((W.hubR + 0.01) * Math.cos(a), (W.hubR + 0.01) * Math.sin(a), 0);
        bands.push(b);
      }
      const bandMesh = new THREE.Mesh(merge(bands), this.mat.hubIron);
      const grp = new THREE.Group();
      grp.add(hub, bandMesh);
      grp.position.z = s * W.hubZ;
      grp.traverse((o) => o.isMesh && ((o.castShadow = true), (o.receiveShadow = true)));
      rotor.add(reg('hub', grp));
      this.statics.push({ obj: grp, base: grp.position.clone(), dir: V(0, 0, s * 0.7), rotor: true });
    }

    // 辐条（伞形斜拉）
    {
      const items = [];
      let len = 0;
      for (const s of [-1, 1]) {
        for (let i = 0; i < W.nSpokes; i++) {
          const a = (i / W.nSpokes) * Math.PI * 2;
          const c = Math.cos(a), sn = Math.sin(a);
          const p0 = V(rH * c, rH * sn, spokeZ(rH, s));
          const p1 = V(rR * c, rR * sn, spokeZ(rR, s));
          const { m, len: l } = beamMatrix(p0, p1, V(0, 0, 1));
          len = l;
          items.push({ m: m.clone(), dir: V(0, 0, s * 1.4) });
        }
      }
      const g = new THREE.BoxGeometry(0.14, len, 0.11);
      this.addInstanced('spoke', g, this.mat.spoke, items);
    }

    // 腰箍
    {
      const items = [];
      const dA = (Math.PI * 2) / W.nSpokes;
      const g = arcSector(W.ringR - 0.08, W.ringR + 0.08, 0.035, dA - 0.035, 0.1, 0.006, 8);
      for (const s of [-1, 1]) {
        for (let i = 0; i < W.nSpokes; i++) {
          const m = new THREE.Matrix4().makeRotationZ(i * dA);
          m.setPosition(0, 0, spokeZ(W.ringR, s));
          items.push({ m, dir: V(0, 0, s * 1.4) });
        }
      }
      this.addInstanced('ring', g, this.mat.ring, items);
    }

    // 轮辋（16 段辋片 + 接缝铁板）
    {
      const dA = (Math.PI * 2) / W.nSpokes;
      const g = arcSector(W.rimIn, W.rimOut, -dA / 2 + 0.003, dA / 2 - 0.003, W.rimT, 0.01, 12);
      const items = [], plates = [];
      for (const s of [-1, 1]) {
        for (let i = 0; i < W.nSpokes; i++) {
          const m = new THREE.Matrix4().makeRotationZ(i * dA);
          m.setPosition(0, 0, s * W.rimZ);
          items.push({ m, dir: V(0, 0, s * 1.4) });
          // 接缝两面铁板
          for (const f of [-1, 1]) {
            const pm = new THREE.Matrix4().makeRotationZ(i * dA + dA / 2);
            pm.setPosition(0, 0, s * W.rimZ + f * (W.rimT / 2 + 0.012));
            plates.push({ m: pm, dir: V(0, 0, s * 1.4) });
          }
        }
      }
      this.addInstanced('rim', g, this.mat.rim, items);
      const pg = merge([
        (() => {
          const b = new THREE.BoxGeometry(0.34, 0.3, 0.012);
          b.translate(W.rimR, 0, 0);
          b.rotateZ(0);
          // 盒子沿切向（局部 y）
          const m = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
          b.translate(-W.rimR, 0, 0);
          b.applyMatrix4(m);
          b.translate(W.rimR, 0, 0);
          return b;
        })(),
        ...[-0.11, 0.11].flatMap((t) =>
          [-0.08, 0.08].map((r) => {
            const n = new THREE.SphereGeometry(0.018, 6, 4);
            n.scale(1, 1, 0.6);
            n.translate(W.rimR + r, t, 0);
            return n;
          })
        ),
      ]);
      this.addInstanced('rim', pg, this.mat.rimIron, plates);
    }

    // 横档
    {
      const items = [];
      let len = 0;
      for (let i = 0; i < W.nSpokes; i++) {
        const a = (i / W.nSpokes) * Math.PI * 2;
        const r = W.rimIn - 0.07;
        const c = Math.cos(a), s = Math.sin(a);
        const { m, len: l } = beamMatrix(V(r * c, r * s, -W.rimZ - 0.09), V(r * c, r * s, W.rimZ + 0.09), V(c, s, 0));
        len = l;
        items.push({ m: m.clone(), dir: V(c * 0.9, s * 0.9, 0) });
      }
      this.addInstanced('tie', new THREE.BoxGeometry(0.12, len, 0.12), this.mat.tie, items);
    }

    // 受水板
    {
      const items = [];
      const h = W.paddleOut - W.paddleIn;
      const pgs = [];
      const board = new THREE.BoxGeometry(W.paddleT, h, W.paddleHW * 2);
      pgs.push(board);
      // 底部压条与背撑
      const cleat = new THREE.BoxGeometry(0.07, 0.06, W.paddleHW * 2);
      cleat.translate(0.055, W.rimOut + 0.03 - (W.paddleIn + h / 2), 0);
      pgs.push(cleat);
      for (const z of [-W.paddleHW * 0.6, W.paddleHW * 0.6]) {
        const st = beamGeo(V(0.03, W.rimOut - (W.paddleIn + h / 2), z), V(0.03, h * 0.28, z), 0.05, 0.04, V(0, 0, 1));
        st.translate(0.02, 0, 0);
        pgs.push(st);
      }
      const g = merge(pgs);
      for (let j = 0; j < W.nPaddles; j++) {
        const a = (j / W.nPaddles) * Math.PI * 2;
        const m = new THREE.Matrix4().makeRotationZ(a - Math.PI / 2);
        const rc = W.paddleIn + h / 2;
        m.setPosition(rc * Math.cos(a), rc * Math.sin(a), 0);
        items.push({ m, dir: V(Math.cos(a) * 2.0, Math.sin(a) * 2.0, 0) });
      }
      this.addInstanced('paddle', g, this.mat.paddle, items);
    }

    // 竹筒 + 筒内水 + 绑绳 + 木销
    {
      const ca = Math.cos(W.alpha), sa = Math.sin(W.alpha), cb = Math.cos(W.beta), sb = Math.sin(W.beta);
      this.tubeLocal = [];
      const tubeItems = [], ropeItems = [], pegItems = [];
      for (let j = 0; j < W.nTubes; j++) {
        const a = ((j + 0.5) / W.nTubes) * Math.PI * 2;
        const rhat = V(Math.cos(a), Math.sin(a), 0);
        const that = V(-Math.sin(a), Math.cos(a), 0);
        const d = that.clone().multiplyScalar(ca * cb).addScaledVector(rhat, sa * cb).add(V(0, 0, sb)).normalize();
        const center = rhat.clone().multiplyScalar(W.tubeRc).add(V(0, 0, W.tubeZ));
        const base = center.clone().addScaledVector(d, -W.tubeL / 2);
        const x = rhat.clone().addScaledVector(d, -rhat.dot(d)).normalize();
        const z = new THREE.Vector3().crossVectors(x, d);
        const m = new THREE.Matrix4().makeBasis(x, d, z).setPosition(base);
        const dir = rhat.clone().multiplyScalar(2.6).add(V(0, 0, 1.6));
        this.tubeLocal.push({ a0: a, base, d, center, m: m.clone(), dir });
        tubeItems.push({ m, dir });
        for (const s of [0.28, 0.74]) {
          const rm = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, s * W.tubeL, 0));
          ropeItems.push({ m: rm, dir });
          // 木销：从轮辋侧面到竹筒
          const pt = base.clone().addScaledVector(d, s * W.tubeL);
          const ang = Math.atan2(pt.y, pt.x);
          const pr = V((W.rimOut - 0.1) * Math.cos(ang), (W.rimOut - 0.1) * Math.sin(ang), W.rimZ + W.rimT / 2 - 0.01);
          const { m: pm, len } = beamMatrix(pr, pt);
          pm.multiply(new THREE.Matrix4().makeScale(1, len, 1));
          pegItems.push({ m: pm.clone(), dir });
        }
      }
      this.tubeMesh = this.addInstanced('tube', bambooTubeGeometry(), this.mat.tube, tubeItems);
      const white = new THREE.Color(1, 1, 1);
      for (let j = 0; j < W.nTubes; j++) this.tubeMesh.setColorAt(j, white);
      this.tubeMesh.instanceColor.needsUpdate = true;

      const rope = new THREE.TorusGeometry(W.tubeR + 0.006, 0.013, 6, 20);
      rope.rotateX(Math.PI / 2);
      this.addInstanced('lashing', rope, this.mat.rope, ropeItems);
      this.addInstanced('lashing', new THREE.CylinderGeometry(0.022, 0.026, 1, 7), this.mat.peg, pegItems);

      // 筒内水柱（动态缩放）
      const wg = new THREE.CylinderGeometry(W.tubeRin - 0.003, W.tubeRin - 0.003, 1, 12, 1);
      wg.translate(0, 0.5, 0);
      this.waterMesh = new THREE.InstancedMesh(wg, this.mat.tubeWater, W.nTubes);
      this.waterMesh.castShadow = false;
      this.waterMesh.frustumCulled = false;
      this.rotor.add(this.waterMesh);
      this.registry.add('tube', this.waterMesh);
    }
  }

  addInstanced(key, geo, mat, items, parent = this.rotor) {
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    items.forEach((it, i) => im.setMatrixAt(i, it.m));
    im.castShadow = true;
    im.receiveShadow = true;
    im.computeBoundingSphere();
    parent.add(im);
    this.registry.add(key, im);
    this.instanced.push({ mesh: im, base: items.map((i) => i.m.clone()), dirs: items.map((i) => i.dir) });
    return im;
  }

  // ———————————————————— 固定部分：支架、轴承、石墩 ————————————————————
  buildStatics() {
    const R = this.registry;
    const Y = W.axleY;
    for (const s of [-1, 1]) {
      const fz = s * W.frameZ;
      // 轴承座（相对 root，root 在轴心高度）
      const bGeo = [], bIron = [];
      {
        const lower = new THREE.BoxGeometry(0.78, 0.3, 0.52);
        lower.translate(0, -W.axleR - 0.15, fz);
        const cap = new THREE.BoxGeometry(0.66, 0.2, 0.46);
        cap.translate(0, W.axleR + 0.1, fz);
        bGeo.push(lower, cap);
        for (const x of [-0.29, 0.29]) {
          const strap = new THREE.BoxGeometry(0.035, 0.78, 0.08);
          strap.translate(x, 0.0, fz);
          bIron.push(strap);
          const bolt = new THREE.CylinderGeometry(0.03, 0.03, 0.06, 6);
          bolt.translate(x, W.axleR + 0.22, fz);
          bIron.push(bolt);
        }
        const strapTop = new THREE.BoxGeometry(0.62, 0.03, 0.08);
        strapTop.translate(0, W.axleR + 0.215, fz);
        bIron.push(strapTop);
      }
      const bearing = new THREE.Group();
      bearing.add(new THREE.Mesh(merge(bGeo), this.mat.bearing), new THREE.Mesh(merge(bIron), this.mat.bearingIron));
      bearing.traverse((o) => o.isMesh && ((o.castShadow = true), (o.receiveShadow = true)));
      this.root.add(bearing);
      R.add('bearing', bearing);
      this.statics.push({ obj: bearing, base: bearing.position.clone(), dir: V(0, 0.9, s * 1.6) });

      // 人字支架（root 坐标，y 以轴心为 0）
      const footY = 0.45 - Y;
      const topY = -W.axleR - 0.3;
      const legW = 0.26;
      const g = [];
      const legs = [];
      for (const sx of [-1, 1]) {
        const a = V(sx * 3.3, footY, fz), b = V(sx * 0.3, topY, fz);
        legs.push([a, b]);
        g.push(beamGeo(a, b, legW, legW, V(0, 0, 1)));
      }
      const legX = (sx, y) => {
        const [a, b] = legs[sx < 0 ? 0 : 1];
        const t = (y - a.y) / (b.y - a.y);
        return a.x + (b.x - a.x) * t;
      };
      // 横梁
      for (const y of [footY + 1.7, footY + 3.9]) {
        const x0 = legX(-1, y) - 0.25, x1 = legX(1, y) + 0.25;
        g.push(beamGeo(V(x0, y, fz), V(x1, y, fz), 0.2, 0.22, V(0, 0, 1)));
      }
      // 顶部托木
      g.push(beamGeo(V(-0.7, topY - 0.08, fz), V(0.7, topY - 0.08, fz), 0.22, 0.3, V(0, 0, 1)));
      // 剪刀撑
      {
        const y0 = footY + 1.7, y1 = footY + 3.9;
        g.push(beamGeo(V(legX(-1, y0) + 0.1, y0, fz + s * 0.14), V(legX(1, y1) - 0.1, y1, fz + s * 0.14), 0.12, 0.1, V(0, 0, 1)));
        g.push(beamGeo(V(legX(1, y0) - 0.1, y0, fz + s * 0.14), V(legX(-1, y1) + 0.1, y1, fz + s * 0.14), 0.12, 0.1, V(0, 0, 1)));
      }
      // 地栿（只压在两座墩台上，中间留出过水通道）
      for (const sx of [-1, 1]) g.push(beamGeo(V(sx * 2.45, footY + 0.12, fz), V(sx * 4.15, footY + 0.12, fz), 0.24, 0.3, V(0, 0, 1)));
      // 外侧斜撑（抵抗侧向力）
      for (const sx of [-1, 1]) {
        const yA = footY + 3.2;
        const a = V(legX(sx, yA), yA, fz);
        const b = V(sx * 2.7, footY + 0.12, fz + s * 0.55);
        g.push(beamGeo(a, b, 0.16, 0.16, V(1, 0, 0)));
        g.push(beamGeo(V(sx * 2.7, footY + 0.1, fz - s * 0.2), V(sx * 2.7, footY + 0.1, fz + s * 0.62), 0.2, 0.2, V(1, 0, 0)));
      }
      const frame = new THREE.Mesh(merge(g), this.mat.frame);
      frame.castShadow = true;
      frame.receiveShadow = true;
      this.root.add(frame);
      R.add('frame', frame);
      this.statics.push({ obj: frame, base: frame.position.clone(), dir: V(0, 0, s * 2.8) });

      // 石墩：每条支腿下一座分层砌筑的墩台，上游墩做分水尖；墩间留出过水通道
      const pg = [];
      const top = 0.45 - Y;
      const courses = 4;
      const pz0 = s > 0 ? 1.28 : -2.78, pz1 = s > 0 ? 2.78 : -1.28;
      const pillar = (cx, cz, wx, wz, cutwater) => {
        const bedY = Math.min(heightAt(cx, cz), -0.5) - 0.35 - Y;
        for (let c = 0; c < courses; c++) {
          const y0 = bedY + ((top - bedY) * c) / courses;
          const y1 = bedY + ((top - bedY) * (c + 1)) / courses;
          const inset = c * 0.05;
          const b = new THREE.BoxGeometry(wx - inset * 2, y1 - y0 - 0.02, wz - inset * 2);
          b.translate(cx, (y0 + y1) / 2, cz);
          pg.push(b);
          if (cutwater) {
            const cr = (wz - inset * 2) / 1.732;
            const cw = new THREE.CylinderGeometry(cr, cr, y1 - y0 - 0.02, 3, 1);
            cw.rotateY(-Math.PI / 2);
            cw.scale(1.35, 1, 1);
            cw.translate(cx - wx / 2 + inset - 0.675 * cr + 0.12, (y0 + y1) / 2, cz);
            pg.push(cw);
          }
        }
      };
      for (const sx of [-1, 1]) pillar(sx * 3.3, (pz0 + pz1) / 2, 1.8, pz1 - pz0, sx < 0);
      if (s > 0) pillar(-2.2, 1.62, 0.75, 0.75, false); // 承水槽支柱墩
      // 柱础石
      for (const sx of [-1, 1]) {
        const b = new THREE.BoxGeometry(0.6, 0.22, 0.6);
        b.translate(sx * 3.3, top + 0.06, fz);
        pg.push(b);
      }
      const pierGeo = merge(pg);
      // 用世界坐标重设石材 UV，避免拉伸
      {
        const p = pierGeo.attributes.position, n = pierGeo.attributes.normal, uv = pierGeo.attributes.uv;
        for (let i = 0; i < p.count; i++) {
          const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
          const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
          if (ay > 0.7) uv.setXY(i, x * 0.35, z * 0.35);
          else if (ax > 0.6) uv.setXY(i, z * 0.35, y * 0.35);
          else uv.setXY(i, x * 0.35, y * 0.35);
        }
      }
      const pier = new THREE.Mesh(pierGeo, this.mat.pier);
      pier.castShadow = true;
      pier.receiveShadow = true;
      this.root.add(pier);
      R.add('pier', pier);
    }
  }

  // ———————————————————— 承水槽 ————————————————————
  buildTrough() {
    const T = W.trough, Y = W.axleY;
    const y0 = T.yBot - Y, y1 = T.yTop - Y;
    const g = [];
    const th = 0.045;
    const box = (x0, x1, yy0, yy1, z0, z1) => {
      const b = new THREE.BoxGeometry(x1 - x0, yy1 - yy0, z1 - z0);
      b.translate((x0 + x1) / 2, (yy0 + yy1) / 2, (z0 + z1) / 2);
      g.push(b);
    };
    box(T.x0, T.x1, y0, y0 + 0.06, T.z0, T.z1); // 槽底
    box(T.x0, T.x1, y0, y1, T.z0, T.z0 + th); // 内侧壁
    // 外侧壁留出水口
    box(T.x0, T.outletX - 0.28, y0, y1, T.z1 - th, T.z1);
    box(T.outletX + 0.28, T.x1, y0, y1, T.z1 - th, T.z1);
    box(T.x0, T.x0 + th, y0, y1, T.z0, T.z1); // 两端
    box(T.x1 - th, T.x1, y0, y1, T.z0, T.z1);
    // 外箍木条
    for (let x = T.x0 + 0.35; x < T.x1 - 0.2; x += 0.75) {
      box(x - 0.04, x + 0.04, y0 - 0.04, y1 + 0.02, T.z0 - 0.03, T.z0);
      if (Math.abs(x - T.outletX) > 0.4) box(x - 0.04, x + 0.04, y0 - 0.04, y1 + 0.02, T.z1, T.z1 + 0.03);
      box(x - 0.04, x + 0.04, y0 - 0.06, y0, T.z0 - 0.03, T.z1 + 0.03);
    }
    // 支柱、托梁、斜撑、剪刀撑
    const posts = [-2.2, 3.5];
    const pz = 1.62;
    for (const px of posts) {
      const gy = 0.45 - Y; // 立于石墩之上
      g.push(beamGeo(V(px, gy, pz), V(px, y0 - 0.1, pz), 0.2, 0.2, V(0, 0, 1)));
      g.push(beamGeo(V(px, y0 - 0.07, T.z0 - 0.1), V(px, y0 - 0.07, pz + 0.18), 0.16, 0.1, V(1, 0, 0)));
      g.push(beamGeo(V(px, y0 - 1.05, pz), V(px, y0 - 0.12, T.z0 + 0.3), 0.1, 0.1, V(1, 0, 0)));
      // 石础
      const ft = new THREE.BoxGeometry(0.55, 0.5, 0.55);
      ft.translate(px, gy + 0.1, pz);
      g.push(ft);
    }
    const yb = -Y + 0.9, yt = y0 - 1.3;
    g.push(beamGeo(V(posts[0], yb, pz), V(posts[1], yt, pz), 0.1, 0.09, V(0, 0, 1)));
    g.push(beamGeo(V(posts[1], yb, pz), V(posts[0], yt, pz), 0.1, 0.09, V(0, 0, 1)));
    g.push(beamGeo(V(posts[0] - 0.15, yt + 0.05, pz), V(posts[1] + 0.15, yt + 0.05, pz), 0.14, 0.12, V(0, 0, 1)));
    g.push(beamGeo(V(posts[0] - 0.15, y0 - 0.12, pz), V(posts[1] + 0.15, y0 - 0.12, pz), 0.14, 0.14, V(0, 0, 1)));
    const trough = new THREE.Mesh(merge(g), this.mat.trough);
    trough.castShadow = true;
    trough.receiveShadow = true;
    const grp = new THREE.Group();
    grp.add(trough);
    this.root.add(grp);
    this.registry.add('trough', grp);
    this.troughGroup = grp;
    this.statics.push({ obj: grp, base: grp.position.clone(), dir: V(0, 2.2, 1.2) });
  }

  setExplode(e) {
    this.explode = e;
    const tmp = new THREE.Matrix4();
    for (const it of this.instanced) {
      for (let i = 0; i < it.base.length; i++) {
        const d = it.dirs[i];
        tmp.makeTranslation(d.x * e, d.y * e, d.z * e).multiply(it.base[i]);
        it.mesh.setMatrixAt(i, tmp);
      }
      it.mesh.instanceMatrix.needsUpdate = true;
      it.mesh.computeBoundingSphere();
    }
    for (const s of this.statics) s.obj.position.copy(s.base).addScaledVector(s.dir, e);
  }

  setXray(on) {
    for (const m of this.materials) {
      if (m === this.mat.tubeWater) continue;
      if (m === this.mat.tube) {
        m.transparent = on;
        m.opacity = on ? 0.45 : 1;
        m.depthWrite = !on;
      } else {
        m.transparent = on;
        m.opacity = on ? 0.22 : 1;
        m.depthWrite = !on;
      }
      m.needsUpdate = true;
    }
  }

  setTracked(i) {
    const white = new THREE.Color(1, 1, 1);
    for (let j = 0; j < W.nTubes; j++) this.tubeMesh.setColorAt(j, white);
    if (i >= 0) this.tubeMesh.setColorAt(i, new THREE.Color(2.2, 1.35, 0.35));
    this.tubeMesh.instanceColor.needsUpdate = true;
    this.tracked = i;
  }

  // 竹筒倾角 ψ（筒口高于筒底为正）对应的最大存水比例
  static capacity(tanPsi) {
    const t = (W.tubeL * tanPsi) / (2 * W.tubeRin);
    if (t >= 1) return 1 - 1 / (2 * t);
    if (t >= 0) return 0.5;
    if (t > -1) return 0.5 * (1 + t);
    return 0;
  }

  // 世界坐标信息（未考虑爆炸偏移）
  tubeWorld(j, out) {
    const tl = this.tubeLocal[j];
    const c = Math.cos(this.angle), s = Math.sin(this.angle);
    const L = W.tubeL;
    const mx = tl.base.x + tl.d.x * L * 0.97, my = tl.base.y + tl.d.y * L * 0.97, mz = tl.base.z + tl.d.z * L * 0.97;
    out.mouth.set(mx * c - my * s, mx * s + my * c + W.axleY, mz);
    out.d.set(tl.d.x * c - tl.d.y * s, tl.d.x * s + tl.d.y * c, tl.d.z);
    const bx = tl.base.x, by = tl.base.y;
    out.base.set(bx * c - by * s, bx * s + by * c + W.axleY, tl.base.z);
    // 速度 = ω × r
    out.vel.set(-this.omega * (out.mouth.y - W.axleY), this.omega * out.mouth.x, 0);
    out.theta = Math.atan2(out.mouth.y - W.axleY, out.mouth.x);
    return out;
  }

  update(dt, riverSpeed, particles, waterLevel = 0, streams = null) {
    // 水流推动：受水板线速度约为水流速度的 45%（有负载打滑）
    const target = (0.45 * riverSpeed) / ((W.paddleIn + W.paddleOut) / 2);
    this.omega += (target - this.omega) * Math.min(1, dt * 0.6);
    this.angle += this.omega * dt;
    this.rotor.rotation.z = this.angle;

    const T = W.trough;
    const troughWaterY = T.yBot + 0.06 + 0.06 + 0.1 * Math.min(1, this.pourRate / 0.004);
    const emitOK = this.explode < 0.02 && particles;
    const info = this._info || (this._info = { mouth: new THREE.Vector3(), d: new THREE.Vector3(), base: new THREE.Vector3(), vel: new THREE.Vector3(), theta: 0 });
    let pouredThisFrame = 0;
    const tmp = new THREE.Matrix4(), sc = new THREE.Matrix4();
    const e = this.explode;

    for (let j = 0; j < W.nTubes; j++) {
      const tb = this.tubes[j];
      this.tubeWorld(j, info);
      const dy = info.d.y;
      const horiz = Math.max(1e-4, Math.hypot(info.d.x, info.d.z));
      const tanPsi = dy / horiz;
      const submerged = info.mouth.y < waterLevel + 0.03;
      const baseUnder = info.base.y < waterLevel;
      if (submerged || (baseUnder && info.mouth.y < waterLevel + 0.12)) {
        const prev = tb.fill;
        tb.fill = Math.min(1, tb.fill + dt * 1.6);
        tb.state = '没入河中 · 汲水';
        if (emitOK && prev < 0.98 && Math.random() < dt * 8) {
          // 入水气泡/翻花
          particles.emit(info.mouth.x, waterLevel + 0.02, info.mouth.z, (Math.random() - 0.5) * 0.6, 0.6 + Math.random() * 0.6, (Math.random() - 0.5) * 0.6, 0.05, waterLevel, 1);
        }
      } else {
        const cap = WaterWheel.capacity(tanPsi);
        if (tb.fill > cap + 1e-4) {
          const out = Math.min(tb.fill - cap, dt * 1.5);
          tb.fill -= out;
          // 预测落点
          const fallH = Math.max(0.05, info.mouth.y - troughWaterY);
          const tf = Math.sqrt((2 * fallH) / 9.8);
          const lx = info.mouth.x + info.vel.x * tf * 0.9 + info.d.x * 0.3 * tf;
          const lz = info.mouth.z + info.d.z * 0.5 * tf;
          const inTrough = lx > T.x0 + 0.06 && lx < T.x1 - 0.06 && lz > T.z0 + 0.05 && lz < T.z1 - 0.05 && info.mouth.y > T.yTop;
          if (inTrough) {
            this.delivered += out * W.tubeVol;
            pouredThisFrame += out * W.tubeVol;
          } else this.spilled += out * W.tubeVol;
          const big = info.mouth.y > W.axleY;
          tb.state = big ? (inTrough ? '越过顶点 · 倾入承水槽' : '倾倒 · 溢散') : '出水 · 回落部分余水';
          if (emitOK && streams && big && dt > 0) {
            const rate = out / dt;
            const v0 = this._v0 || (this._v0 = new THREE.Vector3());
            v0.copy(info.vel).multiplyScalar(0.92).addScaledVector(info.d, 0.55);
            streams.add(info.mouth, v0, inTrough ? troughWaterY : waterLevel, 0.025 + 0.075 * Math.min(1, Math.sqrt(rate / 0.6)), Math.min(0.85, rate * 2.5));
          }
          if (emitOK) {
            tb.acc += out * (big ? 1300 : 700);
            const killY = inTrough ? troughWaterY : waterLevel;
            while (tb.acc >= 1) {
              tb.acc -= 1;
              const r = Math.random() * 0.045, ph = Math.random() * Math.PI * 2;
              const k = 0.35 + Math.random() * 0.55;
              particles.emit(
                info.mouth.x + Math.cos(ph) * r,
                info.mouth.y + Math.sin(ph) * r * 0.6,
                info.mouth.z + (Math.random() - 0.5) * 0.06,
                info.vel.x * 0.92 + info.d.x * k + (Math.random() - 0.5) * 0.12,
                info.vel.y * 0.92 + info.d.y * k + (Math.random() - 0.5) * 0.1,
                info.d.z * k * 0.7 + (Math.random() - 0.5) * 0.12,
                0.03 + Math.random() * 0.035,
                killY,
                0
              );
            }
          }
        } else {
          const y = info.mouth.y - W.axleY;
          if (tb.fill > 0.05) tb.state = y < 0 ? '出水 · 筒口朝上保水' : '随轮提升 · 满载上行';
          else tb.state = y > 0 ? '已倒空 · 回程' : '空筒下行 · 待汲水';
          // 刚出水的竹筒外壁滴水
          if (emitOK && y < -2 && info.mouth.x > 0) {
            tb.dripAcc += dt * 7;
            while (tb.dripAcc >= 1) {
              tb.dripAcc -= 1;
              const s = Math.random();
              particles.emit(
                info.base.x + info.d.x * s,
                info.base.y + info.d.y * s - 0.07,
                info.base.z + info.d.z * s,
                info.vel.x * 0.5,
                info.vel.y * 0.3,
                0,
                0.035,
                waterLevel,
                2
              );
            }
          }
        }
      }
      // 更新筒内水柱
      const f = tb.fill;
      const tl = this.tubeLocal[j];
      tmp.makeTranslation(tl.dir.x * e, tl.dir.y * e, tl.dir.z * e).multiply(tl.m);
      tmp.multiply(sc.makeTranslation(0, 0.045, 0));
      tmp.multiply(sc.makeScale(1, Math.max(0.0001, f * (W.tubeL - 0.07)), 1));
      this.waterMesh.setMatrixAt(j, tmp);
    }
    this.waterMesh.instanceMatrix.needsUpdate = true;
    // 平滑入槽流量
    const inst = dt > 0 ? pouredThisFrame / dt : 0;
    this.pourRate += (inst - this.pourRate) * Math.min(1, dt * 0.35);

    // 受水板：入水溅花、出水滴落
    if (emitOK) {
      const R = W.paddleOut;
      for (let j = 0; j < W.nPaddles; j++) {
        const a = (j / W.nPaddles) * Math.PI * 2 + this.angle;
        const ca = Math.cos(a), sa = Math.sin(a);
        const tipY = W.axleY + R * sa;
        const prev = this.paddlePrevTip[j];
        this.paddlePrevTip[j] = tipY;
        const vx = -this.omega * R * sa, vy = this.omega * R * ca;
        if (prev >= waterLevel && tipY < waterLevel && ca < 0) {
          for (let n = 0; n < 70; n++) {
            const z = (Math.random() - 0.5) * W.paddleHW * 2;
            particles.emit(R * ca + (Math.random() - 0.3) * 0.3, waterLevel + 0.02, z, -0.6 - Math.random() * 1.4 + vx * 0.3, 0.8 + Math.random() * 2.2, (Math.random() - 0.5) * 1.6, 0.04 + Math.random() * 0.05, waterLevel, 1);
          }
        }
        if (ca > 0 && sa < -0.35 && tipY > waterLevel) {
          const fade = Math.max(0, 1 - (tipY - waterLevel) / 3.2);
          this.paddleDripAcc[j] += dt * 55 * fade * fade;
          if (prev < waterLevel) this.paddleDripAcc[j] += 30;
          while (this.paddleDripAcc[j] >= 1) {
            this.paddleDripAcc[j] -= 1;
            const rr = W.paddleIn + Math.random() * (R - W.paddleIn);
            const z = (Math.random() - 0.5) * W.paddleHW * 2;
            particles.emit(rr * ca, W.axleY + rr * sa, z, vx * 0.6 + (Math.random() - 0.5) * 0.2, vy * 0.4, (Math.random() - 0.5) * 0.15, 0.03 + Math.random() * 0.025, waterLevel, 2);
          }
        }
      }
    }
  }

  get rpm() {
    return (this.omega * 60) / (Math.PI * 2);
  }
}
