// 部件登记表：名称、说明，以及高亮/爆炸视图的统一管理
import * as THREE from 'three';

export const PART_INFO = {
  axle: {
    name: '车轴',
    py: 'chē zhóu',
    desc: '贯穿整个轮子的粗大硬木主轴，两端架在轴承座上。轮子与轴固结在一起同步转动，承受全部自重与水的重量。',
    role: '承重 · 传递转动',
  },
  hub: {
    name: '轮毂',
    py: 'lún gǔ',
    desc: '套在车轴上的两只木鼓，外箍铁箍。两只轮毂相距约 2 米，比轮辋间距宽得多，使辐条形成“伞形”斜拉，大大增强轮子的侧向稳定。',
    role: '固定辐条 · 侧向稳定',
  },
  spoke: {
    name: '辐条',
    py: 'fú tiáo',
    desc: '每侧 16 根，从轮毂放射状伸向轮辋。两侧辐条向内收拢，从侧面看呈 “<>” 形，犹如自行车轮的偏辐，可抵抗水流的侧向冲击。',
    role: '支撑轮辋 · 传力',
  },
  ring: {
    name: '腰箍（内圈）',
    py: 'yāo gū',
    desc: '位于半径约 3 米处的一圈弧形木件，把同侧相邻辐条连成整体，防止辐条在长期受力后扭曲、松动。',
    role: '加固辐条',
  },
  rim: {
    name: '轮辋',
    py: 'lún wǎng',
    desc: '两道由 16 段弧形木（辋片）拼成的大圆环，接缝处用铁板加固。受水板和竹筒都挂在轮辋外缘。',
    role: '外圈骨架',
  },
  tie: {
    name: '横档',
    py: 'héng dàng',
    desc: '连接左右两道轮辋的横木，使两片轮子组成一个整体的“鼓形”框架。',
    role: '连接两侧轮辋',
  },
  paddle: {
    name: '受水板（刮板）',
    py: 'shòu shuǐ bǎn',
    desc: '沿轮缘均布的 32 块木板。轮子底部的受水板没入河水，被水流冲击产生推力，形成绕轴的力矩——这是筒车唯一的动力来源，不需人力畜力。',
    role: '动力 · 把水流动能变为转动',
  },
  tube: {
    name: '竹筒（水斗）',
    py: 'zhú tǒng',
    desc: '32 只一端留竹节封底、一端开口的竹筒，斜绑在轮缘外侧，筒口朝向转动前方并略向内倾。到底部时筒口没入水中装满水，上升时筒口朝上保住水，转过顶点后筒口朝下，水便倾入承水槽。',
    role: '汲水 · 提水 · 倒水',
  },
  lashing: {
    name: '绑绳与木销',
    py: 'bǎng shéng',
    desc: '竹筒用麻绳捆扎，再通过木销固定在轮辋侧面。绑扎角度决定了竹筒“何时盛水、何时倒水”，是筒车调试的关键。',
    role: '固定竹筒 · 设定倾角',
  },
  bearing: {
    name: '轴承座',
    py: 'zhóu chéng zuò',
    desc: '支架顶部的硬木托座与压盖，内凿半圆槽托住车轴，用铁条箍紧。古人常在槽内涂抹油脂减少摩擦。',
    role: '支承车轴 · 减摩',
  },
  frame: {
    name: '支架（人字架）',
    py: 'zhī jià',
    desc: '两侧各一副“人”字形木架，下部用横梁、斜撑与地栿拉结，把整个轮子高高托起，使轮子下缘恰好浸入水中。',
    role: '支撑整机',
  },
  pier: {
    name: '石墩',
    py: 'shí dūn',
    desc: '用块石砌筑的基础，支架立于其上，防止木料长期浸水腐朽，同时抵御洪水冲刷。',
    role: '基础 · 防冲防腐',
  },
  trough: {
    name: '承水槽',
    py: 'chéng shuǐ cáo',
    desc: '架在轮子顶部一侧的木槽。竹筒越过最高点后翻转，水倾泻入槽，汇集后从侧口流入渡槽。',
    role: '接水 · 汇流',
  },
  aqueduct: {
    name: '渡槽（木枧）',
    py: 'dù cáo',
    desc: '由木排架支撑、略带坡度的长木槽，把提升到高处的水跨越下层田块，输送到梯田最高一级。',
    role: '输水上山',
  },
  weir: {
    name: '导流堰',
    py: 'dǎo liú yàn',
    desc: '在河中斜向堆砌的石堰，把宽阔河面的水流收束引向水车，抬高水位、加快流速，让受水板获得更大的冲击力。',
    role: '束水 · 增速',
  },
};

export class PartRegistry {
  constructor() {
    this.parts = new Map(); // key -> { objects:[], materials:Set }
    this.highlighted = null;
    this.hovered = null;
    this._t = 0;
  }
  add(key, object) {
    if (!this.parts.has(key)) this.parts.set(key, { objects: [], materials: new Set() });
    const p = this.parts.get(key);
    p.objects.push(object);
    object.traverse((o) => {
      if (o.isMesh) {
        o.userData.part = key;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          if (m.emissive) {
            if (!m.userData.baseEmissive) m.userData.baseEmissive = m.emissive.clone();
            p.materials.add(m);
          }
        });
      }
    });
    return object;
  }
  meshes() {
    const out = [];
    for (const p of this.parts.values()) p.objects.forEach((o) => o.traverse((m) => m.isMesh && out.push(m)));
    return out;
  }
  setHighlight(key) {
    this.highlighted = key;
  }
  setHover(key) {
    this.hovered = key;
  }
  update(dt) {
    this._t += dt;
    const pulse = 0.5 + 0.5 * Math.sin(this._t * 4);
    for (const [key, p] of this.parts) {
      let k = 0;
      if (key === this.highlighted) k = 0.35 + 0.35 * pulse;
      else if (key === this.hovered) k = 0.25;
      for (const m of p.materials) {
        m.emissive.copy(m.userData.baseEmissive).lerp(HL, k);
      }
    }
  }
}
const HL = new THREE.Color(1.0, 0.62, 0.18);
