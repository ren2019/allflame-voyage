# #8 部署执行证据

2026-10-14。起点为integration `a970b3d`。预先确认的测试边界为命令行
静态HTTPS及真实浏览器流程；没有应用后端或服务端规划存储。

TDD首个公开命令测试先失败：`scripts/local-site.mjs`不存在；实现项目
CA初始化、静态发布与启动/停止后转绿。三项生命周期/隔离/更新检查
全部通过，更新保持原CA和稳定访问地址。测试端口为动态分配，避免
与本机Docker的18443监听发生冲突。

实际Mac网卡地址由 `ipconfig getifaddr en0`核实为192.168.1.8，实际服务
启动于 `https://192.168.1.8:8443/`。`npm run test:https`结果：

```json
{
  "strictTls": "project CA and IP SAN verified",
  "secureContext": true,
  "importedRealCharts": 2,
  "actualClipboardWrite": true,
  "refreshedInventory": 2,
  "failedResources": 0,
  "browserTrust": "this process, exact server SPKI only",
  "targetWindows": "pending"
}
```

实际放置指南写入了已导入海图的定位文本；没有替换剪贴板接口。
既有保存是延迟执行，测试等待其计划保存后刷新验证2张库存恢复。
这属于Mac Chromium本地执行；Windows Edge及真实国服游戏验收尚未
执行，具体现场检查记录于 `docs/local-deployment.md`，没有标为通过。

服务使用独立 `.local-site/`忽略目录，密钥权限600、父目录700。
CA未安装到Mac全局信任库；导出文件只含公有CA证书。根工作区最终
部署沿用同一CA和服务器证书，不因工作树清理而重新生成信任身份。

## 实际Windows反馈后的补强

用户在实际Windows Edge访问约定地址时遇到证书告警，选择继续访问后
成功导入两份真实样本。网络与导入有现场反馈；证书信任、安全上下文、
实际复制及游戏定位仍未通过。没有精确Edge错误码时不归因，也未修改
CA身份或浏览器保护。

公开CA下载用例先红：`/allflame-voyage-ca.cer`返回404。静态发布现在
仅复制生成的公有DER证书到发布根目录，下载证书指纹必须与实际项目CA
一致，`/ca.key`和`/server.key`仍为404。生命周期及公开证书检查4/4通过。
新增只读 `public/diagnose-windows.ps1`供目标机器回传根存储、实际证书
和原生TLS链信号；本环境无Windows/PowerShell，未宣称目标脚本已执行。
具体条件式处理与反馈步骤见 `docs/local-deployment.md`。
