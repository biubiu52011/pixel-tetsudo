# 石卷线（Ishinomaki）2026-11 官方列车番号、计划车辆图标与旧模板隔离

## 2611 JR 东日本官方车次表

四张官方线路时刻表：

- [平日上行（女川→小牛田）](https://timetables.jreast.co.jp/2611/timetable-v/266u1.html)
- [土休日上行](https://timetables.jreast.co.jp/2611/timetable-v/266u2.html)
- [平日下行（小牛田→女川）](https://timetables.jreast.co.jp/2611/timetable-v/266d1.html)
- [土休日下行](https://timetables.jreast.co.jp/2611/timetable-v/266d2.html)

只有当前月**实际可运行**的车号可以用于推定位置，而非将官方同页发布的 12 月至次年 2 月旅游列车也当作 11 月每日运行。

| 2026-11 类型 | 上行 | 下行 | 参考车型 |
| --- | --- | --- | --- |
| 普通 | 5620D、2622D、5624D、1626D、1628D、2926D、1630D、1632D、2930D、1634D、1636D、1638D、1640D、1642D、1644D、2936D、1646D、2938D、640D、1648D（20） | 1623D、1625D、5627D、1629D、1631D、2927D、1633D、1635D、1637D、1639D、2931D、1643D、1645D、1647D、2937D、1649D、5651D（17） | キハ110系，现有通用 PNG |
| 仙石东​​北线直通快速 | 5530D | 5543D | HB-E210系，现有通用 PNG |
| 指定日「風っこ女川シーパル号」 | 9624D | 9621D | **车型 PNG 未获授权**，中性标记 |

风っこ 9624D／9621D 只在 **11 月 21、22、23 日**开行；该月其他日期不显示该临时列车。官方表中 9524D、9621D 的「だて SATONO」12 月及以后运转日不可算作 11 月计划，且同号 9621D 的不同列车不得共用车型映射。

旧 SQL `manual_timetable_templates` 中 9631D、9634D 虽存储为节假日普通列车，但**不在 2611 官方四张表内**，所以新索引在 2026-11 拒绝生成其时刻表推定位置。旧数据保留，不跨版次删除。局部区间运休（石卷—女川 11 月 9–13 日、前谷地—柳津 11 月 4–6 日）与计划停站时刻的 2611 完整版核验尚需单独处理；本次不宣称旧模板具有当前核验状态，也不新增站点时刻。

## 车型证据与修复

- JR 东日本[キハ100・110](https://www.jreast.co.jp/train/local/kiha110.html) 列出石卷线为其运用区间；[石卷线车次车型乘务表（2026-08）](https://w.atwiki.jp/train-boundfor/pages/92.html) 记录 1623D、1625D、1649D、2622D、1626D、1628D 为キハ110。旧 SQL 其余普通车也登记 `キハ110系` 单一车型，仍仅授权**参考 PNG**，不保证当日实车编组。
- JR 东日本[HB-E210](https://www.jreast.co.jp/train/local/hb_e210.html) 指定仙石东​​北线运用；同一独立资料分别给出 5530D／5543D 的具体 HB-E210 车型。旧 SQL 四条模板（两种日历 × 两个车号）错误登记为 `キハ110系0番台（快速南三陸）`，已仅修复这四条的 `vehicle_type_label` 为 `HB-E210系`，不修改车号/站时刻、车辆实际确认状态或其他线路。
- 仓库两张既有图：`JR東日本_キハ110系.png`、`JR東日本_HB-E210系.png`。图库线路授权新增 `Ishinomaki`，但只允许精确车号、来源 `odpt.Railway:JR-East.Ishinomaki`、JR-East、上下行、普通/快速车种、2026-11 有效日组合；没有造图，没有跨线路借图。
- `JREastIshinomakiNumberIndex202611.verify` 先做源车次/日历/运行日准入，`TrainNumberPngRanges.match` 再逐号匹配车型，`TrainVehicle.lookupTrainNumberRangePng` 与 `trains-render` 最终选择图库 PNG。位置保留 `estimated:true`、`vehicleIdentityStatus:UNKNOWN`、`timetableDateVerified:false`，映射 `planned:true`，不代表列车的现场 GPS 或已确认实车。

## 回归检测

`node --test tests/ishinomaki-2611-official-number-png.test.cjs` 包含：
- 全部 37 个普通车 + 2 个直通快速在平日/土休日的 PNG 与 SVG 标记；
- 临时车仅在 11/21–23 的官方号码准入，但不匹配キハ110／HB-E210；
- 拒绝 9524D、9631D、9634D、错误方向、线路、类型、日期、候选车型；
- 计划位置层只输出当月官方车号，旧模板虚构车不产生位置。

此审计只覆盖当前版次 **2026 年 11 月**。版本滚动后必须重新核对官方四组月度时刻表与指定运行日。
