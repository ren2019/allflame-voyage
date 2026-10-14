# 七类故事与 27 组场景覆盖账本

机器契约在 `coverage.json`。`npm run verify` 逐条匹配实际单元/浏览器报告的文件、测试名称和通过结果；缺 fixture、缺报告、失败或跳过都会失败。生成结果在 `verification-results/coverage.json`。下表的对应关系不自行声明本次执行通过。

| 组 | 故事 | feature 场景 | 实际执行入口/测试名 |
| --- | --- | --- | --- |
| G01 | US01 | 分别导入国服已测绘海图 | `src/logic/parser.zh-CN.test.ts`：imports the first real client chart<br>`src/logic/parser.zh-CN.test.ts`：keeps second real chart<br>`tests/browser/import.spec.ts`：samples individually |
| G02 | US01 | 连续导入两张不同的海图 | `src/logic/parser.zh-CN.test.ts`：separates a Windows batch<br>`tests/browser/import.spec.ts`：both real charts in a Windows batch |
| G03 | US01 | Windows换行不改变解析结果 | `src/logic/parser.zh-CN.test.ts`：separates a Windows batch<br>`tests/browser/import.spec.ts`：both real charts in a Windows batch |
| G04 | US01 | 头部总值与航程效果分别处理 | `src/logic/parser.zh-CN.test.ts`：keeps second real chart<br>`src/logic/parser.zh-CN.test.ts`：imports the first real client chart<br>`tests/browser/import.spec.ts`：both real charts in a Windows batch |
| G05 | US02 | 国服关键航行词缀未匹配时整张拒绝 | `src/logic/parser.zh-CN.test.ts`：crucial voyage effect has no calibrated mapping<br>`tests/browser/import.spec.ts`：unknown crucial effects |
| G06 | US02 | 混合批次保留有效项 | `src/logic/parser.zh-CN.test.ts`：keeps valid items when another item<br>`tests/browser/import.spec.ts`：mixed batch keeps its valid chart |
| G07 | US02 | 国服关键航行词缀缺失时拒绝 | `src/logic/parser.zh-CN.test.ts`：refuses missing or empty crucial（至少2例）<br>`tests/browser/import.spec.ts`：reject missing implicit<br>`tests/browser/import.spec.ts`：reject empty implicit |
| G08 | US01 | 区域等级不误读为物品等级或需求等级 | `src/logic/parser.zh-CN.test.ts`：uses area level rather than item |
| G09 | US02 | 现有拒绝规则继续生效 | `src/logic/parser.zh-CN.test.ts`：rejects invalid items（至少3例）<br>`tests/browser/import.spec.ts`：real import controls reject（至少5例）<br>`tests/browser/import.spec.ts`：uncharted derived text |
| G10 | US01 | 重复复制沿用原有去重规则 | `src/logic/parser.text-library.test.ts`：retains the original same-batch instance<br>`tests/browser/inventory.spec.ts`：简中导入和库存保持 |
| G11 | US01 | 同批相同实例计数与整批重扫沿用原版 | `src/logic/parser.text-library.test.ts`：retains the original same-batch instance<br>`tests/browser/inventory.spec.ts`：简中导入和库存保持 |
| G12 | US01 | 没有原版去重字段的图沿用原有行为 | `src/logic/importDedupe.test.ts`：never dedupes charts without verbatim text<br>`src/logic/parser.text-library.test.ts`：retains the original same-batch instance |
| G13 | US03 | 十二个边界选择对应正确位置 | `tests/border-acceptance.test.ts`：affects only its specified cell（至少12例）<br>`tests/border-acceptance.test.ts`：stacks two direct borders<br>`tests/browser/borders.spec.ts`：all twelve real border controls |
| G14 | US04 | 每个现有策略可规划已知可行库存 | `tests/strategy-acceptance.test.ts`：independently verified strict witness（至少7例）<br>`tests/strategy-acceptance.test.ts`：solves without requiring a unique optimum（至少7例）<br>`tests/browser/solve.spec.ts`：player selects（至少7例） |
| G15 | US04 | 没有可执行摆盘时不误报成功 | `tests/browser/solve.spec.ts`：eight charts are a reference |
| G16 | US05 | 按原有顺序定位九张国服海图 | `src/logic/regex.zh-CN.test.ts`：real implicit verbatim<br>`tests/browser/solve.spec.ts`：player selects 速刷保险箱<br>`tests/browser/planning-cycle.spec.ts`：所选候选完成九步复制后仅核销已消耗实例 |
| G17 | US01, US03, US04, US05, US07 | 选择实际求解候选并复制放置后核销同一盘 | `tests/browser/planning-cycle.spec.ts`：所选候选完成九步复制后仅核销已消耗实例 |
| G18 | US01, US04 | 材料不足后补齐库存重新求解 | `tests/browser/solve.spec.ts`：eight charts are a reference |
| G19 | US01, US03, US04, US07 | 航程核销后用新库存和边界再次规划 | `tests/browser/planning-cycle.spec.ts`：所选候选完成九步复制后仅核销已消耗实例 |
| G20 | US06 | 刷新恢复规划状态 | `tests/browser/planning-cycle.spec.ts`：完整非空规划经刷新 |
| G21 | US06 | JSON备份往返恢复等价状态 | `tests/journey-fixture.test.ts`：round-trips every persistent field<br>`tests/browser/planning-cycle.spec.ts`：完整非空规划经刷新 |
| G22 | US01 | 保留基底原句及原版显式负面属性字段 | `src/logic/parser.zh-CN.test.ts`：preserves only explicit downside text |
| G23 | US07 | 无保留海图的航程核销 | `tests/browser/planning-cycle.spec.ts`：未标记保留时仅消耗本盘九张 |
| G24 | US07 | 保留确认只影响本次使用的海图 | `tests/browser/planning-cycle.spec.ts`：所选候选完成九步复制后仅核销已消耗实例 |
| G25 | US01, US04 | 既有英文与韩文输入继续可用 | `src/logic/parser.test.ts`：preserves existing English chart parsing<br>`src/logic/parser.test.ts`：imports a real Korean-client chart<br>`src/logic/parser.text-library.test.ts`：original effects and equal English score（至少62例）<br>`tests/strategy-acceptance.test.ts`：keeps every original strategy ID |
| G26 | US01, US02, US03, US04, US05, US06, US07 | 原有核心操作使用简中界面 | `tests/browser/chinese-shell.spec.ts`：页面标题、教程、更新记录<br>`tests/browser/inventory.spec.ts`：简中导入和库存保持<br>`tests/browser/solve.spec.ts`：Chinese solver settings<br>`tests/browser/planning-cycle.spec.ts`：所选候选完成九步复制后仅核销已消耗实例<br>`src/logic/regex.zh-CN.test.ts`：Chinese best-mod search text |
| G27 | US01, US04, US05 | Windows访问MacMini提供的网站 | `tests/deployment/local-site.test.mjs`：operator initializes, starts and stops<br>`tests/deployment/verify-windows-edge.mjs`：actualWindowsClipboardWrite |

## 证据边界

US01 库存导入、US02 失败反馈、US03 十二边界、US04 策略求解、US05 游戏放置文本、US06 保存备份、US07 核销循环。七类自动化均有公开接口/页面证据，真实游戏现场仍 pending。

主流程保留原人工12实例 fixture，追加两份通过实际文本框导入的真实国服海图，得到14实例；真实 End/Straight 不用于人工四向见证，选择九个人工模型后核销保留6实例，其中含两张完整真实复制。再用现有控件补5张人工空白图，库存11实例，第二次选九个人工四向实例；两张真实海图仍未被消耗。真实文本不被 JSON 覆盖或伪称已经在游戏放置。十二边界选择、策略选择、候选载入和每次剪贴板真实写入均通过控件验证。

边界均以已取得 PoEDB 候选词为数据，不声称真实边界客户端全校准。七策略、重试和双航程模型的 provenance 在各 README/expected JSON 中明确；所有可行见证经过公开连接与库存唯一性检查。

Windows Edge 原生证书与真实系统剪贴板证据来自 `evidence/windows-edge-green.json`，不是本地受控剪贴板的替代称呼。真实国服搜索/放置/航程及资料请求见 `field-checklist.md`。
