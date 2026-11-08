# JR西日本 JR東西線 2026年11月：车辆候选与跨线来源映射

核对日期：2026-11-09。范围：`JRTozai`（尼崎—京桥，9站），而非东京 Metro `Tozai`。

## 线路车型

JR西日本官方「女性専用車両」线路/列车说明，同时将 JR東西線与学研都市线（普通、快速、区间快速）归入207系、321系车队适用范围：
https://www.jr-odekake.net/railroad/service/train-woman.html

- 已在 `data/core/major-vehicle-fleet-presets.js` 使用上述官方来源，保留两个车型作为**线路级候选**；
- SQL `operation_family_rules` 新增 `JRTozai`、`Gakkentoshi` 两条官方车型参考。两者均 `planOnly=true`、`authorizesPNG=false`、`actualVehicleConfirmed=false`；
- 原图库仍对应207系NK/Y2及321系。**207系车型不等于确认NK或Y2具体外观**；不因线路候选图存在而给某一车次画具体车辆。

## 已复核的五条真实来源（3个公开号码）

原有 `manual_timetable_templates` 的学研都市线导入，部分从鴫野或放出开始；官方列车行程则证明其西侧经过京桥和JR東西線。

| 原始模板ID | 原始号 | 公开号 | 日历 | 原SQL首站时刻 | 官方对应京桥发时 | 官方证明 |
| ---: | --- | --- | --- | --- | --- | --- |
| 41568 | 4622C | 4622C | 平日 | 鴫野13:02 | 13:00 | https://timetable.jr-odekake.net/train-timetable/190231?date=20261029 |
| 41569 | 4622CH | 4622C | 土休日 | 鴫野13:02 | 13:00 | 同上（毎日運転） |
| 41436 | 4526M | 4526M | 平日 | 鴫野06:45 | 06:42 | https://timetable.jr-odekake.net/train-timetable/191551?date=20261027 |
| 41440 | 5420M | 5420M | 平日 | 放出07:03 | 06:59 | https://timetable.jr-odekake.net/train-timetable/70241?date=20261023 |
| 41441 | 5420MH | 5420M | 土休日 | 放出07:03 | 06:59 | https://timetable.jr-odekake.net/train-timetable/70951?date=20261101 |

来源页面采用2026年11月号时刻表。节假日SQL导入额外的`H`仅是导入标记，不是公开列车番号。匹配还强制校验来源模板ID、日历、来源号、首个车站和准确时刻，不能将同号不同日历或同钟点异号串线。

## 已落库结构与限制

- 迁移：`supabase/migrations/20261109061000_jrwest_tozai_2611_junction_fleet_refs.sql`；
- 表：`published_jrwest_tozai_2611_source_links`。主键引用既有来源模板，记录官方链接、公开号、京桥时刻及来源首站锚点；
- 防错：RLS已启用；数据库CHECK约束禁止非空`vehicle_type`、`vehicle_png_path`和`actual_vehicle_confirmed=true`，状态固定为`partial_source_only`。
- 不重写原时刻表，不向`train_timetable_lines`强行追加线路，不凭仅两处锚点推算JR东⻄线其余车站时间。因缺少本线完整、可复用时刻表来源，**JRTozai页面尚不能据此显示全日逐趟预测列车**。

## 下一步取得真正的逐趟实车映射所需数据

需要可合法复用的完整2026年11月两向时刻表，以及有日期/车次/运用或实际编组证据的对应车辆记录。仅官方线路车型介绍和车次交界钟点，不足以得出特定车次为207或321，更不足以选207 NK/Y2；不可将缺失当作“0列车”。

JR官网列车时刻表注明禁止未经授权复制、加工时刻表，本次只对已有SQL来源做有限的独立锚点复核，并保存引用，不批量导入第三方时刻表。


## 2026-11-09 续查：跨线车次号衔接改为双向、支持京桥改号

原表 `published_jrwest_tozai_2611_source_links` 的「京桥出发／学研都市线首站」三个字段仅适用于向学研都市线方向，无法准确表示从学研都市线进入JR东⻄线的列车。现统一重命名为 `kyobashi_departure_clock`、`source_boundary_station_urn`、`source_boundary_arrival_clock`，新增 `traversal_direction` 和可空的 `continued_as_train_number`。原5条资料自动保留。

迁移 `supabase/migrations/20261109070000_jrwest_tozai_2611_both_direction_source_links.sql` 基于**既有 SQL 模板终点的车站、到时、发时、车次、日历**全部严格吻合，追加以下8条学研都市线→京桥→JR东⻄线的官方交界证据：

| 来源ID | 原始号码 | JR東西線号码 | 日历 | 京桥到/发 | 核对来源 |
| ---: | --- | --- | --- | --- | --- |
| 41344 | 5421M | 5421M | 平日 | 06:59 / 07:01 | [官方](https://timetable.jr-odekake.net/train-timetable/323491?date=20261013) |
| 41345 | 5421MH | 5421M | 土休日 | 07:06 / 07:08 | [官方](https://timetable.jr-odekake.net/train-timetable/323501?date=20261004) |
| 41346 | 5423M | 5423M | 平日 | 07:22 / 07:24 | [官方](https://timetable.jr-odekake.net/train-timetable/70091?date=20261008) |
| 41347 | 5423MH | 5423M | 土休日 | 07:19 / 07:22 | [官方](https://timetable.jr-odekake.net/train-timetable/70331?date=20261004) |
| 41375 | 5491M | 5491M | 平日 | 15:52 / 15:53 | [官方](https://timetable.jr-odekake.net/train-timetable/122361?date=20261007) |
| 41376 | 5491MH | 5491M | 土休日 | 15:52 / 15:53 | [官方2026-11-14](https://timetable.jr-odekake.net/train-timetable/122511?date=20261114) |
| 41364 | 5953M | 5953M | 平日 | 11:05 / 11:07 | [官方](https://timetable.jr-odekake.net/train-timetable/200871?date=20261006) |
| 41340 | 5727C | **4527C** | 平日 | 06:30 / 06:32 | [官方](https://timetable.jr-odekake.net/train-timetable/123341?date=20261027) |

**重要例外**：5727C在京桥结束，之后切为4527C继续通过JR东⻄线，属于同一次直通行程的**不同公开列车号**。不会把5727C这一个号码强行扩展到JR東西线段，`continued_as_train_number`明确记录变化。土休日原SQL末尾H仅供区分日历，不是公开车号。

**现有证据总量：13条来源（原5+新8）；不等于JR東西线真实日班次数。** 源自2026年10月的官方证据可以证明对应日期的跨线及号码，但**不等于已验证11月每一天的全部时刻**；11月14日的5491M另有直接11月页证明。所有来源继续保持`partial_source_only`、`vehicle_type=NULL`、`vehicle_png_path=NULL`、`actual_vehicle_confirmed=false`。不自动生成车次位置，不将207或321分派给具体车次。

生产Edge函数`train-runs`版本与GitHub main源文件有差异；为避免覆盖其他线路未同步的生产逻辑，**本轮只提交和执行证据SQL，不部署Edge、不增加虚构班次**。其余逐站时间需获得明确发布/转载许可或其他合法可复用的数据来源。


## 2026-11-09 只读在线来源清单

新增数据库迁移 `20261109074500_jrwest_tozai_public_source_feed.sql`：沿用已有13条京桥交界来源，只为 `anon/authenticated` 开放经过严格 RLS 筛选的 **SELECT**，提供 `security_invoker=true` 的只读视图 `published_jrwest_tozai_2611_public_evidence`。视图不包含车型、编组、PNG 或实时位置，也不授予匿名写入权限。

网页侧新增懒加载 `js/train-corridor-evidence.js`；仅进入 `JRTozai` 时请求 Supabase Data API，页面显示平日/土休日来源、跨线方向、京桥交界时刻和对应官方出处（原始来源日可能为10月，不推断11月任何日期均运行）。207系/321系候选继续由 `MajorVehicleFleetPresets` 唯一管理，显示为参考而非实车。

组件独立于 `TrainPositionEstimator`、`TrainVehicle` 和生产 `train-runs`：**不会对JR东西线制造一个位置标记**。断网时明确表示来源不可用，不解释为运行列车0趟。详情切走后异步数据不会污染另一条线路。新项目走现有 page-scripts manifest、CSP已允许的 Supabase 域和只读公钥，未覆盖生产 Edge 函数。
