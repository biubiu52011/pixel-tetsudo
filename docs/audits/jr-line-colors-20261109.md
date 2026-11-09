# JR线路色及路线记号审查 — 2026-11-09

从 data/core/railway_data.json 的 operator=JR-* 项目统计，现有 JR-East 89、JR-West 29、JR-Kyushu 26、JR-Central 1、JR-Hokkaido 1，共146条。仓库目前尚未注册 JR-Shikoku 线路，不可把未登记的线路算作通过。

## 审查原则

- 线路识别色应参照 JR 公司官方站内/线路图的旅客识别色，不能用车身涂装或路线名称推断。
- line.color 为基础渲染值，line.presentation.color 为线路展示配置。完整单色线路二者应一致。
- 这里使用的 HEX 是依官方路线图视觉色系选择的网站近似值；不是声称已经拿到 JR 官方精确配色规范。
- 对跨地方、跨服务品牌的大型复合线路，必须分站段处理，不能把某一地区的颜色推广到整条线路。
- 本次不修改列车位置、ODPT、SQL时刻表、车型与车辆图标。

## 已修复的13条（JR西日本8 + JR东日本5）

| 公司 | 路线ID | 记号 | 原色 | 新色 | 官方色系 |
|---|---|---|---|---|---|
| 西日本 | TokaidoKansai | A | #009944 | #007ac0 | 蓝 |
| 西日本 | Nara | D | #d64541 | #b67c2b | 茶 |
| 西日本 | OsakaHigashi | F | #00b2e5 | #47677f | 蓝灰 |
| 西日本 | KakogawaLine | I | #2e8b57 | #00a98f | 绿松石 |
| 西日本 | Maizuru | L | #4682b4 | #e9a500 | 向日葵黄 |
| 西日本 | OsakaLoop | O | #f39700 | #e93550 | 朱红 |
| 西日本 | Hanwa | R | #00b2e5 | #f28c00 | 橙 |
| 西日本 | Sakurai | U | #a0283a | #d81e45 | 胭脂红 |
| 东日本 | Joban | JJ | #00a2e1 | #00b261 | 绿 |
| 东日本 | JobanLocal | JL | #00bb83 | #808080 | 灰 |
| 东日本 | SaikyoKawagoe | JA | #00ac47 | #00ac9a | 青绿 |
| 东日本 | Itsukaichi | JC | #DD6935 | #f15a22 | 橙 |
| 东日本 | Hachiko | 内部HAC | #e95411 | #808080 | 灰 |

后五条 JR东日本路线在调整前 presentation 色值已符合所对应旅客识别色；只修正源基础色的历史冲突，保留其运营区间和官方/内部代码。

## 等待分段校色，保留原值的复合路网

- SaninMain：162站、京都至下关，近畿 E 嵯峨野线/山阴线的薰衣草色仅适用于其对应近畿段，不能把所有地方线统一成紫色。
- SanyoMain：128站横跨近畿/冈山/广岛/下关，近畿 A 蓝只属于相应段。
- KansaiMain：55站跨名古屋至大阪，至少包含近畿 Q 绿色与 V 紫色，原线路内部还含大阪环状线关系，不能整条改 Q 绿。
- HimejiLine：36站从姬路至新见；K 朱红对应姬路侧近畿区域，不可强制对西端套用。
- Ako：同一支线跨越近畿 A 与冈山地区不同色系。
- JR九州 KagoshimaMain：96站聚合路线跨多个区域，北九州 JA/JB 分段已有独立红色配置。不得将整条干线无条件设为 JA/JB 色。

下一步应在现有 presentation.displayRules 与线路图几何分段机制中扩展通用规则，并分别以官方站段为边界。既有 js/trains-data.js 的专用分段判定以常磐线站序为基础，不能直接给其他线路照抄。

## 其他 JR 公司检查范围与限制

- JR东日本：先校正东京近郊主要正式线色的基础与展示冲突；大多数东北、甲信越地方线未逐条验证官方色票，维持原值。
- JR九州：以官方北九州路线编号 JA/JB/JC 等为核对起点；未将地区各段颜色合并成一色。
- JR东海及 JR北海道：目前仅各一条新干线资料，尚无本次官方证据足以认定已有色值错误，因此保持。
- JR四国：当前仓库无此 operator 的记录，不构造缺失线路或颜色。

## 证据

- JR西日本近畿路线图（2026年3月14日修订）：https://www.jr-odekake.net/station/pdf/ubn.pdf
- JR西日本路线记号与路线色说明：https://www.westjr.co.jp/travel-information/sc/train-usage-guide/howto/howtosign/
- JR东日本东京近郊车内路线图：https://www.jreast.co.jp/map/pdf/map_tokyo.pdf
- JR九州路线图：https://www.jrkyushu.co.jp/railway/routemap/

## 验证

修改原始 railway_data.json 并同步 railway_data.compact.json 和 railway-data.file.js，由 db-loader 使用准确的新Git Blob缓存键，页面脚本版本同步更新。新增 tests/jr-line-colors-20261109.test.cjs，并纳入 GitHub CI。无二次色系覆盖脚本。
