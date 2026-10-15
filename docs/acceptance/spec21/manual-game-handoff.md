# #24 国服人工验收交接

状态：**待玩家现场验证，#24 保持未完成**。当前国服客户端完整版本仍未知；玩家暂不方便提供，保留待填，不阻断本轮自动化工作。网页自动化、Windows 原生剪贴板通过不代表游戏正则语法、容量、实际遭遇或真实航程通过。

## 候选制品和独立入口

候选源码 SHA、完整生产构建清单与 SHA-256 见同目录 `candidate.json` / `build-manifest.json`；自动化与 Windows 事实见 `automated.json` / `windows/failed-candidate-report.json`。当前#23原生剪贴板验收仍未完成（读回为空，后续SSHreset），不可把Windows部分UI证据视为原生验收通过。证据提交只增加文档，不改变已测产品字节。若之后修改产品、配置或资产，应重新构建并核对摘要，再重跑受影响检查。

自动化验收的 9443 实例已停止，不把旧测试 URL 当作持续在线入口。审查完成后可在候选 checkout 启动新的独立预览：

```sh
npm run build
CANDIDATE_CERT_DIR=/Users/steipete/Projects/allflame-voyage/.local-site CANDIDATE_PORT=9443 node scripts/spec21-candidate.mjs
```

仅在出现 strictCaSanProbe=true 且摘要与 `build-manifest.json` 一致后，使用启动日志的候选地址（通常 `https://192.168.1.8:9443`）。命令检查端口占用，创建权限700的独立临时目录，只读取现有叶证书/密钥和公开CA，不安装或更改信任，不调用生产 start/update/stop/init。Ctrl+C 只停止该命令的子进程并删除自己的临时证书副本。8443 既有站点保持原样；禁止用它代替候选。新源与原站本地存储互相隔离。

## 每策略完整表达式

打开“留图助手”，勾选对应策略，点击名称核对全文，再点击小复制图标。从实际 Windows Edge 复制，玩家手动粘贴进国服客户端搜索；不自动输入、移动或锁定海图。引号是表达式的一部分。每策略独立一条；不能去掉后半段以迁就容量。

1. 锚地赐福

```text
"锚地|物品数量.*(1[2-9].|[2-9]..)%|稀有怪物数量"
```

2. 速刷保险箱

```text
"瓶中信|神圣的秘宝|侦探的保险箱|物品数量.*(1[1-9].|[2-9]..)%"
```

3. 稀有怪传说装

```text
"巨型海星|众神词缀|4000.*鬼灵|海之柱|黄金灯笼|被附身|无法掉落|稀有怪物死亡时.*分裂"
```

4. 魔法怪流

```text
"(2000|4000).*鬼灵|黄金灯笼|无法掉落|至少为魔法|魔法怪物数量|感染潜航球"
```

5. 稀有怪神圣雨

```text
"海之柱|额外保险箱|巨型海星|稀有怪物数量"
```

6. 神圣保险箱

```text
"远洋深渊|保险箱|神圣的秘宝|所有航行区域的稀有怪物数量|物品数量.*(1[2-9].|[2-9]..)%"
```

点金速刷：暂无有来源的专项留图规则，没有可复制表达式；应如实显示该状态。

## 正负样本与容量

以下是独立规则预期，不是已取得的国服实测。每条都需要对应真实实物海图的高级复制原文/截图。测试负例必须确认该物品的其他行也不命中该策略的其他分支；否则不能判为假阳性。数量边界与首/末条件都要测，避免“前半段能搜到”掩盖截断。

| 策略 | 应命中（分别找实物样本） | 不应命中（无其他分支） | 现场状态 |
| --- | --- | --- | --- |
| 锚地赐福 | 锚地；物品数量+120%、199%、200%；相邻/全航程稀有怪物数量 | 数量+119%；只有黄金灯笼 | 未测，容量未知 |
| 速刷保险箱 | 瓶中信；神圣的秘宝；侦探的保险箱；数量+110% | 数量+109%；只有奥术师的保险箱 | 未测，容量未知 |
| 稀有怪传说装 | 巨型海星；众神词缀；4000鬼灵；海之柱；黄金灯笼；稀有怪附身；无法掉落装备；稀有怪死亡时分裂 | 只有2000鬼灵；只有掉落物品分裂；只有至少为魔法 | 未测，容量未知 |
| 魔法怪流 | 2000/4000鬼灵；黄金灯笼；无法掉落装备；至少为魔法；相邻/全航程魔法怪数量；感染潜航球 | 只有稀有怪数量；侦探保险箱；海之柱 | 未测，容量未知 |
| 稀有怪神圣雨 | 海之柱；普通额外保险箱；巨型海星；相邻/全航程稀有怪数量 | 远洋深渊；只有侦探的保险箱（不是“额外保险箱”） | 未测，容量未知 |
| 神圣保险箱 | 远洋深渊；普通/奥术师/侦探保险箱；神圣的秘宝；全航程稀有怪数量；数量+120% | 只有巨型海星；只有相邻稀有怪数量；数量+119% | 未测，容量未知 |

每条记录粘贴后客户端实际保留全文长度/末尾、正负样本命中数和截图。真实不匹配、超限、截断均记失败；缺物品记缺样本；不能因网页复制成功而把“游戏语法与容量未验证”改成已验证。锚地规则中的稀有怪材料仅在混沌石边界的可选路线使用，不代表所有锚地盘都需要它。

## 区域目标、作用范围和图案

将自己实际待跑规划导入候选并选择策略、求解。开启“区域目标”，逐格点击图标或按Tab+Enter核对详情的名称、来源格、作用范围与权重。跑图由玩家操作；截图和观察记录必须对应实际这次摆盘。

| 案例 | 预期 | 当前证据边界/待采项 |
| --- | --- | --- |
| 目的地固有目标 | 锚地箱子、蛤蜊、感染潜航球、海之柱等只在真实目的地出现 | 配置/派生模型自动化已覆盖；现场逐项记通过/失败/缺样本 |
| 中央格5向邻区供给奥术师保险箱 | 按当前物理/连接设置归到真正接收格；非自作用时中央不能仅因自己供给就得到箱子 | 真实库存离线重算盘中格2/4/6/8接收，格5不接收；这不是跑过的旧盘 |
| 全航程精华 | 每个有效接收区域均有精华，重复来源只保留一个目标/来源列表 | 同一离线重算盘自动化已覆盖；现场观察待采 |
| 边界宝藏锚/海兽群 | 只属于与该边界相邻的目标区域；不能给全盘添加 | 实际库存重算盘有普通边界；现场待采 |
| 神圣区域 | 仅真实神圣边界接收格，按生效条件提升已有目标，不能凭策略制造 | **缺真实神圣边界/对应实际航程样本**；目前仅派生规则测试，不能标现场通过 |
| 连接与自作用 | 断开时连接范围不生效；调整相邻自作用后来源与接收区域一致 | 自动化已覆盖；现场必须记录当时设置 |
| 合并与溢出 | 各箱子共一槽，金币共一槽，明确Boss共一槽；详情保留全部目标；>4类时前三+更多 | 真实库存重算盘/派生模型覆盖；现场找到对应遭遇再记结果 |
| 策略切换 | 只改变已存在目标的优先级/颜色；无效空格不出现目标；原分数/摆盘不被overlay改变 | 自动化与原生Edge的UI部分已覆盖；原生剪贴板仍待完成，现场对照确认 |
| 图案和中文 | 精华和各通货为游戏原图；箱子统一；宝藏锚为锚；M/R；单圈金币；统一Boss；潜水球、祭坛、信封、辅助宝石、圣甲虫、罪魂、阿兹里头像、宿敌标记；船长灾星中文 | 48目标/39本地资源见下表；图案是接受的提示符号，不保证机制完整或具体掉落 |

每个图案/目标独立标记，缺样本不可由同类图标代替。目标全量映射由当前版本配置生成于本文末，名称/来源/权重详见 `src/data/region-targets.json` 与界面详情。阿兹里、宿敌等代表图并不证明本区域包含它所象征的完整机制；未经核实的固定数量不得当作保证。

## 完成真实航程与历史

1. 出发前通过“导出”保存完整规划；记录所选策略、评分、历史条数、九张实例标识与待确认保留物品。
2. 玩家实际完成该航程后，在候选点击“完成航程”。先取消一次应保持库存与历史，再按实际结果逐张选保留/消耗。
3. 核销后历史只增加一条，分数是最终有效盘原始评分；只消耗本盘实际未保留实例，未用库存与保留实例仍在，九格清空。记录前后导出差异。
4. 刷新和载入导出后仍仅一条新历史；下一次求解、切候选不追加历史。下一航程可继续使用保留海图。
5. 最近30次/最低5次/并列处理等多样本分位算法沿用自动化证据。不要为了填表伪造五次“真实航程”。少于5次必须仍显示样本不足。

## 现场记录模板

```text
候选源码SHA / 构建SHA-256：
候选URL / 实测时间（含时区）：
国服客户端完整版本/补丁号 / Windows及Edge版本：
策略 / 原样完整表达式（含引号）：
网页显示长度 / 原生剪贴板完整长度 / 游戏实际接收长度和末尾：
正样本原文或截图 / 预期 / 实际命中：
负样本原文或截图 / 预期 / 实际不命中：
语法：通过/失败/缺证据；容量：通过/失败/缺证据；是否截断：
作用范围设置 / 目的地 / 边界 / 来源格与受益格：
具体目标 / 图案 / 合并详情 / 游戏实际遭遇截图：
神圣区域样本：有（附证据）/缺样本：
完成前后历史条数与分数 / 消耗及保留实例 / 刷新导出恢复结果：
结论：通过/失败/缺样本；缺项与复现步骤：
```

每策略与每范围/目标案例分别填结果。发现产品缺陷关联修复，复验相关自动化和现场路径后再改为通过；没有现场证据时 #24 不关闭。禁止把前九票或 Windows 通过写成整项游戏验收通过。

## 当前48目标映射（检查清单，全部现场待核对）

| 目标 | 显式合并组 | 本地图案 | 现场结果 |
| --- | --- | --- | --- |
| 黄金灯笼 | golden-lantern | target-icons/golden-lantern.svg | 待核对 |
| 侦探保险箱 | boxes | target-icons/strongbox.svg | 待核对 |
| 神圣秘宝／占卜师箱 | boxes | target-icons/strongbox.svg | 待核对 |
| 奥术师保险箱 | boxes | target-icons/strongbox.svg | 待核对 |
| 普通保险箱 | boxes | target-icons/strongbox.svg | 待核对 |
| 瓶中信 | message-bottle | target-icons/envelope-simple.svg | 待核对 |
| 宝藏锚 | treasure-anchor | target-icons/treasure-anchor.svg | 待核对 |
| 海盗储物柜 | pirate-locker | target-icons/pirate-locker.svg | 待核对 |
| 珍稀鱼 | exotic-fish | target-icons/exotic-fish.svg | 待核对 |
| 罪魂牢笼 | spirit-cage | target-icons/spirit-cage.webp | 待核对 |
| 精华囚禁怪 | essence | target-icons/essence.webp | 待核对 |
| 木桶群 | barrels | target-icons/barrels.svg | 待核对 |
| 巨型海星 | giant-starfish | target-icons/giant-starfish.svg | 待核对 |
| 额外普通怪群 | extra-packs | target-icons/extra-packs.svg | 待核对 |
| 稀有怪 | rare-monster | target-icons/rare-letter-r.svg | 待核对 |
| 魔法怪 | magic-monster | target-icons/magic-letter-m.svg | 待核对 |
| 污秽蟹群首领 | bosses | target-icons/boss.svg | 待核对 |
| 船长灾星首领 | bosses | target-icons/boss.svg | 待核对 |
| 女神祭坛 | goddess-altar | target-icons/altar-simple.svg | 待核对 |
| 深海赐福祭坛 | deep-offering | target-icons/deep-offering.svg | 待核对 |
| 锚地沉没宝藏 | boxes | target-icons/strongbox.svg | 待核对 |
| 沉没图腾精英遭遇 | sunken-totems | target-icons/sunken-totems.webp | 待核对 |
| 感染潜航球遭遇 | bathyspheres | target-icons/bathysphere.svg | 待核对 |
| 远洋深渊坑洞／遭遇 | pelagic-abyss | target-icons/pelagic-abyss.svg | 待核对 |
| 海王领域特殊遭遇 | brine-king | target-icons/brine-king.svg | 待核对 |
| 琪莎拉安息处 Boss | bosses | target-icons/boss.svg | 待核对 |
| 目的地命运卡箱 | boxes | target-icons/strongbox.svg | 待核对 |
| 藏宝蛤蜊 | coins | target-icons/coin-single.svg | 待核对 |
| 金币堆 | coins | target-icons/coin-single.svg | 待核对 |
| 深海浅滩佣兵 | mercenary | target-icons/mercenary.svg | 待核对 |
| 失落遗迹瓦尔遭遇 | lost-ruins | target-icons/lost-ruins.jpeg | 待核对 |
| 古灵深渊特殊遭遇 | eldritch-depths | target-icons/eldritch-depths.svg | 待核对 |
| 险恶深渊金币／纪念币遭遇 | coins | target-icons/coin-single.svg | 待核对 |
| 友好水母 | friendly-jellyfish | target-icons/friendly-jellyfish.svg | 待核对 |
| 稀有怪额外掉神圣石 | rare-monster | target-icons/rare-divine.webp | 待核对 |
| 稀有怪额外掉崇高石 | rare-monster | target-icons/rare-exalt.webp | 待核对 |
| 稀有怪额外掉远古石 | rare-monster | target-icons/rare-ancient.webp | 待核对 |
| 稀有怪额外掉剥离石 | rare-monster | target-icons/rare-annul.webp | 待核对 |
| 稀有怪额外掉混沌石 | rare-monster | target-icons/rare-chaos.webp | 待核对 |
| 稀有怪额外掉瓦尔宝珠 | rare-monster | target-icons/rare-vaal.webp | 待核对 |
| 稀有怪额外掉宝石匠棱石 | rare-monster | target-icons/rare-gcp.webp | 待核对 |
| 稀有怪额外掉幻色石 | rare-monster | target-icons/rare-chrome.webp | 待核对 |
| 稀有怪额外掉后悔石 | rare-monster | target-icons/rare-regret.webp | 待核对 |
| 稀有怪额外掉祝福石 | rare-monster | target-icons/rare-blessed.webp | 待核对 |
| 稀有怪额外掉富豪石 | rare-monster | target-icons/rare-regal.webp | 待核对 |
| 稀有怪额外掉辅助宝石 | rare-monster | target-icons/rare-support.webp | 待核对 |
| 稀有怪额外掉圣甲虫 | rare-monster | target-icons/rare-scarabdrop.webp | 待核对 |
| 稀有怪额外掉亡者硫磺 | rare-monster | target-icons/rare-sulphdrop.webp | 待核对 |
