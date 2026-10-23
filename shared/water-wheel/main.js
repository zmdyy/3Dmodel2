import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import * as TX from './textures.js';
import { buildTerrain, heightAt, TER } from './terrain.js';
import { WaterWheel, W } from './wheel.js';
import { PartRegistry, PART_INFO } from './parts.js';
import { buildRiver, terraceWaterMaterial, linkWaterUniforms, WaterParticles, Ripples, PourStreams, waterUniforms } from './water.js';
import { buildStructures } from './structures.js';
import { buildVegetation } from './vegetation.js';
import { Environment } from './environment.js';
import { Guides, PartLabels } from './guides.js';
import { WaterAudio } from './audio.js';
import { STEPS } from './story.js';

const $ = (id) => document.getElementById(id);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// 让出主线程刷新载入进度；页面在后台时 rAF 会暂停，所以加一个定时兜底
const nextFrame = () =>
  new Promise((r) => {
    let done = false;
    const f = () => !done && ((done = true), r());
    requestAnimationFrame(() => setTimeout(f, 0));
    setTimeout(f, 80);
  });

async function progress(p, msg) {
  $('loader-fill').style.width = `${Math.round(p * 100)}%`;
  $('loader-msg').textContent = msg;
  await nextFrame();
}

const VIEWS = {
  overview: [V(-35, 32, -42), V(0, 4.5, 10)],
  front: [V(0.5, 6.8, -21), V(0, 6.2, 0)],
  side: [V(24, 7.5, 4), V(0, 6.3, 1)],
  bottom: [V(-6.5, 1.6, -7.5), V(0.5, 0.4, 0)],
  top: [V(6.8, 14.2, 6.2), V(1.4, 11.2, 1.0)],
  aqueduct: [V(10, 15, -1), V(1.4, 9.5, 14)],
  terraces: [V(-24, 24, -8), V(10, 6, 24)],
};
const FOCUS = {
  axle: [V(3.2, 7.6, -6.5), V(0, 6.3, -1.5)],
  hub: [V(2.8, 7.6, -5), V(0, 6.3, -1)],
  spoke: [V(-4.5, 9, -9.5), V(-1.5, 7.5, -0.6)],
  ring: [V(-6.5, 5, -9.5), V(-2.6, 4.8, -0.7)],
  rim: [V(-7.5, 13, -8.5), V(-3.8, 10.9, -0.4)],
  tie: [V(-10, 3, -5.5), V(-5.4, 4.3, 0)],
  paddle: [V(-6.5, 1.6, -6.5), V(-2.8, 0.4, -0.3)],
  tube: [V(11.5, 9.5, 5.5), V(6, 8.5, 0.8)],
  lashing: [V(9, 11.5, 4.5), V(5.2, 10, 0.6)],
  bearing: [V(2.2, 7.6, -5.2), V(0, 6.3, -2)],
  frame: [V(-6.5, 4, -11), V(0, 3.5, -2)],
  pier: [V(-9.5, 2.2, -8.5), V(-3, 0, -2)],
  trough: [V(7.2, 14.6, 6.4), V(1.4, 11.2, 1.0)],
  aqueduct: [V(10, 15, -1), V(1.4, 9.5, 14)],
  weir: [V(-32, 11, -24), V(-18, 0, -7)],
};

async function main() {
  await progress(0.03, '绘制木纹、竹材与石料纹理…');
  const tex = {
    wood: TX.woodTexture({ seed: 3 }),
    woodDark: TX.woodTexture({ seed: 8, base: '#5e4630', dark: '#2c1e12', light: '#86684a', weather: 0.9 }),
    woodOld: TX.woodTexture({ seed: 13, base: '#6d5b47', dark: '#392a1d', light: '#9c8a72', weather: 1.2 }),
    bamboo: TX.bambooTexture(),
    stone: TX.stoneTexture(),
    rope: TX.ropeTexture(),

    detail: TX.detailTexture(),
    waterN: TX.waterNormalTexture(),




    flow: TX.flowTexture(),
    soft: TX.softSprite(),
  };

  // —— 渲染器 ——
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  $('app').appendChild(renderer.domElement);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  Object.values(tex).forEach((t) => (t.anisotropy = Math.min(2, maxAniso)));

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.id = 'labels';
  document.body.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 260);
  camera.position.copy(VIEWS.overview[0]);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(VIEWS.overview[1]);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 1.5;
  controls.maxDistance = 110;
  controls.autoRotateSpeed = 0.5;
  window.Navigation3D.configureOrbit(controls);

  await progress(0.08, '布置课堂照明…');
  const env = new Environment(renderer, scene, tex);

  await progress(0.14, '布置局部河段与梯田…');
  const terrain = buildTerrain(tex.detail);
  scene.add(terrain.outerMesh, terrain.patchMesh);
  const terraceWater = new THREE.Mesh(terrain.terraceWaterGeometry, linkWaterUniforms(terraceWaterMaterial(), tex.waterN));
  terraceWater.renderOrder = 1;
  scene.add(terraceWater);

  await progress(0.38, '架设筒车：车轴、轮毂、辐条、轮辋、竹筒…');
  const registry = new PartRegistry();
  const wheel = new WaterWheel(tex, registry);
  scene.add(wheel.root);
  const particles = new WaterParticles(1800);
  scene.add(particles.points);
  const ripples = new Ripples();
  scene.add(ripples.mesh);
  const streams = new PourStreams(tex.flow);
  scene.add(streams.mesh);

  await progress(0.5, '修筑渡槽、导流堰与驳岸…');
  const st = buildStructures(scene, tex, registry, particles);

  await progress(0.58, '引河水入渠…');
  const river = buildRiver(tex.waterN, {
    piers: [
      new THREE.Vector4(-3.75, -2.03, 1.3, 0.75),
      new THREE.Vector4(3.3, -2.03, 0.9, 0.75),
      new THREE.Vector4(-3.75, 2.03, 1.3, 0.75),
      new THREE.Vector4(3.3, 2.03, 0.9, 0.75),
      new THREE.Vector4(-2.2, 1.62, 0.38, 0.38),
      new THREE.Vector4(0, 0, 0, 0),
    ],
    weir: st.weirSegs,
  });
  scene.add(river);

  await progress(0.66, '布置精简稻田…');
  const veg = buildVegetation(scene, tex);
  await progress(0.86, '准备讲解与标注…');
  const guides = new Guides(scene, st.aqueduct);
  const labels = new PartLabels(
    scene,
    [
      ['aqueduct', V(st.aqueduct.x + 0.3, st.aqueduct.yAt(11) + 0.45, 11), V(0, 0, 0)],
      ['weir', V(st.weirMid.x, 0.5, st.weirMid.z), V(0, 0, 0)],
    ],
    (key) => selectPart(key, true)
  );
  const audio = new WaterAudio();

  // —— 状态 ——
  const S = {
    paused: false,
    quality: 'eco',
    river: 2.2,
    sim: 1,
    explode: 0,
    explodeTarget: 0,
    mode: 'tour',
    selected: null,
    tracking: false,
    step: 0,
    stepT: 0,
    auto: true,
  };

  $('pause').onclick = () => { S.paused = !S.paused; $('pause').textContent = S.paused ? '继续演示' : '暂停演示'; };
  $('fullscreen').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  $('quality').onchange = (e) => {
    S.quality = e.target.value;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, S.quality === 'eco' ? 1 : 1.5));
    renderer.shadowMap.enabled = S.quality === 'clear';
    resize();
  };
  // —— 镜头飞行 ——
  let fly = null;
  function flyTo(pos, target, dur = 2.4) {
    controls.autoRotate = false;
    fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), t: 0, dur };
  }
  controls.addEventListener('start', () => {
    fly = null;
  });
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

  // —— 部件列表 ——
  const keys = Object.keys(PART_INFO);
  $('part-list').innerHTML = keys.map((k, i) => `<li data-k="${k}"><i>${String(i + 1).padStart(2, '0')}</i>${PART_INFO[k].name}</li>`).join('');
  $('part-list').addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (li) selectPart(li.dataset.k, true);
  });
  function selectPart(key, focus = false) {
    S.selected = key;
    registry.setHighlight(key);
    labels.setActive(key);
    document.querySelectorAll('#part-list li').forEach((li) => li.classList.toggle('on', li.dataset.k === key));
    const card = $('part-card');
    if (!key) {
      card.classList.add('hidden');
      return;
    }
    const p = PART_INFO[key];
    $('pc-name').textContent = p.name;
    $('pc-py').textContent = p.py;
    $('pc-role').textContent = p.role;
    $('pc-desc').textContent = p.desc;
    card.classList.remove('hidden');
    // 重新触发动画
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = '';
    if (focus && FOCUS[key]) {
      const [p0, t0] = FOCUS[key];
      flyTo(p0, t0);
    }
  }
  $('pc-close').onclick = () => selectPart(null);
  $('pc-focus').onclick = () => S.selected && FOCUS[S.selected] && flyTo(...FOCUS[S.selected]);

  // —— 控件 ——
  const setFill = (el) => {
    const p = ((el.value - el.min) / (el.max - el.min)) * 100;
    el.style.setProperty('--p', `${p}%`);
  };
  const bindRange = (id, fn) => {
    const el = $(id);
    const h = () => {
      setFill(el);
      fn(parseFloat(el.value));
    };
    el.addEventListener('input', h);
    h();
    return el;
  };
  bindRange('s-river', (v) => {
    S.river = v;
    $('o-river').textContent = `${v.toFixed(1)} m/s`;
  });
  const simEl = bindRange('s-sim', (v) => {
    S.sim = v;
    $('o-sim').textContent = `${v.toFixed(2).replace(/0$/, '')}×`;
  });
  bindRange('s-hour', (v) => {
    const hh = Math.floor(v), mm = Math.round((v - hh) * 60);
    $('o-hour').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    env.setHour(v);
  });
  const explodeEl = bindRange('s-explode', (v) => {
    S.explodeTarget = v;
    $('o-explode').textContent = `${Math.round(v * 100)}%`;
  });
  const setSlider = (el, v) => {
    el.value = v;
    el.dispatchEvent(new Event('input'));
  };

  const tgl = (id, fn) => {
    const el = $(id);
    el.addEventListener('change', () => fn(el.checked));
    return el;
  };
  const tLabels = tgl('t-labels', (v) => labels.setVisible(v));
  tgl('t-xray', (v) => wheel.setXray(v));
  const tTrack = tgl('t-track', (v) => setTracking(v));
  const tPath = tgl('t-path', (v) => guides.setVisible({ path: v }));
  const tFlow = tgl('t-flow', (v) => guides.setVisible({ flow: v, force: v }));
  tgl('t-sound', (v) => (v ? audio.start() : audio.stop()));

  function setTracking(on) {
    S.tracking = on;
    tTrack.checked = on;
    wheel.setTracked(on ? 5 : -1);
    $('tracker').classList.toggle('hidden', !on);
  }

  // 追踪表盘的固定弧线
  {
    const arc = (a0, a1) => {
      const r = 38;
      const p = (a) => `${(r * Math.cos(a)).toFixed(2)} ${(-r * Math.sin(a)).toFixed(2)}`;
      const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
      return `M ${p(a0)} A ${r} ${r} 0 ${large} 0 ${p(a1)}`;
    };
    const d2r = Math.PI / 180;
    $('tr-arc-fill').setAttribute('d', arc(-104 * d2r, -77 * d2r));
    $('tr-arc-pour').setAttribute('d', arc(57 * d2r, 90 * d2r));
    $('tr-dial').querySelector('.water').setAttribute('y1', 37);
    $('tr-dial').querySelector('.water').setAttribute('y2', 37);
  }

  document.querySelectorAll('#views button').forEach((b) =>
    b.addEventListener('click', () => {
      const v = b.dataset.view;
      if (v === 'orbit') {
        fly = null;
        controls.autoRotate = !controls.autoRotate;
        b.classList.toggle('on', controls.autoRotate);
        if (controls.autoRotate && camera.position.distanceTo(controls.target) > 60) flyTo(V(-18, 10, -18), V(0.5, 6, 0.5));
        return;
      }
      document.querySelector('#views [data-view="orbit"]').classList.remove('on');
      flyTo(...VIEWS[v]);
    })
  );

  // —— 模式 ——
  function setMode(mode) {
    S.mode = mode;
    document.querySelectorAll('#modes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    $('story').classList.toggle('hidden', mode !== 'principle');
    if (mode === 'structure') {
      tLabels.checked = true;
      labels.setVisible(true);
      setSlider(explodeEl, 0.6);
      guides.setVisible({ rotation: false, force: false, flow: false, path: false });
      tPath.checked = tFlow.checked = false;
      flyTo(V(11, 10, -17), V(0.5, 6.4, 0));
    } else if (mode === 'principle') {
      setSlider(explodeEl, 0);
      tLabels.checked = false;
      labels.setVisible(false);
      gotoStep(0);
    } else {
      setSlider(explodeEl, 0);
      tLabels.checked = false;
      labels.setVisible(false);
      guides.setVisible({ rotation: false, force: false, flow: false, path: false });
      tPath.checked = tFlow.checked = false;
      setSlider(simEl, 1);
      registry.setHighlight(S.selected);
      flyTo(...VIEWS.overview);
    }
  }
  document.querySelectorAll('#modes button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

  // —— 原理分步 ——
  $('st-dots').innerHTML = STEPS.map((_, i) => `<i data-i="${i}"></i>`).join('');
  $('st-dots').addEventListener('click', (e) => e.target.dataset.i && gotoStep(+e.target.dataset.i));
  $('st-prev').onclick = () => gotoStep((S.step - 1 + STEPS.length) % STEPS.length);
  $('st-next').onclick = () => gotoStep((S.step + 1) % STEPS.length);
  $('st-auto').addEventListener('change', (e) => (S.auto = e.target.checked));
  const STEP_DUR = 14;
  function gotoStep(i) {
    S.step = i;
    S.stepT = 0;
    const s = STEPS[i];
    $('st-index').textContent = `${i + 1} / ${STEPS.length}`;
    $('st-title').textContent = s.title;
    $('st-text').innerHTML = s.text;
    document.querySelectorAll('#st-dots i').forEach((d, j) => d.classList.toggle('on', j === i));
    flyTo(s.view[0], s.view[1], 2.8);
    const g = { rotation: false, force: false, flow: false, path: false, ...s.guides };
    guides.setVisible(g);
    tPath.checked = !!g.path;
    tFlow.checked = !!g.flow;
    registry.setHighlight(s.highlight);
    if (s.highlight) selectPart(s.highlight);
    else selectPart(null);
    setTracking(!!s.track);
    setSlider(simEl, s.sim ?? 1);
  }

  // —— 拾取 ——
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let needPick = false, mouseClient = [0, 0], downAt = null;
  const pickables = registry.meshes();
  renderer.domElement.addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    mouseClient = [e.clientX, e.clientY];
    needPick = true;
  });
  renderer.domElement.addEventListener('pointerdown', (e) => (downAt = [e.clientX, e.clientY]));
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 4) return;
    const hit = pick();
    if (hit) selectPart(hit);
  });
  renderer.domElement.addEventListener('dblclick', () => {
    const hit = pick();
    if (hit && FOCUS[hit]) {
      selectPart(hit);
      flyTo(...FOCUS[hit]);
    }
  });
  function pick() {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    for (const h of hits) {
      let o = h.object;
      if (o.userData.part) return o.userData.part;
    }
    return null;
  }
  const tooltip = $('tooltip');

  window.addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('ui-off');
  });

  // —— 尺寸 ——
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    particles.material.uniforms.scale.value = size.y / (2 * Math.tan((camera.fov * Math.PI) / 360));

  }
  window.addEventListener('resize', resize);
  resize();

  // 预热：让水车先转一会儿，竹筒里有水
  for (let i = 0; i < 1800; i++) wheel.update(1 / 30, S.river, null);


  await progress(1, '完成');
  $('loader').classList.add('done');
  setTimeout(() => $('loader')?.remove(), 1200);

  // —— 主循环 ——
  let lastTs = 0;
  let simTime = 0, wallTime = 0, statT = 0, pickT = 0;
  const statEls = ['d-rpm', 'd-vel', 'd-head', 'd-flow', 'd-day', 'd-power', 'd-area'].map($);
  const trackInfo = { mouth: new THREE.Vector3(), d: new THREE.Vector3(), base: new THREE.Vector3(), vel: new THREE.Vector3(), theta: 0 };

  function frame(ts) {
    requestAnimationFrame(frame);
    if (document.hidden) { lastTs = ts; return; }
    const elapsed = (ts - lastTs) / 1000;
    if (elapsed < (S.quality === 'eco' ? 1/30 : 1/60)) return;
    lastTs = ts;
    tick(Math.min(elapsed, 0.1));
  }
  function tick(dtReal) {
    const dt = S.paused ? 0 : dtReal * S.sim;
    wallTime += dtReal;
    simTime += dt;

    // 镜头
    if (fly) {
      fly.t += dtReal;
      const k = ease(Math.min(1, fly.t / fly.dur));
      camera.position.lerpVectors(fly.p0, fly.p1, k);
      controls.target.lerpVectors(fly.t0, fly.t1, k);
      if (k >= 1) fly = null;
    }
    controls.update(dtReal);
    const gh = Math.max(heightAt(camera.position.x, camera.position.z), 0) + 0.6;
    if (camera.position.y < gh) camera.position.y = gh;

    // 爆炸视图
    if (Math.abs(S.explode - S.explodeTarget) > 1e-4) {
      S.explode += (S.explodeTarget - S.explode) * Math.min(1, dtReal * 5);
      if (Math.abs(S.explode - S.explodeTarget) < 0.002) S.explode = S.explodeTarget;
      wheel.setExplode(S.explode);
      labels.setExplode(S.explode);
    }

    // 模拟
    if (dt > 0) {
    streams.begin(camera.position);
    wheel.update(dt, S.river, particles, 0, streams);
    particles.update(dt);
    while (particles.impacts.length) ripples.add(...particles.impacts.pop());
    ripples.update(dt);
    st.update(dt, wheel.pourRate, wheel.omega, streams);
    streams.end();
    waterUniforms.time.value = simTime;
    }
    river.material.uniforms.flowSpeed.value = S.river;
    river.material.uniforms.foamAmount.value = Math.min(1.4, 0.4 + wheel.omega * 5);

    env.update(dtReal, wallTime, camera);
    guides.update(dt, S.river, wheel.omega);
    registry.update(dtReal);
    audio.update(S.paused ? 0 : wheel.pourRate, S.paused ? 0 : S.river, camera.position.distanceTo(V(0, 6, 0)));

    // 原理自动播放
    if (S.mode === 'principle') {
      if (S.auto && !fly && !S.paused) S.stepT += dtReal;
      $('st-bar').style.width = `${Math.min(100, (S.stepT / STEP_DUR) * 100)}%`;
      if (S.auto && S.stepT > STEP_DUR) gotoStep((S.step + 1) % STEPS.length);
    }

    // 悬停拾取（限频）
    pickT += dtReal;
    if (needPick && pickT > 0.06) {
      pickT = 0;
      needPick = false;
      const hit = pick();
      registry.setHover(hit);
      if (hit) {
        tooltip.innerHTML = `${PART_INFO[hit].name}<small>${PART_INFO[hit].role}</small>`;
        tooltip.style.left = `${mouseClient[0]}px`;
        tooltip.style.top = `${mouseClient[1]}px`;
        tooltip.classList.remove('hidden');
        renderer.domElement.style.cursor = 'pointer';
      } else {
        tooltip.classList.add('hidden');
        renderer.domElement.style.cursor = '';
      }
    }

    // 数据
    statT += dtReal;
    if (statT > 0.25) {
      statT = 0;
      const Q = wheel.pourRate; // m³/s
      const H = W.trough.yTop - 0;
      statEls[0].textContent = wheel.rpm.toFixed(2);
      statEls[1].textContent = (wheel.omega * W.tubeRc).toFixed(2);
      statEls[2].textContent = H.toFixed(1);
      statEls[3].textContent = (Q * 60000).toFixed(0);
      statEls[4].textContent = (Q * 86400).toFixed(0);
      statEls[5].textContent = (1000 * 9.8 * Q * H).toFixed(0);
      statEls[6].textContent = ((Q * 86400) / 0.008 / 666.7).toFixed(0);
    }
    if (S.tracking && wheel.tracked >= 0) {
      const tb = wheel.tubes[wheel.tracked];
      wheel.tubeWorld(wheel.tracked, trackInfo);
      let deg = (trackInfo.theta * 180) / Math.PI;
      $('tr-id').textContent = wheel.tracked + 1;
      $('tr-angle').textContent = `${deg.toFixed(0)}°`;
      $('tr-bar').style.width = `${(tb.fill * 100).toFixed(0)}%`;
      $('tr-pct').textContent = `${(tb.fill * 100).toFixed(0)}% · ${(tb.fill * W.tubeVol * 1000).toFixed(1)} L`;
      $('tr-state').textContent = tb.state;
      const a = trackInfo.theta;
      const dot = $('tr-dot');
      dot.setAttribute('cx', (38 * Math.cos(a)).toFixed(2));
      dot.setAttribute('cy', (-38 * Math.sin(a)).toFixed(2));
    }

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  // 调试入口
  window.__app = { tick, labelRenderer, scene, camera, controls, wheel, renderer, st, veg, env, S, flyTo, selectPart, setMode, gotoStep, particles, streams, guides };
}

main().catch((e) => {
  console.error(e);
  $('loader-msg').textContent = '加载失败：' + e.message;
});
