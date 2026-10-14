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

1. 将公有证书保存到Windows桌面：
   **https://192.168.1.8:8443/allflame-voyage-ca.cer**。
   也可从Mac项目 `.local-site/allflame-voyage-ca.cer`通过本地文件传输复制。
   初次尚未信任本站时，下载渠道本身未获证书信任，必须用下一步的
   独立指纹核对文件；下载时绕过告警不算证书验收通过。
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

## Windows 现场验收清单

| 检查 | 操作与应有结果 | 当前状态 |
| --- | --- | --- |
| 网络 | 实际Windows访问固定地址并正常加载静态资源 | 已通过；实际Edge HTTP200、资源失败0 |
| 信任 | Edge无证书告警；资源正常加载 | 已通过；Windows原生TLS及不绕过证书的独立Edge均通过 |
| 样本 | 空库存分别或合并导入 `samples/charted.zh-CN.txt`，得到两张海图 | 已通过；真实Edge控件导入2张 |
| 安全上下文 | Edge中 `window.isSecureContext`为true，`typeof navigator.clipboard.writeText`为function | 已通过；实际Windows Edge读数 |
| 一键复制 | 原有放置指南点击复制后实际读回Windows剪贴板 | 已通过；文本包含国服原句和区域等级83 |
| 游戏定位 | 原样粘贴定位文本到国服游戏搜索栏，确认匹配当前格海图，并完成一次9格可执行摆盘及航程流程 | 待真实国服游戏执行 |
| 恢复与备份 | 同地址刷新恢复库存；JSON导出后用现有导入还原 | Windows刷新恢复2张已通过；JSON往返由完整BDD验证 |

网络测试失败时依次查看Mac `site:status`、Mac是否仍为192.168.1.8、
两台电脑是否处于可互访的内网，以及Mac防火墙是否允许Node入站。
资源能加载但复制失败时核对HTTPS证书信任、地址及Edge本站剪贴板权限。
记录Edge版本、检查时间、失败提示及实际结果；Mac自动化不是Windows通过证据。

## Edge证书告警的只读反馈

此前现场反馈为`ERR_CERT_AUTHORITY_INVALID`，绕过告警后导入成功。
随后获授权在实际Windows执行诊断，确认当前用户缺少项目根信任，
安装同一已核对公有根后原生TLS和独立Edge验收通过。诊断红/绿证据及
实际Edge结果见 [#8执行记录](acceptance/issue-8.md)。下述反馈步骤用于
未来复查；无需重复安装目前已存在的根证书。

在Edge告警页展开详细信息，记录原样的 `NET::ERR_CERT_...`错误码。
只读Windows诊断脚本可保存自
**https://192.168.1.8:8443/diagnose-windows.ps1**，在记事本中查看后，
由当前Windows用户在PowerShell运行：

```powershell
& "$env:USERPROFILE\Desktop\diagnose-windows.ps1"
```

若本机脚本执行策略阻止运行，可将已核对的脚本文本粘贴到PowerShell
执行，不修改系统执行策略。脚本只读取本项目公有证书是否位于正确存储，
检查下载指纹，向目标地址执行正常TLS验证并打印叶证书、SAN、有效期、
Windows时钟和链错误。无效链仍被拒绝；不会安装证书、改浏览器或读取私钥。
Windows TLS结果不是Edge结果；需要同时保留Edge错误码。

| 实际观察 | 对应处理；只在观察匹配时执行 |
| --- | --- |
| `ERR_CERT_AUTHORITY_INVALID`，预期根在两种Root存储均不存在 | 核对公有DER的SHA256后，按上文安装到当前用户Root；重新打开Edge再验 |
| 预期根只在Personal存储，Root不存在 | 当前安装位置不满足根信任；把相同已核对公有证书安装到当前用户Root |
| 下载SHA256不等于预期值 | 不安装该文件，重新从Mac已核对的公有证书复制；保留差异供诊断 |
| `ERR_CERT_COMMON_NAME_INVALID` / `RemoteCertificateNameMismatch` | 对照实际URL和打印的SAN；约定IP必须是192.168.1.8；若目标确实返回其他证书，核对服务/端口 |
| `ERR_CERT_DATE_INVALID` / `NotTimeValid` | 比较Windows当前时间与叶证书NotBefore/NotAfter；先核对两台机器真实时间，不更换CA试错 |
| 根已存在，但链未包含预期缩略指纹 | 对照实际叶证书和证书链，核对是否访问了正确服务；保留输出，不先删除其他根或关闭保护 |
| Windows TLS通过而Edge仍告警 | 保留Edge精确错误、版本和当前用户信息；完全退出后重开；若仍失败再检查Edge策略/证书路径 |

当前服务器叶证书SHA256为
`35F6752DC18D26FCF5CD17894C4D7A40B35B725BA99F21E642D5C061F22C039B`，
由项目CA签发，SAN包括192.168.1.8、127.0.0.1、localhost，有效期为
2026-10-14 10:07:37 UTC至2027-10-14 10:07:37 UTC。后续合法重签会改变
叶证书指纹，根身份可保持不变；仍应以当时Mac输出交叉核对。

证书告警消失后，在Edge本站页面的开发者工具Console查看：

```javascript
({ origin: location.origin, secureContext: window.isSecureContext,
   clipboardWrite: typeof navigator.clipboard?.writeText })
navigator.permissions.query({name: 'clipboard-write'}).then(p => console.log(p.state))
```

原有放置指南已在真实Windows Edge实际点击复制并读回剪贴板。
游戏中匹配和放置仍需真实国服物品现场核对，不以浏览器测试替代。
诊断接口依据微软的[SslStream证书验证契约](https://learn.microsoft.com/en-us/dotnet/api/system.net.security.sslstream)。

## 本地自动化复验

```sh
npm run test:deployment
# 先启动实际HTTPS站点，再运行：
npm run test:https
# 已授权Windows SSH、且用户登录交互桌面时执行真实Edge验收：
WINDOWS_SSH_ALIAS=opensonic-windows-runner npm run test:windows
```

第一项测试在临时目录生成自己的CA，用随机端口验证启动、停止、资产
访问、路径隔离和版本更新。第二项访问约定实际内网地址，严格Node TLS
校验证书CA、有效期和IP SAN，再用临时Chromium进程仅接受该服务器
公钥指纹，验证真实国服导入控件、安全上下文、分享/放置指南的实际
剪贴板写入及刷新恢复。不会全局安装CA，也没有设置`ignoreHTTPSErrors`。
临时浏览器的精确SPKI范围由[Chromium实现说明](https://chromium.googlesource.com/chromium/src/+/bff9ec6/services/network/ignore_errors_cert_verifier.h)
界定；它不能证明Windows系统信任或国服游戏搜索成功。

`test:windows`使用目标Windows已安装的Edge及其系统根信任。通过独立
临时配置目录、仅回环CDP和SSH隧道驱动真实网站控件；没有证书忽略或
SPKI参数。只清理自己的临时任务、目录和进程，不操作用户现有Edge或
游戏。需要目标用户保持桌面已登录、SSH可用及Mac站点已启动；该入口
会实际写入并读回Windows剪贴板，不替代国服游戏验证。

入口现在强制导入全部五张真实全文，核对五项形状/目的地，真实原生写入
完成后读回定位文本，并用Windows已有Framework64编译器生成临时无窗口
只读探针，独立核对同桌面的Win32系统剪贴板。没有编译器、探针未执行、
文本不匹配或所有者不是本次临时Edge时均失败，不降级为两张/模拟通过。
`DEPLOYED_INTEGRATION=<实际已部署提交SHA>`可写入复验证据；它由操作人
指定，不自动假定当前Git分支就是正在运行的版本。五张最新现场证据与
此前空读的诚实诊断限制见 [client-shapes.md](acceptance/client-shapes.md)。
