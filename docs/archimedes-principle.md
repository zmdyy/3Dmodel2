# 阿基米德原理 · 排水称重实验

入口：`models/archimedes-principle.html`。首页封面：`assets/covers/archimedes-principle-scene.jpg`。

## 实验结构

独立 HTML，不并入 `index.html`。Three.js r160、统一旋转平移与材质层分别引用：

- `shared/vendor/three-r160.min.js`
- `shared/navigation-style.js`
- `shared/material-finish.js`

玻璃、水面、接水液面和示意水滴设置 `userData.noMaterialFinish=true`，避免透明液体被统一旧化。旋转：左键旋转，右键或 Shift 平移，滚轮缩放。

## 教学过程

默认空载。随后按甲、乙、丙、丁记录：

| 步骤 | 测量量 | 理想数据（水） |
| --- | --- | --- |
| 甲 | 空桶重力 G₀ | 0.3 N |
| 乙 | 物体重力 G | 2.7 N |
| 丙 | 浸入时测力计示数 F | 随浸入体积变化；全浸后 1.7 N |
| 丁 | 桶和水总重 G₁ | G₀ 加上排出液体重力 |

金属圆柱质量 270 g、体积 100 cm³。水密度 1.0 g/cm³，盐水 1.2 g/cm³。称重法：F浮 = G − F；排液重力：G排 = G₁ − G₀。完全浸没后继续下放，浮力保持不变。提起物体时，桶内水不会自动回到溢水杯，需“重新接水”。

溢水杯初始液面位于溢水口下沿（程序液面高度 1.18）。红色截面表示初始水面；液面下降后，下降带保持红色。溢水口斜向下约 20°。测力计量程 5 N、分度值 0.1 N，读数保留一位小数。

## 模型边界

- 示数、溢水量和桶内水量由同一组理想计算给出，不是实验室实测。
- 动画水滴表示流向，不作为计量依据。
- 圆柱不碰杯壁或杯底；不模拟粘滞、表面张力、测力计摩擦或读数抖动。
- 液体可切换水和盐水，密度只改变浮力与排液重力，不改变几何体积。

## 资料

- OpenStax, University Physics Volume 1, §14.4 Archimedes’ Principle and Buoyancy: https://openstax.org/books/university-physics-volume-1/pages/14-4-archimedes-principle-and-buoyancy
- Universidad Carlos III de Madrid, Archimedes experiment notes: https://laboratoriofisica.uc3m.es/guiones_ing/bio-fisicaIII/Archimedes.pdf

## 封面

`assets/covers/archimedes-principle-scene.jpg` 为默认空载视角的真实 WebGL 画布截图，960×540。截图时隐藏操作面板、步骤条和读数放大图，保留支架、测力计、小桶、溢水杯和桌面圆柱。重现：`node scripts/capture-archimedes-cover.cjs`。


## 操作栏紧凑布局（2026-10-23）

桌面操作栏收窄至 390 px，常规文字调整为 14～17 px，压缩面板、表格和按钮间距。较矮窗口的四项称量记录以两列紧凑排列；低高度下操作按钮同排，保留所有读数、操作与结果。局部放大框以右上角为基准整体缩放为原来的 60%（桌面实际宽度 168 px），刻度及指针计算保持原样。

浏览器逐状态检查空载、甲、乙、丙、丁及结果显示，并检查作品集嵌入时扣除顶部栏后的有效高度，避免只检查独立全屏页面。
