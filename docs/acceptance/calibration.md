# 方案 A：正式中文校准页验收

对应 [#11](https://github.com/ren2019/allflame-voyage/issues/11)，操作说明见 [中文校准](../calibration.md)。原型评选主来源为 `prototype/localization-calibration@a2c9b80`，正式实现 `ca63f70`，部署集成 `e761dd5`。

## 公开浏览器边界

`tests/browser/calibration.spec.ts` 验证6项实际交互：

- 单条地址、完整高级复制词缀的严格查找和真实来源原文展开。
- 编辑→保存→刷新恢复→实际JSON下载，原词库中文和证据状态不变。
- 较旧备份不覆盖较新记录，当前草稿保留；未知条目整份拒绝。
- 词缀入口在新页定位单条，原页面勾选状态不变。
- 全表地址刷新仍显示175条，保持检索范围。
- 原型建议可导入为校准记录；已有正式记录优先。

第一、二、三、四和五项分别先观察缺少正式页面、只读编辑、缺少导入、缺少入口及刷新错误的失败，再完成实现。原型兼容作为备份边界回归。测试不直接读取浏览器内部保存数据。

完整 `npm run verify` 通过488单测、38浏览器场景（无跳过）、4部署测试、64个边界OCR/12别名及141个既有词缀ID审计，原有27场景组/7故事类通过。最新冻结报告及输入摘要见 [calibration-verification-summary.json](evidence/calibration-verification-summary.json)，之前 `verification-*.json` 为前次验收的历史报告。

## 实际 Windows Edge

在已部署 `e761dd5da35539cea841ac76121a98239a0c1017` 上执行项目已有SSH测试入口，扩展校准页定位、保存、刷新及证据保持检查。[windows-calibration-green.json](evidence/windows-calibration-green.json) 记录安装的 Edge 155、原生HTTPS信任（无证书绕过）、五张真实样本导入、原生系统剪贴板及刷新恢复。

校准页的测试建议仅写入本次临时Edge配置；主页面五张库存仍保留。临时任务、进程、配置、探针和SSH隧道清理全部通过。实际JSON下载/导入的详细断言来自本地浏览器公开控件回归，不声称已在Windows复验导出文件内容。

评分、求解和连接核心仍与基线 `20a694b` 完全相同。真实国服搜索/放置、航程结果和剩余词库/边界资料仍待现场确认，#1/#9保持开放；PR保持草稿。
