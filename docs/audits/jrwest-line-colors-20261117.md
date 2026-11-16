# JR西日本线路色修复与分段显示 — 2026-11-17

## 原则
- 仅修正经官方线路图核实的色系，HEX 是本站使用的近似显示颜色，**不是官方公开 HEX**。
- 不修改 canonical 线路 ID、站序、Supabase、ODPT、GTFS、车辆 PNG 号段、运行身份及贯通服务。
- 对跨地区长距离线路，在 `presentation.displayRules.segmentColors.ranges` 声明基于**真实站 ID**的闭区间及其乘客线路记号。
- 区间记录表示该相邻两站间的显示色；边界站之后的第一段使用新地区色。未知区间用 `unknownColor: #80868b` 显示为中性灰，不将近畿/冈山/广岛的某一色错误覆盖全线。
- JR 西日本运营归属与 JR 东海区间需要后续独立拓扑审计。本次 `KansaiMain` 名古屋—亀山的分段标记 `operator: JR-Central` 仅用于展示；整条线路的现有 SQL/ODPT 身份保持不变。

## 已核实并统一基础色及展示色的单色线路
| canonical ID | 官方路线路记号/地区 | 旧网站色 | 新网站色 | 依据 |
| --- | --- | --- | --- | --- |
| HimejiLine | K（姫新線，红橙） | `#4682b4` | `#f15a24` | JR西日本近畿／冈山图 |
| Kure | Y（呉線，黄） | `#2e8b57` | `#f6ac00` | JR西日本广岛图 |
| Kabe | B（可部線，青绿） | `#4682b4` | `#00a9be` | JR西日本广岛图 |
| Yamaguchi | 山口地区橙色路线图显示 | `#8b4513` | `#ed6945` | JR西日本广岛·山口地区图 |
| Iwakado | 岩徳線，青绿色路线图显示 | `#8b4513` | `#009c9a` | JR西日本广岛·山口地区图 |
| Ube | 宇部線，洋红色路线图显示 | `#4682b4` | `#d5287d` | JR西日本广岛·山口地区图 |

山口、岩徳、宇部线所依据的是官方地区示意图的色系，并非已确认有独立的正式线路字母记号，因此仍不强行填入 `presentation.code`。

## 跨地区线路
| canonical ID | 原网站单色 | 修正后代表色 | 经核实的区间颜色/记号 |
| --- | --- | --- | --- |
| SanyoMain | `#009944` | `#007ac0`（近畿 A 蓝） | 神戸—上郡 A 蓝；上郡—岡山 S 黄绿；岡山—福山 W 橙；福山—糸崎 X 青；糸崎—広島 G 绿；広島—岩国 R 红；岩国以西中性未核实 |
| Ako | `#009944` | `#007ac0`（A 蓝） | 相生—播州赤穂 A 蓝；播州赤穂—東岡山 N 红 |
| KansaiMain | `#ff9500` | `#00a65a`（大和路 Q 绿） | 名古屋—亀山 CJ 青绿（JR东海）；亀山—加茂 V 紫；加茂—JR難波 Q 绿 |
| SaninMain | `#8b4513` | `#8360a8`（近畿 E 紫） | 京都—福知山 E 紫；鳥取—米子 A 黄绿；米子—益田 D 橙；福知山—鳥取及益田以西中性待核实 |

站名采用项目现有数据中的实际键（例如 `Kamigoori`、`Itosaki`、`Toukou-Yama`），不是以站序下标硬编码。`SanyoMain` 与 `Ako` 的整线无单一官方记号，因此明确将 `presentation.code` 设为空串，不把内部 canonical ID 当作线路符号。

## 实现
- 权威编辑：`data/core/railway_data.json`；派生生成文件 `railway_data.compact.json` 与 `railway-data.file.js` 保持相同结构。
- `js/line-presentation-service.js` 新增 `resolveSegmentPresentation(lineId, fromStation, toStation, allLines)`，只接受合法相邻车站，不改变路由、车次或运营商。
- `js/trains-data.js` 的 SVG 轨道线色与站点色直接调用通用分段解析；旧 `Joban` 的 before/after 专用规则保持兼容。
- `js/data-state.js` 的线路卡片增加 120×5px 小型区段色带，按实际线路段长度显示颜色，未核实区段显示灰色。原卡片边框保持代表性线路色。
- 更新 `db-loader.js` 的内容 SHA，以及全部受影响页面的 JS 缓存参数；避免新数据仍加载旧脚本。
- 新增 `tests/jrwest-line-colors-20261117.test.cjs` 并在 GitHub Actions 既有铁路颜色测试中加入。

## 官方来源
- JR西日本近畿 2026-03-14 路线图：https://www.jr-odekake.net/station/pdf/ubn.pdf
- JR西日本冈山 2026-03-14 车站号码图：https://www.westjr.co.jp/global/en/howto/howtosign/ubn_okayama.pdf
- JR西日本广岛车站号码图：https://www.jr-odekake.net/station/pdf/stationnumber_hiroshima.pdf
- JR西日本山阴地区图：https://www.jr-odekake.net/station/pdf/san.pdf
- JR西日本广岛·山口地区图：https://www.jr-odekake.net/station/pdf/cnh.pdf
- JR东海关于 CJ 编号的官方公告：https://jr-central.co.jp/news/release/_pdf/000035928.pdf

## 限制和待核实
- JR西日本线路图只规范乘客显示色，并不代表每个运营区间都发布了标准 HEX；后续可根据确切官方规范进一步微调本站颜色。
- 2026 年完整山阴地区与山口地区的独立线路色发布、和田岬线独立色、博多南线、大糸线西段仍需确认，未动这批线路。
- `KansaiMain` 的 JR东海/西日本正式运营商边界以及跨部门全线归属尚需专门重构，应另行处理，不在本次配色修复里修改。
