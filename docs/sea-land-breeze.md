# 海陆风 · 一天的呼吸

| 项目 | 说明 |
|---|---|
| 教学目标 | 观察海陆温差、近地面风向、上升下沉和高空回流的昼夜变化 |
| 引擎与单位 | 单一 Three.js r160；空间为非等比教学场景，坐标不表示真实海岸距离；时间控件为小时，主循环 dt 为秒，角度 rad，温度 °C |
| 采用资源 | camera-navigation@1.0.0：shared/lab-kit/navigation.js；shared/material-finish.js；本地 Three.js r160 |
| 加载顺序 | 公共导航 → 单一 Three.js 模块 → 可写命名空间副本（构造器仍来自同一实例）→ 公共材质 → 场景 |
| 连接关系 | 海岸 x=0；海洋在负 x，陆地在正 x；同一状态决定色层、温度数字、风向、示踪和日月位置 |
| 物理状态 | T陆=23+7cos[2π(t−15)/24]；T海=24+1.5cos[2π(t−17)/24]。均为示意周期温度，不是能量方程或天气预报；环流速度由温差连续决定，夜间演示较弱、较浅 |
| 新增与依据 | 晴天、弱背景风的理想海岸，环流示意参考 NOAA JetStream：https://www.noaa.gov/jetstream/ocean/sea-breeze；忽略地转偏向、湍流、复杂地形及背景天气 |
| 天体 | 日月沿相反相位的天空弧线升落；不对应真实月相或当地天文时刻；星空为固定种子的非规则随机装饰 |
| 镜头 | 全景、侧面剖视；左拖旋转，右拖或 Shift+左拖屏幕平移，滚轮缩放，双指缩放与平移；没有自动镜头抢占 |
| 放大 | 本案例无仪表特写需求，采用公共导航整体缩放，不增加读数放大窗 |
| 字体与透明效果 | 中文子集字体内嵌；冷暖表面色标和透明渐变温度层不套材质旧化；普通不透明景物使用公共哑光材质 |
| 交付 | 网页 models/sea-land-breeze.html；单文件离线 models/sea-land-breeze-offline.html（内嵌同版引擎、公共导航、材质、字体） |
| 封面 | assets/covers/sea-land-breeze-scene.jpg；960×540，14:00 海风状态真实 WebGL 画布截图；只隐藏界面、适配画布，不另建模型 |
| 验收 | 在线和 file:// 离线：左右拖、Shift 平移、滚轮、复位、夜间状态、390px 布局、页面错误与外部请求检查；公共组件浏览器回归通过；公共源哈希校验存在原有温度计记录不一致，见下文 |

## 校验记录（2026-11-02）

`python scripts/reuse-context.py --validate` 报告 `Source changed: models/thermometers-thermal-expansion.html` 两次；`node scripts/tests/lab-kit.cjs` 的计算与导航断言运行后也在上述校验处失败。该源文件与注册表均未在本次改动中修改；没有为使检查通过而重写历史来源哈希。

`node scripts/tests/reuse-browser.cjs` 通过：真实 WebGL、读数与装置同步、公共放大窗、手动接管、七镜头、390px、离线全流程和三类仪表显示。`node scripts/tests/instrument-patterns.cjs` 单独执行通过。

复现封面：

```sh
CHROMIUM_PATH=/path/to/chromium node scripts/capture-sea-land-breeze-cover.cjs
```
