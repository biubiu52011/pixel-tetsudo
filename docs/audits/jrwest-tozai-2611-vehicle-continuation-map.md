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
