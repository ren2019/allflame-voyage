# 国服海图文本库：来源调查与独立工作契约

调查日期：2026-10-14。状态：已定位正式站点并核对首批样本；全量文本库、逐条 mod/stat ID 对齐及完整真实样本覆盖尚未完成。本文独立于应用功能开发，不授权更改现有评分参数。

结构化种子在 `poedb-text-inventory.json`：包含现有 15 个目的地的中文对照、两条已验证航行词缀、全部 141 个现有词缀 ID 的已核对/待核对清单，以及五种形状和真实复制字段。目的地仅使用代表性 room metadata，未声称已枚举每个 room variant；第 15 个目的地没有取得稳定 room ID，按双语语义核对并如实标记。当前 139 个词缀映射仍待采集/对齐。

## 来源与权威顺序

1. `samples/charted.zh-CN.txt`：用户直接从目标国服客户端复制的两张已测绘海图。它们是国服复制格式、字段、数值范围和后缀的首要验收来源。
2. [PoEDB 简中正式站](https://poedb.tw/cn/)：用户指定的中文标准语料来源，属于社区整理的游戏数据网站，不称为腾讯或 GGG 官方文案接口。
3. PoEDB `/us/` 对应页面：以相同 metadata、mod/stat 标识核对英文含义、数值档位和作用范围。
4. 本仓库 `src/data/mods.ts`、`src/data/chartAreas.ts`：确定需要适配的内部 ID 和现有评分语义；台服版及 handoff 仅作辅助比较。

只取 `poedb.tw` 正式域，不混入搜索结果中的 `ptr.poedb.tw`。当前页面随版本变化，获取日期不等于国服版本一致的证明。采集结果必须记下页面可见版本；不能取得时显式填 `unknown`。

按项目要求先使用 `remio web_get` 取清洁 Markdown。调查发现部分词缀页只保留一个扁平表，遗漏标题、边界表或隐藏详情；此次用网页阅读结果补核对页面结构。后续全量采集需要保留可重放的来源快照及详情标识，不能把有损 Markdown 当成完整词缀数据库。

## 已定位的入口及可取数量

| 语料 | 正式页面 | 本次核对结果 |
| --- | --- | --- |
| 海图物品类别、基底名称 | [CN Chart](https://poedb.tw/cn/Chart)，[US Chart](https://poedb.tw/us/Chart) | CN 页面列出 4 个基底，含现有三类及热泉裂口；不因此新增策略或地区类型。 |
| 三个原有基底及元数据 | [金沙海床海图](https://poedb.tw/cn/Sandy_Seabed_Chart)、[珊瑚密林海图](https://poedb.tw/cn/Coral_Forest_Chart)、[珊瑚暗礁海图](https://poedb.tw/cn/Coral_Reef_Chart) | metadata 分别为 `Metadata/Items/Deepwater/ChartSandy`、`ChartCoralForest`、`ChartCoralReef`（后两者共享前缀）。英文路径只把 `/cn/` 换成 `/us/`。 |
| 常规目的地 | [CN Comprehensive Charting](https://poedb.tw/cn/Comprehensive_Charting)、[US Comprehensive Charting](https://poedb.tw/us/Comprehensive_Charting) | 14 对中文/英文目的地，共享 Sandy/Coral room metadata，可先对齐已有 14 个区域 ID。 |
| 特殊目的地及额外地区 | [CN Maiden Voyage](https://poedb.tw/cn/Maiden_Voyage)、[US Maiden Voyage](https://poedb.tw/us/Maiden_Voyage) 的 `Roomss` 区 | 现有第 15 个 ID `kisharas-rest` 可定位到琪莎拉安息处；CN 页面列 18 行、US 19 行，不能按行号合并。 |
| 航行隐式、显式及其他机制词缀 | 三个基底页中的 `Map Deep Water Chart Mods`，或上述 Maiden Voyage 页 | 本次正式页标为 150 行，混合多个池；不等于现有工具的 150 个词缀。隐式部分可定位 43 条相邻 + 19 条全航程候选；完整 mod/stat ID 尚未取得。 |
| 边界词缀 | Maiden Voyage 页的 `Deep Water Border Mods`，中英相同入口 | 本次表标为 65 行，其中一行描述为空。仓库有 64 个边界 ID；必须逐项核对，不能直接宣称 65 条已适配。 |
| 五种形状与复制字段 | 真实样本，后续核查客户端文本资源 | 本次 PoEDB 清洁页面未找到完整五种形状的逐字 CN 文案；端点、直线已由真实样本证明，另外三种未知。物品头、带空格的稀有度、基底属性分段等也应以客户端原文为准。 |

上述数量是“可定位的资料范围”，不是“已交付的解析覆盖率”。完整库应覆盖仓库现有 43 个 `adj-*`、19 个 `voy-*`、64 个 `b-*`、15 个 `cm-*` ID，以及 15 个目的地和 5 种形状。`cm-*` 为项目归并后的奖励类型，不是 PoEDB 的原生逐条 mod ID。

## 已确认的两条样本映射

| 真实样本 | PoEDB 证据位置 | 内部 ID | 结论 |
| --- | --- | --- | --- |
| 样本 1 的相邻区域额外螃蟹群，数值 8、范围 8–10 | `Sandy_Seabed_Chart` / `Map Deep Water Chart Mods` 的螃蟹 8–10 档；[CN](https://poedb.tw/cn/Sandy_Seabed_Chart)、[US](https://poedb.tw/us/Sandy_Seabed_Chart) | `adj-crab-1` | 数值范围与 adjacent 作用域一致。PoEDB 展示范围，客户端还包含实际 roll 和不可调整后缀；保留两者来源，不能用网页模板冒充完整 Ctrl+C。 |
| 样本 2 的全航程怪物群规模提高 5% | 同表的全航程 Pack size 5% 行，中英同路径 | `voy-pack-1` | 数值与 global 作用域一致；与复制头部本区域群大小 5% 分开表示。 |

样本 1 的蛤蜊海架和样本 2 的深渊平原也与 Comprehensive Charting 的中英 room metadata 对应，分别进入 `clam-infested-shelf` 和 `abyssal-plain`。

当前这些映射按作用域、数值档位和双语语义核对；未取得稳定逐条 mod/stat ID，因此字段必须写 `null` 并标明待补，不能编造游戏内部 ID。

## 冲突与缺项

| 项目 | 证据 | 处理 |
| --- | --- | --- |
| 显式数量奖励档位 | 当前正式 PoEDB 中英文表可见 25/32/40/55%；仓库 `cm-quant-*` 为 20/28/32/45%。 | 记录版本/档位冲突；先核对目标客户端与奖励头部解析。不能为了补中文把评分值改为网页最新数值。 |
| 显式奖励作用域 | 当前 PoEDB 表展示相邻区域奖励，而仓库 `cm-*` 为 `self`。 | 需要解释未测绘/已测绘、复制头部及游戏版本的关系，未解释前不自动改作用域。 |
| 边界硫磺文案 | 当前 CN 边界表使用“死者硫磺”，用户样本奖励头使用“亡者硫磺”。 | 保留逐来源原文；是否是边界专用文案或版本差异待真实边界样本校准，不能全局替换。 |
| 额外基底/目的地 | CN Chart 已有第 4 个基底，Maiden Voyage 中英地区行数也不同。 | 资料可收录为 unmatched，首版仍沿用原版功能；是否接纳其解析另经规格判断。 |
| 三种未采集形状 | 目前只有 End 与 Straight 的真实原文。 | 不凭繁简转换或英文翻译生成“官方”中文形状文案。 |
| 稳定 mod/stat 标识 | 清洁 Markdown 保留部分 stat 展示名，但没有每条的原生 mod ID。 | 下一工作项获取详情/数据资源中的稳定标识并验证中英一致；未取得的列为未知，拒绝以行序充当主键。 |

## 独立工作的数据契约

输出应放在 `samples/text-library/`（开发任务尚未执行），包含：来源 manifest、逐条文本与映射、覆盖/冲突清单、最小可离线测试集。每条至少有：

```text
kind: base | shape | destination | chart-implicit | border | reward | field
internalId: 项目已有 ID，未对应则 null
sourceMetadataId / sourceModId / sourceStatIds: 来源真实标识，未知则 null/[]
cnText / enText: 页面或客户端原文，不自动翻译
scope / tier / numericRange: 明确作用域和数值，不从中文模糊匹配猜测
cnUrl / enUrl / retrievedAt / sourceVersion / sourceLocator / snapshotSha256
provenance: client-verbatim | poedb-table | derived-fixture
status: confirmed | source-only | unmatched | conflict | missing
clientSampleRefs: 若未采集真实样本则 []
mappingBasis: metadata | mod/stat-id | reviewed-semantics
```

网页模板与真实复制全文分开保存；构造的形状/词缀组合可做测试，但必须标 `derived-fixture`，不得计为真实采集。数字规范化可容纳已见的实际值/括号范围/不可调整后缀；作用域、等级、词缀身份仍必须保留。项目的 heuristic effects 继续由原代码定义。

## 单独工作验收

- 对现有 141 个词缀 ID、15 个目的地和 5 种形状列出完整清单，每项均有 confirmed/source-only/missing/conflict 状态；不允许遗漏未覆盖项。
- 中英条目通过相同 metadata 或真实 mod/stat ID 对齐；只完成语义复核的条目如实标记，不伪装成 ID 对齐。
- 每个已确认条目能追溯到来源 URL、定位、获取日期及快照摘要；重新生成离线数据不依赖实时 PoEDB。
- 两张真实样本与预期字段、`adj-crab-1`、`voy-pack-1` 完全一致；对网页模板与真实复制格式的差异有明确归一规则。
- 数量、硫磺、作用域、缺译和额外地区等冲突有可检查的清单；未解决的冲突不静默改变 scoring 或宣称兼容。
- 用参数化测试验证每个已映射中文条目落到正确已有内部 ID，包含档位、作用域区分及未知关键词缀拒绝用例。完整库映射测试不能由两个样本代替。
- 边界库覆盖所有 64 个原有 ID，并单独记录网页空白条；真实边界文案验收仍需要客户端复制或截图证据。
- 新资料发现额外机制时记录 unmatched，不增加界面、策略或求解算法。

完成本调查不等于完成上述数据制作任务。本轮未修改 `src/`，未创建 GitHub Issue，未提交或推送。
