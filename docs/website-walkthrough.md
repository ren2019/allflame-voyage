# 英文原版网站走查

目标：https://one-more-map.github.io/allflame-voyage-solver/

日期：2026-10-14。通过独立 Edge 标签页操作；使用浏览器演示数据和源码已有英文 fixture，未输入真实游戏库存。

## 已观察到的行为

1. 首次打开显示五步引导：收集、导入、边界、奖励权重、求解。
2. 点击 Try it with 25 demo charts 后，库存从 0 变为 25；求解按钮启用。保留标识和库存筛选可见。
3. 点击 Random borders 后，十二个位置显示各自词缀。
4. 点击 Solve 后显示 Solving，再产生五个候选结果；第一方案自动载入九宫格。演示此次第一方案评分 118.5，页面显示 Connector layout valid，其他候选标为 runnable。数值仅为本次随机演示，不作为验收固定值。
5. 将 `src/logic/__fixtures__/charted.en.txt` 内容输入 Import，再点击 Parse & Add：库存 25→26，提示 Imported 1 chart，新增项显示 +20% Sulphur、L:63。
6. 展开 Speedrun Strongboxes 可见中心海图、数量要求、保留规则及材料就绪说明；点击 Use this strategy 后显示 Active，库存评分及当前摆盘评分重新计算。
7. 用该策略再次求解，生成五个候选摆盘，当前摆盘显示 Connector layout valid；此次评分 56.7。
8. 点击 Copy into game 后进入 Step 1 of 9，显示海图名称与词缀；点击 Copy & next 后进入 Step 2 of 9。观察到步骤推进，但未验证游戏内粘贴效果或读取系统剪贴板内容。
9. 取消放置指南并刷新页面：26 张库存、十二个边界、九张已放置海图及当前策略均恢复，评分仍为 56.7。
10. 点击 Finish Voyage：提示 consumed 9 charts，库存 26→17，九宫格清空，边界与策略保留。本次摆盘未标记保留项，保留确认分支尚未操作。
11. 用户提供 Downloads/临时.md 后，把两份国服完整原文输入 Import 并点击 Parse & Add：提示 `skipped 1 unrecognised`，库存仍为 17。真实失败已复现；两张文本未被拆分，见 `samples/README.md`。

## 尚未验证

- 国服样本成功导入、词缀匹配及游戏内定位（已复现原版拒绝国服样本）。
- 全部七个策略各自的求解结果。
- Mac Mini 内网部署和 Windows 浏览器复制权限。
- JSON 下载与恢复的完整往返。

源码证据与产品范围见 `discovery.md`。本记录为针对移植流程的走查，不声明所有网页操作已完整覆盖。
