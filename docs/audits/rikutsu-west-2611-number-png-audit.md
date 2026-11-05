# 陸羽西線：2026 年 11 月 JR 东日本官方列车番号→车型 PNG 审计

## 2611 四向官方资料

JR 东日本 2026 年 11 月版逐号时刻表：
- [平日上行](https://timetables.jreast.co.jp/2611/timetable-v/256u1.html)
- [土休日上行](https://timetables.jreast.co.jp/2611/timetable-v/256u2.html)
- [平日下行](https://timetables.jreast.co.jp/2611/timetable-v/256d1.html)
- [土休日下行](https://timetables.jreast.co.jp/2611/timetable-v/256d2.html)

JR 东日本 [2026 年 1 月 16 日恢复全线列车运行的官方介绍](https://media.jreast.co.jp/articles/5555)称全天上下行合计 18 趟。JR 东日本 [キハ100・110 车辆系列](https://www.jreast.co.jp/train/local/kiha110.html)列出该线运用。图库仅使用仓库现有 `JR東日本_キハ110系.png`。此类**线路车型参考图**不意味着当日实车编组、实际运行位置或特定车辆号已证实。

## 精确车次表（每日 18 车号）

| 类型 | 上行 | 下行 |
| --- | --- | --- |
| 普通 16 个 | 150D、152D、154D、156D、158D、160D、162D、164D | 151D、153D、155D、157D、159D、161D、163D、165D |
| 快速「最上川」2 个 | 3132D | 3131D |

旧 SQL `manual_timetable_templates` 里日常 18 个车号均有 `Local` 类别，因而**快速 3131D／3132D 错标普通**。本次在 `TrainPositionEstimator` 接入 `JREastRikutsuWestNumberIndex202611.verify`，仅在已核验的 2611 服务期把这两车的展示种别改为 `Rapid`、列车爱称标成 `最上川`；**不修改 SQL 本体，不虚构站时刻**。

旧 SQL 的土休日 `9166D`（以及未知空白整数车号）未列入 2026-11 官方适用的日常号码，拒绝生成为时刻表估算位置或给车型图像。所有规则同时校验线路 `RikutsuWest`、铁路来源 `odpt.Railway:JR-East.RikutsuWest`、JR-East、车号末尾 D、上行偶数／下行奇数、平日或土休日、完整 2026-11 日期和普通／快速类型，绝不在别的线路误用号段。

PNG 严格是 `planned:true` 的图库代表图；位置身份仍为 `estimated:true`、`vehicleIdentityStatus: UNKNOWN`、`timetableDateVerified: false`（历史 SQL 时刻表版次仍未完成逐站官方验证）。无通过查证的车型不要借图，显示中性位置点。

## 代码和验证

- 新增 `data/timetables/jreast-rikutsu-west-2611-number-index.js`：2026-11 精确 18 番号 + 正确类型 + 日期验证。
- `data/timetables/train-number-png-ranges.js`：普通／快速各自专用的既有キハ110图库 PNG 映射。
- `js/train-position-estimator.js`：逐号准入 SQL 位置 + 313x Rapid 修正 + 爱称。
- `data/timetables/vehicle-garage-png-map.js`、`js/train-vehicle.js`：仅给正确来源线路的现有车型图授予使用权限；`pages/trains.html` 加载按线路懒加载索引。
- 回归 `node --test tests/rikutsu-west-2611-official-number-png.test.cjs`：18 车号 × 两种日历、外部线路／车型冲突、历史 9166D 拒绝和计划位置的快速分类修复。

后续切换 2026-12 或更新数据库版次时必须重新核对官方四张时刻表及逐车次运行日期，不使用简单 `150D`～`165D` 的连续号段推断所有可能车次。
