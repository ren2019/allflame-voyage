# #19 极简浅深主题实现证据

规格：[#21](https://github.com/ren2019/allflame-voyage/issues/21)，任务：[#19](https://github.com/ren2019/allflame-voyage/issues/19)。

## 实现与设计依据

采用已接受评审稿 `docs/research/target-icons-review.html` revision 2 的浅深调色板，面板、表单、反馈、中文校准入口与校准工作台使用同一组语义变量。移除可见面板的游戏装饰边框、渐变、发光和文字阴影；保留词缀作用范围与功能状态颜色。原始评审稿及 `docs/research/reviews/2026-10-15-final-acceptance.json` 已在实施前基线 aeb688d 归档，本票未修改这些原始证据。

沿用 `theme` 存储键：harvest → light，allflame → dark；新选择保存 light/dark。无偏好时默认深色，原 harvest URL 在没有明确偏好时仍显示浅色。不会读取评审原型的临时主题。跨页签偏好改变同步外观和切换按钮的可访问名称。存储不可用时仍可切换当前页。

390px 下使用单列 minmax(0,1fr) 和紧凑九格布局，不将侧栏或入口挤到视口之外；校准表格保留其内部横向滚动，编辑区域在表格后完整展示。

## 检查结果

- TDD 首次主题流程测试在旧产品缺少“切换到深色主题”按钮时失败；实现后通过。
- `PLAYWRIGHT_PORT=4319 OFFLINE_ACCEPTANCE=1 npm exec -- playwright test tests/browser/theme.spec.ts tests/browser/calibration.spec.ts tests/browser/chinese-shell.spec.ts --workers=1`：9 passed。
- 最后补充跨页签同步后单独运行主题流程：2 passed。
- 两旧偏好映射，切换、刷新、实际 JSON 导出与库存／预留／布局／评分设置不变已验证；同一规划航程奖励持续为13.0。
- 浅深色、1440px及390px的主界面、反馈／中文校准、词缀弹窗已截图检查，无页面脚本错误或阻塞操作的横向溢出。
- `npm run build` 与 `git diff --check` 通过。Vite原有大块提示仍存在。

截图位于同名 `issue-19/` 目录：planning-*（真实页面，合成既有回归规划夹具），calibration-*，mod-dialog-*。这些是本地 Chromium 自动化与人工画面检查证据；Windows Edge 留给 #23，不冒充游戏现场验收。

本票没有修改求解／评分／核销代码，没有更新部署。
