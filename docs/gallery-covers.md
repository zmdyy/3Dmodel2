# 首页封面来源

四张封面均来自当前仓库真实案例的Chromium浏览器WebGL画布截图。截图执行时使用SwiftShader软件WebGL，与案例相同的Three.js材质、光照和几何；不是生成图片，也不是实物照片。仅为构图隐藏UI、改变画布尺寸，不重建装置。

| 首页案例 | 截图状态 | 文件 |
| --- | --- | --- |
| 古代杠杆工坊 | 单碓水力装置，无标签 | assets/covers/ancient-levers-scene.jpg |
| 潜水钟 | 钟口深度3 m、完整钟体、正视近景 | assets/covers/diving-bell-scene.jpg |
| 滑轮实验室 | 二段上下轮组，无尺寸标注 | assets/covers/pulley-lab-scene.jpg |
| 手动摩擦力 | 实际Blender GLB加载后的装置 | assets/covers/friction-manual-step-scene.jpg |

截图来源提交：dda5242567d6971f23ff2dc426278e0718a4843b。执行记录：https://github.com/zmdyy/3Dmodel2/actions/runs/39049977274 。四张图均为960×540 JPEG。

重现方式：运行Capture actual 3D model covers工作流；或准备playwright@1.56.1、sharp@0.34.3与Chromium，设置COVER_NODE_MODULES后运行node scripts/capture-gallery-covers.cjs。输出位于cover-captures，查看截图后再写入assets/covers并更新catalog.js。

运行同时截取了滑轮拓展前侧轮缘与支点力臂的检查画面。浏览器运行未观察到页面错误。

## 新增流体案例封面

烧瓶潜水艇与重力输液同样使用各自实际案例的WebGL画布截图，均为960×540 JPEG。输液封面为玻璃瓶和软袋两个状态并排；详见[流体案例说明](fluid-labs.md)。捕获脚本为`scripts/capture-fluid-covers.cjs`。

## 阿基米德原理封面

`assets/covers/archimedes-principle-scene.jpg` 为排水称重实验默认空载视角的真实 WebGL 画布截图，960×540 JPEG。隐藏操作面板后保留支架、测力计、小桶、溢水杯和桌面圆柱。捕获脚本：`scripts/capture-archimedes-cover.cjs`。



## 瓷底双刀闸刀开关封面

`assets/covers/porcelain-knife-switch-scene.jpg` 为案例默认实物视角的真实浏览器截图（960×540），保留默认分闸角度、原模型材质及照明，仅隐藏操作界面并扩大画布。首页卡片由“刀”字占位改用此图片。重现：`CHROMIUM_PATH=/path/to/chrome node scripts/capture-knife-switch-cover.cjs`。

## 浮力与密度实验室封面

`assets/covers/buoyancy-density-lab-scene.jpg` 为标准实验中木块部分浸入水中的真实 WebGL/SVG 场景截图，960×540 JPEG。仅隐藏页面操作界面并扩大画布，保持实际器材、相机、材质与照明；没有生成或另画封面模型。详见 [案例说明](buoyancy-density-lab.md)。

## 温度计与热膨胀封面

`assets/covers/thermometers-thermal-expansion-scene.jpg` 为当前案例金属杆加热至160°C的实际 WebGL 截图，960×540 JPEG。保留原模型、材质和光照，仅隐藏界面并调整构图；不是生成图片。重现脚本：`scripts/capture-thermometers-cover.cjs`。

## 海波与石蜡、CR400AF 高铁封面（2026-10-30）

两张卡片均改用当前案例实际运行的 Chromium/WebGL 截图（960×540 JPEG），替代原 SVG 示意封面。

- `melting-freezing-lab-scene.jpg`：完整水浴加热装置及温度计圆形放大，海波熔化平台附近的模拟状态。
- `cr400af-railway-power-scene.jpg`：当前 CR400AF 停站阶段的车头近景，保留车体、轨道与站台背景。

仅隐藏截图中的操作界面、调整观察构图；保留原模型、材质与照明。重现：`CHROMIUM_PATH=/path/to/chrome node scripts/capture-thermal-rail-covers.cjs`。

## 干湿球温度计封面（2026-10-30）

`assets/covers/wet-dry-bulb-psychrometer-scene.jpg` 为 `models/wet-dry-bulb-psychrometer.html` V11 的实际 Chromium/WebGL 画布截图，960×540 JPEG。隐藏舞台说明、视角工具栏及状态浮层后，仅调整默认镜头缩放；保留双温度计、湿纱布、水杯、原有材质与光影。截图时 Chromium headless 在当前环境报错 `BindToCurrentSequence failed`，转为 Xvfb 虚拟屏幕下的 Chromium 非无头模式与 Mesa 软件 WebGL 后成功。重现：`scripts/capture-wet-dry-bulb-cover.cjs`，使用 `xvfb-run` 执行。

## 金属箔验电器封面（2026-11-01）

`assets/covers/gold-leaf-electroscope-scene.jpg` 为当前金属箔验电器真实 Chromium/WebGL2 三维画面截图，960×540 JPEG（未采用生成图或重画器材）。状态：橡胶棒靠近金属球，箔片因静电感应张开；红色正电荷固定、蓝色电子重新分布。截取时仅隐藏按钮、说明和计数浮层以突出真实场景，保持模型几何、Three.js r160 材质和场景照明。案例：`models/gold-leaf-electroscope.html`；单文件：`models/gold-leaf-electroscope-offline.html`。

## 生活中的杠杆（2026-11-01）

`assets/covers/life-levers-scene.jpg` 为 `models/life-levers.html` 默认开瓶器场景的真实 Chromium/WebGL 截图，960×540 JPEG。仅隐藏界面并按画布比例重新取景；保留原模型、材质、灯光、瓶盖及支点。重现：`CHROMIUM_PATH=/path/to/chromium node scripts/capture-life-levers-cover.cjs`。


## 海陆风（2026-11-02）

`assets/covers/sea-land-breeze-scene.jpg` 为海陆风案例14:00海风状态的实际 Chromium/WebGL 画布截图，960×540 JPEG。保留当前海岸地形、建筑植被、温度色层、环流箭头及太阳，仅隐藏界面并适配画布比例；未使用生成图或另画场景。可通过 `scripts/capture-sea-land-breeze-cover.cjs` 重现。

## 不同燃料的热值（2026-11-02）

`assets/covers/fuel-calorific-value-scene.jpg`是双灯案例实际运行200 s时的Chromium WebGL/SVG截图，960×540 JPEG。仅隐藏界面并调整实际画布与镜头，保留源装置、燃料示踪色、火焰和原材质；没有使用生成图或另画装置。重现：`CHROMIUM_PATH=/path/to/chromium node scripts/capture-fuel-calorific-value-cover.cjs`。

## 高压锅（2026-11-03）

`assets/covers/pressure-cooker-scene.jpg` 为整机剖切、限压排气与320个气体示踪点的真实 Chromium/WebGL2 画布截图，960×540 JPEG。仅隐藏界面和调整取景；详见 [案例说明](pressure-cooker.md)，可由 `scripts/capture-pressure-cooker-cover.cjs` 重现。

## 盆景自动补水装置（2026-11-03）

`assets/covers/automatic-plant-watering-scene.jpg` 为当前案例补水、前侧剖切状态的真实 Chromium/WebGL 画面，960×540 JPEG。保留连续树干、玻璃水体、橙色曲线出水箭头与球形气泡；仅隐藏操作界面并调整取景。重现：`CHROMIUM_PATH=/path/to/chromium node scripts/capture-automatic-plant-watering-cover.cjs`。详见[案例与验收说明](automatic-plant-watering.md)。

## 三峡船闸 · 三室连通器（2026-11-04）

`assets/covers/three-gorges-ship-lock-scene.jpg` 为当前 V13 的真实 Chromium/SwiftShader WebGL 截图，960×540 JPEG，展示中室向右室输水。仅隐藏面板、调整主相机，保留原模型、材质、灯光及水位标签。复现：`node scripts/capture-ship-lock-cover.cjs`；详见[案例说明](three-gorges-ship-lock.md)。

## 单点式电子秤封面（2026-11-04）

`assets/covers/electronic-scale-single-point-scene.jpg` 为完整电子秤加载 500 g 时的实际 Chromium/WebGL 画布截图，960×540 JPEG。保留默认四节点接线、四芯线束、材料与光照；仅隐藏 UI 并扩展画布，无生成图替代。重现脚本：`scripts/capture-electronic-scale-cover.cjs`，通过 `CHROMIUM_PATH` 指定浏览器。案例说明见 [电子秤](electronic-scale-single-point.md)。

## 大气压拓展 · 四个器物实验

`assets/covers/yin-yang-teapot-scene.jpg` 为实际 Chromium WebGL 画面的 960×540 JPEG。使用默认页签「普通壶」的单腔剖视与开孔倾倒状态，调整视口并隐藏操作界面，保留模型、灯光与水流动画。详见[案例说明](yin-yang-teapot.md)。
