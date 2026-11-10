# 本地启动验证（2026-11-02）

## 问题与改动

普通仓库页面会跨文件读取 ES 模块、GLB 与纹理，不能统一保证 `file://` 双击运行。新增根目录 `start-local.cmd`，使用 Windows 自带 PowerShell/.NET 提供仅绑定 `127.0.0.1` 的静态文件服务；动态选择空闲端口，自动打开首页。首页在 `file://` 下显示启动说明。

保留完整目录，不修改模型、贴图、渲染器或实验逻辑。需要直接分享单个 HTML 时，仍应单独生成内嵌所有依赖的版本。

## 本次验证

测试环境：Linux、PowerShell 7.4.6、Chrome Headless Shell 131、Playwright。执行的是新增 `scripts/serve-local.ps1` 本身，不是替代服务器。尚未在 Windows 实机执行双击流程；脚本仅使用 PowerShell 5.1 / .NET Framework 4.x 支持的语法和 API。

运行服务后，在同一网络环境执行：

```sh
node scripts/tests/local-server.cjs http://127.0.0.1:<启动窗口打印的端口>/
```

通过：模型、模块与纹理并发请求，字节与原文件一致，正确 MIME、查询参数、首页、HEAD；路径越界与隐藏文件拒绝访问，缺文件返回 404，写入方法返回 405。

浏览器阻断全部外网 HTTP(S) 请求，仅允许本机服务，结果如下：

| 案例 | 检查结果 |
| --- | --- |
| DZ47 断路器 | GLB 加载成功，界面显示“模型已加载” |
| 筒车 | 模块启动成功，`window.__app` 已创建 |
| 手压抽水机 | Blender GLB 加载成功，`pumpLab.ready` 为 true |
| 手动摩擦力 | Blender V9 GLB 加载成功，界面显示“已加载” |
| 通信卫星 | 地表、云层贴图请求成功，实际截图中地球恢复大陆、海洋与云层 |

上述五例在本机服务下均无页面异常、失败请求或外网请求。`file://` 下复现筒车、抽水机、手动摩擦力模块请求失败，以及地球两张纹理请求失败。本次不是全部案例的逐例验收。

## 既有检查的限制

- `python scripts/reuse-context.py --validate` 和 `node scripts/tests/lab-kit.cjs`：基线已有 `models/thermometers-thermal-expansion.html` 源指纹不匹配；本次未修改该文件或注册表。
- `node scripts/tests/reuse-browser.cjs`：复用演示的离线自动镜头结束等待超时（60 秒），未记为通过。
- `node scripts/tests/instrument-patterns.cjs`：通过（三类 SVG 放大、指针间隙、窄屏布局）。
- 本次专用本地服务测试与上表五例启动检查通过；不据此宣称仓库所有既有检查通过。
