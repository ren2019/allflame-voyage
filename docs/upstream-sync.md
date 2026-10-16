# 持续同步原英文仓库

`origin` 是个人 fork `ren2019/allflame-voyage-cn`，`upstream` 是原英文仓库 `one-more-map/one-more-map.github.io`。日常开发及已接受的实现统一合入本 fork 的 `main`。每次同步前重新获取上游引用，以实际新增提交为准。

## 每次更新

先保持工作区干净，再以最新 fork 主分支建立一次性同步分支：

```sh
git switch main
git pull --ff-only origin main
git fetch upstream
git switch -c sync/upstream-YYYYMMDD
git merge --no-ff upstream/main
```

分支名中的日期每次替换为实际日期。如果没有新提交，Git 会提示已经是最新，无需创建空 PR。发生冲突时逐处保留所需行为，继续 merge；不要用上游整份覆盖本地文件，也不要把本 fork 的 main 重置为上游。

优先核对国服解析及真实样本、中文别名与校准证据、目标/边界配置、预留和核销、原版求解语义，以及已接受的界面。词缀内部 ID 是共享键，不因显示翻译而改名。部署配置由本 fork 独立维护；同步工作流改动时核对自己的发布目标与权限，避免仅因合并上游而改变部署方式。

若依赖锁文件变化先运行 `npm ci`。运行 `npm run build`、`npm test` 和相关浏览器回归；较大同步运行 `npm run verify` 并逐阶段检查结果。当前总门禁仍有已知的旧 `scoring.ts` 字节 pin 不匹配，不能把阶段通过称作总门禁通过，也不能不经审查更新摘要掩盖实际算法变化。

推送到 origin 并创建以 main 为目标的 PR。合并方式选择 **Create a merge commit**，保留上游提交的祖先关系；不要 squash/rebase 上游同步提交。这样下一次 Git 能从共同祖先计算真正的新改动，而不会反复导入旧差异。

```sh
git push -u origin sync/upstream-YYYYMMDD
gh pr create --repo ren2019/allflame-voyage-cn --base main
# 审查、验证后，使用该 PR 的实际编号：
gh pr merge PR_NUMBER --repo ren2019/allflame-voyage-cn --merge --delete-branch
```

代码合并与站点发布分别验证。部署入口见 [部署说明](local-deployment.md)。浏览器库存属于协议、主机和端口；更新时沿用原地址，改地址前导出备份。代码合并不代表 Windows 原生复制或游戏现场验收通过。
