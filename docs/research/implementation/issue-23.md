# #23 集成闭环与独立验收

产品候选、构建摘要、执行证据和人工交接集中在 `docs/acceptance/spec21/`。`candidate.json` 区分产品 SHA 与后续仅测试/原生验收脚本提交；所有报告按真实执行源登记，不把新提交号回填成旧测试的执行版本。

## 产品修复

- 静态 HTTPS 服务为本地 WebP、JPG/JPEG 和 WOFF 返回正确 MIME；保留 nosniff。新公开 HTTP 回归先因 WebP 返回 application/octet-stream 失败，再修复。GET/HEAD 验证 MIME、原始资源字节以及无 HEAD 响应体，实际 Windows 图像解码另证。
- 删除原作者 GoatCounter 外部脚本。原生隔离离线验收先发现 count.js 外网失败，再由整页请求/错误断言复现；删除后产品全部资源本地加载。没有修改现有8443的文件或进程。

## 测试与边界

`tests/browser/spec21-flow.mjs` 从真实 UI 载入已标注人工模型的规划备份、选择策略/求解、查看区域目标/边界/历史、复制六个完整留图表达式、切换铅笔，确认这些操作不改变导出业务状态或评分。取消核销不改库存/历史；两张待保留图分别保留/消耗，恰好消耗8张、保留1张，历史仅追加一次；补五图后下一轮求解不复活消耗实例，刷新/导出载入保持状态。

同一共享流程在离线 Playwright 和真实 Windows Edge 执行。两主题、1440/390px验证最多四目标、键盘详情/焦点恢复、当前使用图案解码；native脚本另要求39份资源全部解码，当前完整native验收未完成。网格/列表中的预留/形状/铅笔按钮互不遮挡、单条校准直达正确记录、反馈和校准页主题一致。现有独立功能测试继续覆盖原始中文解析、七策略可执行性与材料保护、受控复制pending/成功/失败、目标范围/分组/阈值、十二边界累计、历史0/4/5/30/31及并列/口径隔离/重复完成/损坏状态恢复。

全套初跑仅一条旧断言失败：导入测试仍期待“等级:83”，而已接受紧凑UI为“83”，有明确“区域等级 83”title。修正测试同时保留导出level=83断言，完整离线浏览器重跑67条通过。初跑记录保留，不冒充原本npm verify一遍全绿；产品字节未变化，不重复无关逻辑/OCR/构建检查。旧27场景/7故事台账属于上一轮本地化，不当作#21覆盖结论。

## Windows 原生与生命周期

`tests/deployment/verify-spec21-windows-edge.mjs` 仅允许显式独立HTTPS URL（拒绝8443），每次使用唯一交互任务/Edge profile、Windows loopback CDP和独有SSH转发；不传任何证书绕过参数，不安装新CA。隔离profile禁用扩展，避免机器策略安装的Adblock Plus额外欢迎页混入应用资源错误统计；不更改用户正常Edge。

原生writeText包装器只观察并返回原始Promise，先证明原函数为native。六策略均检查实际完整readText，不接受部分串。Windows剪贴板存在延迟呈现，使用有界30次轮询且要求精确全文；读取前将自己的页面置前。完整表达式另要求由交互C# CF_UNICODETEXT探针检查OS剪贴板，owner必须为本次UUID的msedge；这是通过条件，当前候选尚未满足。探针只记录匹配后的本次自有字符串，不输出其他剪贴板内容。

跨主机导出仍点击真实“导出”按钮；CDP allowAndName把下载放在自有Windows profile/Downloads，以GUID和完成事件等待；SSH只读取并删除这些已完成的规划导出。没有应用状态后门。脚本已准备仅本次浏览器origin的剪贴板权限拒绝路径，要求观察原始native Promise拒绝与保留全文的失败弹窗并恢复权限。当前运行在成功读回检查处失败，尚未执行该失败路径，不能记通过；离线受控API拒绝已独立通过。

候选服务由 `scripts/spec21-candidate.mjs` 前台创建临时权限700目录，只读复用已被Windows信任的现有叶证书，启动 local-site serve；绝不调用生产start/init/update/stop。退出后只清理该子进程和临时证书副本。生产快照以全部26静态文件路径/摘要、5项元数据摘要/纳秒mtime和原PID存活比对，前后均相同。已结束的原生运行/最小复现任务、profile、进程、探针和SSH转发清理由各自报告证明。最后一次OS-first启动时SSH连接突然reset，无法确认远端是否已创建资源或清理；见独立ownership记录。

## 游戏现场边界

`manual-game-handoff.md` 给出独立预览重启命令、六条原样表达式、逐策略正负/容量/截断样本、实际作用范围/目的地/48图案检查单、缺失真实神圣边界样本、真实一次完成/消耗/保留核对和含客户端版本/时间/结果的记录模板。当前没有游戏输入自动化、真实容量/匹配/遭遇/航程结论或可提供的完整客户端版本；#24保持未完成。临时自动化服务器已停止，不承诺测试URL仍在线，审查后由维护者启动人工预览。

## 当前未通过的原生验收与外部缺口

**#23保持OPEN**。最终候选的Windows UI（两主题/两宽度、目标/校准/预留）部分通过，但native writeText虽fulfilled且页面focused，实际readText持续为空，因此严格断言失败，未标为通过。最小复现为新独立profile→仅复制一条留图条件，无需校准页或求解。交互OS探针无法OpenClipboard；进一步只读Win32元数据显示Session1、WinSta0/Default输入桌面可访问，但OpenClipboard返回false且实际错误5（ACCESS_DENIED），GetOpenClipboardWindow为0。NULL不能证明剪贴板空闲，亦不能指认外部进程；当前未确诊，不修改产品或杀其他进程。

随后准备“OS探针优先、不调用browser readText”的单变量试验时，SSH连续Connection reset by peer，试验和清理确认均无法完成。旧debug runner尚未在SSH前落盘UUID，故最后一次可能的远端任务/profile精确UUID未知；只允许恢复连接后按创建时间与19393/本次profile形态核实具体资源，再清理已证明自有的对象，禁止按前缀批量删除。维护中的runner现已修正为启动SSH前保存resourceOwner，且cleanup失败也保留事实报告。

旧pilot曾通过native精确读回/OS断言后在外部analytics请求处失败，仅作为原始诊断记录，使用dirty源/旧index且不是当前候选全绿证据。当前候选报告、只读元数据、最小复现和SSH失败分别存档；不把pilot、受控API模拟或页面成功提示升级成最终Windows原生通过。

恢复连接后：先恢复并核实自有资源清理→跑最小单变量OS-first循环定位环境条件→当前构建摘要下重跑完整native runner（包含六串、OS owner、原生权限失败、39资源解码、UI与清理）→取得满足范围证据后才关闭#23。游戏匹配/容量/真实遭遇和真实航程仍属于#24。
