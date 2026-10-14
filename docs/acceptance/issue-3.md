# #3 国服文本库独立采集验收

工作分支 `implement/issue-3`，从集成分支 `f3ae4a7` 创建，完成前已合入 #2 集成提交 `a970b3d`。没有修改 UI、parser、solver/scoring、策略权重或现有 MOD 效果。

交付入口：[文本库说明](../../samples/text-library/README.md)、[完整逐 ID 覆盖与差异](../../samples/text-library/coverage.md)、`src/data/textLibrary.ts` 的 `TEXT_LIBRARY` 和 `matchChineseChartImplicit`。应用消费者应读取状态，不能把 source-only 当作客户端校准。

实际证据：12 个正式中英 PoEDB 全 HTML 快照、12 个首选 remio Markdown 获取结果、215 行/语言的分段表、141 个内部词缀 ID 调查结果、15 个目的地（14 个以共有 room metadata 对齐）、5 个形状状态、10 个真实复制字段。原生逐条 mod/stat ID 在所得 HTML 未取得，保持空值，并如实使用双语语义复核；不存在行号双语合并。

结果：62 个航行词缀模板（两条真实校准、60 条仅来源），64 个边界模板（63 条仅来源、一条硫磺文字冲突），15 个奖励抽象 ID（13 条作用域/档位冲突、两条缺失金币来源）；15 目的地中两条真实校准。真实样本仍是用户提供的两张，没有把构造数据计作真实采集。Corner/Junction/Crossing 保持缺失，并列明检索来源和实际采集请求；真实边界和完整客户端格式覆盖仍待现场资料。

验证命令：

```sh
npm test
npm run build
python3 scripts/replay-text-library.py
python3 scripts/check-text-library.py
```

集成 #2 后 `npm test`：15 个测试文件、247 项通过，含 132 项文本库公开接口与映射检查、3 项源摘要/离线重放检查；原有边界 OCR 64/64 和别名 12/12 通过。构建通过。TDD 红绿记录包括缺失公开匹配接口、全角和范围内空白输入、非法实际 roll 三个实际失败→通过切片。

限制：有区间的模板要求显式区间，普通文本只给实际 roll 时库助手返回 null；重叠档位不会猜测。全角/Windows 换行变体是明确派生测试，而非额外客户端采集。未解决奖励/边界差异保留原版评分，不宣称全量国服游戏端已验证。
