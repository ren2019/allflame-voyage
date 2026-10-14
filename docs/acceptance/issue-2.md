# #2：两份真实国服海图导入闭环

日期：2026-10-14。源样本为 `samples/charted.zh-CN.txt`，字段 oracle 为
`samples/README.md`。仅两张原始海图称为真实样本；换行、字段删除、
未知词缀、未测绘提示等用例均为明确派生数据。

## 测试边界

遵循父规格已确认的公开解析入口 `parseChartText` / `isChartClipboardText`
和真实浏览器控件。浏览器使用隔离 Playwright context，首次访问后点击
原有引导的开始按钮；通过原有文本框、解析按钮及 JSON 导出按钮操作。
导出的状态来自实际下载，未绕过导入控件调用应用内部函数。

## Red → green 证据

| 垂直切片 | Red（实现前的观察） | Green（最小实现） |
| --- | --- | --- |
| 第一张真实海图 | `not a Chart item`，名称为 `Unknown Chart` | 新增国服物品头、稀有度、区域字段、端点、两项奖励及真实螃蟹映射 |
| 第二张真实海图 | `unknown 海图形状: 直线` | 加入直线、深渊平原、头部群大小及全航程5%映射 |
| 未匹配关键词缀 | 无词缀效果的海图仍进入成功结果 | 仅国服要求精确映射；明确拒绝并保留失败名称、原因 |
| 缺失/空基底 | 缺失效果的海图仍进入成功结果 | 拒绝为 `missing voyage modifier (基底属性)` |
| 全角属性附注 | 全角括号说明进入 `rawText` | 国服依原版排除括号附注，不改变英文/韩文行为 |
| 派生未测绘提示 | 被归入未识别词缀 | 恢复既有未测绘拒绝类别 |
| 真实浏览器成功/失败反馈 | 4场景失败：`Imported ...` / `skipped ... unrecognised` | 沿用原有汇总区域，翻译导入、拒绝和未测绘提示后4场景通过 |

每个新增行为先运行失败测试，再补对应实现。额外的批量、CRLF、区域
等级71、形状拒绝、混合批次与字段保留用例验证同一公开入口；原有40个
英文/韩文解析测试继续通过。评分/求解文件未修改，两个基底效果保留
原版 `adj-crab-1` 相邻群大小25%和 `voy-pack-1` 全航程群大小5%。

## 自动化运行

```sh
npm ci
npx playwright install chromium
npm test
npm run build
npm run test:browser
# 并行 worktree 使用不同端口
PLAYWRIGHT_PORT=4174 npm run test:browser
```

新增唯一开发依赖为 `@playwright/test`；原有锁定依赖保持不变。
`vitest.config.ts` 只收集原有 `src/**/*.test.{ts,tsx}`，Playwright单独收集
`tests/browser/*.spec.ts`，避免两个测试运行器互相执行。

浏览器10场景覆盖两张分别导入、Windows批量导入、未知基底、混合批次、
缺失/空基底、缺失/未知形状、非海图和派生未测绘提示。批量用例还通过
用户导出按钮核对名称、目的地、区域等级、连接、奖励、词缀及独立实例。

本票提交前结果：`npm test` 112/112通过，OCR当前词缀64/64、别名12/12
通过；`npm run build`通过；`npm run test:browser` Chromium10/10通过；
`git diff --check`通过。

## 限制

本票仅校准真实样本中的两种形状、两个目的地和两个词缀，其余文案由
独立文本库及后续适配票交付。未测绘提示来自handoff候选文案，不是已
采集客户端全文；相关用例标为派生，不宣称真实校准。
本地Chromium不证明目标Windows内网地址可达或真实游戏剪贴板权限。
没有新增待确认列表或改变原有库存去重、评分和求解行为。
