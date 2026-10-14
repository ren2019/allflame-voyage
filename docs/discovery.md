# 首版需求澄清与参考功能

状态：七条用户故事及未知航行词缀拒绝规则已确认，产品需求整理见 `prd.md`；此文件保留探索证据。

## 已确认的产品决定

- 个人自用，首版不考虑其他用户或公开共享。
- Mac Mini 提供网站，内网 Windows 游戏电脑通过浏览器进行 planning。
- 开发期间手动启动即可；不要求开机自启。
- 保留英文原版核心流程及七个策略：国服文本导入、库存管理、十二个边界位置、策略选择与求解、游戏内定位、航程核销。
- 首版不加入剪贴板采集器和截图 OCR。
- 状态保存在 Windows 同一浏览器、同一站点地址下，通过 JSON 导出和导入备份；不做跨电脑同步。
- 国服真实复制样本是解析验收依据。解析失败沿用现有拒绝导入和错误提示交互；不新增待确认列表、人工补全或数量管理功能。
- 首版是现有英文代码的国服适配，不是功能扩展。当前核心问题是国服中文复制文本无法识别；优先补全语言解析与映射，并验证现有功能可正常使用。
- 已确认：名称、等级、形状可识别但关键航行词缀未匹配时，整张海图拒绝导入，使用现有错误展示机制；该规则是相对上游的明确行为变化。

以上决定来自本次访谈；与早期 `handoff.md` 中 GitHub Pages 部署等建议冲突时，以本文件为准。handoff 保留为原始资料。

## 用户角色

- 国服玩家：将持有海图和边界信息导入，选择策略，获得可执行摆盘，在游戏内定位和放置海图，完成航程后更新库存。
- Mac Mini 运维者：同一位用户，手动启动或停止本地服务，并从 Windows 验证内网可达。

没有多用户账户、协作者或公众管理员角色。

## 参考与证据范围

- 英文主参考：https://one-more-map.github.io/allflame-voyage-solver/
- 英文源码：https://github.com/one-more-map/one-more-map.github.io
- 当前源码基线：`20a694ba8afb6ce497a67287b67c68a6b244e5fd`。
- 台服辅助参考：https://xlox123456789.github.io/3.29_Allframe_voyage_planning/
- 台服源码：https://github.com/xlox123456789/3.29_Allframe_voyage_planning
- 已通过 Edge 实际操作英文网站，过程记录见 `docs/website-walkthrough.md`。直接浏览器连接没有可用会话，因此使用 Edge 界面操作。真实国服输入及游戏内搜索仍待验证。

## 源码揭示的功能及差异

1. 英文原版解析器目前支持英文和韩文；应新增国服方言，而非按台服表达式做替换。见 `src/logic/parser.ts`。
2. 解析等级为区域等级，缺失时原版回退至 80。首版保留既有行为，任何额外校验变化另行说明；不将新增严格校验算作用户已批准需求。见 `src/logic/parser.ts`。
3. 目的地/区域类型有十五个内部标识，handoff 的十二个金色目的地表不足以覆盖全部类型。见 `src/types.ts`、`src/data/chartAreas.ts`。
4. 七个策略为 Alc & Go、Anchorfield Fishing、Speedrun Strongboxes、Meatfish、Magic Ethereal、Divine Border Rares、Divine Strongboxes。见 `src/data/strategies.ts`。
5. 批量导入会去重，首版沿用现有实例与重复粘贴处理，不新增数量操作。见 `src/logic/importDedupe.ts`。
6. 允许手动放置、交换、策略保留和权重调整；求解结果可能包含明确标示为不可执行的方案。见 `src/components/Library.tsx`、`Board.tsx`、`SolveBar.tsx`、`SolverPanel.tsx`。
7. 允许旋转时求解含随机搜索；相同输入不保证相同摆盘。应验收连接、实例使用、策略约束及同盘评分，而非与台服逐位置相同。见 `src/logic/solver.ts`、`connectivity.ts`。
8. Session Plan 是材料分配建议，不保证每一组材料都可组成可执行摆盘。见 `src/logic/sessionPlan.ts`。
9. 航程结束会核销摆盘中的物品并保留用户确认存活的海图；未使用库存应保留。见 `src/App.tsx`。
10. 状态保存在浏览器 localStorage，另有 JSON 导出/导入和 URL 状态编码。见 `src/logic/storage.ts`、`src/components/ImportPanel.tsx`。
11. 多处按钮直接调用 Clipboard API，部分失败被静默忽略。Windows 访问普通内网 HTTP 地址时需实测一键复制；这是部署环境兼容点，不是国服粘贴解析失败的原因，也不代表已经批准新增复制降级 UI。手工粘贴不依赖网页主动读取剪贴板。见 `src/App.tsx`、`src/components/Board.tsx`、`StrategiesPanel.tsx`。

## 尚待验证的事实

- 已取得两张国服真实海图，原文及逐字段预期见 `samples/README.md`、`samples/charted.zh-CN.txt`。物品头、区域等级、两种形状、两种目的地和两条航行词缀已有证据，其余覆盖仍待补充。
- 国服游戏内搜索对原版生成定位字符串的兼容性。
- Windows 从 Mac Mini 的实际内网地址访问时，现有一键复制是否可用。

## 现有解析行为边界

源码拒绝非海图、未测绘物品、缺少或未知形状；未知航行词缀目前仍可导入并保留原文但不匹配效果。用户已确认国服海图的关键航行词缀未匹配时整张拒绝，沿用现有失败展示，不增加待确认功能。英文、韩文兼容用既有测试回归，不顺带重写其容错政策。

## 验收规格入口

用户已确认的七条故事与范围见 `prd.md`；唯一场景定义为 `acceptance/port.feature`，数据集制作及边界位置oracle见 `acceptance/fixtures.md`。本探索记录不再维护一份平行BDD草稿，避免错误提示、原文保留和主流程规则发生漂移。

补强包括：候选实际载入、九次剪贴板写入和推进、补库存重试、第二航程循环、基底词缀缺失负例、区域与物品等级不同的负例、原有重复实例规则及完整状态JSON往返。

失败UI沿用数量和类别汇总；逐项拒绝原因在解析入口测试。原版字段保留并非完整复制原文存储。Session Plan、手动摆盘和取消路径属于既有辅助流程，可后续补代表性回归，不扩大当前七条故事。
