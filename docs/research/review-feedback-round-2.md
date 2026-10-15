# 第二轮审阅与本地修订

2026-10-15 收到 `~/Downloads/voyage-review-feedback (1).json`，导出时间 `2026-10-15T04:26:35.252Z`。53项全部对应上一版本指纹：47接受、6需要修改，无缺失或旧版条目。原始文件保存在 [第二轮原始记录](reviews/2026-10-15-feedback-round-2.json)，SHA-256：`12590064330720b06063a26f40914875a2b2f8681adcad5f490fca9bedf72825`。

[本地HTML](target-icons-review.html) 已载入本轮意见，保留47项接受及全部评论；只把以下6项内容变化设为待复核。产品源码、运行逻辑与部署均未修改。

| 条目 | 本轮原评论 | 本地处理 |
| --- | --- | --- |
| Captainsbane 首领 | 图标 ok，中文应该是船长之x 之类的，要汉化 | 名称改为“船长灾星首领”，保留已认可的统一Boss图标。名称来自PoEDB简中数据，不宣称已通过用户客户端核实。 |
| 金币堆 | 换一个金币图标，更简单点，不要两层圈 | 单枚金币只留一个外圈与简洁货币符号，移除内圈。 |
| 险恶深渊金币／纪念币遭遇 | 换一个金币图标，更简单点，不要两层圈 | 与金币堆共用同一枚单圈金币图标。 |
| 失落遗迹瓦尔遭遇 | 换成阿兹里的图标 | 采用GGG阿兹里官方论坛头像，经PoEWiki归档取得；原JPEG嵌入，不裁切、不染色。 |
| 沉没图腾精英遭遇 | 找 poedb的 nemisis 图标 | 采用PoEDB Archnemesis（宿敌）小地图图标。用户写作nemisis，此处明确列出所选具体图片供复核；不把旧Nemesis与Archnemesis混称为同一赛季，也不更改区域规则。 |
| 藏宝蛤蜊 | 换一个金币图标，更简单点，不要两层圈 | 与金币堆共用同一枚单圈金币图标。 |

## 已接受的交互

小复制图标、点击名称查看完整正则的弹窗交互已获接受；本轮不再更改。两套主题、入口随主题切换、三档颜色，以及其余已接受图标继续保留。

## 来源

- [PoEDB简中：船长灾星](https://poedb.tw/cn/Captainsbane)：页面标题为“船长灾星”。仅显示名变化；ID仍是`captainsbane`，权重、出现条件与Boss图案不变。
- [PoEWiki GGG资源归属索引](https://www.poewiki.net/index.php?fileuntil=Aventail+Helmet+inventory+icon.png&title=Category%3AFiles_copyright_of_Grinding_Gear_Games)：列出64×64的“Atziri forum avatar.jpeg”。采用[原始头像文件](https://www.poewiki.net/images/f/ff/Atziri_forum_avatar.jpeg)，游戏美术归GGG。
- [PoEDB：Archnemesis](https://poedb.tw/us/Archnemesis_league)：页面与首页入口使用[宿敌小地图标记](https://cdn.poedb.tw/image/Art/2DArt/minimap/player/Archnemesis.webp)。原图保留原色。

所选宿敌标记只作精英视觉符号。阿兹里头像只作用户指定的瓦尔遭遇视觉符号；两者均不证明本格存在其完整机制或首领。未修改任何目标判定或权重。

## 验证

隔离浏览器检查53条评论与状态继承、六项待复核筛选、中文显示名、JPEG／WebP解码、统一Boss图案不变、三目标共用单圈金币、明暗主题及390／1440宽度无横向溢出。复制完整文本、编辑后刷新、导出及新浏览器上下文导入通过；没有页面JS错误或自动外网请求。复制为受控API测试，不等于Windows Edge原生剪贴板验收。测试意见不写入用户默认浏览器。

## 最终确认

用户随后通过聊天确认“全部接受。我就不导出记录了”。本轮六项修订已全部接受；连同此前47项共53项，见 [最终接受记录](reviews/2026-10-15-final-acceptance.json)。这份记录来自聊天确认，不是第三次浏览器导出。
