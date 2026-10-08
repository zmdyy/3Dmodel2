(function (global) {
  'use strict';

  // 统一电流箭头视觉规范。
  // 基准直接来自“油量测量装置”当前已经确认的设计：
  // 26 个箭头、半径 0.062、高度 0.20、8 边锥体、#e8372a、速度 3.0。
  const STYLE = {
    count: 26,
    speed: 3.0,
    color: 0xe8372a,
    radius: 0.062,
    height: 0.20,
    radialSegments: 8
  };

  function createMaterial(THREE) {
    return new THREE.MeshBasicMaterial({ color: STYLE.color });
  }

  // 箭头默认沿 +X，和油量测量装置原实现完全一致。
  function createGeometry(THREE) {
    const geo = new THREE.ConeGeometry(
      STYLE.radius,
      STYLE.height,
      STYLE.radialSegments
    );
    geo.rotateZ(-Math.PI / 2);
    return geo;
  }

  function createAxis(THREE) {
    return new THREE.Vector3(1, 0, 0);
  }

  // 将固定总数的箭头按各段弧长比例分配。
  // 用于由多段独立曲线组成的模型（如滑动变阻器），
  // 让整条有效电流路径的箭头总密度与油量测量装置一致。
  function allocateCounts(lengths, total) {
    total = total == null ? STYLE.count : Math.max(0, Math.round(total));
    const safe = lengths.map(function (v) { return Math.max(0, Number(v) || 0); });
    const sum = safe.reduce(function (a, b) { return a + b; }, 0);
    if (!safe.length || sum <= 1e-8 || total <= 0) return safe.map(function () { return 0; });

    const raw = safe.map(function (v) { return v / sum * total; });
    const out = raw.map(function (v, i) {
      return safe[i] > 1e-8 ? Math.max(1, Math.floor(v)) : 0;
    });

    let used = out.reduce(function (a, b) { return a + b; }, 0);

    if (used < total) {
      const order = raw.map(function (v, i) {
        return { i: i, frac: v - Math.floor(v), len: safe[i] };
      }).sort(function (a, b) {
        return (b.frac - a.frac) || (b.len - a.len);
      });
      let k = 0;
      while (used < total && order.length) {
        out[order[k % order.length].i] += 1;
        used += 1;
        k += 1;
      }
    } else if (used > total) {
      const order = out.map(function (v, i) {
        return { i: i, count: v, len: safe[i] };
      }).sort(function (a, b) {
        return (b.count - a.count) || (b.len - a.len);
      });
      let guard = 0;
      while (used > total && guard < 10000) {
        let changed = false;
        for (let k = 0; k < order.length && used > total; k++) {
          const i = order[k].i;
          if (out[i] > 1) {
            out[i] -= 1;
            used -= 1;
            changed = true;
          }
        }
        if (!changed) break;
        guard += 1;
      }
    }

    return out;
  }

  global.CurrentFlowStyle = Object.freeze({
    count: STYLE.count,
    speed: STYLE.speed,
    color: STYLE.color,
    radius: STYLE.radius,
    height: STYLE.height,
    radialSegments: STYLE.radialSegments,
    createMaterial: createMaterial,
    createGeometry: createGeometry,
    createAxis: createAxis,
    allocateCounts: allocateCounts
  });
})(window);
