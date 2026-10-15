# 本地运行与局域网 HTTPS

应用构建后为纯静态文件，不需要数据库或应用后端。规划数据在使用者浏览器中保存。

## 本机开发

```sh
npm ci
npm run dev
```

打开终端显示的 localhost 地址。本机开发与其他电脑访问是不同的站点来源，库存不会自动跨地址同步。

## 自行部署静态文件

```sh
npm run build
```

将 `dist/` 发布到自己的静态服务器。Vite 使用相对资源路径，可部署于子目录。需要一键复制时，使用浏览器认可的安全上下文；局域网 IP 的普通 HTTP 不满足这一条件。可参考 [Clipboard API 文档](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)。

本仓库沿用上游的 GitHub Pages 工作流。是否开启 Pages、发布域名及触发方式由部署者配置，仓库源码地址不等于已经发布的网页地址。

## Mac / Linux 手动 HTTPS 服务

项目附带 Node.js 静态 HTTPS 包装器，需要 Node.js 20+、npm 和 OpenSSL。下列 IP 是示例，请替换成服务电脑在局域网中的固定地址。后续启动、停止及更新沿用同一组变量。

```sh
export VOYAGE_IP=192.168.1.100
export VOYAGE_PORT=8443
npm ci
npm run build
npm run site:start
npm run site:status
```

`site:start` 会创建项目专用 CA、签发含该 IP 的服务器证书，复制构建产物后在后台运行。首次调用即可初始化，无需另行安装服务或配置开机启动。服务目录为忽略的 `.local-site/`，包含证书、日志、PID 和发布副本；可通过 `VOYAGE_SITE_DIR` 指定其他目录。

可调整变量见下表：

| 变量 | 用途 |
| --- | --- |
| `VOYAGE_IP` | 客户端访问的服务电脑 IPv4；用于服务器证书 SAN |
| `VOYAGE_PORT` | HTTPS 监听端口 |
| `VOYAGE_SITE_DIR` | 证书、PID、日志及发布副本所在目录 |
| `VOYAGE_BUILD_DIR` | 已构建静态文件目录，默认 `dist/` |

服务只发布构建副本，不公开仓库或证书目录。Mac / Linux 关闭终端后服务继续运行，电脑休眠、关机或网络不可达时站点不可用。防火墙仅需按自己的局域网访问要求放行该服务。

## Windows Edge 信任证书

浏览器必须信任该项目 CA，绕过告警继续访问不等于证书配置完成。服务启动命令不会自动修改 Windows 信任存储。

1. 从服务电脑安全取得 `.local-site/allflame-voyage-ca.cer`。这是公有 DER 根证书；`ca.key` 和 `server.key` 留在服务电脑，不传给客户端。
2. 在服务电脑核对公有证书的 SHA256，例如 `shasum -a 256 .local-site/allflame-voyage-ca.cer`；在 Windows 用 `Get-FileHash` 对收到的 `.cer` 计算 SHA256，通过独立渠道确认相同。
3. 导入该证书到当前 Windows 用户的「受信任的根证书颁发机构」。Microsoft 的 [Import-Certificate 文档](https://learn.microsoft.com/en-us/powershell/module/pki/import-certificate)说明了证书存储位置。
4. 重新打开 Edge，访问配置的 HTTPS 地址，确认无证书告警，再测试复制和刷新恢复。

如出现证书错误，检查实际 IP 是否与签发时相同、系统时间、收到的根证书指纹及其存储位置。修改 IP 后需重新签发匹配新 IP 的服务器证书；沿用已有根 CA 可以避免无必要的信任轮换。

## 更新与停止

先确认工作区、服务目录和变量对应自己要更新的实例。依赖变化时先执行 `npm ci`，然后：

```sh
npm run site:update
# 使用结束后停止该实例
npm run site:stop
```

更新入口先构建，再停止并替换该项目登记的服务；构建失败时原服务继续运行。停止入口核对登记 PID 的命令身份，不终止复用 PID 的其他程序，保留证书和发布文件。

库存属于浏览器的协议、主机、端口组合。保持访问地址可沿用本地库存；更换地址或浏览器前，在页面导出规划备份，新地址打开后恢复。服务电脑上的静态文件不是使用者库存备份。

## 验证

```sh
npm run test:deployment
# 服务已启动，并设置了对应 VOYAGE_IP / VOYAGE_PORT 后：
npm run test:https
```

部署回归使用临时证书及端口；本机 HTTPS 浏览器验证不代表目标 Windows 信任或游戏内匹配已经通过。真实操作按 [现场清单](acceptance/field-checklist.md)记录。
