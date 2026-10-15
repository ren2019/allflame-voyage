# 海图库存卡片重叠修复

用户确认区域目标三态验收通过，当前仅剩海图卡片重叠。修复行为提交 `f9c103a0dbe949616da4610ef5ab80954524c5bd`；干净构建源码 `aadbef0519d8a954655d8088c778b5ab7cf9c4ec`（仅后续CSS注释和测试缩进差异，无行为变化）；64文件构建 `2668afdbdc2d1dfb976e44e543ed6c280c8eb1fd700afd788651073b80f6af8e`。精确制品 `/tmp/allflame-implement-21/inventory-layout-fix-aadbef0/dist`。

## 复现与诊断

公开整页入口 `OFFLINE_ACCEPTANCE=1 PLAYWRIGHT_PORT=4394 npm exec -- playwright test tests/browser/inventory-layout.spec.ts --workers=1` 首跑在真实库存布局1440px失败：相邻卡片交叠宽6px、高88px。最小化为两张无词缀空白海图：一张无重叠，两张即复现，排除长词缀和库存数量。原始日志保留。

测量：网格四列各76px，间距6px；卡片宽88px，起点间隔82px。卡片最小高度88px且aspect-ratio为1；自动正方形宽度超过列宽。依次单变量排除min-width:0、transform:none、box-sizing:border-box，均仍重叠6px。取消aspect-ratio可得到76px宽而不重叠；只将网格最小列宽同步88px则变为三列、实际卡片宽103.328px、起点间隔109.328px，也无重叠。最终保留正方形及可读尺寸，用同一局部CSS变量同步网格列最小宽与卡片最小高度。

## 验证与清理

最终6条浏览器用例全部通过：新增整页几何回归覆盖深/浅主题×1440/1280/1024/1920/390宽度×网格/列表，无卡片矩形重叠；卡片头部、词缀、文字与脚部不越出自身边框；导出状态未改。另复验预留/形状/校准控制互不遮挡及交互、真实简中导入、核销/保留/历史和刷新恢复整页闭环。生产构建通过。只在测试完成后调整了注释和测试缩进，不将旧的全套或原生证据重标为本轮。

源代码/tests中DEBUG-card-overlap探针已移除；一次性诊断脚本移到本机 `/tmp/allflame-implement-21/debug/` 明确归档，未进产品。本目录中的DEBUG前缀仅存在于已归档的原始探针输出。保留RED、最小化、单变量探针、最终GREEN、构建日志及8张布局截图，见manifest.json。

仅替换本次自有9443预览，原端口和浏览器存储保持，用户刷新即可，无需重导或清空库存。原8443文件/证书/进程保持原样。当前修复待用户复验；三态已按用户确认通过记录，不据此伪造全部Windows或游戏现场证据。
