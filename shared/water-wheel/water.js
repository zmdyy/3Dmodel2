// 水：河面（实时反射 + 流向法线 + 泡沫）、田水、渠道流水、水滴粒子
import * as THREE from 'three';

import { heightAt } from './terrain.js';

export const waterUniforms = {
  time: { value: 0 },
  sunDir: { value: new THREE.Vector3(0.3, 0.8, -0.5).normalize() },
  sunColor: { value: new THREE.Color(1, 0.95, 0.85) },
  skyZenith: { value: new THREE.Color('#5d8fc8') },
  skyHorizon: { value: new THREE.Color('#c9dbe8') },
  dayLight: { value: 1 },
};

const commonFrag = /* glsl */ `
  uniform float time;
  uniform vec3 sunDir;
  uniform vec3 sunColor;
  uniform vec3 skyZenith;
  uniform vec3 skyHorizon;
  uniform float dayLight;
  float sdBox(vec2 p, vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.0)) + min(max(d.x,d.y),0.0); }
  float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
  vec3 skyColor(vec3 r){
    float t = pow(clamp(r.y, 0.0, 1.0), 0.45);
    return mix(skyHorizon, skyZenith, t);
  }
`;

// ———————————————— 河面 ————————————————
export function buildRiver(normalTex) {
  const g = new THREE.PlaneGeometry(76, 30, 1, 1);
  const m = new THREE.ShaderMaterial({
    uniforms: {time: waterUniforms.time, flowSpeed:{value:2.2}, foamAmount:{value:1}},
    vertexShader: `varying vec3 p; void main(){ p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float time, flowSpeed; varying vec3 p;
      void main(){float v=sin(p.x*3.-time*flowSpeed*3.+sin(p.y*4.))*sin(p.y*9.+p.x*.7);
      vec3 c=mix(vec3(.075,.23,.22),vec3(.22,.44,.39),.5+.22*v);
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`
  });
  const river = new THREE.Mesh(g,m);
  river.rotation.x=-Math.PI/2; river.position.set(2,0,-5);
  river.renderOrder=1; river.name='river'; return river;
}

// ———————————————— 梯田水面 ————————————————
export function terraceWaterMaterial(normalTex) {
  return new THREE.ShaderMaterial({
    name: 'TerraceWater',
    transparent: true,
    depthWrite: false,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      THREE.UniformsLib.lights,
      { tNormal: { value: null }, mudColor: { value: new THREE.Color('#3f4a2c') } },
    ]),
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      #include <common>
      #include <fog_pars_vertex>
      void main(){
        vec4 wp = modelMatrix * vec4(position,1.0);
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tNormal;
      uniform vec3 mudColor;
      varying vec3 vWorld;
      #include <common>
      #include <fog_pars_fragment>
      ${commonFrag}
      void main(){
        vec2 p = vWorld.xz;
        vec3 n = texture2D(tNormal, p*0.31 + vec2(time*0.011, time*0.007)).xyz*2.0-1.0;
        n += texture2D(tNormal, p*0.9 - vec2(time*0.017, -time*0.013)).xyz*2.0-1.0;
        vec3 N = normalize(vec3(n.x*0.06, 1.0, n.y*0.06));
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = 0.02 + 0.98*pow(1.0 - max(dot(V, N), 0.0), 5.0);
        vec3 R = reflect(-V, N);
        vec3 sky = skyColor(R);
        vec3 body = mudColor * (0.35 + 0.65*dayLight);
        vec3 col = mix(body, sky, clamp(0.55 + fres*0.9, 0.0, 1.0));
        vec3 H = normalize(sunDir + V);
        col += sunColor * pow(max(dot(N, H), 0.0), 500.0) * 6.0 * dayLight;
        float a = clamp(0.72 + fres*0.4, 0.0, 0.95);
        gl_FragColor = vec4(col, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}

export function linkWaterUniforms(mat, normalTex) {
  for (const k of Object.keys(waterUniforms)) mat.uniforms[k] = waterUniforms[k];
  if (mat.uniforms.tNormal) mat.uniforms.tNormal.value = normalTex;
  return mat;
}

// ———————————————— 渠道/跌水的流动水 ————————————————
export function flowMaterial(flowTex, { speed = 1.2, repeat = 1, opacity = 0.9, tint = '#8fb8c4' } = {}) {
  const m = new THREE.ShaderMaterial({
    name: 'FlowWater',
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        tFlow: { value: null },
        speed: { value: speed },
        rep: { value: repeat },
        opacity: { value: opacity },
        tint: { value: new THREE.Color(tint) },
        level: { value: 1 },
      },
    ]),
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      #include <common>
      #include <fog_pars_vertex>
      void main(){
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position,1.0);
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tFlow;
      uniform float speed;
      uniform float rep;
      uniform float opacity;
      uniform vec3 tint;
      uniform float level;
      varying vec2 vUv;
      varying vec3 vWorld;
      #include <common>
      #include <fog_pars_fragment>
      ${commonFrag}
      void main(){
        vec3 t1 = texture2D(tFlow, vec2(vUv.x*0.8, vUv.y*rep - time*speed)).rgb;
        vec3 t2 = texture2D(tFlow, vec2(vUv.x*1.3 + 0.37, vUv.y*rep*1.7 - time*speed*1.35)).rgb;
        float streak = clamp((t1.r + t2.r)*0.5 - 0.38, 0.0, 1.0) * 2.2;
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 col = tint * (0.4 + 0.6*dayLight);
        col = mix(col, skyColor(vec3(0.0,0.6,0.0)), 0.25);
        col = mix(col, vec3(0.95,0.98,1.0)*(0.5+0.5*dayLight), streak*0.75);
        float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
        gl_FragColor = vec4(col, opacity * level * mix(0.7, 1.0, streak) * mix(0.6, 1.0, edge));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
  m.uniforms.tFlow.value = flowTex;
  m.uniforms.time = waterUniforms.time;
  for (const k of Object.keys(waterUniforms)) m.uniforms[k] = waterUniforms[k];
  return m;
}

// ———————————————— 水滴粒子 ————————————————
export class WaterParticles {
  constructor(max = 16000) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.killY = new Float32Array(max);
    this.kind = new Uint8Array(max);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.head = 0;
    this.alive = 0;
    this.impacts = []; // 落水点（用于涟漪）
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 6, 0), 2000);
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { scale: { value: 800 } }]),
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float alpha;
        uniform float scale;
        varying float vAlpha;
        #include <common>
        #include <fog_pars_vertex>
        void main(){
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = max(1.5, size * scale / -mvPosition.z);
          vAlpha = alpha * clamp(size * scale / -mvPosition.z / 1.5, 0.15, 1.0);
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        #include <common>
        #include <fog_pars_fragment>
        ${commonFrag}
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.15, d) * vAlpha;
          vec3 base = mix(vec3(0.55, 0.7, 0.78), vec3(0.97, 0.99, 1.0), smoothstep(0.3, 0.0, length(c - vec2(-0.12, -0.12))));
          vec3 col = base * (0.45 + 0.6*dayLight) + sunColor*0.08*dayLight;
          gl_FragColor = vec4(col, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `,
    });
    for (const k of ['dayLight', 'sunColor', 'time', 'sunDir', 'skyZenith', 'skyHorizon']) this.material.uniforms[k] = waterUniforms[k];
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    this.geometry = g;
  }
  emit(x, y, z, vx, vy, vz, size, killY, kind = 0) {
    const i = this.head;
    this.head = (this.head + 1) % this.max;
    this.pos[i * 3] = x;
    this.pos[i * 3 + 1] = y;
    this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx;
    this.vel[i * 3 + 1] = vy;
    this.vel[i * 3 + 2] = vz;
    this.life[i] = kind === 1 ? 1.2 : 4;
    this.killY[i] = killY;
    this.kind[i] = kind;
    this.size[i] = size;
    this.alpha[i] = kind === 2 ? 0.7 : kind === 1 ? 0.75 : 0.7;
  }
  update(dt) {
    const p = this.pos, v = this.vel;
    const g = 9.8 * dt;
    let alive = 0;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const i3 = i * 3;
      v[i3 + 1] -= g;
      const drag = this.kind[i] === 1 ? 1 - 1.2 * dt : 1 - 0.15 * dt;
      v[i3] *= drag;
      v[i3 + 2] *= drag;
      p[i3] += v[i3] * dt;
      p[i3 + 1] += v[i3 + 1] * dt;
      p[i3 + 2] += v[i3 + 2] * dt;
      if (this.kind[i] === 1) this.alpha[i] = Math.max(0, Math.min(0.8, this.life[i] * 1.2));
      if (p[i3 + 1] < this.killY[i] || this.life[i] <= 0) {
        // 落水溅起
        if (this.kind[i] === 0 && v[i3 + 1] < -2.5) {
          if (Math.random() < 0.22) {
            const s = 0.6 + Math.random() * 0.9;
            this.emitSplash(p[i3], this.killY[i] + 0.01, p[i3 + 2], (Math.random() - 0.5) * s * 1.4, s * (1 + Math.random()), (Math.random() - 0.5) * s * 1.4);
          }
          if (Math.random() < 0.03 && this.impacts.length < 60) this.impacts.push([p[i3], this.killY[i], p[i3 + 2]]);
        }
        this.life[i] = 0;
        this.alpha[i] = 0;
        p[i3 + 1] = -9999;
        continue;
      }
      alive++;
    }
    this.alive = alive;
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.alpha.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }
  emitSplash(x, y, z, vx, vy, vz) {
    this.emit(x, y, z, vx, vy, vz, 0.025 + Math.random() * 0.03, y - 0.02, 1);
  }
  clear() {
    this.life.fill(0);
    this.alpha.fill(0);
  }
}

// ———————————————— 落水涟漪 ————————————————
export class Ripples {
  constructor(tex, max = 90) {
    this.max = max;
    this.items = [];
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    this.mesh = new THREE.InstancedMesh(
      g,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { dayLight: waterUniforms.dayLight },
        vertexShader: /* glsl */ `
          attribute float aAge;
          varying float vAge;
          varying vec2 vUv;
          void main(){ vUv = uv; vAge = aAge; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position,1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform float dayLight;
          varying float vAge; varying vec2 vUv;
          void main(){
            float d = length(vUv - 0.5) * 2.0;
            float ring = smoothstep(0.08, 0.0, abs(d - 0.8)) ;
            float a = ring * (1.0 - vAge) * 0.45;
            if (a < 0.01) discard;
            gl_FragColor = vec4(vec3(0.85, 0.92, 0.95) * (0.5 + 0.5*dayLight), a);
          }
        `,
      }),
      max
    );
    this.age = new Float32Array(max);
    this.mesh.geometry.setAttribute('aAge', new THREE.InstancedBufferAttribute(this.age, 1));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.count = 0;
  }
  add(x, y, z) {
    if (this.items.length >= this.max) this.items.shift();
    this.items.push({ x, y: y + 0.015, z, t: 0, life: 1.1 + Math.random() * 0.6, s: 0.4 + Math.random() * 0.4 });
  }
  update(dt) {
    const m = new THREE.Matrix4();
    this.items = this.items.filter((r) => (r.t += dt) < r.life);
    this.items.forEach((r, i) => {
      const k = r.t / r.life;
      const sc = r.s * (0.3 + k * 1.6);
      m.makeScale(sc, 1, sc).setPosition(r.x, r.y, r.z);
      this.mesh.setMatrixAt(i, m);
      this.age[i] = k;
    });
    this.mesh.count = this.items.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.geometry.attributes.aAge.needsUpdate = true;
  }
}

// ———————————————— 连续水柱（抛物线飘带，始终面向相机） ————————————————
export class PourStreams {
  constructor(flowTex, max = 10, segs = 16) {
    this.max = max;
    this.segs = segs;
    const nv = max * (segs + 1) * 2;
    this.pos = new Float32Array(nv * 3);
    this.uv = new Float32Array(nv * 2);
    this.alpha = new Float32Array(nv);
    const idx = [];
    for (let s = 0; s < max; s++) {
      const b = s * (segs + 1) * 2;
      for (let i = 0; i < segs; i++) {
        const a = b + i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    this.geometry = g;
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { tFlow: { value: flowTex } }]),
      vertexShader: /* glsl */ `
        attribute float aAlpha;
        varying vec2 vUv;
        varying float vA;
        #include <common>
        #include <fog_pars_vertex>
        void main(){
          vUv = uv; vA = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position,1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tFlow;
        varying vec2 vUv;
        varying float vA;
        #include <common>
        #include <fog_pars_fragment>
        ${commonFrag}
        void main(){
          float t1 = texture2D(tFlow, vec2(vUv.x*0.6, vUv.y*0.9 - time*2.6)).r;
          float t2 = texture2D(tFlow, vec2(vUv.x*0.9 + 0.3, vUv.y*1.5 - time*3.4)).r;
          float streak = clamp((t1 + t2)*0.5 - 0.35, 0.0, 1.0) * 2.0;
          float edge = 1.0 - pow(abs(vUv.x - 0.5) * 2.0, 2.0);
          vec3 col = mix(vec3(0.5, 0.66, 0.72), vec3(0.93, 0.97, 1.0), 0.35 + 0.65*streak*edge);
          col *= (0.45 + 0.6*dayLight);
          col += sunColor * 0.12 * dayLight * edge;
          float a = vA * edge * (0.45 + 0.55*streak);
          gl_FragColor = vec4(col, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `,
    });
    for (const k of Object.keys(waterUniforms)) this.material.uniforms[k] = waterUniforms[k];
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    this.n = 0;
    this.cam = new THREE.Vector3();
    this._p = new THREE.Vector3();
    this._t = new THREE.Vector3();
    this._v = new THREE.Vector3();
    this._s = new THREE.Vector3();
  }
  begin(camPos) {
    this.n = 0;
    this.cam.copy(camPos);
  }
  // p0 起点，v0 初速度，yEnd 落点高度，width 起始宽度，alpha 不透明度
  add(p0, v0, yEnd, width, alpha) {
    if (this.n >= this.max || alpha < 0.02) return;
    const dh = p0.y - yEnd;
    if (dh <= 0.02) return;
    const T = (v0.y + Math.sqrt(v0.y * v0.y + 19.6 * dh)) / 9.8;
    const base = this.n * (this.segs + 1) * 2;
    let len = 0;
    const prev = new THREE.Vector3().copy(p0);
    for (let i = 0; i <= this.segs; i++) {
      const k = i / this.segs;
      const t = T * Math.pow(k, 0.85);
      const p = this._p.set(p0.x + v0.x * t, p0.y + v0.y * t - 4.9 * t * t, p0.z + v0.z * t);
      const tan = this._t.set(v0.x, v0.y - 9.8 * t, v0.z).normalize();
      const view = this._v.subVectors(this.cam, p).normalize();
      const side = this._s.crossVectors(tan, view).normalize();
      // 下落加速，水柱变细
      const speed0 = Math.max(0.3, v0.length());
      const speed = Math.hypot(v0.x, v0.y - 9.8 * t, v0.z);
      const w = (width * Math.sqrt(speed0 / speed)) * 0.5;
      len += p.distanceTo(prev);
      prev.copy(p);
      const j = base + i * 2;
      this.pos.set([p.x - side.x * w, p.y - side.y * w, p.z - side.z * w, p.x + side.x * w, p.y + side.y * w, p.z + side.z * w], j * 3);
      this.uv.set([0, len * 2.2, 1, len * 2.2], j * 2);
      const fade = Math.min(1, k * 8) * (k > 0.9 ? 1 - (k - 0.9) * 6 : 1);
      this.alpha[j] = this.alpha[j + 1] = alpha * fade;
    }
    this.n++;
  }
  end() {
    this.geometry.setDrawRange(0, this.n * this.segs * 6);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.uv.needsUpdate = true;
    this.geometry.attributes.aAlpha.needsUpdate = true;
  }
}
