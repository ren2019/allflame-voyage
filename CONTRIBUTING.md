# 参与贡献

欢迎提交国服复制样本、译名校正、问题复现和功能改进。代码沿用 [MIT 许可](LICENSE)；第三方资源保留各自署名和许可。

## 本地开发

需要 Node.js 20+ 和 npm。安装锁定依赖后启动：

```sh
npm ci
npm run dev
```

| 命令 | 检查范围 |
| --- | --- |
| `npm run build` | TypeScript 检查及生产构建 |
| `npm test` | 逻辑回归及边界 OCR 回归 |
| `npm run test:browser` | Playwright 整页流程；首次使用先运行 `npx playwright install chromium` |
| `python3 scripts/check-text-library.py` | 离线词库覆盖及来源完整性 |
| `python3 scripts/replay-text-library.py` | 从已提交来源快照重放词库 |
| `npm run test:deployment` | 临时站点的启动、静态文件、停止和更新 |
| `npm run verify` | 六阶段验证与既有验收合同核对 |

完整验证目前存在已知的旧 `scoring.ts` 字节指纹不匹配；具体边界见 [验收说明](docs/acceptance/README.md)。报告各阶段的实际结果，修复应保留算法回归依据，不以更新摘要掩盖行为变化。Windows 原生剪贴板及游戏现场结果单独记录。

## 修改位置

| 目录／文件 | 内容 |
| --- | --- |
| `src/logic/parser.ts` | 海图文本解析与语言入口 |
| `src/data/textLibrary.ts`、`samples/text-library/` | 词库、来源与真实客户端校准 |
| `src/data/mods.ts`、`strategies.ts` | 稳定词缀 ID 与策略定义 |
| `src/data/region-targets.json` | 区域目标、显示分组、策略优先级及图标来源 |
| `src/data/borderAffinity.json`、`keeper-rules.json` | 边界权重与留图条件 |
| `src/components/` | 页面交互；`src/styles-minimal.css` 为当前主题覆盖 |
| `src/logic/scoring.ts`、`solver.ts` | 评分与求解；变更需说明行为影响并提供回归 |
| `tests/browser/` | 从页面控件和真实 JSON 备份验证用户流程 |

## 国服文本与规则

- 词缀 ID 和形状内部名用于求解与持久化。显示翻译及国服别名在边界映射，保持内部标识稳定。
- 解析器改动附完整原始复制样本，明确客户端版本和独立字段预期。未知形状及关键词缀给出清楚的拒绝原因。
- 分开记录客户端原文、网页来源、推导样本和人工审阅；审阅通过不等于已获得客户端证据。
- 区域目标、边界及留图展示规则和求解评分各有职责。改配置时检查作用范围、策略变化和现有规划恢复。
- 图标新增来源、作者与许可，保持 [素材署名](THIRD_PARTY_NOTICES.md) 与运行配置一致。

领域术语见 [GLOSSARY.md](GLOSSARY.md)，原始样本见 [samples/README.md](samples/README.md)。

## 提交与上游同步

从 `main` 建立改动分支，向本仓库 `main` 提交 PR。说明问题、变更后的行为及实际执行的验证；截图使用演示数据。提交前至少构建成功，并按影响范围运行逻辑和整页回归。

原版更新按 [同步指南](docs/upstream-sync.md) 使用 merge commit，保留共同祖先。代码合并与内网服务更新分开；GitHub Pages 沿用上游工作流，是否启用和发布由仓库维护者单独配置。

构建产物、运行日志、个人路径、证书、浏览器配置及私人库存留在本机。项目历史研究和验收材料已归档，入口见 [文档导航](docs/README.md)。
