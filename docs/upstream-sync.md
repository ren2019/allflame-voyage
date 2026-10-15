# 持续同步原英文仓库

`origin` 是个人 fork `ren2019/allflame-voyage`，`upstream` 是原英文仓库 `one-more-map/one-more-map.github.io`。日常开发及已接受的实现统一合入本 fork 的 `main`。2026-10-16 核对时，上游 `main` 为 `20a694b`，与 fork 原基线相同，无新上游改动需要额外导入。

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

优先核对国服解析及真实样本、中文别名与校准证据、目标/边界配置、预留和核销、原版求解语义，以及已接受的界面。词缀内部 ID 是共享键，不因显示翻译而改名。当前只使用内网部署，GitHub Pages API 未配置站点；原有 main 推送工作流保留，本次不启用 Pages。未来变更工作流需要具备 workflow 权限的凭证，发布公网另行决定。

若依赖锁文件变化先运行 `npm ci`。运行 `npm run build`、`npm test` 和相关浏览器回归；较大同步运行 `npm run verify` 并逐阶段检查结果。当前总门禁仍有已知的旧 `scoring.ts` 字节 pin 不匹配，不能把阶段通过称作总门禁通过，也不能不经审查更新摘要掩盖实际算法变化。

推送到 origin 并创建以 main 为目标的 PR。合并方式选择 **Create a merge commit**，保留上游提交的祖先关系；不要 squash/rebase 上游同步提交。这样下一次 Git 能从共同祖先计算真正的新改动，而不会反复导入旧差异。

```sh
git push -u origin sync/upstream-YYYYMMDD
gh pr create --repo ren2019/allflame-voyage --base main
# 审查、验证后，使用该 PR 的实际编号：
gh pr merge PR_NUMBER --repo ren2019/allflame-voyage --merge --delete-branch
```

代码合并与内网服务发布分开。当前使用 `https://192.168.1.8:9443`，浏览器库存属于该源；保持地址不变即可继续使用。合并本身不重启内网服务，也不代表未完成的 Windows/游戏现场验收已经通过。原工作流仍声明 main 推送触发，若 GitHub 执行它应单独核对结果；没有 Pages 配置时不能把合并当作公开站点发布成功。
