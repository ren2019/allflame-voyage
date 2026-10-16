# GitHub Pages 部署可行性与费用

核查日期：2026-10-16。初次研究核实政策、仓库状态和本地构建；后续按用户要求将项目更名为 `allflame-voyage-cn`，调整发布目录并添加首页署名。尚未启用 Pages 或运行远程部署。

## 结论

本项目适合部署到 GitHub Pages。仓库 `ren2019/allflame-voyage-cn`（原名 `ren2019/allflame-voyage`）为公开仓库；使用 GitHub Free、默认 `github.io` 地址和现有标准 Ubuntu runner，可实现零托管费、零服务器租赁费的公开静态网站。Pages 支持 HTML、CSS、JavaScript 及构建后的静态文件，公开仓库在免费计划即可使用。[官方 Pages 说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)、[Actions 计费](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

默认项目站地址为 `https://ren2019.github.io/allflame-voyage-cn/`，无需把本仓库改名为 `ren2019.github.io`；后者是账号主页站的命名方式。这里的地址是按官方规则推导的部署目标，不表示站点已经上线。[站点类型与 URL 规则](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

## 本仓库的实测证据

| 检查 | 结果与依据 |
| --- | --- |
| 仓库可见性和分支 | 2026-10-16，`gh api repos/ren2019/allflame-voyage` 返回 `visibility: public`、`default_branch: main`、`has_pages: false`。查询 fork 时显式指定仓库，避免 `gh` 默认读取 upstream。 |
| 远端发布状态 | 同日，`gh api repos/ren2019/allflame-voyage/pages` 返回 404，部署工作流历史为空；仓库 Actions 已启用。没有已发布 Pages 的证据。 |
| 更名后状态 | 同日，更名后查询 `gh api repos/ren2019/allflame-voyage-cn`，返回 `full_name: ren2019/allflame-voyage-cn`、`fork: true`、`has_pages: false`。本地 `origin` 和 `gh` 默认仓库均已同步为新地址。 |
| 应用类型 | [package.json](../../package.json) 与 [Vite 配置](../../vite.config.ts) 表明这是 React / Vite 静态前端；计算和 `localStorage` 保存发生在浏览器，无需常驻后端服务。 |
| 构建 | `npm run build` 成功，输出 `dist/`，`du -sh dist` 为 3.7 MB；仅有单个 chunk 超过 500 KB 的体积提示，不阻止构建。 |
| 子路径兼容 | [vite.config.ts](../../vite.config.ts) 设置 `base: './'`，构建资源使用相对路径，适合项目站子路径。 |
| 现有部署入口 | [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml) 已在 `main` push 或手动触发时运行 `npm ci`、`npm run build`，使用标准 `ubuntu-latest` runner，再通过官方 Pages artifact / deploy actions 发布。 |

初次核查时，工作流将应用放进 `staging/allflame-voyage-solver/`，并使用含上游 canonical 和标题的 `redirect.html` 跳转。现已改为直接发布 `dist/`，删除旧跳转页，让应用位于项目站首页。首页标题与版本右侧的 GitHub 图标链接至国服项目，悬停提示维护者 ren2019；页脚保留原作者 one-more-map 的署名与项目链接；见 [App.tsx](../../src/App.tsx)。

修改后再次生产构建成功，现有 `chinese-shell` 与 `workspace-layout` 共 5 项浏览器检查通过。将生产产物挂载于 `/allflame-voyage-cn/` 本地静态路径后，1440 px 与 390 px 宽度的页面加载均无资源错误或 JavaScript 错误，署名及链接正确且未越出视口；这不代替线上 Pages 验证。

## 费用边界

| 使用方式 | 费用结论 |
| --- | --- |
| 公开仓库 + 默认 `github.io` 地址 | GitHub Free 可用 Pages，无需为本项目购买付费计划。[Pages 计划范围](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) |
| 当前公开仓库的标准 GitHub Actions runner | 标准 runner 的公共仓库构建免费；当前工作流使用 `ubuntu-latest`，不属于收费的大型 runner。[标准 runner](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)、[Actions 计费](https://docs.github.com/en/billing/concepts/product-billing/github-actions) |
| 私有源码仓库发布 Pages | 免费计划不提供私有仓库 Pages；个人需 Pro，组织需 Team / Enterprise 等支持的付费计划。付费保留源码私有，不等于网站也私有。[Pages 计划范围](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)、[创建站点与公开性](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) |
| 私有仓库的其他 Actions 工作流 | 通用规则为按计划包含分钟及存储配额，超额可能收费。当前计费页也明确列出 Pages 使用标准 runner 免费，因此不能把所有私有 Pages 构建一概写成按分钟付费。与本项目当前公开仓库方案无关。[Actions 计费](https://docs.github.com/en/billing/concepts/product-billing/github-actions) |
| 大型 runner / 额外计费服务 | 大型 runner 即使在公开仓库也收费。额外 artifacts、Packages 等应分别按其配额管理，不能由“Pages 免费”推导所有 GitHub 服务都免费。[runner 定价](https://docs.github.com/en/billing/reference/actions-runner-pricing)、[Actions 存储规则](https://docs.github.com/en/billing/concepts/product-billing/github-actions) |
| 自定义域名 | 可选；Pages 支持使用自己持有的域名。域名注册和续费属于域名供应商的费用，不是使用默认 `github.io` 必需的成本。本次没有选购域名或查询某个域名的报价。[自定义域名](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages) |
| HTTPS | 默认 `github.io` 自动使用 HTTPS，正确配置的自定义域名也支持 HTTPS；无需自行部署证书服务器。[HTTPS 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https) |

私有站点访问控制是另外一项能力：组织需 GitHub Enterprise Cloud，不能用普通私有仓库或 Pro 代替登录访问控制。本项目是面向公众的工具，无需这一方案。[私有发布要求](https://docs.github.com/en/enterprise-cloud%40latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site)

## 容量和用途限制

下表均来自 [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)，按 2026-10-16 页面核查：

| 项目 | 官方限制 |
| --- | --- |
| 发布站点大小 | 不超过 1 GB；源码仓库建议不超过 1 GB。 |
| 带宽 | 每月 100 GB 软限制。 |
| 部署 | 超过 10 分钟会超时。 |
| 构建频率 | 每小时 10 次软限制；自定义 GitHub Actions 构建发布不受此条限制。 |
| 超额处理 | 可能限流、无法继续服务，或被建议降低流量／迁移；官方没有把 Pages 带宽超额描述成自动按 GB 购买扩容。 |

Pages 用于静态项目网站，不允许用作以商业交易或商业 SaaS 为主要目的的免费托管服务。当前作为免费游戏辅助工具的使用方式与静态项目网站定位相符，这是基于产品用途的判断；若未来转为付费服务，应重新核对政策。[Pages 用途限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

## 建议的后续步骤

1. 保持公开仓库和默认 `github.io` 地址，避免为这次上线引入付费计划或域名购买。
2. 已将应用发布目录调整至项目站首页，并添加本项目与原作者的署名链接；上线后核对实际页面。
3. 将仓库 Settings → Pages 的发布源设为 GitHub Actions，检查 fork 是否仍需启用继承工作流，再触发已有部署工作流。非 Jekyll 构建采用自定义 Actions 是官方支持的发布方式。[发布源配置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
4. 上线后验证入口跳转、图片和图标、浏览器计算及保存恢复。国服面向大陆用户，仍需从实际使用网络验证访问速度和稳定性；本次未做大陆多运营商网络实测，不能承诺访问质量。
