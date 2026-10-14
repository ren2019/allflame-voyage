# 新真实客户端形状证据与解析闭环

2026-10-14。用户追加文件为 `/Users/steipete/Downloads/临时 1.md`，
与最初的`临时.md`不同。经用户授权，将新文件前三张高级复制原文精确
保存为 `samples/charted-extra-shapes.zh-CN.txt`；原有两张样本的文件和
内容保持不变。来源文件包含末尾原有两张，未将它们再次计为新采集。
三个全文不是基于网页模板构造的测试数据。

## 独立字段oracle

完整逐字段及显式负面属性预期见
`samples/charted-extra-shapes.zh-CN.expected.json`。

| 新样本 | 名称 | 目的地/内部ID | 形状/标准北东南西连接 | 头部奖励 | 基底效果 |
| --- | --- | --- | --- | --- | --- |
| 1 | 远洋 冒险 珊瑚暗礁海图 | 海底山脊 / seafloor-ridges | 角落 → Corner / true,true,false,false | 数量165%、硫磺30% | voy-flask；全航程药剂品质 |
| 2 | 海洋 旅程 金沙海床海图 | 深渊平原 / abyssal-plain | 节点 → Junction / true,true,true,false | 数量32%、稀有度60%、本区域群大小25% | voy-pack-2；全航程群规模7% |
| 3 | 海洋 旅程 珊瑚密林海图 | 海底林地 / undersea-groves | 交叉 → Crossing / true,true,true,true | 数量95%、硫磺30%、群大小16% | adj-opbox-1；相邻2侦探保险箱 |

所有区域等级均为83。标准连接采用既有形状定义，表示旋转前的一种
标准朝向，未改求解器、评分、边连通算法或词缀效果。新样本的显式
硫磺正文已经包含在头部总数中，不重复增加。本区域群大小25%与基底
全航程7%分别表示，稀有度60%从真实头部读取。

## Red → green 与回归

1. 新角落全文先失败：`unknown 海图形状: 角落`。注册有真实来源的
   Corner确认记录后公开解析通过。
2. 新节点全文先失败：`unknown 海图形状: 节点`。确认Junction记录后
   测试再次失败，显示头部稀有度60%未进入奖励；新增唯一国服
   `物品稀有度`头部匹配后通过。
3. 新交叉全文先失败：`unknown 海图形状: 交叉`。确认Crossing记录后
   通过，侦探保险箱仍是已有`adj-opbox-1`，未增加内部ID。

公开parser8个新测试覆盖前三张分别导入、完整literal字段/负面属性、
全部五张合并导入、CRLF派生换行及五个不同实例。真实浏览器4场景通过
原有导入控件导入各张及五张批次，再用实际JSON导出控件核对oracle；
不是浏览器内直接调用解析函数。

## 离线库与剩余缺口

客户端manifest现在包含两份来源文件及其SHA256。重放从明确登记的
客户端source查找逐样本引用，审计校验每个引用的来源身份、sample索引
及逐字文本。五种形状均有客户端原文：端点、直线、角落、节点、交叉。
新增3个航行效果、2个目的地与1个头部字段的客户端校准，不改变
PoEDB的网页原句或评分参数。原生mod/stat ID仍没有证据，保持null/空数组。

当前计数：5张真实高级复制；5/62航行词缀确认、其余57仅来源；
4/15目的地确认、其余11仅来源；5/5形状确认；11个客户端字段确认。
边界仍是0确认、63仅来源和1文字冲突；归并奖励仍13冲突、2缺失，
不因新头部稀有度值60%而发明`cm-rarity-60`或修正其评分档位。
未测绘、普通、低级复制与真实游戏内搜索/放置仍需另行现场证据。

复验：

```sh
python3 scripts/replay-text-library.py
python3 scripts/check-text-library.py
npx vitest run src/logic/parser.client-shapes.test.ts src/logic/parser.test.ts src/logic/parser.zh-CN.test.ts src/data/textLibrary.test.ts tests/text-library-audit.test.ts
PLAYWRIGHT_PORT=4188 npm run test:browser -- tests/browser/client-shapes.spec.ts
npm run build
```

本票提交前结果：focused Vitest196/196、浏览器4/4、离线SHA审计与
确定性重放通过；构建及`git diff --check`通过。原英文/韩文40个解析
回归、原两份国服13个回归均包含在focused运行中。

实际Windows复验入口已扩展为无条件读取原两张和追加三张文件，导入5张、
通过真实列表检查五项目的地/形状文案、继续验证原图的实际剪贴板复制和
刷新恢复5张；不会在新文件缺失时降级为两张通过。此入口须在根工作区
部署本票版本后运行，历史#8两张现场证据不改写为五张结果。
