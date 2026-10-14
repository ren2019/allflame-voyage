# Mac Mini 手动内网部署

约定地址：**https://192.168.1.8:8443/**。目标客户端为 Windows Edge。
保持协议、IP和端口一致，才能使用原有浏览器库存；换地址前先导出JSON。
Mac运行纯静态HTTPS文件服务，规划状态仍仅在Windows浏览器保存。

## Mac 启动、停止和更新

在项目根目录执行。需要 Node.js 20或更新版本、npm和OpenSSL；不需要
mkcert、Caddy、后台数据库或开机自启。

```sh
npm ci
npm run build
npm run site:init
npm run site:start
npm run site:status
# 更新到当前工作树版本；构建失败时旧服务继续运行
npm run site:update
# 使用结束后手动停止
npm run site:stop
```

`start`脱离终端运行，监听所有网卡8443端口；关闭终端不会关闭站点。
`stop`只终止本项目登记且命令匹配的服务进程，不终止复用PID的其他程序。
服务只发布构建结果，不公开源码、项目目录或证书目录；不存在应用API。
日志、发布副本、PID及证书均在忽略的 `.local-site/`。

如果Mac防火墙询问Node入站权限，在私人内网允许；不需要修改路由器或
公网转发。Mac睡眠或关机时不可访问。手动运行 `site:status`检查状态。

版本更新前如果依赖有变先执行 `npm ci`；`site:update`完成构建后再停止
旧服务并发布新文件。浏览器刷新即可加载新版本，CA和访问地址不改变。
首次生成的CA保留十年，服务器证书一年；`site:init`/`site:start`在服务器
证书剩余不足30天时沿用原CA重新签发。CA接近到期时命令停止并报错，
需要维护者明确轮换CA及重新完成Windows信任步骤。

## Windows Edge 安装这个项目的公有根证书

只复制 `.local-site/allflame-voyage-ca.cer` 到Windows。私钥文件 `ca.key`
和 `server.key` 保留在Mac项目的忽略目录，不复制到Windows或提交Git。
自动化和启动命令均不会向Mac/Windows系统安装受信任根。

1. 通过可信的本地文件传输把公有 `.cer` 文件放在Windows桌面。
2. 在Mac执行 `npm run site:init`，记录输出的SHA256指纹；在Windows
   PowerShell执行以下命令，核对文件的SHA256一致：

   ```powershell
   certutil -hashfile "$env:USERPROFILE\Desktop\allflame-voyage-ca.cer" SHA256
   ```

3. 双击 `.cer` → **安装证书** → **当前用户** → **将所有的证书都放入下列存储**
   → **浏览** → **受信任的根证书颁发机构** → 完成。核对证书名称为
   `Allflame Voyage Local CA`后确认。这会让当前Windows用户信任此项目CA
   签发的证书；没有改变浏览器安全开关，也无需全机器安装。
4. 完全退出并重新打开Edge，访问 **https://192.168.1.8:8443/**。
   应无证书告警。如果仍有告警，先核对地址、系统时间和证书指纹，
   不使用“继续访问”来代替成功验收。
5. 如需撤销：打开 `certmgr.msc` → 受信任的根证书颁发机构 → 证书，
   按名称和指纹定位本项目CA后删除，避免删除其他根证书。

当前实际公有CA的SHA256指纹（2026-10-14生成；保留同一CA更新有效）：
`59EF4E27006E76CA526A2EF3BE3031345894A71EF2C2137605DC59B3E30E3072`。
证书的SHA1 Windows缩略指纹为
`308247F1AD6A09294341A34627117EDB718BF634`。

这些操作依据微软的[证书存储与导入说明](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/certutil)
及[当前用户证书存储说明](https://learn.microsoft.com/en-us/powershell/module/pki/import-certificate)。

## Windows 现场验收清单（待实际执行）

| 检查 | 操作与应有结果 | 当前状态 |
| --- | --- | --- |
| 网络 | PowerShell `Test-NetConnection 192.168.1.8 -Port 8443`显示 `TcpTestSucceeded: True` | 待Windows现场执行 |
| 信任 | Edge无证书告警；资源正常加载 | 待Windows证书安装后执行 |
| 样本 | 空库存分别或合并导入 `samples/charted.zh-CN.txt`，得到两张海图 | 待Windows现场执行 |
| 安全上下文 | Edge开发者工具Console查看 `window.isSecureContext`为true，`typeof navigator.clipboard.writeText`为function | 待Windows现场执行 |
| 一键复制 | 在原有放置指南点击复制，粘贴到记事本确认有定位文本；若Edge询问剪贴板权限，对本站允许 | 待Windows现场执行 |
| 游戏定位 | 原样粘贴定位文本到国服游戏搜索栏，确认匹配当前格海图，并完成一次9格可执行摆盘及航程流程 | 待真实国服游戏执行 |
| 恢复与备份 | 同地址刷新恢复库存；JSON导出后用现有导入还原 | 待Windows现场执行 |

网络测试失败时依次查看Mac `site:status`、Mac是否仍为192.168.1.8、
两台电脑是否处于可互访的内网，以及Mac防火墙是否允许Node入站。
资源能加载但复制失败时核对HTTPS证书信任、地址及Edge本站剪贴板权限。
记录Edge版本、检查时间、失败提示及实际结果；Mac自动化不是Windows通过证据。

## 本地自动化复验

```sh
npm run test:deployment
# 先启动实际HTTPS站点，再运行：
npm run test:https
```

第一项测试在临时目录生成自己的CA，用随机端口验证启动、停止、资产
访问、路径隔离和版本更新。第二项访问约定实际内网地址，严格Node TLS
校验证书CA、有效期和IP SAN，再用临时Chromium进程仅接受该服务器
公钥指纹，验证真实国服导入控件、安全上下文、分享/放置指南的实际
剪贴板写入及刷新恢复。不会全局安装CA，也没有设置`ignoreHTTPSErrors`。
临时浏览器的精确SPKI范围由[Chromium实现说明](https://chromium.googlesource.com/chromium/src/+/bff9ec6/services/network/ignore_errors_cert_verifier.h)
界定；它不能证明Windows系统信任或国服游戏搜索成功。
