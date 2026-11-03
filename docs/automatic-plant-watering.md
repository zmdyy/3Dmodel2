# 盆景自动补水装置

案例：`models/automatic-plant-watering.html`。完整单文件，内嵌本地 Three.js r160 与 `camera-navigation@1.0.0`，双击 HTML 可离线运行。

| 项目 | 记录 |
| --- | --- |
| 教学目标 | 观察植物吸水、水位下降、瓶口进气、瓶内出水与恢复水封的循环；理论内容由教师讲解。 |
| 引擎与单位 | 单一 Three.js r160、Y 向上。几何为教学场景单位，水位读数沿用 1 单位对应 10 cm 的示意映射；水量、时间和土壤湿度不作实测标定。 |
| 采用资源 | 内嵌 `shared/lab-kit/navigation.js`（camera-navigation@1.0.0）；玻璃环境与透明顺序参考自制气压计、温度计与微小形变案例；弧线移动、切线朝向参考海陆风案例。 |
| 连接关系 | 水槽底板、四侧壁与边沿在同一父坐标；瓶口在两侧支撑之间；水体、液面及球形气泡随瓶体坐标；主树干为连续渐细曲面。 |
| 物理状态 | 唯一 sim 状态驱动液面、气泡、箭头与读数。吸水降低槽水位；低于瓶口阈值时开启补水；补水恢复水封后停止。不显示气压数值或公式。 |
| 新增与简化 | 由用户装置参考图程序化建模，非扫描或制造 CAD；植物吸水加速，气泡与箭头放大，补水速率与阈值采用定性教学模型。 |
| 镜头 | 全景按场景边界适配；瓶口与剖切近看。公共导航平滑过渡；手动输入立即接管，只有点击观察按钮才重新定位。 |
| 局部放大 | 同一真实三维场景的瓶口特写，可继续旋转、平移和缩放；无独立渲染器。 |
| 字体与玻璃 | 系统中文字体回退；SVG 仅用于简短标识与红色大气压箭头。蓝灰背景、环境反射壳、内壁、液面与透明顺序联合验收。 |
| 操作 | 左拖旋转；右拖或 Shift＋左拖按屏幕平移；滚轮缩放；双指平移与捏合缩放。前侧剖切、大气压为独立按钮。 |
| 封面 | `assets/covers/automatic-plant-watering-scene.jpg`，960×540 JPEG，实际 Chromium/WebGL 补水状态截图。仅隐藏界面、调整画布与取景，保留源模型、材质、光照与动画对象。 |

## 验收

2026-11-03，在 Chromium + SwiftShader 实际 WebGL 中检查：公共左拖旋转、右拖与 Shift 平移等价、滚轮、手动接管、前侧剖切、大气压开关、至少 8 个立体气泡、重置、首页搜索、封面加载与打开案例。离线 file:// 未发起 HTTP(S) 请求。

```bash
LAB_KIT_CHROMIUM=/path/to/chromium node scripts/tests/automatic-plant-watering.cjs
CHROMIUM_PATH=/path/to/chromium node scripts/capture-automatic-plant-watering-cover.cjs
```

仓库要求的公共验收：`reuse-browser.cjs` 与 `instrument-patterns.cjs` 通过；`reuse-context.py --validate` 与 `lab-kit.cjs` 在未修改的温度计来源文件上报告 `Source changed: models/thermometers-thermal-expansion.html`（注册表来源哈希已有偏差）。本次不修改该来源文件或公共注册表。

尚未覆盖：实体触屏设备与所有浏览器的表现。用户已逐轮确认修改方向，入库版本完成实际浏览器验收。
