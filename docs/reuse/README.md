# 可复用实验资源

目标：让AI找到资源、理解接口、正确组装和验收。总入口为根目录 `AGENTS.md`，机器目录为 `shared/lab-kit/registry.json`。

| ID | 资源 | 范围 |
|---|---|---|
| camera-navigation | 视角与阶段镜头 | 深中通道V26的姿态插值、手动接管、双指平移缩放；引擎无关 |
| svg-scale | SVG刻度和文字 | 向下增长的直线刻度、文字、SVG源稿与贴图派生 |
| glass-beaker | 玻璃容器与液体 | 有厚度杯壁、杯底、水体、液面及整套灯光；基本教学容器 |
| adjustable-stand | 可调铁架台 | 高度、横臂和随动挂接点；基础教学结构 |
| spring-meter-10n | FEIDIE 10 N条形盒测力计 | 原有机构与行程；SVG读数；剖切；公共坐标为m |
| classroom-typography | 字体与字号 | 新案例的屏幕字号和按钮基线 |
| detail-view | 可继续缩放的读数窗 | 拖动、缩放、复位、关闭重开；窄屏移到画面下方 |
| cylinder-linked-lens | 圆形定位放大镜 | measurement-1量筒，保留凹液面和相邻主刻度 |
| instrument-face-detail | 原面板矩形放大 | measurement-1测力计，指针避开黑刻度 |

[API](API.md) · [局部放大样式清单](DETAIL-PATTERNS.md) · [组装演示](../../examples/reuse-lab.html) · [离线组装演示](../../examples/reuse-lab-offline.html) · [三类样式对照](../../examples/instrument-details.html) · [离线样式对照](../../examples/instrument-details-offline.html) · [验收](VALIDATION.md)

## 实际使用

告诉AI：“先读取仓库AGENTS.md，检索已有器材和功能，列出复用资源与新增内容，再开始制作。”

```bash
python scripts/reuse-context.py --query "浮力、玻璃杯、测力计、局部放大" --engine three-r160
python scripts/reuse-context.py --asset spring-meter-10n --asset detail-view
python scripts/reuse-context.py --list
python scripts/reuse-context.py --validate
```

工具按中文别名检索，补齐依赖，输出真实API、参数单位、连接点、示例、来源与限制。不会自动为外部AI建立仓库访问；新对话仍需提供仓库链接或下载目录。无匹配时试同义词或完整目录，不能据此编造函数。

资源负责外形和显示，场景负责物理公式与教学流程。例如场景算 `F=mg−ρgV排` 后调用 `meter.setForce(F)`，图表与读数用同一结果。

开发使用模块，交付导出单文件。只加载需要的资源，同文件只加载一次。版本、来源哈希与验收范围保存在注册表；候选项目尚未提取，不能当现成资源。

## 已沉淀经验

| 问题 | 固化办法 | 验收 |
|---|---|---|
| 玻璃过白、水体不清 | 整套材质/背景/灯光/曝光/透明顺序 | 空杯、盛水、侧视、斜视、近景 |
| 刻度模糊、文字过小 | SVG源稿，放大区直接SVG，按实际屏幕字号 | 默认/局部读数、单位、最小分格 |
| 镜头一直全景 | 阶段观察目标、局部尺寸与时间 | 每个机构都出现近景，完整播放 |
| 镜头抢控制 | 手动接管中断，明确恢复 | 鼠标、滚轮、双指 |
| 模式残留、零件悬空 | 场景持有实例、命名连接点、dispose | 往返切换、极限状态、运动全程 |
| 动画和读数不同步 | 统一物理状态源 | 起点/终点/跳转/重置 |

下一批候选包括温度计、圆形表盘、套杯、熔化凝固玻璃效果、酒精灯和陶土网；资料不足或尚未验证要明确标记。
