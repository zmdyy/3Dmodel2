# 给制作与维护本仓库案例的AI

## 开始新案例前

1. 先读 `docs/reuse/README.md`、`docs/reuse/DETAIL-PATTERNS.md`、`shared/lab-kit/registry.json`。先检索资源，再建模。
2. 运行 `python scripts/reuse-context.py --query "用户需求" --engine three-r160`，或用 `--asset ID`。这是本地检索，不调用外部AI。
3. 按依赖顺序读源码、API、来源、示例和限制。同一个文件只加载一次。`extracted`为提取代码，`implemented`为新公共组件；均不等于所有设备与场景已通过用户验收。`reference-only`不可当现成API。
4. 记录教学目标、器材版本、单位、连接关系、物理公式、新增内容、推定与简化。使用 `docs/reuse/CASE-TEMPLATE.md`，参考 `examples/reuse-lab.resources.json`。

## 复用规则

- 当前三维组件固定本地Three.js r160；旧案例保持原引擎。禁止混用多个Three.js实例。
- 公共长度m、力N、时间s、角度rad；测力计内部毫米几何已转换，公共挂接点不能再乘.001。父组不同先统一坐标。
- 场景计算物理量，器材显示结果；模型、SVG、读数、图表共用同一状态。
- 通过命名挂接点组装；静态、极限状态和运动全过程检查干涉与悬空。
- 玻璃复用几何、灯光、背景、曝光、液体与透明顺序整套效果；套杯与新背景需另验。
- 视角优先参考深中通道V26与钱塘江大桥；高铁当前镜头不作为标准。手动旋转/平移/缩放中断自动跟随，用户明确恢复后才能继续。
- 仪器刻度、数字、单位、图示文字保留SVG源稿；3D贴图仅为派生显示，正式读数放大直接显示SVG。
- 三类放大并列保留：圆形定位放大镜、原面板矩形放大、可继续缩放读数窗。按教学任务选用，不全部替换为卡片。
- 局部放大窗优先使用 `detail-view`；仪器提供viewBox/focus，窗口不写死仪器坐标。读数变化保留用户倍率；红色指针不能遮黑刻度与数字。
- 字号见 `typography.css`；按实际屏幕检查SVG字号和中文字体回退，SVG不等于嵌入字体。
- 资源不私建渲染器、不创建独立rAF、不抢主相机；结束时dispose。3D局部适配由宿主提供，不能以窗口外壳冒充已完成的三维特写。
- 旧案例升级需要逐项验证；不要将公共资源改动反向批量套入全部案例。

## 提交前

运行 `python scripts/reuse-context.py --validate`、`node scripts/tests/lab-kit.cjs`、`node scripts/tests/reuse-browser.cjs`、`node scripts/tests/instrument-patterns.cjs`。
Playwright依赖可由 `LAB_KIT_NODE_MODULES` 提供，浏览器可由 `LAB_KIT_CHROMIUM` 指定。缺浏览器必须记为未验收。
修改模块后重新导出离线文件：`python scripts/export-reuse-demo.py`；三类样式另用 `--source examples/instrument-details.html --output examples/instrument-details-offline.html`。
新资源必须补注册表、API、示例、来源与验收证据；截图来自实际运行，不能用生成图替代。
