# 项目交接

本仓库直接 fork 自 `one-more-map/one-more-map.github.io`，维护国服简体中文导入及航程规划辅助。当前用法、功能和文档入口见 [README](../README.md) 与 [文档导航](README.md)。

## 修改前核对

- 本地化与解析：阅读 [校准说明](calibration.md)、[真实样本](../samples/README.md) 和 `samples/text-library/` 的来源记录；内部词缀 ID 与形状名保持稳定。
- 规划规则：区分求解评分、区域目标展示、边界价值与留图条件；现有配置位于 `src/data/`，领域词汇见根目录 `GLOSSARY.md`。
- 验证：按 [CONTRIBUTING](../CONTRIBUTING.md) 选择回归；既有总门禁字节指纹问题和现场边界见 [验收说明](acceptance/README.md)。
- 上游同步：按 [同步指南](upstream-sync.md) 保留祖先关系。

最初交接文档包含早期参考仓库、未完成假设和个人运维细节，已保存在[固定历史版本](https://github.com/ren2019/allflame-voyage/blob/93d197845d5ca0fe27da54191b877e240b60937b/docs/handoff.md)。以当前源码和真实客户端样本核对实施路径。
