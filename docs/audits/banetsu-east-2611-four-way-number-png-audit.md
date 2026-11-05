# 磐越东线 2026-11 JR 东日本四组列车番号→PNG 审计

## 口径与来源

JR 东日本 2026 年 11 月版（2611）四组完整列车番号表：
- 平日上行（郡山→いわき） https://timetables.jreast.co.jp/2611/timetable-v/250u1.html
- 土休日上行 https://timetables.jreast.co.jp/2611/timetable-v/250u2.html
- 平日下行（いわき→郡山） https://timetables.jreast.co.jp/2611/timetable-v/250d1.html
- 土休日下行 https://timetables.jreast.co.jp/2611/timetable-v/250d2.html

JR 东日本车辆介绍：https://www.jreast.co.jp/train/local/kiha110.html（官方列出磐越东线为キハ100・110系运用区间）。SQL 的 `BanetsuEast` 车型计划对本次 **35 个实际车次**明确为 `キハ110系`，属于 `official_single_fleet_plan`，`actual_vehicle_confirmed=false`，不能推断 2026-11 某天的具体车号或混编情况。

## 四方向、日历和来源对比

| 2611 分组 | 官方车号（全日运行） | 车号数 | 数据库模板 |
|---|---|---|---|
| 平日上行 | 720D、1752D、722D、724D、728D、730D、732D、734D、736D、1754D、738D、740D、1756D、742D、744D、746D、748D、750D | 18 | 18 |
| 土休日上行 | 同平日上行 | 18 | 18 |
| 平日下行 | 721D、723D、725D、727D、729D、1751D、731D、733D、735D、737D、741D、743D、745D、1753D、1755D、747D、749D | 17 | 17 |
| 土休日下行 | 同平日下行 | 17 | 17 |

**全线唯一日常普通车号：35 个**。局部往返车也使用同一官方车号，不能把 720–750 所有整数及任意四位 D 视为有效。比如 `726D`、`739D`、`752D`、`1757D` 均未列入有效车号枚举。

## 从官方表中排除的临时列车

| 车号 | 名称 | 实际发布的运行日 | 2026-11 |
|---|---|---|---|
| `9730D` | 快速・風っこストーブいわき号，郡山→いわき | 2026-12-26/27、2027-02-13/14 | 不运行 |
| `9737D` | 同列车，いわき→郡山 | 同上 | 不运行 |

这两列属于 2611 页面预告的未来月份指定日期列车，不给予 2026-11 的 PNG 授权；未来要支持对应月，必须按运行日及实际车型独立核查。

## 已实施的运行时映射

- 原数据：`public.manual_timetable_templates` 已收录四组 18/18/17/17 服务位置，`public.train_timetable_vehicle_mappings` 的 211/E257 不适用于本线。原 `キハ110系` 计划车型保留。
- 新增：`TrainNumberPngRanges` 一条严格 `BanetsuEast` 规则，匹配所有列出的 **35 个实际号码**，完整尾缀 `D`，`Local`，JR East，铁路 URN `odpt.Railway:JR-East.BanetsuEast`，2026-11-01..30，两种服务日历，偶数上行／奇数下行。
- 图片：仓库现有 `../images/列车/JR東日本/JR東日本_キハ110系.png`，车型 `キハ110系`；图库 `VehicleGaragePngMap` 原本已经正式授权 BanetsuEast，无需变更图库或造图。
- 拒绝冲突的明确车辆证据或不唯一的 `vehiclePlan`，不跨线路借用 `BanetsuWest` 图。使用 `planned:true` 标记参考车型，**实际车辆身份继续 UNKNOWN**，不修改位置来源、时刻表、弹窗、视觉提示或折叠机制。
- 回归测试矩阵：35 号码 × 2 日历 × 实时/SQL 来源，对错误数字、方向、运营者、车型、来源线路、其他月份和指定日期临时车逐一做否定测试。
