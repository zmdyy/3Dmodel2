// 原理演示辅助：转向箭头、水流箭头、输水路径、力箭头、部件标注
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { W, spokeZ } from './wheel.js';
import { PART_INFO } from './parts.js';
import { waterY, TER } from './terrain.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function glowMat(color, opacity = 0.9) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false, toneMapped: false });
}

function arrowMesh(len, rad, head, color) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len - head, 10), glowMat(color));
  shaft.position.y = (len - head) / 2;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, head, 14), glowMat(color));
  tip.position.y = len - head / 2;
  g.add(shaft, tip);
  g.renderOrder = 10;
  shaft.renderOrder = tip.renderOrder = 10;
  return g;
}

export class Guides {
  constructor(scene, aqueduct) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'guides';
    scene.add(this.group);
    this.t = 0;

    // —— 转动方向弧形箭头 ——
    {
      const r = 7.45;
      const a0 = -2.6, a1 = -0.55;
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const a = a0 + ((a1 - a0) * i) / 40;
        pts.push(V(r * Math.cos(a), W.axleY + r * Math.sin(a), -0.9));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.07, 8), glowMat('#ffb547'));
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 16), glowMat('#ffb547'));
      const end = pts[pts.length - 1];
      const tan = curve.getTangent(1);
      tip.position.copy(end).addScaledVector(tan, 0.25);
      tip.quaternion.setFromUnitVectors(V(0, 1, 0), tan);
      this.rotArrow = new THREE.Group();
      this.rotArrow.add(tube, tip);
      tube.renderOrder = tip.renderOrder = 10;
      this.group.add(this.rotArrow);
    }

    // —— 水流冲击力（底部受水板） ——
    this.forceArrow = arrowMesh(2.6, 0.06, 0.45, '#ff6a3d');
    this.forceArrow.rotation.z = -Math.PI / 2;
    this.forceArrow.position.set(-2.2, -0.1, -0.6);
    this.group.add(this.forceArrow);

    // —— 河流箭头（流动） ——
    this.flowArrows = [];
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.25);
    shape.lineTo(0.9, 0.25);
    shape.lineTo(0.9, 0.55);
    shape.lineTo(1.6, 0);
    shape.lineTo(0.9, -0.55);
    shape.lineTo(0.9, -0.25);
    shape.lineTo(0, -0.25);
    shape.closePath();
    const sg = new THREE.ShapeGeometry(shape);
    sg.rotateX(-Math.PI / 2);
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(sg, glowMat('#5fd3ff', 0.0));
      m.material.depthTest = true;
      m.userData.lane = [-6.5, -0.2, -11][i % 3];
      m.userData.off = (i / 9) * 28;
      m.renderOrder = 9;
      this.group.add(m);
      this.flowArrows.push(m);
    }

    // —— 输水路径（河 → 竹筒 → 承水槽 → 渡槽 → 梯田） ——
    {
      const pts = [];
      pts.push(V(-8, 0.05, -0.2), V(-3, 0.0, 0.3));
      for (let i = 0; i <= 24; i++) {
        const a = -1.5 + (i / 24) * (1.5 + 1.25);
        pts.push(V(6.45 * Math.cos(a), W.axleY + 6.45 * Math.sin(a), 0.97));
      }
      pts.push(V(1.7, W.trough.yTop + 0.6, 1.0));
      pts.push(V(1.4, W.trough.yBot + 0.15, 1.04));
      pts.push(V(1.4, W.trough.yBot + 0.15, 1.6));
      const a = aqueduct;
      for (let i = 1; i <= 6; i++) {
        const z = a.z0 + ((a.z1 - a.z0) * i) / 6;
        pts.push(V(a.x, a.yAt(z) + 0.15, z));
      }
      pts.push(V(a.x, waterY(TER.NLEV - 1) + 0.05, a.z1 + 1.2));
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.2);
      this.pathLength = curve.getLength();
      const geo = new THREE.TubeGeometry(curve, 400, 0.055, 8);
      this.pathMat = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: { t: { value: 0 }, len: { value: this.pathLength } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform float t; uniform float len; varying vec2 vUv;
          void main(){
            float s = vUv.x * len;
            float dash = fract((s - t*2.2) / 1.6);
            float a = smoothstep(0.0, 0.15, dash) * smoothstep(0.75, 0.45, dash);
            vec3 c = mix(vec3(0.2,0.75,1.0), vec3(0.85,1.0,1.0), a);
            gl_FragColor = vec4(c, 0.18 + 0.62*a);
          }`,
      });
      this.path = new THREE.Mesh(geo, this.pathMat);
      this.path.renderOrder = 11;
      this.group.add(this.path);
    }

    this.setVisible({ rotation: false, force: false, flow: false, path: false });
  }

  setVisible(v) {
    this.vis = { ...this.vis, ...v };
    this.rotArrow.visible = !!this.vis.rotation;
    this.forceArrow.visible = !!this.vis.force;
    this.flowArrows.forEach((m) => (m.visible = !!this.vis.flow));
    this.path.visible = !!this.vis.path;
  }

  update(dt, riverSpeed, omega) {
    this.t += dt;
    this.pathMat.uniforms.t.value = this.t;
    if (this.vis.flow) {
      for (const m of this.flowArrows) {
        const span = 30;
        const x = ((m.userData.off + this.t * riverSpeed * 0.9) % span) - 22;
        m.position.set(x, 0.06, m.userData.lane);
        const fade = Math.sin((((x + 22) / span) * Math.PI));
        m.material.opacity = 0.75 * fade;
      }
    }
    if (this.vis.force) {
      const s = 1 + 0.08 * Math.sin(this.t * 6);
      this.forceArrow.scale.set(1, (0.6 + riverSpeed * 0.25) * s, 1);
    }
    if (this.vis.rotation) {
      this.rotArrow.rotation.set(0, 0, 0);
    }
  }
}

// —— 部件标注 ——
const LABELS = [
  ['axle', V(0, W.axleY, -2.45), V(0, 0, 0)],
  ['hub', V(0, W.axleY + 0.65, -1.05), V(0, 0, -0.7)],
  ['spoke', V(2.0 * Math.cos(2.6), W.axleY + 2.0 * Math.sin(2.6), spokeZ(2.0, -1)), V(0, 0, -1.4)],
  ['ring', V(3.05 * Math.cos(3.7), W.axleY + 3.05 * Math.sin(3.7), spokeZ(3.05, -1)), V(0, 0, -1.4)],
  ['rim', V(6.0 * Math.cos(2.25), W.axleY + 6.0 * Math.sin(2.25), -W.rimZ - 0.07), V(0, 0, -1.4)],
  ['tie', V(5.75 * Math.cos(3.53), W.axleY + 5.75 * Math.sin(3.53), 0), V(-0.85, -0.3, 0)],
  ['paddle', V(6.5 * Math.cos(-2.05), W.axleY + 6.5 * Math.sin(-2.05), -0.46), V(-0.9, -1.8, 0)],
  ['tube', V(6.45 * Math.cos(0.35), W.axleY + 6.45 * Math.sin(0.35), 0.85), V(2.4, 0.9, 1.6)],
  ['lashing', V(6.2 * Math.cos(0.62), W.axleY + 6.2 * Math.sin(0.62), 0.55), V(2.1, 1.5, 1.6)],
  ['bearing', V(0, W.axleY + 0.5, -2.0), V(0, 0.9, -1.6)],
  ['frame', V(-1.9, 3.3, -2.0), V(0, 0, -2.8)],
  ['pier', V(-4.5, 0.4, -2.0), V(0, 0, 0)],
  ['trough', V(3.0, W.trough.yTop + 0.1, 1.04), V(0, 2.2, 1.2)],
];

export class PartLabels {
  constructor(scene, extra, onClick) {
    this.items = [];
    const all = [...LABELS, ...extra];
    for (const [key, pos, dir] of all) {
      const el = document.createElement('div');
      el.className = 'part-label';
      el.innerHTML = `<span class="dot"></span><span class="txt">${PART_INFO[key].name}</span>`;
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        onClick(key);
      });
      const obj = new CSS2DObject(el);
      obj.position.copy(pos);
      obj.center.set(0, 0.5);
      scene.add(obj);
      this.items.push({ key, obj, base: pos.clone(), dir: dir || V(0, 0, 0), el });
    }
    this.setVisible(false);
  }
  setVisible(v) {
    this.visible = v;
    this.items.forEach((i) => (i.obj.visible = v));
  }
  setExplode(e) {
    this.items.forEach((i) => i.obj.position.copy(i.base).addScaledVector(i.dir, e));
  }
  setActive(key) {
    this.items.forEach((i) => i.el.classList.toggle('active', i.key === key));
  }
}
