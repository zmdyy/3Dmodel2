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
