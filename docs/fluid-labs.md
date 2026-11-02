# 烧瓶潜水艇与重力输液

## 独立案例

| 首页 ID | 文件 | 版本 |
| --- | --- | --- |
| flask-submarine | models/flask-submarine.html | 烧瓶潜水艇 V4，离线装配剖切 |
| gravity-infusion | models/gravity-infusion.html | 输液 V4，玻璃透射、塑料薄膜质感、气流与袋体收缩 |

保留经离线验证的原文件内容、Three.js r170、字体与开源许可。两页为完整独立 HTML；未追加旧版材质脚本或改写物理求解。

## 首页实际截图

- `assets/covers/flask-submarine-scene.jpg`：烧瓶处于中性进水量，装配剖视，展示水槽、烧瓶、双管和乳胶管。
- `assets/covers/gravity-infusion-scene.jpg`：同一输液案例的玻璃瓶与软袋初始状态各占半幅，展示两种不同穿刺器与滴斗。
- 两图均为960×540 JPEG，由实际案例的WebGL画布截图得到，使用原有几何、材质与灯光；仅隐藏页面控件、调整画布尺寸及观察镜头。输液封面将两幅真实截图并排，无生成图片。
- 捕获脚本：`scripts/capture-fluid-covers.cjs`；需要Playwright，可用`COVER_CHROMIUM`指定Chromium。可选`COVER_CHROMIUM_MODULE`用于导入自定义Chromium启动参数。脚本断网运行；用Pillow将潜艇PNG转JPEG，输液两幅480×540 PNG并排转JPEG。

## 教学边界

烧瓶吸气进水、吹气排水，改变装置总重力；密闭气体与静水压耦合，支持触底。软管牵拉与流体晃动省略。

输液默认敞口量杯。玻璃瓶双通道、侧面过滤进气；软袋采用无进气支路单通道。×1时平均落滴量对应计算流量；×30/×120时落滴为连续慢镜示意，体积、接收液位和袋体收缩按模拟时间计算。软袋侧视虚线固定为本次初始轮廓，大气压箭头可关闭。仅为物理教学模型。

## 重力输液材质更新（2026-11-02）

- 采用用户验收的材质优化版，保留内嵌引擎、字体及离线单文件结构。
- 厚壁玻璃使用透射、折射率、厚度和吸收参数；矩形柔光环境产生条形反射。蓝色教学液体保留在不透明渲染通道，以供玻璃透射采样，属于兼容当前 WebGL 渲染流程的显示近似。
- 软袋使用独立薄膜材质、外表面细微起伏及热封边微纹理；起伏不改变物理求解容积。标签随袋体曲面贴合，避免与薄膜相交。默认显示完整容器，可开启剖视。
- 同步前已实际运行检查玻璃、软袋两种状态，断网无外部请求、无浏览器错误。此前该案例的液量守恒、开闭进气、收缩与镜头交互已验证。
- 新封面仍为两幅真实画布截图并排。重现：`COVER_CHROMIUM=/path/to/chromium node scripts/capture-gravity-infusion-cover.cjs`；需要 Playwright 与 Pillow，可通过 `COVER_NODE_MODULES` 指定 Node 依赖目录。
